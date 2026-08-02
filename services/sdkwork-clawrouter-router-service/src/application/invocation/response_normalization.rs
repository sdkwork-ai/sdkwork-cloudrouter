use std::sync::Mutex;

use axum::body::Body;
use serde_json::{json, Value};

use super::{
    DispatchMode, Invocation, InvocationDispatchResponse, InvocationError, InvocationFuture,
    InvocationInterceptor, InvocationNormalizedResponse,
};

#[derive(Debug, Clone, Default)]
pub struct ResponseNormalizationInterceptor;

impl InvocationInterceptor for ResponseNormalizationInterceptor {
    fn name(&self) -> &str {
        "response_normalization"
    }

    fn completes_before_stream(&self) -> bool {
        true
    }

    fn observe_pipeline_errors(&self) -> bool {
        true
    }

    fn after<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            // Take the stream body out of the dispatch response before normalization
            let stream_body = invocation
                .dispatch
                .response
                .as_ref()
                .and_then(|r| r.take_stream_body());
            let normalized = invocation
                .dispatch
                .response
                .as_ref()
                .map(|response| normalize_dispatch_response(invocation, response, stream_body))
                .unwrap_or_else(|| InvocationNormalizedResponse {
                    status_code: 204,
                    body: None,
                    body_bytes: None,
                    content_type: None,
                    stream_body: Mutex::new(None),
                    memory_guard: None,
                });
            invocation.telemetry.normalized_response = Some(normalized);
            Ok(())
        })
    }

    fn on_error<'a>(
        &'a self,
        invocation: &'a mut Invocation,
        error: &'a InvocationError,
    ) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            let status_code = status_code_for_error(error);
            invocation.telemetry.normalized_response = Some(InvocationNormalizedResponse {
                status_code,
                body: Some(json!({
                    "error": {
                        "code": error.kind.code(),
                        "message": masked_message(&error.message),
                        "type": error.kind.code()
                    }
                })),
                body_bytes: None,
                content_type: Some("application/json".to_owned()),
                stream_body: Mutex::new(None),
                memory_guard: None,
            });
            Ok(())
        })
    }
}

fn normalize_dispatch_response(
    invocation: &Invocation,
    response: &InvocationDispatchResponse,
    stream_body: Option<Body>,
) -> InvocationNormalizedResponse {
    if invocation.dispatch.mode == DispatchMode::InternalProviderAdapter {
        if let Some(mut normalized) = normalize_adapter_response(response) {
            if stream_body.is_some() {
                normalized.stream_body = Mutex::new(stream_body);
            }
            return normalized;
        }
    }
    // For streaming responses, pass the stream body through and skip body serialization
    if stream_body.is_some() {
        return InvocationNormalizedResponse {
            status_code: response.status_code,
            body: None,
            body_bytes: None,
            content_type: response.content_type.clone(),
            stream_body: Mutex::new(stream_body),
            memory_guard: response.memory_guard.clone(),
        };
    }
    InvocationNormalizedResponse {
        status_code: response.status_code,
        body: response.body.clone(),
        body_bytes: response.body_bytes.clone(),
        content_type: response.content_type.clone().or_else(|| {
            response
                .body
                .as_ref()
                .map(|_| "application/json".to_owned())
        }),
        stream_body: Mutex::new(None),
        memory_guard: response.memory_guard.clone(),
    }
}

fn normalize_adapter_response(
    response: &InvocationDispatchResponse,
) -> Option<InvocationNormalizedResponse> {
    let body = response.body.as_ref()?;
    let status_code = body
        .get("statusCode")
        .or_else(|| body.get("status_code"))
        .and_then(Value::as_u64)
        .and_then(|value| u16::try_from(value).ok())
        .unwrap_or(response.status_code);
    let content_type = body
        .get("headers")
        .and_then(Value::as_object)
        .and_then(|headers| {
            headers.iter().find_map(|(name, value)| {
                (name.eq_ignore_ascii_case("content-type"))
                    .then(|| value.as_str().map(str::to_owned))
                    .flatten()
            })
        })
        .or_else(|| response.content_type.clone())
        .or_else(|| Some("application/json".to_owned()));
    let provider_body = body.get("body").cloned();
    Some(InvocationNormalizedResponse {
        status_code,
        body: provider_body,
        body_bytes: None,
        content_type,
        stream_body: Mutex::new(None),
        memory_guard: response.memory_guard.clone(),
    })
}

fn status_code_for_error(error: &InvocationError) -> u16 {
    match error.kind {
        super::InvocationErrorKind::InvalidRequest
        | super::InvocationErrorKind::ResourceClassification => 400,
        super::InvocationErrorKind::Authentication => 401,
        super::InvocationErrorKind::Authorization => 403,
        super::InvocationErrorKind::Idempotency => 409,
        super::InvocationErrorKind::Routing
        | super::InvocationErrorKind::Pricing
        | super::InvocationErrorKind::Dispatch
        | super::InvocationErrorKind::ProviderPassthroughFailed
        | super::InvocationErrorKind::Usage
        | super::InvocationErrorKind::Telemetry
        | super::InvocationErrorKind::Internal => 502,
        // H-9: tenant in-flight / rate-limit rejection maps to HTTP 429.
        super::InvocationErrorKind::RateLimit => 429,
    }
}

fn masked_message(message: &str) -> String {
    message.trim().replace("sk-", "sk-***")
}
