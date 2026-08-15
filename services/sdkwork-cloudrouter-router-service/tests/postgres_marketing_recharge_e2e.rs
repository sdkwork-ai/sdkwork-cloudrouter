//! Live-PostgreSQL end-to-end tests for the S6 recharge catalog unification.
//!
//! The recharge package catalog and the cash-to-points exchange rule are
//! owned by sdkwork-order (`commerce_recharge_package` /
//! `commerce_exchange_rule`, same commerce pool); cloudrouter seeds nothing.
//! Admin reads fall back to the platform-owned catalog
//! (`SDKWORK_ORDER_PLATFORM_CATALOG_TENANT_ID`, default 100001) exactly like
//! the order read store when the admin tenant has no scoped catalog, and the
//! admin write paths scope to the admin tenant.
//!
//! Skipped unless `SDKWORK_DATABASE_URL` is set (same convention as
//! `postgres_transaction_integration`).

use sdkwork_cloudrouter_router_service::infrastructure::sql::postgres::PostgresAdminMarketingStore;
use sdkwork_cloudrouter_router_service::ports::{
    AdminMarketingStore, AdminMarketingSubject, AdminRechargePackageStatus,
    CreateAdminRechargePackageCommand, DeleteAdminRechargePackageCommand,
    ListAdminExchangeRulesQuery, ListAdminRechargePackagesQuery, RechargeSettingsUpdateCommand,
    UpdateAdminRechargePackageCommand,
};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use std::collections::BTreeMap;
use std::env;

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";
const ORDER_BASELINE: &str = include_str!(
    "../../../../sdkwork-order/database/ddl/baseline/postgres/0001_order_baseline.sql"
);
const ORDER_E2E_MIGRATION: &str = include_str!(
    "../../../../sdkwork-order/crates/sdkwork-order-repository-sqlx/test_migrations/0001_order_points_recharge_e2e.postgres.sql"
);

const PLATFORM_TENANT_ID: i64 = 100_001;
const ORGANIZATION_ID: i64 = 0;
const TENANT_ID: i64 = 999_999;
const OPERATOR_ID: i64 = 1;

#[tokio::test]
async fn admin_recharge_catalog_falls_back_to_platform_scope_when_tenant_catalog_is_empty() {
    let Some(ctx) = PostgresTestContext::new("catalog_fallback").await else {
        return;
    };
    let store = PostgresAdminMarketingStore::new(ctx.pool.clone());
    let subject = make_subject(TENANT_ID);

    let page = store
        .list_recharge_packages(ListAdminRechargePackagesQuery {
            subject,
            status: None,
            page_no: 1,
            page_size: 50,
            offset: 0,
        })
        .await
        .expect("list recharge packages");
    assert_eq!(
        2,
        page.items.len(),
        "empty tenant catalog must fall back to the platform catalog"
    );
    assert!(
        page.items.iter().any(|item| item.price_amount == "10.00"),
        "platform package must be visible through the fallback"
    );
    assert!(
        page.items.iter().all(|item| item.discount == 100),
        "platform packages without a discount column value must read back as no discount (100)"
    );

    let settings = store
        .load_recharge_settings(subject)
        .await
        .expect("load recharge settings");
    assert_eq!(
        "10", settings.base_points_per_cny,
        "tenant without a scoped rule must read the platform rule"
    );

    ctx.cleanup().await;
}

#[tokio::test]
async fn admin_recharge_package_crud_writes_scoped_catalog_and_shadows_platform() {
    let Some(ctx) = PostgresTestContext::new("catalog_crud").await else {
        return;
    };
    let store = PostgresAdminMarketingStore::new(ctx.pool.clone());
    let subject = make_subject(TENANT_ID);

    let created = store
        .create_recharge_package(CreateAdminRechargePackageCommand {
            subject,
            package_uuid: "pkg-uuid-1".to_owned(),
            product_uuid: "product-uuid-1".to_owned(),
            sku_uuid: "sku-uuid-1".to_owned(),
            audit_log_uuid: "audit-uuid-1".to_owned(),
            price_amount: "25.00".to_owned(),
            currency_code: "CNY".to_owned(),
            bonus_points: 50,
            discount: 90,
            status: AdminRechargePackageStatus::Active,
            request_id: "request-1".to_owned(),
            requested_at: "2026-08-06 00:00:00".to_owned(),
        })
        .await
        .expect("create recharge package");
    assert_eq!("25.00", created.price_amount);
    assert_eq!(50, created.bonus_points);
    assert_eq!(90, created.discount);

    let page = store
        .list_recharge_packages(ListAdminRechargePackagesQuery {
            subject,
            status: None,
            page_no: 1,
            page_size: 50,
            offset: 0,
        })
        .await
        .expect("list recharge packages");
    assert_eq!(
        1,
        page.items.len(),
        "a scoped catalog must shadow the platform catalog"
    );

    let updated = store
        .update_recharge_package(UpdateAdminRechargePackageCommand {
            subject,
            package_id: created.id.clone(),
            product_uuid: "product-uuid-2".to_owned(),
            sku_uuid: "sku-uuid-2".to_owned(),
            audit_log_uuid: "audit-uuid-2".to_owned(),
            price_amount: "30.00".to_owned(),
            currency_code: "CNY".to_owned(),
            bonus_points: 60,
            discount: 85,
            status: AdminRechargePackageStatus::Active,
            request_id: "request-2".to_owned(),
            requested_at: "2026-08-06 00:01:00".to_owned(),
        })
        .await
        .expect("update recharge package");
    assert_eq!("30.00", updated.price_amount);
    assert_eq!(60, updated.bonus_points);
    assert_eq!(85, updated.discount);

    let deleted = store
        .delete_recharge_package(DeleteAdminRechargePackageCommand {
            subject,
            package_id: created.id.clone(),
            audit_log_uuid: "audit-uuid-3".to_owned(),
            request_id: "request-3".to_owned(),
            requested_at: "2026-08-06 00:02:00".to_owned(),
        })
        .await
        .expect("delete recharge package");
    assert!(deleted);

    // Deleting the last scoped package returns the tenant to the platform
    // fallback (mirrors the order `scoped_packages` + `public_packages` read).
    let page = store
        .list_recharge_packages(ListAdminRechargePackagesQuery {
            subject,
            status: None,
            page_no: 1,
            page_size: 50,
            offset: 0,
        })
        .await
        .expect("list recharge packages after delete");
    assert_eq!(
        2,
        page.items.len(),
        "empty tenant catalog must fall back to the platform catalog again"
    );

    ctx.cleanup().await;
}

#[tokio::test]
async fn admin_recharge_settings_update_writes_scoped_rule_without_touching_platform() {
    let Some(ctx) = PostgresTestContext::new("settings_update").await else {
        return;
    };
    let store = PostgresAdminMarketingStore::new(ctx.pool.clone());
    let subject = make_subject(TENANT_ID);
    let platform_subject = make_subject(PLATFORM_TENANT_ID);

    store
        .update_recharge_settings(RechargeSettingsUpdateCommand {
            subject,
            audit_log_uuid: "audit-uuid-4".to_owned(),
            base_currency_code: "CNY".to_owned(),
            base_points_per_cny: "12".to_owned(),
            currency_to_cny_rates: BTreeMap::from([("USD".to_owned(), "7.000000".to_owned())]),
            request_id: "request-4".to_owned(),
            requested_at: "2026-08-06 00:03:00".to_owned(),
        })
        .await
        .expect("update recharge settings");

    let settings = store
        .load_recharge_settings(subject)
        .await
        .expect("load scoped recharge settings");
    assert_eq!(
        "12", settings.base_points_per_cny,
        "scoped settings must win for the admin tenant"
    );

    let platform_settings = store
        .load_recharge_settings(platform_subject)
        .await
        .expect("load platform recharge settings");
    assert_eq!(
        "10", platform_settings.base_points_per_cny,
        "platform rule must stay untouched"
    );

    // Exchange-rule list for the scoped tenant shows the scoped rule only.
    let page = store
        .list_exchange_rules(ListAdminExchangeRulesQuery {
            subject,
            source_asset_type: None,
            target_asset_type: None,
            status: None,
            page_no: 1,
            page_size: 50,
            offset: 0,
        })
        .await
        .expect("list exchange rules");
    assert_eq!(
        1,
        page.items.len(),
        "tenant-scoped rules must shadow the platform rules"
    );
    assert_eq!("12", page.items[0].rate);

    ctx.cleanup().await;
}

fn make_subject(tenant_id: i64) -> AdminMarketingSubject {
    AdminMarketingSubject {
        tenant_id,
        organization_id: ORGANIZATION_ID,
        operator_id: OPERATOR_ID,
        operator_type: 1,
    }
}

struct PostgresTestContext {
    pool: PgPool,
    database_url: String,
    schema: String,
}

impl PostgresTestContext {
    async fn new(label: &str) -> Option<Self> {
        // The admin write paths use the Cloud runtime Snowflake id generator;
        // desktop/development mode accepts the env-configured node id.
        env::set_var("SDKWORK_CLOUDROUTER_SNOWFLAKE_NODE_ID", "1");
        let database_url = match env::var(POSTGRES_TEST_DATABASE_URL) {
            Ok(value) if !value.trim().is_empty() => value,
            _ => {
                eprintln!(
                    "skipping recharge catalog e2e test; set {POSTGRES_TEST_DATABASE_URL} to run it"
                );
                return None;
            }
        };
        let schema = format!("sdkwork_marketing_recharge_e2e_{label}");
        let quoted_schema = quote_identifier(&schema);
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "DROP SCHEMA IF EXISTS {quoted_schema} CASCADE"
        )))
        .execute(&admin_pool)
        .await
        .unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "CREATE SCHEMA {quoted_schema}"
        )))
        .execute(&admin_pool)
        .await
        .unwrap();
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
            .unwrap();
        create_schema(&pool).await;
        seed_platform_catalog(&pool).await;

        Some(Self {
            pool,
            database_url,
            schema,
        })
    }

    async fn cleanup(self) {
        let Self {
            pool,
            database_url,
            schema,
        } = self;
        pool.close().await;
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "DROP SCHEMA IF EXISTS {} CASCADE",
            quote_identifier(&schema)
        )))
        .execute(&admin_pool)
        .await
        .unwrap();
        admin_pool.close().await;
    }
}

async fn create_schema(pool: &PgPool) {
    // Order baseline (commerce_recharge_package) + the shared merchandise
    // catalog DDL from the order e2e test migration, plus the shared
    // exchange-rule and cloudrouter audit tables the admin store writes.
    for (_, baseline) in [ORDER_BASELINE, ORDER_E2E_MIGRATION, EXTRA_TABLES]
        .iter()
        .enumerate()
    {
        for (statement_index, statement) in split_statements(baseline).iter().enumerate() {
            if statement_index % 50 == 0 {}
            sqlx::query(sqlx::AssertSqlSafe(statement.to_owned()))
                .execute(pool)
                .await
                .expect("apply baseline DDL");
        }
    }
}

const EXTRA_TABLES: &str = r#"
CREATE TABLE IF NOT EXISTS ops_audit_log (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    operator_id BIGINT,
    operator_type INTEGER,
    action VARCHAR(128),
    target_type INTEGER,
    target_id BIGINT,
    target_uuid VARCHAR(64),
    change_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commerce_exchange_rule (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL DEFAULT '0',
    rule_no TEXT NOT NULL,
    source_asset_type TEXT NOT NULL,
    target_asset_type TEXT NOT NULL,
    rate TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    remark TEXT,
    request_no TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, organization_id, source_asset_type, target_asset_type)
);

-- The shared merchandise catalog tables are written by the admin recharge
-- package paths with the full column set; replace the minimal order-e2e
-- variants with the complete shape.
DROP TABLE IF EXISTS commerce_product_spu_category;
DROP TABLE IF EXISTS commerce_product_sku;
DROP TABLE IF EXISTS commerce_product_spu;

CREATE TABLE commerce_product_spu (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL DEFAULT '0',
    spu_no TEXT NOT NULL,
    title TEXT,
    subtitle TEXT,
    description TEXT,
    product_type TEXT NOT NULL DEFAULT 'standard',
    status TEXT NOT NULL DEFAULT 'active',
    visible_surfaces TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, organization_id, spu_no)
);

CREATE TABLE commerce_product_sku (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL DEFAULT '0',
    spu_id TEXT NOT NULL,
    sku_no TEXT NOT NULL,
    name TEXT,
    title TEXT,
    price_amount TEXT,
    original_price_amount TEXT,
    currency_code TEXT,
    fulfillment_type TEXT NOT NULL DEFAULT 'physical',
    inventory_tracking TEXT NOT NULL DEFAULT 'untracked',
    status TEXT NOT NULL DEFAULT 'active',
    spec_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, organization_id, sku_no)
);

CREATE TABLE commerce_product_spu_category (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL DEFAULT '0',
    spu_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    primary_flag BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, spu_id, category_id)
);
"#;

async fn seed_platform_catalog(pool: &PgPool) {
    sqlx::query(
        r#"
        INSERT INTO commerce_recharge_package
            (id, tenant_id, organization_id, external_id, package_no, sku_id, name, price_amount, currency_code, bonus_points, status, sort_weight, request_no, idempotency_key, created_at, updated_at)
        VALUES
            ('platform-pkg-1', '100001', '0', 1, 'platform-pkg-1', 'platform-sku-1', 'Points recharge 10.00 CNY', '10.00', 'CNY', 0, 'active', 10, 'platform-seed-1', 'platform-seed-1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('platform-pkg-2', '100001', '0', 2, 'platform-pkg-2', 'platform-sku-2', 'Points recharge 50.00 CNY', '50.00', 'CNY', 10, 'active', 20, 'platform-seed-2', 'platform-seed-2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#,
    )
    .execute(pool)
    .await
    .expect("seed platform recharge packages");
    sqlx::query(
        r#"
        INSERT INTO commerce_exchange_rule
            (id, tenant_id, organization_id, rule_no, source_asset_type, target_asset_type, rate, status, base_currency_code, remark, request_no, idempotency_key, created_at, updated_at)
        VALUES
            ('platform-rule-1', '100001', '0', 'CASH_TO_POINTS', 'cash', 'points', '10', 'active', 'CNY', NULL, 'platform-rule-seed', 'platform-rule-seed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#,
    )
    .execute(pool)
    .await
    .expect("seed platform exchange rule");
    sqlx::query(
        r#"
        INSERT INTO commerce_exchange_currency_rate
            (id, rule_id, currency_code, rate, created_at, updated_at)
        VALUES
            ('platform-rate-1-CNY', 'platform-rule-1', 'CNY', '1.000000', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('platform-rate-1-USD', 'platform-rule-1', 'USD', '7.000000', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#,
    )
    .execute(pool)
    .await
    .expect("seed platform exchange currency rates");
}

fn split_statements(baseline: &str) -> Vec<String> {
    let without_comments = baseline
        .lines()
        .filter(|line| !line.trim_start().starts_with("--"))
        .collect::<Vec<_>>()
        .join("\n");
    without_comments
        .split(';')
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
        .filter(|statement| {
            // Baselines embed BEGIN/COMMIT blocks; each statement commits
            // independently here, so transaction-control markers must not
            // leave a dangling transaction on a pooled connection.
            !matches!(
                statement.to_ascii_uppercase().as_str(),
                "BEGIN" | "COMMIT" | "START TRANSACTION" | "ROLLBACK" | "END"
            )
        })
        .map(str::to_owned)
        .collect()
}

fn quote_identifier(identifier: &str) -> String {
    format!("\"{}\"", identifier.replace('"', "\"\""))
}
