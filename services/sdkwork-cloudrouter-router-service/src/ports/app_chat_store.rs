use std::future::Future;
use std::pin::Pin;

use serde::Serialize;
use serde_json::Value;

use crate::domain::DomainResult;

pub type AppChatFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AppChatSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppChatConversationList {
    pub items: Vec<AppChatConversationItem>,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub total: i64,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub page_no: i64,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppChatConversationItem {
    pub id: String,
    pub title: String,
    pub status: String,
    pub source_surface: String,
    pub default_model: Option<String>,
    pub default_provider: Option<String>,
    pub agent_id: Option<String>,
    pub agent_session_id: Option<String>,
    pub memory_space_id: Option<String>,
    pub last_message_preview: Option<String>,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub message_count: i64,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub turn_count: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppChatTurnItem {
    pub id: String,
    pub conversation_id: String,
    pub status: String,
    pub model: Option<String>,
    pub provider: Option<String>,
    pub agent_id: Option<String>,
    pub agent_session_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppChatUsageSnapshot {
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub input_tokens: i64,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub output_tokens: i64,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub cached_tokens: i64,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub reasoning_tokens: i64,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub total_tokens: i64,
    pub cost_amount: Option<String>,
    pub currency: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AppChatMessageList {
    pub items: Vec<AppChatMessageItem>,
    pub next_cursor: Option<AppChatMessageCursor>,
    pub has_more: bool,
    pub page_size: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AppChatMessageCursor {
    pub message_no: i64,
    pub id: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppChatMessageItem {
    pub id: String,
    pub conversation_id: String,
    pub turn_id: Option<String>,
    pub role: String,
    pub direction: String,
    #[serde(rename = "content")]
    pub content: String,
    pub status: String,
    pub model: Option<String>,
    pub provider: Option<String>,
    pub runtime: Option<String>,
    pub runtime_invocation_id: Option<String>,
    pub usage_link_id: Option<String>,
    pub usage: Option<AppChatUsageSnapshot>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppChatTurnOutcome {
    pub turn: AppChatTurnItem,
    pub messages: Vec<AppChatMessageItem>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CreateAppChatConversationCommand {
    pub subject: AppChatSubject,
    pub conversation_uuid: String,
    pub title: Option<String>,
    pub source_surface: String,
    pub default_model: Option<String>,
    pub default_provider: Option<String>,
    pub agent_id: Option<String>,
    pub agent_session_id: Option<String>,
    pub memory_space_id: Option<String>,
    pub metadata: Value,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CreateAppChatTurnCommand {
    pub subject: AppChatSubject,
    pub conversation_id: String,
    pub turn_uuid: String,
    pub input_item_uuid: String,
    pub input_message_uuid: String,
    pub output_item_uuid: String,
    pub output_message_uuid: String,
    pub message: String,
    pub mode: Option<String>,
    pub agent_id: Option<String>,
    pub agent_session_id: Option<String>,
    pub model: Option<String>,
    pub provider: Option<String>,
    pub metadata: Value,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CompleteAppChatTurnCommand {
    pub subject: AppChatSubject,
    pub conversation_id: String,
    pub turn_id: String,
    pub output_message_uuid: String,
    pub output_part_uuid: String,
    pub usage_link_uuid: String,
    pub message: String,
    pub status: String,
    pub model: Option<String>,
    pub provider: Option<String>,
    pub runtime: Option<String>,
    pub runtime_invocation_id: Option<String>,
    pub usage_fact_id: Option<i64>,
    pub usage: Option<AppChatUsageSnapshot>,
    pub metadata: Value,
    pub requested_at: String,
}

pub trait AppChatStore {
    fn list_conversations<'a>(
        &'a self,
        subject: AppChatSubject,
        page: i64,
        page_size: i64,
    ) -> AppChatFuture<'a, AppChatConversationList>;

    fn get_conversation<'a>(
        &'a self,
        subject: AppChatSubject,
        conversation_id: String,
    ) -> AppChatFuture<'a, Option<AppChatConversationItem>>;

    fn create_conversation<'a>(
        &'a self,
        command: CreateAppChatConversationCommand,
    ) -> AppChatFuture<'a, AppChatConversationItem>;

    fn list_messages<'a>(
        &'a self,
        subject: AppChatSubject,
        conversation_id: String,
        cursor: Option<AppChatMessageCursor>,
        page_size: i64,
    ) -> AppChatFuture<'a, AppChatMessageList>;

    fn create_turn<'a>(
        &'a self,
        command: CreateAppChatTurnCommand,
    ) -> AppChatFuture<'a, AppChatTurnOutcome>;

    fn complete_turn_response<'a>(
        &'a self,
        command: CompleteAppChatTurnCommand,
    ) -> AppChatFuture<'a, AppChatTurnOutcome>;
}
