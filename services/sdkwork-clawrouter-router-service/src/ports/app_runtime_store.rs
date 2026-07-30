use std::future::Future;
use std::pin::Pin;

use serde::Serialize;
use serde_json::Value;

use crate::domain::DomainResult;

pub type AppRuntimeFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AppRuntimeSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AppRuntimeInvocationQuery {
    pub page: i64,
    pub page_size: i64,
    pub conversation_id: Option<String>,
    pub chat_turn_id: Option<String>,
    pub agent_session_id: Option<String>,
    pub runtime: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppRuntimeInvocationList {
    pub items: Vec<AppRuntimeInvocationItem>,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub total: i64,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub page_no: i64,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppRuntimeInvocationItem {
    pub id: String,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub invocation_no: i64,
    pub invocation_type: String,
    pub runtime: String,
    pub endpoint: Option<String>,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub attempt_no: i64,
    pub status: String,
    pub conversation_id: Option<String>,
    pub chat_turn_id: Option<String>,
    pub chat_item_id: Option<String>,
    pub agent_session_id: Option<String>,
    pub agent_run_id: Option<String>,
    pub agent_run_step_id: Option<String>,
    pub request_id: Option<String>,
    pub trace_id: Option<String>,
    pub provider_response_id: Option<String>,
    pub provider_session_id: Option<String>,
    pub provider_conversation_id: Option<String>,
    pub provider_step_id: Option<String>,
    pub model: Option<String>,
    pub provider: Option<String>,
    pub tool_name: Option<String>,
    pub tool_call_id: Option<String>,
    pub cwd: Option<String>,
    pub sandbox_policy: Option<String>,
    pub approval_policy: Option<String>,
    pub permission_mode: Option<String>,
    pub streaming: bool,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    #[serde(with = "sdkwork_utils_rust::serde_int64::option")]
    pub latency_ms: Option<i64>,
    #[serde(with = "sdkwork_utils_rust::serde_int64::option")]
    pub ttft_ms: Option<i64>,
    #[serde(with = "sdkwork_utils_rust::serde_int64::option")]
    pub exit_code: Option<i64>,
    pub finish_reason: Option<String>,
    pub error_type: Option<String>,
    pub error_code: Option<String>,
    pub error_message_masked: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AppRuntimeInvocationExecution {
    pub item: AppRuntimeInvocationItem,
    pub request_json: Value,
    pub metadata: Value,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppRuntimeEventList {
    pub items: Vec<AppRuntimeEventItem>,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub total: i64,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub page_no: i64,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppRuntimeEventItem {
    pub id: String,
    pub invocation_id: String,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub event_no: i64,
    pub event_type: String,
    pub event_source: String,
    pub payload_json: Value,
    pub text_delta: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppRuntimeArtifactList {
    pub items: Vec<AppRuntimeArtifactItem>,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub total: i64,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub page_no: i64,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppRuntimeArtifactItem {
    pub id: String,
    pub invocation_id: String,
    pub artifact_type: String,
    pub name: Option<String>,
    pub mime_type: Option<String>,
    pub content_text: Option<String>,
    pub storage_key: Option<String>,
    pub resource: Option<Value>,
    pub sha256: Option<String>,
    #[serde(with = "sdkwork_utils_rust::serde_int64::option")]
    pub size_bytes: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CreateAppRuntimeInvocationCommand {
    pub subject: AppRuntimeSubject,
    pub invocation_uuid: String,
    pub invocation_type: String,
    pub runtime: String,
    pub endpoint: Option<String>,
    pub status: String,
    pub conversation_id: Option<String>,
    pub chat_turn_id: Option<String>,
    pub chat_item_id: Option<String>,
    pub agent_session_id: Option<String>,
    pub agent_run_id: Option<String>,
    pub agent_run_step_id: Option<String>,
    pub request_id: Option<String>,
    pub trace_id: Option<String>,
    pub model: Option<String>,
    pub provider: Option<String>,
    pub tool_name: Option<String>,
    pub tool_call_id: Option<String>,
    pub cwd: Option<String>,
    pub sandbox_policy: Option<String>,
    pub approval_policy: Option<String>,
    pub permission_mode: Option<String>,
    pub streaming: bool,
    pub request_json: Value,
    pub metadata: Value,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CompleteAppRuntimeInvocationCommand {
    pub subject: AppRuntimeSubject,
    pub invocation_id: String,
    pub status: String,
    pub provider_response_id: Option<String>,
    pub provider_session_id: Option<String>,
    pub provider_conversation_id: Option<String>,
    pub provider_step_id: Option<String>,
    pub finish_reason: Option<String>,
    pub latency_ms: Option<i64>,
    pub ttft_ms: Option<i64>,
    pub exit_code: Option<i64>,
    pub error_type: Option<String>,
    pub error_code: Option<String>,
    pub error_message_masked: Option<String>,
    pub response_json: Value,
    pub usage_json: Value,
    pub metadata: Value,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CreateAppRuntimeEventCommand {
    pub subject: AppRuntimeSubject,
    pub invocation_id: String,
    pub event_uuid: String,
    pub event_type: String,
    pub event_source: String,
    pub payload_json: Value,
    pub text_delta: Option<String>,
    pub metadata: Value,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CreateAppRuntimeArtifactCommand {
    pub subject: AppRuntimeSubject,
    pub invocation_id: String,
    pub artifact_uuid: String,
    pub artifact_type: String,
    pub name: Option<String>,
    pub mime_type: Option<String>,
    pub content_text: Option<String>,
    pub content_json: Value,
    pub storage_key: Option<String>,
    pub resource: Option<Value>,
    pub sha256: Option<String>,
    pub size_bytes: Option<i64>,
    pub metadata: Value,
    pub requested_at: String,
}

pub trait AppRuntimeStore {
    fn list_invocations<'a>(
        &'a self,
        subject: AppRuntimeSubject,
        query: AppRuntimeInvocationQuery,
    ) -> AppRuntimeFuture<'a, AppRuntimeInvocationList>;

    fn get_invocation<'a>(
        &'a self,
        subject: AppRuntimeSubject,
        invocation_id: String,
    ) -> AppRuntimeFuture<'a, Option<AppRuntimeInvocationItem>>;

    fn get_invocation_execution<'a>(
        &'a self,
        subject: AppRuntimeSubject,
        invocation_id: String,
    ) -> AppRuntimeFuture<'a, Option<AppRuntimeInvocationExecution>>;

    fn create_invocation<'a>(
        &'a self,
        command: CreateAppRuntimeInvocationCommand,
    ) -> AppRuntimeFuture<'a, AppRuntimeInvocationItem>;

    fn complete_invocation<'a>(
        &'a self,
        command: CompleteAppRuntimeInvocationCommand,
    ) -> AppRuntimeFuture<'a, AppRuntimeInvocationItem>;

    fn list_events<'a>(
        &'a self,
        subject: AppRuntimeSubject,
        invocation_id: String,
        page: i64,
        page_size: i64,
    ) -> AppRuntimeFuture<'a, AppRuntimeEventList>;

    fn list_events_after<'a>(
        &'a self,
        subject: AppRuntimeSubject,
        invocation_id: String,
        after_event_no: i64,
        limit: i64,
    ) -> AppRuntimeFuture<'a, AppRuntimeEventList>;

    fn has_terminal_event<'a>(
        &'a self,
        subject: AppRuntimeSubject,
        invocation_id: String,
    ) -> AppRuntimeFuture<'a, bool>;

    fn get_terminal_event<'a>(
        &'a self,
        subject: AppRuntimeSubject,
        invocation_id: String,
    ) -> AppRuntimeFuture<'a, Option<AppRuntimeEventItem>>;

    fn create_event<'a>(
        &'a self,
        command: CreateAppRuntimeEventCommand,
    ) -> AppRuntimeFuture<'a, AppRuntimeEventItem>;

    fn list_artifacts<'a>(
        &'a self,
        subject: AppRuntimeSubject,
        invocation_id: String,
        page: i64,
        page_size: i64,
    ) -> AppRuntimeFuture<'a, AppRuntimeArtifactList>;

    fn create_artifact<'a>(
        &'a self,
        command: CreateAppRuntimeArtifactCommand,
    ) -> AppRuntimeFuture<'a, AppRuntimeArtifactItem>;
}
