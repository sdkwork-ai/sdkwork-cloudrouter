use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

pub type AdminApiKeyRateLimitCommandFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminApiKeyRateLimitSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminApiKeyRateLimitItem {
    pub id: i64,
    pub uuid: String,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub key_prefix: String,
    pub user: String,
    pub rps: i64,
    pub rpd: i64,
    pub burst: i64,
    pub status: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminApiKeyRateLimitsQuery {
    pub subject: AdminApiKeyRateLimitSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub q: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminApiKeyRateLimitListPage {
    pub items: Vec<AdminApiKeyRateLimitItem>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAdminApiKeyRateLimitCommand {
    pub subject: AdminApiKeyRateLimitSubject,
    pub policy_uuid: String,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub policy_code: String,
    pub key_prefix: String,
    pub user: String,
    pub key_prefix_hash: String,
    pub rps: i64,
    pub rpd: i64,
    pub burst: i64,
    pub request_id: String,
    pub requested_at: String,
}

pub trait AdminApiKeyRateLimitStore {
    fn list_api_key_rate_limits<'a>(
        &'a self,
        query: ListAdminApiKeyRateLimitsQuery,
    ) -> AdminApiKeyRateLimitCommandFuture<'a, AdminApiKeyRateLimitListPage>;

    fn create_api_key_rate_limit<'a>(
        &'a self,
        command: CreateAdminApiKeyRateLimitCommand,
    ) -> AdminApiKeyRateLimitCommandFuture<'a, AdminApiKeyRateLimitItem>;
}
