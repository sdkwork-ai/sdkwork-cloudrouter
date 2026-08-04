use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;
use std::net::IpAddr;
use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, put};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use url::Url;

use crate::api::response::{
    json_created_response, json_success_list_response, no_content_response,
    normalize_list_search_query, offset_page_info, parse_offset_list_query, problem_from_wire_code,
    success_envelope, validation_problem, ApiResponseError,
};
use crate::ports::{
    AdminServiceNodeItem, AdminServiceNodeStore, AdminServiceNodeSubject,
    CreateAdminServiceNodeCommand, DeleteAdminServiceNodeCommand, ListAdminServiceNodesQuery,
    UpdateAdminServiceNodeCommand, UpdateAdminServiceNodeStatusCommand,
};

const MAX_ID_LEN: usize = 128;
const MAX_TEXT_LEN: usize = 128;
const MAX_DOMAIN_LEN: usize = 255;
const MAX_BASE_URL_LEN: usize = 2048;
const MAX_DOMAINS: usize = 20;
const MAX_IP_LEN: usize = 64;
const MAX_REMARK_LEN: usize = 512;

#[derive(Clone)]
struct AdminServiceNodeState {
    store: Arc<dyn AdminServiceNodeStore + Send + Sync>,
}

#[derive(Debug, Default, Deserialize)]
struct AdminServiceNodeListQuery {
    page: Option<i64>,
    page_size: Option<i64>,
    q: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminServiceNodeCreateRequest {
    name: String,
    deployment_profile: Option<String>,
    base_url: Option<String>,
    domains: Option<Vec<String>>,
    domain: Option<String>,
    ip: Option<String>,
    remark: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminServiceNodeUpdateRequest {
    name: Option<String>,
    deployment_profile: Option<String>,
    base_url: Option<String>,
    domains: Option<Vec<String>>,
    domain: Option<String>,
    ip: Option<String>,
    remark: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminServiceNodeStatusRequest {
    status: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminServiceNodeMutationResponse {
    item: AdminServiceNodeItem,
}

pub fn admin_service_node_router_with_store(
    store: Arc<dyn AdminServiceNodeStore + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/system/service_nodes",
            get(list_service_nodes).post(create_service_node),
        )
        .route(
            "/backend/v3/api/system/service_nodes/{node_id}",
            put(update_service_node).delete(delete_service_node),
        )
        .route(
            "/backend/v3/api/system/service_nodes/{node_id}/status",
            put(update_service_node_status),
        )
        .with_state(AdminServiceNodeState { store })
}

async fn list_service_nodes(
    State(state): State<AdminServiceNodeState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Query(query): Query<AdminServiceNodeListQuery>,
) -> Response {
    let subject = scoped.into();
    let query = match build_list_query(subject, query) {
        Ok(query) => query,
        Err(error) => return error.into_response(),
    };
    match state.store.list_service_nodes(query).await {
        Ok(page) => json_success_list_response(
            None,
            page.items,
            offset_page_info(page.page_no, page.page_size, page.total),
        ),
        Err(error) => system_error("service node list is unavailable", error),
    }
}

async fn create_service_node(
    State(state): State<AdminServiceNodeState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Json(payload): Json<AdminServiceNodeCreateRequest>,
) -> Response {
    let subject = scoped.into();
    let command = match build_create_command(subject, payload) {
        Ok(command) => command,
        Err(error) => return error.into_response(),
    };
    match state.store.create_service_node(command).await {
        Ok(item) => json_created_response(None, AdminServiceNodeMutationResponse { item }),
        Err(error) => system_error("service node create failed", error),
    }
}

async fn update_service_node(
    State(state): State<AdminServiceNodeState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(node_id): Path<String>,
    Json(payload): Json<AdminServiceNodeUpdateRequest>,
) -> Response {
    let subject = scoped.into();
    let command = match build_update_command(subject, node_id, payload) {
        Ok(command) => command,
        Err(error) => return error.into_response(),
    };
    match state.store.update_service_node(command).await {
        Ok(item) => {
            Json(success_envelope(AdminServiceNodeMutationResponse { item })).into_response()
        }
        Err(error) => system_error("service node update failed", error),
    }
}

async fn update_service_node_status(
    State(state): State<AdminServiceNodeState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(node_id): Path<String>,
    Json(payload): Json<AdminServiceNodeStatusRequest>,
) -> Response {
    let subject = scoped.into();
    let command = match build_status_command(subject, node_id, payload) {
        Ok(command) => command,
        Err(error) => return error.into_response(),
    };
    match state.store.update_service_node_status(command).await {
        Ok(item) => {
            Json(success_envelope(AdminServiceNodeMutationResponse { item })).into_response()
        }
        Err(error) => system_error("service node status update failed", error),
    }
}

async fn delete_service_node(
    State(state): State<AdminServiceNodeState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(node_id): Path<String>,
) -> Response {
    let subject = scoped.into();
    let node_id = match required_visible_text(node_id, "node id", MAX_ID_LEN) {
        Ok(node_id) => node_id,
        Err(error) => return error.into_response(),
    };
    match state
        .store
        .delete_service_node(DeleteAdminServiceNodeCommand { subject, node_id })
        .await
    {
        Ok(outcome) if outcome.deleted => no_content_response(None),
        Ok(_) => problem_from_wire_code("4040", "service node was not found").into_response(),
        Err(error) => system_error("service node delete failed", error),
    }
}

fn build_list_query(
    subject: AdminServiceNodeSubject,
    query: AdminServiceNodeListQuery,
) -> Result<ListAdminServiceNodesQuery, ApiResponseError> {
    let pagination = parse_offset_list_query(query.page, query.page_size).map_err(bad_request)?;
    Ok(ListAdminServiceNodesQuery {
        subject,
        page_no: pagination.page_no,
        page_size: pagination.page_size,
        offset: pagination.offset,
        search: normalize_list_search_query(query.q, "q").map_err(bad_request)?,
        status: optional_status(query.status)?,
    })
}

fn build_create_command(
    subject: AdminServiceNodeSubject,
    payload: AdminServiceNodeCreateRequest,
) -> Result<CreateAdminServiceNodeCommand, ApiResponseError> {
    let domains = required_domains(payload.domains, payload.domain)?;
    let base_url = required_base_url_or_legacy_domain(payload.base_url, &domains)?;
    Ok(CreateAdminServiceNodeCommand {
        subject,
        name: required_visible_text(payload.name, "name", MAX_TEXT_LEN)?,
        deployment_profile: required_deployment_profile(
            payload
                .deployment_profile
                .unwrap_or_else(|| "standalone".to_owned()),
        )?,
        base_url,
        domains,
        ip: optional_ip(payload.ip)?,
        remark: optional_remark(payload.remark)?.unwrap_or_default(),
        status: optional_status(payload.status)?,
    })
}

fn build_update_command(
    subject: AdminServiceNodeSubject,
    node_id: String,
    payload: AdminServiceNodeUpdateRequest,
) -> Result<UpdateAdminServiceNodeCommand, ApiResponseError> {
    if payload.status.is_some() {
        return Err(bad_request("status must be changed through status endpoint").into());
    }
    let name = optional_visible_text(payload.name, "name", MAX_TEXT_LEN)?;
    let deployment_profile = payload
        .deployment_profile
        .map(required_deployment_profile)
        .transpose()?;
    let base_url = payload.base_url.map(required_base_url).transpose()?;
    let domains = optional_domains(payload.domains, payload.domain)?;
    let ip = optional_ip(payload.ip)?;
    let remark = optional_remark(payload.remark)?;
    if name.is_none()
        && deployment_profile.is_none()
        && base_url.is_none()
        && domains.is_none()
        && ip.is_none()
        && remark.is_none()
    {
        return Err(bad_request("service node update fields are required").into());
    }
    Ok(UpdateAdminServiceNodeCommand {
        subject,
        node_id: required_visible_text(node_id, "node id", MAX_ID_LEN)?,
        name,
        deployment_profile,
        base_url,
        domains,
        ip,
        remark,
    })
}

fn build_status_command(
    subject: AdminServiceNodeSubject,
    node_id: String,
    payload: AdminServiceNodeStatusRequest,
) -> Result<UpdateAdminServiceNodeStatusCommand, ApiResponseError> {
    Ok(UpdateAdminServiceNodeStatusCommand {
        subject,
        node_id: required_visible_text(node_id, "node id", MAX_ID_LEN)?,
        status: required_status(payload.status)?,
    })
}

fn optional_status(value: Option<String>) -> Result<Option<String>, ApiResponseError> {
    value.map(required_status).transpose()
}

fn required_status(value: String) -> Result<String, ApiResponseError> {
    let value = required_visible_text(value, "status", 32)?;
    match value.as_str() {
        "enabled" | "disabled" => Ok(value),
        _ => Err(bad_request("status must be enabled or disabled").into()),
    }
}

fn required_deployment_profile(value: String) -> Result<String, ApiResponseError> {
    let value = required_visible_text(value, "deployment profile", 32)?.to_ascii_lowercase();
    match value.as_str() {
        "standalone" | "cloud" => Ok(value),
        _ => Err(bad_request("deployment profile must be standalone or cloud").into()),
    }
}

fn required_base_url_or_legacy_domain(
    base_url: Option<String>,
    domains: &[String],
) -> Result<String, ApiResponseError> {
    match base_url {
        Some(base_url) => required_base_url(base_url),
        None => Ok(format!("https://{}/v1", domains[0])),
    }
}

fn required_base_url(value: String) -> Result<String, ApiResponseError> {
    let value = required_visible_text(value, "base URL", MAX_BASE_URL_LEN)?;
    let mut parsed = Url::parse(&value).map_err(|_| bad_request("base URL must be a valid URL"))?;
    if !matches!(parsed.scheme(), "http" | "https")
        || parsed.host_str().is_none()
        || !parsed.username().is_empty()
        || parsed.password().is_some()
        || parsed.query().is_some()
        || parsed.fragment().is_some()
    {
        return Err(bad_request(
            "base URL must use HTTP(S) without credentials, query, or fragment",
        )
        .into());
    }
    parsed.set_query(None);
    parsed.set_fragment(None);
    let mut normalized = parsed.to_string();
    while normalized.ends_with('/') && parsed.path() != "/" {
        normalized.pop();
    }
    if parsed.path() == "/" {
        normalized.pop();
    }
    Ok(normalized)
}

fn required_domains(
    domains: Option<Vec<String>>,
    legacy_domain: Option<String>,
) -> Result<Vec<String>, ApiResponseError> {
    optional_domains(domains, legacy_domain)?
        .filter(|domains| !domains.is_empty())
        .ok_or_else(|| bad_request("at least one domain is required").into())
}

fn optional_domains(
    domains: Option<Vec<String>>,
    legacy_domain: Option<String>,
) -> Result<Option<Vec<String>>, ApiResponseError> {
    if domains.is_none() && legacy_domain.is_none() {
        return Ok(None);
    }
    let mut values = domains.unwrap_or_default();
    if let Some(domain) = legacy_domain {
        values.insert(0, domain);
    }
    if values.len() > MAX_DOMAINS {
        return Err(bad_request(format!(
            "domains must contain at most {MAX_DOMAINS} entries"
        ))
        .into());
    }
    let mut normalized = Vec::with_capacity(values.len());
    for value in values {
        let domain = required_domain(value)?;
        if !normalized.contains(&domain) {
            normalized.push(domain);
        }
    }
    if normalized.is_empty() {
        return Err(bad_request("at least one domain is required").into());
    }
    Ok(Some(normalized))
}

fn required_domain(value: String) -> Result<String, ApiResponseError> {
    let value = required_visible_text(value, "domain", MAX_DOMAIN_LEN)?;
    let candidate = if value.contains("://") {
        value
    } else {
        format!("http://{value}")
    };
    let parsed =
        Url::parse(&candidate).map_err(|_| bad_request("domain must be a hostname or URL host"))?;
    if !matches!(parsed.scheme(), "http" | "https")
        || !parsed.username().is_empty()
        || parsed.password().is_some()
        || parsed.query().is_some()
        || parsed.fragment().is_some()
    {
        return Err(bad_request("domain must be a hostname or URL host").into());
    }
    let host = parsed
        .host_str()
        .filter(|host| is_valid_host(host))
        .ok_or_else(|| bad_request("domain must be a hostname or URL host"))?;
    let host = if host.contains(':') {
        format!("[{host}]")
    } else {
        host.to_ascii_lowercase()
    };
    Ok(match parsed.port() {
        Some(port) => format!("{host}:{port}"),
        None => host,
    })
}

fn optional_ip(value: Option<String>) -> Result<Option<String>, ApiResponseError> {
    value
        .map(|value| {
            let value = value.trim().to_owned();
            if value.is_empty() {
                Ok(value)
            } else {
                required_ip(value)
            }
        })
        .transpose()
}

fn required_ip(value: String) -> Result<String, ApiResponseError> {
    let value = required_visible_text(value, "ip", MAX_IP_LEN)?;
    value
        .parse::<IpAddr>()
        .map(|_| value)
        .map_err(|_| bad_request("ip must be a valid IPv4 or IPv6 address").into())
}

fn optional_remark(value: Option<String>) -> Result<Option<String>, ApiResponseError> {
    value.map(required_remark).transpose()
}

fn required_remark(value: String) -> Result<String, ApiResponseError> {
    let value = value.trim().to_owned();
    if value.len() > MAX_REMARK_LEN || !value.chars().all(|ch| ch == '\n' || !ch.is_control()) {
        return Err(bad_request(format!(
            "remark must be visible text and at most {MAX_REMARK_LEN} characters"
        ))
        .into());
    }
    Ok(value)
}

fn is_valid_host(value: &str) -> bool {
    if value.eq_ignore_ascii_case("localhost") || value.parse::<IpAddr>().is_ok() {
        return true;
    }
    if value.len() > MAX_DOMAIN_LEN || value.contains("..") || !value.contains('.') {
        return false;
    }
    value.split('.').all(|label| {
        let bytes = label.as_bytes();
        !bytes.is_empty()
            && bytes.len() <= 63
            && bytes[0].is_ascii_alphanumeric()
            && bytes[bytes.len() - 1].is_ascii_alphanumeric()
            && bytes
                .iter()
                .all(|byte| byte.is_ascii_alphanumeric() || *byte == b'-')
    })
}

fn optional_visible_text(
    value: Option<String>,
    field_name: &str,
    max_len: usize,
) -> Result<Option<String>, ApiResponseError> {
    value
        .map(|value| required_visible_text(value, field_name, max_len))
        .transpose()
}

fn required_visible_text(
    value: String,
    field_name: &str,
    max_len: usize,
) -> Result<String, ApiResponseError> {
    let value = value.trim().to_owned();
    if value.is_empty() {
        return Err(bad_request(format!("{field_name} is required")).into());
    }
    if value.len() > max_len || !value.chars().all(|ch| !ch.is_control()) {
        return Err(bad_request(format!(
            "{field_name} must be visible text and at most {max_len} characters"
        ))
        .into());
    }
    Ok(value)
}

fn bad_request(message: impl Into<String>) -> Response {
    validation_problem(message).into_response()
}

fn system_error(context: &str, error: crate::domain::DomainError) -> Response {
    problem_from_wire_code("5000", format!("{context}: {error}")).into_response()
}
