use std::future::Future;
use std::pin::Pin;

use serde::Serialize;

use crate::domain::DomainResult;

pub type UsageLogsReadFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<UsageLogsPage>> + Send + 'a>>;

/// Opaque keyset continuation for the usage-logs read model: the
/// `(started_at, id)` seek tuple of the last row returned on the previous
/// page. Encoded/decoded to an opaque base64url token at the HTTP boundary.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct UsageLogsCursor {
    pub started_at_micros: i64,
    pub id: i64,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct UsageLogsQuery {
    pub cursor: Option<UsageLogsCursor>,
    pub page_size: i64,
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
    /// Seek tuple of the last returned row; `None` when no further page
    /// exists. Encoded to the opaque `nextCursor` token at the HTTP boundary.
    pub next_cursor: Option<UsageLogsCursor>,
    pub has_more: bool,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UsageLogItem {
    pub id: String,
    pub gateway_request_id: String,
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
    pub input_tokens: String,
    pub cache_read_tokens: String,
    pub output_tokens: String,
    pub cost: String,
    pub currency: String,
    pub points: String,
    /// Configured Token Bank points awarded for one major unit of the item's
    /// pricing currency (currency→CNY × base points per CNY), resolved from the
    /// recharge/or billing exchange settings. Lets the frontend render the
    /// points budget and formula at the configured rate instead of deriving it
    /// from a single record's `points / cost` (which zeroes out when a record
    /// has no cash amount or no recorded debit).
    pub points_per_unit: String,
    pub original_currency_amount: String,
    pub original_currency_code: String,
    pub multiplier: String,
    pub base_input_price: String,
    pub base_output_price: String,
    pub cache_read_price: String,
    pub unit_size: String,
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
        locale: Option<&'a str>,
    ) -> UsageLogsReadFuture<'a>;
}
