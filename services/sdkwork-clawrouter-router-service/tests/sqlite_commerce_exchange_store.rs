use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAdminMarketingStore;
use sdkwork_clawrouter_router_service::ports::{
    AdminMarketingStore, AdminMarketingSubject, ListAdminExchangeRulesQuery,
    UpdateAdminExchangeRuleCommand,
};
use sdkwork_promotion_repository_sqlx::SqliteCommerceExchangeStore;
use sdkwork_promotion_service::{AppCommerceExchangeRuleQuery, AppCommerceSubject};
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::Row;

#[tokio::test]
async fn sqlite_admin_marketing_upserts_exchange_rule_into_appbase_commerce_rule_table() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_exchange_schema(&pool).await;

    let store = SqliteAdminMarketingStore::new(pool.clone());
    let command = UpdateAdminExchangeRuleCommand {
        subject: admin_subject(),
        audit_log_uuid: "audit-exchange-rule".to_owned(),
        source_asset_type: "POINTS".to_owned(),
        target_asset_type: "CASH".to_owned(),
        rate: "250.000000".to_owned(),
        remark: "POINTS to CASH exchange rate".to_owned(),
        request_id: "req-exchange-rule".to_owned(),
        requested_at: "2026-05-18T10:00:00Z".to_owned(),
    };

    let item = store.update_exchange_rule(command.clone()).await.unwrap();

    assert_eq!("exchange-rule-100001-0-points-cash", item.id);
    assert_eq!("POINTS", item.source_asset_type);
    assert_eq!("CASH", item.target_asset_type);
    assert_eq!("250", item.rate);
    assert_eq!("active", item.status);

    let row = sqlx::query(
        r#"
        SELECT id, tenant_id, organization_id, rule_no, source_asset_type, target_asset_type,
               rate, status, remark, request_no, idempotency_key, created_at, updated_at
        FROM commerce_exchange_rule
        WHERE id = 'exchange-rule-100001-0-points-cash'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!("100001", string_cell(&row, "tenant_id"));
    assert_eq!("0", string_cell(&row, "organization_id"));
    assert_eq!("POINTS_TO_CASH", string_cell(&row, "rule_no"));
    assert_eq!("points", string_cell(&row, "source_asset_type"));
    assert_eq!("cash", string_cell(&row, "target_asset_type"));
    assert_eq!("250.000000", string_cell(&row, "rate"));
    assert_eq!("active", string_cell(&row, "status"));
    assert_eq!("POINTS to CASH exchange rate", string_cell(&row, "remark"));
    assert_eq!("req-exchange-rule", string_cell(&row, "request_no"));
    assert_eq!("req-exchange-rule", string_cell(&row, "idempotency_key"));

    let audit = sqlx::query(
        "SELECT action, target_type, target_id, target_uuid, request_id FROM ops_audit_log",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!("update_exchange_rule", string_cell(&audit, "action"));
    assert_eq!(75, integer_cell(&audit, "target_type"));
    assert_eq!(None, optional_integer_cell(&audit, "target_id"));
    assert_eq!(
        "exchange-rule-100001-0-points-cash",
        string_cell(&audit, "target_uuid")
    );
    assert_eq!("req-exchange-rule", string_cell(&audit, "request_id"));

    let updated = store
        .update_exchange_rule(UpdateAdminExchangeRuleCommand {
            rate: "300.500000".to_owned(),
            request_id: "req-exchange-rule-update".to_owned(),
            requested_at: "2026-05-18T10:05:00Z".to_owned(),
            ..command
        })
        .await
        .unwrap();
    assert_eq!("exchange-rule-100001-0-points-cash", updated.id);
    assert_eq!("300.5", updated.rate);

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM commerce_exchange_rule")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(1, count);
    let stored_rate: String = sqlx::query_scalar(
        "SELECT rate FROM commerce_exchange_rule WHERE id = 'exchange-rule-100001-0-points-cash'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!("300.500000", stored_rate);
}

#[tokio::test]
async fn sqlite_app_exchange_store_reads_subject_rule_before_global_rule() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_exchange_schema(&pool).await;
    seed_exchange_rule(
        &pool,
        "exchange-rule-global",
        "100001",
        Some("0"),
        "120.000000",
        "2026-05-18T09:00:00Z",
    )
    .await;
    seed_exchange_rule(
        &pool,
        "exchange-rule-tenant",
        "200002",
        Some("0"),
        "250.000000",
        "2026-05-18T10:00:00Z",
    )
    .await;

    let store = SqliteCommerceExchangeStore::new(pool.clone());
    let item = store
        .load_points_exchange_rate(AppCommerceExchangeRuleQuery {
            subject: Some(AppCommerceSubject {
                tenant_id: "200002".to_owned(),
                organization_id: Some("0".to_owned()),
                user_id: "30".to_owned(),
            }),
            source_asset_type: Some("POINTS".to_owned()),
            target_asset_type: Some("CASH".to_owned()),
        })
        .await
        .unwrap()
        .unwrap();

    assert_eq!("exchange-rule-tenant", item.id);
    assert_eq!("POINTS", item.source_asset_type);
    assert_eq!("CASH", item.target_asset_type);
    assert_eq!("250", item.rate);
    assert_eq!("active", item.status);

    let global = store
        .load_points_exchange_rate(AppCommerceExchangeRuleQuery {
            subject: None,
            source_asset_type: Some("POINTS".to_owned()),
            target_asset_type: Some("CASH".to_owned()),
        })
        .await
        .unwrap()
        .unwrap();
    assert_eq!("exchange-rule-global", global.id);
    assert_eq!("120", global.rate);

    let rules = store
        .list_exchange_rules(AppCommerceExchangeRuleQuery {
            subject: Some(AppCommerceSubject {
                tenant_id: "200002".to_owned(),
                organization_id: Some("0".to_owned()),
                user_id: "30".to_owned(),
            }),
            source_asset_type: Some("POINTS".to_owned()),
            target_asset_type: Some("CASH".to_owned()),
        })
        .await
        .unwrap();
    assert_eq!("exchange-rule-tenant", rules[0].id);
    assert_eq!("exchange-rule-global", rules[1].id);
}

#[tokio::test]
async fn sqlite_admin_marketing_lists_exchange_rules_from_appbase_commerce_table() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_exchange_schema(&pool).await;
    seed_exchange_rule(
        &pool,
        "exchange-rule-tenant",
        "100001",
        Some("0"),
        "250.000000",
        "2026-05-18T10:00:00Z",
    )
    .await;

    let store = SqliteAdminMarketingStore::new(pool);
    let rules = store
        .list_exchange_rules(ListAdminExchangeRulesQuery {
            subject: admin_subject(),
            source_asset_type: Some("POINTS".to_owned()),
            target_asset_type: Some("CASH".to_owned()),
            status: Some("active".to_owned()),
            page_no: 1,
            page_size: 20,
            offset: 0,
        })
        .await
        .unwrap();

    assert_eq!(1, rules.items.len());
    assert_eq!(1, rules.total);
    assert_eq!(1, rules.page_no);
    assert_eq!(20, rules.page_size);

    let rule = &rules.items[0];
    assert_eq!("exchange-rule-tenant", rule.id);
    assert_eq!("POINTS", rule.source_asset_type);
    assert_eq!("CASH", rule.target_asset_type);
    assert_eq!("250", rule.rate);
    assert_eq!("active", rule.status);
}

async fn create_exchange_schema(pool: &sqlx::SqlitePool) {
    for statement in [
        r#"
        CREATE TABLE commerce_exchange_rule (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            rule_no TEXT NOT NULL,
            source_asset_type TEXT NOT NULL,
            target_asset_type TEXT NOT NULL,
            rate TEXT NOT NULL,
            status TEXT NOT NULL,
            remark TEXT,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, organization_id, source_asset_type, target_asset_type)
        )
        "#,
        r#"
        CREATE TABLE ops_audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            request_id TEXT,
            trace_id TEXT,
            operator_id INTEGER,
            action TEXT,
            target_type INTEGER,
            target_id INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT NOT NULL DEFAULT '{}',
            operator_type INTEGER,
            target_uuid TEXT,
            change_summary TEXT
        )
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_exchange_rule(
    pool: &sqlx::SqlitePool,
    id: &str,
    tenant_id: &str,
    organization_id: Option<&str>,
    rate: &str,
    updated_at: &str,
) {
    sqlx::query(
        r#"
        INSERT INTO commerce_exchange_rule
            (id, tenant_id, organization_id, rule_no, source_asset_type, target_asset_type, rate, status, remark, request_no, idempotency_key, created_at, updated_at)
        VALUES
            (?, ?, ?, 'POINTS_TO_CASH', 'points', 'cash', ?, 'active', '', ?, ?, ?, ?)
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(rate)
    .bind(format!("request-{id}"))
    .bind(format!("request-{id}"))
    .bind(updated_at)
    .bind(updated_at)
    .execute(pool)
    .await
    .unwrap();
}

fn admin_subject() -> AdminMarketingSubject {
    AdminMarketingSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 30,
        operator_type: 1,
    }
}

fn string_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> String {
    row.try_get::<String, _>(column)
        .or_else(|_| {
            row.try_get::<Option<String>, _>(column)
                .map(|value| value.unwrap_or_default())
        })
        .unwrap()
}

fn integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> i64 {
    row.try_get::<i64, _>(column)
        .or_else(|_| row.try_get::<i32, _>(column).map(i64::from))
        .unwrap()
}

fn optional_integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> Option<i64> {
    row.try_get::<Option<i64>, _>(column)
        .ok()
        .flatten()
        .or_else(|| {
            row.try_get::<Option<i32>, _>(column)
                .ok()
                .flatten()
                .map(i64::from)
        })
}
