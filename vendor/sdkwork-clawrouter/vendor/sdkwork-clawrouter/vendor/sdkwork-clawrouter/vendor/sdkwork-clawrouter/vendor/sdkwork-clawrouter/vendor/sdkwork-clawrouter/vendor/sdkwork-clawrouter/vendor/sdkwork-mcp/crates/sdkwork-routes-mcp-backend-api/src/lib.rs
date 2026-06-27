use std::sync::Arc;

mod handlers;
mod health;
pub mod http_route_manifest;
mod paths;
mod ports;
mod web_bootstrap;

use axum::{
    extract::{Extension, Path, Query, State},
    http::{HeaderMap, StatusCode},
    routing::{delete, get, post, put},
    Json, Router,
};
use sdkwork_intelligence_mcp_service::McpService;
use sdkwork_routes_mcp_shared::record_builders::{
    category_record, connector_record, invocation_record, prompt_record, resource_record,
    tool_record, EntityWriteContext,
};
use sdkwork_mcp_contract::{
    McpAuthKind, McpInvocationKind, McpLifecycleStatus, McpPublishStatus, McpTransportKind,
    McpVisibility,
};
use sdkwork_web_core::HttpRouteManifest;
use serde::Deserialize;
use sqlx::PgPool;

pub use handlers::{
    append_invocation, default_server_record, delete_connector, delete_server, list_categories,
    list_connectors, list_invocations, list_servers, resolve_tenant_id, upsert_category,
    upsert_connector, upsert_prompt, upsert_resource, upsert_server, upsert_tool, SharedMcpService,
};
pub use health::DbReadinessCheck;
pub use http_route_manifest::backend_route_manifest;
pub use ports::McpBackendRequestContext;
pub use web_bootstrap::{
    mcp_backend_public_path_prefixes, wrap_router_with_web_framework,
    wrap_router_with_web_framework_from_env,
};

#[derive(Clone)]
pub struct BackendState<R: sdkwork_intelligence_mcp_service::McpRepository> {
    pub service: SharedMcpService<R>,
    pub default_tenant_id: u64,
    pub readiness: Option<DbReadinessCheck>,
}

#[derive(Debug, Deserialize)]
struct InvocationQuery {
    server_id: Option<u64>,
    limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct CreateServerRequest {
    server_key: String,
    name: String,
    description: Option<String>,
    transport: McpTransportKind,
    visibility: Option<McpVisibility>,
    category_id: Option<u64>,
    category_code: Option<String>,
    tags: Vec<String>,
    icon_ref: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UpdateServerRequest {
    name: Option<String>,
    description: Option<String>,
    transport: Option<McpTransportKind>,
    visibility: Option<McpVisibility>,
    category_id: Option<u64>,
    category_code: Option<String>,
    tags: Option<Vec<String>>,
    icon_ref: Option<String>,
    lifecycle_status: Option<McpLifecycleStatus>,
}

#[derive(Debug, Deserialize)]
struct UpsertCategoryRequest {
    category_code: String,
    name: String,
    description: Option<String>,
    parent_id: Option<u64>,
    sort_order: Option<i32>,
    icon_ref: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UpsertConnectorRequest {
    connector_key: String,
    transport: McpTransportKind,
    endpoint_url: Option<String>,
    command_ref: Option<String>,
    args_json: Option<String>,
    env_schema_json: Option<String>,
    auth_type: Option<McpAuthKind>,
    secret_ref: Option<String>,
    timeout_ms: Option<u32>,
    retry_policy_json: Option<String>,
    publish_status: Option<McpPublishStatus>,
    lifecycle_status: Option<McpLifecycleStatus>,
}

#[derive(Debug, Deserialize)]
struct UpsertToolRequest {
    connector_id: u64,
    tool_key: String,
    name: String,
    description: Option<String>,
    input_schema_json: Option<String>,
    output_schema_json: Option<String>,
    risk_level: Option<String>,
    requires_approval: Option<bool>,
    enabled: Option<bool>,
    sort_weight: Option<i32>,
}

#[derive(Debug, Deserialize)]
struct UpsertResourceRequest {
    connector_id: u64,
    resource_key: String,
    uri: String,
    name: String,
    description: Option<String>,
    mime_type: Option<String>,
    enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct UpsertPromptRequest {
    connector_id: u64,
    prompt_key: String,
    name: String,
    description: Option<String>,
    arguments_schema_json: Option<String>,
    enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct AppendInvocationRequest {
    server_id: u64,
    connector_id: Option<u64>,
    invocation_kind: McpInvocationKind,
    target_key: String,
    request_id: Option<String>,
    trace_id: Option<String>,
    idempotency_key: Option<String>,
    request_json: Option<String>,
    response_json: Option<String>,
    status: Option<String>,
    error_message: Option<String>,
    duration_ms: Option<u32>,
}

pub fn router<R>(state: BackendState<R>) -> Router
where
    R: sdkwork_intelligence_mcp_service::McpRepository + Clone + Send + Sync + 'static,
{
    Router::new()
        .route(paths::LIVEZ, get(health::livez))
        .route(paths::READYZ, get(readyz_handler::<R>))
        .route(paths::HEALTHZ, get(healthz_handler::<R>))
        .route(paths::ADMIN_CATEGORIES_LIST, get(list_categories_handler))
        .route(paths::ADMIN_CATEGORY_UPSERT, post(upsert_category_handler))
        .route(paths::ADMIN_SERVERS_LIST, get(list_servers_handler))
        .route(paths::ADMIN_SERVER_CREATE, post(create_server_handler))
        .route(paths::ADMIN_SERVER_UPDATE, put(update_server_handler))
        .route(paths::ADMIN_SERVER_DELETE, delete(delete_server_handler))
        .route(paths::ADMIN_CONNECTORS_LIST, get(list_connectors_handler))
        .route(paths::ADMIN_CONNECTOR_UPSERT, post(upsert_connector_handler))
        .route(
            paths::ADMIN_CONNECTOR_DELETE,
            delete(delete_connector_handler),
        )
        .route(paths::ADMIN_TOOL_UPSERT, post(upsert_tool_handler))
        .route(paths::ADMIN_RESOURCE_UPSERT, post(upsert_resource_handler))
        .route(paths::ADMIN_PROMPT_UPSERT, post(upsert_prompt_handler))
        .route(paths::ADMIN_INVOCATIONS_LIST, get(list_invocations_handler))
        .route(
            paths::ADMIN_INVOCATIONS_APPEND,
            post(append_invocation_handler),
        )
        .with_state(state)
}

async fn readyz_handler<R>(
    State(state): State<BackendState<R>>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)>
where
    R: sdkwork_intelligence_mcp_service::McpRepository + Send + Sync,
{
    health::readyz_with_state(state.readiness.clone()).await
}

async fn healthz_handler<R>(
    State(state): State<BackendState<R>>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)>
where
    R: sdkwork_intelligence_mcp_service::McpRepository + Send + Sync,
{
    health::healthz_with_state(state.readiness.clone()).await
}

fn resolve_request_tenant_id(
    context: Option<&Extension<McpBackendRequestContext>>,
    headers: &HeaderMap,
    default_tenant_id: u64,
) -> u64 {
    context
        .map(|extension| extension.0.tenant_id)
        .unwrap_or_else(|| resolve_tenant_id(headers, default_tenant_id))
}

async fn list_servers_handler<R>(
    State(state): State<BackendState<R>>,
    headers: HeaderMap,
    context: Option<Extension<McpBackendRequestContext>>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)>
where
    R: sdkwork_intelligence_mcp_service::McpRepository + Send + Sync,
{
    let tenant_id = resolve_request_tenant_id(context.as_ref(), &headers, state.default_tenant_id);
    Ok(Json(list_servers(state.service.as_ref(), tenant_id).await?))
}

async fn create_server_handler<R>(
    State(state): State<BackendState<R>>,
    headers: HeaderMap,
    context: Option<Extension<McpBackendRequestContext>>,
    Json(body): Json<CreateServerRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)>
where
    R: sdkwork_intelligence_mcp_service::McpRepository + Send + Sync,
{
    let ctx = resolve_write_context(context.as_ref(), &headers, state.default_tenant_id);
    let owner_user_id = context
        .as_ref()
        .and_then(|value| value.0.operator_id)
        .unwrap_or(0);
    let mut record = default_server_record(
        ctx,
        owner_user_id,
        body.server_key,
        body.name,
        body.transport,
        body.visibility.unwrap_or(McpVisibility::Tenant),
    );
    record.description = body.description;
    record.category_id = body.category_id;
    record.category_code = body.category_code;
    record.tags = body.tags;
    record.icon_ref = body.icon_ref;
    Ok(Json(upsert_server(state.service.as_ref(), record).await?))
}

async fn update_server_handler<R>(
    State(state): State<BackendState<R>>,
    headers: HeaderMap,
    Path(server_key): Path<String>,
    context: Option<Extension<McpBackendRequestContext>>,
    Json(body): Json<UpdateServerRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)>
where
    R: sdkwork_intelligence_mcp_service::McpRepository + Send + Sync,
{
    let tenant_id = resolve_request_tenant_id(context.as_ref(), &headers, state.default_tenant_id);
    let mut record = state
        .service
        .get_server(tenant_id, server_key.as_str())
        .await
        .map_err(sdkwork_routes_mcp_shared::http::service_error_response)?;
    if let Some(value) = body.name {
        record.name = value;
    }
    if let Some(value) = body.description {
        record.description = Some(value);
    }
    if let Some(value) = body.transport {
        record.transport = value;
    }
    if let Some(value) = body.lifecycle_status {
        record.lifecycle_status = value;
    }
    if let Some(value) = body.visibility {
        record.visibility = value;
        record.data_scope = value.default_data_scope();
    }
    if let Some(value) = body.category_id {
        record.category_id = Some(value);
    }
    if let Some(value) = body.category_code {
        record.category_code = Some(value);
    }
    if let Some(value) = body.tags {
        record.tags = value;
    }
    if let Some(value) = body.icon_ref {
        record.icon_ref = Some(value);
    }
    Ok(Json(upsert_server(state.service.as_ref(), record).await?))
}

async fn list_categories_handler<R>(
    State(state): State<BackendState<R>>,
    headers: HeaderMap,
    context: Option<Extension<McpBackendRequestContext>>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)>
where
    R: sdkwork_intelligence_mcp_service::McpRepository + Send + Sync,
{
    let tenant_id = resolve_request_tenant_id(context.as_ref(), &headers, state.default_tenant_id);
    Ok(Json(list_categories(state.service.as_ref(), tenant_id).await?))
}

fn resolve_write_context(
    context: Option<&Extension<McpBackendRequestContext>>,
    headers: &HeaderMap,
    default_tenant_id: u64,
) -> EntityWriteContext {
    EntityWriteContext {
        tenant_id: resolve_request_tenant_id(context, headers, default_tenant_id),
        operator_id: context
            .and_then(|value| value.0.operator_id)
            .unwrap_or(0),
    }
}

async fn upsert_category_handler<R>(
    State(state): State<BackendState<R>>,
    headers: HeaderMap,
    context: Option<Extension<McpBackendRequestContext>>,
    Json(body): Json<UpsertCategoryRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)>
where
    R: sdkwork_intelligence_mcp_service::McpRepository + Send + Sync,
{
    let ctx = resolve_write_context(context.as_ref(), &headers, state.default_tenant_id);
    let record = category_record(
        ctx,
        body.category_code,
        body.name,
        body.description,
        body.parent_id.unwrap_or(0),
        body.sort_order.unwrap_or(0),
        body.icon_ref,
    );
    Ok(Json(upsert_category(state.service.as_ref(), record).await?))
}

async fn delete_server_handler<R>(
    State(state): State<BackendState<R>>,
    headers: HeaderMap,
    Path(server_key): Path<String>,
    context: Option<Extension<McpBackendRequestContext>>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)>
where
    R: sdkwork_intelligence_mcp_service::McpRepository + Send + Sync,
{
    let tenant_id = resolve_request_tenant_id(context.as_ref(), &headers, state.default_tenant_id);
    Ok(Json(
        delete_server(state.service.as_ref(), tenant_id, server_key.as_str()).await?,
    ))
}

async fn list_connectors_handler<R>(
    State(state): State<BackendState<R>>,
    headers: HeaderMap,
    Path(server_id): Path<u64>,
    context: Option<Extension<McpBackendRequestContext>>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)>
where
    R: sdkwork_intelligence_mcp_service::McpRepository + Send + Sync,
{
    let tenant_id = resolve_request_tenant_id(context.as_ref(), &headers, state.default_tenant_id);
    Ok(Json(
        list_connectors(state.service.as_ref(), tenant_id, server_id).await?,
    ))
}

async fn upsert_connector_handler<R>(
    State(state): State<BackendState<R>>,
    headers: HeaderMap,
    Path(server_id): Path<u64>,
    context: Option<Extension<McpBackendRequestContext>>,
    Json(body): Json<UpsertConnectorRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)>
where
    R: sdkwork_intelligence_mcp_service::McpRepository + Send + Sync,
{
    let ctx = resolve_write_context(context.as_ref(), &headers, state.default_tenant_id);
    let record = connector_record(
        ctx,
        server_id,
        body.connector_key,
        body.transport,
        body.endpoint_url,
        body.command_ref,
        body.args_json.unwrap_or_else(|| "[]".to_string()),
        body.env_schema_json.unwrap_or_else(|| "{}".to_string()),
        body.auth_type.unwrap_or(McpAuthKind::None),
        body.secret_ref,
        body.timeout_ms.unwrap_or(30_000),
        body.retry_policy_json.unwrap_or_else(|| "{}".to_string()),
        body.publish_status.unwrap_or(McpPublishStatus::Draft),
        body.lifecycle_status.unwrap_or(McpLifecycleStatus::Draft),
    );
    Ok(Json(upsert_connector(state.service.as_ref(), record).await?))
}

async fn delete_connector_handler<R>(
    State(state): State<BackendState<R>>,
    headers: HeaderMap,
    Path((server_id, connector_key)): Path<(u64, String)>,
    context: Option<Extension<McpBackendRequestContext>>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)>
where
    R: sdkwork_intelligence_mcp_service::McpRepository + Send + Sync,
{
    let tenant_id = resolve_request_tenant_id(context.as_ref(), &headers, state.default_tenant_id);
    Ok(Json(
        delete_connector(
            state.service.as_ref(),
            tenant_id,
            server_id,
            connector_key.as_str(),
        )
        .await?,
    ))
}

async fn upsert_tool_handler<R>(
    State(state): State<BackendState<R>>,
    headers: HeaderMap,
    Path(server_id): Path<u64>,
    context: Option<Extension<McpBackendRequestContext>>,
    Json(body): Json<UpsertToolRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)>
where
    R: sdkwork_intelligence_mcp_service::McpRepository + Send + Sync,
{
    let ctx = resolve_write_context(context.as_ref(), &headers, state.default_tenant_id);
    let record = tool_record(
        ctx,
        server_id,
        body.connector_id,
        body.tool_key,
        body.name,
        body.description,
        body.input_schema_json.unwrap_or_else(|| "{}".to_string()),
        body.output_schema_json.unwrap_or_else(|| "{}".to_string()),
        body.risk_level.unwrap_or_else(|| "low".to_string()),
        body.requires_approval.unwrap_or(false),
        body.enabled.unwrap_or(true),
        body.sort_weight.unwrap_or(0),
    );
    Ok(Json(upsert_tool(state.service.as_ref(), record).await?))
}

async fn upsert_resource_handler<R>(
    State(state): State<BackendState<R>>,
    headers: HeaderMap,
    Path(server_id): Path<u64>,
    context: Option<Extension<McpBackendRequestContext>>,
    Json(body): Json<UpsertResourceRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)>
where
    R: sdkwork_intelligence_mcp_service::McpRepository + Send + Sync,
{
    let ctx = resolve_write_context(context.as_ref(), &headers, state.default_tenant_id);
    let record = resource_record(
        ctx,
        server_id,
        body.connector_id,
        body.resource_key,
        body.uri,
        body.name,
        body.description,
        body.mime_type,
        body.enabled.unwrap_or(true),
    );
    Ok(Json(upsert_resource(state.service.as_ref(), record).await?))
}

async fn upsert_prompt_handler<R>(
    State(state): State<BackendState<R>>,
    headers: HeaderMap,
    Path(server_id): Path<u64>,
    context: Option<Extension<McpBackendRequestContext>>,
    Json(body): Json<UpsertPromptRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)>
where
    R: sdkwork_intelligence_mcp_service::McpRepository + Send + Sync,
{
    let ctx = resolve_write_context(context.as_ref(), &headers, state.default_tenant_id);
    let record = prompt_record(
        ctx,
        server_id,
        body.connector_id,
        body.prompt_key,
        body.name,
        body.description,
        body.arguments_schema_json.unwrap_or_else(|| "[]".to_string()),
        body.enabled.unwrap_or(true),
    );
    Ok(Json(upsert_prompt(state.service.as_ref(), record).await?))
}

async fn list_invocations_handler<R>(
    State(state): State<BackendState<R>>,
    headers: HeaderMap,
    Query(query): Query<InvocationQuery>,
    context: Option<Extension<McpBackendRequestContext>>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)>
where
    R: sdkwork_intelligence_mcp_service::McpRepository + Send + Sync,
{
    let tenant_id = resolve_request_tenant_id(context.as_ref(), &headers, state.default_tenant_id);
    Ok(Json(
        list_invocations(
            state.service.as_ref(),
            tenant_id,
            query.server_id,
            query.limit.unwrap_or(100),
        )
        .await?,
    ))
}

async fn append_invocation_handler<R>(
    State(state): State<BackendState<R>>,
    headers: HeaderMap,
    context: Option<Extension<McpBackendRequestContext>>,
    Json(body): Json<AppendInvocationRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)>
where
    R: sdkwork_intelligence_mcp_service::McpRepository + Send + Sync,
{
    let ctx = resolve_write_context(context.as_ref(), &headers, state.default_tenant_id);
    let user_id = context
        .as_ref()
        .and_then(|value| value.0.operator_id)
        .unwrap_or(0);
    let record = invocation_record(
        ctx,
        user_id,
        body.server_id,
        body.connector_id,
        body.invocation_kind,
        body.target_key,
        body.request_id,
        body.trace_id,
        body.idempotency_key,
        body.request_json.unwrap_or_else(|| "{}".to_string()),
        body.response_json,
        body.status.unwrap_or_else(|| "success".to_string()),
        body.error_message,
        body.duration_ms,
    );
    Ok(Json(append_invocation(state.service.as_ref(), record).await?))
}

pub fn build_router<R>(service: Arc<McpService<R>>, default_tenant_id: u64) -> Router
where
    R: sdkwork_intelligence_mcp_service::McpRepository + Clone + Send + Sync + 'static,
{
    router(BackendState {
        service,
        default_tenant_id,
        readiness: None,
    })
}

pub fn build_router_with_readiness<R>(
    service: Arc<McpService<R>>,
    default_tenant_id: u64,
    pool: PgPool,
) -> Router
where
    R: sdkwork_intelligence_mcp_service::McpRepository + Clone + Send + Sync + 'static,
{
    router(BackendState {
        service,
        default_tenant_id,
        readiness: Some(DbReadinessCheck::new(pool)),
    })
}

pub async fn build_router_with_web_framework_from_env<R>(
    service: Arc<McpService<R>>,
    default_tenant_id: u64,
    pool: PgPool,
) -> Router
where
    R: sdkwork_intelligence_mcp_service::McpRepository + Clone + Send + Sync + 'static,
{
    wrap_router_with_web_framework_from_env(build_router_with_readiness(
        service,
        default_tenant_id,
        pool,
    ))
    .await
}

pub fn gateway_route_manifest() -> HttpRouteManifest {
    backend_route_manifest()
}

pub async fn gateway_mount<R>(
    service: Arc<McpService<R>>,
    default_tenant_id: u64,
    pool: PgPool,
) -> Router
where
    R: sdkwork_intelligence_mcp_service::McpRepository + Clone + Send + Sync + 'static,
{
    build_router_with_web_framework_from_env(service, default_tenant_id, pool).await
}
