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
use crate::ports::{
    AdminModelRateLimitItem, AdminModelRateLimitStore, AdminModelRateLimitSubject,
    CreateAdminModelRateLimitCommand, ListAdminModelRateLimitsQuery,
};
use sdkwork_utils_rust::datetime::current_timestamp_string;

const MAX_MODEL_LEN: usize = 128;
const MAX_GROUP_LEN: usize = 128;
const MIN_LIMIT_VALUE: i64 = 1;
const MAX_LIMIT_VALUE: i64 = 1_000_000_000;
const ACCOUNT_GROUP_NOT_FOUND: &str = "account group was not found";

#[derive(Clone)]
struct AdminModelRateLimitState {
    store: Arc<dyn AdminModelRateLimitStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
struct AdminModelRateLimitListQueryRequest {
    page: Option<i64>,
    page_size: Option<i64>,
    q: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminModelRateLimitCreateRequest {
    model: Option<String>,
    account_group: Option<String>,
    rpm: Option<i64>,
    tpm: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedCreateRequest {
    model: String,
    account_group: String,
    rpm: i64,
    tpm: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminModelRateLimitItemEnvelope {
    item: AdminModelRateLimitItemResponse,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminModelRateLimitItemResponse {
    id: String,
    model: String,
    account_group: String,
    account_group_id: String,
    account_group_name: String,
    rpm: i64,
    tpm: i64,
    status: String,
}

pub fn admin_model_rate_limit_router_with_store(
    store: Arc<dyn AdminModelRateLimitStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/system/rate_limits/models",
            get(fetch_model_rate_limits).post(create_model_rate_limit),
        )
        .with_state(AdminModelRateLimitState {
            store,
            entity_uuid_generator,
        })
}

async fn fetch_model_rate_limits(
    State(state): State<AdminModelRateLimitState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(request): Query<AdminModelRateLimitListQueryRequest>,
) -> Response {
    let subject = scoped.into();
    let query = match build_list_query(subject, request) {
        Ok(query) => query,
        Err(message) => return bad_request(message),
    };

    match state.store.list_model_rate_limits(query).await {
        Ok(page) => json_success_list_response(
            None,
            page.items.into_iter().map(to_item_response).collect(),
            offset_page_info(page.page_no, page.page_size, page.total),
        ),
        Err(error) => {
            system_error_response("model rate limit read model is unavailable", error)
        }
    }
}

fn build_list_query(
    subject: AdminModelRateLimitSubject,
    request: AdminModelRateLimitListQueryRequest,
) -> Result<ListAdminModelRateLimitsQuery, String> {
    let pagination = parse_offset_list_query(request.page, request.page_size)?;
    Ok(ListAdminModelRateLimitsQuery {
        subject,
        page_no: pagination.page_no,
        page_size: pagination.page_size,
        offset: pagination.offset,
        q: normalize_list_search_query(request.q, "q")?,
    })
}

async fn create_model_rate_limit(
    State(state): State<AdminModelRateLimitState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request =
        match parse_json_body::<AdminModelRateLimitCreateRequest>(&body, "model rate limit") {
            Ok(request) => request,
            Err(message) => return bad_request(message),
        };
    let request = match normalize_create_request(request) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match build_create_command(state.clone(), &headers, subject, request) {
        Ok(command) => command,
        Err(error) => return command_error_response(error, "model rate limit command is invalid"),
    };

    match state.store.create_model_rate_limit(command).await {
        Ok(item) => json_created_response(
            None,
            AdminModelRateLimitItemEnvelope {
                item: to_item_response(item),
            },
        ),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) if error.to_string().contains(ACCOUNT_GROUP_NOT_FOUND) => {
            bad_request("accountGroup must identify an existing upstream account group".to_owned())
        }
        Err(error) => {
            system_error_response("model rate limit command store is unavailable", error)
        }
    }
}

fn normalize_create_request(
    request: AdminModelRateLimitCreateRequest,
) -> Result<NormalizedCreateRequest, String> {
    Ok(NormalizedCreateRequest {
        model: normalize_model(request.model.as_deref())?,
        account_group: normalize_group(request.account_group.as_deref())?,
        rpm: normalize_limit_value(request.rpm, "rpm")?,
        tpm: normalize_limit_value(request.tpm, "tpm")?,
    })
}

fn normalize_model(value: Option<&str>) -> Result<String, String> {
    let value = value.unwrap_or("").trim();
    if value.is_empty() {
        return Err("model is required".to_owned());
    }
    if value.chars().count() > MAX_MODEL_LEN {
        return Err(format!("model must be at most {MAX_MODEL_LEN} characters"));
    }
    if !value.bytes().all(|byte| {
        byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b':' | b'/' | b'-')
    }) {
        return Err(
            "model must use ASCII letters, numbers, dot, underscore, colon, slash, or hyphen"
                .to_owned(),
        );
    }
    Ok(value.to_owned())
}

fn normalize_group(value: Option<&str>) -> Result<String, String> {
    let value = value.unwrap_or("").trim();
    if value.is_empty() {
        return Err("accountGroup is required".to_owned());
    }
    if value.chars().count() > MAX_GROUP_LEN {
        return Err(format!(
            "accountGroup must be at most {MAX_GROUP_LEN} characters"
        ));
    }
    if value.chars().any(char::is_control) {
        return Err("accountGroup must not contain control characters".to_owned());
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
    state: AdminModelRateLimitState,
    _headers: &HeaderMap,
    subject: AdminModelRateLimitSubject,
    request: NormalizedCreateRequest,
) -> Result<CreateAdminModelRateLimitCommand, ApiCommandError> {
    let policy_uuid = generate_entity_uuid(&state)?;
    let policy_code = entity_code("mrl", &policy_uuid);
    Ok(CreateAdminModelRateLimitCommand {
        subject,
        policy_uuid,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        policy_code,
        model: request.model,
        account_group: request.account_group,
        rpm: request.rpm,
        tpm: request.tpm,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn generate_entity_uuid(
    state: &AdminModelRateLimitState,
) -> Result<String, ApiCommandError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(ApiCommandError::System)
}

fn to_item_response(item: AdminModelRateLimitItem) -> AdminModelRateLimitItemResponse {
    AdminModelRateLimitItemResponse {
        id: item.id.to_string(),
        model: item.model,
        account_group: item.account_group,
        account_group_id: item.account_group_id.to_string(),
        account_group_name: item.account_group_name,
        rpm: item.rpm,
        tpm: item.tpm,
        status: item.status,
    }
}

fn entity_code(prefix: &str, uuid: &str) -> String {
    let short = uuid.chars().take(24).collect::<String>();
    format!("{prefix}-{short}")
}

