use std::future::Future;
use std::pin::Pin;

use serde_json::Value;

use crate::domain::{DomainResult, ProviderAuthProfile, ProviderRetryPolicy};

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
}

impl ChatCompletionRelayResponse {
    pub fn json(status_code: u16, body: Value) -> Self {
        Self { status_code, body }
    }
}
