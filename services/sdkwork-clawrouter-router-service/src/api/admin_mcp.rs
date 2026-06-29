use std::sync::Arc;
use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;

use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post, put};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::api::response::PlusApiResult;
use crate::domain::DomainError;
use crate::ports::{
    AdminMcpStore, AdminMcpSubject, CreateAdminMcpBindingCommand, CreateAdminMcpServerCommand,
    CreateAdminMcpServerRevisionCommand, DiscoverAdminMcpToolsCommand, GetAdminMcpServerQuery,
    ListAdminMcpBindingsQuery, ListAdminMcpServerRevisionsQuery, ListAdminMcpServersQuery,
    ListAdminMcpToolsQuery, PublishAdminMcpServerRevisionCommand, TestAdminMcpServerHealthCommand,
    UpdateAdminMcpBindingCommand, UpdateAdminMcpServerCommand, UpdateAdminMcpToolCommand,
};

const DEFAULT_PAGE_NO: i64 = 1;
const DEFAULT_PAGE_SIZE: i64 = 50;
const MAX_PAGE_SIZE: i64 = 200;
const MAX_KEY_LEN: usize = 128;
const MAX_NAME_LEN: usize = 255;
const MAX_DESCRIPTION_LEN: usize = 4000;
const MAX_URL_LEN: usize = 1024;
const MAX_COMMAND_LEN: usize = 1024;
const MAX_SECRET_REF_LEN: usize = 512;
const MAX_ENUM_LEN: usize = 64;
const MAX_TAGS: usize = 32;
const MAX_TAG_LEN: usize = 64;
const MIN_TIMEOUT_MS: i32 = 100;
const MAX_TIMEOUT_MS: i32 = 300_000;

#[derive(Clone)]
struct AdminMcpState {
    store: Arc<dyn AdminMcpStore + Send + Sync>,
}

#[derive(Debug, Default, Deserialize)]
struct ListServersRequest {
    page: Option<i64>,
    page_size: Option<i64>,
    q: Option<String>,
    transport: Option<String>,
    visibility: Option<String>,
    status: Option<String>,
    category_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateServerRequest {
    server_key: String,
    name: String,
    description: Option<String>,
    category_id: Option<String>,
    transport: Option<String>,
    visibility: Option<String>,
    tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateServerRequest {
    server_key: Option<String>,
    name: Option<String>,
    description: Option<Value>,
    category_id: Option<Value>,
    transport: Option<String>,
    visibility: Option<String>,
    status: Option<String>,
    tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateRevisionRequest {
    revision_no: String,
    transport: Option<String>,
    endpoint_url: Option<String>,
    command: Option<String>,
    args_json: Option<Value>,
    env_schema: Option<Value>,
    auth_type: Option<String>,
    secret_ref: Option<String>,
    timeout_ms: Option<i32>,
    retry_policy: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateToolRequest {
    name: Option<String>,
    description: Option<Value>,
    input_schema: Option<Value>,
    output_schema: Option<Value>,
    risk_level: Option<String>,
    requires_approval: Option<bool>,
    enabled: Option<bool>,
    status: Option<String>,
    rate_limit_policy: Option<Value>,
    sort_weight: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateBindingRequest {
    server_revision_id: Option<i64>,
    tool_id: Option<i64>,
    owner_type: String,
    owner_id: i64,
    allowed_tools: Option<Value>,
    denied_tools: Option<Value>,
    policy_json: Option<Value>,
    priority: Option<i32>,
    enabled: Option<bool>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateBindingRequest {
    server_revision_id: Option<Value>,
    tool_id: Option<Value>,
    owner_type: Option<String>,
    owner_id: Option<i64>,
    allowed_tools: Option<Value>,
    denied_tools: Option<Value>,
    policy_json: Option<Value>,
    priority: Option<i32>,
    enabled: Option<bool>,
    status: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminMcpListResponse<T> {
    items: Vec<T>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminMcpItemEnvelope<T> {
    item: T,
}

pub fn admin_mcp_router_with_store(store: Arc<dyn AdminMcpStore + Send + Sync>) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/mcp/servers",
            get(list_servers).post(create_server),
        )
        .route(
            "/backend/v3/api/mcp/servers/{server_id}",
            get(get_server).put(update_server),
        )
        .route(
            "/backend/v3/api/mcp/servers/{server_id}/revisions",
            get(list_revisions).post(create_revision),
        )
        .route(
            "/backend/v3/api/mcp/revisions/{revision_id}/publish",
            post(publish_revision),
        )
        .route(
            "/backend/v3/api/mcp/servers/{server_id}/discover",
            post(discover_tools),
        )
        .route(
            "/backend/v3/api/mcp/servers/{server_id}/health_check",
            post(check_health),
        )
        .route(
            "/backend/v3/api/mcp/servers/{server_id}/health-check",
            post(check_health),
        )
        .route(
            "/backend/v3/api/mcp/servers/{server_id}/tools",
            get(list_tools),
        )
        .route("/backend/v3/api/mcp/tools/{tool_id}", put(update_tool))
        .route(
            "/backend/v3/api/mcp/servers/{server_id}/bindings",
            get(list_bindings).post(create_binding),
        )
        .route(
            "/backend/v3/api/mcp/bindings/{binding_id}",
            put(update_binding),
        )
        .with_state(AdminMcpState { store })
}

async fn list_servers(
    State(state): State<AdminMcpState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Query(request): Query<ListServersRequest>,
) -> Response {
    let query = match build_list_servers_query(scoped, &headers, request) {
        Ok(query) => query,
        Err(response) => return response,
    };
    match state.store.list_servers(query).await {
        Ok(items) => list_response(items),
        Err(error) => mcp_error_response("mcp server list is unavailable", error),
    }
}

async fn get_server(
    State(state): State<AdminMcpState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(server_id): Path<String>,
) -> Response {
    let query = match build_get_server_query(scoped, &headers, &server_id) {
        Ok(query) => query,
        Err(response) => return response,
    };
    match state.store.get_server(query).await {
        Ok(Some(item)) => item_response(item),
        Ok(None) => not_found_response("mcp server was not found"),
        Err(error) => mcp_error_response("mcp server detail is unavailable", error),
    }
}

async fn create_server(
    State(state): State<AdminMcpState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Json(request): Json<CreateServerRequest>,
) -> Response {
    let command = match build_create_server_command(scoped, &headers, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.create_server(command).await {
        Ok(item) => item_response(item),
        Err(error) => mcp_error_response("mcp server create is unavailable", error),
    }
}

async fn update_server(
    State(state): State<AdminMcpState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(server_id): Path<String>,
    Json(request): Json<UpdateServerRequest>,
) -> Response {
    let command = match build_update_server_command(scoped, &headers, &server_id, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.update_server(command).await {
        Ok(Some(item)) => item_response(item),
        Ok(None) => not_found_response("mcp server was not found"),
        Err(error) => mcp_error_response("mcp server update is unavailable", error),
    }
}

async fn list_revisions(
    State(state): State<AdminMcpState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(server_id): Path<String>,
) -> Response {
    let query = match build_list_revisions_query(scoped, &headers, &server_id) {
        Ok(query) => query,
        Err(response) => return response,
    };
    match state.store.list_revisions(query).await {
        Ok(items) => list_response(items),
        Err(error) => mcp_error_response("mcp revision list is unavailable", error),
    }
}

async fn create_revision(
    State(state): State<AdminMcpState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(server_id): Path<String>,
    Json(request): Json<CreateRevisionRequest>,
) -> Response {
    let command = match build_create_revision_command(scoped, &headers, &server_id, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.create_revision(command).await {
        Ok(item) => item_response(item),
        Err(error) => mcp_error_response("mcp revision create is unavailable", error),
    }
}

async fn publish_revision(
    State(state): State<AdminMcpState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(revision_id): Path<String>,
) -> Response {
    let command = match build_publish_revision_command(scoped, &headers, &revision_id) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.publish_revision(command).await {
        Ok(Some(item)) => item_response(item),
        Ok(None) => not_found_response("mcp revision was not found"),
        Err(error) => mcp_error_response("mcp revision publish is unavailable", error),
    }
}

async fn discover_tools(
    State(state): State<AdminMcpState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(server_id): Path<String>,
) -> Response {
    let command = match build_discover_command(scoped, &headers, &server_id) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.discover_tools(command).await {
        Ok(item) => Json(PlusApiResult::success(item)).into_response(),
        Err(error) => mcp_error_response("mcp tool discovery is unavailable", error),
    }
}

async fn check_health(
    State(state): State<AdminMcpState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(server_id): Path<String>,
) -> Response {
    let command = match build_health_command(scoped, &headers, &server_id) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.check_health(command).await {
        Ok(item) => Json(PlusApiResult::success(item)).into_response(),
        Err(error) => mcp_error_response("mcp health check is unavailable", error),
    }
}

async fn list_tools(
    State(state): State<AdminMcpState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(server_id): Path<String>,
) -> Response {
    let query = match build_list_tools_query(scoped, &headers, &server_id) {
        Ok(query) => query,
        Err(response) => return response,
    };
    match state.store.list_tools(query).await {
        Ok(items) => list_response(items),
        Err(error) => mcp_error_response("mcp tool list is unavailable", error),
    }
}

async fn update_tool(
    State(state): State<AdminMcpState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(tool_id): Path<String>,
    Json(request): Json<UpdateToolRequest>,
) -> Response {
    let command = match build_update_tool_command(scoped, &headers, &tool_id, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.update_tool(command).await {
        Ok(Some(item)) => item_response(item),
        Ok(None) => not_found_response("mcp tool was not found"),
        Err(error) => mcp_error_response("mcp tool update is unavailable", error),
    }
}

async fn list_bindings(
    State(state): State<AdminMcpState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(server_id): Path<String>,
) -> Response {
    let query = match build_list_bindings_query(scoped, &headers, &server_id) {
        Ok(query) => query,
        Err(response) => return response,
    };
    match state.store.list_bindings(query).await {
        Ok(items) => list_response(items),
        Err(error) => mcp_error_response("mcp binding list is unavailable", error),
    }
}

async fn create_binding(
    State(state): State<AdminMcpState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(server_id): Path<String>,
    Json(request): Json<CreateBindingRequest>,
) -> Response {
    let command = match build_create_binding_command(scoped, &headers, &server_id, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.create_binding(command).await {
        Ok(item) => item_response(item),
        Err(error) => mcp_error_response("mcp binding create is unavailable", error),
    }
}

async fn update_binding(
    State(state): State<AdminMcpState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(binding_id): Path<String>,
    Json(request): Json<UpdateBindingRequest>,
) -> Response {
    let command = match build_update_binding_command(scoped, &headers, &binding_id, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.update_binding(command).await {
        Ok(Some(item)) => item_response(item),
        Ok(None) => not_found_response("mcp binding was not found"),
        Err(error) => mcp_error_response("mcp binding update is unavailable", error),
    }
}

fn build_list_servers_query(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    request: ListServersRequest,
) -> Result<ListAdminMcpServersQuery, Response> {
    let subject = scoped.into();
    let page_no = request.page.unwrap_or(DEFAULT_PAGE_NO);
    if page_no < 1 {
        return Err(bad_request("page must be greater than or equal to 1"));
    }
    let page_size = request.page_size.unwrap_or(DEFAULT_PAGE_SIZE);
    if !(1..=MAX_PAGE_SIZE).contains(&page_size) {
        return Err(bad_request(format!(
            "page_size must be between 1 and {MAX_PAGE_SIZE}"
        )));
    }
    Ok(ListAdminMcpServersQuery {
        subject,
        keyword: normalize_optional_text(request.q, "q", MAX_KEY_LEN)?,
        transport: normalize_optional_enum(request.transport, "transport")?,
        visibility: normalize_optional_enum(request.visibility, "visibility")?,
        status: normalize_optional_enum(request.status, "status")?,
        category_id: normalize_optional_id(request.category_id, "categoryId")?,
        page_no,
        page_size,
        offset: (page_no - 1) * page_size,
    })
}

fn build_get_server_query(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    server_id: &str,
) -> Result<GetAdminMcpServerQuery, Response> {
    Ok(GetAdminMcpServerQuery {
        subject: scoped.into(),
        server_id: parse_positive_i64(server_id, "serverId")?,
    })
}

fn build_create_server_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    request: CreateServerRequest,
) -> Result<CreateAdminMcpServerCommand, Response> {
    Ok(CreateAdminMcpServerCommand {
        subject: scoped.into(),
        server_key: normalize_required_key(request.server_key, "serverKey")?,
        name: normalize_required_text(request.name, "name", MAX_NAME_LEN)?,
        description: normalize_optional_text(
            request.description,
            "description",
            MAX_DESCRIPTION_LEN,
        )?,
        category_id: normalize_optional_id(request.category_id, "categoryId")?,
        transport: normalize_optional_enum(request.transport, "transport")?
            .unwrap_or_else(|| "http".to_owned()),
        visibility: normalize_optional_enum(request.visibility, "visibility")?
            .unwrap_or_else(|| "organization".to_owned()),
        tags: normalize_tags(request.tags)?,
    })
}

fn build_update_server_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    server_id: &str,
    request: UpdateServerRequest,
) -> Result<UpdateAdminMcpServerCommand, Response> {
    Ok(UpdateAdminMcpServerCommand {
        subject: scoped.into(),
        server_id: parse_positive_i64(server_id, "serverId")?,
        server_key: request
            .server_key
            .map(|value| normalize_required_key(value, "serverKey"))
            .transpose()?,
        name: request
            .name
            .map(|value| normalize_required_text(value, "name", MAX_NAME_LEN))
            .transpose()?,
        description: normalize_nullable_text(
            request.description,
            "description",
            MAX_DESCRIPTION_LEN,
        )?,
        category_id: normalize_nullable_id(request.category_id, "categoryId")?,
        transport: normalize_optional_enum(request.transport, "transport")?,
        visibility: normalize_optional_enum(request.visibility, "visibility")?,
        status: normalize_optional_enum(request.status, "status")?,
        tags: request
            .tags
            .map(|tags| normalize_tags(Some(tags)))
            .transpose()?,
    })
}

fn build_list_revisions_query(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    server_id: &str,
) -> Result<ListAdminMcpServerRevisionsQuery, Response> {
    Ok(ListAdminMcpServerRevisionsQuery {
        subject: scoped.into(),
        server_id: parse_positive_i64(server_id, "serverId")?,
    })
}

fn build_create_revision_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    server_id: &str,
    request: CreateRevisionRequest,
) -> Result<CreateAdminMcpServerRevisionCommand, Response> {
    let transport = normalize_optional_enum(request.transport, "transport")?
        .unwrap_or_else(|| "http".to_owned());
    Ok(CreateAdminMcpServerRevisionCommand {
        subject: scoped.into(),
        server_id: parse_positive_i64(server_id, "serverId")?,
        revision_no: normalize_required_key(request.revision_no, "revisionNo")?,
        transport,
        endpoint_url: normalize_optional_text(request.endpoint_url, "endpointUrl", MAX_URL_LEN)?,
        command: normalize_optional_text(request.command, "command", MAX_COMMAND_LEN)?,
        args_json: json_array_or_default(request.args_json, "argsJson")?,
        env_schema: json_object_or_default(request.env_schema, "envSchema")?,
        auth_type: normalize_optional_enum(request.auth_type, "authType")?
            .unwrap_or_else(|| "none".to_owned()),
        secret_ref: normalize_optional_text(request.secret_ref, "secretRef", MAX_SECRET_REF_LEN)?,
        timeout_ms: normalize_timeout(request.timeout_ms)?,
        retry_policy: json_object_or_default(request.retry_policy, "retryPolicy")?,
    })
}

fn build_publish_revision_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    revision_id: &str,
) -> Result<PublishAdminMcpServerRevisionCommand, Response> {
    Ok(PublishAdminMcpServerRevisionCommand {
        subject: scoped.into(),
        revision_id: parse_positive_i64(revision_id, "revisionId")?,
    })
}

fn build_discover_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    server_id: &str,
) -> Result<DiscoverAdminMcpToolsCommand, Response> {
    Ok(DiscoverAdminMcpToolsCommand {
        subject: scoped.into(),
        server_id: parse_positive_i64(server_id, "serverId")?,
    })
}

fn build_health_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    server_id: &str,
) -> Result<TestAdminMcpServerHealthCommand, Response> {
    Ok(TestAdminMcpServerHealthCommand {
        subject: scoped.into(),
        server_id: parse_positive_i64(server_id, "serverId")?,
    })
}

fn build_list_tools_query(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    server_id: &str,
) -> Result<ListAdminMcpToolsQuery, Response> {
    Ok(ListAdminMcpToolsQuery {
        subject: scoped.into(),
        server_id: parse_positive_i64(server_id, "serverId")?,
    })
}

fn build_update_tool_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    tool_id: &str,
    request: UpdateToolRequest,
) -> Result<UpdateAdminMcpToolCommand, Response> {
    Ok(UpdateAdminMcpToolCommand {
        subject: scoped.into(),
        tool_id: parse_positive_i64(tool_id, "toolId")?,
        name: request
            .name
            .map(|value| normalize_required_text(value, "name", MAX_NAME_LEN))
            .transpose()?,
        description: normalize_nullable_text(
            request.description,
            "description",
            MAX_DESCRIPTION_LEN,
        )?,
        input_schema: request
            .input_schema
            .map(|value| json_object_or_default(Some(value), "inputSchema"))
            .transpose()?,
        output_schema: request
            .output_schema
            .map(|value| json_object_or_default(Some(value), "outputSchema"))
            .transpose()?,
        risk_level: normalize_optional_enum(request.risk_level, "riskLevel")?,
        requires_approval: request.requires_approval,
        enabled: request.enabled,
        status: normalize_optional_enum(request.status, "status")?,
        rate_limit_policy: request
            .rate_limit_policy
            .map(|value| json_object_or_default(Some(value), "rateLimitPolicy"))
            .transpose()?,
        sort_weight: request.sort_weight,
    })
}

fn build_list_bindings_query(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    server_id: &str,
) -> Result<ListAdminMcpBindingsQuery, Response> {
    Ok(ListAdminMcpBindingsQuery {
        subject: scoped.into(),
        server_id: parse_positive_i64(server_id, "serverId")?,
    })
}

fn build_create_binding_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    server_id: &str,
    request: CreateBindingRequest,
) -> Result<CreateAdminMcpBindingCommand, Response> {
    Ok(CreateAdminMcpBindingCommand {
        subject: scoped.into(),
        server_id: parse_positive_i64(server_id, "serverId")?,
        server_revision_id: normalize_optional_positive_i64(
            request.server_revision_id,
            "serverRevisionId",
        )?,
        tool_id: normalize_optional_positive_i64(request.tool_id, "toolId")?,
        owner_type: normalize_required_text(request.owner_type, "ownerType", MAX_ENUM_LEN)?,
        owner_id: normalize_positive_i64(request.owner_id, "ownerId")?,
        allowed_tools: json_string_array_or_default(request.allowed_tools, "allowedTools")?,
        denied_tools: json_string_array_or_default(request.denied_tools, "deniedTools")?,
        policy_json: json_object_or_default(request.policy_json, "policyJson")?,
        priority: request.priority.unwrap_or(0),
        enabled: request.enabled.unwrap_or(true),
        status: normalize_optional_enum(request.status, "status")?
            .unwrap_or_else(|| "enabled".to_owned()),
    })
}

fn build_update_binding_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    binding_id: &str,
    request: UpdateBindingRequest,
) -> Result<UpdateAdminMcpBindingCommand, Response> {
    Ok(UpdateAdminMcpBindingCommand {
        subject: scoped.into(),
        binding_id: parse_positive_i64(binding_id, "bindingId")?,
        server_revision_id: normalize_nullable_positive_i64(
            request.server_revision_id,
            "serverRevisionId",
        )?,
        tool_id: normalize_nullable_positive_i64(request.tool_id, "toolId")?,
        owner_type: request
            .owner_type
            .map(|value| normalize_required_text(value, "ownerType", MAX_ENUM_LEN))
            .transpose()?,
        owner_id: request
            .owner_id
            .map(|value| normalize_positive_i64(value, "ownerId"))
            .transpose()?,
        allowed_tools: request
            .allowed_tools
            .map(|value| json_string_array_or_default(Some(value), "allowedTools"))
            .transpose()?,
        denied_tools: request
            .denied_tools
            .map(|value| json_string_array_or_default(Some(value), "deniedTools"))
            .transpose()?,
        policy_json: request
            .policy_json
            .map(|value| json_object_or_default(Some(value), "policyJson"))
            .transpose()?,
        priority: request.priority,
        enabled: request.enabled,
        status: normalize_optional_enum(request.status, "status")?,
    })
}


fn normalize_required_key(value: String, field_name: &str) -> Result<String, Response> {
    let value = normalize_required_text(value, field_name, MAX_KEY_LEN)?;
    if !value
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':'))
    {
        return Err(bad_request(format!(
            "{field_name} contains unsupported characters"
        )));
    }
    Ok(value)
}

fn normalize_optional_enum(
    value: Option<String>,
    field_name: &str,
) -> Result<Option<String>, Response> {
    normalize_optional_text(value, field_name, MAX_ENUM_LEN)
        .map(|value| value.map(|value| value.to_ascii_lowercase()))
}

fn normalize_optional_id(
    value: Option<String>,
    field_name: &str,
) -> Result<Option<String>, Response> {
    let Some(value) = normalize_optional_text(value, field_name, MAX_KEY_LEN)? else {
        return Ok(None);
    };
    validate_id_token(&value, field_name)?;
    Ok(Some(value))
}

fn normalize_nullable_id(
    value: Option<Value>,
    field_name: &str,
) -> Result<Option<Option<String>>, Response> {
    let value = normalize_nullable_text(value, field_name, MAX_KEY_LEN)?;
    if let Some(Some(value)) = value.as_ref() {
        validate_id_token(value, field_name)?;
    }
    Ok(value)
}

fn validate_id_token(value: &str, field_name: &str) -> Result<(), Response> {
    if !value
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':'))
    {
        return Err(bad_request(format!(
            "{field_name} contains unsupported characters"
        )));
    }
    Ok(())
}

fn normalize_required_text(
    value: String,
    field_name: &str,
    max_len: usize,
) -> Result<String, Response> {
    normalize_optional_text(Some(value), field_name, max_len)?
        .ok_or_else(|| bad_request(format!("{field_name} is required")))
}

fn normalize_optional_text(
    value: Option<String>,
    field_name: &str,
    max_len: usize,
) -> Result<Option<String>, Response> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = value.trim();
    if value.is_empty() {
        return Ok(None);
    }
    if value.chars().count() > max_len || value.bytes().any(|byte| byte < 0x20) {
        return Err(bad_request(format!(
            "{field_name} must be at most {max_len} characters and contain no control characters"
        )));
    }
    Ok(Some(value.to_owned()))
}

fn normalize_nullable_text(
    value: Option<Value>,
    field_name: &str,
    max_len: usize,
) -> Result<Option<Option<String>>, Response> {
    match value {
        None => Ok(None),
        Some(Value::Null) => Ok(Some(None)),
        Some(Value::String(value)) => {
            normalize_optional_text(Some(value), field_name, max_len).map(|value| Some(value))
        }
        Some(_) => Err(bad_request(format!(
            "{field_name} must be a string or null"
        ))),
    }
}

fn normalize_tags(values: Option<Vec<String>>) -> Result<Vec<String>, Response> {
    let Some(values) = values else {
        return Ok(Vec::new());
    };
    if values.len() > MAX_TAGS {
        return Err(bad_request(format!(
            "tags must contain at most {MAX_TAGS} items"
        )));
    }
    let mut tags = Vec::new();
    for value in values {
        let Some(value) = normalize_optional_text(Some(value), "tags", MAX_TAG_LEN)? else {
            continue;
        };
        if !tags.contains(&value) {
            tags.push(value);
        }
    }
    Ok(tags)
}

fn normalize_timeout(value: Option<i32>) -> Result<i32, Response> {
    let value = value.unwrap_or(30_000);
    if !(MIN_TIMEOUT_MS..=MAX_TIMEOUT_MS).contains(&value) {
        return Err(bad_request(format!(
            "timeoutMs must be between {MIN_TIMEOUT_MS} and {MAX_TIMEOUT_MS}"
        )));
    }
    Ok(value)
}

fn normalize_optional_positive_i64(
    value: Option<i64>,
    field_name: &str,
) -> Result<Option<i64>, Response> {
    value
        .map(|value| normalize_positive_i64(value, field_name))
        .transpose()
}

fn normalize_nullable_positive_i64(
    value: Option<Value>,
    field_name: &str,
) -> Result<Option<Option<i64>>, Response> {
    match value {
        None => Ok(None),
        Some(Value::Null) => Ok(Some(None)),
        Some(Value::Number(number)) => {
            let Some(value) = number.as_i64() else {
                return Err(bad_request(format!(
                    "{field_name} must be a positive integer or null"
                )));
            };
            normalize_positive_i64(value, field_name).map(|value| Some(Some(value)))
        }
        Some(Value::String(value)) => {
            let value = value.trim().parse::<i64>().map_err(|_| {
                bad_request(format!("{field_name} must be a positive integer or null"))
            })?;
            normalize_positive_i64(value, field_name).map(|value| Some(Some(value)))
        }
        Some(_) => Err(bad_request(format!(
            "{field_name} must be a positive integer or null"
        ))),
    }
}

fn normalize_positive_i64(value: i64, field_name: &str) -> Result<i64, Response> {
    if value <= 0 {
        return Err(bad_request(format!(
            "{field_name} must be a positive integer"
        )));
    }
    Ok(value)
}

fn parse_positive_i64(value: &str, field_name: &str) -> Result<i64, Response> {
    let value = value
        .trim()
        .parse::<i64>()
        .map_err(|_| bad_request(format!("{field_name} must be a positive integer")))?;
    if value <= 0 {
        return Err(bad_request(format!(
            "{field_name} must be a positive integer"
        )));
    }
    Ok(value)
}

fn json_object_or_default(value: Option<Value>, field_name: &str) -> Result<Value, Response> {
    match value {
        Some(Value::Object(map)) => Ok(Value::Object(map)),
        Some(_) => Err(bad_request(format!("{field_name} must be a JSON object"))),
        None => Ok(Value::Object(Default::default())),
    }
}

fn json_array_or_default(value: Option<Value>, field_name: &str) -> Result<Value, Response> {
    match value {
        Some(Value::Array(items)) => Ok(Value::Array(items)),
        Some(_) => Err(bad_request(format!("{field_name} must be a JSON array"))),
        None => Ok(Value::Array(Vec::new())),
    }
}

fn json_string_array_or_default(value: Option<Value>, field_name: &str) -> Result<Value, Response> {
    let value = json_array_or_default(value, field_name)?;
    let Some(items) = value.as_array() else {
        return Err(bad_request(format!(
            "{field_name} must be a JSON string array"
        )));
    };
    if items.iter().all(|item| item.as_str().is_some()) {
        return Ok(value);
    }
    Err(bad_request(format!(
        "{field_name} must be a JSON string array"
    )))
}

fn list_response<T: Serialize>(items: Vec<T>) -> Response {
    Json(PlusApiResult::success(AdminMcpListResponse { items })).into_response()
}

fn item_response<T: Serialize>(item: T) -> Response {
    Json(PlusApiResult::success(AdminMcpItemEnvelope { item })).into_response()
}

fn bad_request(message: impl Into<String>) -> Response {
    PlusApiResult::error("4001", message.into())).into_response()
}

fn not_found_response(message: impl Into<String>) -> Response {
    PlusApiResult::error("4004", message.into())).into_response()
}

fn conflict_response(error: DomainError) -> Response {
    PlusApiResult::error("4090", error.to_string())).into_response()
}

fn mcp_error_response(context: &str, error: DomainError) -> Response {
    if error.is_not_found() {
        return not_found_response(error.to_string());
    }
    if error.is_conflict() {
        return conflict_response(error);
    }
    PlusApiResult::error("5000", format!("{context}: {error}"))).into_response()
}
