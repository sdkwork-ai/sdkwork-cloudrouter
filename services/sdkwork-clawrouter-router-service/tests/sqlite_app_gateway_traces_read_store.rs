use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAppGatewayTracesReadStore;
use sdkwork_clawrouter_router_service::ports::{
    AppGatewayTracesListQuery, AppGatewayTracesReadStore, AppGatewayTracesSubject,
};
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;

#[tokio::test]
async fn sqlite_gateway_traces_rejects_gateway_instance_without_deployment_mode() {
    let pool = sqlite_pool().await;
    create_gateway_trace_tables(&pool).await;
    insert_trace(&pool).await;
    insert_gateway_instance(&pool, None).await;

    let store = SqliteAppGatewayTracesReadStore::new(pool);
    let error = store
        .load_gateway_traces(Some(owner_subject()), default_query())
        .await
        .unwrap_err();

    assert!(
        error
            .to_string()
            .contains("missing gateway trace deployment_mode from database row"),
        "unexpected error: {error}"
    );
}

#[tokio::test]
async fn sqlite_gateway_traces_tolerates_missing_trace_latency() {
    let pool = sqlite_pool().await;
    create_gateway_trace_tables(&pool).await;
    insert_trace_with_latency(&pool, None).await;

    let store = SqliteAppGatewayTracesReadStore::new(pool);
    let traces = store
        .load_gateway_traces(Some(owner_subject()), default_query())
        .await
        .unwrap();

    assert_eq!(1, traces.items.len());
    assert_eq!("trace-gateway-1", traces.items[0].id);
    assert_eq!("0ms", traces.items[0].duration);
}

fn default_query() -> AppGatewayTracesListQuery {
    AppGatewayTracesListQuery::try_new(None, None, None).unwrap()
}

async fn sqlite_pool() -> SqlitePool {
    SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap()
}

fn owner_subject() -> AppGatewayTracesSubject {
    AppGatewayTracesSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
    }
}

async fn create_gateway_trace_tables(pool: &SqlitePool) {
    for statement in [
        r#"
        CREATE TABLE ai_request_trace (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            request_id TEXT NOT NULL,
            trace_id TEXT,
            status INTEGER NOT NULL,
            created_at TEXT,
            started_at TEXT,
            client_ip_masked TEXT,
            request_path TEXT,
            endpoint TEXT,
            http_method TEXT,
            http_status INTEGER,
            latency_ms INTEGER,
            channel_name_snapshot TEXT
        )
        "#,
        r#"
        CREATE TABLE ops_gateway_instance (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER,
            organization_id INTEGER,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            deployment_mode INTEGER,
            region TEXT,
            node_name TEXT,
            health_status INTEGER,
            last_heartbeat_at TEXT
        )
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn insert_trace(pool: &SqlitePool) {
    insert_trace_with_latency(pool, Some(128)).await;
}

async fn insert_trace_with_latency(pool: &SqlitePool, latency_ms: Option<i64>) {
    sqlx::query(
        r#"
        INSERT INTO ai_request_trace (
            id, tenant_id, organization_id, user_id, request_id, trace_id, status,
            created_at, started_at, client_ip_masked, request_path, endpoint, http_method,
            http_status, latency_ms, channel_name_snapshot
        )
        VALUES (
            1, 100001, 0, 30, 'req-gateway-trace-1', 'trace-gateway-1', 1,
            '2026-05-05T10:00:00Z', '2026-05-05T10:00:00Z', '203.0.113.10',
            '/v1/chat/completions', '/v1/chat/completions', 'POST', 200, ?, ''
        )
        "#,
    )
    .bind(latency_ms)
    .execute(pool)
    .await
    .unwrap();
}

async fn insert_gateway_instance(pool: &SqlitePool, deployment_mode: Option<i64>) {
    sqlx::query(
        r#"
        INSERT INTO ops_gateway_instance (
            id, tenant_id, organization_id, status, deleted_at, deployment_mode,
            region, node_name, health_status, last_heartbeat_at
        )
        VALUES (
            9001, 100001, 0, 1, NULL, ?, '', '', 1, '2026-05-05T10:00:01Z'
        )
        "#,
    )
    .bind(deployment_mode)
    .execute(pool)
    .await
    .unwrap();
}
