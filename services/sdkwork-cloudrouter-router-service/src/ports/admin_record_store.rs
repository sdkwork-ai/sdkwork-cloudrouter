use std::future::Future;
use std::pin::Pin;

use serde::Serialize;

use crate::domain::DomainResult;

pub type AdminRecordReadFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminRecordSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminRecordLogsQuery {
    pub subject: AdminRecordSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub user: Option<String>,
    pub token: Option<String>,
    pub model: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct AdminRecordListPage {
    pub items: Vec<AdminRecordLogItem>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminRecordLogItem {
    pub id: String,
    pub user: String,
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
    pub http_method: String,
    pub error_code: String,
    pub error_type: String,
    pub error_message: String,
    pub total_time: String,
    pub ttft: String,
    pub is_stream: bool,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub input_tokens: i64,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub cache_read_tokens: i64,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
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

pub trait AdminRecordStore {
    fn list_logs<'a>(
        &'a self,
        query: ListAdminRecordLogsQuery,
    ) -> AdminRecordReadFuture<'a, AdminRecordListPage>;
}
