use std::future::Future;
use std::pin::Pin;

use serde::Serialize;
use serde_json::{Map, Value};

use crate::domain::DomainResult;

pub type AdminMessagingCommandFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

pub type AdminMessagingJsonRecord = Map<String, Value>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminMessagingSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminMessagingRecordsQuery {
    pub subject: AdminMessagingSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub q: Option<String>,
    pub status: Option<String>,
    pub channel: Option<String>,
    pub provider_code: Option<String>,
    pub scene_code: Option<String>,
    pub target_hash: Option<String>,
    pub reason_code: Option<String>,
    pub ip_hash: Option<String>,
    pub device_hash: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminMessagingCollection {
    pub items: Vec<AdminMessagingJsonRecord>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CreateMessagingProviderAccountCommand {
    pub subject: AdminMessagingSubject,
    pub provider_code: String,
    pub account_code: String,
    pub account_name: String,
    pub channel: String,
    pub delivery_purpose: Option<String>,
    pub base_url: Option<String>,
    pub secret_ref: String,
    pub auth_type: Option<String>,
    pub capability_schema: Value,
    pub idempotency_key: String,
    pub request_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateMessagingSenderIdentityCommand {
    pub subject: AdminMessagingSubject,
    pub provider_account_id: String,
    pub channel: String,
    pub identity_code: String,
    pub display_name: Option<String>,
    pub from_email: Option<String>,
    pub from_name: Option<String>,
    pub reply_to: Option<String>,
    pub domain_name: Option<String>,
    pub sign_name: Option<String>,
    pub sender_id: Option<String>,
    pub country_code: Option<String>,
    pub idempotency_key: String,
    pub request_id: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CreateMessagingTemplateCommand {
    pub subject: AdminMessagingSubject,
    pub template_code: String,
    pub scene_code: String,
    pub channel: String,
    pub delivery_purpose: String,
    pub category: String,
    pub template_name: String,
    pub subject_template: Option<String>,
    pub body_template: String,
    pub content_format: Option<String>,
    pub locale: Option<String>,
    pub variable_schema: Value,
    pub idempotency_key: String,
    pub request_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PublishMessagingTemplateVersionCommand {
    pub subject: AdminMessagingSubject,
    pub template_id: String,
    pub version_id: String,
    pub request_id: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CreateMessagingRouteRuleCommand {
    pub subject: AdminMessagingSubject,
    pub rule_code: String,
    pub scene_code: String,
    pub channel: String,
    pub delivery_purpose: String,
    pub country_code: Option<String>,
    pub locale: Option<String>,
    pub user_segment: Option<String>,
    pub priority: Option<i64>,
    pub failover_policy: Value,
    pub targets: Vec<MessagingRouteRuleTargetCommand>,
    pub idempotency_key: String,
    pub request_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MessagingRouteRuleTargetCommand {
    pub provider_account_id: String,
    pub sender_identity_id: Option<String>,
    pub template_binding_id: Option<String>,
    pub target_order: i64,
    pub weight: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminMessagingRouteSimulationCommand {
    pub subject: AdminMessagingSubject,
    pub scene_code: String,
    pub channel: String,
    pub delivery_purpose: String,
    pub country_code: Option<String>,
    pub locale: Option<String>,
    pub user_segment: Option<String>,
    pub request_id: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AdminMessagingTestSendCommand {
    pub subject: AdminMessagingSubject,
    pub scene_code: String,
    pub channel: String,
    pub delivery_purpose: String,
    pub template_code: String,
    pub country_code: Option<String>,
    pub locale: Option<String>,
    pub user_segment: Option<String>,
    pub target_masked: String,
    pub target_hash: String,
    pub dry_run: Option<bool>,
    pub variables: Value,
    pub idempotency_key: String,
    pub request_id: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AdminMessagingTemplateSendCommand {
    pub subject: AdminMessagingSubject,
    pub scene_code: String,
    pub channel: String,
    pub delivery_purpose: String,
    pub template_code: String,
    pub country_code: Option<String>,
    pub locale: Option<String>,
    pub user_segment: Option<String>,
    pub target_masked: String,
    pub target_hash: String,
    pub dry_run: Option<bool>,
    pub variables: Value,
    pub idempotency_key: String,
    pub request_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateMessagingSuppressionCommand {
    pub subject: AdminMessagingSubject,
    pub channel: String,
    pub target_masked: String,
    pub target_hash: String,
    pub reason_code: String,
    pub scope_type: String,
    pub scope_id: String,
    pub starts_at: String,
    pub ends_at: Option<String>,
    pub source: String,
    pub note: Option<String>,
    pub idempotency_key: String,
    pub request_id: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct UpdateVerificationPolicyCommand {
    pub subject: AdminMessagingSubject,
    pub policy_id: String,
    pub allowed_channels: Vec<String>,
    pub default_channel: Option<String>,
    pub code_length: i64,
    pub ttl_seconds: i64,
    pub resend_interval_seconds: Option<i64>,
    pub max_send_per_hour: Option<i64>,
    pub max_verify_attempts: i64,
    pub template_code: String,
    pub risk_policy: Value,
    pub request_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminMessagingMutationItem {
    pub id: String,
    pub status: String,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminMessagingRouteSimulationItem {
    pub matched: bool,
    pub route_rule_id: Option<String>,
    pub targets: Vec<AdminMessagingJsonRecord>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminMessagingTestSendItem {
    pub request_id: String,
    pub delivery_status: String,
    pub provider_code: Option<String>,
}

pub trait AdminMessagingStore {
    fn list_provider_accounts<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection>;

    fn create_provider_account<'a>(
        &'a self,
        command: CreateMessagingProviderAccountCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingMutationItem>;

    fn list_sender_identities<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection>;

    fn create_sender_identity<'a>(
        &'a self,
        command: CreateMessagingSenderIdentityCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingMutationItem>;

    fn list_templates<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection>;

    fn create_template<'a>(
        &'a self,
        command: CreateMessagingTemplateCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingMutationItem>;

    fn publish_template_version<'a>(
        &'a self,
        command: PublishMessagingTemplateVersionCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingMutationItem>;

    fn list_route_rules<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection>;

    fn create_route_rule<'a>(
        &'a self,
        command: CreateMessagingRouteRuleCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingMutationItem>;

    fn list_send_requests<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection>;

    fn simulate_route<'a>(
        &'a self,
        command: AdminMessagingRouteSimulationCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingRouteSimulationItem>;

    fn test_send<'a>(
        &'a self,
        command: AdminMessagingTestSendCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingTestSendItem>;

    fn send_template<'a>(
        &'a self,
        command: AdminMessagingTemplateSendCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingTestSendItem>;

    fn list_suppressions<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection>;

    fn create_suppression<'a>(
        &'a self,
        command: CreateMessagingSuppressionCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingMutationItem>;

    fn list_rate_limit_buckets<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection>;

    fn list_verification_policies<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection>;

    fn update_verification_policy<'a>(
        &'a self,
        command: UpdateVerificationPolicyCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingMutationItem>;
}
