use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Bytes;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use crate::api::request_id::{generate_server_request_id, RequestIdError};
use crate::api::response::{problem_from_wire_code, success_envelope};
use crate::application::EntityUuidGenerator;
use crate::domain::DomainError;
use crate::ports::{
    GetRuntimeRegionSettingsQuery, RuntimeRegionSettings, RuntimeRegionSettingsStore,
    RuntimeRegionSettingsSubject, UpdateRuntimeRegionSettingsCommand,
};

const MAX_REGION_CODE_LEN: usize = 64;
const MAX_REGION_NAME_LEN: usize = 128;
const MAX_REMARK_LEN: usize = 512;

#[derive(Clone)]
struct AdminRuntimeRegionSettingsState {
    store: Arc<dyn RuntimeRegionSettingsStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    cache: Arc<RwLock<HashMap<RuntimeRegionSettingsCacheKey, RuntimeRegionSettings>>>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
struct RuntimeRegionSettingsCacheKey {
    tenant_id: i64,
    organization_id: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeRegionSettingsUpdateRequest {
    current_region_code: Option<String>,
    current_region_name: Option<String>,
    remark: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeRegionSettingsResponse {
    current_region_code: String,
    current_region_name: String,
    remark: String,
}

enum RuntimeRegionSettingsCommandBuildError {
    BadRequest(String),
    System(DomainError),
}

pub fn admin_runtime_region_settings_router_with_store(
    store: Arc<dyn RuntimeRegionSettingsStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/system/runtime_region/settings",
            get(fetch_runtime_region_settings).patch(update_runtime_region_settings),
        )
        .with_state(AdminRuntimeRegionSettingsState {
            store,
            entity_uuid_generator,
            cache: Arc::new(RwLock::new(HashMap::new())),
        })
}

async fn fetch_runtime_region_settings(
    State(state): State<AdminRuntimeRegionSettingsState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject = scoped.into();
    match load_settings_with_cache(&state, subject).await {
        Ok(settings) => Json(success_envelope(to_response(settings))).into_response(),
        Err(error) => runtime_region_system_response(
            "runtime region settings read model is unavailable",
            error,
        ),
    }
}

async fn update_runtime_region_settings(
    State(state): State<AdminRuntimeRegionSettingsState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_body::<RuntimeRegionSettingsUpdateRequest>(
        &body,
        "runtime region settings",
    ) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let current = match load_settings_with_cache(&state, subject).await {
        Ok(settings) => settings,
        Err(error) => {
            return runtime_region_system_response(
                "runtime region settings read model is unavailable",
                error,
            );
        }
    };
    let settings = match merge_update_request(current, request) {
        Ok(settings) => settings,
        Err(message) => return bad_request(message),
    };
    let command = match build_update_command(state.clone(), subject, settings) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };

    match state.store.update_runtime_region_settings(command).await {
        Ok(settings) => {
            let settings = settings.normalized();
            replace_cache(&state, subject, settings.clone()).await;
            Json(success_envelope(to_response(settings))).into_response()
        }
        Err(error) => runtime_region_system_response(
            "runtime region settings command store is unavailable",
            error,
        ),
    }
}

async fn load_settings_with_cache(
    state: &AdminRuntimeRegionSettingsState,
    subject: RuntimeRegionSettingsSubject,
) -> Result<RuntimeRegionSettings, DomainError> {
    let cache_key = RuntimeRegionSettingsCacheKey::from_subject(subject);
    if let Some(settings) = state.cache.read().await.get(&cache_key).cloned() {
        return Ok(settings);
    }
    let settings = state
        .store
        .get_runtime_region_settings(GetRuntimeRegionSettingsQuery { subject })
        .await?
        .normalized();
    replace_cache(state, subject, settings.clone()).await;
    Ok(settings)
}

async fn replace_cache(
    state: &AdminRuntimeRegionSettingsState,
    subject: RuntimeRegionSettingsSubject,
    settings: RuntimeRegionSettings,
) {
    state.cache.write().await.insert(
        RuntimeRegionSettingsCacheKey::from_subject(subject),
        settings,
    );
}

impl RuntimeRegionSettingsCacheKey {
    fn from_subject(subject: RuntimeRegionSettingsSubject) -> Self {
        Self {
            tenant_id: subject.tenant_id,
            organization_id: subject.organization_id,
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

fn merge_update_request(
    mut current: RuntimeRegionSettings,
    request: RuntimeRegionSettingsUpdateRequest,
) -> Result<RuntimeRegionSettings, String> {
    if let Some(value) = request.current_region_code {
        current.current_region_code = normalize_region_code_field("currentRegionCode", &value)?;
    }
    if let Some(value) = request.current_region_name {
        current.current_region_name =
            normalize_optional_field("currentRegionName", Some(&value), MAX_REGION_NAME_LEN)?;
    }
    if let Some(value) = request.remark {
        current.remark = normalize_optional_field("remark", Some(&value), MAX_REMARK_LEN)?;
    }
    Ok(current.normalized())
}

fn normalize_region_code_field(field_name: &str, value: &str) -> Result<String, String> {
    let value = normalize_optional_field(field_name, Some(value), MAX_REGION_CODE_LEN)?;
    if value.is_empty()
        || !value
            .chars()
            .all(|ch| ch.is_ascii_lowercase() || ch.is_ascii_digit() || ch == '-' || ch == '_')
    {
        return Err(format!("{field_name} must be a lowercase region code"));
    }
    Ok(value)
}

fn normalize_optional_field(
    field_name: &str,
    value: Option<&str>,
    max_len: usize,
) -> Result<String, String> {
    let value = value.unwrap_or_default().trim();
    if value.chars().count() > max_len {
        return Err(format!(
            "{field_name} length must not exceed {max_len} characters"
        ));
    }
    if value.chars().any(|ch| ch.is_ascii_control()) {
        return Err(format!("{field_name} must not contain control characters"));
    }
    Ok(value.to_owned())
}

fn build_update_command(
    state: AdminRuntimeRegionSettingsState,
    subject: RuntimeRegionSettingsSubject,
    settings: RuntimeRegionSettings,
) -> Result<UpdateRuntimeRegionSettingsCommand, RuntimeRegionSettingsCommandBuildError> {
    Ok(UpdateRuntimeRegionSettingsCommand {
        subject,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        settings,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn generate_entity_uuid(
    state: &AdminRuntimeRegionSettingsState,
) -> Result<String, RuntimeRegionSettingsCommandBuildError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(RuntimeRegionSettingsCommandBuildError::System)
}

fn request_id_error(error: RequestIdError) -> RuntimeRegionSettingsCommandBuildError {
    match error {
        RequestIdError::Invalid(message) => {
            RuntimeRegionSettingsCommandBuildError::BadRequest(message)
        }
        RequestIdError::System(message) => {
            RuntimeRegionSettingsCommandBuildError::System(DomainError::new(message))
        }
    }
}

fn to_response(settings: RuntimeRegionSettings) -> RuntimeRegionSettingsResponse {
    RuntimeRegionSettingsResponse {
        current_region_code: settings.current_region_code,
        current_region_name: settings.current_region_name,
        remark: settings.remark,
    }
}

fn bad_request(message: String) -> Response {
    problem_from_wire_code("4001", message).into_response()
}

fn command_build_error_response(error: RuntimeRegionSettingsCommandBuildError) -> Response {
    match error {
        RuntimeRegionSettingsCommandBuildError::BadRequest(message) => bad_request(message),
        RuntimeRegionSettingsCommandBuildError::System(error) => {
            runtime_region_system_response("runtime region settings command is invalid", error)
        }
    }
}

fn runtime_region_system_response(context: &str, error: DomainError) -> Response {
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
