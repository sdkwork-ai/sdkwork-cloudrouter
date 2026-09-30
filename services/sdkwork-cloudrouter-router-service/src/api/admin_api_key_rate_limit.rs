use std::sync::Arc;

use axum::body::Bytes;
use axum::extract::{Query, State};
use axum::http::HeaderMap;
use axum::response::Response;
use axum::routing::get;
use axum::Router;
use serde::{Deserialize, Serialize};

use crate::api::request_id::generate_server_request_id;
use crate::api::response::{
    bad_request, json_created_response, json_success_list_response, normalize_list_search_query,
    offset_page_info, parse_offset_list_query,
    domain_conflict_response as conflict_response,
};
use crate::api::text_normalization::parse_json_body;
use crate::api::command_error::{
    command_error_from_request_id as request_id_error, command_error_response,
    system_error_response, ApiCommandError,
};
use crate::application::EntityUuidGenerator;
use crate::infrastructure::sql::sql_hash::digest_hex;
use crate::ports::{
    AdminApiKeyRateLimitItem, AdminApiKeyRateLimitStore, AdminApiKeyRateLimitSubject,
    CreateAdminApiKeyRateLimitCommand, ListAdminApiKeyRateLimitsQuery,
};
use sdkwork_utils_rust::datetime::current_timestamp_string;

const MAX_KEY_PREFIX_LEN: usize = 32;
const MIN_KEY_PREFIX_LEN: usize = 3;
const MAX_USER_LEN: usize = 128;
const MIN_LIMIT_VALUE: i64 = 1;
const MAX_LIMIT_VALUE: i64 = 1_000_000_000;
const API_KEY_PREFIX_NOT_FOUND: &str = "api key prefix was not found";

#[derive(Clone)]
struct AdminApiKeyRateLimitState {
    store: Arc<dyn AdminApiKeyRateLimitStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
struct AdminApiKeyRateLimitListQueryRequest {
    page: Option<i64>,
    page_size: Option<i64>,
    q: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminApiKeyRateLimitCreateRequest {
    key_prefix: Option<String>,
    user: Option<String>,
    rps: Option<i64>,
    rpd: Option<i64>,
    burst: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedCreateRequest {
    key_prefix: String,
    user: String,
    rps: i64,
    rpd: i64,
    burst: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminApiKeyRateLimitItemEnvelope {
    item: AdminApiKeyRateLimitItemResponse,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminApiKeyRateLimitItemResponse {
    id: String,
    key_prefix: String,
    user: String,
    rps: i64,
    rpd: i64,
    burst: i64,
    status: String,
}

pub fn admin_api_key_rate_limit_router_with_store(
    store: Arc<dyn AdminApiKeyRateLimitStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/system/rate_limits/api_keys",
            get(fetch_api_key_rate_limits).post(create_api_key_rate_limit),
        )
        .with_state(AdminApiKeyRateLimitState {
            store,
            entity_uuid_generator,
        })
}

async fn fetch_api_key_rate_limits(
    State(state): State<AdminApiKeyRateLimitState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(request): Query<AdminApiKeyRateLimitListQueryRequest>,
) -> Response {
    let subject = scoped.into();
    let query = match build_list_query(subject, request) {
        Ok(query) => query,
        Err(message) => return bad_request(message),
    };

    match state.store.list_api_key_rate_limits(query).await {
        Ok(page) => json_success_list_response(
            None,
            page.items.into_iter().map(to_item_response).collect(),
            offset_page_info(page.page_no, page.page_size, page.total),
        ),
        Err(error) => system_error_response(
            "api key rate limit read model is unavailable",
            error,
        ),
    }
}

fn build_list_query(
    subject: AdminApiKeyRateLimitSubject,
    request: AdminApiKeyRateLimitListQueryRequest,
) -> Result<ListAdminApiKeyRateLimitsQuery, String> {
    let pagination = parse_offset_list_query(request.page, request.page_size)?;
    Ok(ListAdminApiKeyRateLimitsQuery {
        subject,
        page_no: pagination.page_no,
        page_size: pagination.page_size,
        offset: pagination.offset,
        q: normalize_list_search_query(request.q, "q")?,
    })
}

async fn create_api_key_rate_limit(
    State(state): State<AdminApiKeyRateLimitState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request =
        match parse_json_body::<AdminApiKeyRateLimitCreateRequest>(&body, "api key rate limit") {
            Ok(request) => request,
            Err(message) => return bad_request(message),
        };
    let request = match normalize_create_request(request) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match build_create_command(state.clone(), &headers, subject, request) {
        Ok(command) => command,
        Err(error) => return command_error_response(error, "api key rate limit command is invalid"),
    };

    match state.store.create_api_key_rate_limit(command).await {
        Ok(item) => json_created_response(
            None,
            AdminApiKeyRateLimitItemEnvelope {
                item: to_item_response(item),
            },
        ),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) if error.to_string().contains(API_KEY_PREFIX_NOT_FOUND) => {
            bad_request("keyPrefix must identify an existing API key prefix".to_owned())
        }
        Err(error) => system_error_response(
            "api key rate limit command store is unavailable",
            error,
        ),
    }
}

fn normalize_create_request(
    request: AdminApiKeyRateLimitCreateRequest,
) -> Result<NormalizedCreateRequest, String> {
    Ok(NormalizedCreateRequest {
        key_prefix: normalize_key_prefix(request.key_prefix.as_deref())?,
        user: normalize_required_text(
            request.user.as_deref(),
            "api key rate limit user",
            MAX_USER_LEN,
        )?,
        rps: normalize_limit_value(request.rps, "rps")?,
        rpd: normalize_limit_value(request.rpd, "rpd")?,
        burst: normalize_limit_value(request.burst, "burst")?,
    })
}

fn normalize_key_prefix(value: Option<&str>) -> Result<String, String> {
    let value = value.unwrap_or("").trim();
    if value.is_empty() || value == "sk-proj-..." || value.ends_with("...") {
        return Err("keyPrefix must identify an existing API key prefix".to_owned());
    }
    if value.chars().count() < MIN_KEY_PREFIX_LEN || value.chars().count() > MAX_KEY_PREFIX_LEN {
        return Err(format!(
            "keyPrefix must be between {MIN_KEY_PREFIX_LEN} and {MAX_KEY_PREFIX_LEN} characters"
        ));
    }
    if !value
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
    {
        return Err("keyPrefix must use ASCII letters, numbers, hyphen, or underscore".to_owned());
    }
    Ok(value.to_owned())
}

fn normalize_required_text(
    value: Option<&str>,
    field_name: &str,
    max_len: usize,
) -> Result<String, String> {
    let value = value.unwrap_or("").trim();
    if value.is_empty() {
        return Err(format!("{field_name} is required"));
    }
    if value.chars().count() > max_len {
        return Err(format!("{field_name} must be at most {max_len} characters"));
    }
    Ok(value.to_owned())
}

fn normalize_limit_value(value: Option<i64>, field_name: &str) -> Result<i64, String> {
    let value = value.ok_or_else(|| format!("{field_name} is required"))?;
    if !(MIN_LIMIT_VALUE..=MAX_LIMIT_VALUE).contains(&value) {
        return Err(format!(
            "{field_name} must be between {MIN_LIMIT_VALUE} and {MAX_LIMIT_VALUE}"
        ));
    }
    Ok(value)
}

fn build_create_command(
    state: AdminApiKeyRateLimitState,
    _headers: &HeaderMap,
    subject: AdminApiKeyRateLimitSubject,
    request: NormalizedCreateRequest,
) -> Result<CreateAdminApiKeyRateLimitCommand, ApiCommandError> {
    let policy_uuid = generate_entity_uuid(&state)?;
    let policy_code = entity_code("akrl", &policy_uuid);
    Ok(CreateAdminApiKeyRateLimitCommand {
        subject,
        policy_uuid,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        policy_code,
        key_prefix_hash: digest_hex(&request.key_prefix),
        key_prefix: request.key_prefix,
        user: request.user,
        rps: request.rps,
        rpd: request.rpd,
        burst: request.burst,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn generate_entity_uuid(
    state: &AdminApiKeyRateLimitState,
) -> Result<String, ApiCommandError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(ApiCommandError::System)
}

fn to_item_response(item: AdminApiKeyRateLimitItem) -> AdminApiKeyRateLimitItemResponse {
    AdminApiKeyRateLimitItemResponse {
        id: item.id.to_string(),
        key_prefix: item.key_prefix,
        user: item.user,
        rps: item.rps,
        rpd: item.rpd,
        burst: item.burst,
        status: item.status,
    }
}

fn entity_code(prefix: &str, uuid: &str) -> String {
    let short = uuid.chars().take(24).collect::<String>();
    format!("{prefix}-{short}")
}

