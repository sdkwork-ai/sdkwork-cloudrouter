use std::sync::Arc;

use super::{
    Invocation, InvocationError, InvocationErrorKind, InvocationFuture, InvocationInterceptor,
    ResolvedProviderSecret,
};
use crate::ports::ProviderSecretResolver;

#[derive(Clone)]
pub struct SecretResolutionInterceptor {
    resolver: Arc<dyn ProviderSecretResolver + Send + Sync>,
}

impl SecretResolutionInterceptor {
    pub fn new(resolver: Arc<dyn ProviderSecretResolver + Send + Sync>) -> Self {
        Self { resolver }
    }
}

impl InvocationInterceptor for SecretResolutionInterceptor {
    fn name(&self) -> &str {
        "secret_resolution"
    }

    fn before<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            let Some(account) = invocation.account.as_ref() else {
                return Ok(());
            };
            let Some(secret_ref) = account
                .secret_ref
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
            else {
                return Ok(());
            };
            let value = self
                .resolver
                .resolve_secret_value(secret_ref)
                .map_err(|error| secret_error(error.to_string()))?;
            invocation.dispatch.resolved_secret = Some(ResolvedProviderSecret {
                secret_ref: secret_ref.to_owned(),
                value,
            });
            Ok(())
        })
    }
}

fn secret_error(message: impl Into<String>) -> InvocationError {
    InvocationError::new(InvocationErrorKind::Dispatch, message)
}
