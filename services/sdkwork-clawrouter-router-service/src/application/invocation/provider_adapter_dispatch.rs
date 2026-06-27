use std::sync::Arc;

use super::{
    BillingMode, BillingQuantitySource, DispatchMode, Invocation, InvocationFuture,
    InvocationInterceptor, InvocationSurface,
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
