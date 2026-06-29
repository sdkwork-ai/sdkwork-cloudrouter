use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

use serde_json::json;
use sha2::{Digest, Sha256};
use sqlx::SqlitePool;

use crate::domain::DomainError;
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    GatewayRequestTraceCommand, GatewayUsageRecordCommand, GatewayUsageRecordFuture,
    GatewayUsageRecorder,
};

const OWNER_TYPE_USER: i64 = 1;
const SETTLEMENT_PENDING: i64 = 0;

#[derive(Debug, Clone)]
pub struct SqliteGatewayUsageRecorder {
    pool: SqlitePool,
}

impl SqliteGatewayUsageRecorder {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

impl GatewayUsageRecorder for SqliteGatewayUsageRecorder {
    fn record_gateway_trace<'a>(
        &'a self,
        command: GatewayRequestTraceCommand,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async move {
            upsert_trace(&self.pool, &command).await?;
            Ok(())
        })
    }

    fn record_gateway_usage<'a>(
        &'a self,
        command: GatewayUsageRecordCommand,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async move {
            upsert_trace(&self.pool, &command.trace_command()).await?;
            upsert_usage_fact(&self.pool, &command).await?;
            Ok(())
        })
    }
}

async fn upsert_trace(
    pool: &SqlitePool,
    command: &GatewayRequestTraceCommand,
) -> Result<(), DomainError> {
    let metadata = trace_metadata_json(command);
    let user_agent_hash = user_agent_hash(command);
    sqlx::query(
        r#"
        INSERT INTO ai_request_trace
            (id, uuid, tenant_id, organization_id, user_id, request_id, trace_id, status, attempt_no,
             api_key_id, api_key_name_snapshot, channel_group_id, channel_group_snapshot,
             owner_type, owner_id, channel_id, channel_name_snapshot, requested_model,
             requested_model_catalog_key, provider_model, provider_native_model,
             region_code, endpoint, request_path, http_method, http_status, started_at, ended_at, streaming,
             prompt_tokens, cached_tokens, completion_tokens, total_tokens, latency_ms, ttft_ms,
             provider_error_code, error_type, error_message_masked, metadata, user_agent_hash)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
             strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), ?, ?, ?, ?, ?,
             ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (tenant_id, organization_id, request_id, attempt_no) DO UPDATE SET
            trace_id = excluded.trace_id,
            api_key_id = excluded.api_key_id,
            api_key_name_snapshot = excluded.api_key_name_snapshot,
            channel_group_id = excluded.channel_group_id,
            channel_group_snapshot = excluded.channel_group_snapshot,
            owner_type = excluded.owner_type,
            owner_id = excluded.owner_id,
            channel_id = excluded.channel_id,
            channel_name_snapshot = excluded.channel_name_snapshot,
            requested_model = excluded.requested_model,
            requested_model_catalog_key = excluded.requested_model_catalog_key,
            provider_model = excluded.provider_model,
            provider_native_model = excluded.provider_native_model,
            region_code = excluded.region_code,
            endpoint = excluded.endpoint,
            request_path = excluded.request_path,
            http_method = excluded.http_method,
            http_status = excluded.http_status,
            ended_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
            streaming = excluded.streaming,
            prompt_tokens = excluded.prompt_tokens,
            cached_tokens = excluded.cached_tokens,
            completion_tokens = excluded.completion_tokens,
            total_tokens = excluded.total_tokens,
            latency_ms = excluded.latency_ms,
            ttft_ms = excluded.ttft_ms,
            provider_error_code = excluded.provider_error_code,
            error_type = excluded.error_type,
            error_message_masked = excluded.error_message_masked,
            metadata = excluded.metadata,
            user_agent_hash = excluded.user_agent_hash
        WHERE NOT EXISTS (
            SELECT 1
            FROM ai_usage settled_usage
            WHERE settled_usage.tenant_id = ai_request_trace.tenant_id
              AND settled_usage.organization_id = ai_request_trace.organization_id
              AND settled_usage.request_id = ai_request_trace.request_id
              AND (settled_usage.settlement_status IS NULL OR settled_usage.settlement_status <> 0)
        )
        "#,
    )
    .bind(next_claw_runtime_id("ai_request_trace")?)
    .bind(trace_uuid(command))
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(command.user_id)
    .bind(&command.request_id)
    .bind(command.trace_id.as_deref())
    .bind(command.api_key_id)
    .bind(&command.api_key_name_snapshot)
    .bind(command.channel_group_id)
    .bind(&command.channel_group_snapshot)
    .bind(OWNER_TYPE_USER)
    .bind(command.user_id)
    .bind(command.channel_id)
    .bind(&command.provider_code)
    .bind(&command.requested_model)
    .bind(&command.requested_model_catalog_key)
    .bind(&command.provider_native_model)
    .bind(&command.provider_native_model)
    .bind(&command.region_code)
    .bind(&command.request_path)
    .bind(&command.request_path)
    .bind(&command.http_method)
    .bind(command.http_status.map(i64::from))
    .bind(command.streaming)
    .bind(command.prompt_tokens)
    .bind(command.cached_tokens)
    .bind(command.completion_tokens)
    .bind(command.total_tokens)
    .bind(command.latency_ms)
    .bind(command.ttft_ms)
    .bind(command.provider_error_code.as_deref())
    .bind(command.error_type.as_deref())
    .bind(command.error_message_masked.as_deref())
    .bind(&metadata)
    .bind(user_agent_hash.as_deref())
    .execute(pool)
    .await
    .map_err(|error| store_error("failed to upsert gateway request trace", error))?;
    Ok(())
}

async fn upsert_usage_fact(
    pool: &SqlitePool,
    command: &GatewayUsageRecordCommand,
) -> Result<(), DomainError> {
    sqlx::query(
        r#"
        INSERT INTO ai_usage
            (id, uuid, tenant_id, organization_id, user_id, request_id, trace_id, status,
             api_key_id, api_key_name_snapshot, channel_group_id, channel_group_snapshot,
             owner_type, owner_id, catalog_key, requested_model_catalog_key, model,
             provider_native_model, region_code, channel_id, modality, usage_type, billing_meter_code,
             billable_quantity, prompt_tokens, cached_tokens, completion_tokens, total_tokens,
             request_count, result_count, item_count, character_count, image_count,
             audio_seconds, video_seconds, unit_price_snapshot, base_input_unit_price,
             base_output_unit_price, cache_read_unit_price, rate_multiplier, reference_multiplier,
             official_reference_amount, upstream_cost_amount, customer_charge_amount, cost_amount,
             currency, pricing_plan_code, pricing_snapshot, occurred_at, settlement_status)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, 1,
             ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
             ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
             ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
             ?, ?, ?, ?, ?, ?, ?, ?, ?,
             strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), ?)
        ON CONFLICT (tenant_id, organization_id, request_id, usage_type) DO UPDATE SET
            trace_id = excluded.trace_id,
            api_key_id = excluded.api_key_id,
            api_key_name_snapshot = excluded.api_key_name_snapshot,
            channel_group_id = excluded.channel_group_id,
            channel_group_snapshot = excluded.channel_group_snapshot,
            owner_type = excluded.owner_type,
            owner_id = excluded.owner_id,
            catalog_key = excluded.catalog_key,
            requested_model_catalog_key = excluded.requested_model_catalog_key,
            model = excluded.model,
            provider_native_model = excluded.provider_native_model,
            region_code = excluded.region_code,
            channel_id = excluded.channel_id,
            modality = excluded.modality,
            billing_meter_code = excluded.billing_meter_code,
            billable_quantity = excluded.billable_quantity,
            prompt_tokens = excluded.prompt_tokens,
            cached_tokens = excluded.cached_tokens,
            completion_tokens = excluded.completion_tokens,
            total_tokens = excluded.total_tokens,
            request_count = excluded.request_count,
            result_count = excluded.result_count,
            item_count = excluded.item_count,
            character_count = excluded.character_count,
            image_count = excluded.image_count,
            audio_seconds = excluded.audio_seconds,
            video_seconds = excluded.video_seconds,
            unit_price_snapshot = excluded.unit_price_snapshot,
            base_input_unit_price = excluded.base_input_unit_price,
            base_output_unit_price = excluded.base_output_unit_price,
            cache_read_unit_price = excluded.cache_read_unit_price,
            rate_multiplier = excluded.rate_multiplier,
            reference_multiplier = excluded.reference_multiplier,
            official_reference_amount = excluded.official_reference_amount,
            upstream_cost_amount = excluded.upstream_cost_amount,
            customer_charge_amount = excluded.customer_charge_amount,
            cost_amount = excluded.cost_amount,
            currency = excluded.currency,
            pricing_plan_code = excluded.pricing_plan_code,
            pricing_snapshot = excluded.pricing_snapshot,
            occurred_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
            settlement_status = excluded.settlement_status
        WHERE ai_usage.settlement_status = 0
        "#,
    )
    .bind(next_claw_runtime_id("ai_usage")?)
    .bind(usage_uuid(command))
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(command.user_id)
    .bind(&command.request_id)
    .bind(command.trace_id.as_deref())
    .bind(command.api_key_id)
    .bind(&command.api_key_name_snapshot)
    .bind(command.channel_group_id)
    .bind(&command.channel_group_snapshot)
    .bind(OWNER_TYPE_USER)
    .bind(command.user_id)
    .bind(&command.catalog_key)
    .bind(&command.requested_model_catalog_key)
    .bind(&command.requested_model)
    .bind(&command.provider_native_model)
    .bind(&command.region_code)
    .bind(command.channel_id)
    .bind(command.modality)
    .bind(command.usage_type)
    .bind(&command.billing_meter_code)
    .bind(&command.billable_quantity)
    .bind(command.prompt_tokens)
    .bind(command.cached_tokens)
    .bind(command.completion_tokens)
    .bind(command.total_tokens)
    .bind(command.request_count)
    .bind(command.result_count)
    .bind(command.item_count)
    .bind(command.character_count)
    .bind(command.image_count)
    .bind(command.audio_seconds.as_deref())
    .bind(command.video_seconds.as_deref())
    .bind(&command.base_input_unit_price)
    .bind(&command.base_input_unit_price)
    .bind(&command.base_output_unit_price)
    .bind(&command.cache_read_unit_price)
    .bind(&command.rate_multiplier)
    .bind(&command.reference_multiplier)
    .bind(&command.official_reference_amount)
    .bind(&command.upstream_cost_amount)
    .bind(&command.customer_charge_amount)
    .bind(&command.customer_charge_amount)
    .bind(&command.currency)
    .bind(&command.pricing_plan_code)
    .bind(&command.pricing_snapshot)
    .bind(SETTLEMENT_PENDING)
    .execute(pool)
    .await
    .map_err(|error| store_error("failed to upsert gateway usage fact", error))?;
    Ok(())
}

fn trace_uuid(command: &GatewayRequestTraceCommand) -> String {
    stable_uuid("trace", command)
}

fn usage_uuid(command: &GatewayUsageRecordCommand) -> String {
    let mut hasher = DefaultHasher::new();
    command.tenant_id.hash(&mut hasher);
    command.organization_id.hash(&mut hasher);
    command.request_id.hash(&mut hasher);
    command.usage_type.hash(&mut hasher);
    "usage".hash(&mut hasher);
    format!("usage-{:016x}", hasher.finish())
}

fn trace_metadata_json(command: &GatewayRequestTraceCommand) -> String {
    command
        .user_agent
        .as_deref()
        .map(|user_agent| json!({ "userAgent": user_agent }).to_string())
        .unwrap_or_else(|| "{}".to_owned())
}

fn user_agent_hash(command: &GatewayRequestTraceCommand) -> Option<String> {
    command.user_agent.as_deref().map(sha256_hex)
}

fn sha256_hex(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    hex::encode(hasher.finalize())
}

fn stable_uuid(prefix: &str, command: &impl GatewayStableUuidCommand) -> String {
    let mut hasher = DefaultHasher::new();
    command.tenant_id().hash(&mut hasher);
    command.organization_id().hash(&mut hasher);
    command.request_id().hash(&mut hasher);
    prefix.hash(&mut hasher);
    format!("{prefix}-{:016x}", hasher.finish())
}

trait GatewayStableUuidCommand {
    fn tenant_id(&self) -> i64;
    fn organization_id(&self) -> i64;
    fn request_id(&self) -> &str;
}

impl GatewayStableUuidCommand for GatewayRequestTraceCommand {
    fn tenant_id(&self) -> i64 {
        self.tenant_id
    }

    fn organization_id(&self) -> i64 {
        self.organization_id
    }

    fn request_id(&self) -> &str {
        &self.request_id
    }
}

impl GatewayStableUuidCommand for GatewayUsageRecordCommand {
    fn tenant_id(&self) -> i64 {
        self.tenant_id
    }

    fn organization_id(&self) -> i64 {
        self.organization_id
    }

    fn request_id(&self) -> &str {
        &self.request_id
    }
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}
