use serde_json::{json, Value};

use super::{
    BillingMode, BillingQuantitySource, Invocation, InvocationError, InvocationErrorKind,
    InvocationFuture, InvocationInterceptor, InvocationPricingQuote, InvocationUsageLine,
    InvocationUsageLineRole,
};
use crate::application::{GatewayPricingDecision, PriceResolution, PriceResolutionStatus};
use crate::domain::{provider_native_model_id, BillingMeter, DecimalValue, RoutingCapability};
use crate::ports::{
    allocate_request_debit_points, parse_recharge_settings_model, GatewayUsageQuantity,
    GatewayUsageRecordCommand,
};

// 10_000.. is reserved for provider-adapter usage lines. Keep the first
// occurrence of each legacy role at 1..5 for compatibility, and place
// additional lines in a disjoint deterministic range so request-scoped
// `(request_id, usage_type)` idempotency keys cannot overwrite one another.
const SETTLEMENT_UNIQUE_USAGE_TYPE_BASE: i64 = 20_000;
const SETTLEMENT_UNIQUE_USAGE_TYPE_STRIDE: i64 = 1_000_000;

#[derive(Debug, Clone, Default)]
pub struct PricingSettlementInterceptor;

impl InvocationInterceptor for PricingSettlementInterceptor {
    fn name(&self) -> &str {
        "pricing_settlement"
    }

    fn after<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            if !invocation.billing.settlement_required
                || invocation.billing.mode == BillingMode::Free
                || invocation.usage.lines.is_empty()
            {
                return Ok(());
            }

            invocation.usage.settlement_commands.clear();
            let mut commands = Vec::new();
            let request_count_line_index = request_count_line_index(&invocation.usage.lines);
            let mut seen_legacy_usage_types = [false; 6];
            for (line_index, line) in invocation.usage.lines.iter().enumerate() {
                let resolution = line.pricing_resolution.as_ref().ok_or_else(|| {
                    settlement_error(format!(
                        "settlement requires a pricing decision for meter {}",
                        line.meter.code()
                    ))
                })?;
                let quote = line
                    .pricing_quote
                    .as_ref()
                    .or_else(|| invocation.usage.quote_for_meter(&line.meter));
                let legacy_usage_type = legacy_usage_type_for_line(line);
                let legacy_usage_type_index = usize::try_from(legacy_usage_type)
                    .unwrap_or_default()
                    .min(seen_legacy_usage_types.len() - 1);
                let duplicate_role = seen_legacy_usage_types[legacy_usage_type_index];
                seen_legacy_usage_types[legacy_usage_type_index] = true;
                let usage_type = usage_type_for_line(line, line_index, duplicate_role);
                let mut command = match resolution.status {
                    PriceResolutionStatus::Rated => command_for_line(
                        invocation,
                        line,
                        quote.ok_or_else(|| {
                            settlement_error(format!(
                                "rated pricing decision requires a quote for meter {}",
                                line.meter.code()
                            ))
                        })?,
                        resolution,
                        usage_type,
                    )?,
                    _ => command_for_resolution(invocation, line, resolution, usage_type)?,
                };
                command.request_count = settlement_request_count(
                    invocation,
                    line,
                    line_index,
                    request_count_line_index,
                );
                commands.push(command);
            }
            // Distribute the request's Token Bank debit across chargeable
            // facts using the same cumulative-ceiling rule the wallet uses, so
            // a clean order of commands sums to the exact debited points. The
            // conversion uses the configured cash→Token-Bank exchange settings
            // stashed by `BillingTransactionInterceptor`, keeping the recorded
            // `debit_points` consistent with the wallet for every currency.
            let settings = invocation
                .charging
                .points_settings
                .clone()
                .or_else(|| parse_recharge_settings_model(None, None, None).ok());
            if let Some(settings) = settings {
                allocate_request_debit_points(&mut commands, &settings);
            }
            invocation.usage.settlement_commands = commands;
            Ok(())
        })
    }
}

fn request_count_line_index(lines: &[InvocationUsageLine]) -> Option<usize> {
    lines
        .iter()
        .position(|line| line.role == InvocationUsageLineRole::Request)
        .or_else(|| {
            lines
                .iter()
                .position(|line| line.quantity.request_count > 0)
        })
        .or_else(|| (!lines.is_empty()).then_some(0))
}

fn settlement_request_count(
    invocation: &Invocation,
    line: &InvocationUsageLine,
    line_index: usize,
    request_count_line_index: Option<usize>,
) -> i64 {
    if request_count_line_index != Some(line_index) {
        return 0;
    }
    if invocation.usage.request_count > 0 {
        return invocation.usage.request_count;
    }
    line.quantity.request_count.max(1)
}

fn command_for_line(
    invocation: &Invocation,
    line: &InvocationUsageLine,
    quote: &InvocationPricingQuote,
    resolution: &PriceResolution,
    usage_type: i64,
) -> Result<GatewayUsageRecordCommand, InvocationError> {
    let quantity = &line.quantity;
    let billing = resolution.billing.as_ref().ok_or_else(|| {
        settlement_error(format!(
            "settlement requires rated billing structure for meter {}",
            line.meter.code()
        ))
    })?;
    let measured_quantity = DecimalValue::parse(&quantity.billable_quantity)
        .map_err(|error| settlement_error(error.to_string()))?;
    if billing.meter != line.meter || billing.measured_quantity != measured_quantity {
        return Err(settlement_error(format!(
            "rated billing structure does not match usage line meter {} quantity {}",
            line.meter.code(),
            quantity.billable_quantity
        )));
    }
    let pricing = GatewayPricingDecision::from_resolution(resolution)
        .map_err(|error| settlement_error(error.to_string()))?;
    // The usage fact must carry the region that actually priced the request
    // (`quote.region_code` = the resolved official reference region, which
    // already folds in the admin default-billing-region override), not the
    // raw account routing region. The usage recorder validates the persisted
    // official rate with `rate.region_code = command.region_code`; stamping
    // the routing region (`global`) on a request priced by a `cn` regional
    // rate fails that validation and the usage fact never reaches the billing
    // ledger — silently rendering zero in the console usage statistics.
    command_from_pricing_decision(
        invocation,
        line,
        usage_type,
        quote.catalog_key.clone(),
        quote.requested_model.clone(),
        pricing_snapshot(invocation, line, quote),
        quote.region_code.clone(),
        pricing,
    )
}

fn command_for_resolution(
    invocation: &Invocation,
    line: &InvocationUsageLine,
    resolution: &PriceResolution,
    usage_type: i64,
) -> Result<GatewayUsageRecordCommand, InvocationError> {
    if matches!(
        resolution.status,
        PriceResolutionStatus::Quoted | PriceResolutionStatus::Rated
    ) {
        return Err(settlement_error(format!(
            "{} pricing decision for meter {} requires a rated quote",
            resolution.status.code(),
            line.meter.code()
        )));
    }

    let quote = resolution.resolved_price.as_ref().map(|_| {
        super::pricing::quote_from_resolution(
            invocation,
            resolution.clone(),
            line.requested_model_catalog_key.is_some(),
        )
    });
    let catalog_key = quote
        .as_ref()
        .map(|quote| quote.catalog_key.clone())
        .unwrap_or_else(|| resolution.audit_snapshot.resource.catalog_key.clone());
    let requested_model = quote
        .as_ref()
        .map(|quote| quote.requested_model.clone())
        .or_else(|| resolution.audit_snapshot.resource.model.clone())
        .unwrap_or_else(|| catalog_key.clone());
    let pricing_snapshot = quote
        .as_ref()
        .map(|quote| pricing_snapshot(invocation, line, quote))
        .unwrap_or_else(|| pricing_resolution_snapshot(invocation, line, resolution));
    let pricing = GatewayPricingDecision::from_resolution(resolution)
        .map_err(|error| settlement_error(error.to_string()))?;
    // Mirror `command_for_line`: quoted resolutions carry the priced region on
    // their quote. Unrated facts have no official-rate identity to validate,
    // so the account routing region remains a safe informational stamp.
    let region_code = quote
        .as_ref()
        .map(|quote| quote.region_code.clone())
        .unwrap_or_else(|| {
            invocation
                .account
                .as_ref()
                .map(|account| account.region_code.clone())
                .unwrap_or_default()
        });
    command_from_pricing_decision(
        invocation,
        line,
        usage_type,
        catalog_key,
        requested_model,
        pricing_snapshot,
        region_code,
        pricing,
    )
}

fn command_from_pricing_decision(
    invocation: &Invocation,
    line: &InvocationUsageLine,
    usage_type: i64,
    catalog_key: String,
    requested_model: String,
    pricing_snapshot: String,
    region_code: String,
    pricing: GatewayPricingDecision,
) -> Result<GatewayUsageRecordCommand, InvocationError> {
    let account = invocation
        .account
        .as_ref()
        .ok_or_else(|| settlement_error("settlement requires resolved invocation account"))?;
    let quantity = &line.quantity;
    let (prompt_tokens, completion_tokens, cached_tokens, total_tokens) =
        token_columns(line, quantity);
    let (base_input_unit_price, base_output_unit_price, cache_read_unit_price) =
        unit_price_columns(line, &pricing.base_unit_price);

    Ok(GatewayUsageRecordCommand {
        request_id: invocation.request.request_id.clone(),
        trace_id: invocation.request.trace_id.clone(),
        tenant_id: invocation.subject.tenant_id,
        organization_id: invocation.subject.organization_id,
        user_id: invocation.subject.user_id,
        api_key_id: invocation.subject.api_key_id.unwrap_or_default(),
        api_key_name_snapshot: invocation
            .subject
            .api_key_name_snapshot
            .clone()
            .unwrap_or_default(),
        // Attribute to the account group that actually routed the request
        // (multi-group api keys may route through a non-default group).
        account_group_id: account
            .account_group_id
            .or(invocation.subject.account_group_id)
            .unwrap_or_default(),
        upstream_account_group_snapshot: account
            .account_group_code
            .clone()
            .or_else(|| invocation.subject.account_group_code.clone())
            .unwrap_or(pricing.group_code),
        catalog_key: catalog_key.clone(),
        requested_model,
        requested_model_catalog_key: line
            .requested_model_catalog_key
            .clone()
            .or_else(|| invocation.resource.requested_model_catalog_key.clone())
            .unwrap_or(catalog_key),
        supplier_code: account.supplier_code.clone(),
        account_id: account.account_id,
        provider_model: account
            .provider_model
            .as_deref()
            .map(provider_native_model_id)
            .unwrap_or_default(),
        provider_native_model: provider_native_model_for_settlement(invocation, account),
        region_code,
        request_path: invocation.request.path.clone(),
        http_method: invocation.request.method.as_str().to_owned(),
        user_agent: invocation.request.user_agent.clone(),
        client_ip: invocation.request.client_ip.clone(),
        http_status: effective_invocation_dispatch_status_code(invocation)
            .or_else(|| {
                invocation
                    .telemetry
                    .normalized_response
                    .as_ref()
                    .map(|response| response.status_code)
            })
            .unwrap_or(200),
        streaming: matches!(
            invocation.dispatch.invocation_shape,
            super::InvocationShape::SseStream
        ),
        modality: modality_for_invocation(invocation, &line.meter),
        usage_type,
        billing_meter_code: line.meter.code().to_owned(),
        unit_size: pricing.unit_size,
        billable_quantity: quantity.billable_quantity.clone(),
        rated_quantity: pricing.rated_quantity,
        prompt_tokens,
        completion_tokens,
        cached_tokens,
        total_tokens,
        request_count: quantity.request_count,
        result_count: quantity.result_count,
        item_count: quantity.item_count,
        character_count: quantity.character_count,
        image_count: quantity.image_count,
        audio_seconds: quantity.audio_seconds.clone(),
        video_seconds: quantity.video_seconds.clone(),
        latency_ms: invocation.telemetry.latency_ms,
        ttft_ms: invocation.telemetry.ttft_ms,
        provider_error_code: invocation.telemetry.provider_error_code.clone(),
        error_type: invocation.telemetry.error_type.clone(),
        error_message_masked: invocation.telemetry.error_message_masked.clone(),
        decision_status: pricing.decision_status,
        billability: pricing.billability,
        reason_code: pricing.reason_code,
        strategy_code: pricing.strategy_code,
        base_input_unit_price,
        base_output_unit_price,
        cache_read_unit_price,
        rate_multiplier: pricing.rate_multiplier,
        reference_multiplier: pricing.reference_multiplier,
        official_reference_amount: pricing.official_reference_amount,
        customer_charge_amount: pricing.customer_charge_amount,
        upstream_cost_amount: pricing.upstream_cost_amount,
        currency: pricing.currency,
        debit_points: None,
        pricing_plan_code: pricing.pricing_plan_code,
        billing_components: pricing.billing_components,
        pricing_snapshot,
        official_rate: pricing.official_rate,
    })
}

fn pricing_resolution_snapshot(
    invocation: &Invocation,
    line: &InvocationUsageLine,
    resolution: &PriceResolution,
) -> String {
    json!({
        "source": "price_service",
        "invocation": {
            "id": invocation.id.0.as_str(),
            "path": invocation.request.path.as_str(),
            "routeKey": invocation.resource.route_key.as_str(),
            "apiCode": invocation.resource.api_code.as_str(),
        },
        "meter": {
            "code": line.meter.code(),
            "quantity": line.quantity.billable_quantity.as_str(),
        },
        "pricing": {
            "serviceAudit": resolution.audit_snapshot.to_json_value(),
        },
    })
    .to_string()
}

fn unit_price_columns(line: &InvocationUsageLine, unit_price: &str) -> (String, String, String) {
    let unit_price = unit_price.to_owned();
    match line.role {
        InvocationUsageLineRole::Output => {
            ("0.000000".to_owned(), unit_price, "0.000000".to_owned())
        }
        InvocationUsageLineRole::CacheRead => {
            ("0.000000".to_owned(), "0.000000".to_owned(), unit_price)
        }
        _ => (unit_price, "0.000000".to_owned(), "0.000000".to_owned()),
    }
}

fn token_columns(
    line: &InvocationUsageLine,
    quantity: &GatewayUsageQuantity,
) -> (i64, i64, i64, i64) {
    if !is_token_meter(&line.meter) {
        return (0, 0, 0, 0);
    }
    let tokens = quantity
        .billable_quantity
        .parse::<i64>()
        .unwrap_or_default();
    match line.role {
        InvocationUsageLineRole::Output => (0, tokens, 0, tokens),
        InvocationUsageLineRole::CacheRead => (0, 0, tokens, tokens),
        InvocationUsageLineRole::Input
        | InvocationUsageLineRole::Request
        | InvocationUsageLineRole::CacheWrite => (tokens, 0, 0, tokens),
        InvocationUsageLineRole::Result | InvocationUsageLineRole::Adapter => (0, 0, 0, tokens),
    }
}

fn is_token_meter(meter: &BillingMeter) -> bool {
    matches!(
        meter,
        BillingMeter::LlmInputToken
            | BillingMeter::LlmOutputToken
            | BillingMeter::LlmReasoningToken
            | BillingMeter::LlmCacheWriteToken
            | BillingMeter::LlmCacheReadToken
            | BillingMeter::EmbeddingInputToken
            | BillingMeter::ImageInputToken
            | BillingMeter::ImageOutputToken
            | BillingMeter::AudioInputToken
            | BillingMeter::AudioOutputToken
            | BillingMeter::VideoInputToken
            | BillingMeter::VideoOutputToken
    )
}

fn provider_native_model_for_settlement(
    invocation: &Invocation,
    account: &super::InvocationAccount,
) -> String {
    let catalog_key = invocation
        .resource
        .requested_model_catalog_key
        .clone()
        .unwrap_or_else(|| invocation.resource.route_key.clone());
    if catalog_key.contains("/management/") {
        return String::new();
    }
    invocation
        .resource
        .provider_native_model
        .clone()
        .or_else(|| account.provider_model.clone())
        .map(|value| provider_native_model_id(value.trim()))
        .unwrap_or_default()
}

fn modality_for_invocation(invocation: &Invocation, meter: &BillingMeter) -> i64 {
    modality_for_capability(invocation.resource.capability)
        .unwrap_or_else(|| modality_for_meter(meter))
}

fn modality_for_capability(capability: RoutingCapability) -> Option<i64> {
    match capability {
        RoutingCapability::Chat => Some(1),
        RoutingCapability::Image => Some(2),
        RoutingCapability::Audio => Some(3),
        RoutingCapability::Music => Some(4),
        RoutingCapability::Video => Some(5),
        RoutingCapability::Embedding => Some(6),
        RoutingCapability::Network | RoutingCapability::Rerank => None,
    }
}

fn modality_for_meter(meter: &BillingMeter) -> i64 {
    match meter {
        BillingMeter::EmbeddingInputToken | BillingMeter::EmbeddingImage => 6,
        BillingMeter::ImageInputToken
        | BillingMeter::ImageOutputToken
        | BillingMeter::ImageResult
        | BillingMeter::ImagePixel
        | BillingMeter::ImageMegapixel => 2,
        BillingMeter::AudioInputToken
        | BillingMeter::AudioOutputToken
        | BillingMeter::AudioInputSecond
        | BillingMeter::AudioOutputSecond
        | BillingMeter::AudioInputMinute
        | BillingMeter::AudioOutputMinute
        | BillingMeter::TtsInputCharacter
        | BillingMeter::SpeechCharacter
        | BillingMeter::SttAudioMinute
        | BillingMeter::MusicOutputSecond
        | BillingMeter::SfxResult => 3,
        BillingMeter::VideoInputToken
        | BillingMeter::VideoOutputToken
        | BillingMeter::VideoInputSecond
        | BillingMeter::VideoOutputSecond
        | BillingMeter::VideoResult => 4,
        BillingMeter::ApiRequest | BillingMeter::ApiResult | BillingMeter::ApiItem => 7,
        _ => 1,
    }
}

fn legacy_usage_type_for_line(line: &InvocationUsageLine) -> i64 {
    match line.role {
        InvocationUsageLineRole::Output | InvocationUsageLineRole::Result => 2,
        InvocationUsageLineRole::CacheRead => 3,
        InvocationUsageLineRole::CacheWrite => 4,
        InvocationUsageLineRole::Adapter => 5,
        InvocationUsageLineRole::Request | InvocationUsageLineRole::Input => 1,
    }
}

fn usage_type_for_line(line: &InvocationUsageLine, line_index: usize, duplicate_role: bool) -> i64 {
    let legacy_usage_type = legacy_usage_type_for_line(line);
    if !duplicate_role {
        return legacy_usage_type;
    }
    SETTLEMENT_UNIQUE_USAGE_TYPE_BASE
        .saturating_add(
            billing_meter_ordinal(&line.meter).saturating_mul(SETTLEMENT_UNIQUE_USAGE_TYPE_STRIDE),
        )
        .saturating_add(i64::try_from(line_index).unwrap_or(i64::MAX))
}

fn billing_meter_ordinal(meter: &BillingMeter) -> i64 {
    match meter {
        BillingMeter::LlmInputToken => 1,
        BillingMeter::LlmOutputToken => 2,
        BillingMeter::LlmReasoningToken => 3,
        BillingMeter::LlmCacheWriteToken => 4,
        BillingMeter::LlmCacheReadToken => 5,
        BillingMeter::LlmCacheStorageTokenHour => 6,
        BillingMeter::EmbeddingInputToken => 7,
        BillingMeter::EmbeddingImage => 8,
        BillingMeter::ImageInputToken => 9,
        BillingMeter::ImageOutputToken => 10,
        BillingMeter::ImageResult => 11,
        BillingMeter::ImagePixel => 12,
        BillingMeter::ImageMegapixel => 13,
        BillingMeter::AudioInputToken => 14,
        BillingMeter::AudioOutputToken => 15,
        BillingMeter::AudioInputSecond => 16,
        BillingMeter::AudioOutputSecond => 17,
        BillingMeter::AudioInputMinute => 18,
        BillingMeter::AudioOutputMinute => 19,
        BillingMeter::TtsInputCharacter => 20,
        BillingMeter::SpeechCharacter => 21,
        BillingMeter::SttAudioMinute => 22,
        BillingMeter::VideoInputToken => 23,
        BillingMeter::VideoOutputToken => 24,
        BillingMeter::VideoInputSecond => 25,
        BillingMeter::VideoOutputSecond => 26,
        BillingMeter::VideoResult => 27,
        BillingMeter::MusicOutputSecond => 28,
        BillingMeter::SfxResult => 29,
        BillingMeter::RerankSearch => 30,
        BillingMeter::RerankDocument => 31,
        BillingMeter::ApiRequest => 32,
        BillingMeter::ApiResult => 33,
        BillingMeter::ApiItem => 34,
        BillingMeter::ToolCall => 35,
        BillingMeter::WebSearchCall => 36,
        BillingMeter::FileSearchCall => 37,
        BillingMeter::CodeInterpreterSession => 38,
        BillingMeter::ContainerSession => 39,
        BillingMeter::StorageGbDay => 40,
        BillingMeter::BandwidthGb => 41,
        BillingMeter::Unknown => 99,
    }
}

fn pricing_snapshot(
    invocation: &Invocation,
    line: &InvocationUsageLine,
    quote: &InvocationPricingQuote,
) -> String {
    if invocation.billing.mode == BillingMode::ExternalUsageLine
        && invocation.billing.quantity_source == BillingQuantitySource::AdapterUsageLines
    {
        return adapter_usage_pricing_snapshot(invocation, line, quote);
    }
    json!({
        "invocation": {
            "id": invocation.id.0.as_str(),
            "path": invocation.request.path.as_str(),
            "routeKey": invocation.resource.route_key.as_str(),
            "apiCode": invocation.resource.api_code.as_str()
        },
        "resource": {
            "catalogKey": quote.catalog_key.as_str(),
            "requestedModel": quote.requested_model.as_str(),
            "providerNativeModel": invocation.resource.provider_native_model.as_deref()
        },
        "supplier": {
            "code": quote.supplier_code.as_deref(),
            "accountId": quote.account_id,
            "regionCode": quote.region_code.as_str()
        },
        "pricing": {
            "serviceAudit": quote.pricing_audit_snapshot.to_json_value(),
            "strategy": quote.billing.as_ref().map(|billing| billing.strategy.code()),
            "meter": line.meter.code(),
            "unitSize": quote.unit_size.as_str(),
            "priceBookCode": quote.rate_metadata.as_ref().map(|metadata| metadata.price_book_code.as_str()),
            "rateHash": quote.rate_metadata.as_ref().map(|metadata| metadata.rate_hash.as_str()),
            "productCode": quote.rate_metadata.as_ref().map(|metadata| metadata.product_code.as_str()),
            "operationCode": quote.rate_metadata.as_ref().map(|metadata| metadata.operation_code.as_str()),
            "billability": quote.rate_metadata.as_ref().map(|metadata| metadata.billability.as_str()),
            "chargeTiming": quote.rate_metadata.as_ref().map(|metadata| metadata.charge_timing.as_str()),
            "calculationMode": quote.rate_metadata.as_ref().map(|metadata| metadata.calculation_mode.as_str()),
            "quantityAggregation": quote.rate_metadata.as_ref().map(|metadata| metadata.quantity_aggregation.as_str()),
            "minimumQuantity": quote.rate_metadata.as_ref().map(|metadata| metadata.minimum_quantity.to_fixed_string(12)),
            "quantityStep": quote.rate_metadata.as_ref().and_then(|metadata| metadata.quantity_step.map(|value| value.to_fixed_string(12))),
            "conditions": rate_conditions_snapshot(quote),
            "plan": quote.pricing_plan_code.as_str(),
            "group": quote.group_code.as_str(),
            "officialReferenceUnitPrice": quote.official_reference_unit_price.to_fixed_string(6),
            "customerChargeBeforeSaleMultiplier": quote.customer_charge_before_sale_multiplier.to_fixed_string(6),
            "chargedUnitPrice": quote.customer_charge_unit_price.to_fixed_string(6),
            "rawUpstreamUnitPrice": quote
                .raw_upstream_cost_unit_price
                .as_ref()
                .map(|price| price.to_fixed_string(6))
                .unwrap_or_else(|| "0.000000".to_owned()),
            "procurementCostUnitPrice": quote
                .procurement_cost_unit_price
                .as_ref()
                .map(|price| price.to_fixed_string(6))
                .unwrap_or_else(|| "0.000000".to_owned()),
            "currency": quote.customer_charge_unit_price.currency.as_str(),
            "saleMultiplier": quote.sale_multiplier.as_str(),
            "referenceMultiplier": quote.reference_multiplier.as_str(),
            "accountContractCostMultiplier": quote.account_contract_cost_multiplier.as_deref(),
            "accountGroupCostMultiplier": quote.account_group_cost_multiplier.as_deref(),
            "procurementCostMultiplier": quote.procurement_cost_multiplier.as_deref()
        }
    })
    .to_string()
}

fn adapter_usage_pricing_snapshot(
    invocation: &Invocation,
    line: &InvocationUsageLine,
    quote: &InvocationPricingQuote,
) -> String {
    let requested_model_catalog_key = line
        .requested_model_catalog_key
        .clone()
        .unwrap_or_else(|| quote.catalog_key.clone());
    let provider_native_model = invocation
        .resource
        .provider_native_model
        .clone()
        .unwrap_or_else(|| quote.requested_model.clone());
    json!({
        "source": "provider_adapter_usage_line",
        "meter": {
            "code": line.meter.code()
        },
        "model": {
            "catalogKey": quote.catalog_key.as_str(),
            "requestedCatalogKey": requested_model_catalog_key.as_str(),
            "model": quote.requested_model.as_str(),
            "providerNativeModel": provider_native_model.as_str()
        },
        "supplier": {
            "code": quote.supplier_code.as_deref(),
            "accountId": quote.account_id,
            "regionCode": quote.region_code.as_str()
        },
        "pricingPlan": {
            "code": quote.pricing_plan_code.as_str()
        },
        "pricing": {
            "serviceAudit": quote.pricing_audit_snapshot.to_json_value(),
            "strategy": quote.billing.as_ref().map(|billing| billing.strategy.code()),
            "priceBookCode": quote.rate_metadata.as_ref().map(|metadata| metadata.price_book_code.as_str()),
            "rateHash": quote.rate_metadata.as_ref().map(|metadata| metadata.rate_hash.as_str()),
            "productCode": quote.rate_metadata.as_ref().map(|metadata| metadata.product_code.as_str()),
            "operationCode": quote.rate_metadata.as_ref().map(|metadata| metadata.operation_code.as_str()),
            "billability": quote.rate_metadata.as_ref().map(|metadata| metadata.billability.as_str()),
            "chargeTiming": quote.rate_metadata.as_ref().map(|metadata| metadata.charge_timing.as_str()),
            "calculationMode": quote.rate_metadata.as_ref().map(|metadata| metadata.calculation_mode.as_str()),
            "quantityAggregation": quote.rate_metadata.as_ref().map(|metadata| metadata.quantity_aggregation.as_str()),
            "unitSize": quote.unit_size.as_str(),
            "minimumQuantity": quote.rate_metadata.as_ref().map(|metadata| metadata.minimum_quantity.to_fixed_string(12)),
            "quantityStep": quote.rate_metadata.as_ref().and_then(|metadata| metadata.quantity_step.map(|value| value.to_fixed_string(12))),
            "conditions": rate_conditions_snapshot(quote)
        },
        "group": {
            "code": quote.group_code.as_str()
        },
        "multipliers": {
            "sale": quote.sale_multiplier.as_str(),
            "reference": quote.reference_multiplier.as_str(),
            "accountContractCost": quote.account_contract_cost_multiplier.as_deref(),
            "accountGroupCost": quote.account_group_cost_multiplier.as_deref(),
            "procurementCost": quote.procurement_cost_multiplier.as_deref()
        },
        "unitPrice": {
            "officialReference": quote.official_reference_unit_price.to_fixed_string(6),
            "customerChargeBeforeSaleMultiplier": quote.customer_charge_before_sale_multiplier.to_fixed_string(6),
            "customerCharge": quote.customer_charge_unit_price.to_fixed_string(6),
            "rawUpstreamCost": quote
                .raw_upstream_cost_unit_price
                .as_ref()
                .map(|price| price.to_fixed_string(6))
                .unwrap_or_else(|| "0.000000".to_owned()),
            "procurementCost": quote
                .procurement_cost_unit_price
                .as_ref()
                .map(|price| price.to_fixed_string(6))
                .unwrap_or_else(|| "0.000000".to_owned()),
            "currency": quote.customer_charge_unit_price.currency.as_str()
        },
        "invocation": {
            "id": invocation.id.0.as_str(),
            "path": invocation.request.path.as_str(),
            "routeKey": invocation.resource.route_key.as_str(),
            "apiCode": invocation.resource.api_code.as_str()
        }
    })
    .to_string()
}

fn rate_conditions_snapshot(quote: &InvocationPricingQuote) -> Vec<Value> {
    quote
        .rate_metadata
        .as_ref()
        .map(|metadata| {
            metadata
                .conditions
                .iter()
                .map(|condition| {
                    json!({
                        "dimensionCode": condition.dimension_code.as_str(),
                        "operator": condition.operator_code.as_str(),
                        "value": &condition.value,
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}

fn effective_invocation_dispatch_status_code(invocation: &Invocation) -> Option<u16> {
    invocation
        .dispatch
        .response
        .as_ref()
        .and_then(|response| effective_dispatch_status_code(invocation, response))
}

fn effective_dispatch_status_code(
    invocation: &Invocation,
    response: &super::InvocationDispatchResponse,
) -> Option<u16> {
    if invocation.dispatch.mode != super::DispatchMode::InternalProviderAdapter {
        return Some(response.status_code);
    }
    response
        .body
        .as_ref()
        .and_then(adapter_response_status_code)
        .or(Some(response.status_code))
}

fn adapter_response_status_code(body: &Value) -> Option<u16> {
    body.get("statusCode")
        .or_else(|| body.get("status_code"))
        .and_then(Value::as_u64)
        .and_then(|value| u16::try_from(value).ok())
}

fn settlement_error(message: impl Into<String>) -> InvocationError {
    InvocationError::new(InvocationErrorKind::Usage, message)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn usage_line(meter: BillingMeter) -> InvocationUsageLine {
        InvocationUsageLine::new(
            meter,
            GatewayUsageQuantity::tokens(1).expect("valid test quantity"),
        )
    }

    #[test]
    fn duplicate_usage_type_ranges_remain_disjoint_for_large_line_indexes() {
        let high_index =
            usage_type_for_line(&usage_line(BillingMeter::LlmReasoningToken), 999_999, true);
        let next_meter =
            usage_type_for_line(&usage_line(BillingMeter::LlmCacheWriteToken), 0, true);

        assert_eq!(4_019_999, high_index);
        assert_eq!(4_020_000, next_meter);
        assert_ne!(high_index, next_meter);
        assert!(next_meter <= i64::from(i32::MAX));
    }

    #[test]
    fn token_columns_split_input_role_into_prompt_tokens_only() {
        // 非缓存输入 token（cached 已单独成行）只计入 prompt_tokens。
        let line = InvocationUsageLine::new(
            BillingMeter::LlmInputToken,
            GatewayUsageQuantity::tokens(71).expect("valid"),
        );
        assert_eq!((71, 0, 0, 71), token_columns(&line, &line.quantity));
    }

    #[test]
    fn token_columns_split_cache_read_role_into_cached_tokens_only() {
        let line = InvocationUsageLine::new(
            BillingMeter::LlmCacheReadToken,
            GatewayUsageQuantity::tokens(29).expect("valid"),
        );
        assert_eq!((0, 0, 29, 29), token_columns(&line, &line.quantity));
    }

    #[test]
    fn token_columns_split_output_role_into_completion_tokens_only() {
        let line = InvocationUsageLine::new(
            BillingMeter::LlmOutputToken,
            GatewayUsageQuantity::tokens(12).expect("valid"),
        );
        assert_eq!((0, 12, 0, 12), token_columns(&line, &line.quantity));
    }

    #[test]
    fn token_columns_for_cache_write_role_behave_like_input() {
        let line = InvocationUsageLine::new(
            BillingMeter::LlmCacheWriteToken,
            GatewayUsageQuantity::tokens(8).expect("valid"),
        );
        assert_eq!((8, 0, 0, 8), token_columns(&line, &line.quantity));
    }

    #[test]
    fn token_columns_zero_out_for_non_token_meter() {
        let line = InvocationUsageLine::new(
            BillingMeter::ApiRequest,
            GatewayUsageQuantity::single_request(),
        );
        assert_eq!((0, 0, 0, 0), token_columns(&line, &line.quantity));
    }

    #[test]
    fn unit_price_columns_apply_only_to_the_relevant_price_slot() {
        let base = |meter: BillingMeter| {
            let line =
                InvocationUsageLine::new(meter, GatewayUsageQuantity::tokens(1).expect("valid"));
            (line, "0.5".to_owned())
        };

        let (output, price) = base(BillingMeter::LlmOutputToken);
        assert_eq!(
            ("0.000000".into(), "0.5".into(), "0.000000".into()),
            unit_price_columns(&output, &price)
        );

        let (cache_read, price) = base(BillingMeter::LlmCacheReadToken);
        assert_eq!(
            ("0.000000".into(), "0.000000".into(), "0.5".into()),
            unit_price_columns(&cache_read, &price)
        );

        let (input, price) = base(BillingMeter::LlmInputToken);
        assert_eq!(
            ("0.5".into(), "0.000000".into(), "0.000000".into()),
            unit_price_columns(&input, &price)
        );
    }
}
