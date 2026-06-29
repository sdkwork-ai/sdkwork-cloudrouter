use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteDashboardOverviewReadStore;
use sdkwork_clawrouter_router_service::ports::{
    DashboardOverviewQuery, DashboardOverviewReadStore, DashboardOverviewSubject,
};
use sqlx::sqlite::SqlitePoolOptions;

#[tokio::test]
async fn sqlite_dashboard_overview_reads_announcements_from_standard_notifications() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_dashboard_notification(&pool).await;

    let store = SqliteDashboardOverviewReadStore::new(pool);
    let snapshot = store
        .load_dashboard_overview(
            DashboardOverviewQuery::default(),
            Some(DashboardOverviewSubject {
                tenant_id: 100001,
                organization_id: 0,
                user_id: 30,
            }),
        )
        .await
        .unwrap();

    assert_eq!(1, snapshot.announcements.len());
    assert_eq!(2007, snapshot.announcements[0].id);
    assert_eq!("Planned model upgrade", snapshot.announcements[0].text);
    assert_eq!("warning", snapshot.announcements[0].announcement_type);
}

#[tokio::test]
async fn sqlite_dashboard_overview_reads_configuration_nodes_from_gateway_instances() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_gateway_instance(&pool).await;

    let store = SqliteDashboardOverviewReadStore::new(pool);
    let snapshot = store
        .load_dashboard_overview(
            DashboardOverviewQuery::default(),
            Some(DashboardOverviewSubject {
                tenant_id: 100001,
                organization_id: 0,
                user_id: 30,
            }),
        )
        .await
        .unwrap();

    assert_eq!(1, snapshot.configuration_domains.len());
    let node = &snapshot.configuration_domains[0];
    assert_eq!("claw-node-shanghai", node.id);
    assert_eq!("Shanghai Gateway", node.name);
    assert_eq!("https://sh-gateway.example.com", node.domain);
    assert_eq!("10.10.0.11", node.ip);
    assert_eq!("online", node.status);
    assert_eq!("East China relay", node.remark);
}

#[tokio::test]
async fn sqlite_dashboard_overview_excludes_deprecated_hidden_and_catalog_only_top_models() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, tenant_id, organization_id, status, catalog_key, model, release_stage, shelf_state, routing_state)
        VALUES
            (1, 0, 0, 1, 'openai/gpt-active', 'gpt-active', 1, 1, 1),
            (2, 0, 0, 0, 'openai/gpt-deprecated', 'gpt-deprecated', 3, 2, 0),
            (3, 0, 0, 1, 'openai/gpt-hidden', 'gpt-hidden', 1, 2, 1),
            (4, 0, 0, 1, 'openai/gpt-catalog-only', 'gpt-catalog-only', 1, 1, 0)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_rank_snapshot
            (id, tenant_id, organization_id, status, rank_no, previous_rank_no, catalog_key, model, vendor_name_snapshot, vendor_code, modality, request_count, cost_amount, snapshot_date, snapshot_period)
        VALUES
            (1, 0, 0, 1, 1, 1, 'openai/gpt-deprecated', 'gpt-deprecated', 'OpenAI', 'openai', 1, 100, '100.00', '2026-05-08', 'daily'),
            (2, 0, 0, 1, 2, 2, 'openai/gpt-hidden', 'gpt-hidden', 'OpenAI', 'openai', 1, 90, '90.00', '2026-05-08', 'daily'),
            (3, 0, 0, 1, 3, 3, 'openai/gpt-catalog-only', 'gpt-catalog-only', 'OpenAI', 'openai', 1, 80, '80.00', '2026-05-08', 'daily'),
            (4, 0, 0, 1, 4, 4, 'openai/gpt-active', 'gpt-active', 'OpenAI', 'openai', 1, 70, '70.00', '2026-05-08', 'daily')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let store = SqliteDashboardOverviewReadStore::new(pool);
    let snapshot = store
        .load_dashboard_overview(
            DashboardOverviewQuery::default(),
            Some(DashboardOverviewSubject {
                tenant_id: 100001,
                organization_id: 0,
                user_id: 30,
            }),
        )
        .await
        .unwrap();

    assert_eq!(1, snapshot.top_models.len());
    assert_eq!("gpt-active", snapshot.top_models[0].name);
}

async fn create_schema(pool: &sqlx::SqlitePool) {
    for statement in [
        r#"
        CREATE TABLE ai_usage (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            request_count INTEGER,
            total_tokens INTEGER,
            customer_charge_amount TEXT,
            cost_amount TEXT,
            modality INTEGER,
            occurred_at TEXT
        )
        "#,
        r#"
        CREATE TABLE ai_request_trace (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            request_id TEXT,
            status INTEGER NOT NULL,
            started_at TEXT,
            http_status INTEGER,
            provider_error_code TEXT,
            error_type TEXT
        )
        "#,
        r#"
        CREATE TABLE ai_model_rank_snapshot (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER,
            organization_id INTEGER,
            status INTEGER NOT NULL,
            rank_no INTEGER,
            previous_rank_no INTEGER,
            catalog_key TEXT,
            model TEXT,
            vendor_name_snapshot TEXT,
            vendor_code TEXT,
            modality INTEGER,
            request_count INTEGER,
            cost_amount TEXT,
            snapshot_date TEXT,
            snapshot_period TEXT
        )
        "#,
        r#"
        CREATE TABLE ai_model (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            deleted_at TEXT,
            catalog_key TEXT NOT NULL,
            model TEXT,
            release_stage INTEGER NOT NULL DEFAULT 1,
            shelf_state INTEGER NOT NULL DEFAULT 1,
            routing_state INTEGER NOT NULL DEFAULT 1
        )
        "#,
        r#"
        CREATE TABLE ops_notification_message (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            app_id TEXT,
            scope_type INTEGER NOT NULL DEFAULT 1,
            message_code TEXT,
            message_type INTEGER,
            title TEXT,
            summary TEXT,
            content TEXT,
            severity INTEGER,
            priority INTEGER,
            show_as_popup INTEGER,
            published_at TEXT,
            expire_at TEXT,
            created_at TEXT
        )
        "#,
        r#"
        CREATE TABLE ops_notification_recipient (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            deleted_at TEXT,
            message_id INTEGER NOT NULL,
            app_id TEXT,
            recipient_type INTEGER NOT NULL,
            recipient_value TEXT,
            recipient_user_id INTEGER,
            recipient_role_code TEXT
        )
        "#,
        r#"
        CREATE TABLE ops_metric_snapshot (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER,
            organization_id INTEGER,
            status INTEGER NOT NULL,
            metric_name TEXT,
            metric_value TEXT,
            period_start TEXT
        )
        "#,
        r#"
        CREATE TABLE ops_gateway_instance (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            metadata TEXT,
            instance_code TEXT,
            region TEXT,
            cell TEXT,
            host_name TEXT,
            ip_address_masked TEXT,
            node_name TEXT,
            last_heartbeat_at TEXT,
            health_status INTEGER,
            updated_at TEXT
        )
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_dashboard_notification(pool: &sqlx::SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO ops_notification_message
            (id, uuid, tenant_id, organization_id, status, app_id, scope_type, message_code, message_type, title, summary, content, severity, priority, show_as_popup, published_at, expire_at, created_at)
        VALUES
            (2007, 'dashboard-announcement-2007', 100001, 0, 1, NULL, 2, 'announcement:2007', 1, 'Planned model upgrade', 'Planned model upgrade summary', 'Planned model upgrade content', 3, 100, 1, '2026-04-29 08:00:00', '2099-01-01 00:00:00', '2026-04-29 08:00:00'),
            (2008, 'dashboard-draft-2008', 100001, 0, 0, NULL, 2, 'announcement:2008', 1, 'Draft notice', 'Draft notice summary', 'Draft notice content', 1, 100, 1, '2026-04-29 08:00:00', '2099-01-01 00:00:00', '2026-04-29 08:00:00'),
            (2009, 'dashboard-role-2009', 100001, 0, 1, NULL, 2, 'announcement:2009', 1, 'Role notice', 'Role notice summary', 'Role notice content', 1, 100, 1, '2026-04-29 08:00:00', '2099-01-01 00:00:00', '2026-04-29 08:00:00')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ops_notification_recipient
            (id, uuid, tenant_id, organization_id, status, message_id, app_id, recipient_type, recipient_value)
        VALUES
            (2007, 'dashboard-announcement-recipient-2007', 100001, 0, 1, 2007, NULL, 1, 'all'),
            (2008, 'dashboard-draft-recipient-2008', 100001, 0, 1, 2008, NULL, 1, 'all'),
            (2009, 'dashboard-role-recipient-2009', 100001, 0, 1, 2009, NULL, 3, 'vip')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn seed_gateway_instance(pool: &sqlx::SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO ops_gateway_instance
            (id, uuid, tenant_id, organization_id, status, deleted_at, metadata, instance_code, region, cell, host_name, ip_address_masked, node_name, last_heartbeat_at, health_status, updated_at)
        VALUES
            (101, 'node-101', 100001, 0, 1, NULL, '{"domain":"https://sh-gateway.example.com","remark":"East China relay"}', 'claw-node-shanghai', 'cn-east', 'sh-a', 'gateway-host-a', '10.10.0.11', 'Shanghai Gateway', '2026-05-26 08:00:00', 1, '2026-05-26 08:00:00'),
            (102, 'node-102', 100001, 0, 0, NULL, '{"domain":"https://disabled.example.com","remark":"Disabled relay"}', 'claw-node-disabled', 'cn-east', 'sh-b', 'disabled-host', '10.10.0.12', 'Disabled Gateway', '2026-05-26 07:00:00', 0, '2026-05-26 07:00:00'),
            (103, 'node-103', 99, 99, 1, NULL, '{"domain":"https://other-tenant.example.com","remark":"Other tenant"}', 'claw-node-other', 'cn-north', 'bj-a', 'other-host', '10.10.0.13', 'Other Gateway', '2026-05-26 06:00:00', 1, '2026-05-26 06:00:00')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}
