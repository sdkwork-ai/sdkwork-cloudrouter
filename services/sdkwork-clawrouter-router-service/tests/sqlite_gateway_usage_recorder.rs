use sdkwork_clawrouter_router_service::domain::BillingMeter;
use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteGatewayUsageRecorder;
use sdkwork_clawrouter_router_service::ports::{
    GatewayRequestTraceCommand, GatewayTraceAttribution, GatewayUsageQuantity,
    GatewayUsageRecordCommand, GatewayUsageRecorder,
};
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::Row;

#[tokio::test]
async fn sqlite_gateway_usage_recorder_upserts_trace_and_usage_fact_without_duplicates() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_usage_tables(&pool).await;
    sqlx::query(
        r#"
        INSERT INTO ops_gateway_instance (
            id, uuid, tenant_id, organization_id, status, instance_code, node_name,
            region, last_heartbeat_at
        ) VALUES (
            9001, 'gateway-9001', 100001, 0, 1, 'gateway-a', 'node-a',
            'cn-east-1', '2026-07-12T00:00:00Z'
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    let recorder = SqliteGatewayUsageRecorder::new_with_attribution(
        pool.clone(),
        GatewayTraceAttribution {
            gateway_instance_id: Some(9001),
            gateway_instance_code_snapshot: Some("gateway-a".to_owned()),
            gateway_region_code_snapshot: Some("cn-east-1".to_owned()),
            gateway_node_name_snapshot: Some("node-a".to_owned()),
        },
    );
    let command = usage_command("req-chat-usage-sqlite", 200);

    recorder
        .record_gateway_usage(command.clone())
        .await
        .unwrap();
    recorder.record_gateway_usage(command).await.unwrap();

    let trace = sqlx::query(
        "SELECT request_id, trace_id, tenant_id, organization_id, user_id, api_key_id, upstream_account_group_snapshot, requested_model, requested_model_catalog_key, provider_model, provider_native_model, gateway_instance_id, gateway_instance_code_snapshot, gateway_region_code_snapshot, gateway_node_name_snapshot, region_code, http_status, streaming, prompt_tokens, completion_tokens, total_tokens, metadata, user_agent_hash FROM ai_request_trace",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        "req-chat-usage-sqlite",
        trace.get::<String, _>("request_id")
    );
    assert_eq!(
        "trace-chat-usage-sqlite",
        trace.get::<String, _>("trace_id")
    );
    assert_eq!(100001_i64, trace.get::<i64, _>("tenant_id"));
    assert_eq!(0_i64, trace.get::<i64, _>("organization_id"));
    assert_eq!(30_i64, trace.get::<i64, _>("user_id"));
    assert_eq!(101_i64, trace.get::<i64, _>("api_key_id"));
    assert_eq!(
        "standard-group",
        trace.get::<String, _>("upstream_account_group_snapshot")
    );
    assert_eq!("gpt-4o-mini", trace.get::<String, _>("requested_model"));
    assert_eq!(
        "openai/gpt-4o-mini",
        trace.get::<String, _>("requested_model_catalog_key")
    );
    assert_eq!("gpt-4o-mini", trace.get::<String, _>("provider_model"));
    assert_eq!(
        "gpt-4o-mini",
        trace.get::<String, _>("provider_native_model")
    );
    assert_eq!(9001_i64, trace.get::<i64, _>("gateway_instance_id"));
    assert_eq!(
        "gateway-a",
        trace.get::<String, _>("gateway_instance_code_snapshot")
    );
    assert_eq!(
        "cn-east-1",
        trace.get::<String, _>("gateway_region_code_snapshot")
    );
    assert_eq!(
        "node-a",
        trace.get::<String, _>("gateway_node_name_snapshot")
    );
    assert_eq!("global", trace.get::<String, _>("region_code"));
    assert_eq!(200_i64, trace.get::<i64, _>("http_status"));
    assert_eq!(0_i64, trace.get::<i64, _>("streaming"));
    assert_eq!(11_i64, trace.get::<i64, _>("prompt_tokens"));
    assert_eq!(7_i64, trace.get::<i64, _>("completion_tokens"));
    assert_eq!(18_i64, trace.get::<i64, _>("total_tokens"));
    let trace_metadata: serde_json::Value =
        serde_json::from_str(&trace.get::<String, _>("metadata")).unwrap();
    assert_eq!(serde_json::json!({}), trace_metadata);
    let user_agent_hash = trace.get::<String, _>("user_agent_hash");
    assert_eq!(64, user_agent_hash.len());
    assert!(user_agent_hash.chars().all(|ch| ch.is_ascii_hexdigit()));

    let usage = sqlx::query(
        "SELECT request_id, api_key_id, catalog_key, requested_model_catalog_key, model, provider_native_model, region_code, account_id, usage_type, billing_meter_code, billable_quantity, prompt_tokens, completion_tokens, cached_tokens, total_tokens, base_input_unit_price, base_output_unit_price, cache_read_unit_price, rate_multiplier, reference_multiplier, official_reference_amount, upstream_cost_amount, customer_charge_amount, currency, pricing_plan_code, pricing_snapshot, occurred_at, settlement_status, idempotency_key FROM ai_usage",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        "req-chat-usage-sqlite",
        usage.get::<String, _>("request_id")
    );
    assert_eq!(101_i64, usage.get::<i64, _>("api_key_id"));
    assert_eq!("openai/gpt-4o-mini", usage.get::<String, _>("catalog_key"));
    assert_eq!(
        "openai/gpt-4o-mini",
        usage.get::<String, _>("requested_model_catalog_key")
    );
    assert_eq!("gpt-4o-mini", usage.get::<String, _>("model"));
    assert_eq!(
        "gpt-4o-mini",
        usage.get::<String, _>("provider_native_model")
    );
    assert_eq!("global", usage.get::<String, _>("region_code"));
    assert_eq!(3001_i64, usage.get::<i64, _>("account_id"));
    assert_eq!(1_i64, usage.get::<i64, _>("usage_type"));
    assert_eq!(
        "llm_input_token",
        usage.get::<String, _>("billing_meter_code")
    );
    assert_eq!("18", usage.get::<String, _>("billable_quantity"));
    assert_eq!(11_i64, usage.get::<i64, _>("prompt_tokens"));
    assert_eq!(7_i64, usage.get::<i64, _>("completion_tokens"));
    assert_eq!(2_i64, usage.get::<i64, _>("cached_tokens"));
    assert_eq!(18_i64, usage.get::<i64, _>("total_tokens"));
    assert_eq!("0.198000", usage.get::<String, _>("base_input_unit_price"));
    assert_eq!("0.792000", usage.get::<String, _>("base_output_unit_price"));
    assert_eq!("0.099000", usage.get::<String, _>("cache_read_unit_price"));
    assert_eq!("1.000000", usage.get::<String, _>("rate_multiplier"));
    assert_eq!("1.320000", usage.get::<String, _>("reference_multiplier"));
    assert_eq!(
        "5.850000000000",
        usage.get::<String, _>("official_reference_amount")
    );
    assert_eq!("4.290000", usage.get::<String, _>("upstream_cost_amount"));
    assert_eq!("7.722000", usage.get::<String, _>("customer_charge_amount"));
    assert_eq!("USD", usage.get::<String, _>("currency"));
    assert_eq!("standard", usage.get::<String, _>("pricing_plan_code"));
    let idempotency_key = usage.get::<String, _>("idempotency_key");
    assert!(idempotency_key.starts_with("usage:v1:"));
    assert_eq!(73, idempotency_key.len());
    assert!(idempotency_key[9..]
        .chars()
        .all(|character| character.is_ascii_hexdigit()));
    let pricing_snapshot: serde_json::Value =
        serde_json::from_str(&usage.get::<String, _>("pricing_snapshot")).unwrap();
    assert_eq!("openai", pricing_snapshot["vendor"]["code"]);
    assert_eq!(
        "openai/gpt-4o-mini",
        pricing_snapshot["model"]["catalogKey"]
    );
    assert_eq!("openrouter", pricing_snapshot["provider"]["code"]);
    assert_eq!("standard", pricing_snapshot["pricingPlan"]["code"]);
    assert_eq!("1.000000", pricing_snapshot["multipliers"]["rate"]);
    assert_eq!("1.320000", pricing_snapshot["multipliers"]["reference"]);
    assert_eq!(
        "0.198000",
        pricing_snapshot["meters"]["input"]["customerUnitPrice"]
    );
    assert_eq!(
        "0.792000",
        pricing_snapshot["meters"]["output"]["customerUnitPrice"]
    );
    assert_eq!(
        "0.099000",
        pricing_snapshot["meters"]["cacheRead"]["customerUnitPrice"]
    );
    assert_eq!(0_i64, usage.get::<i64, _>("settlement_status"));
    let occurred_at = usage.get::<String, _>("occurred_at");
    assert!(
        occurred_at.contains('T') && occurred_at.ends_with('Z'),
        "SQLite usage facts must store occurred_at as RFC3339 UTC text, got {occurred_at}"
    );
    assert!(
        !occurred_at.contains(' '),
        "SQLite usage facts must not store occurred_at as SQLite CURRENT_TIMESTAMP text"
    );

    let trace_count = sqlx::query("SELECT COUNT(*) AS count FROM ai_request_trace")
        .fetch_one(&pool)
        .await
        .unwrap()
        .get::<i64, _>("count");
    let usage_count = sqlx::query("SELECT COUNT(*) AS count FROM ai_usage")
        .fetch_one(&pool)
        .await
        .unwrap()
        .get::<i64, _>("count");
    assert_eq!(1, trace_count);
    assert_eq!(1, usage_count);
}

#[tokio::test]
async fn sqlite_gateway_usage_recorder_rolls_back_trace_when_usage_insert_fails() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_usage_tables(&pool).await;
    sqlx::query(
        r#"
        CREATE TRIGGER reject_gateway_usage
        BEFORE INSERT ON ai_usage
        BEGIN
            SELECT RAISE(ABORT, 'forced usage insert failure');
        END
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let recorder = SqliteGatewayUsageRecorder::new(pool.clone());
    let result = recorder
        .record_gateway_usage(usage_command("req-usage-rollback", 200))
        .await;
    assert!(result.is_err());

    for table in ["ai_request_trace", "ai_usage"] {
        let count = sqlx::query(&format!("SELECT COUNT(*) AS count FROM {table}"))
            .fetch_one(&pool)
            .await
            .unwrap()
            .get::<i64, _>("count");
        assert_eq!(
            0, count,
            "gateway usage transaction must roll back every write when {table} insert fails"
        );
    }
}

#[tokio::test]
async fn sqlite_gateway_usage_recorder_records_failed_trace_without_usage_fact() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_usage_tables(&pool).await;
    let recorder = SqliteGatewayUsageRecorder::new(pool.clone());
    let command = failed_trace_command("req-chat-upstream-503");

    recorder.record_gateway_trace(command).await.unwrap();

    let trace = sqlx::query(
        r#"
        SELECT request_id, trace_id, tenant_id, organization_id, user_id, api_key_id,
               upstream_account_group_snapshot, requested_model, requested_model_catalog_key,
               provider_model, provider_native_model, http_status,
               provider_error_code, error_type, error_message_masked, latency_ms,
               streaming, prompt_tokens, completion_tokens, total_tokens
        FROM ai_request_trace
        WHERE request_id = 'req-chat-upstream-503'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        "req-chat-upstream-503",
        trace.get::<String, _>("request_id")
    );
    assert_eq!(
        "trace-chat-usage-sqlite",
        trace.get::<String, _>("trace_id")
    );
    assert_eq!(100001_i64, trace.get::<i64, _>("tenant_id"));
    assert_eq!(0_i64, trace.get::<i64, _>("organization_id"));
    assert_eq!(30_i64, trace.get::<i64, _>("user_id"));
    assert_eq!(101_i64, trace.get::<i64, _>("api_key_id"));
    assert_eq!(
        "standard-group",
        trace.get::<String, _>("upstream_account_group_snapshot")
    );
    assert_eq!("gpt-4o-mini", trace.get::<String, _>("requested_model"));
    assert_eq!(
        "openai/gpt-4o-mini",
        trace.get::<String, _>("requested_model_catalog_key")
    );
    assert_eq!("gpt-4o-mini", trace.get::<String, _>("provider_model"));
    assert_eq!(
        "gpt-4o-mini",
        trace.get::<String, _>("provider_native_model")
    );
    assert_eq!(503_i64, trace.get::<i64, _>("http_status"));
    assert_eq!(
        "upstream_http_503",
        trace.get::<String, _>("provider_error_code")
    );
    assert_eq!("provider_error", trace.get::<String, _>("error_type"));
    assert_eq!(
        "provider relay returned HTTP 503",
        trace.get::<String, _>("error_message_masked")
    );
    assert_eq!(42_i64, trace.get::<i64, _>("latency_ms"));
    assert_eq!(0_i64, trace.get::<i64, _>("streaming"));
    assert_eq!(0_i64, trace.get::<i64, _>("prompt_tokens"));
    assert_eq!(0_i64, trace.get::<i64, _>("completion_tokens"));
    assert_eq!(0_i64, trace.get::<i64, _>("total_tokens"));

    let usage_count = sqlx::query("SELECT COUNT(*) AS count FROM ai_usage")
        .fetch_one(&pool)
        .await
        .unwrap()
        .get::<i64, _>("count");
    assert_eq!(
        0, usage_count,
        "failed gateway requests must not create billable usage facts"
    );
}

#[tokio::test]
async fn sqlite_gateway_usage_recorder_keeps_the_first_non_null_gateway_snapshot() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_usage_tables(&pool).await;
    let first = SqliteGatewayUsageRecorder::new_with_attribution(
        pool.clone(),
        GatewayTraceAttribution {
            gateway_instance_id: Some(9001),
            gateway_instance_code_snapshot: Some("gateway-first".to_owned()),
            gateway_region_code_snapshot: Some("cn-east-1".to_owned()),
            gateway_node_name_snapshot: Some("node-first".to_owned()),
        },
    );
    let retry = SqliteGatewayUsageRecorder::new_with_attribution(
        pool.clone(),
        GatewayTraceAttribution {
            gateway_instance_id: Some(9002),
            gateway_instance_code_snapshot: Some("gateway-retry".to_owned()),
            gateway_region_code_snapshot: Some("us-west-1".to_owned()),
            gateway_node_name_snapshot: Some("node-retry".to_owned()),
        },
    );
    let command = failed_trace_command("req-immutable-gateway-snapshot");

    first.record_gateway_trace(command.clone()).await.unwrap();
    retry.record_gateway_trace(command).await.unwrap();

    let row = sqlx::query(
        r#"
        SELECT gateway_instance_id, gateway_instance_code_snapshot,
               gateway_region_code_snapshot, gateway_node_name_snapshot,
               error_type, metadata
        FROM ai_request_trace
        WHERE request_id = 'req-immutable-gateway-snapshot'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(9001_i64, row.get::<i64, _>("gateway_instance_id"));
    assert_eq!(
        "gateway-first",
        row.get::<String, _>("gateway_instance_code_snapshot")
    );
    assert_eq!(
        "cn-east-1",
        row.get::<String, _>("gateway_region_code_snapshot")
    );
    assert_eq!(
        "node-first",
        row.get::<String, _>("gateway_node_name_snapshot")
    );
    assert_eq!("provider_error", row.get::<String, _>("error_type"));
    assert_eq!("{}", row.get::<String, _>("metadata"));
}

#[tokio::test]
async fn sqlite_gateway_usage_recorder_uses_command_modality_and_meter() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_usage_tables(&pool).await;
    let recorder = SqliteGatewayUsageRecorder::new(pool.clone());
    let mut command = usage_command("req-embedding-usage-sqlite", 200);
    command.catalog_key = "openai/text-embedding-3-small".to_owned();
    command.requested_model = "text-embedding-3-small".to_owned();
    command.requested_model_catalog_key = "openai/text-embedding-3-small".to_owned();
    command.provider_model = "text-embedding-3-small".to_owned();
    command.provider_native_model = "text-embedding-3-small".to_owned();
    command.request_path = "/v1/embeddings".to_owned();
    command.modality = 6;
    command.billing_meter_code = "embedding_input_token".to_owned();
    command.prompt_tokens = 13;
    command.completion_tokens = 0;
    command.cached_tokens = 0;
    command.total_tokens = 13;
    command.apply_quantity(GatewayUsageQuantity::tokens(13).unwrap());
    command.base_input_unit_price = "0.026400".to_owned();
    command.base_output_unit_price = "0.000000".to_owned();
    command.customer_charge_amount = "0.343200".to_owned();
    command.upstream_cost_amount = "0.130000".to_owned();

    recorder.record_gateway_usage(command).await.unwrap();

    let usage = sqlx::query(
        r#"
        SELECT request_id, modality, usage_type, billing_meter_code, billable_quantity,
               prompt_tokens, completion_tokens, total_tokens, customer_charge_amount,
               upstream_cost_amount
        FROM ai_usage
        WHERE request_id = 'req-embedding-usage-sqlite'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(6_i64, usage.get::<i64, _>("modality"));
    assert_eq!(1_i64, usage.get::<i64, _>("usage_type"));
    assert_eq!(
        "embedding_input_token",
        usage.get::<String, _>("billing_meter_code")
    );
    assert_eq!("13", usage.get::<String, _>("billable_quantity"));
    assert_eq!(13_i64, usage.get::<i64, _>("prompt_tokens"));
    assert_eq!(0_i64, usage.get::<i64, _>("completion_tokens"));
    assert_eq!(13_i64, usage.get::<i64, _>("total_tokens"));
    assert_eq!("0.343200", usage.get::<String, _>("customer_charge_amount"));
    assert_eq!("0.130000", usage.get::<String, _>("upstream_cost_amount"));
}

#[tokio::test]
async fn sqlite_gateway_usage_recorder_preserves_successfully_settled_usage_fact_on_duplicate_request_id(
) {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_usage_tables(&pool).await;
    let recorder = SqliteGatewayUsageRecorder::new(pool.clone());

    let mut command = usage_command("req-chat-usage-settled", 200);
    recorder
        .record_gateway_usage(command.clone())
        .await
        .unwrap();
    sqlx::query(
        r#"
        UPDATE ai_usage
        SET settlement_status = 2,
            customer_charge_amount = '7.722000',
            upstream_cost_amount = '4.290000',
            total_tokens = 18
        WHERE request_id = 'req-chat-usage-settled'
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    command.prompt_tokens = 99;
    command.completion_tokens = 88;
    command.cached_tokens = 0;
    command.total_tokens = 187;
    command.customer_charge_amount = "999.000000".to_owned();
    command.upstream_cost_amount = "555.000000".to_owned();
    recorder.record_gateway_usage(command).await.unwrap();

    let usage = sqlx::query(
        r#"
        SELECT total_tokens, customer_charge_amount, upstream_cost_amount, settlement_status
        FROM ai_usage
        WHERE request_id = 'req-chat-usage-settled'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(18_i64, usage.get::<i64, _>("total_tokens"));
    assert_eq!("7.722000", usage.get::<String, _>("customer_charge_amount"));
    assert_eq!("4.290000", usage.get::<String, _>("upstream_cost_amount"));
    assert_eq!(
        2_i64,
        usage.get::<i64, _>("settlement_status"),
        "a duplicate gateway request id must not reopen a successfully settled usage fact"
    );

    let trace = sqlx::query(
        r#"
        SELECT total_tokens, http_status
        FROM ai_request_trace
        WHERE request_id = 'req-chat-usage-settled'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        18_i64,
        trace.get::<i64, _>("total_tokens"),
        "a duplicate gateway request id must not rewrite trace tokens after usage settlement succeeds"
    );
    assert_eq!(200_i64, trace.get::<i64, _>("http_status"));
}

#[tokio::test]
async fn sqlite_gateway_usage_schema_rejects_null_settlement_status() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_usage_tables(&pool).await;
    let recorder = SqliteGatewayUsageRecorder::new(pool.clone());

    let command = usage_command("req-chat-usage-unknown-settlement", 200);
    recorder.record_gateway_usage(command).await.unwrap();
    let update_result = sqlx::query(
        r#"
        UPDATE ai_usage
        SET settlement_status = NULL
        WHERE request_id = 'req-chat-usage-unknown-settlement'
        "#,
    )
    .execute(&pool)
    .await;
    assert!(
        update_result.is_err(),
        "settlement_status must never enter an unknown NULL state"
    );

    let usage = sqlx::query(
        r#"
        SELECT settlement_status
        FROM ai_usage
        WHERE request_id = 'req-chat-usage-unknown-settlement'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(0_i64, usage.get::<i64, _>("settlement_status"));
}

#[tokio::test]
async fn sqlite_gateway_usage_recorder_preserves_failed_settlement_usage_fact_on_duplicate_request_id(
) {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_usage_tables(&pool).await;
    let recorder = SqliteGatewayUsageRecorder::new(pool.clone());

    let mut command = usage_command("req-chat-usage-settlement-failed", 200);
    recorder
        .record_gateway_usage(command.clone())
        .await
        .unwrap();
    sqlx::query(
        r#"
        UPDATE ai_usage
        SET settlement_status = 3,
            customer_charge_amount = '7.722000',
            upstream_cost_amount = '4.290000',
            total_tokens = 18
        WHERE request_id = 'req-chat-usage-settlement-failed'
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    command.prompt_tokens = 999;
    command.completion_tokens = 888;
    command.cached_tokens = 0;
    command.total_tokens = 1887;
    command.customer_charge_amount = "1999.000000".to_owned();
    command.upstream_cost_amount = "1555.000000".to_owned();
    recorder.record_gateway_usage(command).await.unwrap();

    let usage = sqlx::query(
        r#"
        SELECT total_tokens, customer_charge_amount, upstream_cost_amount, settlement_status
        FROM ai_usage
        WHERE request_id = 'req-chat-usage-settlement-failed'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(18_i64, usage.get::<i64, _>("total_tokens"));
    assert_eq!("7.722000", usage.get::<String, _>("customer_charge_amount"));
    assert_eq!("4.290000", usage.get::<String, _>("upstream_cost_amount"));
    assert_eq!(
        3_i64,
        usage.get::<i64, _>("settlement_status"),
        "a duplicate gateway request id must not rewrite a failed usage settlement before retry"
    );

    let trace = sqlx::query(
        r#"
        SELECT total_tokens, http_status
        FROM ai_request_trace
        WHERE request_id = 'req-chat-usage-settlement-failed'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        18_i64,
        trace.get::<i64, _>("total_tokens"),
        "a duplicate gateway request id must not rewrite trace tokens after usage settlement fails"
    );
    assert_eq!(200_i64, trace.get::<i64, _>("http_status"));
}

#[tokio::test]
async fn sqlite_gateway_usage_recorder_records_request_and_video_duration_as_independent_usage_facts(
) {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_usage_tables(&pool).await;
    let recorder = SqliteGatewayUsageRecorder::new(pool.clone());

    let mut request_charge = usage_command("req-video-generation-billing", 200);
    request_charge.trace_id = Some("trace-video-generation-billing".to_owned());
    request_charge.catalog_key = "openai/sora-video".to_owned();
    request_charge.requested_model = "sora-video".to_owned();
    request_charge.requested_model_catalog_key = "openai/sora-video".to_owned();
    request_charge.provider_model = "sora-video".to_owned();
    request_charge.provider_native_model = "sora-video".to_owned();
    request_charge.request_path = "/app/v3/api/runtime/generations/video".to_owned();
    request_charge.modality = 5;
    request_charge.usage_type = 4;
    request_charge.billing_meter_code = "api_request".to_owned();
    request_charge.prompt_tokens = 0;
    request_charge.cached_tokens = 0;
    request_charge.completion_tokens = 0;
    request_charge.total_tokens = 0;
    request_charge.apply_quantity(GatewayUsageQuantity::single_request());
    request_charge.base_input_unit_price = "0.050000".to_owned();
    request_charge.base_output_unit_price = "0.000000".to_owned();
    request_charge.cache_read_unit_price = "0.000000".to_owned();
    request_charge.official_reference_amount = "0.050000000000".to_owned();
    request_charge.customer_charge_amount = "0.050000000000".to_owned();
    request_charge.upstream_cost_amount = "0.030000000000".to_owned();

    let mut duration_charge = request_charge.clone();
    duration_charge.usage_type = 6;
    duration_charge.billing_meter_code = "video_output_second".to_owned();
    duration_charge.apply_quantity(GatewayUsageQuantity::video_seconds("30").unwrap());
    duration_charge.base_input_unit_price = "0.100000".to_owned();
    duration_charge.official_reference_amount = "3.000000000000".to_owned();
    duration_charge.customer_charge_amount = "3.000000000000".to_owned();
    duration_charge.upstream_cost_amount = "1.800000000000".to_owned();

    recorder.record_gateway_usage(request_charge).await.unwrap();
    recorder
        .record_gateway_usage(duration_charge)
        .await
        .unwrap();

    let rows = sqlx::query(
        r#"
        SELECT uuid, usage_type, billing_meter_code, billable_quantity, request_count,
               COALESCE(video_seconds, '') AS video_seconds, total_tokens,
               customer_charge_amount, upstream_cost_amount
        FROM ai_usage
        WHERE request_id = 'req-video-generation-billing'
        ORDER BY usage_type ASC
        "#,
    )
    .fetch_all(&pool)
    .await
    .unwrap();

    assert_eq!(2, rows.len());
    assert_eq!(4_i64, rows[0].get::<i64, _>("usage_type"));
    assert_eq!(
        "api_request",
        rows[0].get::<String, _>("billing_meter_code")
    );
    assert_eq!("1", rows[0].get::<String, _>("billable_quantity"));
    assert_eq!(1_i64, rows[0].get::<i64, _>("request_count"));
    assert_eq!("", rows[0].get::<String, _>("video_seconds"));
    assert_eq!(
        "0.050000000000",
        rows[0].get::<String, _>("customer_charge_amount")
    );
    assert_eq!(
        "0.030000000000",
        rows[0].get::<String, _>("upstream_cost_amount")
    );

    assert_eq!(6_i64, rows[1].get::<i64, _>("usage_type"));
    assert_eq!(
        "video_output_second",
        rows[1].get::<String, _>("billing_meter_code")
    );
    assert_eq!(
        "30.000000000000",
        rows[1].get::<String, _>("billable_quantity")
    );
    assert_eq!(0_i64, rows[1].get::<i64, _>("request_count"));
    assert_eq!("30.000000000000", rows[1].get::<String, _>("video_seconds"));
    assert_eq!(0_i64, rows[1].get::<i64, _>("total_tokens"));
    assert_ne!(
        rows[0].get::<String, _>("uuid"),
        rows[1].get::<String, _>("uuid"),
        "independent usage facts for the same request must have distinct stable uuids"
    );
    assert_eq!(
        "3.000000000000",
        rows[1].get::<String, _>("customer_charge_amount")
    );
    assert_eq!(
        "1.800000000000",
        rows[1].get::<String, _>("upstream_cost_amount")
    );
}

#[test]
fn gateway_usage_quantity_rejects_invalid_meter_quantities() {
    assert!(GatewayUsageQuantity::tokens(-1).is_err());
    assert!(GatewayUsageQuantity::requests(0).is_err());
    assert!(GatewayUsageQuantity::video_seconds("0").is_err());
    assert!(GatewayUsageQuantity::video_seconds("-0.1").is_err());
    assert!(GatewayUsageQuantity::video_seconds("abc").is_err());
}

#[test]
fn gateway_usage_quantity_maps_meter_to_canonical_dimensions() {
    let tokens = GatewayUsageQuantity::for_meter(BillingMeter::LlmInputToken, "42").unwrap();
    assert_eq!("42", tokens.billable_quantity);
    assert_eq!(1, tokens.request_count);

    let request = GatewayUsageQuantity::for_meter(BillingMeter::ApiRequest, "1").unwrap();
    assert_eq!("1", request.billable_quantity);
    assert_eq!(1, request.request_count);

    let image = GatewayUsageQuantity::for_meter(BillingMeter::ImageResult, "2").unwrap();
    assert_eq!("2", image.billable_quantity);
    assert_eq!(2, image.image_count);

    let audio_minute =
        GatewayUsageQuantity::for_meter(BillingMeter::AudioOutputMinute, "1.5").unwrap();
    assert_eq!("1.500000000000", audio_minute.billable_quantity);
    assert_eq!(
        Some("90.000000000000".to_owned()),
        audio_minute.audio_seconds
    );

    let video_second =
        GatewayUsageQuantity::for_meter(BillingMeter::VideoOutputSecond, "12.5").unwrap();
    assert_eq!("12.500000000000", video_second.billable_quantity);
    assert_eq!(
        Some("12.500000000000".to_owned()),
        video_second.video_seconds
    );
}

#[test]
fn gateway_usage_command_rejects_invalid_persistence_values() {
    let valid = usage_command("req-validation", 200);
    valid.validate().unwrap();

    let mut invalid_commands = Vec::new();

    let mut command = valid.clone();
    command.tenant_id = 0;
    invalid_commands.push(("tenant_id", command));

    let mut command = valid.clone();
    command.organization_id = -1;
    invalid_commands.push(("organization_id", command));

    let mut command = valid.clone();
    command.request_id = " ".to_owned();
    invalid_commands.push(("request_id", command));

    let mut command = valid.clone();
    command.http_status = 99;
    invalid_commands.push(("http_status", command));

    let mut command = valid.clone();
    command.total_tokens = -1;
    invalid_commands.push(("total_tokens", command));

    let mut command = valid.clone();
    command.billing_meter_code.clear();
    invalid_commands.push(("billing_meter_code", command));

    let mut command = valid.clone();
    command.customer_charge_amount = "-0.000001".to_owned();
    invalid_commands.push(("customer_charge_amount", command));

    let mut command = valid.clone();
    command.pricing_snapshot = "[]".to_owned();
    invalid_commands.push(("pricing_snapshot", command));

    let mut command = valid.clone();
    command.trace_id = Some("x".repeat(129));
    invalid_commands.push(("trace_id", command));

    let mut command = valid.clone();
    command.api_key_name_snapshot = "x".repeat(129);
    invalid_commands.push(("api_key_name_snapshot", command));

    let mut command = valid.clone();
    command.upstream_account_group_snapshot = "x".repeat(129);
    invalid_commands.push(("upstream_account_group_snapshot", command));

    let mut command = valid.clone();
    command.supplier_code = "x".repeat(129);
    invalid_commands.push(("supplier_code", command));

    let mut command = valid.clone();
    command.requested_model = "x".repeat(257);
    invalid_commands.push(("requested_model", command));

    let mut command = valid.clone();
    command.requested_model_catalog_key = "x".repeat(257);
    invalid_commands.push(("requested_model_catalog_key", command));

    let mut command = valid.clone();
    command.provider_model = "x".repeat(257);
    invalid_commands.push(("provider_model", command));

    let mut command = valid.clone();
    command.provider_native_model = "x".repeat(257);
    invalid_commands.push(("provider_native_model", command));

    let mut command = valid.clone();
    command.region_code = "x".repeat(65);
    invalid_commands.push(("region_code", command));

    let mut command = valid.clone();
    command.request_path = "x".repeat(257);
    invalid_commands.push(("request_path", command));

    let mut command = valid.clone();
    command.http_method = "x".repeat(17);
    invalid_commands.push(("http_method", command));

    let mut command = valid.clone();
    command.provider_error_code = Some("x".repeat(129));
    invalid_commands.push(("provider_error_code", command));

    let mut command = valid.clone();
    command.error_type = Some("x".repeat(129));
    invalid_commands.push(("error_type", command));

    let mut command = valid.clone();
    command.error_message_masked = Some("x".repeat(1025));
    invalid_commands.push(("error_message_masked", command));

    let mut command = valid.clone();
    command.catalog_key = "x".repeat(257);
    invalid_commands.push(("catalog_key", command));

    let mut command = valid.clone();
    command.pricing_plan_code = "x".repeat(65);
    invalid_commands.push(("pricing_plan_code", command));

    let mut command = valid;
    command.base_input_unit_price = "1".repeat(41);
    invalid_commands.push(("base_input_unit_price", command));

    for (field, command) in invalid_commands {
        let error = command.validate().unwrap_err().to_string();
        assert!(
            error.contains(field),
            "invalid {field} must produce a field-specific validation error, got: {error}"
        );
    }
}

fn usage_command(request_id: &str, http_status: u16) -> GatewayUsageRecordCommand {
    GatewayUsageRecordCommand {
        request_id: request_id.to_owned(),
        trace_id: Some("trace-chat-usage-sqlite".to_owned()),
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        api_key_id: 101,
        api_key_name_snapshot: "Owner Usage Key".to_owned(),
        account_group_id: 10,
        upstream_account_group_snapshot: "standard-group".to_owned(),
        catalog_key: "openai/gpt-4o-mini".to_owned(),
        requested_model: "gpt-4o-mini".to_owned(),
        requested_model_catalog_key: "openai/gpt-4o-mini".to_owned(),
        supplier_code: "openrouter".to_owned(),
        account_id: 3001,
        provider_model: "gpt-4o-mini".to_owned(),
        provider_native_model: "gpt-4o-mini".to_owned(),
        region_code: "global".to_owned(),
        request_path: "/v1/chat/completions".to_owned(),
        http_method: "POST".to_owned(),
        user_agent: Some(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0".to_owned(),
        ),
        http_status,
        streaming: false,
        modality: 1,
        usage_type: 1,
        billing_meter_code: "llm_input_token".to_owned(),
        billable_quantity: "18".to_owned(),
        prompt_tokens: 11,
        completion_tokens: 7,
        cached_tokens: 2,
        total_tokens: 18,
        request_count: 1,
        result_count: 0,
        item_count: 0,
        character_count: 0,
        image_count: 0,
        audio_seconds: None,
        video_seconds: None,
        latency_ms: Some(345),
        ttft_ms: Some(120),
        provider_error_code: None,
        error_type: None,
        error_message_masked: None,
        base_input_unit_price: "0.198000".to_owned(),
        base_output_unit_price: "0.792000".to_owned(),
        cache_read_unit_price: "0.099000".to_owned(),
        rate_multiplier: "1.000000".to_owned(),
        reference_multiplier: "1.320000".to_owned(),
        official_reference_amount: "5.850000000000".to_owned(),
        customer_charge_amount: "7.722000".to_owned(),
        upstream_cost_amount: "4.290000".to_owned(),
        currency: "USD".to_owned(),
        pricing_plan_code: "standard".to_owned(),
        pricing_snapshot: r#"{"vendor":{"code":"openai"},"model":{"catalogKey":"openai/gpt-4o-mini"},"provider":{"code":"openrouter"},"pricingPlan":{"code":"standard"},"multipliers":{"rate":"1.000000","reference":"1.320000"},"meters":{"input":{"customerUnitPrice":"0.198000"},"output":{"customerUnitPrice":"0.792000"},"cacheRead":{"customerUnitPrice":"0.099000"}}}"#.to_owned(),
    }
}

fn failed_trace_command(request_id: &str) -> GatewayRequestTraceCommand {
    GatewayRequestTraceCommand {
        request_id: request_id.to_owned(),
        trace_id: Some("trace-chat-usage-sqlite".to_owned()),
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        api_key_id: 101,
        api_key_name_snapshot: "Owner Usage Key".to_owned(),
        account_group_id: 10,
        upstream_account_group_snapshot: "standard-group".to_owned(),
        catalog_key: "openai/gpt-4o-mini".to_owned(),
        requested_model: "gpt-4o-mini".to_owned(),
        requested_model_catalog_key: "openai/gpt-4o-mini".to_owned(),
        supplier_code: "openrouter".to_owned(),
        account_id: 3001,
        provider_model: "gpt-4o-mini".to_owned(),
        provider_native_model: "gpt-4o-mini".to_owned(),
        region_code: "global".to_owned(),
        request_path: "/v1/chat/completions".to_owned(),
        http_method: "POST".to_owned(),
        user_agent: Some("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0".to_owned()),
        http_status: Some(503),
        streaming: false,
        prompt_tokens: 0,
        completion_tokens: 0,
        cached_tokens: 0,
        total_tokens: 0,
        latency_ms: Some(42),
        ttft_ms: None,
        provider_error_code: Some("upstream_http_503".to_owned()),
        error_type: Some("provider_error".to_owned()),
        error_message_masked: Some("provider relay returned HTTP 503".to_owned()),
    }
}

async fn create_usage_tables(pool: &sqlx::SqlitePool) {
    sqlx::raw_sql(include_str!(
        "../../../database/ddl/baseline/sqlite/0001_clawrouter_baseline.sql"
    ))
    .execute(pool)
    .await
    .unwrap();
}
