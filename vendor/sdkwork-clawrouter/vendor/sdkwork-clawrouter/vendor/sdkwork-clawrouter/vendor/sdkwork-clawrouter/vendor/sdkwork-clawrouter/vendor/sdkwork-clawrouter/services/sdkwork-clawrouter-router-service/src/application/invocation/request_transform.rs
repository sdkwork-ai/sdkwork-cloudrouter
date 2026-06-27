use super::provider_request::ProviderRequestBuilder;
use super::{
    DispatchMode, Invocation, InvocationError, InvocationErrorKind, InvocationFuture,
    InvocationInterceptor,
};

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
            let provider_request = ProviderRequestBuilder::default().build(
                invocation,
                &account,
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
