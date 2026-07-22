use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteModelRankingsReadStore;
use sdkwork_clawrouter_router_service::ports::{
    ModelRankingRefreshJobHistoryQuery, ModelRankingRefreshJobHistoryReadStore,
    ModelRankingRefreshStatusQuery, ModelRankingRefreshStatusReadStore, ModelRankingsQuery,
    ModelRankingsReadStore, ModelRankingsSubject,
};
use sqlx::sqlite::SqlitePoolOptions;

#[tokio::test]
async fn sqlite_model_rankings_read_store_reads_latest_items_with_matching_period_history() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_rank_snapshot_table(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model_rank_snapshot
            (id, tenant_id, organization_id, status, snapshot_date, snapshot_period, rank_scope, catalog_key, model, vendor_code, vendor_name_snapshot, modality, rank_no, previous_rank_no, request_count, base_volume, cost_indicator, latency_p50_ms, strengths)
        VALUES
            (1, 0, 0, 1, '2026-05-07', 1, 'commercial-default', 'openai/gpt-5.1', 'gpt-5.1', 'openai', 'OpenAI', 1, 1, 2, 100, 100, 4, 1200, '["reasoning"]'),
            (2, 0, 0, 1, '2026-05-08', 1, 'commercial-default', 'openai/gpt-5.1', 'gpt-5.1', 'openai', 'OpenAI', 1, 2, 1, 140, 140, 4, 1000, '["reasoning"]'),
            (3, 0, 0, 1, '2026-05-07', 1, 'commercial-default', 'anthropic/claude-sonnet-4-6', 'claude-sonnet-4-6', 'anthropic', 'Anthropic', 1, 3, 4, 90, 90, 4, 900, '["agentic"]'),
            (4, 0, 0, 1, '2026-06-03', 1, 'commercial-default', 'alibaba/qwen3-plus', 'qwen3-plus', 'alibaba', 'Alibaba', 1, 1, 2, 180, 180, 3, 800, '["balanced"]')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let snapshot = SqliteModelRankingsReadStore::new(pool)
        .load_model_rankings(
            ModelRankingsQuery {
                limit: 200,
                ..ModelRankingsQuery::default()
            },
            None,
        )
        .await
        .unwrap();

    assert_eq!("2026-06-03", snapshot.source.observed_at);
    assert_eq!("2026-06-03", snapshot.source.snapshot_date);
    assert_eq!(1, snapshot.items.len());
    assert_eq!("qwen3-plus", snapshot.items[0].name);
    assert_eq!(
        vec![
            "2026-05-07".to_owned(),
            "2026-05-08".to_owned(),
            "2026-06-03".to_owned(),
        ],
        snapshot
            .history
            .iter()
            .map(|point| point.date.clone())
            .collect::<Vec<_>>()
    );
    assert!(snapshot
        .history
        .iter()
        .flat_map(|point| &point.entries)
        .all(|entry| entry.catalog_key == "alibaba/qwen3-plus"));
}

#[tokio::test]
async fn sqlite_model_rankings_read_store_normalizes_invalid_cost_indicator_to_contract_default() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_rank_snapshot_table(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model_rank_snapshot
            (id, tenant_id, organization_id, status, snapshot_date, snapshot_period, rank_scope, catalog_key, model, vendor_code, vendor_name_snapshot, modality, rank_no, request_count, base_volume)
        VALUES
            (1, 0, 0, 1, '2026-05-08', 1, 'commercial-default', 'openai/gpt-5.2', 'gpt-5.2', 'openai', 'OpenAI', 1, 1, 100, 100)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_rank_snapshot
            (id, tenant_id, organization_id, status, snapshot_date, snapshot_period, rank_scope, catalog_key, model, vendor_code, vendor_name_snapshot, modality, rank_no, request_count, base_volume, cost_indicator)
        VALUES
            (2, 0, 0, 1, '2026-05-08', 1, 'commercial-default', 'openai/gpt-5.5', 'gpt-5.5', 'openai', 'OpenAI', 1, 2, 90, 90, 0),
            (3, 0, 0, 1, '2026-05-08', 1, 'commercial-default', 'anthropic/claude-sonnet-4-6', 'claude-sonnet-4-6', 'anthropic', 'Anthropic', 1, 3, 80, 80, 8)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let snapshot = SqliteModelRankingsReadStore::new(pool)
        .load_model_rankings(
            ModelRankingsQuery {
                limit: 200,
                ..ModelRankingsQuery::default()
            },
            None,
        )
        .await
        .unwrap();

    assert_eq!(3, snapshot.items.len());
    assert_eq!(
        vec![3, 3, 3],
        snapshot
            .items
            .iter()
            .map(|item| item.cost_indicator)
            .collect::<Vec<_>>()
    );
}

#[tokio::test]
async fn sqlite_model_rankings_read_store_excludes_deprecated_hidden_and_catalog_only_models() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_rank_snapshot_table(&pool).await;
    create_ai_model_table(&pool).await;

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
            (id, tenant_id, organization_id, status, snapshot_date, snapshot_period, rank_scope, catalog_key, model, vendor_code, vendor_name_snapshot, modality, rank_no, request_count, base_volume)
        VALUES
            (1, 0, 0, 1, '2026-05-08', 1, 'commercial-default', 'openai/gpt-deprecated', 'gpt-deprecated', 'openai', 'OpenAI', 1, 1, 100, 100),
            (2, 0, 0, 1, '2026-05-08', 1, 'commercial-default', 'openai/gpt-hidden', 'gpt-hidden', 'openai', 'OpenAI', 1, 2, 90, 90),
            (3, 0, 0, 1, '2026-05-08', 1, 'commercial-default', 'openai/gpt-catalog-only', 'gpt-catalog-only', 'openai', 'OpenAI', 1, 3, 80, 80),
            (4, 0, 0, 1, '2026-05-08', 1, 'commercial-default', 'openai/gpt-active', 'gpt-active', 'openai', 'OpenAI', 1, 4, 70, 70)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let snapshot = SqliteModelRankingsReadStore::new(pool)
        .load_model_rankings(
            ModelRankingsQuery {
                limit: 200,
                ..ModelRankingsQuery::default()
            },
            None,
        )
        .await
        .unwrap();

    assert_eq!(
        vec!["gpt-active"],
        snapshot
            .items
            .iter()
            .map(|item| item.name.as_str())
            .collect::<Vec<_>>()
    );
}

#[tokio::test]
async fn sqlite_model_rankings_read_store_does_not_expose_global_tenant_organization_rows() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_rank_snapshot_table(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model_rank_snapshot
            (id, tenant_id, organization_id, status, snapshot_date, snapshot_period, rank_scope, model, vendor_code, vendor_name_snapshot, modality, rank_no, request_count)
        VALUES
            (1, 0, 20, 1, '2026-05-08', 1, 'commercial-default', 'should-not-leak', 'openai', 'OpenAI', 1, 1, 100)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let snapshot = SqliteModelRankingsReadStore::new(pool)
        .load_model_rankings(
            ModelRankingsQuery {
                limit: 200,
                ..ModelRankingsQuery::default()
            },
            Some(ModelRankingsSubject {
                tenant_id: 100001,
                organization_id: 0,
                user_id: 30,
            }),
        )
        .await
        .unwrap();

    assert!(snapshot.items.is_empty());
}

#[tokio::test]
async fn sqlite_model_rankings_read_store_normalizes_negative_organization_to_tenant_scope() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_rank_snapshot_table(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model_rank_snapshot
            (id, tenant_id, organization_id, status, snapshot_date, snapshot_period, rank_scope, catalog_key, model, vendor_code, vendor_name_snapshot, modality, rank_no, request_count)
        VALUES
            (3, 0, 0, 1, '2026-05-08', 1, 'commercial-default', 'openai/platform', 'platform-model', 'openai', 'OpenAI', 1, 1, 100),
            (4, 10, 0, 1, '2026-05-08', 1, 'commercial-default', 'openai/tenant', 'tenant-model', 'openai', 'OpenAI', 1, 1, 100)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let snapshot = SqliteModelRankingsReadStore::new(pool)
        .load_model_rankings(
            ModelRankingsQuery {
                limit: 200,
                ..ModelRankingsQuery::default()
            },
            Some(ModelRankingsSubject {
                tenant_id: 100001,
                organization_id: -1,
                user_id: 30,
            }),
        )
        .await
        .unwrap();

    assert_eq!(1, snapshot.items.len());
    assert_eq!("platform-model", snapshot.items[0].name);
}

#[tokio::test]
async fn sqlite_model_rankings_read_store_exposes_task_metadata_and_history_from_rank_snapshots() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_rank_snapshot_table(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model_rank_snapshot
            (id, tenant_id, organization_id, status, metadata, snapshot_date, snapshot_period, rank_scope, catalog_key, model, vendor_code, vendor_name_snapshot, modality, rank_no, previous_rank_no, request_count, base_volume, cost_indicator, latency_p50_ms, strengths)
        VALUES
            (10, 0, 0, 1, '{"snapshotPeriod":"daily","windowStart":"2026-05-06T00:00:00Z","windowEnd":"2026-05-07T00:00:00Z","generatedAt":"2026-05-07T00:05:00Z","refreshIntervalSeconds":3600,"nextRefreshAt":"2026-05-07T01:05:00Z","cacheMaxAgeSeconds":60,"sourceTables":["ai_usage","ai_request_trace","ai_model_rank_snapshot"]}', '2026-05-07', 1, 'commercial-default', 'openai/gpt-5.2', 'gpt-5.2', 'openai', 'OpenAI', 1, 2, 3, 120, 120, 3, 1100, '["reasoning"]'),
            (11, 0, 0, 1, '{"snapshotPeriod":"daily","windowStart":"2026-05-06T00:00:00Z","windowEnd":"2026-05-07T00:00:00Z","generatedAt":"2026-05-07T00:05:00Z","refreshIntervalSeconds":3600,"nextRefreshAt":"2026-05-07T01:05:00Z","cacheMaxAgeSeconds":60,"sourceTables":["ai_usage","ai_request_trace","ai_model_rank_snapshot"]}', '2026-05-07', 1, 'commercial-default', 'anthropic/claude-sonnet-4-6', 'claude-sonnet-4-6', 'anthropic', 'Anthropic', 1, 1, 1, 220, 220, 4, 900, '["agentic"]'),
            (12, 0, 0, 1, '{"snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","generatedAt":"2026-05-08T00:05:00Z","refreshIntervalSeconds":3600,"nextRefreshAt":"2026-05-08T01:05:00Z","cacheMaxAgeSeconds":60,"sourceTables":["ai_usage","ai_request_trace","ai_model_rank_snapshot"]}', '2026-05-08', 1, 'commercial-default', 'openai/gpt-5.2', 'gpt-5.2', 'openai', 'OpenAI', 1, 1, 2, 320, 320, 3, 1000, '["reasoning"]'),
            (13, 0, 0, 1, '{"snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","generatedAt":"2026-05-08T00:05:00Z","refreshIntervalSeconds":3600,"nextRefreshAt":"2026-05-08T01:05:00Z","cacheMaxAgeSeconds":60,"sourceTables":["ai_usage","ai_request_trace","ai_model_rank_snapshot"]}', '2026-05-08', 1, 'commercial-default', 'anthropic/claude-sonnet-4-6', 'claude-sonnet-4-6', 'anthropic', 'Anthropic', 1, 2, 1, 260, 260, 4, 950, '["agentic"]')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let snapshot = SqliteModelRankingsReadStore::new(pool)
        .load_model_rankings(
            ModelRankingsQuery {
                limit: 200,
                ..ModelRankingsQuery::default()
            },
            None,
        )
        .await
        .unwrap();

    assert_eq!("2026-05-08", snapshot.source.snapshot_date);
    assert_eq!("daily", snapshot.source.snapshot_period);
    assert_eq!("2026-05-07T00:00:00Z", snapshot.source.window_start);
    assert_eq!("2026-05-08T00:00:00Z", snapshot.source.window_end);
    assert_eq!("2026-05-08T00:05:00Z", snapshot.source.generated_at);
    assert_eq!(3600, snapshot.source.refresh_interval_seconds);
    assert_eq!("2026-05-08T01:05:00Z", snapshot.source.next_refresh_at);
    assert_eq!(60, snapshot.source.cache_max_age_seconds);
    assert_eq!(
        vec![
            "ai_usage".to_owned(),
            "ai_request_trace".to_owned(),
            "ai_model_rank_snapshot".to_owned()
        ],
        snapshot.source.source_tables
    );
    assert_eq!("openai/gpt-5.2", snapshot.items[0].id);
    assert_eq!("anthropic/claude-sonnet-4-6", snapshot.items[1].id);
    assert!(
        snapshot
            .items
            .iter()
            .all(|item| !item.id.starts_with("2026-05-08:")),
        "ranking item id must be the stable catalog identity, not a snapshot-scoped display key"
    );
    assert_eq!(2, snapshot.history.len());
    assert_eq!("2026-05-07", snapshot.history[0].date);
    assert_eq!(0, snapshot.history[0].index);
    assert_eq!("2026-05-08", snapshot.history[1].date);
    assert_eq!(1, snapshot.history[1].index);
    assert_eq!(
        Some(320),
        snapshot.history[1]
            .entries
            .iter()
            .find(|entry| entry.model == "gpt-5.2")
            .map(|entry| entry.volume)
    );
}

#[tokio::test]
async fn sqlite_model_rankings_read_store_preserves_source_metadata_when_filters_match_no_items() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_rank_snapshot_table(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model_rank_snapshot
            (id, tenant_id, organization_id, status, metadata, snapshot_date, snapshot_period, rank_scope, catalog_key, model, vendor_code, vendor_name_snapshot, modality, rank_no, request_count, base_volume)
        VALUES
            (80, 0, 0, 1, '{"snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","generatedAt":"2026-05-08T00:05:00Z","refreshIntervalSeconds":3600,"nextRefreshAt":"2026-05-08T01:05:00Z","cacheMaxAgeSeconds":60,"sourceTables":["ai_usage","ai_model","ai_model_rank_snapshot"]}', '2026-05-08', 1, 'commercial-default', 'openai/gpt-5.2', 'gpt-5.2', 'openai', 'OpenAI', 1, 1, 120, 120),
            (81, 0, 0, 1, '{"snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","generatedAt":"2026-05-08T00:05:00Z","refreshIntervalSeconds":3600,"nextRefreshAt":"2026-05-08T01:05:00Z","cacheMaxAgeSeconds":60,"sourceTables":["ai_usage","ai_model","ai_model_rank_snapshot"]}', '2026-05-08', 1, 'commercial-default', 'anthropic/claude-sonnet-4-6', 'claude-sonnet-4-6', 'anthropic', 'Anthropic', 1, 2, 90, 90)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let snapshot = SqliteModelRankingsReadStore::new(pool)
        .load_model_rankings(
            ModelRankingsQuery {
                vendor_code: Some("does-not-exist".to_owned()),
                limit: 200,
                ..ModelRankingsQuery::default()
            },
            None,
        )
        .await
        .unwrap();

    assert!(snapshot.items.is_empty());
    assert!(snapshot.history.is_empty());
    assert_eq!("2026-05-08", snapshot.source.observed_at);
    assert_eq!("2026-05-08", snapshot.source.snapshot_date);
    assert_eq!("daily", snapshot.source.snapshot_period);
    assert_eq!("2026-05-07T00:00:00Z", snapshot.source.window_start);
    assert_eq!("2026-05-08T00:00:00Z", snapshot.source.window_end);
    assert_eq!("2026-05-08T00:05:00Z", snapshot.source.generated_at);
}

#[tokio::test]
async fn sqlite_model_rankings_read_store_applies_query_filters_to_history() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_rank_snapshot_table(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model_rank_snapshot
            (id, tenant_id, organization_id, status, metadata, snapshot_date, snapshot_period, rank_scope, catalog_key, model, vendor_code, vendor_name_snapshot, modality, rank_no, request_count, base_volume)
        VALUES
            (90, 0, 0, 1, '{"snapshotPeriod":"daily","windowStart":"2026-05-06T00:00:00Z","windowEnd":"2026-05-07T00:00:00Z","generatedAt":"2026-05-07T00:05:00Z","refreshIntervalSeconds":3600,"nextRefreshAt":"2026-05-07T01:05:00Z","cacheMaxAgeSeconds":60}', '2026-05-07', 1, 'commercial-default', 'openai/gpt-5.2', 'gpt-5.2', 'openai', 'OpenAI', 1, 1, 100, 100),
            (91, 0, 0, 1, '{"snapshotPeriod":"daily","windowStart":"2026-05-06T00:00:00Z","windowEnd":"2026-05-07T00:00:00Z","generatedAt":"2026-05-07T00:05:00Z","refreshIntervalSeconds":3600,"nextRefreshAt":"2026-05-07T01:05:00Z","cacheMaxAgeSeconds":60}', '2026-05-07', 1, 'commercial-default', 'anthropic/claude-sonnet-4-6', 'claude-sonnet-4-6', 'anthropic', 'Anthropic', 1, 2, 90, 90),
            (92, 0, 0, 1, '{"snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","generatedAt":"2026-05-08T00:05:00Z","refreshIntervalSeconds":3600,"nextRefreshAt":"2026-05-08T01:05:00Z","cacheMaxAgeSeconds":60}', '2026-05-08', 1, 'commercial-default', 'openai/gpt-5.2', 'gpt-5.2', 'openai', 'OpenAI', 1, 1, 120, 120),
            (93, 0, 0, 1, '{"snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","generatedAt":"2026-05-08T00:05:00Z","refreshIntervalSeconds":3600,"nextRefreshAt":"2026-05-08T01:05:00Z","cacheMaxAgeSeconds":60}', '2026-05-08', 1, 'commercial-default', 'anthropic/claude-sonnet-4-6', 'claude-sonnet-4-6', 'anthropic', 'Anthropic', 1, 2, 110, 110)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let snapshot = SqliteModelRankingsReadStore::new(pool)
        .load_model_rankings(
            ModelRankingsQuery {
                vendor_code: Some("openai".to_owned()),
                limit: 200,
                ..ModelRankingsQuery::default()
            },
            None,
        )
        .await
        .unwrap();

    assert_eq!(1, snapshot.items.len());
    assert_eq!("gpt-5.2", snapshot.items[0].name);
    assert_eq!(2, snapshot.history.len());
    assert_eq!("2026-05-07", snapshot.history[0].date);
    assert_eq!("2026-05-08", snapshot.history[1].date);
    assert!(snapshot
        .history
        .iter()
        .flat_map(|point| &point.entries)
        .all(|entry| entry.model == "gpt-5.2"));
}

#[tokio::test]
async fn sqlite_model_rankings_read_store_normalizes_query_filters_at_persistence_boundary() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_rank_snapshot_table(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model_rank_snapshot
            (id, tenant_id, organization_id, status, metadata, snapshot_date, snapshot_period, rank_scope, catalog_key, model, vendor_code, vendor_name_snapshot, modality, rank_no, request_count, base_volume)
        VALUES
            (94, 0, 0, 1, '{"snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","generatedAt":"2026-05-08T00:05:00Z","refreshIntervalSeconds":3600,"nextRefreshAt":"2026-05-08T01:05:00Z","cacheMaxAgeSeconds":60}', '2026-05-08', 1, 'commercial-default', 'openai/gpt-5.2', 'gpt-5.2', 'openai', 'OpenAI', 1, 1, 120, 120),
            (95, 0, 0, 1, '{"snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","generatedAt":"2026-05-08T00:05:00Z","refreshIntervalSeconds":3600,"nextRefreshAt":"2026-05-08T01:05:00Z","cacheMaxAgeSeconds":60}', '2026-05-08', 1, 'commercial-default', 'anthropic/claude-sonnet-4-6', 'claude-sonnet-4-6', 'anthropic', 'Anthropic', 1, 2, 110, 110)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let snapshot = SqliteModelRankingsReadStore::new(pool)
        .load_model_rankings(
            ModelRankingsQuery {
                rank_scope: Some(" Commercial-Default ".to_owned()),
                vendor_code: Some(" OpenAI ".to_owned()),
                modality: Some(" TEXT ".to_owned()),
                search_query: Some(" GPT-5.2 ".to_owned()),
                limit: 200,
                offset: 0,
            },
            None,
        )
        .await
        .unwrap();

    assert_eq!("2026-05-08", snapshot.source.snapshot_date);
    assert_eq!(1, snapshot.items.len());
    assert_eq!("gpt-5.2", snapshot.items[0].name);
    assert_eq!(1, snapshot.history.len());
    assert!(snapshot
        .history
        .iter()
        .flat_map(|point| &point.entries)
        .all(|entry| entry.model == "gpt-5.2"));
}

#[tokio::test]
async fn sqlite_model_rankings_read_store_treats_like_wildcards_as_literal_search_text() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_rank_snapshot_table(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model_rank_snapshot
            (id, tenant_id, organization_id, status, snapshot_date, snapshot_period, rank_scope, catalog_key, model, vendor_code, vendor_name_snapshot, modality, rank_no, request_count, base_volume)
        VALUES
            (96, 0, 0, 1, '2026-05-08', 1, 'commercial-default', 'test/model-50-percent', 'model-50%-off', 'literal', 'Literal Vendor', 1, 1, 120, 120),
            (97, 0, 0, 1, '2026-05-08', 1, 'commercial-default', 'test/model_private', 'model_private', 'literal', 'Literal Vendor', 1, 2, 110, 110),
            (98, 0, 0, 1, '2026-05-08', 1, 'commercial-default', 'test/model-plain', 'model-plain', 'literal', 'Literal Vendor', 1, 3, 100, 100)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let store = SqliteModelRankingsReadStore::new(pool);
    let percent_snapshot = store
        .load_model_rankings(
            ModelRankingsQuery {
                search_query: Some("%".to_owned()),
                limit: 200,
                ..ModelRankingsQuery::default()
            },
            None,
        )
        .await
        .unwrap();
    let underscore_snapshot = store
        .load_model_rankings(
            ModelRankingsQuery {
                search_query: Some("_".to_owned()),
                limit: 200,
                ..ModelRankingsQuery::default()
            },
            None,
        )
        .await
        .unwrap();

    assert_eq!(
        vec!["model-50%-off"],
        percent_snapshot
            .items
            .iter()
            .map(|item| item.name.as_str())
            .collect::<Vec<_>>()
    );
    assert!(percent_snapshot
        .history
        .iter()
        .flat_map(|point| &point.entries)
        .all(|entry| entry.model == "model-50%-off"));
    assert_eq!(
        vec!["model_private"],
        underscore_snapshot
            .items
            .iter()
            .map(|item| item.name.as_str())
            .collect::<Vec<_>>()
    );
    assert!(underscore_snapshot
        .history
        .iter()
        .flat_map(|point| &point.entries)
        .all(|entry| entry.model == "model_private"));
}

#[tokio::test]
async fn sqlite_model_rankings_read_store_pages_items_history_and_preserves_total() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_rank_snapshot_table(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model_rank_snapshot
            (id, tenant_id, organization_id, status, snapshot_date, snapshot_period, rank_scope, catalog_key, model, vendor_code, vendor_name_snapshot, modality, rank_no, request_count, base_volume)
        VALUES
            (110, 0, 0, 1, '2026-05-07', 1, 'commercial-default', 'test/model-a', 'model-a', 'test', 'Test Vendor', 1, 1, 90, 90),
            (111, 0, 0, 1, '2026-05-07', 1, 'commercial-default', 'test/model-b', 'model-b', 'test', 'Test Vendor', 1, 2, 80, 80),
            (112, 0, 0, 1, '2026-05-07', 1, 'commercial-default', 'test/model-c', 'model-c', 'test', 'Test Vendor', 1, 3, 70, 70),
            (113, 0, 0, 1, '2026-05-08', 1, 'commercial-default', 'test/model-a', 'model-a', 'test', 'Test Vendor', 1, 1, 120, 120),
            (114, 0, 0, 1, '2026-05-08', 1, 'commercial-default', 'test/model-b', 'model-b', 'test', 'Test Vendor', 1, 2, 110, 110),
            (115, 0, 0, 1, '2026-05-08', 1, 'commercial-default', 'test/model-c', 'model-c', 'test', 'Test Vendor', 1, 3, 100, 100)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let snapshot = SqliteModelRankingsReadStore::new(pool)
        .load_model_rankings(
            ModelRankingsQuery {
                limit: 1,
                offset: 1,
                ..ModelRankingsQuery::default()
            },
            None,
        )
        .await
        .unwrap();

    assert_eq!(3, snapshot.total_items);
    assert_eq!(
        vec!["model-b"],
        snapshot
            .items
            .iter()
            .map(|item| item.name.as_str())
            .collect::<Vec<_>>()
    );
    assert_eq!(2, snapshot.history.len());
    assert!(snapshot
        .history
        .iter()
        .flat_map(|point| &point.entries)
        .all(|entry| entry.model == "model-b"));
}

#[tokio::test]
async fn sqlite_model_rankings_read_store_keeps_history_in_selected_visibility_scope() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_rank_snapshot_table(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model_rank_snapshot
            (id, tenant_id, organization_id, status, snapshot_date, snapshot_period, rank_scope, catalog_key, model, vendor_code, vendor_name_snapshot, modality, rank_no, request_count, base_volume)
        VALUES
            (100, 0, 0, 1, '2026-05-06', 1, 'commercial-default', 'openai/global-old', 'global-old', 'openai', 'OpenAI', 1, 1, 999, 999),
            (101, 100001, 0, 1, '2026-05-07', 1, 'commercial-default', 'openai/tenant-old', 'tenant-old', 'openai', 'OpenAI', 1, 1, 100, 100),
            (102, 100001, 0, 1, '2026-05-08', 1, 'commercial-default', 'openai/tenant-new', 'tenant-new', 'openai', 'OpenAI', 1, 1, 120, 120)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let snapshot = SqliteModelRankingsReadStore::new(pool)
        .load_model_rankings(
            ModelRankingsQuery {
                limit: 200,
                ..ModelRankingsQuery::default()
            },
            Some(ModelRankingsSubject {
                tenant_id: 100001,
                organization_id: 0,
                user_id: 30,
            }),
        )
        .await
        .unwrap();

    assert_eq!("2026-05-08", snapshot.source.snapshot_date);
    assert_eq!(
        vec!["2026-05-07".to_owned(), "2026-05-08".to_owned()],
        snapshot
            .history
            .iter()
            .map(|point| point.date.clone())
            .collect::<Vec<_>>()
    );
    assert!(snapshot
        .history
        .iter()
        .flat_map(|point| &point.entries)
        .all(|entry| entry.model != "global-old"));
}

#[tokio::test]
async fn sqlite_model_rankings_read_store_reports_latest_refresh_status_from_snapshot_metadata() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_rank_snapshot_table(&pool).await;
    create_ops_job_execution_table(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model_rank_snapshot
            (id, tenant_id, organization_id, status, metadata, snapshot_date, snapshot_period, rank_scope, catalog_key, model, vendor_code, vendor_name_snapshot, modality, rank_no, request_count, base_volume, rank_payload)
        VALUES
            (20, 0, 0, 1, '{"snapshotPeriod":"daily","windowStart":"2026-05-06T00:00:00Z","windowEnd":"2026-05-07T00:00:00Z","generatedAt":"2026-05-07T00:05:00Z","refreshIntervalSeconds":1800,"nextRefreshAt":"2026-05-07T00:35:00Z","cacheMaxAgeSeconds":30,"sourceTables":["ai_usage","ai_model","ai_model_rank_snapshot"]}', '2026-05-07', 1, 'commercial-default', 'openai/gpt-5.2', 'gpt-5.2', 'openai', 'OpenAI', 1, 1, 100, 100, '{"sourceRows":4}'),
            (21, 0, 0, 1, '{"snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","generatedAt":"2026-05-08T00:05:00Z","refreshIntervalSeconds":3600,"nextRefreshAt":"2026-05-08T01:05:00Z","cacheMaxAgeSeconds":60,"sourceTables":["ai_usage","ai_model","ai_model_rank_snapshot"]}', '2026-05-08', 1, 'commercial-default', 'openai/gpt-5.2', 'gpt-5.2', 'openai', 'OpenAI', 1, 1, 120, 120, '{"sourceRows":3}'),
            (22, 0, 0, 1, '{"snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","generatedAt":"2026-05-08T00:05:00Z","refreshIntervalSeconds":3600,"nextRefreshAt":"2026-05-08T01:05:00Z","cacheMaxAgeSeconds":60,"sourceTables":["ai_usage","ai_model","ai_model_rank_snapshot"]}', '2026-05-08', 1, 'commercial-default', 'anthropic/claude-sonnet-4-6', 'claude-sonnet-4-6', 'anthropic', 'Anthropic', 1, 2, 90, 90, '{"sourceRows":7}'),
            (23, 0, 0, 0, '{"snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","generatedAt":"2026-05-08T00:10:00Z","refreshIntervalSeconds":3600,"nextRefreshAt":"2026-05-08T01:10:00Z","cacheMaxAgeSeconds":60}', '2026-05-08', 1, 'commercial-default', 'xai/grok-4.3', 'grok-4.3', 'xai', 'xAI', 1, 3, 80, 80, '{"sourceRows":99}')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let status = SqliteModelRankingsReadStore::new(pool)
        .load_model_ranking_refresh_status(
            ModelRankingRefreshStatusQuery {
                rank_scope: Some("commercial-default".to_owned()),
            },
            None,
        )
        .await
        .unwrap();

    assert_eq!("ready", status.status);
    assert_eq!(0, status.tenant_id);
    assert_eq!(0, status.organization_id);
    assert_eq!("commercial-default", status.rank_scope);
    assert_eq!("2026-05-08", status.snapshot_date);
    assert_eq!("daily", status.snapshot_period);
    assert_eq!("2026-05-07T00:00:00Z", status.window_start);
    assert_eq!("2026-05-08T00:00:00Z", status.window_end);
    assert_eq!("2026-05-08T00:05:00Z", status.generated_at);
    assert_eq!(3600, status.refresh_interval_seconds);
    assert_eq!("2026-05-08T01:05:00Z", status.next_refresh_at);
    assert_eq!(60, status.cache_max_age_seconds);
    assert_eq!(2, status.generated_count);
    assert_eq!(10, status.source_count);
    assert_eq!(
        vec![
            "ai_usage".to_owned(),
            "ai_model".to_owned(),
            "ai_model_rank_snapshot".to_owned()
        ],
        status.source_tables
    );
}

#[tokio::test]
async fn sqlite_model_rankings_read_store_embeds_latest_refresh_job_in_refresh_status() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_rank_snapshot_table(&pool).await;
    create_ops_job_execution_table(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model_rank_snapshot
            (id, tenant_id, organization_id, status, metadata, snapshot_date, snapshot_period, rank_scope, catalog_key, model, vendor_code, vendor_name_snapshot, modality, rank_no, request_count, base_volume, rank_payload)
        VALUES
            (30, 100001, 0, 1, '{"snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","generatedAt":"2026-05-08T00:05:00Z","refreshIntervalSeconds":3600,"nextRefreshAt":"2026-05-08T01:05:00Z","cacheMaxAgeSeconds":60,"sourceTables":["ai_usage","ai_model","ai_model_rank_snapshot"]}', '2026-05-08', 1, 'commercial-default', 'openai/gpt-5.2', 'gpt-5.2', 'openai', 'OpenAI', 1, 1, 120, 120, '{"sourceRows":3}')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ops_job_execution
            (id, uuid, tenant_id, organization_id, status, metadata, job_name, job_type, trigger_type,
             started_at, ended_at, duration_ms, execution_status, processed_count, success_count,
             failure_count, failure_reason, payload)
        VALUES
            (30, 'job-succeeded', 100001, 0, 1, '{"module":"model_rankings"}', 'model_ranking_refresh', 20, 1,
             '2026-05-08 00:00:00', '2026-05-08 00:00:02', 2000, 2, 3, 1, 0, NULL,
             '{"rankScope":"commercial-default","snapshotDate":"2026-05-08","snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","nextRefreshAt":"2026-05-08T01:00:00Z","generatedCount":1,"sourceCount":3}'),
            (31, 'job-failed-latest', 100001, 0, 1, '{"module":"model_rankings"}', 'model_ranking_refresh', 20, 1,
             '2026-05-08 01:00:00', '2026-05-08 01:00:01', 1000, 3, 0, 0, 1, 'usage aggregate failed',
             '{"rankScope":"commercial-default","snapshotDate":"2026-05-08","snapshotPeriod":"daily","windowStart":"2026-05-08T00:00:00Z","windowEnd":"2026-05-09T00:00:00Z","nextRefreshAt":"2026-05-08T02:00:00Z","generatedCount":0,"sourceCount":0}'),
            (32, 'job-global-newer', 0, 0, 1, '{"module":"model_rankings"}', 'model_ranking_refresh', 20, 1,
             '2026-05-08 02:00:00', '2026-05-08 02:00:01', 1000, 2, 5, 1, 0, NULL,
             '{"rankScope":"commercial-default","snapshotDate":"2026-05-08","snapshotPeriod":"daily","windowStart":"2026-05-08T00:00:00Z","windowEnd":"2026-05-09T00:00:00Z","nextRefreshAt":"2026-05-08T02:00:00Z","generatedCount":0,"sourceCount":0}')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let status = SqliteModelRankingsReadStore::new(pool)
        .load_model_ranking_refresh_status(
            ModelRankingRefreshStatusQuery::default(),
            Some(ModelRankingsSubject {
                tenant_id: 100001,
                organization_id: 0,
                user_id: 30,
            }),
        )
        .await
        .unwrap();

    assert_eq!("ready", status.status);
    assert_eq!("2026-05-08", status.snapshot_date);
    let latest_job = status
        .latest_job
        .expect("refresh status should include latest matching job");
    assert_eq!("job-failed-latest", latest_job.id);
    assert_eq!("failed", latest_job.status);
    assert_eq!(100001, latest_job.tenant_id);
    assert_eq!(0, latest_job.organization_id);
    assert_eq!("2026-05-08T01:00:00Z", latest_job.started_at);
    assert_eq!(1, latest_job.failure_count);
    assert_eq!(
        Some(
            "model ranking refresh failed because a required dependency is unavailable".to_owned()
        ),
        latest_job.failure_reason
    );
}

#[tokio::test]
async fn sqlite_model_rankings_read_store_does_not_mix_latest_job_from_different_snapshot_scope() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_rank_snapshot_table(&pool).await;
    create_ops_job_execution_table(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model_rank_snapshot
            (id, tenant_id, organization_id, status, metadata, snapshot_date, snapshot_period, rank_scope, catalog_key, model, vendor_code, vendor_name_snapshot, modality, rank_no, request_count, base_volume, rank_payload)
        VALUES
            (45, 100001, 0, 1, '{"snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","generatedAt":"2026-05-08T00:05:00Z","refreshIntervalSeconds":3600,"nextRefreshAt":"2026-05-08T01:05:00Z","cacheMaxAgeSeconds":60,"sourceTables":["ai_usage","ai_model","ai_model_rank_snapshot"]}', '2026-05-08', 1, 'commercial-default', 'openai/gpt-5.2', 'gpt-5.2', 'openai', 'OpenAI', 1, 1, 120, 120, '{"sourceRows":3}')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ops_job_execution
            (id, uuid, tenant_id, organization_id, status, metadata, job_name, job_type, trigger_type,
             started_at, ended_at, duration_ms, execution_status, processed_count, success_count,
             failure_count, failure_reason, payload)
        VALUES
            (45, 'job-global-only', 0, 0, 1, '{"module":"model_rankings"}', 'model_ranking_refresh', 20, 1,
             '2026-05-08 01:00:00', '2026-05-08 01:00:01', 1000, 2, 5, 1, 0, NULL,
             '{"rankScope":"commercial-default","snapshotDate":"2026-05-08","snapshotPeriod":"daily","windowStart":"2026-05-08T00:00:00Z","windowEnd":"2026-05-09T00:00:00Z","nextRefreshAt":"2026-05-08T02:00:00Z","generatedCount":1,"sourceCount":5}')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let status = SqliteModelRankingsReadStore::new(pool)
        .load_model_ranking_refresh_status(
            ModelRankingRefreshStatusQuery::default(),
            Some(ModelRankingsSubject {
                tenant_id: 100001,
                organization_id: 0,
                user_id: 30,
            }),
        )
        .await
        .unwrap();

    assert_eq!("ready", status.status);
    assert_eq!(100001, status.tenant_id);
    assert_eq!(0, status.organization_id);
    assert_eq!("2026-05-08", status.snapshot_date);
    assert_eq!(None, status.latest_job);
}

#[tokio::test]
async fn sqlite_model_rankings_read_store_keeps_refresh_job_history_in_selected_visibility_scope() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_rank_snapshot_table(&pool).await;
    create_ops_job_execution_table(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ops_job_execution
            (id, uuid, tenant_id, organization_id, status, metadata, job_name, job_type, trigger_type,
             started_at, ended_at, duration_ms, execution_status, processed_count, success_count,
             failure_count, failure_reason, payload)
        VALUES
            (50, 'job-tenant-old', 100001, 0, 1, '{"module":"model_rankings"}', 'model_ranking_refresh', 20, 1,
             '2026-05-08 00:00:00', '2026-05-08 00:00:02', 2000, 2, 10, 2, 0, NULL,
             '{"rankScope":"commercial-default","snapshotDate":"2026-05-08","snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","nextRefreshAt":"2026-05-08T01:00:00Z","generatedCount":2,"sourceCount":10}'),
            (51, 'job-tenant-new', 100001, 0, 1, '{"module":"model_rankings"}', 'model_ranking_refresh', 20, 1,
             '2026-05-08 01:00:00', '2026-05-08 01:00:01', 1000, 3, 0, 0, 1, 'usage aggregate failed',
             '{"rankScope":"commercial-default","snapshotDate":"2026-05-08","snapshotPeriod":"daily","windowStart":"2026-05-08T00:00:00Z","windowEnd":"2026-05-09T00:00:00Z","nextRefreshAt":"2026-05-08T02:00:00Z","generatedCount":0,"sourceCount":0}'),
            (52, 'job-global-newest', 0, 0, 1, '{"module":"model_rankings"}', 'model_ranking_refresh', 20, 1,
             '2026-05-08 02:00:00', '2026-05-08 02:00:01', 1000, 2, 5, 1, 0, NULL,
             '{"rankScope":"commercial-default","snapshotDate":"2026-05-08","snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","nextRefreshAt":"2026-05-08T03:00:00Z","generatedCount":1,"sourceCount":5}'),
            (53, 'job-tenant-global-org', 10, 0, 1, '{"module":"model_rankings"}', 'model_ranking_refresh', 20, 1,
             '2026-05-08 03:00:00', '2026-05-08 03:00:01', 1000, 2, 5, 1, 0, NULL,
             '{"rankScope":"commercial-default","snapshotDate":"2026-05-08","snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","nextRefreshAt":"2026-05-08T04:00:00Z","generatedCount":1,"sourceCount":5}')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let page = SqliteModelRankingsReadStore::new(pool)
        .load_model_ranking_refresh_jobs(
            ModelRankingRefreshJobHistoryQuery {
                rank_scope: Some("commercial-default".to_owned()),
                limit: 10,
                offset: 0,
            },
            Some(ModelRankingsSubject {
                tenant_id: 100001,
                organization_id: 0,
                user_id: 30,
            }),
        )
        .await
        .unwrap();

    assert_eq!(
        vec!["job-tenant-new".to_owned(), "job-tenant-old".to_owned()],
        page.items
            .iter()
            .map(|item| item.id.clone())
            .collect::<Vec<_>>()
    );
    assert!(page
        .items
        .iter()
        .all(|item| item.tenant_id == 100001 && item.organization_id == 0));
    assert_eq!(
        page.items[0].failure_reason.as_deref(),
        Some("model ranking refresh failed because a required dependency is unavailable")
    );
    assert!(!page.items[0]
        .failure_reason
        .as_deref()
        .unwrap_or_default()
        .contains("usage aggregate failed"));
}

#[tokio::test]
async fn sqlite_model_rankings_read_store_does_not_mix_job_history_from_different_snapshot_scope() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_rank_snapshot_table(&pool).await;
    create_ops_job_execution_table(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model_rank_snapshot
            (id, tenant_id, organization_id, status, metadata, snapshot_date, snapshot_period, rank_scope, catalog_key, model, vendor_code, vendor_name_snapshot, modality, rank_no, request_count, base_volume, rank_payload)
        VALUES
            (70, 100001, 0, 1, '{"snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","generatedAt":"2026-05-08T00:05:00Z","refreshIntervalSeconds":3600,"nextRefreshAt":"2026-05-08T01:05:00Z","cacheMaxAgeSeconds":60,"sourceTables":["ai_usage","ai_model","ai_model_rank_snapshot"]}', '2026-05-08', 1, 'commercial-default', 'openai/gpt-5.2', 'gpt-5.2', 'openai', 'OpenAI', 1, 1, 120, 120, '{"sourceRows":3}')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ops_job_execution
            (id, uuid, tenant_id, organization_id, status, metadata, job_name, job_type, trigger_type,
             started_at, ended_at, duration_ms, execution_status, processed_count, success_count,
             failure_count, failure_reason, payload)
        VALUES
            (70, 'job-global-only', 0, 0, 1, '{"module":"model_rankings"}', 'model_ranking_refresh', 20, 1,
             '2026-05-08 01:00:00', '2026-05-08 01:00:01', 1000, 2, 5, 1, 0, NULL,
             '{"rankScope":"commercial-default","snapshotDate":"2026-05-08","snapshotPeriod":"daily","windowStart":"2026-05-08T00:00:00Z","windowEnd":"2026-05-09T00:00:00Z","nextRefreshAt":"2026-05-08T02:00:00Z","generatedCount":1,"sourceCount":5}')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let page = SqliteModelRankingsReadStore::new(pool)
        .load_model_ranking_refresh_jobs(
            ModelRankingRefreshJobHistoryQuery {
                rank_scope: Some("commercial-default".to_owned()),
                limit: 10,
                offset: 0,
            },
            Some(ModelRankingsSubject {
                tenant_id: 100001,
                organization_id: 0,
                user_id: 30,
            }),
        )
        .await
        .unwrap();

    assert!(page.items.is_empty());
}

#[tokio::test]
async fn sqlite_model_rankings_read_store_reports_latest_job_when_no_snapshot_exists() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_rank_snapshot_table(&pool).await;
    create_ops_job_execution_table(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ops_job_execution
            (id, uuid, tenant_id, organization_id, status, metadata, job_name, job_type, trigger_type,
             started_at, ended_at, duration_ms, execution_status, processed_count, success_count,
             failure_count, failure_reason, payload)
        VALUES
            (40, 'job-empty-first-run', 100001, 0, 1, '{"module":"model_rankings"}', 'model_ranking_refresh', 20, 1,
             '2026-05-08 01:00:00', '2026-05-08 01:00:01', 1000, 4, 0, 0, 0, NULL,
             '{"rankScope":"commercial-default","snapshotDate":"2026-05-08","snapshotPeriod":"daily","windowStart":"2026-05-08T00:00:00Z","windowEnd":"2026-05-09T00:00:00Z","nextRefreshAt":"2026-05-08T02:00:00Z","generatedCount":0,"sourceCount":0}')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let status = SqliteModelRankingsReadStore::new(pool)
        .load_model_ranking_refresh_status(
            ModelRankingRefreshStatusQuery::default(),
            Some(ModelRankingsSubject {
                tenant_id: 100001,
                organization_id: 0,
                user_id: 30,
            }),
        )
        .await
        .unwrap();

    assert_eq!("empty", status.status);
    assert_eq!(0, status.generated_count);
    assert_eq!(0, status.source_count);
    let latest_job = status
        .latest_job
        .expect("empty first-run status should expose latest refresh job");
    assert_eq!("job-empty-first-run", latest_job.id);
    assert_eq!("empty", latest_job.status);
    assert_eq!("2026-05-08", latest_job.snapshot_date);
    assert_eq!("2026-05-08T02:00:00Z", latest_job.next_refresh_at);
}

#[tokio::test]
async fn sqlite_model_rankings_read_store_uses_latest_job_scope_when_no_snapshot_exists() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_rank_snapshot_table(&pool).await;
    create_ops_job_execution_table(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ops_job_execution
            (id, uuid, tenant_id, organization_id, status, metadata, job_name, job_type, trigger_type,
             started_at, ended_at, duration_ms, execution_status, processed_count, success_count,
             failure_count, failure_reason, payload)
        VALUES
            (60, 'job-global-only', 0, 0, 1, '{"module":"model_rankings"}', 'model_ranking_refresh', 20, 1,
             '2026-05-08 01:00:00', '2026-05-08 01:00:01', 1000, 4, 0, 0, 0, NULL,
             '{"rankScope":"commercial-default","snapshotDate":"2026-05-08","snapshotPeriod":"daily","windowStart":"2026-05-08T00:00:00Z","windowEnd":"2026-05-09T00:00:00Z","nextRefreshAt":"2026-05-08T02:00:00Z","generatedCount":0,"sourceCount":0}')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let status = SqliteModelRankingsReadStore::new(pool)
        .load_model_ranking_refresh_status(
            ModelRankingRefreshStatusQuery::default(),
            Some(ModelRankingsSubject {
                tenant_id: 100001,
                organization_id: 0,
                user_id: 30,
            }),
        )
        .await
        .unwrap();

    assert_eq!("empty", status.status);
    assert_eq!(0, status.tenant_id);
    assert_eq!(0, status.organization_id);
    assert_eq!("2026-05-08", status.snapshot_date);
    let latest_job = status.latest_job.expect("global fallback job is visible");
    assert_eq!("job-global-only", latest_job.id);
    assert_eq!(0, latest_job.tenant_id);
    assert_eq!(0, latest_job.organization_id);
}

#[tokio::test]
async fn sqlite_model_rankings_read_store_reads_recent_refresh_job_history_from_ops_execution_log()
{
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_rank_snapshot_table(&pool).await;
    create_ops_job_execution_table(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ops_job_execution
            (id, uuid, tenant_id, organization_id, status, metadata, job_name, job_type, trigger_type,
             started_at, ended_at, duration_ms, execution_status, processed_count, success_count,
             failure_count, failure_reason, payload)
        VALUES
            (1, 'job-old', 100001, 0, 1, '{"module":"model_rankings"}', 'model_ranking_refresh', 20, 1,
             '2026-05-08 00:00:00', '2026-05-08 00:00:02', 2000, 2, 10, 2, 0, NULL,
             '{"rankScope":"commercial-default","snapshotDate":"2026-05-08","snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","nextRefreshAt":"2026-05-08T01:00:00Z","generatedCount":2,"sourceCount":10}'),
            (2, 'job-failed', 100001, 0, 1, '{"module":"model_rankings"}', 'model_ranking_refresh', 20, 1,
             '2026-05-08 01:00:00', '2026-05-08 01:00:01', 1000, 3, 0, 0, 1, 'usage aggregate failed',
             '{"rankScope":"commercial-default","snapshotDate":"2026-05-08","snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","nextRefreshAt":"2026-05-08T02:00:00Z","generatedCount":0,"sourceCount":0}'),
            (3, 'job-other-scope', 100001, 0, 1, '{"module":"model_rankings"}', 'model_ranking_refresh', 20, 1,
             '2026-05-08 02:00:00', '2026-05-08 02:00:01', 1000, 2, 5, 1, 0, NULL,
             '{"rankScope":"quality-default","snapshotDate":"2026-05-08","snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","nextRefreshAt":"2026-05-08T03:00:00Z","generatedCount":1,"sourceCount":5}'),
            (4, 'job-global', 0, 0, 1, '{"module":"model_rankings"}', 'model_ranking_refresh', 20, 1,
             '2026-05-08 03:00:00', '2026-05-08 03:00:01', 1000, 4, 0, 0, 0, NULL,
             '{"rankScope":"commercial-default","snapshotDate":"2026-05-08","snapshotPeriod":"daily","windowStart":"2026-05-07T00:00:00Z","windowEnd":"2026-05-08T00:00:00Z","nextRefreshAt":"2026-05-08T04:00:00Z","generatedCount":0,"sourceCount":0}')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let page = SqliteModelRankingsReadStore::new(pool)
        .load_model_ranking_refresh_jobs(
            ModelRankingRefreshJobHistoryQuery {
                rank_scope: Some("commercial-default".to_owned()),
                limit: 1,
                offset: 1,
            },
            Some(ModelRankingsSubject {
                tenant_id: 100001,
                organization_id: 0,
                user_id: 30,
            }),
        )
        .await
        .unwrap();

    assert_eq!(2, page.total_items);
    assert_eq!(1, page.items.len());
    assert_eq!("job-old", page.items[0].id);
    assert_eq!("succeeded", page.items[0].status);
    assert_eq!(100001, page.items[0].tenant_id);
    assert_eq!(0, page.items[0].organization_id);
    assert_eq!("2026-05-08T00:00:00Z", page.items[0].started_at);
    assert_eq!("2026-05-08T01:00:00Z", page.items[0].next_refresh_at);
    assert_eq!(0, page.items[0].failure_count);
    assert_eq!(None, page.items[0].failure_reason);
}

async fn create_rank_snapshot_table(pool: &sqlx::SqlitePool) {
    create_ai_model_table(pool).await;
    sqlx::query(
        r#"
        CREATE TABLE ai_model_rank_snapshot (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            metadata TEXT,
            snapshot_date TEXT,
            snapshot_period INTEGER,
            rank_scope TEXT,
            catalog_key TEXT,
            model TEXT,
            vendor_code TEXT,
            region_code TEXT,
            vendor_name_snapshot TEXT,
            modality INTEGER,
            rank_no INTEGER,
            previous_rank_no INTEGER,
            base_volume INTEGER,
            cost_indicator INTEGER,
            context_size_text TEXT,
            is_new INTEGER,
            color_token TEXT,
            win_rate REAL,
            pricing_text TEXT,
            license_type INTEGER,
            strengths TEXT,
            request_count INTEGER,
            token_count INTEGER,
            cost_amount REAL,
            currency TEXT,
            latency_p50_ms INTEGER,
            trend_score REAL,
            rank_payload TEXT
        )
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        CREATE TRIGGER ai_model_rank_snapshot_seed_model_catalog
        AFTER INSERT ON ai_model_rank_snapshot
        WHEN COALESCE(NULLIF(NEW.catalog_key, ''), NULLIF(NEW.vendor_code, '') || '/' || NULLIF(NEW.model, '')) IS NOT NULL
        BEGIN
            UPDATE ai_model_rank_snapshot
            SET catalog_key = COALESCE(NULLIF(NEW.catalog_key, ''), NULLIF(NEW.vendor_code, '') || '/' || NULLIF(NEW.model, ''))
            WHERE id = NEW.id;
            INSERT OR IGNORE INTO ai_model
                (tenant_id, organization_id, status, catalog_key, model, release_stage, shelf_state, routing_state)
            VALUES
                (
                    COALESCE(NEW.tenant_id, 0),
                    COALESCE(NEW.organization_id, 0),
                    1,
                    COALESCE(NULLIF(NEW.catalog_key, ''), NULLIF(NEW.vendor_code, '') || '/' || NULLIF(NEW.model, '')),
                    NEW.model,
                    1,
                    1,
                    1
                );
        END
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn create_ai_model_table(pool: &sqlx::SqlitePool) {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS ai_model (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            catalog_key TEXT NOT NULL,
            model TEXT,
            release_stage INTEGER NOT NULL DEFAULT 1,
            shelf_state INTEGER NOT NULL DEFAULT 1,
            routing_state INTEGER NOT NULL DEFAULT 1,
            deleted_at TEXT,
            UNIQUE (tenant_id, organization_id, catalog_key)
        )
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn create_ops_job_execution_table(pool: &sqlx::SqlitePool) {
    sqlx::query(
        r#"
        CREATE TABLE ops_job_execution (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            metadata TEXT NOT NULL DEFAULT '{}',
            job_name TEXT,
            job_type INTEGER,
            trigger_type INTEGER,
            started_at TEXT,
            ended_at TEXT,
            duration_ms INTEGER,
            execution_status INTEGER,
            processed_count INTEGER,
            success_count INTEGER,
            failure_count INTEGER,
            failure_reason TEXT,
            payload TEXT
        )
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}
