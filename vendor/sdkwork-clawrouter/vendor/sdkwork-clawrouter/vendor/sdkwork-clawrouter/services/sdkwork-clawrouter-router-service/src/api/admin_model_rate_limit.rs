use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;

use axum::body::Bytes;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use crate::api::request_id::{generate_server_request_id, RequestIdError};
use crate::api::response::PlusApiResult;
use crate::application::EntityUuidGenerator;
use crate::domain::DomainError;
use crate::ports::{
    AdminModelRateLimitItem, AdminModelRateLimitStore, AdminModelRateLimitSubject,
    CreateAdminModelRateLimitCommand, ListAdminModelRateLimitsQuery,
};

const MAX_MODEL_LEN: usize = 128;
const MAX_GROUP_LEN: usize = 128;
const MIN_LIMIT_VALUE: i64 = 1;
const MAX_LIMIT_VALUE: i64 = 1_000_000_000;
const CHANNEL_GROUP_NOT_FOUND: &str = "channel group was not found";

#[derive(Clone)]
struct AdminModelRateLimitState {
    store: Arc<dyn AdminModelRateLimitStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminModelRateLimitCreateRequest {
    model: Option<String>,
    channel_group: Option<String>,
    rpm: Option<i64>,
    tpm: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedCreateRequest {
    model: String,
    channel_group: String,
    rpm: i64,
    tpm: i64,
}

enum ModelRateLimitCommandBuildError {
    BadRequest(String),
    System(DomainError),
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminModelRateLimitListResponse {
    items: Vec<AdminModelRateLimitItemResponse>,
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
    channel_group: String,
    channel_group_id: String,
    channel_group_name: String,
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
) -> Response {
    let subject = scoped.into();

    match state
        .store
        .list_model_rate_limits(ListAdminModelRateLimitsQuery { subject })
        .await
    {
        Ok(items) => Json(PlusApiResult::success(AdminModelRateLimitListResponse {
            items: items.into_iter().map(to_item_response).collect(),
        }))
        .into_response(),
        Err(error) => {
            model_rate_limit_system_response("model rate limit read model is unavailable", error)
        }
    }
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
        Err(error) => return command_build_error_response(error),
    };

    match state.store.create_model_rate_limit(command).await {
        Ok(item) => Json(PlusApiResult::success(AdminModelRateLimitItemEnvelope {
            item: to_item_response(item),
        }))
        .into_response(),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) if error.to_string().contains(CHANNEL_GROUP_NOT_FOUND) => {
            bad_request("channelGroup must identify an existing ai channel group".to_owned())
        }
        Err(error) => {
            model_rate_limit_system_response("model rate limit command store is unavailable", error)
        }
    }
}


fn parse_json_body<T>(body: &[u8], entity_name: &str) -> Result<T, String>
where
    T: for<'de> Deserialize<'de>,
{
    if body.iter().all(u8::is_ascii_whitespace) {
        return Err(format!("{entity_name} request body is required"));
    }
    serde_json::from_slice(body)
        .map_err(|error| format!("invalid {entity_name} request body: {error}"))
}

fn normalize_create_request(
    request: AdminModelRateLimitCreateRequest,
) -> Result<NormalizedCreateRequest, String> {
    Ok(NormalizedCreateRequest {
        model: normalize_model(request.model.as_deref())?,
        channel_group: normalize_group(request.channel_group.as_deref())?,
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
        return Err("channelGroup is required".to_owned());
    }
    if value.chars().count() > MAX_GROUP_LEN {
        return Err(format!(
            "channelGroup must be at most {MAX_GROUP_LEN} characters"
        ));
    }
    if value.chars().any(char::is_control) {
        return Err("channelGroup must not contain control characters".to_owned());
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
) -> Result<CreateAdminModelRateLimitCommand, ModelRateLimitCommandBuildError> {
    let policy_uuid = generate_entity_uuid(&state)?;
    let policy_code = entity_code("mrl", &policy_uuid);
    Ok(CreateAdminModelRateLimitCommand {
        subject,
        policy_uuid,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        policy_code,
        model: request.model,
        channel_group: request.channel_group,
        rpm: request.rpm,
        tpm: request.tpm,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn generate_entity_uuid(
    state: &AdminModelRateLimitState,
) -> Result<String, ModelRateLimitCommandBuildError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(ModelRateLimitCommandBuildError::System)
}

fn request_id_error(error: RequestIdError) -> ModelRateLimitCommandBuildError {
    match error {
        RequestIdError::Invalid(message) => ModelRateLimitCommandBuildError::BadRequest(message),
        RequestIdError::System(message) => {
            ModelRateLimitCommandBuildError::System(DomainError::new(message))
        }
    }
}

fn to_item_response(item: AdminModelRateLimitItem) -> AdminModelRateLimitItemResponse {
    AdminModelRateLimitItemResponse {
        id: item.id.to_string(),
        model: item.model,
        channel_group: item.channel_group,
        channel_group_id: item.channel_group_id.to_string(),
        channel_group_name: item.channel_group_name,
        rpm: item.rpm,
        tpm: item.tpm,
        status: item.status,
    }
}

fn entity_code(prefix: &str, uuid: &str) -> String {
    let short = uuid.chars().take(24).collect::<String>();
    format!("{prefix}-{short}")
}

fn bad_request(message: String) -> Response {
    (
        StatusCode::BAD_REQUEST,
        Json(PlusApiResult::error("4001", message)),
    )
        .into_response()
}

fn conflict_response(error: DomainError) -> Response {
    (
        StatusCode::CONFLICT,
        Json(PlusApiResult::error("4090", error.to_string())),
    )
        .into_response()
}

fn command_build_error_response(error: ModelRateLimitCommandBuildError) -> Response {
    match error {
        ModelRateLimitCommandBuildError::BadRequest(message) => bad_request(message),
        ModelRateLimitCommandBuildError::System(error) => {
            model_rate_limit_system_response("model rate limit command is invalid", error)
        }
    }
}

fn model_rate_limit_system_response(context: &str, error: DomainError) -> Response {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(PlusApiResult::error("5000", format!("{context}: {error}"))),
    )
        .into_response()
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
