use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll};
use std::time::Instant;

use axum::body::{Body, Bytes, HttpBody};
use axum::extract::State;
use axum::http::header::CONTENT_TYPE;
use axum::http::{HeaderMap, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{Json, Router};
use hyper::body::Frame;
use sdkwork_claw_http::ApiKeyIdentity;
use sdkwork_claw_security::redact_error_message;
use serde_json::Value;

use crate::api::openai_contract::OpenAiChatCompletionRequest;
use crate::api::openai_error::openai_error;
use crate::api::openai_invocation::{
    notify_after_relay_observers, notify_after_route_selection, notify_before_relay,
    notify_before_route_selection, notify_error, notify_route_fault, notify_route_success,
    with_builtin_invocation_plugins, OpenAiInvocationContext, OpenAiInvocationEndpoint,
    OpenAiInvocationFault, OpenAiInvocationPluginError, OpenAiInvocationPluginRef,
    OpenAiInvocationRelayOutcome,
};
use crate::api::openai_runtime::{
    authenticate_api_key, provider_relay_attempt_retry_policy, resolve_openai_upstream_route_plan,
    route_http_status_is_retryable, OpenAiRuntimeFailureStrategy, OpenAiRuntimeRouteConfig,
    ResolvedOpenAiUpstreamRoute, ResolvedOpenAiUpstreamRoutePlan,
};
use crate::api::openai_usage::{
    build_request_trace_command, build_usage_record_command_builder, chat_usage_billing_profile,
    chat_usage_from_stream_event, provider_error_code_from_body, provider_error_message_from_body,
    provider_error_type_from_body, record_request_trace, GatewayUsageRecordCommandBuilder,
    OpenAiTokenUsage, OpenAiUsageRecorder,
};
use crate::application::{ApiKeySecretHasher, AuthenticatedApiKeyContext};
use crate::domain::{BillingMeter, ProviderRetryPolicy, RoutingCapability};
use crate::ports::GatewayUsageRecordFuture;
use crate::ports::{
    ChatCompletionRelay, ChatCompletionRelayRequest, ChatCompletionStreamRelay,
    GatewayUsageRecorder, UpstreamAccountRouteCatalog,
};

struct OpenAiChatState<C> {
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Option<Arc<dyn ChatCompletionRelay + Send + Sync>>,
    stream_relay: Option<Arc<dyn ChatCompletionStreamRelay + Send + Sync>>,
    usage_recorder: Option<Arc<dyn GatewayUsageRecorder + Send + Sync>>,
    usage_recording: Option<Arc<OpenAiUsageRecorder<C>>>,
    plugins: Vec<OpenAiInvocationPluginRef>,
    failure_strategy: OpenAiRuntimeFailureStrategy,
    default_retry_policy: ProviderRetryPolicy,
}

impl<C> Clone for OpenAiChatState<C> {
    fn clone(&self) -> Self {
        Self {
            catalog: Arc::clone(&self.catalog),
            api_key_hasher: Arc::clone(&self.api_key_hasher),
            relay: self.relay.clone(),
            stream_relay: self.stream_relay.clone(),
            usage_recorder: self.usage_recorder.clone(),
            usage_recording: self.usage_recording.clone(),
            plugins: self.plugins.clone(),
            failure_strategy: self.failure_strategy,
            default_retry_policy: self.default_retry_policy.clone(),
        }
    }
}

struct ParsedOpenAiChatCompletionRequest {
    model: String,
    stream: bool,
    request_body: Value,
}

pub fn openai_chat_completions_router<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_chat_completions_router_with_optional_relays(
        catalog,
        api_key_hasher,
        None,
        None,
        None,
        Vec::new(),
        OpenAiRuntimeFailureStrategy::default(),
    )
}

pub fn openai_chat_completions_router_with_relay<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Arc<dyn ChatCompletionRelay + Send + Sync>,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_chat_completions_router_with_optional_relays(
        catalog,
        api_key_hasher,
        Some(relay),
        None,
        None,
        Vec::new(),
        OpenAiRuntimeFailureStrategy::default(),
    )
}

pub fn openai_chat_completions_router_with_relay_and_plugins<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Arc<dyn ChatCompletionRelay + Send + Sync>,
    plugins: Vec<OpenAiInvocationPluginRef>,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_chat_completions_router_with_optional_relays(
        catalog,
        api_key_hasher,
        Some(relay),
        None,
        None,
        plugins,
        OpenAiRuntimeFailureStrategy::default(),
    )
}

pub fn openai_chat_completions_router_with_relay_plugins_and_failure_strategy<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Arc<dyn ChatCompletionRelay + Send + Sync>,
    plugins: Vec<OpenAiInvocationPluginRef>,
    failure_strategy: OpenAiRuntimeFailureStrategy,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_chat_completions_router_with_optional_relays(
        catalog,
        api_key_hasher,
        Some(relay),
        None,
        None,
        plugins,
        failure_strategy,
    )
}

pub fn openai_chat_completions_router_with_relay_and_usage_recorder<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Arc<dyn ChatCompletionRelay + Send + Sync>,
    usage_recorder: Arc<dyn GatewayUsageRecorder + Send + Sync>,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_chat_completions_router_with_optional_relays(
        catalog,
        api_key_hasher,
        Some(relay),
        None,
        Some(usage_recorder),
        Vec::new(),
        OpenAiRuntimeFailureStrategy::default(),
    )
}

pub fn openai_chat_completions_router_with_relay_and_usage_recorder_and_plugins<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Arc<dyn ChatCompletionRelay + Send + Sync>,
    usage_recorder: Arc<dyn GatewayUsageRecorder + Send + Sync>,
    plugins: Vec<OpenAiInvocationPluginRef>,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_chat_completions_router_with_relay_usage_recorder_plugins_and_failure_strategy(
        catalog,
        api_key_hasher,
        relay,
        usage_recorder,
        plugins,
        OpenAiRuntimeFailureStrategy::default(),
    )
}

pub fn openai_chat_completions_router_with_relay_usage_recorder_plugins_and_failure_strategy<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Arc<dyn ChatCompletionRelay + Send + Sync>,
    usage_recorder: Arc<dyn GatewayUsageRecorder + Send + Sync>,
    plugins: Vec<OpenAiInvocationPluginRef>,
    failure_strategy: OpenAiRuntimeFailureStrategy,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_chat_completions_router_with_optional_relays(
        catalog,
        api_key_hasher,
        Some(relay),
        None,
        Some(usage_recorder),
        plugins,
        failure_strategy,
    )
}

pub fn openai_chat_completions_router_with_relay_usage_recorder_plugins_and_runtime_config<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Arc<dyn ChatCompletionRelay + Send + Sync>,
    usage_recorder: Arc<dyn GatewayUsageRecorder + Send + Sync>,
    plugins: Vec<OpenAiInvocationPluginRef>,
    runtime_config: OpenAiRuntimeRouteConfig,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_chat_completions_router_with_optional_relays_and_runtime_config(
        catalog,
        api_key_hasher,
        Some(relay),
        None,
        Some(usage_recorder),
        plugins,
        runtime_config,
    )
}

pub fn openai_chat_completions_router_with_streaming_relay<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    stream_relay: Arc<dyn ChatCompletionStreamRelay + Send + Sync>,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_chat_completions_router_with_optional_relays(
        catalog,
        api_key_hasher,
        None,
        Some(stream_relay),
        None,
        Vec::new(),
        OpenAiRuntimeFailureStrategy::default(),
    )
}

pub fn openai_chat_completions_router_with_streaming_relay_and_failure_strategy<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    stream_relay: Arc<dyn ChatCompletionStreamRelay + Send + Sync>,
    failure_strategy: OpenAiRuntimeFailureStrategy,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_chat_completions_router_with_optional_relays(
        catalog,
        api_key_hasher,
        None,
        Some(stream_relay),
        None,
        Vec::new(),
        failure_strategy,
    )
}

pub fn openai_chat_completions_router_with_relays<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Arc<dyn ChatCompletionRelay + Send + Sync>,
    stream_relay: Arc<dyn ChatCompletionStreamRelay + Send + Sync>,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_chat_completions_router_with_optional_relays(
        catalog,
        api_key_hasher,
        Some(relay),
        Some(stream_relay),
        None,
        Vec::new(),
        OpenAiRuntimeFailureStrategy::default(),
    )
}

pub fn openai_chat_completions_router_with_relays_and_failure_strategy<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Arc<dyn ChatCompletionRelay + Send + Sync>,
    stream_relay: Arc<dyn ChatCompletionStreamRelay + Send + Sync>,
    failure_strategy: OpenAiRuntimeFailureStrategy,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_chat_completions_router_with_optional_relays(
        catalog,
        api_key_hasher,
        Some(relay),
        Some(stream_relay),
        None,
        Vec::new(),
        failure_strategy,
    )
}

pub fn openai_chat_completions_router_with_relays_and_usage_recorder<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Arc<dyn ChatCompletionRelay + Send + Sync>,
    stream_relay: Arc<dyn ChatCompletionStreamRelay + Send + Sync>,
    usage_recorder: Arc<dyn GatewayUsageRecorder + Send + Sync>,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_chat_completions_router_with_optional_relays(
        catalog,
        api_key_hasher,
        Some(relay),
        Some(stream_relay),
        Some(usage_recorder),
        Vec::new(),
        OpenAiRuntimeFailureStrategy::default(),
    )
}

pub fn openai_chat_completions_router_with_relays_and_usage_recorder_and_plugins<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Arc<dyn ChatCompletionRelay + Send + Sync>,
    stream_relay: Arc<dyn ChatCompletionStreamRelay + Send + Sync>,
    usage_recorder: Arc<dyn GatewayUsageRecorder + Send + Sync>,
    plugins: Vec<OpenAiInvocationPluginRef>,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_chat_completions_router_with_relays_usage_recorder_plugins_and_failure_strategy(
        catalog,
        api_key_hasher,
        relay,
        stream_relay,
        usage_recorder,
        plugins,
        OpenAiRuntimeFailureStrategy::default(),
    )
}

pub fn openai_chat_completions_router_with_relays_usage_recorder_plugins_and_failure_strategy<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Arc<dyn ChatCompletionRelay + Send + Sync>,
    stream_relay: Arc<dyn ChatCompletionStreamRelay + Send + Sync>,
    usage_recorder: Arc<dyn GatewayUsageRecorder + Send + Sync>,
    plugins: Vec<OpenAiInvocationPluginRef>,
    failure_strategy: OpenAiRuntimeFailureStrategy,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_chat_completions_router_with_optional_relays(
        catalog,
        api_key_hasher,
        Some(relay),
        Some(stream_relay),
        Some(usage_recorder),
        plugins,
        failure_strategy,
    )
}

pub fn openai_chat_completions_router_with_relays_usage_recorder_plugins_and_runtime_config<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Arc<dyn ChatCompletionRelay + Send + Sync>,
    stream_relay: Arc<dyn ChatCompletionStreamRelay + Send + Sync>,
    usage_recorder: Arc<dyn GatewayUsageRecorder + Send + Sync>,
    plugins: Vec<OpenAiInvocationPluginRef>,
    runtime_config: OpenAiRuntimeRouteConfig,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_chat_completions_router_with_optional_relays_and_runtime_config(
        catalog,
        api_key_hasher,
        Some(relay),
        Some(stream_relay),
        Some(usage_recorder),
        plugins,
        runtime_config,
    )
}

fn openai_chat_completions_router_with_optional_relays<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Option<Arc<dyn ChatCompletionRelay + Send + Sync>>,
    stream_relay: Option<Arc<dyn ChatCompletionStreamRelay + Send + Sync>>,
    usage_recorder: Option<Arc<dyn GatewayUsageRecorder + Send + Sync>>,
    plugins: Vec<OpenAiInvocationPluginRef>,
    failure_strategy: OpenAiRuntimeFailureStrategy,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_chat_completions_router_with_optional_relays_and_runtime_config(
        catalog,
        api_key_hasher,
        relay,
        stream_relay,
        usage_recorder,
        plugins,
        OpenAiRuntimeRouteConfig::new(ProviderRetryPolicy::default(), failure_strategy),
    )
}

fn openai_chat_completions_router_with_optional_relays_and_runtime_config<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Option<Arc<dyn ChatCompletionRelay + Send + Sync>>,
    stream_relay: Option<Arc<dyn ChatCompletionStreamRelay + Send + Sync>>,
    usage_recorder: Option<Arc<dyn GatewayUsageRecorder + Send + Sync>>,
    plugins: Vec<OpenAiInvocationPluginRef>,
    runtime_config: OpenAiRuntimeRouteConfig,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let usage_recording = usage_recorder.as_ref().map(|usage_recorder| {
        Arc::new(OpenAiUsageRecorder::new(
            Arc::clone(&catalog),
            Arc::clone(usage_recorder),
        ))
    });

    Router::new()
        .route("/v1/chat/completions", post(create_chat_completion::<C>))
        .with_state(OpenAiChatState {
            catalog,
            api_key_hasher,
            relay,
            stream_relay,
            usage_recorder,
            usage_recording,
            plugins: with_builtin_invocation_plugins(plugins),
            failure_strategy: runtime_config.failure_strategy,
            default_retry_policy: runtime_config.default_retry_policy,
        })
}

async fn create_chat_completion<C>(
    State(state): State<OpenAiChatState<C>>,
    headers: HeaderMap,
    uri: Uri,
    body: Bytes,
) -> Response
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let request = match parse_request(&body) {
        Ok(request) => request,
        Err(message) => {
            return openai_error(
                StatusCode::BAD_REQUEST,
                "invalid_request",
                "invalid_request_error",
                message,
            );
        }
    };
    let identity = match ApiKeyIdentity::from_headers_and_uri(&headers, &uri) {
        Ok(identity) => identity,
        Err(error) => {
            return openai_error(
                StatusCode::BAD_REQUEST,
                "invalid_request",
                "invalid_request_error",
                error,
            );
        }
    };
    let context = match authenticate_api_key(
        state.catalog.as_ref(),
        state.api_key_hasher.as_ref(),
        &identity,
    ) {
        Ok(context) => context,
        Err(response) => return *response,
    };
    let invocation_context = OpenAiInvocationContext::new(
        OpenAiInvocationEndpoint::ChatCompletions,
        context.clone(),
        request.model.clone(),
        request.stream,
        request.request_body.clone(),
        &headers,
        &uri,
    );
    if let Err(error) = notify_before_route_selection(&state.plugins, &invocation_context).await {
        record_request_trace(
            state.usage_recorder.as_ref(),
            build_request_trace_command(
                &invocation_context,
                None,
                Some(error.status_code.as_u16()),
                request.stream,
                None,
                Some(error.code.to_owned()),
                Some(error.error_type.to_owned()),
                Some(error.message.clone()),
            ),
        )
        .await;
        notify_error(&state.plugins, &invocation_context, None, &error).await;
        return error.into_openai_response();
    }
    let mut route_plan = match resolve_openai_upstream_route_plan(
        state.catalog.as_ref(),
        &context,
        &request.model,
        &["chat"],
        "chat",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
    ) {
        Ok(route_plan) => route_plan,
        Err(response) => {
            let http_status = response.status().as_u16();
            record_request_trace(
                state.usage_recorder.as_ref(),
                build_request_trace_command(
                    &invocation_context,
                    None,
                    Some(http_status),
                    request.stream,
                    None,
                    Some("route_selection_failed".to_owned()),
                    Some(if http_status >= 500 {
                        "server_error".to_owned()
                    } else {
                        "invalid_request_error".to_owned()
                    }),
                    Some(format!(
                        "upstream route selection failed for model: {}",
                        request.model
                    )),
                ),
            )
            .await;
            return *response;
        }
    };
    let mut route = match route_plan.first_route() {
        Some(route) => route,
        None => {
            return openai_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "route_plan_empty",
                "internal_error",
                "resolved route plan contains no routes",
            );
        }
    };
    if let Err(error) =
        notify_after_route_selection(&state.plugins, &invocation_context, &mut route).await
    {
        record_request_trace(
            state.usage_recorder.as_ref(),
            build_request_trace_command(
                &invocation_context,
                Some(&route),
                Some(error.status_code.as_u16()),
                request.stream,
                None,
                Some(error.code.to_owned()),
                Some(error.error_type.to_owned()),
                Some(error.message.clone()),
            ),
        )
        .await;
        notify_error(&state.plugins, &invocation_context, Some(&route), &error).await;
        return error.into_openai_response();
    }
    if let Some(first_route) = route_plan.routes.first_mut() {
        *first_route = route.clone();
    }

    if request.stream {
        let Some(stream_relay) = state.stream_relay.as_ref() else {
            record_request_trace(
                state.usage_recorder.as_ref(),
                build_request_trace_command(
                    &invocation_context,
                    Some(&route),
                    Some(StatusCode::NOT_IMPLEMENTED.as_u16()),
                    true,
                    None,
                    Some("streaming_relay_not_configured".to_owned()),
                    Some("server_error".to_owned()),
                    Some(
                        "streaming provider relay is not implemented for /v1/chat/completions"
                            .to_owned(),
                    ),
                ),
            )
            .await;
            return openai_error(
                StatusCode::NOT_IMPLEMENTED,
                "streaming_relay_not_configured",
                "server_error",
                "streaming provider relay is not implemented for /v1/chat/completions",
            );
        };
        return match relay_chat_completion_stream(
            stream_relay.as_ref(),
            state.catalog.as_ref(),
            state.usage_recorder.clone(),
            state.usage_recording.clone(),
            &state.plugins,
            &invocation_context,
            context,
            route_plan,
            request,
            state.failure_strategy,
            &state.default_retry_policy,
        )
        .await
        {
            Ok(response) => response,
            Err(response) => response,
        };
    }

    let Some(relay) = state.relay.as_ref() else {
        record_request_trace(
            state.usage_recorder.as_ref(),
            build_request_trace_command(
                &invocation_context,
                Some(&route),
                Some(StatusCode::NOT_IMPLEMENTED.as_u16()),
                false,
                None,
                Some("provider_relay_not_configured".to_owned()),
                Some("server_error".to_owned()),
                Some("provider relay is not implemented for /v1/chat/completions".to_owned()),
            ),
        )
        .await;
        return openai_error(
            StatusCode::NOT_IMPLEMENTED,
            "provider_relay_not_configured",
            "server_error",
            "provider relay is not implemented for /v1/chat/completions",
        );
    };

    match relay_chat_completion(
        relay.as_ref(),
        state.usage_recorder.clone(),
        state.usage_recording.clone(),
        &state.plugins,
        &invocation_context,
        context,
        route_plan,
        request,
        state.failure_strategy,
        &state.default_retry_policy,
    )
    .await
    {
        Ok(response) => response,
        Err(response) => response,
    }
}

fn parse_request(body: &[u8]) -> Result<ParsedOpenAiChatCompletionRequest, String> {
    let request_body: Value =
        serde_json::from_slice(body).map_err(|error| format!("invalid request body: {error}"))?;
    if request_body
        .get("model")
        .and_then(Value::as_str)
        .map(str::trim)
        .is_none_or(str::is_empty)
    {
        return Err("model is required".to_owned());
    }
    let request: OpenAiChatCompletionRequest = serde_json::from_value(request_body.clone())
        .map_err(|error| format!("invalid request body: {error}"))?;
    if request.model.trim().is_empty() {
        return Err("model is required".to_owned());
    }
    if request.messages.is_empty() {
        return Err("messages is required".to_owned());
    }
    Ok(ParsedOpenAiChatCompletionRequest {
        model: request.model,
        stream: request.stream.unwrap_or(false),
        request_body,
    })
}

async fn relay_chat_completion_stream(
    relay: &(dyn ChatCompletionStreamRelay + Send + Sync),
    catalog: &(impl UpstreamAccountRouteCatalog + Send + Sync),
    usage_recorder: Option<Arc<dyn GatewayUsageRecorder + Send + Sync>>,
    usage_recording: Option<
        Arc<OpenAiUsageRecorder<impl UpstreamAccountRouteCatalog + Send + Sync + 'static>>,
    >,
    plugins: &[OpenAiInvocationPluginRef],
    invocation_context: &OpenAiInvocationContext,
    context: AuthenticatedApiKeyContext,
    route_plan: ResolvedOpenAiUpstreamRoutePlan,
    request: ParsedOpenAiChatCompletionRequest,
    failure_strategy: OpenAiRuntimeFailureStrategy,
    default_retry_policy: &ProviderRetryPolicy,
) -> Result<Response, Response> {
    let requested_model = request.model;
    let request_body = request.request_body;
    let mut last_error = None;
    let route_count = route_plan.routes.len();
    let relay_failure_strategy = failure_strategy;
    for (index, mut route) in route_plan.routes.into_iter().enumerate() {
        let is_last_route = index + 1 == route_count;
        if let Err(error) = notify_before_relay(plugins, invocation_context, &mut route).await {
            notify_error(plugins, invocation_context, Some(&route), &error).await;
            return Err(error.into_openai_response());
        }
        match relay_chat_completion_stream_route(
            relay,
            catalog,
            usage_recorder.clone(),
            usage_recording.as_ref(),
            plugins,
            invocation_context,
            &context,
            &route,
            &requested_model,
            request_body.clone(),
            relay_failure_strategy,
            route_count,
            default_retry_policy,
        )
        .await
        {
            Ok(response) => return Ok(response),
            Err(RouteRelayFailure::Retryable(response))
                if failure_strategy.should_try_next_route(is_last_route) =>
            {
                last_error = Some(response);
                continue;
            }
            Err(RouteRelayFailure::Retryable(response))
            | Err(RouteRelayFailure::Terminal(response)) => return Err(response),
        }
    }
    Err(last_error.unwrap_or_else(|| {
        openai_error(
            StatusCode::BAD_GATEWAY,
            "provider_stream_relay_failed",
            "server_error",
            "streaming provider relay failed for all configured route candidates",
        )
    }))
}

async fn relay_chat_completion_stream_route(
    relay: &(dyn ChatCompletionStreamRelay + Send + Sync),
    catalog: &(impl UpstreamAccountRouteCatalog + Send + Sync),
    usage_recorder: Option<Arc<dyn GatewayUsageRecorder + Send + Sync>>,
    usage_recording: Option<
        &Arc<OpenAiUsageRecorder<impl UpstreamAccountRouteCatalog + Send + Sync + 'static>>,
    >,
    plugins: &[OpenAiInvocationPluginRef],
    invocation_context: &OpenAiInvocationContext,
    context: &AuthenticatedApiKeyContext,
    route: &ResolvedOpenAiUpstreamRoute,
    requested_model: &str,
    request_body: serde_json::Value,
    failure_strategy: OpenAiRuntimeFailureStrategy,
    route_count: usize,
    default_retry_policy: &ProviderRetryPolicy,
) -> Result<Response, RouteRelayFailure> {
    let provider_retry_policy =
        provider_relay_attempt_retry_policy(route, failure_strategy, route_count);
    let started_at = Instant::now();
    let response = match relay
        .create_chat_completion_stream(ChatCompletionRelayRequest {
            api_key_id: context.api_key_id,
            tenant_id: context.tenant_id,
            organization_id: context.organization_id,
            user_id: context.user_id,
            group_id: route.group_id,
            group_code: route.group_code.clone(),
            pricing_plan_code: route.pricing_plan_code.clone(),
            model: requested_model.to_owned(),
            supplier_code: route.supplier_code.clone(),
            provider_account_id: route.account_id,
            provider_region_code: route.region_code.clone(),
            provider_model: route.provider_model.clone(),
            provider_base_url: route.provider_base_url.clone(),
            provider_secret_ref: route.provider_secret_ref.clone(),
            provider_auth_profile: route.provider_auth_profile.clone(),
            provider_timeout_ms: route.provider_timeout_ms,
            provider_retry_policy,
            request_body,
        })
        .await
    {
        Ok(response) => response,
        Err(error) => {
            let fault = OpenAiInvocationFault::relay_transport(error.to_string())
                .with_latency_ms(elapsed_millis(started_at));
            record_request_trace(
                usage_recorder.as_ref(),
                build_request_trace_command(
                    invocation_context,
                    Some(route),
                    Some(502),
                    true,
                    fault.latency_ms,
                    Some(fault.error_code.clone()),
                    Some("server_error".to_owned()),
                    Some(fault.message.clone()),
                ),
            )
            .await;
            let plugin_error = OpenAiInvocationPluginError::new(
                StatusCode::BAD_GATEWAY,
                "provider_stream_relay_failed",
                "server_error",
                fault.message.clone(),
            );
            notify_route_fault(plugins, invocation_context, route, &fault).await;
            notify_error(plugins, invocation_context, Some(&route), &plugin_error).await;
            return Err(RouteRelayFailure::Retryable(
                plugin_error.into_openai_response(),
            ));
        }
    };

    let status = match StatusCode::from_u16(response.status_code) {
        Ok(status) => status,
        Err(_) => {
            let fault = OpenAiInvocationFault::relay_invalid_status(
                "provider relay returned an invalid HTTP status",
            )
            .with_latency_ms(elapsed_millis(started_at));
            record_request_trace(
                usage_recorder.as_ref(),
                build_request_trace_command(
                    invocation_context,
                    Some(route),
                    Some(502),
                    true,
                    fault.latency_ms,
                    Some(fault.error_code.clone()),
                    Some("server_error".to_owned()),
                    Some(fault.message.clone()),
                ),
            )
            .await;
            notify_route_fault(plugins, invocation_context, route, &fault).await;
            return Err(RouteRelayFailure::Retryable(openai_error(
                StatusCode::BAD_GATEWAY,
                "provider_relay_invalid_status",
                "server_error",
                "provider relay returned an invalid HTTP status",
            )));
        }
    };
    let mut builder = Response::builder().status(status);
    let content_type = response
        .content_type
        .unwrap_or_else(|| "text/event-stream".to_owned());
    let relay_outcome =
        OpenAiInvocationRelayOutcome::stream(response.status_code, Some(content_type.clone()))
            .with_latency_ms(elapsed_millis(started_at));
    if !status.is_success() {
        let retryable =
            route_http_status_is_retryable(route, default_retry_policy, response.status_code);
        let fault = OpenAiInvocationFault::relay_http_status(
            response.status_code,
            retryable,
            format!(
                "provider stream relay returned HTTP {}",
                response.status_code
            ),
        )
        .with_latency_ms(elapsed_millis(started_at));
        record_request_trace(
            usage_recorder.as_ref(),
            build_request_trace_command(
                invocation_context,
                Some(route),
                Some(response.status_code),
                true,
                fault.latency_ms,
                Some(fault.error_code.clone()),
                Some("server_error".to_owned()),
                Some(fault.message.clone()),
            ),
        )
        .await;
        notify_route_fault(plugins, invocation_context, route, &fault).await;
        notify_after_relay_observers(plugins, invocation_context, route, &relay_outcome).await;
        builder = builder.header(CONTENT_TYPE, content_type);
        let response = builder.body(response.body).map_err(|_| {
            RouteRelayFailure::Terminal(openai_error(
                StatusCode::BAD_GATEWAY,
                "provider_stream_relay_failed",
                "server_error",
                "provider stream relay returned an invalid response",
            ))
        })?;
        return if retryable {
            Err(RouteRelayFailure::Retryable(response))
        } else {
            Err(RouteRelayFailure::Terminal(response))
        };
    }
    if let Some(usage_recording) = usage_recording.as_ref() {
        if let Err(fault) = usage_recording
            .record_after_success(invocation_context, &route, &relay_outcome)
            .await
        {
            record_request_trace(
                usage_recorder.as_ref(),
                build_request_trace_command(
                    invocation_context,
                    Some(&route),
                    Some(502),
                    true,
                    fault.latency_ms.or(relay_outcome.latency_ms),
                    Some(fault.error_code.clone()),
                    Some("server_error".to_owned()),
                    Some(fault.message.clone()),
                ),
            )
            .await;
            notify_route_fault(plugins, invocation_context, &route, &fault).await;
            let error = OpenAiInvocationPluginError::new(
                StatusCode::BAD_GATEWAY,
                "provider_usage_record_failed",
                "server_error",
                fault.message,
            );
            notify_error(plugins, invocation_context, Some(&route), &error).await;
            return Err(RouteRelayFailure::Terminal(error.into_openai_response()));
        }
    }
    notify_route_success(plugins, invocation_context, route, &relay_outcome).await;
    notify_after_relay_observers(plugins, invocation_context, route, &relay_outcome).await;
    builder = builder.header(CONTENT_TYPE, content_type);
    let body = match usage_recorder {
        Some(usage_recorder) if status.is_success() => {
            let command_builder = build_usage_record_command_builder(
                catalog,
                invocation_context,
                &context,
                &route,
                response.status_code,
                true,
                chat_usage_billing_profile(),
            )
            .map_err(|error| {
                RouteRelayFailure::Terminal(openai_error(
                    StatusCode::BAD_GATEWAY,
                    "provider_usage_record_failed",
                    "server_error",
                    error,
                ))
            })?
            .with_latency_ms(relay_outcome.latency_ms);
            Body::new(StreamingUsageRecordingBody::new(
                response.body,
                usage_recorder,
                command_builder,
                plugins.to_vec(),
                invocation_context.clone(),
                route.clone(),
            ))
        }
        _ => response.body,
    };
    builder.body(body).map_err(|_| {
        RouteRelayFailure::Terminal(openai_error(
            StatusCode::BAD_GATEWAY,
            "provider_stream_relay_failed",
            "server_error",
            "provider stream relay returned an invalid response",
        ))
    })
}

async fn relay_chat_completion(
    relay: &(dyn ChatCompletionRelay + Send + Sync),
    usage_recorder: Option<Arc<dyn GatewayUsageRecorder + Send + Sync>>,
    usage_recording: Option<
        Arc<OpenAiUsageRecorder<impl UpstreamAccountRouteCatalog + Send + Sync + 'static>>,
    >,
    plugins: &[OpenAiInvocationPluginRef],
    invocation_context: &OpenAiInvocationContext,
    context: AuthenticatedApiKeyContext,
    route_plan: ResolvedOpenAiUpstreamRoutePlan,
    request: ParsedOpenAiChatCompletionRequest,
    failure_strategy: OpenAiRuntimeFailureStrategy,
    default_retry_policy: &ProviderRetryPolicy,
) -> Result<Response, Response> {
    let requested_model = request.model;
    let request_body = request.request_body;
    let mut last_error = None;
    let route_count = route_plan.routes.len();
    let relay_failure_strategy = failure_strategy;
    for (index, mut route) in route_plan.routes.into_iter().enumerate() {
        let is_last_route = index + 1 == route_count;
        if let Err(error) = notify_before_relay(plugins, invocation_context, &mut route).await {
            notify_error(plugins, invocation_context, Some(&route), &error).await;
            return Err(error.into_openai_response());
        }
        match relay_chat_completion_route(
            relay,
            usage_recorder.clone(),
            usage_recording.as_ref(),
            plugins,
            invocation_context,
            &context,
            &route,
            &requested_model,
            request_body.clone(),
            relay_failure_strategy,
            route_count,
            default_retry_policy,
        )
        .await
        {
            Ok(response) => return Ok(response),
            Err(RouteRelayFailure::Retryable(response))
                if failure_strategy.should_try_next_route(is_last_route) =>
            {
                last_error = Some(response);
                continue;
            }
            Err(RouteRelayFailure::Retryable(response))
            | Err(RouteRelayFailure::Terminal(response)) => {
                return Err(response);
            }
        }
    }
    Err(last_error.unwrap_or_else(|| {
        openai_error(
            StatusCode::BAD_GATEWAY,
            "provider_relay_failed",
            "server_error",
            "provider relay failed for all configured route candidates",
        )
    }))
}

enum RouteRelayFailure {
    Retryable(Response),
    Terminal(Response),
}

fn elapsed_millis(started_at: Instant) -> i64 {
    started_at.elapsed().as_millis().clamp(1, i64::MAX as u128) as i64
}

async fn relay_chat_completion_route(
    relay: &(dyn ChatCompletionRelay + Send + Sync),
    usage_recorder: Option<Arc<dyn GatewayUsageRecorder + Send + Sync>>,
    usage_recording: Option<
        &Arc<OpenAiUsageRecorder<impl UpstreamAccountRouteCatalog + Send + Sync + 'static>>,
    >,
    plugins: &[OpenAiInvocationPluginRef],
    invocation_context: &OpenAiInvocationContext,
    context: &AuthenticatedApiKeyContext,
    route: &ResolvedOpenAiUpstreamRoute,
    requested_model: &str,
    request_body: serde_json::Value,
    failure_strategy: OpenAiRuntimeFailureStrategy,
    route_count: usize,
    default_retry_policy: &ProviderRetryPolicy,
) -> Result<Response, RouteRelayFailure> {
    let provider_retry_policy =
        provider_relay_attempt_retry_policy(route, failure_strategy, route_count);
    let started_at = Instant::now();
    let response = match relay
        .create_chat_completion(ChatCompletionRelayRequest {
            api_key_id: context.api_key_id,
            tenant_id: context.tenant_id,
            organization_id: context.organization_id,
            user_id: context.user_id,
            group_id: route.group_id,
            group_code: route.group_code.clone(),
            pricing_plan_code: route.pricing_plan_code.clone(),
            model: requested_model.to_owned(),
            supplier_code: route.supplier_code.clone(),
            provider_account_id: route.account_id,
            provider_region_code: route.region_code.clone(),
            provider_model: route.provider_model.clone(),
            provider_base_url: route.provider_base_url.clone(),
            provider_secret_ref: route.provider_secret_ref.clone(),
            provider_auth_profile: route.provider_auth_profile.clone(),
            provider_timeout_ms: route.provider_timeout_ms,
            provider_retry_policy,
            request_body,
        })
        .await
    {
        Ok(response) => response,
        Err(error) => {
            let fault = OpenAiInvocationFault::relay_transport(error.to_string())
                .with_latency_ms(elapsed_millis(started_at));
            record_request_trace(
                usage_recorder.as_ref(),
                build_request_trace_command(
                    invocation_context,
                    Some(route),
                    Some(502),
                    false,
                    fault.latency_ms,
                    Some(fault.error_code.clone()),
                    Some("server_error".to_owned()),
                    Some(fault.message.clone()),
                ),
            )
            .await;
            let plugin_error = OpenAiInvocationPluginError::new(
                StatusCode::BAD_GATEWAY,
                "provider_relay_failed",
                "server_error",
                fault.message.clone(),
            );
            notify_route_fault(plugins, invocation_context, route, &fault).await;
            notify_error(plugins, invocation_context, Some(route), &plugin_error).await;
            return Err(RouteRelayFailure::Retryable(
                plugin_error.into_openai_response(),
            ));
        }
    };

    let status = match StatusCode::from_u16(response.status_code) {
        Ok(status) => status,
        Err(_) => {
            let fault = OpenAiInvocationFault::relay_invalid_status(
                "provider relay returned an invalid HTTP status",
            )
            .with_latency_ms(elapsed_millis(started_at));
            record_request_trace(
                usage_recorder.as_ref(),
                build_request_trace_command(
                    invocation_context,
                    Some(route),
                    Some(502),
                    false,
                    fault.latency_ms,
                    Some(fault.error_code.clone()),
                    Some("server_error".to_owned()),
                    Some(fault.message.clone()),
                ),
            )
            .await;
            notify_route_fault(plugins, invocation_context, route, &fault).await;
            return Err(RouteRelayFailure::Retryable(openai_error(
                StatusCode::BAD_GATEWAY,
                "provider_relay_invalid_status",
                "server_error",
                "provider relay returned an invalid HTTP status",
            )));
        }
    };
    let relay_outcome =
        OpenAiInvocationRelayOutcome::json(response.status_code, response.body.clone())
            .with_latency_ms(elapsed_millis(started_at));
    if !status.is_success() {
        let retryable =
            route_http_status_is_retryable(route, default_retry_policy, response.status_code);
        let fault = OpenAiInvocationFault::relay_http_status(
            response.status_code,
            retryable,
            format!("provider relay returned HTTP {}", response.status_code),
        )
        .with_latency_ms(elapsed_millis(started_at));
        record_request_trace(
            usage_recorder.as_ref(),
            build_request_trace_command(
                invocation_context,
                Some(route),
                Some(response.status_code),
                false,
                fault.latency_ms,
                Some(provider_error_code_from_body(
                    &response.body,
                    &fault.error_code,
                )),
                Some(provider_error_type_from_body(
                    &response.body,
                    response.status_code,
                )),
                Some(provider_error_message_from_body(
                    &response.body,
                    &fault.message,
                )),
            ),
        )
        .await;
        notify_route_fault(plugins, invocation_context, route, &fault).await;
        notify_after_relay_observers(plugins, invocation_context, route, &relay_outcome).await;
        let response = (status, Json(response.body)).into_response();
        return if retryable {
            Err(RouteRelayFailure::Retryable(response))
        } else {
            Err(RouteRelayFailure::Terminal(response))
        };
    }
    notify_route_success(plugins, invocation_context, route, &relay_outcome).await;
    if let Some(usage_recording) = usage_recording {
        if let Err(fault) = usage_recording
            .record_after_success(invocation_context, route, &relay_outcome)
            .await
        {
            record_request_trace(
                usage_recorder.as_ref(),
                build_request_trace_command(
                    invocation_context,
                    Some(route),
                    Some(502),
                    false,
                    fault.latency_ms.or(relay_outcome.latency_ms),
                    Some(fault.error_code.clone()),
                    Some("server_error".to_owned()),
                    Some(fault.message.clone()),
                ),
            )
            .await;
            notify_route_fault(plugins, invocation_context, route, &fault).await;
            let error = OpenAiInvocationPluginError::new(
                StatusCode::BAD_GATEWAY,
                "provider_usage_record_failed",
                "server_error",
                fault.message,
            );
            notify_error(plugins, invocation_context, Some(route), &error).await;
            return Err(RouteRelayFailure::Terminal(error.into_openai_response()));
        }
    }
    notify_after_relay_observers(plugins, invocation_context, route, &relay_outcome).await;
    Ok((status, Json(response.body)).into_response())
}

struct StreamingUsageRecordingBody {
    inner: Body,
    usage_recorder: Option<Arc<dyn GatewayUsageRecorder + Send + Sync>>,
    command_builder: Option<GatewayUsageRecordCommandBuilder>,
    plugins: Vec<OpenAiInvocationPluginRef>,
    invocation_context: OpenAiInvocationContext,
    route: ResolvedOpenAiUpstreamRoute,
    event_buffer: String,
    usage: Option<OpenAiTokenUsage>,
    recording: Option<GatewayUsageRecordFuture<'static>>,
    recording_is_trace_only: bool,
    fault_notification: Option<Pin<Box<dyn Future<Output = ()> + Send>>>,
    terminal_error: Option<String>,
    trace_recorded: bool,
}

impl StreamingUsageRecordingBody {
    fn new(
        inner: Body,
        usage_recorder: Arc<dyn GatewayUsageRecorder + Send + Sync>,
        command_builder: GatewayUsageRecordCommandBuilder,
        plugins: Vec<OpenAiInvocationPluginRef>,
        invocation_context: OpenAiInvocationContext,
        route: ResolvedOpenAiUpstreamRoute,
    ) -> Self {
        Self {
            inner,
            usage_recorder: Some(usage_recorder),
            command_builder: Some(command_builder),
            plugins,
            invocation_context,
            route,
            event_buffer: String::new(),
            usage: None,
            recording: None,
            recording_is_trace_only: false,
            fault_notification: None,
            terminal_error: None,
            trace_recorded: false,
        }
    }

    fn observe_chunk(&mut self, chunk: &Bytes) {
        let text = String::from_utf8_lossy(chunk);
        self.event_buffer.push_str(&text);
        while let Some((boundary, boundary_len)) = next_sse_event_boundary(&self.event_buffer) {
            let event = self.event_buffer[..boundary].to_owned();
            self.event_buffer.drain(..boundary + boundary_len);
            self.observe_event(&event);
        }
    }

    fn observe_event(&mut self, event: &str) {
        let data = event
            .lines()
            .filter_map(|line| line.strip_prefix("data:"))
            .map(str::trim_start)
            .collect::<Vec<_>>()
            .join("\n");
        if data.is_empty() || data.trim() == "[DONE]" {
            return;
        }
        let Ok(payload) = serde_json::from_str::<Value>(&data) else {
            return;
        };
        match chat_usage_from_stream_event(&payload) {
            Ok(Some(usage)) => self.usage = Some(usage),
            Ok(None) => {}
            Err(error) => {
                tracing::warn!(error = %redact_error_message(&error), "failed to parse streaming chat usage event");
                self.terminal_error = Some(error.to_string());
            }
        }
    }

    fn prepare_recording(&mut self) {
        if self.recording.is_some() || self.terminal_error.is_some() {
            return;
        }
        let Some(usage_recorder) = self.usage_recorder.clone() else {
            return;
        };
        let Some(command_builder) = self.command_builder.as_ref() else {
            return;
        };
        let Some(usage) = self.usage else {
            tracing::warn!(
                "provider streaming chat completion response is missing usage; recording zero-token request usage"
            );
            let command = match command_builder.build_zero_token_request() {
                Ok(command) => command,
                Err(error) => {
                    tracing::warn!(error = %redact_error_message(&error), "failed to build streaming chat zero-token usage record");
                    self.terminal_error = Some(error.to_string());
                    return;
                }
            };
            let future: GatewayUsageRecordFuture<'static> =
                Box::pin(async move { usage_recorder.record_gateway_usage(command).await });
            self.recording = Some(future);
            self.recording_is_trace_only = false;
            return;
        };
        let command = match command_builder.build(usage) {
            Ok(command) => command,
            Err(error) => {
                tracing::warn!(error = %redact_error_message(&error), "failed to build streaming chat usage record");
                self.terminal_error = Some(error.to_string());
                return;
            }
        };
        let future: GatewayUsageRecordFuture<'static> =
            Box::pin(async move { usage_recorder.record_gateway_usage(command).await });
        self.recording = Some(future);
        self.recording_is_trace_only = false;
    }

    fn poll_recording(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), axum::Error>> {
        self.prepare_recording();
        if self.terminal_error.is_some() {
            return self.poll_terminal_error(cx);
        }
        let Some(recording) = self.recording.as_mut() else {
            return Poll::Ready(Ok(()));
        };
        match recording.as_mut().poll(cx) {
            Poll::Ready(Ok(())) => {
                self.recording = None;
                self.recording_is_trace_only = false;
                self.usage_recorder = None;
                self.command_builder = None;
                Poll::Ready(Ok(()))
            }
            Poll::Ready(Err(error)) => {
                self.recording = None;
                if self.recording_is_trace_only {
                    tracing::warn!(error = %redact_error_message(&error), "failed to record streaming chat trace");
                    self.recording_is_trace_only = false;
                    self.usage_recorder = None;
                    self.command_builder = None;
                    return Poll::Ready(Ok(()));
                }
                tracing::warn!(error = %redact_error_message(&error), "failed to record streaming chat usage");
                self.terminal_error = Some(error.to_string());
                self.poll_terminal_error(cx)
            }
            Poll::Pending => Poll::Pending,
        }
    }

    fn poll_terminal_error(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), axum::Error>> {
        let Some(error) = self.terminal_error.clone() else {
            return Poll::Ready(Ok(()));
        };
        if self.fault_notification.is_none() {
            let plugins = self.plugins.clone();
            let invocation_context = self.invocation_context.clone();
            let route = self.route.clone();
            let usage_recorder = self.usage_recorder.clone();
            let trace_command = self.command_builder.as_ref().map(|command_builder| {
                command_builder
                    .clone()
                    .with_error(
                        Some("provider_usage_record_failed".to_owned()),
                        Some("server_error".to_owned()),
                        Some(error.clone()),
                    )
                    .trace_command()
            });
            let should_record_trace = !self.trace_recorded;
            self.trace_recorded = true;
            let fault = OpenAiInvocationFault::usage_recording(error.clone());
            self.fault_notification = Some(Box::pin(async move {
                if should_record_trace {
                    if let (Some(usage_recorder), Some(trace_command)) =
                        (usage_recorder.as_ref(), trace_command)
                    {
                        if let Err(error) = usage_recorder.record_gateway_trace(trace_command).await
                        {
                            tracing::warn!(error = %redact_error_message(&error), "failed to record streaming usage error trace");
                        }
                    }
                }
                notify_route_fault(&plugins, &invocation_context, &route, &fault).await;
                let plugin_error = OpenAiInvocationPluginError::new(
                    StatusCode::BAD_GATEWAY,
                    "provider_usage_record_failed",
                    "server_error",
                    fault.message.clone(),
                );
                notify_error(&plugins, &invocation_context, Some(&route), &plugin_error).await;
            }));
        }
        let Some(notification) = self.fault_notification.as_mut() else {
            return Poll::Ready(Ok(()));
        };
        match notification.as_mut().poll(cx) {
            Poll::Ready(()) => {
                self.fault_notification = None;
                self.terminal_error = None;
                Poll::Ready(Err(axum::Error::new(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    error,
                ))))
            }
            Poll::Pending => Poll::Pending,
        }
    }
}

fn next_sse_event_boundary(buffer: &str) -> Option<(usize, usize)> {
    [("\r\n\r\n", 4_usize), ("\n\n", 2_usize), ("\r\r", 2_usize)]
        .into_iter()
        .filter_map(|(needle, len)| buffer.find(needle).map(|index| (index, len)))
        .min_by_key(|(index, _)| *index)
}

impl HttpBody for StreamingUsageRecordingBody {
    type Data = Bytes;
    type Error = axum::Error;

    fn poll_frame(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Option<Result<Frame<Self::Data>, Self::Error>>> {
        match Pin::new(&mut self.inner).poll_frame(cx) {
            Poll::Ready(Some(Ok(frame))) => {
                if let Some(data) = frame.data_ref() {
                    self.observe_chunk(data);
                }
                Poll::Ready(Some(Ok(frame)))
            }
            Poll::Ready(None) => match self.poll_recording(cx) {
                Poll::Ready(Ok(())) => Poll::Ready(None),
                Poll::Ready(Err(error)) => Poll::Ready(Some(Err(error))),
                Poll::Pending => Poll::Pending,
            },
            other => other,
        }
    }
}
