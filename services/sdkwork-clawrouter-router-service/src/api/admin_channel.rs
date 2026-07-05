use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;

use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::{delete, get, post};
use axum::{Json, Router};
use serde::Deserialize;
use serde::Serialize;
use serde_json::{Map, Value};
use sha2::{Digest, Sha256};

use crate::api::request_id::{generate_server_request_id, RequestIdError};
use crate::api::response::{
    json_success_list_response, normalize_list_search_query, offset_page_info,
    parse_offset_list_query, problem_from_wire_code, success_envelope,
};
use crate::application::EntityUuidGenerator;
use crate::domain::{DomainError, ProviderCircuitBreakerPolicy, ProviderRetryPolicy};
use crate::ports::{
    AdminChannelCredentialInput, AdminChannelCredentialItem, AdminChannelItem, AdminChannelStore,
    AdminChannelSubject, CreateAdminChannelCommand, DeleteAdminChannelCommand,
    ListAdminChannelsQuery, TestAdminChannelCommand, UpdateAdminChannelCommand,
};

const MAX_NAME_LEN: usize = 128;

#[derive(Debug, Default, Deserialize)]
struct AdminChannelListQueryRequest {
    page: Option<i64>,
    page_size: Option<i64>,
    q: Option<String>,
}
const MAX_VENDOR_LEN: usize = 64;
const MAX_PROTOCOL_LEN: usize = 64;
const MAX_ACCESS_TYPE_LEN: usize = 64;
const MAX_BASE_URL_LEN: usize = 512;
const MAX_SECRET_REF_LEN: usize = 256;
const MAX_API_KEY_LEN: usize = 4096;
const MAX_EXPIRES_AT_LEN: usize = 64;
const MAX_CAPABILITIES: usize = 16;
const MAX_RESOURCE_CODE_LEN: usize = 192;
const MAX_RESOURCE_CODES: usize = 256;
const MAX_CREDENTIALS: usize = 64;
const MAX_CREDENTIAL_NAME_LEN: usize = 128;
const MIN_TIMEOUT_MS: i64 = 1;
const MAX_TIMEOUT_MS: i64 = 600_000;
const MIN_WEIGHT: i64 = 1;
const MAX_WEIGHT: i64 = 10_000;
const MIN_PRIORITY: i64 = 1;
const MAX_PRIORITY: i64 = 1_000_000;

#[derive(Clone)]
struct AdminChannelState {
    store: Arc<dyn AdminChannelStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedCreateRequest {
    name: String,
    vendor: String,
    provider_code: String,
    channel_type: String,
    protocol: String,
    access_type: String,
    credential_rotation: String,
    credentials: Vec<NormalizedCredentialInput>,
    capabilities: Vec<String>,
    resource_codes: Vec<String>,
    is_multimodal: bool,
    timeout_ms: Option<i64>,
    retry_policy_json: Option<String>,
    circuit_breaker_policy_json: Option<String>,
    expires_at: Option<String>,
    weight: i64,
    status: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedUpdateRequest {
    channel_id: i64,
    name: Option<String>,
    vendor: Option<String>,
    provider_code: Option<String>,
    channel_type: Option<String>,
    protocol: Option<String>,
    access_type: Option<String>,
    credential_rotation: Option<String>,
    credentials: Option<Vec<NormalizedCredentialInput>>,
    capabilities: Option<Vec<String>>,
    resource_codes: Option<Vec<String>>,
    timeout_ms: Option<Option<i64>>,
    retry_policy_json: Option<Option<String>>,
    circuit_breaker_policy_json: Option<Option<String>>,
    expires_at: Option<Option<String>>,
    weight: Option<i64>,
    status: Option<String>,
}

enum ChannelCommandBuildError {
    BadRequest(String),
    System(DomainError),
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminChannelListResponse {
    items: Vec<AdminChannelSafeItemResponse>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminChannelItemEnvelope {
    item: AdminChannelSafeItemResponse,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminChannelDeleteResponse {
    deleted: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminChannelTestResponse {
    channel_id: String,
    success: bool,
    status: String,
    latency: String,
    item: AdminChannelSafeItemResponse,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminChannelSafeItemResponse {
    id: String,
    channel_id: String,
    name: String,
    vendor: String,
    channel_type: String,
    protocol: String,
    access_type: String,
    credential_rotation: String,
    credentials: Vec<AdminChannelSafeCredentialResponse>,
    created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    expires_at: Option<String>,
    capabilities: Vec<String>,
    resource_codes: Vec<String>,
    is_multimodal: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    timeout_ms: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    retry_policy: Option<AdminChannelRetryPolicyResponse>,
    #[serde(skip_serializing_if = "Option::is_none")]
    circuit_breaker_policy: Option<AdminChannelCircuitBreakerPolicyResponse>,
    weight: i64,
    status: String,
    balance: String,
    errors: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminChannelRetryPolicyResponse {
    max_attempts: usize,
    retryable_status_codes: Vec<u16>,
    backoff_ms: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminChannelCircuitBreakerPolicyResponse {
    failure_threshold: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminChannelSafeCredentialResponse {
    id: String,
    credential_id: String,
    name: String,
    base_url: String,
    masked_label: String,
    priority: i64,
    weight: i64,
    status: String,
    errors: i64,
}

pub fn admin_channel_router_with_store(
    store: Arc<dyn AdminChannelStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/channel",
            post(create_channel).put(update_channel),
        )
        .route("/backend/v3/api/channel/list", post(fetch_channels))
        .route(
            "/backend/v3/api/channel/{channel_id}",
            delete(delete_channel),
        )
        .route(
            "/backend/v3/api/channel/{channel_id}/test",
            post(test_channel),
        )
        .route(
            "/backend/v3/api/integration/channels",
            get(fetch_channels).post(create_channel).put(update_channel),
        )
        .route(
            "/backend/v3/api/integration/channels/{channel_id}",
            delete(delete_channel),
        )
        .route(
            "/backend/v3/api/integration/channels/{channel_id}/verify",
            post(test_channel),
        )
        .with_state(AdminChannelState {
            store,
            entity_uuid_generator,
        })
}

async fn fetch_channels(
    State(state): State<AdminChannelState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(request): Query<AdminChannelListQueryRequest>,
) -> Response {
    let subject = scoped.into();
    let query = match build_list_query(subject, request) {
        Ok(query) => query,
        Err(message) => return bad_request(message),
    };

    match state.store.list_channels(query).await {
        Ok(page) => json_success_list_response(
            None,
            page
                .items
                .into_iter()
                .map(to_safe_item_response)
                .collect(),
            offset_page_info(page.page_no, page.page_size, page.total),
        ),
        Err(error) => channel_system_response("channel read model is unavailable", error),
    }
}

fn build_list_query(
    subject: AdminChannelSubject,
    request: AdminChannelListQueryRequest,
) -> Result<ListAdminChannelsQuery, String> {
    let pagination = parse_offset_list_query(request.page, request.page_size)?;
    Ok(ListAdminChannelsQuery {
        subject,
        page_no: pagination.page_no,
        page_size: pagination.page_size,
        offset: pagination.offset,
        q: normalize_list_search_query(request.q, "q")?,
    })
}

async fn create_channel(
    State(state): State<AdminChannelState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_object(&body, "channel request body is required", false) {
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
        Ok(item) => Json(success_envelope(AdminChannelItemEnvelope {
            item: to_safe_item_response(item),
        }))
        .into_response(),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => channel_system_response("channel command store is unavailable", error),
    }
}

async fn update_channel(
    State(state): State<AdminChannelState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_object(&body, "channel update body is required", false) {
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

    match state.store.update_channel(command).await {
        Ok(Some(item)) => Json(success_envelope(AdminChannelItemEnvelope {
            item: to_safe_item_response(item),
        }))
        .into_response(),
        Ok(None) => not_found_response("channel was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => channel_system_response("channel command store is unavailable", error),
    }
}

async fn delete_channel(
    State(state): State<AdminChannelState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(channel_id): Path<String>,
) -> Response {
    let subject = scoped.into();
    let channel_id = match parse_positive_id(&channel_id, "channel id") {
        Ok(channel_id) => channel_id,
        Err(message) => return bad_request(message),
    };
    let command = match build_delete_command(state.clone(), &headers, subject, channel_id) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };

    match state.store.delete_channel(command).await {
        Ok(true) => Json(success_envelope(AdminChannelDeleteResponse {
            deleted: true,
        }))
        .into_response(),
        Ok(false) => not_found_response("channel was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => channel_system_response("channel command store is unavailable", error),
    }
}

async fn test_channel(
    State(state): State<AdminChannelState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(channel_id): Path<String>,
) -> Response {
    let subject = scoped.into();
    let channel_id = match parse_positive_id(&channel_id, "channel id") {
        Ok(channel_id) => channel_id,
        Err(message) => return bad_request(message),
    };
    let command = match build_test_command(state.clone(), &headers, subject, channel_id) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };

    match state.store.test_channel(command).await {
        Ok(Some(outcome)) => Json(success_envelope(AdminChannelTestResponse {
            channel_id: outcome.channel_id,
            success: outcome.success,
            status: outcome.status,
            latency: outcome.latency,
            item: to_safe_item_response(outcome.item),
        }))
        .into_response(),
        Ok(None) => not_found_response("channel was not found"),
        Err(error) => channel_system_response("channel command store is unavailable", error),
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
        .map_err(|error| format!("invalid channel request body: {error}"))?
    {
        Value::Object(object) => Ok(object),
        _ => Err("channel request body must be a JSON object".to_owned()),
    }
}

fn normalize_create_request(
    request: Map<String, Value>,
) -> Result<NormalizedCreateRequest, String> {
    reject_unsupported_plaintext_auth_key(&request)?;
    let name = required_text(&request, "name", "channel name", MAX_NAME_LEN)?;
    let vendor = required_text(&request, "vendor", "channel vendor", MAX_VENDOR_LEN)?;
    let provider_code = normalize_provider_code(&vendor)?;
    let channel_type = optional_text(&request, "channelType", "channelType", 32)?
        .map(|value| normalize_channel_type(&value))
        .transpose()?
        .unwrap_or_else(|| "official".to_owned());
    let protocol = optional_text(&request, "protocol", "channel protocol", MAX_PROTOCOL_LEN)?
        .unwrap_or_else(|| "OpenAI".to_owned());
    let protocol = normalize_protocol(&protocol);
    let access_type = optional_text(
        &request,
        "accessType",
        "channel accessType",
        MAX_ACCESS_TYPE_LEN,
    )?
    .unwrap_or_else(|| "api-key".to_owned());
    let access_type = normalize_access_type(&access_type);
    let credential_rotation =
        optional_text(&request, "credentialRotation", "credentialRotation", 64)?
            .map(|value| normalize_credential_rotation(&value))
            .transpose()?
            .unwrap_or_else(|| "default".to_owned());
    let credentials = normalize_create_credentials(&request, &provider_code)?;
    let capabilities = optional_string_array(
        &request,
        "capabilities",
        "capabilities",
        MAX_CAPABILITIES,
        32,
    )?
    .unwrap_or_else(|| vec!["llm".to_owned()]);
    let capabilities = normalize_capabilities(capabilities)?;
    let resource_codes = optional_string_array(
        &request,
        "resourceCodes",
        "resourceCodes",
        MAX_RESOURCE_CODES,
        MAX_RESOURCE_CODE_LEN,
    )?
    .map(normalize_resource_codes)
    .transpose()?
    .unwrap_or_default();
    let timeout_ms = optional_non_null_integer(&request, "timeoutMs")?
        .map(normalize_timeout_ms)
        .transpose()?;
    let retry_policy_json = optional_non_null_retry_policy_json(&request, "retryPolicy")?;
    let circuit_breaker_policy_json =
        optional_non_null_circuit_breaker_policy_json(&request, "circuitBreakerPolicy")?;
    let expires_at = optional_text(&request, "expiresAt", "expiresAt", MAX_EXPIRES_AT_LEN)?
        .map(validate_expires_at)
        .transpose()?;
    let weight = optional_integer(&request, "weight")?.unwrap_or(100);
    let weight = normalize_weight(weight)?;
    let status = optional_text(&request, "status", "channel status", 32)?
        .unwrap_or_else(|| "active".to_owned());
    let status = normalize_status(&status)?;
    let is_multimodal = capabilities.iter().any(|capability| capability != "llm");

    Ok(NormalizedCreateRequest {
        name,
        vendor: display_vendor(&vendor),
        provider_code,
        channel_type,
        protocol,
        access_type,
        credential_rotation,
        credentials,
        capabilities,
        resource_codes,
        is_multimodal,
        timeout_ms,
        retry_policy_json,
        circuit_breaker_policy_json,
        expires_at,
        weight,
        status,
    })
}

fn normalize_update_request(
    request: Map<String, Value>,
) -> Result<NormalizedUpdateRequest, String> {
    reject_unsupported_plaintext_auth_key(&request)?;
    let channel_id = parse_positive_id(
        &required_text(&request, "id", "channel id", 64)?,
        "channel id",
    )?;
    let name = optional_text(&request, "name", "channel name", MAX_NAME_LEN)?;
    let vendor = optional_text(&request, "vendor", "channel vendor", MAX_VENDOR_LEN)?;
    let provider_code = vendor
        .as_ref()
        .map(|vendor| normalize_provider_code(vendor))
        .transpose()?;
    let vendor = vendor.map(|vendor| display_vendor(&vendor));
    let channel_type = optional_text(&request, "channelType", "channelType", 32)?
        .map(|value| normalize_channel_type(&value))
        .transpose()?;
    let protocol = optional_text(&request, "protocol", "channel protocol", MAX_PROTOCOL_LEN)?
        .map(|protocol| normalize_protocol(&protocol));
    let access_type = optional_text(
        &request,
        "accessType",
        "channel accessType",
        MAX_ACCESS_TYPE_LEN,
    )?
    .map(|access_type| normalize_access_type(&access_type));
    let credential_rotation =
        optional_text(&request, "credentialRotation", "credentialRotation", 64)?
            .map(|value| normalize_credential_rotation(&value))
            .transpose()?;
    let credentials = normalize_update_credentials(&request, provider_code.as_deref())?;
    let capabilities = optional_string_array(
        &request,
        "capabilities",
        "capabilities",
        MAX_CAPABILITIES,
        32,
    )?
    .map(normalize_capabilities)
    .transpose()?;
    let resource_codes = optional_string_array(
        &request,
        "resourceCodes",
        "resourceCodes",
        MAX_RESOURCE_CODES,
        MAX_RESOURCE_CODE_LEN,
    )?
    .map(normalize_resource_codes)
    .transpose()?;
    let timeout_ms = optional_nullable_integer(&request, "timeoutMs")?
        .map(|value| value.map(normalize_timeout_ms).transpose())
        .transpose()?;
    let retry_policy_json = optional_retry_policy_json(&request, "retryPolicy")?;
    let circuit_breaker_policy_json =
        optional_circuit_breaker_policy_json(&request, "circuitBreakerPolicy")?;
    let expires_at =
        optional_nullable_text(&request, "expiresAt", "expiresAt", MAX_EXPIRES_AT_LEN)?
            .map(|value| value.map(validate_expires_at).transpose())
            .transpose()?;
    let weight = optional_integer(&request, "weight")?
        .map(normalize_weight)
        .transpose()?;
    let status = optional_text(&request, "status", "channel status", 32)?
        .map(|status| normalize_status(&status))
        .transpose()?;

    if name.is_none()
        && vendor.is_none()
        && channel_type.is_none()
        && protocol.is_none()
        && access_type.is_none()
        && credential_rotation.is_none()
        && credentials.is_none()
        && capabilities.is_none()
        && resource_codes.is_none()
        && timeout_ms.is_none()
        && retry_policy_json.is_none()
        && circuit_breaker_policy_json.is_none()
        && expires_at.is_none()
        && weight.is_none()
        && status.is_none()
    {
        return Err("channel update must include at least one editable field".to_owned());
    }

    Ok(NormalizedUpdateRequest {
        channel_id,
        name,
        vendor,
        provider_code,
        channel_type,
        protocol,
        access_type,
        credential_rotation,
        credentials,
        capabilities,
        resource_codes,
        timeout_ms,
        retry_policy_json,
        circuit_breaker_policy_json,
        expires_at,
        weight,
        status,
    })
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedCredentialInput {
    name: String,
    base_url: String,
    secret_ref: String,
    secret_hash: String,
    masked_label: String,
    credential_material: Option<String>,
    priority: i64,
    weight: i64,
    status: String,
}

fn normalize_create_credentials(
    request: &Map<String, Value>,
    provider_code: &str,
) -> Result<Vec<NormalizedCredentialInput>, String> {
    let Some(value) = request.get("credentials") else {
        return Err("credentials must include at least one upstream credential".to_owned());
    };
    normalize_credentials_value(value, provider_code, true)
}

fn normalize_update_credentials(
    request: &Map<String, Value>,
    provider_code: Option<&str>,
) -> Result<Option<Vec<NormalizedCredentialInput>>, String> {
    let Some(value) = request.get("credentials") else {
        return Ok(None);
    };
    normalize_credentials_value(value, provider_code.unwrap_or("custom"), true).map(Some)
}

fn normalize_credentials_value(
    value: &Value,
    provider_code: &str,
    require_non_empty: bool,
) -> Result<Vec<NormalizedCredentialInput>, String> {
    let Value::Array(items) = value else {
        return Err("credentials must be an array".to_owned());
    };
    if items.is_empty() && require_non_empty {
        return Err("credentials must include at least one upstream credential".to_owned());
    }
    if items.len() > MAX_CREDENTIALS {
        return Err(format!(
            "credentials must include at most {MAX_CREDENTIALS} upstream credentials"
        ));
    }
    items
        .iter()
        .enumerate()
        .map(|(index, value)| normalize_credential_item(index, value, provider_code))
        .collect()
}

fn normalize_credential_item(
    index: usize,
    value: &Value,
    provider_code: &str,
) -> Result<NormalizedCredentialInput, String> {
    let Value::Object(object) = value else {
        return Err(format!("credentials[{index}] must be an object"));
    };
    let name = optional_text(object, "name", "credential name", MAX_CREDENTIAL_NAME_LEN)?
        .unwrap_or_else(|| format!("Credential {}", index + 1));
    let base_url = required_text(object, "baseUrl", "credential baseUrl", MAX_BASE_URL_LEN)
        .and_then(validate_base_url)?;
    let api_key = optional_text(object, "apiKey", "apiKey", MAX_API_KEY_LEN)?;
    let secret_ref = optional_text(object, "secretRef", "secretRef", MAX_SECRET_REF_LEN)?;
    let mut credential = match (api_key, secret_ref) {
        (Some(_), Some(_)) => {
            Err("channel credential must provide either apiKey or secretRef, not both".to_owned())
        }
        (Some(api_key), None) => credential_from_api_key(provider_code, &api_key),
        (None, Some(secret_ref)) => {
            validate_secret_ref(&secret_ref)?;
            Ok(NormalizedCredentialInput {
                name: String::new(),
                base_url: String::new(),
                secret_hash: digest_hex(&secret_ref),
                masked_label: mask_secret_ref(&secret_ref),
                secret_ref,
                credential_material: None,
                priority: 100,
                weight: 100,
                status: "active".to_owned(),
            })
        }
        (None, None) => Err(format!(
            "credentials[{index}] must provide either apiKey or secretRef"
        )),
    }?;
    credential.name = name;
    credential.base_url = base_url;
    credential.priority = optional_integer(object, "priority")?
        .map(normalize_credential_priority)
        .transpose()?
        .unwrap_or_else(|| i64::try_from(index + 1).unwrap_or(i64::MAX));
    credential.weight = optional_integer(object, "weight")?
        .map(normalize_weight)
        .transpose()?
        .unwrap_or(100);
    credential.status = optional_text(object, "status", "credential status", 32)?
        .map(|status| normalize_credential_status(&status))
        .transpose()?
        .unwrap_or_else(|| "active".to_owned());
    Ok(credential)
}

fn credential_from_api_key(
    provider_code: &str,
    api_key: &str,
) -> Result<NormalizedCredentialInput, String> {
    validate_api_key(api_key)?;
    let secret_hash = digest_hex(api_key);
    let suffix = secret_hash.chars().take(16).collect::<String>();
    let provider_code = normalize_secret_provider_code(provider_code);
    Ok(NormalizedCredentialInput {
        name: String::new(),
        base_url: String::new(),
        secret_ref: format!("secret://ai-channel-credentials/{provider_code}/{suffix}"),
        secret_hash,
        masked_label: mask_api_key(api_key),
        credential_material: Some(api_key.to_owned()),
        priority: 100,
        weight: 100,
        status: "active".to_owned(),
    })
}

fn reject_unsupported_plaintext_auth_key(request: &Map<String, Value>) -> Result<(), String> {
    reject_unsupported_plaintext_auth_key_value(&Value::Object(request.clone()))
}

fn reject_unsupported_plaintext_auth_key_value(value: &Value) -> Result<(), String> {
    match value {
        Value::Object(object) => {
            for (key, value) in object {
                if key == "apiKey" {
                    continue;
                }
                if is_unsupported_plaintext_secret_key(key) {
                    let has_plaintext = match value {
                        Value::String(value) => !value.trim().is_empty(),
                        Value::Null => false,
                        _ => true,
                    };
                    if has_plaintext {
                        return Err(
                            "apiKey is the supported plaintext credential input for channel credentials"
                                .to_owned(),
                        );
                    }
                }
                reject_unsupported_plaintext_auth_key_value(value)?;
            }
            Ok(())
        }
        Value::Array(items) => {
            for item in items {
                reject_unsupported_plaintext_auth_key_value(item)?;
            }
            Ok(())
        }
        _ => Ok(()),
    }
}

fn is_unsupported_plaintext_secret_key(key: &str) -> bool {
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

fn validate_api_key(value: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        return Err("apiKey is required".to_owned());
    }
    if !value.bytes().all(|byte| (0x21..=0x7e).contains(&byte)) {
        return Err("apiKey must contain only visible ASCII characters without spaces".to_owned());
    }
    Ok(())
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

fn normalize_provider_code(vendor: &str) -> Result<String, String> {
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
    match normalize_provider_code(vendor).as_deref() {
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

fn normalize_channel_type(value: &str) -> Result<String, String> {
    match value.trim().to_ascii_lowercase().as_str() {
        "official" => Ok("official".to_owned()),
        "relay" => Ok("relay".to_owned()),
        _ => Err("channelType must be one of official, relay".to_owned()),
    }
}

fn normalize_resource_codes(values: Vec<String>) -> Result<Vec<String>, String> {
    let mut normalized = Vec::new();
    for value in values {
        let code = value.trim().to_ascii_lowercase();
        if code.is_empty() {
            continue;
        }
        if !code
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'-' | b'_'))
        {
            return Err("resourceCodes may only contain letters, numbers, ., -, and _".to_owned());
        }
        if !normalized.iter().any(|existing| existing == &code) {
            normalized.push(code);
        }
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

fn normalize_credential_priority(priority: i64) -> Result<i64, String> {
    if !(MIN_PRIORITY..=MAX_PRIORITY).contains(&priority) {
        return Err(format!(
            "credential priority must be between {MIN_PRIORITY} and {MAX_PRIORITY}"
        ));
    }
    Ok(priority)
}

fn normalize_credential_status(value: &str) -> Result<String, String> {
    let value = value.trim().to_ascii_lowercase();
    match value.as_str() {
        "active" | "disabled" | "error" => Ok(value),
        _ => Err("credential status must be one of active, disabled, error".to_owned()),
    }
}

fn normalize_credential_rotation(value: &str) -> Result<String, String> {
    let normalized = value.trim().to_ascii_lowercase().replace('-', "_");
    match normalized.as_str() {
        "default" | "priority" | "round_robin" | "weighted_round_robin" | "random" => {
            Ok(normalized)
        }
        _ => Err(
            "credentialRotation must be one of default, priority, round_robin, weighted_round_robin, random"
                .to_owned(),
        ),
    }
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

fn validate_expires_at(value: String) -> Result<String, String> {
    let value = value.trim();
    if value.is_empty() {
        return Err("expiresAt must be a non-empty timestamp or null".to_owned());
    }
    if !value.bytes().all(|byte| (0x21..=0x7e).contains(&byte)) {
        return Err("expiresAt must contain only visible ASCII characters".to_owned());
    }
    Ok(value.to_owned())
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

fn normalize_secret_provider_code(value: &str) -> String {
    let normalized = value
        .trim()
        .to_ascii_lowercase()
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || character == '_' || character == '-' {
                character
            } else {
                '-'
            }
        })
        .collect::<String>()
        .trim_matches('-')
        .to_owned()
        .chars()
        .take(64)
        .collect::<String>();
    if normalized.is_empty() {
        "custom".to_owned()
    } else {
        normalized
    }
}

fn digest_hex(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    hex::encode(hasher.finalize())
}

fn mask_secret_ref(value: &str) -> String {
    value
        .rsplit('/')
        .next()
        .filter(|part| !part.is_empty())
        .map(|part| format!("ref:***{part}"))
        .unwrap_or_else(|| "ref:***".to_owned())
}

fn mask_api_key(value: &str) -> String {
    let prefix: String = value.chars().take(4).collect();
    let suffix: String = value
        .chars()
        .rev()
        .take(4)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect();
    if value.chars().count() <= 8 {
        "key:***".to_owned()
    } else {
        format!("{prefix}***{suffix}")
    }
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

fn build_create_command(
    state: AdminChannelState,
    _headers: &HeaderMap,
    subject: AdminChannelSubject,
    request: NormalizedCreateRequest,
) -> Result<CreateAdminChannelCommand, ChannelCommandBuildError> {
    let credentials = build_credential_inputs(&state, request.credentials)?;
    Ok(CreateAdminChannelCommand {
        subject,
        channel_uuid: generate_entity_uuid(&state)?,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        name: request.name,
        vendor: request.vendor,
        provider_code: request.provider_code,
        channel_type: request.channel_type,
        protocol: request.protocol,
        access_type: request.access_type,
        credential_rotation: request.credential_rotation,
        credentials,
        capabilities: request.capabilities,
        resource_codes: request.resource_codes,
        is_multimodal: request.is_multimodal,
        timeout_ms: request.timeout_ms,
        retry_policy_json: request.retry_policy_json,
        circuit_breaker_policy_json: request.circuit_breaker_policy_json,
        expires_at: request.expires_at,
        weight: request.weight,
        status: request.status,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_update_command(
    state: AdminChannelState,
    _headers: &HeaderMap,
    subject: AdminChannelSubject,
    request: NormalizedUpdateRequest,
) -> Result<UpdateAdminChannelCommand, ChannelCommandBuildError> {
    let credentials = request
        .credentials
        .map(|credentials| build_credential_inputs(&state, credentials))
        .transpose()?;
    Ok(UpdateAdminChannelCommand {
        subject,
        channel_id: request.channel_id,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        name: request.name,
        vendor: request.vendor,
        provider_code: request.provider_code,
        channel_type: request.channel_type,
        protocol: request.protocol,
        access_type: request.access_type,
        credential_rotation: request.credential_rotation,
        credentials,
        capabilities: request.capabilities,
        resource_codes: request.resource_codes,
        timeout_ms: request.timeout_ms,
        retry_policy_json: request.retry_policy_json,
        circuit_breaker_policy_json: request.circuit_breaker_policy_json,
        expires_at: request.expires_at,
        weight: request.weight,
        status: request.status,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_credential_inputs(
    state: &AdminChannelState,
    credentials: Vec<NormalizedCredentialInput>,
) -> Result<Vec<AdminChannelCredentialInput>, ChannelCommandBuildError> {
    credentials
        .into_iter()
        .map(|credential| {
            Ok(AdminChannelCredentialInput {
                credential_uuid: generate_entity_uuid(state)?,
                name: credential.name,
                base_url: credential.base_url,
                secret_ref: credential.secret_ref,
                secret_hash: credential.secret_hash,
                masked_label: credential.masked_label,
                credential_material: credential.credential_material,
                priority: credential.priority,
                weight: credential.weight,
                status: credential.status,
            })
        })
        .collect()
}

fn build_delete_command(
    state: AdminChannelState,
    _headers: &HeaderMap,
    subject: AdminChannelSubject,
    channel_id: i64,
) -> Result<DeleteAdminChannelCommand, ChannelCommandBuildError> {
    Ok(DeleteAdminChannelCommand {
        subject,
        channel_id,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_test_command(
    state: AdminChannelState,
    _headers: &HeaderMap,
    subject: AdminChannelSubject,
    channel_id: i64,
) -> Result<TestAdminChannelCommand, ChannelCommandBuildError> {
    Ok(TestAdminChannelCommand {
        subject,
        channel_id,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn generate_entity_uuid(state: &AdminChannelState) -> Result<String, ChannelCommandBuildError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(ChannelCommandBuildError::System)
}

fn request_id_error(error: RequestIdError) -> ChannelCommandBuildError {
    match error {
        RequestIdError::Invalid(message) => ChannelCommandBuildError::BadRequest(message),
        RequestIdError::System(message) => {
            ChannelCommandBuildError::System(DomainError::new(message))
        }
    }
}

fn to_safe_item_response(item: AdminChannelItem) -> AdminChannelSafeItemResponse {
    AdminChannelSafeItemResponse {
        id: item.id.to_string(),
        channel_id: item.channel_id.to_string(),
        name: item.name,
        vendor: item.vendor,
        channel_type: item.channel_type,
        protocol: item.protocol,
        access_type: item.access_type,
        credential_rotation: item.credential_rotation,
        credentials: item
            .credentials
            .into_iter()
            .map(to_safe_credential_response)
            .collect(),
        created_at: item.created_at,
        expires_at: item.expires_at,
        capabilities: item.capabilities,
        resource_codes: item.resource_codes,
        is_multimodal: item.is_multimodal,
        timeout_ms: item.timeout_ms,
        retry_policy: item
            .retry_policy_json
            .as_deref()
            .and_then(retry_policy_response_from_json),
        circuit_breaker_policy: item
            .circuit_breaker_policy_json
            .as_deref()
            .and_then(circuit_breaker_policy_response_from_json),
        weight: item.weight,
        status: item.status,
        balance: item.balance,
        errors: item.errors,
    }
}

fn to_safe_credential_response(
    item: AdminChannelCredentialItem,
) -> AdminChannelSafeCredentialResponse {
    AdminChannelSafeCredentialResponse {
        id: item.id.to_string(),
        credential_id: item.credential_id.to_string(),
        name: item.name,
        base_url: item.base_url,
        masked_label: item.masked_label,
        priority: item.priority,
        weight: item.weight,
        status: item.status,
        errors: item.errors,
    }
}

fn retry_policy_response_from_json(value: &str) -> Option<AdminChannelRetryPolicyResponse> {
    ProviderRetryPolicy::from_json_str(value)
        .ok()
        .map(|policy| AdminChannelRetryPolicyResponse {
            max_attempts: policy.max_attempts,
            retryable_status_codes: policy.retryable_status_codes,
            backoff_ms: policy.backoff_ms,
        })
}

fn circuit_breaker_policy_response_from_json(
    value: &str,
) -> Option<AdminChannelCircuitBreakerPolicyResponse> {
    ProviderCircuitBreakerPolicy::from_json_str(value)
        .ok()
        .map(|policy| AdminChannelCircuitBreakerPolicyResponse {
            failure_threshold: policy.failure_threshold,
        })
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

fn bad_request(message: String) -> Response {
    problem_from_wire_code("4001", message).into_response()
}

fn not_found_response(message: &'static str) -> Response {
    problem_from_wire_code("4040", message).into_response()
}

fn conflict_response(error: DomainError) -> Response {
    problem_from_wire_code("4090", error.to_string()).into_response()
}

fn command_build_error_response(error: ChannelCommandBuildError) -> Response {
    match error {
        ChannelCommandBuildError::BadRequest(message) => bad_request(message),
        ChannelCommandBuildError::System(error) => {
            channel_system_response("channel command is invalid", error)
        }
    }
}

fn channel_system_response(context: &str, error: DomainError) -> Response {
    problem_from_wire_code("5000", format!("{context}: {error}")).into_response()
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
