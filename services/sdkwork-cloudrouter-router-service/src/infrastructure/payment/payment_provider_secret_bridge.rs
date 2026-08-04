use std::sync::Arc;

use crate::application::{
    PaymentAdapterFuture, PaymentAdapterOperation, PaymentProviderRegistryError,
    PaymentProviderSecretResolver, PaymentProviderSecretValue,
};
use crate::ports::ProviderSecretResolver;

#[derive(Clone)]
pub struct ProviderSecretPaymentBridge {
    resolver: Arc<dyn ProviderSecretResolver>,
}

impl ProviderSecretPaymentBridge {
    pub fn new(resolver: Arc<dyn ProviderSecretResolver>) -> Self {
        Self { resolver }
    }
}

impl PaymentProviderSecretResolver for ProviderSecretPaymentBridge {
    fn resolve_secret<'a>(
        &'a self,
        secret_ref: &'a str,
    ) -> PaymentAdapterFuture<'a, PaymentProviderSecretValue> {
        let resolver = Arc::clone(&self.resolver);
        Box::pin(async move {
            let value = resolver.resolve_secret_value(secret_ref).map_err(|error| {
                PaymentProviderRegistryError::InvalidProviderRequest {
                    supplier_code: "secret_resolver".to_owned(),
                    operation: PaymentAdapterOperation::Capabilities,
                    message: error.to_string(),
                }
            })?;
            PaymentProviderSecretValue::new(value)
        })
    }
}
