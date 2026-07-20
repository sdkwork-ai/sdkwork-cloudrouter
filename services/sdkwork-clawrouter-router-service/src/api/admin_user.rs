use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::routing::{delete, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::api::request_id::{generate_server_request_id, RequestIdError};
use crate::api::response::{
    json_created_response, json_success_list_response, no_content_response,
    normalize_list_search_query, offset_page_info, parse_offset_list_query, problem_from_wire_code,
    success_envelope,
};
use crate::application::{ApiKeySecretGenerator, ApiKeySecretHasher};
use crate::domain::{DecimalValue, DomainError, GatewayApiKey};
use crate::ports::{
    AdjustAdminUserBalanceCommand, AdminUserApiKeyItem, AdminUserItem, AdminUserStore,
    AdminUserSubject, CreateAdminUserApiKeyCommand, CreateAdminUserCommand,
    CreateGatewayApiKeyCommand, DeleteAdminUserApiKeyCommand,
    DeleteGatewayApiKeyForOrganizationCommand, EnsureDefaultChannelGroupCommand,
    GatewayApiKeyCommandStore, ListAdminUserApiKeysQuery, ListAdminUsersQuery,
    UpdateAdminUserCommand,
};

const HASH_ALG_HMAC_SHA256: &str = "HMAC_SHA256";
const SECRET_VERSION: i64 = 1;
const IDEMPOTENCY_KEY_HEADER: &str = "Idempotency-Key";
const MAX_USERNAME_LEN: usize = 168;
const MAX_EMAIL_LEN: usize = 255;
const MAX_GROUP_LEN: usize = 64;
const MAX_API_KEY_NAME_LEN: usize = 128;
const DEFAULT_CHANNEL_GROUP_CODE: &str = "default";
const DEFAULT_CHANNEL_GROUP_NAME: &str = "Default";
const DEFAULT_PRICING_PLAN_CODE: &str = "standard";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminUserItemEnvelope {
    item: AdminUserItem,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminUserApiKeyCreateResponse {
    key: AdminUserApiKeyItem,
    raw_key: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateUserRequest {
    email: Option<String>,
    username: Option<String>,
    balance: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateUserRequest {
    id: Option<i64>,
    username: Option<String>,
    group: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BalanceAdjustmentRequest {
    amount: Option<Value>,
    #[serde(rename = "type")]
    adjustment_type: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateApiKeyRequest {
    user_id: Option<i64>,
    name: Option<String>,
}

#[derive(Clone)]
struct AdminUserState {
    store: Arc<dyn AdminUserStore + Send + Sync>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    secret_generator: Arc<dyn ApiKeySecretGenerator + Send + Sync>,
}

#[derive(Clone)]
struct AdminApiKeyCommandState {
    command_store: Arc<dyn GatewayApiKeyCommandStore + Send + Sync>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    secret_generator: Arc<dyn ApiKeySecretGenerator + Send + Sync>,
}

#[derive(Debug, Deserialize)]
struct UsersListQuery {
    #[serde(default)]
    q: Option<String>,
    #[serde(default)]
    page: Option<i64>,
    #[serde(default)]
    page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct ApiKeysListQuery {
    #[serde(default)]
    page: Option<i64>,
    #[serde(default)]
    page_size: Option<i64>,
}

pub fn admin_user_router_with_store(
    store: Arc<dyn AdminUserStore + Send + Sync>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    secret_generator: Arc<dyn ApiKeySecretGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route("/backend/v3/api/user/list", post(fetch_users))
        .route("/backend/v3/api/user", post(create_user).put(update_user))
        .route("/backend/v3/api/apikey/list", post(fetch_api_keys_map))
        .route("/backend/v3/api/apikey", post(create_api_key))
        .route(
            "/backend/v3/api/apikey/{api_key_id}",
            delete(delete_api_key),
        )
        .route(
            "/backend/v3/api/system/users",
            post(create_user).put(update_user),
        )
        .route(
            "/backend/v3/api/billing/users/{user_id}/balance_adjustments",
            post(adjust_balance),
        )
        .with_state(AdminUserState {
            store,
            api_key_hasher,
            secret_generator,
        })
}

pub fn admin_user_api_key_command_router_with_store(
    command_store: Arc<dyn GatewayApiKeyCommandStore + Send + Sync>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    secret_generator: Arc<dyn ApiKeySecretGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route("/backend/v3/api/iam/api_keys", post(create_backend_api_key))
        .route(
            "/backend/v3/api/iam/api_keys/{api_key_id}",
            delete(delete_backend_api_key),
        )
        .with_state(AdminApiKeyCommandState {
            command_store,
            api_key_hasher,
            secret_generator,
        })
}

async fn fetch_users(
    State(state): State<AdminUserState>,
    Query(query): Query<UsersListQuery>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject: AdminUserSubject = scoped.into();

    let pagination = match parse_offset_list_query(query.page, query.page_size) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let q = match normalize_list_search_query(query.q, "q") {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };

    match state
        .store
        .list_users(ListAdminUsersQuery {
            subject,
            q,
            page_no: pagination.page_no,
            page_size: pagination.page_size,
            offset: pagination.offset,
        })
        .await
    {
        Ok(page) => json_success_list_response(
            None,
            page.items,
            offset_page_info(page.page_no, page.page_size, page.total),
        ),
        Err(error) => admin_user_system_response("admin user read model is unavailable", error),
    }
}

async fn fetch_api_keys_map(
    State(state): State<AdminUserState>,
    Query(query): Query<ApiKeysListQuery>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject: AdminUserSubject = scoped.into();
    let pagination = match parse_offset_list_query(query.page, query.page_size) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };

    match state
        .store
        .list_api_keys(ListAdminUserApiKeysQuery {
            subject,
            page_no: pagination.page_no,
            page_size: pagination.page_size,
            offset: pagination.offset,
        })
        .await
    {
        Ok(page) => json_success_list_response(
            None,
            page.items,
            offset_page_info(page.page_no, page.page_size, page.total),
        ),
        Err(error) => admin_user_system_response("admin api key read model is unavailable", error),
    }
}

async fn create_user(
    State(state): State<AdminUserState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject: AdminUserSubject = scoped.into();
    let request = match parse_json_body::<CreateUserRequest>(&body, "user request body is required")
    {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let email = match normalize_email(request.email.as_deref()) {
        Ok(email) => email,
        Err(message) => return bad_request(message),
    };
    let username = match normalize_username_for_create(request.username.as_deref(), &email) {
        Ok(username) => username,
        Err(message) => return bad_request(message),
    };
    let initial_balance = match normalize_money(request.balance.as_ref(), "balance", true) {
        Ok(amount) => amount,
        Err(message) => return bad_request(message),
    };
    let requested_at = current_timestamp_string();
    let request_id = match server_request_id() {
        Ok(value) => value,
        Err(response) => return response,
    };
    let command = match build_create_user_command(
        &state,
        subject,
        email,
        username,
        initial_balance,
        requested_at,
        request_id,
    ) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };

    match state.store.create_user(command).await {
        Ok(item) => Json(success_envelope(AdminUserItemEnvelope { item })).into_response(),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => admin_user_system_response("admin user command store is unavailable", error),
    }
}

async fn update_user(
    State(state): State<AdminUserState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject: AdminUserSubject = scoped.into();
    let request = match parse_json_body::<UpdateUserRequest>(&body, "user request body is required")
    {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let user_id = match positive_id(request.id, "id") {
        Ok(id) => id,
        Err(message) => return bad_request(message),
    };

    update_user_with_request(state, subject, user_id, request).await
}

async fn update_user_with_request(
    state: AdminUserState,
    subject: AdminUserSubject,
    user_id: i64,
    request: UpdateUserRequest,
) -> Response {
    let username =
        match normalize_optional_name(request.username.as_deref(), "username", MAX_USERNAME_LEN) {
            Ok(value) => value,
            Err(message) => return bad_request(message),
        };
    let group = match normalize_optional_name(request.group.as_deref(), "group", MAX_GROUP_LEN) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let status = match normalize_optional_status(request.status.as_deref()) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let requested_at = current_timestamp_string();
    let request_id = match server_request_id() {
        Ok(value) => value,
        Err(response) => return response,
    };
    let audit_log_uuid = match state.secret_generator.generate_entity_uuid() {
        Ok(value) => value,
        Err(error) => return command_build_error_response(error),
    };

    let command = UpdateAdminUserCommand {
        audit_log_uuid,
        subject,
        user_id,
        username,
        group,
        status,
        requested_at,
        request_id,
    };

    match state.store.update_user(command).await {
        Ok(Some(item)) => Json(success_envelope(AdminUserItemEnvelope { item })).into_response(),
        Ok(None) => not_found_response("user was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => admin_user_system_response("admin user command store is unavailable", error),
    }
}

async fn adjust_balance(
    State(state): State<AdminUserState>,
    Path(user_id): Path<i64>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject: AdminUserSubject = scoped.into();
    let user_id = match positive_path_id(user_id, "userId") {
        Ok(id) => id,
        Err(message) => return bad_request(message),
    };
    let request = match parse_json_body::<BalanceAdjustmentRequest>(
        &body,
        "balance adjustment request body is required",
    ) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let amount = match normalize_money(request.amount.as_ref(), "amount", false) {
        Ok(amount) => amount,
        Err(message) => return bad_request(message),
    };
    let adjustment_type = match normalize_adjustment_type(request.adjustment_type.as_deref()) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let requested_at = current_timestamp_string();
    let request_id = match server_request_id() {
        Ok(value) => value,
        Err(response) => return response,
    };
    let account_uuid = match state.secret_generator.generate_entity_uuid() {
        Ok(value) => value,
        Err(error) => return command_build_error_response(error),
    };
    let account_history_uuid = match state.secret_generator.generate_entity_uuid() {
        Ok(value) => value,
        Err(error) => return command_build_error_response(error),
    };
    let audit_log_uuid = match state.secret_generator.generate_entity_uuid() {
        Ok(value) => value,
        Err(error) => return command_build_error_response(error),
    };

    let command = AdjustAdminUserBalanceCommand {
        account_uuid,
        account_history_uuid,
        audit_log_uuid,
        subject,
        user_id,
        amount,
        adjustment_type,
        requested_at,
        request_id,
    };

    match state.store.adjust_balance(command).await {
        Ok(Some(item)) => Json(success_envelope(AdminUserItemEnvelope { item })).into_response(),
        Ok(None) => not_found_response("user was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => admin_user_system_response("admin user balance store is unavailable", error),
    }
}

async fn create_api_key(
    State(state): State<AdminUserState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject: AdminUserSubject = scoped.into();
    let request =
        match parse_json_body::<CreateApiKeyRequest>(&body, "api key request body is required") {
            Ok(request) => request,
            Err(message) => return bad_request(message),
        };
    let user_id = match positive_id(request.user_id, "userId") {
        Ok(id) => id,
        Err(message) => return bad_request(message),
    };
    let name = match normalize_required_name(request.name.as_deref(), "name", MAX_API_KEY_NAME_LEN)
    {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let raw_key = match state.secret_generator.generate_api_key_secret() {
        Ok(value) => value,
        Err(error) => return command_build_error_response(error),
    };
    let key_hash = match state.api_key_hasher.hash_secret(&raw_key) {
        Ok(value) => value,
        Err(error) => return command_build_error_response(error),
    };
    let requested_at = current_timestamp_string();
    let request_id = match server_request_id() {
        Ok(value) => value,
        Err(response) => return response,
    };
    let idempotency_key = match normalize_idempotency_key(&headers, state.secret_generator.as_ref())
    {
        Ok(value) => value,
        Err(error) => return command_build_error_response(error),
    };
    let command = match build_create_api_key_command(
        &state,
        subject,
        user_id,
        name,
        &raw_key,
        key_hash,
        requested_at,
        request_id,
        idempotency_key,
    ) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };

    match state.store.create_api_key(command).await {
        Ok(key) => json_created_response(None, AdminUserApiKeyCreateResponse { key, raw_key }),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) if error.is_not_found() => not_found_response(&error.to_string()),
        Err(error) => {
            admin_user_system_response("admin api key command store is unavailable", error)
        }
    }
}

async fn delete_api_key(
    State(state): State<AdminUserState>,
    Path(api_key_id): Path<i64>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject: AdminUserSubject = scoped.into();
    let api_key_id = match positive_path_id(api_key_id, "apiKeyId") {
        Ok(id) => id,
        Err(message) => return bad_request(message),
    };
    let requested_at = current_timestamp_string();
    let request_id = match server_request_id() {
        Ok(value) => value,
        Err(response) => return response,
    };
    let audit_log_uuid = match state.secret_generator.generate_entity_uuid() {
        Ok(value) => value,
        Err(error) => return command_build_error_response(error),
    };

    let command = DeleteAdminUserApiKeyCommand {
        audit_log_uuid,
        subject,
        api_key_id,
        requested_at,
        request_id,
    };

    match state.store.delete_api_key(command).await {
        Ok(true) => no_content_response(None),
        Ok(false) => not_found_response("api key was not found"),
        Err(error) => {
            admin_user_system_response("admin api key command store is unavailable", error)
        }
    }
}

async fn create_backend_api_key(
    State(state): State<AdminApiKeyCommandState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject: AdminUserSubject = scoped.into();
    let request =
        match parse_json_body::<CreateApiKeyRequest>(&body, "api key request body is required") {
            Ok(request) => request,
            Err(message) => return bad_request(message),
        };
    let user_id = match positive_id(request.user_id, "userId") {
        Ok(id) => id,
        Err(message) => return bad_request(message),
    };
    let name = match normalize_required_name(request.name.as_deref(), "name", MAX_API_KEY_NAME_LEN)
    {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let raw_key = match state.secret_generator.generate_api_key_secret() {
        Ok(value) => value,
        Err(error) => return command_build_error_response(error),
    };
    let key_hash = match state.api_key_hasher.hash_secret(&raw_key) {
        Ok(value) => value,
        Err(error) => return command_build_error_response(error),
    };
    let requested_at = current_timestamp_string();
    let request_id = match server_request_id() {
        Ok(value) => value,
        Err(response) => return response,
    };
    let idempotency_key = match normalize_idempotency_key(&headers, state.secret_generator.as_ref())
    {
        Ok(value) => value,
        Err(error) => return command_build_error_response(error),
    };
    let group_uuid = match state.secret_generator.generate_entity_uuid() {
        Ok(value) => value,
        Err(error) => return command_build_error_response(error),
    };
    let group = match state
        .command_store
        .ensure_default_channel_group(EnsureDefaultChannelGroupCommand {
            group_uuid,
            tenant_id: subject.tenant_id,
            organization_id: subject.organization_id,
            code: DEFAULT_CHANNEL_GROUP_CODE.to_owned(),
            name: DEFAULT_CHANNEL_GROUP_NAME.to_owned(),
            pricing_plan_code: DEFAULT_PRICING_PLAN_CODE.to_owned(),
            rate_multiplier: DecimalValue::ONE,
            official_price_multiplier: DecimalValue::ONE,
            requested_at: requested_at.clone(),
        })
        .await
    {
        Ok(group) => group,
        Err(error) => {
            return admin_user_system_response("admin api key command store is unavailable", error);
        }
    };
    let command = match build_backend_create_api_key_command(
        &state,
        subject,
        user_id,
        group.id,
        name,
        &raw_key,
        key_hash,
        requested_at,
        request_id,
        idempotency_key,
    ) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };

    match state.command_store.create_gateway_api_key(command).await {
        Ok(created) => json_created_response(
            None,
            AdminUserApiKeyCreateResponse {
                key: admin_api_key_item_from_gateway(created.api_key),
                raw_key,
            },
        ),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            admin_user_system_response("admin api key command store is unavailable", error)
        }
    }
}

async fn delete_backend_api_key(
    State(state): State<AdminApiKeyCommandState>,
    Path(api_key_id): Path<i64>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject: AdminUserSubject = scoped.into();
    let api_key_id = match positive_path_id(api_key_id, "apiKeyId") {
        Ok(id) => id,
        Err(message) => return bad_request(message),
    };
    let requested_at = current_timestamp_string();
    let request_id = match server_request_id() {
        Ok(value) => value,
        Err(response) => return response,
    };
    let audit_log_uuid = match state.secret_generator.generate_entity_uuid() {
        Ok(value) => value,
        Err(error) => return command_build_error_response(error),
    };

    let command = DeleteGatewayApiKeyForOrganizationCommand {
        audit_log_uuid,
        tenant_id: subject.tenant_id,
        organization_id: subject.organization_id,
        operator_id: subject.operator_id,
        operator_type: subject.operator_type,
        api_key_id,
        requested_at,
        request_id,
    };

    match state
        .command_store
        .delete_gateway_api_key_for_organization(command)
        .await
    {
        Ok(true) => no_content_response(None),
        Ok(false) => not_found_response("api key was not found"),
        Err(error) => {
            admin_user_system_response("admin api key command store is unavailable", error)
        }
    }
}

fn build_create_user_command(
    state: &AdminUserState,
    subject: AdminUserSubject,
    email: String,
    username: String,
    initial_balance: DecimalValue,
    requested_at: String,
    request_id: String,
) -> Result<CreateAdminUserCommand, DomainError> {
    Ok(CreateAdminUserCommand {
        user_uuid: state.secret_generator.generate_entity_uuid()?,
        account_uuid: state.secret_generator.generate_entity_uuid()?,
        audit_log_uuid: state.secret_generator.generate_entity_uuid()?,
        subject,
        email,
        username,
        initial_balance,
        requested_at,
        request_id,
    })
}

fn build_create_api_key_command(
    state: &AdminUserState,
    subject: AdminUserSubject,
    user_id: i64,
    name: String,
    raw_key: &str,
    key_hash: String,
    requested_at: String,
    request_id: String,
    idempotency_key: String,
) -> Result<CreateAdminUserApiKeyCommand, DomainError> {
    Ok(CreateAdminUserApiKeyCommand {
        api_key_uuid: state.secret_generator.generate_entity_uuid()?,
        audit_log_uuid: state.secret_generator.generate_entity_uuid()?,
        subject,
        user_id,
        name,
        key_prefix: key_prefix(raw_key),
        key_display_masked: mask_created_key(raw_key),
        key_hash,
        hash_alg: HASH_ALG_HMAC_SHA256.to_owned(),
        secret_version: SECRET_VERSION,
        idempotency_key,
        requested_at,
        request_id,
    })
}

fn build_backend_create_api_key_command(
    state: &AdminApiKeyCommandState,
    subject: AdminUserSubject,
    user_id: i64,
    group_id: i64,
    name: String,
    raw_key: &str,
    key_hash: String,
    requested_at: String,
    request_id: String,
    idempotency_key: String,
) -> Result<CreateGatewayApiKeyCommand, DomainError> {
    Ok(CreateGatewayApiKeyCommand {
        api_key_uuid: state.secret_generator.generate_entity_uuid()?,
        access_policy_uuid: state.secret_generator.generate_entity_uuid()?,
        quota_policy_uuid: state.secret_generator.generate_entity_uuid()?,
        audit_log_uuid: state.secret_generator.generate_entity_uuid()?,
        tenant_id: subject.tenant_id,
        organization_id: subject.organization_id,
        user_id,
        operator_id: subject.operator_id,
        operator_type: subject.operator_type,
        name,
        group_id,
        key_prefix: key_prefix(raw_key),
        key_display_masked: mask_created_key(raw_key),
        key_hash,
        copyable_key: raw_key.to_owned(),
        hash_alg: HASH_ALG_HMAC_SHA256.to_owned(),
        secret_version: SECRET_VERSION,
        request_id,
        idempotency_key,
        created_at: requested_at,
        expire_at: None,
        allowed_capabilities: Vec::new(),
        ip_allowlist: Vec::new(),
        quota_limit: None,
        default_for_runtime: false,
    })
}

fn admin_api_key_item_from_gateway(api_key: GatewayApiKey) -> AdminUserApiKeyItem {
    AdminUserApiKeyItem {
        id: api_key.id,
        user_id: api_key.user_id,
        name: api_key.display_name(),
        key: api_key.masked_key(),
        used: "0.000000".to_owned(),
        status: api_key.status_label().to_owned(),
    }
}

fn parse_json_body<T>(body: &[u8], empty_message: &str) -> Result<T, String>
where
    T: for<'de> Deserialize<'de>,
{
    if body.iter().all(u8::is_ascii_whitespace) {
        return Err(empty_message.to_owned());
    }
    serde_json::from_slice(body).map_err(|error| format!("invalid request body: {error}"))
}

fn normalize_email(value: Option<&str>) -> Result<String, String> {
    let email = value.unwrap_or("").trim().to_ascii_lowercase();
    if email.is_empty() {
        return Err("email is required".to_owned());
    }
    if email.chars().count() > MAX_EMAIL_LEN {
        return Err("email must be at most 255 characters".to_owned());
    }
    if !email.contains('@') {
        return Err("email must be valid".to_owned());
    }
    Ok(email)
}

fn normalize_username_for_create(value: Option<&str>, email: &str) -> Result<String, String> {
    let username = value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .unwrap_or_else(|| email.split('@').next().unwrap_or("user").to_owned());
    normalize_required_name(Some(&username), "username", MAX_USERNAME_LEN)
}

fn normalize_required_name(
    value: Option<&str>,
    field: &str,
    max_len: usize,
) -> Result<String, String> {
    let value = value.unwrap_or("").trim();
    if value.is_empty() {
        return Err(format!("{field} is required"));
    }
    if value.chars().count() > max_len {
        return Err(format!("{field} must be at most {max_len} characters"));
    }
    Ok(value.to_owned())
}

fn normalize_optional_name(
    value: Option<&str>,
    field: &str,
    max_len: usize,
) -> Result<Option<String>, String> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    if value.chars().count() > max_len {
        return Err(format!("{field} must be at most {max_len} characters"));
    }
    Ok(Some(value.to_owned()))
}

fn normalize_optional_status(value: Option<&str>) -> Result<Option<String>, String> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    match value.to_ascii_lowercase().as_str() {
        "active" => Ok(Some("active".to_owned())),
        "banned" | "inactive" | "disabled" => Ok(Some("banned".to_owned())),
        _ => Err("status must be active or banned".to_owned()),
    }
}

fn normalize_adjustment_type(value: Option<&str>) -> Result<String, String> {
    match value.unwrap_or("").trim().to_ascii_lowercase().as_str() {
        "recharge" => Ok("recharge".to_owned()),
        "refund" => Ok("refund".to_owned()),
        _ => Err("type must be recharge or refund".to_owned()),
    }
}

fn normalize_money(
    value: Option<&Value>,
    field: &str,
    allow_zero: bool,
) -> Result<DecimalValue, String> {
    let raw = match value {
        Some(Value::String(value)) => value.clone(),
        Some(Value::Number(value)) => value.to_string(),
        Some(_) => return Err(format!("{field} must be a decimal number")),
        None if allow_zero => return Ok(DecimalValue::ZERO),
        None => return Err(format!("{field} is required")),
    };
    let normalized = raw.trim().trim_start_matches('$').replace(',', "");
    let amount = DecimalValue::parse(&normalized).map_err(|error| error.to_string())?;
    if amount < DecimalValue::ZERO {
        return Err(format!("{field} must not be negative"));
    }
    if !allow_zero && amount == DecimalValue::ZERO {
        return Err(format!("{field} must be greater than zero"));
    }
    Ok(amount)
}

fn positive_id(value: Option<i64>, field: &str) -> Result<i64, String> {
    positive_path_id(value.unwrap_or(0), field)
}

fn positive_path_id(value: i64, field: &str) -> Result<i64, String> {
    if value <= 0 {
        Err(format!("{field} must be a positive integer"))
    } else {
        Ok(value)
    }
}

fn server_request_id() -> Result<String, Response> {
    generate_server_request_id().map_err(|error| match error {
        RequestIdError::Invalid(message) => bad_request(message),
        RequestIdError::System(message) => command_build_error_response(DomainError::new(message)),
    })
}

fn normalize_idempotency_key(
    headers: &HeaderMap,
    secret_generator: &(dyn ApiKeySecretGenerator + Send + Sync),
) -> Result<String, DomainError> {
    if let Some(value) = header_value(headers, IDEMPOTENCY_KEY_HEADER) {
        return validate_request_token(value, IDEMPOTENCY_KEY_HEADER);
    }
    secret_generator.generate_entity_uuid()
}

fn header_value<'a>(headers: &'a HeaderMap, name: &str) -> Option<&'a str> {
    headers
        .get(name)
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

fn validate_request_token(value: &str, field: &str) -> Result<String, DomainError> {
    if value.chars().count() > 128 {
        return Err(DomainError::new(format!(
            "{field} must be at most 128 characters"
        )));
    }
    if !value.bytes().all(|byte| (0x21..=0x7e).contains(&byte)) {
        return Err(DomainError::new(format!(
            "{field} must contain only visible ASCII characters"
        )));
    }
    Ok(value.to_owned())
}

fn key_prefix(raw_key: &str) -> String {
    raw_key.chars().take(16).collect()
}

fn mask_created_key(raw_key: &str) -> String {
    let prefix: String = raw_key.chars().take(16).collect();
    let mut suffix_chars: Vec<char> = raw_key.chars().rev().take(4).collect();
    suffix_chars.reverse();
    let suffix: String = suffix_chars.into_iter().collect();
    format!("{prefix}********{suffix}")
}

fn current_timestamp_string() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0);
    format_unix_timestamp(seconds)
}

fn format_unix_timestamp(seconds: i64) -> String {
    let days = seconds.div_euclid(86_400);
    let seconds_of_day = seconds.rem_euclid(86_400);
    let (year, month, day) = civil_from_days(days);
    let hour = seconds_of_day / 3_600;
    let minute = (seconds_of_day % 3_600) / 60;
    let second = seconds_of_day % 60;
    format!("{year:04}-{month:02}-{day:02} {hour:02}:{minute:02}:{second:02}")
}

fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let days = days + 719_468;
    let era = if days >= 0 { days } else { days - 146_096 } / 146_097;
    let day_of_era = days - era * 146_097;
    let year_of_era =
        (day_of_era - day_of_era / 1_460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let year = year_of_era + era * 400;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_prime = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * month_prime + 2) / 5 + 1;
    let month = month_prime + if month_prime < 10 { 3 } else { -9 };
    let year = year + if month <= 2 { 1 } else { 0 };
    (year, month, day)
}

fn bad_request(message: String) -> Response {
    problem_from_wire_code("4001", message).into_response()
}

fn not_found_response(message: &str) -> Response {
    problem_from_wire_code("4040", message).into_response()
}

fn conflict_response(error: DomainError) -> Response {
    problem_from_wire_code("4090", error.to_string()).into_response()
}

fn command_build_error_response(error: DomainError) -> Response {
    problem_from_wire_code("5000", error.to_string()).into_response()
}

fn admin_user_system_response(context: &str, error: DomainError) -> Response {
    problem_from_wire_code("5000", format!("{context}: {error}")).into_response()
}
