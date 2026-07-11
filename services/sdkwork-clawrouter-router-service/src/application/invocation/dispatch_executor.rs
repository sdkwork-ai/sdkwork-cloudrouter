use std::sync::Arc;
use std::time::{Duration, Instant};

use super::provider_request::ProviderRequestBuilder;
use super::{
    BillingMode, BillingQuantitySource, DispatchMode, Invocation, InvocationAccount,
    InvocationDispatchResponse, InvocationError, InvocationErrorKind, InvocationFuture,
    InvocationInterceptor, InvocationRouteAttempt, InvocationRouteCandidate, InvocationShape,
    InvocationSurface, ResolvedProviderSecret,
};
use crate::domain::{AiRouteFailureStrategy, AiRouteStrategy};
use crate::ports::{
    InvocationDispatchError, InvocationDispatcher, ProviderAdapterRouteResolver,
    ProviderSecretResolver,
};

#[derive(Clone)]
pub struct DispatchExecutor {
    dispatcher: Arc<dyn InvocationDispatcher>,
    secret_resolver: Option<Arc<dyn ProviderSecretResolver + Send + Sync>>,
    adapter_resolver: Option<Arc<dyn ProviderAdapterRouteResolver>>,
}

impl DispatchExecutor {
    pub fn new(dispatcher: Arc<dyn InvocationDispatcher>) -> Self {
        Self {
            dispatcher,
            secret_resolver: None,
            adapter_resolver: None,
        }
    }

    pub fn with_secret_resolver(
        dispatcher: Arc<dyn InvocationDispatcher>,
        secret_resolver: Arc<dyn ProviderSecretResolver + Send + Sync>,
    ) -> Self {
        Self {
            dispatcher,
            secret_resolver: Some(secret_resolver),
            adapter_resolver: None,
        }
    }

    pub fn with_adapter_resolver(
        mut self,
        adapter_resolver: Arc<dyn ProviderAdapterRouteResolver>,
    ) -> Self {
        self.adapter_resolver = Some(adapter_resolver);
        self
    }
}

impl InvocationInterceptor for DispatchExecutor {
    fn name(&self) -> &str {
        "dispatch_executor"
    }

    fn before<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            match invocation.dispatch.mode {
                DispatchMode::SyntheticLocalResponse => return Ok(()),
                DispatchMode::NoopFree => {
                    if invocation.dispatch.response.is_none() {
                        invocation.dispatch.response = Some(InvocationDispatchResponse::empty(204));
                    }
                    return Ok(());
                }
                DispatchMode::DirectOpenAiRelay
                | DispatchMode::DirectHttpPassthrough
                | DispatchMode::InternalProviderAdapter => {}
            }

            let candidates = invocation
                .routing
                .route_plan
                .as_ref()
                .map(|plan| plan.candidates.clone())
                .ok_or_else(|| dispatch_error("dispatch requires route plan"))?;
            if candidates.is_empty() {
                return Err(dispatch_error("dispatch route plan has no candidates"));
            }

            let mut last_error: Option<InvocationError> = None;
            let mut last_response: Option<InvocationDispatchResponse> = None;
            for (index, candidate) in candidates.iter().enumerate() {
                let account = account_from_candidate(candidate)?;
                apply_candidate_resource(invocation, candidate);
                invocation.account = Some(account.clone());
                if let Some(plan) = invocation.routing.route_plan.as_mut() {
                    plan.selected_index = index;
                }
                refresh_adapter_target(invocation, self.adapter_resolver.as_deref());

                let max_attempts = max_attempts(invocation, candidate);
                let mut exhausted_retryable = false;
                for attempt_no in 1..=max_attempts {
                    if let Err(error) = refresh_provider_request(
                        invocation,
                        &account,
                        self.secret_resolver.as_deref(),
                    ) {
                        last_response = None;
                        invocation.routing.attempted_routes.push(failed_attempt(
                            candidate,
                            index,
                            None,
                            true,
                            Some("provider_request_prepare_failed".to_owned()),
                            Some(error.message.clone()),
                            Instant::now(),
                        ));
                        last_error = Some(error);
                        exhausted_retryable = true;
                        break;
                    }
                    let started = Instant::now();
                    match self.dispatcher.dispatch(invocation, &account).await {
                        Ok(response) if response_is_success(invocation, &response) => {
                            let status_code = effective_response_status_code(invocation, &response);
                            invocation.routing.attempted_routes.push(success_attempt(
                                candidate,
                                index,
                                status_code,
                                started,
                            ));
                            invocation.dispatch.response = Some(response);
                            return Ok(());
                        }
                        Ok(response) => {
                            let status_code = effective_response_status_code(invocation, &response);
                            let retryable = retryable_status(candidate, status_code);
                            if matches!(status_code, 401 | 403) {
                                invocation.dispatch.resolved_secret = None;
                            }
                            invocation.routing.attempted_routes.push(failed_attempt(
                                candidate,
                                index,
                                Some(status_code),
                                retryable,
                                Some("provider_status".to_owned()),
                                Some(provider_status_message(status_code, retryable)),
                                started,
                            ));
                            last_error = Some(dispatch_error(provider_status_message(
                                status_code,
                                retryable,
                            )));
                            last_response = Some(response);
                            exhausted_retryable = retryable;
                            if !should_retry_candidate(max_attempts, attempt_no, retryable) {
                                break;
                            }
                        }
                        Err(error) => {
                            last_response = None;
                            let retryable = retryable_dispatch_error(candidate, &error);
                            invocation.routing.attempted_routes.push(failed_attempt(
                                candidate,
                                index,
                                error.status_code,
                                retryable,
                                Some(error.code.clone()),
                                Some(error.message.clone()),
                                started,
                            ));
                            last_error = Some(dispatch_error(error_message(&error)));
                            exhausted_retryable = retryable;
                            if !should_retry_candidate(max_attempts, attempt_no, retryable) {
                                break;
                            }
                        }
                    }
                    sleep_before_retry(candidate).await;
                }
                if !should_try_next(invocation.routing.failure_strategy, exhausted_retryable) {
                    break;
                }
            }

            if let Some(response) = last_response {
                invocation.dispatch.response = Some(response);
                return Ok(());
            }
            Err(last_error.unwrap_or_else(|| dispatch_error("dispatch failed")))
        })
    }
}

fn response_is_success(invocation: &Invocation, response: &InvocationDispatchResponse) -> bool {
    (200..300).contains(&effective_response_status_code(invocation, response))
}

fn effective_response_status_code(
    invocation: &Invocation,
    response: &InvocationDispatchResponse,
) -> u16 {
    if invocation.dispatch.mode != DispatchMode::InternalProviderAdapter {
        return response.status_code;
    }
    response
        .body
        .as_ref()
        .and_then(adapter_response_status_code)
        .unwrap_or(response.status_code)
}

fn adapter_response_status_code(body: &serde_json::Value) -> Option<u16> {
    body.get("statusCode")
        .or_else(|| body.get("status_code"))
        .and_then(serde_json::Value::as_u64)
        .and_then(|value| u16::try_from(value).ok())
}

fn refresh_adapter_target(
    invocation: &mut Invocation,
    adapter_resolver: Option<&dyn ProviderAdapterRouteResolver>,
) {
    if invocation.resource.surface != InvocationSurface::ProviderNative {
        return;
    }
    if matches!(
        invocation.dispatch.mode,
        DispatchMode::SyntheticLocalResponse | DispatchMode::NoopFree
    ) {
        return;
    }
    let Some(adapter_resolver) = adapter_resolver else {
        return;
    };
    if let Some(target) = adapter_resolver.resolve_adapter_target(invocation) {
        invocation.dispatch.mode = DispatchMode::InternalProviderAdapter;
        invocation.dispatch.invocation_shape = target.shape.clone();
        invocation.dispatch.adapter_target = Some(target);
        if invocation.billing.mode == BillingMode::ExternalUsageLine {
            invocation.billing.quantity_source = BillingQuantitySource::AdapterUsageLines;
        }
    } else {
        invocation.dispatch.mode = DispatchMode::DirectHttpPassthrough;
        invocation.dispatch.invocation_shape = InvocationShape::Json;
        invocation.dispatch.adapter_target = None;
    }
}

fn refresh_provider_request(
    invocation: &mut Invocation,
    account: &InvocationAccount,
    secret_resolver: Option<&(dyn ProviderSecretResolver + Send + Sync)>,
) -> Result<(), InvocationError> {
    if matches!(
        invocation.dispatch.mode,
        DispatchMode::SyntheticLocalResponse | DispatchMode::NoopFree
    ) {
        return Ok(());
    }

    let resolved_secret = resolve_provider_secret(
        account,
        secret_resolver,
        invocation.dispatch.resolved_secret.as_ref(),
    )?;
    let provider_request =
        ProviderRequestBuilder::default().build(invocation, account, resolved_secret.as_ref())?;
    invocation.dispatch.resolved_secret = resolved_secret;
    invocation.dispatch.provider_request = Some(provider_request);
    Ok(())
}

fn resolve_provider_secret(
    account: &InvocationAccount,
    secret_resolver: Option<&(dyn ProviderSecretResolver + Send + Sync)>,
    current_secret: Option<&ResolvedProviderSecret>,
) -> Result<Option<ResolvedProviderSecret>, InvocationError> {
    let Some(secret_ref) = account
        .secret_ref
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return Ok(None);
    };
    let Some(secret_resolver) = secret_resolver else {
        return match current_secret
            .filter(|secret| secret.secret_ref == secret_ref)
            .cloned()
        {
            Some(secret) => Ok(Some(secret)),
            None => Err(dispatch_error(format!(
                "provider secret resolver is not available for secret_ref {secret_ref}",
            ))),
        };
    };
    let value = secret_resolver
        .resolve_secret_value(secret_ref)
        .map_err(|error| dispatch_error(error.to_string()))?;
    Ok(Some(ResolvedProviderSecret {
        secret_ref: secret_ref.to_owned(),
        value,
    }))
}

/// Maximum dispatch attempts for a candidate.
///
/// A missing retry policy means one attempt. Configured retry budgets are
/// honored only for replay-safe requests; streaming and non-idempotent writes
/// without an idempotency key are always single-attempt.
fn max_attempts(invocation: &Invocation, candidate: &InvocationRouteCandidate) -> usize {
    let is_streaming = matches!(
        invocation.dispatch.invocation_shape,
        InvocationShape::SseStream | InvocationShape::ByteStream
    );
    if is_streaming || !request_allows_replay(invocation) {
        // Streaming responses cannot be safely replayed once dispatched.
        return 1;
    }
    candidate
        .retry_policy
        .as_ref()
        .map(|policy| policy.max_attempts.max(1))
        .unwrap_or(1)
}

fn request_allows_replay(invocation: &Invocation) -> bool {
    if matches!(
        invocation.routing.strategy,
        AiRouteStrategy::StatelessFailover | AiRouteStrategy::StatelessFailClosed
    ) {
        return true;
    }
    if matches!(
        invocation.request.method,
        axum::http::Method::GET
            | axum::http::Method::HEAD
            | axum::http::Method::OPTIONS
            | axum::http::Method::PUT
            | axum::http::Method::DELETE
    ) {
        return true;
    }
    invocation
        .request
        .idempotency_key
        .as_deref()
        .map(str::trim)
        .is_some_and(|key| !key.is_empty())
}

fn account_from_candidate(
    candidate: &InvocationRouteCandidate,
) -> Result<InvocationAccount, InvocationError> {
    if candidate.provider_code.trim().is_empty() {
        return Err(dispatch_error(
            "dispatch candidate is missing provider code",
        ));
    }
    if candidate.channel_id <= 0 {
        return Err(dispatch_error("dispatch candidate is missing channel id"));
    }
    Ok(InvocationAccount {
        provider_code: candidate.provider_code.clone(),
        channel_id: candidate.channel_id,
        region_code: candidate.region_code.clone(),
        credential_id: candidate.credential_id,
        credential_rotation: candidate.credential_rotation.clone(),
        base_url: candidate.base_url.clone(),
        secret_ref: candidate.secret_ref.clone(),
        auth_profile: candidate.auth_profile.clone(),
        timeout_ms: candidate.timeout_ms,
        retry_policy: candidate.retry_policy.clone(),
        provider_model: candidate.provider_model.clone(),
    })
}

fn apply_candidate_resource(invocation: &mut Invocation, candidate: &InvocationRouteCandidate) {
    if let Some(catalog_key) = candidate.catalog_key.as_ref() {
        invocation.resource.requested_model_catalog_key = Some(catalog_key.clone());
    }
    if let Some(provider_model) = candidate.provider_model.as_ref() {
        invocation.resource.provider_native_model = Some(provider_model.clone());
    }
}

fn retryable_status(candidate: &InvocationRouteCandidate, status_code: u16) -> bool {
    candidate
        .retry_policy
        .as_ref()
        .map(|policy| policy.is_retryable_status(status_code))
        .unwrap_or_else(|| matches!(status_code, 408 | 409 | 425 | 429 | 500 | 502 | 503 | 504))
}

fn retryable_dispatch_error(
    candidate: &InvocationRouteCandidate,
    error: &InvocationDispatchError,
) -> bool {
    if let Some(status_code) = error.status_code {
        retryable_status(candidate, status_code)
    } else {
        error.retryable
    }
}

fn should_retry_candidate(max_attempts: usize, attempt_no: usize, retryable: bool) -> bool {
    retryable && attempt_no < max_attempts
}

async fn sleep_before_retry(candidate: &InvocationRouteCandidate) {
    let Some(backoff_ms) = candidate
        .retry_policy
        .as_ref()
        .map(|policy| policy.backoff_ms)
        .filter(|backoff_ms| *backoff_ms > 0)
    else {
        return;
    };
    tokio::time::sleep(Duration::from_millis(backoff_ms)).await;
}

fn should_try_next(strategy: AiRouteFailureStrategy, retryable: bool) -> bool {
    retryable && matches!(strategy, AiRouteFailureStrategy::Failover)
}

fn success_attempt(
    candidate: &InvocationRouteCandidate,
    index: usize,
    status_code: u16,
    started: Instant,
) -> InvocationRouteAttempt {
    InvocationRouteAttempt {
        provider_code: candidate.provider_code.clone(),
        channel_id: candidate.channel_id,
        candidate_index: index,
        status_code: Some(status_code),
        success: true,
        retryable: false,
        error_code: None,
        error_message: None,
        latency_ms: Some(elapsed_ms(started)),
    }
}

fn failed_attempt(
    candidate: &InvocationRouteCandidate,
    index: usize,
    status_code: Option<u16>,
    retryable: bool,
    error_code: Option<String>,
    error_message: Option<String>,
    started: Instant,
) -> InvocationRouteAttempt {
    InvocationRouteAttempt {
        provider_code: candidate.provider_code.clone(),
        channel_id: candidate.channel_id,
        candidate_index: index,
        status_code,
        success: false,
        retryable,
        error_code,
        error_message,
        latency_ms: Some(elapsed_ms(started)),
    }
}

fn elapsed_ms(started: Instant) -> i64 {
    i64::try_from(started.elapsed().as_millis()).unwrap_or(i64::MAX)
}

fn error_message(error: &InvocationDispatchError) -> String {
    match error.status_code {
        Some(status_code) => format!("{}: {} ({status_code})", error.code, error.message),
        None => format!("{}: {}", error.code, error.message),
    }
}

fn provider_status_message(status_code: u16, retryable: bool) -> String {
    if retryable {
        format!("provider returned retryable status {status_code}")
    } else {
        format!("provider returned status {status_code}")
    }
}

fn dispatch_error(message: impl Into<String>) -> InvocationError {
    InvocationError::new(InvocationErrorKind::Dispatch, message)
}
