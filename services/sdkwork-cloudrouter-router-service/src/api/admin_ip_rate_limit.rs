use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use std::sync::Arc;

use axum::body::Bytes;
use axum::extract::{Query, State};
use axum::http::HeaderMap;
use axum::response::Response;
use axum::routing::get;
use axum::Router;
use serde::{Deserialize, Serialize};

use crate::api::request_id::generate_server_request_id;
use crate::api::response::{
    bad_request, json_created_response, json_success_list_response, normalize_list_search_query,
    offset_page_info, parse_offset_list_query,
    domain_conflict_response as conflict_response,
};
use crate::api::text_normalization::parse_json_body;
use crate::api::command_error::{
    command_error_from_request_id as request_id_error, command_error_response,
    system_error_response, ApiCommandError,
};
use crate::application::EntityUuidGenerator;
use crate::infrastructure::sql::sql_hash::digest_hex;
use crate::ports::{
    AdminIpRateLimitItem, AdminIpRateLimitStore, AdminIpRateLimitSubject,
    CreateAdminIpRateLimitCommand, ListAdminIpRateLimitsQuery,
};
use sdkwork_utils_rust::datetime::current_timestamp_string;

const MAX_RULE_NAME_LEN: usize = 128;
const MIN_LIMIT_VALUE: i64 = 1;
const MAX_LIMIT_VALUE: i64 = 1_000_000;
const DEFAULT_BLOCK_DURATION_SECONDS: i64 = 600;
const MAX_BLOCK_DURATION_SECONDS: i64 = 86_400;

#[derive(Clone)]
struct AdminIpRateLimitState {
    store: Arc<dyn AdminIpRateLimitStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
struct AdminIpRateLimitListQueryRequest {
    page: Option<i64>,
    page_size: Option<i64>,
    q: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminIpRateLimitCreateRequest {
    rule_name: Option<String>,
    target_ip: Option<String>,
    rps: Option<i64>,
    rpm: Option<i64>,
    block_duration: Option<serde_json::Value>,
    status: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedCreateRequest {
    rule_name: String,
    target_ip: String,
    rps: i64,
    rpm: i64,
    block_duration_seconds: i64,
    status: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminIpRateLimitItemEnvelope {
    item: AdminIpRateLimitItemResponse,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminIpRateLimitItemResponse {
    id: String,
    rule_name: String,
    target_ip: String,
    rps: i64,
    rpm: i64,
    block_duration: String,
    status: String,
}

pub fn admin_ip_rate_limit_router_with_store(
    store: Arc<dyn AdminIpRateLimitStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/system/rate_limits/ip",
            get(fetch_ip_rate_limits).post(create_ip_rate_limit),
        )
        .with_state(AdminIpRateLimitState {
            store,
            entity_uuid_generator,
        })
}

async fn fetch_ip_rate_limits(
    State(state): State<AdminIpRateLimitState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(request): Query<AdminIpRateLimitListQueryRequest>,
) -> Response {
    let subject = scoped.into();
    let query = match build_list_query(subject, request) {
        Ok(query) => query,
        Err(message) => return bad_request(message),
    };

    match state.store.list_ip_rate_limits(query).await {
        Ok(page) => json_success_list_response(
            None,
            page.items.into_iter().map(to_item_response).collect(),
            offset_page_info(page.page_no, page.page_size, page.total),
        ),
        Err(error) => {
            system_error_response("ip rate limit read model is unavailable", error)
        }
    }
}

fn build_list_query(
    subject: AdminIpRateLimitSubject,
    request: AdminIpRateLimitListQueryRequest,
) -> Result<ListAdminIpRateLimitsQuery, String> {
    let pagination = parse_offset_list_query(request.page, request.page_size)?;
    Ok(ListAdminIpRateLimitsQuery {
        subject,
        page_no: pagination.page_no,
        page_size: pagination.page_size,
        offset: pagination.offset,
        q: normalize_list_search_query(request.q, "q")?,
    })
}

async fn create_ip_rate_limit(
    State(state): State<AdminIpRateLimitState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_body::<AdminIpRateLimitCreateRequest>(&body, "ip rate limit") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let request = match normalize_create_request(request) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match build_create_command(state.clone(), &headers, subject, request) {
        Ok(command) => command,
        Err(error) => return command_error_response(error, "ip rate limit command is invalid"),
    };

    match state.store.create_ip_rate_limit(command).await {
        Ok(item) => json_created_response(
            None,
            AdminIpRateLimitItemEnvelope {
                item: to_item_response(item),
            },
        ),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            system_error_response("ip rate limit command store is unavailable", error)
        }
    }
}

fn normalize_create_request(
    request: AdminIpRateLimitCreateRequest,
) -> Result<NormalizedCreateRequest, String> {
    Ok(NormalizedCreateRequest {
        rule_name: normalize_required_text(
            request.rule_name.as_deref(),
            "ip rate limit ruleName",
            MAX_RULE_NAME_LEN,
        )?,
        target_ip: normalize_ip_or_cidr(request.target_ip.as_deref())?,
        rps: normalize_limit_value(request.rps, "rps")?,
        rpm: normalize_limit_value(request.rpm, "rpm")?,
        block_duration_seconds: normalize_block_duration(request.block_duration.as_ref())?,
        status: normalize_status(request.status.as_deref())?,
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

fn normalize_limit_value(value: Option<i64>, field_name: &str) -> Result<i64, String> {
    let value = value.ok_or_else(|| format!("{field_name} is required"))?;
    if !(MIN_LIMIT_VALUE..=MAX_LIMIT_VALUE).contains(&value) {
        return Err(format!(
            "{field_name} must be between {MIN_LIMIT_VALUE} and {MAX_LIMIT_VALUE}"
        ));
    }
    Ok(value)
}

fn normalize_status(value: Option<&str>) -> Result<String, String> {
    let value = value.unwrap_or("active").trim().to_ascii_lowercase();
    match value.as_str() {
        "active" | "enabled" => Ok("active".to_owned()),
        "inactive" | "disabled" => Ok("inactive".to_owned()),
        _ => Err("ip rate limit status must be one of active or inactive".to_owned()),
    }
}

fn normalize_block_duration(value: Option<&serde_json::Value>) -> Result<i64, String> {
    let seconds = match value {
        None | Some(serde_json::Value::Null) => DEFAULT_BLOCK_DURATION_SECONDS,
        Some(serde_json::Value::Number(value)) => value.as_i64().ok_or_else(|| {
            "blockDuration must be a positive integer or duration string".to_owned()
        })?,
        Some(serde_json::Value::String(value)) => parse_duration_string(value)?,
        Some(_) => {
            return Err("blockDuration must be a positive integer or duration string".to_owned());
        }
    };
    if !(MIN_LIMIT_VALUE..=MAX_BLOCK_DURATION_SECONDS).contains(&seconds) {
        return Err(format!(
            "blockDuration must be between {MIN_LIMIT_VALUE} and {MAX_BLOCK_DURATION_SECONDS} seconds"
        ));
    }
    Ok(seconds)
}

fn parse_duration_string(value: &str) -> Result<i64, String> {
    let value = value.trim();
    if value.is_empty() {
        return Ok(DEFAULT_BLOCK_DURATION_SECONDS);
    }
    let normalized = value.to_ascii_lowercase();
    let digits = value
        .chars()
        .filter(|character| character.is_ascii_digit())
        .collect::<String>();
    if digits.is_empty() {
        return Err("blockDuration must include a duration number".to_owned());
    }
    let amount = digits
        .parse::<i64>()
        .map_err(|_| "blockDuration must include a valid duration number".to_owned())?;
    if normalized.contains('d') || normalized.contains("day") {
        amount
            .checked_mul(86_400)
            .ok_or_else(|| "blockDuration day value is too large".to_owned())
    } else if normalized.contains('h') || normalized.contains("hour") {
        amount
            .checked_mul(3_600)
            .ok_or_else(|| "blockDuration hour value is too large".to_owned())
    } else if normalized.contains("ms") {
        Err("blockDuration must use seconds or larger units".to_owned())
    } else if normalized.contains('s') || normalized.contains("sec") {
        Ok(amount)
    } else if normalized.contains('m') || normalized.contains("min") || !value.is_ascii() {
        amount
            .checked_mul(60)
            .ok_or_else(|| "blockDuration minute value is too large".to_owned())
    } else {
        Ok(amount)
    }
}

fn normalize_ip_or_cidr(value: Option<&str>) -> Result<String, String> {
    let value = value.unwrap_or("").trim();
    if value.is_empty() {
        return Err("targetIp is required".to_owned());
    }
    if value.chars().count() > 128 {
        return Err("targetIp must be at most 128 characters".to_owned());
    }
    let parts = value.split('/').collect::<Vec<_>>();
    match parts.as_slice() {
        [address] => address
            .parse::<IpAddr>()
            .map(|address| address.to_string())
            .map_err(|_| "targetIp must be an IP address or CIDR block".to_owned()),
        [address, prefix] => {
            let address = address
                .parse::<IpAddr>()
                .map_err(|_| "targetIp must be an IP address or CIDR block".to_owned())?;
            let prefix = prefix
                .parse::<u8>()
                .map_err(|_| "targetIp CIDR prefix is invalid".to_owned())?;
            normalize_cidr(address, prefix)
        }
        _ => Err("targetIp must be an IP address or CIDR block".to_owned()),
    }
}

fn normalize_cidr(address: IpAddr, prefix: u8) -> Result<String, String> {
    match address {
        IpAddr::V4(address) => {
            if prefix > 32 {
                return Err("targetIp IPv4 CIDR prefix must be between 0 and 32".to_owned());
            }
            let mask = if prefix == 0 {
                0
            } else {
                u32::MAX << (32 - prefix)
            };
            let network = Ipv4Addr::from(u32::from(address) & mask);
            Ok(format!("{network}/{prefix}"))
        }
        IpAddr::V6(address) => {
            if prefix > 128 {
                return Err("targetIp IPv6 CIDR prefix must be between 0 and 128".to_owned());
            }
            let mask = if prefix == 0 {
                0
            } else {
                u128::MAX << (128 - prefix)
            };
            let network = Ipv6Addr::from(u128::from(address) & mask);
            Ok(format!("{network}/{prefix}"))
        }
    }
}

fn build_create_command(
    state: AdminIpRateLimitState,
    _headers: &HeaderMap,
    subject: AdminIpRateLimitSubject,
    request: NormalizedCreateRequest,
) -> Result<CreateAdminIpRateLimitCommand, ApiCommandError> {
    let rule_uuid = generate_entity_uuid(&state)?;
    let rule_code = entity_code("iprl", &rule_uuid);
    Ok(CreateAdminIpRateLimitCommand {
        subject,
        rule_uuid,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        rule_code,
        target_ip_hash: digest_hex(&request.target_ip),
        rule_name: request.rule_name,
        target_ip: request.target_ip,
        rps: request.rps,
        rpm: request.rpm,
        block_duration_seconds: request.block_duration_seconds,
        status: request.status,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn generate_entity_uuid(
    state: &AdminIpRateLimitState,
) -> Result<String, ApiCommandError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(ApiCommandError::System)
}

fn to_item_response(item: AdminIpRateLimitItem) -> AdminIpRateLimitItemResponse {
    AdminIpRateLimitItemResponse {
        id: item.id.to_string(),
        rule_name: item.rule_name,
        target_ip: item.target_ip,
        rps: item.rps,
        rpm: item.rpm,
        block_duration: format_duration(item.block_duration_seconds),
        status: item.status,
    }
}

fn format_duration(seconds: i64) -> String {
    if seconds <= 0 {
        "0s".to_owned()
    } else if seconds % 86_400 == 0 {
        format!("{}d", seconds / 86_400)
    } else if seconds % 3_600 == 0 {
        format!("{}h", seconds / 3_600)
    } else if seconds % 60 == 0 {
        format!("{}m", seconds / 60)
    } else {
        format!("{seconds}s")
    }
}

fn entity_code(prefix: &str, uuid: &str) -> String {
    let short = uuid.chars().take(24).collect::<String>();
    format!("{prefix}-{short}")
}

