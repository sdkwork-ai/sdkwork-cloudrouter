use std::sync::Arc;
use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;

use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post, put};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::api::request_id::{generate_server_request_id, RequestIdError};
use crate::api::response::{problem_from_wire_code, success_envelope};
use crate::domain::DomainError;
use crate::ports::{
    AdminMessagingCollection, AdminMessagingCommandFuture, AdminMessagingRouteSimulationCommand,
    AdminMessagingStore, AdminMessagingSubject, AdminMessagingTemplateSendCommand,
    AdminMessagingTestSendCommand, CreateMessagingProviderAccountCommand,
    CreateMessagingRouteRuleCommand, CreateMessagingSenderIdentityCommand,
    CreateMessagingSuppressionCommand, CreateMessagingTemplateCommand,
    ListAdminMessagingRecordsQuery, MessagingRouteRuleTargetCommand,
    PublishMessagingTemplateVersionCommand, UpdateVerificationPolicyCommand,
};

const DEFAULT_PAGE_NO: i64 = 1;
const DEFAULT_PAGE_SIZE: i64 = 100;
const MAX_PAGE_SIZE: i64 = 200;
const MAX_Q_LEN: usize = 128;
const MAX_STATUS_LEN: usize = 32;
const MAX_CHANNEL_LEN: usize = 32;
const MAX_PROVIDER_CODE_LEN: usize = 64;
const MAX_ACCOUNT_CODE_LEN: usize = 64;
const MAX_ACCOUNT_NAME_LEN: usize = 128;
const MAX_ID_LEN: usize = 128;
const MAX_CODE_LEN: usize = 128;
const MAX_PURPOSE_LEN: usize = 64;
const MAX_URL_LEN: usize = 512;
const MAX_SECRET_REF_LEN: usize = 256;
const MAX_AUTH_TYPE_LEN: usize = 64;
const MAX_DISPLAY_NAME_LEN: usize = 128;
const MAX_EMAIL_LEN: usize = 256;
const MAX_DOMAIN_LEN: usize = 256;
const MAX_COUNTRY_CODE_LEN: usize = 16;
const MAX_LOCALE_LEN: usize = 32;
const MAX_CATEGORY_LEN: usize = 64;
const MAX_SUBJECT_TEMPLATE_LEN: usize = 512;
const MAX_BODY_TEMPLATE_LEN: usize = 20_000;
const MAX_CONTENT_FORMAT_LEN: usize = 32;
const MAX_TARGET_HASH_LEN: usize = 128;
const MAX_REASON_CODE_LEN: usize = 128;
const MAX_SEGMENT_LEN: usize = 128;
const MAX_IDEMPOTENCY_KEY_LEN: usize = 128;
const MAX_SCOPE_TYPE_LEN: usize = 64;
const MAX_SCOPE_ID_LEN: usize = 128;
const MAX_TIMESTAMP_LEN: usize = 64;
const MAX_SOURCE_LEN: usize = 64;
const MAX_NOTE_LEN: usize = 512;
const MAX_ROUTE_TARGETS: usize = 10;
const MIN_PRIORITY: i64 = 1;
const MAX_PRIORITY: i64 = 100_000;
const MIN_ROUTE_TARGET_ORDER: i64 = 1;
const MAX_ROUTE_TARGET_ORDER: i64 = 10;
const MIN_ROUTE_TARGET_WEIGHT: i64 = 1;
const MAX_ROUTE_TARGET_WEIGHT: i64 = 10_000;
const MIN_CODE_LENGTH: i64 = 4;
const MAX_CODE_LENGTH: i64 = 10;
const MIN_TTL_SECONDS: i64 = 30;
const MAX_TTL_SECONDS: i64 = 1800;
const MIN_RESEND_INTERVAL_SECONDS: i64 = 10;
const MAX_RESEND_INTERVAL_SECONDS: i64 = 600;
const MIN_SEND_PER_HOUR: i64 = 1;
const MAX_SEND_PER_HOUR: i64 = 60;
const MIN_VERIFY_ATTEMPTS: i64 = 1;
const MAX_VERIFY_ATTEMPTS: i64 = 20;
const IDEMPOTENCY_KEY_HEADER: &str = "Idempotency-Key";

#[derive(Clone)]
struct AdminMessagingState {
    store: Arc<dyn AdminMessagingStore + Send + Sync>,
}

#[derive(Debug, Default, Deserialize)]
struct AdminMessagingListRequestQuery {
    page: Option<i64>,
    page_size: Option<i64>,
    q: Option<String>,
    status: Option<String>,
    channel: Option<String>,
    provider_code: Option<String>,
    scene_code: Option<String>,
    target_hash: Option<String>,
    reason_code: Option<String>,
    ip_hash: Option<String>,
    device_hash: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MessagingCredentialRequest {
    secret_ref: String,
    auth_type: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MessagingProviderAccountCreateRequest {
    provider_code: String,
    account_code: String,
    account_name: String,
    channel: String,
    delivery_purpose: Option<String>,
    base_url: Option<String>,
    credential: MessagingCredentialRequest,
    capability_schema: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MessagingSenderIdentityCreateRequest {
    provider_account_id: String,
    channel: String,
    identity_code: String,
    display_name: Option<String>,
    from_email: Option<String>,
    from_name: Option<String>,
    reply_to: Option<String>,
    domain_name: Option<String>,
    sign_name: Option<String>,
    sender_id: Option<String>,
    country_code: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MessagingTemplateCreateRequest {
    template_code: String,
    scene_code: String,
    channel: String,
    delivery_purpose: Option<String>,
    category: String,
    template_name: String,
    subject_template: Option<String>,
    body_template: String,
    content_format: Option<String>,
    locale: Option<String>,
    variable_schema: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MessagingRouteRuleCreateRequest {
    rule_code: String,
    scene_code: String,
    channel: String,
    delivery_purpose: Option<String>,
    country_code: Option<String>,
    locale: Option<String>,
    user_segment: Option<String>,
    priority: Option<i64>,
    failover_policy: Option<Value>,
    targets: Vec<MessagingRouteRuleTargetRequest>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MessagingRouteRuleTargetRequest {
    provider_account_id: String,
    sender_identity_id: Option<String>,
    template_binding_id: Option<String>,
    target_order: i64,
    weight: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MessagingRouteSimulationRequest {
    scene_code: String,
    channel: String,
    delivery_purpose: Option<String>,
    country_code: Option<String>,
    locale: Option<String>,
    user_segment: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MessagingTestSendRequest {
    scene_code: String,
    channel: String,
    delivery_purpose: Option<String>,
    template_code: Option<String>,
    country_code: Option<String>,
    locale: Option<String>,
    user_segment: Option<String>,
    target_masked: String,
    target_hash: String,
    dry_run: Option<bool>,
    variables: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MessagingTemplateSendRequest {
    scene_code: String,
    channel: String,
    delivery_purpose: String,
    template_code: String,
    country_code: Option<String>,
    locale: Option<String>,
    user_segment: Option<String>,
    target_masked: String,
    target_hash: String,
    dry_run: Option<bool>,
    variables: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MessagingSuppressionCreateRequest {
    channel: String,
    target_masked: String,
    target_hash: String,
    reason_code: String,
    scope_type: Option<String>,
    scope_id: Option<String>,
    starts_at: String,
    ends_at: Option<String>,
    source: Option<String>,
    note: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VerificationPolicyUpdateRequest {
    allowed_channels: Vec<String>,
    default_channel: Option<String>,
    code_length: i64,
    ttl_seconds: i64,
    resend_interval_seconds: Option<i64>,
    max_send_per_hour: Option<i64>,
    max_verify_attempts: i64,
    template_code: String,
    risk_policy: Option<Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct MessagingCollectionResponse {
    items: Vec<serde_json::Map<String, Value>>,
    total: i64,
    page: i64,
    page_size: i64,
}

pub fn admin_messaging_router_with_store(
    store: Arc<dyn AdminMessagingStore + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/messaging/provider_accounts",
            get(list_provider_accounts).post(create_provider_account),
        )
        .route(
            "/backend/v3/api/messaging/sender_identities",
            get(list_sender_identities).post(create_sender_identity),
        )
        .route(
            "/backend/v3/api/messaging/templates",
            get(list_templates).post(create_template),
        )
        .route(
            "/backend/v3/api/messaging/templates/{template_id}/versions/{version_id}/publish",
            post(publish_template_version),
        )
        .route(
            "/backend/v3/api/messaging/route_rules",
            get(list_route_rules).post(create_route_rule),
        )
        .route(
            "/backend/v3/api/messaging/send_requests",
            get(list_send_requests),
        )
        .route(
            "/backend/v3/api/messaging/template_sends",
            post(send_template),
        )
        .route(
            "/backend/v3/api/messaging/diagnostics/route_simulation",
            post(simulate_route),
        )
        .route(
            "/backend/v3/api/messaging/diagnostics/test_sends",
            post(test_send),
        )
        .route(
            "/backend/v3/api/messaging/suppressions",
            get(list_suppressions).post(create_suppression),
        )
        .route(
            "/backend/v3/api/messaging/rate_limit_buckets",
            get(list_rate_limit_buckets),
        )
        .route(
            "/backend/v3/api/messaging/verification_policies",
            get(list_verification_policies),
        )
        .route(
            "/backend/v3/api/messaging/verification_policies/{policy_id}",
            put(update_verification_policy),
        )
        .with_state(AdminMessagingState { store })
}

async fn list_provider_accounts(
    State(state): State<AdminMessagingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminMessagingListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| {
        state.store.list_provider_accounts(query)
    })
    .await
}

async fn create_provider_account(
    State(state): State<AdminMessagingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Json(request): Json<MessagingProviderAccountCreateRequest>,
) -> Response {
    let command = match validated_provider_account_create_command(scoped, &headers, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.create_provider_account(command).await {
        Ok(item) => Json(success_envelope(item)).into_response(),
        Err(error) => {
            messaging_error_response("messaging provider account create is unavailable", error)
        }
    }
}

async fn list_sender_identities(
    State(state): State<AdminMessagingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminMessagingListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| {
        state.store.list_sender_identities(query)
    })
    .await
}

async fn create_sender_identity(
    State(state): State<AdminMessagingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Json(request): Json<MessagingSenderIdentityCreateRequest>,
) -> Response {
    let command = match validated_sender_identity_create_command(scoped, &headers, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.create_sender_identity(command).await {
        Ok(item) => Json(success_envelope(item)).into_response(),
        Err(error) => {
            messaging_error_response("messaging sender identity create is unavailable", error)
        }
    }
}

async fn list_templates(
    State(state): State<AdminMessagingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminMessagingListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_templates(query)).await
}

async fn create_template(
    State(state): State<AdminMessagingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Json(request): Json<MessagingTemplateCreateRequest>,
) -> Response {
    let command = match validated_template_create_command(scoped, &headers, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.create_template(command).await {
        Ok(item) => Json(success_envelope(item)).into_response(),
        Err(error) => messaging_error_response("messaging template create is unavailable", error),
    }
}

async fn publish_template_version(
    State(state): State<AdminMessagingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path((template_id, version_id)): Path<(String, String)>,
) -> Response {
    let command = match validated_publish_template_version_command(
        scoped,
        &headers,
        template_id,
        version_id,
    ) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.publish_template_version(command).await {
        Ok(item) => Json(success_envelope(item)).into_response(),
        Err(error) => {
            messaging_error_response("messaging template version publish is unavailable", error)
        }
    }
}

async fn list_route_rules(
    State(state): State<AdminMessagingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminMessagingListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_route_rules(query)).await
}

async fn create_route_rule(
    State(state): State<AdminMessagingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Json(request): Json<MessagingRouteRuleCreateRequest>,
) -> Response {
    let command = match validated_route_rule_create_command(scoped, &headers, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.create_route_rule(command).await {
        Ok(item) => Json(success_envelope(item)).into_response(),
        Err(error) => messaging_error_response("messaging route rule create is unavailable", error),
    }
}

async fn list_send_requests(
    State(state): State<AdminMessagingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminMessagingListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| {
        state.store.list_send_requests(query)
    })
    .await
}

async fn simulate_route(
    State(state): State<AdminMessagingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Json(request): Json<MessagingRouteSimulationRequest>,
) -> Response {
    let command = match validated_route_simulation_command(scoped, &headers, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.simulate_route(command).await {
        Ok(item) => Json(success_envelope(item)).into_response(),
        Err(error) => messaging_system_response("messaging route simulation is unavailable", error),
    }
}

async fn test_send(
    State(state): State<AdminMessagingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Json(request): Json<MessagingTestSendRequest>,
) -> Response {
    let command = match validated_test_send_command(scoped, &headers, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.test_send(command).await {
        Ok(item) => Json(success_envelope(item)).into_response(),
        Err(error) => messaging_error_response("messaging test send is unavailable", error),
    }
}

async fn send_template(
    State(state): State<AdminMessagingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Json(request): Json<MessagingTemplateSendRequest>,
) -> Response {
    let command = match validated_template_send_command(scoped, &headers, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.send_template(command).await {
        Ok(item) => Json(success_envelope(item)).into_response(),
        Err(error) => messaging_error_response("messaging template send is unavailable", error),
    }
}

async fn list_suppressions(
    State(state): State<AdminMessagingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminMessagingListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_suppressions(query)).await
}

async fn create_suppression(
    State(state): State<AdminMessagingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Json(request): Json<MessagingSuppressionCreateRequest>,
) -> Response {
    let command = match validated_suppression_create_command(scoped, &headers, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.create_suppression(command).await {
        Ok(item) => Json(success_envelope(item)).into_response(),
        Err(error) => {
            messaging_error_response("messaging suppression create is unavailable", error)
        }
    }
}

async fn list_rate_limit_buckets(
    State(state): State<AdminMessagingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminMessagingListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| {
        state.store.list_rate_limit_buckets(query)
    })
    .await
}

async fn list_verification_policies(
    State(state): State<AdminMessagingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminMessagingListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| {
        state.store.list_verification_policies(query)
    })
    .await
}

async fn update_verification_policy(
    State(state): State<AdminMessagingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(policy_id): Path<String>,
    Json(request): Json<VerificationPolicyUpdateRequest>,
) -> Response {
    let command =
        match validated_verification_policy_update_command(scoped, &headers, policy_id, request) {
            Ok(command) => command,
            Err(response) => return response,
        };
    match state.store.update_verification_policy(command).await {
        Ok(item) => Json(success_envelope(item)).into_response(),
        Err(error) => {
            messaging_error_response("messaging verification policy update is unavailable", error)
        }
    }
}

async fn list_response<'a, F>(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    query: AdminMessagingListRequestQuery,
    load: F,
) -> Response
where
    F: FnOnce(
        ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection>,
{
    let query = match validated_list_query(scoped, query) {
        Ok(query) => query,
        Err(response) => return response,
    };
    match load(query).await {
        Ok(collection) => collection_response(collection),
        Err(error) => messaging_system_response("messaging collection is unavailable", error),
    }
}

fn collection_response(collection: AdminMessagingCollection) -> Response {
    Json(success_envelope(MessagingCollectionResponse {
        items: collection.items,
        total: collection.total,
        page: collection.page_no,
        page_size: collection.page_size,
    }))
    .into_response()
}

fn validated_list_query(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    query: AdminMessagingListRequestQuery,
) -> Result<ListAdminMessagingRecordsQuery, Response> {
    let subject = scoped.into();
    let page_no = query.page.unwrap_or(DEFAULT_PAGE_NO);
    if page_no < 1 {
        return Err(bad_request("page must be greater than or equal to 1"));
    }
    let page_size = query.page_size.unwrap_or(DEFAULT_PAGE_SIZE);
    if !(1..=MAX_PAGE_SIZE).contains(&page_size) {
        return Err(bad_request(format!(
            "page_size must be between 1 and {MAX_PAGE_SIZE}"
        )));
    }
    Ok(ListAdminMessagingRecordsQuery {
        subject,
        page_no,
        page_size,
        offset: (page_no - 1) * page_size,
        q: normalize_optional_text(query.q, "q", MAX_Q_LEN)?,
        status: normalize_optional_text(query.status, "status", MAX_STATUS_LEN)?
            .map(|value| value.to_ascii_lowercase()),
        channel: normalize_optional_channel(query.channel)?,
        provider_code: normalize_optional_text(
            query.provider_code,
            "providerCode",
            MAX_PROVIDER_CODE_LEN,
        )?,
        scene_code: normalize_optional_text(query.scene_code, "sceneCode", MAX_CODE_LEN)?,
        target_hash: normalize_optional_text(query.target_hash, "targetHash", MAX_TARGET_HASH_LEN)?,
        reason_code: normalize_optional_text(query.reason_code, "reasonCode", MAX_REASON_CODE_LEN)?,
        ip_hash: normalize_optional_text(query.ip_hash, "ipHash", MAX_TARGET_HASH_LEN)?,
        device_hash: normalize_optional_text(query.device_hash, "deviceHash", MAX_TARGET_HASH_LEN)?,
    })
}

fn validated_provider_account_create_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    request: MessagingProviderAccountCreateRequest,
) -> Result<CreateMessagingProviderAccountCommand, Response> {
    let subject = scoped.into();
    let idempotency_key = required_header(headers, IDEMPOTENCY_KEY_HEADER)?;
    let request_id = server_request_id()?;
    Ok(CreateMessagingProviderAccountCommand {
        subject,
        provider_code: normalize_required_text(
            request.provider_code,
            "providerCode",
            MAX_PROVIDER_CODE_LEN,
        )?,
        account_code: normalize_required_text(
            request.account_code,
            "accountCode",
            MAX_ACCOUNT_CODE_LEN,
        )?,
        account_name: normalize_required_text(
            request.account_name,
            "accountName",
            MAX_ACCOUNT_NAME_LEN,
        )?,
        channel: normalize_required_channel(request.channel)?,
        delivery_purpose: normalize_optional_delivery_purpose(request.delivery_purpose)?,
        base_url: normalize_optional_text(request.base_url, "baseUrl", MAX_URL_LEN)?,
        secret_ref: normalize_required_text(
            request.credential.secret_ref,
            "credential.secretRef",
            MAX_SECRET_REF_LEN,
        )?,
        auth_type: normalize_optional_text(
            request.credential.auth_type,
            "credential.authType",
            MAX_AUTH_TYPE_LEN,
        )?,
        capability_schema: json_object_or_default(request.capability_schema, "capabilitySchema")?,
        idempotency_key,
        request_id,
    })
}

fn validated_sender_identity_create_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    request: MessagingSenderIdentityCreateRequest,
) -> Result<CreateMessagingSenderIdentityCommand, Response> {
    let subject = scoped.into();
    let idempotency_key = required_header(headers, IDEMPOTENCY_KEY_HEADER)?;
    let request_id = server_request_id()?;
    let channel = normalize_required_channel(request.channel)?;
    let from_email = normalize_optional_text(request.from_email, "fromEmail", MAX_EMAIL_LEN)?;
    let sign_name = normalize_optional_text(request.sign_name, "signName", MAX_DISPLAY_NAME_LEN)?;
    let sender_id = normalize_optional_text(request.sender_id, "senderId", MAX_ID_LEN)?;
    if channel == "email" && from_email.is_none() {
        return Err(bad_request(
            "fromEmail is required for email sender identity",
        ));
    }
    if channel == "sms" && sign_name.is_none() && sender_id.is_none() {
        return Err(bad_request(
            "signName or senderId is required for sms sender identity",
        ));
    }
    Ok(CreateMessagingSenderIdentityCommand {
        subject,
        provider_account_id: normalize_required_text(
            request.provider_account_id,
            "providerAccountId",
            MAX_ID_LEN,
        )?,
        channel,
        identity_code: normalize_required_text(
            request.identity_code,
            "identityCode",
            MAX_CODE_LEN,
        )?,
        display_name: normalize_optional_text(
            request.display_name,
            "displayName",
            MAX_DISPLAY_NAME_LEN,
        )?,
        from_email,
        from_name: normalize_optional_text(request.from_name, "fromName", MAX_DISPLAY_NAME_LEN)?,
        reply_to: normalize_optional_text(request.reply_to, "replyTo", MAX_EMAIL_LEN)?,
        domain_name: normalize_optional_text(request.domain_name, "domainName", MAX_DOMAIN_LEN)?,
        sign_name,
        sender_id,
        country_code: normalize_optional_text(
            request.country_code,
            "countryCode",
            MAX_COUNTRY_CODE_LEN,
        )?,
        idempotency_key,
        request_id,
    })
}

fn validated_template_create_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    request: MessagingTemplateCreateRequest,
) -> Result<CreateMessagingTemplateCommand, Response> {
    let subject = scoped.into();
    let idempotency_key = required_header(headers, IDEMPOTENCY_KEY_HEADER)?;
    let request_id = server_request_id()?;
    let content_format = normalize_optional_text(
        request.content_format,
        "contentFormat",
        MAX_CONTENT_FORMAT_LEN,
    )?;
    if let Some(value) = content_format.as_deref() {
        if !matches!(value, "text" | "html" | "markdown") {
            return Err(bad_request("contentFormat must be text, html, or markdown"));
        }
    }
    let channel = normalize_required_channel(request.channel)?;
    if channel == "sms" && content_format.as_deref().unwrap_or("text") != "text" {
        return Err(bad_request("sms contentFormat must be text"));
    }
    let variable_schema = validated_variable_schema(request.variable_schema)?;
    Ok(CreateMessagingTemplateCommand {
        subject,
        template_code: normalize_required_text(
            request.template_code,
            "templateCode",
            MAX_CODE_LEN,
        )?,
        scene_code: normalize_required_text(request.scene_code, "sceneCode", MAX_CODE_LEN)?,
        channel,
        delivery_purpose: normalize_delivery_purpose(request.delivery_purpose, "verification")?,
        category: normalize_required_text(request.category, "category", MAX_CATEGORY_LEN)?,
        template_name: normalize_required_text(
            request.template_name,
            "templateName",
            MAX_DISPLAY_NAME_LEN,
        )?,
        subject_template: normalize_optional_text(
            request.subject_template,
            "subjectTemplate",
            MAX_SUBJECT_TEMPLATE_LEN,
        )?,
        body_template: normalize_required_text(
            request.body_template,
            "bodyTemplate",
            MAX_BODY_TEMPLATE_LEN,
        )?,
        content_format,
        locale: normalize_optional_text(request.locale, "locale", MAX_LOCALE_LEN)?,
        variable_schema,
        idempotency_key,
        request_id,
    })
}

fn validated_publish_template_version_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    template_id: String,
    version_id: String,
) -> Result<PublishMessagingTemplateVersionCommand, Response> {
    let subject = scoped.into();
    let request_id = server_request_id()?;
    Ok(PublishMessagingTemplateVersionCommand {
        subject,
        template_id: normalize_required_text(template_id, "templateId", MAX_ID_LEN)?,
        version_id: normalize_required_text(version_id, "versionId", MAX_ID_LEN)?,
        request_id,
    })
}

fn validated_route_rule_create_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    request: MessagingRouteRuleCreateRequest,
) -> Result<CreateMessagingRouteRuleCommand, Response> {
    let subject = scoped.into();
    let idempotency_key = required_header(headers, IDEMPOTENCY_KEY_HEADER)?;
    let request_id = server_request_id()?;
    if request.targets.is_empty() || request.targets.len() > MAX_ROUTE_TARGETS {
        return Err(bad_request(format!(
            "targets must contain 1 to {MAX_ROUTE_TARGETS} items"
        )));
    }
    let priority = match request.priority {
        Some(value) => Some(range_i64(value, "priority", MIN_PRIORITY, MAX_PRIORITY)?),
        None => None,
    };
    let mut targets = Vec::with_capacity(request.targets.len());
    for target in request.targets {
        let target_order = range_i64(
            target.target_order,
            "targets.targetOrder",
            MIN_ROUTE_TARGET_ORDER,
            MAX_ROUTE_TARGET_ORDER,
        )?;
        let weight = match target.weight {
            Some(value) => Some(range_i64(
                value,
                "targets.weight",
                MIN_ROUTE_TARGET_WEIGHT,
                MAX_ROUTE_TARGET_WEIGHT,
            )?),
            None => None,
        };
        if targets
            .iter()
            .any(|existing: &MessagingRouteRuleTargetCommand| existing.target_order == target_order)
        {
            return Err(bad_request("targets.targetOrder must be unique"));
        }
        targets.push(MessagingRouteRuleTargetCommand {
            provider_account_id: normalize_required_text(
                target.provider_account_id,
                "targets.providerAccountId",
                MAX_ID_LEN,
            )?,
            sender_identity_id: normalize_optional_text(
                target.sender_identity_id,
                "targets.senderIdentityId",
                MAX_ID_LEN,
            )?,
            template_binding_id: normalize_optional_text(
                target.template_binding_id,
                "targets.templateBindingId",
                MAX_ID_LEN,
            )?,
            target_order,
            weight,
        });
    }
    Ok(CreateMessagingRouteRuleCommand {
        subject,
        rule_code: normalize_required_text(request.rule_code, "ruleCode", MAX_CODE_LEN)?,
        scene_code: normalize_required_text(request.scene_code, "sceneCode", MAX_CODE_LEN)?,
        channel: normalize_required_channel(request.channel)?,
        delivery_purpose: normalize_delivery_purpose(request.delivery_purpose, "verification")?,
        country_code: normalize_optional_text(
            request.country_code,
            "countryCode",
            MAX_COUNTRY_CODE_LEN,
        )?,
        locale: normalize_optional_text(request.locale, "locale", MAX_LOCALE_LEN)?,
        user_segment: normalize_optional_text(
            request.user_segment,
            "userSegment",
            MAX_SEGMENT_LEN,
        )?,
        priority,
        failover_policy: json_object_or_default(request.failover_policy, "failoverPolicy")?,
        targets,
        idempotency_key,
        request_id,
    })
}

fn validated_route_simulation_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    request: MessagingRouteSimulationRequest,
) -> Result<AdminMessagingRouteSimulationCommand, Response> {
    let subject = scoped.into();
    let request_id = server_request_id()?;
    Ok(AdminMessagingRouteSimulationCommand {
        subject,
        scene_code: normalize_required_text(request.scene_code, "sceneCode", MAX_CODE_LEN)?,
        channel: normalize_required_channel(request.channel)?,
        delivery_purpose: normalize_delivery_purpose(request.delivery_purpose, "verification")?,
        country_code: normalize_optional_text(
            request.country_code,
            "countryCode",
            MAX_COUNTRY_CODE_LEN,
        )?,
        locale: normalize_optional_text(request.locale, "locale", MAX_LOCALE_LEN)?,
        user_segment: normalize_optional_text(
            request.user_segment,
            "userSegment",
            MAX_SEGMENT_LEN,
        )?,
        request_id,
    })
}

fn validated_test_send_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    request: MessagingTestSendRequest,
) -> Result<AdminMessagingTestSendCommand, Response> {
    let subject = scoped.into();
    let idempotency_key = required_header(headers, IDEMPOTENCY_KEY_HEADER)?;
    let request_id = server_request_id()?;
    let scene_code = normalize_required_text(request.scene_code, "sceneCode", MAX_CODE_LEN)?;
    let template_code =
        normalize_optional_text(request.template_code, "templateCode", MAX_CODE_LEN)?
            .unwrap_or_else(|| scene_code.clone());
    Ok(AdminMessagingTestSendCommand {
        subject,
        scene_code,
        channel: normalize_required_channel(request.channel)?,
        delivery_purpose: normalize_delivery_purpose(request.delivery_purpose, "verification")?,
        template_code,
        country_code: normalize_optional_text(
            request.country_code,
            "countryCode",
            MAX_COUNTRY_CODE_LEN,
        )?,
        locale: normalize_optional_text(request.locale, "locale", MAX_LOCALE_LEN)?,
        user_segment: normalize_optional_text(
            request.user_segment,
            "userSegment",
            MAX_SEGMENT_LEN,
        )?,
        target_masked: normalize_required_text(
            request.target_masked,
            "targetMasked",
            MAX_TARGET_HASH_LEN,
        )?,
        target_hash: normalize_required_text(
            request.target_hash,
            "targetHash",
            MAX_TARGET_HASH_LEN,
        )?,
        dry_run: request.dry_run,
        variables: json_object_or_default(request.variables, "variables")?,
        idempotency_key,
        request_id,
    })
}

fn validated_template_send_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    request: MessagingTemplateSendRequest,
) -> Result<AdminMessagingTemplateSendCommand, Response> {
    let subject = scoped.into();
    let idempotency_key = required_header(headers, IDEMPOTENCY_KEY_HEADER)?;
    let request_id = server_request_id()?;
    Ok(AdminMessagingTemplateSendCommand {
        subject,
        scene_code: normalize_required_text(request.scene_code, "sceneCode", MAX_CODE_LEN)?,
        channel: normalize_required_channel(request.channel)?,
        delivery_purpose: normalize_delivery_purpose(
            Some(request.delivery_purpose),
            "transactional",
        )?,
        template_code: normalize_required_text(
            request.template_code,
            "templateCode",
            MAX_CODE_LEN,
        )?,
        country_code: normalize_optional_text(
            request.country_code,
            "countryCode",
            MAX_COUNTRY_CODE_LEN,
        )?,
        locale: normalize_optional_text(request.locale, "locale", MAX_LOCALE_LEN)?,
        user_segment: normalize_optional_text(
            request.user_segment,
            "userSegment",
            MAX_SEGMENT_LEN,
        )?,
        target_masked: normalize_required_text(
            request.target_masked,
            "targetMasked",
            MAX_TARGET_HASH_LEN,
        )?,
        target_hash: normalize_required_text(
            request.target_hash,
            "targetHash",
            MAX_TARGET_HASH_LEN,
        )?,
        dry_run: request.dry_run,
        variables: json_object_or_default(request.variables, "variables")?,
        idempotency_key,
        request_id,
    })
}

fn validated_suppression_create_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    request: MessagingSuppressionCreateRequest,
) -> Result<CreateMessagingSuppressionCommand, Response> {
    let subject = scoped.into();
    let idempotency_key = required_header(headers, IDEMPOTENCY_KEY_HEADER)?;
    let request_id = server_request_id()?;
    let (starts_at, starts_at_key) = normalize_required_timestamp(request.starts_at, "startsAt")?;
    let ends_at = normalize_optional_timestamp(request.ends_at, "endsAt")?;
    if let Some((_, ends_at_key)) = ends_at.as_ref() {
        if ends_at_key <= &starts_at_key {
            return Err(bad_request("endsAt must be greater than startsAt"));
        }
    }
    Ok(CreateMessagingSuppressionCommand {
        subject,
        channel: normalize_required_channel(request.channel)?,
        target_masked: normalize_required_text(
            request.target_masked,
            "targetMasked",
            MAX_TARGET_HASH_LEN,
        )?,
        target_hash: normalize_required_text(
            request.target_hash,
            "targetHash",
            MAX_TARGET_HASH_LEN,
        )?,
        reason_code: normalize_required_text(
            request.reason_code,
            "reasonCode",
            MAX_REASON_CODE_LEN,
        )?,
        scope_type: normalize_scope_type(request.scope_type)?,
        scope_id: normalize_optional_text(request.scope_id, "scopeId", MAX_SCOPE_ID_LEN)?
            .unwrap_or_else(|| "*".to_owned()),
        starts_at,
        ends_at: ends_at.map(|(value, _)| value),
        source: normalize_optional_text(request.source, "source", MAX_SOURCE_LEN)?
            .unwrap_or_else(|| "operator".to_owned()),
        note: normalize_optional_text(request.note, "note", MAX_NOTE_LEN)?,
        idempotency_key,
        request_id,
    })
}

fn validated_verification_policy_update_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    policy_id: String,
    request: VerificationPolicyUpdateRequest,
) -> Result<UpdateVerificationPolicyCommand, Response> {
    let subject = scoped.into();
    let request_id = server_request_id()?;
    if request.allowed_channels.is_empty() || request.allowed_channels.len() > 2 {
        return Err(bad_request("allowedChannels must contain 1 to 2 channels"));
    }
    let mut allowed_channels = Vec::with_capacity(request.allowed_channels.len());
    for channel in request.allowed_channels {
        let channel = normalize_required_channel(channel)?;
        if allowed_channels.contains(&channel) {
            return Err(bad_request("allowedChannels must be unique"));
        }
        allowed_channels.push(channel);
    }
    let default_channel = normalize_optional_channel(request.default_channel)?;
    if let Some(default_channel) = default_channel.as_deref() {
        if !allowed_channels
            .iter()
            .any(|channel| channel == default_channel)
        {
            return Err(bad_request("defaultChannel must be one of allowedChannels"));
        }
    }
    Ok(UpdateVerificationPolicyCommand {
        subject,
        policy_id: normalize_required_text(policy_id, "policyId", MAX_ID_LEN)?,
        allowed_channels,
        default_channel,
        code_length: range_i64(
            request.code_length,
            "codeLength",
            MIN_CODE_LENGTH,
            MAX_CODE_LENGTH,
        )?,
        ttl_seconds: range_i64(
            request.ttl_seconds,
            "ttlSeconds",
            MIN_TTL_SECONDS,
            MAX_TTL_SECONDS,
        )?,
        resend_interval_seconds: optional_range_i64(
            request.resend_interval_seconds,
            "resendIntervalSeconds",
            MIN_RESEND_INTERVAL_SECONDS,
            MAX_RESEND_INTERVAL_SECONDS,
        )?,
        max_send_per_hour: optional_range_i64(
            request.max_send_per_hour,
            "maxSendPerHour",
            MIN_SEND_PER_HOUR,
            MAX_SEND_PER_HOUR,
        )?,
        max_verify_attempts: range_i64(
            request.max_verify_attempts,
            "maxVerifyAttempts",
            MIN_VERIFY_ATTEMPTS,
            MAX_VERIFY_ATTEMPTS,
        )?,
        template_code: normalize_required_text(
            request.template_code,
            "templateCode",
            MAX_CODE_LEN,
        )?,
        risk_policy: json_object_or_default(request.risk_policy, "riskPolicy")?,
        request_id,
    })
}


fn required_header(headers: &HeaderMap, name: &str) -> Result<String, Response> {
    optional_header(headers, name)?.ok_or_else(|| bad_request(format!("{name} header is required")))
}

fn server_request_id() -> Result<String, Response> {
    generate_server_request_id().map_err(request_id_error_response)
}

fn request_id_error_response(error: RequestIdError) -> Response {
    match error {
        RequestIdError::Invalid(message) => bad_request(message),
        RequestIdError::System(message) => messaging_system_response(
            "messaging request id is unavailable",
            DomainError::new(message),
        ),
    }
}

fn optional_header(headers: &HeaderMap, name: &str) -> Result<Option<String>, Response> {
    let Some(value) = headers.get(name) else {
        return Ok(None);
    };
    let value = value
        .to_str()
        .map_err(|_| bad_request(format!("{name} header must be visible ASCII")))?;
    normalize_optional_text(Some(value.to_owned()), name, MAX_IDEMPOTENCY_KEY_LEN)
}

fn normalize_required_channel(value: String) -> Result<String, Response> {
    let value = normalize_required_text(value, "channel", MAX_CHANNEL_LEN)?.to_ascii_lowercase();
    if !matches!(value.as_str(), "sms" | "email") {
        return Err(bad_request("channel must be sms or email"));
    }
    Ok(value)
}

fn normalize_optional_channel(value: Option<String>) -> Result<Option<String>, Response> {
    let Some(value) = value else {
        return Ok(None);
    };
    let Some(value) = normalize_optional_text(Some(value), "channel", MAX_CHANNEL_LEN)? else {
        return Ok(None);
    };
    let value = value.to_ascii_lowercase();
    if !matches!(value.as_str(), "sms" | "email") {
        return Err(bad_request("channel must be sms or email"));
    }
    Ok(Some(value))
}

fn normalize_delivery_purpose(
    value: Option<String>,
    default_value: &str,
) -> Result<String, Response> {
    let value = normalize_optional_text(value, "deliveryPurpose", MAX_PURPOSE_LEN)?
        .unwrap_or_else(|| default_value.to_owned())
        .to_ascii_lowercase();
    if !matches!(
        value.as_str(),
        "verification" | "transactional" | "marketing" | "system"
    ) {
        return Err(bad_request(
            "deliveryPurpose must be verification, transactional, marketing, or system",
        ));
    }
    Ok(value)
}

fn normalize_optional_delivery_purpose(value: Option<String>) -> Result<Option<String>, Response> {
    let Some(value) = normalize_optional_text(value, "deliveryPurpose", MAX_PURPOSE_LEN)? else {
        return Ok(None);
    };
    let value = value.to_ascii_lowercase();
    if !matches!(
        value.as_str(),
        "verification" | "transactional" | "marketing" | "system"
    ) {
        return Err(bad_request(
            "deliveryPurpose must be verification, transactional, marketing, or system",
        ));
    }
    Ok(Some(value))
}

fn normalize_scope_type(value: Option<String>) -> Result<String, Response> {
    let value = normalize_optional_text(value, "scopeType", MAX_SCOPE_TYPE_LEN)?
        .unwrap_or_else(|| "tenant".to_owned())
        .to_ascii_lowercase();
    if !matches!(
        value.as_str(),
        "tenant" | "organization" | "user" | "account" | "global"
    ) {
        return Err(bad_request(
            "scopeType must be tenant, organization, user, account, or global",
        ));
    }
    Ok(value)
}

fn normalize_required_timestamp(
    value: String,
    field_name: &str,
) -> Result<(String, String), Response> {
    let value = normalize_required_text(value, field_name, MAX_TIMESTAMP_LEN)?;
    let key = timestamp_sort_key(&value, field_name)?;
    Ok((value, key))
}

fn normalize_optional_timestamp(
    value: Option<String>,
    field_name: &str,
) -> Result<Option<(String, String)>, Response> {
    let Some(value) = normalize_optional_text(value, field_name, MAX_TIMESTAMP_LEN)? else {
        return Ok(None);
    };
    let key = timestamp_sort_key(&value, field_name)?;
    Ok(Some((value, key)))
}

fn timestamp_sort_key(value: &str, field_name: &str) -> Result<String, Response> {
    let canonical = if value.len() == 20 && value.as_bytes()[10] == b'T' && value.ends_with('Z') {
        format!("{} {}", &value[..10], &value[11..19])
    } else if value.len() == 19 && (value.as_bytes()[10] == b' ' || value.as_bytes()[10] == b'T') {
        format!("{} {}", &value[..10], &value[11..19])
    } else {
        return Err(bad_request(format!(
            "{field_name} must be an RFC3339 UTC timestamp like 2026-05-25T00:00:00Z or SQL timestamp like 2026-05-25 00:00:00"
        )));
    };

    validate_timestamp_key(&canonical, field_name)?;
    Ok(canonical)
}

fn validate_timestamp_key(value: &str, field_name: &str) -> Result<(), Response> {
    let bytes = value.as_bytes();
    let separators_are_valid = bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes[10] == b' '
        && bytes[13] == b':'
        && bytes[16] == b':';
    let digits_are_valid = bytes
        .iter()
        .enumerate()
        .all(|(index, byte)| matches!(index, 4 | 7 | 10 | 13 | 16) || byte.is_ascii_digit());
    if !separators_are_valid || !digits_are_valid {
        return Err(bad_request(format!(
            "{field_name} must be a valid timestamp"
        )));
    }

    let year = parse_timestamp_component(&value[0..4], field_name)?;
    let month = parse_timestamp_component(&value[5..7], field_name)?;
    let day = parse_timestamp_component(&value[8..10], field_name)?;
    let hour = parse_timestamp_component(&value[11..13], field_name)?;
    let minute = parse_timestamp_component(&value[14..16], field_name)?;
    let second = parse_timestamp_component(&value[17..19], field_name)?;
    if year < 1970
        || !(1..=12).contains(&month)
        || !(1..=31).contains(&day)
        || hour > 23
        || minute > 59
        || second > 59
    {
        return Err(bad_request(format!(
            "{field_name} must be a valid timestamp"
        )));
    }
    Ok(())
}

fn parse_timestamp_component(value: &str, field_name: &str) -> Result<i64, Response> {
    value
        .parse::<i64>()
        .map_err(|_| bad_request(format!("{field_name} must be a valid timestamp")))
}

fn normalize_required_text(
    value: String,
    field_name: &str,
    max_len: usize,
) -> Result<String, Response> {
    normalize_optional_text(Some(value), field_name, max_len)?
        .ok_or_else(|| bad_request(format!("{field_name} is required")))
}

fn normalize_optional_text(
    value: Option<String>,
    field_name: &str,
    max_len: usize,
) -> Result<Option<String>, Response> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = value.trim();
    if value.is_empty() {
        return Ok(None);
    }
    if value.chars().count() > max_len || !value.bytes().all(|byte| (0x20..=0x7e).contains(&byte)) {
        return Err(bad_request(format!(
            "{field_name} must be visible ASCII and at most {max_len} characters"
        )));
    }
    Ok(Some(value.to_owned()))
}

fn json_object_or_default(value: Option<Value>, field_name: &str) -> Result<Value, Response> {
    match value {
        Some(Value::Object(map)) => Ok(Value::Object(map)),
        Some(_) => Err(bad_request(format!("{field_name} must be a JSON object"))),
        None => Ok(Value::Object(Default::default())),
    }
}

fn validated_variable_schema(value: Option<Value>) -> Result<Value, Response> {
    let schema = json_object_or_default(value, "variableSchema")?;
    if let Some(required) = schema.get("required") {
        let Some(required) = required.as_array() else {
            return Err(bad_request("variableSchema.required must be an array"));
        };
        let mut names: Vec<&str> = Vec::with_capacity(required.len());
        for item in required {
            let Some(name) = item.as_str() else {
                return Err(bad_request("variableSchema.required must contain strings"));
            };
            let name = name.trim();
            if name.is_empty()
                || name.chars().count() > MAX_CODE_LEN
                || !name.bytes().all(|byte| (0x20..=0x7e).contains(&byte))
            {
                return Err(bad_request(
                    "variableSchema.required names must be visible ASCII and non-empty",
                ));
            }
            if names.contains(&name) {
                return Err(bad_request("variableSchema.required names must be unique"));
            }
            names.push(name);
        }
    }
    if let Some(properties) = schema.get("properties") {
        if !properties.is_object() {
            return Err(bad_request(
                "variableSchema.properties must be a JSON object",
            ));
        }
    }
    Ok(schema)
}

fn range_i64(value: i64, field_name: &str, min: i64, max: i64) -> Result<i64, Response> {
    if !(min..=max).contains(&value) {
        return Err(bad_request(format!(
            "{field_name} must be between {min} and {max}"
        )));
    }
    Ok(value)
}

fn optional_range_i64(
    value: Option<i64>,
    field_name: &str,
    min: i64,
    max: i64,
) -> Result<Option<i64>, Response> {
    value
        .map(|value| range_i64(value, field_name, min, max))
        .transpose()
}

fn bad_request(message: impl Into<String>) -> Response {
    problem_from_wire_code("4001", message.into()).into_response()
}

fn not_found_response(message: impl Into<String>) -> Response {
    problem_from_wire_code("4040", message.into()).into_response()
}

fn conflict_response(error: DomainError) -> Response {
    problem_from_wire_code("4090", error.to_string()).into_response()
}

fn messaging_error_response(context: &str, error: DomainError) -> Response {
    if error.is_not_found() {
        return not_found_response(error.to_string());
    }
    if error.is_conflict() {
        return conflict_response(error);
    }
    messaging_system_response(context, error)
}

fn messaging_system_response(context: &str, error: DomainError) -> Response {
    problem_from_wire_code("5000", format!("{context}: {error}")).into_response()
}
