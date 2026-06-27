use std::sync::Arc;

use sdkwork_rpc_client::{
    pick_endpoint, resolve_and_connect, CompositeNameResolver, DiscoveryNameResolver,
    DiscoveryNameResolverConfig, GrpcChannelConfig, LoadBalanceAlgorithm, NameResolver,
    RoundRobinCursor, StaticNameResolver, WatchingDiscoveryNameResolver,
};
use sdkwork_rpc_framework_core::{ResolverProfile, RpcFrameworkError};
use tokio::task::JoinHandle;

use crate::rpc_discovery::{
    COMMERCE_DISCOVERY_ENDPOINT_ENV, COMMERCE_DISCOVERY_ENVIRONMENT_ENV,
    COMMERCE_DISCOVERY_NAMESPACE_ENV, COMMERCE_DISCOVERY_SERVICE_NAME_DEFAULT,
    COMMERCE_DISCOVERY_SERVICE_NAME_ENV,
};

pub const COMMERCE_RPC_RESOLVER_PROFILE_ENV: &str = "SDKWORK_COMMERCE_RPC_RESOLVER_PROFILE";
pub const COMMERCE_RPC_STATIC_ENDPOINT_ENV: &str = "SDKWORK_COMMERCE_RPC_STATIC_ENDPOINT";
pub const COMMERCE_RPC_RESOLVER_SUBJECT_ID_ENV: &str = "SDKWORK_COMMERCE_RPC_RESOLVER_SUBJECT_ID";

pub struct CommerceRpcNameResolverBootstrap {
    pub resolver: Arc<dyn NameResolver>,
    pub service_name: String,
    pub watch_task: Option<JoinHandle<()>>,
}

impl std::fmt::Debug for CommerceRpcNameResolverBootstrap {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("CommerceRpcNameResolverBootstrap")
            .field("service_name", &self.service_name)
            .field("resolver", &"<NameResolver>")
            .field("watch_task_active", &self.watch_task.is_some())
            .finish()
    }
}

impl CommerceRpcNameResolverBootstrap {
    pub async fn resolve_primary_endpoint(&self) -> Result<String, RpcFrameworkError> {
        let endpoints = self.resolver.resolve(&self.service_name).await?;
        let mut cursor = RoundRobinCursor::default();
        pick_endpoint(&endpoints, LoadBalanceAlgorithm::PickFirst, &mut cursor)
            .map(|endpoint| endpoint.endpoint.clone())
            .ok_or_else(|| {
                RpcFrameworkError::Configuration(format!(
                    "no endpoints resolved for service {}",
                    self.service_name
                ))
            })
    }

    /// Connects a shared tonic channel to the primary resolved RPC endpoint.
    pub async fn connect_primary_channel(
        &self,
    ) -> Result<tonic::transport::Channel, RpcFrameworkError> {
        let mut cursor = RoundRobinCursor::default();
        resolve_and_connect(
            self.resolver.as_ref(),
            &self.service_name,
            LoadBalanceAlgorithm::PickFirst,
            &mut cursor,
            &GrpcChannelConfig::default(),
        )
        .await
    }
}

pub fn commerce_rpc_resolver_profile_from_env() -> ResolverProfile {
    if let Ok(raw) = std::env::var(COMMERCE_RPC_RESOLVER_PROFILE_ENV) {
        if let Some(profile) = ResolverProfile::parse(&raw) {
            return profile;
        }
    }

    if discovery_endpoint_from_env().is_some() {
        if static_endpoint_from_env().is_some() {
            return ResolverProfile::Composite;
        }
        return ResolverProfile::Discovery;
    }

    ResolverProfile::Static
}

pub fn build_commerce_rpc_name_resolver_from_env(
) -> Result<CommerceRpcNameResolverBootstrap, RpcFrameworkError> {
    let profile = commerce_rpc_resolver_profile_from_env();
    let service_name = std::env::var(COMMERCE_DISCOVERY_SERVICE_NAME_ENV)
        .unwrap_or_else(|_| COMMERCE_DISCOVERY_SERVICE_NAME_DEFAULT.to_string());

    match profile {
        ResolverProfile::Static | ResolverProfile::StaticComposite => {
            build_static_resolver(service_name)
        }
        ResolverProfile::Discovery => build_discovery_resolver(service_name, true),
        ResolverProfile::Composite => build_composite_resolver(service_name),
    }
}

fn build_static_resolver(
    service_name: String,
) -> Result<CommerceRpcNameResolverBootstrap, RpcFrameworkError> {
    let endpoint = static_endpoint_from_env().ok_or_else(|| {
        RpcFrameworkError::Configuration(format!(
            "{COMMERCE_RPC_STATIC_ENDPOINT_ENV} is required for static resolver profile"
        ))
    })?;

    Ok(CommerceRpcNameResolverBootstrap {
        resolver: Arc::new(StaticNameResolver::single(endpoint)),
        service_name,
        watch_task: None,
    })
}

fn build_discovery_resolver(
    service_name: String,
    enable_watch: bool,
) -> Result<CommerceRpcNameResolverBootstrap, RpcFrameworkError> {
    let config = discovery_resolver_config_from_env()?;
    if enable_watch {
        let watching = Arc::new(WatchingDiscoveryNameResolver::new(config)?);
        let watch_task = watching.spawn_watch_loop(service_name.clone());
        return Ok(CommerceRpcNameResolverBootstrap {
            resolver: watching,
            service_name,
            watch_task: Some(watch_task),
        });
    }

    Ok(CommerceRpcNameResolverBootstrap {
        resolver: Arc::new(DiscoveryNameResolver::new(config)?),
        service_name,
        watch_task: None,
    })
}

fn build_composite_resolver(
    service_name: String,
) -> Result<CommerceRpcNameResolverBootstrap, RpcFrameworkError> {
    let discovery_config = discovery_resolver_config_from_env()?;
    let fallback_endpoint = static_endpoint_from_env().ok_or_else(|| {
        RpcFrameworkError::Configuration(format!(
            "{COMMERCE_RPC_STATIC_ENDPOINT_ENV} is required for composite resolver profile"
        ))
    })?;

    let watching = Arc::new(WatchingDiscoveryNameResolver::new(discovery_config)?);
    let watch_task = watching.spawn_watch_loop(service_name.clone());
    let resolver =
        CompositeNameResolver::new(watching, StaticNameResolver::single(fallback_endpoint));

    Ok(CommerceRpcNameResolverBootstrap {
        resolver: Arc::new(resolver),
        service_name,
        watch_task: Some(watch_task),
    })
}

fn discovery_resolver_config_from_env() -> Result<DiscoveryNameResolverConfig, RpcFrameworkError> {
    let discovery_endpoint = discovery_endpoint_from_env().ok_or_else(|| {
        RpcFrameworkError::Configuration(format!(
            "{COMMERCE_DISCOVERY_ENDPOINT_ENV} is required for discovery resolver profile"
        ))
    })?;

    Ok(DiscoveryNameResolverConfig {
        discovery_endpoint,
        namespace: std::env::var(COMMERCE_DISCOVERY_NAMESPACE_ENV)
            .unwrap_or_else(|_| "sdkwork".to_string()),
        environment: std::env::var(COMMERCE_DISCOVERY_ENVIRONMENT_ENV)
            .or_else(|_| std::env::var("SDKWORK_COMMERCE_ENVIRONMENT"))
            .unwrap_or_else(|_| "development".to_string()),
        subject_id: std::env::var(COMMERCE_RPC_RESOLVER_SUBJECT_ID_ENV)
            .unwrap_or_else(|_| "sdkwork-commerce-rpc-client".to_string()),
        healthy_only: true,
        protocol: "grpc".to_string(),
    })
}

fn discovery_endpoint_from_env() -> Option<String> {
    std::env::var(COMMERCE_DISCOVERY_ENDPOINT_ENV)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn static_endpoint_from_env() -> Option<String> {
    std::env::var(COMMERCE_RPC_STATIC_ENDPOINT_ENV)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_env::EnvGuard;

    #[test]
    fn static_profile_requires_static_endpoint_env() {
        let _env = EnvGuard::isolate(&[
            COMMERCE_RPC_RESOLVER_PROFILE_ENV,
            COMMERCE_DISCOVERY_ENDPOINT_ENV,
            COMMERCE_RPC_STATIC_ENDPOINT_ENV,
        ]);
        std::env::set_var(COMMERCE_RPC_RESOLVER_PROFILE_ENV, "static");

        let error =
            build_commerce_rpc_name_resolver_from_env().expect_err("missing static endpoint");
        assert!(matches!(error, RpcFrameworkError::Configuration(_)));
    }

    #[test]
    fn discovery_profile_requires_discovery_endpoint_env() {
        let _env = EnvGuard::isolate(&[
            COMMERCE_RPC_RESOLVER_PROFILE_ENV,
            COMMERCE_DISCOVERY_ENDPOINT_ENV,
            COMMERCE_RPC_STATIC_ENDPOINT_ENV,
        ]);
        std::env::set_var(COMMERCE_RPC_RESOLVER_PROFILE_ENV, "discovery");

        let error =
            build_commerce_rpc_name_resolver_from_env().expect_err("missing discovery endpoint");
        assert!(matches!(error, RpcFrameworkError::Configuration(_)));
    }
}
