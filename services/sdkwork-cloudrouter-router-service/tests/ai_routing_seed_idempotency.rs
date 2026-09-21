//! Idempotency regression for the bundled AI routing seed and the startup
//! install gate.
//!
//! The startup path (`ensure_bootstrap_data`) is allowed to re-run the seed
//! every time it decides the database is not `Installed`, so the seed's
//! correctness depends entirely on being a *pure upsert*: same rows, same
//! deterministic ids, no growth. A single non-idempotent statement (a bare
//! `INSERT` without its conflict target, a missing `ON CONFLICT` clause, an
//! unguarded child insert) would not fail any existing test — it would only
//! duplicate rows on the second boot of a real deployment, and the symptom
//! would surface far away as duplicate group membership or a doubled account
//! pool.
//!
//! These tests run the seed twice against an isolated schema built from the
//! real baselines, then assert row counts are byte-for-byte stable.
//!
//! Prerequisites (same as the other Postgres e2e suites):
//!   SDKWORK_DATABASE_URL=postgres://sdkwork_ai_dev:sdkworkdev123@localhost:5432/sdkwork_ai_dev
//! When unset the tests skip rather than fail, so the default `cargo test`
//! stays hermetic.

use std::collections::BTreeMap;
// Imported as `_` so `describe` can walk the `source()` chain: the trait has to
// be in scope for the method call, but nothing here names it.
#[allow(unused_imports)]
use std::error::Error as _;
use std::sync::Arc;

use sqlx::postgres::PgPoolOptions;
use sqlx::{PgPool, Row};

use sdkwork_cloudrouter_router_service::application::UpstreamCredentialSecretCodec;
use sdkwork_cloudrouter_router_service::infrastructure::crypto::RingAeadCredentialSecretCodec;
use sdkwork_cloudrouter_router_service::infrastructure::sql::ai_routing_seed::{
    import_postgres_ai_routing_seed, postgres_ai_routing_seed_complete, postgres_ai_routing_seed_gap,
};

/// A development-like environment seeds the vendor default accounts *enabled*,
/// so the completeness predicates can actually reach `true`; production-like
/// values leave them disabled by design and every assertion below would be
/// measuring the disabled path.
const DEV_ENVIRONMENT: &str = "development";

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";

/// Tables the seed owns. Counted as `(table, live_rows)`.
///
/// Every one of these is written by an upsert keyed on a unique index, so a
/// correct re-run leaves each count identical.
const SEEDED_TABLES: &[&str] = &[
    "ai_resource",
    "ai_resource_group",
    "ai_resource_group_item",
    "ai_api_endpoint",
    "ai_upstream_supplier",
    "ai_upstream_supplier_endpoint",
    "ai_upstream_supplier_auth_method",
    "ai_upstream_account",
    "ai_upstream_account_credential",
    "ai_upstream_account_group",
    "ai_upstream_account_group_member",
    "ai_resource_binding",
    "ai_routing_strategy",
];

struct SeedTestContext {
    pool: PgPool,
    database_url: String,
    schema: String,
}

fn quote_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

impl SeedTestContext {
    async fn new(label: &str) -> Option<Self> {
        let database_url = match std::env::var(POSTGRES_TEST_DATABASE_URL) {
            Ok(value) if !value.trim().is_empty() => value,
            _ => {
                eprintln!(
                    "skipping AI routing seed idempotency test; set {POSTGRES_TEST_DATABASE_URL} to run it"
                );
                return None;
            }
        };
        let schema = format!(
            "test_seed_idem_{}_{}_{}",
            label,
            std::process::id(),
            sdkwork_utils_rust::now().timestamp_millis().unsigned_abs()
        );
        let quoted_schema = quote_identifier(&schema);
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .expect("connect PostgreSQL admin pool");
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "CREATE SCHEMA {quoted_schema}"
        )))
        .execute(&admin_pool)
        .await
        .expect("create test schema");
        admin_pool.close().await;

        let schema_for_connections = schema.clone();
        let pool = PgPoolOptions::new()
            .max_connections(4)
            .after_connect(move |connection, _metadata| {
                let schema = schema_for_connections.clone();
                Box::pin(async move {
                    sqlx::query(sqlx::AssertSqlSafe(format!(
                        "SET search_path TO {}",
                        quote_identifier(&schema)
                    )))
                    .execute(&mut *connection)
                    .await?;
                    Ok(())
                })
            })
            .connect(&database_url)
            .await
            .expect("connect PostgreSQL test pool");

        sqlx::raw_sql(include_str!(
            "../../../database/ddl/baseline/postgres/0001_cloudrouter_baseline.sql"
        ))
        .execute(&pool)
        .await
        .expect("create CloudRouter schema");
        // The billing module owns `cloudrouter_account_rate_card` and
        // `cloudrouter_pricing_plan`; the seed's closing
        // `sync_legacy_account_group_rate_cards` step joins both, so the
        // baseline alone is not enough to run the full seed.
        sqlx::raw_sql(include_str!(
            "../../../database/modules/cloudrouter-billing/ddl/baseline/postgres/0001_cloudrouter_billing_baseline.sql"
        ))
        .execute(&pool)
        .await
        .expect("create cloudrouter-billing schema");
        sqlx::raw_sql(include_str!(
            "../../../database/modules/gateway-iam/ddl/baseline/postgres/0001_gateway_iam_baseline.sql"
        ))
        .execute(&pool)
        .await
        .expect("create Gateway IAM schema");
        sqlx::raw_sql(include_str!(
            "../../../../sdkwork-models/database/ddl/baseline/postgres/0001_sdkwork-models_baseline.sql"
        ))
        .execute(&pool)
        .await
        .expect("create sdkwork-models catalog schema");
        for migration_sql in [
            include_str!("../../../database/migrations/postgres/0020_upstream_account_group_default_flag.up.sql"),
            include_str!("../../../database/migrations/postgres/0025_upstream_account_group_model_lists.up.sql"),
            include_str!("../../../database/migrations/postgres/0026_add_upstream_supplier_model_lists.up.sql"),
            include_str!("../../../database/migrations/postgres/0027_add_upstream_supplier_endpoint_vendors.up.sql"),
            include_str!("../../../database/migrations/postgres/0028_add_upstream_supplier_default_base_url.up.sql"),
            include_str!("../../../database/migrations/postgres/0030_add_upstream_account_base_urls.up.sql"),
        ] {
            sqlx::raw_sql(migration_sql)
                .execute(&pool)
                .await
                .expect("apply routing migration");
        }

        Some(Self {
            pool,
            database_url,
            schema,
        })
    }

    async fn cleanup(self) {
        self.pool.close().await;
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&self.database_url)
            .await
            .expect("reconnect PostgreSQL admin pool");
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "DROP SCHEMA IF EXISTS {} CASCADE",
            quote_identifier(&self.schema)
        )))
        .execute(&admin_pool)
        .await
        .expect("drop test schema");
        admin_pool.close().await;
    }

    async fn table_counts(&self) -> BTreeMap<String, i64> {
        let mut counts = BTreeMap::new();
        for table in SEEDED_TABLES {
            let count = sqlx::query(sqlx::AssertSqlSafe(format!(
                "SELECT COUNT(*)::bigint AS count FROM {table}"
            )))
            .fetch_one(&self.pool)
            .await
            .unwrap_or_else(|error| panic!("count {table}: {error}"))
            .get::<i64, _>("count");
            counts.insert((*table).to_owned(), count);
        }
        counts
    }
}

/// Runs the real startup install path against the isolated schema.
///
/// `ensure_bootstrap_data` requires the model catalog to be loadable and the
/// `sdkwork-models` projection tables to be present, which the seed harness
/// does not build; the idempotency contract lives entirely in
/// `import_postgres_ai_routing_seed`, so that is what is exercised here.
fn describe(error: &sqlx::Error) -> String {
    let mut chain = Vec::new();
    let mut current: Option<&(dyn std::error::Error + 'static)> = Some(error);
    while let Some(link) = current {
        chain.push(link.to_string());
        current = link.source();
    }
    chain.join(" <- ")
}

/// Builds the same credential codec the dev runtime uses, from the repository
/// key ring.
///
/// This is not optional for these tests. `import_postgres_ai_routing_seed`
/// silently *skips* the credential step when it is handed no codec
/// (`let Some(credential_codec) = credential_codec else { return Ok(()) }`),
/// and `postgres_default_vendor_upstream_accounts_complete` then reports
/// "a bundled vendor default account ... has no active credential" for every
/// vendor. A harness that passes `None` therefore cannot observe the
/// completeness the seed is supposed to reach, and every gap assertion below
/// would fail for a reason that has nothing to do with the code under test.
fn credential_codec() -> Arc<dyn UpstreamCredentialSecretCodec + Send + Sync> {
    let config = sdkwork_cloudrouter_config::UpstreamCredentialSecurityConfig::from_optional_key_ring_payload(
        Some(sdkwork_cloudrouter_test_support::resolve_upstream_credential_key_ring()),
    )
    .expect("resolved dev key ring must parse")
    .expect("the key ring resolver always yields a payload");
    Arc::new(
        RingAeadCredentialSecretCodec::with_key_ring(
            config.active_key_id(),
            config.active_key(),
            config.fingerprint_key(),
            config.decryption_keys().to_vec(),
        )
        .expect("key ring must build a codec"),
    )
}

async fn seed(context: &SeedTestContext) -> Result<(), String> {
    let codec = credential_codec();
    import_postgres_ai_routing_seed(&context.pool, Some(DEV_ENVIRONMENT), Some(codec.as_ref()))
        .await
        .map_err(|error| describe(&error))
}

/// The seed is a convergent upsert: a second run over its own output must not
/// add, remove or renumber a single row.
///
/// This is the property `ensure_bootstrap_data` relies on when it re-imports
/// the seed at startup, so it is asserted on the real schema rather than
/// argued from the SQL text.
#[tokio::test]
async fn ai_routing_seed_is_idempotent_across_repeated_imports() {
    let Some(context) = SeedTestContext::new("twice").await else {
        return;
    };

    seed(&context).await.expect("first seed import");
    let first = context.table_counts().await;

    seed(&context).await.expect("second seed import");
    let second = context.table_counts().await;

    let drift: Vec<String> = SEEDED_TABLES
        .iter()
        .filter_map(|table| {
            let before = first.get(*table).copied().unwrap_or_default();
            let after = second.get(*table).copied().unwrap_or_default();
            (before != after).then(|| format!("{table}: {before} -> {after}"))
        })
        .collect();
    assert!(
        drift.is_empty(),
        "the seed is not idempotent; these tables changed on the second import: {drift:?}"
    );

    // A third run guards against a two-cycle oscillation, which a single A/B
    // comparison cannot distinguish from convergence.
    seed(&context).await.expect("third seed import");
    let third = context.table_counts().await;
    assert_eq!(
        second, third,
        "the seed oscillates rather than converging across repeated imports"
    );

    // The counts must also be non-trivial, otherwise "stable" could just mean
    // "nothing was ever written".
    for (table, count) in &third {
        assert!(
            *count > 0,
            "table {table} is empty after three seed imports; the idempotency assertion would be vacuous"
        );
    }

    context.cleanup().await;
}

/// The completeness predicate the startup gate reads must return `true` on a
/// database the seed has just written — including the account-group grants the
/// new media-vendor groups depend on.
///
/// Without this, `ensure_bootstrap_data` would re-seed on every single boot
/// (the gate never converges) or, worse, report `Installed` while a bundled
/// group is missing.
#[tokio::test]
async fn ai_routing_seed_reaches_a_complete_state() {
    let Some(context) = SeedTestContext::new("complete").await else {
        return;
    };

    seed(&context).await.expect("seed import");

    let gap = postgres_ai_routing_seed_gap(&context.pool)
        .await
        .expect("read seed gap");
    assert_eq!(
        gap, None,
        "the seed did not reach a complete state; the startup gate would report UpgradeRequired on every boot"
    );
    assert!(
        postgres_ai_routing_seed_complete(&context.pool)
            .await
            .expect("read seed completeness"),
        "the boolean and gap forms of the completeness predicate disagree"
    );

    context.cleanup().await;
}

/// A database seeded at the previous revision must be reported as *not*
/// complete so the startup install re-imports it.
///
/// This pins the trigger rather than the outcome: delete one bundled media
/// group exactly the way a retired group is retired (soft delete), and assert
/// the gate notices. If this passes vacuously the fingerprint bump would be
/// the only thing standing between an operator and a silently stale routing
/// topology.
#[tokio::test]
async fn ai_routing_seed_gate_notices_a_missing_bundled_group() {
    let Some(context) = SeedTestContext::new("missing").await else {
        return;
    };

    seed(&context).await.expect("seed import");
    assert_eq!(
        postgres_ai_routing_seed_gap(&context.pool)
            .await
            .expect("read seed gap"),
        None,
        "precondition failed: the seed must be complete before the group is removed"
    );

    // Retire one of the v12 media groups the way `disable_removed_postgres_resource_groups`
    // retires a group whose catalog entry disappeared.
    sqlx::query(
        r#"
        UPDATE ai_resource_group
        SET status = 0, deleted_at = NOW()
        WHERE group_code = 'relay.bytedance.media'
        "#,
    )
    .execute(&context.pool)
    .await
    .expect("retire bundled media group");

    let gap = postgres_ai_routing_seed_gap(&context.pool)
        .await
        .expect("read seed gap");
    assert!(
        gap.is_some(),
        "removing a bundled media group must make the seed incomplete, otherwise startup never re-imports it"
    );
    assert!(
        !postgres_ai_routing_seed_complete(&context.pool)
            .await
            .expect("read seed completeness"),
        "the boolean form must agree with the gap form"
    );

    // Re-seeding must restore it — the convergence direction of the same gate.
    seed(&context).await.expect("re-seed after retirement");
    assert_eq!(
        postgres_ai_routing_seed_gap(&context.pool)
            .await
            .expect("read seed gap"),
        None,
        "re-seeding did not restore the retired bundled group"
    );

    context.cleanup().await;
}

/// The default mixed group names an account that a *later* seed pass creates.
///
/// `default_admin_upstream_account_group()` declares
/// `account_code: Some("openai-default")`, but `DEFAULT_ADMIN_UPSTREAM_ACCOUNTS`
/// is deliberately empty — the account is owned by the vendor path so it can be
/// enabled per environment. The topology pass that writes the group therefore
/// runs *before* the account exists.
///
/// A `fetch_one` on that lookup aborts the entire seed on a fresh database with
/// a bare `RowNotFound`, rolling the transaction back and leaving the schema
/// half-populated, so the startup gate reports an unexplained
/// `UpgradeRequired` for ever. `sync_default_group_members` reconciles the
/// membership on a second pass once the account exists.
///
/// This pins both halves: the seed must survive a fresh database, and the
/// member clause of the completeness predicate must see the reconciled row.
#[tokio::test]
async fn ai_routing_seed_attaches_a_member_created_by_a_later_pass() {
    let Some(context) = SeedTestContext::new("member").await else {
        return;
    };

    // A fresh database: nothing is seeded, and `openai-default` does not exist
    // when the topology pass writes `default-group`.
    seed(&context)
        .await
        .expect("seed a fresh database whose group names a not-yet-created account");

    let missing_members = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)::bigint
        FROM ai_upstream_account_group account_group
        WHERE account_group.deleted_at IS NULL
          AND account_group.metadata ->> 'itemCode' = account_group.group_code
          AND NOT EXISTS (
              SELECT 1
              FROM ai_upstream_account_group_member member
              JOIN ai_upstream_account account
                ON account.id = member.account_id
               AND account.deleted_at IS NULL
              WHERE member.account_group_id = account_group.id
                AND member.status = 1
                AND member.deleted_at IS NULL
          )
        "#,
    )
    .fetch_one(&context.pool)
    .await
    .expect("count seed-owned groups without a live member");
    assert_eq!(
        missing_members, 0,
        "a bundled group was seeded without its member account"
    );

    // The predicate must observe the same thing, otherwise the reconciliation
    // above is invisible to the startup gate.
    assert_eq!(
        postgres_ai_routing_seed_gap(&context.pool)
            .await
            .expect("read seed gap"),
        None,
        "the seed reports incomplete right after a successful import"
    );

    // Convergent in the other direction too: detaching the member must make the
    // gate notice, and a re-seed must re-attach it.
    sqlx::query(
        r#"
        UPDATE ai_upstream_account_group_member
        SET status = 0, deleted_at = NOW()
        WHERE account_group_id = (
            SELECT id FROM ai_upstream_account_group
            WHERE group_code = 'default-group' AND deleted_at IS NULL
        )
        "#,
    )
    .execute(&context.pool)
    .await
    .expect("detach the default group member");

    assert!(
        postgres_ai_routing_seed_gap(&context.pool)
            .await
            .expect("read seed gap")
            .is_some(),
        "a group without its member account must make the seed incomplete"
    );

    seed(&context).await.expect("re-seed after detaching member");
    assert_eq!(
        postgres_ai_routing_seed_gap(&context.pool)
            .await
            .expect("read seed gap"),
        None,
        "re-seeding did not re-attach the detached member account"
    );

    context.cleanup().await;
}
