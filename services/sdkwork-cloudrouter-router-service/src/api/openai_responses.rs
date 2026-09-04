use std::sync::Arc;
use std::time::Instant;

use axum::body::{Body, Bytes};
use axum::extract::State;
use axum::http::header::CONTENT_TYPE;
use axum::http::{HeaderMap, StatusCode, Uri};
use axum::response::Response;
use axum::routing::post;
use axum::Router;
use sdkwork_cloudrouter_http::ApiKeyIdentity;
use serde_json::Value;

use crate::api::openai_contract::OpenAiResponsesRequest;
use crate::api::openai_chat::StreamingUsageRecordingBody;
use crate::api::openai_error::openai_error;
use crate::api::openai_invocation::{
    notify_after_relay_observers, notify_after_route_selection, notify_before_relay,
    notify_before_route_selection, notify_error, notify_route_fault, notify_route_success,
    with_builtin_invocation_plugins, OpenAiInvocationContext, OpenAiInvocationEndpoint,
    OpenAiInvocationFault, OpenAiInvocationPluginError, OpenAiInvocationPluginRef,
    OpenAiInvocationRelayOutcome,
};
use crate::api::openai_relay_execution::{
    guarded_openai_json_response, restore_relayed_model, restore_relayed_streaming_model,
    OpenAiRelayExecution, OpenAiRouteRelayExecution,
};
use crate::api::openai_runtime::{
    authenticate_api_key, provider_relay_attempt_retry_policy, resolve_openai_upstream_route_plan,
    route_http_status_is_retryable, OpenAiRouteError, OpenAiRuntimeFailureStrategy,
    OpenAiRuntimeRouteConfig, ResolvedOpenAiUpstreamRoutePlan,
};
use crate::api::openai_usage::{
    build_request_trace_command, build_usage_record_command_builder,
    provider_error_code_from_body, provider_error_message_from_body,
    provider_error_type_from_body, provider_usage_plugin_error_from_fault,
    record_request_trace, responses_usage_billing_profile, responses_usage_from_stream_event,
    OpenAiUsageRecorder,
};
use crate::application::{ApiKeySecretHasher, AuthenticatedApiKeyContext};
use crate::domain::{BillingMeter, ProviderRetryPolicy, RoutingCapability};
use crate::ports::{
    GatewayUsageRecorder, GetRuntimeRegionSettingsQuery, ResponsesRelay, ResponsesRelayRequest,
    ResponsesStreamRelay, RuntimeRegionSettingsStore, RuntimeRegionSettingsSubject,
    UpstreamAccountRouteCatalog,
};

struct OpenAiResponsesState<C> {
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Option<Arc<dyn ResponsesRelay + Send + Sync>>,
    stream_relay: Option<Arc<dyn ResponsesStreamRelay + Send + Sync>>,
    usage_recorder: Option<Arc<dyn GatewayUsageRecorder + Send + Sync>>,
    usage_recording: Option<Arc<OpenAiUsageRecorder<C>>>,
    plugins: Vec<OpenAiInvocationPluginRef>,
    failure_strategy: OpenAiRuntimeFailureStrategy,
    default_retry_policy: ProviderRetryPolicy,
    region_settings_store: Option<Arc<dyn RuntimeRegionSettingsStore + Send + Sync>>,
}

impl<C> Clone for OpenAiResponsesState<C> {
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
            region_settings_store: self.region_settings_store.clone(),
        }
    }
}

struct ParsedOpenAiResponsesRequest {
    model: String,
    stream: bool,
    request_body: Value,
}

pub fn openai_responses_router<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_responses_router_with_optional_relay(catalog, api_key_hasher, None, None, Vec::new())
}

pub fn openai_responses_router_with_relay<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Arc<dyn ResponsesRelay + Send + Sync>,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_responses_router_with_optional_relay(
        catalog,
        api_key_hasher,
        Some(relay),
        None,
        Vec::new(),
    )
}

pub fn openai_responses_router_with_relay_and_plugins<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Arc<dyn ResponsesRelay + Send + Sync>,
    plugins: Vec<OpenAiInvocationPluginRef>,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_responses_router_with_optional_relay(catalog, api_key_hasher, Some(relay), None, plugins)
}

pub fn openai_responses_router_with_relay_plugins_and_failure_strategy<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Arc<dyn ResponsesRelay + Send + Sync>,
    plugins: Vec<OpenAiInvocationPluginRef>,
    failure_strategy: OpenAiRuntimeFailureStrategy,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_responses_router_with_relays_plugins_and_failure_strategy(
        catalog,
        api_key_hasher,
        relay,
        None,
        plugins,
        failure_strategy,
    )
}

pub fn openai_responses_router_with_relays_plugins_and_failure_strategy<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Arc<dyn ResponsesRelay + Send + Sync>,
    stream_relay: Option<Arc<dyn ResponsesStreamRelay + Send + Sync>>,
    plugins: Vec<OpenAiInvocationPluginRef>,
    failure_strategy: OpenAiRuntimeFailureStrategy,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_responses_router_with_optional_relay_and_failure_strategy(
        catalog,
        api_key_hasher,
        Some(relay),
        stream_relay,
        None,
        plugins,
        failure_strategy,
    )
}

pub fn openai_responses_router_with_relay_and_usage_recorder<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Arc<dyn ResponsesRelay + Send + Sync>,
    usage_recorder: Arc<dyn GatewayUsageRecorder + Send + Sync>,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_responses_router_with_optional_relay(
        catalog,
        api_key_hasher,
        Some(relay),
        Some(usage_recorder),
        Vec::new(),
    )
}

pub fn openai_responses_router_with_relay_and_usage_recorder_and_plugins<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Arc<dyn ResponsesRelay + Send + Sync>,
    usage_recorder: Arc<dyn GatewayUsageRecorder + Send + Sync>,
    plugins: Vec<OpenAiInvocationPluginRef>,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_responses_router_with_relay_usage_recorder_plugins_and_failure_strategy(
        catalog,
        api_key_hasher,
        relay,
        usage_recorder,
        plugins,
        OpenAiRuntimeFailureStrategy::default(),
    )
}

pub fn openai_responses_router_with_relay_usage_recorder_plugins_and_failure_strategy<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Arc<dyn ResponsesRelay + Send + Sync>,
    usage_recorder: Arc<dyn GatewayUsageRecorder + Send + Sync>,
    plugins: Vec<OpenAiInvocationPluginRef>,
    failure_strategy: OpenAiRuntimeFailureStrategy,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_responses_router_with_optional_relay_and_failure_strategy(
        catalog,
        api_key_hasher,
        Some(relay),
        None,
        Some(usage_recorder),
        plugins,
        failure_strategy,
    )
}

pub fn openai_responses_router_with_relay_usage_recorder_plugins_and_runtime_config<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Arc<dyn ResponsesRelay + Send + Sync>,
    stream_relay: Option<Arc<dyn ResponsesStreamRelay + Send + Sync>>,
    usage_recorder: Arc<dyn GatewayUsageRecorder + Send + Sync>,
    plugins: Vec<OpenAiInvocationPluginRef>,
    runtime_config: OpenAiRuntimeRouteConfig,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_responses_router_with_optional_relay_and_runtime_config(
        catalog,
        api_key_hasher,
        Some(relay),
        stream_relay,
        Some(usage_recorder),
        plugins,
        runtime_config,
    )
}

fn openai_responses_router_with_optional_relay<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Option<Arc<dyn ResponsesRelay + Send + Sync>>,
    usage_recorder: Option<Arc<dyn GatewayUsageRecorder + Send + Sync>>,
    plugins: Vec<OpenAiInvocationPluginRef>,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_responses_router_with_optional_relay_and_failure_strategy(
        catalog,
        api_key_hasher,
        relay,
        None,
        usage_recorder,
        plugins,
        OpenAiRuntimeFailureStrategy::default(),
    )
}

fn openai_responses_router_with_optional_relay_and_failure_strategy<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Option<Arc<dyn ResponsesRelay + Send + Sync>>,
    stream_relay: Option<Arc<dyn ResponsesStreamRelay + Send + Sync>>,
    usage_recorder: Option<Arc<dyn GatewayUsageRecorder + Send + Sync>>,
    plugins: Vec<OpenAiInvocationPluginRef>,
    failure_strategy: OpenAiRuntimeFailureStrategy,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_responses_router_with_optional_relay_and_runtime_config(
        catalog,
        api_key_hasher,
        relay,
        stream_relay,
        usage_recorder,
        plugins,
        OpenAiRuntimeRouteConfig::new(
            ProviderRetryPolicy::default(),
            responses_create_failure_strategy(failure_strategy),
        ),
    )
}

#[allow(clippy::too_many_arguments)]
fn openai_responses_router_with_optional_relay_and_runtime_config<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    relay: Option<Arc<dyn ResponsesRelay + Send + Sync>>,
    stream_relay: Option<Arc<dyn ResponsesStreamRelay + Send + Sync>>,
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
        .route("/v1/responses", post(create_response::<C>))
        .with_state(OpenAiResponsesState {
            catalog,
            api_key_hasher,
            relay,
            stream_relay,
            usage_recorder,
            usage_recording,
            plugins: with_builtin_invocation_plugins(plugins),
            failure_strategy: responses_create_failure_strategy(runtime_config.failure_strategy),
            default_retry_policy: runtime_config.default_retry_policy,
            region_settings_store: runtime_config.region_settings_store.clone(),
        })
}

fn responses_create_failure_strategy(
    _configured: OpenAiRuntimeFailureStrategy,
) -> OpenAiRuntimeFailureStrategy {
    OpenAiRuntimeFailureStrategy::FailClosed
}

async fn create_response<C>(
    State(state): State<OpenAiResponsesState<C>>,
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
        OpenAiInvocationEndpoint::Responses,
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
    let tenant_region_code = match state.region_settings_store.as_ref() {
        Some(store) => store
            .get_runtime_region_settings(GetRuntimeRegionSettingsQuery {
                subject: RuntimeRegionSettingsSubject {
                    tenant_id: context.tenant_id,
                    organization_id: context.organization_id,
                    operator_id: 0,
                    operator_type: 0,
                },
            })
            .await
            .ok()
            .map(|settings| settings.current_region_code),
        None => None,
    };
    let mut route_plan = match validate_responses_model(
        &state,
        &context,
        &request.model,
        tenant_region_code.as_deref(),
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
                    None,
                    Some("streaming_relay_not_configured".to_owned()),
                    Some("server_error".to_owned()),
                    Some("streaming provider relay is not implemented for /v1/responses".to_owned()),
                ),
            )
            .await;
            return openai_error(
                StatusCode::NOT_IMPLEMENTED,
                "streaming_relay_not_configured",
                "server_error",
                "streaming provider relay is not implemented for /v1/responses",
            );
        };
        return match relay_response_stream(
            stream_relay.as_ref(),
            state.catalog.as_ref(),
            OpenAiRelayExecution {
                usage_recorder: state.usage_recorder.clone(),
                usage_recording: state.usage_recording.clone(),
                plugins: &state.plugins,
                invocation_context: &invocation_context,
                context,
                route_plan,
                request,
                failure_strategy: state.failure_strategy,
                default_retry_policy: &state.default_retry_policy,
            },
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
                None,
                Some("responses_relay_not_configured".to_owned()),
                Some("server_error".to_owned()),
                Some("provider relay is not implemented for /v1/responses".to_owned()),
            ),
        )
        .await;
        return openai_error(
            StatusCode::NOT_IMPLEMENTED,
            "responses_relay_not_configured",
            "server_error",
            "provider relay is not implemented for /v1/responses",
        );
    };

    match relay_response(
        relay.as_ref(),
        OpenAiRelayExecution {
            usage_recorder: state.usage_recorder.clone(),
            usage_recording: state.usage_recording.clone(),
            plugins: &state.plugins,
            invocation_context: &invocation_context,
            context,
            route_plan,
            request,
            failure_strategy: state.failure_strategy,
            default_retry_policy: &state.default_retry_policy,
        },
    )
    .await
    {
        Ok(response) => response,
        Err(response) => response,
    }
}

fn parse_request(body: &[u8]) -> Result<ParsedOpenAiResponsesRequest, String> {
    let request_body: Value =
        serde_json::from_slice(body).map_err(|error| format!("invalid request body: {error}"))?;
    let request: OpenAiResponsesRequest = serde_json::from_value(request_body.clone())
        .map_err(|error| format!("invalid request body: {error}"))?;
    if request.model.trim().is_empty() {
        return Err("model is required".to_owned());
    }
    if request.input.is_null() {
        return Err("input is required".to_owned());
    }
    Ok(ParsedOpenAiResponsesRequest {
        model: request.model,
        stream: request.stream.unwrap_or(false),
        request_body,
    })
}

fn validate_responses_model<C>(
    state: &OpenAiResponsesState<C>,
    context: &AuthenticatedApiKeyContext,
    model: &str,
    tenant_region_code: Option<&str>,
) -> Result<ResolvedOpenAiUpstreamRoutePlan, OpenAiRouteError>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    resolve_openai_upstream_route_plan(
        state.catalog.as_ref(),
        context,
        model,
        &["response", "responses"],
        "responses",
        RoutingCapability::Chat,
        BillingMeter::LlmInputToken,
        tenant_region_code.as_deref(),
    )
}

async fn relay_response<C>(
    relay: &(dyn ResponsesRelay + Send + Sync),
    execution: OpenAiRelayExecution<'_, C, ParsedOpenAiResponsesRequest>,
) -> Result<Response, Response>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let OpenAiRelayExecution {
        usage_recorder,
        usage_recording,
        plugins,
        invocation_context,
        context,
        route_plan,
        request,
        failure_strategy,
        default_retry_policy,
    } = execution;
    let requested_model = request.model;
    let request_body = request.request_body;
    let mut last_error = None;
    let route_count = route_plan.routes.len();
    for (index, mut route) in route_plan.routes.into_iter().enumerate() {
        let is_last_route = index + 1 == route_count;
        if let Err(error) = notify_before_relay(plugins, invocation_context, &mut route).await {
            notify_error(plugins, invocation_context, Some(&route), &error).await;
            return Err(error.into_openai_response());
        }
        match relay_response_route(
            relay,
            OpenAiRouteRelayExecution {
                usage_recorder: usage_recorder.clone(),
                usage_recording: usage_recording.as_ref(),
                plugins,
                invocation_context,
                context: &context,
                route: &route,
                requested_model: &requested_model,
                request_body: request_body.clone(),
                failure_strategy,
                route_count,
                default_retry_policy,
            },
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

async fn relay_response_route<C>(
    relay: &(dyn ResponsesRelay + Send + Sync),
    execution: OpenAiRouteRelayExecution<'_, C>,
) -> Result<Response, RouteRelayFailure>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let OpenAiRouteRelayExecution {
        usage_recorder,
        usage_recording,
        plugins,
        invocation_context,
        context,
        route,
        requested_model,
        request_body,
        failure_strategy,
        route_count,
        default_retry_policy,
    } = execution;
    let provider_retry_policy =
        provider_relay_attempt_retry_policy(route, failure_strategy, route_count);
    // Preflight pricing: resolve and validate every quote for this route once,
    // before any upstream tokens can be consumed. A pricing failure must
    // terminate the request immediately instead of relaying traffic that
    // cannot be billed; the usage recording phase below only reads the
    // preloaded builder and never re-resolves prices.
    let prebuilt_usage = match usage_recording {
        Some(usage_recording) => {
            match usage_recording.prepare_usage_command_builder(invocation_context, route, false) {
                Ok(builder) => Some(builder),
                Err(error) => {
                    let message = format!("pricing preflight failed before relay: {error}");
                    record_request_trace(
                        usage_recorder.as_ref(),
                        build_request_trace_command(
                            invocation_context,
                            Some(route),
                            None,
                            None,
                            None,
                            Some("server_error".to_owned()),
                            Some(message.clone()),
                        ),
                    )
                    .await;
                    let error = OpenAiInvocationPluginError::new(
                        StatusCode::SERVICE_UNAVAILABLE,
                        "pricing_unavailable",
                        "server_error",
                        message,
                    );
                    notify_error(plugins, invocation_context, Some(route), &error).await;
                    return Err(RouteRelayFailure::Terminal(error.into_openai_response()));
                }
            }
        }
        None => None,
    };
    let started_at = Instant::now();
    let response = match relay
        .create_response(ResponsesRelayRequest {
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
    let outcome = OpenAiInvocationRelayOutcome::json(response.status_code, response.body.clone())
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
        notify_after_relay_observers(plugins, invocation_context, route, &outcome).await;
        let response = guarded_openai_json_response(
            status,
            restore_relayed_model(response.body, requested_model),
            response.memory_guard,
        );
        return if retryable {
            Err(RouteRelayFailure::Retryable(response))
        } else {
            Err(RouteRelayFailure::Terminal(response))
        };
    }
    if let Some(usage_recording) = usage_recording {
        if let Err(fault) = usage_recording
            .record_after_success(invocation_context, &outcome, prebuilt_usage)
            .await
        {
            record_request_trace(
                usage_recorder.as_ref(),
                build_request_trace_command(
                    invocation_context,
                    Some(route),
                    Some(502),
                    fault.latency_ms.or(outcome.latency_ms),
                    Some(fault.error_code.clone()),
                    Some("server_error".to_owned()),
                    Some(fault.message.clone()),
                ),
            )
            .await;
            notify_route_fault(plugins, invocation_context, route, &fault).await;
            let error = provider_usage_plugin_error_from_fault(fault);
            notify_error(plugins, invocation_context, Some(route), &error).await;
            return Err(RouteRelayFailure::Terminal(error.into_openai_response()));
        }
    }
    notify_route_success(plugins, invocation_context, route, &outcome).await;
    notify_after_relay_observers(plugins, invocation_context, route, &outcome).await;
    Ok(guarded_openai_json_response(
        status,
        restore_relayed_model(response.body, requested_model),
        response.memory_guard,
    ))
}

async fn relay_response_stream<C>(
    relay: &(dyn ResponsesStreamRelay + Send + Sync),
    catalog: &C,
    execution: OpenAiRelayExecution<'_, C, ParsedOpenAiResponsesRequest>,
) -> Result<Response, Response>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let OpenAiRelayExecution {
        usage_recorder,
        usage_recording,
        plugins,
        invocation_context,
        context,
        route_plan,
        request,
        failure_strategy,
        default_retry_policy,
    } = execution;
    let requested_model = request.model;
    let request_body = request.request_body;
    let mut last_error = None;
    let route_count = route_plan.routes.len();
    for (index, mut route) in route_plan.routes.into_iter().enumerate() {
        let is_last_route = index + 1 == route_count;
        if let Err(error) = notify_before_relay(plugins, invocation_context, &mut route).await {
            notify_error(plugins, invocation_context, Some(&route), &error).await;
            return Err(error.into_openai_response());
        }
        match relay_response_stream_route(
            relay,
            catalog,
            OpenAiRouteRelayExecution {
                usage_recorder: usage_recorder.clone(),
                usage_recording: usage_recording.as_ref(),
                plugins,
                invocation_context,
                context: &context,
                route: &route,
                requested_model: &requested_model,
                request_body: request_body.clone(),
                failure_strategy,
                route_count,
                default_retry_policy,
            },
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

async fn relay_response_stream_route<C>(
    relay: &(dyn ResponsesStreamRelay + Send + Sync),
    catalog: &C,
    execution: OpenAiRouteRelayExecution<'_, C>,
) -> Result<Response, RouteRelayFailure>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let OpenAiRouteRelayExecution {
        usage_recorder,
        usage_recording,
        plugins,
        invocation_context,
        context,
        route,
        requested_model,
        request_body,
        failure_strategy,
        route_count,
        default_retry_policy,
    } = execution;
    let provider_retry_policy =
        provider_relay_attempt_retry_policy(route, failure_strategy, route_count);
    // Preflight pricing before the stream is dispatched: the quotes loaded
    // here are the only prices the streaming usage recorder may use. A
    // pricing failure terminates the request before any upstream tokens are
    // consumed instead of streaming traffic that cannot be billed.
    let prebuilt_usage = match usage_recording {
        Some(usage_recording) => {
            match usage_recording.prepare_usage_command_builder(invocation_context, route, true) {
                Ok(builder) => Some(builder),
                Err(error) => {
                    let message = format!("pricing preflight failed before relay: {error}");
                    record_request_trace(
                        usage_recorder.as_ref(),
                        build_request_trace_command(
                            invocation_context,
                            Some(route),
                            None,
                            None,
                            None,
                            Some("server_error".to_owned()),
                            Some(message.clone()),
                        ),
                    )
                    .await;
                    let error = OpenAiInvocationPluginError::new(
                        StatusCode::SERVICE_UNAVAILABLE,
                        "pricing_unavailable",
                        "server_error",
                        message,
                    );
                    notify_error(plugins, invocation_context, Some(route), &error).await;
                    return Err(RouteRelayFailure::Terminal(error.into_openai_response()));
                }
            }
        }
        None => None,
    };
    let started_at = Instant::now();
    let response = match relay
        .create_response_stream(ResponsesRelayRequest {
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
            .record_after_success(invocation_context, &relay_outcome, prebuilt_usage.clone())
            .await
        {
            record_request_trace(
                usage_recorder.as_ref(),
                build_request_trace_command(
                    invocation_context,
                    Some(route),
                    Some(502),
                    fault.latency_ms.or(relay_outcome.latency_ms),
                    Some(fault.error_code.clone()),
                    Some("server_error".to_owned()),
                    Some(fault.message.clone()),
                ),
            )
            .await;
            notify_route_fault(plugins, invocation_context, route, &fault).await;
            let error = provider_usage_plugin_error_from_fault(fault);
            notify_error(plugins, invocation_context, Some(route), &error).await;
            return Err(RouteRelayFailure::Terminal(error.into_openai_response()));
        }
    }
    builder = builder.header(CONTENT_TYPE, content_type);
    let body = match usage_recorder {
        Some(usage_recorder) if status.is_success() => {
            let command_builder = match prebuilt_usage {
                Some(builder) => builder
                    .with_http_status(response.status_code)
                    .with_latency_ms(relay_outcome.latency_ms),
                None => build_usage_record_command_builder(
                    catalog,
                    invocation_context,
                    context,
                    route,
                    response.status_code,
                    true,
                    responses_usage_billing_profile(),
                )
                .map_err(|error| {
                    RouteRelayFailure::Terminal(openai_error(
                        StatusCode::BAD_GATEWAY,
                        "provider_usage_record_failed",
                        "server_error",
                        error,
                    ))
                })?
                .with_latency_ms(relay_outcome.latency_ms),
            };
            Body::new(StreamingUsageRecordingBody::new(
                restore_relayed_streaming_model(response.body, requested_model),
                usage_recorder,
                command_builder,
                plugins.to_vec(),
                invocation_context.clone(),
                route.clone(),
                relay_outcome,
                responses_usage_from_stream_event,
                OpenAiInvocationEndpoint::Responses,
            ))
        }
        _ => {
            notify_route_success(plugins, invocation_context, route, &relay_outcome).await;
            notify_after_relay_observers(plugins, invocation_context, route, &relay_outcome).await;
            response.body
        }
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
