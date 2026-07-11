use sdkwork_claw_test_support::DialectTestContext;
use sdkwork_clawrouter_settlements_dashboard_repository_sqlx::{
    PostgresSettlementsDashboardReadStore, SettlementsDashboardQuery,
    SettlementsDashboardReadStore, SettlementsDashboardSubject,
    SqliteSettlementsDashboardReadStore,
};

#[tokio::test]
async fn postgres_and_sqlite_return_the_same_scoped_settlement_snapshot() -> anyhow::Result<()> {
    let databases = DialectTestContext::require("settlements_dashboard").await?;
    for statement in [
        r#"
        CREATE TABLE commerce_usage_statement (
            id BIGINT NOT NULL PRIMARY KEY,
            statement_no TEXT,
            period TEXT,
            period_start TEXT,
            period_end TEXT,
            created_at TEXT,
            updated_at TEXT,
            total_tokens BIGINT,
            total_cost NUMERIC,
            statement_status BIGINT NOT NULL,
            payment_status BIGINT NOT NULL,
            due_at TEXT,
            status BIGINT NOT NULL,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            owner_id BIGINT NOT NULL,
            export_id BIGINT,
            invoice_id TEXT
        )
        "#,
        r#"
        CREATE TABLE commerce_usage_settlement (
            id BIGINT NOT NULL PRIMARY KEY,
            status BIGINT NOT NULL,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            created_at TEXT
        )
        "#,
        r#"
        CREATE TABLE commerce_billing_export (
            id BIGINT NOT NULL PRIMARY KEY,
            status BIGINT NOT NULL,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE commerce_invoice (
            id TEXT NOT NULL PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE commerce_usage_statement_item (
            id BIGINT NOT NULL PRIMARY KEY,
            statement_id BIGINT NOT NULL,
            modality BIGINT NOT NULL,
            model TEXT,
            model_list TEXT,
            usage_text TEXT,
            request_count BIGINT,
            token_count BIGINT,
            asset_count BIGINT,
            duration_seconds BIGINT,
            cost_amount NUMERIC,
            status BIGINT NOT NULL,
            item_type BIGINT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE ai_usage (
            id BIGINT NOT NULL PRIMARY KEY,
            modality BIGINT NOT NULL,
            customer_charge_amount NUMERIC,
            occurred_at TEXT,
            status BIGINT NOT NULL,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            user_id BIGINT NOT NULL
        )
        "#,
        r#"
        INSERT INTO commerce_usage_statement (
            id, statement_no, period, period_start, period_end, created_at, updated_at,
            total_tokens, total_cost, statement_status, payment_status, due_at, status,
            tenant_id, organization_id, owner_id, export_id, invoice_id
        ) VALUES
            (1, 'statement-2026-05', '2026-05', '2026-05-01', '2026-05-31',
             '2026-05-01', '2026-06-01', 300, 12.5, 1, 1, '2026-06-10', 1,
             100001, 0, 30, NULL, NULL),
            (2, 'statement-other', '2026-05', '2026-05-01', '2026-05-31',
             '2026-05-01', '2026-06-01', 9999, 999.0, 1, 1, '2026-06-10', 1,
             100002, 0, 30, NULL, NULL)
        "#,
        r#"
        INSERT INTO commerce_usage_statement_item (
            id, statement_id, modality, model, model_list, usage_text, request_count,
            token_count, asset_count, duration_seconds, cost_amount, status, item_type
        ) VALUES
            (10, 1, 1, 'gpt-4o', '["gpt-4o"]', '', 3, 300, 0, 0, 12.5, 1, 1)
        "#,
        r#"
        INSERT INTO ai_usage (
            id, modality, customer_charge_amount, occurred_at, status,
            tenant_id, organization_id, user_id
        ) VALUES
            (20, 1, 12.5, '2026-05-10', 1, 100001, 0, 30),
            (21, 1, 999.0, '2026-05-10', 1, 100002, 0, 30)
        "#,
    ] {
        databases.execute_both(statement).await?;
    }

    let subject = SettlementsDashboardSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
    };
    let query = SettlementsDashboardQuery { year: Some(2026) };
    let sqlite_snapshot =
        SqliteSettlementsDashboardReadStore::new(databases.sqlite_pool())
            .load_settlements_dashboard(query.clone(), Some(subject))
            .await?;
    let postgres_snapshot =
        PostgresSettlementsDashboardReadStore::new(databases.postgres_pool())
            .load_settlements_dashboard(query, Some(subject))
            .await?;

    assert_eq!(sqlite_snapshot, postgres_snapshot);
    assert_eq!(1, sqlite_snapshot.bills.len());
    assert_eq!("300 tokens", sqlite_snapshot.bills[0].breakdown.text.usage);
    assert_eq!("12.500000", sqlite_snapshot.chart_data[0].text);

    databases.cleanup().await
}
