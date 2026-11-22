use super::provider_request::ProviderRequestBuilder;
use super::{
    DispatchMode, Invocation, InvocationError, InvocationErrorKind, InvocationFuture,
    InvocationInterceptor,
};

/// Interceptor that builds a `ProviderRequest` from the invocation state.
///
/// **Note:** This interceptor is **not** part of the production invocation
/// pipeline. The [`DispatchExecutor`](super::DispatchExecutor) builds the
/// provider request internally via `refresh_provider_request` before each
/// dispatch attempt, which also handles secret resolution and retry logic.
///
/// This interceptor is retained as a **test utility** that allows unit tests
/// to exercise `ProviderRequestBuilder` behavior in isolation without
/// constructing a full `DispatchExecutor` with a live dispatcher.
#[derive(Debug, Clone, Default)]
pub struct RequestTransformInterceptor;

impl InvocationInterceptor for RequestTransformInterceptor {
    fn name(&self) -> &str {
        "request_transform"
    }

    fn before<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            if matches!(
                invocation.dispatch.mode,
                DispatchMode::SyntheticLocalResponse | DispatchMode::NoopFree
            ) {
                return Ok(());
            }

            let account = invocation
                .account
                .clone()
                .ok_or_else(|| transform_error("request transform requires resolved account"))?;
            // The selected candidate carries the supplier business type, which
            // decides whether the outbound model keeps its vendor head (relay)
            // or is reduced to the vendor-native id (official).
            let supplier_type = invocation
                .routing
                .route_plan
                .as_ref()
                .and_then(|plan| plan.candidates.get(plan.selected_index))
                .and_then(|candidate| candidate.supplier_type.clone());
            let provider_request = ProviderRequestBuilder.build(
                invocation,
                &account,
                supplier_type.as_deref(),
                invocation.dispatch.resolved_secret.as_ref(),
            )?;
            invocation.dispatch.provider_request = Some(provider_request);
            Ok(())
        })
    }
}

fn transform_error(message: impl Into<String>) -> InvocationError {
    InvocationError::new(InvocationErrorKind::Dispatch, message)
}
