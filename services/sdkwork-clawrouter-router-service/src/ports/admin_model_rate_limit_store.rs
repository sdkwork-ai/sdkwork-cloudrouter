use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

pub type AdminModelRateLimitCommandFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminModelRateLimitSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminModelRateLimitItem {
    pub id: i64,
    pub uuid: String,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub model: String,
    pub upstream_account_group: String,
    pub account_group_id: i64,
    pub upstream_account_group_name: String,
    pub rpm: i64,
    pub tpm: i64,
    pub status: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminModelRateLimitsQuery {
    pub subject: AdminModelRateLimitSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub q: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminModelRateLimitListPage {
    pub items: Vec<AdminModelRateLimitItem>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAdminModelRateLimitCommand {
    pub subject: AdminModelRateLimitSubject,
    pub policy_uuid: String,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub policy_code: String,
    pub model: String,
    pub upstream_account_group: String,
    pub rpm: i64,
    pub tpm: i64,
    pub request_id: String,
    pub requested_at: String,
}

pub trait AdminModelRateLimitStore {
    fn list_model_rate_limits<'a>(
        &'a self,
        query: ListAdminModelRateLimitsQuery,
    ) -> AdminModelRateLimitCommandFuture<'a, AdminModelRateLimitListPage>;

    fn create_model_rate_limit<'a>(
        &'a self,
        command: CreateAdminModelRateLimitCommand,
    ) -> AdminModelRateLimitCommandFuture<'a, AdminModelRateLimitItem>;
}
