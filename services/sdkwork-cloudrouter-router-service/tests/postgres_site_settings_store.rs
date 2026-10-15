use std::env;

use sdkwork_cloudrouter_router_service::infrastructure::sql::postgres::PostgresSiteSettingsStore;
use sdkwork_cloudrouter_router_service::ports::{
    GetSiteSettingsQuery, GetSiteSettingsScopeQuery, SiteSettings, SiteSettingsStore,
    SiteSettingsSubject, UpdateSiteSettingsCommand,
};
use serde_json::{json, Value};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";

/// The bootstrap defaults the public runtime read resolves to when the landing page calls
/// `/app/v3/api/system/site/runtime` without tenant/organization query parameters.
const DEFAULT_TENANT_SQL_ID: i64 = 100_001;
const ROOT_ORGANIZATION_SQL_ID: i64 = 0;

/// An operator-published download catalog in exactly the shape the structured editor writes:
/// one visible card with an external URL, one hidden card holding a Drive-referenced installer.
fn published_downloads() -> Value {
    json!({
        "schemaVersion": "2026-05-18.sdkwork-download-catalog.v1",
        "generatedAt": "1.0.0.release",
        "product": {
            "id": "sdkwork-cloudrouter",
            "name": "SdkWork CloudRouter",
            "version": "1.0.0"
        },
        "cards": [
            {
                "id": "card-desktop",
                "title": "Cloud Router Desktop",
                "description": "For developers.",
                "kind": "desktop",
                "actions": [
                    {
                        "id": "desktop-windows-x64",
                        "label": "Windows x64",
                        "href": "https://example.com/cloudrouter-windows-x64-1.0.0.msi",
                        "platform": "windows",
                        "architecture": "x64",
                        "fileName": "cloudrouter-windows-x64-1.0.0.msi",
                        "sizeBytes": 184320
                    }
                ]
            },
            {
                "id": "card-mobile",
                "title": "Cloud Router Mobile",
                "description": "Parked until the mobile build ships.",
                "kind": "mobile",
                "hidden": true,
                "actions": [
                    {
                        "id": "mobile-android",
                        "label": "Android",
                        "href": "drive://spaces/space-1/nodes/node-9",
                        "platform": "android",
                        "drive": {
                            "spaceId": "space-1",
                            "nodeId": "node-9",
                            "shareToken": "token-9"
                        }
                    }
                ]
            }
        ]
    })
}

fn settings_with_downloads(downloads: Value, site_name: &str) -> SiteSettings {
    SiteSettings {
        site_name: site_name.to_owned(),
        downloads,
        ..SiteSettings::default()
    }
}

fn subject() -> SiteSettingsSubject {
    SiteSettingsSubject {
        tenant_id: DEFAULT_TENANT_SQL_ID,
        organization_id: ROOT_ORGANIZATION_SQL_ID,
        operator_id: 30,
        operator_type: 1,
    }
}

fn update_command(settings: SiteSettings, requested_at: &str, suffix: &str) -> UpdateSiteSettingsCommand {
    UpdateSiteSettingsCommand {
        subject: subject(),
        audit_log_uuid: format!("test-site-settings-audit-{suffix}"),
        config_snapshot_uuid: format!("test-site-settings-snapshot-{suffix}"),
        settings,
        request_id: format!("test-site-settings-request-{suffix}"),
        requested_at: requested_at.to_owned(),
    }
}

/// The database-init contract, proven against a real PostgreSQL schema built from the baseline
/// DDL: the bootstrap scope resolves, an operator write is readable by both the admin surface
/// and the public runtime surface, and an untouched scope serves the defaults.
#[tokio::test]
async fn postgres_site_settings_store_roundtrips_operator_writes_into_the_public_runtime_scope() {
    let Some(context) = SiteSettingsTestContext::new("site_settings").await else {
        return;
    };
    let store = PostgresSiteSettingsStore::new(context.pool.clone());

    // An untouched scope serves the defaults, not an error: a fresh database never breaks the
    // landing page — `downloads` is the empty object the portal reads as "publish the bundled
    // catalog".
    let fresh = store
        .get_site_settings_for_scope(GetSiteSettingsScopeQuery {
            tenant_code: None,
            organization_code: None,
        })
        .await
        .expect("default settings for a fresh database");
    assert_eq!(json!({}), fresh.downloads);
    assert_eq!("Cloud Router", fresh.site_name);

    // The admin surface writes under the operator's SQL scope, which is the bootstrap tenant
    // plus the ROOT organization — exactly what the public runtime read resolves to.
    let first = settings_with_downloads(published_downloads(), "Acme Router");
    store
        .update_site_settings(update_command(first, "2026-10-11T12:00:00.000Z", "first"))
        .await
        .expect("write site settings snapshot");

    let admin_view = store
        .get_site_settings(GetSiteSettingsQuery { subject: subject() })
        .await
        .expect("admin read");
    assert_eq!("Acme Router", admin_view.site_name);
    assert_eq!(published_downloads(), admin_view.downloads);

    // The public runtime read — no tenant/organization parameters, the landing page's call —
    // resolves the same scope and therefore serves the operator's published catalog.
    let public_view = store
        .get_site_settings_for_scope(GetSiteSettingsScopeQuery {
            tenant_code: None,
            organization_code: None,
        })
        .await
        .expect("public runtime read");
    assert_eq!("Acme Router", public_view.site_name);
    assert_eq!(published_downloads(), public_view.downloads);
    let hidden_card = public_view
        .downloads
        .get("cards")
        .and_then(Value::as_array)
        .and_then(|cards| {
            cards
                .iter()
                .find(|card| card.get("id").and_then(Value::as_str) == Some("card-mobile"))
        })
        .expect("hidden card is stored verbatim");
    assert_eq!(
        Some(&json!(true)),
        hidden_card.get("hidden"),
        "the per-card visibility flag survives the database round trip"
    );

    // A newer snapshot wins: the console republishes and the public read follows without a
    // stale row being served.
    let second = settings_with_downloads(
        json!({
            "schemaVersion": "2026-05-18.sdkwork-download-catalog.v1",
            "product": { "id": "sdkwork-cloudrouter", "name": "SdkWork CloudRouter", "version": "2.0.0" },
            "cards": [{ "id": "card-desktop", "title": "t", "description": "d", "kind": "desktop", "actions": [{ "id": "a", "label": "l", "href": "https://example.com/a" }] }]
        }),
        "Acme Router v2",
    );
    store
        .update_site_settings(update_command(second, "2026-10-11T13:00:00.000Z", "second"))
        .await
        .expect("write second site settings snapshot");
    let republished = store
        .get_site_settings_for_scope(GetSiteSettingsScopeQuery {
            tenant_code: None,
            organization_code: None,
        })
        .await
        .expect("public runtime read after republish");
    assert_eq!("Acme Router v2", republished.site_name);
    assert_eq!("2.0.0", republished.downloads["product"]["version"]);

    // An explicit organization the bootstrap does not know resolves to not-found at the store
    // layer; the runtime handler is what maps that onto the defaults.
    let unknown_scope = store
        .get_site_settings_for_scope(GetSiteSettingsScopeQuery {
            tenant_code: Some("SDKWORK".to_owned()),
            organization_code: Some("does-not-exist".to_owned()),
        })
        .await
        .expect_err("unknown organization must not resolve");
    assert!(
        unknown_scope.is_not_found(),
        "expected a not-found domain error for an unknown organization"
    );

    context.cleanup().await;
}

struct SiteSettingsTestContext {
    pool: PgPool,
    database_url: String,
    schema: String,
}

impl SiteSettingsTestContext {
    async fn new(label: &str) -> Option<Self> {
        let database_url = match env::var(POSTGRES_TEST_DATABASE_URL) {
            Ok(value) if !value.trim().is_empty() => value,
            _ => {
                eprintln!(
                    "skipping Postgres site settings store test; set {POSTGRES_TEST_DATABASE_URL} to run it"
                );
                return None;
            }
        };
        let schema = format!(
            "test_{}_{}_{}",
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
        // The baseline DDL is the database init under test: if `ops_config_snapshot` (the site
        // settings storage table) or its audit counterpart were missing or malformed, the run
        // below fails here rather than in production.
        sqlx::raw_sql(include_str!(
            "../../../database/ddl/baseline/postgres/0001_cloudrouter_baseline.sql"
        ))
        .execute(&pool)
        .await
        .expect("create CloudRouter schema");

        // The public runtime read resolves its scope through the IAM bootstrap tables. The IAM
        // DDL belongs to the sibling iam module, so the test seeds only the columns the scope
        // resolver reads — with **string ids**, which is how the bootstrap stores them and what
        // `postgres_string_cell` reads — using the bootstrap defaults (tenant `SDKWORK`, root
        // organization `root`).
        sqlx::raw_sql(
            r#"
            CREATE TABLE iam_tenant (
                id TEXT PRIMARY KEY,
                code TEXT NOT NULL,
                status TEXT NOT NULL
            );
            CREATE TABLE iam_organization (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                code TEXT NOT NULL,
                status TEXT NOT NULL
            );
            INSERT INTO iam_tenant (id, code, status) VALUES ('100001', 'SDKWORK', 'active');
            INSERT INTO iam_organization (id, tenant_id, code, status)
                VALUES ('0', '100001', 'root', 'active');
            "#,
        )
        .execute(&pool)
        .await
        .expect("seed bootstrap IAM scope");

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
}

fn quote_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

/// Pins the storage-table contract the baseline DDL must keep providing: the site settings
/// reader filters by the portal-owned discriminator and orders by publication, so a column or
/// index rename would fail here before it fails a deployment.
#[test]
fn site_settings_snapshot_sql_keeps_its_public_read_contract() {
    let source = include_str!("../src/infrastructure/sql/postgres/site_settings_store.rs");
    let compact: String = source.split_whitespace().collect::<Vec<_>>().join(" ");

    for expected in [
        "FROM ops_config_snapshot",
        "AND source_table = $3",
        "ORDER BY published_at DESC NULLS LAST",
        "INSERT INTO ops_config_snapshot",
        "INSERT INTO ops_audit_log",
        "'update_site_settings'",
    ] {
        let compact_expected = expected.split_whitespace().collect::<Vec<_>>().join(" ");
        assert!(
            compact.contains(&compact_expected),
            "site settings store SQL must contain `{expected}`"
        );
    }

    // The source-table discriminator is what separates site settings from every other config
    // snapshot family sharing `ops_config_snapshot`; it lives in the shared SQL constants the
    // store imports, next to the scope/type codes the write path stamps.
    let constants = include_str!("../src/infrastructure/sql/sql_site_settings.rs");
    for expected in [
        "ops_site_runtime_settings",
        "CONFIG_SCOPE_SITE: i32 = 40",
        "SITE_SETTINGS_AUDIT_TARGET_TYPE: i32 = 66",
    ] {
        assert!(
            constants.contains(expected),
            "site settings SQL constants must define `{expected}`"
        );
    }
}

/// Pins the runtime read-model contract the landing page depends on: no snapshot row and a
/// missing scope both degrade to the settings default (the portal's "publish the bundled
/// catalog" state) instead of a 5xx.
#[test]
fn site_settings_runtime_read_contract_serves_defaults_without_a_row() {
    let source = include_str!("../src/api/site_settings.rs");
    assert!(
        source.contains("SiteSettings::default().localized_for"),
        "the runtime endpoint must serve settings defaults when the store is missing or the scope is empty"
    );
    assert!(
        source.contains("error.is_not_found()"),
        "a missing scope must be mapped to the defaults, not to a system error"
    );
}
