use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;

use axum::body::Bytes;
use axum::extract::{Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::api::request_id::{generate_server_request_id, RequestIdError};
use crate::api::response::PlusApiResult;
use crate::application::EntityUuidGenerator;
use crate::domain::DomainError;
use crate::ports::{
    GetSiteSettingsQuery, GetSiteSettingsScopeQuery, SiteSettings, SiteSettingsStore,
    SiteSettingsSubject, UpdateSiteSettingsCommand,
};

const MAX_SHORT_TEXT_LEN: usize = 255;
const MAX_LONG_TEXT_LEN: usize = 4096;
const MAX_URL_LEN: usize = 2048;
const MAX_COLOR_LEN: usize = 32;
const MAX_CUSTOM_CSS_LEN: usize = 20000;
const MAX_TENANT_CODE_LENGTH: usize = 64;
const MAX_ORGANIZATION_CODE_LENGTH: usize = 64;

#[derive(Clone)]
struct AdminSiteSettingsState {
    store: Arc<dyn SiteSettingsStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
}

#[derive(Clone)]
struct AppSiteSettingsState {
    store: Option<Arc<dyn SiteSettingsStore + Send + Sync>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SiteSettingsUpdateRequest {
    site_name: Option<String>,
    short_name: Option<String>,
    description: Option<String>,
    logo: Option<Value>,
    icon: Option<Value>,
    favicon: Option<Value>,
    brand_color: Option<String>,
    accent_color: Option<String>,
    footer_copyright: Option<String>,
    icp_record_number: Option<String>,
    icp_record_url: Option<String>,
    police_record_number: Option<String>,
    police_record_url: Option<String>,
    seo_title: Option<String>,
    seo_description: Option<String>,
    support_url: Option<String>,
    docs_url: Option<String>,
    privacy_url: Option<String>,
    terms_url: Option<String>,
    custom_css: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
struct SiteRuntimeSettingsQuery {
    tenant_code: Option<String>,
    organization_code: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SiteSettingsResponse {
    site_name: String,
    short_name: String,
    description: String,
    logo: Value,
    icon: Value,
    favicon: Value,
    brand_color: String,
    accent_color: String,
    footer_copyright: String,
    icp_record_number: String,
    icp_record_url: String,
    police_record_number: String,
    police_record_url: String,
    seo_title: String,
    seo_description: String,
    support_url: String,
    docs_url: String,
    privacy_url: String,
    terms_url: String,
    custom_css: String,
}

enum SiteSettingsCommandBuildError {
    BadRequest(String),
    System(DomainError),
}

pub fn admin_site_settings_router_with_store(
    store: Arc<dyn SiteSettingsStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/system/site/settings",
            get(fetch_site_settings).patch(update_site_settings),
        )
        .with_state(AdminSiteSettingsState {
            store,
            entity_uuid_generator,
        })
}

pub fn app_site_settings_router() -> Router {
    app_site_settings_router_with_optional_store(None)
}

pub fn app_site_settings_router_with_store(
    store: Arc<dyn SiteSettingsStore + Send + Sync>,
) -> Router {
    app_site_settings_router_with_optional_store(Some(store))
}

fn app_site_settings_router_with_optional_store(
    store: Option<Arc<dyn SiteSettingsStore + Send + Sync>>,
) -> Router {
    Router::new()
        .route(
            "/app/v3/api/system/site/runtime",
            get(fetch_site_runtime_settings),
        )
        .with_state(AppSiteSettingsState { store })
}

async fn fetch_site_settings(
    State(state): State<AdminSiteSettingsState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject = scoped.into();

    match state
        .store
        .get_site_settings(GetSiteSettingsQuery { subject })
        .await
    {
        Ok(settings) => Json(PlusApiResult::success(to_response(settings))).into_response(),
        Err(error) => {
            site_settings_system_response("site settings read model is unavailable", error)
        }
    }
}

async fn update_site_settings(
    State(state): State<AdminSiteSettingsState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_body::<SiteSettingsUpdateRequest>(&body, "site settings") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let current = match state
        .store
        .get_site_settings(GetSiteSettingsQuery { subject })
        .await
    {
        Ok(settings) => settings,
        Err(error) => {
            return site_settings_system_response("site settings read model is unavailable", error);
        }
    };
    let settings = match merge_update_request(current, request) {
        Ok(settings) => settings,
        Err(message) => return bad_request(message),
    };
    let command = match build_update_command(state.clone(), &headers, subject, settings) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };

    match state.store.update_site_settings(command).await {
        Ok(settings) => Json(PlusApiResult::success(to_response(settings))).into_response(),
        Err(error) => {
            site_settings_system_response("site settings command store is unavailable", error)
        }
    }
}

async fn fetch_site_runtime_settings(
    State(state): State<AppSiteSettingsState>,
    Query(query): Query<SiteRuntimeSettingsQuery>,
) -> Response {
    let Some(store) = state.store.as_ref() else {
        return Json(PlusApiResult::success(to_response(SiteSettings::default()))).into_response();
    };
    let tenant_code = match normalize_optional_field(
        "tenant_code",
        query.tenant_code.as_deref(),
        MAX_TENANT_CODE_LENGTH,
    ) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let organization_code = match normalize_optional_field(
        "organization_code",
        query.organization_code.as_deref(),
        MAX_ORGANIZATION_CODE_LENGTH,
    ) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    match store
        .get_site_settings_for_scope(GetSiteSettingsScopeQuery {
            tenant_code: optional_string(tenant_code),
            organization_code: optional_string(organization_code),
        })
        .await
    {
        Ok(settings) => Json(PlusApiResult::success(to_response(settings))).into_response(),
        Err(error) if error.is_not_found() => {
            Json(PlusApiResult::success(to_response(SiteSettings::default()))).into_response()
        }
        Err(error) => site_settings_system_response("site runtime settings are unavailable", error),
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
    mut current: SiteSettings,
    request: SiteSettingsUpdateRequest,
) -> Result<SiteSettings, String> {
    if let Some(value) = request.site_name {
        current.site_name = normalize_required_field("siteName", &value, MAX_SHORT_TEXT_LEN)?;
    }
    if let Some(value) = request.short_name {
        current.short_name =
            normalize_optional_field("shortName", Some(&value), MAX_SHORT_TEXT_LEN)?;
    }
    if let Some(value) = request.description {
        current.description =
            normalize_optional_field("description", Some(&value), MAX_LONG_TEXT_LEN)?;
    }
    if let Some(value) = request.logo {
        current.logo = normalize_media_resource("logo", value)?;
    }
    if let Some(value) = request.icon {
        current.icon = normalize_media_resource("icon", value)?;
    }
    if let Some(value) = request.favicon {
        current.favicon = normalize_media_resource("favicon", value)?;
    }
    if let Some(value) = request.brand_color {
        current.brand_color = normalize_color_field("brandColor", &value)?;
    }
    if let Some(value) = request.accent_color {
        current.accent_color = normalize_color_field("accentColor", &value)?;
    }
    if let Some(value) = request.footer_copyright {
        current.footer_copyright =
            normalize_optional_field("footerCopyright", Some(&value), MAX_LONG_TEXT_LEN)?;
    }
    if let Some(value) = request.icp_record_number {
        current.icp_record_number =
            normalize_optional_field("icpRecordNumber", Some(&value), MAX_SHORT_TEXT_LEN)?;
    }
    if let Some(value) = request.icp_record_url {
        current.icp_record_url = normalize_url_field("icpRecordUrl", &value)?;
    }
    if let Some(value) = request.police_record_number {
        current.police_record_number =
            normalize_optional_field("policeRecordNumber", Some(&value), MAX_SHORT_TEXT_LEN)?;
    }
    if let Some(value) = request.police_record_url {
        current.police_record_url = normalize_url_field("policeRecordUrl", &value)?;
    }
    if let Some(value) = request.seo_title {
        current.seo_title = normalize_optional_field("seoTitle", Some(&value), MAX_SHORT_TEXT_LEN)?;
    }
    if let Some(value) = request.seo_description {
        current.seo_description =
            normalize_optional_field("seoDescription", Some(&value), MAX_LONG_TEXT_LEN)?;
    }
    if let Some(value) = request.support_url {
        current.support_url = normalize_url_field("supportUrl", &value)?;
    }
    if let Some(value) = request.docs_url {
        current.docs_url = normalize_url_field("docsUrl", &value)?;
    }
    if let Some(value) = request.privacy_url {
        current.privacy_url = normalize_url_field("privacyUrl", &value)?;
    }
    if let Some(value) = request.terms_url {
        current.terms_url = normalize_url_field("termsUrl", &value)?;
    }
    if let Some(value) = request.custom_css {
        current.custom_css =
            normalize_optional_field("customCss", Some(&value), MAX_CUSTOM_CSS_LEN)?;
    }
    Ok(current.normalized())
}

fn normalize_required_field(
    field_name: &str,
    value: &str,
    max_len: usize,
) -> Result<String, String> {
    let value = normalize_optional_field(field_name, Some(value), max_len)?;
    if value.is_empty() {
        return Err(format!("{field_name} must not be empty"));
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

fn normalize_url_field(field_name: &str, value: &str) -> Result<String, String> {
    let value = normalize_optional_field(field_name, Some(value), MAX_URL_LEN)?;
    if value.is_empty() || value.starts_with('/') {
        return Ok(value);
    }
    if !(value.starts_with("https://") || value.starts_with("http://")) {
        return Err(format!(
            "{field_name} must be empty, root-relative, http, or https URL"
        ));
    }
    if value.chars().any(char::is_whitespace) {
        return Err(format!("{field_name} must not contain whitespace"));
    }
    Ok(value)
}

fn normalize_media_resource(field_name: &str, value: Value) -> Result<Value, String> {
    let mut object = value
        .as_object()
        .cloned()
        .ok_or_else(|| format!("{field_name} must be a MediaResource object"))?;
    let kind = normalize_required_media_text(field_name, object.get("kind"), "kind", 64)?;
    let source = normalize_required_media_text(field_name, object.get("source"), "source", 64)?;
    object.insert("kind".to_owned(), Value::String(kind));
    object.insert("source".to_owned(), Value::String(source));

    for key in ["id", "publicUrl", "url", "uri", "objectKey", "objectBlobId"] {
        if let Some(value) = object.get_mut(key) {
            let Some(text) = value.as_str() else {
                return Err(format!("{field_name}.{key} must be a string"));
            };
            let normalized =
                normalize_optional_field(&format!("{field_name}.{key}"), Some(text), MAX_URL_LEN)?;
            *value = Value::String(normalized);
        }
    }

    Ok(Value::Object(object))
}

fn normalize_required_media_text(
    field_name: &str,
    value: Option<&Value>,
    key: &str,
    max_len: usize,
) -> Result<String, String> {
    let Some(value) = value else {
        return Err(format!("{field_name} must include MediaResource {key}"));
    };
    let Some(value) = value.as_str() else {
        return Err(format!("{field_name}.{key} must be a string"));
    };
    let value = normalize_required_field(&format!("{field_name}.{key}"), value, max_len)?;
    Ok(value)
}

fn normalize_color_field(field_name: &str, value: &str) -> Result<String, String> {
    let value = normalize_optional_field(field_name, Some(value), MAX_COLOR_LEN)?;
    if is_hex_color(&value) {
        Ok(value)
    } else {
        Err(format!("{field_name} must be a 3 or 6 digit hex color"))
    }
}

fn is_hex_color(value: &str) -> bool {
    let bytes = value.as_bytes();
    if !(bytes.len() == 4 || bytes.len() == 7) || bytes.first() != Some(&b'#') {
        return false;
    }
    bytes[1..].iter().all(u8::is_ascii_hexdigit)
}

fn build_update_command(
    state: AdminSiteSettingsState,
    _headers: &HeaderMap,
    subject: SiteSettingsSubject,
    settings: SiteSettings,
) -> Result<UpdateSiteSettingsCommand, SiteSettingsCommandBuildError> {
    Ok(UpdateSiteSettingsCommand {
        subject,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        settings,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn generate_entity_uuid(
    state: &AdminSiteSettingsState,
) -> Result<String, SiteSettingsCommandBuildError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(SiteSettingsCommandBuildError::System)
}

fn request_id_error(error: RequestIdError) -> SiteSettingsCommandBuildError {
    match error {
        RequestIdError::Invalid(message) => SiteSettingsCommandBuildError::BadRequest(message),
        RequestIdError::System(message) => {
            SiteSettingsCommandBuildError::System(DomainError::new(message))
        }
    }
}

fn optional_string(value: String) -> Option<String> {
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}

fn to_response(settings: SiteSettings) -> SiteSettingsResponse {
    SiteSettingsResponse {
        site_name: settings.site_name,
        short_name: settings.short_name,
        description: settings.description,
        logo: settings.logo,
        icon: settings.icon,
        favicon: settings.favicon,
        brand_color: settings.brand_color,
        accent_color: settings.accent_color,
        footer_copyright: settings.footer_copyright,
        icp_record_number: settings.icp_record_number,
        icp_record_url: settings.icp_record_url,
        police_record_number: settings.police_record_number,
        police_record_url: settings.police_record_url,
        seo_title: settings.seo_title,
        seo_description: settings.seo_description,
        support_url: settings.support_url,
        docs_url: settings.docs_url,
        privacy_url: settings.privacy_url,
        terms_url: settings.terms_url,
        custom_css: settings.custom_css,
    }
}

fn bad_request(message: String) -> Response {
    (
        StatusCode::BAD_REQUEST,
        Json(PlusApiResult::error("4001", message)),
    )
        .into_response()
}

fn command_build_error_response(error: SiteSettingsCommandBuildError) -> Response {
    match error {
        SiteSettingsCommandBuildError::BadRequest(message) => bad_request(message),
        SiteSettingsCommandBuildError::System(error) => {
            site_settings_system_response("site settings command is invalid", error)
        }
    }
}

fn site_settings_system_response(context: &str, error: DomainError) -> Response {
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
