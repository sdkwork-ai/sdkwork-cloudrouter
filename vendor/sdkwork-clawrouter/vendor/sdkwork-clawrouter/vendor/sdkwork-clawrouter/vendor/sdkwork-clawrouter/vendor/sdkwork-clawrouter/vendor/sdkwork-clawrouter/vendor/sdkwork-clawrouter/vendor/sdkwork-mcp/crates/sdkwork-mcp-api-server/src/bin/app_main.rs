use sdkwork_mcp_api_server::{bootstrap_runtime, serve_app_api};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let runtime = bootstrap_runtime()
        .await
        .expect("bootstrap sdkwork-mcp runtime");
    serve_app_api(runtime)
        .await
        .expect("serve sdkwork-mcp app api");
}
