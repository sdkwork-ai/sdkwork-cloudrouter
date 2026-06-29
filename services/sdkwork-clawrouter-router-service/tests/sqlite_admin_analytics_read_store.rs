use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAdminAnalyticsReadStore;
use sdkwork_clawrouter_router_service::ports::{
    AdminAnalyticsQuery, AdminAnalyticsReadStore, AdminAnalyticsSubject, AdminAnalyticsTimeRange,
};
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;

#[tokio::test]
async fn sqlite_admin_analytics_aggregates_user_and_model_rankings_from_usage_facts() {
    let pool = sqlite_pool().await;
    create_analytics_tables(&pool).await;
    seed_usage(&pool).await;

    let store = SqliteAdminAnalyticsReadStore::new(pool);
    let snapshot = store
        .load_admin_analytics(AdminAnalyticsQuery {
            subject: AdminAnalyticsSubject {
                tenant_id: 100001,
                organization_id: 0,
                operator_id: 30,
                operator_type: 1,
            },
            time_range: AdminAnalyticsTimeRange::Daily,
            start_time: Some("2026-05-01 00:00:00".to_owned()),
            end_time: Some("2026-05-31 23:59:59".to_owned()),
            limit: 2,
        })
        .await
        .unwrap();

    assert_eq!(10, snapshot.summary.total_requests);
    assert_eq!(800.0, snapshot.summary.total_tokens);
    assert_eq!(42.0, snapshot.summary.total_points);
    assert_eq!(21.0, snapshot.summary.upstream_cost);
    assert_eq!(2, snapshot.summary.active_users);
    assert_eq!(3, snapshot.summary.active_models);
    assert_eq!(1, snapshot.summary.failed_requests);
    assert_eq!(9, snapshot.summary.successful_requests);
    assert_eq!(10.0, snapshot.summary.error_rate);

    assert_eq!("Alice", snapshot.user_rankings.points[0].user_name);
    assert_eq!(32.0, snapshot.user_rankings.points[0].points);
    assert_eq!("Bob", snapshot.user_rankings.requests[0].user_name);
    assert_eq!(5, snapshot.user_rankings.requests[0].request_count);
    assert_eq!("Bob", snapshot.user_rankings.tokens[0].user_name);
    assert_eq!(500.0, snapshot.user_rankings.tokens[0].total_tokens);
    assert_eq!(
        "gpt-image-1",
        snapshot.user_rankings.points[0].model_distribution[0].name
    );

    assert_eq!(
        "claude-3-5-sonnet",
        snapshot.model_rankings.requests[0].model
    );
    assert_eq!(5, snapshot.model_rankings.requests[0].request_count);
    assert_eq!("openai", snapshot.model_rankings.points[0].vendor);
    assert_eq!("gpt-image-1", snapshot.model_rankings.points[0].model);
    assert_eq!(20.0, snapshot.model_rankings.points[0].points);
    assert_eq!(50.0, snapshot.model_rankings.points[0].error_rate);
    assert_eq!("gpt-4o", snapshot.model_rankings.points[1].model);
    assert_eq!(0.0, snapshot.model_rankings.points[1].error_rate);

    assert_eq!("2026-05-01", snapshot.trend[0].time);
    assert_eq!(10.0, snapshot.trend[0].requests);
    assert_eq!("text", snapshot.modality_distribution[0].name);
    assert_eq!("topUserShare", snapshot.insights[0].key);
    assert_eq!(
        "admin.analytics.insights.topUserShare.title",
        snapshot.insights[0].title
    );
    assert_eq!(
        "admin.analytics.insights.topUserShare.detail",
        snapshot.insights[0].detail
    );
    assert_eq!(
        "admin.analytics.insights.topModelShare.title",
        snapshot.insights[1].title
    );
    assert_eq!(
        "admin.analytics.insights.errorRate.title",
        snapshot.insights[2].title
    );
}

#[tokio::test]
async fn sqlite_admin_analytics_counts_distinct_users_even_when_display_names_match() {
    let pool = sqlite_pool().await;
    create_analytics_tables(&pool).await;
    seed_duplicate_display_name_usage(&pool).await;

    let store = SqliteAdminAnalyticsReadStore::new(pool);
    let snapshot = store
        .load_admin_analytics(AdminAnalyticsQuery {
            subject: AdminAnalyticsSubject {
                tenant_id: 100001,
                organization_id: 0,
                operator_id: 30,
                operator_type: 1,
            },
            time_range: AdminAnalyticsTimeRange::Daily,
            start_time: Some("2026-05-01 00:00:00".to_owned()),
            end_time: Some("2026-05-31 23:59:59".to_owned()),
            limit: 5,
        })
        .await
        .unwrap();

    assert_eq!(2, snapshot.summary.total_users);
    assert_eq!(2, snapshot.summary.active_users);
    assert_eq!(2, snapshot.trend[0].users);
}

#[tokio::test]
async fn sqlite_admin_analytics_keeps_owner_fallbacks_and_untimed_usage_visible() {
    let pool = sqlite_pool().await;
    create_analytics_tables(&pool).await;
    seed_untimed_usage_with_null_users(&pool).await;

    let store = SqliteAdminAnalyticsReadStore::new(pool);
    let snapshot = store
        .load_admin_analytics(AdminAnalyticsQuery {
            subject: AdminAnalyticsSubject {
                tenant_id: 100001,
                organization_id: 0,
                operator_id: 30,
                operator_type: 1,
            },
            time_range: AdminAnalyticsTimeRange::Daily,
            start_time: None,
            end_time: None,
            limit: 3,
        })
        .await
        .unwrap();

    assert_eq!(3, snapshot.summary.total_requests);
    assert_eq!(2, snapshot.summary.total_users);
    assert_eq!(1, snapshot.summary.failed_requests);
    assert_eq!(0, snapshot.trend.len());

    let ranked_user_ids: Vec<&str> = snapshot
        .user_rankings
        .points
        .iter()
        .map(|item| item.user_id.as_str())
        .collect();
    let ranked_user_names: Vec<&str> = snapshot
        .user_rankings
        .points
        .iter()
        .map(|item| item.user_name.as_str())
        .collect();
    assert!(ranked_user_ids.contains(&"Service Key"));
    assert!(ranked_user_ids.contains(&"unknown"));
    assert!(ranked_user_names.contains(&"Service Key"));
    assert!(ranked_user_names.contains(&"unknown"));
    assert!(
        !ranked_user_ids.contains(&"0") && !ranked_user_names.contains(&"0"),
        "null user ownership must not leak as display value 0"
    );

    assert_eq!("gpt-4o", snapshot.model_rankings.points[0].model);
    assert_eq!("claude-3-5-sonnet", snapshot.model_rankings.points[1].model);
    assert_eq!("unknown", snapshot.model_rankings.points[1].modality);
    assert_eq!(100.0, snapshot.model_rankings.points[1].error_rate);
    assert_eq!(2, snapshot.model_distribution.len());
    assert_eq!(2, snapshot.modality_distribution.len());
    assert!(snapshot
        .modality_distribution
        .iter()
        .any(|item| item.name == "unknown" && item.value == 1.0));
}

#[tokio::test]
async fn sqlite_admin_analytics_includes_default_organization_usage_for_admin_scope() {
    let pool = sqlite_pool().await;
    create_analytics_tables(&pool).await;
    seed_default_scope_usage(&pool).await;

    let store = SqliteAdminAnalyticsReadStore::new(pool);
    let snapshot = store
        .load_admin_analytics(AdminAnalyticsQuery {
            subject: AdminAnalyticsSubject {
                tenant_id: 100001,
                organization_id: 0,
                operator_id: 30,
                operator_type: 1,
            },
            time_range: AdminAnalyticsTimeRange::Daily,
            start_time: Some("2026-05-01 00:00:00".to_owned()),
            end_time: Some("2026-05-31 23:59:59".to_owned()),
            limit: 5,
        })
        .await
        .unwrap();

    assert_eq!(2, snapshot.summary.total_requests);
    assert_eq!(1, snapshot.summary.total_users);
    assert_eq!(1, snapshot.summary.failed_requests);
    assert_eq!(2.0, snapshot.summary.total_tokens);
    assert_eq!(1.0, snapshot.summary.total_points);
    assert_eq!(0.5, snapshot.summary.upstream_cost);
    assert!(!snapshot.trend.is_empty());
    assert_eq!(
        "Default Org User",
        snapshot.user_rankings.requests[0].user_name
    );
    assert_eq!(2, snapshot.user_rankings.requests[0].request_count);
    assert_eq!("gpt-4o", snapshot.model_rankings.requests[0].model);
    assert_eq!(2, snapshot.model_rankings.requests[0].request_count);
    assert!(snapshot
        .model_distribution
        .iter()
        .any(|item| item.name == "gpt-4o" && item.value == 2.0));
    assert!(snapshot
        .modality_distribution
        .iter()
        .any(|item| item.name == "text" && item.value == 2.0));
}

#[tokio::test]
async fn sqlite_admin_analytics_does_not_extract_vendor_from_regional_catalog_key() {
    let pool = sqlite_pool().await;
    create_analytics_tables(&pool).await;
    seed_regional_catalog_key_usage(&pool).await;

    let store = SqliteAdminAnalyticsReadStore::new(pool);
    let snapshot = store
        .load_admin_analytics(AdminAnalyticsQuery {
            subject: AdminAnalyticsSubject {
                tenant_id: 100001,
                organization_id: 0,
                operator_id: 30,
                operator_type: 1,
            },
            time_range: AdminAnalyticsTimeRange::Daily,
            start_time: Some("2026-05-01 00:00:00".to_owned()),
            end_time: Some("2026-05-31 23:59:59".to_owned()),
            limit: 5,
        })
        .await
        .unwrap();

    let regional_item = snapshot
        .model_rankings
        .points
        .iter()
        .find(|item| item.catalog_key == legacy_regional_catalog_key_for_negative_test())
        .expect("regional legacy catalog key usage row should remain visible for audit");
    assert_eq!(
        "gpt-4o", regional_item.vendor,
        "analytics must not treat vendor/region/model keys as canonical vendor identity"
    );
}

async fn sqlite_pool() -> SqlitePool {
    SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap()
}

async fn create_analytics_tables(pool: &SqlitePool) {
    sqlx::query(
        r#"
        CREATE TABLE ai_usage (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER,
            owner_type INTEGER,
            owner_id INTEGER,
            request_id TEXT,
            status INTEGER NOT NULL,
            owner_name_snapshot TEXT,
            catalog_key TEXT NOT NULL,
            model TEXT,
            modality INTEGER,
            request_count INTEGER,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            cached_tokens INTEGER,
            total_tokens INTEGER,
            customer_charge_amount TEXT,
            upstream_cost_amount TEXT,
            cost_amount TEXT,
            occurred_at TEXT
        )
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        CREATE TABLE ai_request_trace (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            request_id TEXT,
            status INTEGER NOT NULL,
            http_status INTEGER,
            error_type INTEGER,
            provider_error_code TEXT,
            started_at TEXT
        )
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn seed_regional_catalog_key_usage(pool: &SqlitePool) {
    let regional_catalog_key = legacy_regional_catalog_key_for_negative_test();
    sqlx::query(
        r#"
        INSERT INTO ai_usage (
            id, tenant_id, organization_id, user_id, owner_type, owner_id, request_id, status,
            owner_name_snapshot, catalog_key, model, modality, request_count,
            total_tokens, customer_charge_amount, upstream_cost_amount, occurred_at
        )
        VALUES
            (1, 100001, 0, 101, 1, 101, 'req-regional-catalog-key', 1, 'Alice', ?1, 'gpt-4o', 1, 1, 100, '10.0', '5.0', '2026-05-10 10:00:00')
        "#,
    )
    .bind(regional_catalog_key)
    .execute(pool)
    .await
    .unwrap();
}

fn legacy_regional_catalog_key_for_negative_test() -> String {
    ["openai", "global", "gpt-4o"].join("/")
}

async fn seed_usage(pool: &SqlitePool) {
    let rows = [
        (
            1,
            100001,
            0,
            101,
            1,
            101,
            "req-1",
            "Alice",
            "openai/gpt-4o",
            "gpt-4o",
            1,
            3,
            300,
            "12.0",
            "6.0",
            "2026-05-01 10:00:00",
        ),
        (
            2,
            100001,
            0,
            101,
            1,
            101,
            "req-2",
            "Alice",
            "openai/gpt-image-1",
            "gpt-image-1",
            2,
            2,
            0,
            "20.0",
            "10.0",
            "2026-05-01 11:00:00",
        ),
        (
            3,
            100001,
            0,
            102,
            1,
            102,
            "req-3",
            "Bob",
            "anthropic/claude-3-5-sonnet",
            "claude-3-5-sonnet",
            1,
            5,
            500,
            "10.0",
            "5.0",
            "2026-05-01 12:00:00",
        ),
        (
            4,
            99,
            20,
            999,
            1,
            999,
            "req-ignored",
            "Other",
            "openai/gpt-4o",
            "gpt-4o",
            1,
            100,
            10000,
            "999.0",
            "999.0",
            "2026-05-01 12:00:00",
        ),
    ];

    for row in rows {
        sqlx::query(
            r#"
            INSERT INTO ai_usage (
                id, tenant_id, organization_id, user_id, owner_type, owner_id, request_id, status,
                owner_name_snapshot, catalog_key, model, modality, request_count,
                total_tokens, customer_charge_amount, upstream_cost_amount, occurred_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
            "#,
        )
        .bind(row.0)
        .bind(row.1)
        .bind(row.2)
        .bind(row.3)
        .bind(row.4)
        .bind(row.5)
        .bind(row.6)
        .bind(row.7)
        .bind(row.8)
        .bind(row.9)
        .bind(row.10)
        .bind(row.11)
        .bind(row.12)
        .bind(row.13)
        .bind(row.14)
        .bind(row.15)
        .execute(pool)
        .await
        .unwrap();
    }

    sqlx::query(
        r#"
        INSERT INTO ai_request_trace (
            id, tenant_id, organization_id, request_id, status, http_status, error_type, provider_error_code, started_at
        )
        VALUES
            (1, 100001, 0, 'req-1', 1, 200, NULL, NULL, '2026-05-01 10:00:00'),
            (2, 100001, 0, 'req-2', 1, 500, NULL, NULL, '2026-05-01 11:00:00'),
            (3, 99, 20, 'req-ignored', 1, 500, NULL, NULL, '2026-05-01 12:00:00'),
            (4, 100001, 0, 'trace-only', 1, 500, NULL, NULL, '2026-05-01 13:00:00')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn seed_untimed_usage_with_null_users(pool: &SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO ai_usage (
            id, tenant_id, organization_id, user_id, owner_type, owner_id, request_id, status,
            owner_name_snapshot, catalog_key, model, modality, request_count,
            total_tokens, customer_charge_amount, upstream_cost_amount, occurred_at
        )
        VALUES
            (1, 100001, 0, NULL, 1, NULL, 'req-service-key', 1, 'Service Key', 'openai/gpt-4o', 'gpt-4o', 1, 2, 200, '8.0', '4.0', NULL),
            (2, 100001, 0, 0, 1, 0, 'req-unknown', 1, '', 'anthropic/claude-3-5-sonnet', 'claude-3-5-sonnet', NULL, 1, 100, '3.0', '1.5', NULL),
            (3, 99, 20, NULL, 1, NULL, 'req-ignored', 1, 'Other Tenant', 'openai/gpt-4o', 'gpt-4o', 1, 100, 10000, '999.0', '999.0', NULL)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ai_request_trace (
            id, tenant_id, organization_id, request_id, status, http_status, error_type, provider_error_code, started_at
        )
        VALUES
            (1, 100001, 0, 'req-unknown', 1, 500, NULL, NULL, '2026-05-02 10:00:00'),
            (2, 100001, 0, 'trace-only', 1, 500, NULL, NULL, '2026-05-02 11:00:00')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn seed_default_scope_usage(pool: &SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO ai_usage (
            id, tenant_id, organization_id, user_id, owner_type, owner_id, request_id, status,
            owner_name_snapshot, catalog_key, model, modality, request_count,
            prompt_tokens, completion_tokens, cached_tokens, total_tokens,
            customer_charge_amount, upstream_cost_amount, cost_amount, occurred_at
        )
        VALUES
            (1, 100001, 0, 0, 1, 0, 'req-default-1', 1, 'Default Org User', 'openai/gpt-4o', 'gpt-4o', 1, 2, 1, 0, 0, 2, '1.0', '0.5', '1.0', '2026-05-02 09:00:00')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ai_request_trace (
            id, tenant_id, organization_id, request_id, status, http_status, error_type, provider_error_code, started_at
        )
        VALUES
            (1, 100001, 0, 'req-default-1', 1, 500, NULL, NULL, '2026-05-02 09:00:00')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn seed_duplicate_display_name_usage(pool: &SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO ai_usage (
            id, tenant_id, organization_id, user_id, owner_type, owner_id, request_id, status,
            owner_name_snapshot, catalog_key, model, modality, request_count,
            total_tokens, customer_charge_amount, upstream_cost_amount, occurred_at
        )
        VALUES
            (1, 100001, 0, 101, 1, 101, 'req-shared-1', 1, 'Shared Display', 'openai/gpt-4o', 'gpt-4o', 1, 1, 100, '10.0', '5.0', '2026-05-10 10:00:00'),
            (2, 100001, 0, 102, 1, 102, 'req-shared-2', 1, 'Shared Display', 'openai/gpt-4o', 'gpt-4o', 1, 1, 120, '12.0', '6.0', '2026-05-10 11:00:00')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ai_request_trace (
            id, tenant_id, organization_id, request_id, status, http_status, error_type, provider_error_code, started_at
        )
        VALUES
            (1, 100001, 0, 'req-shared-1', 1, 200, NULL, NULL, '2026-05-10 10:00:00'),
            (2, 100001, 0, 'req-shared-2', 1, 200, NULL, NULL, '2026-05-10 11:00:00')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}
