use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::api::app_sql_subject::{map_required_app_sql_subject, RequiredAppSqlScopedSubject};
use axum::body::Bytes;
use axum::extract::{Path, State};
use axum::http::{HeaderMap, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{Json, Router};
use serde::Deserialize;
use serde_json::{Map, Value};

use crate::api::request_id::{generate_server_request_id, RequestIdError};
use crate::api::response::{
    json_created_response, no_content_response, problem_from_wire_code, success_envelope,
};
use crate::application::EntityUuidGenerator;
use crate::domain::{DomainError, ProviderCircuitBreakerPolicy, ProviderRetryPolicy};
use crate::infrastructure::OsApiKeySecretGenerator;
use crate::ports::{
    AppRoutingChannelCommandFuture, AppRoutingChannelCommandStore, AppRoutingChannelDeleteOutcome,
    AppRoutingChannelMutationOutcome, AppRoutingChannelTestOutcome, AppRoutingSubject,
    CreateAppRoutingChannelCommand, DeleteAppRoutingChannelCommand,
    SetAppRoutingChannelStatusCommand, TestAppRoutingChannelCommand,
    UpdateAppRoutingChannelCommand,
};

const MAX_NAME_LEN: usize = 128;
const MAX_VENDOR_LEN: usize = 64;
const MAX_PROTOCOL_LEN: usize = 64;
const MAX_ACCESS_TYPE_LEN: usize = 64;
const MAX_BASE_URL_LEN: usize = 512;
const MAX_SECRET_REF_LEN: usize = 256;
const MAX_CAPABILITIES: usize = 16;
const MIN_TIMEOUT_MS: i64 = 1;
const MAX_TIMEOUT_MS: i64 = 600_000;
const MIN_WEIGHT: i64 = 1;
const MAX_WEIGHT: i64 = 10_000;

#[derive(Clone)]
struct AppRoutingChannelCommandState {
    store: Arc<dyn AppRoutingChannelCommandStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedCreateRoutingChannelRequest {
    name: String,
    vendor: String,
    supplier_code: String,
    protocol: String,
    access_type: String,
    base_url: Option<String>,
    secret_ref: String,
    capabilities: Vec<String>,
    is_multimodal: bool,
    timeout_ms: Option<i64>,
    retry_policy_json: Option<String>,
    circuit_breaker_policy_json: Option<String>,
    weight: i64,
    status: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedUpdateRoutingChannelRequest {
    account_id: i64,
    name: Option<String>,
    vendor: Option<String>,
    supplier_code: Option<String>,
    protocol: Option<String>,
    access_type: Option<String>,
    base_url: Option<Option<String>>,
    secret_ref: Option<String>,
    capabilities: Option<Vec<String>>,
    timeout_ms: Option<Option<i64>>,
    retry_policy_json: Option<Option<String>>,
    circuit_breaker_policy_json: Option<Option<String>>,
    weight: Option<i64>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetRoutingChannelStatusRequest {
    status: Option<String>,
}

enum RoutingChannelCommandBuildError {
    BadRequest(String),
    System(DomainError),
}

struct EmptyAppRoutingChannelCommandStore;

impl AppRoutingChannelCommandStore for EmptyAppRoutingChannelCommandStore {
    fn create_channel<'a>(
        &'a self,
        _command: CreateAppRoutingChannelCommand,
    ) -> AppRoutingChannelCommandFuture<'a, AppRoutingChannelMutationOutcome> {
        Box::pin(async {
            Err(DomainError::new(
                "routing channel command store is unavailable without database configuration",
            ))
        })
    }

    fn update_channel<'a>(
        &'a self,
        _command: UpdateAppRoutingChannelCommand,
    ) -> AppRoutingChannelCommandFuture<'a, Option<AppRoutingChannelMutationOutcome>> {
        Box::pin(async {
            Err(DomainError::new(
                "routing channel command store is unavailable without database configuration",
            ))
        })
    }

    fn set_channel_status<'a>(
        &'a self,
        _command: SetAppRoutingChannelStatusCommand,
    ) -> AppRoutingChannelCommandFuture<'a, Option<AppRoutingChannelMutationOutcome>> {
        Box::pin(async {
            Err(DomainError::new(
                "routing channel command store is unavailable without database configuration",
            ))
        })
    }

    fn delete_channel<'a>(
        &'a self,
        _command: DeleteAppRoutingChannelCommand,
    ) -> AppRoutingChannelCommandFuture<'a, AppRoutingChannelDeleteOutcome> {
        Box::pin(async {
            Err(DomainError::new(
                "routing channel command store is unavailable without database configuration",
            ))
        })
    }

    fn test_channel<'a>(
        &'a self,
        _command: TestAppRoutingChannelCommand,
    ) -> AppRoutingChannelCommandFuture<'a, Option<AppRoutingChannelTestOutcome>> {
        Box::pin(async {
            Err(DomainError::new(
                "routing channel command store is unavailable without database configuration",
            ))
        })
    }
}

pub fn app_routing_channel_command_router() -> Router {
    app_routing_channel_command_router_with_store(
        Arc::new(EmptyAppRoutingChannelCommandStore),
        Arc::new(OsApiKeySecretGenerator),
    )
}

pub fn app_routing_channel_command_router_with_store(
    store: Arc<dyn AppRoutingChannelCommandStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/app/v3/api/ai/routing/channels",
            post(create_routing_channel),
        )
        .route(
            "/app/v3/api/ai/routing/channels/{account_id}",
            axum::routing::put(update_routing_channel).delete(delete_routing_channel),
        )
        .route(
            "/app/v3/api/ai/routing/channels/{account_id}/status",
            axum::routing::put(set_routing_channel_status),
        )
        .route(
            "/app/v3/api/ai/routing/channels/{account_id}/verify",
            post(test_routing_channel),
        )
        .with_state(AppRoutingChannelCommandState {
            store,
            entity_uuid_generator,
        })
}

async fn create_routing_channel(
    State(state): State<AppRoutingChannelCommandState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = map_required_app_sql_subject(subject, AppRoutingSubject::from);
    let request = match parse_json_object(&body, "routing channel request body is required", false)
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

    match state.store.create_channel(command).await {
        Ok(outcome) => json_created_response(None, outcome),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            routing_channel_system_response("routing channel command store is unavailable", error)
        }
    }
}

async fn update_routing_channel(
    State(state): State<AppRoutingChannelCommandState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    headers: HeaderMap,
    Path(account_id): Path<String>,
    body: Bytes,
) -> Response {
    let subject = map_required_app_sql_subject(subject, AppRoutingSubject::from);
    let account_id = match parse_positive_id(&account_id, "channel id") {
        Ok(account_id) => account_id,
        Err(message) => return bad_request(message),
    };
    let request = match parse_json_object(&body, "routing channel update body is required", false) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let request = match normalize_update_request(account_id, request) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match build_update_command(state.clone(), &headers, subject, request) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };

    match state.store.update_channel(command).await {
        Ok(Some(outcome)) => Json(success_envelope(outcome)).into_response(),
        Ok(None) => not_found_response("routing channel was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            routing_channel_system_response("routing channel command store is unavailable", error)
        }
    }
}

async fn set_routing_channel_status(
    State(state): State<AppRoutingChannelCommandState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    headers: HeaderMap,
    Path(account_id): Path<String>,
    Json(request): Json<SetRoutingChannelStatusRequest>,
) -> Response {
    let subject = map_required_app_sql_subject(subject, AppRoutingSubject::from);
    let account_id = match parse_positive_id(&account_id, "channel id") {
        Ok(account_id) => account_id,
        Err(message) => return bad_request(message),
    };
    let status = match normalize_status(request.status.as_deref().unwrap_or_default().trim()) {
        Ok(status) => status,
        Err(message) => return bad_request(message),
    };
    let command = match build_status_command(state.clone(), &headers, subject, account_id, status) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };

    match state.store.set_channel_status(command).await {
        Ok(Some(outcome)) => Json(success_envelope(outcome)).into_response(),
        Ok(None) => not_found_response("routing channel was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            routing_channel_system_response("routing channel command store is unavailable", error)
        }
    }
}

async fn delete_routing_channel(
    State(state): State<AppRoutingChannelCommandState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    headers: HeaderMap,
    Path(account_id): Path<String>,
) -> Response {
    let subject = map_required_app_sql_subject(subject, AppRoutingSubject::from);
    let account_id = match parse_positive_id(&account_id, "channel id") {
        Ok(account_id) => account_id,
        Err(message) => return bad_request(message),
    };
    let command = match build_delete_command(state.clone(), &headers, subject, account_id) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };

    match state.store.delete_channel(command).await {
        Ok(outcome) if outcome.deleted => no_content_response(None),
        Ok(_) => not_found_response("routing channel was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            routing_channel_system_response("routing channel command store is unavailable", error)
        }
    }
}

async fn test_routing_channel(
    State(state): State<AppRoutingChannelCommandState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    headers: HeaderMap,
    Path(account_id): Path<String>,
) -> Response {
    let subject = map_required_app_sql_subject(subject, AppRoutingSubject::from);
    let account_id = match parse_positive_id(&account_id, "channel id") {
        Ok(account_id) => account_id,
        Err(message) => return bad_request(message),
    };
    let command = match build_test_command(state.clone(), &headers, subject, account_id) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };

    match state.store.test_channel(command).await {
        Ok(Some(outcome)) => Json(success_envelope(outcome)).into_response(),
        Ok(None) => not_found_response("routing channel was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            routing_channel_system_response("routing channel command store is unavailable", error)
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
        .map_err(|error| format!("invalid routing channel request body: {error}"))?
    {
        Value::Object(object) => Ok(object),
        _ => Err("routing channel request body must be a JSON object".to_owned()),
    }
}

fn normalize_create_request(
    request: Map<String, Value>,
) -> Result<NormalizedCreateRoutingChannelRequest, String> {
    reject_plaintext_auth_key(&request)?;
    let name = required_text(&request, "name", "channel name", MAX_NAME_LEN)?;
    let vendor = required_text(&request, "vendor", "channel vendor", MAX_VENDOR_LEN)?;
    let supplier_code = normalize_supplier_code(&vendor)?;
    let protocol = optional_text(&request, "protocol", "channel protocol", MAX_PROTOCOL_LEN)?
        .unwrap_or_else(|| "OpenAI".to_owned());
    let protocol = normalize_protocol(&protocol);
    let access_type = optional_text(
        &request,
        "accessType",
        "channel accessType",
        MAX_ACCESS_TYPE_LEN,
    )?
    .unwrap_or_else(|| "Standard API Key".to_owned());
    let access_type = normalize_access_type(&access_type);
    let base_url = optional_text(&request, "baseUrl", "channel baseUrl", MAX_BASE_URL_LEN)?
        .map(validate_base_url)
        .transpose()?;
    let secret_ref = required_text(&request, "secretRef", "secretRef", MAX_SECRET_REF_LEN)?;
    validate_secret_ref(&secret_ref)?;
    let capabilities = optional_string_array(
        &request,
        "capabilities",
        "capabilities",
        MAX_CAPABILITIES,
        32,
    )?
    .unwrap_or_else(|| vec!["llm".to_owned()]);
    let capabilities = normalize_capabilities(capabilities)?;
    let timeout_ms = optional_non_null_integer(&request, "timeoutMs")?
        .map(normalize_timeout_ms)
        .transpose()?;
    let retry_policy_json = optional_non_null_retry_policy_json(&request, "retryPolicy")?;
    let circuit_breaker_policy_json =
        optional_non_null_circuit_breaker_policy_json(&request, "circuitBreakerPolicy")?;
    let weight = optional_integer(&request, "weight")?.unwrap_or(100);
    let weight = normalize_weight(weight)?;
    let status = optional_text(&request, "status", "channel status", 32)?
        .unwrap_or_else(|| "active".to_owned());
    let status = normalize_status(&status)?;
    let is_multimodal = capabilities.iter().any(|capability| capability != "llm");

    Ok(NormalizedCreateRoutingChannelRequest {
        name,
        vendor: display_vendor(&vendor),
        supplier_code,
        protocol,
        access_type,
        base_url,
        secret_ref,
        capabilities,
        is_multimodal,
        timeout_ms,
        retry_policy_json,
        circuit_breaker_policy_json,
        weight,
        status,
    })
}

fn normalize_update_request(
    account_id: i64,
    request: Map<String, Value>,
) -> Result<NormalizedUpdateRoutingChannelRequest, String> {
    reject_plaintext_auth_key(&request)?;
    let name = optional_text(&request, "name", "channel name", MAX_NAME_LEN)?;
    let vendor = optional_text(&request, "vendor", "channel vendor", MAX_VENDOR_LEN)?;
    let supplier_code = vendor
        .as_ref()
        .map(|vendor| normalize_supplier_code(vendor))
        .transpose()?;
    let vendor = vendor.map(|vendor| display_vendor(&vendor));
    let protocol = optional_text(&request, "protocol", "channel protocol", MAX_PROTOCOL_LEN)?
        .map(|protocol| normalize_protocol(&protocol));
    let access_type = optional_text(
        &request,
        "accessType",
        "channel accessType",
        MAX_ACCESS_TYPE_LEN,
    )?
    .map(|access_type| normalize_access_type(&access_type));
    let base_url =
        optional_nullable_text(&request, "baseUrl", "channel baseUrl", MAX_BASE_URL_LEN)?
            .map(|value| value.map(validate_base_url).transpose())
            .transpose()?;
    let secret_ref = optional_text(&request, "secretRef", "secretRef", MAX_SECRET_REF_LEN)?;
    if let Some(secret_ref) = secret_ref.as_deref() {
        validate_secret_ref(secret_ref)?;
    }
    let capabilities = optional_string_array(
        &request,
        "capabilities",
        "capabilities",
        MAX_CAPABILITIES,
        32,
    )?
    .map(normalize_capabilities)
    .transpose()?;
    let timeout_ms = optional_nullable_integer(&request, "timeoutMs")?
        .map(|value| value.map(normalize_timeout_ms).transpose())
        .transpose()?;
    let retry_policy_json = optional_retry_policy_json(&request, "retryPolicy")?;
    let circuit_breaker_policy_json =
        optional_circuit_breaker_policy_json(&request, "circuitBreakerPolicy")?;
    let weight = optional_integer(&request, "weight")?
        .map(normalize_weight)
        .transpose()?;
    let status = optional_text(&request, "status", "channel status", 32)?
        .map(|status| normalize_status(&status))
        .transpose()?;

    if name.is_none()
        && vendor.is_none()
        && protocol.is_none()
        && access_type.is_none()
        && base_url.is_none()
        && secret_ref.is_none()
        && capabilities.is_none()
        && timeout_ms.is_none()
        && retry_policy_json.is_none()
        && circuit_breaker_policy_json.is_none()
        && weight.is_none()
        && status.is_none()
    {
        return Err("routing channel update must include at least one editable field".to_owned());
    }

    Ok(NormalizedUpdateRoutingChannelRequest {
        account_id,
        name,
        vendor,
        supplier_code,
        protocol,
        access_type,
        base_url,
        secret_ref,
        capabilities,
        timeout_ms,
        retry_policy_json,
        circuit_breaker_policy_json,
        weight,
        status,
    })
}

fn reject_plaintext_auth_key(request: &Map<String, Value>) -> Result<(), String> {
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
                "secretRef is required; plaintext credential fields are not accepted for routing channel credentials"
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

fn optional_nullable_text(
    request: &Map<String, Value>,
    key: &str,
    field_name: &str,
    max_len: usize,
) -> Result<Option<Option<String>>, String> {
    let Some(value) = request.get(key) else {
        return Ok(None);
    };
    match value {
        Value::String(value) => {
            let value = value.trim();
            if value.is_empty() {
                return Ok(Some(None));
            }
            if value.chars().count() > max_len {
                return Err(format!("{field_name} must be at most {max_len} characters"));
            }
            Ok(Some(Some(value.to_owned())))
        }
        Value::Null => Ok(Some(None)),
        _ => Err(format!("{field_name} must be a string")),
    }
}

fn optional_string_array(
    request: &Map<String, Value>,
    key: &str,
    field_name: &str,
    max_items: usize,
    max_item_len: usize,
) -> Result<Option<Vec<String>>, String> {
    let Some(value) = request.get(key) else {
        return Ok(None);
    };
    let Value::Array(values) = value else {
        return Err(format!("{field_name} must be a string array"));
    };
    if values.len() > max_items {
        return Err(format!(
            "{field_name} must include at most {max_items} items"
        ));
    }
    let mut normalized = Vec::new();
    for value in values {
        let Value::String(value) = value else {
            return Err(format!("{field_name} must be a string array"));
        };
        let value = value.trim();
        if value.is_empty() {
            continue;
        }
        if value.chars().count() > max_item_len {
            return Err(format!(
                "{field_name} items must be at most {max_item_len} characters"
            ));
        }
        if !value.bytes().all(|byte| {
            byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'-' | b'_' | b':' | b'/')
        }) {
            return Err(format!(
                "{field_name} items may only contain letters, numbers, ., -, _, :, and /"
            ));
        }
        if !normalized.iter().any(|existing| existing == value) {
            normalized.push(value.to_owned());
        }
    }
    Ok(Some(normalized))
}

fn optional_integer(request: &Map<String, Value>, key: &str) -> Result<Option<i64>, String> {
    let Some(value) = request.get(key) else {
        return Ok(None);
    };
    match value {
        Value::Number(value) => value
            .as_i64()
            .ok_or_else(|| format!("{key} must be an integer"))
            .map(Some),
        Value::String(value) => {
            let value = value.trim();
            if value.is_empty() {
                return Ok(None);
            }
            value
                .parse::<i64>()
                .map(Some)
                .map_err(|_| format!("{key} must be an integer"))
        }
        Value::Null => Ok(None),
        _ => Err(format!("{key} must be an integer")),
    }
}

fn optional_non_null_integer(
    request: &Map<String, Value>,
    key: &str,
) -> Result<Option<i64>, String> {
    if request.get(key).is_some_and(Value::is_null) {
        return Err(format!("{key} must be an integer"));
    }
    optional_integer(request, key)
}

fn optional_nullable_integer(
    request: &Map<String, Value>,
    key: &str,
) -> Result<Option<Option<i64>>, String> {
    let Some(value) = request.get(key) else {
        return Ok(None);
    };
    match value {
        Value::Null => Ok(Some(None)),
        Value::Number(value) => value
            .as_i64()
            .ok_or_else(|| format!("{key} must be an integer"))
            .map(Some)
            .map(Some),
        Value::String(value) => {
            let value = value.trim();
            if value.is_empty() {
                return Ok(Some(None));
            }
            value
                .parse::<i64>()
                .map(Some)
                .map(Some)
                .map_err(|_| format!("{key} must be an integer"))
        }
        _ => Err(format!("{key} must be an integer")),
    }
}

fn optional_retry_policy_json(
    request: &Map<String, Value>,
    key: &str,
) -> Result<Option<Option<String>>, String> {
    let Some(value) = request.get(key) else {
        return Ok(None);
    };
    if value.is_null() {
        return Ok(Some(None));
    }
    let Value::Object(object) = value else {
        return Err("retryPolicy must be a JSON object or null".to_owned());
    };
    for key in object.keys() {
        if !matches!(
            key.as_str(),
            "maxAttempts" | "retryableStatusCodes" | "backoffMs"
        ) {
            return Err(format!("retryPolicy contains unsupported field: {key}"));
        }
    }
    let max_attempts = object
        .get("maxAttempts")
        .and_then(Value::as_u64)
        .ok_or_else(|| "retryPolicy.maxAttempts must be a positive integer".to_owned())?;
    let retryable_status_codes = object
        .get("retryableStatusCodes")
        .and_then(Value::as_array)
        .ok_or_else(|| "retryPolicy.retryableStatusCodes must be an array".to_owned())?
        .iter()
        .map(|value| {
            value
                .as_u64()
                .and_then(|value| u16::try_from(value).ok())
                .ok_or_else(|| {
                    "retryPolicy.retryableStatusCodes must contain integer HTTP statuses".to_owned()
                })
        })
        .collect::<Result<Vec<_>, _>>()?;
    let backoff_ms = object
        .get("backoffMs")
        .map(|value| {
            value
                .as_u64()
                .ok_or_else(|| "retryPolicy.backoffMs must be a non-negative integer".to_owned())
        })
        .transpose()?
        .unwrap_or(0);

    let canonical = ProviderRetryPolicy::new(
        usize::try_from(max_attempts)
            .map_err(|_| "retryPolicy.maxAttempts must be a positive integer".to_owned())?,
        retryable_status_codes,
        backoff_ms,
    )
    .map_err(|error| retry_policy_error_message(&error.to_string()))?;
    serde_json::to_string(&serde_json::json!({
        "max_attempts": canonical.max_attempts,
        "retryable_status_codes": canonical.retryable_status_codes,
        "backoff_ms": canonical.backoff_ms
    }))
    .map(Some)
    .map(Some)
    .map_err(|error| format!("retryPolicy could not be serialized: {error}"))
}

fn optional_non_null_retry_policy_json(
    request: &Map<String, Value>,
    key: &str,
) -> Result<Option<String>, String> {
    match optional_retry_policy_json(request, key)? {
        Some(Some(value)) => Ok(Some(value)),
        Some(None) => Err("retryPolicy must be a JSON object".to_owned()),
        None => Ok(None),
    }
}

fn optional_circuit_breaker_policy_json(
    request: &Map<String, Value>,
    key: &str,
) -> Result<Option<Option<String>>, String> {
    let Some(value) = request.get(key) else {
        return Ok(None);
    };
    if value.is_null() {
        return Ok(Some(None));
    }
    let Value::Object(object) = value else {
        return Err("circuitBreakerPolicy must be a JSON object or null".to_owned());
    };
    for key in object.keys() {
        if key != "failureThreshold" {
            return Err(format!(
                "circuitBreakerPolicy contains unsupported field: {key}"
            ));
        }
    }
    let failure_threshold = object
        .get("failureThreshold")
        .and_then(Value::as_u64)
        .ok_or_else(|| {
            "circuitBreakerPolicy.failureThreshold must be a positive integer".to_owned()
        })?;
    let canonical =
        ProviderCircuitBreakerPolicy::new(usize::try_from(failure_threshold).map_err(|_| {
            "circuitBreakerPolicy.failureThreshold must be a positive integer".to_owned()
        })?)
        .map_err(|error| circuit_breaker_policy_error_message(&error.to_string()))?;
    serde_json::to_string(&serde_json::json!({
        "failure_threshold": canonical.failure_threshold
    }))
    .map(Some)
    .map(Some)
    .map_err(|error| format!("circuitBreakerPolicy could not be serialized: {error}"))
}

fn optional_non_null_circuit_breaker_policy_json(
    request: &Map<String, Value>,
    key: &str,
) -> Result<Option<String>, String> {
    match optional_circuit_breaker_policy_json(request, key)? {
        Some(Some(value)) => Ok(Some(value)),
        Some(None) => Err("circuitBreakerPolicy must be a JSON object".to_owned()),
        None => Ok(None),
    }
}

fn normalize_supplier_code(vendor: &str) -> Result<String, String> {
    let normalized = vendor.trim().to_ascii_lowercase();
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
    if code.is_empty() || code.len() > MAX_VENDOR_LEN {
        return Err("channel vendor is invalid".to_owned());
    }
    if !code
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
    {
        return Err("channel vendor may only contain letters, numbers, -, and _".to_owned());
    }
    Ok(code.to_owned())
}

fn display_vendor(vendor: &str) -> String {
    match normalize_supplier_code(vendor).as_deref() {
        Ok("openai") => "OpenAI",
        Ok("anthropic") => "Anthropic",
        Ok("google") => "Gemini",
        Ok("openrouter") => "OpenRouter",
        Ok("deepseek") => "DeepSeek",
        Ok("zhipu") => "Zhipu",
        Ok("mistral") => "Mistral",
        Ok("meta") => "Meta",
        Ok("ollama") => "Ollama",
        Ok("azure_openai") => "Azure OpenAI",
        Ok("custom") => "Custom",
        _ => vendor.trim(),
    }
    .to_owned()
}

fn normalize_protocol(value: &str) -> String {
    let value = value.trim().to_ascii_lowercase();
    if value.contains("anthropic") {
        "Anthropic".to_owned()
    } else if value.contains("gemini") || value.contains("google") {
        "Gemini".to_owned()
    } else if value.contains("ollama") {
        "Ollama".to_owned()
    } else if value.contains("custom") {
        "Custom".to_owned()
    } else {
        "OpenAI".to_owned()
    }
}

fn normalize_access_type(value: &str) -> String {
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

fn normalize_capabilities(capabilities: Vec<String>) -> Result<Vec<String>, String> {
    let mut normalized = Vec::new();
    for capability in capabilities {
        let capability = capability.trim().to_ascii_lowercase();
        match capability.as_str() {
            "llm" | "image" | "audio" | "music" | "sfx" | "video" => {
                if !normalized.iter().any(|value| value == &capability) {
                    normalized.push(capability);
                }
            }
            _ => {
                return Err(
                    "capabilities must contain only llm, image, audio, music, sfx, or video"
                        .to_owned(),
                );
            }
        }
    }
    if normalized.is_empty() {
        normalized.push("llm".to_owned());
    }
    Ok(normalized)
}

fn normalize_weight(weight: i64) -> Result<i64, String> {
    if !(MIN_WEIGHT..=MAX_WEIGHT).contains(&weight) {
        return Err(format!(
            "channel weight must be between {MIN_WEIGHT} and {MAX_WEIGHT}"
        ));
    }
    Ok(weight)
}

fn normalize_timeout_ms(timeout_ms: i64) -> Result<i64, String> {
    if !(MIN_TIMEOUT_MS..=MAX_TIMEOUT_MS).contains(&timeout_ms) {
        return Err(format!(
            "channel timeoutMs must be between {MIN_TIMEOUT_MS} and {MAX_TIMEOUT_MS}"
        ));
    }
    Ok(timeout_ms)
}

fn normalize_status(value: &str) -> Result<String, String> {
    let value = value.trim().to_ascii_lowercase();
    match value.as_str() {
        "active" | "disabled" | "error" => Ok(value),
        _ => Err("channel status must be one of active, disabled, error".to_owned()),
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

fn validate_base_url(value: String) -> Result<String, String> {
    if !value.bytes().all(|byte| (0x21..=0x7e).contains(&byte)) {
        return Err("channel baseUrl must contain only visible ASCII characters".to_owned());
    }
    let uri = value
        .parse::<Uri>()
        .map_err(|_| "channel baseUrl must be an absolute http or https URL".to_owned())?;
    if !matches!(uri.scheme_str(), Some("http" | "https")) || uri.authority().is_none() {
        return Err("channel baseUrl must be an absolute http or https URL".to_owned());
    }
    if uri
        .authority()
        .is_some_and(|authority| authority.as_str().contains('@'))
    {
        return Err("channel baseUrl must not contain user info".to_owned());
    }
    if uri.query().is_some() {
        return Err("channel baseUrl must not include a query string".to_owned());
    }
    Ok(value.trim_end_matches('/').to_owned())
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

fn retry_policy_error_message(message: &str) -> String {
    message
        .replace("ai_channel.retry_policy", "retryPolicy")
        .replace("retryPolicy max_attempts", "retryPolicy.maxAttempts")
        .replace(
            "retryPolicy retryable_status_codes",
            "retryPolicy.retryableStatusCodes",
        )
        .replace("retryPolicy backoff_ms", "retryPolicy.backoffMs")
}

fn circuit_breaker_policy_error_message(message: &str) -> String {
    message
        .replace("ai_channel.circuit_breaker_policy", "circuitBreakerPolicy")
        .replace(
            "circuitBreakerPolicy failure_threshold",
            "circuitBreakerPolicy.failureThreshold",
        )
}

fn build_create_command(
    state: AppRoutingChannelCommandState,
    _headers: &HeaderMap,
    subject: AppRoutingSubject,
    request: NormalizedCreateRoutingChannelRequest,
) -> Result<CreateAppRoutingChannelCommand, RoutingChannelCommandBuildError> {
    Ok(CreateAppRoutingChannelCommand {
        subject,
        channel_uuid: generate_entity_uuid(&state)?,
        account_uuid: generate_entity_uuid(&state)?,
        provider_uuid: generate_entity_uuid(&state)?,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        name: request.name,
        vendor: request.vendor,
        supplier_code: request.supplier_code,
        protocol: request.protocol,
        access_type: request.access_type,
        base_url: request.base_url,
        secret_ref: request.secret_ref,
        capabilities: request.capabilities,
        is_multimodal: request.is_multimodal,
        timeout_ms: request.timeout_ms,
        retry_policy_json: request.retry_policy_json,
        circuit_breaker_policy_json: request.circuit_breaker_policy_json,
        weight: request.weight,
        status: request.status,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_update_command(
    state: AppRoutingChannelCommandState,
    _headers: &HeaderMap,
    subject: AppRoutingSubject,
    request: NormalizedUpdateRoutingChannelRequest,
) -> Result<UpdateAppRoutingChannelCommand, RoutingChannelCommandBuildError> {
    Ok(UpdateAppRoutingChannelCommand {
        subject,
        account_id: request.account_id,
        provider_uuid: generate_entity_uuid(&state)?,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        name: request.name,
        vendor: request.vendor,
        supplier_code: request.supplier_code,
        protocol: request.protocol,
        access_type: request.access_type,
        base_url: request.base_url,
        secret_ref: request.secret_ref,
        capabilities: request.capabilities,
        timeout_ms: request.timeout_ms,
        retry_policy_json: request.retry_policy_json,
        circuit_breaker_policy_json: request.circuit_breaker_policy_json,
        weight: request.weight,
        status: request.status,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_status_command(
    state: AppRoutingChannelCommandState,
    _headers: &HeaderMap,
    subject: AppRoutingSubject,
    account_id: i64,
    status: String,
) -> Result<SetAppRoutingChannelStatusCommand, RoutingChannelCommandBuildError> {
    Ok(SetAppRoutingChannelStatusCommand {
        subject,
        account_id,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        status,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_delete_command(
    state: AppRoutingChannelCommandState,
    _headers: &HeaderMap,
    subject: AppRoutingSubject,
    account_id: i64,
) -> Result<DeleteAppRoutingChannelCommand, RoutingChannelCommandBuildError> {
    Ok(DeleteAppRoutingChannelCommand {
        subject,
        account_id,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_test_command(
    state: AppRoutingChannelCommandState,
    _headers: &HeaderMap,
    subject: AppRoutingSubject,
    account_id: i64,
) -> Result<TestAppRoutingChannelCommand, RoutingChannelCommandBuildError> {
    Ok(TestAppRoutingChannelCommand {
        subject,
        account_id,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn generate_entity_uuid(
    state: &AppRoutingChannelCommandState,
) -> Result<String, RoutingChannelCommandBuildError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(RoutingChannelCommandBuildError::System)
}

fn request_id_error(error: RequestIdError) -> RoutingChannelCommandBuildError {
    match error {
        RequestIdError::Invalid(message) => RoutingChannelCommandBuildError::BadRequest(message),
        RequestIdError::System(message) => {
            RoutingChannelCommandBuildError::System(DomainError::new(message))
        }
    }
}

fn bad_request(message: String) -> Response {
    problem_from_wire_code("4001", message).into_response()
}

fn not_found_response(message: &'static str) -> Response {
    problem_from_wire_code("4040", message).into_response()
}

fn conflict_response(error: DomainError) -> Response {
    problem_from_wire_code("4090", error.to_string()).into_response()
}

fn command_build_error_response(error: RoutingChannelCommandBuildError) -> Response {
    match error {
        RoutingChannelCommandBuildError::BadRequest(message) => bad_request(message),
        RoutingChannelCommandBuildError::System(error) => {
            routing_channel_system_response("routing channel command is invalid", error)
        }
    }
}

fn routing_channel_system_response(context: &str, error: DomainError) -> Response {
    tracing::error!(error = %error, context, "routing channel command API failed");
    problem_from_wire_code("5000", context.to_owned()).into_response()
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
    fn create_routing_channel_accepts_timeout_and_retry_policy_controls() {
        let request = serde_json::json!({
            "name": "OpenAI primary",
            "vendor": "OpenAI",
            "protocol": "OpenAI",
            "accessType": "api-key",
            "baseUrl": "https://api.openai.test/v1",
            "secretRef": "vault://providers/openai/account/main",
            "capabilities": ["llm"],
            "timeoutMs": 60000,
            "retryPolicy": {
                "maxAttempts": 3,
                "retryableStatusCodes": [429, 503],
                "backoffMs": 25
            },
            "weight": 80,
            "status": "active"
        });

        let request = request.as_object().cloned().expect("object request");
        let normalized = normalize_create_request(request).expect("valid create request");

        assert_eq!(Some(60_000), normalized.timeout_ms);
        assert_eq!(
            serde_json::json!({
                "max_attempts": 3,
                "retryable_status_codes": [429, 503],
                "backoff_ms": 25
            }),
            serde_json::from_str::<Value>(
                normalized
                    .retry_policy_json
                    .as_deref()
                    .expect("retry policy json")
            )
            .expect("retry policy should be valid json"),
        );
    }

    #[test]
    fn update_routing_channel_allows_clearing_timeout_and_retry_policy() {
        let request = serde_json::json!({
            "timeoutMs": null,
            "retryPolicy": null
        });

        let request = request.as_object().cloned().expect("object request");
        let normalized = normalize_update_request(42, request).expect("valid update request");

        assert_eq!(Some(None), normalized.timeout_ms);
        assert_eq!(Some(None), normalized.retry_policy_json);
    }
}
