use std::future::Future;
use std::pin::Pin;

use serde::Serialize;

use crate::domain::DomainResult;

pub type AdminServiceNodeCommandFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminServiceNodeSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminServiceNodesQuery {
    pub subject: AdminServiceNodeSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminServiceNodeListPage {
    pub items: Vec<AdminServiceNodeItem>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AdminServiceNodeItem {
    pub id: String,
    pub name: String,
    pub deployment_profile: String,
    pub base_url: String,
    pub domains: Vec<String>,
    pub domain: String,
    pub ip: String,
    pub remark: String,
    pub status: String,
    pub health_status: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAdminServiceNodeCommand {
    pub subject: AdminServiceNodeSubject,
    pub name: String,
    pub deployment_profile: String,
    pub base_url: String,
    pub domains: Vec<String>,
    pub ip: Option<String>,
    pub remark: String,
    pub status: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminServiceNodeCommand {
    pub subject: AdminServiceNodeSubject,
    pub node_id: String,
    pub name: Option<String>,
    pub deployment_profile: Option<String>,
    pub base_url: Option<String>,
    pub domains: Option<Vec<String>>,
    pub ip: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminServiceNodeStatusCommand {
    pub subject: AdminServiceNodeSubject,
    pub node_id: String,
    pub status: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteAdminServiceNodeCommand {
    pub subject: AdminServiceNodeSubject,
    pub node_id: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AdminServiceNodeDeleteOutcome {
    pub deleted: bool,
}

pub trait AdminServiceNodeStore {
    fn list_service_nodes<'a>(
        &'a self,
        query: ListAdminServiceNodesQuery,
    ) -> AdminServiceNodeCommandFuture<'a, AdminServiceNodeListPage>;

    fn create_service_node<'a>(
        &'a self,
        command: CreateAdminServiceNodeCommand,
    ) -> AdminServiceNodeCommandFuture<'a, AdminServiceNodeItem>;

    fn update_service_node<'a>(
        &'a self,
        command: UpdateAdminServiceNodeCommand,
    ) -> AdminServiceNodeCommandFuture<'a, AdminServiceNodeItem>;

    fn update_service_node_status<'a>(
        &'a self,
        command: UpdateAdminServiceNodeStatusCommand,
    ) -> AdminServiceNodeCommandFuture<'a, AdminServiceNodeItem>;

    fn delete_service_node<'a>(
        &'a self,
        command: DeleteAdminServiceNodeCommand,
    ) -> AdminServiceNodeCommandFuture<'a, AdminServiceNodeDeleteOutcome>;
}
