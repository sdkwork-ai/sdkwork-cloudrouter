use sdkwork_claw_test_support::DialectTestContext;
use sdkwork_clawrouter_app_gateway_traces_repository_sqlx::{
    AppGatewayTracesListQuery, AppGatewayTracesReadStore, AppGatewayTracesSubject,
    PostgresAppGatewayTracesReadStore, SqliteAppGatewayTracesReadStore,
};

#[tokio::test]
async fn postgres_and_sqlite_return_the_same_scoped_gateway_trace_page() -> anyhow::Result<()> {
    let databases = DialectTestContext::require("app_gateway_traces").await?;
    for statement in [
        r#"
        CREATE TABLE ai_request_trace (
            id BIGINT NOT NULL PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            user_id BIGINT NOT NULL,
            request_id TEXT NOT NULL,
            trace_id TEXT,
            status BIGINT NOT NULL,
            created_at TEXT,
            started_at TEXT,
            client_ip_masked TEXT,
            request_path TEXT,
            endpoint TEXT,
            http_method TEXT,
            http_status BIGINT,
            latency_ms BIGINT,
            channel_name_snapshot TEXT
        )
        "#,
        r#"
        CREATE TABLE ops_gateway_instance (
            id BIGINT NOT NULL PRIMARY KEY,
            tenant_id BIGINT,
            organization_id BIGINT,
            status BIGINT NOT NULL,
            deleted_at TEXT,
            deployment_mode BIGINT,
            region TEXT,
            node_name TEXT,
            health_status BIGINT,
            last_heartbeat_at TEXT
        )
        "#,
        r#"
        INSERT INTO ai_request_trace (
            id, tenant_id, organization_id, user_id, request_id, trace_id, status,
            created_at, started_at, client_ip_masked, request_path, endpoint, http_method,
            http_status, latency_ms, channel_name_snapshot
        ) VALUES
            (1, 100001, 0, 30, 'req-1', 'trace-visible', 1,
             '2026-05-05T10:00:00Z', '2026-05-05T10:00:00Z', '203.0.113.10',
             '/v1/chat/completions', '/v1/chat/completions', 'POST', 200, 128, ''),
            (2, 100002, 0, 30, 'req-2', 'trace-other-tenant', 1,
             '2026-05-05T10:01:00Z', '2026-05-05T10:01:00Z', '203.0.113.11',
             '/v1/responses', '/v1/responses', 'POST', 200, 64, '')
        "#,
        r#"
        INSERT INTO ops_gateway_instance (
            id, tenant_id, organization_id, status, deleted_at, deployment_mode,
            region, node_name, health_status, last_heartbeat_at
        ) VALUES (9001, 100001, 0, 1, NULL, 2, 'cn-east-1', 'gateway-a', 1,
                  '2026-05-05T10:00:01Z')
        "#,
    ] {
        databases.execute_both(statement).await?;
    }

    let subject = AppGatewayTracesSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
    };
    let query = AppGatewayTracesListQuery {
        page_no: 1,
        page_size: 20,
        offset: 0,
        q: Some("trace-visible".to_owned()),
    };
    let sqlite_page = SqliteAppGatewayTracesReadStore::new(databases.sqlite_pool())
        .load_gateway_traces(Some(subject), query.clone())
        .await?;
    let postgres_page = PostgresAppGatewayTracesReadStore::new(databases.postgres_pool())
        .load_gateway_traces(Some(subject), query)
        .await?;

    assert_eq!(sqlite_page, postgres_page);
    assert_eq!(1, sqlite_page.total);
    assert_eq!("trace-visible", sqlite_page.items[0].id);
    assert_eq!("gateway-a@cn-east-1", sqlite_page.items[0].channel);

    databases.cleanup().await
}
