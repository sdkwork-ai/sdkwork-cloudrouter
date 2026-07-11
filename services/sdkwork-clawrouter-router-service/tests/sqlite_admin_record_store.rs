use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAdminRecordStore;
use sdkwork_clawrouter_router_service::ports::{
    AdminRecordStore, AdminRecordSubject, ListAdminRecordLogsQuery,
};
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;

#[tokio::test]
async fn sqlite_admin_record_logs_show_user_display_name_or_email_instead_of_numeric_id() {
    let pool = sqlite_pool().await;
    create_tables(&pool).await;
    seed_users_and_traces(&pool).await;

    let store = SqliteAdminRecordStore::new(pool);
    let page = store.list_logs(query(None)).await.unwrap();

    assert_eq!(2, page.total);
    assert_eq!("email-only@example.com", page.logs[0].user);
    assert_eq!(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Version/17.5 Mobile/15E148 Safari/604.1",
        page.logs[0].user_agent
    );
    assert_eq!("Ada Lovelace", page.logs[1].user);

    let email_search_page = store
        .list_logs(query(Some("ada@example.com")))
        .await
        .unwrap();

    assert_eq!(1, email_search_page.total);
    assert_eq!("Ada Lovelace", email_search_page.logs[0].user);
}

async fn sqlite_pool() -> SqlitePool {
    SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap()
}

async fn create_tables(pool: &SqlitePool) {
    for statement in [
        r#"
        CREATE TABLE iam_user (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            username TEXT NOT NULL,
            display_name TEXT NOT NULL,
            email TEXT,
            status TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE ai_request_trace (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            user_id INTEGER,
            request_id TEXT,
            status INTEGER NOT NULL,
            created_at TEXT,
            started_at TEXT,
            owner_name_snapshot TEXT,
            api_key_name_snapshot TEXT,
            channel_group_snapshot TEXT,
            requested_model TEXT,
            requested_model_catalog_key TEXT,
            provider_model TEXT,
            provider_native_model TEXT,
            region_code TEXT,
            endpoint TEXT,
            request_path TEXT,
            http_status INTEGER,
            http_method TEXT,
            provider_error_code TEXT,
            error_type INTEGER,
            error_message_masked TEXT,
            metadata TEXT NOT NULL DEFAULT '{}',
            latency_ms INTEGER,
            ttft_ms INTEGER,
            streaming INTEGER,
            prompt_tokens INTEGER,
            cached_tokens INTEGER,
            completion_tokens INTEGER,
            reasoning_effort TEXT,
            client_ip_masked TEXT
        )
        "#,
        r#"
        CREATE TABLE ai_usage (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER,
            organization_id INTEGER,
            request_id TEXT,
            status INTEGER NOT NULL,
            owner_name_snapshot TEXT,
            api_key_name_snapshot TEXT,
            channel_group_snapshot TEXT,
            catalog_key TEXT,
            requested_model_catalog_key TEXT,
            model TEXT,
            provider_native_model TEXT,
            region_code TEXT,
            modality INTEGER,
            prompt_tokens INTEGER,
            cached_tokens INTEGER,
            completion_tokens INTEGER,
            customer_charge_amount TEXT,
            rate_multiplier TEXT,
            base_input_unit_price TEXT,
            base_output_unit_price TEXT,
            cache_read_unit_price TEXT
        )
        "#,
        r#"
        CREATE TABLE ai_routing_decision_log (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER,
            organization_id INTEGER,
            request_id TEXT,
            status INTEGER NOT NULL,
            requested_model TEXT,
            resolved_model TEXT
        )
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_users_and_traces(pool: &SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO iam_user (id, tenant_id, username, display_name, email, status)
        VALUES
            ('42', '10', 'ada', 'Ada Lovelace', 'ada@example.com', 'active'),
            ('43', '10', 'email-only', '', 'email-only@example.com', 'active')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ai_request_trace (
            id, uuid, tenant_id, organization_id, user_id, request_id, status,
            created_at, started_at, owner_name_snapshot, api_key_name_snapshot,
            channel_group_snapshot, requested_model, requested_model_catalog_key,
            provider_model, provider_native_model, region_code, endpoint, request_path,
            http_status, http_method, provider_error_code, error_type, error_message_masked,
            metadata, latency_ms, ttft_ms, streaming, prompt_tokens, cached_tokens, completion_tokens,
            reasoning_effort, client_ip_masked
        )
        VALUES
            (
                1, 'trace-1', 100001, 0, 42, 'req-1', 1,
                '2026-05-27T10:00:00Z', '2026-05-27T10:00:00Z', '42', 'Production',
                'default', 'gpt-4o-mini', 'openai/gpt-4o-mini',
                '', 'gpt-4o-mini', 'global', '/v1/chat/completions', '/v1/chat/completions',
                200, 'POST', NULL, NULL, NULL,
                '{"userAgent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0"}',
                125, 40, 1, 10, 2, 20, 'medium', '203.0.113.***'
            ),
            (
                2, 'trace-2', 100001, 0, 43, 'req-2', 1,
                '2026-05-27T11:00:00Z', '2026-05-27T11:00:00Z', '', 'Production',
                'default', 'gpt-4o-mini', 'openai/gpt-4o-mini',
                '', 'gpt-4o-mini', 'global', '/v1/chat/completions', '/v1/chat/completions',
                200, 'POST', NULL, NULL, NULL,
                '{"userAgent":"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Version/17.5 Mobile/15E148 Safari/604.1"}',
                150, 55, 0, 12, 3, 24, 'low', '203.0.113.***'
            )
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}

fn query(user: Option<&str>) -> ListAdminRecordLogsQuery {
    ListAdminRecordLogsQuery {
        subject: AdminRecordSubject {
            tenant_id: 100001,
            organization_id: 0,
            operator_id: 30,
            operator_type: 1,
        },
        page_no: 1,
        page_size: 20,
        offset: 0,
        user: user.map(str::to_owned),
        token: None,
        model: None,
    }
}
