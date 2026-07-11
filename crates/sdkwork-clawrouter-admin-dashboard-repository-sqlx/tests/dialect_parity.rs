use sdkwork_claw_test_support::DialectTestContext;
use sdkwork_clawrouter_admin_dashboard_repository_sqlx::{
    AdminDashboardQuery, AdminDashboardReadStore, AdminDashboardSubject,
    PostgresAdminDashboardReadStore, SqliteAdminDashboardReadStore,
};

#[tokio::test]
async fn postgres_and_sqlite_return_the_same_scoped_dashboard() -> anyhow::Result<()> {
    let databases = DialectTestContext::require("admin_dashboard").await?;
    for statement in [
        r#"
        CREATE TABLE ai_usage (
            id BIGINT NOT NULL PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            user_id BIGINT NOT NULL,
            request_id TEXT,
            status BIGINT NOT NULL,
            owner_name_snapshot TEXT,
            api_key_name_snapshot TEXT,
            model TEXT,
            modality BIGINT,
            prompt_tokens BIGINT,
            completion_tokens BIGINT,
            cached_tokens BIGINT,
            total_tokens BIGINT,
            request_count BIGINT,
            customer_charge_amount NUMERIC,
            occurred_at TEXT
        )
        "#,
        r#"
        CREATE TABLE ai_request_trace (
            id BIGINT NOT NULL PRIMARY KEY,
            uuid TEXT,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            user_id BIGINT,
            request_id TEXT,
            status BIGINT NOT NULL,
            owner_name_snapshot TEXT,
            api_key_name_snapshot TEXT,
            provider_model TEXT,
            requested_model TEXT,
            prompt_tokens BIGINT,
            completion_tokens BIGINT,
            started_at TEXT,
            created_at TEXT,
            http_status BIGINT,
            error_type TEXT,
            provider_error_code TEXT
        )
        "#,
        r#"
        CREATE TABLE ai_routing_decision_log (
            id BIGINT NOT NULL PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            request_id TEXT,
            status BIGINT NOT NULL,
            resolved_model TEXT
        )
        "#,
        r#"
        CREATE TABLE iam_user (
            id TEXT NOT NULL PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            username TEXT NOT NULL,
            display_name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE iam_organization_membership (
            id TEXT NOT NULL PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            membership_kind TEXT NOT NULL,
            display_name TEXT,
            is_primary BIGINT NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            joined_at TEXT NOT NULL,
            left_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
        r#"
        INSERT INTO iam_user
            (id, tenant_id, username, display_name, email, phone, status, created_at, updated_at)
        VALUES
            ('1', '100001', 'alice', 'Alice', 'alice@example.com', '', 'active', '2026-06-01 00:00:00', '2026-06-01 00:00:00'),
            ('2', '100001', 'bob', 'Bob', 'bob@example.com', '', 'active', '2026-06-01 00:00:00', '2026-06-01 00:00:00'),
            ('3', '100002', 'other', 'Other', 'other@example.com', '', 'active', '2026-06-01 00:00:00', '2026-06-01 00:00:00')
        "#,
        r#"
        INSERT INTO iam_organization_membership
            (id, tenant_id, organization_id, user_id, membership_kind, display_name,
             is_primary, status, joined_at, left_at, created_at, updated_at)
        VALUES
            ('member-1', '100001', '0', '1', 'member', 'Alice', 1, 'active',
             '2026-06-01 00:00:00', NULL, '2026-06-01 00:00:00', '2026-06-01 00:00:00'),
            ('member-2', '100001', '0', '2', 'member', 'Bob', 1, '1',
             '2026-06-01 00:00:00', NULL, '2026-06-01 00:00:00', '2026-06-01 00:00:00'),
            ('member-3', '100002', '0', '3', 'member', 'Other', 1, 'active',
             '2026-06-01 00:00:00', NULL, '2026-06-01 00:00:00', '2026-06-01 00:00:00')
        "#,
    ] {
        databases.execute_both(statement).await?;
    }

    let query = AdminDashboardQuery {
        subject: AdminDashboardSubject {
            tenant_id: 100001,
            organization_id: 0,
            operator_id: 7,
            operator_type: 1,
        },
    };
    let sqlite_snapshot = SqliteAdminDashboardReadStore::new(databases.sqlite_pool())
        .load_dashboard(query)
        .await?;
    let postgres_snapshot = PostgresAdminDashboardReadStore::new(databases.postgres_pool())
        .load_dashboard(query)
        .await?;

    assert_eq!(sqlite_snapshot, postgres_snapshot);
    assert_eq!(2, sqlite_snapshot.active_users);
    assert!(sqlite_snapshot.traffic.is_empty());

    databases.cleanup().await
}
