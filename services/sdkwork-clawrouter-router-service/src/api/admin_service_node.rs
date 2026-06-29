use std::net::IpAddr;
use std::sync::Arc;
use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, put};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use crate::api::response::PlusApiResult;
use crate::api::subject::admin_operator_fields;
use crate::ports::{
    AdminServiceNodeItem, AdminServiceNodeStore, AdminServiceNodeSubject,
    CreateAdminServiceNodeCommand, DeleteAdminServiceNodeCommand, ListAdminServiceNodesQuery,
    UpdateAdminServiceNodeCommand, UpdateAdminServiceNodeStatusCommand,
};

const MAX_ID_LEN: usize = 128;
const MAX_TEXT_LEN: usize = 128;
const MAX_DOMAIN_LEN: usize = 255;
const MAX_IP_LEN: usize = 64;
const MAX_REMARK_LEN: usize = 512;

#[derive(Clone)]
struct AdminServiceNodeState {
    store: Arc<dyn AdminServiceNodeStore + Send + Sync>,
}

#[derive(Debug, Deserialize)]
struct AdminServiceNodeListQuery {
    q: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminServiceNodeCreateRequest {
    name: String,
    domain: String,
    ip: String,
    remark: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminServiceNodeUpdateRequest {
    name: Option<String>,
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
struct AdminServiceNodeListResponse {
    items: Vec<AdminServiceNodeItem>,
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
        Err(response) => return response,
    };
    match state.store.list_service_nodes(query).await {
        Ok(items) => Json(PlusApiResult::success(AdminServiceNodeListResponse {
            items,
        }))
        .into_response(),
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
        Err(response) => return response,
    };
    match state.store.create_service_node(command).await {
        Ok(item) => Json(PlusApiResult::success(AdminServiceNodeMutationResponse {
            item,
        }))
        .into_response(),
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
        Err(response) => return response,
    };
    match state.store.update_service_node(command).await {
        Ok(item) => Json(PlusApiResult::success(AdminServiceNodeMutationResponse {
            item,
        }))
        .into_response(),
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
        Err(response) => return response,
    };
    match state.store.update_service_node_status(command).await {
        Ok(item) => Json(PlusApiResult::success(AdminServiceNodeMutationResponse {
            item,
        }))
        .into_response(),
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
        Err(response) => return response,
    };
    match state
        .store
        .delete_service_node(DeleteAdminServiceNodeCommand { subject, node_id })
        .await
    {
        Ok(outcome) => Json(PlusApiResult::success(outcome)).into_response(),
        Err(error) => system_error("service node delete failed", error),
    }
}


fn build_list_query(
    subject: AdminServiceNodeSubject,
    query: AdminServiceNodeListQuery,
) -> Result<ListAdminServiceNodesQuery, Response> {
    Ok(ListAdminServiceNodesQuery {
        subject,
        search: optional_visible_text(query.q, "q", MAX_TEXT_LEN)?,
        status: optional_status(query.status)?,
    })
}

fn build_create_command(
    subject: AdminServiceNodeSubject,
    payload: AdminServiceNodeCreateRequest,
) -> Result<CreateAdminServiceNodeCommand, Response> {
    Ok(CreateAdminServiceNodeCommand {
        subject,
        name: required_visible_text(payload.name, "name", MAX_TEXT_LEN)?,
        domain: required_domain(payload.domain)?,
        ip: required_ip(payload.ip)?,
        remark: optional_remark(payload.remark)?.unwrap_or_default(),
        status: optional_status(payload.status)?,
    })
}

fn build_update_command(
    subject: AdminServiceNodeSubject,
    node_id: String,
    payload: AdminServiceNodeUpdateRequest,
) -> Result<UpdateAdminServiceNodeCommand, Response> {
    if payload.status.is_some() {
        return Err(bad_request(
            "status must be changed through status endpoint",
        ));
    }
    let name = optional_visible_text(payload.name, "name", MAX_TEXT_LEN)?;
    let domain = optional_domain(payload.domain)?;
    let ip = optional_ip(payload.ip)?;
    let remark = optional_remark(payload.remark)?;
    if name.is_none() && domain.is_none() && ip.is_none() && remark.is_none() {
        return Err(bad_request("service node update fields are required"));
    }
    Ok(UpdateAdminServiceNodeCommand {
        subject,
        node_id: required_visible_text(node_id, "node id", MAX_ID_LEN)?,
        name,
        domain,
        ip,
        remark,
    })
}

fn build_status_command(
    subject: AdminServiceNodeSubject,
    node_id: String,
    payload: AdminServiceNodeStatusRequest,
) -> Result<UpdateAdminServiceNodeStatusCommand, Response> {
    Ok(UpdateAdminServiceNodeStatusCommand {
        subject,
        node_id: required_visible_text(node_id, "node id", MAX_ID_LEN)?,
        status: required_status(payload.status)?,
    })
}

fn optional_status(value: Option<String>) -> Result<Option<String>, Response> {
    value.map(required_status).transpose()
}

fn required_status(value: String) -> Result<String, Response> {
    let value = required_visible_text(value, "status", 32)?;
    match value.as_str() {
        "enabled" | "disabled" => Ok(value),
        _ => Err(bad_request("status must be enabled or disabled")),
    }
}

fn optional_domain(value: Option<String>) -> Result<Option<String>, Response> {
    value.map(required_domain).transpose()
}

fn required_domain(value: String) -> Result<String, Response> {
    let value = required_visible_text(value, "domain", MAX_DOMAIN_LEN)?;
    let host =
        domain_host(&value).ok_or_else(|| bad_request("domain must be a hostname or URL host"))?;
    if !is_valid_hostname(host) {
        return Err(bad_request("domain must be a hostname or URL host"));
    }
    Ok(host.to_ascii_lowercase())
}

fn optional_ip(value: Option<String>) -> Result<Option<String>, Response> {
    value.map(required_ip).transpose()
}

fn required_ip(value: String) -> Result<String, Response> {
    let value = required_visible_text(value, "ip", MAX_IP_LEN)?;
    value
        .parse::<IpAddr>()
        .map(|_| value)
        .map_err(|_| bad_request("ip must be a valid IPv4 or IPv6 address"))
}

fn optional_remark(value: Option<String>) -> Result<Option<String>, Response> {
    value.map(required_remark).transpose()
}

fn required_remark(value: String) -> Result<String, Response> {
    let value = value.trim().to_owned();
    if value.len() > MAX_REMARK_LEN || !value.chars().all(|ch| ch == '\n' || !ch.is_control()) {
        return Err(bad_request(format!(
            "remark must be visible text and at most {MAX_REMARK_LEN} characters"
        )));
    }
    Ok(value)
}

fn domain_host(value: &str) -> Option<&str> {
    let without_scheme = if let Some((scheme, rest)) = value.split_once("://") {
        if !scheme.eq_ignore_ascii_case("http") && !scheme.eq_ignore_ascii_case("https") {
            return None;
        }
        rest
    } else {
        value
    };
    let host_port = without_scheme
        .split(['/', '?', '#'])
        .next()
        .unwrap_or_default();
    if host_port.is_empty() || host_port.contains('@') || host_port.starts_with('[') {
        return None;
    }
    let mut parts = host_port.split(':');
    let host = parts.next().unwrap_or_default();
    let port = parts.next();
    if parts.next().is_some() || port.is_some_and(|port| port.parse::<u16>().is_err()) {
        return None;
    }
    Some(host)
}

fn is_valid_hostname(value: &str) -> bool {
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
) -> Result<Option<String>, Response> {
    value
        .map(|value| required_visible_text(value, field_name, max_len))
        .transpose()
}

fn required_visible_text(
    value: String,
    field_name: &str,
    max_len: usize,
) -> Result<String, Response> {
    let value = value.trim().to_owned();
    if value.is_empty() {
        return Err(bad_request(format!("{field_name} is required")));
    }
    if value.len() > max_len || !value.chars().all(|ch| !ch.is_control()) {
        return Err(bad_request(format!(
            "{field_name} must be visible text and at most {max_len} characters"
        )));
    }
    Ok(value)
}

fn bad_request(message: impl Into<String>) -> Response {
    PlusApiResult::error("4000", message.into())).into_response()
}

fn system_error(context: &str, error: crate::domain::DomainError) -> Response {
    PlusApiResult::error("5000", format!("{context}: {error}"))).into_response()
}
