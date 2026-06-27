use sdkwork_commerce_service_host::{
    build_commerce_rpc_runtime_service_registry, commerce_rpc_required_service_names,
    validate_commerce_rpc_runtime_stores, CommerceAccountRuntimeStore, CommerceOrderRuntimeStore,
    CommercePaymentRuntimeStore, CommerceRuntimeServiceRegistry, CommerceRuntimeServiceRequest,
    CommerceServiceHostRuntimeStores,
};

#[derive(Clone)]
struct StaticAccountStore;

impl CommerceAccountRuntimeStore for StaticAccountStore {
    fn handle_account_operation(
        &self,
        _request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, sdkwork_commerce_contract_service::CommerceServiceError> {
        Ok(r#"{"accounts":[]}"#.to_string())
    }
}

#[derive(Clone)]
struct StaticOrderStore;

impl CommerceOrderRuntimeStore for StaticOrderStore {
    fn handle_order_operation(
        &self,
        _request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, sdkwork_commerce_contract_service::CommerceServiceError> {
        Ok(r#"{"checkoutSessionId":"cs-1","status":"draft"}"#.to_string())
    }
}

#[derive(Clone)]
struct StaticPaymentStore;

impl CommercePaymentRuntimeStore for StaticPaymentStore {
    fn handle_payment_operation(
        &self,
        _request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, sdkwork_commerce_contract_service::CommerceServiceError> {
        Ok(r#"{"intents":[]}"#.to_string())
    }
}

#[test]
fn commerce_rpc_required_service_names_cover_account_order_and_payment() {
    let names = commerce_rpc_required_service_names();
    assert!(names.contains(&"commerce.account"));
    assert!(names.contains(&"commerce.order"));
    assert!(names.contains(&"commerce.payment"));
}

#[test]
fn validate_commerce_rpc_runtime_stores_rejects_missing_payment_store() {
    let stores = CommerceServiceHostRuntimeStores {
        account: Some(std::sync::Arc::new(StaticAccountStore)),
        order: Some(std::sync::Arc::new(StaticOrderStore)),
        payment: None,
    };

    let error = validate_commerce_rpc_runtime_stores(&stores).unwrap_err();
    assert_eq!(error.code(), "unsupported-capability");
}

#[test]
fn build_commerce_rpc_runtime_service_registry_registers_all_rpc_services() {
    let stores = CommerceServiceHostRuntimeStores {
        account: Some(std::sync::Arc::new(StaticAccountStore)),
        order: Some(std::sync::Arc::new(StaticOrderStore)),
        payment: Some(std::sync::Arc::new(StaticPaymentStore)),
    };

    let registry = build_commerce_rpc_runtime_service_registry(&stores).expect("registry");
    let mut names = registry.registered_service_names();
    names.sort_unstable();
    assert_eq!(
        names,
        vec!["commerce.account", "commerce.order", "commerce.payment"]
    );
}

#[test]
fn commerce_runtime_service_registry_can_be_built_incrementally() {
    let stores = CommerceServiceHostRuntimeStores {
        account: Some(std::sync::Arc::new(StaticAccountStore)),
        order: None,
        payment: None,
    };

    let registry: CommerceRuntimeServiceRegistry =
        sdkwork_commerce_service_host::build_commerce_runtime_service_registry(&stores);
    assert_eq!(
        registry.registered_service_names(),
        vec!["commerce.account"]
    );
}
