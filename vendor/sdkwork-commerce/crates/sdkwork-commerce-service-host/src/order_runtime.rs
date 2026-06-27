use crate::{CommerceRuntimeServiceHandler, CommerceRuntimeServiceRequest};
use sdkwork_commerce_contract_service::CommerceServiceError;
use std::sync::Arc;

pub trait CommerceOrderRuntimeStore: Send + Sync + 'static {
    fn handle_order_operation(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError>;
}

impl CommerceOrderRuntimeStore for Arc<dyn CommerceOrderRuntimeStore> {
    fn handle_order_operation(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        self.as_ref().handle_order_operation(request)
    }
}

#[derive(Clone, Debug)]
pub struct CommerceOrderRuntimeHandler<S> {
    store: S,
}

impl<S> CommerceOrderRuntimeHandler<S>
where
    S: CommerceOrderRuntimeStore,
{
    pub fn new(store: S) -> Self {
        Self { store }
    }
}

impl<S> CommerceRuntimeServiceHandler for CommerceOrderRuntimeHandler<S>
where
    S: CommerceOrderRuntimeStore,
{
    fn service_name(&self) -> &'static str {
        "commerce.order"
    }

    fn handle(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        if request.execution_plan.service_name != self.service_name() {
            return Err(CommerceServiceError::unsupported_capability(
                "order runtime handler received a non-order operation",
            ));
        }

        self.store.handle_order_operation(request)
    }
}
