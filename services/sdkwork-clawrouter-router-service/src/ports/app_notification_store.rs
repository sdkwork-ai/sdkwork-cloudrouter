use std::future::Future;
use std::pin::Pin;

use serde::Serialize;

use crate::domain::DomainResult;

pub type AppNotificationFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AppNotificationSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AppNotificationQuery {
    pub subject: AppNotificationSubject,
    pub app_id: String,
    pub include_archived: bool,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppNotificationItems {
    pub items: Vec<AppNotificationItem>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

impl AppNotificationItems {
    pub fn new(items: Vec<AppNotificationItem>, total: i64, page_no: i64, page_size: i64) -> Self {
        Self {
            items,
            total,
            page_no,
            page_size,
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppNotificationItem {
    pub id: String,
    pub app_id: String,
    pub title: String,
    pub desc: String,
    pub content: String,
    pub time: String,
    #[serde(rename = "type")]
    pub message_type: String,
    pub read: bool,
    pub show_as_popup: bool,
    pub popup_seen: bool,
    pub archived: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub action_url: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MarkAppNotificationPopupSeenCommand {
    pub subject: AppNotificationSubject,
    pub app_id: String,
    pub notification_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AcknowledgeAppNotificationCommand {
    pub subject: AppNotificationSubject,
    pub app_id: String,
    pub notification_id: String,
}

pub trait AppNotificationStore {
    fn list_notifications<'a>(
        &'a self,
        query: AppNotificationQuery,
    ) -> AppNotificationFuture<'a, AppNotificationItems>;

    fn mark_popup_seen<'a>(
        &'a self,
        command: MarkAppNotificationPopupSeenCommand,
    ) -> AppNotificationFuture<'a, ()>;

    fn acknowledge<'a>(
        &'a self,
        command: AcknowledgeAppNotificationCommand,
    ) -> AppNotificationFuture<'a, ()>;
}
