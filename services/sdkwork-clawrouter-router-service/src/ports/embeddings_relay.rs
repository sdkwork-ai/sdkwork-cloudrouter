use std::future::Future;
use std::pin::Pin;

use serde_json::Value;

use crate::domain::{DomainResult, ProviderAuthProfile, ProviderRetryPolicy};
use crate::ports::ProviderResponseMemoryGuard;

pub type EmbeddingsRelayFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<EmbeddingsRelayResponse>> + Send + 'a>>;

pub trait EmbeddingsRelay {
    fn create_embedding<'a>(&'a self, request: EmbeddingsRelayRequest)
        -> EmbeddingsRelayFuture<'a>;
}

#[derive(Debug, Clone, PartialEq)]
pub struct EmbeddingsRelayRequest {
    pub api_key_id: i64,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
    pub group_id: i64,
    pub group_code: String,
    pub pricing_plan_code: String,
    pub model: String,
    pub supplier_code: String,
    pub provider_account_id: i64,
    pub provider_region_code: String,
    pub provider_model: String,
    pub provider_base_url: Option<String>,
    pub provider_secret_ref: Option<String>,
    pub provider_auth_profile: ProviderAuthProfile,
    pub provider_timeout_ms: Option<u64>,
    pub provider_retry_policy: Option<ProviderRetryPolicy>,
    pub request_body: Value,
}

#[derive(Debug, Clone, PartialEq)]
pub struct EmbeddingsRelayResponse {
    pub status_code: u16,
    pub body: Value,
    pub memory_guard: Option<ProviderResponseMemoryGuard>,
}

impl EmbeddingsRelayResponse {
    pub fn json(status_code: u16, body: Value) -> Self {
        Self {
            status_code,
            body,
            memory_guard: None,
        }
    }

    pub fn with_memory_guard(mut self, memory_guard: ProviderResponseMemoryGuard) -> Self {
        self.memory_guard = Some(memory_guard);
        self
    }
}
