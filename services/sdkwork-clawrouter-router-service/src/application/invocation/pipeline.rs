use std::sync::Arc;
use std::time::Duration;

use axum::body::Body;
use serde_json::Value;

use super::{
    record_streaming_usage_body, BillingMode, BillingQuantitySource, Invocation,
    InvocationCancellationSignal, InvocationError, InvocationErrorKind, InvocationInterceptor,
};

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
    pub body: Body,
}

/// Terminal state supplied by the streaming transport after it has observed
/// the upstream body incrementally.
#[derive(Debug)]
pub enum StreamTerminalOutcome {
    Completed {
        usage_body: Option<Value>,
        ttft_ms: Option<i64>,
    },
    Cancelled {
        ttft_ms: Option<i64>,
    },
    TimedOut {
        stage: &'static str,
        ttft_ms: Option<i64>,
    },
    UpstreamError {
        message: String,
        ttft_ms: Option<i64>,
    },
    LeaseLost {
        ttft_ms: Option<i64>,
    },
}

/// Preserves both the pipeline error and the invocation-owned normalized
/// response so HTTP callers can retain the established error behavior.
pub struct InvocationPipelineFailure {
    pub invocation: Invocation,
    pub error: InvocationError,
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

        for index in started.iter().rev() {
            if let Err(error) = ensure_invocation_active(invocation) {
                self.notify_error(invocation, &started, &error).await;
                return Err(error);
            }
            if let Err(error) = self.interceptors[*index].after(invocation).await {
                self.notify_error(invocation, &started, &error).await;
                return Err(error);
            }
            if let Err(error) = ensure_invocation_active(invocation) {
                self.notify_error(invocation, &started, &error).await;
                return Err(error);
            }
        }

        Ok(())
    }

    /// Executes all `before` hooks and either finalizes an ordinary response or
    /// returns a deferred stream lifecycle. Only interceptors that explicitly
    /// opt in via [`InvocationInterceptor::completes_before_stream`] may run
    /// before the stream body reaches the client.
    pub async fn execute_for_response(
        &self,
        mut invocation: Invocation,
    ) -> Result<InvocationPipelineExecution, InvocationPipelineFailure> {
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

    async fn finish_after(
        &self,
        invocation: &mut Invocation,
        started: &[usize],
        completed_before_stream: &[usize],
    ) -> Result<(), InvocationError> {
        for index in started.iter().rev() {
            if completed_before_stream.contains(index) {
                continue;
            }
            if let Err(error) = ensure_invocation_active(invocation) {
                self.notify_error(invocation, started, &error).await;
                return Err(error);
            }
            if let Err(error) = self.interceptors[*index].after(invocation).await {
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

    async fn notify_error(
        &self,
        invocation: &mut Invocation,
        started: &[usize],
        error: &InvocationError,
    ) {
        for index in started.iter().rev() {
            let _ = self.interceptors[*index].on_error(invocation, error).await;
        }
        for (index, interceptor) in self.interceptors.iter().enumerate().rev() {
            if started.contains(&index) || !interceptor.observe_pipeline_errors() {
                continue;
            }
            let _ = interceptor.on_error(invocation, error).await;
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
            body,
        })
    }

    /// Returns the selected provider account's stream-body timeout when the
    /// route supplied one. The HTTP transport owns enforcement because it is
    /// the only layer that observes body frames and downstream cancellation.
    pub fn stream_timeout(&self) -> Option<Duration> {
        self.invocation
            .account
            .as_ref()
            .and_then(|account| account.timeout_ms)
            .filter(|timeout_ms| *timeout_ms > 0)
            .map(Duration::from_millis)
    }

    pub fn cancellation_signal(&self) -> InvocationCancellationSignal {
        self.invocation.request.cancellation_signal()
    }

    /// Finalizes the deferred invocation exactly once after the transport has
    /// observed EOF, cancellation, timeout, or an upstream read failure.
    pub async fn complete(mut self, outcome: StreamTerminalOutcome) -> Result<(), InvocationError> {
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
            StreamTerminalOutcome::Cancelled { ttft_ms } => {
                self.invocation.telemetry.ttft_ms = ttft_ms;
                self.fail_terminal(stream_lifecycle_error("client cancelled provider stream"))
                    .await
            }
            StreamTerminalOutcome::TimedOut { stage, ttft_ms } => {
                self.invocation.telemetry.ttft_ms = ttft_ms;
                self.fail_terminal(stream_lifecycle_error(format!(
                    "provider stream {stage} deadline exceeded"
                )))
                .await
            }
            StreamTerminalOutcome::UpstreamError { message, ttft_ms } => {
                self.invocation.telemetry.ttft_ms = ttft_ms;
                self.fail_terminal(stream_lifecycle_error(format!(
                    "provider stream failed: {message}"
                )))
                .await
            }
            StreamTerminalOutcome::LeaseLost { ttft_ms } => {
                self.invocation.telemetry.ttft_ms = ttft_ms;
                self.fail_terminal(tenant_lease_loss_error()).await
            }
        }
    }

    async fn fail_terminal(&mut self, error: InvocationError) -> Result<(), InvocationError> {
        self.pipeline
            .notify_error(&mut self.invocation, &self.started, &error)
            .await;
        Err(error)
    }
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

fn tenant_lease_loss_error() -> InvocationError {
    InvocationError::new(
        InvocationErrorKind::RateLimit,
        "tenant in-flight lease ownership was lost",
    )
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
}
