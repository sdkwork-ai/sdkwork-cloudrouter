use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

pub type AdminUpstreamFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminUpstreamSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminUpstreamListQuery {
    pub subject: AdminUpstreamSubject,
    pub q: Option<String>,
    pub page: i64,
    pub page_size: i64,
    pub offset: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminUpstreamPage<T> {
    pub items: Vec<T>,
    pub page: i64,
    pub page_size: i64,
    pub total: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminUpstreamSupplierItem {
    pub id: i64,
    pub uuid: String,
    pub supplier_code: String,
    pub supplier_name: String,
    pub display_name: String,
    pub description: Option<String>,
    pub supplier_type: String,
    pub adapter_code: String,
    pub protocol_code: String,
    pub website_url: Option<String>,
    pub docs_url: Option<String>,
    pub region_code: Option<String>,
    pub environment: i32,
    pub health_status: i32,
    pub sort_order: i32,
    pub status: i32,
    pub version: i64,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SaveAdminUpstreamSupplierCommand {
    pub subject: AdminUpstreamSubject,
    pub supplier_id: Option<i64>,
    pub expected_version: Option<i64>,
    pub uuid: String,
    pub supplier_code: String,
    pub supplier_name: String,
    pub display_name: String,
    pub description: Option<String>,
    pub supplier_type: String,
    pub adapter_code: String,
    pub protocol_code: String,
    pub website_url: Option<String>,
    pub docs_url: Option<String>,
    pub region_code: Option<String>,
    pub environment: i32,
    pub sort_order: i32,
    pub status: i32,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminUpstreamSupplierEndpointItem {
    pub id: i64,
    pub endpoint_code: String,
    pub endpoint_name: String,
    pub base_url: String,
    pub protocol_code: Option<String>,
    pub region_code: Option<String>,
    pub environment: i32,
    pub priority: i32,
    pub routing_weight: i32,
    pub timeout_ms: Option<i32>,
    pub health_status: i32,
    pub status: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminUpstreamSupplierEndpointInput {
    pub endpoint_code: String,
    pub endpoint_name: String,
    pub base_url: String,
    pub protocol_code: Option<String>,
    pub region_code: Option<String>,
    pub environment: i32,
    pub priority: i32,
    pub routing_weight: i32,
    pub timeout_ms: Option<i32>,
    pub status: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminUpstreamSupplierAuthMethodItem {
    pub id: i64,
    pub auth_method_code: String,
    pub auth_method_name: String,
    pub auth_type: String,
    pub config_schema: serde_json::Value,
    pub authorization_url: Option<String>,
    pub token_url: Option<String>,
    pub scopes: Option<serde_json::Value>,
    pub priority: i32,
    pub status: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminUpstreamSupplierAuthMethodInput {
    pub auth_method_code: String,
    pub auth_method_name: String,
    pub auth_type: String,
    pub config_schema: serde_json::Value,
    pub authorization_url: Option<String>,
    pub token_url: Option<String>,
    pub scopes: Option<serde_json::Value>,
    pub priority: i32,
    pub status: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminUpstreamResourceItem {
    pub id: i64,
    pub resource_code: String,
    pub resource_group_code: String,
    pub grant_type: String,
    pub priority: i32,
    pub status: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminUpstreamResourceInput {
    pub resource_code: String,
    pub resource_group_code: String,
    pub grant_type: String,
    pub priority: i32,
    pub status: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminUpstreamAccountItem {
    pub id: i64,
    pub uuid: String,
    pub supplier_id: i64,
    pub supplier_code: String,
    pub preferred_endpoint_id: Option<i64>,
    pub account_code: String,
    pub account_name: String,
    pub account_type: String,
    pub auth_method_code: String,
    pub external_account_id: Option<String>,
    pub environment: Option<i32>,
    pub region_code: Option<String>,
    pub quota_limit: Option<String>,
    pub quota_used: Option<String>,
    pub upstream_balance_amount: Option<String>,
    pub upstream_balance_currency: Option<String>,
    pub contract_cost_multiplier: String,
    pub rpm_limit: Option<i64>,
    pub timeout_ms: Option<i32>,
    pub health_status: i32,
    pub status: i32,
    pub version: i64,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SaveAdminUpstreamAccountCommand {
    pub subject: AdminUpstreamSubject,
    pub account_id: Option<i64>,
    pub expected_version: Option<i64>,
    pub uuid: String,
    pub supplier_id: i64,
    pub preferred_endpoint_id: Option<i64>,
    pub account_code: String,
    pub account_name: String,
    pub account_type: String,
    pub auth_method_code: String,
    pub external_account_id: Option<String>,
    pub environment: Option<i32>,
    pub region_code: Option<String>,
    pub quota_limit: Option<String>,
    pub upstream_balance_currency: Option<String>,
    pub contract_cost_multiplier: String,
    pub rpm_limit: Option<i64>,
    pub timeout_ms: Option<i32>,
    pub status: i32,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminUpstreamAccountCredentialItem {
    pub id: i64,
    pub auth_method_code: String,
    pub credential_name: String,
    pub masked_label: Option<String>,
    pub credential_version: i64,
    pub priority: i32,
    pub is_active: bool,
    pub expires_at: Option<String>,
    pub last_rotated_at: Option<String>,
    pub last_verified_at: Option<String>,
    pub last_used_at: Option<String>,
    pub status: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAdminUpstreamAccountCredentialCommand {
    pub subject: AdminUpstreamSubject,
    pub account_id: i64,
    pub uuid: String,
    pub credential_name: String,
    pub secret: String,
    pub priority: i32,
    pub expires_at: Option<String>,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminUpstreamAccountGroupItem {
    pub id: i64,
    pub uuid: String,
    pub group_code: String,
    pub group_name: String,
    pub description: Option<String>,
    pub group_type: String,
    pub routing_strategy: String,
    pub fallback_mode: String,
    pub priority: i32,
    pub cost_multiplier: String,
    pub sale_multiplier: String,
    pub environment: Option<i32>,
    pub status: i32,
    pub version: i64,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SaveAdminUpstreamAccountGroupCommand {
    pub subject: AdminUpstreamSubject,
    pub account_group_id: Option<i64>,
    pub expected_version: Option<i64>,
    pub uuid: String,
    pub group_code: String,
    pub group_name: String,
    pub description: Option<String>,
    pub group_type: String,
    pub routing_strategy: String,
    pub fallback_mode: String,
    pub priority: i32,
    pub cost_multiplier: String,
    pub sale_multiplier: String,
    pub environment: Option<i32>,
    pub status: i32,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminUpstreamAccountGroupMemberItem {
    pub id: i64,
    pub account_id: i64,
    pub account_code: String,
    pub account_name: String,
    pub priority: i32,
    pub routing_weight: i32,
    pub cost_multiplier_override: Option<String>,
    pub enabled: bool,
    pub status: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminUpstreamAccountGroupMemberInput {
    pub account_id: i64,
    pub priority: i32,
    pub routing_weight: i32,
    pub cost_multiplier_override: Option<String>,
    pub enabled: bool,
    pub status: i32,
}

pub trait AdminUpstreamStore: Send + Sync {
    fn list_suppliers<'a>(
        &'a self,
        query: AdminUpstreamListQuery,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamPage<AdminUpstreamSupplierItem>>;
    fn get_supplier<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        supplier_id: i64,
    ) -> AdminUpstreamFuture<'a, Option<AdminUpstreamSupplierItem>>;
    fn save_supplier<'a>(
        &'a self,
        command: SaveAdminUpstreamSupplierCommand,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamSupplierItem>;
    fn delete_supplier<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        supplier_id: i64,
        expected_version: i64,
        requested_at: String,
    ) -> AdminUpstreamFuture<'a, bool>;
    fn list_supplier_endpoints<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        supplier_id: i64,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamSupplierEndpointItem>>;
    fn replace_supplier_endpoints<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        supplier_id: i64,
        expected_version: i64,
        items: Vec<AdminUpstreamSupplierEndpointInput>,
        requested_at: String,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamSupplierEndpointItem>>;
    fn list_supplier_auth_methods<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        supplier_id: i64,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamSupplierAuthMethodItem>>;
    fn replace_supplier_auth_methods<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        supplier_id: i64,
        expected_version: i64,
        items: Vec<AdminUpstreamSupplierAuthMethodInput>,
        requested_at: String,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamSupplierAuthMethodItem>>;
    fn list_supplier_resources<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        supplier_id: i64,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamResourceItem>>;
    fn replace_supplier_resources<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        supplier_id: i64,
        expected_version: i64,
        items: Vec<AdminUpstreamResourceInput>,
        requested_at: String,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamResourceItem>>;
    fn list_accounts<'a>(
        &'a self,
        query: AdminUpstreamListQuery,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamPage<AdminUpstreamAccountItem>>;
    fn get_account<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_id: i64,
    ) -> AdminUpstreamFuture<'a, Option<AdminUpstreamAccountItem>>;
    fn save_account<'a>(
        &'a self,
        command: SaveAdminUpstreamAccountCommand,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamAccountItem>;
    fn delete_account<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_id: i64,
        expected_version: i64,
        requested_at: String,
    ) -> AdminUpstreamFuture<'a, bool>;
    fn list_account_credentials<'a>(
        &'a self,
        query: AdminUpstreamListQuery,
        account_id: i64,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamPage<AdminUpstreamAccountCredentialItem>>;
    fn create_account_credential<'a>(
        &'a self,
        command: CreateAdminUpstreamAccountCredentialCommand,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamAccountCredentialItem>;
    fn deactivate_account_credential<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_id: i64,
        credential_id: i64,
        requested_at: String,
    ) -> AdminUpstreamFuture<'a, bool>;
    fn list_account_groups<'a>(
        &'a self,
        query: AdminUpstreamListQuery,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamPage<AdminUpstreamAccountGroupItem>>;
    fn get_account_group<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_group_id: i64,
    ) -> AdminUpstreamFuture<'a, Option<AdminUpstreamAccountGroupItem>>;
    fn save_account_group<'a>(
        &'a self,
        command: SaveAdminUpstreamAccountGroupCommand,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamAccountGroupItem>;
    fn delete_account_group<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_group_id: i64,
        expected_version: i64,
        requested_at: String,
    ) -> AdminUpstreamFuture<'a, bool>;
    fn list_account_group_members<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_group_id: i64,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamAccountGroupMemberItem>>;
    fn replace_account_group_members<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_group_id: i64,
        expected_version: i64,
        items: Vec<AdminUpstreamAccountGroupMemberInput>,
        requested_at: String,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamAccountGroupMemberItem>>;
    fn list_account_group_resources<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_group_id: i64,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamResourceItem>>;
    fn replace_account_group_resources<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_group_id: i64,
        expected_version: i64,
        items: Vec<AdminUpstreamResourceInput>,
        requested_at: String,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamResourceItem>>;
}
