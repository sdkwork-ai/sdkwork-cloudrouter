use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;
use serde_json::Value;

pub type AdminSiteFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminSiteSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AdminSiteItem {
    pub id: i64,
    pub supplier_code: String,
    pub site_name: String,
    pub display_name: String,
    pub description: Option<String>,
    pub base_url: String,
    pub website_url: Option<String>,
    pub docs_url: Option<String>,
    pub logo: Option<Value>,
    pub domains: Vec<String>,
    pub vendor_codes: Vec<String>,
    pub site_type: String,
    pub owner_kind: Option<String>,
    pub region_code: Option<String>,
    pub environment: String,
    pub health_status: String,
    pub last_latency_ms: Option<i64>,
    pub consecutive_error_count: i64,
    pub last_checked_at: Option<String>,
    pub last_sync_at: Option<String>,
    pub sort_order: i64,
    pub status: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminSiteChannelItem {
    pub id: i64,
    pub account_code: String,
    pub channel_name: String,
    pub supplier_code: Option<String>,
    pub endpoint_code: Option<String>,
    pub site_channel_role: Option<String>,
    pub health_status: String,
    pub status: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminSiteConnectionCheckItem {
    pub supplier_id: i64,
    pub status: String,
    pub health_status: String,
    pub latency_ms: Option<i64>,
    pub checked_at: String,
    pub message: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminSitesQuery {
    pub subject: AdminSiteSubject,
    pub search: Option<String>,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AdminSiteListPage {
    pub items: Vec<AdminSiteItem>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CreateAdminSiteCommand {
    pub subject: AdminSiteSubject,
    pub site_uuid: String,
    pub service_uuid: String,
    pub audit_log_uuid: String,
    pub supplier_code: String,
    pub site_name: String,
    pub display_name: String,
    pub description: Option<String>,
    pub base_url: String,
    pub website_url: Option<String>,
    pub docs_url: Option<String>,
    pub logo: Option<Value>,
    pub domains: Vec<String>,
    pub vendor_codes: Vec<String>,
    pub site_type: String,
    pub owner_kind: Option<String>,
    pub region_code: Option<String>,
    pub environment: String,
    pub status: String,
    pub credential_ref: Option<String>,
    pub masked_label: Option<String>,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct UpdateAdminSiteCommand {
    pub subject: AdminSiteSubject,
    pub supplier_id: i64,
    pub audit_log_uuid: String,
    pub supplier_code: Option<String>,
    pub site_name: Option<String>,
    pub display_name: Option<String>,
    pub description: Option<Option<String>>,
    pub base_url: Option<String>,
    pub website_url: Option<Option<String>>,
    pub docs_url: Option<Option<String>>,
    pub logo: Option<Option<Value>>,
    pub domains: Option<Vec<String>>,
    pub vendor_codes: Option<Vec<String>>,
    pub site_type: Option<String>,
    pub owner_kind: Option<Option<String>>,
    pub region_code: Option<Option<String>>,
    pub environment: Option<String>,
    pub status: Option<String>,
    pub credential_ref: Option<Option<String>>,
    pub masked_label: Option<Option<String>>,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteAdminSiteCommand {
    pub subject: AdminSiteSubject,
    pub supplier_id: i64,
    pub audit_log_uuid: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminSiteChannelsQuery {
    pub subject: AdminSiteSubject,
    pub supplier_id: i64,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AdminSiteChannelListPage {
    pub items: Vec<AdminSiteChannelItem>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TestAdminSiteConnectionCommand {
    pub subject: AdminSiteSubject,
    pub supplier_id: i64,
    pub audit_log_uuid: String,
    pub request_id: String,
    pub requested_at: String,
    pub persist_health: bool,
}

pub trait AdminSiteStore {
    fn list_sites<'a>(
        &'a self,
        query: ListAdminSitesQuery,
    ) -> AdminSiteFuture<'a, AdminSiteListPage>;

    fn create_site<'a>(
        &'a self,
        command: CreateAdminSiteCommand,
    ) -> AdminSiteFuture<'a, AdminSiteItem>;

    fn update_site<'a>(
        &'a self,
        command: UpdateAdminSiteCommand,
    ) -> AdminSiteFuture<'a, Option<AdminSiteItem>>;

    fn delete_site<'a>(&'a self, command: DeleteAdminSiteCommand) -> AdminSiteFuture<'a, bool>;

    fn list_site_channels<'a>(
        &'a self,
        query: ListAdminSiteChannelsQuery,
    ) -> AdminSiteFuture<'a, AdminSiteChannelListPage>;

    fn test_site_connection<'a>(
        &'a self,
        command: TestAdminSiteConnectionCommand,
    ) -> AdminSiteFuture<'a, AdminSiteConnectionCheckItem>;
}
