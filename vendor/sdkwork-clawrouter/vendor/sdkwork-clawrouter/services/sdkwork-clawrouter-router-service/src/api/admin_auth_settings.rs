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
    AdminAuthSettings, AdminAuthSettingsStore, AdminAuthSettingsSubject,
    AdminAuthVerificationPolicy, AdminAuthWechatMini, AdminAuthWechatOfficial,
    AdminAuthWechatSettings, GetAdminAuthSettingsQuery, UpdateAdminAuthSettingsCommand,
};

#[derive(Clone)]
struct AdminAuthSettingsState {
    store: Arc<dyn AdminAuthSettingsStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminAuthSettingsUpdateRequest {
    left_rail_mode: Option<String>,
    login_methods: Option<Vec<String>>,
    oauth_login_enabled: Option<bool>,
    oauth_providers: Option<Vec<String>>,
    oauth_region: Option<String>,
    qr_login_enabled: Option<bool>,
    qr_login_type: Option<String>,
    recovery_methods: Option<Vec<String>>,
    register_methods: Option<Vec<String>>,
    verification_policy: Option<AdminAuthVerificationPolicyUpdateRequest>,
    wechat: Option<AdminAuthWechatUpdateRequest>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminAuthVerificationPolicyUpdateRequest {
    email_code_login_enabled: Option<bool>,
    email_registration_verification_required: Option<bool>,
    phone_code_login_enabled: Option<bool>,
    phone_registration_verification_required: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminAuthWechatUpdateRequest {
    official: Option<Vec<AdminAuthWechatOfficialRequest>>,
    mini: Option<Vec<AdminAuthWechatMiniRequest>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminAuthWechatOfficialRequest {
    key: String,
    name: String,
    app_id: String,
    original_id: Option<String>,
    secret_ref: String,
    token_ref: String,
    aes_key_ref: Option<String>,
    url: Option<String>,
    enabled: Option<bool>,
    primary: Option<bool>,
    scene: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminAuthWechatMiniRequest {
    key: String,
    name: String,
    app_id: String,
    secret_ref: String,
    url: Option<String>,
    enabled: Option<bool>,
    primary: Option<bool>,
    path: String,
    env: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminAuthSettingsResponse {
    left_rail_mode: String,
    login_methods: Vec<String>,
    oauth_login_enabled: bool,
    oauth_providers: Vec<String>,
    oauth_region: String,
    qr_login_enabled: bool,
    qr_login_type: String,
    recovery_methods: Vec<String>,
    register_methods: Vec<String>,
    verification_policy: AdminAuthVerificationPolicyResponse,
    wechat: AdminAuthWechatResponse,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminAuthVerificationPolicyResponse {
    email_code_login_enabled: bool,
    email_registration_verification_required: bool,
    phone_code_login_enabled: bool,
    phone_registration_verification_required: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminAuthWechatResponse {
    official: Vec<AdminAuthWechatOfficialResponse>,
    mini: Vec<AdminAuthWechatMiniResponse>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminAuthWechatOfficialResponse {
    key: String,
    name: String,
    app_id: String,
    original_id: String,
    secret_ref: String,
    token_ref: String,
    aes_key_ref: String,
    url: String,
    enabled: bool,
    primary: bool,
    scene: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminAuthWechatMiniResponse {
    key: String,
    name: String,
    app_id: String,
    secret_ref: String,
    url: String,
    enabled: bool,
    primary: bool,
    path: String,
    env: String,
}

enum AuthSettingsCommandBuildError {
    BadRequest(String),
    System(DomainError),
}

pub fn admin_auth_settings_router_with_store(
    store: Arc<dyn AdminAuthSettingsStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/system/auth/settings",
            get(fetch_auth_settings).patch(update_auth_settings),
        )
        .with_state(AdminAuthSettingsState {
            store,
            entity_uuid_generator,
        })
}

async fn fetch_auth_settings(
    State(state): State<AdminAuthSettingsState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject = scoped.into();

    match state
        .store
        .get_auth_settings(GetAdminAuthSettingsQuery { subject })
        .await
    {
        Ok(settings) => Json(PlusApiResult::success(to_response(settings))).into_response(),
        Err(error) => {
            auth_settings_system_response("auth settings read model is unavailable", error)
        }
    }
}

async fn update_auth_settings(
    State(state): State<AdminAuthSettingsState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_body::<AdminAuthSettingsUpdateRequest>(&body, "auth settings") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let current = match state
        .store
        .get_auth_settings(GetAdminAuthSettingsQuery { subject })
        .await
    {
        Ok(settings) => settings,
        Err(error) => {
            return auth_settings_system_response("auth settings read model is unavailable", error);
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

    match state.store.update_auth_settings(command).await {
        Ok(settings) => Json(PlusApiResult::success(to_response(settings))).into_response(),
        Err(error) => {
            auth_settings_system_response("auth settings command store is unavailable", error)
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
    mut current: AdminAuthSettings,
    request: AdminAuthSettingsUpdateRequest,
) -> Result<AdminAuthSettings, String> {
    if let Some(value) = request.left_rail_mode {
        current.left_rail_mode = normalize_enum(
            &value,
            "leftRailMode",
            &["auto", "highlights-only", "qr-only"],
        )?;
    }
    if let Some(value) = request.login_methods {
        current.login_methods = normalize_enum_array(
            value,
            "loginMethods",
            &["password", "emailCode", "phoneCode", "sessionBridge"],
            8,
        )?;
    }
    if let Some(value) = request.oauth_login_enabled {
        current.oauth_login_enabled = value;
    }
    if let Some(value) = request.oauth_providers {
        current.oauth_providers = normalize_oauth_providers(value)?;
    }
    if let Some(value) = request.oauth_region {
        current.oauth_region = normalize_enum(&value, "oauthRegion", &["mainland", "overseas"])?;
    }
    if let Some(value) = request.qr_login_enabled {
        current.qr_login_enabled = value;
    }
    if let Some(value) = request.qr_login_type {
        current.qr_login_type = normalize_qr_login_type(&value)?;
    }
    if let Some(value) = request.recovery_methods {
        current.recovery_methods =
            normalize_enum_array(value, "recoveryMethods", &["email", "phone"], 4)?;
    }
    if let Some(value) = request.register_methods {
        current.register_methods =
            normalize_enum_array(value, "registerMethods", &["email", "phone"], 4)?;
    }
    if let Some(value) = request.verification_policy {
        current.verification_policy = merge_verification_policy(current.verification_policy, value);
    }
    if let Some(value) = request.wechat {
        current.wechat = merge_wechat_settings(current.wechat, value)?;
    }
    let settings = current.normalized();
    validate_qr_login_channel_url(&settings)?;
    Ok(settings)
}

fn merge_verification_policy(
    mut current: AdminAuthVerificationPolicy,
    request: AdminAuthVerificationPolicyUpdateRequest,
) -> AdminAuthVerificationPolicy {
    if let Some(value) = request.email_code_login_enabled {
        current.email_code_login_enabled = value;
    }
    if let Some(value) = request.email_registration_verification_required {
        current.email_registration_verification_required = value;
    }
    if let Some(value) = request.phone_code_login_enabled {
        current.phone_code_login_enabled = value;
    }
    if let Some(value) = request.phone_registration_verification_required {
        current.phone_registration_verification_required = value;
    }
    current
}

fn normalize_enum(value: &str, field_name: &str, allowed: &[&str]) -> Result<String, String> {
    let value = value.trim();
    if allowed.contains(&value) {
        Ok(value.to_owned())
    } else {
        Err(format!(
            "{field_name} must be one of {}",
            allowed.join(", ")
        ))
    }
}

fn normalize_enum_array(
    values: Vec<String>,
    field_name: &str,
    allowed: &[&str],
    max_items: usize,
) -> Result<Vec<String>, String> {
    if values.is_empty() {
        return Err(format!("{field_name} must include at least one item"));
    }
    if values.len() > max_items {
        return Err(format!(
            "{field_name} must include at most {max_items} items"
        ));
    }
    let mut normalized = Vec::new();
    for value in values {
        let value = normalize_enum(&value, field_name, allowed)?;
        if !normalized.contains(&value) {
            normalized.push(value);
        }
    }
    if normalized.is_empty() {
        return Err(format!("{field_name} must include at least one valid item"));
    }
    Ok(normalized)
}

fn normalize_oauth_providers(values: Vec<String>) -> Result<Vec<String>, String> {
    if values.len() > 16 {
        return Err("oauthProviders must include at most 16 items".to_owned());
    }
    let mut normalized = Vec::new();
    for value in values {
        let value = value.trim();
        if value.is_empty() {
            continue;
        }
        if value.chars().count() > 64
            || !value
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'-')
        {
            return Err(
                "oauthProviders items must be 64 characters or fewer and use letters, digits, underscore, or hyphen"
                    .to_owned(),
            );
        }
        let value = value.to_owned();
        if !normalized.contains(&value) {
            normalized.push(value);
        }
    }
    Ok(normalized)
}

fn normalize_qr_login_type(value: &str) -> Result<String, String> {
    match value.trim() {
        "web" | "sdkwork_app" | "sdkwork-app" | "mobile_app" => Ok("web".to_owned()),
        "official" | "wechat_official_account" | "official_account" | "wechat-official" => {
            Ok("official".to_owned())
        }
        "mini" | "wechat_mini_program" | "miniapp" | "wechat-mini-program" => Ok("mini".to_owned()),
        _ => Err("qrLoginType must be one of web, official, mini".to_owned()),
    }
}

fn validate_qr_login_channel_url(settings: &AdminAuthSettings) -> Result<(), String> {
    if !settings.qr_login_enabled {
        return Ok(());
    }
    match settings.qr_login_type.as_str() {
        "official" => {
            if let Some(account) = primary_enabled_official(settings) {
                if account.url.trim().is_empty() {
                    return Err(
                        "wechat.official.url is required when official QR login is enabled"
                            .to_owned(),
                    );
                }
            }
        }
        "mini" => {
            if let Some(mini) = primary_enabled_mini(settings) {
                if mini.url.trim().is_empty() {
                    return Err(
                        "wechat.mini.url is required when mini QR login is enabled".to_owned()
                    );
                }
            }
        }
        _ => {}
    }
    Ok(())
}

fn primary_enabled_official(settings: &AdminAuthSettings) -> Option<&AdminAuthWechatOfficial> {
    settings
        .wechat
        .official
        .iter()
        .find(|item| item.enabled && item.primary)
        .or_else(|| settings.wechat.official.iter().find(|item| item.enabled))
}

fn primary_enabled_mini(settings: &AdminAuthSettings) -> Option<&AdminAuthWechatMini> {
    settings
        .wechat
        .mini
        .iter()
        .find(|item| item.enabled && item.primary)
        .or_else(|| settings.wechat.mini.iter().find(|item| item.enabled))
}

fn merge_wechat_settings(
    mut current: AdminAuthWechatSettings,
    request: AdminAuthWechatUpdateRequest,
) -> Result<AdminAuthWechatSettings, String> {
    if let Some(official) = request.official {
        current.official = normalize_wechat_official_accounts(official)?;
    }
    if let Some(mini) = request.mini {
        current.mini = normalize_wechat_mini_apps(mini)?;
    }
    Ok(current)
}

fn normalize_wechat_official_accounts(
    values: Vec<AdminAuthWechatOfficialRequest>,
) -> Result<Vec<AdminAuthWechatOfficial>, String> {
    if values.len() > 8 {
        return Err("wechat.official must include at most 8 items".to_owned());
    }
    let mut normalized = Vec::new();
    let mut keys = Vec::new();
    let mut primary_count = 0usize;
    for value in values {
        let enabled = value.enabled.unwrap_or(true);
        let primary = value.primary.unwrap_or(false);
        if enabled && primary {
            primary_count += 1;
        }
        let key = normalize_identifier("wechat.official.key", &value.key, 64)?;
        if keys.contains(&key) {
            return Err("wechat.official.key must be unique".to_owned());
        }
        keys.push(key.clone());
        normalized.push(AdminAuthWechatOfficial {
            key,
            name: normalize_required_text("wechat.official.name", &value.name, 64)?,
            app_id: normalize_identifier("wechat.official.appId", &value.app_id, 64)?,
            original_id: normalize_optional_identifier(
                "wechat.official.originalId",
                value.original_id.as_deref(),
                64,
            )?,
            secret_ref: normalize_secret_ref("wechat.official.secretRef", &value.secret_ref)?,
            token_ref: normalize_secret_ref("wechat.official.tokenRef", &value.token_ref)?,
            aes_key_ref: normalize_optional_secret_ref(
                "wechat.official.aesKeyRef",
                value.aes_key_ref.as_deref(),
            )?,
            url: normalize_optional_https_url("wechat.official.url", value.url.as_deref())?,
            enabled,
            primary,
            scene: normalize_optional_identifier(
                "wechat.official.scene",
                value.scene.as_deref(),
                64,
            )?,
        });
    }
    if primary_count > 1 {
        return Err("wechat.official must include at most one enabled primary item".to_owned());
    }
    Ok(normalized)
}

fn normalize_wechat_mini_apps(
    values: Vec<AdminAuthWechatMiniRequest>,
) -> Result<Vec<AdminAuthWechatMini>, String> {
    if values.len() > 8 {
        return Err("wechat.mini must include at most 8 items".to_owned());
    }
    let mut normalized = Vec::new();
    let mut keys = Vec::new();
    let mut primary_count = 0usize;
    for value in values {
        let enabled = value.enabled.unwrap_or(true);
        let primary = value.primary.unwrap_or(false);
        if enabled && primary {
            primary_count += 1;
        }
        let key = normalize_identifier("wechat.mini.key", &value.key, 64)?;
        if keys.contains(&key) {
            return Err("wechat.mini.key must be unique".to_owned());
        }
        keys.push(key.clone());
        normalized.push(AdminAuthWechatMini {
            key,
            name: normalize_required_text("wechat.mini.name", &value.name, 64)?,
            app_id: normalize_identifier("wechat.mini.appId", &value.app_id, 64)?,
            secret_ref: normalize_secret_ref("wechat.mini.secretRef", &value.secret_ref)?,
            url: normalize_optional_https_url("wechat.mini.url", value.url.as_deref())?,
            enabled,
            primary,
            path: normalize_mini_program_path(&value.path)?,
            env: normalize_enum(
                value.env.as_deref().unwrap_or("release"),
                "wechat.mini.env",
                &["release", "trial", "develop"],
            )?,
        });
    }
    if primary_count > 1 {
        return Err("wechat.mini must include at most one enabled primary item".to_owned());
    }
    Ok(normalized)
}

fn normalize_required_text(
    field_name: &str,
    value: &str,
    max_len: usize,
) -> Result<String, String> {
    let value = value.trim();
    if value.is_empty() {
        return Err(format!("{field_name} must not be empty"));
    }
    if value.chars().count() > max_len {
        return Err(format!("{field_name} must be at most {max_len} characters"));
    }
    Ok(value.to_owned())
}

fn normalize_identifier(field_name: &str, value: &str, max_len: usize) -> Result<String, String> {
    let value = normalize_required_text(field_name, value, max_len)?;
    if !value
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'-')
    {
        return Err(format!(
            "{field_name} must use letters, digits, underscore, or hyphen"
        ));
    }
    Ok(value)
}

fn normalize_optional_identifier(
    field_name: &str,
    value: Option<&str>,
    max_len: usize,
) -> Result<String, String> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(String::new());
    };
    normalize_identifier(field_name, value, max_len)
}

fn normalize_secret_ref(field_name: &str, value: &str) -> Result<String, String> {
    let value = normalize_required_text(field_name, value, 256)?;
    if !value.bytes().all(|byte| (0x21..=0x7e).contains(&byte)) {
        return Err(format!(
            "{field_name} must contain only visible ASCII characters"
        ));
    }
    if !(value.starts_with("secret://") || value.starts_with("vault://")) {
        return Err(format!(
            "{field_name} must start with secret:// or vault://"
        ));
    }
    Ok(value)
}

fn normalize_optional_secret_ref(field_name: &str, value: Option<&str>) -> Result<String, String> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(String::new());
    };
    normalize_secret_ref(field_name, value)
}

fn normalize_optional_https_url(field_name: &str, value: Option<&str>) -> Result<String, String> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(String::new());
    };
    if value.chars().count() > 2048 {
        return Err(format!("{field_name} must be at most 2048 characters"));
    }
    if !value.bytes().all(|byte| (0x21..=0x7e).contains(&byte)) {
        return Err(format!(
            "{field_name} must contain only visible ASCII characters"
        ));
    }
    if !value.starts_with("https://") {
        return Err(format!("{field_name} must be an https URL"));
    }
    if value.contains('#') {
        return Err(format!("{field_name} must not include a fragment"));
    }
    Ok(value.to_owned())
}

fn normalize_mini_program_path(value: &str) -> Result<String, String> {
    let value = normalize_required_text("wechat.mini.path", value, 128)?;
    if value.starts_with('/') {
        return Err("wechat.mini.path must not start with /".to_owned());
    }
    if value.contains('?') || value.contains('#') {
        return Err("wechat.mini.path must not include query or fragment".to_owned());
    }
    if !value.bytes().all(|byte| {
        byte.is_ascii_alphanumeric()
            || matches!(
                byte,
                b'_' | b'-' | b'.' | b'/' | b'!' | b'~' | b'*' | b'\'' | b'(' | b')'
            )
    }) {
        return Err("wechat.mini.path contains unsupported characters".to_owned());
    }
    Ok(value)
}

fn build_update_command(
    state: AdminAuthSettingsState,
    _headers: &HeaderMap,
    subject: AdminAuthSettingsSubject,
    settings: AdminAuthSettings,
) -> Result<UpdateAdminAuthSettingsCommand, AuthSettingsCommandBuildError> {
    Ok(UpdateAdminAuthSettingsCommand {
        subject,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        settings,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn generate_entity_uuid(
    state: &AdminAuthSettingsState,
) -> Result<String, AuthSettingsCommandBuildError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(AuthSettingsCommandBuildError::System)
}

fn request_id_error(error: RequestIdError) -> AuthSettingsCommandBuildError {
    match error {
        RequestIdError::Invalid(message) => AuthSettingsCommandBuildError::BadRequest(message),
        RequestIdError::System(message) => {
            AuthSettingsCommandBuildError::System(DomainError::new(message))
        }
    }
}

fn to_response(settings: AdminAuthSettings) -> AdminAuthSettingsResponse {
    AdminAuthSettingsResponse {
        left_rail_mode: settings.left_rail_mode,
        login_methods: settings.login_methods,
        oauth_login_enabled: settings.oauth_login_enabled,
        oauth_providers: settings.oauth_providers,
        oauth_region: settings.oauth_region,
        qr_login_enabled: settings.qr_login_enabled,
        qr_login_type: settings.qr_login_type,
        recovery_methods: settings.recovery_methods,
        register_methods: settings.register_methods,
        verification_policy: AdminAuthVerificationPolicyResponse {
            email_code_login_enabled: settings.verification_policy.email_code_login_enabled,
            email_registration_verification_required: settings
                .verification_policy
                .email_registration_verification_required,
            phone_code_login_enabled: settings.verification_policy.phone_code_login_enabled,
            phone_registration_verification_required: settings
                .verification_policy
                .phone_registration_verification_required,
        },
        wechat: to_wechat_response(settings.wechat),
    }
}

fn to_wechat_response(settings: AdminAuthWechatSettings) -> AdminAuthWechatResponse {
    AdminAuthWechatResponse {
        official: settings
            .official
            .into_iter()
            .map(|item| AdminAuthWechatOfficialResponse {
                key: item.key,
                name: item.name,
                app_id: item.app_id,
                original_id: item.original_id,
                secret_ref: item.secret_ref,
                token_ref: item.token_ref,
                aes_key_ref: item.aes_key_ref,
                url: item.url,
                enabled: item.enabled,
                primary: item.primary,
                scene: item.scene,
            })
            .collect(),
        mini: settings
            .mini
            .into_iter()
            .map(|item| AdminAuthWechatMiniResponse {
                key: item.key,
                name: item.name,
                app_id: item.app_id,
                secret_ref: item.secret_ref,
                url: item.url,
                enabled: item.enabled,
                primary: item.primary,
                path: item.path,
                env: item.env,
            })
            .collect(),
    }
}

fn bad_request(message: String) -> Response {
    (
        StatusCode::BAD_REQUEST,
        Json(PlusApiResult::error("4001", message)),
    )
        .into_response()
}

fn command_build_error_response(error: AuthSettingsCommandBuildError) -> Response {
    match error {
        AuthSettingsCommandBuildError::BadRequest(message) => bad_request(message),
        AuthSettingsCommandBuildError::System(error) => {
            auth_settings_system_response("auth settings command is invalid", error)
        }
    }
}

fn auth_settings_system_response(context: &str, error: DomainError) -> Response {
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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn merge_update_request_accepts_compact_wechat_qr_settings() {
        let request: AdminAuthSettingsUpdateRequest = serde_json::from_value(json!({
            "qrLoginEnabled": true,
            "qrLoginType": "official",
            "wechat": {
                "official": [
                    {
                        "key": "oa-main",
                        "name": "Main OA",
                        "appId": "wx1234567890abcdef",
                        "originalId": "gh_123456",
                        "secretRef": "secret://wechat/oa-main/secret",
                        "tokenRef": "secret://wechat/oa-main/token",
                        "aesKeyRef": "secret://wechat/oa-main/aes",
                        "url": "https://mp.weixin.qq.com/sdkwork-login",
                        "enabled": true,
                        "primary": true,
                        "scene": "login"
                    }
                ],
                "mini": [
                    {
                        "key": "mini-main",
                        "name": "Main Mini",
                        "appId": "wxabcdef1234567890",
                        "secretRef": "secret://wechat/mini-main/secret",
                        "enabled": true,
                        "primary": true,
                        "path": "pages/auth/login",
                        "env": "release"
                    }
                ]
            }
        }))
        .unwrap();

        let settings = merge_update_request(AdminAuthSettings::default(), request).unwrap();

        assert_eq!("official", settings.qr_login_type);
        assert!(settings.qr_login_enabled);
        assert_eq!(1, settings.wechat.official.len());
        assert_eq!("oa-main", settings.wechat.official[0].key);
        assert_eq!(1, settings.wechat.mini.len());
        assert_eq!("pages/auth/login", settings.wechat.mini[0].path);
    }

    #[test]
    fn merge_update_request_rejects_mini_path_with_leading_slash_or_query() {
        for path in ["/pages/auth/login", "pages/auth/login?qrKey=bad"] {
            let request: AdminAuthSettingsUpdateRequest = serde_json::from_value(json!({
                "wechat": {
                    "mini": [
                        {
                            "key": "mini-main",
                            "name": "Main Mini",
                            "appId": "wxabcdef1234567890",
                            "secretRef": "secret://wechat/mini-main/secret",
                            "enabled": true,
                            "primary": true,
                            "path": path,
                            "env": "release"
                        }
                    ]
                }
            }))
            .unwrap();

            let error = merge_update_request(AdminAuthSettings::default(), request).unwrap_err();
            assert!(error.contains("wechat.mini.path"));
        }
    }

    #[test]
    fn merge_update_request_rejects_enabled_default_wechat_qr_without_url() {
        let request: AdminAuthSettingsUpdateRequest = serde_json::from_value(json!({
            "qrLoginEnabled": true,
            "qrLoginType": "mini",
            "wechat": {
                "mini": [
                    {
                        "key": "mini-main",
                        "name": "Main Mini",
                        "appId": "wxabcdef1234567890",
                        "secretRef": "secret://wechat/mini-main/secret",
                        "enabled": true,
                        "primary": true,
                        "path": "pages/auth/login",
                        "env": "release"
                    }
                ]
            }
        }))
        .unwrap();

        let error = merge_update_request(AdminAuthSettings::default(), request).unwrap_err();
        assert!(error.contains("wechat.mini.url"));
    }
}
