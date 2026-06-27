use std::future::Future;
use std::pin::Pin;

use serde::Serialize;
use serde_json::Value;

use crate::domain::DomainResult;

pub type AdminMcpCommandFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminMcpSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminMcpServerItem {
    pub id: i64,
    pub uuid: String,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub server_key: String,
    pub name: String,
    pub description: Option<String>,
    pub category_id: Option<String>,
    pub category_code: Option<String>,
    pub transport: String,
    pub visibility: String,
    pub owner_user_id: Option<i64>,
    pub latest_revision_id: Option<i64>,
    pub published_revision_id: Option<i64>,
    pub health_status: String,
    pub last_checked_at: Option<String>,
    pub last_error_masked: Option<String>,
    pub status: String,
    pub tags: Vec<String>,
    pub published_at: Option<String>,
    pub deprecated_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminMcpServerRevisionItem {
    pub id: i64,
    pub uuid: String,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub server_id: i64,
    pub revision_no: String,
    pub transport: String,
    pub endpoint_url: Option<String>,
    pub command: Option<String>,
    pub args_json: Value,
    pub env_schema: Value,
    pub auth_type: String,
    pub secret_ref: Option<String>,
    pub timeout_ms: i32,
    pub retry_policy: Value,
    pub config_hash: String,
    pub lifecycle_status: String,
    pub status: String,
    pub created_by: i64,
    pub published_at: Option<String>,
    pub deprecated_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminMcpToolItem {
    pub id: i64,
    pub uuid: String,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub server_id: i64,
    pub server_revision_id: Option<i64>,
    pub tool_key: String,
    pub name: String,
    pub description: Option<String>,
    pub input_schema: Value,
    pub output_schema: Value,
    pub risk_level: String,
    pub requires_approval: bool,
    pub enabled: bool,
    pub status: String,
    pub rate_limit_policy: Value,
    pub schema_hash: String,
    pub discovered_at: Option<String>,
    pub last_invoked_at: Option<String>,
    pub sort_weight: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminMcpBindingItem {
    pub id: i64,
    pub uuid: String,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub server_id: i64,
    pub server_revision_id: Option<i64>,
    pub tool_id: Option<i64>,
    pub owner_type: String,
    pub owner_id: i64,
    pub allowed_tools: Value,
    pub denied_tools: Value,
    pub policy_json: Value,
    pub priority: i32,
    pub enabled: bool,
    pub status: String,
    pub snapshot_json: Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminMcpDiscoveryResult {
    pub server_id: i64,
    pub discovered_count: i64,
    pub tools: Vec<AdminMcpToolItem>,
    pub checked_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminMcpHealthCheckItem {
    pub server_id: i64,
    pub healthy: bool,
    pub health_status: String,
    pub checked_at: String,
    pub latency_ms: Option<i64>,
    pub error_masked: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminMcpServersQuery {
    pub subject: AdminMcpSubject,
    pub keyword: Option<String>,
    pub transport: Option<String>,
    pub visibility: Option<String>,
    pub status: Option<String>,
    pub category_id: Option<String>,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GetAdminMcpServerQuery {
    pub subject: AdminMcpSubject,
    pub server_id: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAdminMcpServerCommand {
    pub subject: AdminMcpSubject,
    pub server_key: String,
    pub name: String,
    pub description: Option<String>,
    pub category_id: Option<String>,
    pub transport: String,
    pub visibility: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminMcpServerCommand {
    pub subject: AdminMcpSubject,
    pub server_id: i64,
    pub server_key: Option<String>,
    pub name: Option<String>,
    pub description: Option<Option<String>>,
    pub category_id: Option<Option<String>>,
    pub transport: Option<String>,
    pub visibility: Option<String>,
    pub status: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ListAdminMcpServerRevisionsQuery {
    pub subject: AdminMcpSubject,
    pub server_id: i64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CreateAdminMcpServerRevisionCommand {
    pub subject: AdminMcpSubject,
    pub server_id: i64,
    pub revision_no: String,
    pub transport: String,
    pub endpoint_url: Option<String>,
    pub command: Option<String>,
    pub args_json: Value,
    pub env_schema: Value,
    pub auth_type: String,
    pub secret_ref: Option<String>,
    pub timeout_ms: i32,
    pub retry_policy: Value,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PublishAdminMcpServerRevisionCommand {
    pub subject: AdminMcpSubject,
    pub revision_id: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DiscoverAdminMcpToolsCommand {
    pub subject: AdminMcpSubject,
    pub server_id: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TestAdminMcpServerHealthCommand {
    pub subject: AdminMcpSubject,
    pub server_id: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ListAdminMcpToolsQuery {
    pub subject: AdminMcpSubject,
    pub server_id: i64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct UpdateAdminMcpToolCommand {
    pub subject: AdminMcpSubject,
    pub tool_id: i64,
    pub name: Option<String>,
    pub description: Option<Option<String>>,
    pub input_schema: Option<Value>,
    pub output_schema: Option<Value>,
    pub risk_level: Option<String>,
    pub requires_approval: Option<bool>,
    pub enabled: Option<bool>,
    pub status: Option<String>,
    pub rate_limit_policy: Option<Value>,
    pub sort_weight: Option<i32>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ListAdminMcpBindingsQuery {
    pub subject: AdminMcpSubject,
    pub server_id: i64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CreateAdminMcpBindingCommand {
    pub subject: AdminMcpSubject,
    pub server_id: i64,
    pub server_revision_id: Option<i64>,
    pub tool_id: Option<i64>,
    pub owner_type: String,
    pub owner_id: i64,
    pub allowed_tools: Value,
    pub denied_tools: Value,
    pub policy_json: Value,
    pub priority: i32,
    pub enabled: bool,
    pub status: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct UpdateAdminMcpBindingCommand {
    pub subject: AdminMcpSubject,
    pub binding_id: i64,
    pub server_revision_id: Option<Option<i64>>,
    pub tool_id: Option<Option<i64>>,
    pub owner_type: Option<String>,
    pub owner_id: Option<i64>,
    pub allowed_tools: Option<Value>,
    pub denied_tools: Option<Value>,
    pub policy_json: Option<Value>,
    pub priority: Option<i32>,
    pub enabled: Option<bool>,
    pub status: Option<String>,
}

pub trait AdminMcpStore {
    fn list_servers<'a>(
        &'a self,
        query: ListAdminMcpServersQuery,
    ) -> AdminMcpCommandFuture<'a, Vec<AdminMcpServerItem>>;

    fn get_server<'a>(
        &'a self,
        query: GetAdminMcpServerQuery,
    ) -> AdminMcpCommandFuture<'a, Option<AdminMcpServerItem>>;

    fn create_server<'a>(
        &'a self,
        command: CreateAdminMcpServerCommand,
    ) -> AdminMcpCommandFuture<'a, AdminMcpServerItem>;

    fn update_server<'a>(
        &'a self,
        command: UpdateAdminMcpServerCommand,
    ) -> AdminMcpCommandFuture<'a, Option<AdminMcpServerItem>>;

    fn list_revisions<'a>(
        &'a self,
        query: ListAdminMcpServerRevisionsQuery,
    ) -> AdminMcpCommandFuture<'a, Vec<AdminMcpServerRevisionItem>>;

    fn create_revision<'a>(
        &'a self,
        command: CreateAdminMcpServerRevisionCommand,
    ) -> AdminMcpCommandFuture<'a, AdminMcpServerRevisionItem>;

    fn publish_revision<'a>(
        &'a self,
        command: PublishAdminMcpServerRevisionCommand,
    ) -> AdminMcpCommandFuture<'a, Option<AdminMcpServerRevisionItem>>;

    fn discover_tools<'a>(
        &'a self,
        command: DiscoverAdminMcpToolsCommand,
    ) -> AdminMcpCommandFuture<'a, AdminMcpDiscoveryResult>;

    fn check_health<'a>(
        &'a self,
        command: TestAdminMcpServerHealthCommand,
    ) -> AdminMcpCommandFuture<'a, AdminMcpHealthCheckItem>;

    fn list_tools<'a>(
        &'a self,
        query: ListAdminMcpToolsQuery,
    ) -> AdminMcpCommandFuture<'a, Vec<AdminMcpToolItem>>;

    fn update_tool<'a>(
        &'a self,
        command: UpdateAdminMcpToolCommand,
    ) -> AdminMcpCommandFuture<'a, Option<AdminMcpToolItem>>;

    fn list_bindings<'a>(
        &'a self,
        query: ListAdminMcpBindingsQuery,
    ) -> AdminMcpCommandFuture<'a, Vec<AdminMcpBindingItem>>;

    fn create_binding<'a>(
        &'a self,
        command: CreateAdminMcpBindingCommand,
    ) -> AdminMcpCommandFuture<'a, AdminMcpBindingItem>;

    fn update_binding<'a>(
        &'a self,
        command: UpdateAdminMcpBindingCommand,
    ) -> AdminMcpCommandFuture<'a, Option<AdminMcpBindingItem>>;
}
