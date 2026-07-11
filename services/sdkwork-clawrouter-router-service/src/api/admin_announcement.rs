use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, patch};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use crate::api::request_id::{generate_server_request_id, RequestIdError};
use crate::api::response::{
    json_created_response, json_success_list_response, no_content_response,
    normalize_list_search_query, offset_page_info, parse_offset_list_query, problem_from_wire_code,
    success_envelope,
};
use crate::application::EntityUuidGenerator;
use crate::domain::DomainError;
use crate::ports::{
    AdminAnnouncementItem, AdminAnnouncementStore, AdminAnnouncementSubject,
    CreateAdminAnnouncementCommand, DeleteAdminAnnouncementCommand, ListAdminAnnouncementsQuery,
    UpdateAdminAnnouncementCommand,
};

const MAX_TITLE_LEN: usize = 200;
const MAX_CONTENT_LEN: usize = 20_000;

#[derive(Clone)]
struct AdminAnnouncementState {
    store: Arc<dyn AdminAnnouncementStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
}

#[derive(Debug, Default, Deserialize)]
struct AdminAnnouncementListQueryRequest {
    page: Option<i64>,
    page_size: Option<i64>,
    q: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminAnnouncementCreateRequest {
    title: Option<String>,
    target: Option<String>,
    status: Option<String>,
    show_as_popup: Option<bool>,
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminAnnouncementUpdateRequest {
    title: Option<String>,
    target: Option<String>,
    status: Option<String>,
    show_as_popup: Option<bool>,
    content: Option<String>,
}

struct NormalizedCreateRequest {
    title: String,
    content: String,
    target: String,
    status: String,
    show_as_popup: bool,
}

struct NormalizedUpdateRequest {
    title: Option<String>,
    content: Option<String>,
    target: Option<String>,
    status: Option<String>,
    show_as_popup: Option<bool>,
}

enum AnnouncementCommandBuildError {
    BadRequest(String),
    System(DomainError),
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminAnnouncementItemEnvelope {
    item: AdminAnnouncementItemResponse,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminAnnouncementItemResponse {
    id: String,
    title: String,
    target: String,
    status: String,
    show_as_popup: bool,
    date: String,
    content: String,
}

pub fn admin_announcement_router_with_store(
    store: Arc<dyn AdminAnnouncementStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/content/announcements",
            get(fetch_announcements).post(create_announcement),
        )
        .route(
            "/backend/v3/api/content/announcements/{announcement_id}",
            patch(update_announcement).delete(delete_announcement),
        )
        .with_state(AdminAnnouncementState {
            store,
            entity_uuid_generator,
        })
}

async fn fetch_announcements(
    State(state): State<AdminAnnouncementState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(request): Query<AdminAnnouncementListQueryRequest>,
) -> Response {
    let subject = scoped.into();
    let query = match build_list_query(subject, request) {
        Ok(query) => query,
        Err(message) => return bad_request(message),
    };

    match state.store.list_announcements(query).await {
        Ok(page) => json_success_list_response(
            None,
            page.items.into_iter().map(to_item_response).collect(),
            offset_page_info(page.page_no, page.page_size, page.total),
        ),
        Err(error) => announcement_system_response("announcement read model is unavailable", error),
    }
}

fn build_list_query(
    subject: AdminAnnouncementSubject,
    request: AdminAnnouncementListQueryRequest,
) -> Result<ListAdminAnnouncementsQuery, String> {
    let pagination = parse_offset_list_query(request.page, request.page_size)?;
    Ok(ListAdminAnnouncementsQuery {
        subject,
        page_no: pagination.page_no,
        page_size: pagination.page_size,
        offset: pagination.offset,
        q: normalize_list_search_query(request.q, "q")?,
    })
}

async fn create_announcement(
    State(state): State<AdminAnnouncementState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_body::<AdminAnnouncementCreateRequest>(&body) {
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

    match state.store.create_announcement(command).await {
        Ok(item) => json_created_response(None, AdminAnnouncementItemEnvelope {
            item: to_item_response(item),
        }),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            announcement_system_response("announcement command store is unavailable", error)
        }
    }
}

async fn update_announcement(
    State(state): State<AdminAnnouncementState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(announcement_id): Path<String>,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let announcement_id = match parse_announcement_id(&announcement_id) {
        Ok(announcement_id) => announcement_id,
        Err(message) => return bad_request(message),
    };
    let request = match parse_json_body::<AdminAnnouncementUpdateRequest>(&body) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let request = match normalize_update_request(request) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command =
        match build_update_command(state.clone(), &headers, subject, announcement_id, request) {
            Ok(command) => command,
            Err(error) => return command_build_error_response(error),
        };

    match state.store.update_announcement(command).await {
        Ok(Some(item)) => Json(success_envelope(AdminAnnouncementItemEnvelope {
            item: to_item_response(item),
        }))
        .into_response(),
        Ok(None) => not_found_response("announcement was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            announcement_system_response("announcement command store is unavailable", error)
        }
    }
}

async fn delete_announcement(
    State(state): State<AdminAnnouncementState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(announcement_id): Path<String>,
) -> Response {
    let subject = scoped.into();
    let announcement_id = match parse_announcement_id(&announcement_id) {
        Ok(announcement_id) => announcement_id,
        Err(message) => return bad_request(message),
    };
    let command = match build_delete_command(state.clone(), &headers, subject, announcement_id) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };

    match state.store.delete_announcement(command).await {
        Ok(true) => no_content_response(None),
        Ok(false) => not_found_response("announcement was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            announcement_system_response("announcement command store is unavailable", error)
        }
    }
}

fn parse_json_body<T>(body: &[u8]) -> Result<T, String>
where
    T: for<'de> Deserialize<'de>,
{
    if body.iter().all(u8::is_ascii_whitespace) {
        return Err("announcement request body is required".to_owned());
    }
    serde_json::from_slice(body)
        .map_err(|error| format!("invalid announcement request body: {error}"))
}

fn normalize_create_request(
    request: AdminAnnouncementCreateRequest,
) -> Result<NormalizedCreateRequest, String> {
    Ok(NormalizedCreateRequest {
        title: normalize_required_text(
            request.title.as_deref(),
            "announcement title",
            MAX_TITLE_LEN,
        )?,
        content: normalize_required_text(
            request.content.as_deref(),
            "announcement content",
            MAX_CONTENT_LEN,
        )?,
        target: normalize_target(request.target.as_deref())?,
        status: normalize_status(request.status.as_deref())?,
        show_as_popup: request.show_as_popup.unwrap_or(false),
    })
}

fn normalize_update_request(
    request: AdminAnnouncementUpdateRequest,
) -> Result<NormalizedUpdateRequest, String> {
    let title = request
        .title
        .as_deref()
        .map(|value| normalize_required_text(Some(value), "announcement title", MAX_TITLE_LEN))
        .transpose()?;
    let content = request
        .content
        .as_deref()
        .map(|value| normalize_required_text(Some(value), "announcement content", MAX_CONTENT_LEN))
        .transpose()?;
    let target = request
        .target
        .as_deref()
        .map(|value| normalize_target(Some(value)))
        .transpose()?;
    let status = request
        .status
        .as_deref()
        .map(|value| normalize_status(Some(value)))
        .transpose()?;
    let show_as_popup = request.show_as_popup;

    if title.is_none()
        && content.is_none()
        && target.is_none()
        && status.is_none()
        && show_as_popup.is_none()
    {
        return Err("announcement update must include at least one editable field".to_owned());
    }

    Ok(NormalizedUpdateRequest {
        title,
        content,
        target,
        status,
        show_as_popup,
    })
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

fn normalize_target(value: Option<&str>) -> Result<String, String> {
    let value = value.unwrap_or("all").trim().to_ascii_lowercase();
    match value.as_str() {
        "all" | "vip" | "free" | "beta" => Ok(value),
        _ => Err("announcement target must be one of all, vip, free, beta".to_owned()),
    }
}

fn normalize_status(value: Option<&str>) -> Result<String, String> {
    let value = value.unwrap_or("published").trim().to_ascii_lowercase();
    match value.as_str() {
        "published" | "draft" => Ok(value),
        _ => Err("announcement status must be one of published, draft".to_owned()),
    }
}

fn parse_announcement_id(value: &str) -> Result<i64, String> {
    let id = value
        .trim()
        .parse::<i64>()
        .map_err(|_| "announcement id must be a positive integer".to_owned())?;
    if id <= 0 {
        return Err("announcement id must be a positive integer".to_owned());
    }
    Ok(id)
}

fn build_create_command(
    state: AdminAnnouncementState,
    _headers: &HeaderMap,
    subject: AdminAnnouncementSubject,
    request: NormalizedCreateRequest,
) -> Result<CreateAdminAnnouncementCommand, AnnouncementCommandBuildError> {
    Ok(CreateAdminAnnouncementCommand {
        subject,
        announcement_uuid: generate_entity_uuid(&state)?,
        audit_log_uuid: generate_entity_uuid(&state)?,
        title: request.title,
        content: request.content,
        target: request.target,
        status: request.status,
        show_as_popup: request.show_as_popup,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_update_command(
    state: AdminAnnouncementState,
    _headers: &HeaderMap,
    subject: AdminAnnouncementSubject,
    announcement_id: i64,
    request: NormalizedUpdateRequest,
) -> Result<UpdateAdminAnnouncementCommand, AnnouncementCommandBuildError> {
    Ok(UpdateAdminAnnouncementCommand {
        subject,
        announcement_id,
        audit_log_uuid: generate_entity_uuid(&state)?,
        title: request.title,
        content: request.content,
        target: request.target,
        status: request.status,
        show_as_popup: request.show_as_popup,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_delete_command(
    state: AdminAnnouncementState,
    _headers: &HeaderMap,
    subject: AdminAnnouncementSubject,
    announcement_id: i64,
) -> Result<DeleteAdminAnnouncementCommand, AnnouncementCommandBuildError> {
    Ok(DeleteAdminAnnouncementCommand {
        subject,
        announcement_id,
        audit_log_uuid: generate_entity_uuid(&state)?,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn generate_entity_uuid(
    state: &AdminAnnouncementState,
) -> Result<String, AnnouncementCommandBuildError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(AnnouncementCommandBuildError::System)
}

fn request_id_error(error: RequestIdError) -> AnnouncementCommandBuildError {
    match error {
        RequestIdError::Invalid(message) => AnnouncementCommandBuildError::BadRequest(message),
        RequestIdError::System(message) => {
            AnnouncementCommandBuildError::System(DomainError::new(message))
        }
    }
}

fn to_item_response(item: AdminAnnouncementItem) -> AdminAnnouncementItemResponse {
    AdminAnnouncementItemResponse {
        id: item.id.to_string(),
        title: item.title,
        target: item.target,
        status: item.status,
        show_as_popup: item.show_as_popup,
        date: item.date,
        content: item.content,
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

fn command_build_error_response(error: AnnouncementCommandBuildError) -> Response {
    match error {
        AnnouncementCommandBuildError::BadRequest(message) => bad_request(message),
        AnnouncementCommandBuildError::System(error) => {
            announcement_system_response("announcement command is invalid", error)
        }
    }
}

fn announcement_system_response(context: &str, error: DomainError) -> Response {
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
