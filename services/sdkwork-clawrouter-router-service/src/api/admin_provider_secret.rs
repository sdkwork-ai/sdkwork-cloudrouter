use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;

use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{delete, get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use crate::api::request_id::{generate_server_request_id, RequestIdError};
use crate::api::response::PlusApiResult;
use crate::application::EntityUuidGenerator;
use crate::domain::DomainError;
use crate::ports::{
    AdminProviderSecretItem, AdminProviderSecretStore, AdminProviderSecretSubject,
    CreateAdminProviderSecretCommand, DeleteAdminProviderSecretCommand,
    ListAdminProviderSecretsQuery, UpdateAdminProviderSecretCommand,
};

const MAX_PROVIDER_CODE_LEN: usize = 64;
const MAX_NAME_LEN: usize = 128;
const MAX_AUTH_TYPE_LEN: usize = 64;
const MAX_SECRET_REF_LEN: usize = 256;

#[derive(Clone)]
struct AdminProviderSecretState {
    store: Arc<dyn AdminProviderSecretStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedListRequest {
    provider_code: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
struct ProviderSecretListQuery {
    provider_code: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedCreateRequest {
    provider_code: String,
    name: String,
    auth_type: String,
    secret_ref: String,
    masked_label: String,
    status: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedUpdateRequest {
    secret_id: i64,
    provider_code: Option<String>,
    name: Option<String>,
    auth_type: Option<String>,
    secret_ref: Option<String>,
    masked_label: Option<String>,
    status: Option<String>,
}

enum ProviderSecretCommandBuildError {
    BadRequest(String),
    System(DomainError),
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminProviderSecretListResponse {
    items: Vec<AdminProviderSecretItemResponse>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminProviderSecretItemEnvelope {
    item: AdminProviderSecretItemResponse,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminProviderSecretDeleteResponse {
    deleted: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminProviderSecretItemResponse {
    id: String,
    provider_code: String,
    account_code: String,
    name: String,
    auth_type: String,
    secret_ref: String,
    masked_label: String,
    status: String,
    created_at: String,
    updated_at: String,
}

pub fn admin_provider_secret_router_with_store(
    store: Arc<dyn AdminProviderSecretStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/provider_secrets",
            post(create_provider_secret).put(update_provider_secret),
        )
        .route(
            "/backend/v3/api/provider_secrets/list",
            post(fetch_provider_secrets),
        )
        .route(
            "/backend/v3/api/provider_secrets/{secret_id}",
            delete(delete_provider_secret),
        )
        .route(
            "/backend/v3/api/integration/provider_secrets",
            get(fetch_provider_secrets_from_query)
                .post(create_provider_secret)
                .put(update_provider_secret),
        )
        .route(
            "/backend/v3/api/integration/provider_secrets/{secret_id}",
            delete(delete_provider_secret),
        )
        .with_state(AdminProviderSecretState {
            store,
            entity_uuid_generator,
        })
}

async fn fetch_provider_secrets(
    State(state): State<AdminProviderSecretState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_object(&body, "provider secret list body is invalid", true) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let request = match normalize_list_request(request) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };

    match state
        .store
        .list_provider_secrets(ListAdminProviderSecretsQuery {
            subject,
            provider_code: request.provider_code,
            status: request.status,
        })
        .await
    {
        Ok(items) => Json(PlusApiResult::success(AdminProviderSecretListResponse {
            items: items.into_iter().map(to_item_response).collect(),
        }))
        .into_response(),
        Err(error) => {
            provider_secret_system_response("provider secret read model is unavailable", error)
        }
    }
}

async fn fetch_provider_secrets_from_query(
    State(state): State<AdminProviderSecretState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<ProviderSecretListQuery>,
) -> Response {
    let subject = scoped.into();
    let request = match normalize_list_query(query) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };

    match state
        .store
        .list_provider_secrets(ListAdminProviderSecretsQuery {
            subject,
            provider_code: request.provider_code,
            status: request.status,
        })
        .await
    {
        Ok(items) => Json(PlusApiResult::success(AdminProviderSecretListResponse {
            items: items.into_iter().map(to_item_response).collect(),
        }))
        .into_response(),
        Err(error) => {
            provider_secret_system_response("provider secret read model is unavailable", error)
        }
    }
}

async fn create_provider_secret(
    State(state): State<AdminProviderSecretState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_object(&body, "provider secret request body is required", false)
    {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let request = match normalize_create_request(request) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match build_create_command(state.clone(), &headers, subject, request) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };

    match state.store.create_provider_secret(command).await {
        Ok(item) => Json(PlusApiResult::success(AdminProviderSecretItemEnvelope {
            item: to_item_response(item),
        }))
        .into_response(),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            provider_secret_system_response("provider secret command store is unavailable", error)
        }
    }
}

async fn update_provider_secret(
    State(state): State<AdminProviderSecretState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_object(&body, "provider secret update body is required", false) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let request = match normalize_update_request(request) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match build_update_command(state.clone(), &headers, subject, request) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };

    match state.store.update_provider_secret(command).await {
        Ok(Some(item)) => Json(PlusApiResult::success(AdminProviderSecretItemEnvelope {
            item: to_item_response(item),
        }))
        .into_response(),
        Ok(None) => not_found_response("provider secret was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            provider_secret_system_response("provider secret command store is unavailable", error)
        }
    }
}

async fn delete_provider_secret(
    State(state): State<AdminProviderSecretState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(secret_id): Path<String>,
) -> Response {
    let subject = scoped.into();
    let secret_id = match parse_positive_id(&secret_id, "provider secret id") {
        Ok(secret_id) => secret_id,
        Err(message) => return bad_request(message),
    };
    let command = match build_delete_command(state.clone(), &headers, subject, secret_id) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };

    match state.store.delete_provider_secret(command).await {
        Ok(true) => Json(PlusApiResult::success(AdminProviderSecretDeleteResponse {
            deleted: true,
        }))
        .into_response(),
        Ok(false) => not_found_response("provider secret was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            provider_secret_system_response("provider secret command store is unavailable", error)
        }
    }
}


fn parse_json_object(
    body: &[u8],
    required_message: &'static str,
    allow_empty: bool,
) -> Result<Map<String, Value>, String> {
    if body.iter().all(u8::is_ascii_whitespace) {
        return if allow_empty {
            Ok(Map::new())
        } else {
            Err(required_message.to_owned())
        };
    }
    match serde_json::from_slice::<Value>(body)
        .map_err(|error| format!("invalid provider secret request body: {error}"))?
    {
        Value::Object(object) => Ok(object),
        _ => Err("provider secret request body must be a JSON object".to_owned()),
    }
}

fn normalize_list_request(request: Map<String, Value>) -> Result<NormalizedListRequest, String> {
    let provider_code = optional_any_text(
        &request,
        &["providerCode", "vendor"],
        "provider code",
        MAX_PROVIDER_CODE_LEN,
    )?
    .map(|value| normalize_provider_code(&value))
    .transpose()?;
    let status = optional_text(&request, "status", "provider secret status", 32)?
        .map(|status| normalize_status(&status))
        .transpose()?;
    Ok(NormalizedListRequest {
        provider_code,
        status,
    })
}

fn normalize_list_query(query: ProviderSecretListQuery) -> Result<NormalizedListRequest, String> {
    let provider_code = query
        .provider_code
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(normalize_provider_code)
        .transpose()?;
    let status = query
        .status
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(normalize_status)
        .transpose()?;
    Ok(NormalizedListRequest {
        provider_code,
        status,
    })
}

fn normalize_create_request(
    request: Map<String, Value>,
) -> Result<NormalizedCreateRequest, String> {
    reject_plaintext_secret_values(&request)?;
    let provider_code = normalize_provider_code(&required_any_text(
        &request,
        &["providerCode", "vendor"],
        "provider code",
        MAX_PROVIDER_CODE_LEN,
    )?)?;
    let name = required_any_text(
        &request,
        &["name", "accountName"],
        "provider secret name",
        MAX_NAME_LEN,
    )?;
    let auth_type = optional_any_text(
        &request,
        &["authType", "accessType"],
        "provider secret authType",
        MAX_AUTH_TYPE_LEN,
    )?
    .unwrap_or_else(|| "api-key".to_owned());
    let auth_type = normalize_auth_type(&auth_type);
    let secret_ref = required_text(&request, "secretRef", "secretRef", MAX_SECRET_REF_LEN)?;
    validate_secret_ref(&secret_ref)?;
    let status = optional_text(&request, "status", "provider secret status", 32)?
        .unwrap_or_else(|| "active".to_owned());
    let status = normalize_status(&status)?;

    Ok(NormalizedCreateRequest {
        provider_code,
        name,
        auth_type,
        masked_label: mask_secret_ref(&secret_ref),
        secret_ref,
        status,
    })
}

fn normalize_update_request(
    request: Map<String, Value>,
) -> Result<NormalizedUpdateRequest, String> {
    reject_plaintext_secret_values(&request)?;
    let secret_id = parse_positive_id(
        &required_text(&request, "id", "provider secret id", 64)?,
        "provider secret id",
    )?;
    let provider_code = optional_any_text(
        &request,
        &["providerCode", "vendor"],
        "provider code",
        MAX_PROVIDER_CODE_LEN,
    )?
    .map(|value| normalize_provider_code(&value))
    .transpose()?;
    let name = optional_any_text(
        &request,
        &["name", "accountName"],
        "provider secret name",
        MAX_NAME_LEN,
    )?;
    let auth_type = optional_any_text(
        &request,
        &["authType", "accessType"],
        "provider secret authType",
        MAX_AUTH_TYPE_LEN,
    )?
    .map(|value| normalize_auth_type(&value));
    let secret_ref = optional_text(&request, "secretRef", "secretRef", MAX_SECRET_REF_LEN)?;
    if let Some(secret_ref) = secret_ref.as_deref() {
        validate_secret_ref(secret_ref)?;
    }
    let masked_label = secret_ref
        .as_ref()
        .map(|secret_ref| mask_secret_ref(secret_ref));
    let status = optional_text(&request, "status", "provider secret status", 32)?
        .map(|status| normalize_status(&status))
        .transpose()?;

    if provider_code.is_none()
        && name.is_none()
        && auth_type.is_none()
        && secret_ref.is_none()
        && status.is_none()
    {
        return Err("provider secret update must include at least one editable field".to_owned());
    }

    Ok(NormalizedUpdateRequest {
        secret_id,
        provider_code,
        name,
        auth_type,
        secret_ref,
        masked_label,
        status,
    })
}

fn reject_plaintext_secret_values(request: &Map<String, Value>) -> Result<(), String> {
    for (key, value) in request {
        if !is_plaintext_secret_key(key) {
            continue;
        }
        let has_plaintext = match value {
            Value::String(value) => !value.trim().is_empty(),
            Value::Null => false,
            _ => true,
        };
        if has_plaintext {
            return Err(
                "plaintext provider secret values are not accepted; store secret material in Vault/KMS and submit only secretRef"
                    .to_owned(),
            );
        }
    }
    Ok(())
}

fn is_plaintext_secret_key(key: &str) -> bool {
    let normalized = key
        .chars()
        .filter(|character| *character != '_' && *character != '-')
        .flat_map(char::to_lowercase)
        .collect::<String>();
    matches!(
        normalized.as_str(),
        "secretvalue"
            | "apikey"
            | "authkey"
            | "token"
            | "accesstoken"
            | "refreshtoken"
            | "privatekey"
            | "clientsecret"
    )
}

fn required_any_text(
    request: &Map<String, Value>,
    keys: &[&str],
    field_name: &str,
    max_len: usize,
) -> Result<String, String> {
    optional_any_text(request, keys, field_name, max_len)?
        .ok_or_else(|| format!("{field_name} is required"))
}

fn optional_any_text(
    request: &Map<String, Value>,
    keys: &[&str],
    field_name: &str,
    max_len: usize,
) -> Result<Option<String>, String> {
    for key in keys {
        if request.contains_key(*key) {
            return optional_text(request, key, field_name, max_len);
        }
    }
    Ok(None)
}

fn required_text(
    request: &Map<String, Value>,
    key: &str,
    field_name: &str,
    max_len: usize,
) -> Result<String, String> {
    optional_text(request, key, field_name, max_len)?
        .ok_or_else(|| format!("{field_name} is required"))
}

fn optional_text(
    request: &Map<String, Value>,
    key: &str,
    field_name: &str,
    max_len: usize,
) -> Result<Option<String>, String> {
    let Some(value) = request.get(key) else {
        return Ok(None);
    };
    match value {
        Value::String(value) => {
            let value = value.trim();
            if value.is_empty() {
                return Ok(None);
            }
            if value.chars().count() > max_len {
                return Err(format!("{field_name} must be at most {max_len} characters"));
            }
            Ok(Some(value.to_owned()))
        }
        Value::Null => Ok(None),
        _ => Err(format!("{field_name} must be a string")),
    }
}

fn normalize_provider_code(value: &str) -> Result<String, String> {
    let normalized = value.trim().to_ascii_lowercase();
    let code = match normalized.as_str() {
        "openai" => "openai",
        "anthropic" => "anthropic",
        "gemini" | "google" | "google gemini" | "google (gemini)" => "google",
        "openrouter" => "openrouter",
        "deepseek" => "deepseek",
        "zhipu" | "zhipuai" | "zhipu ai" => "zhipu",
        "mistral" | "mistral ai" => "mistral",
        "meta" | "meta (llama)" | "llama" => "meta",
        "ollama" => "ollama",
        "azure" | "azure openai" => "azure_openai",
        "custom" => "custom",
        _ => normalized.as_str(),
    };
    if code.is_empty() || code.len() > MAX_PROVIDER_CODE_LEN {
        return Err("provider code is invalid".to_owned());
    }
    if !code
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
    {
        return Err("provider code may only contain letters, numbers, -, and _".to_owned());
    }
    Ok(code.to_owned())
}

fn normalize_auth_type(value: &str) -> String {
    let value = value.trim().to_ascii_lowercase();
    if value.contains("oauth") || value.contains("gcp") {
        "GCP Vertex OAuth".to_owned()
    } else if value.contains("bedrock") || value.contains("sigv4") {
        "AWS Bedrock".to_owned()
    } else if value.contains("azure") {
        "Azure OpenAI".to_owned()
    } else if value.contains("claude") {
        "Claude Code".to_owned()
    } else {
        "Standard API Key".to_owned()
    }
}

fn normalize_status(value: &str) -> Result<String, String> {
    let value = value.trim().to_ascii_lowercase();
    match value.as_str() {
        "active" | "disabled" => Ok(value),
        _ => Err("provider secret status must be one of active, disabled".to_owned()),
    }
}

fn validate_secret_ref(value: &str) -> Result<(), String> {
    let locator = if let Some(locator) = value.strip_prefix("vault://") {
        locator
    } else if let Some(locator) = value.strip_prefix("secret://") {
        locator
    } else {
        return Err("secretRef must start with vault:// or secret://".to_owned());
    };
    if !value.bytes().all(|byte| (0x21..=0x7e).contains(&byte)) {
        return Err("secretRef must contain only visible ASCII characters".to_owned());
    }
    if locator.trim_matches('/').is_empty() {
        return Err("secretRef must include a non-empty locator".to_owned());
    }
    Ok(())
}

fn parse_positive_id(value: &str, field_name: &str) -> Result<i64, String> {
    let id = value
        .trim()
        .parse::<i64>()
        .map_err(|_| format!("{field_name} must be a positive integer"))?;
    if id <= 0 {
        return Err(format!("{field_name} must be a positive integer"));
    }
    Ok(id)
}

fn build_create_command(
    state: AdminProviderSecretState,
    _headers: &HeaderMap,
    subject: AdminProviderSecretSubject,
    request: NormalizedCreateRequest,
) -> Result<CreateAdminProviderSecretCommand, ProviderSecretCommandBuildError> {
    let account_uuid = generate_entity_uuid(&state)?;
    Ok(CreateAdminProviderSecretCommand {
        subject,
        account_code: entity_code("acct", &account_uuid),
        account_uuid,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        provider_code: request.provider_code,
        name: request.name,
        auth_type: request.auth_type,
        secret_ref: request.secret_ref,
        masked_label: request.masked_label,
        status: request.status,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_update_command(
    state: AdminProviderSecretState,
    _headers: &HeaderMap,
    subject: AdminProviderSecretSubject,
    request: NormalizedUpdateRequest,
) -> Result<UpdateAdminProviderSecretCommand, ProviderSecretCommandBuildError> {
    Ok(UpdateAdminProviderSecretCommand {
        subject,
        secret_id: request.secret_id,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        provider_code: request.provider_code,
        name: request.name,
        auth_type: request.auth_type,
        secret_ref: request.secret_ref,
        masked_label: request.masked_label,
        status: request.status,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_delete_command(
    state: AdminProviderSecretState,
    _headers: &HeaderMap,
    subject: AdminProviderSecretSubject,
    secret_id: i64,
) -> Result<DeleteAdminProviderSecretCommand, ProviderSecretCommandBuildError> {
    Ok(DeleteAdminProviderSecretCommand {
        subject,
        secret_id,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn generate_entity_uuid(
    state: &AdminProviderSecretState,
) -> Result<String, ProviderSecretCommandBuildError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(ProviderSecretCommandBuildError::System)
}

fn request_id_error(error: RequestIdError) -> ProviderSecretCommandBuildError {
    match error {
        RequestIdError::Invalid(message) => ProviderSecretCommandBuildError::BadRequest(message),
        RequestIdError::System(message) => {
            ProviderSecretCommandBuildError::System(DomainError::new(message))
        }
    }
}

fn to_item_response(item: AdminProviderSecretItem) -> AdminProviderSecretItemResponse {
    AdminProviderSecretItemResponse {
        id: item.id.to_string(),
        provider_code: item.provider_code,
        account_code: item.account_code,
        name: item.name,
        auth_type: item.auth_type,
        secret_ref: item.secret_ref,
        masked_label: item.masked_label,
        status: item.status,
        created_at: item.created_at,
        updated_at: item.updated_at,
    }
}

fn entity_code(prefix: &str, uuid: &str) -> String {
    let short = uuid.chars().take(24).collect::<String>();
    format!("{prefix}-{short}")
}

fn mask_secret_ref(value: &str) -> String {
    value
        .rsplit('/')
        .next()
        .filter(|part| !part.is_empty())
        .map(|part| format!("ref:***{part}"))
        .unwrap_or_else(|| "ref:***".to_owned())
}

fn bad_request(message: String) -> Response {
    PlusApiResult::error("4001", message)).into_response()
}

fn not_found_response(message: &'static str) -> Response {
    PlusApiResult::error("4040", message)).into_response()
}

fn conflict_response(error: DomainError) -> Response {
    PlusApiResult::error("4090", error.to_string())).into_response()
}

fn command_build_error_response(error: ProviderSecretCommandBuildError) -> Response {
    match error {
        ProviderSecretCommandBuildError::BadRequest(message) => bad_request(message),
        ProviderSecretCommandBuildError::System(error) => {
            provider_secret_system_response("provider secret command is invalid", error)
        }
    }
}

fn provider_secret_system_response(context: &str, error: DomainError) -> Response {
    PlusApiResult::error("5000", format!("{context}: {error}"))).into_response()
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn provider_secret_sdk_query_maps_to_normalized_filters() {
        let request = normalize_list_query(ProviderSecretListQuery {
            provider_code: Some("OpenAI".to_owned()),
            status: Some("disabled".to_owned()),
        })
        .expect("provider secret query should normalize");

        assert_eq!(Some("openai".to_owned()), request.provider_code);
        assert_eq!(Some("disabled".to_owned()), request.status);
    }
}
