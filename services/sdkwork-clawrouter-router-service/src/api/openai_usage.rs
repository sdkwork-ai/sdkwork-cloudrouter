use std::sync::Arc;

use axum::http::StatusCode;
use serde_json::Value;

use crate::api::openai_invocation::{
    OpenAiInvocationContext, OpenAiInvocationEndpoint, OpenAiInvocationFault,
    OpenAiInvocationPluginError, OpenAiInvocationRelayOutcome,
};
use crate::api::openai_runtime::ResolvedOpenAiUpstreamRoute;
use crate::application::{
    AuthenticatedApiKeyContext, PricingResolver, ResolveModelPriceQuery, ResolvedModelPrice,
};
use crate::domain::{
    provider_native_model_id, BillingMeter, DecimalValue, DomainError, DomainResult,
};
use crate::ports::{
    GatewayRequestTraceCommand, GatewayUsageQuantity, GatewayUsageRecordCommand,
    GatewayUsageRecorder, PricingCatalog,
};

const MODALITY_TEXT: i64 = 1;
const MODALITY_EMBEDDING: i64 = 6;
const USAGE_TYPE_INPUT: i64 = 1;
const TOKEN_BILLING_UNIT_SIZE: i64 = 1_000_000;
const USAGE_AMOUNT_DECIMAL_DIGITS: u32 = 12;
const MAX_TRACE_ERROR_MESSAGE_LEN: usize = 1024;

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct OpenAiUsageBillingProfile {
    input_meter: BillingMeter,
    output_meter: Option<BillingMeter>,
    cache_read_meter: Option<BillingMeter>,
    modality: i64,
    usage_type: i64,
}

impl OpenAiUsageBillingProfile {
    fn chat() -> Self {
        Self {
            input_meter: BillingMeter::LlmInputToken,
            output_meter: Some(BillingMeter::LlmOutputToken),
            cache_read_meter: Some(BillingMeter::LlmCacheReadToken),
            modality: MODALITY_TEXT,
            usage_type: USAGE_TYPE_INPUT,
        }
    }

    fn responses() -> Self {
        Self::chat()
    }

    fn embeddings() -> Self {
        Self {
            input_meter: BillingMeter::EmbeddingInputToken,
            output_meter: None,
            cache_read_meter: None,
            modality: MODALITY_EMBEDDING,
            usage_type: USAGE_TYPE_INPUT,
        }
    }

    fn for_endpoint(endpoint: OpenAiInvocationEndpoint) -> Self {
        match endpoint {
            OpenAiInvocationEndpoint::ChatCompletions => Self::chat(),
            OpenAiInvocationEndpoint::Responses => Self::responses(),
            OpenAiInvocationEndpoint::Embeddings => Self::embeddings(),
        }
    }
}

pub struct OpenAiUsageRecorder<C> {
    catalog: Arc<C>,
    usage_recorder: Arc<dyn GatewayUsageRecorder + Send + Sync>,
}

impl<C> OpenAiUsageRecorder<C> {
    pub fn new(
        catalog: Arc<C>,
        usage_recorder: Arc<dyn GatewayUsageRecorder + Send + Sync>,
    ) -> Self {
        Self {
            catalog,
            usage_recorder,
        }
    }
}

impl<C> OpenAiUsageRecorder<C>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    pub async fn record_after_relay(
        &self,
        context: &OpenAiInvocationContext,
        route: &ResolvedOpenAiUpstreamRoute,
        outcome: &OpenAiInvocationRelayOutcome,
    ) -> Result<(), OpenAiInvocationPluginError> {
        if context.stream || !(200..=299).contains(&outcome.status_code) {
            return Ok(());
        }
        let body = outcome.response_body.as_ref().ok_or_else(|| {
            OpenAiInvocationPluginError::new(
                StatusCode::BAD_GATEWAY,
                "provider_usage_record_failed",
                "server_error",
                format!(
                    "provider {} response body is missing for usage recording",
                    endpoint_label(context.endpoint)
                ),
            )
        })?;
        let usage =
            usage_from_response(context.endpoint, body).map_err(provider_usage_record_error)?;
        let mut command = build_usage_record_command(
            self.catalog.as_ref(),
            context,
            route,
            outcome.status_code,
            false,
            usage,
            OpenAiUsageBillingProfile::for_endpoint(context.endpoint),
        )
        .map_err(provider_usage_record_error)?;
        command.latency_ms = outcome.latency_ms;
        self.usage_recorder
            .record_gateway_usage(command)
            .await
            .map_err(provider_usage_record_error)?;
        Ok(())
    }

    pub(crate) async fn record_after_success(
        &self,
        context: &OpenAiInvocationContext,
        route: &ResolvedOpenAiUpstreamRoute,
        outcome: &OpenAiInvocationRelayOutcome,
    ) -> Result<(), OpenAiInvocationFault> {
        self.record_after_relay(context, route, outcome)
            .await
            .map_err(|error| OpenAiInvocationFault::usage_recording(error.message))
    }
}

#[derive(Debug, Clone)]
pub(crate) struct GatewayUsageRecordCommandBuilder {
    request_id: String,
    trace_id: Option<String>,
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
    api_key_id: i64,
    api_key_name_snapshot: String,
    account_group_id: i64,
    upstream_account_group_snapshot: String,
    catalog_key: String,
    requested_model: String,
    requested_model_catalog_key: String,
    supplier_code: String,
    account_id: i64,
    provider_model: String,
    provider_native_model: String,
    region_code: String,
    request_path: String,
    http_method: String,
    user_agent: Option<String>,
    http_status: u16,
    streaming: bool,
    latency_ms: Option<i64>,
    ttft_ms: Option<i64>,
    provider_error_code: Option<String>,
    error_type: Option<String>,
    error_message_masked: Option<String>,
    modality: i64,
    usage_type: i64,
    billing_meter_code: String,
    base_input_unit_price: String,
    base_output_unit_price: String,
    cache_read_unit_price: String,
    sale_multiplier: DecimalValue,
    reference_multiplier: DecimalValue,
    official_input_unit_price: DecimalValue,
    official_output_unit_price: DecimalValue,
    official_cache_read_unit_price: DecimalValue,
    input_unit_price: DecimalValue,
    output_unit_price: DecimalValue,
    customer_cache_read_unit_price: DecimalValue,
    upstream_input_unit_price: DecimalValue,
    upstream_output_unit_price: DecimalValue,
    upstream_cache_read_unit_price: DecimalValue,
    currency: String,
    pricing_plan_code: String,
    pricing_snapshot: String,
}

impl GatewayUsageRecordCommandBuilder {
    pub(crate) fn build(&self, usage: OpenAiTokenUsage) -> DomainResult<GatewayUsageRecordCommand> {
        let input_tokens = billable_input_tokens(usage.prompt_tokens, usage.cached_tokens)?;
        let input_amount = token_amount(self.input_unit_price, input_tokens)?;
        let cache_read_amount =
            token_amount(self.customer_cache_read_unit_price, usage.cached_tokens)?;
        let output_amount = token_amount(self.output_unit_price, usage.completion_tokens)?;
        let official_input_amount = token_amount(self.official_input_unit_price, input_tokens)?;
        let official_cache_read_amount =
            token_amount(self.official_cache_read_unit_price, usage.cached_tokens)?;
        let official_output_amount =
            token_amount(self.official_output_unit_price, usage.completion_tokens)?;
        let upstream_input_amount = self
            .upstream_input_unit_price
            .multiply_i64(input_tokens)?
            .divide_i64(TOKEN_BILLING_UNIT_SIZE)?;
        let upstream_cache_read_amount = self
            .upstream_cache_read_unit_price
            .multiply_i64(usage.cached_tokens)?
            .divide_i64(TOKEN_BILLING_UNIT_SIZE)?;
        let upstream_output_amount = self
            .upstream_output_unit_price
            .multiply_i64(usage.completion_tokens)?
            .divide_i64(TOKEN_BILLING_UNIT_SIZE)?;
        let official_reference_amount = sum_decimal_values(&[
            official_input_amount,
            official_cache_read_amount,
            official_output_amount,
        ])?;
        let customer_charge_amount =
            sum_decimal_values(&[input_amount, cache_read_amount, output_amount])?;
        let upstream_cost_amount = sum_decimal_values(&[
            upstream_input_amount,
            upstream_cache_read_amount,
            upstream_output_amount,
        ])?;
        let quantity = GatewayUsageQuantity::tokens(usage.total_tokens)?;
        Ok(GatewayUsageRecordCommand {
            request_id: self.request_id.clone(),
            trace_id: self.trace_id.clone(),
            tenant_id: self.tenant_id,
            organization_id: self.organization_id,
            user_id: self.user_id,
            api_key_id: self.api_key_id,
            api_key_name_snapshot: self.api_key_name_snapshot.clone(),
            account_group_id: self.account_group_id,
            upstream_account_group_snapshot: self.upstream_account_group_snapshot.clone(),
            catalog_key: self.catalog_key.clone(),
            requested_model: self.requested_model.clone(),
            requested_model_catalog_key: self.requested_model_catalog_key.clone(),
            supplier_code: self.supplier_code.clone(),
            account_id: self.account_id,
            provider_model: self.provider_model.clone(),
            provider_native_model: self.provider_native_model.clone(),
            region_code: self.region_code.clone(),
            request_path: self.request_path.clone(),
            http_method: self.http_method.clone(),
            user_agent: self.user_agent.clone(),
            http_status: self.http_status,
            streaming: self.streaming,
            modality: self.modality,
            usage_type: self.usage_type,
            billing_meter_code: self.billing_meter_code.clone(),
            billable_quantity: quantity.billable_quantity,
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            cached_tokens: usage.cached_tokens,
            total_tokens: usage.total_tokens,
            request_count: quantity.request_count,
            result_count: quantity.result_count,
            item_count: quantity.item_count,
            character_count: quantity.character_count,
            image_count: quantity.image_count,
            audio_seconds: quantity.audio_seconds,
            video_seconds: quantity.video_seconds,
            latency_ms: self.latency_ms,
            ttft_ms: self.ttft_ms,
            provider_error_code: self.provider_error_code.clone(),
            error_type: self.error_type.clone(),
            error_message_masked: self.error_message_masked.clone(),
            base_input_unit_price: self.base_input_unit_price.clone(),
            base_output_unit_price: self.base_output_unit_price.clone(),
            cache_read_unit_price: self.cache_read_unit_price.clone(),
            rate_multiplier: self.sale_multiplier.to_fixed_string(6),
            reference_multiplier: self.reference_multiplier.to_fixed_string(6),
            official_reference_amount: official_reference_amount
                .to_fixed_string(USAGE_AMOUNT_DECIMAL_DIGITS),
            customer_charge_amount: customer_charge_amount
                .to_fixed_string(USAGE_AMOUNT_DECIMAL_DIGITS),
            upstream_cost_amount: upstream_cost_amount.to_fixed_string(USAGE_AMOUNT_DECIMAL_DIGITS),
            currency: self.currency.clone(),
            pricing_plan_code: self.pricing_plan_code.clone(),
            pricing_snapshot: self.pricing_snapshot.clone(),
        })
    }

    pub(crate) fn build_zero_token_request(&self) -> DomainResult<GatewayUsageRecordCommand> {
        self.build(OpenAiTokenUsage::default())
    }

    pub(crate) fn trace_command(&self) -> GatewayRequestTraceCommand {
        GatewayRequestTraceCommand {
            request_id: self.request_id.clone(),
            trace_id: self.trace_id.clone(),
            tenant_id: self.tenant_id,
            organization_id: self.organization_id,
            user_id: self.user_id,
            api_key_id: self.api_key_id,
            api_key_name_snapshot: self.api_key_name_snapshot.clone(),
            account_group_id: self.account_group_id,
            upstream_account_group_snapshot: self.upstream_account_group_snapshot.clone(),
            catalog_key: self.catalog_key.clone(),
            requested_model: self.requested_model.clone(),
            requested_model_catalog_key: self.requested_model_catalog_key.clone(),
            supplier_code: self.supplier_code.clone(),
            account_id: self.account_id,
            provider_model: self.provider_model.clone(),
            provider_native_model: self.provider_native_model.clone(),
            region_code: self.region_code.clone(),
            request_path: self.request_path.clone(),
            http_method: self.http_method.clone(),
            user_agent: self.user_agent.clone(),
            http_status: Some(self.http_status),
            streaming: self.streaming,
            prompt_tokens: 0,
            completion_tokens: 0,
            cached_tokens: 0,
            total_tokens: 0,
            latency_ms: self.latency_ms,
            ttft_ms: self.ttft_ms,
            provider_error_code: self.provider_error_code.clone(),
            error_type: self.error_type.clone(),
            error_message_masked: self.error_message_masked.clone(),
        }
    }

    pub(crate) fn with_latency_ms(mut self, latency_ms: Option<i64>) -> Self {
        self.latency_ms = latency_ms.map(|value| value.max(0));
        self
    }

    pub(crate) fn with_error(
        mut self,
        provider_error_code: Option<String>,
        error_type: Option<String>,
        error_message_masked: Option<String>,
    ) -> Self {
        self.provider_error_code = provider_error_code;
        self.error_type = error_type;
        self.error_message_masked = error_message_masked;
        self
    }
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub(crate) struct OpenAiTokenUsage {
    pub(crate) prompt_tokens: i64,
    pub(crate) completion_tokens: i64,
    pub(crate) cached_tokens: i64,
    pub(crate) total_tokens: i64,
}

pub(crate) fn usage_from_response(
    endpoint: OpenAiInvocationEndpoint,
    body: &Value,
) -> DomainResult<OpenAiTokenUsage> {
    match endpoint {
        OpenAiInvocationEndpoint::ChatCompletions => chat_usage_from_response(body),
        OpenAiInvocationEndpoint::Responses => responses_usage_from_response(body),
        OpenAiInvocationEndpoint::Embeddings => embeddings_usage_from_response(body),
    }
}

pub(crate) fn chat_usage_from_response(body: &Value) -> DomainResult<OpenAiTokenUsage> {
    let usage = body
        .get("usage")
        .ok_or_else(|| DomainError::new("provider chat completion response is missing usage"))?;
    usage_from_fields(
        usage,
        "prompt_tokens",
        "completion_tokens",
        "prompt_tokens_details",
    )
}

pub(crate) fn chat_usage_from_stream_event(body: &Value) -> DomainResult<Option<OpenAiTokenUsage>> {
    let Some(usage) = body.get("usage") else {
        return Ok(None);
    };
    if usage.is_null() {
        return Ok(None);
    }
    usage_from_fields(
        usage,
        "prompt_tokens",
        "completion_tokens",
        "prompt_tokens_details",
    )
    .map(Some)
}

fn responses_usage_from_response(body: &Value) -> DomainResult<OpenAiTokenUsage> {
    let usage = body
        .get("usage")
        .ok_or_else(|| DomainError::new("provider response is missing usage"))?;
    usage_from_fields(
        usage,
        "input_tokens",
        "output_tokens",
        "input_tokens_details",
    )
}

fn embeddings_usage_from_response(body: &Value) -> DomainResult<OpenAiTokenUsage> {
    let usage = body
        .get("usage")
        .ok_or_else(|| DomainError::new("provider embedding response is missing usage"))?;
    let prompt_tokens = required_integer_field(usage, "prompt_tokens")?;
    let total_tokens = required_integer_field(usage, "total_tokens")?;
    Ok(OpenAiTokenUsage {
        prompt_tokens,
        completion_tokens: 0,
        cached_tokens: 0,
        total_tokens,
    })
}

fn usage_from_fields(
    usage: &Value,
    input_field: &str,
    output_field: &str,
    input_details_field: &str,
) -> DomainResult<OpenAiTokenUsage> {
    let prompt_tokens = required_integer_field(usage, input_field)?;
    let completion_tokens = required_integer_field(usage, output_field)?;
    let cached_tokens = usage
        .get(input_details_field)
        .map(|details| optional_integer_field(details, "cached_tokens"))
        .transpose()?
        .unwrap_or(0);
    let total_tokens = required_integer_field(usage, "total_tokens")?;
    Ok(OpenAiTokenUsage {
        prompt_tokens,
        completion_tokens,
        cached_tokens,
        total_tokens,
    })
}

fn required_integer_field(value: &Value, field: &str) -> DomainResult<i64> {
    let integer = value
        .get(field)
        .and_then(Value::as_i64)
        .ok_or_else(|| DomainError::new(format!("provider usage.{field} is required")))?;
    non_negative_integer(field, integer)
}

fn optional_integer_field(value: &Value, field: &str) -> DomainResult<i64> {
    let Some(integer) = value.get(field).and_then(Value::as_i64) else {
        return Ok(0);
    };
    non_negative_integer(field, integer)
}

fn non_negative_integer(field: &str, integer: i64) -> DomainResult<i64> {
    if integer < 0 {
        return Err(DomainError::new(format!(
            "provider usage.{field} must be non-negative"
        )));
    }
    Ok(integer)
}

pub(crate) fn build_usage_record_command<C>(
    catalog: &C,
    invocation_context: &OpenAiInvocationContext,
    route: &ResolvedOpenAiUpstreamRoute,
    http_status: u16,
    streaming: bool,
    usage: OpenAiTokenUsage,
    billing_profile: OpenAiUsageBillingProfile,
) -> DomainResult<GatewayUsageRecordCommand>
where
    C: PricingCatalog + Send + Sync,
{
    build_usage_record_command_builder(
        catalog,
        invocation_context,
        &invocation_context.api_key_context,
        route,
        http_status,
        streaming,
        billing_profile,
    )?
    .build(usage)
}

pub(crate) fn build_request_trace_command(
    invocation_context: &OpenAiInvocationContext,
    route: Option<&ResolvedOpenAiUpstreamRoute>,
    http_status: Option<u16>,
    streaming: bool,
    latency_ms: Option<i64>,
    provider_error_code: Option<String>,
    error_type: Option<String>,
    error_message: Option<String>,
) -> GatewayRequestTraceCommand {
    let context = &invocation_context.api_key_context;
    let requested_model_catalog_key = route
        .map(|route| route.catalog_key.clone())
        .unwrap_or_else(|| invocation_context.requested_model.clone());
    let provider_native_model = route
        .map(|route| provider_native_model_id(&route.provider_model))
        .unwrap_or_else(|| provider_native_model_id(&invocation_context.requested_model));
    GatewayRequestTraceCommand {
        request_id: invocation_context.request_id.clone(),
        trace_id: invocation_context.trace_id.clone(),
        tenant_id: context.tenant_id,
        organization_id: context.organization_id,
        user_id: context.user_id,
        api_key_id: context.api_key_id,
        api_key_name_snapshot: context.api_key_name_snapshot.clone(),
        account_group_id: context.group_id,
        upstream_account_group_snapshot: context.group_code.clone(),
        catalog_key: requested_model_catalog_key.clone(),
        requested_model: invocation_context.requested_model.clone(),
        requested_model_catalog_key,
        supplier_code: route
            .map(|route| route.supplier_code.clone())
            .unwrap_or_default(),
        account_id: route.map(|route| route.account_id).unwrap_or_default(),
        provider_model: provider_native_model.clone(),
        provider_native_model,
        region_code: route
            .map(|route| route.region_code.clone())
            .unwrap_or_else(|| "global".to_owned()),
        request_path: invocation_context.request_path.clone(),
        http_method: invocation_context.http_method.clone(),
        user_agent: invocation_context.user_agent.clone(),
        http_status,
        streaming,
        prompt_tokens: 0,
        completion_tokens: 0,
        cached_tokens: 0,
        total_tokens: 0,
        latency_ms: latency_ms.map(|value| value.max(0)),
        ttft_ms: None,
        provider_error_code: normalize_optional_trace_text(provider_error_code, 128),
        error_type: normalize_optional_trace_text(error_type, 128)
            .or_else(|| inferred_error_type(http_status)),
        error_message_masked: normalize_optional_trace_text(
            error_message,
            MAX_TRACE_ERROR_MESSAGE_LEN,
        ),
    }
}

pub(crate) async fn record_request_trace(
    usage_recorder: Option<&Arc<dyn GatewayUsageRecorder + Send + Sync>>,
    command: GatewayRequestTraceCommand,
) {
    let Some(usage_recorder) = usage_recorder else {
        return;
    };
    if let Err(error) = usage_recorder.record_gateway_trace(command).await {
        tracing::warn!(error = %error, "failed to record gateway request trace");
    }
}

pub(crate) fn provider_error_code_from_body(body: &Value, fallback: &str) -> String {
    body.get("error")
        .and_then(|error| error.get("code"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(fallback)
        .to_owned()
}

pub(crate) fn provider_error_type_from_body(body: &Value, status_code: u16) -> String {
    body.get("error")
        .and_then(|error| error.get("type"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .or_else(|| inferred_error_type(Some(status_code)))
        .unwrap_or_else(|| "provider_error".to_owned())
}

pub(crate) fn provider_error_message_from_body(body: &Value, fallback: &str) -> String {
    body.get("error")
        .and_then(|error| error.get("message"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(fallback)
        .to_owned()
}

pub(crate) fn build_usage_record_command_builder<C>(
    catalog: &C,
    invocation_context: &OpenAiInvocationContext,
    context: &AuthenticatedApiKeyContext,
    route: &ResolvedOpenAiUpstreamRoute,
    http_status: u16,
    streaming: bool,
    billing_profile: OpenAiUsageBillingProfile,
) -> DomainResult<GatewayUsageRecordCommandBuilder>
where
    C: PricingCatalog + Send + Sync,
{
    let input_price = PricingResolver::new(catalog).resolve(ResolveModelPriceQuery {
        api_key_id: context.api_key_id,
        account_group_id: Some(route.group_id),
        model: route.catalog_key.clone(),
        billing_meter: billing_profile.input_meter.clone(),
        supplier_code: Some(route.supplier_code.clone()),
        account_id: Some(route.account_id),
        region_code: Some(route.region_code.clone()),
    })?;
    let output_price = match billing_profile.output_meter.clone() {
        Some(output_meter) => Some(PricingResolver::new(catalog).resolve(
            ResolveModelPriceQuery {
                api_key_id: context.api_key_id,
                account_group_id: Some(route.group_id),
                model: route.catalog_key.clone(),
                billing_meter: output_meter,
                supplier_code: Some(route.supplier_code.clone()),
                account_id: Some(route.account_id),
                region_code: Some(route.region_code.clone()),
            },
        )?),
        None => None,
    };
    let upstream_input_unit_price = upstream_unit_price(&input_price);
    let upstream_output_unit_price = output_price
        .as_ref()
        .map(upstream_unit_price)
        .unwrap_or(DecimalValue::ZERO);
    let output_customer_charge = output_price
        .as_ref()
        .map(|price| price.customer_charge.clone())
        .unwrap_or_else(|| zero_money_like(&input_price));
    let cache_read_price = match billing_profile.cache_read_meter.clone() {
        Some(cache_read_meter) => resolve_optional_cache_read_price(
            catalog,
            context,
            route,
            cache_read_meter,
            &input_price,
        )?,
        None => None,
    };
    let cache_read_customer_charge = cache_read_price
        .as_ref()
        .map(|price| price.customer_charge.clone())
        .unwrap_or_else(|| zero_money_like(&input_price));

    let requested_model_catalog_key = route.catalog_key.clone();
    let provider_native_model = provider_native_model_id(&route.provider_model);
    let pricing_snapshot = build_pricing_snapshot(
        route,
        &input_price,
        output_price.as_ref(),
        cache_read_price.as_ref(),
    );
    Ok(GatewayUsageRecordCommandBuilder {
        request_id: invocation_context.request_id.clone(),
        trace_id: invocation_context.trace_id.clone(),
        tenant_id: context.tenant_id,
        organization_id: context.organization_id,
        user_id: context.user_id,
        api_key_id: context.api_key_id,
        api_key_name_snapshot: context.api_key_name_snapshot.clone(),
        account_group_id: route.group_id,
        upstream_account_group_snapshot: route.group_code.clone(),
        catalog_key: route.catalog_key.clone(),
        requested_model: invocation_context.requested_model.clone(),
        requested_model_catalog_key,
        supplier_code: route.supplier_code.clone(),
        account_id: route.account_id,
        provider_model: provider_native_model.clone(),
        provider_native_model,
        region_code: route.region_code.clone(),
        request_path: invocation_context.request_path.clone(),
        http_method: invocation_context.http_method.clone(),
        user_agent: invocation_context.user_agent.clone(),
        http_status,
        streaming,
        latency_ms: None,
        ttft_ms: None,
        provider_error_code: None,
        error_type: None,
        error_message_masked: None,
        modality: billing_profile.modality,
        usage_type: billing_profile.usage_type,
        billing_meter_code: billing_profile.input_meter.code().to_owned(),
        base_input_unit_price: input_price
            .customer_charge_before_sale_multiplier
            .to_fixed_string(6),
        base_output_unit_price: output_price
            .as_ref()
            .map(|price| {
                price
                    .customer_charge_before_sale_multiplier
                    .to_fixed_string(6)
            })
            .unwrap_or_else(|| output_customer_charge.to_fixed_string(6)),
        cache_read_unit_price: cache_read_price
            .as_ref()
            .map(|price| {
                price
                    .customer_charge_before_sale_multiplier
                    .to_fixed_string(6)
            })
            .unwrap_or_else(|| cache_read_customer_charge.to_fixed_string(6)),
        sale_multiplier: input_price.sale_multiplier,
        reference_multiplier: input_price.reference_multiplier,
        official_input_unit_price: input_price.official_reference.unit_price.unit_price,
        official_output_unit_price: output_price
            .as_ref()
            .map(|price| price.official_reference.unit_price.unit_price)
            .unwrap_or(DecimalValue::ZERO),
        official_cache_read_unit_price: cache_read_price
            .as_ref()
            .map(|price| price.official_reference.unit_price.unit_price)
            .unwrap_or(DecimalValue::ZERO),
        input_unit_price: input_price.customer_charge.unit_price,
        output_unit_price: output_customer_charge.unit_price,
        customer_cache_read_unit_price: cache_read_customer_charge.unit_price,
        upstream_input_unit_price,
        upstream_output_unit_price,
        upstream_cache_read_unit_price: cache_read_price
            .as_ref()
            .map(upstream_unit_price)
            .unwrap_or(DecimalValue::ZERO),
        currency: input_price.customer_charge.currency,
        pricing_plan_code: route.pricing_plan_code.clone(),
        pricing_snapshot,
    })
}

fn resolve_optional_cache_read_price<C>(
    catalog: &C,
    context: &AuthenticatedApiKeyContext,
    route: &ResolvedOpenAiUpstreamRoute,
    meter: BillingMeter,
    fallback: &ResolvedModelPrice,
) -> DomainResult<Option<ResolvedModelPrice>>
where
    C: PricingCatalog + Send + Sync,
{
    match PricingResolver::new(catalog).resolve(ResolveModelPriceQuery {
        api_key_id: context.api_key_id,
        account_group_id: Some(route.group_id),
        model: route.catalog_key.clone(),
        billing_meter: meter,
        supplier_code: Some(route.supplier_code.clone()),
        account_id: Some(route.account_id),
        region_code: Some(route.region_code.clone()),
    }) {
        Ok(price) => Ok(Some(price)),
        Err(error)
            if error
                .to_string()
                .contains("official reference price not found") =>
        {
            Ok(Some(fallback.clone()))
        }
        Err(error) => Err(error),
    }
}

fn build_pricing_snapshot(
    route: &ResolvedOpenAiUpstreamRoute,
    input_price: &ResolvedModelPrice,
    output_price: Option<&ResolvedModelPrice>,
    cache_read_price: Option<&ResolvedModelPrice>,
) -> String {
    serde_json::json!({
        "vendor": {
            "code": input_price.vendor.code()
        },
        "model": {
            "catalogKey": route.catalog_key.as_str(),
            "model": input_price.model.as_str(),
            "requestedCatalogKey": route.catalog_key.as_str(),
            "providerNativeModel": provider_native_model_id(&route.provider_model)
        },
        "supplier": {
            "code": route.supplier_code.as_str(),
            "accountId": route.account_id
        },
        "pricingPlan": {
            "code": input_price.pricing_plan_code.as_str()
        },
        "group": {
            "code": input_price.group_code.as_str()
        },
        "multipliers": {
            "sale": input_price.sale_multiplier.to_fixed_string(6),
            "reference": input_price.reference_multiplier.to_fixed_string(6),
            "accountContractCost": input_price.account_contract_cost_multiplier.map(|value| value.to_fixed_string(6)),
            "accountGroupCost": input_price.account_group_cost_multiplier.map(|value| value.to_fixed_string(6)),
            "procurementCost": input_price.procurement_cost_multiplier.map(|value| value.to_fixed_string(6))
        },
        "meters": {
            "input": pricing_meter_snapshot(input_price),
            "output": output_price.map(pricing_meter_snapshot),
            "cacheRead": cache_read_price.map(pricing_meter_snapshot)
        }
    })
    .to_string()
}

fn pricing_meter_snapshot(price: &ResolvedModelPrice) -> Value {
    serde_json::json!({
        "meter": price.billing_meter.code(),
        "source": price_source_code(price.source),
        "officialReferenceUnitPrice": price.official_reference.unit_price.to_fixed_string(6),
        "customerChargeBeforeSaleMultiplier": price.customer_charge_before_sale_multiplier.to_fixed_string(6),
        "chargedUnitPrice": price.customer_charge.to_fixed_string(6),
        "rawUpstreamUnitPrice": price
            .raw_upstream_cost
            .as_ref()
            .map(|upstream| upstream.unit_price.to_fixed_string(6))
            .unwrap_or_else(|| "0.000000".to_owned()),
        "procurementCostUnitPrice": price
            .procurement_cost
            .as_ref()
            .map(|cost| cost.to_fixed_string(6))
            .unwrap_or_else(|| "0.000000".to_owned()),
        "currency": price.customer_charge.currency.as_str()
    })
}

fn price_source_code(source: crate::application::ResolvedPriceSource) -> &'static str {
    match source {
        crate::application::ResolvedPriceSource::ExplicitCustomerCharge => {
            "explicit_customer_charge"
        }
        crate::application::ResolvedPriceSource::DerivedFromOfficialReference => {
            "derived_from_official_reference"
        }
    }
}

fn token_amount(unit_price: DecimalValue, quantity: i64) -> DomainResult<DecimalValue> {
    unit_price
        .multiply_i64(quantity)?
        .divide_i64(TOKEN_BILLING_UNIT_SIZE)
}

fn sum_decimal_values(values: &[DecimalValue]) -> DomainResult<DecimalValue> {
    values
        .iter()
        .copied()
        .try_fold(DecimalValue::ZERO, |total, value| total.checked_add(value))
}

fn billable_input_tokens(prompt_tokens: i64, cached_tokens: i64) -> DomainResult<i64> {
    prompt_tokens.checked_sub(cached_tokens).ok_or_else(|| {
        DomainError::new(format!(
            "provider usage.cached_tokens must not exceed prompt_tokens: cached_tokens={cached_tokens}, prompt_tokens={prompt_tokens}"
        ))
    })
}

fn normalize_optional_trace_text(value: Option<String>, max_len: usize) -> Option<String> {
    let value = value?.trim().to_owned();
    if value.is_empty() {
        return None;
    }
    Some(truncate_chars(&value, max_len))
}

fn truncate_chars(value: &str, max_len: usize) -> String {
    let mut truncated = value.chars().take(max_len).collect::<String>();
    if value.chars().count() > max_len {
        truncated.push_str("...");
    }
    truncated
}

fn inferred_error_type(http_status: Option<u16>) -> Option<String> {
    let status = http_status?;
    if status >= 500 {
        return Some("server_error".to_owned());
    }
    if status >= 400 {
        return Some("invalid_request_error".to_owned());
    }
    None
}

pub(crate) fn chat_usage_billing_profile() -> OpenAiUsageBillingProfile {
    OpenAiUsageBillingProfile::chat()
}

pub(crate) fn provider_usage_record_error(error: DomainError) -> OpenAiInvocationPluginError {
    OpenAiInvocationPluginError::new(
        StatusCode::BAD_GATEWAY,
        "provider_usage_record_failed",
        "server_error",
        error.to_string(),
    )
}

fn upstream_unit_price(price: &ResolvedModelPrice) -> DecimalValue {
    price
        .procurement_cost
        .as_ref()
        .map(|price| price.unit_price)
        .unwrap_or(DecimalValue::ZERO)
}

fn zero_money_like(price: &ResolvedModelPrice) -> crate::domain::Money {
    crate::domain::Money {
        currency: price.customer_charge.currency.clone(),
        unit_price: DecimalValue::ZERO,
    }
}

fn endpoint_label(endpoint: OpenAiInvocationEndpoint) -> &'static str {
    match endpoint {
        OpenAiInvocationEndpoint::ChatCompletions => "chat completion",
        OpenAiInvocationEndpoint::Responses => "response",
        OpenAiInvocationEndpoint::Embeddings => "embedding",
    }
}
