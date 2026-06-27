use sdkwork_commerce_rpc::{
    commerce_rpc_server_builder, mark_commerce_rpc_health_serving, CommerceRpcServerConfig,
    CommerceRpcServices,
};

use crate::CommerceServiceHostRpcRuntime;

pub type CommerceServiceHostRpcServerConfig = CommerceRpcServerConfig;

pub async fn serve_commerce_service_host_rpc(
    config: CommerceServiceHostRpcServerConfig,
    runtime: CommerceServiceHostRpcRuntime,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    serve_commerce_service_host_rpc_with_discovery(config, runtime, None).await
}

pub async fn serve_commerce_service_host_rpc_with_discovery(
    config: CommerceServiceHostRpcServerConfig,
    runtime: CommerceServiceHostRpcRuntime,
    discovery: Option<std::sync::Arc<sdkwork_rpc_discovery::DiscoveryInstanceHandle>>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut handle =
        commerce_rpc_server_builder(config.clone()).build(CommerceRpcServices { runtime });
    if let Some(reporter) = handle.health_reporter.as_mut() {
        mark_commerce_rpc_health_serving(reporter).await;
    }
    let router = handle.router;
    let shutdown = sdkwork_rpc_server::wait_for_ctrl_c();

    if let Some(discovery_handle) = discovery {
        sdkwork_rpc_server::serve_with_discovery_lifecycle(
            router,
            &config.bind_addr,
            discovery_handle,
            shutdown,
            None,
        )
        .await?;
    } else {
        sdkwork_rpc_server::serve_with_graceful_shutdown(
            router,
            &config.bind_addr,
            shutdown,
        )
        .await?;
    }
    Ok(())
}
