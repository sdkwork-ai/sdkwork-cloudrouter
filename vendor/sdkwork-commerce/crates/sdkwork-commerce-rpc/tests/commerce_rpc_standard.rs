use sdkwork_commerce_rpc::{
    all_commerce_rpc_service_manifests, commerce_app_rpc_service_manifests,
};
use sdkwork_commerce_service_host::operation_contracts;
use sdkwork_rpc_core::validate_manifest;
use std::collections::HashSet;

#[test]
fn commerce_rpc_manifests_use_standard_packages_and_validate() {
    let manifests = all_commerce_rpc_service_manifests();

    assert!(manifests
        .iter()
        .any(|manifest| manifest.package_name == "sdkwork.commerce.app.v3"));
    assert!(manifests
        .iter()
        .any(|manifest| manifest.package_name == "sdkwork.commerce.backend.v3"));

    for manifest in &manifests {
        assert!(validate_manifest(manifest).is_ok(), "{manifest:?}");
    }
}

#[test]
fn commerce_app_rpc_owns_wallet_and_checkout_operations() {
    let operation_ids: Vec<&str> = commerce_app_rpc_service_manifests()
        .into_iter()
        .flat_map(|manifest| {
            manifest
                .methods
                .into_iter()
                .map(|method| method.operation_id)
                .collect::<Vec<_>>()
        })
        .collect();

    assert!(operation_ids.contains(&"wallet.overview.retrieve"));
    assert!(operation_ids.contains(&"wallet.accounts.list"));
    assert!(operation_ids.contains(&"wallet.ledgerEntries.list"));
    assert!(operation_ids.contains(&"checkout.sessions.create"));
    assert!(operation_ids.contains(&"checkout.sessions.retrieve"));
    assert!(operation_ids.contains(&"checkout.sessions.quotes.create"));
    assert!(operation_ids.contains(&"checkout.sessions.orders.create"));
}

#[test]
fn commerce_backend_rpc_does_not_expose_app_checkout_operations() {
    let backend_operations: Vec<&str> = all_commerce_rpc_service_manifests()
        .into_iter()
        .filter(|manifest| manifest.surface == "backend")
        .flat_map(|manifest| {
            manifest
                .methods
                .into_iter()
                .map(|method| method.operation_id)
                .collect::<Vec<_>>()
        })
        .collect();

    assert!(!backend_operations.contains(&"checkout.sessions.create"));
    assert!(!backend_operations
        .iter()
        .any(|operation_id| operation_id.starts_with("wallet.")));
}

#[test]
fn commerce_rpc_operation_ids_are_backed_by_existing_runtime_operation_contracts() {
    let registered_operation_ids: HashSet<_> = operation_contracts()
        .into_iter()
        .map(|contract| contract.operation_id)
        .collect();

    for operation_id in all_commerce_rpc_service_manifests()
        .into_iter()
        .flat_map(|manifest| {
            manifest
                .methods
                .into_iter()
                .map(|method| method.operation_id)
                .collect::<Vec<_>>()
        })
    {
        assert!(
            registered_operation_ids.contains(operation_id),
            "missing standard runtime parity for {operation_id}"
        );
    }
}

#[test]
fn commerce_rpc_sdk_manifest_declares_discovery_and_resilience() {
    let manifest_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../sdks/sdkwork-commerce-rpc-sdk/rpc/sdkwork-commerce-rpc.manifest.json");
    let source = std::fs::read_to_string(&manifest_path).expect("read rpc sdk manifest");
    let manifest: serde_json::Value =
        serde_json::from_str(&source).expect("parse rpc sdk manifest");

    assert_eq!(manifest["kind"], "sdkwork.rpc.manifest");
    assert_eq!(manifest["discoveryServiceName"], "sdkwork-commerce-app-rpc");
    assert_eq!(manifest["defaultResilienceProfile"], "rpc-default");
    assert_eq!(manifest["sdkFamily"], "sdkwork-commerce-rpc-sdk");
}

#[test]
fn commerce_rpc_client_bootstrap_static_profile_requires_endpoint() {
    use sdkwork_commerce_service_host::{
        build_commerce_rpc_name_resolver_from_env, COMMERCE_RPC_RESOLVER_PROFILE_ENV,
        COMMERCE_RPC_STATIC_ENDPOINT_ENV,
    };

    std::env::set_var(COMMERCE_RPC_RESOLVER_PROFILE_ENV, "static");
    std::env::remove_var(COMMERCE_RPC_STATIC_ENDPOINT_ENV);

    let error = build_commerce_rpc_name_resolver_from_env().expect_err("missing static endpoint");
    assert!(error
        .to_string()
        .contains("SDKWORK_COMMERCE_RPC_STATIC_ENDPOINT"));

    std::env::remove_var(COMMERCE_RPC_RESOLVER_PROFILE_ENV);
}

#[test]
fn commerce_rpc_adapter_manifest_declares_standard_capabilities() {
    use sdkwork_commerce_rpc::{
        commerce_rpc_adapter_manifest, COMMERCE_RPC_CONTEXT_CAPABILITY,
        COMMERCE_RPC_ERROR_MAPPING_CAPABILITY, COMMERCE_RPC_HEALTH_CAPABILITY,
        COMMERCE_RPC_PROTO_ROOT, COMMERCE_RPC_REFLECTION_CAPABILITY,
        COMMERCE_RPC_SERVER_CAPABILITY, COMMERCE_RPC_SERVICE_BINDING_CAPABILITY,
    };

    let manifest = commerce_rpc_adapter_manifest();

    assert_eq!(manifest.proto_root, COMMERCE_RPC_PROTO_ROOT);
    assert!(manifest
        .capabilities
        .contains(&COMMERCE_RPC_SERVICE_BINDING_CAPABILITY));
    assert!(manifest
        .capabilities
        .contains(&COMMERCE_RPC_CONTEXT_CAPABILITY));
    assert!(manifest
        .capabilities
        .contains(&COMMERCE_RPC_ERROR_MAPPING_CAPABILITY));
    assert!(manifest
        .capabilities
        .contains(&COMMERCE_RPC_SERVER_CAPABILITY));
    assert!(manifest
        .capabilities
        .contains(&COMMERCE_RPC_HEALTH_CAPABILITY));
    assert!(manifest
        .capabilities
        .contains(&COMMERCE_RPC_REFLECTION_CAPABILITY));
    assert!(!manifest.service_manifests.is_empty());
}
