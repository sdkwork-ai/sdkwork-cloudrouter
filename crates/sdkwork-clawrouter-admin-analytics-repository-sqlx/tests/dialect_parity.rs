use sdkwork_claw_test_support::DialectTestContext;
use sdkwork_clawrouter_admin_analytics_repository_sqlx::{
    AdminAnalyticsQuery, AdminAnalyticsReadStore, AdminAnalyticsSubject, AdminAnalyticsTimeRange,
    PostgresAdminAnalyticsReadStore, SqliteAdminAnalyticsReadStore,
};

#[tokio::test]
async fn postgres_and_sqlite_return_the_same_scoped_analytics_snapshot() -> anyhow::Result<()> {
    let databases = DialectTestContext::require("admin_analytics").await?;
    for statement in [
        r#"
        CREATE TABLE ai_usage (
            id BIGINT NOT NULL PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            user_id BIGINT,
            owner_type BIGINT,
            owner_id BIGINT,
            request_id TEXT,
            status BIGINT NOT NULL,
            owner_name_snapshot TEXT,
            catalog_key TEXT NOT NULL,
            model TEXT,
            modality BIGINT,
            request_count BIGINT,
            prompt_tokens BIGINT,
            completion_tokens BIGINT,
            cached_tokens BIGINT,
            total_tokens BIGINT,
            customer_charge_amount NUMERIC,
            upstream_cost_amount NUMERIC,
            occurred_at TEXT
        )
        "#,
        r#"
        CREATE TABLE ai_request_trace (
            id BIGINT NOT NULL PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            request_id TEXT,
            status BIGINT NOT NULL,
            http_status BIGINT,
            error_type VARCHAR(128),
            provider_error_code TEXT,
            started_at TEXT
        )
        "#,
        r#"
        INSERT INTO ai_usage (
            id, tenant_id, organization_id, user_id, owner_type, owner_id, request_id,
            status, owner_name_snapshot, catalog_key, model, modality, request_count,
            prompt_tokens, completion_tokens, cached_tokens, total_tokens,
            customer_charge_amount, upstream_cost_amount, occurred_at
        ) VALUES
            (1, 100001, 0, 101, 1, 101, 'req-1', 1, 'Alice',
             'openai/gpt-4o', 'gpt-4o', 1, 3, 100, 200, 0, 300, 12.0, 6.0,
             '2026-05-01 10:00:00'),
            (2, 100002, 0, 999, 1, 999, 'req-other', 1, 'Other',
             'openai/gpt-4o', 'gpt-4o', 1, 50, 5000, 5000, 0, 10000, 999.0, 999.0,
             '2026-05-01 10:00:00')
        "#,
        r#"
        INSERT INTO ai_request_trace (
            id, tenant_id, organization_id, request_id, status, http_status,
            error_type, provider_error_code, started_at
        ) VALUES
            (10, 100001, 0, 'req-1', 1, 200, NULL, NULL, '2026-05-01 10:00:00'),
            (11, 100002, 0, 'req-other', 1, 500, 'provider_error', 'upstream_error', '2026-05-01 10:00:00')
        "#,
    ] {
        databases.execute_both(statement).await?;
    }

    let query = AdminAnalyticsQuery {
        subject: AdminAnalyticsSubject {
            tenant_id: 100001,
            organization_id: 0,
            operator_id: 7,
            operator_type: 1,
        },
        time_range: AdminAnalyticsTimeRange::Daily,
        start_time: None,
        end_time: None,
        limit: 10,
    };
    let sqlite_snapshot = SqliteAdminAnalyticsReadStore::new(databases.sqlite_pool())
        .load_admin_analytics(query.clone())
        .await?;
    let postgres_snapshot = PostgresAdminAnalyticsReadStore::new(databases.postgres_pool())
        .load_admin_analytics(query)
        .await?;

    assert_eq!(sqlite_snapshot, postgres_snapshot);
    assert_eq!(3, sqlite_snapshot.summary.total_requests);
    assert_eq!(300.0, sqlite_snapshot.summary.total_tokens);
    assert_eq!(1, sqlite_snapshot.summary.total_users);

    databases.cleanup().await
}
