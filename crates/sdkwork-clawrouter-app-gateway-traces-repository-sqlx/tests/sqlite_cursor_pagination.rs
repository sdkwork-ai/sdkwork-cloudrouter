use std::collections::HashSet;

use sdkwork_clawrouter_app_gateway_traces_repository_sqlx::{
    AppGatewayTracesListQuery, AppGatewayTracesReadStore, AppGatewayTracesSubject,
    SqliteAppGatewayTracesReadStore,
};
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;

#[tokio::test]
async fn cursor_pages_remain_complete_and_duplicate_free_during_newer_inserts() {
    let pool = sqlite_pool().await;
    create_tables(&pool).await;
    for (id, started_at) in [
        (1, "2026-05-05T10:00:00Z"),
        (2, "2026-05-05T10:01:00Z"),
        (3, "2026-05-05T10:01:00Z"),
        (4, "2026-05-05T10:02:00Z"),
        (5, "2026-05-05T10:03:00Z"),
    ] {
        insert_trace(&pool, id, started_at, &format!("/v1/trace/{id}")).await;
    }

    let store = SqliteAppGatewayTracesReadStore::new(pool.clone());
    let first_page = store
        .load_gateway_traces(
            Some(owner_subject()),
            AppGatewayTracesListQuery::try_new(Some(2), None, None).unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(vec!["trace-5", "trace-4"], trace_ids(&first_page.items));
    assert!(first_page.has_more);

    insert_trace(&pool, 6, "2026-05-05T10:04:00Z", "/v1/trace/6").await;

    let mut all_ids = trace_ids(&first_page.items);
    let mut cursor = first_page.next_cursor;
    loop {
        let page = store
            .load_gateway_traces(
                Some(owner_subject()),
                AppGatewayTracesListQuery::try_new(Some(2), cursor, None).unwrap(),
            )
            .await
            .unwrap();
        all_ids.extend(trace_ids(&page.items));
        if !page.has_more {
            assert!(page.next_cursor.is_none());
            break;
        }
        cursor = page.next_cursor;
    }

    assert_eq!(
        vec!["trace-5", "trace-4", "trace-3", "trace-2", "trace-1"],
        all_ids
    );
    assert_eq!(all_ids.len(), all_ids.iter().collect::<HashSet<_>>().len());
}

#[tokio::test]
async fn search_treats_like_metacharacters_and_escape_character_as_literals() {
    let pool = sqlite_pool().await;
    create_tables(&pool).await;
    insert_recent_trace(&pool, 1, r"/v1/literal%_\path").await;
    insert_recent_trace(&pool, 2, "/v1/literalAApath").await;

    let page = SqliteAppGatewayTracesReadStore::new(pool)
        .load_gateway_traces(
            Some(owner_subject()),
            AppGatewayTracesListQuery::try_new(Some(20), None, Some(r"literal%_\path".to_owned()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(vec!["trace-1"], trace_ids(&page.items));
}

#[tokio::test]
async fn exact_request_id_search_bypasses_the_fuzzy_recency_window() {
    let pool = sqlite_pool().await;
    create_tables(&pool).await;
    insert_trace(&pool, 1, "2020-01-01T00:00:00Z", "/v1/old-trace").await;

    let page = SqliteAppGatewayTracesReadStore::new(pool)
        .load_gateway_traces(
            Some(owner_subject()),
            AppGatewayTracesListQuery::try_new(Some(20), None, Some("request-1".to_owned()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(vec!["trace-1"], trace_ids(&page.items));
}

#[tokio::test]
async fn gateway_channel_uses_each_trace_snapshot_and_legacy_rows_remain_unknown() {
    let pool = sqlite_pool().await;
    create_tables(&pool).await;
    insert_trace(&pool, 1, "2026-05-05T10:00:00Z", "/v1/legacy").await;
    insert_attributed_trace(
        &pool,
        2,
        "2026-05-05T10:01:00Z",
        "gateway-b",
        "cn-east-2",
        "node-b",
    )
    .await;

    let page = SqliteAppGatewayTracesReadStore::new(pool)
        .load_gateway_traces(
            Some(owner_subject()),
            AppGatewayTracesListQuery::try_new(Some(20), None, None).unwrap(),
        )
        .await
        .unwrap();

    assert_eq!("gateway-b@cn-east-2", page.items[0].channel);
    assert_eq!("unknown", page.items[1].channel);
}

#[tokio::test]
async fn invalid_tenant_and_organization_scope_fail_before_query_execution() {
    let pool = sqlite_pool().await;
    let store = SqliteAppGatewayTracesReadStore::new(pool);

    for (subject, expected) in [
        (
            AppGatewayTracesSubject {
                tenant_id: 0,
                ..owner_subject()
            },
            "tenant_id must be positive",
        ),
        (
            AppGatewayTracesSubject {
                organization_id: -1,
                ..owner_subject()
            },
            "organization_id must be non-negative",
        ),
    ] {
        let error = store
            .load_gateway_traces(
                Some(subject),
                AppGatewayTracesListQuery::try_new(None, None, None).unwrap(),
            )
            .await
            .expect_err("invalid scope must fail");
        assert!(
            error.to_string().contains(expected),
            "unexpected error: {error}"
        );
    }
}

fn trace_ids(
    items: &[sdkwork_clawrouter_app_gateway_traces_repository_sqlx::AppGatewayTraceItem],
) -> Vec<String> {
    items.iter().map(|item| item.id.clone()).collect()
}

fn owner_subject() -> AppGatewayTracesSubject {
    AppGatewayTracesSubject {
        tenant_id: 100_001,
        organization_id: 0,
        user_id: 30,
    }
}

async fn sqlite_pool() -> SqlitePool {
    SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap()
}

async fn create_tables(pool: &SqlitePool) {
    for statement in [r#"
        CREATE TABLE ai_request_trace (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            request_id TEXT NOT NULL,
            trace_id TEXT,
            status INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            started_at TEXT NOT NULL,
            client_ip_masked TEXT,
            request_path TEXT,
            endpoint TEXT,
            http_method TEXT,
            http_status INTEGER,
            latency_ms INTEGER,
            channel_name_snapshot TEXT,
            gateway_instance_id INTEGER,
            gateway_instance_code_snapshot TEXT,
            gateway_region_code_snapshot TEXT,
            gateway_node_name_snapshot TEXT
        )
        "#]
    {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn insert_recent_trace(pool: &SqlitePool, id: i64, request_path: &str) {
    sqlx::query(
        r#"
        INSERT INTO ai_request_trace (
            id, tenant_id, organization_id, user_id, request_id, trace_id, status,
            created_at, started_at, client_ip_masked, request_path, endpoint, http_method,
            http_status, latency_ms, channel_name_snapshot
        ) VALUES (
            ?, 100001, 0, 30, ?, ?, 1,
            strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
            '203.0.113.10', ?, ?, 'POST', 200, 10, ''
        )
        "#,
    )
    .bind(id)
    .bind(format!("request-{id}"))
    .bind(format!("trace-{id}"))
    .bind(request_path)
    .bind(request_path)
    .execute(pool)
    .await
    .unwrap();
}

async fn insert_attributed_trace(
    pool: &SqlitePool,
    id: i64,
    started_at: &str,
    instance_code: &str,
    region_code: &str,
    node_name: &str,
) {
    sqlx::query(
        r#"
        INSERT INTO ai_request_trace (
            id, tenant_id, organization_id, user_id, request_id, trace_id, status,
            created_at, started_at, client_ip_masked, request_path, endpoint, http_method,
            http_status, latency_ms, channel_name_snapshot, gateway_instance_id,
            gateway_instance_code_snapshot, gateway_region_code_snapshot,
            gateway_node_name_snapshot
        ) VALUES (
            ?, 100001, 0, 30, ?, ?, 1, ?, ?, '203.0.113.10', '/v1/attributed',
            '/v1/attributed', 'POST', 200, 10, '', 9002, ?, ?, ?
        )
        "#,
    )
    .bind(id)
    .bind(format!("request-{id}"))
    .bind(format!("trace-{id}"))
    .bind(started_at)
    .bind(started_at)
    .bind(instance_code)
    .bind(region_code)
    .bind(node_name)
    .execute(pool)
    .await
    .unwrap();
}

async fn insert_trace(pool: &SqlitePool, id: i64, started_at: &str, request_path: &str) {
    sqlx::query(
        r#"
        INSERT INTO ai_request_trace (
            id, tenant_id, organization_id, user_id, request_id, trace_id, status,
            created_at, started_at, client_ip_masked, request_path, endpoint, http_method,
            http_status, latency_ms, channel_name_snapshot
        ) VALUES (?, 100001, 0, 30, ?, ?, 1, ?, ?, '203.0.113.10', ?, ?, 'POST', 200, 10, '')
        "#,
    )
    .bind(id)
    .bind(format!("request-{id}"))
    .bind(format!("trace-{id}"))
    .bind(started_at)
    .bind(started_at)
    .bind(request_path)
    .bind(request_path)
    .execute(pool)
    .await
    .unwrap();
}
