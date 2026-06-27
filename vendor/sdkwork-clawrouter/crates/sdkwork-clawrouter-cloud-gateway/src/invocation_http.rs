use axum::body::{to_bytes, Body};
use axum::http::{header, HeaderMap, HeaderValue, Request, StatusCode, Uri};
use axum::response::Response;
use sdkwork_clawrouter_router_service::application::{
    BillingMode, DispatchMode, GatewayInvocationPolicyViolation, Invocation, InvocationBody,
    InvocationClassificationRequest, InvocationDispatchResponse, InvocationError,
    InvocationErrorKind, InvocationRequest, InvocationResourceClassifier, InvocationSubject,
    InvocationSurface, OpenAiResourceClassifier, ProviderNativeResourceClassifier, ResourceType,
};
use sdkwork_clawrouter_router_service::ports::PricingCatalog;
use serde_json::{json, Value};

use crate::gateway_api_key_auth::authenticate_gateway_api_key;
use crate::invocation_router::InvocationRouterState;
use crate::request_identity::generate_server_request_id;

const INVOCATION_BODY_LIMIT_BYTES: usize = 16 * 1024 * 1024;

pub(crate) async fn handle_invocation<C>(
    state: InvocationRouterState<C>,
    request: Request<Body>,
) -> Response
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let (parts, body) = request.into_parts();
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
    ) {
        Ok(context) => context,
        Err(response) => return response,
    };

    let client_ip = extract_client_ip_from_headers(&parts.headers);
    if let Err(violation) = state
        .invocation_policy_guard
        .enforce(state.catalog.as_ref(), &auth_context, client_ip.as_deref())
        .await
    {
        return response_from_policy_violation(&violation);
    }

    let body = match invocation_body_from_http(&parts.headers, body).await {
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
    let subject = InvocationSubject::from_api_key_context(auth_context);
    let mut invocation = Invocation::new(request, subject, resource, billing);
    invocation.routing = routing;
    apply_gateway_dispatch_defaults(&mut invocation, state.catalog.as_ref());

    if let Err(error) = state.pipeline.execute(&mut invocation).await {
        if invocation.telemetry.normalized_response.is_none() {
            return response_from_invocation_error(&error);
        }
    }

    invocation
        .telemetry
        .normalized_response
        .map(normalized_response_to_http)
        .unwrap_or_else(empty_response)
}

async fn invocation_body_from_http(
    headers: &HeaderMap,
    body: Body,
) -> Result<InvocationBody, InvocationError> {
    let bytes = to_bytes(body, INVOCATION_BODY_LIMIT_BYTES)
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
                .skip_while(u8::is_ascii_whitespace)
                .next();
            matches!(trimmed, Some(b'{') | Some(b'['))
        })
}

fn classify_request(
    method: &axum::http::Method,
    uri: &Uri,
) -> Result<
    (
        sdkwork_clawrouter_router_service::application::InvocationClassification,
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
        return OpenAiResourceClassifier::default()
            .classify(&request)
            .map(|classification| (classification, path.to_owned()));
    }

    let Some((provider_code, standard_path)) = provider_native_parts(path) else {
        return Err(InvocationError::new(
            InvocationErrorKind::ResourceClassification,
            format!("unsupported invocation route: {} {}", method, path),
        ));
    };
    request.path = standard_path;
    request.provider_code = Some(provider_code);
    let invocation_path = request.path.clone();
    ProviderNativeResourceClassifier::default()
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
    let client_ip = extract_client_ip_from_headers(&headers);

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

fn apply_gateway_dispatch_defaults<C>(invocation: &mut Invocation, catalog: &C)
where
    C: PricingCatalog,
{
    if invocation.resource.surface == InvocationSurface::OpenAiCompatible
        && invocation.resource.resource_type == ResourceType::FreeEndpoint
        && invocation.resource.api_code == "openai.models"
        && invocation.request.method == axum::http::Method::GET
        && invocation.request.path == "/v1/models"
    {
        invocation.dispatch.mode = DispatchMode::SyntheticLocalResponse;
        invocation.dispatch.response = Some(InvocationDispatchResponse::json(
            200,
            json!({
                "object": "list",
                "data": catalog
                    .list_models(None)
                    .into_iter()
                    .map(|model| {
                        let owned_by = catalog
                            .find_vendor(&model.vendor_code)
                            .map(|vendor| vendor.vendor.code().to_owned())
                            .unwrap_or(model.vendor_code);
                        json!({
                            "id": model.model,
                            "object": "model",
                            "created": 0,
                            "owned_by": owned_by
                        })
                    })
                    .collect::<Vec<_>>()
            }),
        ));
        return;
    }

    if invocation.billing.mode == BillingMode::Free {
        invocation.dispatch.mode = DispatchMode::NoopFree;
    }
}

fn normalized_response_to_http(
    normalized: sdkwork_clawrouter_router_service::application::InvocationNormalizedResponse,
) -> Response {
    let sdkwork_clawrouter_router_service::application::InvocationNormalizedResponse {
        status_code,
        body,
        body_bytes,
        content_type,
        stream_body,
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
    let mut response = Response::new(Body::from(body.unwrap_or_default()));
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

fn extract_client_ip_from_headers(headers: &HeaderMap) -> Option<String> {
    header_text(headers, "x-forwarded-for")
        .and_then(|value| value.split(',').next().map(str::trim).map(str::to_owned))
        .filter(|value| !value.is_empty())
        .or_else(|| header_text(headers, "x-real-ip"))
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
    };
    let body = json!({
        "error": {
            "message": error.message.replace("sk-", "sk-***"),
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

fn invalid_request(message: impl Into<String>) -> InvocationError {
    InvocationError::new(InvocationErrorKind::InvalidRequest, message)
}
