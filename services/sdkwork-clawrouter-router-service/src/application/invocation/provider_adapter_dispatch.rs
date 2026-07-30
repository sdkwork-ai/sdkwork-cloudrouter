use std::sync::Arc;

use sdkwork_claw_provider_adapter_contract::AdapterInvocationShape;

use super::{
    BillingMode, BillingQuantitySource, DispatchMode, Invocation, InvocationAdapterTarget,
    InvocationError, InvocationErrorKind, InvocationFuture, InvocationInterceptor,
    InvocationSurface,
};
use crate::ports::ProviderAdapterRouteResolver;

#[derive(Clone)]
pub struct ProviderAdapterDispatchInterceptor {
    resolver: Arc<dyn ProviderAdapterRouteResolver>,
}

impl ProviderAdapterDispatchInterceptor {
    pub fn new(resolver: Arc<dyn ProviderAdapterRouteResolver>) -> Self {
        Self { resolver }
    }
}

impl InvocationInterceptor for ProviderAdapterDispatchInterceptor {
    fn name(&self) -> &str {
        "provider_adapter_dispatch"
    }

    fn before<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            if invocation.resource.surface != InvocationSurface::ProviderNative {
                return Ok(());
            }
            let Some(target) = self.resolver.resolve_adapter_target(invocation) else {
                return Ok(());
            };
            validate_provider_adapter_target(invocation, &target)?;
            invocation.dispatch.mode = DispatchMode::InternalProviderAdapter;
            invocation.dispatch.invocation_shape = target.shape.clone();
            invocation.dispatch.adapter_target = Some(target);
            if invocation.billing.mode == BillingMode::ExternalUsageLine {
                invocation.billing.quantity_source = BillingQuantitySource::AdapterUsageLines;
            }
            Ok(())
        })
    }
}

pub(super) fn validate_provider_adapter_target(
    invocation: &Invocation,
    target: &InvocationAdapterTarget,
) -> Result<(), InvocationError> {
    if invocation.billing.settlement_required
        && matches!(
            target.adapter_invocation_shape,
            AdapterInvocationShape::SseStream | AdapterInvocationShape::ByteStream
        )
    {
        return Err(InvocationError::new(
            InvocationErrorKind::Usage,
            "streaming provider adapter route does not define a terminal usage envelope",
        ));
    }
    Ok(())
}
