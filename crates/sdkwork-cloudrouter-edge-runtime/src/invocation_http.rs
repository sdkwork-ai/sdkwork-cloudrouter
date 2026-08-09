use std::net::SocketAddr;
use std::time::Duration;

use axum::body::{to_bytes, Body};
use axum::extract::ConnectInfo;
use axum::http::{header, HeaderMap, HeaderValue, Request, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use sdkwork_cloudrouter_router_service::application::{
    BillingMode, DeferredStreamInvocation, DeferredStreamResponse, DispatchMode,
    GatewayInvocationPolicyViolation, Invocation, InvocationBody, InvocationClassification,
    InvocationClassificationRequest, InvocationDispatchResponse, InvocationError,
    InvocationErrorKind, InvocationPipelineExecution, InvocationRequest,
    InvocationResourceClassifier, InvocationSubject, InvocationSurface, OpenAiResourceClassifier,
    ProviderNativeResourceClassifier, ResourceType,
};
use sdkwork_cloudrouter_router_service::ports::{PricingCatalog, UpstreamAccountRouteCatalog};
use sdkwork_cloudrouter_security::{INTERNAL_GATEWAY_AUTH_HEADERS, INTERNAL_GATEWAY_ROUTE_PREFIX};
use serde_json::{json, Value};

use crate::gateway_api_key_auth::{
    authenticate_gateway_api_key, authenticate_internal_gateway_request,
    sanitize_authenticated_gateway_uri,
};
use crate::invocation_router::InvocationRouterState;
use crate::invocation_stream::{wrap_invocation_stream, InvocationStreamTimeouts};
use crate::request_identity::generate_server_request_id;

pub(crate) async fn handle_invocation<C>(
    state: InvocationRouterState<C>,
    request: Request<Body>,
) -> Response
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let (mut parts, body) = request.into_parts();
    let preclassified_openai = if is_openai_prefixed_path(parts.uri.path()) {
        match classify_request(&parts.method, &parts.uri) {
            Ok(classified) => Some(classified),
            Err(_) => return not_found_response(),
        }
    } else {
        None
    };
    let auth_context = match authenticate_gateway_api_key(
        state.catalog.as_ref(),
        state.api_key_hasher.as_ref(),
        &parts.headers,
        &parts.uri,
        state.query_string_api_key_policy,
    ) {
        Ok(context) => context,
        Err(error) => return error.into_response(),
    };
    parts.uri = match sanitize_authenticated_gateway_uri(&parts.uri) {
        Ok(uri) => uri,
        Err(error) => return error.into_response(),
    };
    handle_authenticated_invocation(
        state,
        Request::from_parts(parts, body),
        auth_context,
        preclassified_openai,
    )
    .await
}

pub(crate) async fn handle_internal_invocation<C>(
    state: InvocationRouterState<C>,
    request: Request<Body>,
) -> Response
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let Some(verifier) = state.internal_gateway_verifier.as_ref() else {
        return response_from_invocation_error(&InvocationError::new(
            InvocationErrorKind::Authentication,
            "internal gateway authentication is unavailable",
        ));
    };
    let (mut parts, body) = request.into_parts();
    if contains_public_api_key_credential(&parts.headers) {
        return response_from_invocation_error(&InvocationError::new(
            InvocationErrorKind::Authentication,
            "internal gateway requests must not contain public API key credentials",
        ));
    }
    if content_length_from_headers(&parts.headers)
        .is_some_and(|content_length| content_length > state.body_limit_bytes)
    {
        return response_from_invocation_error(&invalid_request(format!(
            "request body exceeds the maximum allowed size of {} bytes",
            state.body_limit_bytes
        )));
    }
    let body = match to_bytes(body, state.body_limit_bytes).await {
        Ok(body) => body,
        Err(error) => {
            return response_from_invocation_error(&invalid_request(format!(
                "request body is invalid: {error}"
            )))
        }
    };
    let auth_context = match authenticate_internal_gateway_request(
        state.catalog.as_ref(),
        verifier.as_ref(),
        &parts.headers,
        &parts.method,
        &parts.uri,
        &body,
    )
    .await
    {
        Ok(context) => context,
        Err(error) => return error.into_response(),
    };
    parts.uri = match internal_gateway_target_uri(&parts.uri)
        .and_then(|uri| sanitize_authenticated_gateway_uri(&uri).map_err(|_| ()))
    {
        Ok(uri) => uri,
        Err(()) => {
            return response_from_invocation_error(&invalid_request(
                "internal gateway target URI is invalid",
            ))
        }
    };
    for header in INTERNAL_GATEWAY_AUTH_HEADERS {
        parts.headers.remove(*header);
    }
    handle_authenticated_invocation(
        state,
        Request::from_parts(parts, Body::from(body)),
        auth_context,
        None,
    )
    .await
}

async fn handle_authenticated_invocation<C>(
    state: InvocationRouterState<C>,
    request: Request<Body>,
    auth_context: sdkwork_cloudrouter_router_service::application::AuthenticatedApiKeyContext,
    preclassified_openai: Option<(InvocationClassification, String)>,
) -> Response
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let (parts, body) = request.into_parts();
    let client_ip = extract_client_ip(&parts, false);
    if let Err(violation) = state
        .invocation_policy_guard
        .enforce(state.catalog.as_ref(), &auth_context, client_ip.as_deref())
        .await
    {
        return response_from_policy_violation(&violation);
    }

    let body_limit = state.body_limit_bytes;
    let body = match invocation_body_from_http(&parts.headers, body, body_limit).await {
        Ok(body) => body,
        Err(error) => return response_from_invocation_error(&error),
    };
    let classified = match preclassified_openai {
        Some(classified) => classified,
        None => match classify_request(&parts.method, &parts.uri) {
            Ok(classified) => classified,
            Err(error) => return response_from_invocation_error(&error),
        },
    };
    let (classification, invocation_path) = classified;
    let (resource, billing, routing) = classification.into_parts();
    let request = invocation_request_from_http(
        parts.method,
        invocation_path,
        parts.uri,
        parts.headers,
        body,
    );
    let account_group_id = auth_context.group_id;
    let subject = InvocationSubject::from_api_key_context(auth_context);
    let mut invocation = Invocation::new(request, subject, resource, billing);
    invocation.routing = routing;
    apply_gateway_dispatch_defaults(&mut invocation, state.catalog.as_ref(), account_group_id);

    match state.pipeline.execute_for_response(invocation).await {
        Ok(InvocationPipelineExecution::Completed(invocation)) => invocation
            .telemetry
            .normalized_response
            .map(normalized_response_to_http)
            .unwrap_or_else(empty_response),
        Ok(InvocationPipelineExecution::DeferredStream(deferred)) => {
            deferred_stream_response_to_http(deferred, state.stream_response_timeout)
        }
        Err(failure) => {
            if failure.invocation.telemetry.normalized_response.is_none() {
                return response_from_invocation_error(&failure.error);
            }
            failure
                .invocation
                .telemetry
                .normalized_response
                .map(normalized_response_to_http)
                .unwrap_or_else(empty_response)
        }
    }
}

fn contains_public_api_key_credential(headers: &HeaderMap) -> bool {
    ["authorization", "x-api-key", "x-goog-api-key", "api-key"]
        .iter()
        .any(|name| headers.contains_key(*name))
}

fn internal_gateway_target_uri(uri: &Uri) -> Result<Uri, ()> {
    let target_path = uri
        .path()
        .strip_prefix(INTERNAL_GATEWAY_ROUTE_PREFIX)
        .filter(|path| path.starts_with('/') && path.len() > 1)
        .ok_or(())?;
    let path_and_query = match uri.query() {
        Some(query) => format!("{target_path}?{query}"),
        None => target_path.to_owned(),
    };
    path_and_query.parse::<Uri>().map_err(|_| ())
}

fn deferred_stream_response_to_http(
    mut deferred: DeferredStreamInvocation,
    stream_response_timeout: Duration,
) -> Response {
    let DeferredStreamResponse {
        status_code,
        content_type,
        body,
    } = match deferred.take_response() {
        Ok(response) => response,
        Err(error) => return response_from_invocation_error(&error),
    };
    let timeout = InvocationStreamTimeouts::from_account_timeout(
        deferred.stream_timeout(),
        stream_response_timeout,
    );
    let body = wrap_invocation_stream(body, content_type.as_deref(), deferred, timeout);
    let status = StatusCode::from_u16(status_code).unwrap_or(StatusCode::BAD_GATEWAY);
    let mut response = Response::new(body);
    *response.status_mut() = status;
    if let Some(content_type) = content_type
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .and_then(|value| HeaderValue::from_str(value).ok())
    {
        response
            .headers_mut()
            .insert(header::CONTENT_TYPE, content_type);
    }
    response
}

async fn invocation_body_from_http(
    headers: &HeaderMap,
    body: Body,
    limit: usize,
) -> Result<InvocationBody, InvocationError> {
    // Pre-check Content-Length before buffering any bytes so oversized
    // requests are rejected immediately without allocating memory.
    if let Some(content_length) = content_length_from_headers(headers) {
        if content_length > limit {
            return Err(invalid_request(format!(
                "request body exceeds the maximum allowed size of {limit} bytes"
            )));
        }
    }
    let bytes = to_bytes(body, limit)
        .await
        .map_err(|error| invalid_request(format!("request body is invalid: {error}")))?;
    if bytes.is_empty() {
        return Ok(InvocationBody::Empty);
    }
    if request_body_should_parse_json(headers, &bytes) {
        let value = serde_json::from_slice::<Value>(&bytes)
            .map_err(|error| invalid_request(format!("invalid request body: {error}")))?;
        return Ok(InvocationBody::Json(value));
    }
    Ok(InvocationBody::Bytes(bytes.to_vec()))
}

fn request_body_should_parse_json(headers: &HeaderMap, bytes: &[u8]) -> bool {
    headers
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.to_ascii_lowercase().contains("application/json"))
        .unwrap_or_else(|| {
            let trimmed = bytes
                .iter()
                .copied()
                .find(|byte| !byte.is_ascii_whitespace());
            matches!(trimmed, Some(b'{') | Some(b'['))
        })
}

fn classify_request(
    method: &axum::http::Method,
    uri: &Uri,
) -> Result<
    (
        sdkwork_cloudrouter_router_service::application::InvocationClassification,
        String,
    ),
    InvocationError,
> {
    let path = uri.path();
    let mut request = InvocationClassificationRequest::new(method.clone(), path);
    if let Some(query) = uri.query() {
        request.query = Some(query.to_owned());
    }

    if path == "/v1" || path.starts_with("/v1/") {
        return OpenAiResourceClassifier
            .classify(&request)
            .map(|classification| (classification, path.to_owned()));
    }

    let Some((supplier_code, standard_path)) = provider_native_parts(path) else {
        return Err(InvocationError::new(
            InvocationErrorKind::ResourceClassification,
            format!("unsupported invocation route: {} {}", method, path),
        ));
    };
    request.path = standard_path;
    request.supplier_code = Some(supplier_code);
    let invocation_path = request.path.clone();
    ProviderNativeResourceClassifier
        .classify(&request)
        .map(|classification| (classification, invocation_path))
}

fn is_openai_prefixed_path(path: &str) -> bool {
    path == "/v1" || path.starts_with("/v1/")
}

fn provider_native_parts(path: &str) -> Option<(String, String)> {
    let mut segments = path.trim_matches('/').split('/').filter(|value| {
        let value = value.trim();
        !value.is_empty()
    });
    let first = segments.next()?;
    let provider = if first == "provider" || first == "providers" {
        segments.next()?
    } else {
        first
    };
    if provider == "v1" || provider.is_empty() {
        return None;
    }
    let rest = segments.collect::<Vec<_>>();
    let standard_path = if rest.is_empty() {
        "/".to_owned()
    } else {
        format!("/{}", rest.join("/"))
    };
    Some((provider.to_owned(), standard_path))
}

fn invocation_request_from_http(
    method: axum::http::Method,
    path: String,
    uri: Uri,
    headers: HeaderMap,
    body: InvocationBody,
) -> InvocationRequest {
    let request_id = generate_server_request_id();
    let trace_id =
        header_text(&headers, "x-trace-id").or_else(|| header_text(&headers, "traceparent"));
    let idempotency_key = header_text(&headers, "idempotency-key");
    let user_agent = header_text(&headers, header::USER_AGENT.as_str());
    let content_type = header_text(&headers, header::CONTENT_TYPE.as_str());
    let client_ip = extract_client_ip_from_headers(&headers, false);

    let mut request = InvocationRequest::new(method, path)
        .with_request_id(request_id)
        .with_body(body);
    if let Some(query) = uri.query() {
        request = request.with_query(query.to_owned());
    }
    request.headers = headers;
    request.content_type = content_type;
    request.user_agent = user_agent;
    request.trace_id = trace_id;
    request.idempotency_key = idempotency_key;
    request.client_ip = client_ip;
    request
}

fn apply_gateway_dispatch_defaults<C>(
    invocation: &mut Invocation,
    catalog: &C,
    account_group_id: i64,
) where
    C: PricingCatalog,
{
    if invocation.resource.surface == InvocationSurface::OpenAiCompatible
        && invocation.resource.resource_type == ResourceType::FreeEndpoint
        && invocation.resource.api_code == "openai.models"
        && invocation.request.method == axum::http::Method::GET
        && invocation.request.path == "/v1/models"
    {
        // Only expose models the authenticated key's account group can
        // actually route to, mirroring the group-scoped `/v1/vendors` view.
        // An unscoped list would leak models of other groups/tenants and
        // advertise models the caller cannot use.
        let mut models = Vec::new();
        let callable_accounts = catalog
            .list_upstream_account_routes()
            .into_iter()
            .filter(|route| group_account_route_is_callable(route, account_group_id))
            .collect::<Vec<_>>();
        catalog.visit_models(None, &mut |model| {
            // Model routes are keyed by catalog key (`vendor/model`), so the
            // lookup must try both the model name and the catalog key.
            let reachable = model_upstream_route_matches_account(
                catalog,
                &model.model,
                &callable_accounts,
            ) || model_upstream_route_matches_account(
                catalog,
                &model.catalog_key,
                &callable_accounts,
            );
            if !reachable {
                return true;
            }
            let owned_by = catalog
                .find_vendor(&model.vendor_code)
                .map(|vendor| vendor.vendor.code().to_owned())
                .unwrap_or_else(|| model.vendor_code.clone());
            models.push(json!({
                "id": model.model,
                "object": "model",
                "created": 0,
                "owned_by": owned_by
            }));
            true
        });
        invocation.dispatch.mode = DispatchMode::SyntheticLocalResponse;
        invocation.dispatch.response = Some(InvocationDispatchResponse::json(
            200,
            json!({
                "object": "list",
                "data": models
            }),
        ));
        return;
    }

    if invocation.resource.surface == InvocationSurface::OpenAiCompatible
        && invocation.resource.resource_type == ResourceType::FreeEndpoint
        && invocation.resource.api_code == "openai.vendors"
        && invocation.request.method == axum::http::Method::GET
        && invocation.request.path == "/v1/vendors"
    {
        // Cloud Router extension: vendors (with their models) reachable for
        // the authenticated key's account group, mirroring the router path.
        let data = sdkwork_cloudrouter_router_service::api::list_group_scoped_vendors(
            catalog,
            account_group_id,
        )
        .into_iter()
        .map(|vendor| {
            let models = vendor
                .models
                .into_iter()
                .map(|model| {
                    let mut entry = json!({ "id": model.id, "displayName": model.display_name });
                    if let Some(context_tokens) = model.context_tokens {
                        entry["contextTokens"] = json!(context_tokens);
                    }
                    if let Some(max_output_tokens) = model.max_output_tokens {
                        entry["maxOutputTokens"] = json!(max_output_tokens);
                    }
                    entry
                })
                .collect::<Vec<_>>();
            json!({
                "code": vendor.code,
                "name": vendor.name,
                "models": models
            })
        })
        .collect::<Vec<_>>();
        invocation.dispatch.mode = DispatchMode::SyntheticLocalResponse;
        invocation.dispatch.response = Some(InvocationDispatchResponse::json(
            200,
            json!({
                "object": "list",
                "data": data
            }),
        ));
        return;
    }

    if invocation.billing.mode == BillingMode::Free {
        invocation.dispatch.mode = DispatchMode::NoopFree;
    }
}

fn normalized_response_to_http(
    normalized: sdkwork_cloudrouter_router_service::application::InvocationNormalizedResponse,
) -> Response {
    let sdkwork_cloudrouter_router_service::application::InvocationNormalizedResponse {
        status_code,
        body,
        body_bytes,
        content_type,
        stream_body,
        memory_guard,
    } = normalized;
    let status = StatusCode::from_u16(status_code).unwrap_or(StatusCode::BAD_GATEWAY);

    // For streaming responses, return the body directly without buffering
    if let Ok(Some(stream)) = stream_body.lock().map(|mut guard| guard.take()) {
        let mut response = Response::new(stream);
        *response.status_mut() = status;
        if let Some(ct) = content_type
            .as_deref()
            .filter(|value| !value.trim().is_empty())
            .and_then(|value| HeaderValue::from_str(value).ok())
        {
            response.headers_mut().insert(header::CONTENT_TYPE, ct);
        }
        return response;
    }

    let body = body_bytes
        .or_else(|| body.map(|body| serde_json::to_vec(&body).unwrap_or_else(|_| b"{}".to_vec())));
    let body = body.unwrap_or_default();
    let body = match memory_guard {
        Some(memory_guard) => memory_guard.wrap_body(body),
        None => Body::from(body),
    };
    let mut response = Response::new(body);
    *response.status_mut() = status;
    if let Some(content_type) = content_type
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .and_then(|value| HeaderValue::from_str(value).ok())
    {
        response
            .headers_mut()
            .insert(header::CONTENT_TYPE, content_type);
    }
    response
}

/// Extract the client IP address from request parts.
///
/// When `trust_forwarded_headers` is `false` (the default), the function
/// reads the IP from the axum `ConnectInfo<SocketAddr>` request extension
/// and ignores any client-supplied `x-forwarded-for` or `x-real-ip` headers
/// to prevent IP spoofing and rate-limit bypass.
///
/// When `trust_forwarded_headers` is `true`, the function trusts the first
/// valid IP from `x-forwarded-for` (falling back to `x-real-ip`). This must
/// only be enabled behind a controlled reverse proxy.
fn extract_client_ip(
    parts: &axum::http::request::Parts,
    trust_forwarded_headers: bool,
) -> Option<String> {
    if !trust_forwarded_headers {
        return parts
            .extensions
            .get::<ConnectInfo<SocketAddr>>()
            .map(|ConnectInfo(addr)| addr.ip().to_string());
    }
    extract_client_ip_from_headers(&parts.headers, true)
}

fn extract_client_ip_from_headers(
    headers: &HeaderMap,
    trust_forwarded_headers: bool,
) -> Option<String> {
    if !trust_forwarded_headers {
        return None;
    }
    header_text(headers, "x-forwarded-for")
        .and_then(|value| value.split(',').next().map(str::trim).map(str::to_owned))
        .filter(|value| !value.is_empty())
        .or_else(|| header_text(headers, "x-real-ip"))
}

/// Redact sensitive credential tokens from error messages before they are
/// returned to API clients, using the shared redaction helper so the gateway
/// HTTP error path matches the invocation pipeline's error body redaction.
fn redact_sensitive_tokens(message: &str) -> String {
    sdkwork_cloudrouter_router_service::redaction::redact_sensitive_tokens(message)
}

pub(crate) fn response_from_policy_violation(
    violation: &GatewayInvocationPolicyViolation,
) -> Response {
    match violation {
        GatewayInvocationPolicyViolation::Forbidden(message) => {
            let error = InvocationError::new(InvocationErrorKind::Authorization, message.clone());
            response_from_invocation_error(&error)
        }
        GatewayInvocationPolicyViolation::RateLimited {
            message,
            retry_after_secs,
        } => {
            let body = json!({
                "error": {
                    "message": message,
                    "type": "rate_limit_error",
                    "param": null,
                    "code": "rate_limit_exceeded"
                }
            });
            let body = serde_json::to_vec(&body).unwrap_or_else(|_| b"{}".to_vec());
            let mut response = Response::new(Body::from(body));
            *response.status_mut() = StatusCode::TOO_MANY_REQUESTS;
            response.headers_mut().insert(
                header::CONTENT_TYPE,
                HeaderValue::from_static("application/json"),
            );
            if let Ok(value) = HeaderValue::from_str(&retry_after_secs.to_string()) {
                response.headers_mut().insert(header::RETRY_AFTER, value);
            }
            response
        }
    }
}

pub(crate) fn response_from_invocation_error(error: &InvocationError) -> Response {
    let status = match error.kind {
        InvocationErrorKind::InvalidRequest | InvocationErrorKind::ResourceClassification => {
            StatusCode::BAD_REQUEST
        }
        InvocationErrorKind::Authentication => StatusCode::UNAUTHORIZED,
        InvocationErrorKind::Authorization => StatusCode::FORBIDDEN,
        InvocationErrorKind::Routing
        | InvocationErrorKind::Pricing
        | InvocationErrorKind::Dispatch
        | InvocationErrorKind::ProviderPassthroughFailed
        | InvocationErrorKind::Usage
        | InvocationErrorKind::Telemetry
        | InvocationErrorKind::Internal => StatusCode::BAD_GATEWAY,
        InvocationErrorKind::Idempotency => StatusCode::CONFLICT,
        InvocationErrorKind::RateLimit => StatusCode::TOO_MANY_REQUESTS,
    };
    let body = json!({
        "error": {
            "message": redact_sensitive_tokens(&error.message),
            "type": error.kind.code(),
            "param": null,
            "code": error.kind.code()
        }
    });
    let body = serde_json::to_vec(&body).unwrap_or_else(|_| b"{}".to_vec());
    let mut response = Response::new(Body::from(body));
    *response.status_mut() = status;
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    if status == StatusCode::TOO_MANY_REQUESTS {
        if let Some(retry_after) = error.retry_after_secs {
            if let Ok(value) = HeaderValue::from_str(&retry_after.to_string()) {
                response.headers_mut().insert(header::RETRY_AFTER, value);
            }
        }
    }
    response
}

fn not_found_response() -> Response {
    let body = json!({
        "error": {
            "message": "Not found",
            "type": "invalid_request_error",
            "param": null,
            "code": "not_found"
        }
    });
    let body = serde_json::to_vec(&body).unwrap_or_else(|_| b"{}".to_vec());
    let mut response = Response::new(Body::from(body));
    *response.status_mut() = StatusCode::NOT_FOUND;
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    response
}

fn empty_response() -> Response {
    let mut response = Response::new(Body::empty());
    *response.status_mut() = StatusCode::NO_CONTENT;
    response
}

fn header_text(headers: &HeaderMap, name: &str) -> Option<String> {
    headers
        .get(name)
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

/// Parse the `Content-Length` header into a byte count.
///
/// Returns `None` when the header is absent or not a valid non-negative
/// integer. A malformed `Content-Length` is treated as unknown rather than
/// an error so the downstream `to_bytes` limit still applies as a safety net.
fn content_length_from_headers(headers: &HeaderMap) -> Option<usize> {
    headers
        .get(header::CONTENT_LENGTH)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.trim().parse::<usize>().ok())
}

fn invalid_request(message: impl Into<String>) -> InvocationError {
    InvocationError::new(InvocationErrorKind::InvalidRequest, message)
}

/// True when any model upstream route for `model_key` targets one of the
/// group's callable accounts.
fn model_upstream_route_matches_account<C>(
    catalog: &C,
    model_key: &str,
    callable_accounts: &[sdkwork_cloudrouter_router_service::domain::UpstreamAccountRoute],
) -> bool
where
    C: sdkwork_cloudrouter_router_service::ports::PricingCatalog,
{
    catalog
        .list_model_upstream_routes(model_key)
        .iter()
        .any(|route| {
            callable_accounts.iter().any(|account| {
                account.account_id == route.account_id
                    && account.supplier_code == route.supplier_code
            })
        })
}

/// An upstream account route is callable for the group when it is bound to
/// the group and carries a base URL plus a credential (or default headers).
fn group_account_route_is_callable(
    route: &sdkwork_cloudrouter_router_service::domain::UpstreamAccountRoute,
    account_group_id: i64,
) -> bool {
    route
        .account_group_bindings
        .iter()
        .any(|binding| binding.account_group_id == account_group_id)
        && route
            .base_url
            .as_deref()
            .map(str::trim)
            .is_some_and(|value| !value.is_empty())
        && (route
            .secret_ref
            .as_deref()
            .map(str::trim)
            .is_some_and(|value| !value.is_empty())
            || !route.auth_profile.default_headers.is_empty())
}

#[cfg(test)]
mod gateway_dispatch_defaults_tests {
    use super::apply_gateway_dispatch_defaults;
    use axum::http::Method;
    use sdkwork_cloudrouter_router_service::application::{
        AuthenticatedApiKeyContext, DispatchMode, Invocation, InvocationBilling, InvocationRequest,
        InvocationResource, InvocationSubject,
    };
    use sdkwork_cloudrouter_router_service::domain::{
        AiModel, DecimalValue, GatewayApiKey, ModelUpstreamRoute, ModelVendor,
        ModelVendorDefinition, RoutingCapability, UpstreamAccountGroup, UpstreamAccountRoute,
    };
    use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;

    fn subject() -> InvocationSubject {
        InvocationSubject::from_api_key_context(AuthenticatedApiKeyContext {
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            api_key_id: 100,
            api_key_name_snapshot: "Test key".to_owned(),
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
        })
    }

    fn vendors_invocation() -> Invocation {
        Invocation::new(
            InvocationRequest::new(Method::GET, "/v1/vendors"),
            subject(),
            InvocationResource::free_endpoint(
                "openai/management/vendors",
                "openai.vendors",
                RoutingCapability::Network,
            ),
            InvocationBilling::free(),
        )
    }

    fn catalog() -> InMemoryPricingCatalog {
        let mut catalog = InMemoryPricingCatalog::default();
        catalog.add_vendor(ModelVendorDefinition::new(
            "openai",
            ModelVendor::OpenAi,
            "OpenAI",
        ));
        catalog.add_model(AiModel::new(
            "gpt-4o-mini",
            "GPT-4o mini",
            "openai",
            vec!["chat", "tools"],
        ));
        // A model the group cannot route to: no upstream model route exists,
        // so group-scoped model listings must exclude it.
        catalog.add_model(AiModel::new(
            "gpt-4o",
            "GPT-4o",
            "openai",
            vec!["chat", "tools"],
        ));
        catalog.add_upstream_account_group(UpstreamAccountGroup::new(
            10,
            "standard-group",
            "standard",
            DecimalValue::parse("1.000000").unwrap(),
            DecimalValue::parse("1.100000").unwrap(),
        ));
        catalog.add_upstream_account_route(
            UpstreamAccountRoute::new("openai-supplier", 1001)
                .with_account_group_binding(10, 100, 100)
                .with_upstream_endpoint(Some("https://api.openai.com"), Some("cred:openai")),
        );
        catalog.add_model_upstream_route(ModelUpstreamRoute::new(
            "gpt-4o-mini",
            "openai-supplier",
            1001,
            "gpt-4o-mini",
        ));
        catalog.add_api_key(GatewayApiKey::new(101, 10, "sk-live", "hash"));
        catalog
    }

    #[test]
    fn vendors_request_becomes_synthetic_response_scoped_to_the_account_group() {
        let mut invocation = vendors_invocation();
        apply_gateway_dispatch_defaults(&mut invocation, &catalog(), 10);
        assert_eq!(
            invocation.dispatch.mode,
            DispatchMode::SyntheticLocalResponse
        );
        let response = invocation.dispatch.response.expect("synthetic response");
        assert_eq!(200, response.status_code);
        let body = response.body.expect("json body");
        assert_eq!("list", body["object"]);
        let vendors = body["data"].as_array().expect("vendor data array");
        assert_eq!(1, vendors.len());
        assert_eq!("openai", vendors[0]["code"]);
        assert_eq!("OpenAI", vendors[0]["name"]);
        assert_eq!("gpt-4o-mini", vendors[0]["models"][0]["id"]);
        assert_eq!("GPT-4o mini", vendors[0]["models"][0]["displayName"]);
    }

    #[test]
    fn vendors_response_is_empty_for_groups_without_callable_accounts() {
        let mut invocation = vendors_invocation();
        apply_gateway_dispatch_defaults(&mut invocation, &catalog(), 99);
        assert_eq!(
            invocation.dispatch.mode,
            DispatchMode::SyntheticLocalResponse
        );
        let response = invocation.dispatch.response.expect("synthetic response");
        let body = response.body.expect("json body");
        assert_eq!(0, body["data"].as_array().expect("data array").len());
    }

    #[test]
    fn other_free_endpoints_keep_the_noop_free_dispatch() {
        let mut invocation = Invocation::new(
            InvocationRequest::new(Method::GET, "/v1/batches"),
            subject(),
            InvocationResource::free_endpoint(
                "openai/management/batches",
                "openai.batches",
                RoutingCapability::Network,
            ),
            InvocationBilling::free(),
        );
        apply_gateway_dispatch_defaults(&mut invocation, &catalog(), 10);
        assert_eq!(invocation.dispatch.mode, DispatchMode::NoopFree);
        assert!(invocation.dispatch.response.is_none());
    }

    fn models_invocation() -> Invocation {
        Invocation::new(
            InvocationRequest::new(Method::GET, "/v1/models"),
            subject(),
            InvocationResource::free_endpoint(
                "openai/management/models",
                "openai.models",
                RoutingCapability::Network,
            ),
            InvocationBilling::free(),
        )
    }

    #[test]
    fn models_request_is_scoped_to_models_reachable_by_the_account_group() {
        let mut invocation = models_invocation();
        apply_gateway_dispatch_defaults(&mut invocation, &catalog(), 10);

        assert_eq!(
            invocation.dispatch.mode,
            DispatchMode::SyntheticLocalResponse
        );
        let response = invocation.dispatch.response.expect("synthetic response");
        let body = response.body.expect("json body");
        let models = body["data"].as_array().expect("models array");
        let ids = models
            .iter()
            .map(|model| model["id"].as_str().unwrap_or_default())
            .collect::<Vec<_>>();
        assert_eq!(vec!["gpt-4o-mini"], ids, "unreachable model must be filtered");
    }

    #[test]
    fn models_request_is_empty_for_groups_without_callable_accounts() {
        let mut invocation = models_invocation();
        apply_gateway_dispatch_defaults(&mut invocation, &catalog(), 99);

        let response = invocation.dispatch.response.expect("synthetic response");
        let body = response.body.expect("json body");
        assert_eq!(0, body["data"].as_array().expect("models array").len());
    }
}
