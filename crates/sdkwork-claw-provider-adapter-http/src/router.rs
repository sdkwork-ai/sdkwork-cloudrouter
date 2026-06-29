use std::sync::Arc;

use axum::routing::{get, post};
use axum::Router;
use sdkwork_claw_provider_adapter::ProviderAdapter;

use crate::handlers::{healthz, invoke_provider, manifest};

#[derive(Clone)]
pub struct AdapterHttpState {
    pub(crate) adapters: Vec<Arc<dyn ProviderAdapter>>,
    pub(crate) gateway_token: Arc<str>,
}

pub fn adapter_router(
    adapters: Vec<Arc<dyn ProviderAdapter>>,
    gateway_token: impl Into<String>,
) -> Router {
    Router::new()
        .route("/healthz", get(healthz))
        .route("/readyz", get(healthz))
        .route("/internal/adapter-manifest", get(manifest))
        .route("/providers/{provider_code}/{*path}", post(invoke_provider))
        .with_state(AdapterHttpState {
            adapters,
            gateway_token: Arc::from(gateway_token.into()),
        })
}
