use std::future::Future;
use std::pin::Pin;

use axum::http::HeaderMap;
use serde_json::Value;

use crate::domain::{DomainResult, ProviderAuthProfile, ProviderRetryPolicy};
use crate::ports::ProviderResponseMemoryGuard;

pub type ChatCompletionRelayFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<ChatCompletionRelayResponse>> + Send + 'a>>;

pub trait ChatCompletionRelay {
    fn create_chat_completion<'a>(
        &'a self,
        request: ChatCompletionRelayRequest,
    ) -> ChatCompletionRelayFuture<'a>;
}

#[derive(Debug, Clone, PartialEq)]
pub struct ChatCompletionRelayRequest {
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
pub struct ChatCompletionRelayResponse {
    pub status_code: u16,
    pub body: Value,
    pub body_bytes: Option<Vec<u8>>,
    pub content_type: Option<String>,
    pub headers: HeaderMap,
    pub memory_guard: Option<ProviderResponseMemoryGuard>,
}

impl ChatCompletionRelayResponse {
    pub fn json(status_code: u16, body: Value) -> Self {
        Self {
            status_code,
            body,
            body_bytes: None,
            content_type: Some("application/json".to_owned()),
            headers: HeaderMap::new(),
            memory_guard: None,
        }
    }

    pub fn bytes(status_code: u16, body: Vec<u8>, content_type: Option<String>) -> Self {
        Self {
            status_code,
            body: Value::Null,
            body_bytes: Some(body),
            content_type,
            headers: HeaderMap::new(),
            memory_guard: None,
        }
    }

    pub fn with_response_metadata(
        mut self,
        content_type: Option<String>,
        headers: HeaderMap,
    ) -> Self {
        self.content_type = content_type;
        self.headers = headers;
        self
    }

    pub fn with_memory_guard(mut self, memory_guard: ProviderResponseMemoryGuard) -> Self {
        self.memory_guard = Some(memory_guard);
        self
    }
}
