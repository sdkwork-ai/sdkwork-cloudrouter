use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Bytes;
use axum::extract::{Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::api::request_id::{generate_server_request_id, RequestIdError};
use crate::api::response::{
    json_created_response, json_success_list_response, normalize_list_search_query,
    offset_page_info, parse_offset_list_query, problem_from_wire_code, success_envelope,
};
use crate::application::EntityUuidGenerator;
use crate::domain::DomainError;
use crate::ports::{
    AdminIpRateLimitItem, AdminIpRateLimitStore, AdminIpRateLimitSubject,
    CreateAdminIpRateLimitCommand, ListAdminIpRateLimitsQuery,
};

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

enum IpRateLimitCommandBuildError {
    BadRequest(String),
    System(DomainError),
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
            "/backend/v3/api/router/rate_limits/ip",
            get(fetch_ip_rate_limits).post(create_ip_rate_limit),
        )
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
            ip_rate_limit_system_response("ip rate limit read model is unavailable", error)
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
        Err(error) => return command_build_error_response(error),
    };

    match state.store.create_ip_rate_limit(command).await {
        Ok(item) => json_created_response(None, AdminIpRateLimitItemEnvelope {
            item: to_item_response(item),
        }),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            ip_rate_limit_system_response("ip rate limit command store is unavailable", error)
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
        Ok(amount * 86_400)
    } else if normalized.contains('h') || normalized.contains("hour") {
        Ok(amount * 3_600)
    } else if normalized.contains("ms") {
        Err("blockDuration must use seconds or larger units".to_owned())
    } else if normalized.contains('s') || normalized.contains("sec") {
        Ok(amount)
    } else if normalized.contains('m') || normalized.contains("min") || !value.is_ascii() {
        Ok(amount * 60)
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
) -> Result<CreateAdminIpRateLimitCommand, IpRateLimitCommandBuildError> {
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
) -> Result<String, IpRateLimitCommandBuildError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(IpRateLimitCommandBuildError::System)
}

fn request_id_error(error: RequestIdError) -> IpRateLimitCommandBuildError {
    match error {
        RequestIdError::Invalid(message) => IpRateLimitCommandBuildError::BadRequest(message),
        RequestIdError::System(message) => {
            IpRateLimitCommandBuildError::System(DomainError::new(message))
        }
    }
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

fn digest_hex(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    hex::encode(hasher.finalize())
}

fn bad_request(message: String) -> Response {
    problem_from_wire_code("4001", message).into_response()
}

fn conflict_response(error: DomainError) -> Response {
    problem_from_wire_code("4090", error.to_string()).into_response()
}

fn command_build_error_response(error: IpRateLimitCommandBuildError) -> Response {
    match error {
        IpRateLimitCommandBuildError::BadRequest(message) => bad_request(message),
        IpRateLimitCommandBuildError::System(error) => {
            ip_rate_limit_system_response("ip rate limit command is invalid", error)
        }
    }
}

fn ip_rate_limit_system_response(context: &str, error: DomainError) -> Response {
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
