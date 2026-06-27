use sdkwork_rpc_framework_core::{ResolverProfile, RpcFrameworkError};

use crate::rpc_client_bootstrap::{
    build_commerce_rpc_name_resolver_from_env, commerce_rpc_resolver_profile_from_env,
    CommerceRpcNameResolverBootstrap, COMMERCE_RPC_RESOLVER_PROFILE_ENV,
    COMMERCE_RPC_STATIC_ENDPOINT_ENV,
};

/// RPC framework bootstrap inventory for commerce service hosts.
#[derive(Debug)]
pub struct CommerceRpcFrameworkBootstrap {
    pub resolver_profile: ResolverProfile,
    pub client_resolver: Option<CommerceRpcNameResolverBootstrap>,
}

impl CommerceRpcFrameworkBootstrap {
    pub async fn verify_client_resolution(&self) -> Result<(), RpcFrameworkError> {
        let Some(client) = &self.client_resolver else {
            return Ok(());
        };

        let _endpoint = client.resolve_primary_endpoint().await?;
        Ok(())
    }

    /// Returns a connected tonic channel for the primary resolved RPC endpoint when configured.
    pub async fn connect_primary_rpc_channel(
        &self,
    ) -> Result<Option<tonic::transport::Channel>, RpcFrameworkError> {
        match &self.client_resolver {
            Some(client) => Ok(Some(client.connect_primary_channel().await?)),
            None => Ok(None),
        }
    }
}

/// `initialize-rpc-framework` stage for commerce RPC hosts.
pub fn initialize_commerce_rpc_framework_from_env(
) -> Result<CommerceRpcFrameworkBootstrap, RpcFrameworkError> {
    let resolver_profile = commerce_rpc_resolver_profile_from_env();
    let client_resolver = if should_initialize_client_resolver(resolver_profile) {
        Some(build_commerce_rpc_name_resolver_from_env()?)
    } else {
        None
    };

    Ok(CommerceRpcFrameworkBootstrap {
        resolver_profile,
        client_resolver,
    })
}

fn should_initialize_client_resolver(profile: ResolverProfile) -> bool {
    if std::env::var(COMMERCE_RPC_RESOLVER_PROFILE_ENV).is_ok() {
        return match profile {
            ResolverProfile::Static | ResolverProfile::StaticComposite => {
                static_endpoint_configured()
            }
            _ => true,
        };
    }

    match profile {
        ResolverProfile::Discovery | ResolverProfile::Composite => true,
        ResolverProfile::Static | ResolverProfile::StaticComposite => static_endpoint_configured(),
    }
}

fn static_endpoint_configured() -> bool {
    std::env::var(COMMERCE_RPC_STATIC_ENDPOINT_ENV)
        .ok()
        .map(|value| !value.trim().is_empty())
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rpc_discovery::COMMERCE_DISCOVERY_ENDPOINT_ENV;
    use crate::test_env::EnvGuard;

    #[test]
    fn skips_client_inventory_when_no_resolver_env_is_configured() {
        let _env = EnvGuard::isolate(&[
            COMMERCE_RPC_RESOLVER_PROFILE_ENV,
            COMMERCE_RPC_STATIC_ENDPOINT_ENV,
            COMMERCE_DISCOVERY_ENDPOINT_ENV,
        ]);

        let bootstrap = initialize_commerce_rpc_framework_from_env().expect("bootstrap");
        assert_eq!(bootstrap.resolver_profile, ResolverProfile::Static);
        assert!(bootstrap.client_resolver.is_none());
    }
}
