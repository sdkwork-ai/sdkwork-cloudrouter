use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

pub type AdminChannelGroupCommandFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminChannelGroupSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AdminChannelGroupItem {
    pub id: i64,
    pub uuid: String,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub group_code: String,
    pub group_name: String,
    pub provider_code: String,
    pub price_reference_mode: String,
    pub rate_multiplier: f64,
    pub official_price_multiplier: f64,
    pub group_type: String,
    pub resource_group_codes: Vec<String>,
    pub resource_codes: Vec<String>,
    pub account_available: i64,
    pub account_total: i64,
    pub capacity_used: f64,
    pub capacity_total: f64,
    pub usage_today: f64,
    pub usage_total: f64,
    pub status: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminChannelGroupChannelBindingItem {
    pub id: i64,
    pub uuid: String,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub group_id: i64,
    pub channel_id: i64,
    pub channel_name: String,
    pub provider_code: String,
    pub provider_name: String,
    pub channel_code: String,
    pub resource_codes: Vec<String>,
    pub api_scope: Vec<String>,
    pub capabilities: Vec<String>,
    pub priority: i64,
    pub weight: i64,
    pub status: String,
    pub health_status: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminChannelGroupChannelBindingInput {
    pub channel_id: i64,
    pub priority: i64,
    pub weight: i64,
    pub status: String,
    pub resource_codes: Vec<String>,
    pub api_scope: Vec<String>,
    pub capabilities: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminChannelGroupsQuery {
    pub subject: AdminChannelGroupSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub q: Option<String>,
    pub group_id: Option<i64>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AdminChannelGroupListPage {
    pub items: Vec<AdminChannelGroupItem>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ListAdminChannelGroupChannelBindingsQuery {
    pub subject: AdminChannelGroupSubject,
    pub group_id: i64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CreateAdminChannelGroupCommand {
    pub subject: AdminChannelGroupSubject,
    pub group_uuid: String,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub binding_uuid: String,
    pub group_code: String,
    pub group_name: String,
    pub provider_code: String,
    pub price_reference_mode: String,
    pub rate_multiplier: f64,
    pub official_price_multiplier: f64,
    pub group_type: String,
    pub resource_group_codes: Vec<String>,
    pub resource_codes: Vec<String>,
    pub capacity_total: f64,
    pub status: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct UpdateAdminChannelGroupCommand {
    pub subject: AdminChannelGroupSubject,
    pub group_id: i64,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub binding_uuid: String,
    pub group_code: Option<String>,
    pub group_name: Option<String>,
    pub provider_code: Option<String>,
    pub price_reference_mode: Option<String>,
    pub rate_multiplier: Option<f64>,
    pub official_price_multiplier: Option<f64>,
    pub group_type: Option<String>,
    pub resource_group_codes: Option<Vec<String>>,
    pub resource_codes: Option<Vec<String>>,
    pub capacity_total: Option<f64>,
    pub status: Option<String>,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteAdminChannelGroupCommand {
    pub subject: AdminChannelGroupSubject,
    pub group_id: i64,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ReplaceAdminChannelGroupChannelBindingsCommand {
    pub subject: AdminChannelGroupSubject,
    pub group_id: i64,
    pub binding_uuids: Vec<String>,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub items: Vec<AdminChannelGroupChannelBindingInput>,
    pub request_id: String,
    pub requested_at: String,
}

pub trait AdminChannelGroupStore {
    fn list_channel_groups<'a>(
        &'a self,
        query: ListAdminChannelGroupsQuery,
    ) -> AdminChannelGroupCommandFuture<'a, AdminChannelGroupListPage>;

    fn create_channel_group<'a>(
        &'a self,
        command: CreateAdminChannelGroupCommand,
    ) -> AdminChannelGroupCommandFuture<'a, AdminChannelGroupItem>;

    fn update_channel_group<'a>(
        &'a self,
        command: UpdateAdminChannelGroupCommand,
    ) -> AdminChannelGroupCommandFuture<'a, Option<AdminChannelGroupItem>>;

    fn delete_channel_group<'a>(
        &'a self,
        command: DeleteAdminChannelGroupCommand,
    ) -> AdminChannelGroupCommandFuture<'a, bool>;

    fn list_channel_bindings<'a>(
        &'a self,
        query: ListAdminChannelGroupChannelBindingsQuery,
    ) -> AdminChannelGroupCommandFuture<'a, Vec<AdminChannelGroupChannelBindingItem>>;

    fn replace_channel_bindings<'a>(
        &'a self,
        command: ReplaceAdminChannelGroupChannelBindingsCommand,
    ) -> AdminChannelGroupCommandFuture<'a, Vec<AdminChannelGroupChannelBindingItem>>;
}
