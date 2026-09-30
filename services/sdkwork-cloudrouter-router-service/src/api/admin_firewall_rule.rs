use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use std::sync::Arc;

use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use serde::{Deserialize, Serialize};

use crate::api::request_id::generate_server_request_id;
use crate::api::response::{
    bad_request, json_created_response, json_success_list_response, no_content_response,
    normalize_list_search_query, offset_page_info, parse_offset_list_query, problem_from_wire_code,
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
    AdminFirewallRuleItem, AdminFirewallRuleStore, AdminFirewallRuleSubject,
    CreateAdminFirewallRuleCommand, DeleteAdminFirewallRuleCommand, ListAdminFirewallRulesQuery,
};
use sdkwork_utils_rust::datetime::current_timestamp_string;

const MAX_VALUE_LEN: usize = 256;
const MAX_REASON_LEN: usize = 512;
const RULE_TYPE_DENY: i32 = 21;
const RULE_TYPE_ALLOW: i32 = 22;
const TARGET_TYPE_IP: i32 = 1;
const TARGET_TYPE_EMAIL: i32 = 2;
const TARGET_TYPE_DOMAIN: i32 = 3;
const MATCH_MODE_EXACT: i32 = 1;
const MATCH_MODE_CIDR: i32 = 2;
const MATCH_MODE_SUFFIX: i32 = 3;
const ACTION_DENY: i32 = 20;
const ACTION_ALLOW: i32 = 21;

#[derive(Clone)]
struct AdminFirewallRuleState {
    store: Arc<dyn AdminFirewallRuleStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
struct AdminFirewallRuleListQueryRequest {
    page: Option<i64>,
    page_size: Option<i64>,
    q: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminFirewallRuleCreateRequest {
    #[serde(rename = "type")]
    firewall_type: Option<String>,
    value: Option<String>,
    reason: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedCreateRequest {
    firewall_type: String,
    rule_type_code: i32,
    target_type_code: i32,
    match_mode_code: i32,
    action_code: i32,
    value: String,
    value_masked: String,
    reason: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum FirewallAction {
    Allow,
    Deny,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum FirewallTarget {
    Ip,
    Email,
    Domain,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminFirewallRuleItemEnvelope {
    item: AdminFirewallRuleItemResponse,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminFirewallRuleItemResponse {
    id: String,
    #[serde(rename = "type")]
    firewall_type: String,
    value: String,
    reason: String,
    time: String,
}

pub fn admin_firewall_rule_router_with_store(
    store: Arc<dyn AdminFirewallRuleStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/system/firewalls/rules",
            get(fetch_firewall_rules).post(create_firewall_rule),
        )
        .route(
            "/backend/v3/api/system/firewalls/rules/{rule_id}",
            axum::routing::delete(delete_firewall_rule),
        )
        .with_state(AdminFirewallRuleState {
            store,
            entity_uuid_generator,
        })
}

async fn fetch_firewall_rules(
    State(state): State<AdminFirewallRuleState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(request): Query<AdminFirewallRuleListQueryRequest>,
) -> Response {
    let subject = scoped.into();
    let query = match build_list_query(subject, request) {
        Ok(query) => query,
        Err(message) => return bad_request(message),
    };

    match state.store.list_firewall_rules(query).await {
        Ok(page) => json_success_list_response(
            None,
            page.items.into_iter().map(to_item_response).collect(),
            offset_page_info(page.page_no, page.page_size, page.total),
        ),
        Err(error) => {
            system_error_response("firewall rule read model is unavailable", error)
        }
    }
}

fn build_list_query(
    subject: AdminFirewallRuleSubject,
    request: AdminFirewallRuleListQueryRequest,
) -> Result<ListAdminFirewallRulesQuery, String> {
    let pagination = parse_offset_list_query(request.page, request.page_size)?;
    Ok(ListAdminFirewallRulesQuery {
        subject,
        page_no: pagination.page_no,
        page_size: pagination.page_size,
        offset: pagination.offset,
        q: normalize_list_search_query(request.q, "q")?,
    })
}

async fn create_firewall_rule(
    State(state): State<AdminFirewallRuleState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_body::<AdminFirewallRuleCreateRequest>(&body, "firewall rule") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let request = match normalize_create_request(request) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match build_create_command(state.clone(), &headers, subject, request) {
        Ok(command) => command,
        Err(error) => return command_error_response(error, "firewall rule command is invalid"),
    };

    match state.store.create_firewall_rule(command).await {
        Ok(item) => json_created_response(
            None,
            AdminFirewallRuleItemEnvelope {
                item: to_item_response(item),
            },
        ),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            system_error_response("firewall rule command store is unavailable", error)
        }
    }
}

async fn delete_firewall_rule(
    State(state): State<AdminFirewallRuleState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(rule_id): Path<String>,
) -> Response {
    let subject = scoped.into();
    let rule_id = match parse_positive_id(&rule_id, "firewall rule id") {
        Ok(rule_id) => rule_id,
        Err(message) => return bad_request(message),
    };
    let command = match build_delete_command(state.clone(), &headers, subject, rule_id) {
        Ok(command) => command,
        Err(error) => return command_error_response(error, "firewall rule command is invalid"),
    };

    match state.store.delete_firewall_rule(command).await {
        Ok(true) => no_content_response(None),
        Ok(false) => not_found_response("firewall rule was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            system_error_response("firewall rule command store is unavailable", error)
        }
    }
}

fn normalize_create_request(
    request: AdminFirewallRuleCreateRequest,
) -> Result<NormalizedCreateRequest, String> {
    let action = normalize_action(request.firewall_type.as_deref())?;
    let declared_target = normalize_declared_target(request.firewall_type.as_deref());
    let value = normalize_value(request.value.as_deref())?;
    validate_declared_target(declared_target, value.target)?;
    let firewall_type = firewall_type_label(action, value.target);
    Ok(NormalizedCreateRequest {
        firewall_type,
        rule_type_code: rule_type_code(action),
        target_type_code: target_type_code(value.target),
        match_mode_code: value.match_mode_code,
        action_code: action_code(action),
        value: value.value,
        value_masked: value.masked,
        reason: normalize_required_text(
            request.reason.as_deref(),
            "firewall reason",
            MAX_REASON_LEN,
        )?,
    })
}

struct NormalizedValue {
    target: FirewallTarget,
    match_mode_code: i32,
    value: String,
    masked: String,
}

fn normalize_action(value: Option<&str>) -> Result<FirewallAction, String> {
    let value = value.unwrap_or("").trim();
    if value.is_empty() {
        return Err("firewall type is required".to_owned());
    }
    let lower = value.to_ascii_lowercase();
    if lower.contains("white")
        || lower.contains("allow")
        || lower.contains("permit")
        || value.contains('\u{767d}')
        || value.contains('\u{9427}')
    {
        Ok(FirewallAction::Allow)
    } else if lower.contains("black")
        || lower.contains("deny")
        || lower.contains("block")
        || lower.contains("ban")
        || value.contains('\u{9ed1}')
        || value.contains('\u{699b}')
    {
        Ok(FirewallAction::Deny)
    } else {
        Err("firewall type must describe an allowlist or denylist rule".to_owned())
    }
}

fn normalize_declared_target(value: Option<&str>) -> Option<FirewallTarget> {
    let value = value.unwrap_or("").trim();
    let lower = value.to_ascii_lowercase();
    if lower.contains("ip") {
        Some(FirewallTarget::Ip)
    } else if lower.contains("email")
        || lower.contains("mail")
        || value.contains('\u{90ae}')
        || value.contains('\u{95ad}')
    {
        Some(FirewallTarget::Email)
    } else {
        None
    }
}

fn validate_declared_target(
    declared: Option<FirewallTarget>,
    actual: FirewallTarget,
) -> Result<(), String> {
    match (declared, actual) {
        (Some(FirewallTarget::Ip), FirewallTarget::Ip)
        | (Some(FirewallTarget::Email), FirewallTarget::Email)
        | (Some(FirewallTarget::Email), FirewallTarget::Domain)
        | (None, _) => Ok(()),
        (Some(FirewallTarget::Ip), _) => {
            Err("firewall type expects an IP address or CIDR block".to_owned())
        }
        (Some(FirewallTarget::Email), FirewallTarget::Ip) => {
            Err("firewall type expects an email address or email domain".to_owned())
        }
        (Some(FirewallTarget::Domain), _) => Ok(()),
    }
}

fn normalize_value(value: Option<&str>) -> Result<NormalizedValue, String> {
    let raw_value = value.unwrap_or("").trim();
    if raw_value.is_empty() {
        return Err("firewall value is required".to_owned());
    }
    if raw_value.chars().count() > MAX_VALUE_LEN {
        return Err(format!(
            "firewall value must be at most {MAX_VALUE_LEN} characters"
        ));
    }
    if !raw_value.bytes().all(|byte| (0x21..=0x7e).contains(&byte)) {
        return Err("firewall value must use visible ASCII without spaces".to_owned());
    }

    if let Ok((value, match_mode_code)) = normalize_ip_or_cidr(raw_value) {
        return Ok(NormalizedValue {
            target: FirewallTarget::Ip,
            match_mode_code,
            masked: value.clone(),
            value,
        });
    }
    if is_valid_email(raw_value) {
        let value = raw_value.to_ascii_lowercase();
        return Ok(NormalizedValue {
            target: FirewallTarget::Email,
            match_mode_code: MATCH_MODE_EXACT,
            masked: mask_email(&value),
            value,
        });
    }
    let domain_value = raw_value
        .strip_prefix('@')
        .unwrap_or(raw_value)
        .strip_prefix('.')
        .unwrap_or_else(|| raw_value.strip_prefix('@').unwrap_or(raw_value));
    if is_valid_domain(domain_value) {
        let value = domain_value.to_ascii_lowercase();
        return Ok(NormalizedValue {
            target: FirewallTarget::Domain,
            match_mode_code: MATCH_MODE_SUFFIX,
            masked: value.clone(),
            value,
        });
    }

    Err("firewall value must be an IP address, CIDR block, email address, or domain".to_owned())
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

fn normalize_ip_or_cidr(value: &str) -> Result<(String, i32), String> {
    let parts = value.split('/').collect::<Vec<_>>();
    match parts.as_slice() {
        [address] => address
            .parse::<IpAddr>()
            .map(|address| (address.to_string(), MATCH_MODE_EXACT))
            .map_err(|_| "firewall value must be an IP address or CIDR block".to_owned()),
        [address, prefix] => {
            let address = address
                .parse::<IpAddr>()
                .map_err(|_| "firewall value must be an IP address or CIDR block".to_owned())?;
            let prefix = prefix
                .parse::<u8>()
                .map_err(|_| "firewall CIDR prefix is invalid".to_owned())?;
            normalize_cidr(address, prefix).map(|value| (value, MATCH_MODE_CIDR))
        }
        _ => Err("firewall value must be an IP address or CIDR block".to_owned()),
    }
}

fn normalize_cidr(address: IpAddr, prefix: u8) -> Result<String, String> {
    match address {
        IpAddr::V4(address) => {
            if prefix > 32 {
                return Err("firewall IPv4 CIDR prefix must be between 0 and 32".to_owned());
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
                return Err("firewall IPv6 CIDR prefix must be between 0 and 128".to_owned());
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

fn is_valid_email(value: &str) -> bool {
    if value.len() > 254 {
        return false;
    }
    let Some((local, domain)) = value.split_once('@') else {
        return false;
    };
    if local.is_empty() || local.len() > 64 || !is_valid_domain(domain) {
        return false;
    }
    local
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || b".!#$%&'*+-/=?^_`{|}~".contains(&byte))
}

fn is_valid_domain(value: &str) -> bool {
    if value.is_empty() || value.len() > 253 || !value.contains('.') {
        return false;
    }
    value.split('.').all(|label| {
        !label.is_empty()
            && label.len() <= 63
            && label
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-')
            && !label.starts_with('-')
            && !label.ends_with('-')
    })
}

fn firewall_type_label(action: FirewallAction, target: FirewallTarget) -> String {
    let target = match target {
        FirewallTarget::Ip => "IP",
        FirewallTarget::Email | FirewallTarget::Domain => "Email",
    };
    let list = match action {
        FirewallAction::Allow => "whitelist",
        FirewallAction::Deny => "blacklist",
    };
    format!("{target} {list}")
}

fn rule_type_code(action: FirewallAction) -> i32 {
    match action {
        FirewallAction::Allow => RULE_TYPE_ALLOW,
        FirewallAction::Deny => RULE_TYPE_DENY,
    }
}

fn target_type_code(target: FirewallTarget) -> i32 {
    match target {
        FirewallTarget::Ip => TARGET_TYPE_IP,
        FirewallTarget::Email => TARGET_TYPE_EMAIL,
        FirewallTarget::Domain => TARGET_TYPE_DOMAIN,
    }
}

fn action_code(action: FirewallAction) -> i32 {
    match action {
        FirewallAction::Allow => ACTION_ALLOW,
        FirewallAction::Deny => ACTION_DENY,
    }
}

fn mask_email(value: &str) -> String {
    let Some((local, domain)) = value.split_once('@') else {
        return value.to_owned();
    };
    if local.chars().count() <= 2 {
        format!("**@{domain}")
    } else {
        let first = local.chars().next().unwrap_or('*');
        let last = local.chars().last().unwrap_or('*');
        format!("{first}***{last}@{domain}")
    }
}

fn build_create_command(
    state: AdminFirewallRuleState,
    _headers: &HeaderMap,
    subject: AdminFirewallRuleSubject,
    request: NormalizedCreateRequest,
) -> Result<CreateAdminFirewallRuleCommand, ApiCommandError> {
    let rule_uuid = generate_entity_uuid(&state)?;
    let rule_code = entity_code("fw", &rule_uuid);
    Ok(CreateAdminFirewallRuleCommand {
        subject,
        rule_uuid,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        rule_code,
        firewall_type: request.firewall_type,
        rule_type_code: request.rule_type_code,
        target_type_code: request.target_type_code,
        match_mode_code: request.match_mode_code,
        action_code: request.action_code,
        value_hash: digest_hex(&request.value),
        value: request.value,
        value_masked: request.value_masked,
        reason: request.reason,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_delete_command(
    state: AdminFirewallRuleState,
    _headers: &HeaderMap,
    subject: AdminFirewallRuleSubject,
    rule_id: i64,
) -> Result<DeleteAdminFirewallRuleCommand, ApiCommandError> {
    Ok(DeleteAdminFirewallRuleCommand {
        subject,
        audit_log_uuid: generate_entity_uuid(&state)?,
        config_snapshot_uuid: generate_entity_uuid(&state)?,
        rule_id,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn generate_entity_uuid(
    state: &AdminFirewallRuleState,
) -> Result<String, ApiCommandError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(ApiCommandError::System)
}

fn parse_positive_id(value: &str, field_name: &str) -> Result<i64, String> {
    let id = value
        .trim()
        .parse::<i64>()
        .map_err(|_| format!("{field_name} must be a positive integer"))?;
    if id <= 0 {
        return Err(format!("{field_name} must be a positive integer"));
    }
    Ok(id)
}

fn to_item_response(item: AdminFirewallRuleItem) -> AdminFirewallRuleItemResponse {
    AdminFirewallRuleItemResponse {
        id: item.id.to_string(),
        firewall_type: item.firewall_type,
        value: item.value,
        reason: item.reason,
        time: item.time,
    }
}

fn entity_code(prefix: &str, uuid: &str) -> String {
    let short = uuid.chars().take(24).collect::<String>();
    format!("{prefix}-{short}")
}

fn not_found_response(message: &str) -> Response {
    problem_from_wire_code("4040", message.to_owned()).into_response()
}

