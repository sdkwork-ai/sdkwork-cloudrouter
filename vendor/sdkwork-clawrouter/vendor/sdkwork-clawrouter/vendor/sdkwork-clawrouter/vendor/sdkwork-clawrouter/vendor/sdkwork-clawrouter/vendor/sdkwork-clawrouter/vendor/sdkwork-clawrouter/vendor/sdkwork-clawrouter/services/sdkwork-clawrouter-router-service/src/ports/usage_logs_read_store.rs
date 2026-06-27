use std::future::Future;
use std::pin::Pin;

use serde::Serialize;

use crate::domain::DomainResult;

pub type UsageLogsReadFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<UsageLogsPage>> + Send + 'a>>;

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct UsageLogsQuery {
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub keyword: Option<String>,
    pub status: UsageLogsStatus,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum UsageLogsStatus {
    #[default]
    All,
    Success,
    Error,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct UsageLogsSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UsageLogsPage {
    pub logs: Vec<UsageLogItem>,
    pub total: i64,
    #[serde(rename = "page")]
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UsageLogItem {
    pub id: String,
    pub request_id: String,
    pub time: String,
    pub token_name: String,
    pub group: String,
    #[serde(rename = "type")]
    pub log_type: String,
    pub model: String,
    pub provider_native_model: String,
    pub requested_model_catalog_key: String,
    pub region_code: String,
    pub status: String,
    pub http_status: i64,
    pub error_code: String,
    pub error_type: String,
    pub error_message: String,
    pub total_time: String,
    pub ttft: String,
    pub is_stream: bool,
    pub input_tokens: i64,
    pub cache_read_tokens: i64,
    pub output_tokens: i64,
    pub cost: String,
    pub multiplier: String,
    pub base_input_price: String,
    pub base_output_price: String,
    pub cache_read_price: String,
    pub path: String,
    pub reasoning_effort: String,
    pub ip: String,
    pub user_agent: String,
}

pub trait UsageLogsReadStore {
    fn load_usage_logs<'a>(
        &'a self,
        query: UsageLogsQuery,
        subject: Option<UsageLogsSubject>,
    ) -> UsageLogsReadFuture<'a>;
}
