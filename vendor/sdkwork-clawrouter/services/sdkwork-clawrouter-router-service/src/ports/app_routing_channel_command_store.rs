use std::future::Future;
use std::pin::Pin;

use serde::Serialize;

use crate::domain::DomainResult;

use super::{AppRoutingChannelItem, AppRoutingSubject};

pub type AppRoutingChannelCommandFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAppRoutingChannelCommand {
    pub subject: AppRoutingSubject,
    pub channel_uuid: String,
    pub account_uuid: String,
    pub provider_uuid: String,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub name: String,
    pub vendor: String,
    pub provider_code: String,
    pub protocol: String,
    pub access_type: String,
    pub base_url: Option<String>,
    pub secret_ref: String,
    pub capabilities: Vec<String>,
    pub is_multimodal: bool,
    pub timeout_ms: Option<i64>,
    pub retry_policy_json: Option<String>,
    pub circuit_breaker_policy_json: Option<String>,
    pub weight: i64,
    pub status: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAppRoutingChannelCommand {
    pub subject: AppRoutingSubject,
    pub channel_id: i64,
    pub provider_uuid: String,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub name: Option<String>,
    pub vendor: Option<String>,
    pub provider_code: Option<String>,
    pub protocol: Option<String>,
    pub access_type: Option<String>,
    pub base_url: Option<Option<String>>,
    pub secret_ref: Option<String>,
    pub capabilities: Option<Vec<String>>,
    pub timeout_ms: Option<Option<i64>>,
    pub retry_policy_json: Option<Option<String>>,
    pub circuit_breaker_policy_json: Option<Option<String>>,
    pub weight: Option<i64>,
    pub status: Option<String>,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SetAppRoutingChannelStatusCommand {
    pub subject: AppRoutingSubject,
    pub channel_id: i64,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub status: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteAppRoutingChannelCommand {
    pub subject: AppRoutingSubject,
    pub channel_id: i64,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TestAppRoutingChannelCommand {
    pub subject: AppRoutingSubject,
    pub channel_id: i64,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppRoutingChannelMutationOutcome {
    pub item: AppRoutingChannelItem,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppRoutingChannelDeleteOutcome {
    pub deleted: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppRoutingChannelTestOutcome {
    pub channel_id: String,
    pub success: bool,
    pub status: String,
    pub latency: String,
    pub item: AppRoutingChannelItem,
}

pub trait AppRoutingChannelCommandStore {
    fn create_channel<'a>(
        &'a self,
        command: CreateAppRoutingChannelCommand,
    ) -> AppRoutingChannelCommandFuture<'a, AppRoutingChannelMutationOutcome>;

    fn update_channel<'a>(
        &'a self,
        command: UpdateAppRoutingChannelCommand,
    ) -> AppRoutingChannelCommandFuture<'a, Option<AppRoutingChannelMutationOutcome>>;

    fn set_channel_status<'a>(
        &'a self,
        command: SetAppRoutingChannelStatusCommand,
    ) -> AppRoutingChannelCommandFuture<'a, Option<AppRoutingChannelMutationOutcome>>;

    fn delete_channel<'a>(
        &'a self,
        command: DeleteAppRoutingChannelCommand,
    ) -> AppRoutingChannelCommandFuture<'a, AppRoutingChannelDeleteOutcome>;

    fn test_channel<'a>(
        &'a self,
        command: TestAppRoutingChannelCommand,
    ) -> AppRoutingChannelCommandFuture<'a, Option<AppRoutingChannelTestOutcome>>;
}
