use std::net::SocketAddr;
use std::sync::Arc;

use axum::Router;
use sdkwork_claw_provider_adapter_core::ProviderAdapter;

pub const ENV_PROVIDER_ADAPTER_BIND: &str = "SDKWORK_CLAW_PROVIDER_ADAPTER_BIND";
pub const DEFAULT_PROVIDER_ADAPTER_BIND: &str = "0.0.0.0:39110";
pub const ENV_PROVIDER_ADAPTER_GATEWAY_TOKEN: &str = "SDKWORK_CLAW_PROVIDER_ADAPTER_GATEWAY_TOKEN";
pub const ENV_PROVIDER_ADAPTER_GATEWAY_TOKEN_FILE: &str =
    "SDKWORK_CLAW_PROVIDER_ADAPTER_GATEWAY_TOKEN_FILE";

pub fn router_with_adapters(
    adapters: Vec<Arc<dyn ProviderAdapter>>,
    gateway_token: impl Into<String>,
) -> Router {
    sdkwork_claw_provider_adapter_http::adapter_router(adapters, gateway_token)
}

pub fn router_with_default_adapters(gateway_token: impl Into<String>) -> Router {
    router_with_adapters(crate::providers::build_provider_adapters(), gateway_token)
}

pub async fn serve(bind_addr: &str) -> anyhow::Result<()> {
    let token = gateway_token_from_env()?;
    let listener = tokio::net::TcpListener::bind(bind_addr).await?;
    axum::serve(listener, router_with_default_adapters(token)).await?;
    Ok(())
}

pub fn bind_addr_from_env() -> anyhow::Result<String> {
    bind_addr_from_env_or_toml(None)
}

pub fn bind_addr_from_env_or_toml(config_bind_addr: Option<&str>) -> anyhow::Result<String> {
    let bind_addr = std::env::var(ENV_PROVIDER_ADAPTER_BIND)
        .map(|value| value.trim().to_owned())
        .ok()
        .filter(|value| !value.is_empty())
        .or_else(|| {
            config_bind_addr
                .map(|value| value.trim().to_owned())
                .filter(|value| !value.is_empty())
        })
        .unwrap_or_else(|| DEFAULT_PROVIDER_ADAPTER_BIND.to_owned());
    bind_addr.parse::<SocketAddr>().map_err(|error| {
        anyhow::anyhow!("{ENV_PROVIDER_ADAPTER_BIND} must be a valid socket address: {error}")
    })?;
    Ok(bind_addr)
}

pub fn gateway_token_from_env() -> anyhow::Result<String> {
    if let Some(token) = std::env::var(ENV_PROVIDER_ADAPTER_GATEWAY_TOKEN)
        .map(|value| value.trim().to_owned())
        .ok()
        .filter(|value| !value.is_empty())
    {
        return Ok(token);
    }
    if let Some(path) = std::env::var(ENV_PROVIDER_ADAPTER_GATEWAY_TOKEN_FILE)
        .map(|value| value.trim().to_owned())
        .ok()
        .filter(|value| !value.is_empty())
    {
        let value = std::fs::read_to_string(&path)
            .map_err(|error| anyhow::anyhow!("failed to read {path}: {error}"))?
            .trim()
            .to_owned();
        if value.is_empty() {
            return Err(anyhow::anyhow!(
                "{} file {path} must not be blank",
                ENV_PROVIDER_ADAPTER_GATEWAY_TOKEN_FILE
            ));
        }
        return Ok(value);
    }
    Err(anyhow::anyhow!(
        "{} or {} is required",
        ENV_PROVIDER_ADAPTER_GATEWAY_TOKEN,
        ENV_PROVIDER_ADAPTER_GATEWAY_TOKEN_FILE
    ))
}
