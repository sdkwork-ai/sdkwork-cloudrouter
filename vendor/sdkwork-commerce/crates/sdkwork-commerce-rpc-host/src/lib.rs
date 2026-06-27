pub use sdkwork_commerce_service_host::run_commerce_rpc_host_from_env;

pub async fn run() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    run_commerce_rpc_host_from_env().await
}
