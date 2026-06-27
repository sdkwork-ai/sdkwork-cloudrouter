use crate::application::{Invocation, InvocationAdapterTarget};

pub trait ProviderAdapterRouteResolver: Send + Sync + 'static {
    fn resolve_adapter_target(&self, invocation: &Invocation) -> Option<InvocationAdapterTarget>;
}
