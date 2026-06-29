use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAdminDashboardReadStore;
use sdkwork_clawrouter_router_service::ports::{
    AdminDashboardQuery, AdminDashboardReadStore, AdminDashboardSubject,
};
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;

#[tokio::test]
async fn sqlite_admin_dashboard_counts_iam_active_users_without_usage_facts() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_users(&pool).await;

    let store = SqliteAdminDashboardReadStore::new(pool);
    let snapshot = store
        .load_dashboard(AdminDashboardQuery {
            subject: AdminDashboardSubject {
                tenant_id: 100001,
                organization_id: 0,
                operator_id: 1,
                operator_type: 1,
            },
        })
        .await
        .unwrap();

    assert_eq!(2, snapshot.active_users);
    assert!(snapshot.user_consumption.is_empty());
    assert!(snapshot.traffic.is_empty());
}

async fn create_schema(pool: &SqlitePool) {
    for statement in [
        r#"
        CREATE TABLE ai_usage (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            request_id TEXT,
            status INTEGER NOT NULL,
            owner_name_snapshot TEXT,
            api_key_name_snapshot TEXT,
            model TEXT,
            modality INTEGER,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            cached_tokens INTEGER,
            total_tokens INTEGER,
            request_count INTEGER,
            customer_charge_amount TEXT,
            cost_amount TEXT,
            occurred_at TEXT
        )
        "#,
        r#"
        CREATE TABLE ai_request_trace (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER,
            request_id TEXT,
            status INTEGER NOT NULL,
            owner_name_snapshot TEXT,
            api_key_name_snapshot TEXT,
            provider_model TEXT,
            requested_model TEXT,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            started_at TEXT,
            created_at TEXT,
            http_status INTEGER,
            error_type TEXT,
            provider_error_code TEXT
        )
        "#,
        r#"
        CREATE TABLE ai_routing_decision_log (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            request_id TEXT,
            status INTEGER NOT NULL,
            resolved_model TEXT
        )
        "#,
        r#"
        CREATE TABLE iam_user (
            id TEXT PRIMARY KEY,
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
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            membership_kind TEXT NOT NULL,
            display_name TEXT,
            is_primary INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            joined_at TEXT NOT NULL,
            left_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_users(pool: &SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO iam_user
            (id, tenant_id, username, display_name, email, phone, status, created_at, updated_at)
        VALUES
            ('1', '100001', 'alice', 'Alice', 'alice@example.com', '', 'active', '2026-06-01 00:00:00', '2026-06-01 00:00:00'),
            ('2', '100001', 'bob', 'Bob', 'bob@example.com', '', 'active', '2026-06-01 00:00:00', '2026-06-01 00:00:00'),
            ('3', '100001', 'disabled', 'Disabled', 'disabled@example.com', '', 'disabled', '2026-06-01 00:00:00', '2026-06-01 00:00:00'),
            ('4', '100001', 'other-org', 'Other Org', 'other-org@example.com', '', 'active', '2026-06-01 00:00:00', '2026-06-01 00:00:00'),
            ('5', '99', 'other-tenant', 'Other Tenant', 'other-tenant@example.com', '', 'active', '2026-06-01 00:00:00', '2026-06-01 00:00:00')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO iam_organization_membership
            (id, tenant_id, organization_id, user_id, membership_kind, display_name, is_primary, status, joined_at, left_at, created_at, updated_at)
        VALUES
            ('member-1', '100001', '0', '1', 'member', 'Alice', 1, 'active', '2026-06-01 00:00:00', NULL, '2026-06-01 00:00:00', '2026-06-01 00:00:00'),
            ('member-2', '100001', '0', '2', 'member', 'Bob', 1, '1', '2026-06-01 00:00:00', NULL, '2026-06-01 00:00:00', '2026-06-01 00:00:00'),
            ('member-3', '100001', '0', '3', 'member', 'Disabled', 1, 'active', '2026-06-01 00:00:00', NULL, '2026-06-01 00:00:00', '2026-06-01 00:00:00'),
            ('member-4', '100001', '21', '4', 'member', 'Other Org', 1, 'active', '2026-06-01 00:00:00', NULL, '2026-06-01 00:00:00', '2026-06-01 00:00:00'),
            ('member-5', '99', '0', '5', 'member', 'Other Tenant', 1, 'active', '2026-06-01 00:00:00', NULL, '2026-06-01 00:00:00', '2026-06-01 00:00:00')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}
