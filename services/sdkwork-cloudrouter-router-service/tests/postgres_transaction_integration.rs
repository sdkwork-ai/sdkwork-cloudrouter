use std::env;
use std::time::{SystemTime, UNIX_EPOCH};

use sdkwork_cloudrouter_router_service::infrastructure::sql::postgres::PostgresGatewayUsageRecorder;
use sdkwork_cloudrouter_router_service::ports::{
    GatewayOfficialRateReference, GatewayUsageRecordCommand, GatewayUsageRecorder,
};
use sqlx::postgres::PgPoolOptions;
use sqlx::{PgPool, Row};

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";
const ACCOUNT_BASELINE: &str = include_str!(
    "../../../../sdkwork-account/database/ddl/baseline/postgres/0001_account_baseline.sql"
);
const PRICING_BASELINE: &str = include_str!(
    "../../../database/modules/pricing/ddl/baseline/postgres/0001_pricing_baseline.sql"
);
const CLOUDROUTER_BILLING_BASELINE: &str = include_str!(
    "../../../database/modules/cloudrouter-billing/ddl/baseline/postgres/0001_cloudrouter_billing_baseline.sql"
);

#[tokio::test]
async fn postgres_gateway_usage_recorder_preserves_non_pending_usage_fact_on_duplicate_request_id()
{
    let Some(ctx) = PostgresTestContext::new("gateway_usage_recorder").await else {
        return;
    };
    let recorder = PostgresGatewayUsageRecorder::new(ctx.pool.clone());
    let mut command = usage_command("pg-usage-settlement-failed", 200);
    recorder
        .record_gateway_usage(command.clone())
        .await
        .unwrap();
    sqlx::query(
        r#"
        UPDATE ai_metering_usage
        SET settlement_status = 3,
            customer_charge_amount = 7.722000,
            upstream_cost_amount = 4.290000,
            total_tokens = 18
        WHERE request_id = 'pg-usage-settlement-failed'
        "#,
    )
    .execute(&ctx.pool)
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
        SELECT total_tokens,
               customer_charge_amount::text AS customer_charge_amount,
               upstream_cost_amount::text AS upstream_cost_amount,
               settlement_status
        FROM ai_metering_usage
        WHERE request_id = 'pg-usage-settlement-failed'
        "#,
    )
    .fetch_one(&ctx.pool)
    .await
    .unwrap();
    assert_eq!(18_i64, usage.get::<i64, _>("total_tokens"));
    assert_eq!(
        "7.722000000000",
        usage.get::<String, _>("customer_charge_amount")
    );
    assert_eq!(
        "4.290000000000",
        usage.get::<String, _>("upstream_cost_amount")
    );
    assert_eq!(
        3_i32,
        usage.get::<i32, _>("settlement_status"),
        "Postgres gateway usage recorder must freeze non-pending usage facts"
    );

    let trace = sqlx::query(
        r#"
        SELECT total_tokens, http_status
        FROM ai_metering_request_trace
        WHERE request_id = 'pg-usage-settlement-failed'
        "#,
    )
    .fetch_one(&ctx.pool)
    .await
    .unwrap();
    assert_eq!(
        18_i64,
        trace.get::<i64, _>("total_tokens"),
        "Postgres gateway usage recorder must freeze trace rows once usage settlement starts"
    );
    assert_eq!(200_i32, trace.get::<i32, _>("http_status"));

    let mut unrated = usage_command("pg-usage-unrated", 200);
    unrated.official_rate = None;
    recorder.record_gateway_usage(unrated).await.unwrap();
    let unrated_counts = sqlx::query(
        r#"
        SELECT
            (SELECT COUNT(*) FROM cloudrouter_usage_measurement
             WHERE invocation_id = 'pg-usage-unrated') AS measurement_count,
            (SELECT COUNT(*) FROM cloudrouter_rating_decision
             WHERE invocation_id = 'pg-usage-unrated'
               AND decision_status = 'unrated') AS unrated_count,
            (SELECT COUNT(*) FROM cloudrouter_charge_line
             WHERE invocation_id = 'pg-usage-unrated') AS charge_count,
            (SELECT COUNT(*) FROM ai_metering_usage
             WHERE request_id = 'pg-usage-unrated') AS legacy_usage_count
        "#,
    )
    .fetch_one(&ctx.pool)
    .await
    .unwrap();
    assert_eq!(1_i64, unrated_counts.get::<i64, _>("measurement_count"));
    assert_eq!(1_i64, unrated_counts.get::<i64, _>("unrated_count"));
    assert_eq!(0_i64, unrated_counts.get::<i64, _>("charge_count"));
    assert_eq!(0_i64, unrated_counts.get::<i64, _>("legacy_usage_count"));

    ctx.cleanup().await;
}

struct PostgresTestContext {
    pool: PgPool,
    database_url: String,
    schema: String,
}

impl PostgresTestContext {
    async fn new(label: &str) -> Option<Self> {
        let database_url = match env::var(POSTGRES_TEST_DATABASE_URL) {
            Ok(value) if !value.trim().is_empty() => value,
            _ => {
                eprintln!(
                    "skipping Postgres transaction integration test; set {POSTGRES_TEST_DATABASE_URL} to run it"
                );
                return None;
            }
        };
        let schema = unique_schema_name(label);
        let quoted_schema = quote_identifier(&schema);
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "DROP SCHEMA IF EXISTS {quoted_schema} CASCADE"
        )))
        .execute(&admin_pool)
        .await
        .unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "CREATE SCHEMA {quoted_schema}"
        )))
        .execute(&admin_pool)
        .await
        .unwrap();
        admin_pool.close().await;

        let schema_for_connections = schema.clone();
        let pool = PgPoolOptions::new()
            .max_connections(4)
            .after_connect(move |connection, _metadata| {
                let schema = schema_for_connections.clone();
                Box::pin(async move {
                    sqlx::query(sqlx::AssertSqlSafe(format!(
                        "SET search_path TO {}",
                        quote_identifier(&schema)
                    )))
                    .execute(&mut *connection)
                    .await?;
                    Ok(())
                })
            })
            .connect(&database_url)
            .await
            .unwrap();
        create_schema(&pool).await;

        Some(Self {
            pool,
            database_url,
            schema,
        })
    }

    async fn cleanup(self) {
        let Self {
            pool,
            database_url,
            schema,
        } = self;
        pool.close().await;
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "DROP SCHEMA IF EXISTS {} CASCADE",
            quote_identifier(&schema)
        )))
        .execute(&admin_pool)
        .await
        .unwrap();
        admin_pool.close().await;
    }
}

async fn create_schema(pool: &PgPool) {
    // Recharge credits write through the account-domain ledger
    // (`acct_account`/`acct_ledger_entry`); the legacy `commerce_account` and
    // `commerce_account_ledger_entry` tables are retired (S5).
    for baseline in [
        ACCOUNT_BASELINE,
        PRICING_BASELINE,
        CLOUDROUTER_BILLING_BASELINE,
    ] {
        for statement in split_statements(baseline) {
            sqlx::query(sqlx::AssertSqlSafe(statement.to_owned()))
                .execute(pool)
                .await
                .unwrap();
        }
    }
    for statement in [
        r#"CREATE TABLE commerce_payment_webhook_event (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT NOT NULL DEFAULT '0',
            event_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            provider_code TEXT NOT NULL,
            payload JSONB NOT NULL,
            status TEXT NOT NULL,
            retries INTEGER NOT NULL DEFAULT 0,
            last_error TEXT,
            received_at TIMESTAMPTZ NOT NULL,
            processed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        )"#,
        r#"CREATE TABLE commerce_payment_webhook_delivery (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT NOT NULL DEFAULT '0',
            delivery_no TEXT NOT NULL,
            provider_code TEXT NOT NULL,
            provider_account_id TEXT,
            event_id TEXT NOT NULL,
            nonce TEXT NOT NULL,
            request_timestamp BIGINT,
            signature TEXT,
            signature_algorithm TEXT,
            headers_json TEXT,
            payload_digest TEXT NOT NULL,
            payload_ref TEXT,
            source_ip TEXT,
            user_agent TEXT,
            verification_status TEXT NOT NULL,
            delivery_status TEXT NOT NULL,
            failure_code TEXT,
            failure_message TEXT,
            received_at TIMESTAMPTZ NOT NULL,
            verified_at TIMESTAMPTZ,
            normalized_event_id TEXT,
            processed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        )"#,
        r#"CREATE TABLE commerce_order (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT NOT NULL DEFAULT '0',
            owner_user_id TEXT NOT NULL,
            order_no TEXT NOT NULL,
            status TEXT NOT NULL,
            subject TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            paid_at TEXT,
            cancelled_at TEXT,
            expired_at TEXT,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, order_no)
        )"#,
        r#"CREATE TABLE commerce_payment_intent (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT NOT NULL DEFAULT '0',
            owner_user_id TEXT NOT NULL,
            order_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            amount TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            status TEXT NOT NULL,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE commerce_payment_attempt (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT NOT NULL DEFAULT '0',
            owner_user_id TEXT NOT NULL,
            payment_intent_id TEXT NOT NULL,
            order_id TEXT NOT NULL,
            provider_code TEXT NOT NULL,
            out_trade_no TEXT NOT NULL,
            amount TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            status TEXT NOT NULL,
            callback_payload TEXT,
            created_at TEXT NOT NULL,
            paid_at TEXT,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, provider_code, out_trade_no)
        )"#,
        r#"CREATE TABLE ai_metering_request_trace (
            id BIGSERIAL PRIMARY KEY,
            uuid VARCHAR(64) NOT NULL,
            tenant_id BIGINT,
            organization_id BIGINT NOT NULL DEFAULT 0,
            user_id BIGINT,
            request_id VARCHAR(128),
            trace_id VARCHAR(128),
            payload_hash VARCHAR(128),
            status INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            retention_until TIMESTAMPTZ,
            legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            attempt_no INTEGER,
            decision_log_id BIGINT,
            api_key_id BIGINT,
            api_key_name_snapshot VARCHAR(128),
            account_group_id BIGINT,
            account_group_snapshot VARCHAR(128),
            owner_type INTEGER,
            owner_id BIGINT,
            owner_name_snapshot VARCHAR(128),
            supplier_id BIGINT,
            account_id BIGINT,
            account_name_snapshot VARCHAR(128),
            requested_model VARCHAR(128),
            requested_model_catalog_key VARCHAR(256),
            provider_model VARCHAR(128),
            provider_native_model VARCHAR(256),
            gateway_instance_id BIGINT,
            gateway_instance_code_snapshot VARCHAR(128),
            gateway_region_code_snapshot VARCHAR(64),
            gateway_node_name_snapshot VARCHAR(128),
            region_code VARCHAR(64),
            endpoint VARCHAR(256),
            request_path VARCHAR(256),
            http_method VARCHAR(16),
            http_status INTEGER,
            provider_error_code VARCHAR(128),
            error_type VARCHAR(128),
            started_at TIMESTAMPTZ,
            ended_at TIMESTAMPTZ,
            latency_ms INTEGER,
            ttft_ms INTEGER,
            streaming BOOLEAN,
            request_bytes BIGINT,
            response_bytes BIGINT,
            prompt_tokens BIGINT,
            completion_tokens BIGINT,
            cached_tokens BIGINT,
            total_tokens BIGINT,
            request_payload_hash VARCHAR(128),
            response_payload_hash VARCHAR(128),
            error_message_masked VARCHAR(1024),
            reasoning_effort VARCHAR(64),
            client_ip_hash VARCHAR(128),
            client_ip_masked VARCHAR(64),
            client_ip_region VARCHAR(128),
            user_agent_hash VARCHAR(128),
            CONSTRAINT uk_ai_metering_request_trace_request_attempt UNIQUE (tenant_id, organization_id, request_id, attempt_no)
        )"#,
        r#"CREATE TABLE ai_metering_usage (
            id BIGSERIAL PRIMARY KEY,
            uuid VARCHAR(64) NOT NULL,
            tenant_id BIGINT,
            organization_id BIGINT NOT NULL DEFAULT 0,
            user_id BIGINT,
            request_id VARCHAR(128),
            trace_id VARCHAR(128),
            payload_hash VARCHAR(128),
            idempotency_key VARCHAR(128) NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            retention_until TIMESTAMPTZ,
            legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            decision_log_id BIGINT,
            api_key_id BIGINT,
            api_key_name_snapshot VARCHAR(128),
            account_group_id BIGINT,
            upstream_account_group_snapshot VARCHAR(128),
            owner_type INTEGER,
            owner_id BIGINT,
            owner_name_snapshot VARCHAR(128),
            catalog_key VARCHAR(256) NOT NULL,
            requested_model_catalog_key VARCHAR(256),
            model VARCHAR(128),
            provider_native_model VARCHAR(256),
            region_code VARCHAR(64),
            provider_id BIGINT,
            account_id BIGINT,
            provider_account_id BIGINT,
            modality INTEGER,
            usage_type INTEGER,
            billing_type INTEGER,
            billing_mode INTEGER,
            billing_meter_id BIGINT,
            billing_meter_code VARCHAR(64),
            billing_tier VARCHAR(64),
            billable_quantity NUMERIC(38, 12),
            billable_unit INTEGER,
            prompt_tokens BIGINT,
            completion_tokens BIGINT,
            cached_tokens BIGINT,
            total_tokens BIGINT,
            request_count BIGINT,
            result_count BIGINT,
            item_count BIGINT,
            character_count BIGINT,
            image_count BIGINT,
            audio_seconds NUMERIC(38, 12),
            video_seconds NUMERIC(38, 12),
            storage_byte_hours NUMERIC(38, 12),
            bandwidth_bytes BIGINT,
            base_input_unit_price NUMERIC(38, 12),
            base_output_unit_price NUMERIC(38, 12),
            cache_read_unit_price NUMERIC(38, 12),
            rate_multiplier NUMERIC(38, 12),
            reference_multiplier NUMERIC(38, 12),
            official_reference_amount NUMERIC(38, 12),
            upstream_cost_amount NUMERIC(38, 12),
            customer_charge_amount NUMERIC(38, 12),
            currency VARCHAR(10),
            pricing_id BIGINT,
            pricing_plan_id BIGINT,
            pricing_plan_code VARCHAR(64),
            pricing_rule_id BIGINT,
            pricing_tier_id BIGINT,
            pricing_snapshot JSONB,
            reasoning_effort VARCHAR(64),
            occurred_at TIMESTAMPTZ,
            settlement_status INTEGER,
            settlement_id BIGINT,
            CONSTRAINT uk_ai_metering_usage_idempotency UNIQUE (tenant_id, organization_id, idempotency_key),
            CONSTRAINT uk_ai_metering_usage_request_type UNIQUE (tenant_id, organization_id, request_id, usage_type)
        )"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
    seed_chargeable_pricing(pool).await;
}

async fn seed_chargeable_pricing(pool: &PgPool) {
    for statement in [
        r#"INSERT INTO pricing_price_book
            (id, uuid, tenant_id, organization_id, namespace_code,
             price_book_code, price_book_version, price_side, source_system,
             vendor_code, region_code, source_catalog_version, source_hash,
             lifecycle_state, currency_code, effective_from, activated_at)
            VALUES (4, 'pricing-book-4', 0, 0, 'models', 'test-official-book',
                    '1', 'official_reference', 'sdkwork-models', 'openai', 'global',
                    'test-catalog', 'test-source-hash', 'active', 'USD',
                    TIMESTAMPTZ '2020-01-01 00:00:00+00', CURRENT_TIMESTAMP)"#,
        r#"INSERT INTO pricing_rate
            (id, uuid, tenant_id, organization_id, price_book_id, rate_code, rate_hash,
             product_code, product_kind, product_display_name, operation_code,
             operation_kind, operation_display_name, meter_code, meter_display_name,
             quantity_kind, unit_code, vendor_code, provider_code, region_code,
             resource_type, resource_code, catalog_key, billability, charge_timing,
             calculation_mode, quantity_aggregation, unit_size, unit_price,
             minimum_quantity, currency_code, conditions, tiers, priority, effective_from,
             source_url, source_observed_at)
            VALUES (6, 'pricing-rate-6', 0, 0, 4, 'test-input-rate', 'test-rate-hash',
                    'model-inference', 'model', 'Model inference', 'chat-completions',
                    'inference', 'Chat completions', 'llm_input_token',
                    'LLM input token', 'token', 'token', 'openai', 'openai', 'global',
                    'model', 'openai/gpt-4o-mini', 'openai/gpt-4o-mini', 'chargeable',
                    'usage_reported', 'per_unit', 'sum', 1000000, 0.15, 0, 'USD',
                    '[]'::jsonb, '[]'::jsonb, 100,
                    TIMESTAMPTZ '2020-01-01 00:00:00+00',
                    'https://example.test/pricing',
                    TIMESTAMPTZ '2020-01-01 00:00:00+00')"#,
        r#"INSERT INTO cloudrouter_pricing_plan
            (id, uuid, tenant_id, organization_id, plan_code, plan_name,
             base_price_side, currency_code, fallback_policy, rounding_mode,
             minimum_charge_amount, effective_from)
            VALUES (8, 'cloudrouter-plan-8', 100001, 0, 'standard', 'Standard',
                    'official_reference', 'USD', 'fail_closed', 'half_up', 0,
                    TIMESTAMPTZ '2020-01-01 00:00:00+00')"#,
        r#"INSERT INTO cloudrouter_pricing_rule
            (id, uuid, tenant_id, organization_id, pricing_plan_id, rule_code,
             formula_mode, multiplier, markup_amount, priority, effective_from)
            VALUES (9, 'cloudrouter-rule-9', 100001, 0, 8, 'default',
                    'multiplier_markup', 1, 0, 100,
                    TIMESTAMPTZ '2020-01-01 00:00:00+00')"#,
        r#"INSERT INTO cloudrouter_account_rate_card
            (id, uuid, tenant_id, organization_id, subject_type, subject_id,
             pricing_plan_tenant_id, pricing_plan_organization_id, pricing_plan_id,
             priority, effective_from)
            VALUES (10, 'cloudrouter-rate-card-10', 100001, 0,
                    'account_group', 10, 100001, 0, 8, 100,
                    TIMESTAMPTZ '2020-01-01 00:00:00+00')"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

fn usage_command(request_id: &str, http_status: u16) -> GatewayUsageRecordCommand {
    GatewayUsageRecordCommand {
        request_id: request_id.to_owned(),
        trace_id: Some("trace-chat-usage-postgres".to_owned()),
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
        user_agent: None,
        http_status,
        streaming: false,
        modality: 1,
        usage_type: 1,
        billing_meter_code: "llm_input_token".to_owned(),
        unit_size: "1000000".to_owned(),
        billable_quantity: "18".to_owned(),
        rated_quantity: "18".to_owned(),
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
        decision_status: "rated".to_owned(),
        billability: "chargeable".to_owned(),
        reason_code: "price_service_rated".to_owned(),
        strategy_code: Some("token_usage".to_owned()),
        base_input_unit_price: "0.198000".to_owned(),
        base_output_unit_price: "0.792000".to_owned(),
        cache_read_unit_price: "0.099000".to_owned(),
        rate_multiplier: "1.000000".to_owned(),
        reference_multiplier: "1.320000".to_owned(),
        official_reference_amount: "0.000002700000".to_owned(),
        customer_charge_amount: "0.000002700000".to_owned(),
        upstream_cost_amount: "4.290000".to_owned(),
        currency: "USD".to_owned(),
        pricing_plan_code: "standard".to_owned(),
        billing_components: "[]".to_owned(),
        pricing_snapshot: r#"{"vendor":{"code":"openai"},"model":{"catalogKey":"openai/gpt-4o-mini"},"provider":{"code":"openrouter"},"pricingPlan":{"code":"standard"},"multipliers":{"rate":"1.000000","reference":"1.320000"},"meters":{"input":{"customerUnitPrice":"0.198000"},"output":{"customerUnitPrice":"0.792000"},"cacheRead":{"customerUnitPrice":"0.099000"}}}"#.to_owned(),
        official_rate: Some(GatewayOfficialRateReference {
            record_identity: Some(sdkwork_cloudrouter_router_service::ports::GatewayRatingRecordIdentity {
                price_book_tenant_id: 0,
                price_book_organization_id: 0,
                price_book_id: 4,
                rate_id: 6,
                account_rate_card_tenant_id: 100001,
                account_rate_card_organization_id: 0,
                account_rate_card_id: 10,
                pricing_plan_tenant_id: 100001,
                pricing_plan_organization_id: 0,
                pricing_plan_id: 8,
                pricing_rule_tenant_id: 100001,
                pricing_rule_organization_id: 0,
                pricing_rule_id: 9,
            }),
            price_book_code: "test-official-book".to_owned(),
            rate_hash: "test-rate-hash".to_owned(),
            product_code: "model-inference".to_owned(),
            operation_code: "chat-completions".to_owned(),
            billability: "chargeable".to_owned(),
            charge_timing: "usage_reported".to_owned(),
            calculation_mode: "per_unit".to_owned(),
            quantity_aggregation: "sum".to_owned(),
            unit_size: "1000000".to_owned(),
            unit_price: "0.150000000000".to_owned(),
            plan_unit_price: "0.150000000000".to_owned(),
            rated_reference_unit_price: "0.150000000000".to_owned(),
            rated_unit_price: "0.150000000000".to_owned(),
            rated_procurement_unit_price: Some("0.110000000000".to_owned()),
            minimum_quantity: "0".to_owned(),
            quantity_step: None,
            conditions: Vec::new(),
            tiers: Vec::new(),
            formula: None,
        }),
    }
}

fn unique_schema_name(label: &str) -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    format!("sdkwork_cloudrouter_it_{label}_{millis}")
}

fn quote_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

fn split_statements(baseline: &str) -> Vec<String> {
    // Drop full-line `--` comments first so comment text containing `;` never
    // splits a real statement.
    let without_comments = baseline
        .lines()
        .filter(|line| !line.trim_start().starts_with("--"))
        .collect::<Vec<_>>()
        .join("\n");
    without_comments
        .split(';')
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
        .map(str::to_owned)
        .collect()
}
