use std::sync::Arc;
use std::sync::OnceLock;

use serde_json::Value;

use super::{
    Invocation, InvocationError, InvocationErrorKind, InvocationFuture, InvocationInterceptor,
    InvocationShape,
};
use crate::domain::{provider_native_model_id, BillingMeter};
use crate::ports::{GatewayRequestTraceCommand, GatewayUsageQuantity, GatewayUsageRecorder};

#[derive(Clone)]
pub struct UsageRecordingInterceptor {
    recorder: Arc<dyn GatewayUsageRecorder + Send + Sync>,
}

impl UsageRecordingInterceptor {
    pub fn new(recorder: Arc<dyn GatewayUsageRecorder + Send + Sync>) -> Self {
        Self { recorder }
    }
}

impl InvocationInterceptor for UsageRecordingInterceptor {
    fn name(&self) -> &str {
        "usage_recording"
    }

    fn observe_pipeline_errors(&self) -> bool {
        true
    }

    fn after<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            if invocation.usage.settlement_commands.is_empty() {
                if let Err(error) = self.record_trace_only(invocation, None).await {
                    observe_recording_failure(invocation, "trace", &error);
                }
                return Ok(());
            }

            let command_count = invocation.usage.settlement_commands.len();
            for command_index in 0..command_count {
                let command = invocation.usage.settlement_commands[command_index].clone();
                match self.recorder.record_gateway_usage(command).await {
                    Ok(()) => {}
                    Err(error) => {
                        let error = InvocationError::new(
                            InvocationErrorKind::Telemetry,
                            format!("failed to record invocation usage: {error}"),
                        );
                        observe_recording_failure(invocation, "usage", &error);
                    }
                }
            }
            if let Err(error) = self.record_trace_only(invocation, None).await {
                observe_recording_failure(invocation, "trace", &error);
            }
            Ok(())
        })
    }

    fn on_error<'a>(
        &'a self,
        invocation: &'a mut Invocation,
        error: &'a InvocationError,
    ) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            if let Err(recording_error) = self.record_trace_only(invocation, Some(error)).await {
                observe_recording_failure(invocation, "trace", &recording_error);
            }
            Ok(())
        })
    }
}

fn observe_recording_failure(
    invocation: &mut Invocation,
    record_type: &'static str,
    error: &InvocationError,
) {
    invocation.usage.recording_failure_count =
        invocation.usage.recording_failure_count.saturating_add(1);
    usage_recording_failure_counter()
        .with_label_values(&[record_type])
        .inc();
    tracing::error!(
        tenant_id = invocation.subject.tenant_id,
        organization_id = invocation.subject.organization_id,
        user_id = invocation.subject.user_id,
        request_id = %invocation.request.request_id,
        trace_id = invocation.request.trace_id.as_deref().unwrap_or_default(),
        record_type,
        reconciliation_required = true,
        error = %error,
        "gateway accounting persistence failed after invocation processing"
    );
}

fn usage_recording_failure_counter() -> prometheus::IntCounterVec {
    static METRIC: OnceLock<prometheus::IntCounterVec> = OnceLock::new();
    METRIC
        .get_or_init(|| {
            let metric = prometheus::IntCounterVec::new(
                prometheus::Opts::new(
                    "gateway_accounting_persistence_failures_total",
                    "Gateway trace or usage persistence failures that require reconciliation.",
                )
                .namespace("clawrouter"),
                &["record_type"],
            )
            .expect("gateway accounting persistence failure metric");
            let _ = prometheus::register(Box::new(metric.clone()));
            metric
        })
        .clone()
}

impl UsageRecordingInterceptor {
    async fn record_trace_only(
        &self,
        invocation: &mut Invocation,
        error: Option<&InvocationError>,
    ) -> Result<(), InvocationError> {
        if invocation.usage.trace_recorded {
            Ok(())
        } else {
            let command = trace_command_from_invocation(invocation, error);
            self.recorder
                .record_gateway_trace(command)
                .await
                .map_err(|error| {
                    InvocationError::new(
                        InvocationErrorKind::Telemetry,
                        format!("failed to record invocation trace: {error}"),
                    )
                })?;
            invocation.usage.trace_recorded = true;
            Ok(())
        }
    }
}

fn trace_command_from_invocation(
    invocation: &Invocation,
    error: Option<&InvocationError>,
) -> GatewayRequestTraceCommand {
    let account = invocation.account.as_ref();
    let usage = aggregate_trace_usage(invocation);
    let http_status = invocation
        .telemetry
        .normalized_response
        .as_ref()
        .map(|response| response.status_code)
        .or_else(|| error.map(status_code_for_error))
        .or_else(|| {
            invocation
                .dispatch
                .response
                .as_ref()
                .and_then(|response| effective_dispatch_status_code(invocation, response))
        })
        .or_else(|| {
            invocation
                .routing
                .attempted_routes
                .last()
                .and_then(|attempt| attempt.status_code)
        });
    let catalog_key = catalog_key(invocation);
    let requested_model = requested_model(invocation, &catalog_key);
    let provider_model = provider_model(invocation, account);
    let provider_native_model = provider_native_model_for_recording(invocation, &provider_model);

    GatewayRequestTraceCommand {
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
            .or_else(|| {
                invocation
                    .routing
                    .route_plan
                    .as_ref()
                    .and_then(|plan| plan.current_candidate())
                    .and_then(|candidate| candidate.channel_group_code.clone())
            })
            .unwrap_or_default(),
        catalog_key: catalog_key.clone(),
        requested_model,
        requested_model_catalog_key: invocation
            .resource
            .requested_model_catalog_key
            .clone()
            .unwrap_or_else(|| catalog_key.clone()),
        provider_code: account
            .map(|account| account.provider_code.clone())
            .or_else(|| invocation.resource.provider_code.clone())
            .or_else(|| {
                invocation
                    .routing
                    .attempted_routes
                    .last()
                    .map(|attempt| attempt.provider_code.clone())
            })
            .unwrap_or_default(),
        channel_id: account
            .map(|account| account.channel_id)
            .or_else(|| {
                invocation
                    .routing
                    .attempted_routes
                    .last()
                    .map(|attempt| attempt.channel_id)
            })
            .unwrap_or_default(),
        provider_model: provider_model.clone(),
        provider_native_model,
        region_code: account
            .map(|account| account.region_code.clone())
            .unwrap_or_else(|| "global".to_owned()),
        request_path: invocation.request.path.clone(),
        http_method: invocation.request.method.as_str().to_owned(),
        user_agent: invocation.request.user_agent.clone(),
        http_status,
        streaming: matches!(
            invocation.dispatch.invocation_shape,
            InvocationShape::SseStream
        ),
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        cached_tokens: usage.cached_tokens,
        total_tokens: usage.total_tokens,
        latency_ms: invocation.telemetry.latency_ms,
        ttft_ms: invocation.telemetry.ttft_ms,
        provider_error_code: invocation.telemetry.provider_error_code.clone(),
        error_type: invocation.telemetry.error_type.clone(),
        error_message_masked: invocation.telemetry.error_message_masked.clone(),
    }
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

fn status_code_for_error(error: &InvocationError) -> u16 {
    match error.kind {
        InvocationErrorKind::InvalidRequest | InvocationErrorKind::ResourceClassification => 400,
        InvocationErrorKind::Authentication => 401,
        InvocationErrorKind::Authorization => 403,
        InvocationErrorKind::Idempotency => 409,
        InvocationErrorKind::Routing
        | InvocationErrorKind::Pricing
        | InvocationErrorKind::Dispatch
        | InvocationErrorKind::ProviderPassthroughFailed
        | InvocationErrorKind::Usage
        | InvocationErrorKind::Telemetry
        | InvocationErrorKind::Internal => 502,
        // H-9: tenant in-flight / rate-limit rejection maps to HTTP 429.
        InvocationErrorKind::RateLimit => 429,
    }
}

#[derive(Debug, Clone, Copy, Default)]
struct TraceUsageTotals {
    prompt_tokens: i64,
    completion_tokens: i64,
    cached_tokens: i64,
    total_tokens: i64,
}

fn aggregate_trace_usage(invocation: &Invocation) -> TraceUsageTotals {
    let mut totals = TraceUsageTotals::default();
    for line in &invocation.usage.lines {
        if !is_token_meter(&line.meter) {
            continue;
        }
        if let Ok(tokens) = integer_quantity(&line.quantity) {
            match line.role {
                super::InvocationUsageLineRole::Output => {
                    totals.completion_tokens += tokens;
                    totals.total_tokens += tokens;
                }
                super::InvocationUsageLineRole::CacheRead => {
                    totals.cached_tokens += tokens;
                    totals.total_tokens += tokens;
                }
                super::InvocationUsageLineRole::Input
                | super::InvocationUsageLineRole::Request
                | super::InvocationUsageLineRole::CacheWrite => {
                    totals.prompt_tokens += tokens;
                    totals.total_tokens += tokens;
                }
                super::InvocationUsageLineRole::Result
                | super::InvocationUsageLineRole::Adapter => {}
            }
        }
    }
    totals
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

fn integer_quantity(quantity: &GatewayUsageQuantity) -> Result<i64, std::num::ParseIntError> {
    quantity.billable_quantity.parse::<i64>()
}

fn catalog_key(invocation: &Invocation) -> String {
    invocation
        .resource
        .requested_model_catalog_key
        .clone()
        .unwrap_or_else(|| invocation.resource.route_key.clone())
}

fn requested_model(invocation: &Invocation, catalog_key: &str) -> String {
    invocation
        .resource
        .requested_model
        .clone()
        .or_else(|| invocation.resource.provider_native_model.clone())
        .or_else(|| invocation.resource.endpoint_key.clone())
        .unwrap_or_else(|| model_from_catalog_key(catalog_key))
}

fn provider_model(invocation: &Invocation, account: Option<&super::InvocationAccount>) -> String {
    if is_management_catalog_key(&catalog_key(invocation)) {
        return String::new();
    }
    let raw = account
        .and_then(|account| account.provider_model.clone())
        .filter(|value| !value.trim().is_empty())
        .or_else(|| invocation.resource.provider_native_model.clone())
        .filter(|value| !value.trim().is_empty())
        .or_else(|| invocation.resource.requested_model.clone())
        .filter(|value| !value.trim().is_empty())
        .or_else(|| invocation.resource.endpoint_key.clone())
        .unwrap_or_default();
    provider_native_model_id(raw.trim())
}

fn provider_native_model_for_recording(invocation: &Invocation, provider_model: &str) -> String {
    if is_management_catalog_key(&catalog_key(invocation)) {
        return String::new();
    }
    invocation
        .resource
        .provider_native_model
        .clone()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| provider_model.to_owned())
}

fn is_management_catalog_key(catalog_key: &str) -> bool {
    catalog_key.contains("/management/")
}

fn model_from_catalog_key(catalog_key: &str) -> String {
    catalog_key
        .split_once('/')
        .map(|(_, model)| model)
        .unwrap_or(catalog_key)
        .to_owned()
}
