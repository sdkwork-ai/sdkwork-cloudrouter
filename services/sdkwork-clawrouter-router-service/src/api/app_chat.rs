use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::extract::{Path, RawQuery, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::Deserialize;
use serde::Serialize;
use serde_json::{Map, Value};

use crate::api::app_sql_subject::{map_required_app_sql_subject, RequiredAppSqlScopedSubject};

use crate::api::response::{
    internal_problem, json_created_response, json_success_list_response, offset_page_info,
    parse_offset_list_query, problem_from_wire_code, service_unavailable_problem, success_envelope,
};
use crate::application::EntityUuidGenerator;
use crate::domain::DomainError;
use crate::infrastructure::OsApiKeySecretGenerator;
use crate::ports::{
    AppChatConversationItem, AppChatConversationList, AppChatFuture, AppChatMessageList,
    AppChatStore, AppChatSubject, AppChatTurnOutcome, AppChatUsageSnapshot,
    CompleteAppChatTurnCommand, CreateAppChatConversationCommand, CreateAppChatTurnCommand,
};

const MAX_TITLE_LEN: usize = 256;
const MAX_SOURCE_SURFACE_LEN: usize = 64;
const MAX_MODEL_LEN: usize = 128;
const MAX_PROVIDER_LEN: usize = 128;
const MAX_ID_LEN: usize = 128;
const MAX_MESSAGE_LEN: usize = 64 * 1024;
const MAX_MODE_LEN: usize = 64;
const MAX_STATUS_LEN: usize = 64;
const MAX_RUNTIME_LEN: usize = 128;
const MAX_MONEY_LEN: usize = 64;
const APP_CHAT_STORE_UNAVAILABLE: &str = "app chat store is unavailable";

#[derive(Clone)]
struct AppChatState {
    store: Arc<dyn AppChatStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
}

#[derive(Debug, Default)]
struct AppChatListQuery {
    page: Option<i64>,
    page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppChatCreateConversationRequest {
    title: Option<String>,
    source_surface: Option<String>,
    default_model: Option<String>,
    default_provider: Option<String>,
    agent_id: Option<String>,
    agent_session_id: Option<String>,
    memory_space_id: Option<String>,
    metadata: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppChatCreateTurnRequest {
    message: Option<String>,
    mode: Option<String>,
    agent_id: Option<String>,
    agent_session_id: Option<String>,
    model: Option<String>,
    provider: Option<String>,
    metadata: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppChatCompleteTurnResponseRequest {
    message: Option<String>,
    status: Option<String>,
    model: Option<String>,
    provider: Option<String>,
    runtime: Option<String>,
    runtime_invocation_id: Option<String>,
    usage_fact_id: Option<String>,
    usage: Option<AppChatUsageRequest>,
    metadata: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppChatUsageRequest {
    #[serde(default, with = "sdkwork_utils_rust::serde_int64::option")]
    input_tokens: Option<i64>,
    #[serde(default, with = "sdkwork_utils_rust::serde_int64::option")]
    output_tokens: Option<i64>,
    #[serde(default, with = "sdkwork_utils_rust::serde_int64::option")]
    cached_tokens: Option<i64>,
    #[serde(default, with = "sdkwork_utils_rust::serde_int64::option")]
    reasoning_tokens: Option<i64>,
    #[serde(default, with = "sdkwork_utils_rust::serde_int64::option")]
    total_tokens: Option<i64>,
    cost: Option<String>,
    cost_amount: Option<String>,
    currency: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppChatConversationEnvelope {
    item: AppChatConversationItem,
}

struct UnavailableAppChatStore;

impl AppChatStore for UnavailableAppChatStore {
    fn list_conversations<'a>(
        &'a self,
        _subject: AppChatSubject,
        _page: i64,
        _page_size: i64,
    ) -> AppChatFuture<'a, AppChatConversationList> {
        Box::pin(async { Err(app_chat_store_unavailable_error()) })
    }

    fn get_conversation<'a>(
        &'a self,
        _subject: AppChatSubject,
        _conversation_id: String,
    ) -> AppChatFuture<'a, Option<AppChatConversationItem>> {
        Box::pin(async { Err(app_chat_store_unavailable_error()) })
    }

    fn create_conversation<'a>(
        &'a self,
        _command: CreateAppChatConversationCommand,
    ) -> AppChatFuture<'a, AppChatConversationItem> {
        Box::pin(async { Err(app_chat_store_unavailable_error()) })
    }

    fn list_messages<'a>(
        &'a self,
        _subject: AppChatSubject,
        _conversation_id: String,
        _page: i64,
        _page_size: i64,
    ) -> AppChatFuture<'a, AppChatMessageList> {
        Box::pin(async { Err(app_chat_store_unavailable_error()) })
    }

    fn create_turn<'a>(
        &'a self,
        _command: CreateAppChatTurnCommand,
    ) -> AppChatFuture<'a, AppChatTurnOutcome> {
        Box::pin(async { Err(app_chat_store_unavailable_error()) })
    }

    fn complete_turn_response<'a>(
        &'a self,
        _command: CompleteAppChatTurnCommand,
    ) -> AppChatFuture<'a, AppChatTurnOutcome> {
        Box::pin(async { Err(app_chat_store_unavailable_error()) })
    }
}

fn app_chat_store_unavailable_error() -> DomainError {
    DomainError::new(APP_CHAT_STORE_UNAVAILABLE)
}

pub fn app_chat_router() -> Router {
    app_chat_router_with_store(
        Arc::new(UnavailableAppChatStore),
        Arc::new(OsApiKeySecretGenerator),
    )
}

pub fn app_chat_router_with_store(
    store: Arc<dyn AppChatStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/app/v3/api/chat/conversations",
            get(list_conversations).post(create_conversation),
        )
        .route(
            "/app/v3/api/chat/conversations/{conversation_id}",
            get(get_conversation),
        )
        .route(
            "/app/v3/api/chat/conversations/{conversation_id}/messages",
            get(list_messages),
        )
        .route(
            "/app/v3/api/chat/conversations/{conversation_id}/turns",
            axum::routing::post(create_turn),
        )
        .route(
            "/app/v3/api/chat/conversations/{conversation_id}/turns/{turn_id}/response",
            axum::routing::post(complete_turn_response),
        )
        .with_state(AppChatState {
            store,
            entity_uuid_generator,
        })
}

async fn list_conversations(
    State(state): State<AppChatState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    _headers: HeaderMap,
    RawQuery(raw_query): RawQuery,
) -> Response {
    let subject = map_required_app_sql_subject(subject, AppChatSubject::from);
    let query = match parse_app_chat_list_query(raw_query.as_deref()) {
        Ok(query) => query,
        Err(message) => return invalid_parameter(message),
    };
    let pagination = match parse_offset_list_query(query.page, query.page_size) {
        Ok(value) => value,
        Err(message) => return invalid_parameter(message),
    };
    match state
        .store
        .list_conversations(subject, pagination.page_no, pagination.page_size)
        .await
    {
        Ok(list) => json_success_list_response(
            None,
            list.items,
            offset_page_info(list.page_no, list.page_size, list.total),
        ),
        Err(error) => app_chat_system_response("app chat conversations are unavailable", error),
    }
}

async fn get_conversation(
    State(state): State<AppChatState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    _headers: HeaderMap,
    Path(conversation_id): Path<String>,
) -> Response {
    let subject = map_required_app_sql_subject(subject, AppChatSubject::from);
    let conversation_id = match normalize_id(&conversation_id, "conversationId") {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    match state.store.get_conversation(subject, conversation_id).await {
        Ok(Some(item)) => Json(success_envelope(item)).into_response(),
        Ok(None) => not_found("chat conversation was not found"),
        Err(error) => app_chat_system_response("app chat conversation is unavailable", error),
    }
}

async fn create_conversation(
    State(state): State<AppChatState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    _headers: HeaderMap,
    Json(request): Json<AppChatCreateConversationRequest>,
) -> Response {
    let subject = map_required_app_sql_subject(subject, AppChatSubject::from);
    let command = match build_create_conversation_command(&state, subject, request) {
        Ok(command) => command,
        Err(AppChatBuildError::BadRequest(message)) => return bad_request(message),
        Err(AppChatBuildError::System(error)) => {
            return app_chat_system_response("app chat conversation command is invalid", error);
        }
    };
    match state.store.create_conversation(command).await {
        Ok(item) => json_created_response(None, AppChatConversationEnvelope { item }),
        Err(error) if error.is_conflict() => {
            problem_from_wire_code("4090", error.to_string()).into_response()
        }
        Err(error) => app_chat_system_response("app chat conversation is unavailable", error),
    }
}

async fn list_messages(
    State(state): State<AppChatState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    _headers: HeaderMap,
    Path(conversation_id): Path<String>,
    RawQuery(raw_query): RawQuery,
) -> Response {
    let subject = map_required_app_sql_subject(subject, AppChatSubject::from);
    let conversation_id = match normalize_id(&conversation_id, "conversationId") {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let query = match parse_app_chat_list_query(raw_query.as_deref()) {
        Ok(query) => query,
        Err(message) => return invalid_parameter(message),
    };
    let pagination = match parse_offset_list_query(query.page, query.page_size) {
        Ok(value) => value,
        Err(message) => return invalid_parameter(message),
    };
    match state
        .store
        .list_messages(
            subject,
            conversation_id,
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
        Err(error) => app_chat_system_response("app chat messages are unavailable", error),
    }
}

async fn create_turn(
    State(state): State<AppChatState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    _headers: HeaderMap,
    Path(conversation_id): Path<String>,
    Json(request): Json<AppChatCreateTurnRequest>,
) -> Response {
    let subject = map_required_app_sql_subject(subject, AppChatSubject::from);
    let command = match build_create_turn_command(&state, subject, conversation_id, request) {
        Ok(command) => command,
        Err(AppChatBuildError::BadRequest(message)) => return bad_request(message),
        Err(AppChatBuildError::System(error)) => {
            return app_chat_system_response("app chat turn command is invalid", error);
        }
    };
    match state.store.create_turn(command).await {
        Ok(outcome) => json_created_response(None, outcome),
        Err(error) if error.is_not_found() => not_found(error.to_string()),
        Err(error) => app_chat_system_response("app chat turn is unavailable", error),
    }
}

async fn complete_turn_response(
    State(state): State<AppChatState>,
    RequiredAppSqlScopedSubject(subject): RequiredAppSqlScopedSubject,
    _headers: HeaderMap,
    Path((conversation_id, turn_id)): Path<(String, String)>,
    Json(request): Json<AppChatCompleteTurnResponseRequest>,
) -> Response {
    let subject = map_required_app_sql_subject(subject, AppChatSubject::from);
    let command = match build_complete_turn_response_command(
        &state,
        subject,
        conversation_id,
        turn_id,
        request,
    ) {
        Ok(command) => command,
        Err(AppChatBuildError::BadRequest(message)) => return bad_request(message),
        Err(AppChatBuildError::System(error)) => {
            return app_chat_system_response("app chat turn response command is invalid", error);
        }
    };
    match state.store.complete_turn_response(command).await {
        Ok(outcome) => Json(success_envelope(outcome)).into_response(),
        Err(error) if error.is_not_found() => not_found(error.to_string()),
        Err(error) if error.is_conflict() => {
            problem_from_wire_code("4090", error.to_string()).into_response()
        }
        Err(error) => app_chat_system_response("app chat turn response is unavailable", error),
    }
}

fn build_create_conversation_command(
    state: &AppChatState,
    subject: AppChatSubject,
    request: AppChatCreateConversationRequest,
) -> Result<CreateAppChatConversationCommand, AppChatBuildError> {
    Ok(CreateAppChatConversationCommand {
        subject,
        conversation_uuid: generate_entity_uuid(state)?,
        title: normalize_optional_text(request.title.as_deref(), "title", MAX_TITLE_LEN)?,
        source_surface: normalize_optional_text(
            request.source_surface.as_deref(),
            "sourceSurface",
            MAX_SOURCE_SURFACE_LEN,
        )?
        .unwrap_or_else(|| "chat".to_owned()),
        default_model: normalize_optional_text(
            request.default_model.as_deref(),
            "defaultModel",
            MAX_MODEL_LEN,
        )?,
        default_provider: normalize_optional_text(
            request.default_provider.as_deref(),
            "defaultProvider",
            MAX_PROVIDER_LEN,
        )?,
        agent_id: normalize_optional_id(request.agent_id.as_deref(), "agentId")?,
        agent_session_id: normalize_optional_id(
            request.agent_session_id.as_deref(),
            "agentSessionId",
        )?,
        memory_space_id: normalize_optional_id(
            request.memory_space_id.as_deref(),
            "memorySpaceId",
        )?,
        metadata: normalize_metadata(request.metadata)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_create_turn_command(
    state: &AppChatState,
    subject: AppChatSubject,
    conversation_id: String,
    request: AppChatCreateTurnRequest,
) -> Result<CreateAppChatTurnCommand, AppChatBuildError> {
    Ok(CreateAppChatTurnCommand {
        subject,
        conversation_id: normalize_id(&conversation_id, "conversationId")?,
        turn_uuid: generate_entity_uuid(state)?,
        input_item_uuid: generate_entity_uuid(state)?,
        input_message_uuid: generate_entity_uuid(state)?,
        output_item_uuid: generate_entity_uuid(state)?,
        output_message_uuid: generate_entity_uuid(state)?,
        message: normalize_required_message_text(
            request.message.as_deref(),
            "message",
            MAX_MESSAGE_LEN,
        )?,
        mode: normalize_optional_text(request.mode.as_deref(), "mode", MAX_MODE_LEN)?,
        agent_id: normalize_optional_id(request.agent_id.as_deref(), "agentId")?,
        agent_session_id: normalize_optional_id(
            request.agent_session_id.as_deref(),
            "agentSessionId",
        )?,
        model: normalize_optional_text(request.model.as_deref(), "model", MAX_MODEL_LEN)?,
        provider: normalize_optional_text(
            request.provider.as_deref(),
            "provider",
            MAX_PROVIDER_LEN,
        )?,
        metadata: normalize_metadata(request.metadata)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_complete_turn_response_command(
    state: &AppChatState,
    subject: AppChatSubject,
    conversation_id: String,
    turn_id: String,
    request: AppChatCompleteTurnResponseRequest,
) -> Result<CompleteAppChatTurnCommand, AppChatBuildError> {
    let status = normalize_optional_text(request.status.as_deref(), "status", MAX_STATUS_LEN)?
        .unwrap_or_else(|| "completed".to_owned());
    if !matches!(
        status.as_str(),
        "completed" | "failed" | "cancelled" | "streaming"
    ) {
        return Err(AppChatBuildError::BadRequest(
            "status must be completed, failed, cancelled, or streaming".to_owned(),
        ));
    }
    Ok(CompleteAppChatTurnCommand {
        subject,
        conversation_id: normalize_id(&conversation_id, "conversationId")?,
        turn_id: normalize_id(&turn_id, "turnId")?,
        output_message_uuid: generate_entity_uuid(state)?,
        output_part_uuid: generate_entity_uuid(state)?,
        usage_link_uuid: generate_entity_uuid(state)?,
        message: normalize_required_message_text(
            request.message.as_deref(),
            "message",
            MAX_MESSAGE_LEN,
        )?,
        status,
        model: normalize_optional_text(request.model.as_deref(), "model", MAX_MODEL_LEN)?,
        provider: normalize_optional_text(
            request.provider.as_deref(),
            "provider",
            MAX_PROVIDER_LEN,
        )?,
        runtime: normalize_optional_text(request.runtime.as_deref(), "runtime", MAX_RUNTIME_LEN)?,
        runtime_invocation_id: normalize_optional_id(
            request.runtime_invocation_id.as_deref(),
            "runtimeInvocationId",
        )?,
        usage_fact_id: normalize_optional_positive_i64(
            request.usage_fact_id.as_deref(),
            "usageFactId",
        )?,
        usage: normalize_usage(request.usage)?,
        metadata: normalize_metadata(request.metadata)?,
        requested_at: current_timestamp_string(),
    })
}

fn normalize_required_message_text(
    value: Option<&str>,
    field: &str,
    max_len: usize,
) -> Result<String, String> {
    let Some(value) = value else {
        return Err(format!("{field} is required"));
    };
    if value.trim().is_empty() {
        return Err(format!("{field} is required"));
    }
    if value.chars().count() > max_len {
        return Err(format!("{field} must be at most {max_len} characters"));
    }
    Ok(value.to_owned())
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

fn normalize_optional_positive_i64(
    value: Option<&str>,
    field: &str,
) -> Result<Option<i64>, String> {
    let Some(value) = normalize_optional_text(value, field, MAX_ID_LEN)? else {
        return Ok(None);
    };
    value
        .parse::<i64>()
        .ok()
        .filter(|value| *value > 0)
        .map(Some)
        .ok_or_else(|| format!("{field} must be a positive integer string"))
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

fn normalize_metadata(value: Option<Value>) -> Result<Value, String> {
    match value {
        Some(Value::Object(_)) => Ok(value.unwrap()),
        Some(_) => Err("metadata must be an object".to_owned()),
        None => Ok(Value::Object(Map::new())),
    }
}

fn normalize_usage(
    value: Option<AppChatUsageRequest>,
) -> Result<Option<AppChatUsageSnapshot>, String> {
    let Some(value) = value else {
        return Ok(None);
    };
    let input_tokens = normalize_non_negative_count(value.input_tokens, "usage.inputTokens")?;
    let output_tokens = normalize_non_negative_count(value.output_tokens, "usage.outputTokens")?;
    let cached_tokens = normalize_non_negative_count(value.cached_tokens, "usage.cachedTokens")?;
    let reasoning_tokens =
        normalize_non_negative_count(value.reasoning_tokens, "usage.reasoningTokens")?;
    let total_tokens = normalize_non_negative_count(value.total_tokens, "usage.totalTokens")?
        .max(input_tokens + output_tokens + cached_tokens + reasoning_tokens);
    let cost_amount = normalize_optional_text(
        value.cost_amount.or(value.cost).as_deref(),
        "usage.cost",
        MAX_MONEY_LEN,
    )?;
    let currency = normalize_optional_text(value.currency.as_deref(), "usage.currency", 16)?;
    Ok(Some(AppChatUsageSnapshot {
        input_tokens,
        output_tokens,
        cached_tokens,
        reasoning_tokens,
        total_tokens,
        cost_amount,
        currency,
    }))
}

fn normalize_non_negative_count(value: Option<i64>, field: &str) -> Result<i64, String> {
    let value = value.unwrap_or(0);
    if value < 0 {
        return Err(format!("{field} must not be negative"));
    }
    Ok(value)
}

fn generate_entity_uuid(state: &AppChatState) -> Result<String, AppChatBuildError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(AppChatBuildError::System)
}

fn parse_app_chat_list_query(raw_query: Option<&str>) -> Result<AppChatListQuery, String> {
    let mut query = AppChatListQuery::default();

    for (key, value) in url::form_urlencoded::parse(raw_query.unwrap_or_default().as_bytes()) {
        let target = match key.as_ref() {
            "page" => &mut query.page,
            "page_size" => &mut query.page_size,
            _ => return Err("unsupported query parameter".to_owned()),
        };
        if target.is_some() {
            return Err(format!("{key} must not be repeated"));
        }
        *target = Some(
            value
                .parse::<i64>()
                .map_err(|_| format!("{key} must be an integer"))?,
        );
    }

    Ok(query)
}

fn bad_request(message: impl Into<String>) -> Response {
    problem_from_wire_code("4001", message.into()).into_response()
}

fn invalid_parameter(message: impl Into<String>) -> Response {
    crate::api::response::platform_problem(
        sdkwork_utils_rust::SdkWorkResultCode::InvalidParameter,
        message,
    )
    .into_response()
}

fn not_found(message: impl Into<String>) -> Response {
    problem_from_wire_code("4040", message.into()).into_response()
}

fn app_chat_system_response(context: &str, error: DomainError) -> Response {
    if error.to_string() == APP_CHAT_STORE_UNAVAILABLE {
        return service_unavailable_problem(context).into_response();
    }
    internal_problem(context).into_response()
}

#[derive(Debug)]
enum AppChatBuildError {
    BadRequest(String),
    System(DomainError),
}

impl From<String> for AppChatBuildError {
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
