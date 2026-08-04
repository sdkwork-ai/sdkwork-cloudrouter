use std::future::Future;
use std::pin::Pin;

use serde::Serialize;

use crate::domain::DomainResult;

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
pub struct AppRoutingAccountGroupListPage {
    pub items: Vec<AppRoutingAccountGroupItem>,
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
pub struct AppRoutingAccountGroupItem {
    pub id: String,
    pub group_code: String,
    pub group_name: String,
    pub description: String,
    pub routing_strategy: String,
    pub fallback_mode: String,
    pub cost_multiplier: String,
    pub sale_multiplier: String,
    pub vendor_code: Option<String>,
    pub modalities: Vec<String>,
    pub status: String,
    pub authorized: bool,
    pub member_account_count: i64,
    pub available_account_count: i64,
    pub resource_codes: Vec<String>,
    pub resource_group_codes: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppRoutingApiKeyItem {
    pub id: String,
    pub name: String,
    pub display_key: String,
    pub status: String,
    pub total_usage: String,
    pub created_at: String,
    pub account_groups: Vec<AppRoutingApiKeyAccountGroupItem>,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq, Eq, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppRoutingApiKeyAccountGroupItem {
    pub id: String,
    pub code: String,
    pub name: String,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppRoutingRequestTraceItem {
    pub id: String,
    pub time: String,
    pub model: String,
    pub upstream_account_id: String,
    pub upstream_account_code: String,
    pub upstream_account_name: String,
    pub upstream_account_group_id: String,
    pub upstream_account_group_code: String,
    pub upstream_account_group_name: String,
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
    fn load_routing_account_groups<'a>(
        &'a self,
        subject: Option<AppRoutingSubject>,
        query: AppRoutingListQuery,
    ) -> AppRoutingReadFuture<'a, AppRoutingAccountGroupListPage>;

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
