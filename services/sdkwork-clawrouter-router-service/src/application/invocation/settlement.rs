use serde_json::{json, Value};

use super::{
    BillingMode, BillingQuantitySource, Invocation, InvocationError, InvocationErrorKind,
    InvocationFuture, InvocationInterceptor, InvocationPricingQuote, InvocationUsageLine,
    InvocationUsageLineRole,
};
use crate::domain::{
    provider_native_model_id, BillingMeter, DecimalValue, DomainResult, RoutingCapability,
};
use crate::ports::{GatewayUsageQuantity, GatewayUsageRecordCommand};

const TOKEN_BILLING_UNIT_SIZE: i64 = 1_000_000;
const USAGE_AMOUNT_DECIMAL_DIGITS: u32 = 12;
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
                let Some(quote) = line
                    .pricing_quote
                    .as_ref()
                    .or_else(|| invocation.usage.quote_for_meter(&line.meter))
                else {
                    if skippable_without_quote(&line.meter, invocation.billing.mode.clone()) {
                        continue;
                    }
                    return Err(settlement_error(format!(
                        "settlement requires pricing quote for meter {}",
                        line.meter.code()
                    )));
                };
                let legacy_usage_type = legacy_usage_type_for_line(line);
                let legacy_usage_type_index = usize::try_from(legacy_usage_type)
                    .unwrap_or_default()
                    .min(seen_legacy_usage_types.len() - 1);
                let duplicate_role = seen_legacy_usage_types[legacy_usage_type_index];
                seen_legacy_usage_types[legacy_usage_type_index] = true;
                let mut command = command_for_line(
                    invocation,
                    line,
                    quote,
                    usage_type_for_line(line, line_index, duplicate_role),
                )?;
                command.request_count = settlement_request_count(
                    invocation,
                    line,
                    line_index,
                    request_count_line_index,
                );
                commands.push(command);
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

fn skippable_without_quote(meter: &BillingMeter, mode: BillingMode) -> bool {
    match mode {
        BillingMode::ExternalUsageLine => {
            matches!(meter, BillingMeter::ApiResult | BillingMeter::ApiItem)
        }
        BillingMode::Composite => *meter == BillingMeter::LlmCacheReadToken,
        _ => false,
    }
}

fn command_for_line(
    invocation: &Invocation,
    line: &InvocationUsageLine,
    quote: &InvocationPricingQuote,
    usage_type: i64,
) -> Result<GatewayUsageRecordCommand, InvocationError> {
    let account = invocation
        .account
        .as_ref()
        .ok_or_else(|| settlement_error("settlement requires resolved invocation account"))?;
    let quantity = &line.quantity;
    let customer_charge_amount = amount_for_line(
        &line.meter,
        &quote.customer_charge_unit_price.unit_price,
        quantity,
    )
    .map_err(|error| settlement_error(error.to_string()))?;
    let official_reference_amount = amount_for_line(
        &line.meter,
        &quote.official_reference_unit_price.unit_price,
        quantity,
    )
    .map_err(|error| settlement_error(error.to_string()))?;
    let upstream_cost_amount = match quote.upstream_cost_unit_price.as_ref() {
        Some(price) => amount_for_line(&line.meter, &price.unit_price, quantity)
            .map_err(|error| settlement_error(error.to_string()))?,
        None => DecimalValue::ZERO,
    };
    let (base_input_unit_price, base_output_unit_price, cache_read_unit_price) =
        unit_price_columns(line, quote);
    let (prompt_tokens, completion_tokens, cached_tokens, total_tokens) =
        token_columns(line, quantity);

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
        channel_group_id: invocation.subject.channel_group_id.unwrap_or_default(),
        channel_group_snapshot: invocation
            .subject
            .channel_group_code
            .clone()
            .unwrap_or_else(|| quote.group_code.clone()),
        catalog_key: quote.catalog_key.clone(),
        requested_model: quote.requested_model.clone(),
        requested_model_catalog_key: line
            .requested_model_catalog_key
            .clone()
            .or_else(|| invocation.resource.requested_model_catalog_key.clone())
            .unwrap_or_else(|| quote.catalog_key.clone()),
        provider_code: account.provider_code.clone(),
        channel_id: account.channel_id,
        provider_model: account
            .provider_model
            .as_deref()
            .map(provider_native_model_id)
            .unwrap_or_default(),
        provider_native_model: provider_native_model_for_settlement(invocation, account),
        region_code: account.region_code.clone(),
        request_path: invocation.request.path.clone(),
        http_method: invocation.request.method.as_str().to_owned(),
        user_agent: invocation.request.user_agent.clone(),
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
        billable_quantity: quantity.billable_quantity.clone(),
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
        base_input_unit_price,
        base_output_unit_price,
        cache_read_unit_price,
        rate_multiplier: quote.rate_multiplier.clone(),
        reference_multiplier: quote.reference_multiplier.clone(),
        official_reference_amount: official_reference_amount
            .to_fixed_string(USAGE_AMOUNT_DECIMAL_DIGITS),
        customer_charge_amount: customer_charge_amount.to_fixed_string(USAGE_AMOUNT_DECIMAL_DIGITS),
        upstream_cost_amount: upstream_cost_amount.to_fixed_string(USAGE_AMOUNT_DECIMAL_DIGITS),
        currency: quote.customer_charge_unit_price.currency.clone(),
        pricing_plan_code: quote.pricing_plan_code.clone(),
        pricing_snapshot: pricing_snapshot(invocation, line, quote),
    })
}

fn amount_for_line(
    meter: &BillingMeter,
    unit_price: &DecimalValue,
    quantity: &GatewayUsageQuantity,
) -> DomainResult<DecimalValue> {
    if is_token_meter(meter) {
        unit_price
            .multiply_i64(integer_quantity(quantity)?)?
            .divide_i64(TOKEN_BILLING_UNIT_SIZE)
    } else {
        let quantity = DecimalValue::parse(&quantity.billable_quantity)?;
        unit_price.checked_multiply(quantity)
    }
}

fn integer_quantity(quantity: &GatewayUsageQuantity) -> DomainResult<i64> {
    quantity
        .billable_quantity
        .parse::<i64>()
        .map_err(|_| crate::domain::DomainError::new("settlement quantity must be an integer"))
}

fn unit_price_columns(
    line: &InvocationUsageLine,
    quote: &InvocationPricingQuote,
) -> (String, String, String) {
    let unit_price = quote.customer_charge_before_rate.to_fixed_string(6);
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
        "provider": {
            "code": quote.provider_code.as_deref(),
            "channelId": quote.channel_id,
            "regionCode": quote.region_code.as_str()
        },
        "pricing": {
            "meter": line.meter.code(),
            "plan": quote.pricing_plan_code.as_str(),
            "group": quote.group_code.as_str(),
            "officialReferenceUnitPrice": quote.official_reference_unit_price.to_fixed_string(6),
            "customerUnitPrice": quote.customer_charge_before_rate.to_fixed_string(6),
            "chargedUnitPrice": quote.customer_charge_unit_price.to_fixed_string(6),
            "upstreamUnitPrice": quote
                .upstream_cost_unit_price
                .as_ref()
                .map(|price| price.to_fixed_string(6))
                .unwrap_or_else(|| "0.000000".to_owned()),
            "currency": quote.customer_charge_unit_price.currency.as_str(),
            "rateMultiplier": quote.rate_multiplier.as_str(),
            "referenceMultiplier": quote.reference_multiplier.as_str()
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
        "provider": {
            "code": quote.provider_code.as_deref(),
            "channelId": quote.channel_id,
            "regionCode": quote.region_code.as_str()
        },
        "pricingPlan": {
            "code": quote.pricing_plan_code.as_str()
        },
        "group": {
            "code": quote.group_code.as_str()
        },
        "multipliers": {
            "rate": quote.rate_multiplier.as_str(),
            "reference": quote.reference_multiplier.as_str()
        },
        "unitPrice": {
            "officialReference": quote.official_reference_unit_price.to_fixed_string(6),
            "customerBeforeRate": quote.customer_charge_before_rate.to_fixed_string(6),
            "customerCharge": quote.customer_charge_unit_price.to_fixed_string(6),
            "upstreamCost": quote
                .upstream_cost_unit_price
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
