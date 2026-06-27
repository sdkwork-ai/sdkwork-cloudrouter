use std::sync::Arc;

mod runtime;

use axum::Router;
use tokio::net::TcpListener;
use tokio::signal;
use tracing::info;

use crate::runtime::McpRuntime;

fn web_framework_enabled() -> bool {
    std::env::var("SDKWORK_MCP_WEB_FRAMEWORK")
        .map(|value| value != "0" && value != "false")
        .unwrap_or(true)
}

async fn build_app_router(runtime: Arc<McpRuntime>) -> Router {
    let service = runtime.service();
    let tenant_id = runtime.default_tenant_id();
    let pool = runtime.postgres_pool();
    if web_framework_enabled() {
        sdkwork_routes_mcp_app_api::build_router_with_web_framework_from_env(
            service,
            tenant_id,
            pool,
        )
        .await
    } else {
        sdkwork_routes_mcp_app_api::build_router_with_readiness(service, tenant_id, pool)
    }
}

async fn build_backend_router(runtime: Arc<McpRuntime>) -> Router {
    let service = runtime.service();
    let tenant_id = runtime.default_tenant_id();
    let pool = runtime.postgres_pool();
    if web_framework_enabled() {
        sdkwork_routes_mcp_backend_api::build_router_with_web_framework_from_env(
            service,
            tenant_id,
            pool,
        )
        .await
    } else {
        sdkwork_routes_mcp_backend_api::build_router_with_readiness(service, tenant_id, pool)
    }
}

async fn serve_with_shutdown(app: Router, addr: &str, label: &str) -> Result<(), String> {
    let listener = TcpListener::bind(addr)
        .await
        .map_err(|error| format!("bind {label} on {addr} failed: {error}"))?;
    info!("sdkwork-mcp {label} listening on http://{addr}");
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .map_err(|error| format!("serve {label} failed: {error}"))
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        () = ctrl_c => {},
        () = terminate => {},
    }
}

pub async fn serve_app_api(runtime: Arc<McpRuntime>) -> Result<(), String> {
    let addr = std::env::var("SDKWORK_MCP_APP_BIND")
        .unwrap_or_else(|_| "127.0.0.1:18092".to_string());
    let app = build_app_router(runtime).await;
    serve_with_shutdown(app, addr.as_str(), "app api").await
}

pub async fn serve_backend_api(runtime: Arc<McpRuntime>) -> Result<(), String> {
    let addr = std::env::var("SDKWORK_MCP_BACKEND_BIND")
        .unwrap_or_else(|_| "127.0.0.1:18093".to_string());
    let app = build_backend_router(runtime).await;
    serve_with_shutdown(app, addr.as_str(), "backend api").await
}

pub async fn bootstrap_runtime() -> Result<Arc<McpRuntime>, String> {
    Ok(Arc::new(McpRuntime::bootstrap_from_env().await?))
}
