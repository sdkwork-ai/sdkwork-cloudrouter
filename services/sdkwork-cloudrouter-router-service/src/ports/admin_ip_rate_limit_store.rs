use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

pub type AdminIpRateLimitCommandFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminIpRateLimitSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminIpRateLimitItem {
    pub id: i64,
    pub uuid: String,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub rule_name: String,
    pub target_ip: String,
    pub rps: i64,
    pub rpm: i64,
    pub block_duration_seconds: i64,
    pub status: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminIpRateLimitsQuery {
    pub subject: AdminIpRateLimitSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub q: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminIpRateLimitListPage {
    pub items: Vec<AdminIpRateLimitItem>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAdminIpRateLimitCommand {
    pub subject: AdminIpRateLimitSubject,
    pub rule_uuid: String,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub rule_code: String,
    pub rule_name: String,
    pub target_ip: String,
    pub target_ip_hash: String,
    pub rps: i64,
    pub rpm: i64,
    pub block_duration_seconds: i64,
    pub status: String,
    pub request_id: String,
    pub requested_at: String,
}

pub trait AdminIpRateLimitStore {
    fn list_ip_rate_limits<'a>(
        &'a self,
        query: ListAdminIpRateLimitsQuery,
    ) -> AdminIpRateLimitCommandFuture<'a, AdminIpRateLimitListPage>;

    fn create_ip_rate_limit<'a>(
        &'a self,
        command: CreateAdminIpRateLimitCommand,
    ) -> AdminIpRateLimitCommandFuture<'a, AdminIpRateLimitItem>;
}
