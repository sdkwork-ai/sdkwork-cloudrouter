use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use crate::domain::{DomainError, DomainResult};

use super::{
    PaymentProviderAdapter, PaymentProviderRegistry, PaymentProviderRegistryError,
    PaymentRouteDecisionRecord,
};

pub type PaymentProviderRouteResolverFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResolvePaymentProviderRouteQuery {
    pub tenant_id: String,
    pub organization_id: String,
    pub supplier_code: String,
    pub method_code: String,
    pub scene_code: String,
    pub currency_code: String,
    pub amount: String,
}

#[derive(Clone)]
pub struct ResolvedPaymentProviderRoute {
    pub route_rule_id: Option<String>,
    pub account_id: String,
    pub provider_account_id: String,
    pub supplier_code: String,
    pub adapter: Arc<dyn PaymentProviderAdapter>,
}

pub trait PaymentProviderRouteResolver: Send + Sync {
    fn resolve_route(
        &self,
        query: ResolvePaymentProviderRouteQuery,
    ) -> PaymentProviderRouteResolverFuture<'_, ResolvedPaymentProviderRoute>;

    fn resolve_persisted_route(
        &self,
        decision: PaymentRouteDecisionRecord,
    ) -> PaymentProviderRouteResolverFuture<'_, Arc<dyn PaymentProviderAdapter>>;
}

#[derive(Clone)]
pub struct RegistryPaymentProviderRouteResolver {
    registry: PaymentProviderRegistry,
}

impl RegistryPaymentProviderRouteResolver {
    pub fn new(registry: PaymentProviderRegistry) -> Self {
        Self { registry }
    }

    fn provider_account_id(supplier_code: &str) -> String {
        format!("registry:{supplier_code}")
    }
}

impl PaymentProviderRouteResolver for RegistryPaymentProviderRouteResolver {
    fn resolve_route(
        &self,
        query: ResolvePaymentProviderRouteQuery,
    ) -> PaymentProviderRouteResolverFuture<'_, ResolvedPaymentProviderRoute> {
        Box::pin(async move {
            let supplier_code = self.registry.canonical_supplier_code(&query.supplier_code);
            let adapter = self
                .registry
                .resolve(&supplier_code)
                .map_err(registry_error)?;
            let provider_account_id = Self::provider_account_id(&supplier_code);
            Ok(ResolvedPaymentProviderRoute {
                route_rule_id: None,
                account_id: format!(
                    "registry:{supplier_code}:{}:{}:{}",
                    query.method_code, query.scene_code, query.currency_code
                ),
                provider_account_id,
                supplier_code,
                adapter,
            })
        })
    }

    fn resolve_persisted_route(
        &self,
        decision: PaymentRouteDecisionRecord,
    ) -> PaymentProviderRouteResolverFuture<'_, Arc<dyn PaymentProviderAdapter>> {
        Box::pin(async move {
            let supplier_code = self
                .registry
                .canonical_supplier_code(&decision.supplier_code);
            let expected_account_id = Self::provider_account_id(&supplier_code);
            if decision.provider_account_id.as_deref() != Some(expected_account_id.as_str()) {
                return Err(DomainError::new(
                    "persisted payment route does not match the configured registry account",
                ));
            }
            self.registry
                .resolve(&supplier_code)
                .map_err(registry_error)
        })
    }
}

#[derive(Debug, Clone)]
pub struct UnavailablePaymentProviderRouteResolver {
    reason: Arc<str>,
}

impl UnavailablePaymentProviderRouteResolver {
    pub fn new(reason: impl Into<Arc<str>>) -> Self {
        Self {
            reason: reason.into(),
        }
    }

    fn unavailable(&self) -> DomainError {
        DomainError::new(format!(
            "payment provider routing is unavailable: {}",
            self.reason
        ))
    }
}

impl PaymentProviderRouteResolver for UnavailablePaymentProviderRouteResolver {
    fn resolve_route(
        &self,
        _query: ResolvePaymentProviderRouteQuery,
    ) -> PaymentProviderRouteResolverFuture<'_, ResolvedPaymentProviderRoute> {
        Box::pin(async move { Err(self.unavailable()) })
    }

    fn resolve_persisted_route(
        &self,
        _decision: PaymentRouteDecisionRecord,
    ) -> PaymentProviderRouteResolverFuture<'_, Arc<dyn PaymentProviderAdapter>> {
        Box::pin(async move { Err(self.unavailable()) })
    }
}

fn registry_error(error: PaymentProviderRegistryError) -> DomainError {
    DomainError::new(error.to_string())
}
