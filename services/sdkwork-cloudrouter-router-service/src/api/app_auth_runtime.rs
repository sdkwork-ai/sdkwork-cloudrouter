use std::sync::Arc;

use axum::extract::{Query, State};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use crate::api::response::{bad_request, success_envelope};
use crate::ports::{
    AdminAuthSettings, AdminAuthSettingsStore, GetAdminAuthSettingsScopeQuery,
};

const MAX_TENANT_CODE_LENGTH: usize = 64;
const MAX_ORGANIZATION_CODE_LENGTH: usize = 64;

#[derive(Clone)]
struct AppAuthRuntimeState {
    auth_settings_store: Arc<dyn AdminAuthSettingsStore + Send + Sync>,
}

#[derive(Debug, Deserialize)]
struct AppAuthRuntimeScopeQuery {
    tenant_code: Option<String>,
    organization_code: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppAuthVerificationPolicyResponse {
    email_code_login_enabled: bool,
    email_registration_verification_required: bool,
    phone_code_login_enabled: bool,
    phone_registration_verification_required: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppAuthInviteCodePolicyResponse {
    register_required: bool,
    login_required: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppAuthRuntimeSettingsResponse {
    left_rail_mode: String,
    login_methods: Vec<String>,
    register_methods: Vec<String>,
    recovery_methods: Vec<String>,
    verification_policy: AppAuthVerificationPolicyResponse,
    oauth_login_enabled: bool,
    oauth_providers: Vec<String>,
    oauth_region: String,
    qr_login_enabled: bool,
    qr_login_type: String,
    invite_code_policy: AppAuthInviteCodePolicyResponse,
}

pub fn app_auth_runtime_router_with_store(
    auth_settings_store: Arc<dyn AdminAuthSettingsStore + Send + Sync>,
) -> Router {
    Router::new()
        .route("/app/v3/api/iam/auth/runtime", get(fetch_auth_runtime))
        .with_state(AppAuthRuntimeState { auth_settings_store })
}

async fn fetch_auth_runtime(
    State(state): State<AppAuthRuntimeState>,
    Query(query): Query<AppAuthRuntimeScopeQuery>,
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
        Ok(settings) => Json(success_envelope(to_response(settings))).into_response(),
        // A fresh installation has no resolvable tenant scope yet. The login
        // surface must still render, so fall back to platform defaults instead
        // of blocking the whole auth entry on a configuration read.
        Err(error) if error.is_not_found() => {
            Json(success_envelope(to_response(AdminAuthSettings::default()))).into_response()
        }
        Err(error) => crate::api::command_error::system_error_response(
            "auth runtime settings are unavailable",
            error,
        ),
    }
}

fn to_response(settings: AdminAuthSettings) -> AppAuthRuntimeSettingsResponse {
    AppAuthRuntimeSettingsResponse {
        left_rail_mode: settings.left_rail_mode,
        login_methods: settings.login_methods,
        register_methods: settings.register_methods,
        recovery_methods: settings.recovery_methods,
        verification_policy: AppAuthVerificationPolicyResponse {
            email_code_login_enabled: settings.verification_policy.email_code_login_enabled,
            email_registration_verification_required: settings
                .verification_policy
                .email_registration_verification_required,
            phone_code_login_enabled: settings.verification_policy.phone_code_login_enabled,
            phone_registration_verification_required: settings
                .verification_policy
                .phone_registration_verification_required,
        },
        oauth_login_enabled: settings.oauth_login_enabled,
        oauth_providers: settings.oauth_providers,
        oauth_region: settings.oauth_region,
        qr_login_enabled: settings.qr_login_enabled,
        qr_login_type: settings.qr_login_type,
        invite_code_policy: AppAuthInviteCodePolicyResponse {
            register_required: settings.invite_code_policy.register_required,
            login_required: settings.invite_code_policy.login_required,
        },
    }
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
