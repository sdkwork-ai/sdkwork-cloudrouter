use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::extract::rejection::JsonRejection;
use axum::extract::{Extension, State};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, put};
use axum::{Json, Router};
use sdkwork_utils_rust::SdkWorkResultCode;
use sdkwork_web_core::WebRequestContext;
use serde::Deserialize;

use crate::api::app_sql_subject::{
    map_optional_app_sql_subject, map_required_app_sql_subject, RequiredAppSqlScopedSubject,
    ResolvedAppSqlScopedSubject,
};
use crate::api::response::{
    json_success_response, platform_problem_for_context, validation_problem_for_context,
};
use crate::application::EntityUuidGenerator;
use crate::domain::DomainError;
use crate::infrastructure::OsApiKeySecretGenerator;
use crate::ports::{
    SettingsCommandFuture, SettingsData, SettingsNotifications, SettingsReadFuture, SettingsStore,
    SettingsSubject, UpdateSettingsCommand,
};

const MAX_LANGUAGE_LEN: usize = 32;
const MAX_TIMEZONE_LEN: usize = 64;
const MAX_WEBHOOK_URL_LEN: usize = 1024;

struct AppSettingsState {
    store: Arc<dyn SettingsStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    require_subject: bool,
}

impl Clone for AppSettingsState {
    fn clone(&self) -> Self {
        Self {
            store: Arc::clone(&self.store),
            entity_uuid_generator: Arc::clone(&self.entity_uuid_generator),
            require_subject: self.require_subject,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct UpdateSettingsRequest {
    language: Option<String>,
    timezone: Option<String>,
    webhook_url: Option<String>,
    notifications: Option<UpdateSettingsNotificationsRequest>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct UpdateSettingsNotificationsRequest {
    bill_reminder: Option<bool>,
    quota_warning: Option<bool>,
    api_monitor: Option<bool>,
}

struct UnavailableSettingsStore;

impl SettingsStore for UnavailableSettingsStore {
    fn load_settings<'a>(&'a self, _subject: Option<SettingsSubject>) -> SettingsReadFuture<'a> {
        Box::pin(async { Err(DomainError::new("settings store is not configured")) })
    }

    fn update_settings<'a>(&'a self, _command: UpdateSettingsCommand) -> SettingsCommandFuture<'a> {
        Box::pin(async {
            Err(DomainError::new(
                "settings command store is unavailable without database configuration",
            ))
        })
    }
}

pub fn app_settings_router() -> Router {
    app_settings_router_with_state(
        Arc::new(UnavailableSettingsStore),
        Arc::new(OsApiKeySecretGenerator),
        false,
    )
}

pub fn app_settings_router_with_store(
    store: Arc<dyn SettingsStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    app_settings_router_with_state(store, entity_uuid_generator, true)
}

fn app_settings_router_with_state(
    store: Arc<dyn SettingsStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    require_subject: bool,
) -> Router {
    Router::new()
        .route("/app/v3/api/iam/users/settings", get(fetch_settings))
        .route("/app/v3/api/iam/users/settings", put(update_settings))
        .with_state(AppSettingsState {
            store,
            entity_uuid_generator,
            require_subject,
        })
}

async fn fetch_settings(
    State(state): State<AppSettingsState>,
    ResolvedAppSqlScopedSubject(subject): ResolvedAppSqlScopedSubject,
    request_context: Option<Extension<WebRequestContext>>,
) -> Response {
    let ctx = request_context.map(|context| context.0);
    let subject = match map_optional_app_sql_subject(subject, state.require_subject, |scoped| {
        scoped.into()
    }) {
        Ok(subject) => subject,
        Err(error) => return error.into_response(),
    };

    match state.store.load_settings(subject).await {
        Ok(settings) => json_success_response(ctx.as_ref(), settings),
        Err(_) => settings_system_response(ctx.as_ref(), "settings_read_failed"),
    }
}

async fn update_settings(
    State(state): State<AppSettingsState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    request_context: Option<Extension<WebRequestContext>>,
    request: Result<Json<UpdateSettingsRequest>, JsonRejection>,
) -> Response {
    let ctx = request_context.map(|context| context.0);
    let Json(request) = match request {
        Ok(request) => request,
        Err(_) => {
            return validation_problem_for_context(
                ctx.as_ref(),
                "settings request body is invalid",
            )
            .into_response();
        }
    };
    let subject = map_required_app_sql_subject(subject, SettingsSubject::from);
    let settings = match validate_update_settings_request(request) {
        Ok(settings) => settings,
        Err(message) => {
            return validation_problem_for_context(ctx.as_ref(), message).into_response();
        }
    };
    let command = match build_update_settings_command(state.clone(), subject, settings) {
        Ok(command) => command,
        Err(_) => {
            return settings_system_response(ctx.as_ref(), "settings_identifier_generation_failed");
        }
    };

    match state.store.update_settings(command).await {
        Ok(outcome) => json_success_response(ctx.as_ref(), outcome),
        Err(_) => settings_system_response(ctx.as_ref(), "settings_update_failed"),
    }
}

fn validate_update_settings_request(
    request: UpdateSettingsRequest,
) -> Result<SettingsData, String> {
    let language = validate_short_code(
        "language",
        request.language,
        MAX_LANGUAGE_LEN,
        is_valid_language_char,
    )?;
    let timezone = validate_short_code(
        "timezone",
        request.timezone,
        MAX_TIMEZONE_LEN,
        is_valid_timezone_char,
    )?;
    let webhook_url = validate_webhook_url(request.webhook_url)?;
    let notifications = request
        .notifications
        .ok_or_else(|| "notifications must be provided".to_owned())?;

    Ok(SettingsData {
        language,
        timezone,
        webhook_url,
        notifications: SettingsNotifications {
            bill_reminder: required_bool(
                "notifications.billReminder",
                notifications.bill_reminder,
            )?,
            quota_warning: required_bool(
                "notifications.quotaWarning",
                notifications.quota_warning,
            )?,
            api_monitor: required_bool("notifications.apiMonitor", notifications.api_monitor)?,
        },
    })
}

fn validate_short_code(
    field_name: &str,
    value: Option<String>,
    max_len: usize,
    valid_char: fn(char) -> bool,
) -> Result<String, String> {
    let value = value.unwrap_or_default().trim().to_owned();
    if value.is_empty() {
        return Err(format!("{field_name} must not be empty"));
    }
    if value.chars().count() > max_len {
        return Err(format!(
            "{field_name} length must not exceed {max_len} characters"
        ));
    }
    if !value.chars().all(valid_char) {
        return Err(format!("{field_name} contains unsupported characters"));
    }
    Ok(value)
}

fn validate_webhook_url(value: Option<String>) -> Result<String, String> {
    let value = value.unwrap_or_default().trim().to_owned();
    if value.chars().count() > MAX_WEBHOOK_URL_LEN {
        return Err(format!(
            "webhook URL length must not exceed {MAX_WEBHOOK_URL_LEN} characters"
        ));
    }
    if value.is_empty() {
        return Ok(value);
    }
    if !(value.starts_with("https://") || value.starts_with("http://")) {
        return Err("webhook URL must use http or https".to_owned());
    }
    if value
        .chars()
        .any(|ch| ch.is_ascii_control() || ch.is_whitespace())
    {
        return Err("webhook URL must not contain whitespace or control characters".to_owned());
    }
    Ok(value)
}

fn required_bool(field_name: &str, value: Option<bool>) -> Result<bool, String> {
    value.ok_or_else(|| format!("{field_name} must be provided"))
}

fn is_valid_language_char(ch: char) -> bool {
    ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_')
}

fn is_valid_timezone_char(ch: char) -> bool {
    ch.is_ascii_alphanumeric() || matches!(ch, '/' | '_' | '-' | '+' | ':')
}

fn build_update_settings_command(
    state: AppSettingsState,
    subject: SettingsSubject,
    settings: SettingsData,
) -> Result<UpdateSettingsCommand, DomainError> {
    Ok(UpdateSettingsCommand {
        subject,
        settings,
        preference_uuid: state.entity_uuid_generator.generate_entity_uuid()?,
        webhook_uuid: state.entity_uuid_generator.generate_entity_uuid()?,
        requested_at: current_timestamp_string(),
    })
}

fn settings_system_response(
    context: Option<&WebRequestContext>,
    failure: &'static str,
) -> Response {
    tracing::error!(failure, "settings API operation failed");
    platform_problem_for_context(
        context,
        SdkWorkResultCode::InternalError,
        "settings service is unavailable",
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
