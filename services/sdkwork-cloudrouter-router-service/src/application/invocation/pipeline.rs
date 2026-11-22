use std::sync::Arc;

use axum::body::Body;
use serde_json::Value;

use tracing::Instrument;

use super::{
    record_streaming_usage_body, tenant_lease_loss_error, BillingMode, BillingQuantitySource,
    Invocation, InvocationBody, InvocationCancellationSignal, InvocationError, InvocationErrorKind,
    InvocationInterceptor, InvocationSurface,
};
#[cfg(test)]
use crate::domain::BillingOwnerKind;

#[derive(Clone, Default)]
pub struct InvocationPipeline {
    interceptors: Vec<Arc<dyn InvocationInterceptor>>,
}

/// A completed response pipeline either owns a fully finalized invocation or
/// a streaming invocation whose terminal work is still pending.
pub enum InvocationPipelineExecution {
    Completed(Invocation),
    DeferredStream(DeferredStreamInvocation),
}

/// Carries an invocation that has produced stream headers but has not yet
/// reached a terminal body state. It is intentionally non-cloneable: exactly
/// one terminal path may settle usage and release distributed coordination.
pub struct DeferredStreamInvocation {
    pipeline: InvocationPipeline,
    started: Vec<usize>,
    completed_before_stream: Vec<usize>,
    invocation: Invocation,
}

/// The response fields required by the HTTP transport while the invocation is
/// retained for terminal accounting.
pub struct DeferredStreamResponse {
    pub status_code: u16,
    pub content_type: Option<String>,
    /// Safe upstream headers preserved for the client (e.g. `retry-after`,
    /// `x-request-id`).
    pub headers: axum::http::HeaderMap,
    pub body: Body,
}

/// Terminal state supplied by the streaming transport after it has observed
/// the upstream body incrementally.
///
/// Every non-`Completed` outcome carries `partial_usage`: the last provider
/// usage frame observed before the interruption, or an estimate derived from
/// the streamed output, so an interrupted stream is still billed for the
/// spend the provider already incurred.
#[derive(Debug)]
pub enum StreamTerminalOutcome {
    Completed {
        usage_body: Option<Value>,
        ttft_ms: Option<i64>,
    },
    Cancelled {
        ttft_ms: Option<i64>,
        partial_usage: Option<Value>,
    },
    TimedOut {
        stage: &'static str,
        ttft_ms: Option<i64>,
        partial_usage: Option<Value>,
    },
    UpstreamError {
        message: String,
        ttft_ms: Option<i64>,
        partial_usage: Option<Value>,
    },
    LeaseLost {
        ttft_ms: Option<i64>,
        partial_usage: Option<Value>,
    },
}

/// Preserves both the pipeline error and the invocation-owned normalized
/// response so HTTP callers can retain the established error behavior.
pub struct InvocationPipelineFailure {
    pub invocation: Invocation,
    pub error: InvocationError,
}

/// Builds the request-scoped tracing span that carries correlation fields
/// through the whole invocation pipeline. Debug level keeps the span (and its
/// inherited fields) invisible under the default release `info` filter while
/// making dev-mode (`RUST_LOG=debug`) runs fully traceable per request.
fn invocation_pipeline_span(invocation: &Invocation) -> tracing::span::Span {
    tracing::debug_span!(
        "invocation.pipeline",
        request_id = %invocation.request.request_id,
        trace_id = %invocation.request.trace_id.as_deref().unwrap_or(""),
        method = %invocation.request.method,
        path = %invocation.request.path,
        api_code = %invocation.resource.api_code,
        catalog_key = %invocation
            .resource
            .requested_model_catalog_key
            .as_deref()
            .unwrap_or(""),
        requested_model = %invocation
            .resource
            .requested_model
            .as_deref()
            .unwrap_or(""),
        api_key_id = invocation.subject.api_key_id.unwrap_or(0),
        tenant_id = invocation.subject.tenant_id,
        organization_id = invocation.subject.organization_id,
        account_group_id = invocation.subject.account_group_id.unwrap_or(0),
        user_id = invocation.subject.user_id,
    )
}

impl InvocationPipeline {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_interceptor<I>(mut self, interceptor: I) -> Self
    where
        I: InvocationInterceptor,
    {
        self.interceptors.push(Arc::new(interceptor));
        self
    }

    pub fn interceptor_count(&self) -> usize {
        self.interceptors.len()
    }

    pub async fn execute(&self, invocation: &mut Invocation) -> Result<(), InvocationError> {
        // The span is attached with `Instrument` instead of `entered()` so the
        // span guard is never held across `.await` points (which would make
        // the future non-`Send` and break axum handlers / `tokio::spawn`).
        let span = invocation_pipeline_span(invocation);
        async {
            let mut started = Vec::new();
            for (index, interceptor) in self.interceptors.iter().enumerate() {
                if let Err(error) = ensure_invocation_active(invocation) {
                    self.notify_error(invocation, &started, &error).await;
                    return Err(error);
                }
                match interceptor.before(invocation).await {
                    Ok(()) => {
                        started.push(index);
                        if let Err(error) = ensure_invocation_active(invocation) {
                            self.notify_error(invocation, &started, &error).await;
                            return Err(error);
                        }
                    }
                    Err(error) => {
                        // Notify the failed interceptor first so it can perform
                        // any necessary cleanup, then notify all interceptors
                        // that successfully completed `before`.
                        let _ = interceptor.on_error(invocation, &error).await;
                        self.notify_error(invocation, &started, &error).await;
                        return Err(error);
                    }
                }
            }

            // Delegate to the shared `after` chain so both execution entry
            // points keep the same response-preservation guarantee: a failing
            // accounting hook must not discard a provider response that already
            // succeeded.
            self.finish_after(invocation, &started, &[]).await?;

            Ok(())
        }
        .instrument(span)
        .await
    }

    /// Executes all `before` hooks and either finalizes an ordinary response or
    /// returns a deferred stream lifecycle. Only interceptors that explicitly
    /// opt in via [`InvocationInterceptor::completes_before_stream`] may run
    /// before the stream body reaches the client.
    pub async fn execute_for_response(
        &self,
        mut invocation: Invocation,
    ) -> Result<InvocationPipelineExecution, InvocationPipelineFailure> {
        let span = invocation_pipeline_span(&invocation);
        async {
            let mut started = Vec::new();
            for (index, interceptor) in self.interceptors.iter().enumerate() {
                if let Err(error) = ensure_invocation_active(&invocation) {
                    self.notify_error(&mut invocation, &started, &error).await;
                    return Err(InvocationPipelineFailure { invocation, error });
                }
                match interceptor.before(&mut invocation).await {
                    Ok(()) => {
                        started.push(index);
                        if let Err(error) = ensure_invocation_active(&invocation) {
                            self.notify_error(&mut invocation, &started, &error).await;
                            return Err(InvocationPipelineFailure { invocation, error });
                        }
                    }
                    Err(error) => {
                        let _ = interceptor.on_error(&mut invocation, &error).await;
                        self.notify_error(&mut invocation, &started, &error).await;
                        return Err(InvocationPipelineFailure { invocation, error });
                    }
                }
            }

            if !has_pending_stream(&invocation) {
                if let Err(error) = self.finish_after(&mut invocation, &started, &[]).await {
                    return Err(InvocationPipelineFailure { invocation, error });
                }
                return Ok(InvocationPipelineExecution::Completed(invocation));
            }

            let mut completed_before_stream = Vec::new();
            for index in started.iter().rev() {
                let interceptor = &self.interceptors[*index];
                if !interceptor.completes_before_stream() {
                    continue;
                }
                if let Err(error) = ensure_invocation_active(&invocation) {
                    self.notify_error(&mut invocation, &started, &error).await;
                    return Err(InvocationPipelineFailure { invocation, error });
                }
                if let Err(error) = interceptor.after(&mut invocation).await {
                    self.notify_error(&mut invocation, &started, &error).await;
                    return Err(InvocationPipelineFailure { invocation, error });
                }
                completed_before_stream.push(*index);
                if let Err(error) = ensure_invocation_active(&invocation) {
                    self.notify_error(&mut invocation, &started, &error).await;
                    return Err(InvocationPipelineFailure { invocation, error });
                }
            }

            Ok(InvocationPipelineExecution::DeferredStream(
                DeferredStreamInvocation {
                    pipeline: self.clone(),
                    started,
                    completed_before_stream,
                    invocation,
                },
            ))
        }
        .instrument(span)
        .await
    }

    async fn finish_after(
        &self,
        invocation: &mut Invocation,
        started: &[usize],
        completed_before_stream: &[usize],
    ) -> Result<(), InvocationError> {
        // `started` is ascending, so popping from the end walks it in reverse
        // registration order (the `after` contract). `pending` always holds the
        // hooks that have not run yet, which lets a failure force response
        // finalization before those remaining hooks are skipped.
        let mut pending: Vec<usize> = started
            .iter()
            .copied()
            .filter(|index| !completed_before_stream.contains(index))
            .collect();
        while let Some(index) = pending.pop() {
            if let Err(error) = ensure_invocation_active(invocation) {
                self.notify_error(invocation, started, &error).await;
                return Err(error);
            }
            if let Err(error) = self.interceptors[index].after(invocation).await {
                self.finalize_response_before_failure(invocation, &pending)
                    .await;
                self.notify_error(invocation, started, &error).await;
                return Err(error);
            }
            if let Err(error) = ensure_invocation_active(invocation) {
                self.notify_error(invocation, started, &error).await;
                return Err(error);
            }
        }
        Ok(())
    }

    /// Materializes the dispatched provider response when a later `after` hook
    /// fails.
    ///
    /// Accounting, telemetry, and sticky hooks are registered after the response
    /// normalizer, so their failures abort the reverse `after` chain before the
    /// normalizer runs. The HTTP layer then sees no normalized response and
    /// synthesizes a gateway problem, discarding a provider response that
    /// already succeeded — and that the platform already paid for.
    async fn finalize_response_before_failure(
        &self,
        invocation: &mut Invocation,
        pending: &[usize],
    ) {
        if invocation.telemetry.normalized_response.is_some()
            || invocation.dispatch.response.is_none()
        {
            return;
        }
        for index in pending.iter().rev() {
            if !self.interceptors[*index].finalizes_response() {
                continue;
            }
            if let Err(error) = self.interceptors[*index].after(invocation).await {
                tracing::warn!(
                    %error,
                    request_id = %invocation.request.request_id,
                    "response normalization failed while preserving a successful provider response"
                );
            }
            return;
        }
    }

    async fn notify_error(
        &self,
        invocation: &mut Invocation,
        started: &[usize],
        error: &InvocationError,
    ) {
        // An `on_error` hook is the last chance to release a precharge hold,
        // refund, or clear a lease. Swallowing its failure silently leaves funds
        // or permits frozen until a TTL expires with no operator signal, so each
        // failure is logged with the hook that failed.
        for index in started.iter().rev() {
            let interceptor = &self.interceptors[*index];
            if let Err(hook_error) = interceptor.on_error(invocation, error).await {
                tracing::error!(
                    interceptor = interceptor.name(),
                    pipeline_error_kind = error.kind.code(),
                    %hook_error,
                    request_id = %invocation.request.request_id,
                    "invocation interceptor failed to handle a pipeline error"
                );
            }
        }
        for (index, interceptor) in self.interceptors.iter().enumerate().rev() {
            if started.contains(&index) || !interceptor.observe_pipeline_errors() {
                continue;
            }
            if let Err(hook_error) = interceptor.on_error(invocation, error).await {
                tracing::error!(
                    interceptor = interceptor.name(),
                    pipeline_error_kind = error.kind.code(),
                    %hook_error,
                    request_id = %invocation.request.request_id,
                    "invocation error observer failed to handle a pipeline error"
                );
            }
        }
    }
}

impl DeferredStreamInvocation {
    /// Moves the normalized body into the HTTP transport while retaining all
    /// invocation state required for terminal accounting.
    pub fn take_response(&mut self) -> Result<DeferredStreamResponse, InvocationError> {
        let normalized = self
            .invocation
            .telemetry
            .normalized_response
            .as_ref()
            .ok_or_else(|| stream_lifecycle_error("stream response was not normalized"))?;
        let body = normalized
            .stream_body
            .lock()
            .map_err(|_| stream_lifecycle_error("stream response body lock is poisoned"))?
            .take()
            .ok_or_else(|| stream_lifecycle_error("stream response body is unavailable"))?;
        Ok(DeferredStreamResponse {
            status_code: normalized.status_code,
            content_type: normalized.content_type.clone(),
            headers: normalized.headers.clone(),
            body,
        })
    }

    /// 网关是否为这条流强制打开了 `stream_options.include_usage`。
    ///
    /// 只有 OpenAI 兼容面的 Chat Completions 流会这样做（见
    /// `ProviderRequestBuilder::ensure_stream_usage_requested`）；对应的
    /// usage-only chunk 应在转发给客户端前剔除，避免改变未主动开启该选项的
    /// 客户端可见的流形状。
    pub fn suppress_usage_only_chunks(&self) -> bool {
        should_suppress_gateway_usage_chunk(
            &self.invocation.resource.surface,
            &self.invocation.resource.api_code,
            &self.invocation.request.body,
        )
    }

    pub fn cancellation_signal(&self) -> InvocationCancellationSignal {
        self.invocation.request.cancellation_signal()
    }

    /// Correlation context for the deferred stream: `(request_id, trace_id)`.
    /// Used by the HTTP transport to attach trace headers before the body is
    /// streamed, so stream responses carry the same trace identity as
    /// synchronous ones.
    pub fn trace_context(&self) -> (String, Option<String>) {
        (
            self.invocation.request.request_id.clone(),
            self.invocation.telemetry.trace_id.clone(),
        )
    }

    /// Finalizes the deferred invocation exactly once after the transport has
    /// observed EOF, cancellation, timeout, or an upstream read failure.
    pub async fn complete(mut self, outcome: StreamTerminalOutcome) -> Result<(), InvocationError> {
        let span = invocation_pipeline_span(&self.invocation);
        async move {
            match outcome {
                StreamTerminalOutcome::Completed {
                    usage_body,
                    ttft_ms,
                } => {
                    self.invocation.telemetry.ttft_ms = ttft_ms;
                    if self
                        .invocation
                        .request
                        .cancellation_signal()
                        .is_tenant_lease_lost()
                    {
                        return self.fail_terminal(tenant_lease_loss_error()).await;
                    }
                    if streaming_usage_is_required(&self.invocation) {
                        let Some(usage_body) = usage_body else {
                            return self
                                .fail_terminal(stream_lifecycle_error(
                                    "successful streaming provider response did not include usage",
                                ))
                                .await;
                        };
                        if let Err(error) =
                            record_streaming_usage_body(&mut self.invocation, &usage_body)
                        {
                            return self.fail_terminal(error).await;
                        }
                        if self.invocation.usage.lines.is_empty() {
                            return self
                            .fail_terminal(stream_lifecycle_error(
                                "successful streaming provider response produced no billable usage",
                            ))
                            .await;
                        }
                    }
                    self.pipeline
                        .finish_after(
                            &mut self.invocation,
                            &self.started,
                            &self.completed_before_stream,
                        )
                        .await
                }
                StreamTerminalOutcome::Cancelled {
                    ttft_ms,
                    partial_usage,
                } => {
                    self.invocation.telemetry.ttft_ms = ttft_ms;
                    self.settle_partial_then_fail(
                        partial_usage,
                        stream_lifecycle_error("client cancelled provider stream"),
                        // The client hung up; the account is healthy.
                        false,
                    )
                    .await
                }
                StreamTerminalOutcome::TimedOut {
                    stage,
                    ttft_ms,
                    partial_usage,
                } => {
                    self.invocation.telemetry.ttft_ms = ttft_ms;
                    self.settle_partial_then_fail(
                        partial_usage,
                        stream_lifecycle_error(format!(
                            "provider stream {stage} deadline exceeded"
                        )),
                        // A stalled stream is the provider's fault: the account
                        // must reach the circuit breaker.
                        true,
                    )
                    .await
                }
                StreamTerminalOutcome::UpstreamError {
                    message,
                    ttft_ms,
                    partial_usage,
                } => {
                    self.invocation.telemetry.ttft_ms = ttft_ms;
                    self.settle_partial_then_fail(
                        partial_usage,
                        stream_lifecycle_error(format!("provider stream failed: {message}")),
                        // The body broke mid-answer: the account is at fault.
                        true,
                    )
                    .await
                }
                StreamTerminalOutcome::LeaseLost {
                    ttft_ms,
                    partial_usage,
                } => {
                    self.invocation.telemetry.ttft_ms = ttft_ms;
                    self.settle_partial_then_fail(
                        partial_usage,
                        tenant_lease_loss_error(),
                        // The tenant lost its lease; the provider did nothing wrong.
                        false,
                    )
                    .await
                }
            }
        }
        .instrument(span)
        .await
    }

    /// Finalizes an interrupted stream that may already have produced billable
    /// provider spend (timeout, client cancellation, upstream failure, lease
    /// loss). The observed partial usage is recorded through the same pricing
    /// path as a successful stream, then the full after-chain persists the
    /// usage facts and settles the produced tokens. The terminal error is only
    /// surfaced when that settlement path itself fails — the HTTP client has
    /// already observed the truncated stream, so `Ok(())` here does not hide
    /// the interruption from the caller's response body.
    async fn settle_partial_then_fail(
        mut self,
        partial_usage: Option<Value>,
        error: InvocationError,
        account_fault: bool,
    ) -> Result<(), InvocationError> {
        // Marks the invocation as an interrupted stream: the after-chain still
        // runs to persist usage and settle the produced tokens, but side effects
        // that assume a healthy upstream (sticky commit) must not fire.
        self.invocation.telemetry.stream_interrupted = true;
        // The dispatch attempt was recorded as a success when the provider's
        // response headers arrived. A stream that then broke is an account fault
        // even though the transport said 200, so rewrite the attempt before the
        // circuit breaker finalizes it.
        if account_fault {
            mark_stream_account_failure(&mut self.invocation, &error);
        }
        if let Some(usage_body) = partial_usage.as_ref() {
            if streaming_usage_is_required(&self.invocation) {
                if let Err(record_error) =
                    record_streaming_usage_body(&mut self.invocation, usage_body)
                {
                    tracing::warn!(
                        error = %record_error,
                        request_id = %self.invocation.request.request_id,
                        "interrupted stream partial usage was not billable"
                    );
                }
            }
        }
        let outcome = match self
            .pipeline
            .finish_after(
                &mut self.invocation,
                &self.started,
                &self.completed_before_stream,
            )
            .await
        {
            Ok(()) => {
                if partial_usage.is_some() {
                    tracing::warn!(
                        request_id = %self.invocation.request.request_id,
                        trace_id = %self.invocation.telemetry.trace_id.as_deref().unwrap_or(""),
                        "interrupted provider stream settled for the usage it produced"
                    );
                }
                Ok(())
            }
            Err(settlement_error) => {
                tracing::warn!(
                    error = %settlement_error,
                    request_id = %self.invocation.request.request_id,
                    "interrupted stream settlement failed; surfacing terminal error"
                );
                self.fail_terminal(error).await
            }
        };
        outcome
    }

    async fn fail_terminal(&mut self, error: InvocationError) -> Result<(), InvocationError> {
        self.pipeline
            .notify_error(&mut self.invocation, &self.started, &error)
            .await;
        Err(error)
    }
}

/// Rewrites the account's latest dispatch attempt from success to a stream
/// failure.
///
/// A dispatch attempt is recorded as a success as soon as the provider's
/// response headers arrive. Without this rewrite an account that only ever
/// streams a broken body looks healthy forever: the circuit breaker never cools
/// it down and it keeps receiving traffic.
fn mark_stream_account_failure(invocation: &mut Invocation, error: &InvocationError) {
    let Some(attempt) = invocation.routing.attempted_routes.last_mut() else {
        return;
    };
    if !attempt.success {
        return;
    }
    attempt.success = false;
    attempt.retryable = true;
    attempt.error_code = Some("provider_stream_failed".to_owned());
    attempt.error_message = Some(error.message.clone());
}

fn ensure_invocation_active(invocation: &Invocation) -> Result<(), InvocationError> {
    if invocation
        .request
        .cancellation_signal()
        .is_tenant_lease_lost()
    {
        Err(tenant_lease_loss_error())
    } else {
        Ok(())
    }
}

fn has_pending_stream(invocation: &Invocation) -> bool {
    invocation
        .dispatch
        .response
        .as_ref()
        .is_some_and(|response| {
            response
                .stream_body
                .lock()
                .map(|body| body.is_some())
                .unwrap_or(false)
        })
}

fn streaming_usage_is_required(invocation: &Invocation) -> bool {
    invocation.billing.mode != BillingMode::Free
        && invocation.billing.quantity_source == BillingQuantitySource::StreamingAccumulator
}

fn stream_lifecycle_error(message: impl Into<String>) -> InvocationError {
    InvocationError::new(InvocationErrorKind::Usage, message)
}

/// Whether the provider's usage-only chunk must be hidden from the client.
///
/// The gateway forces `stream_options.include_usage` on OpenAI-compatible chat
/// streams so it can meter input tokens. Providers then emit one extra
/// `choices: []` chunk carrying `usage`; that chunk changes the client-visible
/// stream shape, so it is removed again — but only when the gateway itself
/// introduced the option. A client that asked for `include_usage` explicitly
/// must still receive the chunk it requested.
fn should_suppress_gateway_usage_chunk(
    surface: &InvocationSurface,
    api_code: &str,
    body: &InvocationBody,
) -> bool {
    if *surface != InvocationSurface::OpenAiCompatible || api_code != "openai.chat_completions" {
        return false;
    }
    let InvocationBody::Json(value) = body else {
        return false;
    };
    value.get("stream").and_then(Value::as_bool) == Some(true)
        && value
            .pointer("/stream_options/include_usage")
            .and_then(Value::as_bool)
            != Some(true)
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicUsize, Ordering};

    use axum::http::Method;

    use super::*;
    use crate::application::{
        InvocationAuthType, InvocationBilling, InvocationRequest, InvocationResource,
        InvocationSubject,
    };
    use crate::domain::RoutingCapability;

    struct MarkTenantLeaseLost {
        error_notifications: Arc<AtomicUsize>,
    }

    impl InvocationInterceptor for MarkTenantLeaseLost {
        fn name(&self) -> &str {
            "mark_tenant_lease_lost"
        }

        fn before<'a>(
            &'a self,
            invocation: &'a mut Invocation,
        ) -> super::super::InvocationFuture<'a, ()> {
            Box::pin(async move {
                invocation
                    .request
                    .cancellation_signal()
                    .mark_tenant_lease_lost();
                Ok(())
            })
        }

        fn on_error<'a>(
            &'a self,
            _invocation: &'a mut Invocation,
            _error: &'a InvocationError,
        ) -> super::super::InvocationFuture<'a, ()> {
            Box::pin(async move {
                self.error_notifications.fetch_add(1, Ordering::SeqCst);
                Ok(())
            })
        }
    }

    struct CountBefore(Arc<AtomicUsize>);

    impl InvocationInterceptor for CountBefore {
        fn name(&self) -> &str {
            "count_before"
        }

        fn before<'a>(
            &'a self,
            _invocation: &'a mut Invocation,
        ) -> super::super::InvocationFuture<'a, ()> {
            Box::pin(async move {
                self.0.fetch_add(1, Ordering::SeqCst);
                Ok(())
            })
        }
    }

    fn invocation() -> Invocation {
        Invocation::new(
            InvocationRequest::new(Method::POST, "/v1/chat/completions")
                .with_request_id("request-lease-loss"),
            InvocationSubject {
                auth_type: InvocationAuthType::GatewayApiKey,
                api_key_id: Some(1),
                api_key_name_snapshot: None,
                tenant_id: 10,
                organization_id: 20,
                user_id: 30,
                billing_organization_id: 0,
                billing_owner: BillingOwnerKind::Personal,
                account_group_id: None,
                account_group_code: None,
                pricing_plan_code: None,
                roles: Vec::new(),
                scopes: Vec::new(),
            },
            InvocationResource::api_resource(
                "openai/chat/completions",
                "openai.chat.completions",
                RoutingCapability::Chat,
            ),
            InvocationBilling::free(),
        )
    }

    #[tokio::test]
    async fn confirmed_lease_loss_stops_the_pipeline_and_runs_cleanup() {
        let error_notifications = Arc::new(AtomicUsize::new(0));
        let later_before_calls = Arc::new(AtomicUsize::new(0));
        let pipeline = InvocationPipeline::new()
            .with_interceptor(MarkTenantLeaseLost {
                error_notifications: Arc::clone(&error_notifications),
            })
            .with_interceptor(CountBefore(Arc::clone(&later_before_calls)));
        let mut invocation = invocation();

        let error = pipeline
            .execute(&mut invocation)
            .await
            .expect_err("confirmed tenant lease loss must cancel the invocation");

        assert_eq!(InvocationErrorKind::RateLimit, error.kind);
        assert_eq!(0, later_before_calls.load(Ordering::SeqCst));
        assert_eq!(1, error_notifications.load(Ordering::SeqCst));
    }

    /// A stream that breaks after the response headers were accepted must not
    /// leave the account recorded as successful, or the circuit breaker never
    /// cools it down and it keeps receiving traffic.
    #[test]
    fn a_mid_stream_failure_rewrites_the_successful_attempt() {
        let mut invocation = invocation();
        invocation
            .routing
            .attempted_routes
            .push(crate::application::invocation::InvocationRouteAttempt {
                supplier_code: "openai".to_owned(),
                account_id: 3001,
                candidate_index: 0,
                status_code: Some(200),
                success: true,
                retryable: true,
                error_code: None,
                error_message: None,
                latency_ms: Some(12),
            });
        let error = InvocationError::new(
            InvocationErrorKind::Dispatch,
            "provider stream idle deadline exceeded",
        );

        mark_stream_account_failure(&mut invocation, &error);

        let attempt = &invocation.routing.attempted_routes[0];
        assert!(!attempt.success);
        assert!(attempt.retryable);
        assert_eq!(
            Some("provider_stream_failed"),
            attempt.error_code.as_deref()
        );
        assert_eq!(
            Some("provider stream idle deadline exceeded"),
            attempt.error_message.as_deref()
        );
    }

    #[test]
    fn an_already_failed_attempt_is_not_rewritten() {
        let mut invocation = invocation();
        invocation
            .routing
            .attempted_routes
            .push(crate::application::invocation::InvocationRouteAttempt {
                supplier_code: "openai".to_owned(),
                account_id: 3001,
                candidate_index: 0,
                status_code: Some(503),
                success: false,
                retryable: true,
                error_code: Some("provider_unavailable".to_owned()),
                error_message: Some("already recorded".to_owned()),
                latency_ms: Some(9),
            });
        let error = InvocationError::new(InvocationErrorKind::Dispatch, "stream failed");

        mark_stream_account_failure(&mut invocation, &error);

        let attempt = &invocation.routing.attempted_routes[0];
        assert_eq!(Some("provider_unavailable"), attempt.error_code.as_deref());
        assert_eq!(Some("already recorded"), attempt.error_message.as_deref());
    }

    /// The gateway hides the usage-only chunk it forced the provider to emit, but
    /// never one the client asked for.
    #[test]
    fn usage_only_chunk_is_suppressed_only_when_the_gateway_introduced_the_option() {
        let surface = InvocationSurface::OpenAiCompatible;
        let body = |value: Value| InvocationBody::Json(value);

        // Stream without include_usage: the gateway injects it, so it hides the
        // extra chunk again.
        assert!(should_suppress_gateway_usage_chunk(
            &surface,
            "openai.chat_completions",
            &body(serde_json::json!({"stream": true}))
        ));
        assert!(should_suppress_gateway_usage_chunk(
            &surface,
            "openai.chat_completions",
            &body(serde_json::json!({"stream": true, "stream_options": {"include_usage": false}}))
        ));
        // The client asked for usage: forwarding it is part of the contract.
        assert!(!should_suppress_gateway_usage_chunk(
            &surface,
            "openai.chat_completions",
            &body(serde_json::json!({"stream": true, "stream_options": {"include_usage": true}}))
        ));
        // Non-streaming, other surfaces and other api codes are never rewritten.
        assert!(!should_suppress_gateway_usage_chunk(
            &surface,
            "openai.chat_completions",
            &body(serde_json::json!({"stream": false}))
        ));
        assert!(!should_suppress_gateway_usage_chunk(
            &InvocationSurface::ProviderNative,
            "openai.chat_completions",
            &body(serde_json::json!({"stream": true}))
        ));
        assert!(!should_suppress_gateway_usage_chunk(
            &surface,
            "openai.responses",
            &body(serde_json::json!({"stream": true}))
        ));
    }
}
