use std::future::Future;
use std::pin::Pin;

use serde::Serialize;

use crate::domain::{DomainResult, ProviderCircuitBreakerPolicy, ProviderRetryPolicy};

pub type AppRoutingReadFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AppRoutingSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AppRoutingListQuery {
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub q: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AppRoutingChannelListPage {
    pub items: Vec<AppRoutingChannelItem>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AppRoutingApiKeyListPage {
    pub items: Vec<AppRoutingApiKeyItem>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AppRoutingRequestTraceListPage {
    pub items: Vec<AppRoutingRequestTraceItem>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppRoutingItems<T> {
    pub items: Vec<T>,
}

impl<T> AppRoutingItems<T> {
    pub fn new(items: Vec<T>) -> Self {
        Self { items }
    }
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppRoutingChannelItem {
    pub id: String,
    pub name: String,
    pub vendor: String,
    pub provider: String,
    pub supplier_code: String,
    pub protocol: String,
    pub access_type: String,
    pub base_url: String,
    pub api_key: String,
    pub models: Vec<String>,
    pub capabilities: Vec<String>,
    pub is_multimodal: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout_ms: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub retry_policy: Option<AppRoutingRetryPolicyItem>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub circuit_breaker_policy: Option<AppRoutingCircuitBreakerPolicyItem>,
    pub weight: i64,
    pub status: String,
    pub latency: String,
    pub rpm: i64,
    pub balance: String,
    pub errors: i64,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppRoutingRetryPolicyItem {
    pub max_attempts: usize,
    pub retryable_status_codes: Vec<u16>,
    pub backoff_ms: u64,
}

impl AppRoutingRetryPolicyItem {
    pub fn from_json(value: &str) -> Option<Self> {
        ProviderRetryPolicy::from_json_str(value)
            .ok()
            .map(|policy| Self {
                max_attempts: policy.max_attempts,
                retryable_status_codes: policy.retryable_status_codes,
                backoff_ms: policy.backoff_ms,
            })
    }
}

#[derive(Debug, Clone, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppRoutingCircuitBreakerPolicyItem {
    pub failure_threshold: usize,
}

impl AppRoutingCircuitBreakerPolicyItem {
    pub fn from_json(value: &str) -> Option<Self> {
        ProviderCircuitBreakerPolicy::from_json_str(value)
            .ok()
            .map(|policy| Self {
                failure_threshold: policy.failure_threshold,
            })
    }
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppRoutingApiKeyItem {
    pub id: String,
    pub name: String,
    pub display_key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub copyable_key: Option<String>,
    pub status: String,
    pub total_usage: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppRoutingRequestTraceItem {
    pub id: String,
    pub time: String,
    pub model: String,
    pub channel: String,
    pub status: i64,
    pub duration: String,
    pub tokens: i64,
    pub trace_id: String,
    pub request_id: String,
    pub request_path: String,
    pub http_method: String,
    pub request_payload_hash: String,
    pub response_payload_hash: String,
    pub request_bytes: i64,
    pub response_bytes: i64,
    pub provider_error_code: String,
    pub error_type: String,
    pub error_message_masked: String,
    pub started_at: String,
    pub ended_at: String,
    pub streaming: bool,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppRoutingUsageData {
    pub time: String,
    pub requests: i64,
    pub latency: i64,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppRoutingModelStats {
    pub m: String,
    pub req: String,
    pub sr: String,
    pub tok: String,
    pub lat: String,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppRoutingUsageSnapshot {
    pub chart_data: Vec<AppRoutingUsageData>,
    pub model_stats: Vec<AppRoutingModelStats>,
}

pub trait AppRoutingReadStore {
    fn load_routing_channels<'a>(
        &'a self,
        subject: Option<AppRoutingSubject>,
        query: AppRoutingListQuery,
    ) -> AppRoutingReadFuture<'a, AppRoutingChannelListPage>;

    fn load_routing_api_keys<'a>(
        &'a self,
        subject: Option<AppRoutingSubject>,
        query: AppRoutingListQuery,
    ) -> AppRoutingReadFuture<'a, AppRoutingApiKeyListPage>;

    fn load_routing_request_traces<'a>(
        &'a self,
        subject: Option<AppRoutingSubject>,
        query: AppRoutingListQuery,
    ) -> AppRoutingReadFuture<'a, AppRoutingRequestTraceListPage>;

    fn load_routing_usage<'a>(
        &'a self,
        subject: Option<AppRoutingSubject>,
    ) -> AppRoutingReadFuture<'a, AppRoutingUsageSnapshot>;
}
