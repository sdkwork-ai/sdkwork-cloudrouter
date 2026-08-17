use std::collections::BTreeMap;

use sha2::{Digest, Sha256};
use sqlx::{PgConnection, PgPool};

use crate::domain::{DecimalValue, DomainError};
use crate::infrastructure::sql::runtime_id::next_cloud_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    GatewayAccountingRecordContext, GatewayRequestTraceCommand, GatewayTraceAttribution,
    GatewayUsageRecordCommand, GatewayUsageRecordFuture, GatewayUsageRecorder,
};

const OWNER_TYPE_USER: i64 = 1;
const SETTLEMENT_PENDING: i64 = 0;

const UPSERT_TRACE: &str = r#"
INSERT INTO ai_metering_request_trace
    (id, uuid, tenant_id, organization_id, user_id, request_id, trace_id, status, attempt_no,
     api_key_id, api_key_name_snapshot, account_group_id, account_group_snapshot,
     owner_type, owner_id, account_id, account_name_snapshot, requested_model,
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
    account_group_id = excluded.account_group_id,
    account_group_snapshot = excluded.account_group_snapshot,
    owner_type = excluded.owner_type,
    owner_id = excluded.owner_id,
    account_id = excluded.account_id,
    account_name_snapshot = excluded.account_name_snapshot,
    requested_model = excluded.requested_model,
    requested_model_catalog_key = excluded.requested_model_catalog_key,
    provider_model = excluded.provider_model,
    provider_native_model = excluded.provider_native_model,
    gateway_instance_id = COALESCE(ai_metering_request_trace.gateway_instance_id, excluded.gateway_instance_id),
    gateway_instance_code_snapshot = COALESCE(ai_metering_request_trace.gateway_instance_code_snapshot, excluded.gateway_instance_code_snapshot),
    gateway_region_code_snapshot = COALESCE(ai_metering_request_trace.gateway_region_code_snapshot, excluded.gateway_region_code_snapshot),
    gateway_node_name_snapshot = COALESCE(ai_metering_request_trace.gateway_node_name_snapshot, excluded.gateway_node_name_snapshot),
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
    FROM ai_metering_usage settled_usage
    WHERE settled_usage.tenant_id = ai_metering_request_trace.tenant_id
      AND settled_usage.organization_id = ai_metering_request_trace.organization_id
      AND settled_usage.request_id = ai_metering_request_trace.request_id
      AND settled_usage.settlement_status IS DISTINCT FROM 0
)
"#;

const UPSERT_USAGE_FACT: &str = r#"
INSERT INTO ai_metering_usage
    (id, uuid, tenant_id, organization_id, user_id, request_id, trace_id, status,
     api_key_id, api_key_name_snapshot, account_group_id, account_group_snapshot,
     owner_type, owner_id, catalog_key, requested_model_catalog_key, model, provider_native_model,
     region_code, account_id, modality, usage_type, billing_meter_code,
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
    account_group_id = excluded.account_group_id,
    account_group_snapshot = excluded.account_group_snapshot,
    owner_type = excluded.owner_type,
    owner_id = excluded.owner_id,
    catalog_key = excluded.catalog_key,
    requested_model_catalog_key = excluded.requested_model_catalog_key,
    model = excluded.model,
    provider_native_model = excluded.provider_native_model,
    region_code = excluded.region_code,
    account_id = excluded.account_id,
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
WHERE ai_metering_usage.settlement_status = 0
"#;

const UPSERT_USAGE_MEASUREMENT: &str = r#"
INSERT INTO cloudrouter_usage_measurement
    (id, uuid, tenant_id, organization_id, user_id, request_id, trace_id,
     idempotency_key, status, metadata, invocation_id, measurement_key,
     api_key_id, account_id, product_code, operation_code, meter_code,
     vendor_code, provider_code, region_code, catalog_key, quantity, unit_code,
     measurement_source, dimensions_json, occurred_at)
VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9::jsonb, $10, $11, $12, $13,
     $14, $15, $16, $17, $18, $19, $20, $21::numeric, $22, $23, $24::jsonb,
     to_timestamp($25::double precision / 1000.0))
ON CONFLICT (tenant_id, organization_id, invocation_id, measurement_key)
DO UPDATE SET measurement_key = cloudrouter_usage_measurement.measurement_key
WHERE cloudrouter_usage_measurement.idempotency_key IS NOT DISTINCT FROM excluded.idempotency_key
  AND cloudrouter_usage_measurement.user_id IS NOT DISTINCT FROM excluded.user_id
  AND cloudrouter_usage_measurement.request_id IS NOT DISTINCT FROM excluded.request_id
  AND cloudrouter_usage_measurement.trace_id IS NOT DISTINCT FROM excluded.trace_id
  AND cloudrouter_usage_measurement.api_key_id IS NOT DISTINCT FROM excluded.api_key_id
  AND cloudrouter_usage_measurement.account_id IS NOT DISTINCT FROM excluded.account_id
  AND cloudrouter_usage_measurement.product_code = excluded.product_code
  AND cloudrouter_usage_measurement.operation_code = excluded.operation_code
  AND cloudrouter_usage_measurement.meter_code = excluded.meter_code
  AND cloudrouter_usage_measurement.vendor_code = excluded.vendor_code
  AND cloudrouter_usage_measurement.provider_code IS NOT DISTINCT FROM excluded.provider_code
  AND cloudrouter_usage_measurement.region_code IS NOT DISTINCT FROM excluded.region_code
  AND cloudrouter_usage_measurement.catalog_key IS NOT DISTINCT FROM excluded.catalog_key
  AND cloudrouter_usage_measurement.quantity = excluded.quantity
  AND cloudrouter_usage_measurement.unit_code = excluded.unit_code
  AND cloudrouter_usage_measurement.measurement_source = excluded.measurement_source
  AND cloudrouter_usage_measurement.dimensions_json = excluded.dimensions_json
  AND cloudrouter_usage_measurement.occurred_at = excluded.occurred_at
RETURNING id
"#;

const UPSERT_RATING_DECISION: &str = r#"
INSERT INTO cloudrouter_rating_decision
    (id, uuid, tenant_id, organization_id, user_id, request_id, trace_id,
     idempotency_key, status, metadata, invocation_id, measurement_id,
     decision_status, billability, reason_code, strategy_code, calculation_mode,
     charge_timing, quantity_aggregation, price_book_tenant_id,
     price_book_organization_id, price_book_id, rate_id,
     account_rate_card_tenant_id, account_rate_card_organization_id,
     account_rate_card_id, pricing_plan_tenant_id, pricing_plan_organization_id,
     pricing_plan_id, pricing_rule_id,
     measured_quantity, rated_quantity, unit_size, reference_unit_price,
     cost_unit_price, unit_price, reference_amount, cost_amount, amount,
     currency_code, billing_components, pricing_snapshot, decided_at)
VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9::jsonb, $10, $11, $12, $13,
     $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
     $27, $28, $29, $30::numeric, $31::numeric, $32::numeric, $33::numeric,
     $34::numeric, $35::numeric, $36::numeric, $37::numeric, $38::numeric, $39,
     $40::jsonb, $41::jsonb, to_timestamp($42::double precision / 1000.0))
ON CONFLICT (tenant_id, organization_id, measurement_id)
DO UPDATE SET measurement_id = cloudrouter_rating_decision.measurement_id
WHERE cloudrouter_rating_decision.idempotency_key IS NOT DISTINCT FROM excluded.idempotency_key
  AND cloudrouter_rating_decision.user_id IS NOT DISTINCT FROM excluded.user_id
  AND cloudrouter_rating_decision.request_id IS NOT DISTINCT FROM excluded.request_id
  AND cloudrouter_rating_decision.trace_id IS NOT DISTINCT FROM excluded.trace_id
  AND cloudrouter_rating_decision.invocation_id = excluded.invocation_id
  AND cloudrouter_rating_decision.decision_status = excluded.decision_status
  AND cloudrouter_rating_decision.billability = excluded.billability
  AND cloudrouter_rating_decision.reason_code = excluded.reason_code
  AND cloudrouter_rating_decision.strategy_code IS NOT DISTINCT FROM excluded.strategy_code
  AND cloudrouter_rating_decision.calculation_mode IS NOT DISTINCT FROM excluded.calculation_mode
  AND cloudrouter_rating_decision.charge_timing IS NOT DISTINCT FROM excluded.charge_timing
  AND cloudrouter_rating_decision.quantity_aggregation IS NOT DISTINCT FROM excluded.quantity_aggregation
  AND cloudrouter_rating_decision.price_book_tenant_id IS NOT DISTINCT FROM excluded.price_book_tenant_id
  AND cloudrouter_rating_decision.price_book_organization_id IS NOT DISTINCT FROM excluded.price_book_organization_id
  AND cloudrouter_rating_decision.price_book_id IS NOT DISTINCT FROM excluded.price_book_id
  AND cloudrouter_rating_decision.rate_id IS NOT DISTINCT FROM excluded.rate_id
  AND cloudrouter_rating_decision.account_rate_card_tenant_id IS NOT DISTINCT FROM excluded.account_rate_card_tenant_id
  AND cloudrouter_rating_decision.account_rate_card_organization_id IS NOT DISTINCT FROM excluded.account_rate_card_organization_id
  AND cloudrouter_rating_decision.account_rate_card_id IS NOT DISTINCT FROM excluded.account_rate_card_id
  AND cloudrouter_rating_decision.pricing_plan_tenant_id IS NOT DISTINCT FROM excluded.pricing_plan_tenant_id
  AND cloudrouter_rating_decision.pricing_plan_organization_id IS NOT DISTINCT FROM excluded.pricing_plan_organization_id
  AND cloudrouter_rating_decision.pricing_plan_id IS NOT DISTINCT FROM excluded.pricing_plan_id
  AND cloudrouter_rating_decision.pricing_rule_id IS NOT DISTINCT FROM excluded.pricing_rule_id
  AND cloudrouter_rating_decision.measured_quantity = excluded.measured_quantity
  AND cloudrouter_rating_decision.rated_quantity = excluded.rated_quantity
  AND cloudrouter_rating_decision.unit_size IS NOT DISTINCT FROM excluded.unit_size
  AND cloudrouter_rating_decision.reference_unit_price IS NOT DISTINCT FROM excluded.reference_unit_price
  AND cloudrouter_rating_decision.cost_unit_price IS NOT DISTINCT FROM excluded.cost_unit_price
  AND cloudrouter_rating_decision.unit_price IS NOT DISTINCT FROM excluded.unit_price
  AND cloudrouter_rating_decision.reference_amount IS NOT DISTINCT FROM excluded.reference_amount
  AND cloudrouter_rating_decision.cost_amount IS NOT DISTINCT FROM excluded.cost_amount
  AND cloudrouter_rating_decision.amount IS NOT DISTINCT FROM excluded.amount
  AND cloudrouter_rating_decision.currency_code IS NOT DISTINCT FROM excluded.currency_code
  AND cloudrouter_rating_decision.billing_components = excluded.billing_components
  AND cloudrouter_rating_decision.pricing_snapshot = excluded.pricing_snapshot
RETURNING id, decision_status, billability
"#;

const UPSERT_CHARGE_LINE: &str = r#"
INSERT INTO cloudrouter_charge_line
    (id, uuid, tenant_id, organization_id, user_id, request_id, trace_id,
     idempotency_key, status, metadata, invocation_id, rating_decision_id,
     account_id, charge_status, product_code, operation_code, meter_code,
     quantity, reference_amount, cost_amount, amount, currency_code, charged_at)
VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9::jsonb, $10, $11, $12, $13,
     $14, $15, $16, $17::numeric, $18::numeric, $19::numeric, $20::numeric,
     $21, to_timestamp($22::double precision / 1000.0))
ON CONFLICT (tenant_id, organization_id, rating_decision_id)
DO UPDATE SET charge_status = cloudrouter_charge_line.charge_status
WHERE cloudrouter_charge_line.idempotency_key IS NOT DISTINCT FROM excluded.idempotency_key
  AND cloudrouter_charge_line.user_id IS NOT DISTINCT FROM excluded.user_id
  AND cloudrouter_charge_line.request_id IS NOT DISTINCT FROM excluded.request_id
  AND cloudrouter_charge_line.trace_id IS NOT DISTINCT FROM excluded.trace_id
  AND cloudrouter_charge_line.invocation_id = excluded.invocation_id
  AND cloudrouter_charge_line.account_id IS NOT DISTINCT FROM excluded.account_id
  AND cloudrouter_charge_line.product_code = excluded.product_code
  AND cloudrouter_charge_line.operation_code = excluded.operation_code
  AND cloudrouter_charge_line.meter_code = excluded.meter_code
  AND cloudrouter_charge_line.quantity = excluded.quantity
  AND cloudrouter_charge_line.reference_amount = excluded.reference_amount
  AND cloudrouter_charge_line.cost_amount = excluded.cost_amount
  AND cloudrouter_charge_line.amount = excluded.amount
  AND cloudrouter_charge_line.currency_code = excluded.currency_code
  AND cloudrouter_charge_line.charged_at = excluded.charged_at
"#;

const LOAD_OFFICIAL_RATE_IDENTITY: &str = r#"
SELECT
    book.tenant_id AS price_book_tenant_id,
    book.organization_id AS price_book_organization_id,
    book.id AS price_book_id,
    rate.id AS rate_id,
    rate.unit_size::text AS unit_size,
    rate.unit_price::text AS unit_price,
    rate.currency_code
FROM pricing_price_book book
JOIN pricing_rate rate
  ON rate.tenant_id = book.tenant_id
 AND rate.organization_id = book.organization_id
 AND rate.price_book_id = book.id
WHERE book.tenant_id = $1
  AND book.organization_id = $2
  AND book.id = $3
  AND rate.id = $4
  AND book.price_book_code = $5
  AND book.lifecycle_state IN ('active', 'retired')
  AND book.status = 1
  AND book.deleted_at IS NULL
  AND rate.rate_hash = $6
  AND rate.product_code = $7
  AND rate.operation_code = $8
  AND rate.meter_code = $9
  AND rate.catalog_key = $10
  AND book.vendor_code = $11
  AND book.region_code = $14
  AND rate.vendor_code = $11
  AND rate.provider_code = $12
  AND (rate.account_id IS NULL OR rate.account_id = $13)
  AND rate.region_code = $14
  AND rate.billability = $15
  AND rate.charge_timing = $16
  AND rate.calculation_mode = $17
  AND rate.quantity_aggregation = $18
  AND rate.conditions = $19::jsonb
  AND rate.status = 1
  AND rate.deleted_at IS NULL
  AND book.effective_from <= to_timestamp($20::double precision / 1000.0)
  AND (book.effective_to IS NULL OR book.effective_to > to_timestamp($20::double precision / 1000.0))
  AND rate.effective_from <= to_timestamp($20::double precision / 1000.0)
  AND (rate.effective_to IS NULL OR rate.effective_to > to_timestamp($20::double precision / 1000.0))
"#;

const LOAD_PRICING_POLICY_IDENTITY: &str = r#"
SELECT
    rate_card.tenant_id AS account_rate_card_tenant_id,
    rate_card.organization_id AS account_rate_card_organization_id,
    rate_card.id AS account_rate_card_id,
    plan.tenant_id AS pricing_plan_tenant_id,
    plan.organization_id AS pricing_plan_organization_id,
    plan.id AS pricing_plan_id,
    rule.id AS pricing_rule_id,
    rule.formula_mode,
    rule.multiplier::text AS multiplier,
    rule.markup_amount::text AS markup_amount,
    rule.unit_price_override::text AS unit_price_override,
    plan.currency_code
FROM cloudrouter_account_rate_card rate_card
JOIN cloudrouter_pricing_plan plan
  ON plan.tenant_id = rate_card.pricing_plan_tenant_id
 AND plan.organization_id = rate_card.pricing_plan_organization_id
 AND plan.id = rate_card.pricing_plan_id
JOIN cloudrouter_pricing_rule rule
  ON rule.tenant_id = plan.tenant_id
 AND rule.organization_id = plan.organization_id
 AND rule.pricing_plan_id = plan.id
WHERE rate_card.tenant_id = $1
  AND rate_card.organization_id = $2
  AND rate_card.id = $3
  AND plan.tenant_id = $4
  AND plan.organization_id = $5
  AND plan.id = $6
  AND plan.plan_code = $7
  AND rule.tenant_id = $8
  AND rule.organization_id = $9
  AND rule.id = $10
  AND rate_card.status = 1
  AND rate_card.deleted_at IS NULL
  AND rate_card.effective_from <= to_timestamp($11::double precision / 1000.0)
  AND (rate_card.effective_to IS NULL OR rate_card.effective_to > to_timestamp($11::double precision / 1000.0))
  AND plan.status = 1
  AND plan.deleted_at IS NULL
  AND plan.effective_from <= to_timestamp($11::double precision / 1000.0)
  AND (plan.effective_to IS NULL OR plan.effective_to > to_timestamp($11::double precision / 1000.0))
  AND rule.status = 1
  AND rule.deleted_at IS NULL
  AND rule.effective_from <= to_timestamp($11::double precision / 1000.0)
  AND (rule.effective_to IS NULL OR rule.effective_to > to_timestamp($11::double precision / 1000.0))
"#;

#[derive(Debug, sqlx::FromRow)]
struct ActiveOfficialRateRow {
    price_book_tenant_id: i64,
    price_book_organization_id: i64,
    price_book_id: i64,
    rate_id: i64,
    unit_size: String,
    unit_price: String,
    currency_code: String,
}

#[derive(Debug, sqlx::FromRow)]
struct ActivePricingPlanRow {
    account_rate_card_tenant_id: i64,
    account_rate_card_organization_id: i64,
    account_rate_card_id: i64,
    pricing_plan_tenant_id: i64,
    pricing_plan_organization_id: i64,
    pricing_plan_id: i64,
    pricing_rule_id: i64,
    formula_mode: String,
    multiplier: String,
    markup_amount: String,
    unit_price_override: Option<String>,
    currency_code: String,
}

#[derive(Debug, sqlx::FromRow)]
struct PersistedRatingDecisionRow {
    id: i64,
    decision_status: String,
    billability: String,
}

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

    fn record_gateway_usage_batch<'a>(
        &'a self,
        commands: Vec<GatewayUsageRecordCommand>,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async move {
            if commands.is_empty() {
                return Ok(());
            }
            let recorded_at = current_epoch_millis();
            let mut records = Vec::with_capacity(commands.len());
            for command in commands {
                command.validate()?;
                let context = GatewayAccountingRecordContext::from_usage(
                    &command,
                    self.attribution.clone(),
                    recorded_at,
                )?;
                context.validate()?;
                records.push((command, context));
            }

            let mut transaction = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin gateway usage batch transaction", error)
            })?;
            for (trace_command, context) in aggregate_batch_traces(&records)? {
                upsert_trace(&mut transaction, &trace_command, &context).await?;
            }
            for (command, context) in &records {
                let chargeable = upsert_billing_ledger(&mut transaction, command, context).await?;
                if chargeable {
                    upsert_usage_fact(&mut transaction, command, context).await?;
                }
            }
            transaction.commit().await.map_err(|error| {
                store_error("failed to commit gateway usage batch transaction", error)
            })?;
            Ok(())
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
            let chargeable = upsert_billing_ledger(&mut transaction, &command, &context).await?;
            if chargeable {
                upsert_usage_fact(&mut transaction, &command, &context).await?;
            }
            transaction.commit().await.map_err(|error| {
                store_error("failed to commit gateway usage transaction", error)
            })?;
            Ok(())
        })
    }
}

fn aggregate_batch_traces(
    records: &[(GatewayUsageRecordCommand, GatewayAccountingRecordContext)],
) -> Result<Vec<(GatewayRequestTraceCommand, GatewayAccountingRecordContext)>, DomainError> {
    let mut traces = BTreeMap::<
        (i64, i64, String),
        (GatewayRequestTraceCommand, GatewayAccountingRecordContext),
    >::new();
    for (command, context) in records {
        let key = (
            command.tenant_id,
            command.organization_id,
            command.request_id.clone(),
        );
        let prompt_tokens = checked_trace_sum(
            "prompt_tokens",
            command.prompt_tokens,
            command.cached_tokens,
        )?;
        match traces.entry(key) {
            std::collections::btree_map::Entry::Vacant(entry) => {
                let mut trace = command.trace_command();
                trace.prompt_tokens = prompt_tokens;
                entry.insert((trace, context.clone()));
            }
            std::collections::btree_map::Entry::Occupied(mut entry) => {
                let trace = &mut entry.get_mut().0;
                trace.prompt_tokens =
                    checked_trace_sum("prompt_tokens", trace.prompt_tokens, prompt_tokens)?;
                trace.cached_tokens =
                    checked_trace_sum("cached_tokens", trace.cached_tokens, command.cached_tokens)?;
                trace.completion_tokens = checked_trace_sum(
                    "completion_tokens",
                    trace.completion_tokens,
                    command.completion_tokens,
                )?;
                trace.total_tokens =
                    checked_trace_sum("total_tokens", trace.total_tokens, command.total_tokens)?;
                trace.latency_ms = max_optional(trace.latency_ms, command.latency_ms);
                trace.ttft_ms = max_optional(trace.ttft_ms, command.ttft_ms);
                if trace.provider_error_code.is_none() {
                    trace.provider_error_code = command.provider_error_code.clone();
                }
                if trace.error_type.is_none() {
                    trace.error_type = command.error_type.clone();
                }
                if trace.error_message_masked.is_none() {
                    trace.error_message_masked = command.error_message_masked.clone();
                }
            }
        }
    }
    Ok(traces.into_values().collect())
}

fn checked_trace_sum(field: &str, left: i64, right: i64) -> Result<i64, DomainError> {
    left.checked_add(right).ok_or_else(|| {
        DomainError::new(format!(
            "gateway batch trace {field} exceeds supported integer range"
        ))
    })
}

fn max_optional(left: Option<i64>, right: Option<i64>) -> Option<i64> {
    match (left, right) {
        (Some(left), Some(right)) => Some(left.max(right)),
        (Some(value), None) | (None, Some(value)) => Some(value),
        (None, None) => None,
    }
}

async fn upsert_trace(
    connection: &mut PgConnection,
    command: &GatewayRequestTraceCommand,
    context: &GatewayAccountingRecordContext,
) -> Result<(), DomainError> {
    let metadata = trace_metadata_json(command);
    let attribution = &context.attribution;
    sqlx::query(UPSERT_TRACE)
        .bind(next_cloud_runtime_id("ai_metering_request_trace")?)
        .bind(trace_uuid(command))
        .bind(command.tenant_id)
        .bind(command.organization_id)
        .bind(command.user_id)
        .bind(&command.request_id)
        .bind(command.trace_id.as_deref())
        .bind(command.api_key_id)
        .bind(&command.api_key_name_snapshot)
        .bind(command.account_group_id)
        .bind(&command.upstream_account_group_snapshot)
        .bind(OWNER_TYPE_USER)
        .bind(command.user_id)
        .bind(command.account_id)
        .bind(Option::<&str>::None)
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
        .bind(next_cloud_runtime_id("ai_metering_usage")?)
        .bind(usage_uuid(command))
        .bind(command.tenant_id)
        .bind(command.organization_id)
        .bind(command.user_id)
        .bind(&command.request_id)
        .bind(command.trace_id.as_deref())
        .bind(command.api_key_id)
        .bind(&command.api_key_name_snapshot)
        .bind(command.account_group_id)
        .bind(&command.upstream_account_group_snapshot)
        .bind(OWNER_TYPE_USER)
        .bind(command.user_id)
        .bind(&command.catalog_key)
        .bind(&command.requested_model_catalog_key)
        .bind(&command.requested_model)
        .bind(&command.provider_native_model)
        .bind(&command.region_code)
        .bind(command.account_id)
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

async fn upsert_billing_ledger(
    connection: &mut PgConnection,
    command: &GatewayUsageRecordCommand,
    context: &GatewayAccountingRecordContext,
) -> Result<bool, DomainError> {
    let measurement_key = format!("{}:{}", command.billing_meter_code, command.usage_type);
    let product_code = ledger_product_code(command);
    let operation_code = ledger_operation_code(command);
    let unit_code = ledger_unit_code(&command.billing_meter_code);
    let dimensions = ledger_dimensions_json(command);
    let measurement_id = sqlx::query_scalar::<_, i64>(UPSERT_USAGE_MEASUREMENT)
        .bind(next_cloud_runtime_id("cloudrouter_usage_measurement")?)
        .bind(stable_uuid_for_usage(
            "meas",
            "billing-measurement-uuid:v1",
            command,
        ))
        .bind(command.tenant_id)
        .bind(command.organization_id)
        .bind(command.user_id)
        .bind(&command.request_id)
        .bind(command.trace_id.as_deref())
        .bind(ledger_idempotency_key("measurement", command))
        .bind(r#"{"source":"gateway_usage"}"#)
        .bind(&command.request_id)
        .bind(&measurement_key)
        .bind(command.api_key_id)
        .bind(command.account_id)
        .bind(&product_code)
        .bind(&operation_code)
        .bind(&command.billing_meter_code)
        .bind(bounded_code(catalog_vendor_code(&command.catalog_key), 64))
        .bind(bounded_code(&command.supplier_code, 64))
        .bind(bounded_code(&command.region_code, 64))
        .bind(&command.catalog_key)
        .bind(&command.billable_quantity)
        .bind(unit_code)
        .bind("provider_response")
        .bind(&dimensions)
        .bind(context.ended_at_epoch_millis)
        .fetch_optional(&mut *connection)
        .await
        .map_err(|error| store_error("failed to upsert cloudrouter usage measurement", error))?
        .ok_or_else(|| {
            idempotency_conflict(command, "usage measurement payload changed during replay")
        })?;

    let resolved_official_rate = load_official_rate_identity(connection, command, context).await?;
    let resolved_pricing_plan = load_pricing_policy_identity(connection, command, context).await?;
    validate_resolved_identities(
        command,
        resolved_official_rate.as_ref(),
        resolved_pricing_plan.as_ref(),
    )?;

    let rated = command.decision_status == "rated" && command.billability == "chargeable";
    let charge_amount = DecimalValue::parse(&command.customer_charge_amount)?;
    let creates_charge_line = rated && charge_amount > DecimalValue::ZERO;
    let reference = command.official_rate.as_ref();
    let reference_unit_price = rated
        .then(|| reference.map(|rate| rate.rated_reference_unit_price.as_str()))
        .flatten();
    let cost_unit_price = rated
        .then(|| reference.and_then(|rate| rate.rated_procurement_unit_price.as_deref()))
        .flatten();
    let unit_price = rated
        .then(|| reference.map(|rate| rate.rated_unit_price.as_str()))
        .flatten();
    let reference_amount = rated.then_some(command.official_reference_amount.as_str());
    let cost_amount = rated.then_some(command.upstream_cost_amount.as_str());
    let amount = rated.then_some(command.customer_charge_amount.as_str());
    let currency = rated.then_some(command.currency.as_str());
    let rating_metadata = serde_json::json!({
        "engine": "price-service",
        "priceBookCode": command
            .official_rate
            .as_ref()
            .map(|rate| rate.price_book_code.as_str()),
        "rateHash": command
            .official_rate
            .as_ref()
            .map(|rate| rate.rate_hash.as_str()),
        "pricingPlanCode": command.pricing_plan_code.as_str(),
        "decisionStatus": command.decision_status.as_str(),
        "reasonCode": command.reason_code.as_str(),
    })
    .to_string();
    let rating_decision = sqlx::query_as::<_, PersistedRatingDecisionRow>(UPSERT_RATING_DECISION)
        .bind(next_cloud_runtime_id("cloudrouter_rating_decision")?)
        .bind(stable_uuid_for_usage(
            "rate",
            "billing-rating-uuid:v1",
            command,
        ))
        .bind(command.tenant_id)
        .bind(command.organization_id)
        .bind(command.user_id)
        .bind(&command.request_id)
        .bind(command.trace_id.as_deref())
        .bind(ledger_idempotency_key("rating", command))
        .bind(&rating_metadata)
        .bind(&command.request_id)
        .bind(measurement_id)
        .bind(&command.decision_status)
        .bind(&command.billability)
        .bind(&command.reason_code)
        .bind(command.strategy_code.as_deref())
        .bind(reference.map(|rate| rate.calculation_mode.as_str()))
        .bind(reference.map(|rate| rate.charge_timing.as_str()))
        .bind(reference.map(|rate| rate.quantity_aggregation.as_str()))
        .bind(
            resolved_official_rate
                .as_ref()
                .map(|rate| rate.price_book_tenant_id),
        )
        .bind(
            resolved_official_rate
                .as_ref()
                .map(|rate| rate.price_book_organization_id),
        )
        .bind(
            resolved_official_rate
                .as_ref()
                .map(|rate| rate.price_book_id),
        )
        .bind(resolved_official_rate.as_ref().map(|rate| rate.rate_id))
        .bind(
            resolved_pricing_plan
                .as_ref()
                .map(|plan| plan.account_rate_card_tenant_id),
        )
        .bind(
            resolved_pricing_plan
                .as_ref()
                .map(|plan| plan.account_rate_card_organization_id),
        )
        .bind(
            resolved_pricing_plan
                .as_ref()
                .map(|plan| plan.account_rate_card_id),
        )
        .bind(
            resolved_pricing_plan
                .as_ref()
                .map(|plan| plan.pricing_plan_tenant_id),
        )
        .bind(
            resolved_pricing_plan
                .as_ref()
                .map(|plan| plan.pricing_plan_organization_id),
        )
        .bind(
            resolved_pricing_plan
                .as_ref()
                .map(|plan| plan.pricing_plan_id),
        )
        .bind(
            resolved_pricing_plan
                .as_ref()
                .map(|plan| plan.pricing_rule_id),
        )
        .bind(&command.billable_quantity)
        .bind(&command.rated_quantity)
        .bind(&command.unit_size)
        .bind(reference_unit_price)
        .bind(cost_unit_price)
        .bind(unit_price)
        .bind(reference_amount)
        .bind(cost_amount)
        .bind(amount)
        .bind(currency)
        .bind(&command.billing_components)
        .bind(&command.pricing_snapshot)
        .bind(context.ended_at_epoch_millis)
        .fetch_optional(&mut *connection)
        .await
        .map_err(|error| store_error("failed to upsert cloudrouter rating decision", error))?
        .ok_or_else(|| {
            idempotency_conflict(command, "rating decision payload changed during replay")
        })?;

    if !creates_charge_line
        || rating_decision.decision_status != "rated"
        || rating_decision.billability != "chargeable"
    {
        return Ok(false);
    }
    let charge_metadata = serde_json::json!({
        "source": "price-service",
        "priceBookId": resolved_official_rate.as_ref().map(|rate| rate.price_book_id),
        "rateId": resolved_official_rate.as_ref().map(|rate| rate.rate_id),
        "pricingPlanCode": command.pricing_plan_code.as_str(),
        "modality": command.modality,
    })
    .to_string();
    let charge_result = sqlx::query(UPSERT_CHARGE_LINE)
        .bind(next_cloud_runtime_id("cloudrouter_charge_line")?)
        .bind(stable_uuid_for_usage(
            "chrg",
            "billing-charge-uuid:v1",
            command,
        ))
        .bind(command.tenant_id)
        .bind(command.organization_id)
        .bind(command.user_id)
        .bind(&command.request_id)
        .bind(command.trace_id.as_deref())
        .bind(ledger_idempotency_key("charge", command))
        .bind(&charge_metadata)
        .bind(&command.request_id)
        .bind(rating_decision.id)
        .bind(command.account_id)
        .bind("rated")
        .bind(&product_code)
        .bind(&operation_code)
        .bind(&command.billing_meter_code)
        .bind(&command.rated_quantity)
        .bind(&command.official_reference_amount)
        .bind(&command.upstream_cost_amount)
        .bind(&command.customer_charge_amount)
        .bind(&command.currency)
        .bind(context.ended_at_epoch_millis)
        .execute(&mut *connection)
        .await
        .map_err(|error| store_error("failed to upsert cloudrouter charge line", error))?;
    if charge_result.rows_affected() != 1 {
        return Err(idempotency_conflict(
            command,
            "charge line payload changed during replay",
        ));
    }
    Ok(true)
}

async fn load_official_rate_identity(
    connection: &mut PgConnection,
    command: &GatewayUsageRecordCommand,
    context: &GatewayAccountingRecordContext,
) -> Result<Option<ActiveOfficialRateRow>, DomainError> {
    let Some(reference) = command.official_rate.as_ref() else {
        return Ok(None);
    };
    let identity = reference.record_identity.as_ref().ok_or_else(|| {
        pricing_identity_error(command, "official rate record identity is missing")
    })?;
    let conditions = serde_json::to_string(
        &reference
            .conditions
            .iter()
            .map(|condition| serde_json::json!({
                "dimensionCode": condition.dimension_code,
                "operatorCode": condition.operator_code,
                "value": condition.value,
            }))
            .collect::<Vec<_>>(),
    )
    .map_err(|error| {
        DomainError::new(format!(
            "failed to serialize official pricing conditions: {error}"
        ))
    })?;
    sqlx::query_as::<_, ActiveOfficialRateRow>(LOAD_OFFICIAL_RATE_IDENTITY)
        .bind(identity.price_book_tenant_id)
        .bind(identity.price_book_organization_id)
        .bind(identity.price_book_id)
        .bind(identity.rate_id)
        .bind(&reference.price_book_code)
        .bind(&reference.rate_hash)
        .bind(&reference.product_code)
        .bind(&reference.operation_code)
        .bind(&command.billing_meter_code)
        .bind(&command.catalog_key)
        .bind(catalog_vendor_code(&command.catalog_key))
        .bind(&command.supplier_code)
        .bind(command.account_id)
        .bind(&command.region_code)
        .bind(&reference.billability)
        .bind(&reference.charge_timing)
        .bind(&reference.calculation_mode)
        .bind(&reference.quantity_aggregation)
        .bind(&conditions)
        .bind(context.ended_at_epoch_millis)
        .fetch_optional(&mut *connection)
        .await
        .map_err(|error| store_error("failed to resolve active official pricing rate", error))
}

async fn load_pricing_policy_identity(
    connection: &mut PgConnection,
    command: &GatewayUsageRecordCommand,
    context: &GatewayAccountingRecordContext,
) -> Result<Option<ActivePricingPlanRow>, DomainError> {
    if command.pricing_plan_code.trim().is_empty() {
        return Ok(None);
    }
    let identity = command
        .official_rate
        .as_ref()
        .and_then(|reference| reference.record_identity.as_ref())
        .ok_or_else(|| pricing_identity_error(command, "pricing policy record identity is missing"))?;
    sqlx::query_as::<_, ActivePricingPlanRow>(LOAD_PRICING_POLICY_IDENTITY)
        .bind(identity.account_rate_card_tenant_id)
        .bind(identity.account_rate_card_organization_id)
        .bind(identity.account_rate_card_id)
        .bind(identity.pricing_plan_tenant_id)
        .bind(identity.pricing_plan_organization_id)
        .bind(identity.pricing_plan_id)
        .bind(&command.pricing_plan_code)
        .bind(identity.pricing_rule_tenant_id)
        .bind(identity.pricing_rule_organization_id)
        .bind(identity.pricing_rule_id)
        .bind(context.ended_at_epoch_millis)
        .fetch_optional(&mut *connection)
        .await
        .map_err(|error| store_error("failed to resolve active pricing plan", error))
}

fn validate_resolved_identities(
    command: &GatewayUsageRecordCommand,
    resolved_official_rate: Option<&ActiveOfficialRateRow>,
    pricing_plan: Option<&ActivePricingPlanRow>,
) -> Result<(), DomainError> {
    match (command.official_rate.as_ref(), resolved_official_rate) {
        (None, None) => {}
        (Some(_), None) => {
            return Err(pricing_identity_error(
                command,
                "official rate identity was not found at the original occurrence time",
            ));
        }
        (None, Some(_)) => {
            return Err(pricing_identity_error(
                command,
                "recorder resolved an official rate without a command identity",
            ));
        }
        (Some(reference), Some(resolved)) => {
            let official_unit_size = DecimalValue::parse(&reference.unit_size)?;
            let resolved_unit_size = DecimalValue::parse(&resolved.unit_size)?;
            let official_unit_price = DecimalValue::parse(&reference.unit_price)?;
            let resolved_unit_price = DecimalValue::parse(&resolved.unit_price)?;
            if official_unit_size != resolved_unit_size
                || official_unit_price != resolved_unit_price
                || !resolved
                    .currency_code
                    .eq_ignore_ascii_case(&command.currency)
            {
                return Err(pricing_identity_error(
                    command,
                    "official rate snapshot does not match the persisted rate identity",
                ));
            }
        }
    }

    if command.pricing_plan_code.trim().is_empty() {
        if pricing_plan.is_some() {
            return Err(pricing_identity_error(
                command,
                "recorder resolved a pricing plan without a command plan code",
            ));
        }
        return Ok(());
    }
    let pricing_plan = pricing_plan.ok_or_else(|| {
        pricing_identity_error(
            command,
            "pricing plan identity was not found at the original occurrence time",
        )
    })?;
    if !pricing_plan
        .currency_code
        .eq_ignore_ascii_case(&command.currency)
    {
        return Err(pricing_identity_error(
            command,
            "pricing plan currency does not match the PriceService decision",
        ));
    }
    let reference = command.official_rate.as_ref().ok_or_else(|| {
        pricing_identity_error(
            command,
            "pricing plan validation requires an official rate identity",
        )
    })?;
    let official_unit_price = DecimalValue::parse(&reference.unit_price)?;
    let plan_unit_price = DecimalValue::parse(&reference.plan_unit_price)?;
    let rule_unit_price = match pricing_plan.formula_mode.as_str() {
        "unit_price_override" => {
            DecimalValue::parse(pricing_plan.unit_price_override.as_deref().ok_or_else(|| {
                pricing_identity_error(command, "unit price override rule has no override value")
            })?)?
        }
        "multiplier_markup" => official_unit_price
            .checked_multiply(DecimalValue::parse(&pricing_plan.multiplier)?)?
            .checked_add(DecimalValue::parse(&pricing_plan.markup_amount)?)?,
        _ => {
            return Err(pricing_identity_error(
                command,
                "pricing rule formula mode is unsupported",
            ));
        }
    };
    if plan_unit_price != rule_unit_price {
        return Err(pricing_identity_error(
            command,
            "pricing rule snapshot does not match the PriceService decision",
        ));
    }
    Ok(())
}

fn pricing_identity_error(command: &GatewayUsageRecordCommand, message: &str) -> DomainError {
    DomainError::new(format!(
        "pricing identity validation failed for request {} meter {}: {message}",
        command.request_id, command.billing_meter_code
    ))
}

fn idempotency_conflict(command: &GatewayUsageRecordCommand, message: &str) -> DomainError {
    DomainError::new(format!(
        "gateway usage idempotency conflict for request {} meter {} usage type {}: {message}",
        command.request_id, command.billing_meter_code, command.usage_type
    ))
}

fn catalog_vendor_code(catalog_key: &str) -> &str {
    catalog_key
        .split_once('/')
        .map(|(vendor_code, _)| vendor_code)
        .unwrap_or(catalog_key)
        .trim()
}

fn ledger_product_code(command: &GatewayUsageRecordCommand) -> String {
    command
        .official_rate
        .as_ref()
        .map(|rate| bounded_code(&rate.product_code, 160))
        .or_else(|| {
            pricing_snapshot_text(command, "/pricing/productCode")
                .map(|value| bounded_code(&value, 160))
        })
        .unwrap_or_else(|| bounded_code(&command.catalog_key, 160))
}

fn ledger_operation_code(command: &GatewayUsageRecordCommand) -> String {
    command
        .official_rate
        .as_ref()
        .map(|rate| bounded_code(&rate.operation_code, 160))
        .or_else(|| pricing_snapshot_text(command, "/pricing/operationCode"))
        .or_else(|| pricing_snapshot_text(command, "/invocation/apiCode"))
        .map(|value| bounded_code(&value, 160))
        .unwrap_or_else(|| bounded_code(&command.request_path, 160))
}

fn pricing_snapshot_text(command: &GatewayUsageRecordCommand, pointer: &str) -> Option<String> {
    serde_json::from_str::<serde_json::Value>(&command.pricing_snapshot)
        .ok()?
        .pointer(pointer)?
        .as_str()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

fn bounded_code(value: &str, max_characters: usize) -> String {
    if value.chars().count() <= max_characters {
        return value.to_owned();
    }
    let digest = hex::encode(Sha256::digest(value.as_bytes()));
    format!("hash:{}", &digest[..max_characters.saturating_sub(5)])
}

fn ledger_unit_code(meter_code: &str) -> &'static str {
    match meter_code {
        "llm_input_token"
        | "llm_output_token"
        | "llm_reasoning_token"
        | "llm_cache_write_token"
        | "llm_cache_read_token"
        | "llm_cache_storage_token_hour"
        | "embedding_input_token"
        | "image_input_token"
        | "image_output_token"
        | "audio_input_token"
        | "audio_output_token"
        | "video_input_token"
        | "video_output_token" => "token",
        "api_request"
        | "tool_call"
        | "web_search_call"
        | "file_search_call"
        | "code_interpreter_session"
        | "container_session" => "request",
        "image_result" | "embedding_image" => "image",
        "video_result" | "api_result" | "sfx_result" => "result",
        "api_item" | "rerank_search" | "rerank_document" => "item",
        "tts_input_character" | "speech_character" => "character",
        "audio_input_second"
        | "audio_output_second"
        | "music_output_second"
        | "video_input_second"
        | "video_output_second" => "second",
        "audio_input_minute" | "audio_output_minute" | "stt_audio_minute" => "minute",
        "image_pixel" => "pixel",
        "image_megapixel" => "megapixel",
        "storage_gb_day" => "gb_day",
        "bandwidth_gb" => "gb",
        _ => "unit",
    }
}

fn ledger_dimensions_json(command: &GatewayUsageRecordCommand) -> String {
    serde_json::json!({
        "modality": command.modality,
        "usageType": command.usage_type,
        "requestCount": command.request_count,
        "resultCount": command.result_count,
        "itemCount": command.item_count,
        "characterCount": command.character_count,
        "imageCount": command.image_count,
        "audioSeconds": command.audio_seconds.as_deref(),
        "videoSeconds": command.video_seconds.as_deref(),
        "promptTokens": command.prompt_tokens,
        "completionTokens": command.completion_tokens,
        "cachedTokens": command.cached_tokens,
        "totalTokens": command.total_tokens,
    })
    .to_string()
}

fn stable_uuid_for_usage(
    prefix: &str,
    namespace: &str,
    command: &GatewayUsageRecordCommand,
) -> String {
    stable_uuid(
        prefix,
        namespace,
        command.tenant_id,
        command.organization_id,
        &command.request_id,
        Some(command.usage_type),
    )
}

fn ledger_idempotency_key(kind: &str, command: &GatewayUsageRecordCommand) -> String {
    format!(
        "{kind}:v1:{}",
        stable_identity_digest(
            "billing-ledger-idempotency:v1",
            command.tenant_id,
            command.organization_id,
            &command.request_id,
            Some(command.usage_type),
        )
    )
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

fn trace_metadata_json(command: &GatewayRequestTraceCommand) -> String {
    // User-Agent is sensitive telemetry. Keep only the separately hashed value
    // in user_agent_hash. Supplier code is non-secret routing attribution.
    serde_json::json!({ "supplierCode": command.supplier_code }).to_string()
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
