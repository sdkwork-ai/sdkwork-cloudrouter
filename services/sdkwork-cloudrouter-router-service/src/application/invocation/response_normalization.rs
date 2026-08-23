use std::sync::Mutex;

use axum::body::Body;
use bytes::Bytes;
use futures_util::StreamExt;
use serde_json::{json, Value};

use super::{
    DispatchMode, Invocation, InvocationDispatchResponse, InvocationError, InvocationFuture,
    InvocationInterceptor, InvocationNormalizedResponse, InvocationSurface,
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
                    headers: axum::http::HeaderMap::new(),
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
                        // Official OpenAI error `type` vocabulary so SDK
                        // clients can match authentication_error /
                        // rate_limit_error / server_error / ...; the detailed
                        // internal reason stays in `code`.
                        "code": error.kind.code(),
                        "message": masked_message(&error.message),
                        "type": error.kind.openai_error_type()
                    }
                })),
                body_bytes: None,
                content_type: Some("application/json".to_owned()),
                headers: axum::http::HeaderMap::new(),
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
                return normalized;
            }
            return restore_openai_compatible_model(invocation, normalized);
        }
    }
    // For streaming responses, pass the stream body through and skip body serialization.
    // OpenAI-compatible SSE frames carry a `model` field that must be restored to
    // the client-requested model (the outbound request rewrote it to the
    // provider-native id), matching the non-streaming restore path.
    if let Some(stream) = stream_body {
        return InvocationNormalizedResponse {
            status_code: response.status_code,
            body: None,
            body_bytes: None,
            content_type: response.content_type.clone(),
            headers: response.headers.clone(),
            stream_body: Mutex::new(Some(restore_streaming_model(
                invocation,
                stream,
            ))),
            memory_guard: response.memory_guard.clone(),
        };
    }
    restore_openai_compatible_model(
        invocation,
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
            headers: response.headers.clone(),
            stream_body: Mutex::new(None),
            memory_guard: response.memory_guard.clone(),
        },
    )
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
        headers: response.headers.clone(),
        stream_body: Mutex::new(None),
        memory_guard: response.memory_guard.clone(),
    })
}

/// OpenAI-compatible clients send a catalog/alias `model` and must receive that
/// same id back. The outbound request rewrites `model` to the account's
/// provider-native id; restore the inbound id on JSON responses so the wire
/// matches `OpenAiChatCompletion` / embeddings / responses contracts.
fn restore_openai_compatible_model(
    invocation: &Invocation,
    mut normalized: InvocationNormalizedResponse,
) -> InvocationNormalizedResponse {
    if invocation.resource.surface != InvocationSurface::OpenAiCompatible {
        return normalized;
    }
    let Some(requested_model) = invocation
        .resource
        .requested_model
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return normalized;
    };
    if let Some(body) = normalized.body.as_mut() {
        if restore_json_model_field(body, requested_model) {
            if normalized.body_bytes.is_some() {
                normalized.body_bytes = serde_json::to_vec(body).ok();
            }
            return normalized;
        }
    }
    if let Some(bytes) = normalized.body_bytes.as_ref() {
        if let Ok(mut body) = serde_json::from_slice::<Value>(bytes) {
            if restore_json_model_field(&mut body, requested_model) {
                normalized.body_bytes = serde_json::to_vec(&body).ok();
                normalized.body = Some(body);
            }
        }
    }
    normalized
}

fn restore_json_model_field(body: &mut Value, requested_model: &str) -> bool {
    let Some(object) = body.as_object_mut() else {
        return false;
    };
    match object.get("model") {
        Some(Value::String(current)) if current != requested_model => {
            object.insert("model".to_owned(), Value::String(requested_model.to_owned()));
            true
        }
        _ => false,
    }
}

/// Restores the client-requested `model` in each OpenAI-compatible SSE frame.
/// The outbound request rewrites `model` to the provider-native id; streaming
/// frames echo that id back, so we rewrite the `model` field inside each
/// `data: {json}` payload line (and `data: [DONE]` is left untouched). All
/// other bytes (event names, comments, blank separators, non-`data:` fields)
/// are forwarded verbatim so the SSE framing is never corrupted.
fn restore_streaming_model(invocation: &Invocation, stream: Body) -> Body {
    if invocation.resource.surface != InvocationSurface::OpenAiCompatible {
        return stream;
    }
    let Some(requested_model) = invocation
        .resource
        .requested_model
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return stream;
    };
    let requested_model = requested_model.to_owned();
    let state = SseModelRestoreState::new(stream, requested_model);
    let restored = futures_util::stream::unfold(state, next_sse_model_restore_frame);
    Body::from_stream(restored)
}

/// Line-buffered SSE transformer: rewrites `model` inside `data: {json}` lines
/// and forwards everything else byte-for-byte.
async fn next_sse_model_restore_frame(
    mut state: SseModelRestoreState,
) -> Option<(
    Result<Bytes, axum::Error>,
    SseModelRestoreState,
)> {
    // Pull one upstream frame and flush every complete line it contains. The
    // per-frame output is concatenated so downstream receives the same framing
    // cadence as upstream.
    let frame = state.upstream.next().await?;
    let mut output: Vec<u8> = Vec::new();
    match frame {
        Ok(bytes) => {
            for byte in bytes.iter().copied() {
                if byte == b'\n' {
                    let mut line = std::mem::take(&mut state.pending_line);
                    if line.last() == Some(&b'\r') {
                        line.pop();
                    }
                    output.extend_from_slice(&rewrite_sse_model_line(&line, &state.requested_model));
                    output.push(b'\n');
                    continue;
                }
                state.pending_line.push(byte);
            }
            Some((Ok(Bytes::from(output)), state))
        }
        Err(error) => Some((Err(error), state)),
    }
}

/// Rewrites a single SSE line's `model` field if it is a `data: {json}` line
/// with a model field; otherwise returns the line unchanged.
fn rewrite_sse_model_line(line: &[u8], requested_model: &str) -> Vec<u8> {
    let trimmed = line
        .iter()
        .position(|byte| !byte.is_ascii_whitespace())
        .map(|start| &line[start..])
        .unwrap_or(&[]);
    let Some(data) = trimmed.strip_prefix(b"data:") else {
        return line.to_vec();
    };
    let data = data
        .iter()
        .position(|byte| !byte.is_ascii_whitespace())
        .map(|start| &data[start..])
        .unwrap_or(&[]);
    if data == b"[DONE]" {
        return line.to_vec();
    }
    let Ok(mut value) = serde_json::from_slice::<Value>(data) else {
        return line.to_vec();
    };
    if !restore_json_model_field(&mut value, requested_model) {
        return line.to_vec();
    }
    let mut rewritten = Vec::with_capacity(line.len());
    rewritten.extend_from_slice(&line[..trimmed.as_ptr() as usize - line.as_ptr() as usize]);
    rewritten.extend_from_slice(b"data: ");
    rewritten.extend_from_slice(serde_json::to_vec(&value).unwrap_or_default().as_slice());
    rewritten
}

struct SseModelRestoreState {
    upstream: axum::body::BodyDataStream,
    pending_line: Vec<u8>,
    requested_model: String,
}

impl SseModelRestoreState {
    fn new(stream: Body, requested_model: String) -> Self {
        Self {
            upstream: stream.into_data_stream(),
            pending_line: Vec::new(),
            requested_model,
        }
    }
}

fn status_code_for_error(error: &InvocationError) -> u16 {
    match error.kind {
        super::InvocationErrorKind::InvalidRequest
        | super::InvocationErrorKind::ResourceClassification => 400,
        super::InvocationErrorKind::Authentication => 401,
        super::InvocationErrorKind::Authorization | super::InvocationErrorKind::ModelForbidden => {
            403
        }
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

/// Redacts credential-like material from error messages before they reach
/// clients, using the shared redaction helper so behavior matches the gateway
/// HTTP error path.
fn masked_message(message: &str) -> String {
    crate::redaction::redact_sensitive_tokens(message)
}

#[cfg(test)]
mod tests {
    use super::rewrite_sse_model_line;

    #[test]
    fn sse_model_line_is_rewritten_to_requested_model() {
        let line = r#"data: {"id":"x","object":"chat.completion.chunk","model":"provider-native-9","choices":[]}"#;
        let rewritten = rewrite_sse_model_line(line.as_bytes(), "gpt-4o-mini");
        let text = String::from_utf8(rewritten).unwrap();
        assert!(text.starts_with("data: "), "{text}");
        assert!(text.contains(r#""model":"gpt-4o-mini""#), "{text}");
        assert!(!text.contains("provider-native-9"), "{text}");
        assert!(text.contains(r#""id":"x""#), "{text}");
    }

    #[test]
    fn sse_model_line_matching_requested_model_is_unchanged() {
        let line = r#"data: {"id":"x","model":"gpt-4o-mini","choices":[]}"#;
        let rewritten = rewrite_sse_model_line(line.as_bytes(), "gpt-4o-mini");
        assert_eq!(line.as_bytes(), rewritten.as_slice());
    }

    #[test]
    fn sse_done_sentinel_is_forwarded_unchanged() {
        let line = b"data: [DONE]";
        let rewritten = rewrite_sse_model_line(line, "gpt-4o-mini");
        assert_eq!(line, rewritten.as_slice());
    }

    #[test]
    fn non_json_or_non_data_lines_are_forwarded_verbatim() {
        for line in [
            "event: response.output_text.delta".as_bytes(),
            ": keepalive comment".as_bytes(),
            "id: 1".as_bytes(),
            "data: not-json".as_bytes(),
            "".as_bytes(),
        ] {
            let rewritten = rewrite_sse_model_line(line, "gpt-4o-mini");
            assert_eq!(line, rewritten.as_slice());
        }
    }

    #[test]
    fn sse_line_without_model_field_is_unchanged() {
        let line = r#"data: {"id":"x","type":"response.output_text.delta","delta":"hi"}"#;
        let rewritten = rewrite_sse_model_line(line.as_bytes(), "gpt-4o-mini");
        assert_eq!(line.as_bytes(), rewritten.as_slice());
    }
}
