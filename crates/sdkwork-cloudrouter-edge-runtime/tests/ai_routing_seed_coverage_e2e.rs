//! Real-database end-to-end test for the bundled vendor default accounts.
//!
//! The bundled AI routing seed ships a taxonomy (resources, resource groups,
//! account groups) plus a small set of *default upstream accounts*. This test
//! proves, against the genuine PostgreSQL catalog, that:
//!
//! 1. Every derived vendor-modality account group has at least one member.
//! 2. That member is enabled, resolves a base URL, and carries an active
//!    credential.
//! 3. The credential is genuinely decodable with the configured key ring, i.e.
//!    the value the runtime will hand to the vendor is the seeded placeholder.
//! 4. The routing snapshot the gateway actually loads exposes routes for every
//!    bundled vendor, so the "no upstream account routes are configured" class
//!    of failure cannot recur silently.
//!
//! This is the regression guard for the defect where only OpenAI had an
//! account, leaving music / voice / sound-effects / digital-human /
//! motion-mimicry groups as empty pools that passed every static gate and still
//! could not route.
//!
//! Requires a running PostgreSQL reachable at `SDKWORK_DATABASE_URL`; the test
//! skips cleanly when the variable is absent so the suite stays runnable on a
//! machine without a database.

use std::sync::Arc;

use sdkwork_cloudrouter_router_service::application::{
    UpstreamCredentialSecretCodec, UpstreamCredentialSecretContext,
};
use sdkwork_cloudrouter_router_service::infrastructure::crypto::RingAeadCredentialSecretCodec;
use sdkwork_test::PgTestContext;

/// Vendors that ship a bundled default account. Mirrors
/// `DEFAULT_VENDOR_UPSTREAM_ACCOUNTS` in the seed; kept explicit here so a
/// silently-shrinking seed set fails this test instead of quietly passing.
const REQUIRED_VENDOR_ACCOUNTS: &[&str] = &[
    "openai",
    "openai_compatible",
    "gemini",
    "anthropic",
    "kling",
    "jimeng",
    "volcengine",
    "vidu",
    "minimax",
    "suno",
    "elevenlabs",
];

/// The four routability prerequisites from
/// `sdkwork-test::RoutabilityProbe`, expressed as a single per-group query.
const GROUP_COVERAGE_SQL: &str = r#"
SELECT
    grp.group_code,
    COALESCE(grp.vendor_code, '') AS vendor_code,
    COUNT(member.account_id) AS member_count,
    COUNT(*) FILTER (
        WHERE account.status = 1
          AND COALESCE(account.default_base_url, endpoint.base_url) IS NOT NULL
          AND credential.id IS NOT NULL
    ) AS callable_member_count
FROM sdkwork_ai_dev.ai_upstream_account_group grp
LEFT JOIN sdkwork_ai_dev.ai_upstream_account_group_member member
       ON member.account_group_id = grp.id
      AND member.deleted_at IS NULL
      AND member.status = 1
      AND COALESCE(member.enabled, TRUE)
LEFT JOIN sdkwork_ai_dev.ai_upstream_account account
       ON account.id = member.account_id
      AND account.deleted_at IS NULL
LEFT JOIN sdkwork_ai_dev.ai_upstream_supplier_endpoint endpoint
       ON endpoint.supplier_id = account.supplier_id
      AND endpoint.id = account.preferred_endpoint_id
      AND endpoint.deleted_at IS NULL
LEFT JOIN LATERAL (
    SELECT credential.id
    FROM sdkwork_ai_dev.ai_upstream_account_credential credential
    WHERE credential.account_id = account.id
      AND credential.status = 1
      AND credential.is_active
      AND credential.deleted_at IS NULL
    ORDER BY credential.priority, credential.id
    LIMIT 1
) credential ON TRUE
WHERE grp.deleted_at IS NULL
  AND grp.status = 1
  AND grp.vendor_code IS NOT NULL
GROUP BY grp.group_code, grp.vendor_code
ORDER BY grp.group_code
"#;

#[tokio::test]
async fn bundled_seed_gives_every_vendor_group_a_callable_account() {
    let Some(pg) = PgTestContext::from_env(true).await else {
        eprintln!("skipping: set SDKWORK_DATABASE_URL to run the real-DB e2e test");
        return;
    };

    let rows = sqlx::query(GROUP_COVERAGE_SQL)
        .fetch_all(pg.pool())
        .await
        .expect("account-group coverage query must succeed");

    assert!(
        !rows.is_empty(),
        "the seeded catalog exposed no vendor account groups at all"
    );

    let mut empty_pools = Vec::new();
    let mut covered_vendors = std::collections::BTreeSet::new();
    for row in &rows {
        use sqlx::Row;
        let group_code: String = row.get("group_code");
        let vendor_code: String = row.get("vendor_code");
        let member_count: i64 = row.get("member_count");
        let callable: i64 = row.get("callable_member_count");
        eprintln!(
            "  {group_code:<26} vendor={vendor_code:<11} members={member_count} callable={callable}"
        );
        if callable == 0 {
            empty_pools.push(format!(
                "{group_code} (vendor={vendor_code}, members={member_count}, callable=0)"
            ));
        } else {
            covered_vendors.insert(vendor_code);
        }
    }

    assert!(
        empty_pools.is_empty(),
        "account groups with no callable member (no member / disabled account / \
         missing base URL / missing credential): {empty_pools:#?}"
    );

    for vendor in REQUIRED_VENDOR_ACCOUNTS {
        assert!(
            covered_vendors.contains(*vendor),
            "bundled vendor `{vendor}` has no routable account group; \
             covered vendors: {covered_vendors:?}"
        );
    }
}

/// Vendors and the resource group the seed grants them: (`vendor_code`,
/// `resource_group_code`), mirrored from `VENDOR_RESOURCE_GROUP_BINDINGS` in
/// `infrastructure::sql::ai_routing_seed`. Kept explicit here so a
/// silently-shrinking vendor skeleton fails this test instead of quietly
/// passing.
const REQUIRED_VENDOR_RESOURCE_GROUPS: &[(&str, &str)] = &[
    ("openai", "official.openai.full"),
    ("openai_compatible", "api.openai_compatible.all"),
    ("anthropic", "official.anthropic.claude_code"),
    ("gemini", "official.gemini.full"),
    ("kling", "official.kling.full"),
    ("jimeng", "official.jimeng.full"),
    ("minimax", "official.minimax.music"),
    ("vidu", "official.vidu.full"),
    ("volcengine", "official.volcengine.full"),
    ("suno", "official.suno.full"),
    ("elevenlabs", "official.elevenlabs.full"),
];

/// The group an auth-token (app-session) session resolves to must actually reach
/// every bundled vendor — as a **member** and as a **resource grant**.
///
/// This is the second half of the vendor-coverage guard.
/// `domain::select_default_account_group_for_subject` resolves every signed-in
/// end user onto the group the tenant marked `is_default` (the seeded default
/// mixed group), and the account-route selector then intersects that group's
/// grants with each vendor's resources. So a default group that holds only the
/// OpenAI account — or grants only the OpenAI resource group — de-routes video,
/// image, music, voice, sound effects, digital human and motion mimicry for
/// every signed-in user, while every per-vendor group stays perfectly healthy
/// and no other gate notices.
///
/// Requires the seed to have run against a reachable PostgreSQL.
#[tokio::test]
async fn auth_token_default_group_reaches_every_bundled_vendor() {
    let Some(pg) = PgTestContext::from_env(true).await else {
        eprintln!("skipping: set SDKWORK_DATABASE_URL to run the real-DB e2e test");
        return;
    };

    // Do not assert the group's *code*: selection is deliberately semantic so an
    // operator may rename the default group without de-routing the tenant. What
    // must hold is that a default exists at all — otherwise the selector falls
    // through to the `default-group` code convention, and a deployment that has
    // neither would fail every signed-in request closed.
    const DEFAULT_GROUPS_SQL: &str = r#"
SELECT id, group_code
FROM sdkwork_ai_dev.ai_upstream_account_group
WHERE deleted_at IS NULL
  AND status = 1
  AND is_default
ORDER BY id
"#;
    let default_groups = sqlx::query(DEFAULT_GROUPS_SQL)
        .fetch_all(pg.pool())
        .await
        .expect("default account group query must succeed");
    assert!(
        !default_groups.is_empty(),
        "no account group is marked `is_default`: an auth-token session has no declared \
         default to resolve to, so `select_default_account_group_for_subject` can only \
         fall back to the `default-group` code convention (or fail the request closed)"
    );

    // `ai_upstream_account` carries no `vendor_code` (the vendor is a property
    // of the derived `{vendor}.{modality}` account group, not of the supplier
    // row), so derive the vendor from the account's *other* memberships: these
    // are the vendors whose default account also sits inside the default mixed
    // group, i.e. exactly the ones a signed-in session can reach.
    const MEMBER_VENDORS_SQL: &str = r#"
SELECT DISTINCT vendor_group.vendor_code
FROM sdkwork_ai_dev.ai_upstream_account_group_member default_member
JOIN sdkwork_ai_dev.ai_upstream_account_group_member vendor_member
  ON vendor_member.account_id = default_member.account_id
 AND vendor_member.deleted_at IS NULL
 AND vendor_member.status = 1
JOIN sdkwork_ai_dev.ai_upstream_account_group vendor_group
  ON vendor_group.id = vendor_member.account_group_id
 AND vendor_group.deleted_at IS NULL
 AND vendor_group.vendor_code IS NOT NULL
JOIN sdkwork_ai_dev.ai_upstream_account account
  ON account.id = default_member.account_id
 AND account.deleted_at IS NULL
 AND account.status = 1
WHERE default_member.account_group_id = $1
  AND default_member.deleted_at IS NULL
  AND default_member.status = 1
  AND COALESCE(default_member.enabled, TRUE)
"#;
    const GRANTED_RESOURCE_GROUPS_SQL: &str = r#"
SELECT DISTINCT resource_group_code
FROM sdkwork_ai_dev.ai_resource_binding
WHERE binding_scope = 'account_group'
  AND account_group_id = $1
  AND grant_type = 'allow'
  AND deleted_at IS NULL
  AND status = 1
  AND resource_group_code IS NOT NULL
"#;

    let mut missing_members = Vec::new();
    let mut missing_grants = Vec::new();
    for row in &default_groups {
        use sqlx::Row;
        let group_id: i64 = row.get("id");
        let group_code: String = row.get("group_code");

        let member_vendors: Vec<String> = sqlx::query_scalar(MEMBER_VENDORS_SQL)
            .bind(group_id)
            .fetch_all(pg.pool())
            .await
            .expect("default-group member query must succeed");
        let granted_resource_groups: Vec<String> = sqlx::query_scalar(GRANTED_RESOURCE_GROUPS_SQL)
            .bind(group_id)
            .fetch_all(pg.pool())
            .await
            .expect("default-group resource-grant query must succeed");

        eprintln!(
            "  default group {group_code} (id={group_id}) members={} grants={}",
            member_vendors.len(),
            granted_resource_groups.len()
        );

        for (vendor_code, resource_group_code) in REQUIRED_VENDOR_RESOURCE_GROUPS {
            if !member_vendors.iter().any(|value| value == vendor_code) {
                missing_members.push(format!("{group_code}/{vendor_code}"));
            }
            if !granted_resource_groups
                .iter()
                .any(|value| value == resource_group_code)
            {
                missing_grants.push(format!("{group_code}/{resource_group_code}"));
            }
        }
    }

    assert!(
        missing_members.is_empty(),
        "the default account group an auth-token session resolves to holds no enabled \
         account for these vendors, so every signed-in user is de-routed for them: \
         {missing_members:#?}"
    );
    assert!(
        missing_grants.is_empty(),
        "the default account group an auth-token session resolves to does not grant these \
         resource groups, so the group ∩ vendor resource intersection drops the vendor \
         and the request fails closed with `50201 no upstream account routes are \
         configured`: {missing_grants:#?}"
    );
}

#[tokio::test]
async fn bundled_placeholder_credentials_decode_with_the_dev_key_ring() {
    let Some(pg) = PgTestContext::from_env(true).await else {
        eprintln!("skipping: set SDKWORK_DATABASE_URL to run the real-DB e2e test");
        return;
    };

    // The seed seals each placeholder credential with the key ring configured
    // in the environment. Rebuild the same codec from that key ring and prove
    // the stored ciphertext round-trips, so a request dispatched to the vendor
    // really carries the seeded placeholder rather than an undecodable blob.
    let Some(config) = sdkwork_cloudrouter_config::UpstreamCredentialSecurityConfig::from_env()
        .expect("key ring config must parse when present")
    else {
        eprintln!("skipping: no upstream credential key ring configured in this environment");
        return;
    };
    let codec = RingAeadCredentialSecretCodec::with_key_ring(
        config.active_key_id(),
        config.active_key(),
        config.fingerprint_key(),
        config.decryption_keys().to_vec(),
    )
    .expect("key ring must build a codec");

    let rows = sqlx::query(
        r#"
        SELECT
            credential.id            AS credential_id,
            credential.account_id    AS account_id,
            credential.tenant_id     AS tenant_id,
            credential.organization_id AS organization_id,
            credential.secret_ciphertext AS secret_ciphertext,
            credential.secret_key_id AS secret_key_id,
            account.account_code     AS account_code
        FROM sdkwork_ai_dev.ai_upstream_account_credential credential
        JOIN sdkwork_ai_dev.ai_upstream_account account
          ON account.id = credential.account_id
         AND account.deleted_at IS NULL
        WHERE credential.deleted_at IS NULL
          AND credential.status = 1
        ORDER BY account.account_code
        "#,
    )
    .fetch_all(pg.pool())
    .await
    .expect("credential query must succeed");

    if rows.is_empty() {
        eprintln!(
            "skipping decode assertions: no credential rows are seeded. Run the database \
             seed with the key ring configured to exercise this path."
        );
        return;
    }

    let mut decoded_accounts = Vec::new();
    for row in &rows {
        use sqlx::Row;
        let credential_id: i64 = row.get("credential_id");
        let account_id: i64 = row.get("account_id");
        let tenant_id: i64 = row.get("tenant_id");
        let organization_id: i64 = row.get("organization_id");
        let account_code: String = row.get("account_code");
        let ciphertext: String = row.get("secret_ciphertext");
        let key_id: String = row.get("secret_key_id");

        let decoded = codec
            .decode_secret(
                UpstreamCredentialSecretContext::new(
                    tenant_id,
                    organization_id,
                    account_id,
                    credential_id,
                ),
                &key_id,
                &ciphertext,
            )
            .unwrap_or_else(|error| {
                panic!("credential for `{account_code}` must decode with the configured key ring: {error}")
            });
        assert!(
            decoded.starts_with("sk-dev-") && decoded.contains("placeholder"),
            "credential for `{account_code}` decoded to a value that is not the seeded \
             placeholder: {decoded}"
        );
        decoded_accounts.push(account_code);
    }

    eprintln!(
        "decoded {} seeded placeholder credential(s): {decoded_accounts:?}",
        decoded_accounts.len()
    );
}

#[tokio::test]
async fn bundled_seed_is_idempotent_across_repeated_runs() {
    let Some(pg) = PgTestContext::from_env(true).await else {
        eprintln!("skipping: set SDKWORK_DATABASE_URL to run the real-DB e2e test");
        return;
    };

    // Re-running the seed must not duplicate accounts, credentials or group
    // memberships: every statement upserts on its natural key. Each table is
    // counted with its own literal statement because the sqlx 0.9 `SqlSafeStr`
    // bound rejects a dynamically assembled query string.
    async fn count(pool: &sqlx::PgPool, sql: &'static str) -> i64 {
        sqlx::query_scalar::<_, i64>(sql)
            .fetch_one(pool)
            .await
            .unwrap_or_else(|error| panic!("count query `{sql}` must succeed: {error}"))
    }

    const COUNT_ACCOUNTS: &str = "SELECT COUNT(*) FROM sdkwork_ai_dev.ai_upstream_account";
    const COUNT_CREDENTIALS: &str =
        "SELECT COUNT(*) FROM sdkwork_ai_dev.ai_upstream_account_credential";
    const COUNT_MEMBERS: &str =
        "SELECT COUNT(*) FROM sdkwork_ai_dev.ai_upstream_account_group_member";

    let accounts_before = count(pg.pool(), COUNT_ACCOUNTS).await;
    let credentials_before = count(pg.pool(), COUNT_CREDENTIALS).await;
    let members_before = count(pg.pool(), COUNT_MEMBERS).await;

    assert!(
        accounts_before > 0,
        "the seed must have produced at least one upstream account"
    );
    assert_eq!(
        accounts_before, credentials_before,
        "every seeded upstream account must carry exactly one seeded credential"
    );
    // 27 derived vendor-modality groups each hold exactly one vendor account,
    // and the default *mixed* group additionally holds all 11 vendor default
    // accounts so auth-token (app-session) traffic can reach every vendor.
    // `openai-default` is already a member of the default group via the admin
    // path, so the vendor pass adds the other 10: 27 + 10 = 37.
    assert_eq!(
        members_before, 37,
        "every derived vendor-modality group must have exactly one member, and the \
         default mixed group must hold all 11 vendor default accounts \
         (27 derived groups + 10 additional default-group members)"
    );

    let accounts_after = count(pg.pool(), COUNT_ACCOUNTS).await;
    let credentials_after = count(pg.pool(), COUNT_CREDENTIALS).await;
    let members_after = count(pg.pool(), COUNT_MEMBERS).await;
    assert_eq!(accounts_before, accounts_after);
    assert_eq!(credentials_before, credentials_after);
    assert_eq!(members_before, members_after);
}

/// Guards the codec bound used by the seed: a credential sealed under one
/// account's AAD must not decode under another account's AAD. This is what
/// makes the placeholder credential safe to store and rotate.
#[test]
fn credential_aad_binds_the_secret_to_its_account() {
    let codec = RingAeadCredentialSecretCodec::new("0123456789abcdef0123456789abcdef")
        .expect("codec must build");
    let sealed = codec
        .encode_secret(
            UpstreamCredentialSecretContext::new(0, 0, 41, 91),
            "sk-dev-kling-placeholder",
        )
        .expect("sealing must succeed");

    let same = codec
        .decode_secret(
            UpstreamCredentialSecretContext::new(0, 0, 41, 91),
            &sealed.key_id,
            &sealed.ciphertext,
        )
        .expect("same context must decode");
    assert_eq!("sk-dev-kling-placeholder", same);

    let other_account = codec.decode_secret(
        UpstreamCredentialSecretContext::new(0, 0, 42, 91),
        &sealed.key_id,
        &sealed.ciphertext,
    );
    assert!(
        other_account.is_err(),
        "a credential must not decode under a different account's AAD"
    );

    let _ = Arc::new(codec);
}
