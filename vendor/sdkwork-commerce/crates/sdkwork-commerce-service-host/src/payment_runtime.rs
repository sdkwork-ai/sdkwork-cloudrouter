use crate::{CommerceRuntimeServiceHandler, CommerceRuntimeServiceRequest};
use sdkwork_commerce_contract_service::CommerceServiceError;
use std::sync::Arc;

pub trait CommercePaymentRuntimeStore: Send + Sync + 'static {
    fn handle_payment_operation(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError>;
}

impl CommercePaymentRuntimeStore for Arc<dyn CommercePaymentRuntimeStore> {
    fn handle_payment_operation(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        self.as_ref().handle_payment_operation(request)
    }
}

#[derive(Clone, Debug)]
pub struct CommercePaymentRuntimeHandler<S> {
    store: S,
}

impl<S> CommercePaymentRuntimeHandler<S>
where
    S: CommercePaymentRuntimeStore,
{
    pub fn new(store: S) -> Self {
        Self { store }
    }
}

impl<S> CommerceRuntimeServiceHandler for CommercePaymentRuntimeHandler<S>
where
    S: CommercePaymentRuntimeStore,
{
    fn service_name(&self) -> &'static str {
        "commerce.payment"
    }

    fn handle(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        if request.execution_plan.service_name != self.service_name() {
            return Err(CommerceServiceError::unsupported_capability(
                "payment runtime handler received a non-payment operation",
            ));
        }

        self.store.handle_payment_operation(request)
    }
}
