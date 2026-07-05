use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

pub type AdminChannelCommandFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminChannelSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminChannelCredentialItem {
    pub id: i64,
    pub credential_id: i64,
    pub uuid: String,
    pub name: String,
    pub base_url: String,
    pub secret_ref: String,
    pub api_key: Option<String>,
    pub masked_label: String,
    pub priority: i64,
    pub weight: i64,
    pub status: String,
    pub errors: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminChannelCredentialInput {
    pub credential_uuid: String,
    pub name: String,
    pub base_url: String,
    pub secret_ref: String,
    pub secret_hash: String,
    pub masked_label: String,
    pub credential_material: Option<String>,
    pub priority: i64,
    pub weight: i64,
    pub status: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminChannelItem {
    pub id: i64,
    pub channel_id: i64,
    pub uuid: String,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub name: String,
    pub vendor: String,
    pub provider_code: String,
    pub channel_type: String,
    pub protocol: String,
    pub access_type: String,
    pub credential_rotation: String,
    pub credentials: Vec<AdminChannelCredentialItem>,
    pub capabilities: Vec<String>,
    pub resource_codes: Vec<String>,
    pub is_multimodal: bool,
    pub timeout_ms: Option<i64>,
    pub retry_policy_json: Option<String>,
    pub circuit_breaker_policy_json: Option<String>,
    pub weight: i64,
    pub status: String,
    pub created_at: String,
    pub expires_at: Option<String>,
    pub balance: String,
    pub errors: i64,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminChannelsQuery {
    pub subject: AdminChannelSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub q: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminChannelListPage {
    pub items: Vec<AdminChannelItem>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAdminChannelCommand {
    pub subject: AdminChannelSubject,
    pub channel_uuid: String,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub name: String,
    pub vendor: String,
    pub provider_code: String,
    pub channel_type: String,
    pub protocol: String,
    pub access_type: String,
    pub credential_rotation: String,
    pub credentials: Vec<AdminChannelCredentialInput>,
    pub capabilities: Vec<String>,
    pub resource_codes: Vec<String>,
    pub is_multimodal: bool,
    pub timeout_ms: Option<i64>,
    pub retry_policy_json: Option<String>,
    pub circuit_breaker_policy_json: Option<String>,
    pub expires_at: Option<String>,
    pub weight: i64,
    pub status: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminChannelCommand {
    pub subject: AdminChannelSubject,
    pub channel_id: i64,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub name: Option<String>,
    pub vendor: Option<String>,
    pub provider_code: Option<String>,
    pub channel_type: Option<String>,
    pub protocol: Option<String>,
    pub access_type: Option<String>,
    pub credential_rotation: Option<String>,
    pub credentials: Option<Vec<AdminChannelCredentialInput>>,
    pub capabilities: Option<Vec<String>>,
    pub resource_codes: Option<Vec<String>>,
    pub timeout_ms: Option<Option<i64>>,
    pub retry_policy_json: Option<Option<String>>,
    pub circuit_breaker_policy_json: Option<Option<String>>,
    pub expires_at: Option<Option<String>>,
    pub weight: Option<i64>,
    pub status: Option<String>,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteAdminChannelCommand {
    pub subject: AdminChannelSubject,
    pub channel_id: i64,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TestAdminChannelCommand {
    pub subject: AdminChannelSubject,
    pub channel_id: i64,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminChannelTestOutcome {
    pub channel_id: String,
    pub success: bool,
    pub status: String,
    pub latency: String,
    pub item: AdminChannelItem,
}

pub trait AdminChannelStore {
    fn list_channels<'a>(
        &'a self,
        query: ListAdminChannelsQuery,
    ) -> AdminChannelCommandFuture<'a, AdminChannelListPage>;

    fn create_channel<'a>(
        &'a self,
        command: CreateAdminChannelCommand,
    ) -> AdminChannelCommandFuture<'a, AdminChannelItem>;

    fn update_channel<'a>(
        &'a self,
        command: UpdateAdminChannelCommand,
    ) -> AdminChannelCommandFuture<'a, Option<AdminChannelItem>>;

    fn delete_channel<'a>(
        &'a self,
        command: DeleteAdminChannelCommand,
    ) -> AdminChannelCommandFuture<'a, bool>;

    fn test_channel<'a>(
        &'a self,
        command: TestAdminChannelCommand,
    ) -> AdminChannelCommandFuture<'a, Option<AdminChannelTestOutcome>>;
}
