use crate::{CommerceRuntimeServiceHandler, CommerceRuntimeServiceRequest};
use sdkwork_commerce_contract_service::CommerceServiceError;
use std::sync::Arc;

pub trait CommerceAccountRuntimeStore: Send + Sync + 'static {
    fn handle_account_operation(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError>;
}

impl CommerceAccountRuntimeStore for Arc<dyn CommerceAccountRuntimeStore> {
    fn handle_account_operation(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        self.as_ref().handle_account_operation(request)
    }
}

#[derive(Clone, Debug)]
pub struct CommerceAccountRuntimeHandler<S> {
    store: S,
}

impl<S> CommerceAccountRuntimeHandler<S>
where
    S: CommerceAccountRuntimeStore,
{
    pub fn new(store: S) -> Self {
        Self { store }
    }

    pub fn into_inner(self) -> S {
        self.store
    }
}

impl<S> CommerceRuntimeServiceHandler for CommerceAccountRuntimeHandler<S>
where
    S: CommerceAccountRuntimeStore,
{
    fn service_name(&self) -> &'static str {
        "commerce.account"
    }

    fn handle(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        if request.execution_plan.service_name != self.service_name() {
            return Err(CommerceServiceError::unsupported_capability(
                "account runtime handler received a non-account operation",
            ));
        }

        self.store.handle_account_operation(request)
    }
}
