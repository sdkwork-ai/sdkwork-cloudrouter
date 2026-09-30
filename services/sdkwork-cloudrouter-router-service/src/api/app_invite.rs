use std::sync::Arc;

use axum::body::Bytes;
use axum::extract::{Query, State};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use crate::api::app_sql_subject::RequiredAppSqlScopedSubject;
use crate::api::request_id::generate_server_request_id;
use crate::api::response::{
    bad_request, domain_conflict_response as conflict_response,
    success_envelope,
};
use crate::api::text_normalization::parse_json_body;
use crate::api::command_error::{
    command_error_from_request_id as request_id_error, command_error_response,
    system_error_response, ApiCommandError,
};
use crate::domain::DomainError;
use crate::ports::{
    AdminAuthSettingsStore, AppInviteStore, AppInviteSubject, ClaimAppInviteRelationCommand,
    GetAdminAuthSettingsScopeQuery, IssueAppInviteCodeCommand, ValidateAppInviteCodeQuery,
};
use sdkwork_utils_rust::datetime::current_timestamp_string;

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

pub fn app_invite_router_with_store(
    store: Arc<dyn AppInviteStore + Send + Sync>,
    auth_settings_store: Arc<dyn AdminAuthSettingsStore + Send + Sync>,
) -> Router {
    Router::new()
        .route("/app/v3/api/iam/invite/policy", get(fetch_invite_policy))
        .route(
            "/app/v3/api/iam/invites/validate",
            post(validate_invite_code),
        )
        .route("/app/v3/api/iam/invites/issue", post(issue_invite_code))
        .route("/app/v3/api/iam/invites/claim", post(claim_invite_relation))
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
        // The auth settings read model is not authoritative for the register
        // gate; fall back to the platform default (no invite code required)
        // instead of failing the policy lookup. This keeps the public gate
        // resolvable on fresh installations before any auth settings snapshot
        // exists. Fail-open is intentional: the gate guides the register
        // funnel and a 500 here would block the whole register flow.
        Err(error) if error.is_not_found() => Json(success_envelope(AppInvitePolicyResponse {
            register_required: false,
            login_required: false,
        }))
        .into_response(),
        Err(error) => system_error_response("invite policy read model is unavailable", error),
    }
}

async fn validate_invite_code(State(state): State<AppInviteState>, body: Bytes) -> Response {
    let request = match parse_json_body::<AppInviteValidateRequest>(&body, "invite code") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let invite_code = match normalize_invite_code(request.invite_code.as_str()) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };

    // Invite codes are looked up globally (tenant-agnostic): the code index
    // is tenant-scoped in the schema, and the standalone platform resolves to
    // a single default tenant anyway. The claim step re-scopes the relation
    // write to the authenticated subject's tenant.
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
        Err(error) => system_error_response("invite code validation is unavailable", error),
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
        Err(error) => return command_error_response(error, "app invite command is invalid"),
    };
    match state.store.issue_invite_code(command).await {
        Ok(item) => Json(success_envelope(AppInviteCodeResponse {
            invite_code: item.invite_code,
        }))
        .into_response(),
        Err(error) => system_error_response("invite code issue store is unavailable", error),
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
            return system_error_response("invite code validation is unavailable", error);
        }
    };
    if owner.user_id == subject.user_id {
        return bad_request("a user cannot invite themselves".to_owned());
    }
    let command = match build_claim_command(subject, owner.user_id, invite_code) {
        Ok(command) => command,
        Err(error) => return command_error_response(error, "app invite command is invalid"),
    };
    match state.store.claim_invite_relation(command).await {
        Ok(result) => Json(success_envelope(AppInviteClaimResponse {
            reward_status: result.reward_status,
        }))
        .into_response(),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => system_error_response("invite claim store is unavailable", error),
    }
}

fn build_issue_command(
    subject: AppInviteSubject,
) -> Result<IssueAppInviteCodeCommand, ApiCommandError> {
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
) -> Result<ClaimAppInviteRelationCommand, ApiCommandError> {
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

fn generate_invite_code() -> Result<String, ApiCommandError> {
    let mut buffer = [0u8; INVITE_CODE_LENGTH];
    getrandom::fill(&mut buffer)
        .map_err(|error| ApiCommandError::System(DomainError::new(error.to_string())))?;
    let code = buffer
        .iter()
        .map(|byte| INVITE_CODE_ALPHABET[(*byte as usize) % INVITE_CODE_ALPHABET.len()] as char)
        .collect::<String>();
    Ok(code)
}

fn normalize_invite_code(value: &str) -> Result<String, String> {
    // Tolerate grouped/lowercase entry: strips separators and spaces so
    // "abcd-efgh" or "abcd efgh" resolve to "ABCDEFGH" before validation.
    let value = value
        .trim()
        .chars()
        .filter(|ch| *ch != '-' && *ch != ' ' && *ch != '_')
        .collect::<String>()
        .to_ascii_uppercase();
    if value.is_empty() {
        return Err("inviteCode is required".to_owned());
    }
    if value.chars().count() > MAX_INVITE_CODE_LEN {
        return Err(format!(
            "inviteCode must be at most {MAX_INVITE_CODE_LEN} characters"
        ));
    }
    if !value.bytes().all(|byte| byte.is_ascii_alphanumeric()) {
        return Err("inviteCode may only contain letters and digits".to_owned());
    }
    Ok(value)
}

fn normalize_optional_field(
    value: Option<&str>,
    field_name: &str,
    max_len: usize,
) -> Result<Option<String>, String> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    if value.chars().count() > max_len {
        return Err(format!("{field_name} must be at most {max_len} characters"));
    }
    Ok(Some(value.to_owned()))
}
