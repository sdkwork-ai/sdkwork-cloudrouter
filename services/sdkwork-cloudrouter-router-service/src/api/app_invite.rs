use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Bytes;
use axum::extract::{Query, State};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use crate::api::app_sql_subject::RequiredAppSqlScopedSubject;
use crate::api::request_id::generate_server_request_id;
use crate::api::response::{problem_from_wire_code, success_envelope};
use crate::domain::DomainError;
use crate::ports::{
    AdminAuthSettingsStore, AppInviteStore, AppInviteSubject, ClaimAppInviteRelationCommand,
    GetAdminAuthSettingsScopeQuery, IssueAppInviteCodeCommand, ValidateAppInviteCodeQuery,
};

const MAX_INVITE_CODE_LEN: usize = 32;
const MAX_TENANT_CODE_LENGTH: usize = 64;
const MAX_ORGANIZATION_CODE_LENGTH: usize = 64;
/// De-confused invite code alphabet (no 0/O/1/I/L to avoid typos).
const INVITE_CODE_ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_CODE_LENGTH: usize = 8;

#[derive(Clone)]
struct AppInviteState {
    store: Arc<dyn AppInviteStore + Send + Sync>,
    auth_settings_store: Arc<dyn AdminAuthSettingsStore + Send + Sync>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppInviteScopeQuery {
    tenant_code: Option<String>,
    organization_code: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppInviteValidateRequest {
    invite_code: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppInviteClaimRequest {
    invite_code: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppInvitePolicyResponse {
    register_required: bool,
    login_required: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppInviteValidateResponse {
    valid: bool,
    message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppInviteClaimResponse {
    reward_status: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppInviteCodeResponse {
    invite_code: String,
}

enum AppInviteCommandBuildError {
    BadRequest(String),
    System(DomainError),
}

pub fn app_invite_router_with_store(
    store: Arc<dyn AppInviteStore + Send + Sync>,
    auth_settings_store: Arc<dyn AdminAuthSettingsStore + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/app/v3/api/iam/invite/policy",
            get(fetch_invite_policy),
        )
        .route(
            "/app/v3/api/iam/invites/validate",
            post(validate_invite_code),
        )
        .route(
            "/app/v3/api/iam/invites/issue",
            post(issue_invite_code),
        )
        .route(
            "/app/v3/api/iam/invites/claim",
            post(claim_invite_relation),
        )
        .with_state(AppInviteState {
            store,
            auth_settings_store,
        })
}

async fn fetch_invite_policy(
    State(state): State<AppInviteState>,
    Query(query): Query<AppInviteScopeQuery>,
) -> Response {
    let tenant_code = match normalize_optional_field(
        query.tenant_code.as_deref(),
        "tenant_code",
        MAX_TENANT_CODE_LENGTH,
    ) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let organization_code = match normalize_optional_field(
        query.organization_code.as_deref(),
        "organization_code",
        MAX_ORGANIZATION_CODE_LENGTH,
    ) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    match state
        .auth_settings_store
        .get_auth_settings_for_scope(GetAdminAuthSettingsScopeQuery {
            tenant_code,
            organization_code,
        })
        .await
    {
        Ok(settings) => {
            let policy = settings.invite_code_policy;
            Json(success_envelope(AppInvitePolicyResponse {
                register_required: policy.register_required,
                login_required: policy.login_required,
            }))
            .into_response()
        }
        Err(error) => {
            invite_system_response("invite policy read model is unavailable", error)
        }
    }
}

async fn validate_invite_code(
    State(state): State<AppInviteState>,
    body: Bytes,
) -> Response {
    let request = match parse_json_body::<AppInviteValidateRequest>(&body, "invite code") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let invite_code = match normalize_invite_code(request.invite_code.as_str()) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };

    match state
        .store
        .validate_invite_code(ValidateAppInviteCodeQuery { invite_code })
        .await
    {
        Ok(Some(_owner)) => Json(success_envelope(AppInviteValidateResponse {
            valid: true,
            message: String::new(),
        }))
        .into_response(),
        Ok(None) => Json(success_envelope(AppInviteValidateResponse {
            valid: false,
            message: "invite code is invalid or inactive".to_owned(),
        }))
        .into_response(),
        Err(error) => invite_system_response("invite code validation is unavailable", error),
    }
}

async fn issue_invite_code(
    State(state): State<AppInviteState>,
    scoped: RequiredAppSqlScopedSubject,
) -> Response {
    let subject = AppInviteSubject {
        tenant_id: scoped.0.tenant_id,
        organization_id: scoped.0.organization_id,
        user_id: scoped.0.user_id,
    };
    let command = match build_issue_command(subject) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };
    match state.store.issue_invite_code(command).await {
        Ok(item) => Json(success_envelope(AppInviteCodeResponse {
            invite_code: item.invite_code,
        }))
        .into_response(),
        Err(error) => invite_system_response("invite code issue store is unavailable", error),
    }
}

async fn claim_invite_relation(
    State(state): State<AppInviteState>,
    scoped: RequiredAppSqlScopedSubject,
    body: Bytes,
) -> Response {
    let subject = AppInviteSubject {
        tenant_id: scoped.0.tenant_id,
        organization_id: scoped.0.organization_id,
        user_id: scoped.0.user_id,
    };
    let request = match parse_json_body::<AppInviteClaimRequest>(&body, "invite claim") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let invite_code = match normalize_invite_code(request.invite_code.as_str()) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let owner = match state
        .store
        .validate_invite_code(ValidateAppInviteCodeQuery {
            invite_code: invite_code.clone(),
        })
        .await
    {
        Ok(Some(owner)) => owner,
        Ok(None) => return bad_request("invite code is invalid or inactive".to_owned()),
        Err(error) => {
            return invite_system_response("invite code validation is unavailable", error);
        }
    };
    if owner.user_id == subject.user_id {
        return bad_request("a user cannot invite themselves".to_owned());
    }
    let command = match build_claim_command(subject, owner.user_id, invite_code) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };
    match state.store.claim_invite_relation(command).await {
        Ok(result) => Json(success_envelope(AppInviteClaimResponse {
            reward_status: result.reward_status,
        }))
        .into_response(),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => invite_system_response("invite claim store is unavailable", error),
    }
}

fn build_issue_command(
    subject: AppInviteSubject,
) -> Result<IssueAppInviteCodeCommand, AppInviteCommandBuildError> {
    let request_id = generate_server_request_id().map_err(request_id_error)?;
    Ok(IssueAppInviteCodeCommand {
        subject,
        invite_code: generate_invite_code()?,
        request_id,
        requested_at: current_timestamp_string(),
    })
}

fn build_claim_command(
    subject: AppInviteSubject,
    inviter_user_id: i64,
    invite_code: String,
) -> Result<ClaimAppInviteRelationCommand, AppInviteCommandBuildError> {
    let request_id = generate_server_request_id().map_err(request_id_error)?;
    Ok(ClaimAppInviteRelationCommand {
        subject,
        inviter_user_id,
        invite_code,
        source: "register".to_owned(),
        request_id,
        requested_at: current_timestamp_string(),
    })
}

fn generate_invite_code() -> Result<String, AppInviteCommandBuildError> {
    let mut buffer = [0u8; INVITE_CODE_LENGTH];
    getrandom::fill(&mut buffer)
        .map_err(|error| AppInviteCommandBuildError::System(DomainError::new(error.to_string())))?;
    let code = buffer
        .iter()
        .map(|byte| INVITE_CODE_ALPHABET[(*byte as usize) % INVITE_CODE_ALPHABET.len()] as char)
        .collect::<String>();
    Ok(code)
}

fn normalize_invite_code(value: &str) -> Result<String, String> {
    let value = value.trim().to_ascii_uppercase();
    if value.is_empty() {
        return Err("inviteCode is required".to_owned());
    }
    if value.chars().count() > MAX_INVITE_CODE_LEN {
        return Err(format!("inviteCode must be at most {MAX_INVITE_CODE_LEN} characters"));
    }
    if !value
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_')
    {
        return Err("inviteCode may only contain letters, digits, -, and _".to_owned());
    }
    Ok(value)
}

fn normalize_optional_field(value: Option<&str>, field_name: &str, max_len: usize) -> Result<Option<String>, String> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    if value.chars().count() > max_len {
        return Err(format!("{field_name} must be at most {max_len} characters"));
    }
    Ok(Some(value.to_owned()))
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

fn bad_request(message: impl Into<String>) -> Response {
    problem_from_wire_code("4001", message.into()).into_response()
}

fn conflict_response(error: DomainError) -> Response {
    problem_from_wire_code("4090", error.to_string()).into_response()
}

fn command_build_error_response(error: AppInviteCommandBuildError) -> Response {
    match error {
        AppInviteCommandBuildError::BadRequest(message) => bad_request(message),
        AppInviteCommandBuildError::System(error) => {
            invite_system_response("invite command is invalid", error)
        }
    }
}

fn invite_system_response(context: &str, error: DomainError) -> Response {
    problem_from_wire_code("5000", format!("{context}: {error}")).into_response()
}

fn request_id_error(error: crate::api::request_id::RequestIdError) -> AppInviteCommandBuildError {
    match error {
        crate::api::request_id::RequestIdError::Invalid(message) => {
            AppInviteCommandBuildError::BadRequest(message)
        }
        crate::api::request_id::RequestIdError::System(message) => {
            AppInviteCommandBuildError::System(DomainError::new(message))
        }
    }
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
