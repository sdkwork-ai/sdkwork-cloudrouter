use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteModelRankingRefreshStore;
use sdkwork_clawrouter_router_service::ports::{
    ModelRankingRefreshCommand, ModelRankingRefreshStore,
};
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::{Row, SqlitePool};

#[tokio::test]
async fn sqlite_model_ranking_refresh_store_generates_rank_snapshot_from_usage_facts() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_tables(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, tenant_id, organization_id, status, catalog_key, model, display_name, vendor_code, region_code, vendor_name_snapshot, capability, color_token, license_type, context_tokens, rank_score)
        VALUES
            (1, 0, 0, 1, 'openai/alpha', 'alpha', 'Alpha', 'openai', 'global', 'OpenAI', 1, '#111111', 2, 128000, '100'),
            (2, 0, 0, 1, 'anthropic/beta', 'beta', 'Beta', 'anthropic', 'global', 'Anthropic', 1, '#222222', 2, 200000, '90')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_usage
            (id, tenant_id, organization_id, status, catalog_key, model, modality, request_count, total_tokens, customer_charge_amount, currency, occurred_at)
        VALUES
            (1, 0, 0, 1, 'openai/alpha', 'alpha', 1, 5, 5000, '2.500000', 'USD', '2026-05-07T10:00:00Z'),
            (2, 0, 0, 1, 'openai/alpha', 'alpha', 1, 7, 9000, '3.000000', 'USD', '2026-05-07T11:00:00Z'),
            (3, 0, 0, 1, 'anthropic/beta', 'beta', 1, 4, 2000, '1.000000', 'USD', '2026-05-07T12:00:00Z'),
            (4, 0, 0, 1, 'openai/alpha', 'alpha', 1, 99, 99000, '9.900000', 'USD', '2026-04-01T00:00:00Z')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_rank_snapshot
            (id, uuid, tenant_id, organization_id, status, snapshot_date, snapshot_period, rank_scope, catalog_key, model, vendor_code, region_code, rank_no)
        VALUES
            (1, 'previous-alpha', 0, 0, 1, '2026-05-06', 1, 'commercial-default', 'openai/alpha', 'alpha', 'openai', 'global', 3)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let outcome = SqliteModelRankingRefreshStore::new(pool.clone())
        .refresh_model_rankings(ModelRankingRefreshCommand {
            tenant_id: 0,
            organization_id: 0,
            rank_scope: "commercial-default".to_owned(),
            snapshot_date: "2026-05-08".to_owned(),
            snapshot_period: "daily".to_owned(),
            window_start: "2026-05-07T00:00:00Z".to_owned(),
            window_end: "2026-05-08T00:00:00Z".to_owned(),
            requested_at: "2026-05-08 00:05:00".to_owned(),
            limit: 200,
            refresh_interval_seconds: 3600,
            cache_max_age_seconds: 60,
            trigger_type: 1,
        })
        .await
        .unwrap();

    assert_eq!(2, outcome.generated_count);
    assert_eq!(3, outcome.source_count);
    assert_eq!("2026-05-08T01:05:00Z", outcome.next_refresh_at);

    let rows = sqlx::query(
        r#"
        SELECT catalog_key, rank_no, previous_rank_no, request_count, token_count, cost_amount, metadata
        FROM ai_model_rank_snapshot
        WHERE snapshot_date = '2026-05-08'
        ORDER BY rank_no ASC
        "#,
    )
    .fetch_all(&pool)
    .await
    .unwrap();

    assert_eq!(2, rows.len());
    assert_eq!("openai/alpha", rows[0].get::<String, _>("catalog_key"));
    assert_eq!(1, rows[0].get::<i64, _>("rank_no"));
    assert_eq!(3, rows[0].get::<i64, _>("previous_rank_no"));
    assert_eq!(12, rows[0].get::<i64, _>("request_count"));
    assert_eq!(14000, rows[0].get::<i64, _>("token_count"));
    assert_eq!("5.500000000000", rows[0].get::<String, _>("cost_amount"));
    let metadata = rows[0].get::<String, _>("metadata");
    assert!(metadata.contains("\"windowStart\":\"2026-05-07T00:00:00Z\""));
    assert!(metadata.contains("\"refreshIntervalSeconds\":3600"));
}

#[tokio::test]
async fn sqlite_model_ranking_refresh_preserves_exact_cost_beyond_f64_precision() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_tables(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, tenant_id, organization_id, status, catalog_key, model, display_name, vendor_code, region_code, vendor_name_snapshot, capability, color_token, license_type, context_tokens, rank_score)
        VALUES
            (1, 0, 0, 1, 'openai/precise', 'precise', 'Precise', 'openai', 'global', 'OpenAI', 1, '#111111', 2, 128000, '100')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_usage
            (id, tenant_id, organization_id, status, catalog_key, model, modality, request_count, total_tokens, customer_charge_amount, currency, occurred_at)
        VALUES
            (1, 0, 0, 1, 'openai/precise', 'precise', 1, 1, 1, '9007199254740992.000000000001', 'USD', '2026-05-07T10:00:00Z'),
            (2, 0, 0, 1, 'openai/precise', 'precise', 1, 1, 1, '0.000000000009', 'USD', '2026-05-07T11:00:00Z')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    SqliteModelRankingRefreshStore::new(pool.clone())
        .refresh_model_rankings(ModelRankingRefreshCommand {
            tenant_id: 0,
            organization_id: 0,
            rank_scope: "commercial-default".to_owned(),
            snapshot_date: "2026-05-08".to_owned(),
            snapshot_period: "daily".to_owned(),
            window_start: "2026-05-07T00:00:00Z".to_owned(),
            window_end: "2026-05-08T00:00:00Z".to_owned(),
            requested_at: "2026-05-08 00:05:00".to_owned(),
            limit: 200,
            refresh_interval_seconds: 3600,
            cache_max_age_seconds: 60,
            trigger_type: 1,
        })
        .await
        .unwrap();

    let cost_amount: String = sqlx::query_scalar(
        r#"
        SELECT cost_amount
        FROM ai_model_rank_snapshot
        WHERE snapshot_date = '2026-05-08'
          AND catalog_key = 'openai/precise'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!("9007199254740992.000000000010", cost_amount);
}

#[tokio::test]
async fn sqlite_model_ranking_refresh_prefers_exact_decimal_rank_score_beyond_f64_precision() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_tables(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, tenant_id, organization_id, status, catalog_key, model, display_name, vendor_code, region_code, vendor_name_snapshot, capability, color_token, license_type, context_tokens, rank_score)
        VALUES
            (1, 0, 0, 1, 'openai/precise-rank', 'precise-rank', 'Exact Decimal Winner', 'openai', 'global', 'OpenAI', 1, '#111111', 2, 128000, '9007199254740992.000000000001'),
            (2, 0, 0, 1, 'openai/precise-rank', 'precise-rank', 'Binary Float Tie Loser', 'openai', 'global', 'OpenAI', 1, '#222222', 2, 128000, '9007199254740992.000000000000')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_usage
            (id, tenant_id, organization_id, status, catalog_key, model, modality, request_count, total_tokens, customer_charge_amount, currency, occurred_at)
        VALUES
            (1, 0, 0, 1, 'openai/precise-rank', 'precise-rank', 1, 1, 1, '1.000000', 'USD', '2026-05-07T10:00:00Z')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    SqliteModelRankingRefreshStore::new(pool.clone())
        .refresh_model_rankings(ModelRankingRefreshCommand {
            tenant_id: 0,
            organization_id: 0,
            rank_scope: "commercial-default".to_owned(),
            snapshot_date: "2026-05-08".to_owned(),
            snapshot_period: "daily".to_owned(),
            window_start: "2026-05-07T00:00:00Z".to_owned(),
            window_end: "2026-05-08T00:00:00Z".to_owned(),
            requested_at: "2026-05-08 00:05:00".to_owned(),
            limit: 200,
            refresh_interval_seconds: 3600,
            cache_max_age_seconds: 60,
            trigger_type: 1,
        })
        .await
        .unwrap();

    let model_id: i64 = sqlx::query_scalar(
        r#"
        SELECT model_id
        FROM ai_model_rank_snapshot
        WHERE snapshot_date = '2026-05-08'
          AND catalog_key = 'openai/precise-rank'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(1, model_id);
}

#[tokio::test]
async fn sqlite_model_ranking_refresh_store_treats_missing_customer_charge_as_zero() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_tables(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, tenant_id, organization_id, status, catalog_key, model, display_name, vendor_code, region_code, vendor_name_snapshot, capability, color_token, license_type, context_tokens, rank_score)
        VALUES
            (1, 0, 0, 1, 'openai/alpha', 'alpha', 'Alpha', 'openai', 'global', 'OpenAI', 1, '#111111', 2, 128000, '100')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_usage
            (id, tenant_id, organization_id, status, catalog_key, model, modality, request_count, total_tokens, customer_charge_amount, currency, occurred_at)
        VALUES
            (1, 0, 0, 1, 'openai/alpha', 'alpha', 1, 5, 5000, NULL, 'USD', '2026-05-07T10:00:00Z'),
            (2, 0, 0, 1, 'openai/alpha', 'alpha', 1, 2, 2000, NULL, 'USD', '2026-05-07T11:00:00Z')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let outcome = SqliteModelRankingRefreshStore::new(pool.clone())
        .refresh_model_rankings(ModelRankingRefreshCommand {
            tenant_id: 0,
            organization_id: 0,
            rank_scope: "commercial-default".to_owned(),
            snapshot_date: "2026-05-08".to_owned(),
            snapshot_period: "daily".to_owned(),
            window_start: "2026-05-07T00:00:00Z".to_owned(),
            window_end: "2026-05-08T00:00:00Z".to_owned(),
            requested_at: "2026-05-08 00:05:00".to_owned(),
            limit: 200,
            refresh_interval_seconds: 3600,
            cache_max_age_seconds: 60,
            trigger_type: 1,
        })
        .await
        .unwrap();

    assert_eq!(1, outcome.generated_count);
    assert_eq!(2, outcome.source_count);

    let cost_amount: String = sqlx::query_scalar(
        r#"
        SELECT cost_amount
        FROM ai_model_rank_snapshot
        WHERE snapshot_date = '2026-05-08'
          AND catalog_key = 'openai/alpha'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!("0.000000000000", cost_amount);
}

#[tokio::test]
async fn sqlite_model_ranking_refresh_store_treats_zero_customer_charge_as_zero() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_tables(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, tenant_id, organization_id, status, catalog_key, model, display_name, vendor_code, region_code, vendor_name_snapshot, capability, color_token, license_type, context_tokens, rank_score)
        VALUES
            (1, 0, 0, 1, 'openai/alpha', 'alpha', 'Alpha', 'openai', 'global', 'OpenAI', 1, '#111111', 2, 128000, '100')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_usage
            (id, tenant_id, organization_id, status, catalog_key, model, modality, request_count, total_tokens, customer_charge_amount, currency, occurred_at)
        VALUES
            (1, 0, 0, 1, 'openai/alpha', 'alpha', 1, 7, 1000, '0', 'USD', '2026-05-07T10:00:00Z')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let outcome = SqliteModelRankingRefreshStore::new(pool.clone())
        .refresh_model_rankings(ModelRankingRefreshCommand {
            tenant_id: 0,
            organization_id: 0,
            rank_scope: "commercial-default".to_owned(),
            snapshot_date: "2026-05-08".to_owned(),
            snapshot_period: "daily".to_owned(),
            window_start: "2026-05-07T00:00:00Z".to_owned(),
            window_end: "2026-05-08T00:00:00Z".to_owned(),
            requested_at: "2026-05-08 00:05:00".to_owned(),
            limit: 200,
            refresh_interval_seconds: 3600,
            cache_max_age_seconds: 60,
            trigger_type: 1,
        })
        .await
        .unwrap();

    assert_eq!(1, outcome.generated_count);
    assert_eq!(1, outcome.source_count);

    let cost_amount: String = sqlx::query_scalar(
        r#"
        SELECT cost_amount
        FROM ai_model_rank_snapshot
        WHERE snapshot_date = '2026-05-08'
          AND catalog_key = 'openai/alpha'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!("0.000000000000", cost_amount);
}

#[tokio::test]
async fn sqlite_model_ranking_refresh_store_rejects_regional_catalog_key_compatibility() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_tables(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, tenant_id, organization_id, status, catalog_key, model, display_name, vendor_code, region_code, vendor_name_snapshot, capability, color_token, license_type, context_tokens, rank_score)
        VALUES
            (1, 0, 0, 1, 'openai/alpha', 'alpha', 'Alpha', 'openai', 'global', 'OpenAI', 1, '#111111', 2, 128000, '100')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_usage
            (id, tenant_id, organization_id, status, catalog_key, model, modality, request_count, total_tokens, customer_charge_amount, currency, occurred_at)
        VALUES
            (1, 0, 0, 1, 'openai/global/alpha', 'alpha', 1, 5, 5000, '2.500000', 'USD', '2026-05-07T10:00:00Z')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let outcome = SqliteModelRankingRefreshStore::new(pool.clone())
        .refresh_model_rankings(ModelRankingRefreshCommand {
            tenant_id: 0,
            organization_id: 0,
            rank_scope: "commercial-default".to_owned(),
            snapshot_date: "2026-05-08".to_owned(),
            snapshot_period: "daily".to_owned(),
            window_start: "2026-05-07T00:00:00Z".to_owned(),
            window_end: "2026-05-08T00:00:00Z".to_owned(),
            requested_at: "2026-05-08 00:05:00".to_owned(),
            limit: 200,
            refresh_interval_seconds: 3600,
            cache_max_age_seconds: 60,
            trigger_type: 1,
        })
        .await
        .unwrap();

    assert_eq!(0, outcome.generated_count);
    assert_eq!(0, outcome.source_count);

    let snapshot_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM ai_model_rank_snapshot
        WHERE snapshot_date = '2026-05-08'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(0, snapshot_count);
}

#[tokio::test]
async fn sqlite_model_ranking_refresh_store_excludes_deprecated_hidden_and_catalog_only_models() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_tables(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, tenant_id, organization_id, status, catalog_key, model, display_name, vendor_code, region_code, vendor_name_snapshot, capability, color_token, license_type, context_tokens, rank_score, release_stage, shelf_state, routing_state)
        VALUES
            (1, 0, 0, 1, 'openai/alpha', 'alpha', 'Alpha', 'openai', 'global', 'OpenAI', 1, '#111111', 2, 128000, '100', 1, 1, 1),
            (2, 0, 0, 0, 'openai/deprecated-alpha', 'deprecated-alpha', 'Deprecated Alpha', 'openai', 'global', 'OpenAI', 1, '#333333', 2, 128000, '99', 3, 2, 0),
            (3, 0, 0, 1, 'openai/hidden-alpha', 'hidden-alpha', 'Hidden Alpha', 'openai', 'global', 'OpenAI', 1, '#444444', 2, 128000, '98', 1, 2, 1),
            (4, 0, 0, 1, 'openai/catalog-only-alpha', 'catalog-only-alpha', 'Catalog Only Alpha', 'openai', 'global', 'OpenAI', 1, '#555555', 2, 128000, '97', 1, 1, 0)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_usage
            (id, tenant_id, organization_id, status, catalog_key, model, modality, request_count, total_tokens, customer_charge_amount, currency, occurred_at)
        VALUES
            (1, 0, 0, 1, 'openai/deprecated-alpha', 'deprecated-alpha', 1, 50, 50000, '50.000000', 'USD', '2026-05-07T10:00:00Z'),
            (2, 0, 0, 1, 'openai/hidden-alpha', 'hidden-alpha', 1, 40, 40000, '40.000000', 'USD', '2026-05-07T10:00:00Z'),
            (3, 0, 0, 1, 'openai/catalog-only-alpha', 'catalog-only-alpha', 1, 30, 30000, '30.000000', 'USD', '2026-05-07T10:00:00Z'),
            (4, 0, 0, 1, 'openai/alpha', 'alpha', 1, 5, 5000, '5.000000', 'USD', '2026-05-07T10:00:00Z')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let outcome = SqliteModelRankingRefreshStore::new(pool.clone())
        .refresh_model_rankings(ModelRankingRefreshCommand {
            tenant_id: 0,
            organization_id: 0,
            rank_scope: "commercial-default".to_owned(),
            snapshot_date: "2026-05-08".to_owned(),
            snapshot_period: "daily".to_owned(),
            window_start: "2026-05-07T00:00:00Z".to_owned(),
            window_end: "2026-05-08T00:00:00Z".to_owned(),
            requested_at: "2026-05-08 00:05:00".to_owned(),
            limit: 200,
            refresh_interval_seconds: 3600,
            cache_max_age_seconds: 60,
            trigger_type: 1,
        })
        .await
        .unwrap();

    assert_eq!(1, outcome.generated_count);
    assert_eq!(1, outcome.source_count);
    let rows = sqlx::query(
        r#"
        SELECT catalog_key
        FROM ai_model_rank_snapshot
        WHERE snapshot_date = '2026-05-08'
        ORDER BY rank_no ASC
        "#,
    )
    .fetch_all(&pool)
    .await
    .unwrap();
    assert_eq!(1, rows.len());
    assert_eq!("openai/alpha", rows[0].get::<String, _>("catalog_key"));
}

#[tokio::test]
async fn sqlite_model_ranking_refresh_store_keeps_existing_snapshot_when_window_has_no_usage() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_tables(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, tenant_id, organization_id, status, catalog_key, model, display_name, vendor_code, region_code, vendor_name_snapshot, capability, color_token, license_type, context_tokens, rank_score)
        VALUES
            (1, 0, 0, 1, 'openai/alpha', 'alpha', 'Alpha', 'openai', 'global', 'OpenAI', 1, '#111111', 2, 128000, '100')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_rank_snapshot
            (id, uuid, tenant_id, organization_id, status, snapshot_date, snapshot_period, rank_scope, catalog_key, model, vendor_code, region_code, rank_no)
        VALUES
            (1, 'existing-alpha', 0, 0, 1, '2026-05-08', 1, 'commercial-default', 'openai/alpha', 'alpha', 'openai', 'global', 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let outcome = SqliteModelRankingRefreshStore::new(pool.clone())
        .refresh_model_rankings(ModelRankingRefreshCommand {
            tenant_id: 0,
            organization_id: 0,
            rank_scope: "commercial-default".to_owned(),
            snapshot_date: "2026-05-08".to_owned(),
            snapshot_period: "daily".to_owned(),
            window_start: "2026-05-07T00:00:00Z".to_owned(),
            window_end: "2026-05-08T00:00:00Z".to_owned(),
            requested_at: "2026-05-08 00:05:00".to_owned(),
            limit: 200,
            refresh_interval_seconds: 3600,
            cache_max_age_seconds: 60,
            trigger_type: 1,
        })
        .await
        .unwrap();

    assert_eq!(0, outcome.generated_count);
    assert_eq!(0, outcome.source_count);

    let active_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM ai_model_rank_snapshot
        WHERE snapshot_date = '2026-05-08'
          AND rank_scope = 'commercial-default'
          AND status = 1
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(1, active_count);
}

#[tokio::test]
async fn sqlite_model_ranking_refresh_store_normalizes_invalid_global_organization_scope() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_tables(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, tenant_id, organization_id, status, catalog_key, model, display_name, vendor_code, region_code, vendor_name_snapshot, capability, color_token, license_type, context_tokens, rank_score)
        VALUES
            (1, 0, 0, 1, 'openai/alpha', 'alpha', 'Alpha', 'openai', 'global', 'OpenAI', 1, '#111111', 2, 128000, '100')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_usage
            (id, tenant_id, organization_id, status, catalog_key, model, modality, request_count, total_tokens, customer_charge_amount, currency, occurred_at)
        VALUES
            (1, 0, 0, 1, 'openai/alpha', 'alpha', 1, 5, 5000, '2.500000', 'USD', '2026-05-07T10:00:00Z')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let outcome = SqliteModelRankingRefreshStore::new(pool.clone())
        .refresh_model_rankings(ModelRankingRefreshCommand {
            tenant_id: 0,
            organization_id: 0,
            rank_scope: "commercial-default".to_owned(),
            snapshot_date: "2026-05-08".to_owned(),
            snapshot_period: "daily".to_owned(),
            window_start: "2026-05-07T00:00:00Z".to_owned(),
            window_end: "2026-05-08T00:00:00Z".to_owned(),
            requested_at: "2026-05-08 00:05:00".to_owned(),
            limit: 200,
            refresh_interval_seconds: 3600,
            cache_max_age_seconds: 60,
            trigger_type: 1,
        })
        .await
        .unwrap();

    assert_eq!(1, outcome.generated_count);

    let scopes = sqlx::query(
        r#"
        SELECT tenant_id, organization_id
        FROM ai_model_rank_snapshot
        WHERE snapshot_date = '2026-05-08'
        "#,
    )
    .fetch_all(&pool)
    .await
    .unwrap();

    assert_eq!(1, scopes.len());
    assert_eq!(0, scopes[0].get::<i64, _>("tenant_id"));
    assert_eq!(0, scopes[0].get::<i64, _>("organization_id"));
}

#[tokio::test]
async fn sqlite_model_ranking_refresh_store_normalizes_snapshot_scope_and_period_text() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_tables(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, tenant_id, organization_id, status, catalog_key, model, display_name, vendor_code, region_code, vendor_name_snapshot, capability, color_token, license_type, context_tokens, rank_score)
        VALUES
            (1, 0, 0, 1, 'openai/alpha', 'alpha', 'Alpha', 'openai', 'global', 'OpenAI', 1, '#111111', 2, 128000, '100')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_usage
            (id, tenant_id, organization_id, status, catalog_key, model, modality, request_count, total_tokens, customer_charge_amount, currency, occurred_at)
        VALUES
            (1, 0, 0, 1, 'openai/alpha', 'alpha', 1, 5, 5000, '2.500000', 'USD', '2026-05-07T10:00:00Z')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let outcome = SqliteModelRankingRefreshStore::new(pool.clone())
        .refresh_model_rankings(ModelRankingRefreshCommand {
            tenant_id: 0,
            organization_id: 0,
            rank_scope: " Commercial-Default ".to_owned(),
            snapshot_date: "2026-05-08".to_owned(),
            snapshot_period: " Daily ".to_owned(),
            window_start: "2026-05-07T00:00:00Z".to_owned(),
            window_end: "2026-05-08T00:00:00Z".to_owned(),
            requested_at: "2026-05-08 00:05:00".to_owned(),
            limit: 200,
            refresh_interval_seconds: 3600,
            cache_max_age_seconds: 60,
            trigger_type: 1,
        })
        .await
        .unwrap();

    assert_eq!("commercial-default", outcome.rank_scope);
    assert_eq!("daily", outcome.snapshot_period);

    let row = sqlx::query(
        r#"
        SELECT rank_scope, snapshot_period, metadata
        FROM ai_model_rank_snapshot
        WHERE snapshot_date = '2026-05-08'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!("commercial-default", row.get::<String, _>("rank_scope"));
    assert_eq!(1, row.get::<i64, _>("snapshot_period"));
    let metadata = row.get::<String, _>("metadata");
    assert!(metadata.contains("\"snapshotPeriod\":\"daily\""));
}

async fn create_tables(pool: &SqlitePool) {
    sqlx::query(
        r#"
        CREATE TABLE ai_model (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            catalog_key TEXT NOT NULL,
            model TEXT,
            display_name TEXT,
            vendor_code TEXT,
            region_code TEXT,
            vendor_name_snapshot TEXT,
            capability INTEGER,
            color_token TEXT,
            license_type INTEGER,
            context_tokens INTEGER,
            rank_score TEXT,
            release_stage INTEGER NOT NULL DEFAULT 1,
            shelf_state INTEGER NOT NULL DEFAULT 1,
            routing_state INTEGER NOT NULL DEFAULT 1,
            deleted_at TEXT
        )
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        CREATE TABLE ai_usage (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            catalog_key TEXT NOT NULL,
            model TEXT,
            modality INTEGER,
            request_count INTEGER,
            total_tokens INTEGER,
            customer_charge_amount TEXT,
            currency TEXT,
            occurred_at TEXT
        )
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        CREATE TABLE ai_model_rank_snapshot (
            id BIGINT NOT NULL PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            source_type TEXT,
            source_version INTEGER,
            status INTEGER NOT NULL,
            created_at TEXT,
            updated_at TEXT,
            rebuild_version INTEGER,
            metadata TEXT,
            snapshot_date TEXT,
            snapshot_period INTEGER,
            rank_scope TEXT,
            model_id INTEGER,
            catalog_key TEXT NOT NULL,
            model TEXT,
            vendor_code TEXT,
            region_code TEXT,
            vendor_name_snapshot TEXT,
            provider_code TEXT,
            modality INTEGER,
            rank_no INTEGER,
            previous_rank_no INTEGER,
            base_volume INTEGER,
            cost_indicator INTEGER,
            context_size_text TEXT,
            is_new INTEGER,
            color_token TEXT,
            pricing_text TEXT,
            license_type INTEGER,
            strengths TEXT,
            request_count INTEGER,
            token_count INTEGER,
            cost_amount TEXT,
            currency TEXT,
            latency_p50_ms INTEGER,
            latency_p95_ms INTEGER,
            success_rate TEXT,
            win_rate TEXT,
            trend_score TEXT,
            rank_payload TEXT,
            UNIQUE (tenant_id, organization_id, snapshot_date, snapshot_period, rank_scope, vendor_code, region_code, catalog_key)
        )
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        CREATE TABLE ops_job_execution (
            id BIGINT NOT NULL PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            metadata TEXT,
            job_name TEXT NOT NULL,
            job_type INTEGER NOT NULL,
            trigger_type INTEGER NOT NULL,
            started_at TEXT NOT NULL,
            ended_at TEXT NOT NULL,
            duration_ms INTEGER NOT NULL,
            execution_status INTEGER NOT NULL,
            processed_count INTEGER NOT NULL,
            success_count INTEGER NOT NULL,
            failure_count INTEGER NOT NULL,
            failure_reason TEXT,
            payload TEXT NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}
