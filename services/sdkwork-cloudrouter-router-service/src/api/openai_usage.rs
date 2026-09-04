use std::sync::Arc;
use std::sync::OnceLock;

use axum::http::StatusCode;
use serde_json::Value;

use crate::api::openai_invocation::{
    OpenAiInvocationContext, OpenAiInvocationEndpoint, OpenAiInvocationFault,
    OpenAiInvocationPluginError, OpenAiInvocationRelayOutcome,
};
use crate::api::openai_runtime::ResolvedOpenAiUpstreamRoute;
use crate::application::{
    AuthenticatedApiKeyContext, GatewayPricingDecision, PriceResolution, PriceService,
};
use crate::domain::{
    provider_native_model_id, BillingMeter, DecimalValue, DomainError, DomainResult,
    ResourceDefinition,
};
use crate::ports::{
    GatewayRequestTraceCommand, GatewayUsageQuantity, GatewayUsageRecordCommand,
    GatewayUsageRecorder, PricingCatalog, PricingDefaultRegionProvider,
};

const MODALITY_TEXT: i64 = 1;
const MODALITY_EMBEDDING: i64 = 6;
const USAGE_TYPE_INPUT: i64 = 1;
const USAGE_TYPE_OUTPUT: i64 = 2;
const USAGE_TYPE_CACHE_READ: i64 = 3;
const MAX_TRACE_ERROR_MESSAGE_LEN: usize = 1024;

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct OpenAiUsageBillingProfile {
    input_meter: BillingMeter,
    output_meter: Option<BillingMeter>,
    cache_read_meter: Option<BillingMeter>,
    modality: i64,
}

impl OpenAiUsageBillingProfile {
    fn chat() -> Self {
        Self {
            input_meter: BillingMeter::LlmInputToken,
            output_meter: Some(BillingMeter::LlmOutputToken),
            cache_read_meter: Some(BillingMeter::LlmCacheReadToken),
            modality: MODALITY_TEXT,
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
    C: PricingCatalog + PricingDefaultRegionProvider + Send + Sync + 'static,
{
    /// Preflight: resolves every billing quote for this route exactly once,
    /// before any upstream traffic is dispatched. The returned builder is the
    /// single source of prices for the whole invocation — the usage recording
    /// phase must only read it and never re-resolve, so the price used for
    /// billing is exactly the price validated before upstream tokens were
    /// consumed. Fails closed when pricing cannot be loaded or validated.
    pub(crate) fn prepare_usage_command_builder(
        &self,
        context: &OpenAiInvocationContext,
        route: &ResolvedOpenAiUpstreamRoute,
        streaming: bool,
    ) -> DomainResult<GatewayUsageRecordCommandBuilder> {
        let builder = build_usage_record_command_builder(
            self.catalog.as_ref(),
            context,
            &context.api_key_context,
            route,
            0,
            streaming,
            OpenAiUsageBillingProfile::for_endpoint(context.endpoint),
        )?;
        validate_prebuilt_quotes(&builder)?;
        Ok(builder)
    }

    pub(crate) async fn record_after_relay(
        &self,
        context: &OpenAiInvocationContext,
        outcome: &OpenAiInvocationRelayOutcome,
        prebuilt: GatewayUsageRecordCommandBuilder,
    ) -> Result<(), OpenAiInvocationPluginError> {
        if context.stream || !(200..=299).contains(&outcome.status_code) {
            return Ok(());
        }
        let body = outcome.response_body.as_ref().ok_or_else(|| {
            provider_usage_missing_error(
                context.endpoint,
                format!(
                    "provider {} response body is missing for usage recording",
                    endpoint_label(context.endpoint)
                ),
            )
        })?;
        if body.get("usage").filter(|usage| !usage.is_null()).is_none() {
            return Err(provider_usage_missing_error(
                context.endpoint,
                format!(
                    "provider {} response is missing usage",
                    endpoint_label(context.endpoint)
                ),
            ));
        }
        let usage =
            usage_from_response(context.endpoint, body).map_err(provider_usage_record_error)?;
        // The recorded prices come exclusively from the preflight builder that
        // was resolved and validated before the upstream relay. Re-resolving
        // here would race catalog changes and could silently bill zero.
        let mut commands = prebuilt
            .with_http_status(outcome.status_code)
            .build(usage)
            .map_err(provider_usage_record_error)?;
        for command in &mut commands {
            command.latency_ms = outcome.latency_ms;
        }
        self.usage_recorder
            .record_gateway_usage_batch(commands)
            .await
            .map_err(provider_usage_record_error)?;
        Ok(())
    }

    pub(crate) async fn record_after_success(
        &self,
        context: &OpenAiInvocationContext,
        outcome: &OpenAiInvocationRelayOutcome,
        prebuilt: Option<GatewayUsageRecordCommandBuilder>,
    ) -> Result<(), OpenAiInvocationFault> {
        let prebuilt = prebuilt.ok_or_else(|| {
            OpenAiInvocationFault::usage_recording(
                "usage pricing was not preloaded before the relay; refusing to record usage without preflight quotes"
                    .to_owned(),
            )
        })?;
        self.record_after_relay(context, outcome, prebuilt)
            .await
            .map_err(|error| {
                if error.code == "provider_usage_missing" {
                    OpenAiInvocationFault::provider_usage_missing(error.message)
                } else {
                    OpenAiInvocationFault::usage_recording(error.message)
                }
            })
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
    client_ip: Option<String>,
    http_status: u16,
    streaming: bool,
    latency_ms: Option<i64>,
    ttft_ms: Option<i64>,
    provider_error_code: Option<String>,
    error_type: Option<String>,
    error_message_masked: Option<String>,
    modality: i64,
    input_quote: PriceResolution,
    output_quote: Option<PriceResolution>,
    cache_read_quote: Option<PriceResolution>,
}

impl GatewayUsageRecordCommandBuilder {
    pub(crate) fn build(
        &self,
        usage: OpenAiTokenUsage,
    ) -> DomainResult<Vec<GatewayUsageRecordCommand>> {
        let input_tokens = billable_input_tokens(usage.prompt_tokens, usage.cached_tokens)?;
        let mut commands = Vec::with_capacity(3);
        commands.push(self.build_line(
            &self.input_quote,
            input_tokens,
            USAGE_TYPE_INPUT,
            input_tokens,
            0,
            0,
            true,
        )?);
        if let Some(output_quote) = self.output_quote.as_ref() {
            commands.push(self.build_line(
                output_quote,
                usage.completion_tokens,
                USAGE_TYPE_OUTPUT,
                0,
                usage.completion_tokens,
                0,
                false,
            )?);
        }
        if let Some(cache_read_quote) = self.cache_read_quote.as_ref() {
            commands.push(self.build_line(
                cache_read_quote,
                usage.cached_tokens,
                USAGE_TYPE_CACHE_READ,
                0,
                0,
                usage.cached_tokens,
                false,
            )?);
        }
        Ok(commands)
    }

    #[allow(clippy::too_many_arguments)]
    fn build_line(
        &self,
        quoted_resolution: &PriceResolution,
        measured_quantity: i64,
        usage_type: i64,
        prompt_tokens: i64,
        completion_tokens: i64,
        cached_tokens: i64,
        owns_request_count: bool,
    ) -> DomainResult<GatewayUsageRecordCommand> {
        let resolution = rate_price_resolution(quoted_resolution, measured_quantity)?;
        let pricing = GatewayPricingDecision::from_resolution(&resolution)?;
        let quantity = GatewayUsageQuantity::tokens(measured_quantity)?;
        let zero = "0.000000000000".to_owned();
        let (base_input_unit_price, base_output_unit_price, cache_read_unit_price) =
            match usage_type {
                USAGE_TYPE_OUTPUT => (zero.clone(), pricing.base_unit_price.clone(), zero.clone()),
                USAGE_TYPE_CACHE_READ => {
                    (zero.clone(), zero.clone(), pricing.base_unit_price.clone())
                }
                _ => (pricing.base_unit_price.clone(), zero.clone(), zero),
            };
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
            client_ip: self.client_ip.clone(),
            http_status: self.http_status,
            streaming: self.streaming,
            modality: self.modality,
            usage_type,
            billing_meter_code: resolution.audit_snapshot.resource.meter.code().to_owned(),
            unit_size: pricing.unit_size,
            billable_quantity: quantity.billable_quantity.clone(),
            rated_quantity: pricing.rated_quantity,
            prompt_tokens,
            completion_tokens,
            cached_tokens,
            total_tokens: measured_quantity,
            request_count: if owns_request_count { 1 } else { 0 },
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
            pricing_snapshot: openai_pricing_snapshot(self, &resolution),
            official_rate: pricing.official_rate,
        })
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
            client_ip: self.client_ip.clone(),
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

    pub(crate) fn with_http_status(mut self, http_status: u16) -> Self {
        self.http_status = http_status;
        self
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

/// Fails closed when any required quote resolved without a concrete rate
/// (`unrated`). Recording such a fact would persist zero amounts — the exact
/// failure mode that silently dropped billing — so the request is rejected
/// before the upstream relay instead of being billed at zero afterwards.
fn validate_prebuilt_quotes(
    builder: &GatewayUsageRecordCommandBuilder,
) -> DomainResult<()> {
    let mut quotes: Vec<(&str, &PriceResolution)> = Vec::new();
    quotes.push(("input", &builder.input_quote));
    if let Some(output_quote) = builder.output_quote.as_ref() {
        quotes.push(("output", output_quote));
    }
    if let Some(cache_read_quote) = builder.cache_read_quote.as_ref() {
        quotes.push(("cache_read", cache_read_quote));
    }
    for (label, quote) in quotes {
        if quote.resolved_price.is_none() {
            return Err(DomainError::new(format!(
                "pricing catalog has no resolved {} rate for {} in region {} (supplier {}, account {}); refusing to relay unbilled traffic",
                label,
                builder.catalog_key,
                builder.region_code,
                builder.supplier_code,
                builder.account_id,
            )));
        }
    }
    Ok(())
}

pub(crate) fn build_request_trace_command(
    invocation_context: &OpenAiInvocationContext,
    route: Option<&ResolvedOpenAiUpstreamRoute>,
    http_status: Option<u16>,
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
        // Attribute the trace to the account group that actually routed the
        // request, matching the usage fact attribution (`route.group_id`).
        // This keeps error traces and bills aligned for multi-group keys.
        account_group_id: route
            .map(|route| route.group_id)
            .unwrap_or(context.group_id),
        upstream_account_group_snapshot: route
            .map(|route| route.group_code.clone())
            .unwrap_or_else(|| context.group_code.clone()),
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
        client_ip: invocation_context.client_ip.clone(),
        http_status,
        streaming: invocation_context.stream,
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
    C: PricingCatalog + PricingDefaultRegionProvider + Send + Sync,
{
    let price_service = PriceService::new();
    let occurred_at = chrono::Utc::now();
    let input_quote = resolve_openai_price(
        &price_service,
        catalog,
        invocation_context,
        context,
        route,
        billing_profile.input_meter.clone(),
        occurred_at,
    )?;
    let output_price = match billing_profile.output_meter.clone() {
        Some(output_meter) => Some(resolve_openai_price(
            &price_service,
            catalog,
            invocation_context,
            context,
            route,
            output_meter,
            occurred_at,
        )?),
        None => None,
    };
    let cache_read_price = match billing_profile.cache_read_meter.clone() {
        Some(cache_read_meter) => Some(resolve_openai_price(
            &price_service,
            catalog,
            invocation_context,
            context,
            route,
            cache_read_meter,
            occurred_at,
        )?),
        None => None,
    };

    let requested_model_catalog_key = route.catalog_key.clone();
    let provider_native_model = provider_native_model_id(&route.provider_model);
    // The usage fact must carry the billing region that actually priced the
    // request (route region with the admin default-region override applied),
    // not the raw routing region. The recorder validates the persisted official
    // rate against `command.region_code`; a `global` stamp on a request priced
    // by a `cn` regional rate fails that validation and the usage fact would
    // never reach the billing ledger.
    let billing_region_code = usage_billing_region(catalog, context, route);
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
        region_code: billing_region_code,
        request_path: invocation_context.request_path.clone(),
        http_method: invocation_context.http_method.clone(),
        user_agent: invocation_context.user_agent.clone(),
        client_ip: invocation_context.client_ip.clone(),
        http_status,
        streaming,
        latency_ms: None,
        ttft_ms: None,
        provider_error_code: None,
        error_type: None,
        error_message_masked: None,
        modality: billing_profile.modality,
        input_quote,
        output_quote: output_price,
        cache_read_quote: cache_read_price,
    })
}

fn resolve_openai_price<C>(
    price_service: &PriceService,
    catalog: &C,
    invocation_context: &OpenAiInvocationContext,
    context: &AuthenticatedApiKeyContext,
    route: &ResolvedOpenAiUpstreamRoute,
    meter: BillingMeter,
    occurred_at: chrono::DateTime<chrono::Utc>,
) -> DomainResult<PriceResolution>
where
    C: PricingCatalog + PricingDefaultRegionProvider + Send + Sync,
{
    price_service.resolve(
        catalog,
        openai_resource_definition(
            catalog,
            invocation_context,
            context,
            route,
            meter,
            occurred_at,
        ),
    )
}

/// Resolves the billing region for an OpenAI usage resource. The upstream route
/// already folds model-route/tenant/account/deployment regions into
/// `route.region_code`, which lands on the generic `global` bucket when nothing
/// pins a specific region. In that case the configured default billing region
/// for the catalog key (admin "default region" setting) takes effect, so
/// multi-region models like deepseek-v4-flash rate against the correct
/// regional price (e.g. `cn`/CNY) instead of the `global`/USD bucket. When no
/// default is configured the route region is kept unchanged, preserving legacy
/// resolution behavior.
fn usage_billing_region<C>(
    catalog: &C,
    context: &AuthenticatedApiKeyContext,
    route: &ResolvedOpenAiUpstreamRoute,
) -> String
where
    C: PricingCatalog + PricingDefaultRegionProvider + Send + Sync,
{
    let region = route.region_code.trim();
    if !region.is_empty() && !region.eq_ignore_ascii_case("global") {
        return route.region_code.clone();
    }
    catalog
        .default_billing_region(
            context.tenant_id,
            context.organization_id,
            &route.catalog_key,
        )
        .unwrap_or_else(|| route.region_code.clone())
}

fn openai_resource_definition<C>(
    catalog: &C,
    invocation_context: &OpenAiInvocationContext,
    context: &AuthenticatedApiKeyContext,
    route: &ResolvedOpenAiUpstreamRoute,
    meter: BillingMeter,
    occurred_at: chrono::DateTime<chrono::Utc>,
) -> ResourceDefinition
where
    C: PricingCatalog + PricingDefaultRegionProvider + Send + Sync,
{
    let region_code = usage_billing_region(catalog, context, route);
    // The configured default billing region joins the resolver's region
    // fallback chain (requested -> default -> global), so a usage line pinned
    // to a region the price book does not carry still rates against the
    // model's default regional price instead of borrowing `global`.
    let configured_default_region = catalog.default_billing_region(
        context.tenant_id,
        context.organization_id,
        &route.catalog_key,
    );
    ResourceDefinition::new(route.catalog_key.clone(), meter, occurred_at)
        .with_pricing_subject(context.api_key_id, Some(route.group_id))
        .with_vendor_code(catalog_vendor_code(&route.catalog_key))
        .with_provider(route.supplier_code.clone(), Some(route.account_id))
        .with_region_code(region_code)
        .with_default_billing_region(configured_default_region)
        .with_model(invocation_context.requested_model.clone())
        .with_api_code(openai_usage_api_code(invocation_context.endpoint))
}

fn openai_usage_api_code(endpoint: OpenAiInvocationEndpoint) -> &'static str {
    match endpoint {
        OpenAiInvocationEndpoint::ChatCompletions => "openai.chat.completions",
        OpenAiInvocationEndpoint::Responses => "openai.responses",
        OpenAiInvocationEndpoint::Embeddings => "openai.embeddings",
    }
}

fn catalog_vendor_code(catalog_key: &str) -> &str {
    catalog_key
        .split_once('/')
        .map(|(vendor_code, _)| vendor_code)
        .unwrap_or("")
}

fn rate_price_resolution(
    resolution: &PriceResolution,
    measured_quantity: i64,
) -> DomainResult<PriceResolution> {
    let resource = resolution
        .audit_snapshot
        .resource
        .clone()
        .with_measured_quantity(DecimalValue::parse(&measured_quantity.to_string())?);
    if let Some(resolved_price) = resolution.resolved_price.as_ref() {
        return PriceService::new().rate_resolved(resource, resolved_price.clone());
    }
    let mut unrated = resolution.clone();
    unrated.audit_snapshot.resource = resource;
    Ok(unrated)
}

fn openai_pricing_snapshot(
    builder: &GatewayUsageRecordCommandBuilder,
    resolution: &PriceResolution,
) -> String {
    serde_json::json!({
        "source": "price_service",
        "invocation": {
            "requestId": builder.request_id.as_str(),
            "path": builder.request_path.as_str(),
        },
        "resource": {
            "catalogKey": builder.catalog_key.as_str(),
            "requestedModel": builder.requested_model.as_str(),
            "providerNativeModel": builder.provider_native_model.as_str(),
            "meterCode": resolution.audit_snapshot.resource.meter.code(),
            "measuredQuantity": resolution
                .audit_snapshot
                .resource
                .measured_quantity
                .map(|quantity| quantity.to_fixed_string(12)),
        },
        "supplier": {
            "code": builder.supplier_code.as_str(),
            "accountId": builder.account_id,
            "regionCode": builder.region_code.as_str(),
        },
        "pricing": {
            "serviceAudit": resolution.audit_snapshot.to_json_value(),
        },
    })
    .to_string()
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

pub(crate) fn provider_usage_plugin_error_from_fault(
    fault: OpenAiInvocationFault,
) -> OpenAiInvocationPluginError {
    let code = if fault.error_code == "provider_usage_missing" {
        "provider_usage_missing"
    } else {
        "provider_usage_record_failed"
    };
    OpenAiInvocationPluginError::new(StatusCode::BAD_GATEWAY, code, "server_error", fault.message)
}

fn provider_usage_missing_error(
    endpoint: OpenAiInvocationEndpoint,
    message: impl Into<String>,
) -> OpenAiInvocationPluginError {
    observe_provider_usage_missing(endpoint, false);
    OpenAiInvocationPluginError::new(
        StatusCode::BAD_GATEWAY,
        "provider_usage_missing",
        "server_error",
        message,
    )
}

pub(crate) fn observe_provider_usage_missing(endpoint: OpenAiInvocationEndpoint, streaming: bool) {
    provider_usage_missing_counter()
        .with_label_values(&[
            endpoint_metric_label(endpoint),
            if streaming { "true" } else { "false" },
        ])
        .inc();
}

fn provider_usage_missing_counter() -> prometheus::IntCounterVec {
    static METRIC: OnceLock<prometheus::IntCounterVec> = OnceLock::new();
    METRIC
        .get_or_init(|| {
            let metric = prometheus::IntCounterVec::new(
                prometheus::Opts::new(
                    "cloudrouter_gateway_missing_usage_total",
                    "Successful provider responses missing required usage facts.",
                ),
                &["endpoint", "streaming"],
            )
            .expect("provider missing usage metric");
            let _ = prometheus::register(Box::new(metric.clone()));
            metric
        })
        .clone()
}

fn endpoint_metric_label(endpoint: OpenAiInvocationEndpoint) -> &'static str {
    match endpoint {
        OpenAiInvocationEndpoint::ChatCompletions => "chat_completions",
        OpenAiInvocationEndpoint::Responses => "responses",
        OpenAiInvocationEndpoint::Embeddings => "embeddings",
    }
}

fn endpoint_label(endpoint: OpenAiInvocationEndpoint) -> &'static str {
    match endpoint {
        OpenAiInvocationEndpoint::ChatCompletions => "chat completion",
        OpenAiInvocationEndpoint::Responses => "response",
        OpenAiInvocationEndpoint::Embeddings => "embedding",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::InMemoryPricingCatalog;

    fn context(tenant_id: i64, organization_id: i64) -> AuthenticatedApiKeyContext {
        AuthenticatedApiKeyContext {
            api_key_id: 9001,
            tenant_id,
            organization_id,
            user_id: 7001,
            api_key_name_snapshot: "test-key".to_owned(),
            group_id: 5001,
            group_code: "test-group".to_owned(),
            pricing_plan_code: "test-plan".to_owned(),
        }
    }

    fn route(catalog_key: &str, region_code: &str) -> ResolvedOpenAiUpstreamRoute {
        ResolvedOpenAiUpstreamRoute {
            catalog_key: catalog_key.to_owned(),
            group_id: 5001,
            group_code: "test-group".to_owned(),
            pricing_plan_code: "test-plan".to_owned(),
            supplier_code: "deepseek".to_owned(),
            region_code: region_code.to_owned(),
            account_id: 3001,
            provider_model: "deepseek-v4-flash".to_owned(),
            provider_base_url: Some("https://api.deepseek.com".to_owned()),
            provider_secret_ref: Some("secret-ref".to_owned()),
            provider_auth_profile: Default::default(),
            provider_timeout_ms: None,
            provider_retry_policy: None,
        }
    }

    /// Explicit regional routes must keep their region untouched — the usage
    /// billing region only kicks in for the empty/`global` route buckets.
    #[test]
    fn usage_billing_region_keeps_an_explicit_regional_route() {
        let catalog = InMemoryPricingCatalog::default();
        let ctx = context(7, 8);
        let regional = route("deepseek/deepseek-v4-flash", "cn");

        assert_eq!(
            "cn",
            usage_billing_region(&catalog, &ctx, &regional),
            "an explicit cn route region must not be replaced by any default"
        );
    }

    /// `global` routes resolve to the configured default billing region for
    /// the catalog key when the account has no explicit region — this is the
    /// core fix for usage stats pricing deepseek-v4-flash in USD instead of
    /// the configured CNY default.
    #[test]
    fn usage_billing_region_falls_back_to_catalog_default_for_global_route() {
        let mut catalog = InMemoryPricingCatalog::default();
        catalog.set_default_billing_region(7, 8, "deepseek/deepseek-v4-flash", "cn");
        let ctx = context(7, 8);
        let global = route("deepseek/deepseek-v4-flash", "global");

        assert_eq!(
            "cn",
            usage_billing_region(&catalog, &ctx, &global),
            "a global route must fall back to the catalog default billing region"
        );
    }

    /// The same fallback applies when the route region is entirely empty.
    #[test]
    fn usage_billing_region_falls_back_to_catalog_default_for_empty_route_region() {
        let mut catalog = InMemoryPricingCatalog::default();
        catalog.set_default_billing_region(7, 8, "deepseek/deepseek-v4-flash", "cn");
        let ctx = context(7, 8);
        let empty_region = route("deepseek/deepseek-v4-flash", "");

        assert_eq!(
            "cn",
            usage_billing_region(&catalog, &ctx, &empty_region),
            "an empty route region must fall back to the catalog default billing region"
        );
    }

    /// Scoped defaults win over the global `(0, 0)` row, mirroring the
    /// `SqlPricingCatalogSnapshot` lookup order.
    #[test]
    fn usage_billing_region_prefers_scoped_default_over_global_default() {
        let mut catalog = InMemoryPricingCatalog::default();
        catalog.set_default_billing_region(0, 0, "deepseek/deepseek-v4-flash", "us");
        catalog.set_default_billing_region(7, 8, "deepseek/deepseek-v4-flash", "cn");
        let ctx = context(7, 8);
        let global = route("deepseek/deepseek-v4-flash", "global");

        assert_eq!(
            "cn",
            usage_billing_region(&catalog, &ctx, &global),
            "the tenant/organization scoped default must shadow the global default"
        );
    }

    /// With no default configured the route region is preserved unchanged —
    /// legacy behavior stays intact for models that only price `global`.
    #[test]
    fn usage_billing_region_preserves_route_region_when_no_default_configured() {
        let catalog = InMemoryPricingCatalog::default();
        let ctx = context(7, 8);
        let global = route("openai/legacy-model", "global");

        assert_eq!(
            "global",
            usage_billing_region(&catalog, &ctx, &global),
            "without a configured default the global route region must be preserved"
        );
    }
}
