use sdkwork_commerce_account_service::AccountSummaryQuery;
use sdkwork_commerce_storage_repository_sqlx::{
    commerce_migrated_sqlite_memory_pool, SqliteCommerceAccountStore,
};
use sqlx::SqlitePool;

async fn migrated_pool() -> SqlitePool {
    commerce_migrated_sqlite_memory_pool().await
}

#[tokio::test]
async fn sqlite_account_summary_reads_safe_profile_balance_and_invoice_from_commerce_tables() {
    let pool = migrated_pool().await;
    create_optional_account_summary_tables(&pool).await;
    seed_account_summary(&pool).await;

    let summary = SqliteCommerceAccountStore::new(pool)
        .retrieve_account_summary_snapshot(
            AccountSummaryQuery::new("100001", Some("300001"), "30").expect("query"),
        )
        .await
        .expect("summary");

    assert_eq!("30", summary.id);
    assert_eq!("Ada Lovelace", summary.name);
    assert_eq!("ada@example.test", summary.email);
    assert_eq!("Research Console", summary.organization);
    assert_eq!(1250.0, summary.available_credits);
    assert!(summary.is_verified);
    assert_eq!("SDKWork Research Ltd", summary.invoice_settings.org_full);
    assert_eq!("TAX-91310000", summary.invoice_settings.tax_id);
    assert_eq!("NORMAL", summary.invoice_settings.invoice_type);
    assert!(summary.security.mfa_enabled);
    assert_eq!(2, summary.security.ip_whitelist_count);
    assert_eq!(1, summary.login_logs.len());
    assert_eq!("success", summary.login_logs[0].status);
}

#[tokio::test]
async fn sqlite_account_summary_returns_default_safe_shape_when_optional_tables_are_absent() {
    let pool = migrated_pool().await;

    let summary = SqliteCommerceAccountStore::new(pool)
        .retrieve_account_summary_snapshot(
            AccountSummaryQuery::new("100001", Some("300001"), "30").expect("query"),
        )
        .await
        .expect("summary");

    assert_eq!("30", summary.id);
    assert_eq!("", summary.name);
    assert_eq!(0.0, summary.available_credits);
    assert_eq!(0.0, summary.monthly_consumption);
    assert!(summary.consumption_by_service.is_empty());
    assert!(summary.login_logs.is_empty());
    assert!(!summary.security.mfa_enabled);
}

async fn create_optional_account_summary_tables(pool: &SqlitePool) {
    for statement in [
        r#"
        CREATE TABLE iam_user (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            username TEXT,
            display_name TEXT,
            email TEXT,
            status TEXT
        )
        "#,
        r#"
        CREATE TABLE iam_organization (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            name TEXT,
            status TEXT
        )
        "#,
        r#"
        CREATE TABLE iam_user_security_setting (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            mfa_enabled INTEGER NOT NULL,
            trusted_device_count INTEGER NOT NULL,
            deleted_at TEXT,
            updated_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE iam_user_login_event (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            client_ip_masked TEXT,
            client_ip_region TEXT,
            device_label TEXT,
            occurred_at TEXT,
            created_at TEXT NOT NULL,
            login_result INTEGER,
            risk_level INTEGER
        )
        "#,
        r#"
        CREATE TABLE ai_usage_fact (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            modality INTEGER,
            customer_charge_amount REAL,
            cost_amount REAL,
            occurred_at TEXT NOT NULL,
            status INTEGER NOT NULL
        )
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_account_summary(pool: &SqlitePool) {
    for statement in [
        r#"
        INSERT INTO iam_user
            (id, tenant_id, username, display_name, email, status)
        VALUES
            ('30', '100001', 'ada', 'Ada Lovelace', 'ada@example.test', 'active')
        "#,
        r#"
        INSERT INTO iam_organization
            (id, tenant_id, name, status)
        VALUES
            ('300001', '100001', 'Research Console', 'active')
        "#,
        r#"
        INSERT INTO commerce_account
            (id, tenant_id, organization_id, owner_user_id, asset_type, currency_code,
             available_amount, frozen_amount, version, status, created_at, updated_at)
        VALUES
            ('acct-points-30', '100001', '300001', '30', 'points', NULL,
             '1250', '0', 0, 'active', '2026-05-17 00:00:00', '2026-05-17 00:00:00')
        "#,
        r#"
        INSERT INTO commerce_invoice_title
            (id, tenant_id, owner_user_id, title_type, name, tax_no, created_at, updated_at)
        VALUES
            ('invoice-title-30', '100001', '30', 'company',
             'SDKWork Research Ltd', 'TAX-91310000',
             '2026-05-17 00:00:00', '2026-05-17 00:00:00')
        "#,
        r#"
        INSERT INTO iam_user_security_setting
            (id, tenant_id, organization_id, user_id, mfa_enabled, trusted_device_count,
             deleted_at, updated_at)
        VALUES
            ('security-30', '100001', '300001', '30', 1, 2,
             NULL, '2026-05-17 00:00:00')
        "#,
        r#"
        INSERT INTO iam_user_login_event
            (id, tenant_id, organization_id, user_id, client_ip_masked, client_ip_region,
             device_label, occurred_at, created_at, login_result, risk_level)
        VALUES
            ('login-30', '100001', '300001', '30', '203.0.113.*',
             'Singapore', 'Chrome on macOS', '2026-05-17 01:00:00',
             '2026-05-17 01:00:00', 1, 1)
        "#,
        r#"
        INSERT INTO ai_usage_fact
            (id, tenant_id, organization_id, user_id, modality, customer_charge_amount,
             cost_amount, occurred_at, status)
        VALUES
            ('usage-30', '100001', '300001', '30', 1, 30.0, 20.0,
             datetime('now'), 1)
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}
