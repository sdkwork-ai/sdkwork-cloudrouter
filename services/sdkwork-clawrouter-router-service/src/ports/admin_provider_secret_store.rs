use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

pub type AdminProviderSecretCommandFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminProviderSecretSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminProviderSecretItem {
    pub id: i64,
    pub uuid: String,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub supplier_code: String,
    pub account_code: String,
    pub name: String,
    pub auth_type: String,
    pub secret_ref: String,
    pub masked_label: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminProviderSecretsQuery {
    pub subject: AdminProviderSecretSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub supplier_code: Option<String>,
    pub status: Option<String>,
    pub q: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminProviderSecretListPage {
    pub items: Vec<AdminProviderSecretItem>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAdminProviderSecretCommand {
    pub subject: AdminProviderSecretSubject,
    pub account_uuid: String,
    pub account_code: String,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub supplier_code: String,
    pub name: String,
    pub auth_type: String,
    pub secret_ref: String,
    pub masked_label: String,
    pub status: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminProviderSecretCommand {
    pub subject: AdminProviderSecretSubject,
    pub secret_id: i64,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub supplier_code: Option<String>,
    pub name: Option<String>,
    pub auth_type: Option<String>,
    pub secret_ref: Option<String>,
    pub masked_label: Option<String>,
    pub status: Option<String>,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteAdminProviderSecretCommand {
    pub subject: AdminProviderSecretSubject,
    pub secret_id: i64,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub request_id: String,
    pub requested_at: String,
}

pub trait AdminProviderSecretStore {
    fn list_provider_secrets<'a>(
        &'a self,
        query: ListAdminProviderSecretsQuery,
    ) -> AdminProviderSecretCommandFuture<'a, AdminProviderSecretListPage>;

    fn create_provider_secret<'a>(
        &'a self,
        command: CreateAdminProviderSecretCommand,
    ) -> AdminProviderSecretCommandFuture<'a, AdminProviderSecretItem>;

    fn update_provider_secret<'a>(
        &'a self,
        command: UpdateAdminProviderSecretCommand,
    ) -> AdminProviderSecretCommandFuture<'a, Option<AdminProviderSecretItem>>;

    fn delete_provider_secret<'a>(
        &'a self,
        command: DeleteAdminProviderSecretCommand,
    ) -> AdminProviderSecretCommandFuture<'a, bool>;
}
