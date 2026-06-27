use sdkwork_commerce_contract_service::CommerceServiceError;
use sdkwork_commerce_rpc::all_commerce_rpc_service_manifests;
use std::collections::BTreeSet;
use std::sync::Arc;

use crate::{
    resolve_operation_contract, CommerceAccountRuntimeHandler, CommerceAccountRuntimeStore,
    CommerceOrderRuntimeHandler, CommerceOrderRuntimeStore, CommercePaymentRuntimeHandler,
    CommercePaymentRuntimeStore, CommerceRuntimeServiceRegistry,
};

#[derive(Clone, Default)]
pub struct CommerceServiceHostRuntimeStores {
    pub account: Option<Arc<dyn CommerceAccountRuntimeStore>>,
    pub order: Option<Arc<dyn CommerceOrderRuntimeStore>>,
    pub payment: Option<Arc<dyn CommercePaymentRuntimeStore>>,
}

pub fn commerce_rpc_required_service_names() -> Vec<&'static str> {
    let mut service_names = BTreeSet::new();
    for manifest in all_commerce_rpc_service_manifests() {
        for method in manifest.methods {
            let contract = resolve_operation_contract(method.operation_id).unwrap_or_else(|_| {
                panic!(
                    "rpc method must bind to runtime contract: {}",
                    method.operation_id
                )
            });
            service_names.insert(contract.service_name);
        }
    }
    service_names.into_iter().collect()
}

pub fn validate_commerce_rpc_runtime_stores(
    stores: &CommerceServiceHostRuntimeStores,
) -> Result<(), CommerceServiceError> {
    for service_name in commerce_rpc_required_service_names() {
        let missing = match service_name {
            "commerce.account" => stores.account.is_none(),
            "commerce.order" => stores.order.is_none(),
            "commerce.payment" => stores.payment.is_none(),
            other => {
                return Err(CommerceServiceError::unsupported_capability(format!(
                    "rpc runtime store wiring is not defined for service: {other}"
                )));
            }
        };
        if missing {
            return Err(CommerceServiceError::unsupported_capability(format!(
                "commerce rpc runtime store is not registered for service: {service_name}"
            )));
        }
    }
    Ok(())
}

pub fn build_commerce_runtime_service_registry(
    stores: &CommerceServiceHostRuntimeStores,
) -> CommerceRuntimeServiceRegistry {
    let mut registry = CommerceRuntimeServiceRegistry::new();
    if let Some(store) = &stores.account {
        registry = registry.register(Box::new(CommerceAccountRuntimeHandler::new(store.clone())));
    }
    if let Some(store) = &stores.order {
        registry = registry.register(Box::new(CommerceOrderRuntimeHandler::new(store.clone())));
    }
    if let Some(store) = &stores.payment {
        registry = registry.register(Box::new(CommercePaymentRuntimeHandler::new(store.clone())));
    }
    registry
}

pub fn build_commerce_rpc_runtime_service_registry(
    stores: &CommerceServiceHostRuntimeStores,
) -> Result<CommerceRuntimeServiceRegistry, CommerceServiceError> {
    validate_commerce_rpc_runtime_stores(stores)?;
    Ok(build_commerce_runtime_service_registry(stores))
}
