use std::future::Future;
use std::pin::Pin;

use crate::domain::{DecimalValue, DomainResult};

pub type AdminUserCommandFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminUserSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminUsersQuery {
    pub subject: AdminUserSubject,
    pub q: Option<String>,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ListAdminUserApiKeysQuery {
    pub subject: AdminUserSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminUserListPage {
    pub items: Vec<AdminUserItem>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminUserApiKeyListPage {
    pub items: Vec<AdminUserApiKeyItem>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAdminUserCommand {
    pub user_uuid: String,
    pub account_uuid: String,
    pub audit_log_uuid: String,
    pub subject: AdminUserSubject,
    pub email: String,
    pub username: String,
    pub initial_balance: DecimalValue,
    pub requested_at: String,
    pub request_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminUserCommand {
    pub audit_log_uuid: String,
    pub subject: AdminUserSubject,
    pub user_id: i64,
    pub username: Option<String>,
    pub group: Option<String>,
    pub status: Option<String>,
    pub requested_at: String,
    pub request_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdjustAdminUserBalanceCommand {
    pub account_uuid: String,
    pub account_history_uuid: String,
    pub audit_log_uuid: String,
    pub subject: AdminUserSubject,
    pub user_id: i64,
    pub amount: DecimalValue,
    pub adjustment_type: String,
    pub requested_at: String,
    pub request_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAdminUserApiKeyCommand {
    pub api_key_uuid: String,
    pub audit_log_uuid: String,
    pub subject: AdminUserSubject,
    pub user_id: i64,
    pub name: String,
    pub key_prefix: String,
    pub key_display_masked: String,
    pub key_hash: String,
    pub hash_alg: String,
    pub secret_version: i64,
    pub idempotency_key: String,
    pub requested_at: String,
    pub request_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteAdminUserApiKeyCommand {
    pub audit_log_uuid: String,
    pub subject: AdminUserSubject,
    pub api_key_id: i64,
    pub requested_at: String,
    pub request_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminUserItem {
    pub id: i64,
    pub email: String,
    pub username: String,
    pub display_name: String,
    pub mobile: String,
    pub role: String,
    pub group: String,
    pub balance: String,
    pub status: String,
    pub last_active: String,
    pub last_used: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminUserApiKeyItem {
    pub id: i64,
    pub user_id: i64,
    pub name: String,
    pub key: String,
    pub used: String,
    pub status: String,
}

pub trait AdminUserStore {
    fn list_users<'a>(
        &'a self,
        query: ListAdminUsersQuery,
    ) -> AdminUserCommandFuture<'a, AdminUserListPage>;

    fn list_api_keys<'a>(
        &'a self,
        query: ListAdminUserApiKeysQuery,
    ) -> AdminUserCommandFuture<'a, AdminUserApiKeyListPage>;

    fn create_user<'a>(
        &'a self,
        command: CreateAdminUserCommand,
    ) -> AdminUserCommandFuture<'a, AdminUserItem>;

    fn update_user<'a>(
        &'a self,
        command: UpdateAdminUserCommand,
    ) -> AdminUserCommandFuture<'a, Option<AdminUserItem>>;

    fn adjust_balance<'a>(
        &'a self,
        command: AdjustAdminUserBalanceCommand,
    ) -> AdminUserCommandFuture<'a, Option<AdminUserItem>>;

    fn create_api_key<'a>(
        &'a self,
        command: CreateAdminUserApiKeyCommand,
    ) -> AdminUserCommandFuture<'a, AdminUserApiKeyItem>;

    fn delete_api_key<'a>(
        &'a self,
        command: DeleteAdminUserApiKeyCommand,
    ) -> AdminUserCommandFuture<'a, bool>;
}
