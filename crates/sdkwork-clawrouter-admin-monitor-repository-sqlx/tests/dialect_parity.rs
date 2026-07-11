use sdkwork_claw_test_support::DialectTestContext;
use sdkwork_clawrouter_admin_monitor_repository_sqlx::{
    AdminMonitorQuery, AdminMonitorReadStore, AdminMonitorSubject, PostgresAdminMonitorReadStore,
    SqliteAdminMonitorReadStore,
};

#[tokio::test]
async fn postgres_and_sqlite_return_the_same_scoped_monitor_views() -> anyhow::Result<()> {
    let databases = DialectTestContext::require("admin_monitor").await?;
    for statement in [
        r#"
        CREATE TABLE ops_gateway_instance (
            id BIGINT NOT NULL PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id BIGINT,
            organization_id BIGINT,
            node_name TEXT,
            host_name TEXT,
            instance_code TEXT,
            region TEXT,
            health_status BIGINT NOT NULL,
            status BIGINT NOT NULL,
            deleted_at TEXT,
            ip_address_masked TEXT
        )
        "#,
        r#"
        CREATE TABLE ops_gateway_heartbeat (
            id BIGINT NOT NULL PRIMARY KEY,
            instance_id BIGINT NOT NULL,
            status BIGINT NOT NULL,
            heartbeat_at TEXT,
            cpu_percent NUMERIC,
            memory_percent NUMERIC,
            uptime_seconds BIGINT
        )
        "#,
        r#"
        CREATE TABLE ops_alert_event (
            id BIGINT NOT NULL PRIMARY KEY,
            tenant_id BIGINT,
            organization_id BIGINT,
            alert_no TEXT,
            severity BIGINT NOT NULL,
            title TEXT,
            message TEXT,
            last_seen_at TEXT,
            first_seen_at TEXT,
            created_at TEXT,
            alert_status BIGINT NOT NULL,
            resolved_at TEXT,
            source TEXT,
            status BIGINT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE ops_metric_snapshot (
            id BIGINT NOT NULL PRIMARY KEY,
            tenant_id BIGINT,
            organization_id BIGINT,
            metric_name TEXT NOT NULL,
            metric_value NUMERIC,
            period_start TEXT,
            status BIGINT NOT NULL
        )
        "#,
        r#"
        INSERT INTO ops_gateway_instance (
            id, uuid, tenant_id, organization_id, node_name, host_name, instance_code,
            region, health_status, status, deleted_at, ip_address_masked
        ) VALUES
            (1, 'gateway-1', 100001, 0, 'edge-a', '', '', 'cn-east-1', 1, 1, NULL, '203.0.113.10'),
            (2, 'gateway-2', 100002, 0, 'other-tenant', '', '', 'cn-east-2', 1, 1, NULL, '203.0.113.11')
        "#,
        r#"
        INSERT INTO ops_gateway_heartbeat (
            id, instance_id, status, heartbeat_at, cpu_percent, memory_percent, uptime_seconds
        ) VALUES (10, 1, 1, '2026-07-10 10:00:00', 12.5, 51.5, 90061)
        "#,
        r#"
        INSERT INTO ops_alert_event (
            id, tenant_id, organization_id, alert_no, severity, title, message,
            last_seen_at, first_seen_at, created_at, alert_status, resolved_at, source, status
        ) VALUES
            (20, 100001, 0, 'alert-20', 3, 'Provider latency', 'p95 exceeded',
             '2026-07-10 10:05:00', '2026-07-10 10:00:00', '2026-07-10 10:00:00',
             1, NULL, 'gateway', 1)
        "#,
        r#"
        INSERT INTO ops_metric_snapshot (
            id, tenant_id, organization_id, metric_name, metric_value, period_start, status
        ) VALUES
            (30, 100001, 0, 'cpu_percent', 12.5, '2026-07-10 10:00:00', 1),
            (31, 100001, 0, 'memory_percent', 51.5, '2026-07-10 10:00:00', 1),
            (32, 100001, 0, 'network_mbps', 88.0, '2026-07-10 10:00:00', 1)
        "#,
    ] {
        databases.execute_both(statement).await?;
    }

    let query = AdminMonitorQuery {
        subject: AdminMonitorSubject {
            tenant_id: 100001,
            organization_id: 0,
            operator_id: 7,
            operator_type: 1,
        },
        page_no: 1,
        page_size: 20,
        offset: 0,
        q: None,
    };
    let sqlite = SqliteAdminMonitorReadStore::new(databases.sqlite_pool());
    let postgres = PostgresAdminMonitorReadStore::new(databases.postgres_pool());

    let sqlite_nodes = sqlite.list_monitor_nodes(query.clone()).await?;
    let postgres_nodes = postgres.list_monitor_nodes(query.clone()).await?;
    assert_eq!(sqlite_nodes, postgres_nodes);
    assert_eq!("edge-a", sqlite_nodes.items[0].name);

    let sqlite_alerts = sqlite.list_monitor_alerts(query.clone()).await?;
    let postgres_alerts = postgres.list_monitor_alerts(query.clone()).await?;
    assert_eq!(sqlite_alerts, postgres_alerts);
    assert_eq!("critical", sqlite_alerts.items[0].severity);

    let sqlite_performance = sqlite.list_monitor_performance(query.clone()).await?;
    let postgres_performance = postgres.list_monitor_performance(query).await?;
    assert_eq!(sqlite_performance, postgres_performance);
    assert_eq!(88.0, sqlite_performance.items[0].network);

    databases.cleanup().await
}
