use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::api::request_id::{generate_server_request_id, RequestIdError};
use crate::api::response::{
    json_created_response, json_success_list_response, no_content_response, offset_page_info,
    parse_offset_list_query, problem_from_wire_code, success_envelope, ParsedOffsetListQuery,
};
use crate::application::EntityUuidGenerator;
use crate::domain::DomainError;
use crate::ports::{
    AdminReferralListPage, AdminReferralStore, AdminReferralStrategyItem, AdminReferralSubject,
    CreateAdminReferralStrategyCommand, DeleteAdminReferralStrategyCommand,
    ListAdminReferralRelationsQuery, ListAdminReferralStrategiesQuery,
    RetrieveAdminReferralStrategyQuery, UpdateAdminReferralStrategyCommand,
};

const MAX_STRATEGY_NAME_LEN: usize = 128;
const MAX_STRATEGY_DESCRIPTION_LEN: usize = 512;
const MAX_REWARD_VALUE_LEN: usize = 64;
const MAX_STRATEGY_ID_LEN: usize = 64;
const STATUS_ACTIVE: &str = "active";
const STATUS_DISABLED: &str = "disabled";
const REWARD_TYPE_POINTS: &str = "POINTS";
const REWARD_TYPE_CASH: &str = "CASH";
const REWARD_TYPE_COUPON: &str = "COUPON";
const REWARD_TARGET_INVITER: &str = "INVITER";
const REWARD_TARGET_INVITEE: &str = "INVITEE";
const TRIGGER_EVENT_REGISTER: &str = "REGISTER";
const MAX_REWARDS_PER_INVITER_UNLIMITED: i64 = 0;

#[derive(Clone)]
struct AdminReferralState {
    store: Arc<dyn AdminReferralStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminReferralListQueryRequest {
    page: Option<i64>,
    page_size: Option<i64>,
    status: Option<String>,
    q: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReferralStrategyMutationRequest {
    name: Option<String>,
    description: Option<String>,
    status: Option<String>,
    reward_type: Option<String>,
    reward_value: Option<Value>,
    reward_target: Option<String>,
    trigger_event: Option<String>,
    max_rewards_per_inviter: Option<Value>,
    starts_at: Option<String>,
    ends_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedReferralStrategyMutation {
    name: String,
    description: String,
    status: String,
    reward_type: String,
    reward_value: String,
    reward_target: String,
    trigger_event: String,
    max_rewards_per_inviter: i64,
    starts_at: Option<String>,
    ends_at: Option<String>,
}

#[derive(Debug)]
enum AdminReferralCommandBuildError {
    BadRequest(String),
    System(DomainError),
}

pub fn admin_referral_router_with_store(
    store: Arc<dyn AdminReferralStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/billing/referrals/relations",
            get(fetch_referral_relations),
        )
        .route(
            "/backend/v3/api/billing/referral_strategies",
            get(fetch_referral_strategies).post(create_referral_strategy),
        )
        .route(
            "/backend/v3/api/billing/referral_strategies/{strategy_id}",
            get(fetch_referral_strategy)
                .patch(update_referral_strategy)
                .delete(delete_referral_strategy),
        )
        .with_state(AdminReferralState {
            store,
            entity_uuid_generator,
        })
}

async fn fetch_referral_relations(
    State(state): State<AdminReferralState>,
    Query(params): Query<AdminReferralListQueryRequest>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
) -> Response {
    let subject = scoped.into();
    let parsed = match parse_referral_list_query(params.page, params.page_size) {
        Ok(parsed) => parsed,
        Err(error) => return error.into_response(),
    };
    let search = normalize_search_query(params.q.as_deref());
    match state
        .store
        .list_referral_relations(ListAdminReferralRelationsQuery {
            subject,
            search,
            page_no: parsed.page_no,
            page_size: parsed.page_size,
            offset: parsed.offset,
        })
        .await
    {
        Ok(page) => referral_list_response(page),
        Err(error) => {
            referral_system_response("referral relation read model is unavailable", error)
        }
    }
}

async fn fetch_referral_strategies(
    State(state): State<AdminReferralState>,
    Query(params): Query<AdminReferralListQueryRequest>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
) -> Response {
    let subject = scoped.into();
    let parsed = match parse_referral_list_query(params.page, params.page_size) {
        Ok(parsed) => parsed,
        Err(error) => return error.into_response(),
    };
    let status = match normalize_optional_strategy_status(params.status.as_deref()) {
        Ok(status) => status,
        Err(error) => return command_build_error_response(error),
    };
    let search = normalize_search_query(params.q.as_deref());
    match state
        .store
        .list_referral_strategies(ListAdminReferralStrategiesQuery {
            subject,
            status,
            search,
            page_no: parsed.page_no,
            page_size: parsed.page_size,
            offset: parsed.offset,
        })
        .await
    {
        Ok(page) => referral_list_response(page),
        Err(error) => {
            referral_system_response("referral strategy read model is unavailable", error)
        }
    }
}

async fn fetch_referral_strategy(
    State(state): State<AdminReferralState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    Path(strategy_id): Path<String>,
) -> Response {
    let subject = scoped.into();
    let strategy_id = match normalize_path_id(&strategy_id, "strategy id") {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    match state
        .store
        .retrieve_referral_strategy(RetrieveAdminReferralStrategyQuery {
            subject,
            strategy_id,
        })
        .await
    {
        Ok(Some(item)) => Json(success_envelope(item)).into_response(),
        Ok(None) => not_found_response("referral strategy was not found"),
        Err(error) => {
            referral_system_response("referral strategy read model is unavailable", error)
        }
    }
}

async fn create_referral_strategy(
    State(state): State<AdminReferralState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_body::<ReferralStrategyMutationRequest>(&body, "referral strategy")
    {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let mutation = match normalize_strategy_mutation(request) {
        Ok(mutation) => mutation,
        Err(error) => return command_build_error_response(error),
    };
    let command = match build_create_command(state.clone(), subject, mutation) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };
    match state.store.create_referral_strategy(command).await {
        Ok(item) => json_created_response(None, item),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => referral_system_response("referral strategy command store is unavailable", error),
    }
}

async fn update_referral_strategy(
    State(state): State<AdminReferralState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    Path(strategy_id): Path<String>,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let strategy_id = match normalize_path_id(&strategy_id, "strategy id") {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let request = match parse_json_body::<ReferralStrategyMutationRequest>(&body, "referral strategy")
    {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let current = match state
        .store
        .retrieve_referral_strategy(RetrieveAdminReferralStrategyQuery {
            subject,
            strategy_id: strategy_id.clone(),
        })
        .await
    {
        Ok(Some(item)) => item,
        Ok(None) => return not_found_response("referral strategy was not found"),
        Err(error) => {
            return referral_system_response(
                "referral strategy read model is unavailable",
                error,
            );
        }
    };
    let mutation = match merge_strategy_mutation(current, request) {
        Ok(mutation) => mutation,
        Err(error) => return command_build_error_response(error),
    };
    let command = match build_update_command(state.clone(), subject, strategy_id, mutation) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };
    match state.store.update_referral_strategy(command).await {
        Ok(item) => Json(success_envelope(item)).into_response(),
        Err(error) if error.is_not_found() => not_found_response("referral strategy was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => referral_system_response("referral strategy command store is unavailable", error),
    }
}

async fn delete_referral_strategy(
    State(state): State<AdminReferralState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    Path(strategy_id): Path<String>,
) -> Response {
    let subject = scoped.into();
    let strategy_id = match normalize_path_id(&strategy_id, "strategy id") {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let command = match build_delete_command(state.clone(), subject, strategy_id) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };
    match state.store.delete_referral_strategy(command).await {
        Ok(true) => no_content_response(None),
        Ok(false) => not_found_response("referral strategy was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => referral_system_response("referral strategy command store is unavailable", error),
    }
}

fn parse_referral_list_query(
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<ParsedOffsetListQuery, crate::api::response::ApiResponseError> {
    parse_offset_list_query(page, page_size)
        .map_err(|message| bad_request(message).into())
}

fn normalize_search_query(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| value.chars().take(128).collect())
}

fn referral_list_response<T: Serialize>(page: AdminReferralListPage<T>) -> Response {
    json_success_list_response(
        None,
        page.items,
        offset_page_info(page.page_no, page.page_size, page.total),
    )
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

fn build_create_command(
    state: AdminReferralState,
    subject: AdminReferralSubject,
    mutation: NormalizedReferralStrategyMutation,
) -> Result<CreateAdminReferralStrategyCommand, AdminReferralCommandBuildError> {
    Ok(CreateAdminReferralStrategyCommand {
        subject,
        strategy_uuid: generate_entity_uuid(&state)?,
        audit_log_uuid: generate_entity_uuid(&state)?,
        name: mutation.name,
        description: mutation.description,
        status: mutation.status,
        reward_type: mutation.reward_type,
        reward_value: mutation.reward_value,
        reward_target: mutation.reward_target,
        trigger_event: mutation.trigger_event,
        max_rewards_per_inviter: mutation.max_rewards_per_inviter,
        starts_at: mutation.starts_at,
        ends_at: mutation.ends_at,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_update_command(
    state: AdminReferralState,
    subject: AdminReferralSubject,
    strategy_id: String,
    mutation: NormalizedReferralStrategyMutation,
) -> Result<UpdateAdminReferralStrategyCommand, AdminReferralCommandBuildError> {
    Ok(UpdateAdminReferralStrategyCommand {
        subject,
        strategy_id,
        audit_log_uuid: generate_entity_uuid(&state)?,
        name: mutation.name,
        description: mutation.description,
        status: mutation.status,
        reward_type: mutation.reward_type,
        reward_value: mutation.reward_value,
        reward_target: mutation.reward_target,
        trigger_event: mutation.trigger_event,
        max_rewards_per_inviter: mutation.max_rewards_per_inviter,
        starts_at: mutation.starts_at,
        ends_at: mutation.ends_at,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_delete_command(
    state: AdminReferralState,
    subject: AdminReferralSubject,
    strategy_id: String,
) -> Result<DeleteAdminReferralStrategyCommand, AdminReferralCommandBuildError> {
    Ok(DeleteAdminReferralStrategyCommand {
        subject,
        strategy_id,
        audit_log_uuid: generate_entity_uuid(&state)?,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn normalize_strategy_mutation(
    request: ReferralStrategyMutationRequest,
) -> Result<NormalizedReferralStrategyMutation, AdminReferralCommandBuildError> {
    let name = normalize_required_text(&request.name, "referral strategy name", MAX_STRATEGY_NAME_LEN)?;
    let description = normalize_optional_text(
        request.description.as_deref(),
        "referral strategy description",
        MAX_STRATEGY_DESCRIPTION_LEN,
    )?;
    let status = normalize_strategy_status(request.status.as_deref())?;
    let reward_type = normalize_enum_value(
        request.reward_type.as_deref(),
        "referral strategy rewardType",
        &[REWARD_TYPE_POINTS, REWARD_TYPE_CASH, REWARD_TYPE_COUPON],
    )?;
    let reward_value = normalize_reward_value(request.reward_value.as_ref(), &reward_type)?;
    let reward_target = normalize_enum_value(
        request.reward_target.as_deref(),
        "referral strategy rewardTarget",
        &[REWARD_TARGET_INVITER, REWARD_TARGET_INVITEE],
    )?;
    let trigger_event = normalize_enum_value(
        request.trigger_event.as_deref(),
        "referral strategy triggerEvent",
        &[TRIGGER_EVENT_REGISTER],
    )?;
    let max_rewards_per_inviter = normalize_max_rewards_per_inviter(
        request.max_rewards_per_inviter.as_ref(),
    )?;
    let starts_at = normalize_optional_timestamp(request.starts_at.as_deref(), "referral strategy startsAt")?;
    let ends_at = normalize_optional_timestamp(request.ends_at.as_deref(), "referral strategy endsAt")?;
    validate_strategy_window(starts_at.as_deref(), ends_at.as_deref())?;
    Ok(NormalizedReferralStrategyMutation {
        name,
        description,
        status,
        reward_type,
        reward_value,
        reward_target,
        trigger_event,
        max_rewards_per_inviter,
        starts_at,
        ends_at,
    })
}

/// Merge a partial PATCH payload onto the current strategy record; omitted
/// fields keep their current values.
fn merge_strategy_mutation(
    current: AdminReferralStrategyItem,
    request: ReferralStrategyMutationRequest,
) -> Result<NormalizedReferralStrategyMutation, AdminReferralCommandBuildError> {
    let name = match request.name {
        Some(value) => normalize_required_text(&Some(value), "referral strategy name", MAX_STRATEGY_NAME_LEN)?,
        None => current.name,
    };
    let description = normalize_optional_text(
        request.description.as_deref(),
        "referral strategy description",
        MAX_STRATEGY_DESCRIPTION_LEN,
    )?;
    let description = if description.is_empty() && request.description.is_none() {
        current.description
    } else {
        description
    };
    let status = match request.status {
        Some(value) => normalize_strategy_status(Some(&value))?,
        None => current.status,
    };
    let reward_type = match request.reward_type {
        Some(value) => normalize_enum_value(
            Some(&value),
            "referral strategy rewardType",
            &[REWARD_TYPE_POINTS, REWARD_TYPE_CASH, REWARD_TYPE_COUPON],
        )?,
        None => current.reward_type,
    };
    let reward_value = match request.reward_value {
        Some(value) => normalize_reward_value(Some(&value), &reward_type)?,
        None => current.reward_value,
    };
    let reward_target = match request.reward_target {
        Some(value) => normalize_enum_value(
            Some(&value),
            "referral strategy rewardTarget",
            &[REWARD_TARGET_INVITER, REWARD_TARGET_INVITEE],
        )?,
        None => current.reward_target,
    };
    let trigger_event = match request.trigger_event {
        Some(value) => normalize_enum_value(
            Some(&value),
            "referral strategy triggerEvent",
            &[TRIGGER_EVENT_REGISTER],
        )?,
        None => current.trigger_event,
    };
    let max_rewards_per_inviter = match request.max_rewards_per_inviter {
        Some(value) => normalize_max_rewards_per_inviter(Some(&value))?,
        None => current.max_rewards_per_inviter,
    };
    let starts_at = match request.starts_at {
        Some(value) => normalize_optional_timestamp(Some(&value), "referral strategy startsAt")?,
        None => optional_empty_to_none(&current.starts_at),
    };
    let ends_at = match request.ends_at {
        Some(value) => normalize_optional_timestamp(Some(&value), "referral strategy endsAt")?,
        None => optional_empty_to_none(&current.ends_at),
    };
    validate_strategy_window(starts_at.as_deref(), ends_at.as_deref())?;
    Ok(NormalizedReferralStrategyMutation {
        name,
        description,
        status,
        reward_type,
        reward_value,
        reward_target,
        trigger_event,
        max_rewards_per_inviter,
        starts_at,
        ends_at,
    })
}

fn validate_strategy_window(
    starts_at: Option<&str>,
    ends_at: Option<&str>,
) -> Result<(), AdminReferralCommandBuildError> {
    if let (Some(starts_at), Some(ends_at)) = (starts_at, ends_at) {
        match (parse_wall_clock_seconds(starts_at), parse_wall_clock_seconds(ends_at)) {
            (Some(starts), Some(ends)) if starts >= ends => {
                return Err(AdminReferralCommandBuildError::BadRequest(
                    "referral strategy endsAt must be after startsAt".to_owned(),
                ));
            }
            // Values are already validated by normalize_optional_timestamp;
            // the None arm is unreachable defensive handling.
            (None, _) | (_, None) => {
                return Err(AdminReferralCommandBuildError::BadRequest(
                    "referral strategy startsAt and endsAt must use a valid timestamp format"
                        .to_owned(),
                ));
            }
            (Some(_), Some(_)) => {}
        }
    }
    Ok(())
}

fn optional_empty_to_none(value: &str) -> Option<String> {
    let value = value.trim();
    if value.is_empty() {
        None
    } else {
        Some(value.to_owned())
    }
}

fn normalize_required_text(
    value: &Option<String>,
    field_name: &str,
    max_len: usize,
) -> Result<String, AdminReferralCommandBuildError> {
    let Some(value) = value.as_deref() else {
        return Err(AdminReferralCommandBuildError::BadRequest(format!(
            "{field_name} is required"
        )));
    };
    let value = value.trim();
    if value.is_empty() {
        return Err(AdminReferralCommandBuildError::BadRequest(format!(
            "{field_name} is required"
        )));
    }
    if value.chars().count() > max_len {
        return Err(AdminReferralCommandBuildError::BadRequest(format!(
            "{field_name} must be at most {max_len} characters"
        )));
    }
    Ok(value.to_owned())
}

fn normalize_optional_text(
    value: Option<&str>,
    field_name: &str,
    max_len: usize,
) -> Result<String, AdminReferralCommandBuildError> {
    let value = value.unwrap_or("").trim();
    if value.chars().count() > max_len {
        return Err(AdminReferralCommandBuildError::BadRequest(format!(
            "{field_name} must be at most {max_len} characters"
        )));
    }
    Ok(value.to_owned())
}

fn normalize_enum_value(
    value: Option<&str>,
    field_name: &str,
    allowed: &[&str],
) -> Result<String, AdminReferralCommandBuildError> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Err(AdminReferralCommandBuildError::BadRequest(format!(
            "{field_name} is required"
        )));
    };
    let normalized = value.to_ascii_uppercase();
    if allowed.contains(&normalized.as_str()) {
        Ok(normalized)
    } else {
        Err(AdminReferralCommandBuildError::BadRequest(format!(
            "{field_name} must be one of {}",
            allowed.join(", ")
        )))
    }
}

fn normalize_strategy_status(
    value: Option<&str>,
) -> Result<String, AdminReferralCommandBuildError> {
    match normalize_optional_strategy_status(value)? {
        Some(status) => Ok(status),
        None => Ok(STATUS_DISABLED.to_owned()),
    }
}

fn normalize_optional_strategy_status(
    value: Option<&str>,
) -> Result<Option<String>, AdminReferralCommandBuildError> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    match value.to_ascii_lowercase().as_str() {
        "active" | "enabled" | "normal" => Ok(Some(STATUS_ACTIVE.to_owned())),
        "disabled" | "inactive" => Ok(Some(STATUS_DISABLED.to_owned())),
        _ => Err(AdminReferralCommandBuildError::BadRequest(
            "referral strategy status must be active or disabled".to_owned(),
        )),
    }
}

fn normalize_reward_value(
    value: Option<&Value>,
    reward_type: &str,
) -> Result<String, AdminReferralCommandBuildError> {
    let raw = match value {
        Some(Value::String(value)) => value.trim().to_owned(),
        Some(Value::Number(value)) => value.to_string(),
        Some(_) => {
            return Err(AdminReferralCommandBuildError::BadRequest(
                "referral strategy rewardValue must be a number or string".to_owned(),
            ));
        }
        None => {
            return Err(AdminReferralCommandBuildError::BadRequest(
                "referral strategy rewardValue is required".to_owned(),
            ));
        }
    };
    if raw.is_empty() || raw.chars().count() > MAX_REWARD_VALUE_LEN {
        return Err(AdminReferralCommandBuildError::BadRequest(format!(
            "referral strategy rewardValue must be at most {MAX_REWARD_VALUE_LEN} characters"
        )));
    }
    let valid = match reward_type {
        REWARD_TYPE_POINTS => {
            !raw.is_empty() && raw.bytes().all(|byte| byte.is_ascii_digit())
        }
        REWARD_TYPE_CASH => is_cash_amount(&raw),
        REWARD_TYPE_COUPON => raw
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_'),
        _ => false,
    };
    if !valid {
        return Err(AdminReferralCommandBuildError::BadRequest(format!(
            "referral strategy rewardValue does not match rewardType {reward_type}"
        )));
    }
    Ok(raw)
}

/// Non-negative decimal amount with at most two fraction digits (e.g. "5" or
/// "5.00"); the value is kept as text for the VARCHAR column.
fn is_cash_amount(value: &str) -> bool {
    let Some((integer, fraction)) = value.split_once('.') else {
        return !value.is_empty() && value.bytes().all(|byte| byte.is_ascii_digit());
    };
    if fraction.contains('.') {
        return false;
    }
    !integer.is_empty()
        && integer.bytes().all(|byte| byte.is_ascii_digit())
        && !fraction.is_empty()
        && fraction.len() <= 2
        && fraction.bytes().all(|byte| byte.is_ascii_digit())
}

fn normalize_max_rewards_per_inviter(
    value: Option<&Value>,
) -> Result<i64, AdminReferralCommandBuildError> {
    let raw = match value {
        Some(Value::Number(value)) => value.as_i64(),
        Some(Value::String(value)) => value.trim().parse::<i64>().ok(),
        Some(_) => None,
        None => Some(MAX_REWARDS_PER_INVITER_UNLIMITED),
    }
    .ok_or_else(|| {
        AdminReferralCommandBuildError::BadRequest(
            "referral strategy maxRewardsPerInviter must be a non-negative integer".to_owned(),
        )
    })?;
    if raw < 0 {
        return Err(AdminReferralCommandBuildError::BadRequest(
            "referral strategy maxRewardsPerInviter must be a non-negative integer".to_owned(),
        ));
    }
    Ok(raw)
}

fn normalize_optional_timestamp(
    value: Option<&str>,
    field_name: &str,
) -> Result<Option<String>, AdminReferralCommandBuildError> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    if value.len() > 64 {
        return Err(AdminReferralCommandBuildError::BadRequest(format!(
            "{field_name} must be at most 64 characters"
        )));
    }
    if !is_valid_timestamp(value) {
        return Err(AdminReferralCommandBuildError::BadRequest(format!(
            "{field_name} must be a timestamp in YYYY-MM-DD HH:MM:SS or ISO-8601 format"
        )));
    }
    Ok(Some(value.to_owned()))
}

/// Accepts `YYYY-MM-DD HH:MM:SS` with a space or `T` separator, plus an
/// optional fractional-seconds / timezone suffix (ISO-8601 style). The
/// wall-clock fields are validated (including calendar day validity) so the
/// stored string parses cleanly in the TIMESTAMPTZ column instead of
/// surfacing as a database error, and window comparisons stay consistent.
fn is_valid_timestamp(value: &str) -> bool {
    let Some(body) = value.get(..19) else {
        return false;
    };
    let bytes = body.as_bytes();
    if bytes[4] != b'-' || bytes[7] != b'-' || bytes[13] != b':' || bytes[16] != b':' {
        return false;
    }
    if bytes[10] != b' ' && bytes[10] != b'T' {
        return false;
    }
    if !bytes.iter().enumerate().all(|(index, byte)| {
        matches!(index, 4 | 7 | 10 | 13 | 16) || byte.is_ascii_digit()
    }) {
        return false;
    }
    let parse = |index: usize, len: usize| {
        bytes
            .get(index..index + len)
            .and_then(|part| std::str::from_utf8(part).ok())
            .and_then(|part| part.parse::<i64>().ok())
    };
    let (Some(year), Some(month), Some(day)) = (parse(0, 4), parse(5, 2), parse(8, 2)) else {
        return false;
    };
    let (Some(hour), Some(minute), Some(second)) = (parse(11, 2), parse(14, 2), parse(17, 2)) else {
        return false;
    };
    if !(1..=12).contains(&month)
        || !(1..=31).contains(&day)
        || hour > 23
        || minute > 59
        || second > 59
    {
        return false;
    }
    // Reject impossible calendar days (e.g. February 30) via a civil round trip.
    let Some(days) = days_from_civil(year, month, day) else {
        return false;
    };
    if civil_from_days(days) != (year, month, day) {
        return false;
    }
    is_valid_timestamp_suffix(&value[19..])
}

fn is_valid_timestamp_suffix(suffix: &str) -> bool {
    let suffix = match suffix.strip_prefix('.') {
        Some(fraction) => {
            let digits = fraction
                .chars()
                .take_while(|ch| ch.is_ascii_digit())
                .count();
            if digits == 0 || digits > 9 {
                return false;
            }
            &fraction[digits..]
        }
        None => suffix,
    };
    if suffix.is_empty() || suffix == "Z" || suffix == "z" {
        return true;
    }
    let offset = match suffix.as_bytes().first() {
        Some(b'+') | Some(b'-') => &suffix[1..],
        _ => return false,
    };
    let (hours, minutes) = match offset.len() {
        5 if offset.as_bytes().get(2) == Some(&b':') => (
            offset[..2].parse::<i64>().ok(),
            offset[3..5].parse::<i64>().ok(),
        ),
        4 => (
            offset[..2].parse::<i64>().ok(),
            offset[2..4].parse::<i64>().ok(),
        ),
        _ => return false,
    };
    matches!((hours, minutes), (Some(0..=23), Some(0..=59)))
}

/// Wall-clock seconds since the Unix epoch for a timestamp already accepted by
/// `is_valid_timestamp`; timezone suffixes are ignored so window comparisons
/// use the literal calendar fields the admin configured.
fn parse_wall_clock_seconds(value: &str) -> Option<i64> {
    if !is_valid_timestamp(value) {
        return None;
    }
    let bytes = value.as_bytes();
    let parse = |index: usize, len: usize| {
        std::str::from_utf8(&bytes[index..index + len])
            .ok()
            .and_then(|part| part.parse::<i64>().ok())
    };
    let year = parse(0, 4)?;
    let month = parse(5, 2)?;
    let day = parse(8, 2)?;
    let hour = parse(11, 2)?;
    let minute = parse(14, 2)?;
    let second = parse(17, 2)?;
    let days = days_from_civil(year, month, day)?;
    Some(days * 86_400 + hour * 3_600 + minute * 60 + second)
}

/// Inverse of `civil_from_days` (Howard Hinnant's days-from-civil algorithm);
/// returns `None` for out-of-range month/day fields.
fn days_from_civil(year: i64, month: i64, day: i64) -> Option<i64> {
    if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return None;
    }
    let year = if month <= 2 { year - 1 } else { year };
    let era = if year >= 0 { year } else { year - 399 } / 400;
    let year_of_era = year - era * 400;
    let month_prime = if month > 2 { month - 3 } else { month + 9 };
    let day_of_year = (153 * month_prime + 2) / 5 + day - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    Some(era * 146_097 + day_of_era - 719_468)
}

fn normalize_path_id(value: &str, field_name: &str) -> Result<String, String> {
    let value = value.trim();
    if value.is_empty() {
        return Err(format!("{field_name} is required"));
    }
    if value.chars().count() > MAX_STRATEGY_ID_LEN {
        return Err(format!("{field_name} must be at most {MAX_STRATEGY_ID_LEN} characters"));
    }
    Ok(value.to_owned())
}

fn generate_entity_uuid(
    state: &AdminReferralState,
) -> Result<String, AdminReferralCommandBuildError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(AdminReferralCommandBuildError::System)
}

fn request_id_error(error: RequestIdError) -> AdminReferralCommandBuildError {
    match error {
        RequestIdError::Invalid(message) => AdminReferralCommandBuildError::BadRequest(message),
        RequestIdError::System(message) => {
            AdminReferralCommandBuildError::System(DomainError::new(message))
        }
    }
}

fn bad_request(message: impl Into<String>) -> Response {
    problem_from_wire_code("4001", message.into()).into_response()
}

fn not_found_response(message: &'static str) -> Response {
    problem_from_wire_code("4040", message).into_response()
}

fn conflict_response(error: DomainError) -> Response {
    problem_from_wire_code("4090", error.to_string()).into_response()
}

fn command_build_error_response(error: AdminReferralCommandBuildError) -> Response {
    match error {
        AdminReferralCommandBuildError::BadRequest(message) => bad_request(message),
        AdminReferralCommandBuildError::System(error) => {
            referral_system_response("referral command is invalid", error)
        }
    }
}

fn referral_system_response(context: &str, error: DomainError) -> Response {
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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn seeded_strategy() -> AdminReferralStrategyItem {
        AdminReferralStrategyItem {
            id: "strategy-1".to_owned(),
            name: "Launch Referral".to_owned(),
            description: "Q3 campaign".to_owned(),
            status: STATUS_ACTIVE.to_owned(),
            reward_type: REWARD_TYPE_CASH.to_owned(),
            reward_value: "5.00".to_owned(),
            reward_target: REWARD_TARGET_INVITEE.to_owned(),
            trigger_event: TRIGGER_EVENT_REGISTER.to_owned(),
            max_rewards_per_inviter: 3,
            starts_at: "2026-08-01 00:00:00".to_owned(),
            ends_at: "2026-08-31 23:59:59".to_owned(),
            updated_at: "2026-08-06 00:00:00".to_owned(),
        }
    }

    #[test]
    fn merge_strategy_mutation_keeps_current_values_for_omitted_fields() {
        let request: ReferralStrategyMutationRequest =
            serde_json::from_value(json!({ "name": "Renamed Referral" })).unwrap();

        let mutation = merge_strategy_mutation(seeded_strategy(), request).unwrap();

        assert_eq!("Renamed Referral", mutation.name);
        assert_eq!("Q3 campaign", mutation.description);
        assert_eq!(STATUS_ACTIVE, mutation.status);
        assert_eq!(REWARD_TYPE_CASH, mutation.reward_type);
        assert_eq!("5.00", mutation.reward_value);
        assert_eq!(REWARD_TARGET_INVITEE, mutation.reward_target);
        assert_eq!(3, mutation.max_rewards_per_inviter);
        assert_eq!("2026-08-01 00:00:00", mutation.starts_at.unwrap());
        assert_eq!("2026-08-31 23:59:59", mutation.ends_at.unwrap());
    }

    #[test]
    fn merge_strategy_mutation_clears_optional_fields_with_empty_strings() {
        let request: ReferralStrategyMutationRequest =
            serde_json::from_value(json!({
                "description": "",
                "startsAt": "",
                "endsAt": ""
            }))
            .unwrap();

        let mutation = merge_strategy_mutation(seeded_strategy(), request).unwrap();

        assert_eq!("", mutation.description);
        assert_eq!(None, mutation.starts_at);
        assert_eq!(None, mutation.ends_at);
    }

    #[test]
    fn merge_strategy_mutation_rejects_reward_value_mismatching_merged_reward_type() {
        let request: ReferralStrategyMutationRequest =
            serde_json::from_value(json!({
                "rewardType": "POINTS",
                "rewardValue": "5.00"
            }))
            .unwrap();

        let error = merge_strategy_mutation(seeded_strategy(), request).unwrap_err();
        match error {
            AdminReferralCommandBuildError::BadRequest(message) => {
                assert!(message.contains("rewardValue"), "{message}");
            }
            _ => panic!("expected bad request"),
        }
    }

    #[test]
    fn merge_strategy_mutation_rejects_window_invalid_after_merge() {
        let mut current = seeded_strategy();
        current.ends_at = String::new();
        let request: ReferralStrategyMutationRequest = serde_json::from_value(json!({
            "endsAt": "2026-08-01 00:00:00"
        }))
        .unwrap();

        let error = merge_strategy_mutation(current, request).unwrap_err();
        match error {
            AdminReferralCommandBuildError::BadRequest(message) => {
                assert!(message.contains("endsAt"), "{message}");
            }
            _ => panic!("expected bad request"),
        }
    }

    #[test]
    fn normalize_strategy_mutation_accepts_compact_referral_strategy() {
        let request: ReferralStrategyMutationRequest = serde_json::from_value(json!({
            "name": "Invite Bonus",
            "description": "Reward inviters",
            "status": "active",
            "rewardType": "POINTS",
            "rewardValue": 200,
            "rewardTarget": "INVITER",
            "triggerEvent": "REGISTER",
            "maxRewardsPerInviter": 10,
            "startsAt": "2026-08-01 00:00:00",
            "endsAt": "2026-08-31 23:59:59"
        }))
        .unwrap();

        let mutation = normalize_strategy_mutation(request).unwrap();

        assert_eq!("Invite Bonus", mutation.name);
        assert_eq!("active", mutation.status);
        assert_eq!("POINTS", mutation.reward_type);
        assert_eq!("200", mutation.reward_value);
        assert_eq!(10, mutation.max_rewards_per_inviter);
        assert!(mutation.starts_at.is_some());
        assert!(mutation.ends_at.is_some());
    }

    #[test]
    fn normalize_strategy_mutation_defaults_status_to_disabled() {
        let request: ReferralStrategyMutationRequest = serde_json::from_value(json!({
            "name": "Launch Referral",
            "rewardType": "CASH",
            "rewardValue": "5.00",
            "rewardTarget": "INVITEE",
            "triggerEvent": "REGISTER"
        }))
        .unwrap();

        let mutation = normalize_strategy_mutation(request).unwrap();

        assert_eq!("disabled", mutation.status);
        assert_eq!("CASH", mutation.reward_type);
        assert_eq!("5.00", mutation.reward_value);
        assert_eq!("INVITEE", mutation.reward_target);
        assert_eq!(0, mutation.max_rewards_per_inviter);
    }

    #[test]
    fn normalize_strategy_mutation_rejects_unknown_reward_type() {
        let request: ReferralStrategyMutationRequest = serde_json::from_value(json!({
            "name": "Bad Strategy",
            "rewardType": "TOKEN",
            "rewardValue": "1",
            "rewardTarget": "INVITER"
        }))
        .unwrap();

        let error = normalize_strategy_mutation(request).unwrap_err();
        match error {
            AdminReferralCommandBuildError::BadRequest(message) => {
                assert!(message.contains("rewardType"));
            }
            _ => panic!("expected bad request"),
        }
    }

    #[test]
    fn normalize_strategy_mutation_rejects_ends_before_starts() {
        let request: ReferralStrategyMutationRequest = serde_json::from_value(json!({
            "name": "Window Strategy",
            "rewardType": "POINTS",
            "rewardValue": "100",
            "rewardTarget": "INVITER",
            "triggerEvent": "REGISTER",
            "startsAt": "2026-08-10 00:00:00",
            "endsAt": "2026-08-01 00:00:00"
        }))
        .unwrap();

        let error = normalize_strategy_mutation(request).unwrap_err();
        match error {
            AdminReferralCommandBuildError::BadRequest(message) => {
                assert!(message.contains("endsAt"));
            }
            _ => panic!("expected bad request"),
        }
    }

    #[test]
    fn normalize_strategy_mutation_rejects_ends_before_starts_across_formats() {
        // Mixed formats trip lexicographic comparison (" " < "T"): the window
        // must compare wall-clock values, not raw strings.
        let request: ReferralStrategyMutationRequest = serde_json::from_value(json!({
            "name": "Mixed Format Window",
            "rewardType": "POINTS",
            "rewardValue": "100",
            "rewardTarget": "INVITER",
            "triggerEvent": "REGISTER",
            "startsAt": "2026-08-01 23:59:59",
            "endsAt": "2026-08-01T23:00:00.000Z"
        }))
        .unwrap();

        let error = normalize_strategy_mutation(request).unwrap_err();
        match error {
            AdminReferralCommandBuildError::BadRequest(message) => {
                assert!(message.contains("endsAt"));
            }
            _ => panic!("expected bad request"),
        }
    }

    #[test]
    fn normalize_strategy_mutation_accepts_iso_timestamps() {
        let request: ReferralStrategyMutationRequest = serde_json::from_value(json!({
            "name": "ISO Window",
            "rewardType": "CASH",
            "rewardValue": "5.00",
            "rewardTarget": "INVITER",
            "triggerEvent": "REGISTER",
            "startsAt": "2026-08-01T00:00:00.000Z",
            "endsAt": "2026-08-31T23:59:59+08:00"
        }))
        .unwrap();

        let mutation = normalize_strategy_mutation(request).unwrap();

        assert_eq!("2026-08-01T00:00:00.000Z", mutation.starts_at.unwrap());
    }

    #[test]
    fn normalize_optional_timestamp_rejects_invalid_formats() {
        for value in [
            "banana",
            "2026-02-30 00:00:00",
            "2026-13-01 00:00:00",
            "2026-08-01 24:00:00",
            "2026-8-1 0:0:0",
            "2026-08-01 00:00:00+8:00",
            "2026-08-01T00:00:00+08",
        ] {
            let error = normalize_optional_timestamp(Some(value), "referral strategy startsAt")
                .unwrap_err();
            match error {
                AdminReferralCommandBuildError::BadRequest(message) => {
                    assert!(message.contains("startsAt"), "{value}: {message}");
                }
                _ => panic!("expected bad request for {value}"),
            }
        }
    }

    #[test]
    fn normalize_reward_value_validates_against_reward_type() {
        let number = |raw: &str| Some(serde_json::Value::String(raw.to_owned()));

        assert_eq!(
            "200",
            normalize_reward_value(number("200").as_ref(), REWARD_TYPE_POINTS).unwrap()
        );
        assert!(normalize_reward_value(number("200.5").as_ref(), REWARD_TYPE_POINTS).is_err());
        assert!(normalize_reward_value(number("-5").as_ref(), REWARD_TYPE_POINTS).is_err());

        assert_eq!(
            "5.00",
            normalize_reward_value(number("5.00").as_ref(), REWARD_TYPE_CASH).unwrap()
        );
        assert_eq!(
            "5",
            normalize_reward_value(number("5").as_ref(), REWARD_TYPE_CASH).unwrap()
        );
        assert!(normalize_reward_value(number("5.123").as_ref(), REWARD_TYPE_CASH).is_err());
        assert!(normalize_reward_value(number("abc").as_ref(), REWARD_TYPE_CASH).is_err());
        assert!(normalize_reward_value(number("-1").as_ref(), REWARD_TYPE_CASH).is_err());

        assert_eq!(
            "COUPON-2026",
            normalize_reward_value(number("COUPON-2026").as_ref(), REWARD_TYPE_COUPON).unwrap()
        );
        assert!(normalize_reward_value(number("券码").as_ref(), REWARD_TYPE_COUPON).is_err());
        assert!(normalize_reward_value(number("a b").as_ref(), REWARD_TYPE_COUPON).is_err());
    }
}
