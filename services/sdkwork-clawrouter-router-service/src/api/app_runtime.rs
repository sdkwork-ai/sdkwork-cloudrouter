use std::collections::VecDeque;
use std::io;
use std::pin::Pin;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use crate::api::app_sql_subject::{map_required_app_sql_subject, RequiredAppSqlScopedSubject};
use axum::body::Body;
use axum::extract::{Path, Query, State};
use axum::http::{header, HeaderMap, HeaderValue, Method, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use base64::{engine::general_purpose, Engine as _};
use bytes::Bytes;
use futures_util::{Stream, StreamExt};
use http_body_util::BodyExt;
use serde::Deserialize;
use serde::Serialize;
use serde_json::{Map, Value};
use tokio::time::sleep;

use crate::api::openai_runtime::resolve_openai_provider_route_plan;
use crate::api::response::{
    json_created_response, json_success_list_response, offset_page_info, parse_offset_list_query,
    problem_from_wire_code, success_envelope,
};
use crate::application::{
    AuthenticatedApiKeyContext, EntityUuidGenerator, InMemoryRuntimeStreamBus,
    ProviderRouteSelector, RuntimeStreamBus, SelectProviderRouteQuery,
};
use crate::domain::{AiModel, BillingMeter, DomainError, GatewayApiKey, RoutingCapability};
use crate::infrastructure::OsApiKeySecretGenerator;
use crate::ports::{
    AppRuntimeArtifactItem, AppRuntimeArtifactList, AppRuntimeEventItem, AppRuntimeEventList,
    AppRuntimeFuture, AppRuntimeGatewayClient, AppRuntimeGatewayRequest, AppRuntimeGatewayResponse,
    AppRuntimeInvocationExecution, AppRuntimeInvocationItem, AppRuntimeInvocationList,
    AppRuntimeInvocationQuery, AppRuntimeStore, AppRuntimeSubject, ChatCompletionRelayRequest,
    ChatCompletionStreamRelay, CompleteAppRuntimeInvocationCommand,
    CreateAppRuntimeArtifactCommand, CreateAppRuntimeEventCommand,
    CreateAppRuntimeInvocationCommand, PricingCatalog,
};

const RUNTIME_EVENTS_FETCH_PAGE_SIZE: i64 = 100;
const MAX_ID_LEN: usize = 128;
const MAX_KIND_LEN: usize = 128;
const MAX_RUNTIME_LEN: usize = 128;
const MAX_ENDPOINT_LEN: usize = 128;
const MAX_MODEL_LEN: usize = 128;
const MAX_PROVIDER_LEN: usize = 128;
const MAX_NAME_LEN: usize = 512;
const MAX_PATH_LEN: usize = 2048;
const MAX_TEXT_LEN: usize = 256 * 1024;
const MAX_ERROR_LEN: usize = 1024;
const MAX_GATEWAY_JSON_BODY_BYTES: usize = 8 * 1024 * 1024;
const MAX_GATEWAY_BINARY_ASSET_BYTES: usize = 64 * 1024 * 1024;
const GATEWAY_EMPTY_ROUTE_SNAPSHOT_RETRY_DELAY: Duration = Duration::from_millis(250);
const GATEWAY_EMPTY_ROUTE_SNAPSHOT_MAX_RETRIES: usize = 20;
const RUNTIME_STREAM_EXECUTION_LEASE_TTL: Duration = Duration::from_secs(30);
const RUNTIME_STREAM_EXECUTION_HEARTBEAT_INTERVAL: Duration = Duration::from_secs(10);
const RUNTIME_STREAM_CANCELLATION_TTL: Duration = Duration::from_secs(60 * 60);
const RUNTIME_STREAM_CANCELLATION_CHECK_INTERVAL: Duration = Duration::from_millis(250);
const RUNTIME_STREAM_TERMINAL_RECHECK_INTERVAL: Duration = Duration::from_secs(10);
const RUNTIME_STREAM_TAIL_WAIT_TIMEOUT: Duration = Duration::from_millis(500);

#[derive(Clone)]
struct AppRuntimeState {
    store: Arc<dyn AppRuntimeStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    executor: Option<Arc<dyn AppRuntimeExecutor + Send + Sync>>,
    stream_bus: Arc<dyn RuntimeStreamBus + Send + Sync>,
    stream_owner_id: String,
}

trait AppRuntimeExecutor {
    fn execute_streaming_invocation<'a>(
        &'a self,
        store: Arc<dyn AppRuntimeStore + Send + Sync>,
        entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
        stream_bus: Arc<dyn RuntimeStreamBus + Send + Sync>,
        subject: AppRuntimeSubject,
        invocation_id: String,
    ) -> AppRuntimeFuture<'a, Response>;
}

struct OpenAiCompatibleRuntimeExecutor<C> {
    catalog: Arc<C>,
    chat_stream_relay: Arc<dyn ChatCompletionStreamRelay + Send + Sync>,
}

struct GatewayRuntimeExecutor<C> {
    catalog: Arc<C>,
    gateway_client: Arc<dyn AppRuntimeGatewayClient + Send + Sync>,
}

type BoxedByteStream = Pin<Box<dyn Stream<Item = Result<Bytes, axum::Error>> + Send>>;

const RUNTIME_SSE_BUFFER_MAX_BYTES: usize = 4 * 1024 * 1024;

struct RuntimeEventSseStreamState {
    provider_stream: BoxedByteStream,
    buffer: String,
    pending: VecDeque<Bytes>,
    done: bool,
    done_sent: bool,
    store: Arc<dyn AppRuntimeStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    stream_bus: Arc<dyn RuntimeStreamBus + Send + Sync>,
    subject: AppRuntimeSubject,
    invocation_id: String,
    event_source: String,
    target_type: Option<String>,
}

struct RuntimeEventTailSseStreamState {
    store: Arc<dyn AppRuntimeStore + Send + Sync>,
    stream_bus: Arc<dyn RuntimeStreamBus + Send + Sync>,
    subject: AppRuntimeSubject,
    invocation_id: String,
    next_event_no: i64,
    pending: VecDeque<AppRuntimeEventItem>,
    follow_execution: bool,
    done_sent: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum RuntimeStreamExecutionOutcome {
    Completed,
    Failed(String),
    Cancelled(String),
}

#[derive(Debug, Clone)]
struct RuntimeStreamTerminalCompletion {
    status: String,
    event_type: String,
    payload_json: Value,
    error_type: Option<String>,
    error_message_masked: Option<String>,
    finish_reason: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum RuntimeStreamExecutionStart {
    Active,
    TerminalAlreadyRecorded,
}

struct RuntimeAuthenticatedApiKey {
    api_key: GatewayApiKey,
    context: AuthenticatedApiKeyContext,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum RuntimeGatewayRouteProbeStatus {
    NotRequired,
    Routable,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct RuntimeGatewayRouteProbeFailure {
    api_key_id: i64,
    group_id: Option<i64>,
    capability_label: Option<&'static str>,
    reason: String,
    inconclusive_empty_route_snapshot: bool,
}

struct RuntimeGatewayRequestPlan {
    request: AppRuntimeGatewayRequest,
    routing_catalog_key: String,
    model: String,
}

#[derive(Debug, Deserialize)]
struct AppRuntimeListQuery {
    #[serde(default)]
    page: Option<i64>,
    #[serde(default)]
    page_size: Option<i64>,
    #[serde(default)]
    after_event_no: Option<i64>,
    conversation_id: Option<String>,
    chat_turn_id: Option<String>,
    agent_session_id: Option<String>,
    runtime: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppRuntimeCreateInvocationRequest {
    invocation_type: Option<String>,
    runtime: Option<String>,
    endpoint: Option<String>,
    status: Option<String>,
    conversation_id: Option<String>,
    chat_turn_id: Option<String>,
    chat_item_id: Option<String>,
    agent_session_id: Option<String>,
    agent_run_id: Option<String>,
    agent_run_step_id: Option<String>,
    trace_id: Option<String>,
    model: Option<String>,
    provider: Option<String>,
    tool_name: Option<String>,
    tool_call_id: Option<String>,
    cwd: Option<String>,
    sandbox_policy: Option<String>,
    approval_policy: Option<String>,
    permission_mode: Option<String>,
    streaming: Option<bool>,
    request_json: Option<Value>,
    metadata: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppRuntimeCompleteInvocationRequest {
    status: Option<String>,
    provider_response_id: Option<String>,
    provider_session_id: Option<String>,
    provider_conversation_id: Option<String>,
    provider_step_id: Option<String>,
    finish_reason: Option<String>,
    latency_ms: Option<i64>,
    ttft_ms: Option<i64>,
    exit_code: Option<i64>,
    error_type: Option<String>,
    error_code: Option<String>,
    error_message_masked: Option<String>,
    response_json: Option<Value>,
    usage_json: Option<Value>,
    metadata: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppRuntimeCreateEventRequest {
    event_type: Option<String>,
    event_source: Option<String>,
    payload_json: Option<Value>,
    text_delta: Option<String>,
    metadata: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppRuntimeCreateArtifactRequest {
    artifact_type: Option<String>,
    name: Option<String>,
    mime_type: Option<String>,
    content_text: Option<String>,
    content_json: Option<Value>,
    resource: Option<Value>,
    storage_key: Option<String>,
    sha256: Option<String>,
    size_bytes: Option<i64>,
    metadata: Option<Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppRuntimeInvocationEnvelope {
    item: AppRuntimeInvocationItem,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppRuntimeEventEnvelope {
    item: AppRuntimeEventItem,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppRuntimeArtifactEnvelope {
    item: AppRuntimeArtifactItem,
}

struct EmptyAppRuntimeStore;

impl AppRuntimeStore for EmptyAppRuntimeStore {
    fn list_invocations<'a>(
        &'a self,
        _subject: AppRuntimeSubject,
        _query: AppRuntimeInvocationQuery,
    ) -> AppRuntimeFuture<'a, AppRuntimeInvocationList> {
        Box::pin(async move {
            Ok(AppRuntimeInvocationList {
                items: Vec::new(),
                total: 0,
                page_no: _query.page.max(1),
                page_size: _query.page_size.max(1),
            })
        })
    }

    fn get_invocation<'a>(
        &'a self,
        _subject: AppRuntimeSubject,
        _invocation_id: String,
    ) -> AppRuntimeFuture<'a, Option<AppRuntimeInvocationItem>> {
        Box::pin(async { Ok(None) })
    }

    fn get_invocation_execution<'a>(
        &'a self,
        _subject: AppRuntimeSubject,
        _invocation_id: String,
    ) -> AppRuntimeFuture<'a, Option<AppRuntimeInvocationExecution>> {
        Box::pin(async { Ok(None) })
    }

    fn create_invocation<'a>(
        &'a self,
        _command: CreateAppRuntimeInvocationCommand,
    ) -> AppRuntimeFuture<'a, AppRuntimeInvocationItem> {
        Box::pin(async {
            Err(DomainError::new(
                "app runtime store is unavailable without database configuration",
            ))
        })
    }

    fn complete_invocation<'a>(
        &'a self,
        _command: CompleteAppRuntimeInvocationCommand,
    ) -> AppRuntimeFuture<'a, AppRuntimeInvocationItem> {
        Box::pin(async {
            Err(DomainError::new(
                "app runtime store is unavailable without database configuration",
            ))
        })
    }

    fn list_events<'a>(
        &'a self,
        _subject: AppRuntimeSubject,
        _invocation_id: String,
        _page: i64,
        _page_size: i64,
    ) -> AppRuntimeFuture<'a, AppRuntimeEventList> {
        Box::pin(async move {
            Ok(AppRuntimeEventList {
                items: Vec::new(),
                total: 0,
                page_no: _page.max(1),
                page_size: _page_size.max(1),
            })
        })
    }

    fn list_events_after<'a>(
        &'a self,
        _subject: AppRuntimeSubject,
        _invocation_id: String,
        _after_event_no: i64,
        _limit: i64,
    ) -> AppRuntimeFuture<'a, AppRuntimeEventList> {
        Box::pin(async move {
            Ok(AppRuntimeEventList {
                items: Vec::new(),
                total: 0,
                page_no: 1,
                page_size: _limit.max(1),
            })
        })
    }

    fn has_terminal_event<'a>(
        &'a self,
        _subject: AppRuntimeSubject,
        _invocation_id: String,
    ) -> AppRuntimeFuture<'a, bool> {
        Box::pin(async { Ok(false) })
    }

    fn get_terminal_event<'a>(
        &'a self,
        _subject: AppRuntimeSubject,
        _invocation_id: String,
    ) -> AppRuntimeFuture<'a, Option<AppRuntimeEventItem>> {
        Box::pin(async { Ok(None) })
    }

    fn create_event<'a>(
        &'a self,
        _command: CreateAppRuntimeEventCommand,
    ) -> AppRuntimeFuture<'a, AppRuntimeEventItem> {
        Box::pin(async {
            Err(DomainError::new(
                "app runtime store is unavailable without database configuration",
            ))
        })
    }

    fn list_artifacts<'a>(
        &'a self,
        _subject: AppRuntimeSubject,
        _invocation_id: String,
        _page: i64,
        _page_size: i64,
    ) -> AppRuntimeFuture<'a, AppRuntimeArtifactList> {
        Box::pin(async move {
            Ok(AppRuntimeArtifactList {
                items: Vec::new(),
                total: 0,
                page_no: _page.max(1),
                page_size: _page_size.max(1),
            })
        })
    }

    fn create_artifact<'a>(
        &'a self,
        _command: CreateAppRuntimeArtifactCommand,
    ) -> AppRuntimeFuture<'a, AppRuntimeArtifactItem> {
        Box::pin(async {
            Err(DomainError::new(
                "app runtime store is unavailable without database configuration",
            ))
        })
    }
}

pub fn app_runtime_router() -> Router {
    app_runtime_router_with_state(
        Arc::new(EmptyAppRuntimeStore),
        Arc::new(OsApiKeySecretGenerator),
        None,
        Arc::new(InMemoryRuntimeStreamBus::default()),
    )
}

pub fn app_runtime_router_with_store(
    store: Arc<dyn AppRuntimeStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    app_runtime_router_with_state(
        store,
        entity_uuid_generator,
        None,
        Arc::new(InMemoryRuntimeStreamBus::default()),
    )
}

pub fn app_runtime_router_with_store_and_runtime_stream_bus(
    store: Arc<dyn AppRuntimeStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    stream_bus: Arc<dyn RuntimeStreamBus + Send + Sync>,
) -> Router {
    app_runtime_router_with_state(store, entity_uuid_generator, None, stream_bus)
}

pub fn app_runtime_router_with_store_and_chat_stream_relay<C>(
    store: Arc<dyn AppRuntimeStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    catalog: Arc<C>,
    chat_stream_relay: Arc<dyn ChatCompletionStreamRelay + Send + Sync>,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let executor: Arc<dyn AppRuntimeExecutor + Send + Sync> =
        Arc::new(OpenAiCompatibleRuntimeExecutor {
            catalog,
            chat_stream_relay,
        });
    app_runtime_router_with_state(
        store,
        entity_uuid_generator,
        Some(executor),
        Arc::new(InMemoryRuntimeStreamBus::default()),
    )
}

pub fn app_runtime_router_with_store_and_chat_stream_relay_and_runtime_stream_bus<C>(
    store: Arc<dyn AppRuntimeStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    catalog: Arc<C>,
    chat_stream_relay: Arc<dyn ChatCompletionStreamRelay + Send + Sync>,
    stream_bus: Arc<dyn RuntimeStreamBus + Send + Sync>,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let executor: Arc<dyn AppRuntimeExecutor + Send + Sync> =
        Arc::new(OpenAiCompatibleRuntimeExecutor {
            catalog,
            chat_stream_relay,
        });
    app_runtime_router_with_state(store, entity_uuid_generator, Some(executor), stream_bus)
}

pub fn app_runtime_router_with_store_and_gateway_client<C>(
    store: Arc<dyn AppRuntimeStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    catalog: Arc<C>,
    gateway_client: Arc<dyn AppRuntimeGatewayClient + Send + Sync>,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let executor: Arc<dyn AppRuntimeExecutor + Send + Sync> = Arc::new(GatewayRuntimeExecutor {
        catalog,
        gateway_client,
    });
    app_runtime_router_with_state(
        store,
        entity_uuid_generator,
        Some(executor),
        Arc::new(InMemoryRuntimeStreamBus::default()),
    )
}

pub fn app_runtime_router_with_store_and_gateway_client_chat_stream_relay<C>(
    store: Arc<dyn AppRuntimeStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    catalog: Arc<C>,
    gateway_client: Arc<dyn AppRuntimeGatewayClient + Send + Sync>,
    _chat_stream_relay: Arc<dyn ChatCompletionStreamRelay + Send + Sync>,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let executor: Arc<dyn AppRuntimeExecutor + Send + Sync> = Arc::new(GatewayRuntimeExecutor {
        catalog,
        gateway_client,
    });
    app_runtime_router_with_state(
        store,
        entity_uuid_generator,
        Some(executor),
        Arc::new(InMemoryRuntimeStreamBus::default()),
    )
}

pub fn app_runtime_router_with_store_and_gateway_client_and_runtime_stream_bus<C>(
    store: Arc<dyn AppRuntimeStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    catalog: Arc<C>,
    gateway_client: Arc<dyn AppRuntimeGatewayClient + Send + Sync>,
    stream_bus: Arc<dyn RuntimeStreamBus + Send + Sync>,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let executor: Arc<dyn AppRuntimeExecutor + Send + Sync> = Arc::new(GatewayRuntimeExecutor {
        catalog,
        gateway_client,
    });
    app_runtime_router_with_state(store, entity_uuid_generator, Some(executor), stream_bus)
}

pub fn app_runtime_router_with_store_and_gateway_client_chat_stream_relay_and_runtime_stream_bus<
    C,
>(
    store: Arc<dyn AppRuntimeStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    catalog: Arc<C>,
    gateway_client: Arc<dyn AppRuntimeGatewayClient + Send + Sync>,
    _chat_stream_relay: Arc<dyn ChatCompletionStreamRelay + Send + Sync>,
    stream_bus: Arc<dyn RuntimeStreamBus + Send + Sync>,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let executor: Arc<dyn AppRuntimeExecutor + Send + Sync> = Arc::new(GatewayRuntimeExecutor {
        catalog,
        gateway_client,
    });
    app_runtime_router_with_state(store, entity_uuid_generator, Some(executor), stream_bus)
}

fn app_runtime_router_with_state(
    store: Arc<dyn AppRuntimeStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    executor: Option<Arc<dyn AppRuntimeExecutor + Send + Sync>>,
    stream_bus: Arc<dyn RuntimeStreamBus + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/app/v3/api/runtime/invocations",
            get(list_invocations).post(create_invocation),
        )
        .route(
            "/app/v3/api/runtime/invocations/{invocation_id}",
            get(get_invocation),
        )
        .route(
            "/app/v3/api/runtime/invocations/{invocation_id}/complete",
            axum::routing::post(complete_invocation),
        )
        .route(
            "/app/v3/api/runtime/invocations/{invocation_id}/events",
            get(list_events).post(create_event),
        )
        .route(
            "/app/v3/api/runtime/invocations/{invocation_id}/events/stream",
            get(stream_events),
        )
        .route(
            "/app/v3/api/runtime/invocations/{invocation_id}/artifacts",
            get(list_artifacts).post(create_artifact),
        )
        .with_state(AppRuntimeState {
            store,
            entity_uuid_generator,
            executor,
            stream_bus,
            stream_owner_id: runtime_stream_owner_id(),
        })
}

async fn list_invocations(
    State(state): State<AppRuntimeState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    _headers: HeaderMap,
    Query(query): Query<AppRuntimeListQuery>,
) -> Response {
    let subject = map_required_app_sql_subject(subject, crate::ports::AppRuntimeSubject::from);
    let query = match normalize_invocation_query(query) {
        Ok(query) => query,
        Err(message) => return bad_request(message),
    };
    match state.store.list_invocations(subject, query).await {
        Ok(list) => json_success_list_response(
            None,
            list.items,
            offset_page_info(list.page_no, list.page_size, list.total),
        ),
        Err(error) => app_runtime_system_response("app runtime invocations are unavailable", error),
    }
}

async fn get_invocation(
    State(state): State<AppRuntimeState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    _headers: HeaderMap,
    Path(invocation_id): Path<String>,
) -> Response {
    let subject = map_required_app_sql_subject(subject, crate::ports::AppRuntimeSubject::from);
    let invocation_id = match normalize_id(&invocation_id, "invocationId") {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    match state.store.get_invocation(subject, invocation_id).await {
        Ok(Some(item)) => Json(success_envelope(item)).into_response(),
        Ok(None) => not_found("runtime invocation was not found"),
        Err(error) => app_runtime_system_response("app runtime invocation is unavailable", error),
    }
}

async fn create_invocation(
    State(state): State<AppRuntimeState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    _headers: HeaderMap,
    Json(request): Json<AppRuntimeCreateInvocationRequest>,
) -> Response {
    let subject = map_required_app_sql_subject(subject, crate::ports::AppRuntimeSubject::from);
    let command = match build_create_invocation_command(&state, subject, request) {
        Ok(command) => command,
        Err(AppRuntimeBuildError::BadRequest(message)) => return bad_request(message),
        Err(AppRuntimeBuildError::System(error)) => {
            return app_runtime_system_response("app runtime invocation command is invalid", error);
        }
    };
    match state.store.create_invocation(command).await {
        Ok(item) => json_created_response(None, AppRuntimeInvocationEnvelope { item }),
        Err(error) if error.is_conflict() => conflict(error.to_string()),
        Err(error) => app_runtime_system_response("app runtime invocation is unavailable", error),
    }
}

async fn complete_invocation(
    State(state): State<AppRuntimeState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    _headers: HeaderMap,
    Path(invocation_id): Path<String>,
    Json(request): Json<AppRuntimeCompleteInvocationRequest>,
) -> Response {
    let subject = map_required_app_sql_subject(subject, crate::ports::AppRuntimeSubject::from);
    let command = match build_complete_invocation_command(&state, subject, invocation_id, request) {
        Ok(command) => command,
        Err(AppRuntimeBuildError::BadRequest(message)) => return bad_request(message),
        Err(AppRuntimeBuildError::System(error)) => {
            return app_runtime_system_response("app runtime completion command is invalid", error);
        }
    };
    if command.status == "cancelled" {
        if let Err(error) =
            request_runtime_stream_cancellation(&state, command.subject, &command.invocation_id)
                .await
        {
            return app_runtime_system_response(
                "app runtime stream cancellation is unavailable",
                error,
            );
        }
        let terminal_event = match first_runtime_terminal_event(
            state.store.as_ref(),
            command.subject,
            &command.invocation_id,
        )
        .await
        {
            Ok(item) => item,
            Err(error) => {
                return app_runtime_system_response(
                    "app runtime terminal event is unavailable",
                    error,
                );
            }
        };
        if let Some(item) = terminal_event {
            if let Some(completion) = runtime_stream_terminal_completion_from_event(&item) {
                match complete_runtime_stream_invocation_from_terminal(
                    state.store.as_ref(),
                    command.subject,
                    &command.invocation_id,
                    completion,
                    command.requested_at.clone(),
                )
                .await
                {
                    Ok(item) => {
                        return Json(success_envelope(AppRuntimeInvocationEnvelope { item }))
                            .into_response();
                    }
                    Err(error) if error.is_not_found() => return not_found(error.to_string()),
                    Err(error) if error.is_conflict() => return conflict(error.to_string()),
                    Err(error) => {
                        return app_runtime_system_response(
                            "app runtime invocation is unavailable",
                            error,
                        );
                    }
                }
            }
        }
    }
    match state.store.complete_invocation(command).await {
        Ok(item) => Json(success_envelope(AppRuntimeInvocationEnvelope { item })).into_response(),
        Err(error) if error.is_not_found() => not_found(error.to_string()),
        Err(error) if error.is_conflict() => conflict(error.to_string()),
        Err(error) => app_runtime_system_response("app runtime invocation is unavailable", error),
    }
}

async fn request_runtime_stream_cancellation(
    state: &AppRuntimeState,
    subject: AppRuntimeSubject,
    invocation_id: &str,
) -> Result<(), DomainError> {
    let reason = "user_requested_stop";
    if let Err(error) = state
        .stream_bus
        .request_cancellation(invocation_id, reason, RUNTIME_STREAM_CANCELLATION_TTL)
        .await
    {
        tracing::warn!(
            invocation_id,
            error = %error,
            "failed to publish runtime stream cancellation signal; database terminal event will remain authoritative"
        );
    }
    record_runtime_stream_cancellation_event_if_needed(
        state.store.as_ref(),
        state.stream_bus.as_ref(),
        state.entity_uuid_generator.as_ref(),
        subject,
        invocation_id,
        reason,
    )
    .await
}

async fn list_events(
    State(state): State<AppRuntimeState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    _headers: HeaderMap,
    Path(invocation_id): Path<String>,
    Query(query): Query<AppRuntimeListQuery>,
) -> Response {
    let subject = map_required_app_sql_subject(subject, crate::ports::AppRuntimeSubject::from);
    let invocation_id = match normalize_id(&invocation_id, "invocationId") {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let pagination = match parse_offset_list_query(query.page, query.page_size) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    match state
        .store
        .list_events(
            subject,
            invocation_id,
            pagination.page_no,
            pagination.page_size,
        )
        .await
    {
        Ok(list) => json_success_list_response(
            None,
            list.items,
            offset_page_info(list.page_no, list.page_size, list.total),
        ),
        Err(error) if error.is_not_found() => not_found(error.to_string()),
        Err(error) => app_runtime_system_response("app runtime events are unavailable", error),
    }
}

async fn stream_events(
    State(state): State<AppRuntimeState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    _headers: HeaderMap,
    Path(invocation_id): Path<String>,
    Query(query): Query<AppRuntimeListQuery>,
) -> Response {
    let subject = map_required_app_sql_subject(subject, crate::ports::AppRuntimeSubject::from);
    let invocation_id = match normalize_id(&invocation_id, "invocationId") {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let next_event_no = normalize_stream_next_event_no(&query);

    let invocation = match state
        .store
        .get_invocation(subject, invocation_id.clone())
        .await
    {
        Ok(item) => item,
        Err(error) if error.is_not_found() => return not_found(error.to_string()),
        Err(error) => {
            return app_runtime_system_response("app runtime invocation is unavailable", error);
        }
    };

    let terminal_event_exists = match state
        .store
        .has_terminal_event(subject, invocation_id.clone())
        .await
    {
        Ok(value) => value,
        Err(error) => {
            return app_runtime_system_response("app runtime event stream is unavailable", error);
        }
    };
    if terminal_event_exists {
        return runtime_event_tail_sse_response(
            state,
            subject,
            invocation_id,
            next_event_no,
            false,
        );
    }

    if let Some(invocation) = invocation.as_ref() {
        if is_terminal_runtime_invocation(invocation) {
            if is_failed_runtime_invocation(invocation) {
                return app_runtime_system_response(
                    "app runtime event stream is unavailable",
                    DomainError::new(runtime_invocation_failed_message(invocation)),
                );
            }
            return runtime_event_tail_sse_response(
                state,
                subject,
                invocation_id,
                next_event_no,
                false,
            );
        }
    }

    if invocation
        .as_ref()
        .is_some_and(is_live_streaming_runtime_invocation)
        && state.executor.is_some()
    {
        let follow_execution = match start_runtime_stream_execution_if_needed(
            state.clone(),
            subject,
            invocation_id.clone(),
        )
        .await
        {
            Ok(RuntimeStreamExecutionStart::Active) => true,
            Ok(RuntimeStreamExecutionStart::TerminalAlreadyRecorded) => false,
            Err(error) => {
                return app_runtime_system_response(
                    "app runtime event stream is unavailable",
                    error,
                );
            }
        };
        return runtime_event_tail_sse_response(
            state,
            subject,
            invocation_id,
            next_event_no,
            follow_execution,
        );
    }

    let events = match list_runtime_events_from_event_no(
        state.store.as_ref(),
        subject,
        &invocation_id,
        next_event_no,
    )
    .await
    {
        Ok(items) => items,
        Err(error) if error.is_not_found() => return not_found(error.to_string()),
        Err(error) => {
            return app_runtime_system_response("app runtime event stream is unavailable", error);
        }
    };

    if !events.is_empty() {
        return runtime_events_sse_response(events);
    }

    execute_or_complete_empty_stream(state, subject, invocation_id).await
}

async fn execute_or_complete_empty_stream(
    state: AppRuntimeState,
    subject: AppRuntimeSubject,
    invocation_id: String,
) -> Response {
    let Some(executor) = state.executor.clone() else {
        return app_runtime_system_response(
            "app runtime event stream is unavailable",
            DomainError::new("OpenAI-compatible runtime stream executor is not configured"),
        );
    };
    match executor
        .execute_streaming_invocation(
            state.store.clone(),
            state.entity_uuid_generator.clone(),
            state.stream_bus.clone(),
            subject,
            invocation_id,
        )
        .await
    {
        Ok(response) => response,
        Err(error) if error.is_not_found() => not_found(error.to_string()),
        Err(error) => app_runtime_system_response("app runtime event stream is unavailable", error),
    }
}

async fn create_event(
    State(state): State<AppRuntimeState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    _headers: HeaderMap,
    Path(invocation_id): Path<String>,
    Json(request): Json<AppRuntimeCreateEventRequest>,
) -> Response {
    let subject = map_required_app_sql_subject(subject, crate::ports::AppRuntimeSubject::from);
    let command = match build_create_event_command(&state, subject, invocation_id, request) {
        Ok(command) => command,
        Err(AppRuntimeBuildError::BadRequest(message)) => return bad_request(message),
        Err(AppRuntimeBuildError::System(error)) => {
            return app_runtime_system_response("app runtime event command is invalid", error);
        }
    };
    match state.store.create_event(command).await {
        Ok(item) => json_created_response(None, AppRuntimeEventEnvelope { item }),
        Err(error) if error.is_not_found() => not_found(error.to_string()),
        Err(error) if error.is_conflict() => conflict(error.to_string()),
        Err(error) => app_runtime_system_response("app runtime event is unavailable", error),
    }
}

async fn list_artifacts(
    State(state): State<AppRuntimeState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    _headers: HeaderMap,
    Path(invocation_id): Path<String>,
    Query(query): Query<AppRuntimeListQuery>,
) -> Response {
    let subject = map_required_app_sql_subject(subject, crate::ports::AppRuntimeSubject::from);
    let invocation_id = match normalize_id(&invocation_id, "invocationId") {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let pagination = match parse_offset_list_query(query.page, query.page_size) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    match state
        .store
        .list_artifacts(
            subject,
            invocation_id,
            pagination.page_no,
            pagination.page_size,
        )
        .await
    {
        Ok(list) => json_success_list_response(
            None,
            list.items,
            offset_page_info(list.page_no, list.page_size, list.total),
        ),
        Err(error) if error.is_not_found() => not_found(error.to_string()),
        Err(error) => app_runtime_system_response("app runtime artifacts are unavailable", error),
    }
}

async fn create_artifact(
    State(state): State<AppRuntimeState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    _headers: HeaderMap,
    Path(invocation_id): Path<String>,
    Json(request): Json<AppRuntimeCreateArtifactRequest>,
) -> Response {
    let subject = map_required_app_sql_subject(subject, crate::ports::AppRuntimeSubject::from);
    let command = match build_create_artifact_command(&state, subject, invocation_id, request) {
        Ok(command) => command,
        Err(AppRuntimeBuildError::BadRequest(message)) => return bad_request(message),
        Err(AppRuntimeBuildError::System(error)) => {
            return app_runtime_system_response("app runtime artifact command is invalid", error);
        }
    };
    match state.store.create_artifact(command).await {
        Ok(item) => json_created_response(None, AppRuntimeArtifactEnvelope { item }),
        Err(error) if error.is_not_found() => not_found(error.to_string()),
        Err(error) if error.is_conflict() => conflict(error.to_string()),
        Err(error) => app_runtime_system_response("app runtime artifact is unavailable", error),
    }
}

fn runtime_events_sse_response(items: Vec<AppRuntimeEventItem>) -> Response {
    let mut body = String::new();
    for item in items {
        match serde_json::to_string(&item) {
            Ok(payload) => {
                body.push_str("data: ");
                body.push_str(&payload);
                body.push_str("\n\n");
            }
            Err(error) => {
                return app_runtime_system_response(
                    "app runtime event stream serialization failed",
                    DomainError::new(error.to_string()),
                );
            }
        }
    }
    body.push_str("data: [DONE]\n\n");

    let mut response = body.into_response();
    let headers = response.headers_mut();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/event-stream"),
    );
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));
    headers.insert("x-accel-buffering", HeaderValue::from_static("no"));
    response
}

fn runtime_event_tail_sse_response(
    state: AppRuntimeState,
    subject: AppRuntimeSubject,
    invocation_id: String,
    next_event_no: i64,
    follow_execution: bool,
) -> Response {
    let stream_state = RuntimeEventTailSseStreamState {
        store: state.store,
        stream_bus: state.stream_bus,
        subject,
        invocation_id,
        next_event_no,
        pending: VecDeque::new(),
        follow_execution,
        done_sent: false,
    };
    let stream = futures_util::stream::unfold(stream_state, next_runtime_tail_sse_chunk);
    let mut response = Body::from_stream(stream).into_response();
    let headers = response.headers_mut();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/event-stream"),
    );
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));
    headers.insert("x-accel-buffering", HeaderValue::from_static("no"));
    response
}

async fn start_runtime_stream_execution_if_needed(
    state: AppRuntimeState,
    subject: AppRuntimeSubject,
    invocation_id: String,
) -> Result<RuntimeStreamExecutionStart, DomainError> {
    let Some(executor) = state.executor.clone() else {
        return Ok(RuntimeStreamExecutionStart::Active);
    };
    let owner_id = state.stream_owner_id.clone();
    let claimed = state
        .stream_bus
        .claim_execution(
            &invocation_id,
            &owner_id,
            RUNTIME_STREAM_EXECUTION_LEASE_TTL,
        )
        .await?;
    if !claimed {
        return Ok(RuntimeStreamExecutionStart::Active);
    }
    match state
        .store
        .has_terminal_event(subject, invocation_id.clone())
        .await
    {
        Ok(true) => {
            if let Err(error) = state
                .stream_bus
                .release_execution(&invocation_id, &owner_id)
                .await
            {
                tracing::warn!(
                    invocation_id = %invocation_id,
                    error = %error,
                    "failed to release runtime stream execution lease after terminal event recheck"
                );
            }
            return Ok(RuntimeStreamExecutionStart::TerminalAlreadyRecorded);
        }
        Ok(false) => {}
        Err(error) => {
            if let Err(release_error) = state
                .stream_bus
                .release_execution(&invocation_id, &owner_id)
                .await
            {
                tracing::warn!(
                    invocation_id = %invocation_id,
                    error = %release_error,
                    "failed to release runtime stream execution lease after terminal event recheck failed"
                );
            }
            return Err(error);
        }
    }
    match state.stream_bus.cancellation_reason(&invocation_id).await {
        Ok(Some(reason)) => {
            let terminal_recorded = record_runtime_stream_terminal_event(
                state.store.as_ref(),
                state.stream_bus.as_ref(),
                state.entity_uuid_generator.as_ref(),
                subject,
                &invocation_id,
                RuntimeStreamExecutionOutcome::Cancelled(reason),
            )
            .await;
            if let Err(error) = state
                .stream_bus
                .release_execution(&invocation_id, &owner_id)
                .await
            {
                tracing::warn!(
                    invocation_id = %invocation_id,
                    error = %error,
                    "failed to release runtime stream execution lease after cancellation precheck"
                );
            }
            terminal_recorded?;
            return Ok(RuntimeStreamExecutionStart::TerminalAlreadyRecorded);
        }
        Ok(None) => {}
        Err(error) => {
            tracing::warn!(
                invocation_id = %invocation_id,
                error = %error,
                "failed to read runtime stream cancellation precheck; continuing with database terminal guard"
            );
        }
    }
    let store = state.store.clone();
    let entity_uuid_generator = state.entity_uuid_generator.clone();
    let stream_bus = state.stream_bus.clone();
    let response = match executor
        .execute_streaming_invocation(
            store.clone(),
            entity_uuid_generator.clone(),
            stream_bus.clone(),
            subject,
            invocation_id.clone(),
        )
        .await
    {
        Ok(response) => response,
        Err(error) => {
            let terminal_recorded = record_runtime_stream_terminal_event(
                store.as_ref(),
                stream_bus.as_ref(),
                entity_uuid_generator.as_ref(),
                subject,
                &invocation_id,
                RuntimeStreamExecutionOutcome::Failed(error.to_string()),
            )
            .await;
            if let Err(release_error) = stream_bus
                .release_execution(&invocation_id, &owner_id)
                .await
            {
                tracing::warn!(
                    invocation_id = %invocation_id,
                    error = %release_error,
                    "failed to release runtime stream execution lease after stream start failure"
                );
            }
            match terminal_recorded {
                Ok(()) => return Ok(RuntimeStreamExecutionStart::TerminalAlreadyRecorded),
                Err(record_error) => {
                    tracing::warn!(
                        invocation_id = %invocation_id,
                        error = %record_error,
                        "failed to persist runtime stream start failure terminal event"
                    );
                }
            }
            return Err(error);
        }
    };

    tokio::spawn(async move {
        let mut heartbeat = tokio::time::interval(RUNTIME_STREAM_EXECUTION_HEARTBEAT_INTERVAL);
        heartbeat.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
        let mut cancellation_check =
            tokio::time::interval(RUNTIME_STREAM_CANCELLATION_CHECK_INTERVAL);
        cancellation_check.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
        let mut terminal_recheck = tokio::time::interval(RUNTIME_STREAM_TERMINAL_RECHECK_INTERVAL);
        terminal_recheck.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
        let drain = drain_runtime_stream_response(response);
        tokio::pin!(drain);
        let outcome = loop {
            tokio::select! {
                result = &mut drain => {
                    break result
                        .map(|_| RuntimeStreamExecutionOutcome::Completed)
                        .unwrap_or_else(|error| RuntimeStreamExecutionOutcome::Failed(error.to_string()));
                }
                _ = heartbeat.tick() => {
                    match stream_bus
                        .renew_execution(
                            &invocation_id,
                            &owner_id,
                            RUNTIME_STREAM_EXECUTION_LEASE_TTL,
                        )
                        .await
                    {
                        Ok(true) => {}
                        Ok(false) => {
                            break RuntimeStreamExecutionOutcome::Failed(
                                "runtime stream execution lease was lost".to_owned(),
                            );
                        }
                        Err(error) => {
                            break RuntimeStreamExecutionOutcome::Failed(error.to_string());
                        }
                    }
                }
                _ = cancellation_check.tick() => {
                    match stream_bus.cancellation_reason(&invocation_id).await {
                        Ok(Some(reason)) => {
                            break RuntimeStreamExecutionOutcome::Cancelled(reason);
                        }
                        Ok(None) => {}
                        Err(error) => {
                            tracing::warn!(
                                invocation_id = %invocation_id,
                                error = %error,
                                "failed to read runtime stream cancellation signal"
                            );
                        }
                    }
                }
                _ = terminal_recheck.tick() => {
                    match store
                        .has_terminal_event(subject, invocation_id.clone())
                        .await
                    {
                        Ok(true) => {
                            break RuntimeStreamExecutionOutcome::Cancelled(
                                "runtime terminal event was recorded".to_owned(),
                            );
                        }
                        Ok(false) => {}
                        Err(error) => {
                            tracing::warn!(
                                invocation_id = %invocation_id,
                                error = %error,
                                "failed to recheck runtime stream terminal event"
                            );
                        }
                    }
                }
            }
        };
        if let Err(error) = record_runtime_stream_terminal_event(
            store.as_ref(),
            stream_bus.as_ref(),
            entity_uuid_generator.as_ref(),
            subject,
            &invocation_id,
            outcome,
        )
        .await
        {
            tracing::warn!(
                invocation_id = %invocation_id,
                error = %error,
                "failed to persist runtime stream terminal event"
            );
        }
        if let Err(error) = stream_bus
            .release_execution(&invocation_id, &owner_id)
            .await
        {
            tracing::warn!(
                invocation_id = %invocation_id,
                error = %error,
                "failed to release runtime stream execution lease"
            );
        }
    });
    Ok(RuntimeStreamExecutionStart::Active)
}

async fn drain_runtime_stream_response(response: Response) -> Result<(), DomainError> {
    if !response.status().is_success() {
        return Err(DomainError::new(format!(
            "runtime stream execution returned HTTP {}",
            response.status()
        )));
    }

    let mut body = response.into_body();
    while let Some(frame) = body.frame().await {
        frame.map_err(|error| {
            DomainError::new(format!("runtime stream execution body failed: {error}"))
        })?;
    }
    Ok(())
}

async fn record_runtime_stream_terminal_event(
    store: &(dyn AppRuntimeStore + Send + Sync),
    stream_bus: &(dyn RuntimeStreamBus + Send + Sync),
    entity_uuid_generator: &(dyn EntityUuidGenerator + Send + Sync),
    subject: AppRuntimeSubject,
    invocation_id: &str,
    outcome: RuntimeStreamExecutionOutcome,
) -> Result<(), DomainError> {
    if store
        .has_terminal_event(subject, invocation_id.to_owned())
        .await?
    {
        if let Some(item) = first_runtime_terminal_event(store, subject, invocation_id).await? {
            publish_runtime_stream_event(stream_bus, invocation_id, &item).await;
            let requested_at = current_timestamp_string();
            if let Some(completion) = runtime_stream_terminal_completion_from_event(&item) {
                complete_runtime_stream_invocation_from_terminal(
                    store,
                    subject,
                    invocation_id,
                    completion,
                    requested_at,
                )
                .await?;
            }
        }
        return Ok(());
    }
    let completion = runtime_stream_terminal_completion_from_outcome(outcome);
    let requested_at = current_timestamp_string();
    let event_uuid = entity_uuid_generator.generate_entity_uuid()?;
    let item = store
        .create_event(CreateAppRuntimeEventCommand {
            subject,
            invocation_id: invocation_id.to_owned(),
            event_uuid: event_uuid.clone(),
            event_type: completion.event_type.clone(),
            event_source: "runtime".to_owned(),
            payload_json: completion.payload_json.clone(),
            text_delta: None,
            metadata: Value::Object(Map::new()),
            requested_at: requested_at.clone(),
        })
        .await?;
    publish_runtime_stream_event(stream_bus, invocation_id, &item).await;
    let completion = if item.id == event_uuid {
        completion
    } else {
        runtime_stream_terminal_completion_from_event(&item).unwrap_or(completion)
    };
    complete_runtime_stream_invocation_from_terminal(
        store,
        subject,
        invocation_id,
        completion,
        requested_at,
    )
    .await?;
    Ok(())
}

async fn first_runtime_terminal_event(
    store: &(dyn AppRuntimeStore + Send + Sync),
    subject: AppRuntimeSubject,
    invocation_id: &str,
) -> Result<Option<AppRuntimeEventItem>, DomainError> {
    store
        .get_terminal_event(subject, invocation_id.to_owned())
        .await
}

async fn complete_runtime_stream_invocation_from_terminal(
    store: &(dyn AppRuntimeStore + Send + Sync),
    subject: AppRuntimeSubject,
    invocation_id: &str,
    completion: RuntimeStreamTerminalCompletion,
    requested_at: String,
) -> Result<AppRuntimeInvocationItem, DomainError> {
    store
        .complete_invocation(CompleteAppRuntimeInvocationCommand {
            subject,
            invocation_id: invocation_id.to_owned(),
            status: completion.status,
            provider_response_id: None,
            provider_session_id: None,
            provider_conversation_id: None,
            provider_step_id: None,
            finish_reason: completion.finish_reason,
            latency_ms: None,
            ttft_ms: None,
            exit_code: None,
            error_type: completion.error_type,
            error_code: None,
            error_message_masked: completion.error_message_masked,
            response_json: Value::Null,
            usage_json: Value::Null,
            metadata: serde_json::json!({ "streaming": true }),
            requested_at,
        })
        .await
}

fn runtime_stream_terminal_completion_from_outcome(
    outcome: RuntimeStreamExecutionOutcome,
) -> RuntimeStreamTerminalCompletion {
    match outcome {
        RuntimeStreamExecutionOutcome::Completed => RuntimeStreamTerminalCompletion {
            status: "completed".to_owned(),
            event_type: "runtime.completed".to_owned(),
            payload_json: serde_json::json!({ "status": "completed" }),
            error_type: None,
            error_message_masked: None,
            finish_reason: None,
        },
        RuntimeStreamExecutionOutcome::Failed(message) => {
            let message = truncate_error_message(&message);
            RuntimeStreamTerminalCompletion {
                status: "failed".to_owned(),
                event_type: "runtime.failed".to_owned(),
                payload_json: serde_json::json!({
                    "status": "failed",
                    "errorMessageMasked": message.clone()
                }),
                error_type: Some("runtime_stream".to_owned()),
                error_message_masked: Some(message),
                finish_reason: None,
            }
        }
        RuntimeStreamExecutionOutcome::Cancelled(reason) => RuntimeStreamTerminalCompletion {
            status: "cancelled".to_owned(),
            event_type: "runtime.cancelled".to_owned(),
            payload_json: serde_json::json!({
                "status": "cancelled",
                "reason": truncate_error_message(&reason)
            }),
            error_type: None,
            error_message_masked: None,
            finish_reason: Some("stop".to_owned()),
        },
    }
}

fn runtime_stream_terminal_completion_from_event(
    item: &AppRuntimeEventItem,
) -> Option<RuntimeStreamTerminalCompletion> {
    match item.event_type.as_str() {
        "runtime.completed" => Some(RuntimeStreamTerminalCompletion {
            status: "completed".to_owned(),
            event_type: item.event_type.clone(),
            payload_json: item.payload_json.clone(),
            error_type: None,
            error_message_masked: None,
            finish_reason: None,
        }),
        "runtime.failed" => {
            let message = item
                .payload_json
                .get("errorMessageMasked")
                .and_then(Value::as_str)
                .map(str::to_owned);
            Some(RuntimeStreamTerminalCompletion {
                status: "failed".to_owned(),
                event_type: item.event_type.clone(),
                payload_json: item.payload_json.clone(),
                error_type: Some("runtime_stream".to_owned()),
                error_message_masked: message,
                finish_reason: None,
            })
        }
        "runtime.cancelled" => Some(RuntimeStreamTerminalCompletion {
            status: "cancelled".to_owned(),
            event_type: item.event_type.clone(),
            payload_json: item.payload_json.clone(),
            error_type: None,
            error_message_masked: None,
            finish_reason: Some("stop".to_owned()),
        }),
        _ => None,
    }
}

async fn record_runtime_stream_cancellation_event_if_needed(
    store: &(dyn AppRuntimeStore + Send + Sync),
    stream_bus: &(dyn RuntimeStreamBus + Send + Sync),
    entity_uuid_generator: &(dyn EntityUuidGenerator + Send + Sync),
    subject: AppRuntimeSubject,
    invocation_id: &str,
    reason: &str,
) -> Result<(), DomainError> {
    if store
        .has_terminal_event(subject, invocation_id.to_owned())
        .await?
    {
        return Ok(());
    }
    let requested_at = current_timestamp_string();
    let item = store
        .create_event(CreateAppRuntimeEventCommand {
            subject,
            invocation_id: invocation_id.to_owned(),
            event_uuid: entity_uuid_generator.generate_entity_uuid()?,
            event_type: "runtime.cancelled".to_owned(),
            event_source: "runtime".to_owned(),
            payload_json: serde_json::json!({
                "status": "cancelled",
                "reason": truncate_error_message(reason)
            }),
            text_delta: None,
            metadata: Value::Object(Map::new()),
            requested_at,
        })
        .await?;
    publish_runtime_stream_event(stream_bus, invocation_id, &item).await;
    Ok(())
}

async fn publish_runtime_stream_event(
    stream_bus: &(dyn RuntimeStreamBus + Send + Sync),
    invocation_id: &str,
    item: &AppRuntimeEventItem,
) {
    if let Err(error) = stream_bus.publish_event(invocation_id, item).await {
        tracing::warn!(
            invocation_id,
            event_no = item.event_no,
            event_type = %item.event_type,
            error = %error,
            "failed to publish runtime stream event; database replay remains authoritative"
        );
    }
}

fn runtime_provider_stream_sse_response(
    store: Arc<dyn AppRuntimeStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    stream_bus: Arc<dyn RuntimeStreamBus + Send + Sync>,
    subject: AppRuntimeSubject,
    invocation_id: String,
    body: Body,
) -> Response {
    let provider_stream = Box::pin(body.into_data_stream().map(|chunk| {
        chunk.map_err(|error| {
            axum::Error::new(io::Error::new(
                io::ErrorKind::Other,
                format!("provider stream body failed: {error}"),
            ))
        })
    }));
    let stream_state = RuntimeEventSseStreamState {
        provider_stream,
        buffer: String::new(),
        pending: VecDeque::new(),
        done: false,
        done_sent: false,
        store,
        entity_uuid_generator,
        stream_bus,
        subject,
        invocation_id,
        event_source: "provider".to_owned(),
        target_type: None,
    };
    let stream = futures_util::stream::unfold(stream_state, next_runtime_sse_chunk);
    let mut response = Body::from_stream(stream).into_response();
    let headers = response.headers_mut();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/event-stream"),
    );
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));
    headers.insert("x-accel-buffering", HeaderValue::from_static("no"));
    response
}

fn runtime_gateway_stream_sse_response(
    store: Arc<dyn AppRuntimeStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    stream_bus: Arc<dyn RuntimeStreamBus + Send + Sync>,
    subject: AppRuntimeSubject,
    invocation_id: String,
    body: Body,
    target_type: Option<String>,
) -> Response {
    let provider_stream = Box::pin(body.into_data_stream().map(|chunk| {
        chunk.map_err(|error| {
            axum::Error::new(io::Error::new(
                io::ErrorKind::Other,
                format!("gateway stream body failed: {error}"),
            ))
        })
    }));
    let stream_state = RuntimeEventSseStreamState {
        provider_stream,
        buffer: String::new(),
        pending: VecDeque::new(),
        done: false,
        done_sent: false,
        store,
        entity_uuid_generator,
        stream_bus,
        subject,
        invocation_id,
        event_source: "gateway".to_owned(),
        target_type,
    };
    let stream = futures_util::stream::unfold(stream_state, next_runtime_sse_chunk);
    let mut response = Body::from_stream(stream).into_response();
    let headers = response.headers_mut();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/event-stream"),
    );
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));
    headers.insert("x-accel-buffering", HeaderValue::from_static("no"));
    response
}

impl<C> AppRuntimeExecutor for GatewayRuntimeExecutor<C>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    fn execute_streaming_invocation<'a>(
        &'a self,
        store: Arc<dyn AppRuntimeStore + Send + Sync>,
        entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
        stream_bus: Arc<dyn RuntimeStreamBus + Send + Sync>,
        subject: AppRuntimeSubject,
        invocation_id: String,
    ) -> AppRuntimeFuture<'a, Response> {
        Box::pin(async move {
            let execution =
                load_runtime_invocation_execution(store.as_ref(), subject, &invocation_id).await?;
            execute_gateway_streaming_invocation(
                self.catalog.as_ref(),
                self.gateway_client.as_ref(),
                store,
                entity_uuid_generator,
                stream_bus,
                subject,
                invocation_id,
                execution,
            )
            .await
        })
    }
}

async fn load_runtime_invocation_execution(
    store: &(dyn AppRuntimeStore + Send + Sync),
    subject: AppRuntimeSubject,
    invocation_id: &str,
) -> Result<AppRuntimeInvocationExecution, DomainError> {
    store
        .get_invocation_execution(subject, invocation_id.to_owned())
        .await?
        .ok_or_else(|| DomainError::not_found("runtime invocation was not found"))
}

async fn execute_gateway_streaming_invocation<C>(
    catalog: &C,
    gateway_client: &(dyn AppRuntimeGatewayClient + Send + Sync),
    store: Arc<dyn AppRuntimeStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    stream_bus: Arc<dyn RuntimeStreamBus + Send + Sync>,
    subject: AppRuntimeSubject,
    invocation_id: String,
    execution: AppRuntimeInvocationExecution,
) -> Result<Response, DomainError>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    if !is_executable_gateway_stream(&execution.item) {
        return Err(DomainError::new(format!(
            "runtime invocation is not executable through the gateway stream: runtime={}, endpoint={}, status={}, streaming={}",
            execution.item.runtime,
            execution.item.endpoint.as_deref().unwrap_or(""),
            execution.item.status,
            execution.item.streaming
        )));
    }
    tracing::info!(
        tenant_id = subject.tenant_id,
        organization_id = subject.organization_id,
        user_id = subject.user_id,
        invocation_id = %invocation_id,
        runtime = %execution.item.runtime,
        endpoint = execution.item.endpoint.as_deref().unwrap_or(""),
        requested_model_key = execution.item.model.as_deref().unwrap_or(""),
        provider = execution.item.provider.as_deref().unwrap_or(""),
        "app runtime gateway stream execution started"
    );
    let authentication = runtime_authenticated_api_key(catalog, subject, &execution)?;
    let copyable_key = authentication
        .api_key
        .copyable_key
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            DomainError::new(
                "runtime copyable gateway API key is unavailable; select or regenerate a copyable gateway API key",
            )
        })?;
    let request_plan = build_runtime_gateway_request(catalog, &execution, copyable_key)?;
    tracing::info!(
        tenant_id = subject.tenant_id,
        organization_id = subject.organization_id,
        user_id = subject.user_id,
        invocation_id = %invocation_id,
        api_key_id = authentication.context.api_key_id,
        group_id = authentication.context.group_id,
        group_code = %authentication.context.group_code,
        pricing_plan_code = %authentication.context.pricing_plan_code,
        method = %request_plan.request.method,
        path = %request_plan.request.path,
        model = %request_plan.model,
        routing_catalog_key = %request_plan.routing_catalog_key,
        "app runtime forwarding request to gateway"
    );
    let response = send_runtime_gateway_request_with_empty_snapshot_retry(
        gateway_client,
        request_plan.request.clone(),
        request_plan.model.as_str(),
    )
    .await?;
    tracing::info!(
        tenant_id = subject.tenant_id,
        organization_id = subject.organization_id,
        user_id = subject.user_id,
        invocation_id = %invocation_id,
        api_key_id = authentication.context.api_key_id,
        group_id = authentication.context.group_id,
        status_code = response.status_code,
        content_type = response.content_type.as_deref().unwrap_or(""),
        "app runtime gateway response received"
    );
    if !(200..300).contains(&response.status_code) {
        return Err(
            gateway_runtime_response_error(response, Some(request_plan.model.as_str())).await,
        );
    }
    let target_type = runtime_request_target_type(&execution.request_json);
    if is_gateway_sse_response(response.content_type.as_deref()) {
        return Ok(runtime_gateway_stream_sse_response(
            store,
            entity_uuid_generator,
            stream_bus,
            subject,
            invocation_id,
            response.body,
            target_type,
        ));
    }
    if is_gateway_binary_asset_response(response.content_type.as_deref()) {
        return runtime_gateway_binary_asset_sse_response(
            store,
            entity_uuid_generator,
            subject,
            invocation_id,
            response.body,
            response.content_type,
            target_type,
        )
        .await;
    }
    runtime_gateway_json_sse_response(
        store,
        entity_uuid_generator,
        subject,
        invocation_id,
        response.body,
        target_type,
    )
    .await
}

fn is_executable_gateway_stream(item: &AppRuntimeInvocationItem) -> bool {
    item.streaming
        && matches!(item.status.as_str(), "pending" | "running" | "streaming")
        && item
            .model
            .as_deref()
            .is_some_and(|model| !model.trim().is_empty())
}

async fn send_runtime_gateway_request_with_empty_snapshot_retry(
    gateway_client: &(dyn AppRuntimeGatewayClient + Send + Sync),
    request: AppRuntimeGatewayRequest,
    model: &str,
) -> Result<AppRuntimeGatewayResponse, DomainError> {
    let mut response = gateway_client.send(request.clone()).await?;
    for retry_attempt in 1..=GATEWAY_EMPTY_ROUTE_SNAPSHOT_MAX_RETRIES {
        if !runtime_gateway_response_can_retry_after_empty_route_snapshot(&response) {
            return Ok(response);
        }

        let error = gateway_runtime_response_error(response, Some(model)).await;
        if !runtime_gateway_error_is_route_snapshot_miss(error.to_string().as_str()) {
            return Err(error);
        }

        tracing::warn!(
            model,
            retry_attempt,
            max_retries = GATEWAY_EMPTY_ROUTE_SNAPSHOT_MAX_RETRIES,
            retry_delay_ms = GATEWAY_EMPTY_ROUTE_SNAPSHOT_RETRY_DELAY.as_millis(),
            "app runtime gateway route snapshot is empty; retrying after catalog refresh grace period"
        );
        sleep(GATEWAY_EMPTY_ROUTE_SNAPSHOT_RETRY_DELAY).await;
        response = gateway_client.send(request.clone()).await?;
    }
    Ok(response)
}

fn runtime_gateway_response_can_retry_after_empty_route_snapshot(
    response: &AppRuntimeGatewayResponse,
) -> bool {
    response.status_code == StatusCode::SERVICE_UNAVAILABLE.as_u16()
        || response.status_code == StatusCode::BAD_GATEWAY.as_u16()
        || response.status_code == StatusCode::INTERNAL_SERVER_ERROR.as_u16()
}

fn runtime_gateway_error_is_route_snapshot_miss(message: &str) -> bool {
    if runtime_gateway_error_code(message).as_deref() == Some("provider_route_snapshot_empty") {
        return true;
    }
    message.contains("provider_route_not_available")
        && message.contains("route diagnostics:")
        && runtime_gateway_route_diagnostic_usize(message, "model_routes_loaded") == Some(0)
        && runtime_gateway_route_diagnostic_usize(message, "channel_routes_loaded") == Some(0)
        && runtime_gateway_route_diagnostic_bool(message, "any_group_bindings") == Some(false)
        && runtime_gateway_route_diagnostic_usize(message, "matching_group_bound_channels")
            == Some(0)
}

fn runtime_gateway_error_code(message: &str) -> Option<String> {
    let json_start = message.find('{')?;
    let payload = serde_json::from_str::<Value>(&message[json_start..]).ok()?;
    payload
        .get("error")
        .and_then(|error| error.get("code"))
        .and_then(Value::as_str)
        .map(str::to_owned)
}

fn runtime_gateway_route_diagnostic_usize(message: &str, key: &str) -> Option<usize> {
    runtime_gateway_route_diagnostic_value(message, key)?
        .parse()
        .ok()
}

fn runtime_gateway_route_diagnostic_bool(message: &str, key: &str) -> Option<bool> {
    runtime_gateway_route_diagnostic_value(message, key)?
        .parse()
        .ok()
}

fn runtime_gateway_route_diagnostic_value<'a>(message: &'a str, key: &str) -> Option<&'a str> {
    let marker = format!("{key}=");
    let start = message.find(&marker)? + marker.len();
    let tail = &message[start..];
    let end = tail
        .find(|ch: char| matches!(ch, ';' | '"' | '\\' | '}' | ','))
        .unwrap_or(tail.len());
    let value = tail[..end].trim();
    (!value.is_empty()).then_some(value)
}

fn build_runtime_gateway_request<C>(
    catalog: &C,
    execution: &AppRuntimeInvocationExecution,
    copyable_key: &str,
) -> Result<RuntimeGatewayRequestPlan, DomainError>
where
    C: PricingCatalog,
{
    let requested_model_key = execution.item.model.as_deref().ok_or_else(|| {
        DomainError::new("runtime invocation model is required for gateway execution")
    })?;
    let catalog_model = find_runtime_catalog_model(catalog, requested_model_key);
    let routing_model = catalog_model
        .as_ref()
        .map(|model| model.catalog_key.trim())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| requested_model_key.trim())
        .to_owned();
    let api = runtime_gateway_api(
        &execution.item,
        catalog_model.as_ref(),
        &execution.request_json,
    );
    let provider_model = runtime_gateway_model_id(requested_model_key, catalog_model.as_ref(), api);
    let mut request = match api {
        RuntimeGatewayApi::OpenAiChatCompletions => AppRuntimeGatewayRequest::new(
            Method::POST,
            "/v1/chat/completions",
            build_runtime_chat_request_body(&provider_model, &execution.request_json)?,
        ),
        RuntimeGatewayApi::OpenAiResponses => AppRuntimeGatewayRequest::new(
            Method::POST,
            "/v1/responses",
            build_runtime_responses_request_body(&provider_model, &execution.request_json)?,
        ),
        RuntimeGatewayApi::OpenAiImageGenerations => AppRuntimeGatewayRequest::new(
            Method::POST,
            "/v1/images/generations",
            build_runtime_image_generation_request_body(&provider_model, &execution.request_json)?,
        ),
        RuntimeGatewayApi::OpenAiImageEdits => {
            build_runtime_image_edit_gateway_request(&provider_model, &execution.request_json)?
        }
        RuntimeGatewayApi::OpenAiAudioSpeech => AppRuntimeGatewayRequest::new(
            Method::POST,
            "/v1/audio/speech",
            build_runtime_openai_audio_speech_request_body(
                &provider_model,
                &execution.request_json,
            )?,
        ),
        RuntimeGatewayApi::SunoMusicGenerations => AppRuntimeGatewayRequest::new(
            Method::POST,
            "/provider/suno/v1/music/generations",
            build_runtime_suno_music_request_body(provider_model.clone(), &execution.request_json)?,
        ),
        RuntimeGatewayApi::ElevenLabsSoundGeneration => {
            build_runtime_elevenlabs_sound_gateway_request(
                provider_model.clone(),
                &execution.request_json,
            )?
        }
        RuntimeGatewayApi::ElevenLabsTextToSpeech => build_runtime_elevenlabs_tts_gateway_request(
            provider_model.clone(),
            &execution.request_json,
        )?,
        RuntimeGatewayApi::AnthropicMessages => AppRuntimeGatewayRequest::new(
            Method::POST,
            "/provider/anthropic/v1/messages",
            build_runtime_anthropic_messages_request_body(
                provider_model.clone(),
                &execution.request_json,
            )?,
        ),
        RuntimeGatewayApi::GeminiGenerateContent => AppRuntimeGatewayRequest::new(
            Method::POST,
            format!(
                "/provider/google/v1beta/models/{}:streamGenerateContent?alt=sse",
                percent_encode_path_segment(&provider_model)
            ),
            build_runtime_gemini_request_body(&execution.request_json)?,
        ),
    };
    request = request.with_header("authorization", format!("Bearer {copyable_key}"));
    if let Some(request_id) = execution
        .item
        .request_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        request = request.with_header("x-request-id", request_id.to_owned());
    }
    if let Some(trace_id) = execution
        .item
        .trace_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        request = request.with_header("x-trace-id", trace_id.to_owned());
    }
    if !request.headers.contains_key("content-type") {
        request = request.with_header("content-type", "application/json");
    }
    Ok(RuntimeGatewayRequestPlan {
        request,
        routing_catalog_key: routing_model.clone(),
        model: routing_model,
    })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum RuntimeGatewayApi {
    OpenAiChatCompletions,
    OpenAiResponses,
    OpenAiImageGenerations,
    OpenAiImageEdits,
    OpenAiAudioSpeech,
    SunoMusicGenerations,
    ElevenLabsSoundGeneration,
    ElevenLabsTextToSpeech,
    AnthropicMessages,
    GeminiGenerateContent,
}

fn runtime_gateway_api(
    item: &AppRuntimeInvocationItem,
    catalog_model: Option<&AiModel>,
    request_json: &Value,
) -> RuntimeGatewayApi {
    let runtime = item.runtime.to_ascii_lowercase();
    let endpoint = item
        .endpoint
        .as_deref()
        .unwrap_or_default()
        .to_ascii_lowercase();
    let provider = item
        .provider
        .as_deref()
        .unwrap_or_default()
        .to_ascii_lowercase();
    let api_format = catalog_model
        .and_then(|model| model.api_format.as_deref())
        .unwrap_or_default()
        .to_ascii_lowercase();
    let vendor = catalog_model
        .map(|model| model.vendor_code.as_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    let signal = format!("{runtime} {endpoint} {provider} {api_format} {vendor}");
    let wants_image = runtime_request_targets_image(request_json) || endpoint.contains("image");
    let wants_audio_asset =
        runtime_request_targets_audio_asset(request_json) || endpoint.contains("audio");
    let is_openai_compatible_chat_stream = runtime == "openai_compatible"
        && matches!(endpoint.as_str(), "chat.stream" | "agent.stream" | "");
    let target_type = runtime_request_target_type(request_json)
        .and_then(|value| normalize_generation_asset_modality(&value));
    if wants_image && (signal.contains("gemini") || signal.contains("google")) {
        RuntimeGatewayApi::GeminiGenerateContent
    } else if wants_image && runtime_request_has_reference_images(request_json) {
        RuntimeGatewayApi::OpenAiImageEdits
    } else if wants_image {
        RuntimeGatewayApi::OpenAiImageGenerations
    } else if wants_audio_asset && (signal.contains("gemini") || signal.contains("google")) {
        RuntimeGatewayApi::GeminiGenerateContent
    } else if wants_audio_asset && signal.contains("suno") {
        RuntimeGatewayApi::SunoMusicGenerations
    } else if wants_audio_asset
        && signal.contains("elevenlabs")
        && target_type.as_deref() == Some("sfx")
    {
        RuntimeGatewayApi::ElevenLabsSoundGeneration
    } else if wants_audio_asset && signal.contains("elevenlabs") {
        RuntimeGatewayApi::ElevenLabsTextToSpeech
    } else if wants_audio_asset {
        RuntimeGatewayApi::OpenAiAudioSpeech
    } else if signal.contains("gemini") || signal.contains("google") {
        RuntimeGatewayApi::GeminiGenerateContent
    } else if signal.contains("anthropic") || signal.contains("claude") {
        RuntimeGatewayApi::AnthropicMessages
    } else if is_openai_compatible_chat_stream {
        RuntimeGatewayApi::OpenAiChatCompletions
    } else if signal.contains("responses")
        || signal.contains("response")
        || signal.contains("codex")
    {
        RuntimeGatewayApi::OpenAiResponses
    } else {
        RuntimeGatewayApi::OpenAiChatCompletions
    }
}

fn find_runtime_catalog_model<C>(catalog: &C, model: &str) -> Option<AiModel>
where
    C: PricingCatalog,
{
    let model = model.trim();
    catalog.find_model(model).or_else(|| {
        catalog
            .list_models(None)
            .into_iter()
            .find(|candidate| candidate.model == model)
    })
}

fn build_runtime_responses_request_body(
    model: &str,
    request_json: &Value,
) -> Result<Value, DomainError> {
    let mut object = request_json
        .as_object()
        .cloned()
        .ok_or_else(|| DomainError::new("runtime requestJson must be an object"))?;
    object.insert("model".to_owned(), Value::String(model.to_owned()));
    object.insert("stream".to_owned(), Value::Bool(false));
    if !object.contains_key("input") {
        let input = object
            .remove("messages")
            .filter(|value| matches!(value, Value::Array(items) if !items.is_empty()))
            .or_else(|| {
                object
                    .get("prompt")
                    .and_then(Value::as_str)
                    .map(str::trim)
                    .filter(|prompt| !prompt.is_empty())
                    .map(|prompt| Value::String(prompt.to_owned()))
            })
            .ok_or_else(|| {
                DomainError::new("runtime requestJson input, messages, or prompt is required")
            })?;
        object.insert("input".to_owned(), input);
    }
    remove_runtime_only_fields(&mut object);
    Ok(Value::Object(object))
}

fn build_runtime_image_generation_request_body(
    model: &str,
    request_json: &Value,
) -> Result<Value, DomainError> {
    let object = request_json
        .as_object()
        .ok_or_else(|| DomainError::new("runtime requestJson must be an object"))?;
    let prompt = runtime_image_prompt(object)?;
    let mut body = Map::new();
    body.insert("model".to_owned(), Value::String(model.to_owned()));
    body.insert("prompt".to_owned(), Value::String(prompt));

    let generation_config = object
        .get("generationConfig")
        .or_else(|| object.get("generation_config"));
    let image_count = image_generation_count(generation_config);
    if image_count > 0 {
        body.insert("n".to_owned(), Value::Number(image_count.into()));
    }
    if let Some(size) = image_generation_size(generation_config) {
        body.insert("size".to_owned(), Value::String(size));
    }
    if let Some(quality) = image_generation_quality(generation_config) {
        body.insert("quality".to_owned(), Value::String(quality));
    }
    if let Some(response_format) = object
        .get("response_format")
        .or_else(|| object.get("responseFormat"))
        .cloned()
    {
        body.insert("response_format".to_owned(), response_format);
    }
    Ok(Value::Object(body))
}

fn build_runtime_openai_audio_speech_request_body(
    model: &str,
    request_json: &Value,
) -> Result<Value, DomainError> {
    let object = request_json
        .as_object()
        .ok_or_else(|| DomainError::new("runtime requestJson must be an object"))?;
    let mut body = Map::new();
    body.insert("model".to_owned(), Value::String(model.to_owned()));
    body.insert(
        "input".to_owned(),
        Value::String(runtime_audio_prompt(object)?),
    );
    body.insert(
        "voice".to_owned(),
        Value::String(runtime_audio_voice(object).unwrap_or_else(|| "alloy".to_owned())),
    );
    body.insert(
        "response_format".to_owned(),
        Value::String(runtime_audio_response_format(object).unwrap_or_else(|| "mp3".to_owned())),
    );
    if let Some(speed) = runtime_audio_speed(object) {
        if let Some(number) = serde_json::Number::from_f64(speed) {
            body.insert("speed".to_owned(), Value::Number(number));
        }
    }
    Ok(Value::Object(body))
}

fn build_runtime_suno_music_request_body(
    model: String,
    request_json: &Value,
) -> Result<Value, DomainError> {
    let object = request_json
        .as_object()
        .ok_or_else(|| DomainError::new("runtime requestJson must be an object"))?;
    let mut body = Map::new();
    body.insert("model".to_owned(), Value::String(model));
    body.insert(
        "prompt".to_owned(),
        Value::String(runtime_audio_prompt(object)?),
    );
    if let Some(duration_seconds) = runtime_audio_duration_seconds(object) {
        body.insert(
            "duration_seconds".to_owned(),
            Value::Number(duration_seconds.into()),
        );
    }
    if let Some(title) = object_string(object, &["title"]) {
        body.insert("title".to_owned(), Value::String(title));
    }
    if let Some(style) = object_string(object, &["style", "genre"]) {
        body.insert("style".to_owned(), Value::String(style));
    }
    if let Some(lyrics) = object_string(object, &["lyrics"]) {
        body.insert("lyrics".to_owned(), Value::String(lyrics));
    }
    Ok(Value::Object(body))
}

fn build_runtime_elevenlabs_sound_request_body(
    model: String,
    request_json: &Value,
) -> Result<Value, DomainError> {
    let object = request_json
        .as_object()
        .ok_or_else(|| DomainError::new("runtime requestJson must be an object"))?;
    let mut body = Map::new();
    body.insert("model_id".to_owned(), Value::String(model));
    body.insert(
        "text".to_owned(),
        Value::String(runtime_audio_prompt(object)?),
    );
    if let Some(duration_seconds) = runtime_audio_duration_seconds(object) {
        body.insert(
            "duration_seconds".to_owned(),
            Value::Number(duration_seconds.into()),
        );
    }
    if let Some(prompt_influence) = runtime_elevenlabs_prompt_influence(object) {
        if let Some(number) = serde_json::Number::from_f64(prompt_influence) {
            body.insert("prompt_influence".to_owned(), Value::Number(number));
        }
    }
    if let Some(loop_enabled) = runtime_elevenlabs_sound_loop(object) {
        body.insert("loop".to_owned(), Value::Bool(loop_enabled));
    }
    Ok(Value::Object(body))
}

fn build_runtime_elevenlabs_sound_gateway_request(
    model: String,
    request_json: &Value,
) -> Result<AppRuntimeGatewayRequest, DomainError> {
    let object = request_json
        .as_object()
        .ok_or_else(|| DomainError::new("runtime requestJson must be an object"))?;
    let path = runtime_elevenlabs_sound_output_format(object)
        .map(|output_format| {
            format!("/provider/elevenlabs/v1/sound-generation?output_format={output_format}")
        })
        .unwrap_or_else(|| "/provider/elevenlabs/v1/sound-generation".to_owned());
    Ok(AppRuntimeGatewayRequest::new(
        Method::POST,
        path,
        build_runtime_elevenlabs_sound_request_body(model, request_json)?,
    ))
}

fn build_runtime_elevenlabs_tts_gateway_request(
    model: String,
    request_json: &Value,
) -> Result<AppRuntimeGatewayRequest, DomainError> {
    let object = request_json
        .as_object()
        .ok_or_else(|| DomainError::new("runtime requestJson must be an object"))?;
    let voice_id = runtime_audio_voice(object).unwrap_or_else(|| "JBFqnCBsd6RMkjVDRZzb".to_owned());
    let response_format = runtime_audio_response_format(object).unwrap_or_else(|| "mp3".to_owned());
    let output_format = elevenlabs_output_format(&response_format);
    let mut body = Map::new();
    body.insert("model_id".to_owned(), Value::String(model));
    body.insert(
        "text".to_owned(),
        Value::String(runtime_audio_prompt(object)?),
    );
    if let Some(speed) = runtime_audio_speed(object) {
        if let Some(number) = serde_json::Number::from_f64(speed) {
            let mut voice_settings = Map::new();
            voice_settings.insert("speed".to_owned(), Value::Number(number));
            body.insert("voice_settings".to_owned(), Value::Object(voice_settings));
        }
    }
    Ok(AppRuntimeGatewayRequest::new(
        Method::POST,
        format!(
            "/provider/elevenlabs/v1/text-to-speech/{}?output_format={}",
            percent_encode_path_segment(&voice_id),
            output_format
        ),
        Value::Object(body),
    ))
}

fn elevenlabs_output_format(response_format: &str) -> &'static str {
    match response_format.trim().to_ascii_lowercase().as_str() {
        "wav" => "wav_44100",
        "pcm" => "pcm_44100",
        "opus" => "opus_48000_128",
        _ => "mp3_44100_128",
    }
}

fn build_runtime_image_edit_gateway_request(
    model: &str,
    request_json: &Value,
) -> Result<AppRuntimeGatewayRequest, DomainError> {
    let object = request_json
        .as_object()
        .ok_or_else(|| DomainError::new("runtime requestJson must be an object"))?;
    let prompt = runtime_image_prompt(object)?;
    let generation_config = object
        .get("generationConfig")
        .or_else(|| object.get("generation_config"));
    let reference_images = runtime_reference_images(object)?;
    let boundary = "sdkwork-claw-runtime-image-edit-boundary";
    let mut multipart = Vec::new();
    push_multipart_text_field(&mut multipart, boundary, "model", model);
    push_multipart_text_field(&mut multipart, boundary, "prompt", &prompt);
    let image_count = image_generation_count(generation_config);
    if image_count > 0 {
        push_multipart_text_field(&mut multipart, boundary, "n", &image_count.to_string());
    }
    if let Some(size) = image_generation_size(generation_config) {
        push_multipart_text_field(&mut multipart, boundary, "size", &size);
    }
    if let Some(quality) = image_generation_quality(generation_config) {
        push_multipart_text_field(&mut multipart, boundary, "quality", &quality);
    }
    if let Some(response_format) = object
        .get("response_format")
        .or_else(|| object.get("responseFormat"))
        .and_then(Value::as_str)
        .and_then(non_empty_string)
    {
        push_multipart_text_field(
            &mut multipart,
            boundary,
            "response_format",
            &response_format,
        );
    }
    for (index, image) in reference_images.iter().enumerate() {
        push_multipart_file_field(
            &mut multipart,
            boundary,
            "image",
            &image.filename(index),
            image.mime_type.as_deref().unwrap_or("image/png"),
            &image.bytes,
        );
    }
    multipart.extend_from_slice(format!("--{boundary}--\r\n").as_bytes());
    Ok(
        AppRuntimeGatewayRequest::new(Method::POST, "/v1/images/edits", Value::Null)
            .with_header(
                "content-type",
                format!("multipart/form-data; boundary={boundary}"),
            )
            .with_raw_body(Bytes::from(multipart)),
    )
}

fn runtime_image_prompt(object: &Map<String, Value>) -> Result<String, DomainError> {
    object
        .get("prompt")
        .and_then(Value::as_str)
        .and_then(non_empty_string)
        .or_else(|| first_user_text_from_messages(object.get("messages")))
        .ok_or_else(|| DomainError::new("runtime requestJson prompt is required"))
}

fn runtime_audio_prompt(object: &Map<String, Value>) -> Result<String, DomainError> {
    object
        .get("prompt")
        .or_else(|| object.get("input"))
        .or_else(|| object.get("text"))
        .and_then(Value::as_str)
        .and_then(non_empty_string)
        .or_else(|| first_user_text_from_messages(object.get("messages")))
        .ok_or_else(|| DomainError::new("runtime audio requestJson prompt is required"))
}

fn runtime_audio_voice(object: &Map<String, Value>) -> Option<String> {
    object_string(object, &["voice"]).or_else(|| {
        generation_config(object)
            .and_then(Value::as_object)
            .and_then(|config| {
                object_string(config, &["voice"]).or_else(|| {
                    runtime_generation_mode_string(
                        config,
                        &["speechMode", "speech_mode", "audioMode", "audio_mode"],
                        &["voice", "voiceName", "voice_name"],
                    )
                })
            })
    })
}

fn runtime_audio_response_format(object: &Map<String, Value>) -> Option<String> {
    let format = object_string(object, &["response_format", "responseFormat", "format"])
        .or_else(|| {
            generation_config(object)
                .and_then(Value::as_object)
                .and_then(|config| {
                    object_string(config, &["response_format", "responseFormat", "format"]).or_else(
                        || {
                            runtime_generation_mode_string(
                                config,
                                &["speechMode", "speech_mode", "audioMode", "audio_mode"],
                                &["response_format", "responseFormat", "format"],
                            )
                        },
                    )
                })
        })?
        .trim()
        .trim_start_matches('.')
        .to_ascii_lowercase();
    match format.as_str() {
        "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm" => Some(format),
        _ => None,
    }
}

fn runtime_audio_speed(object: &Map<String, Value>) -> Option<f64> {
    object
        .get("speed")
        .and_then(value_as_non_negative_f64)
        .or_else(|| {
            generation_config(object)
                .and_then(|config| {
                    config.get("speed").or_else(|| {
                        runtime_generation_mode_value(
                            config,
                            &["speechMode", "speech_mode", "audioMode", "audio_mode"],
                            &["speed"],
                        )
                    })
                })
                .and_then(value_as_non_negative_f64)
        })
        .map(|speed| speed.clamp(0.25, 4.0))
}

fn runtime_generation_mode_value<'a>(
    config: &'a Value,
    mode_keys: &[&str],
    value_keys: &[&str],
) -> Option<&'a Value> {
    let config = config.as_object()?;
    mode_keys
        .iter()
        .find_map(|mode_key| config.get(*mode_key).and_then(Value::as_object))
        .and_then(|mode| value_keys.iter().find_map(|value_key| mode.get(*value_key)))
}

fn runtime_generation_mode_string(
    config: &Map<String, Value>,
    mode_keys: &[&str],
    value_keys: &[&str],
) -> Option<String> {
    mode_keys
        .iter()
        .find_map(|mode_key| config.get(*mode_key).and_then(Value::as_object))
        .and_then(|mode| object_string(mode, value_keys))
}

fn runtime_audio_duration_seconds(object: &Map<String, Value>) -> Option<i64> {
    generation_config(object)
        .and_then(|config| {
            config
                .get("durationSeconds")
                .or_else(|| config.get("duration_seconds"))
                .or_else(|| config.get("duration"))
                .and_then(value_as_non_negative_i64)
        })
        .or_else(|| {
            object
                .get("durationSeconds")
                .or_else(|| object.get("duration_seconds"))
                .or_else(|| object.get("duration"))
                .and_then(value_as_non_negative_i64)
        })
        .filter(|duration| *duration > 0)
        .map(|duration| duration.clamp(1, 600))
}

fn runtime_elevenlabs_prompt_influence(object: &Map<String, Value>) -> Option<f64> {
    object
        .get("promptInfluence")
        .or_else(|| object.get("prompt_influence"))
        .and_then(value_as_non_negative_f64)
        .or_else(|| {
            generation_config(object)
                .and_then(|config| {
                    config
                        .get("promptInfluence")
                        .or_else(|| config.get("prompt_influence"))
                        .or_else(|| {
                            runtime_generation_mode_value(
                                config,
                                &["sfxMode", "sfx_mode", "soundMode", "sound_mode"],
                                &["promptInfluence", "prompt_influence"],
                            )
                        })
                })
                .and_then(value_as_non_negative_f64)
        })
        .map(|value| value.clamp(0.0, 1.0))
}

fn runtime_elevenlabs_sound_loop(object: &Map<String, Value>) -> Option<bool> {
    object.get("loop").and_then(Value::as_bool).or_else(|| {
        generation_config(object)
            .and_then(|config| {
                config.get("loop").or_else(|| {
                    runtime_generation_mode_value(
                        config,
                        &["sfxMode", "sfx_mode", "soundMode", "sound_mode"],
                        &["loop"],
                    )
                })
            })
            .and_then(Value::as_bool)
    })
}

fn runtime_elevenlabs_sound_output_format(object: &Map<String, Value>) -> Option<String> {
    let format = object_string(
        object,
        &[
            "output_format",
            "outputFormat",
            "response_format",
            "responseFormat",
            "format",
        ],
    )
    .or_else(|| {
        generation_config(object)
            .and_then(Value::as_object)
            .and_then(|config| {
                object_string(
                    config,
                    &[
                        "output_format",
                        "outputFormat",
                        "response_format",
                        "responseFormat",
                        "format",
                    ],
                )
                .or_else(|| {
                    runtime_generation_mode_string(
                        config,
                        &["sfxMode", "sfx_mode", "soundMode", "sound_mode"],
                        &[
                            "output_format",
                            "outputFormat",
                            "response_format",
                            "responseFormat",
                            "format",
                        ],
                    )
                })
            })
    })?;
    elevenlabs_sound_output_format(&format)
}

fn elevenlabs_sound_output_format(response_format: &str) -> Option<String> {
    let normalized = response_format
        .trim()
        .trim_start_matches('.')
        .to_ascii_lowercase();
    match normalized.as_str() {
        "mp3" => Some("mp3_44100_128".to_owned()),
        "wav" => Some("wav_48000".to_owned()),
        "mp3_22050_32" | "mp3_44100_32" | "mp3_44100_64" | "mp3_44100_96" | "mp3_44100_128"
        | "mp3_44100_192" | "wav_44100" | "wav_48000" => Some(normalized),
        _ => None,
    }
}

fn generation_config(object: &Map<String, Value>) -> Option<&Value> {
    object
        .get("generationConfig")
        .or_else(|| object.get("generation_config"))
}

struct RuntimeReferenceImage {
    name: Option<String>,
    mime_type: Option<String>,
    bytes: Vec<u8>,
}

impl RuntimeReferenceImage {
    fn filename(&self, index: usize) -> String {
        self.name
            .as_deref()
            .and_then(non_empty_string)
            .unwrap_or_else(|| format!("reference-image-{}.png", index + 1))
    }
}

fn runtime_reference_images(
    object: &Map<String, Value>,
) -> Result<Vec<RuntimeReferenceImage>, DomainError> {
    let Some(value) = object
        .get("referenceImages")
        .or_else(|| object.get("reference_images"))
    else {
        return Ok(Vec::new());
    };
    let Some(items) = value.as_array() else {
        return Err(DomainError::new("runtime referenceImages must be an array"));
    };
    let mut images = Vec::new();
    for item in items {
        let Some(record) = item.as_object() else {
            continue;
        };
        let data_url = object_string(record, &["dataUrl", "data_url"]);
        let url = object_string(record, &["url"]);
        let Some(data_url) = data_url.or(url) else {
            continue;
        };
        let (mime_type, bytes) = decode_runtime_reference_image(&data_url)?;
        images.push(RuntimeReferenceImage {
            name: object_string(record, &["name", "filename", "fileName"]),
            mime_type: object_string(record, &["mimeType", "mime", "contentType"]).or(mime_type),
            bytes,
        });
    }
    if images.is_empty() {
        return Err(DomainError::new(
            "runtime image edit requires at least one usable reference image",
        ));
    }
    Ok(images)
}

fn decode_runtime_reference_image(value: &str) -> Result<(Option<String>, Vec<u8>), DomainError> {
    let value = value.trim();
    if let Some(rest) = value.strip_prefix("data:") {
        let Some((metadata, payload)) = rest.split_once(',') else {
            return Err(DomainError::new(
                "runtime reference image dataUrl is invalid",
            ));
        };
        let mime_type = metadata
            .split(';')
            .next()
            .and_then(non_empty_string)
            .filter(|mime_type| mime_type.contains('/'));
        let is_base64 = metadata
            .split(';')
            .any(|part| part.trim().eq_ignore_ascii_case("base64"));
        if !is_base64 {
            return Err(DomainError::new(
                "runtime reference image dataUrl must be base64 encoded",
            ));
        }
        let bytes = general_purpose::STANDARD
            .decode(payload.trim())
            .map_err(|error| {
                DomainError::new(format!(
                    "runtime reference image dataUrl base64 is invalid: {error}"
                ))
            })?;
        return Ok((mime_type, bytes));
    }
    if value.starts_with("http://") || value.starts_with("https://") {
        return Err(DomainError::new(
            "runtime reference image URLs must be resolved to dataUrl before gateway image edits",
        ));
    }
    Err(DomainError::new(
        "runtime reference image must include a dataUrl or absolute URL",
    ))
}

fn push_multipart_text_field(body: &mut Vec<u8>, boundary: &str, name: &str, value: &str) {
    body.extend_from_slice(format!("--{boundary}\r\n").as_bytes());
    body.extend_from_slice(
        format!("Content-Disposition: form-data; name=\"{name}\"\r\n").as_bytes(),
    );
    body.extend_from_slice(b"\r\n");
    body.extend_from_slice(value.as_bytes());
    body.extend_from_slice(b"\r\n");
}

fn push_multipart_file_field(
    body: &mut Vec<u8>,
    boundary: &str,
    name: &str,
    filename: &str,
    content_type: &str,
    bytes: &[u8],
) {
    let filename = sanitize_multipart_filename(filename);
    body.extend_from_slice(format!("--{boundary}\r\n").as_bytes());
    body.extend_from_slice(
        format!("Content-Disposition: form-data; name=\"{name}\"; filename=\"{filename}\"\r\n")
            .as_bytes(),
    );
    body.extend_from_slice(format!("Content-Type: {content_type}\r\n").as_bytes());
    body.extend_from_slice(b"\r\n");
    body.extend_from_slice(bytes);
    body.extend_from_slice(b"\r\n");
}

fn sanitize_multipart_filename(value: &str) -> String {
    let filename = value
        .chars()
        .map(|ch| match ch {
            '"' | '\r' | '\n' | '\\' => '_',
            ch => ch,
        })
        .collect::<String>();
    non_empty_string(&filename).unwrap_or_else(|| "reference-image.png".to_owned())
}

fn first_user_text_from_messages(messages: Option<&Value>) -> Option<String> {
    let items = messages?.as_array()?;
    for item in items {
        if item.get("role").and_then(Value::as_str) == Some("user") {
            if let Some(text) = message_content_text(item.get("content")) {
                return Some(text);
            }
        }
    }
    items
        .iter()
        .find_map(|item| message_content_text(item.get("content")))
}

fn message_content_text(content: Option<&Value>) -> Option<String> {
    match content? {
        Value::String(text) => non_empty_string(text),
        Value::Array(items) => {
            let text = items
                .iter()
                .filter_map(|item| {
                    item.get("text")
                        .and_then(Value::as_str)
                        .or_else(|| item.get("content").and_then(Value::as_str))
                })
                .map(str::trim)
                .filter(|text| !text.is_empty())
                .collect::<Vec<_>>()
                .join("\n");
            non_empty_string(&text)
        }
        _ => None,
    }
}

fn non_empty_string(value: &str) -> Option<String> {
    let value = value.trim();
    (!value.is_empty()).then(|| value.to_owned())
}

fn image_generation_count(generation_config: Option<&Value>) -> i64 {
    generation_config
        .and_then(|config| {
            config
                .get("imageMode")
                .or_else(|| config.get("image_mode"))
                .and_then(|mode| mode.get("count"))
                .and_then(Value::as_i64)
                .or_else(|| config.get("imageCount").and_then(Value::as_i64))
                .or_else(|| config.get("image_count").and_then(Value::as_i64))
        })
        .unwrap_or(1)
        .clamp(1, 10)
}

fn image_generation_size(generation_config: Option<&Value>) -> Option<String> {
    let aspect_ratio = generation_config
        .and_then(|config| {
            config
                .get("imageMode")
                .or_else(|| config.get("image_mode"))
                .and_then(|mode| {
                    mode.get("aspectRatio")
                        .or_else(|| mode.get("aspect_ratio"))
                        .and_then(Value::as_str)
                })
                .or_else(|| {
                    config
                        .get("aspectRatio")
                        .or_else(|| config.get("aspect_ratio"))
                        .and_then(Value::as_str)
                })
        })
        .unwrap_or("auto")
        .trim()
        .to_ascii_lowercase();
    match aspect_ratio.as_str() {
        "1:1" => Some("1024x1024".to_owned()),
        "16:9" | "21:9" => Some("1536x1024".to_owned()),
        "9:16" | "2:3" | "3:4" => Some("1024x1536".to_owned()),
        "4:3" | "3:2" => Some("1536x1024".to_owned()),
        "auto" | "" => None,
        _ => None,
    }
}

fn image_generation_quality(generation_config: Option<&Value>) -> Option<String> {
    let quality = generation_config
        .and_then(|config| {
            config
                .get("imageMode")
                .or_else(|| config.get("image_mode"))
                .and_then(|mode| mode.get("quality").and_then(Value::as_str))
                .or_else(|| config.get("quality").and_then(Value::as_str))
        })?
        .trim()
        .to_ascii_lowercase();
    match quality.as_str() {
        "2k" | "high" | "hd" => Some("high".to_owned()),
        "1k" | "standard" => Some("standard".to_owned()),
        _ => None,
    }
}

fn build_runtime_anthropic_messages_request_body(
    model: String,
    request_json: &Value,
) -> Result<Value, DomainError> {
    let mut object = request_json
        .as_object()
        .cloned()
        .ok_or_else(|| DomainError::new("runtime requestJson must be an object"))?;
    object.insert("model".to_owned(), Value::String(model));
    object.insert("stream".to_owned(), Value::Bool(true));
    object
        .entry("max_tokens".to_owned())
        .or_insert(Value::Number(4096.into()));
    let messages = object
        .get("messages")
        .filter(|value| matches!(value, Value::Array(items) if !items.is_empty()))
        .cloned()
        .or_else(|| {
            object
                .get("prompt")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|prompt| !prompt.is_empty())
                .map(|prompt| serde_json::json!([{ "role": "user", "content": prompt }]))
        })
        .ok_or_else(|| DomainError::new("runtime requestJson messages or prompt is required"))?;
    object.insert("messages".to_owned(), messages);
    remove_runtime_only_fields(&mut object);
    Ok(Value::Object(object))
}

fn build_runtime_gemini_request_body(request_json: &Value) -> Result<Value, DomainError> {
    let object = request_json
        .as_object()
        .ok_or_else(|| DomainError::new("runtime requestJson must be an object"))?;
    let contents = object
        .get("contents")
        .filter(|value| matches!(value, Value::Array(items) if !items.is_empty()))
        .cloned()
        .or_else(|| {
            object
                .get("messages")
                .and_then(gemini_contents_from_messages)
        })
        .or_else(|| {
            object
                .get("prompt")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|prompt| !prompt.is_empty())
                .map(|prompt| {
                    serde_json::json!([
                        { "role": "user", "parts": [{ "text": prompt }] }
                    ])
                })
        })
        .ok_or_else(|| {
            DomainError::new("runtime requestJson contents, messages, or prompt is required")
        })?;
    let mut body = Map::new();
    body.insert("contents".to_owned(), contents);
    let mut generation_config = object
        .get("generationConfig")
        .or_else(|| object.get("generation_config"))
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    if runtime_request_targets_audio_asset(request_json) {
        apply_gemini_audio_generation_config(object, &mut generation_config);
    }
    if !generation_config.is_empty() {
        body.insert(
            "generationConfig".to_owned(),
            Value::Object(generation_config),
        );
    }
    Ok(Value::Object(body))
}

fn apply_gemini_audio_generation_config(
    request: &Map<String, Value>,
    generation_config: &mut Map<String, Value>,
) {
    generation_config.remove("speechMode");
    generation_config.remove("speech_mode");
    generation_config.remove("audioMode");
    generation_config.remove("audio_mode");
    for runtime_only_field in [
        "aspectRatio",
        "aspect_ratio",
        "durationSeconds",
        "duration_seconds",
        "imageCount",
        "image_count",
        "imageMode",
        "image_mode",
        "quality",
        "responseFormat",
        "response_format",
        "format",
        "speed",
        "syncAudioVideo",
        "sync_audio_video",
        "videoMode",
        "video_mode",
        "voice",
    ] {
        generation_config.remove(runtime_only_field);
    }
    ensure_gemini_response_modality(generation_config, "AUDIO");
    if generation_config.get("speechConfig").is_none()
        && generation_config.get("speech_config").is_none()
    {
        let voice_name = runtime_audio_voice(request).unwrap_or_else(|| "Kore".to_owned());
        generation_config.insert(
            "speechConfig".to_owned(),
            serde_json::json!({
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": voice_name
                    }
                }
            }),
        );
    }
}

fn ensure_gemini_response_modality(generation_config: &mut Map<String, Value>, modality: &str) {
    let modality_value = Value::String(modality.to_owned());
    for key in ["responseModalities", "response_modalities"] {
        if let Some(value) = generation_config.get_mut(key) {
            if let Some(items) = value.as_array_mut() {
                let has_modality = items
                    .iter()
                    .filter_map(Value::as_str)
                    .any(|item| item.eq_ignore_ascii_case(modality));
                if !has_modality {
                    items.push(modality_value.clone());
                }
            }
            return;
        }
    }
    generation_config.insert(
        "responseModalities".to_owned(),
        Value::Array(vec![modality_value]),
    );
}

fn gemini_contents_from_messages(messages: &Value) -> Option<Value> {
    let items = messages.as_array()?;
    if items.is_empty() {
        return None;
    }
    let mut contents = Vec::with_capacity(items.len());
    for item in items {
        let role = item
            .get("role")
            .and_then(Value::as_str)
            .map(gemini_role)
            .unwrap_or("user");
        let parts = gemini_parts_from_message_content(item.get("content"))?;
        contents.push(serde_json::json!({
            "role": role,
            "parts": parts
        }));
    }
    Some(Value::Array(contents))
}

fn gemini_role(role: &str) -> &'static str {
    if role.eq_ignore_ascii_case("assistant") || role.eq_ignore_ascii_case("model") {
        "model"
    } else {
        "user"
    }
}

fn gemini_parts_from_message_content(content: Option<&Value>) -> Option<Value> {
    match content? {
        Value::String(text) if !text.trim().is_empty() => {
            Some(serde_json::json!([{ "text": text }]))
        }
        Value::Array(items) => {
            let parts = items
                .iter()
                .filter_map(|item| {
                    item.get("text")
                        .and_then(Value::as_str)
                        .filter(|text| !text.trim().is_empty())
                        .map(|text| serde_json::json!({ "text": text }))
                })
                .collect::<Vec<_>>();
            (!parts.is_empty()).then(|| Value::Array(parts))
        }
        _ => None,
    }
}

fn runtime_gateway_model_id(
    requested_model_key: &str,
    catalog_model: Option<&AiModel>,
    api: RuntimeGatewayApi,
) -> String {
    match api {
        RuntimeGatewayApi::OpenAiChatCompletions => {
            openai_chat_gateway_model_id(requested_model_key, catalog_model)
        }
        RuntimeGatewayApi::OpenAiResponses
        | RuntimeGatewayApi::OpenAiImageGenerations
        | RuntimeGatewayApi::OpenAiImageEdits
        | RuntimeGatewayApi::OpenAiAudioSpeech => requested_model_key.trim().to_owned(),
        RuntimeGatewayApi::SunoMusicGenerations
        | RuntimeGatewayApi::ElevenLabsSoundGeneration
        | RuntimeGatewayApi::ElevenLabsTextToSpeech
        | RuntimeGatewayApi::AnthropicMessages
        | RuntimeGatewayApi::GeminiGenerateContent => {
            provider_native_model_id(requested_model_key, catalog_model)
        }
    }
}

fn openai_chat_gateway_model_id(
    requested_model_key: &str,
    catalog_model: Option<&AiModel>,
) -> String {
    let api_format = catalog_model
        .and_then(|model| model.api_format.as_deref())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if api_format.contains("responses") || api_format.contains("response") {
        return requested_model_key.trim().to_owned();
    }
    let vendor_code = catalog_model
        .map(|model| model.vendor_code.as_str())
        .or_else(|| requested_model_key.split('/').next())
        .unwrap_or_default();
    if vendor_code.eq_ignore_ascii_case("openai") {
        return provider_native_model_id(requested_model_key, catalog_model);
    }
    requested_model_key.trim().to_owned()
}

fn provider_native_model_id(requested_model_key: &str, catalog_model: Option<&AiModel>) -> String {
    catalog_model
        .map(|model| runtime_provider_native_model_id(&model.model))
        .filter(|model| !model.is_empty())
        .unwrap_or_else(|| runtime_provider_native_model_id(requested_model_key))
}

fn runtime_provider_native_model_id(model_key: &str) -> String {
    crate::domain::provider_native_model_id(model_key.trim())
}

fn remove_runtime_only_fields(object: &mut Map<String, Value>) {
    for runtime_only_field in [
        "routeKeyId",
        "route_key_id",
        "selectedModel",
        "selected_model",
        "generationConfig",
        "generation_config",
        "referenceImages",
        "reference_images",
        "targetType",
        "target_type",
        "prompt",
        "streamOptions",
        "stream_options",
    ] {
        object.remove(runtime_only_field);
    }
}

fn runtime_request_targets_image(request_json: &Value) -> bool {
    runtime_request_target_type(request_json)
        .as_deref()
        .is_some_and(|target_type| target_type.eq_ignore_ascii_case("image"))
}

fn runtime_request_targets_audio_asset(request_json: &Value) -> bool {
    runtime_request_target_type(request_json)
        .as_deref()
        .and_then(normalize_generation_asset_modality)
        .is_some_and(|target_type| matches!(target_type.as_str(), "audio" | "music" | "sfx"))
}

fn runtime_request_has_reference_images(request_json: &Value) -> bool {
    request_json
        .get("referenceImages")
        .or_else(|| request_json.get("reference_images"))
        .and_then(Value::as_array)
        .is_some_and(|items| !items.is_empty())
}

fn runtime_request_target_type(request_json: &Value) -> Option<String> {
    request_json
        .get("targetType")
        .or_else(|| request_json.get("target_type"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

fn is_gateway_sse_response(content_type: Option<&str>) -> bool {
    content_type
        .unwrap_or_default()
        .to_ascii_lowercase()
        .contains("text/event-stream")
}

fn is_gateway_binary_asset_response(content_type: Option<&str>) -> bool {
    let content_type = content_type
        .unwrap_or_default()
        .split(';')
        .next()
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase();
    content_type.starts_with("audio/")
        || content_type.starts_with("video/")
        || content_type.starts_with("image/")
}

fn normalize_content_type(value: &str) -> Option<String> {
    let mime_type = value
        .split(';')
        .next()
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase();
    (mime_type.contains('/')).then_some(mime_type)
}

fn default_mime_type_for_target_type(target_type: Option<&str>) -> Option<String> {
    match target_type
        .and_then(normalize_generation_asset_modality)
        .as_deref()
    {
        Some("image") => Some("image/png".to_owned()),
        Some("video") => Some("video/mp4".to_owned()),
        Some("audio" | "music" | "sfx") => Some("audio/mpeg".to_owned()),
        _ => None,
    }
}

async fn gateway_runtime_response_error(
    response: AppRuntimeGatewayResponse,
    model: Option<&str>,
) -> DomainError {
    let status_code = response.status_code;
    let body = collect_body_text(response.body)
        .await
        .unwrap_or_else(|error| error.to_string());
    let body = body.trim();
    let model = model.map(str::trim).filter(|model| !model.is_empty());
    let model_detail = model
        .map(|model| format!(" for model={model}"))
        .unwrap_or_default();
    let detail = if body.is_empty() {
        String::new()
    } else {
        format!(": {}", truncate_error_message(body))
    };
    DomainError::new(format!(
        "gateway runtime stream returned HTTP {status_code}{model_detail}{detail}"
    ))
}

async fn runtime_gateway_json_sse_response(
    store: Arc<dyn AppRuntimeStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    subject: AppRuntimeSubject,
    invocation_id: String,
    body: Body,
    target_type: Option<String>,
) -> Result<Response, DomainError> {
    let body = collect_body_text(body).await?;
    let payload = serde_json::from_str::<Value>(&body).map_err(|error| {
        DomainError::new(format!("gateway runtime JSON response is invalid: {error}"))
    })?;
    let usage = runtime_event_usage_payload(&payload);
    let mut body = String::new();
    for asset in extract_generation_assets(&payload, target_type.as_deref()) {
        let event_uuid = entity_uuid_generator.generate_entity_uuid()?;
        let item = store
            .create_event(CreateAppRuntimeEventCommand {
                subject,
                invocation_id: invocation_id.clone(),
                event_uuid,
                event_type: "generation.asset".to_owned(),
                event_source: "generation".to_owned(),
                payload_json: serde_json::json!({
                    "assets": [asset.clone()],
                    "usage": usage.clone(),
                    "gatewayResponse": payload.clone()
                }),
                text_delta: None,
                metadata: Value::Object(Map::new()),
                requested_at: current_timestamp_string(),
            })
            .await?;
        let event_bytes = runtime_event_sse_bytes(&item)?;
        body.push_str(std::str::from_utf8(&event_bytes).map_err(|error| {
            DomainError::new(format!(
                "runtime event SSE bytes are invalid UTF-8: {error}"
            ))
        })?);
    }
    for delta in extract_stream_text_deltas(&payload) {
        if delta.is_empty() {
            continue;
        }
        let event_uuid = entity_uuid_generator.generate_entity_uuid()?;
        let item = store
            .create_event(CreateAppRuntimeEventCommand {
                subject,
                invocation_id: invocation_id.clone(),
                event_uuid,
                event_type: "response.output_text.delta".to_owned(),
                event_source: "gateway".to_owned(),
                payload_json: serde_json::json!({
                    "delta": delta.clone(),
                    "gatewayResponse": payload.clone()
                }),
                text_delta: Some(delta),
                metadata: Value::Object(Map::new()),
                requested_at: current_timestamp_string(),
            })
            .await?;
        let event_bytes = runtime_event_sse_bytes(&item)?;
        body.push_str(std::str::from_utf8(&event_bytes).map_err(|error| {
            DomainError::new(format!(
                "runtime event SSE bytes are invalid UTF-8: {error}"
            ))
        })?);
    }
    body.push_str("data: [DONE]\n\n");
    let mut response = body.into_response();
    let headers = response.headers_mut();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/event-stream"),
    );
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));
    headers.insert("x-accel-buffering", HeaderValue::from_static("no"));
    Ok(response)
}

async fn runtime_gateway_binary_asset_sse_response(
    store: Arc<dyn AppRuntimeStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    subject: AppRuntimeSubject,
    invocation_id: String,
    body: Body,
    content_type: Option<String>,
    target_type: Option<String>,
) -> Result<Response, DomainError> {
    let bytes = axum::body::to_bytes(body, MAX_GATEWAY_BINARY_ASSET_BYTES)
        .await
        .map_err(|error| {
            DomainError::new(format!("gateway runtime binary asset body failed: {error}"))
        })?;
    let mime_type = content_type
        .as_deref()
        .and_then(normalize_content_type)
        .unwrap_or_else(|| {
            default_mime_type_for_target_type(target_type.as_deref())
                .unwrap_or_else(|| "application/octet-stream".to_owned())
        });
    let modality = modality_from_mime_type(Some(&mime_type), target_type.as_deref())
        .or_else(|| {
            target_type
                .as_deref()
                .and_then(normalize_generation_asset_modality)
        })
        .unwrap_or_else(|| "audio".to_owned());
    let asset = generation_asset_event_value(
        format!(
            "data:{mime_type};base64,{}",
            general_purpose::STANDARD.encode(bytes.as_ref())
        ),
        modality,
        Some(mime_type.clone()),
        None,
        None,
    );
    let event_uuid = entity_uuid_generator.generate_entity_uuid()?;
    let item = store
        .create_event(CreateAppRuntimeEventCommand {
            subject,
            invocation_id,
            event_uuid,
            event_type: "generation.asset".to_owned(),
            event_source: "generation".to_owned(),
            payload_json: serde_json::json!({
                "assets": [asset],
                "usage": Value::Null,
                "gatewayResponse": {
                    "contentType": content_type,
                    "bodyEncoding": "base64",
                    "byteLength": bytes.len()
                }
            }),
            text_delta: None,
            metadata: Value::Object(Map::new()),
            requested_at: current_timestamp_string(),
        })
        .await?;
    let mut response_body = String::new();
    let event_bytes = runtime_event_sse_bytes(&item)?;
    response_body.push_str(std::str::from_utf8(&event_bytes).map_err(|error| {
        DomainError::new(format!(
            "runtime event SSE bytes are invalid UTF-8: {error}"
        ))
    })?);
    response_body.push_str("data: [DONE]\n\n");
    let mut response = response_body.into_response();
    let headers = response.headers_mut();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/event-stream"),
    );
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));
    headers.insert("x-accel-buffering", HeaderValue::from_static("no"));
    Ok(response)
}

async fn collect_body_text(body: Body) -> Result<String, DomainError> {
    let bytes = axum::body::to_bytes(body, MAX_GATEWAY_JSON_BODY_BYTES)
        .await
        .map_err(|error| {
            DomainError::new(format!("gateway runtime response body failed: {error}"))
        })?;
    String::from_utf8(bytes.to_vec()).map_err(|error| {
        DomainError::new(format!(
            "gateway runtime response body must be UTF-8 text: {error}"
        ))
    })
}

fn truncate_error_message(value: &str) -> String {
    let mut truncated = value.chars().take(MAX_ERROR_LEN).collect::<String>();
    if value.chars().count() > MAX_ERROR_LEN {
        truncated.push_str("...");
    }
    truncated
}

fn percent_encode_path_segment(value: &str) -> String {
    let mut encoded = String::with_capacity(value.len());
    for byte in value.as_bytes() {
        match *byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(*byte as char)
            }
            byte => encoded.push_str(&format!("%{byte:02X}")),
        }
    }
    encoded
}

async fn execute_openai_compatible_streaming_invocation<C>(
    catalog: &C,
    chat_stream_relay: &(dyn ChatCompletionStreamRelay + Send + Sync),
    store: Arc<dyn AppRuntimeStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    stream_bus: Arc<dyn RuntimeStreamBus + Send + Sync>,
    subject: AppRuntimeSubject,
    invocation_id: String,
    execution: AppRuntimeInvocationExecution,
) -> Result<Response, DomainError>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    if !is_executable_openai_compatible_stream(&execution.item) {
        return Err(DomainError::new(format!(
            "runtime invocation is not executable as an OpenAI-compatible stream: runtime={}, endpoint={}, status={}, streaming={}",
            execution.item.runtime,
            execution.item.endpoint.as_deref().unwrap_or(""),
            execution.item.status,
            execution.item.streaming
        )));
    }
    let context = runtime_authenticated_context(catalog, subject, &execution)?;
    let model = execution.item.model.as_deref().ok_or_else(|| {
        DomainError::new("runtime invocation model is required for stream execution")
    })?;
    let route_plan = resolve_openai_provider_route_plan(
        catalog,
        &context,
        model,
        &["chat"],
        "chat",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    )
    .map_err(openai_route_response_error)?;
    let route = route_plan
        .first_route()
        .ok_or_else(|| DomainError::new("resolved route plan contains no routes"))?;
    let request_body = build_runtime_chat_request_body(model, &execution.request_json)?;
    let response = chat_stream_relay
        .create_chat_completion_stream(ChatCompletionRelayRequest {
            api_key_id: context.api_key_id,
            tenant_id: context.tenant_id,
            organization_id: context.organization_id,
            user_id: context.user_id,
            group_id: context.group_id,
            group_code: context.group_code.clone(),
            pricing_plan_code: context.pricing_plan_code.clone(),
            model: model.to_owned(),
            provider_code: route.provider_code.clone(),
            provider_channel_id: route.channel_id,
            provider_region_code: route.region_code.clone(),
            provider_model: route.provider_model.clone(),
            provider_base_url: route.provider_base_url.clone(),
            provider_secret_ref: route.provider_secret_ref.clone(),
            provider_auth_profile: route.provider_auth_profile.clone(),
            provider_timeout_ms: route.provider_timeout_ms,
            provider_retry_policy: route.provider_retry_policy.clone(),
            request_body,
        })
        .await?;
    if !(200..300).contains(&response.status_code) {
        return Err(DomainError::new(format!(
            "provider stream relay returned HTTP {}",
            response.status_code
        )));
    }
    Ok(runtime_provider_stream_sse_response(
        store,
        entity_uuid_generator,
        stream_bus,
        subject,
        invocation_id,
        response.body,
    ))
}

impl<C> AppRuntimeExecutor for OpenAiCompatibleRuntimeExecutor<C>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    fn execute_streaming_invocation<'a>(
        &'a self,
        store: Arc<dyn AppRuntimeStore + Send + Sync>,
        entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
        stream_bus: Arc<dyn RuntimeStreamBus + Send + Sync>,
        subject: AppRuntimeSubject,
        invocation_id: String,
    ) -> AppRuntimeFuture<'a, Response> {
        Box::pin(async move {
            let execution =
                load_runtime_invocation_execution(store.as_ref(), subject, &invocation_id).await?;
            execute_openai_compatible_streaming_invocation(
                self.catalog.as_ref(),
                self.chat_stream_relay.as_ref(),
                store,
                entity_uuid_generator,
                stream_bus,
                subject,
                invocation_id,
                execution,
            )
            .await
        })
    }
}

fn is_executable_openai_compatible_stream(item: &AppRuntimeInvocationItem) -> bool {
    item.streaming
        && item.runtime == "openai_compatible"
        && matches!(item.status.as_str(), "pending" | "running" | "streaming")
        && matches!(
            item.endpoint.as_deref(),
            Some("chat.stream") | Some("agent.stream") | None
        )
}

fn runtime_authenticated_context<C>(
    catalog: &C,
    subject: AppRuntimeSubject,
    execution: &AppRuntimeInvocationExecution,
) -> Result<AuthenticatedApiKeyContext, DomainError>
where
    C: PricingCatalog,
{
    runtime_authenticated_api_key(catalog, subject, execution)
        .map(|authentication| authentication.context)
}

fn runtime_authenticated_api_key<C>(
    catalog: &C,
    subject: AppRuntimeSubject,
    execution: &AppRuntimeInvocationExecution,
) -> Result<RuntimeAuthenticatedApiKey, DomainError>
where
    C: PricingCatalog,
{
    let api_key = select_runtime_api_key(catalog, subject, execution)?;
    if api_key.tenant_id != subject.tenant_id
        || api_key.organization_id != subject.organization_id
        || api_key.user_id != subject.user_id
    {
        return Err(DomainError::new(
            "runtime route API key does not belong to scoped subject",
        ));
    }
    if api_key.status_code != 1 {
        return Err(DomainError::new("runtime route API key is disabled"));
    }
    let group = catalog
        .find_channel_group(api_key.group_id)
        .ok_or_else(|| DomainError::new("runtime route channel group is not available"))?;
    let context = AuthenticatedApiKeyContext {
        api_key_id: api_key.id,
        tenant_id: api_key.tenant_id,
        organization_id: api_key.organization_id,
        user_id: api_key.user_id,
        api_key_name_snapshot: api_key.display_name(),
        group_id: group.id,
        group_code: group.code,
        pricing_plan_code: group.pricing_plan_code,
    };
    Ok(RuntimeAuthenticatedApiKey { api_key, context })
}

fn select_runtime_api_key(
    catalog: &impl PricingCatalog,
    subject: AppRuntimeSubject,
    execution: &AppRuntimeInvocationExecution,
) -> Result<GatewayApiKey, DomainError> {
    let requested_model_key = runtime_execution_requested_model_key_label(execution);
    if let Some(api_key_id) = runtime_request_route_key_id(execution) {
        let api_key = catalog.find_api_key(api_key_id).ok_or_else(|| {
            DomainError::new(format!("runtime route API key was not found: {api_key_id}"))
        })?;
        if runtime_api_key_belongs_to_subject(&api_key, subject) {
            match runtime_api_key_gateway_route_probe(catalog, subject, execution, &api_key) {
                Ok(status) => {
                    tracing::info!(
                        tenant_id = subject.tenant_id,
                        organization_id = subject.organization_id,
                        user_id = subject.user_id,
                        requested_model_key = %requested_model_key,
                        route_key_id = api_key.id,
                        api_key_id = api_key.id,
                        group_id = api_key.group_id,
                        route_probe_required = matches!(status, RuntimeGatewayRouteProbeStatus::Routable),
                        "app runtime gateway API key selected from request"
                    );
                }
                Err(failure) => {
                    if failure.inconclusive_empty_route_snapshot {
                        tracing::warn!(
                            tenant_id = subject.tenant_id,
                            organization_id = subject.organization_id,
                            user_id = subject.user_id,
                            requested_model_key = %requested_model_key,
                            route_key_id = api_key.id,
                            api_key_id = api_key.id,
                            group_id = api_key.group_id,
                            error = %failure.reason,
                            "app runtime route probe has an empty local route snapshot; deferring route validation to gateway"
                        );
                        return Ok(api_key);
                    }
                    return Err(runtime_api_key_cannot_route_error(
                        execution,
                        Some(api_key.id),
                        Some(&failure),
                    ));
                }
            }
        }
        return Ok(api_key);
    }

    let candidates = catalog
        .list_api_keys()
        .into_iter()
        .filter(|api_key| api_key.tenant_id == subject.tenant_id)
        .filter(|api_key| api_key.organization_id == subject.organization_id)
        .filter(|api_key| api_key.user_id == subject.user_id)
        .filter(|api_key| api_key.status_code == 1)
        .collect::<Vec<_>>();
    if candidates.is_empty() {
        return Err(DomainError::new("runtime route API key is required"));
    }
    let mut route_capable_candidates = Vec::new();
    let mut probe_inconclusive_candidates = Vec::new();
    let mut first_probe_failure = None;
    for api_key in &candidates {
        match runtime_api_key_gateway_route_probe(catalog, subject, execution, api_key) {
            Ok(_) => route_capable_candidates.push(api_key.clone()),
            Err(failure) => {
                if failure.inconclusive_empty_route_snapshot {
                    probe_inconclusive_candidates.push(api_key.clone());
                }
                first_probe_failure.get_or_insert(failure);
            }
        }
    }
    tracing::info!(
        tenant_id = subject.tenant_id,
        organization_id = subject.organization_id,
        user_id = subject.user_id,
        requested_model_key = %requested_model_key,
        candidate_count = candidates.len(),
        route_capable_candidate_count = route_capable_candidates.len(),
        first_probe_error = first_probe_failure
            .as_ref()
            .map(|failure| failure.reason.as_str())
            .unwrap_or(""),
        route_probe_inconclusive_candidate_count = probe_inconclusive_candidates.len(),
        "app runtime gateway API key candidates evaluated"
    );
    if !route_capable_candidates.is_empty() {
        if let Some(api_key) = route_capable_candidates
            .iter()
            .find(|api_key| api_key.default_for_runtime)
            .cloned()
        {
            tracing::info!(
                tenant_id = subject.tenant_id,
                organization_id = subject.organization_id,
                user_id = subject.user_id,
                requested_model_key = %requested_model_key,
                api_key_id = api_key.id,
                group_id = api_key.group_id,
                default_for_runtime = api_key.default_for_runtime,
                "app runtime gateway API key selected"
            );
            return Ok(api_key);
        }
        let api_key = lowest_api_key_id_candidate(&route_capable_candidates);
        tracing::info!(
            tenant_id = subject.tenant_id,
            organization_id = subject.organization_id,
            user_id = subject.user_id,
            requested_model_key = %requested_model_key,
            api_key_id = api_key.id,
            group_id = api_key.group_id,
            default_for_runtime = api_key.default_for_runtime,
            "app runtime gateway API key selected"
        );
        return Ok(api_key);
    }
    if !probe_inconclusive_candidates.is_empty() {
        if let Some(api_key) = probe_inconclusive_candidates
            .iter()
            .find(|api_key| api_key.default_for_runtime)
            .cloned()
        {
            tracing::warn!(
                tenant_id = subject.tenant_id,
                organization_id = subject.organization_id,
                user_id = subject.user_id,
                requested_model_key = %requested_model_key,
                api_key_id = api_key.id,
                group_id = api_key.group_id,
                default_for_runtime = api_key.default_for_runtime,
                "app runtime selected default gateway API key after inconclusive empty local route snapshot probe"
            );
            return Ok(api_key);
        }
        let api_key = lowest_api_key_id_candidate(&probe_inconclusive_candidates);
        tracing::warn!(
            tenant_id = subject.tenant_id,
            organization_id = subject.organization_id,
            user_id = subject.user_id,
            requested_model_key = %requested_model_key,
            api_key_id = api_key.id,
            group_id = api_key.group_id,
            default_for_runtime = api_key.default_for_runtime,
            "app runtime selected gateway API key after inconclusive empty local route snapshot probe"
        );
        return Ok(api_key);
    }
    if runtime_gateway_route_probe_required(catalog, execution) {
        return Err(runtime_api_key_cannot_route_error(
            execution,
            None,
            first_probe_failure.as_ref(),
        ));
    }
    if let Some(api_key) = candidates
        .iter()
        .find(|api_key| api_key.default_for_runtime)
        .cloned()
    {
        tracing::info!(
            tenant_id = subject.tenant_id,
            organization_id = subject.organization_id,
            user_id = subject.user_id,
            requested_model_key = %requested_model_key,
            api_key_id = api_key.id,
            group_id = api_key.group_id,
            default_for_runtime = api_key.default_for_runtime,
            "app runtime gateway API key selected without route probe"
        );
        return Ok(api_key);
    }
    let api_key = lowest_api_key_id_candidate(&candidates);
    tracing::info!(
        tenant_id = subject.tenant_id,
        organization_id = subject.organization_id,
        user_id = subject.user_id,
        requested_model_key = %requested_model_key,
        api_key_id = api_key.id,
        group_id = api_key.group_id,
        default_for_runtime = api_key.default_for_runtime,
        "app runtime gateway API key selected without route probe"
    );
    Ok(api_key)
}

fn runtime_api_key_belongs_to_subject(api_key: &GatewayApiKey, subject: AppRuntimeSubject) -> bool {
    api_key.tenant_id == subject.tenant_id
        && api_key.organization_id == subject.organization_id
        && api_key.user_id == subject.user_id
        && api_key.status_code == 1
}

fn runtime_request_route_key_id(execution: &AppRuntimeInvocationExecution) -> Option<i64> {
    execution
        .request_json
        .get("routeKeyId")
        .and_then(Value::as_i64)
        .or_else(|| {
            execution
                .request_json
                .get("route_key_id")
                .and_then(Value::as_i64)
        })
        .filter(|api_key_id| *api_key_id > 0)
}

fn runtime_api_key_gateway_route_probe<C>(
    catalog: &C,
    subject: AppRuntimeSubject,
    execution: &AppRuntimeInvocationExecution,
    api_key: &GatewayApiKey,
) -> Result<RuntimeGatewayRouteProbeStatus, RuntimeGatewayRouteProbeFailure>
where
    C: PricingCatalog,
{
    let Some(requested_model_key) = execution
        .item
        .model
        .as_deref()
        .map(str::trim)
        .filter(|model| !model.is_empty())
    else {
        return Ok(RuntimeGatewayRouteProbeStatus::NotRequired);
    };
    let catalog_model = find_runtime_catalog_model(catalog, requested_model_key);
    let Some((accepted_capabilities, capability_label, capability, billing_meter)) =
        runtime_openai_route_probe(
            &execution.item,
            catalog_model.as_ref(),
            &execution.request_json,
        )
    else {
        tracing::debug!(
            tenant_id = subject.tenant_id,
            organization_id = subject.organization_id,
            user_id = subject.user_id,
            api_key_id = api_key.id,
            group_id = api_key.group_id,
            requested_model_key,
            "app runtime gateway route probe is not required for request"
        );
        return Ok(RuntimeGatewayRouteProbeStatus::NotRequired);
    };
    let catalog_model = catalog_model.ok_or_else(|| {
        runtime_gateway_route_probe_failure(
            api_key,
            None,
            Some(capability_label),
            format!("model is not available: {requested_model_key}"),
            false,
        )
    })?;
    if !runtime_model_supports_capability(&catalog_model, accepted_capabilities) {
        let failure = runtime_gateway_route_probe_failure(
            api_key,
            None,
            Some(capability_label),
            format!(
                "model does not support {capability_label}: {}",
                catalog_model.model
            ),
            false,
        );
        tracing::warn!(
            tenant_id = subject.tenant_id,
            organization_id = subject.organization_id,
            user_id = subject.user_id,
            api_key_id = api_key.id,
            group_id = api_key.group_id,
            requested_model_key,
            capability = capability_label,
            error = %failure.reason,
            "app runtime gateway route probe failed"
        );
        return Err(failure);
    }
    let Some(group) = catalog.find_channel_group(api_key.group_id) else {
        let failure = runtime_gateway_route_probe_failure(
            api_key,
            None,
            Some(capability_label),
            format!(
                "runtime route channel group is not available: {}",
                api_key.group_id
            ),
            false,
        );
        tracing::warn!(
            tenant_id = subject.tenant_id,
            organization_id = subject.organization_id,
            user_id = subject.user_id,
            api_key_id = api_key.id,
            group_id = api_key.group_id,
            requested_model_key,
            capability = capability_label,
            error = %failure.reason,
            "app runtime gateway route probe failed"
        );
        return Err(failure);
    };
    let context = AuthenticatedApiKeyContext {
        api_key_id: api_key.id,
        tenant_id: subject.tenant_id,
        organization_id: subject.organization_id,
        user_id: subject.user_id,
        api_key_name_snapshot: api_key.display_name(),
        group_id: group.id,
        group_code: group.code,
        pricing_plan_code: group.pricing_plan_code,
    };
    let routing_catalog_key =
        runtime_route_scope_catalog_key(requested_model_key, catalog_model.catalog_key.as_str());
    match ProviderRouteSelector::new(catalog).select_plan(SelectProviderRouteQuery {
        context,
        catalog_key: routing_catalog_key.clone(),
        requested_model: requested_model_key.to_owned(),
        api_code: runtime_openai_route_probe_api_code(capability_label).to_owned(),
        capability,
        billing_meter,
    }) {
        Ok(plan) => {
            tracing::info!(
                tenant_id = subject.tenant_id,
                organization_id = subject.organization_id,
                user_id = subject.user_id,
                api_key_id = api_key.id,
                group_id = api_key.group_id,
                requested_model_key,
                routing_catalog_key,
                capability = capability_label,
                route_count = plan.routes.len(),
                "app runtime gateway route probe succeeded"
            );
            Ok(RuntimeGatewayRouteProbeStatus::Routable)
        }
        Err(error) => {
            let empty_route_snapshot =
                runtime_route_probe_has_empty_route_snapshot(catalog, &routing_catalog_key);
            let failure = runtime_gateway_route_probe_failure(
                api_key,
                Some(api_key.group_id),
                Some(capability_label),
                error.to_string(),
                empty_route_snapshot,
            );
            tracing::warn!(
                tenant_id = subject.tenant_id,
                organization_id = subject.organization_id,
                user_id = subject.user_id,
                api_key_id = api_key.id,
                group_id = api_key.group_id,
                requested_model_key,
                routing_catalog_key,
                capability = capability_label,
                error = %failure.reason,
                "app runtime gateway route probe failed"
            );
            Err(failure)
        }
    }
}

fn runtime_openai_route_probe_api_code(capability_label: &str) -> &'static str {
    match capability_label {
        "responses" | "response" => "openai.responses",
        "embeddings" | "embedding" => "openai.embeddings",
        _ => "openai.chat_completions",
    }
}

fn runtime_gateway_route_probe_required<C>(
    catalog: &C,
    execution: &AppRuntimeInvocationExecution,
) -> bool
where
    C: PricingCatalog,
{
    let Some(requested_model_key) = execution
        .item
        .model
        .as_deref()
        .map(str::trim)
        .filter(|model| !model.is_empty())
    else {
        return false;
    };
    let catalog_model = find_runtime_catalog_model(catalog, requested_model_key);
    runtime_openai_route_probe(
        &execution.item,
        catalog_model.as_ref(),
        &execution.request_json,
    )
    .is_some()
}

fn runtime_api_key_cannot_route_error(
    execution: &AppRuntimeInvocationExecution,
    api_key_id: Option<i64>,
    failure: Option<&RuntimeGatewayRouteProbeFailure>,
) -> DomainError {
    let requested_model_key = execution
        .item
        .model
        .as_deref()
        .map(str::trim)
        .filter(|model| !model.is_empty())
        .unwrap_or("<missing>");
    let selected_key = api_key_id
        .map(|id| format!(" selected_api_key_id={id};"))
        .unwrap_or_default();
    let probe_failure = failure
        .map(|failure| {
            let group_id = failure
                .group_id
                .map(|group_id| group_id.to_string())
                .unwrap_or_else(|| "<unknown>".to_owned());
            let capability = failure.capability_label.unwrap_or("<unknown>");
            format!(
                " route_probe_error=api_key_id={}, group_id={}, capability={}, reason={};",
                failure.api_key_id, group_id, capability, failure.reason
            )
        })
        .unwrap_or_default();
    DomainError::new(format!(
        "runtime route API key cannot route requested model: {requested_model_key};{selected_key}{probe_failure} verify the channel group is bound to an active channel account in the channel route and has a valid pricing plan"
    ))
}

fn runtime_gateway_route_probe_failure(
    api_key: &GatewayApiKey,
    group_id: Option<i64>,
    capability_label: Option<&'static str>,
    reason: String,
    inconclusive_empty_route_snapshot: bool,
) -> RuntimeGatewayRouteProbeFailure {
    RuntimeGatewayRouteProbeFailure {
        api_key_id: api_key.id,
        group_id,
        capability_label,
        reason,
        inconclusive_empty_route_snapshot,
    }
}

fn runtime_route_probe_has_empty_route_snapshot<C>(catalog: &C, catalog_key: &str) -> bool
where
    C: PricingCatalog,
{
    catalog.list_provider_channel_routes().is_empty()
        && catalog.list_provider_routes(catalog_key).is_empty()
}

fn runtime_execution_requested_model_key_label(
    execution: &AppRuntimeInvocationExecution,
) -> String {
    execution
        .item
        .model
        .as_deref()
        .map(str::trim)
        .filter(|model| !model.is_empty())
        .unwrap_or("<missing>")
        .to_owned()
}

fn runtime_model_supports_capability(model: &AiModel, accepted_capabilities: &[&str]) -> bool {
    model.capabilities.iter().any(|capability| {
        let normalized = capability.trim().to_ascii_lowercase();
        accepted_capabilities
            .iter()
            .any(|accepted| normalized == *accepted)
    })
}

fn runtime_route_scope_catalog_key(requested_model: &str, model_catalog_key: &str) -> String {
    if requested_model.trim() == model_catalog_key.trim() {
        requested_model.trim().to_owned()
    } else {
        model_catalog_key.to_owned()
    }
}

fn runtime_openai_route_probe(
    item: &AppRuntimeInvocationItem,
    catalog_model: Option<&AiModel>,
    request_json: &Value,
) -> Option<(
    &'static [&'static str],
    &'static str,
    RoutingCapability,
    BillingMeter,
)> {
    match runtime_gateway_api(item, catalog_model, request_json) {
        RuntimeGatewayApi::OpenAiChatCompletions => Some((
            &["chat"],
            "chat",
            RoutingCapability::Chat,
            BillingMeter::LlmInputToken,
        )),
        RuntimeGatewayApi::OpenAiResponses => Some((
            &["response", "responses"],
            "responses",
            RoutingCapability::Chat,
            BillingMeter::LlmInputToken,
        )),
        _ => None,
    }
}

fn lowest_api_key_id_candidate(candidates: &[GatewayApiKey]) -> GatewayApiKey {
    candidates
        .iter()
        .min_by_key(|api_key| api_key.id)
        .cloned()
        .expect("gateway API key candidate set must not be empty")
}

fn runtime_stream_owner_id() -> String {
    let mut bytes = [0_u8; 8];
    let nonce = if getrandom::fill(&mut bytes).is_ok() {
        u64::from_ne_bytes(bytes)
    } else {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_nanos() as u64)
            .unwrap_or(0)
    };
    format!("pid-{}-{nonce:016x}", std::process::id())
}

fn build_runtime_chat_request_body(
    model: &str,
    request_json: &Value,
) -> Result<Value, DomainError> {
    let mut object = request_json
        .as_object()
        .cloned()
        .ok_or_else(|| DomainError::new("runtime requestJson must be an object"))?;
    object.insert("model".to_owned(), Value::String(model.to_owned()));
    object.insert("stream".to_owned(), Value::Bool(true));

    let messages = object
        .get("messages")
        .filter(|value| matches!(value, Value::Array(items) if !items.is_empty()))
        .cloned()
        .or_else(|| {
            object
                .get("prompt")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|prompt| !prompt.is_empty())
                .map(|prompt| serde_json::json!([{ "role": "user", "content": prompt }]))
        })
        .ok_or_else(|| DomainError::new("runtime requestJson messages or prompt is required"))?;
    object.insert("messages".to_owned(), messages);

    if let Some(stream_options) = object.remove("streamOptions") {
        object.insert("stream_options".to_owned(), stream_options);
    }
    let stream_options = object
        .entry("stream_options".to_owned())
        .or_insert_with(|| Value::Object(Map::new()));
    if !stream_options.is_object() {
        *stream_options = Value::Object(Map::new());
    }
    stream_options
        .as_object_mut()
        .expect("stream_options is normalized to an object")
        .entry("include_usage".to_owned())
        .or_insert(Value::Bool(true));

    for runtime_only_field in [
        "routeKeyId",
        "route_key_id",
        "selectedModel",
        "selected_model",
        "generationConfig",
        "generation_config",
        "referenceImages",
        "reference_images",
        "targetType",
        "target_type",
        "prompt",
    ] {
        object.remove(runtime_only_field);
    }
    Ok(Value::Object(object))
}

async fn persist_provider_sse_event(
    store: &(dyn AppRuntimeStore + Send + Sync),
    entity_uuid_generator: &(dyn EntityUuidGenerator + Send + Sync),
    stream_bus: &(dyn RuntimeStreamBus + Send + Sync),
    subject: AppRuntimeSubject,
    invocation_id: &str,
    event_source: &str,
    target_type: Option<&str>,
    event: &str,
    pending: &mut VecDeque<Bytes>,
) -> Result<bool, DomainError> {
    let data = event
        .lines()
        .filter_map(|line| line.strip_prefix("data:"))
        .map(str::trim_start)
        .collect::<Vec<_>>()
        .join("\n");
    if data.trim().is_empty() {
        return Ok(false);
    }
    if data.trim() == "[DONE]" {
        return Ok(true);
    }
    let payload = serde_json::from_str::<Value>(&data).map_err(|error| {
        DomainError::new(format!("provider stream event JSON is invalid: {error}"))
    })?;
    let usage = runtime_event_usage_payload(&payload);
    let mut emitted_event_with_usage = false;
    for asset in extract_generation_assets(&payload, target_type) {
        let event_uuid = entity_uuid_generator.generate_entity_uuid()?;
        let source_payload_key = if event_source == "gateway" {
            "gatewayEvent"
        } else {
            "providerEvent"
        };
        let mut payload_json = Map::new();
        payload_json.insert("assets".to_owned(), Value::Array(vec![asset.clone()]));
        payload_json.insert("usage".to_owned(), usage.clone());
        payload_json.insert(source_payload_key.to_owned(), payload.clone());
        if has_runtime_usage_payload(&usage) {
            emitted_event_with_usage = true;
        }
        let item = store
            .create_event(CreateAppRuntimeEventCommand {
                subject,
                invocation_id: invocation_id.to_owned(),
                event_uuid,
                event_type: "generation.asset".to_owned(),
                event_source: "generation".to_owned(),
                payload_json: Value::Object(payload_json),
                text_delta: None,
                metadata: Value::Object(Map::new()),
                requested_at: current_timestamp_string(),
            })
            .await?;
        publish_runtime_stream_event(stream_bus, invocation_id, &item).await;
        pending.push_back(runtime_event_sse_bytes(&item)?);
    }
    for delta in extract_stream_text_deltas(&payload) {
        if delta.is_empty() {
            continue;
        }
        let event_uuid = entity_uuid_generator.generate_entity_uuid()?;
        let mut payload_json = Map::new();
        payload_json.insert("delta".to_owned(), Value::String(delta.clone()));
        payload_json.insert("usage".to_owned(), usage.clone());
        payload_json.insert("providerEvent".to_owned(), payload.clone());
        if has_runtime_usage_payload(&usage) {
            emitted_event_with_usage = true;
        }
        let item = store
            .create_event(CreateAppRuntimeEventCommand {
                subject,
                invocation_id: invocation_id.to_owned(),
                event_uuid,
                event_type: "response.output_text.delta".to_owned(),
                event_source: event_source.to_owned(),
                payload_json: Value::Object(payload_json),
                text_delta: Some(delta),
                metadata: Value::Object(Map::new()),
                requested_at: current_timestamp_string(),
            })
            .await?;
        publish_runtime_stream_event(stream_bus, invocation_id, &item).await;
        pending.push_back(runtime_event_sse_bytes(&item)?);
    }
    if has_runtime_usage_payload(&usage) && !emitted_event_with_usage {
        let event_uuid = entity_uuid_generator.generate_entity_uuid()?;
        let source_payload_key = if event_source == "gateway" {
            "gatewayEvent"
        } else {
            "providerEvent"
        };
        let mut payload_json = Map::new();
        payload_json.insert("usage".to_owned(), usage);
        payload_json.insert(source_payload_key.to_owned(), payload);
        let item = store
            .create_event(CreateAppRuntimeEventCommand {
                subject,
                invocation_id: invocation_id.to_owned(),
                event_uuid,
                event_type: "runtime.usage".to_owned(),
                event_source: event_source.to_owned(),
                payload_json: Value::Object(payload_json),
                text_delta: None,
                metadata: Value::Object(Map::new()),
                requested_at: current_timestamp_string(),
            })
            .await?;
        publish_runtime_stream_event(stream_bus, invocation_id, &item).await;
        pending.push_back(runtime_event_sse_bytes(&item)?);
    }
    Ok(false)
}

fn runtime_event_sse_bytes(item: &AppRuntimeEventItem) -> Result<Bytes, DomainError> {
    let payload = serde_json::to_string(item).map_err(|error| {
        DomainError::new(format!("runtime event serialization failed: {error}"))
    })?;
    Ok(Bytes::from(format!("data: {payload}\n\n")))
}

fn runtime_event_usage_payload(payload: &Value) -> Value {
    find_runtime_event_usage_payload(payload, 0).unwrap_or(Value::Null)
}

fn has_runtime_usage_payload(value: &Value) -> bool {
    value.as_object().is_some_and(|object| !object.is_empty())
}

fn find_runtime_event_usage_payload(value: &Value, depth: usize) -> Option<Value> {
    if depth > 6 {
        return None;
    }
    let object = value.as_object()?;
    if let Some(usage) = normalize_runtime_usage_object(object) {
        return Some(usage);
    }
    for key in [
        "usage",
        "usageJson",
        "usage_json",
        "tokenUsage",
        "token_usage",
        "metrics",
        "usageMetadata",
        "usage_metadata",
        "gatewayResponse",
        "gatewayEvent",
        "providerEvent",
        "providerResponse",
        "payload",
        "data",
        "result",
        "output",
        "response",
    ] {
        if let Some(usage) = object
            .get(key)
            .and_then(|value| find_runtime_event_usage_payload(value, depth + 1))
        {
            return Some(usage);
        }
    }
    None
}

fn normalize_runtime_usage_object(object: &Map<String, Value>) -> Option<Value> {
    let input_tokens = runtime_usage_i64(
        object,
        &[
            "inputTokens",
            "input_tokens",
            "promptTokens",
            "prompt_tokens",
            "promptTokenCount",
            "prompt_token_count",
        ],
    );
    let output_tokens = runtime_usage_i64(
        object,
        &[
            "outputTokens",
            "output_tokens",
            "completionTokens",
            "completion_tokens",
            "candidatesTokenCount",
            "candidates_token_count",
        ],
    );
    let cached_tokens = runtime_usage_i64(object, &["cachedTokens", "cached_tokens"])
        .or_else(|| {
            nested_runtime_usage_i64(
                object.get("promptTokensDetails"),
                &["cachedTokens", "cached_tokens"],
            )
        })
        .or_else(|| {
            nested_runtime_usage_i64(
                object.get("prompt_tokens_details"),
                &["cachedTokens", "cached_tokens"],
            )
        });
    let total_tokens = runtime_usage_i64(
        object,
        &[
            "totalTokens",
            "total_tokens",
            "totalTokenCount",
            "total_token_count",
        ],
    )
    .or_else(|| {
        if input_tokens.is_some() || output_tokens.is_some() || cached_tokens.is_some() {
            Some(
                input_tokens.unwrap_or(0) + output_tokens.unwrap_or(0) + cached_tokens.unwrap_or(0),
            )
        } else {
            None
        }
    });
    if input_tokens.is_none()
        && output_tokens.is_none()
        && cached_tokens.is_none()
        && total_tokens.is_none()
    {
        return None;
    }
    let mut usage = Map::new();
    insert_optional_i64(&mut usage, "input_tokens", input_tokens);
    insert_optional_i64(&mut usage, "output_tokens", output_tokens);
    insert_optional_i64(&mut usage, "cached_tokens", cached_tokens);
    insert_optional_i64(&mut usage, "total_tokens", total_tokens);
    Some(Value::Object(usage))
}

fn runtime_usage_i64(object: &Map<String, Value>, keys: &[&str]) -> Option<i64> {
    keys.iter()
        .find_map(|key| object.get(*key).and_then(value_as_non_negative_i64))
}

fn nested_runtime_usage_i64(value: Option<&Value>, keys: &[&str]) -> Option<i64> {
    value
        .and_then(Value::as_object)
        .and_then(|object| runtime_usage_i64(object, keys))
}

fn insert_optional_i64(object: &mut Map<String, Value>, key: &str, value: Option<i64>) {
    if let Some(value) = value {
        object.insert(key.to_owned(), Value::Number(value.into()));
    }
}

fn extract_stream_text_deltas(payload: &Value) -> Vec<String> {
    let mut deltas = Vec::new();
    if let Some(choices) = payload.get("choices").and_then(Value::as_array) {
        for choice in choices {
            if let Some(delta) = choice.get("delta") {
                push_optional_text_delta(&mut deltas, delta.get("content").and_then(Value::as_str));
                push_optional_text_delta(&mut deltas, delta.get("text").and_then(Value::as_str));
                push_optional_text_delta(
                    &mut deltas,
                    delta.get("output_text").and_then(Value::as_str),
                );
                push_optional_text_delta(
                    &mut deltas,
                    delta.get("reasoning_content").and_then(Value::as_str),
                );
            }
            push_optional_text_delta(&mut deltas, choice.get("text").and_then(Value::as_str));
            push_optional_text_delta(&mut deltas, choice.get("content").and_then(Value::as_str));
            push_optional_text_delta(
                &mut deltas,
                choice.get("output_text").and_then(Value::as_str),
            );
            push_optional_text_delta(
                &mut deltas,
                choice
                    .get("message")
                    .and_then(|message| message.get("content"))
                    .and_then(Value::as_str),
            );
        }
    }
    push_optional_text_delta(&mut deltas, payload.get("delta").and_then(Value::as_str));
    push_optional_text_delta(&mut deltas, payload.get("text").and_then(Value::as_str));
    push_optional_text_delta(&mut deltas, payload.get("content").and_then(Value::as_str));
    push_optional_text_delta(
        &mut deltas,
        payload.get("output_text").and_then(Value::as_str),
    );
    push_optional_text_delta(
        &mut deltas,
        payload
            .get("response")
            .and_then(|response| response.get("output_text"))
            .and_then(Value::as_str),
    );
    collect_output_text_from_content_array(payload.get("content"), &mut deltas);
    collect_output_text_from_output_array(payload.get("output"), &mut deltas);
    collect_anthropic_content_block_delta(payload, &mut deltas);
    collect_gemini_candidate_text(payload, &mut deltas);
    deltas
}

fn extract_generation_assets(payload: &Value, target_type: Option<&str>) -> Vec<Value> {
    let mut assets = Vec::new();
    collect_generation_assets(payload, target_type, &mut assets, 0);
    assets
}

fn collect_generation_assets(
    value: &Value,
    target_type: Option<&str>,
    assets: &mut Vec<Value>,
    depth: usize,
) {
    if depth > 5 {
        return;
    }
    match value {
        Value::Array(items) => {
            for item in items {
                collect_generation_assets(item, target_type, assets, depth + 1);
            }
        }
        Value::Object(object) => {
            if let Some(asset) = generation_asset_from_object(object, target_type) {
                if !generation_asset_exists(assets, &asset) {
                    assets.push(asset);
                }
            }
            for key in [
                "data",
                "images",
                "image",
                "audios",
                "audio",
                "music",
                "songs",
                "song",
                "tracks",
                "track",
                "files",
                "file",
                "assets",
                "asset",
                "artifacts",
                "artifact",
                "candidates",
                "candidate",
                "contents",
                "content",
                "parts",
                "part",
                "media",
                "output",
                "result",
                "response",
                "payload",
            ] {
                if let Some(child) = object.get(key) {
                    collect_generation_assets(child, target_type, assets, depth + 1);
                }
            }
            collect_inline_data_assets(object, target_type, assets);
        }
        _ => {}
    }
}

fn generation_asset_from_object(
    object: &Map<String, Value>,
    target_type: Option<&str>,
) -> Option<Value> {
    let url = object_string(
        object,
        &[
            "url",
            "assetUrl",
            "storageUrl",
            "downloadUrl",
            "publicUrl",
            "mediaUrl",
            "fileUrl",
            "audioUrl",
            "audio_url",
            "musicUrl",
            "music_url",
            "songUrl",
            "song_url",
            "trackUrl",
            "track_url",
            "streamUrl",
            "stream_url",
            "href",
            "uri",
        ],
    );
    let b64_json = object_string(
        object,
        &[
            "b64_json",
            "b64Json",
            "base64",
            "base64Data",
            "base64_data",
            "audioData",
            "audio_data",
        ],
    );
    let data_url = object_string(object, &["dataUrl", "data_url"]);
    let mime_type = object_string(object, &["mimeType", "mime", "contentType"])
        .or_else(|| media_mime_type_from_url(url.as_deref()))
        .or_else(|| data_url.as_deref().and_then(mime_type_from_data_url))
        .or_else(|| {
            if b64_json.is_some()
                || data_url
                    .as_deref()
                    .is_some_and(|value| value.starts_with("data:"))
            {
                default_mime_type_for_target_type(target_type)
                    .or_else(|| Some("image/png".to_owned()))
            } else {
                None
            }
        });
    let asset_url = url.or_else(|| data_url).or_else(|| {
        b64_json.as_deref().map(|value| {
            format!(
                "data:{};base64,{value}",
                mime_type.as_deref().unwrap_or("image/png")
            )
        })
    })?;
    let modality = object_string(
        object,
        &[
            "modality",
            "targetType",
            "type",
            "assetType",
            "artifactType",
        ],
    )
    .and_then(|value| normalize_generation_asset_modality(&value))
    .or_else(|| modality_from_mime_type(mime_type.as_deref(), target_type))
    .or_else(|| modality_from_url(&asset_url, target_type))?;
    let duration_seconds = generation_asset_duration_seconds(object);
    let thumbnail = object_string(
        object,
        &[
            "thumb",
            "thumbnailUrl",
            "thumbnail",
            "posterUrl",
            "coverUrl",
            "previewUrl",
        ],
    );
    Some(generation_asset_event_value(
        asset_url,
        modality,
        mime_type,
        duration_seconds,
        thumbnail,
    ))
}

fn generation_asset_event_value(
    locator: String,
    modality: String,
    mime_type: Option<String>,
    duration_seconds: Option<f64>,
    thumbnail_locator: Option<String>,
) -> Value {
    let mut resource = generation_media_resource(locator, generation_media_kind(&modality));
    if let Some(mime_type) = mime_type {
        resource.insert("mimeType".to_owned(), Value::String(mime_type));
    }
    if let Some(duration_seconds) = duration_seconds {
        if let Some(number) = serde_json::Number::from_f64(duration_seconds) {
            resource.insert("durationSeconds".to_owned(), Value::Number(number));
        }
    }
    if let Some(thumbnail_locator) = thumbnail_locator {
        let thumbnail = Value::Object(generation_media_resource(thumbnail_locator, "image"));
        resource.insert("poster".to_owned(), thumbnail.clone());
        resource.insert("thumbnails".to_owned(), Value::Array(vec![thumbnail]));
    }

    let mut asset = Map::new();
    asset.insert("asset".to_owned(), Value::Object(resource));
    asset.insert("modality".to_owned(), Value::String(modality));
    Value::Object(asset)
}

fn generation_media_resource(locator: String, kind: &str) -> Map<String, Value> {
    let source = if locator.starts_with("data:") {
        "data_url"
    } else {
        "external_url"
    };
    let mut resource = Map::new();
    resource.insert("kind".to_owned(), Value::String(kind.to_owned()));
    resource.insert("source".to_owned(), Value::String(source.to_owned()));
    resource.insert("url".to_owned(), Value::String(locator.clone()));
    resource.insert("publicUrl".to_owned(), Value::String(locator));
    resource
}

fn generation_media_kind(modality: &str) -> &'static str {
    match modality {
        "image" => "image",
        "video" => "video",
        "music" | "sfx" | "audio" => "audio",
        _ => "other",
    }
}

fn generation_asset_locator(value: &Value) -> Option<&str> {
    value
        .get("asset")
        .and_then(|asset| asset.get("url"))
        .and_then(Value::as_str)
}

fn generation_asset_modality(value: &Value) -> Option<&str> {
    value.get("modality").and_then(Value::as_str)
}

fn collect_inline_data_assets(
    object: &Map<String, Value>,
    target_type: Option<&str>,
    assets: &mut Vec<Value>,
) {
    let Some(inline_data) = object
        .get("inlineData")
        .or_else(|| object.get("inline_data"))
        .and_then(Value::as_object)
    else {
        return;
    };
    let Some(data) = object_string(inline_data, &["data"]) else {
        return;
    };
    let mime_type = object_string(inline_data, &["mimeType", "mime_type"])
        .or_else(|| default_mime_type_for_target_type(target_type))
        .unwrap_or_else(|| "image/png".to_owned());
    let modality = modality_from_mime_type(Some(&mime_type), target_type)
        .unwrap_or_else(|| "image".to_owned());
    let asset = generation_asset_event_value(
        format!("data:{mime_type};base64,{data}"),
        modality,
        Some(mime_type),
        None,
        None,
    );
    if !generation_asset_exists(assets, &asset) {
        assets.push(asset);
    }
}

fn generation_asset_exists(assets: &[Value], candidate: &Value) -> bool {
    let candidate_url = generation_asset_locator(candidate);
    let candidate_modality = generation_asset_modality(candidate);
    assets.iter().any(|asset| {
        generation_asset_locator(asset) == candidate_url
            && generation_asset_modality(asset) == candidate_modality
    })
}

fn object_string(object: &Map<String, Value>, keys: &[&str]) -> Option<String> {
    keys.iter()
        .find_map(|key| object.get(*key).and_then(Value::as_str))
        .and_then(non_empty_string)
}

fn normalize_generation_asset_modality(value: &str) -> Option<String> {
    let normalized = value.trim().to_ascii_lowercase().replace([' ', '-'], "_");
    if normalized.contains("image") {
        Some("image".to_owned())
    } else if normalized.contains("video") {
        Some("video".to_owned())
    } else if normalized.contains("music") {
        Some("music".to_owned())
    } else if normalized.contains("sfx") || normalized.contains("sound_effect") {
        Some("sfx".to_owned())
    } else if normalized.contains("audio")
        || normalized.contains("voice")
        || normalized.contains("speech")
    {
        Some("audio".to_owned())
    } else {
        None
    }
}

fn modality_from_mime_type(mime_type: Option<&str>, target_type: Option<&str>) -> Option<String> {
    let mime_type = mime_type?.trim().to_ascii_lowercase();
    if mime_type.starts_with("image/") {
        Some("image".to_owned())
    } else if mime_type.starts_with("video/") {
        Some("video".to_owned())
    } else if mime_type.starts_with("audio/") {
        Some(audio_modality_from_target_type(target_type))
    } else {
        None
    }
}

fn modality_from_url(url: &str, target_type: Option<&str>) -> Option<String> {
    let normalized = url.trim().to_ascii_lowercase();
    if [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"]
        .iter()
        .any(|extension| url_has_media_extension(&normalized, extension))
    {
        Some("image".to_owned())
    } else if [".mp4", ".webm", ".mov", ".m4v", ".avi", ".mkv"]
        .iter()
        .any(|extension| url_has_media_extension(&normalized, extension))
    {
        Some("video".to_owned())
    } else if [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"]
        .iter()
        .any(|extension| url_has_media_extension(&normalized, extension))
    {
        Some(audio_modality_from_target_type(target_type))
    } else if normalized.starts_with("data:image/") {
        Some("image".to_owned())
    } else if normalized.starts_with("data:video/") {
        Some("video".to_owned())
    } else if normalized.starts_with("data:audio/") {
        Some(audio_modality_from_target_type(target_type))
    } else {
        None
    }
}

fn url_has_media_extension(url: &str, extension: &str) -> bool {
    url.ends_with(extension)
        || url.contains(&format!("{extension}?"))
        || url.contains(&format!("{extension}#"))
}

fn audio_modality_from_target_type(target_type: Option<&str>) -> String {
    match target_type
        .and_then(normalize_generation_asset_modality)
        .as_deref()
    {
        Some("music") => "music".to_owned(),
        Some("sfx") => "sfx".to_owned(),
        _ => "audio".to_owned(),
    }
}

fn media_mime_type_from_url(url: Option<&str>) -> Option<String> {
    let url = url?.trim().to_ascii_lowercase();
    if url_has_media_extension(&url, ".png") {
        Some("image/png".to_owned())
    } else if url_has_media_extension(&url, ".jpg") || url_has_media_extension(&url, ".jpeg") {
        Some("image/jpeg".to_owned())
    } else if url_has_media_extension(&url, ".webp") {
        Some("image/webp".to_owned())
    } else if url_has_media_extension(&url, ".gif") {
        Some("image/gif".to_owned())
    } else if url_has_media_extension(&url, ".avif") {
        Some("image/avif".to_owned())
    } else if url_has_media_extension(&url, ".mp3") {
        Some("audio/mpeg".to_owned())
    } else if url_has_media_extension(&url, ".wav") {
        Some("audio/wav".to_owned())
    } else if url_has_media_extension(&url, ".m4a") {
        Some("audio/mp4".to_owned())
    } else if url_has_media_extension(&url, ".aac") {
        Some("audio/aac".to_owned())
    } else if url_has_media_extension(&url, ".ogg") {
        Some("audio/ogg".to_owned())
    } else if url_has_media_extension(&url, ".flac") {
        Some("audio/flac".to_owned())
    } else if url_has_media_extension(&url, ".mp4") || url_has_media_extension(&url, ".m4v") {
        Some("video/mp4".to_owned())
    } else if url_has_media_extension(&url, ".webm") {
        Some("video/webm".to_owned())
    } else if url_has_media_extension(&url, ".mov") {
        Some("video/quicktime".to_owned())
    } else {
        None
    }
}

fn mime_type_from_data_url(value: &str) -> Option<String> {
    let value = value.trim();
    let rest = value.strip_prefix("data:")?;
    let (metadata, _) = rest.split_once(',')?;
    metadata
        .split(';')
        .next()
        .and_then(non_empty_string)
        .filter(|mime_type| mime_type.contains('/'))
}

fn generation_asset_duration_seconds(object: &Map<String, Value>) -> Option<f64> {
    let seconds = object
        .get("durationSeconds")
        .or_else(|| object.get("duration_secs"))
        .or_else(|| object.get("duration"))
        .or_else(|| object.get("seconds"))
        .and_then(value_as_non_negative_f64);
    if seconds.is_some() {
        return seconds;
    }
    object
        .get("durationMs")
        .or_else(|| object.get("durationMillis"))
        .or_else(|| object.get("duration_milliseconds"))
        .and_then(value_as_non_negative_f64)
        .map(|milliseconds| milliseconds / 1000.0)
}

fn value_as_non_negative_f64(value: &Value) -> Option<f64> {
    let number = value.as_f64().or_else(|| {
        value
            .as_str()
            .and_then(|text| text.trim().parse::<f64>().ok())
    })?;
    (number >= 0.0).then_some(number)
}

fn value_as_non_negative_i64(value: &Value) -> Option<i64> {
    let number = value
        .as_i64()
        .or_else(|| value.as_u64().and_then(|value| i64::try_from(value).ok()))
        .or_else(|| {
            value
                .as_str()
                .and_then(|text| text.trim().parse::<i64>().ok())
        })?;
    (number >= 0).then_some(number)
}

fn push_optional_text_delta(deltas: &mut Vec<String>, value: Option<&str>) {
    if let Some(value) = value {
        deltas.push(value.to_owned());
    }
}

fn collect_output_text_from_content_array(value: Option<&Value>, deltas: &mut Vec<String>) {
    push_text_part_delta(deltas, text_parts_from_content_array(value));
}

fn collect_output_text_from_output_array(value: Option<&Value>, deltas: &mut Vec<String>) {
    let Some(items) = value.and_then(Value::as_array) else {
        return;
    };
    for item in items {
        let mut parts = Vec::new();
        push_optional_text_part(&mut parts, item.get("text").and_then(Value::as_str));
        push_optional_text_part(&mut parts, item.get("content").and_then(Value::as_str));
        parts.extend(text_parts_from_content_array(item.get("content")));
        push_text_part_delta(deltas, parts);
    }
}

fn collect_anthropic_content_block_delta(payload: &Value, deltas: &mut Vec<String>) {
    if payload.get("type").and_then(Value::as_str) != Some("content_block_delta") {
        return;
    }
    push_optional_text_delta(
        deltas,
        payload
            .get("delta")
            .and_then(|delta| delta.get("text"))
            .and_then(Value::as_str),
    );
}

fn collect_gemini_candidate_text(payload: &Value, deltas: &mut Vec<String>) {
    let Some(candidates) = payload.get("candidates").and_then(Value::as_array) else {
        return;
    };
    for candidate in candidates {
        let Some(parts) = candidate
            .get("content")
            .and_then(|content| content.get("parts"))
            .and_then(Value::as_array)
        else {
            continue;
        };
        let mut text_parts = Vec::new();
        for part in parts {
            push_optional_text_part(&mut text_parts, part.get("text").and_then(Value::as_str));
        }
        push_text_part_delta(deltas, text_parts);
    }
}

fn text_parts_from_content_array(value: Option<&Value>) -> Vec<String> {
    let Some(items) = value.and_then(Value::as_array) else {
        return Vec::new();
    };
    let mut parts = Vec::new();
    for item in items {
        push_optional_text_part(&mut parts, item.get("text").and_then(Value::as_str));
        push_optional_text_part(&mut parts, item.get("content").and_then(Value::as_str));
    }
    parts
}

fn push_optional_text_part(parts: &mut Vec<String>, value: Option<&str>) {
    if let Some(value) = value.filter(|value| !value.is_empty()) {
        parts.push(value.to_owned());
    }
}

fn push_text_part_delta(deltas: &mut Vec<String>, parts: Vec<String>) {
    let Some(delta) = join_stream_text_parts(parts) else {
        return;
    };
    deltas.push(delta);
}

fn join_stream_text_parts(parts: Vec<String>) -> Option<String> {
    let mut parts = parts.into_iter().filter(|part| !part.is_empty());
    let mut result = parts.next()?;
    for part in parts {
        if should_insert_stream_text_part_boundary(&result, &part) {
            result.push('\n');
        }
        result.push_str(&part);
    }
    Some(result)
}

fn should_insert_stream_text_part_boundary(left: &str, right: &str) -> bool {
    if left.is_empty() || right.is_empty() {
        return false;
    }
    let left_boundary = left.chars().last().is_some_and(char::is_whitespace);
    let right_boundary = right.chars().next().is_some_and(char::is_whitespace);
    !(left_boundary || right_boundary)
}

fn next_sse_event_boundary(buffer: &str) -> Option<(usize, usize)> {
    [("\r\n\r\n", 4_usize), ("\n\n", 2_usize), ("\r\r", 2_usize)]
        .into_iter()
        .filter_map(|(needle, len)| buffer.find(needle).map(|index| (index, len)))
        .min_by_key(|(index, _)| *index)
}

fn openai_route_response_error(response: Box<Response>) -> DomainError {
    DomainError::new(format!(
        "runtime route selection failed with HTTP {}",
        response.status()
    ))
}

async fn next_runtime_sse_chunk(
    mut state: RuntimeEventSseStreamState,
) -> Option<(Result<Bytes, axum::Error>, RuntimeEventSseStreamState)> {
    if let Some(bytes) = state.pending.pop_front() {
        return Some((Ok(bytes), state));
    }
    if state.done {
        if state.done_sent {
            return None;
        }
        state.done_sent = true;
        return Some((Ok(Bytes::from_static(b"data: [DONE]\n\n")), state));
    }

    loop {
        match state.provider_stream.next().await {
            Some(Ok(chunk)) => {
                let chunk_len = chunk.len();
                if state.buffer.len().saturating_add(chunk_len) > RUNTIME_SSE_BUFFER_MAX_BYTES {
                    state.done = true;
                    return Some((
                        Err(axum_error(DomainError::conflict(
                            "runtime SSE buffer exceeded maximum allowed size",
                        ))),
                        state,
                    ));
                }
                state.buffer.push_str(&String::from_utf8_lossy(&chunk));
                while let Some((boundary, boundary_len)) = next_sse_event_boundary(&state.buffer) {
                    let event = state.buffer[..boundary].to_owned();
                    state.buffer.drain(..boundary + boundary_len);
                    match persist_provider_sse_event(
                        state.store.as_ref(),
                        state.entity_uuid_generator.as_ref(),
                        state.stream_bus.as_ref(),
                        state.subject,
                        &state.invocation_id,
                        &state.event_source,
                        state.target_type.as_deref(),
                        &event,
                        &mut state.pending,
                    )
                    .await
                    {
                        Ok(done) => {
                            if done {
                                state.done = true;
                                break;
                            }
                        }
                        Err(error) => {
                            state.done = true;
                            return Some((Err(axum_error(error)), state));
                        }
                    }
                }
                if let Some(bytes) = state.pending.pop_front() {
                    return Some((Ok(bytes), state));
                }
                if state.done {
                    state.done_sent = true;
                    return Some((Ok(Bytes::from_static(b"data: [DONE]\n\n")), state));
                }
            }
            Some(Err(error)) => {
                state.done = true;
                return Some((Err(error), state));
            }
            None => {
                if !state.buffer.trim().is_empty() {
                    let event = std::mem::take(&mut state.buffer);
                    match persist_provider_sse_event(
                        state.store.as_ref(),
                        state.entity_uuid_generator.as_ref(),
                        state.stream_bus.as_ref(),
                        state.subject,
                        &state.invocation_id,
                        &state.event_source,
                        state.target_type.as_deref(),
                        &event,
                        &mut state.pending,
                    )
                    .await
                    {
                        Ok(_) => {}
                        Err(error) => {
                            state.done = true;
                            return Some((Err(axum_error(error)), state));
                        }
                    }
                    if let Some(bytes) = state.pending.pop_front() {
                        return Some((Ok(bytes), state));
                    }
                }
                state.done = true;
                state.done_sent = true;
                return Some((Ok(Bytes::from_static(b"data: [DONE]\n\n")), state));
            }
        }
    }
}

fn axum_error(error: DomainError) -> axum::Error {
    axum::Error::new(io::Error::new(io::ErrorKind::Other, error.to_string()))
}

async fn next_runtime_tail_sse_chunk(
    mut state: RuntimeEventTailSseStreamState,
) -> Option<(Result<Bytes, axum::Error>, RuntimeEventTailSseStreamState)> {
    loop {
        if let Some(item) = state.pending.pop_front() {
            state.next_event_no = state.next_event_no.max(item.event_no + 1);
            if is_runtime_completed_event(&item) {
                state.follow_execution = false;
                return Some((runtime_event_sse_bytes(&item).map_err(axum_error), state));
            }
            if is_runtime_failed_event(&item) {
                state.follow_execution = false;
                return Some((runtime_event_sse_bytes(&item).map_err(axum_error), state));
            }
            if is_runtime_cancelled_event(&item) {
                state.follow_execution = false;
                return Some((runtime_event_sse_bytes(&item).map_err(axum_error), state));
            }
            return Some((runtime_event_sse_bytes(&item).map_err(axum_error), state));
        }
        if state.done_sent {
            return None;
        }

        match list_runtime_events_from_event_no(
            state.store.as_ref(),
            state.subject,
            &state.invocation_id,
            state.next_event_no,
        )
        .await
        {
            Ok(items) => {
                let terminal_seen = items.iter().any(is_runtime_terminal_event);
                state.pending.extend(items);
                if terminal_seen {
                    state.follow_execution = false;
                }
                if !state.pending.is_empty() {
                    continue;
                }
            }
            Err(error) => {
                state.done_sent = true;
                return Some((Err(axum_error(error)), state));
            }
        }

        if !state.follow_execution {
            state.done_sent = true;
            return Some((Ok(Bytes::from_static(b"data: [DONE]\n\n")), state));
        }

        if let Err(error) = state
            .stream_bus
            .wait_for_event(&state.invocation_id, RUNTIME_STREAM_TAIL_WAIT_TIMEOUT)
            .await
        {
            tracing::warn!(
                invocation_id = %state.invocation_id,
                error = %error,
                "runtime stream bus wait failed; falling back to database polling"
            );
            sleep(RUNTIME_STREAM_TAIL_WAIT_TIMEOUT).await;
        }
    }
}

async fn list_runtime_events_from_event_no(
    store: &(dyn AppRuntimeStore + Send + Sync),
    subject: AppRuntimeSubject,
    invocation_id: &str,
    next_event_no: i64,
) -> Result<Vec<AppRuntimeEventItem>, DomainError> {
    let mut items = Vec::new();
    let mut after_event_no = next_event_no.saturating_sub(1).max(0);
    for _ in 0..1000_i64 {
        let mut page = store
            .list_events_after(
                subject,
                invocation_id.to_owned(),
                after_event_no,
                RUNTIME_EVENTS_FETCH_PAGE_SIZE,
            )
            .await?
            .items;
        let page_len = page.len();
        let Some(next_after_event_no) = page.iter().map(|item| item.event_no).max() else {
            break;
        };
        if next_after_event_no <= after_event_no {
            break;
        }
        after_event_no = next_after_event_no;
        items.append(&mut page);
        if page_len < RUNTIME_EVENTS_FETCH_PAGE_SIZE as usize {
            break;
        }
    }
    items.sort_by(|left, right| {
        left.event_no
            .cmp(&right.event_no)
            .then_with(|| left.id.cmp(&right.id))
    });
    Ok(items)
}

fn is_live_streaming_runtime_invocation(item: &AppRuntimeInvocationItem) -> bool {
    item.streaming && matches!(item.status.as_str(), "pending" | "running" | "streaming")
}

fn is_terminal_runtime_invocation(item: &AppRuntimeInvocationItem) -> bool {
    matches!(item.status.as_str(), "completed" | "failed" | "cancelled")
}

fn is_failed_runtime_invocation(item: &AppRuntimeInvocationItem) -> bool {
    item.status == "failed"
}

fn is_runtime_terminal_event(item: &AppRuntimeEventItem) -> bool {
    is_runtime_completed_event(item)
        || is_runtime_failed_event(item)
        || is_runtime_cancelled_event(item)
}

fn is_runtime_completed_event(item: &AppRuntimeEventItem) -> bool {
    item.event_type == "runtime.completed"
}

fn is_runtime_failed_event(item: &AppRuntimeEventItem) -> bool {
    item.event_type == "runtime.failed"
}

fn is_runtime_cancelled_event(item: &AppRuntimeEventItem) -> bool {
    item.event_type == "runtime.cancelled"
}

fn runtime_invocation_failed_message(item: &AppRuntimeInvocationItem) -> String {
    item.error_message_masked
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("runtime invocation failed")
        .to_owned()
}

fn build_create_invocation_command(
    state: &AppRuntimeState,
    subject: AppRuntimeSubject,
    request: AppRuntimeCreateInvocationRequest,
) -> Result<CreateAppRuntimeInvocationCommand, AppRuntimeBuildError> {
    let status = normalize_optional_text(request.status.as_deref(), "status", MAX_KIND_LEN)?
        .unwrap_or_else(|| "running".to_owned());
    validate_invocation_status(&status)?;
    Ok(CreateAppRuntimeInvocationCommand {
        subject,
        invocation_uuid: generate_entity_uuid(state)?,
        invocation_type: normalize_optional_text(
            request.invocation_type.as_deref(),
            "invocationType",
            MAX_KIND_LEN,
        )?
        .unwrap_or_else(|| "chat_response".to_owned()),
        runtime: normalize_required_text(request.runtime.as_deref(), "runtime", MAX_RUNTIME_LEN)?,
        endpoint: normalize_optional_text(
            request.endpoint.as_deref(),
            "endpoint",
            MAX_ENDPOINT_LEN,
        )?,
        status,
        conversation_id: normalize_optional_id(
            request.conversation_id.as_deref(),
            "conversationId",
        )?,
        chat_turn_id: normalize_optional_id(request.chat_turn_id.as_deref(), "chatTurnId")?,
        chat_item_id: normalize_optional_id(request.chat_item_id.as_deref(), "chatItemId")?,
        agent_session_id: normalize_optional_id(
            request.agent_session_id.as_deref(),
            "agentSessionId",
        )?,
        agent_run_id: normalize_optional_id(request.agent_run_id.as_deref(), "agentRunId")?,
        agent_run_step_id: normalize_optional_id(
            request.agent_run_step_id.as_deref(),
            "agentRunStepId",
        )?,
        request_id: Some(generate_entity_uuid(state)?),
        trace_id: normalize_optional_id(request.trace_id.as_deref(), "traceId")?,
        model: normalize_optional_text(request.model.as_deref(), "model", MAX_MODEL_LEN)?,
        provider: normalize_optional_text(
            request.provider.as_deref(),
            "provider",
            MAX_PROVIDER_LEN,
        )?,
        tool_name: normalize_optional_text(request.tool_name.as_deref(), "toolName", MAX_KIND_LEN)?,
        tool_call_id: normalize_optional_id(request.tool_call_id.as_deref(), "toolCallId")?,
        cwd: normalize_optional_text(request.cwd.as_deref(), "cwd", MAX_PATH_LEN)?,
        sandbox_policy: normalize_optional_text(
            request.sandbox_policy.as_deref(),
            "sandboxPolicy",
            MAX_KIND_LEN,
        )?,
        approval_policy: normalize_optional_text(
            request.approval_policy.as_deref(),
            "approvalPolicy",
            MAX_KIND_LEN,
        )?,
        permission_mode: normalize_optional_text(
            request.permission_mode.as_deref(),
            "permissionMode",
            MAX_KIND_LEN,
        )?,
        streaming: request.streaming.unwrap_or(false),
        request_json: normalize_object(request.request_json, "requestJson")?,
        metadata: normalize_metadata(request.metadata)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_complete_invocation_command(
    _state: &AppRuntimeState,
    subject: AppRuntimeSubject,
    invocation_id: String,
    request: AppRuntimeCompleteInvocationRequest,
) -> Result<CompleteAppRuntimeInvocationCommand, AppRuntimeBuildError> {
    let status = normalize_optional_text(request.status.as_deref(), "status", MAX_KIND_LEN)?
        .unwrap_or_else(|| "completed".to_owned());
    validate_invocation_status(&status)?;
    validate_non_negative(request.latency_ms, "latencyMs")?;
    validate_non_negative(request.ttft_ms, "ttftMs")?;
    Ok(CompleteAppRuntimeInvocationCommand {
        subject,
        invocation_id: normalize_id(&invocation_id, "invocationId")?,
        status,
        provider_response_id: normalize_optional_id(
            request.provider_response_id.as_deref(),
            "providerResponseId",
        )?,
        provider_session_id: normalize_optional_id(
            request.provider_session_id.as_deref(),
            "providerSessionId",
        )?,
        provider_conversation_id: normalize_optional_id(
            request.provider_conversation_id.as_deref(),
            "providerConversationId",
        )?,
        provider_step_id: normalize_optional_id(
            request.provider_step_id.as_deref(),
            "providerStepId",
        )?,
        finish_reason: normalize_optional_text(
            request.finish_reason.as_deref(),
            "finishReason",
            MAX_KIND_LEN,
        )?,
        latency_ms: request.latency_ms,
        ttft_ms: request.ttft_ms,
        exit_code: request.exit_code,
        error_type: normalize_optional_text(
            request.error_type.as_deref(),
            "errorType",
            MAX_KIND_LEN,
        )?,
        error_code: normalize_optional_text(
            request.error_code.as_deref(),
            "errorCode",
            MAX_KIND_LEN,
        )?,
        error_message_masked: normalize_optional_text(
            request.error_message_masked.as_deref(),
            "errorMessageMasked",
            MAX_ERROR_LEN,
        )?,
        response_json: normalize_object(request.response_json, "responseJson")?,
        usage_json: normalize_object(request.usage_json, "usageJson")?,
        metadata: normalize_metadata(request.metadata)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_create_event_command(
    state: &AppRuntimeState,
    subject: AppRuntimeSubject,
    invocation_id: String,
    request: AppRuntimeCreateEventRequest,
) -> Result<CreateAppRuntimeEventCommand, AppRuntimeBuildError> {
    Ok(CreateAppRuntimeEventCommand {
        subject,
        invocation_id: normalize_id(&invocation_id, "invocationId")?,
        event_uuid: generate_entity_uuid(state)?,
        event_type: normalize_required_text(
            request.event_type.as_deref(),
            "eventType",
            MAX_KIND_LEN,
        )?,
        event_source: normalize_optional_text(
            request.event_source.as_deref(),
            "eventSource",
            MAX_KIND_LEN,
        )?
        .unwrap_or_else(|| "runtime".to_owned()),
        payload_json: normalize_object(request.payload_json, "payloadJson")?,
        text_delta: normalize_optional_stream_text(
            request.text_delta.as_deref(),
            "textDelta",
            MAX_TEXT_LEN,
        )?,
        metadata: normalize_metadata(request.metadata)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_create_artifact_command(
    state: &AppRuntimeState,
    subject: AppRuntimeSubject,
    invocation_id: String,
    request: AppRuntimeCreateArtifactRequest,
) -> Result<CreateAppRuntimeArtifactCommand, AppRuntimeBuildError> {
    validate_non_negative(request.size_bytes, "sizeBytes")?;
    let artifact_type = normalize_required_text(
        request.artifact_type.as_deref(),
        "artifactType",
        MAX_KIND_LEN,
    )?;
    let storage_key =
        normalize_optional_text(request.storage_key.as_deref(), "storageKey", MAX_PATH_LEN)?;
    let resource = normalize_runtime_media_resource(request.resource, "resource")?;
    let resource =
        finalize_runtime_artifact_resource(resource, storage_key.as_deref(), &artifact_type);
    Ok(CreateAppRuntimeArtifactCommand {
        subject,
        invocation_id: normalize_id(&invocation_id, "invocationId")?,
        artifact_uuid: generate_entity_uuid(state)?,
        artifact_type,
        name: normalize_optional_text(request.name.as_deref(), "name", MAX_NAME_LEN)?,
        mime_type: normalize_optional_text(request.mime_type.as_deref(), "mimeType", MAX_KIND_LEN)?,
        content_text: normalize_optional_text(
            request.content_text.as_deref(),
            "contentText",
            MAX_TEXT_LEN,
        )?,
        content_json: normalize_object(request.content_json, "contentJson")?,
        storage_key,
        resource,
        sha256: normalize_optional_text(request.sha256.as_deref(), "sha256", MAX_KIND_LEN)?,
        size_bytes: request.size_bytes,
        metadata: normalize_metadata(request.metadata)?,
        requested_at: current_timestamp_string(),
    })
}

fn normalize_optional_stream_text(
    value: Option<&str>,
    field: &str,
    max_len: usize,
) -> Result<Option<String>, String> {
    let Some(value) = value else {
        return Ok(None);
    };
    if value.is_empty() {
        return Ok(None);
    }
    if value.chars().count() > max_len {
        return Err(format!("{field} must be at most {max_len} characters"));
    }
    Ok(Some(value.to_owned()))
}

fn normalize_invocation_query(
    query: AppRuntimeListQuery,
) -> Result<AppRuntimeInvocationQuery, String> {
    let pagination = parse_offset_list_query(query.page, query.page_size)?;
    Ok(AppRuntimeInvocationQuery {
        page: pagination.page_no,
        page_size: pagination.page_size,
        conversation_id: normalize_optional_id(query.conversation_id.as_deref(), "conversationId")?,
        chat_turn_id: normalize_optional_id(query.chat_turn_id.as_deref(), "chatTurnId")?,
        agent_session_id: normalize_optional_id(
            query.agent_session_id.as_deref(),
            "agentSessionId",
        )?,
        runtime: normalize_optional_text(query.runtime.as_deref(), "runtime", MAX_RUNTIME_LEN)?,
        status: normalize_optional_text(query.status.as_deref(), "status", MAX_KIND_LEN)?,
    })
}
fn normalize_stream_next_event_no(query: &AppRuntimeListQuery) -> i64 {
    query.after_event_no.unwrap_or(0).max(0).saturating_add(1)
}

fn normalize_required_text(
    value: Option<&str>,
    field: &str,
    max_len: usize,
) -> Result<String, String> {
    normalize_optional_text(value, field, max_len)?.ok_or_else(|| format!("{field} is required"))
}

fn normalize_optional_text(
    value: Option<&str>,
    field: &str,
    max_len: usize,
) -> Result<Option<String>, String> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    if value.chars().count() > max_len {
        return Err(format!("{field} must be at most {max_len} characters"));
    }
    Ok(Some(value.to_owned()))
}

fn normalize_optional_id(value: Option<&str>, field: &str) -> Result<Option<String>, String> {
    value.map(|value| normalize_id(value, field)).transpose()
}

fn normalize_id(value: &str, field: &str) -> Result<String, String> {
    let value = value.trim();
    if value.is_empty() {
        return Err(format!("{field} is required"));
    }
    if value.chars().count() > MAX_ID_LEN {
        return Err(format!("{field} must be at most {MAX_ID_LEN} characters"));
    }
    if !value
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':'))
    {
        return Err(format!("{field} contains unsupported characters"));
    }
    Ok(value.to_owned())
}

fn normalize_object(value: Option<Value>, field: &str) -> Result<Value, String> {
    match value {
        Some(Value::Object(_)) => Ok(value.unwrap()),
        Some(_) => Err(format!("{field} must be an object")),
        None => Ok(Value::Object(Map::new())),
    }
}

fn normalize_metadata(value: Option<Value>) -> Result<Value, String> {
    normalize_object(value, "metadata")
}

fn normalize_runtime_media_resource(
    value: Option<Value>,
    field: &str,
) -> Result<Option<Value>, String> {
    let Some(value) = value else {
        return Ok(None);
    };
    if value.is_null() {
        return Ok(None);
    }
    let mut object = value
        .as_object()
        .cloned()
        .ok_or_else(|| format!("{field} must be a MediaResource object"))?;
    let kind = normalize_required_text(
        object.get("kind").and_then(Value::as_str),
        &format!("{field}.kind"),
        MAX_KIND_LEN,
    )?;
    let source = normalize_required_text(
        object.get("source").and_then(Value::as_str),
        &format!("{field}.source"),
        MAX_KIND_LEN,
    )?;
    object.insert("kind".to_owned(), Value::String(kind));
    object.insert("source".to_owned(), Value::String(source));

    let mut has_locator = false;
    for key in ["id", "publicUrl", "url", "uri", "objectKey", "objectBlobId"] {
        if let Some(value) = object.get_mut(key) {
            let Some(text) = value.as_str() else {
                return Err(format!("{field}.{key} must be a string"));
            };
            let normalized =
                normalize_optional_text(Some(text), &format!("{field}.{key}"), MAX_PATH_LEN)?;
            if let Some(normalized) = normalized {
                has_locator = true;
                *value = Value::String(normalized);
            } else {
                *value = Value::String(String::new());
            }
        }
    }
    if !has_locator {
        return Err(format!("{field} must include a media resource locator"));
    }

    Ok(Some(Value::Object(object)))
}

fn finalize_runtime_artifact_resource(
    resource: Option<Value>,
    storage_key: Option<&str>,
    artifact_type: &str,
) -> Option<Value> {
    if resource.is_some() {
        return resource;
    }
    let storage_key = storage_key
        .map(str::trim)
        .filter(|value| !value.is_empty())?;
    Some(serde_json::json!({
        "kind": runtime_artifact_media_kind(artifact_type),
        "source": "object_storage",
        "objectKey": storage_key,
    }))
}

fn runtime_artifact_media_kind(artifact_type: &str) -> &'static str {
    let normalized = artifact_type.trim().to_ascii_lowercase();
    if normalized.contains("image") {
        "image"
    } else if normalized.contains("video") {
        "video"
    } else if normalized.contains("audio")
        || normalized.contains("voice")
        || normalized.contains("music")
    {
        "audio"
    } else if normalized.contains("archive") || normalized.contains("zip") {
        "archive"
    } else if normalized.contains("model") {
        "model"
    } else if normalized.contains("document")
        || normalized.contains("markdown")
        || normalized.contains("text")
    {
        "document"
    } else {
        "other"
    }
}

fn validate_invocation_status(status: &str) -> Result<(), String> {
    if matches!(
        status,
        "pending" | "running" | "streaming" | "completed" | "failed" | "cancelled"
    ) {
        Ok(())
    } else {
        Err(
            "status must be pending, running, streaming, completed, failed, or cancelled"
                .to_owned(),
        )
    }
}

fn validate_non_negative(value: Option<i64>, field: &str) -> Result<(), String> {
    if matches!(value, Some(value) if value < 0) {
        Err(format!("{field} must not be negative"))
    } else {
        Ok(())
    }
}

fn generate_entity_uuid(state: &AppRuntimeState) -> Result<String, AppRuntimeBuildError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(AppRuntimeBuildError::System)
}

fn bad_request(message: impl Into<String>) -> Response {
    problem_from_wire_code("4001", message.into()).into_response()
}

fn not_found(message: impl Into<String>) -> Response {
    problem_from_wire_code("4040", message.into()).into_response()
}

fn conflict(message: impl Into<String>) -> Response {
    problem_from_wire_code("4090", message.into()).into_response()
}

fn app_runtime_system_response(context: &str, error: DomainError) -> Response {
    problem_from_wire_code("5000", format!("{context}: {error}")).into_response()
}

#[derive(Debug)]
enum AppRuntimeBuildError {
    BadRequest(String),
    System(DomainError),
}

impl From<String> for AppRuntimeBuildError {
    fn from(value: String) -> Self {
        Self::BadRequest(value)
    }
}

fn current_timestamp_string() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
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
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = mp + if mp < 10 { 3 } else { -9 };
    let year = y + if m <= 2 { 1 } else { 0 };
    (year, m, d)
}

#[cfg(test)]
mod tests {
    use super::RUNTIME_STREAM_TERMINAL_RECHECK_INTERVAL;
    use std::time::Duration;

    #[test]
    fn runtime_stream_terminal_recheck_interval_avoids_tight_database_polling() {
        assert!(
            RUNTIME_STREAM_TERMINAL_RECHECK_INTERVAL >= Duration::from_secs(10),
            "runtime stream terminal recheck should not poll the database every few seconds"
        );
    }
}
