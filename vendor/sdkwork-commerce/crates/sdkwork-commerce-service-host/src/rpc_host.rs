use sdkwork_commerce_contract_service::CommerceServiceError;
use sdkwork_commerce_rpc::{CommerceRpcContextResolver, CommerceRpcServerConfig};

use crate::rpc_discovery::register_commerce_discovery_instance;
use crate::rpc_server::{
    serve_commerce_service_host_rpc_with_discovery, CommerceServiceHostRpcServerConfig,
};
use crate::{
    build_commerce_rpc_runtime_service_registry, CommerceRuntimeIdempotencyStore,
    CommerceRuntimeTransactionManager, CommerceServiceHostRpcRuntime,
    CommerceServiceHostRuntimeStores,
};

pub struct CommerceServiceHostRpcHost {
    pub config: CommerceServiceHostRpcServerConfig,
    pub runtime: CommerceServiceHostRpcRuntime,
}

pub struct CommerceServiceHostRpcHostInput {
    pub stores: CommerceServiceHostRuntimeStores,
    pub context_resolver: Box<dyn CommerceRpcContextResolver + Send>,
    pub idempotency_store: Box<dyn CommerceRuntimeIdempotencyStore + Send>,
    pub transaction_manager: Box<dyn CommerceRuntimeTransactionManager + Send>,
    pub server_config: CommerceServiceHostRpcServerConfig,
}

impl CommerceServiceHostRpcHostInput {
    pub fn new(
        stores: CommerceServiceHostRuntimeStores,
        context_resolver: Box<dyn CommerceRpcContextResolver + Send>,
        idempotency_store: Box<dyn CommerceRuntimeIdempotencyStore + Send>,
        transaction_manager: Box<dyn CommerceRuntimeTransactionManager + Send>,
        server_config: CommerceServiceHostRpcServerConfig,
    ) -> Self {
        Self {
            stores,
            context_resolver,
            idempotency_store,
            transaction_manager,
            server_config,
        }
    }
}

pub fn build_commerce_service_host_rpc_host(
    input: CommerceServiceHostRpcHostInput,
) -> Result<CommerceServiceHostRpcHost, CommerceServiceError> {
    let registry = build_commerce_rpc_runtime_service_registry(&input.stores)?;
    let runtime = CommerceServiceHostRpcRuntime::with_context_resolver(
        registry,
        input.context_resolver,
        input.idempotency_store,
        input.transaction_manager,
    );
    Ok(CommerceServiceHostRpcHost {
        config: input.server_config,
        runtime,
    })
}

impl CommerceServiceHostRpcHost {
    pub async fn serve(self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let discovery = register_commerce_discovery_instance(&self.config)
            .await
            .map_err(|error| -> Box<dyn std::error::Error + Send + Sync> {
                Box::new(std::io::Error::other(error.to_string()))
            })?;
        serve_commerce_service_host_rpc_with_discovery(self.config, self.runtime, discovery).await
    }

    pub fn server_config(&self) -> &CommerceRpcServerConfig {
        &self.config
    }
}
