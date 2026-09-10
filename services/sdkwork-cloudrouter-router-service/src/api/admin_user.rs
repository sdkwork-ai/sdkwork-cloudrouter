use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Bytes;
use axum::extract::{Path, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::routing::{delete, post};
use axum::Router;
use serde::{Deserialize, Serialize};

use crate::api::request_id::{generate_server_request_id, RequestIdError};
use crate::api::response::{json_created_response, no_content_response, problem_from_wire_code};
use crate::application::{ApiKeySecretGenerator, ApiKeySecretHasher};
use crate::domain::{DecimalValue, DomainError, GatewayApiKey};
use crate::ports::{
    AccountGroupBindingInput, AdminUserApiKeyItem, AdminUserSubject, CreateGatewayApiKeyCommand,
    DeleteGatewayApiKeyForOrganizationCommand, EnsureDefaultUpstreamAccountGroupCommand,
    GatewayApiKeyCommandStore,
};

const HASH_ALG_HMAC_SHA256: &str = "HMAC_SHA256";
const SECRET_VERSION: i64 = 1;
const IDEMPOTENCY_KEY_HEADER: &str = "Idempotency-Key";
const MAX_API_KEY_NAME_LEN: usize = 128;
const DEFAULT_ACCOUNT_GROUP_CODE: &str = "default-group";
const DEFAULT_ACCOUNT_GROUP_NAME: &str = "Default";
const DEFAULT_PRICING_PLAN_CODE: &str = "standard";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminUserApiKeyCreateResponse {
    key: AdminUserApiKeyItem,
    raw_key: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateApiKeyRequest {
    user_id: Option<i64>,
    name: Option<String>,
}

#[derive(Clone)]
struct AdminApiKeyCommandState {
    command_store: Arc<dyn GatewayApiKeyCommandStore + Send + Sync>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    secret_generator: Arc<dyn ApiKeySecretGenerator + Send + Sync>,
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
        Err(error) => return error.into_response(),
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
        .ensure_default_upstream_account_group(EnsureDefaultUpstreamAccountGroupCommand {
            group_uuid,
            tenant_id: subject.tenant_id,
            organization_id: subject.organization_id,
            code: DEFAULT_ACCOUNT_GROUP_CODE.to_owned(),
            name: DEFAULT_ACCOUNT_GROUP_NAME.to_owned(),
            pricing_plan_code: DEFAULT_PRICING_PLAN_CODE.to_owned(),
            cost_multiplier: DecimalValue::ONE,
            sale_multiplier: DecimalValue::ONE,
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
        group.id,
        CreateApiKeyCommandInput {
            subject,
            user_id,
            name,
            raw_key: &raw_key,
            key_hash,
            requested_at,
            request_id,
            idempotency_key,
        },
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
        Err(error) => return error.into_response(),
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

struct CreateApiKeyCommandInput<'a> {
    subject: AdminUserSubject,
    user_id: i64,
    name: String,
    raw_key: &'a str,
    key_hash: String,
    requested_at: String,
    request_id: String,
    idempotency_key: String,
}

fn build_backend_create_api_key_command(
    state: &AdminApiKeyCommandState,
    group_id: i64,
    input: CreateApiKeyCommandInput<'_>,
) -> Result<CreateGatewayApiKeyCommand, DomainError> {
    let CreateApiKeyCommandInput {
        subject,
        user_id,
        name,
        raw_key,
        key_hash,
        requested_at,
        request_id,
        idempotency_key,
    } = input;
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
        account_group_bindings: vec![AccountGroupBindingInput {
            group_id,
            priority: 100,
            routing_strategy: "price_first".to_owned(),
            weight: 100,
        }],
        key_prefix: key_prefix(raw_key),
        key_display_masked: mask_created_key(raw_key),
        key_hash,
        raw_key: raw_key.to_owned(),
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

fn server_request_id() -> Result<String, crate::api::response::ApiResponseError> {
    generate_server_request_id().map_err(|error| match error {
        RequestIdError::Invalid(message) => bad_request(message).into(),
        RequestIdError::System(message) => {
            command_build_error_response(DomainError::new(message)).into()
        }
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
    let month = month_prime + if month_prime < 10 { 3 } else { -9 };
    let year = year + if month <= 2 { 1 } else { 0 };
    let day = day_of_era - (365 * year + year_of_era / 4 - year_of_era / 100);
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
