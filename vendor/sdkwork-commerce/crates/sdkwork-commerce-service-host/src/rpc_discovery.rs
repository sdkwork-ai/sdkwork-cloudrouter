use std::sync::Arc;

use sdkwork_commerce_rpc::CommerceRpcServerConfig;
use sdkwork_rpc_discovery::{
    build_registration_metadata, default_instance_id, grpc_advertised_endpoint,
    DiscoveryInstanceConfig, DiscoveryInstanceLifecycle, RegistrationMetadataInput,
};

pub const COMMERCE_DISCOVERY_ENDPOINT_ENV: &str = "SDKWORK_COMMERCE_DISCOVERY_ENDPOINT";
pub const COMMERCE_DISCOVERY_NAMESPACE_ENV: &str = "SDKWORK_COMMERCE_DISCOVERY_NAMESPACE";
pub const COMMERCE_DISCOVERY_ENVIRONMENT_ENV: &str = "SDKWORK_COMMERCE_DISCOVERY_ENVIRONMENT";
pub const COMMERCE_DISCOVERY_SERVICE_NAME_ENV: &str = "SDKWORK_COMMERCE_DISCOVERY_SERVICE_NAME";
pub const COMMERCE_DISCOVERY_INSTANCE_ID_ENV: &str = "SDKWORK_COMMERCE_DISCOVERY_INSTANCE_ID";
pub const COMMERCE_DISCOVERY_LEASE_TTL_SECONDS_ENV: &str =
    "SDKWORK_COMMERCE_DISCOVERY_LEASE_TTL_SECONDS";
pub const COMMERCE_DISCOVERY_SUBJECT_ID_ENV: &str = "SDKWORK_COMMERCE_DISCOVERY_SUBJECT_ID";

pub const COMMERCE_DISCOVERY_SERVICE_NAME_DEFAULT: &str = "sdkwork-commerce-app-rpc";
pub const COMMERCE_DISCOVERY_MANIFEST_REF: &str =
    "sdks/sdkwork-commerce-rpc-sdk/rpc/sdkwork-commerce-rpc.manifest.json";

pub fn commerce_discovery_config_from_env(
    server_config: &CommerceRpcServerConfig,
) -> Option<DiscoveryInstanceConfig> {
    let discovery_endpoint = std::env::var(COMMERCE_DISCOVERY_ENDPOINT_ENV).ok()?;
    if discovery_endpoint.trim().is_empty() {
        return None;
    }

    let service_name = std::env::var(COMMERCE_DISCOVERY_SERVICE_NAME_ENV)
        .unwrap_or_else(|_| COMMERCE_DISCOVERY_SERVICE_NAME_DEFAULT.to_string());
    let instance_id = std::env::var(COMMERCE_DISCOVERY_INSTANCE_ID_ENV)
        .unwrap_or_else(|_| default_instance_id(&service_name));
    let lease_ttl_seconds = std::env::var(COMMERCE_DISCOVERY_LEASE_TTL_SECONDS_ENV)
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(30);
    let subject_id = std::env::var(COMMERCE_DISCOVERY_SUBJECT_ID_ENV)
        .unwrap_or_else(|_| "sdkwork-commerce-service-host".to_string());

    let deployment_profile = std::env::var("SDKWORK_COMMERCE_DEPLOYMENT_PROFILE").ok();
    let runtime_target = std::env::var("SDKWORK_COMMERCE_RUNTIME_TARGET").ok();

    let metadata = build_registration_metadata(RegistrationMetadataInput {
        rpc_surface: "app",
        sdk_family: "sdkwork-commerce-rpc-sdk",
        domain: "commerce",
        proto_packages: &["sdkwork.commerce.app.v3", "sdkwork.commerce.backend.v3"],
        operation_manifest_ref: COMMERCE_DISCOVERY_MANIFEST_REF,
        deployment_profile: deployment_profile.as_deref(),
        runtime_target: runtime_target.as_deref(),
    });

    Some(DiscoveryInstanceConfig {
        discovery_endpoint,
        namespace: std::env::var(COMMERCE_DISCOVERY_NAMESPACE_ENV)
            .unwrap_or_else(|_| "sdkwork".to_string()),
        environment: std::env::var(COMMERCE_DISCOVERY_ENVIRONMENT_ENV)
            .or_else(|_| std::env::var("SDKWORK_COMMERCE_ENVIRONMENT"))
            .unwrap_or_else(|_| "development".to_string()),
        service_name,
        instance_id,
        advertised_endpoint: grpc_advertised_endpoint(&server_config.bind_addr),
        protocol: "grpc".to_string(),
        version: std::env::var("SDKWORK_COMMERCE_VERSION").unwrap_or_else(|_| "0.1.0".to_string()),
        region: std::env::var("SDKWORK_COMMERCE_REGION").unwrap_or_else(|_| "local".to_string()),
        zone: std::env::var("SDKWORK_COMMERCE_ZONE").unwrap_or_else(|_| "local".to_string()),
        lease_ttl_seconds,
        subject_id,
        metadata,
        revision_cas_on_register: true,
        expected_revision: None,
    })
}

pub async fn register_commerce_discovery_instance(
    server_config: &CommerceRpcServerConfig,
) -> Result<
    Option<Arc<sdkwork_rpc_discovery::DiscoveryInstanceHandle>>,
    sdkwork_rpc_discovery::DiscoveryRegistrationError,
> {
    let Some(config) = commerce_discovery_config_from_env(server_config) else {
        return Ok(None);
    };

    let handle = DiscoveryInstanceLifecycle::register(config).await?;
    Ok(Some(Arc::new(handle)))
}
