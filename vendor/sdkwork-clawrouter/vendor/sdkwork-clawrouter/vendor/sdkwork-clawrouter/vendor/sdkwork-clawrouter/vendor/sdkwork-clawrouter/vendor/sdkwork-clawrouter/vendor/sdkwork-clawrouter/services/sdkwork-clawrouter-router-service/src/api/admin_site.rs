use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;

use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, patch, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::api::request_id::{generate_server_request_id, RequestIdError};
use crate::api::response::PlusApiResult;
use crate::application::EntityUuidGenerator;
use crate::domain::DomainError;
use crate::ports::{
    AdminSiteChannelItem, AdminSiteConnectionCheckItem, AdminSiteItem, AdminSiteStore,
    AdminSiteSubject, CreateAdminSiteCommand, DeleteAdminSiteCommand, ListAdminSiteChannelsQuery,
    ListAdminSitesQuery, TestAdminSiteConnectionCommand, UpdateAdminSiteCommand,
};

const MAX_CODE_LEN: usize = 128;
const MAX_SITE_CODE_LEN: usize = 64;
const MAX_NAME_LEN: usize = 128;
const MAX_DESCRIPTION_LEN: usize = 1024;
const MAX_URL_LEN: usize = 512;
const MAX_OWNER_KIND_LEN: usize = 32;
const MAX_REGION_LEN: usize = 64;
const MAX_CREDENTIAL_REF_LEN: usize = 512;
const MAX_DOMAINS: usize = 16;
const MAX_DOMAIN_LEN: usize = 255;
const MAX_VENDOR_CODES: usize = 64;
const MAX_MEDIA_LABEL_LEN: usize = 64;
const MAX_MEDIA_LOCATOR_LEN: usize = 1_048_576;

#[derive(Clone)]
struct AdminSiteState {
    store: Arc<dyn AdminSiteStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
}

#[derive(Debug, Deserialize)]
struct ListSitesParams {
    q: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SiteRequest {
    site_code: Option<String>,
    site_name: Option<String>,
    display_name: Option<String>,
    description: Option<String>,
    base_url: Option<String>,
    website_url: Option<String>,
    docs_url: Option<String>,
    logo: Option<Value>,
    domains: Option<Vec<String>>,
    vendor_codes: Option<Vec<String>>,
    site_type: Option<String>,
    owner_kind: Option<String>,
    region_code: Option<String>,
    environment: Option<String>,
    status: Option<String>,
    credential_ref: Option<String>,
    masked_label: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SiteUpdateRequest {
    site_code: Option<String>,
    site_name: Option<String>,
    display_name: Option<String>,
    description: Option<Option<String>>,
    base_url: Option<String>,
    website_url: Option<Option<String>>,
    docs_url: Option<Option<String>>,
    logo: Option<Option<Value>>,
    domains: Option<Vec<String>>,
    vendor_codes: Option<Vec<String>>,
    site_type: Option<String>,
    owner_kind: Option<Option<String>>,
    region_code: Option<Option<String>>,
    environment: Option<String>,
    status: Option<String>,
    credential_ref: Option<Option<String>>,
    masked_label: Option<Option<String>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SiteListResponse {
    items: Vec<SiteResponse>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SiteEnvelope {
    item: SiteResponse,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SiteDeleteResponse {
    deleted: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SiteResponse {
    id: String,
    site_code: String,
    site_name: String,
    display_name: String,
    description: Option<String>,
    base_url: String,
    website_url: Option<String>,
    docs_url: Option<String>,
    logo: Option<Value>,
    domains: Vec<String>,
    vendor_codes: Vec<String>,
    site_type: String,
    owner_kind: Option<String>,
    region_code: Option<String>,
    environment: String,
    health_status: String,
    last_latency_ms: Option<i64>,
    consecutive_error_count: i64,
    last_checked_at: Option<String>,
    last_sync_at: Option<String>,
    sort_order: i64,
    status: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SiteChannelsResponse {
    items: Vec<SiteChannelResponse>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SiteChannelResponse {
    id: String,
    channel_code: String,
    channel_name: String,
    provider_code: Option<String>,
    site_code: Option<String>,
    site_service_code: Option<String>,
    site_channel_role: Option<String>,
    health_status: String,
    status: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SiteConnectionCheckResponse {
    site_id: String,
    status: String,
    health_status: String,
    latency_ms: Option<i64>,
    checked_at: String,
    message: Option<String>,
}

enum SiteCommandBuildError {
    BadRequest(String),
    System(DomainError),
}

pub fn admin_site_router_with_store(
    store: Arc<dyn AdminSiteStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route("/backend/v3/api/sites", get(fetch_sites).post(create_site))
        .route(
            "/backend/v3/api/sites/{site_id}",
            patch(update_site).delete(delete_site),
        )
        .route(
            "/backend/v3/api/sites/{site_id}/channels",
            get(fetch_site_channels),
        )
        .route(
            "/backend/v3/api/sites/{site_id}/test_connection",
            post(test_site_connection),
        )
        .route(
            "/backend/v3/api/sites/{site_id}/health_check",
            post(health_check_site),
        )
        .with_state(AdminSiteState {
            store,
            entity_uuid_generator,
        })
}

async fn fetch_sites(
    State(state): State<AdminSiteState>,
    Query(params): Query<ListSitesParams>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject = scoped.into();
    match state
        .store
        .list_sites(ListAdminSitesQuery {
            subject,
            search: normalize_optional(params.q, MAX_NAME_LEN),
        })
        .await
    {
        Ok(items) => Json(PlusApiResult::success(SiteListResponse {
            items: items.into_iter().map(to_site_response).collect(),
        }))
        .into_response(),
        Err(error) => system_response("Site read model is unavailable", error),
    }
}

async fn create_site(
    State(state): State<AdminSiteState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_body::<SiteRequest>(&body, "site") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match build_create_site_command(state.clone(), subject, request) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };
    match state.store.create_site(command).await {
        Ok(item) => Json(PlusApiResult::success(SiteEnvelope {
            item: to_site_response(item),
        }))
        .into_response(),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => system_response("Site command store is unavailable", error),
    }
}

async fn update_site(
    State(state): State<AdminSiteState>,
    Path(site_id): Path<String>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let site_id = match parse_positive_id(&site_id, "site id") {
        Ok(site_id) => site_id,
        Err(message) => return bad_request(message),
    };
    let request = match parse_json_body::<SiteUpdateRequest>(&body, "site update") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match build_update_site_command(state.clone(), subject, site_id, request) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };
    match state.store.update_site(command).await {
        Ok(Some(item)) => Json(PlusApiResult::success(SiteEnvelope {
            item: to_site_response(item),
        }))
        .into_response(),
        Ok(None) => not_found_response("Site was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => system_response("Site command store is unavailable", error),
    }
}

async fn delete_site(
    State(state): State<AdminSiteState>,
    Path(site_id): Path<String>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject = scoped.into();
    let site_id = match parse_positive_id(&site_id, "site id") {
        Ok(site_id) => site_id,
        Err(message) => return bad_request(message),
    };
    let command = match build_delete_site_command(state.clone(), subject, site_id) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };
    match state.store.delete_site(command).await {
        Ok(deleted) => Json(PlusApiResult::success(SiteDeleteResponse { deleted })).into_response(),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => system_response("Site command store is unavailable", error),
    }
}

async fn fetch_site_channels(
    State(state): State<AdminSiteState>,
    Path(site_id): Path<String>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject = scoped.into();
    let site_id = match parse_positive_id(&site_id, "site id") {
        Ok(site_id) => site_id,
        Err(message) => return bad_request(message),
    };
    match state
        .store
        .list_site_channels(ListAdminSiteChannelsQuery { subject, site_id })
        .await
    {
        Ok(items) => Json(PlusApiResult::success(SiteChannelsResponse {
            items: items.into_iter().map(to_site_channel_response).collect(),
        }))
        .into_response(),
        Err(error) => system_response("Site channel read model is unavailable", error),
    }
}

async fn test_site_connection(
    State(state): State<AdminSiteState>,
    Path(site_id): Path<String>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
) -> Response {
    site_connection_action(state, site_id, scoped, headers, false).await
}

async fn health_check_site(
    State(state): State<AdminSiteState>,
    Path(site_id): Path<String>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
) -> Response {
    site_connection_action(state, site_id, scoped, headers, true).await
}

async fn site_connection_action(
    state: AdminSiteState,
    site_id: String,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    persist_health: bool,
) -> Response {
    let subject = scoped.into();
    let site_id = match parse_positive_id(&site_id, "site id") {
        Ok(site_id) => site_id,
        Err(message) => return bad_request(message),
    };
    let command =
        match build_test_site_connection_command(state.clone(), subject, site_id, persist_health) {
            Ok(command) => command,
            Err(error) => return command_build_error_response(error),
        };
    match state.store.test_site_connection(command).await {
        Ok(item) => Json(PlusApiResult::success(to_connection_response(item))).into_response(),
        Err(error) if error.is_not_found() => not_found_response(error.to_string()),
        Err(error) => system_response("Site connection check is unavailable", error),
    }
}


fn build_create_site_command(
    state: AdminSiteState,
    subject: AdminSiteSubject,
    request: SiteRequest,
) -> Result<CreateAdminSiteCommand, SiteCommandBuildError> {
    let site_uuid = generate_entity_uuid(&state)?;
    let site_code = match normalize_optional(request.site_code, MAX_SITE_CODE_LEN) {
        Some(value) => normalize_code(value)?,
        None => generated_site_code(&site_uuid),
    };
    Ok(CreateAdminSiteCommand {
        subject,
        site_uuid,
        service_uuid: generate_entity_uuid(&state)?,
        audit_log_uuid: generate_entity_uuid(&state)?,
        site_code,
        site_name: required_text(request.site_name, "siteName", "site name", MAX_NAME_LEN)?,
        display_name: required_text(
            request.display_name,
            "displayName",
            "site display name",
            MAX_NAME_LEN,
        )?,
        description: normalize_optional(request.description, MAX_DESCRIPTION_LEN),
        base_url: required_text(request.base_url, "baseUrl", "site base URL", MAX_URL_LEN)?,
        website_url: normalize_optional(request.website_url, MAX_URL_LEN),
        docs_url: normalize_optional(request.docs_url, MAX_URL_LEN),
        logo: normalize_site_media_resource(request.logo, "logo")?,
        domains: normalize_domains(request.domains.unwrap_or_default())?,
        vendor_codes: normalize_vendor_codes(request.vendor_codes.unwrap_or_default())?,
        site_type: normalize_site_type(request.site_type)?,
        owner_kind: normalize_optional(request.owner_kind, MAX_OWNER_KIND_LEN),
        region_code: normalize_optional(request.region_code, MAX_REGION_LEN),
        environment: normalize_environment(request.environment)?,
        status: normalize_status(request.status)?,
        credential_ref: normalize_optional(request.credential_ref, MAX_CREDENTIAL_REF_LEN),
        masked_label: normalize_optional(request.masked_label, MAX_NAME_LEN),
        request_id: generate_request_id()?,
        requested_at: now_iso_string(),
    })
}

fn build_update_site_command(
    state: AdminSiteState,
    subject: AdminSiteSubject,
    site_id: i64,
    request: SiteUpdateRequest,
) -> Result<UpdateAdminSiteCommand, SiteCommandBuildError> {
    Ok(UpdateAdminSiteCommand {
        subject,
        site_id,
        audit_log_uuid: generate_entity_uuid(&state)?,
        site_code: optional_code(request.site_code)?,
        site_name: optional_text(request.site_name, "siteName", "site name", MAX_NAME_LEN)?,
        display_name: optional_text(
            request.display_name,
            "displayName",
            "site display name",
            MAX_NAME_LEN,
        )?,
        description: request
            .description
            .map(|value| normalize_optional(value, MAX_DESCRIPTION_LEN)),
        base_url: optional_text(request.base_url, "baseUrl", "site base URL", MAX_URL_LEN)?,
        website_url: request
            .website_url
            .map(|value| normalize_optional(value, MAX_URL_LEN)),
        docs_url: request
            .docs_url
            .map(|value| normalize_optional(value, MAX_URL_LEN)),
        logo: normalize_nullable_site_media_resource(request.logo, "logo")?,
        domains: request.domains.map(normalize_domains).transpose()?,
        vendor_codes: request
            .vendor_codes
            .map(normalize_vendor_codes)
            .transpose()?,
        site_type: request
            .site_type
            .map(Some)
            .map(normalize_site_type)
            .transpose()?,
        owner_kind: request
            .owner_kind
            .map(|value| normalize_optional(value, MAX_OWNER_KIND_LEN)),
        region_code: request
            .region_code
            .map(|value| normalize_optional(value, MAX_REGION_LEN)),
        environment: request
            .environment
            .map(Some)
            .map(normalize_environment)
            .transpose()?,
        status: request.status.map(Some).map(normalize_status).transpose()?,
        credential_ref: request
            .credential_ref
            .map(|value| normalize_optional(value, MAX_CREDENTIAL_REF_LEN)),
        masked_label: request
            .masked_label
            .map(|value| normalize_optional(value, MAX_NAME_LEN)),
        request_id: generate_request_id()?,
        requested_at: now_iso_string(),
    })
}

fn build_delete_site_command(
    state: AdminSiteState,
    subject: AdminSiteSubject,
    site_id: i64,
) -> Result<DeleteAdminSiteCommand, SiteCommandBuildError> {
    Ok(DeleteAdminSiteCommand {
        subject,
        site_id,
        audit_log_uuid: generate_entity_uuid(&state)?,
        request_id: generate_request_id()?,
        requested_at: now_iso_string(),
    })
}

fn build_test_site_connection_command(
    state: AdminSiteState,
    subject: AdminSiteSubject,
    site_id: i64,
    persist_health: bool,
) -> Result<TestAdminSiteConnectionCommand, SiteCommandBuildError> {
    Ok(TestAdminSiteConnectionCommand {
        subject,
        site_id,
        audit_log_uuid: generate_entity_uuid(&state)?,
        request_id: generate_request_id()?,
        requested_at: now_iso_string(),
        persist_health,
    })
}

fn to_site_response(item: AdminSiteItem) -> SiteResponse {
    SiteResponse {
        id: item.id.to_string(),
        site_code: item.site_code,
        site_name: item.site_name,
        display_name: item.display_name,
        description: item.description,
        base_url: item.base_url,
        website_url: item.website_url,
        docs_url: item.docs_url,
        logo: item.logo,
        domains: item.domains,
        vendor_codes: item.vendor_codes,
        site_type: item.site_type,
        owner_kind: item.owner_kind,
        region_code: item.region_code,
        environment: item.environment,
        health_status: item.health_status,
        last_latency_ms: item.last_latency_ms,
        consecutive_error_count: item.consecutive_error_count,
        last_checked_at: item.last_checked_at,
        last_sync_at: item.last_sync_at,
        sort_order: item.sort_order,
        status: item.status,
    }
}

fn to_site_channel_response(item: AdminSiteChannelItem) -> SiteChannelResponse {
    SiteChannelResponse {
        id: item.id.to_string(),
        channel_code: item.channel_code,
        channel_name: item.channel_name,
        provider_code: item.provider_code,
        site_code: item.site_code,
        site_service_code: item.site_service_code,
        site_channel_role: item.site_channel_role,
        health_status: item.health_status,
        status: item.status,
    }
}

fn to_connection_response(item: AdminSiteConnectionCheckItem) -> SiteConnectionCheckResponse {
    SiteConnectionCheckResponse {
        site_id: item.site_id.to_string(),
        status: item.status,
        health_status: item.health_status,
        latency_ms: item.latency_ms,
        checked_at: item.checked_at,
        message: item.message,
    }
}

fn parse_json_body<T: for<'de> Deserialize<'de>>(body: &[u8], label: &str) -> Result<T, String> {
    if body.iter().all(u8::is_ascii_whitespace) {
        return Err(format!("{label} request body is required"));
    }
    serde_json::from_slice(body).map_err(|error| format!("invalid {label} request body: {error}"))
}

fn required_text(
    value: Option<String>,
    field: &str,
    label: &str,
    max_len: usize,
) -> Result<String, SiteCommandBuildError> {
    let value = normalize_optional(value, max_len)
        .ok_or_else(|| SiteCommandBuildError::BadRequest(format!("{field} is required")))?;
    if value.len() > max_len {
        return Err(SiteCommandBuildError::BadRequest(format!(
            "{label} cannot exceed {max_len} characters"
        )));
    }
    Ok(value)
}

fn optional_text(
    value: Option<String>,
    field: &str,
    label: &str,
    max_len: usize,
) -> Result<Option<String>, SiteCommandBuildError> {
    match value {
        Some(value) => required_text(Some(value), field, label, max_len).map(Some),
        None => Ok(None),
    }
}

fn normalize_optional(value: Option<String>, max_len: usize) -> Option<String> {
    value
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .map(|value| {
            if value.len() > max_len {
                value.chars().take(max_len).collect()
            } else {
                value
            }
        })
}

fn normalize_code(value: String) -> Result<String, SiteCommandBuildError> {
    let normalized = value.trim().replace('-', "_").to_ascii_lowercase();
    if normalized.is_empty()
        || !normalized
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '.')
    {
        return Err(SiteCommandBuildError::BadRequest(
            "code must contain only letters, numbers, dots, underscores, or hyphens".to_owned(),
        ));
    }
    Ok(normalized)
}

fn optional_code(value: Option<String>) -> Result<Option<String>, SiteCommandBuildError> {
    match normalize_optional(value, MAX_CODE_LEN) {
        Some(value) => normalize_code(value).map(Some),
        None => Ok(None),
    }
}

fn generated_site_code(site_uuid: &str) -> String {
    let normalized: String = site_uuid
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric())
        .take(32)
        .collect::<String>()
        .to_ascii_lowercase();
    let suffix = if normalized.is_empty() {
        "generated".to_owned()
    } else {
        normalized
    };
    format!("site_{suffix}")
        .chars()
        .take(MAX_SITE_CODE_LEN)
        .collect()
}

fn normalize_site_type(value: Option<String>) -> Result<String, SiteCommandBuildError> {
    let value = normalize_optional(value, 32).unwrap_or_else(|| "relay".to_owned());
    if value == "relay" {
        Ok(value)
    } else {
        Err(SiteCommandBuildError::BadRequest(format!(
            "unsupported siteType: {value}"
        )))
    }
}

fn normalize_environment(value: Option<String>) -> Result<String, SiteCommandBuildError> {
    let value = normalize_optional(value, 32).unwrap_or_else(|| "production".to_owned());
    if value == "production" || value == "sandbox" {
        Ok(value)
    } else {
        Err(SiteCommandBuildError::BadRequest(format!(
            "unsupported environment: {value}"
        )))
    }
}

fn normalize_status(value: Option<String>) -> Result<String, SiteCommandBuildError> {
    let value = normalize_optional(value, 32).unwrap_or_else(|| "active".to_owned());
    if value == "active" || value == "disabled" {
        Ok(value)
    } else {
        Err(SiteCommandBuildError::BadRequest(format!(
            "unsupported status: {value}"
        )))
    }
}

fn normalize_domains(values: Vec<String>) -> Result<Vec<String>, SiteCommandBuildError> {
    if values.len() > MAX_DOMAINS {
        return Err(SiteCommandBuildError::BadRequest(format!(
            "domains cannot contain more than {MAX_DOMAINS} items"
        )));
    }
    let mut domains = Vec::new();
    for value in values {
        let Some(domain) = normalize_optional(Some(value), MAX_DOMAIN_LEN) else {
            continue;
        };
        if domain.contains(char::is_whitespace) {
            return Err(SiteCommandBuildError::BadRequest(
                "domains cannot contain whitespace".to_owned(),
            ));
        }
        if !domains.iter().any(|current| current == &domain) {
            domains.push(domain);
        }
    }
    Ok(domains)
}

fn normalize_vendor_codes(values: Vec<String>) -> Result<Vec<String>, SiteCommandBuildError> {
    if values.len() > MAX_VENDOR_CODES {
        return Err(SiteCommandBuildError::BadRequest(format!(
            "vendorCodes cannot contain more than {MAX_VENDOR_CODES} items"
        )));
    }
    let mut vendor_codes = Vec::new();
    for value in values {
        let Some(value) = normalize_optional(Some(value), MAX_CODE_LEN) else {
            continue;
        };
        let vendor_code = normalize_code(value)?;
        if !vendor_codes.iter().any(|current| current == &vendor_code) {
            vendor_codes.push(vendor_code);
        }
    }
    Ok(vendor_codes)
}

fn normalize_nullable_site_media_resource(
    value: Option<Option<Value>>,
    field: &str,
) -> Result<Option<Option<Value>>, SiteCommandBuildError> {
    let Some(value) = value else {
        return Ok(None);
    };
    normalize_site_media_resource(value, field).map(Some)
}

fn normalize_site_media_resource(
    value: Option<Value>,
    field: &str,
) -> Result<Option<Value>, SiteCommandBuildError> {
    let Some(value) = value else {
        return Ok(None);
    };
    if value.is_null() {
        return Ok(None);
    }
    let mut object = value.as_object().cloned().ok_or_else(|| {
        SiteCommandBuildError::BadRequest(format!("{field} must be a MediaResource object"))
    })?;
    let kind = media_resource_required_text(field, &object, "kind", MAX_MEDIA_LABEL_LEN)?;
    let source = media_resource_required_text(field, &object, "source", MAX_MEDIA_LABEL_LEN)?;
    object.insert("kind".to_owned(), Value::String(kind));
    object.insert("source".to_owned(), Value::String(source));

    let mut has_locator = false;
    for key in ["id", "publicUrl", "url", "uri", "objectKey", "objectBlobId"] {
        if let Some(value) = object.get_mut(key) {
            let Some(text) = value.as_str() else {
                return Err(SiteCommandBuildError::BadRequest(format!(
                    "{field}.{key} must be a string"
                )));
            };
            if let Some(normalized) =
                normalize_optional(Some(text.to_owned()), MAX_MEDIA_LOCATOR_LEN)
            {
                has_locator = true;
                *value = Value::String(normalized);
            } else {
                *value = Value::String(String::new());
            }
        }
    }
    if !has_locator {
        return Err(SiteCommandBuildError::BadRequest(format!(
            "{field} must include a media resource locator"
        )));
    }
    Ok(Some(Value::Object(object)))
}

fn media_resource_required_text(
    field: &str,
    object: &serde_json::Map<String, Value>,
    key: &str,
    max_len: usize,
) -> Result<String, SiteCommandBuildError> {
    let value = object.get(key).and_then(Value::as_str).map(str::to_owned);
    required_text(value, &format!("{field}.{key}"), key, max_len)
}

fn parse_positive_id(raw: &str, label: &str) -> Result<i64, String> {
    let parsed = raw
        .parse::<i64>()
        .map_err(|_| format!("{label} must be a positive integer"))?;
    if parsed <= 0 {
        return Err(format!("{label} must be a positive integer"));
    }
    Ok(parsed)
}

fn generate_entity_uuid(state: &AdminSiteState) -> Result<String, SiteCommandBuildError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(SiteCommandBuildError::System)
}

fn generate_request_id() -> Result<String, SiteCommandBuildError> {
    generate_server_request_id().map_err(|error| match error {
        RequestIdError::Invalid(message) | RequestIdError::System(message) => {
            SiteCommandBuildError::System(DomainError::new(format!(
                "failed to generate site request id: {message}"
            )))
        }
    })
}

fn now_iso_string() -> String {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => format!("{}.{:03}Z", duration.as_secs(), duration.subsec_millis()),
        Err(_) => "0.000Z".to_owned(),
    }
}

fn command_build_error_response(error: SiteCommandBuildError) -> Response {
    match error {
        SiteCommandBuildError::BadRequest(message) => bad_request(message),
        SiteCommandBuildError::System(error) => {
            system_response("Site command could not be built", error)
        }
    }
}

fn bad_request(message: impl Into<String>) -> Response {
    (
        StatusCode::BAD_REQUEST,
        Json(PlusApiResult::error("4000", message.into())),
    )
        .into_response()
}

fn not_found_response(message: impl Into<String>) -> Response {
    (
        StatusCode::NOT_FOUND,
        Json(PlusApiResult::error("4040", message.into())),
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

fn system_response(message: &str, error: DomainError) -> Response {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(PlusApiResult::error("5000", format!("{message}: {error}"))),
    )
        .into_response()
}
