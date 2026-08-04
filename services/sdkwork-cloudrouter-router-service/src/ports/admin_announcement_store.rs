use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

pub type AdminAnnouncementCommandFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminAnnouncementSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminAnnouncementItem {
    pub id: i64,
    pub uuid: String,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub title: String,
    pub content: String,
    pub target: String,
    pub status: String,
    pub show_as_popup: bool,
    pub date: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminAnnouncementsQuery {
    pub subject: AdminAnnouncementSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub q: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminAnnouncementListPage {
    pub items: Vec<AdminAnnouncementItem>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAdminAnnouncementCommand {
    pub subject: AdminAnnouncementSubject,
    pub announcement_uuid: String,
    pub audit_log_uuid: String,
    pub title: String,
    pub content: String,
    pub target: String,
    pub status: String,
    pub show_as_popup: bool,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminAnnouncementCommand {
    pub subject: AdminAnnouncementSubject,
    pub announcement_id: i64,
    pub audit_log_uuid: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub target: Option<String>,
    pub status: Option<String>,
    pub show_as_popup: Option<bool>,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteAdminAnnouncementCommand {
    pub subject: AdminAnnouncementSubject,
    pub announcement_id: i64,
    pub audit_log_uuid: String,
    pub request_id: String,
    pub requested_at: String,
}

pub trait AdminAnnouncementStore {
    fn list_announcements<'a>(
        &'a self,
        query: ListAdminAnnouncementsQuery,
    ) -> AdminAnnouncementCommandFuture<'a, AdminAnnouncementListPage>;

    fn create_announcement<'a>(
        &'a self,
        command: CreateAdminAnnouncementCommand,
    ) -> AdminAnnouncementCommandFuture<'a, AdminAnnouncementItem>;

    fn update_announcement<'a>(
        &'a self,
        command: UpdateAdminAnnouncementCommand,
    ) -> AdminAnnouncementCommandFuture<'a, Option<AdminAnnouncementItem>>;

    fn delete_announcement<'a>(
        &'a self,
        command: DeleteAdminAnnouncementCommand,
    ) -> AdminAnnouncementCommandFuture<'a, bool>;
}
