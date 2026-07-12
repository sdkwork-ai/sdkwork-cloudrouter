use sha2::{Digest, Sha256};
use sqlx::{PgConnection, PgPool};

use crate::domain::DomainError;
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    GatewayAccountingRecordContext, GatewayRequestTraceCommand, GatewayTraceAttribution,
    GatewayUsageRecordCommand, GatewayUsageRecordFuture, GatewayUsageRecorder,
};

const OWNER_TYPE_USER: i64 = 1;
const SETTLEMENT_PENDING: i64 = 0;

const UPSERT_TRACE: &str = r#"
INSERT INTO ai_request_trace
    (id, uuid, tenant_id, organization_id, user_id, request_id, trace_id, status, attempt_no,
     api_key_id, api_key_name_snapshot, channel_group_id, channel_group_snapshot,
     owner_type, owner_id, channel_id, channel_name_snapshot, requested_model,
     requested_model_catalog_key, provider_model, provider_native_model,
     gateway_instance_id, gateway_instance_code_snapshot, gateway_region_code_snapshot,
     gateway_node_name_snapshot,
     region_code, endpoint, request_path, http_method, http_status, started_at, ended_at, streaming,
     prompt_tokens, cached_tokens, completion_tokens, total_tokens, latency_ms, ttft_ms,
     provider_error_code, error_type, error_message_masked, metadata, user_agent_hash)
VALUES
    ($1, $2, $3, $4, $5, $6, $7, 1, 1, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
     $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
     to_timestamp($29::double precision / 1000.0),
     to_timestamp($30::double precision / 1000.0),
     $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41::jsonb, $42)
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
    gateway_instance_id = COALESCE(ai_request_trace.gateway_instance_id, excluded.gateway_instance_id),
    gateway_instance_code_snapshot = COALESCE(ai_request_trace.gateway_instance_code_snapshot, excluded.gateway_instance_code_snapshot),
    gateway_region_code_snapshot = COALESCE(ai_request_trace.gateway_region_code_snapshot, excluded.gateway_region_code_snapshot),
    gateway_node_name_snapshot = COALESCE(ai_request_trace.gateway_node_name_snapshot, excluded.gateway_node_name_snapshot),
    region_code = excluded.region_code,
    endpoint = excluded.endpoint,
    request_path = excluded.request_path,
    http_method = excluded.http_method,
    http_status = excluded.http_status,
    ended_at = excluded.ended_at,
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
      AND settled_usage.settlement_status IS DISTINCT FROM 0
)
"#;

const UPSERT_USAGE_FACT: &str = r#"
INSERT INTO ai_usage
    (id, uuid, tenant_id, organization_id, user_id, request_id, trace_id, status,
     api_key_id, api_key_name_snapshot, channel_group_id, channel_group_snapshot,
     owner_type, owner_id, catalog_key, requested_model_catalog_key, model, provider_native_model,
     region_code, channel_id, modality, usage_type, billing_meter_code,
     billable_quantity, prompt_tokens, cached_tokens, completion_tokens, total_tokens,
     request_count, result_count, item_count, character_count, image_count,
     audio_seconds, video_seconds, base_input_unit_price,
     base_output_unit_price, cache_read_unit_price, rate_multiplier, reference_multiplier,
     official_reference_amount, upstream_cost_amount, customer_charge_amount,
     currency, pricing_plan_code, pricing_snapshot, occurred_at, settlement_status, idempotency_key)
VALUES
    ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
     $18, $19, $20, $21, $22, $23::numeric, $24, $25, $26, $27, $28, $29, $30, $31, $32,
     $33::numeric, $34::numeric, $35::numeric, $36::numeric, $37::numeric, $38::numeric,
     $39::numeric, $40::numeric, $41::numeric, $42::numeric,
     $43, $44, $45::jsonb, to_timestamp($46::double precision / 1000.0), $47, $48)
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
    base_input_unit_price = excluded.base_input_unit_price,
    base_output_unit_price = excluded.base_output_unit_price,
    cache_read_unit_price = excluded.cache_read_unit_price,
    rate_multiplier = excluded.rate_multiplier,
    reference_multiplier = excluded.reference_multiplier,
    official_reference_amount = excluded.official_reference_amount,
    upstream_cost_amount = excluded.upstream_cost_amount,
    customer_charge_amount = excluded.customer_charge_amount,
    currency = excluded.currency,
    pricing_plan_code = excluded.pricing_plan_code,
    pricing_snapshot = excluded.pricing_snapshot,
    idempotency_key = excluded.idempotency_key,
    occurred_at = excluded.occurred_at,
    settlement_status = excluded.settlement_status
WHERE ai_usage.settlement_status = 0
"#;

#[derive(Debug, Clone)]
pub struct PostgresGatewayUsageRecorder {
    pool: PgPool,
    attribution: GatewayTraceAttribution,
}

impl PostgresGatewayUsageRecorder {
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            attribution: GatewayTraceAttribution::default(),
        }
    }

    pub fn new_with_attribution(pool: PgPool, attribution: GatewayTraceAttribution) -> Self {
        Self { pool, attribution }
    }
}

impl GatewayUsageRecorder for PostgresGatewayUsageRecorder {
    fn record_gateway_trace<'a>(
        &'a self,
        command: GatewayRequestTraceCommand,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async move {
            let context = GatewayAccountingRecordContext::from_trace(
                &command,
                self.attribution.clone(),
                current_epoch_millis(),
            )?;
            self.record_gateway_trace_with_context(command, context)
                .await
        })
    }

    fn record_gateway_usage<'a>(
        &'a self,
        command: GatewayUsageRecordCommand,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async move {
            let context = GatewayAccountingRecordContext::from_usage(
                &command,
                self.attribution.clone(),
                current_epoch_millis(),
            )?;
            self.record_gateway_usage_with_context(command, context)
                .await
        })
    }

    fn record_gateway_trace_with_context<'a>(
        &'a self,
        command: GatewayRequestTraceCommand,
        context: GatewayAccountingRecordContext,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async move {
            command.validate()?;
            context.validate()?;
            let mut connection = self.pool.acquire().await.map_err(|error| {
                store_error("failed to acquire gateway trace connection", error)
            })?;
            upsert_trace(&mut connection, &command, &context).await?;
            Ok(())
        })
    }

    fn record_gateway_usage_with_context<'a>(
        &'a self,
        command: GatewayUsageRecordCommand,
        context: GatewayAccountingRecordContext,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async move {
            command.validate()?;
            context.validate()?;
            let trace_command = command.trace_command();
            let mut transaction =
                self.pool.begin().await.map_err(|error| {
                    store_error("failed to begin gateway usage transaction", error)
                })?;
            upsert_trace(&mut transaction, &trace_command, &context).await?;
            upsert_usage_fact(&mut transaction, &command, &context).await?;
            transaction.commit().await.map_err(|error| {
                store_error("failed to commit gateway usage transaction", error)
            })?;
            Ok(())
        })
    }
}

async fn upsert_trace(
    connection: &mut PgConnection,
    command: &GatewayRequestTraceCommand,
    context: &GatewayAccountingRecordContext,
) -> Result<(), DomainError> {
    let metadata = trace_metadata_json();
    let attribution = &context.attribution;
    sqlx::query(UPSERT_TRACE)
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
        .bind(&command.provider_model)
        .bind(&command.provider_native_model)
        .bind(attribution.gateway_instance_id)
        .bind(attribution.gateway_instance_code_snapshot.as_deref())
        .bind(attribution.gateway_region_code_snapshot.as_deref())
        .bind(attribution.gateway_node_name_snapshot.as_deref())
        .bind(&command.region_code)
        .bind(&command.request_path)
        .bind(&command.request_path)
        .bind(&command.http_method)
        .bind(command.http_status.map(i64::from))
        .bind(context.started_at_epoch_millis)
        .bind(context.ended_at_epoch_millis)
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
        .bind(context.user_agent_hash.as_deref())
        .execute(&mut *connection)
        .await
        .map_err(|error| store_error("failed to upsert gateway request trace", error))?;
    Ok(())
}

async fn upsert_usage_fact(
    connection: &mut PgConnection,
    command: &GatewayUsageRecordCommand,
    context: &GatewayAccountingRecordContext,
) -> Result<(), DomainError> {
    sqlx::query(UPSERT_USAGE_FACT)
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
        .bind(&command.base_output_unit_price)
        .bind(&command.cache_read_unit_price)
        .bind(&command.rate_multiplier)
        .bind(&command.reference_multiplier)
        .bind(&command.official_reference_amount)
        .bind(&command.upstream_cost_amount)
        .bind(&command.customer_charge_amount)
        .bind(&command.currency)
        .bind(&command.pricing_plan_code)
        .bind(&command.pricing_snapshot)
        .bind(context.ended_at_epoch_millis)
        .bind(SETTLEMENT_PENDING)
        .bind(usage_idempotency_key(command))
        .execute(&mut *connection)
        .await
        .map_err(|error| store_error("failed to upsert gateway usage fact", error))?;
    Ok(())
}

fn trace_uuid(command: &GatewayRequestTraceCommand) -> String {
    stable_uuid(
        "trace",
        "trace-uuid:v1",
        command.tenant_id,
        command.organization_id,
        &command.request_id,
        None,
    )
}

fn usage_uuid(command: &GatewayUsageRecordCommand) -> String {
    stable_uuid(
        "usage",
        "usage-uuid:v1",
        command.tenant_id,
        command.organization_id,
        &command.request_id,
        Some(command.usage_type),
    )
}

fn usage_idempotency_key(command: &GatewayUsageRecordCommand) -> String {
    format!(
        "usage:v1:{}",
        stable_identity_digest(
            "usage-idempotency:v1",
            command.tenant_id,
            command.organization_id,
            &command.request_id,
            Some(command.usage_type),
        )
    )
}

fn trace_metadata_json() -> String {
    // User-Agent is sensitive telemetry. Keep only the separately hashed value
    // in user_agent_hash and leave the extension metadata object empty.
    "{}".to_owned()
}

fn current_epoch_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .try_into()
        .unwrap_or(i64::MAX)
}

fn stable_uuid(
    prefix: &str,
    namespace: &str,
    tenant_id: i64,
    organization_id: i64,
    request_id: &str,
    discriminator: Option<i64>,
) -> String {
    let digest = stable_identity_digest(
        namespace,
        tenant_id,
        organization_id,
        request_id,
        discriminator,
    );
    format!("{prefix}-{}", &digest[..58])
}

fn stable_identity_digest(
    namespace: &str,
    tenant_id: i64,
    organization_id: i64,
    request_id: &str,
    discriminator: Option<i64>,
) -> String {
    let tenant_id = tenant_id.to_string();
    let organization_id = organization_id.to_string();
    let discriminator = discriminator.map(|value| value.to_string());
    let mut hasher = Sha256::new();
    for value in [
        namespace.as_bytes(),
        tenant_id.as_bytes(),
        organization_id.as_bytes(),
        request_id.as_bytes(),
    ] {
        update_identity_component(&mut hasher, value);
    }
    if let Some(discriminator) = discriminator.as_deref() {
        update_identity_component(&mut hasher, discriminator.as_bytes());
    }
    hex::encode(hasher.finalize())
}

fn update_identity_component(hasher: &mut Sha256, value: &[u8]) {
    hasher.update((value.len() as u64).to_be_bytes());
    hasher.update(value);
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}
