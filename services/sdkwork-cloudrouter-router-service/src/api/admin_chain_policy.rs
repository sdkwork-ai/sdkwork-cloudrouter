//! Backend admin surface for gateway call-chain policy (global config and
//! per-API-key overrides).
//!
//! - `GET/PATCH /backend/v3/api/system/chains/policy` — platform-global chain
//!   policy (concurrency limits, IP allow/deny lists, stage switches).
//! - `GET /backend/v3/api/system/chains/policy/keys/{apiKeyId}` — the
//!   configured per-API-key chain policy for operations review.

use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Bytes;
use axum::extract::{Path, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use serde::{Deserialize, Serialize};
use sdkwork_web_chain::ChainPolicy;

use crate::api::admin_sql_subject::SqlScopedAdminSubject;
use crate::api::request_id::generate_server_request_id;
use crate::api::response::{problem_from_wire_code, success_envelope};
use crate::application::{validate_chain_policy, EntityUuidGenerator};
use crate::ports::{
    AdminChainPolicyItem, AdminChainPolicyStore, AdminChainPolicySubject,
    ADMIN_CHAIN_POLICY_SCOPE_API_KEY, ADMIN_CHAIN_POLICY_SCOPE_GLOBAL,
    UpsertChainPolicyCommand,
};

const MAX_POLICY_NAME_LEN: usize = 128;

#[derive(Clone)]
struct AdminChainPolicyState {
    store: Arc<dyn AdminChainPolicyStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
}

/// Request body for `PATCH /backend/v3/api/system/chains/policy`.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminChainPolicyUpsertRequest {
    #[serde(default)]
    policy_name: Option<String>,
    #[serde(flatten)]
    policy: ChainPolicy,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminChainPolicyItemEnvelope {
    item: AdminChainPolicyItem,
}

pub fn admin_chain_policy_router_with_store(
    store: Arc<dyn AdminChainPolicyStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/system/chains/policy",
            get(fetch_global_chain_policy).patch(update_global_chain_policy),
        )
        .route(
            "/backend/v3/api/system/chains/policy/keys/{api_key_id}",
            get(fetch_api_key_chain_policy),
        )
        .with_state(AdminChainPolicyState {
            store,
            entity_uuid_generator,
        })
}

async fn fetch_global_chain_policy(
    State(state): State<AdminChainPolicyState>,
    scoped: SqlScopedAdminSubject,
) -> Response {
    let subject: AdminChainPolicySubject = scoped.into();
    let item = state
        .store
        .get_chain_policy(ADMIN_CHAIN_POLICY_SCOPE_GLOBAL, 0)
        .await;
    json_chain_policy_response(subject, item, ADMIN_CHAIN_POLICY_SCOPE_GLOBAL, 0)
}

async fn fetch_api_key_chain_policy(
    State(state): State<AdminChainPolicyState>,
    scoped: SqlScopedAdminSubject,
    Path(api_key_id): Path<i64>,
) -> Response {
    if api_key_id <= 0 {
        return problem_from_wire_code("4001", "apiKeyId must be a positive integer")
            .into_response();
    }
    let subject: AdminChainPolicySubject = scoped.into();
    let item = state
        .store
        .get_chain_policy(ADMIN_CHAIN_POLICY_SCOPE_API_KEY, api_key_id)
        .await;
    json_chain_policy_response(subject, item, ADMIN_CHAIN_POLICY_SCOPE_API_KEY, api_key_id)
}

fn json_chain_policy_response(
    _subject: AdminChainPolicySubject,
    item: Option<AdminChainPolicyItem>,
    requested_scope_type: i32,
    requested_scope_id: i64,
) -> Response {
    match item {
        Some(item) => Json(success_envelope(AdminChainPolicyItemEnvelope { item })).into_response(),
        None => {
            // No policy configured for the requested scope: respond with the
            // built-in default so the management surface renders a valid,
            // empty policy scoped to the same entity.
            let item = AdminChainPolicyItem {
                id: 0,
                scope_type: requested_scope_type,
                scope_id: requested_scope_id,
                policy_name: String::new(),
                payload: serde_json::to_value(ChainPolicy::default()).unwrap_or_else(|_| {
                    serde_json::json!({})
                }),
                updated_at: String::new(),
            };
            Json(success_envelope(AdminChainPolicyItemEnvelope { item })).into_response()
        }
    }
}

async fn update_global_chain_policy(
    State(state): State<AdminChainPolicyState>,
    scoped: SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject: AdminChainPolicySubject = scoped.into();
    let request = match parse_upsert_request(&body) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let policy_name = match normalize_policy_name(request.policy_name.as_deref()) {
        Ok(name) => name,
        Err(message) => return bad_request(message),
    };
    if let Err(message) = validate_chain_policy(&request.policy) {
        return bad_request(message);
    }
    let command = match build_upsert_command(
        &state,
        &headers,
        subject,
        policy_name,
        ADMIN_CHAIN_POLICY_SCOPE_GLOBAL,
        0,
        request.policy,
    ) {
        Ok(command) => command,
        Err(message) => return bad_request(message),
    };
    match state.store.upsert_chain_policy(command).await {
        Ok(item) => Json(success_envelope(AdminChainPolicyItemEnvelope { item })).into_response(),
        Err(error) if error.is_conflict() => problem_from_wire_code(
            "4090",
            format!("chain policy is already configured: {}", error.message),
        )
        .into_response(),
        Err(error) => problem_from_wire_code(
            "5000",
            format!("chain policy store is unavailable: {}", error.message),
        )
        .into_response(),
    }
}

fn parse_upsert_request(body: &[u8]) -> Result<AdminChainPolicyUpsertRequest, String> {
    if body.iter().all(u8::is_ascii_whitespace) {
        return Err("chain policy request body is required".to_owned());
    }
    serde_json::from_slice(body)
        .map_err(|error| format!("invalid chain policy request body: {error}"))
}

fn normalize_policy_name(value: Option<&str>) -> Result<String, String> {
    let value = value.unwrap_or("").trim();
    if value.chars().count() > MAX_POLICY_NAME_LEN {
        return Err(format!(
            "policyName must be at most {MAX_POLICY_NAME_LEN} characters"
        ));
    }
    Ok(value.to_owned())
}

fn build_upsert_command(
    state: &AdminChainPolicyState,
    headers: &HeaderMap,
    subject: AdminChainPolicySubject,
    policy_name: String,
    scope_type: i32,
    scope_id: i64,
    policy: ChainPolicy,
) -> Result<UpsertChainPolicyCommand, String> {
    let request_id = request_id_from_headers(headers)
        .unwrap_or_else(|| generate_server_request_id().unwrap_or_else(|_| "chain-policy".to_owned()));
    let requested_at = current_timestamp_string();
    let audit_log_uuid = state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(|error| format!("failed to generate audit uuid: {error}"))?;
    let config_snapshot_uuid = state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(|error| format!("failed to generate snapshot uuid: {error}"))?;
    Ok(UpsertChainPolicyCommand {
        subject,
        audit_log_uuid,
        config_snapshot_uuid,
        policy_name,
        scope_type,
        scope_id,
        payload: serde_json::to_value(policy).map_err(|error| {
            format!("chain policy could not be serialized: {error}")
        })?,
        request_id,
        requested_at,
    })
}

fn request_id_from_headers(headers: &HeaderMap) -> Option<String> {
    headers
        .get("x-request-id")
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

/// `YYYY-MM-DD HH:MM:SS` UTC timestamp compatible with Postgres
/// `timestamptz` parsing (same shape as sibling admin handlers).
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
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    (if m <= 2 { y + 1 } else { y }, m, d)
}


fn bad_request(message: impl Into<String>) -> Response {
    problem_from_wire_code("4001", message.into()).into_response()
}

use axum::Json;
