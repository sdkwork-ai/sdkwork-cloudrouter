use std::sync::Arc;

use axum::body::Body;
use axum::http::StatusCode;
use axum::response::Response;
use bytes::Bytes;
use futures_util::StreamExt;
use serde_json::Value;

use crate::api::openai_invocation::{OpenAiInvocationContext, OpenAiInvocationPluginRef};
use crate::api::openai_runtime::{
    OpenAiRuntimeFailureStrategy, ResolvedOpenAiUpstreamRoute, ResolvedOpenAiUpstreamRoutePlan,
};
use crate::api::openai_usage::OpenAiUsageRecorder;
use crate::application::AuthenticatedApiKeyContext;
use crate::domain::ProviderRetryPolicy;
use crate::ports::{GatewayUsageRecorder, ProviderResponseMemoryGuard};

/// A single SSE line longer than this is forwarded verbatim instead of being
/// buffered until the newline arrives, so a misbehaving upstream cannot grow
/// `pending_line` for the whole stream lifetime.
const RELAY_SSE_MAX_PENDING_LINE_BYTES: usize = 1024 * 1024;

/// Builds an OpenAI-compatible response while preserving safe upstream headers,
/// content type, and non-JSON provider error bytes.
pub(crate) fn guarded_openai_relay_response(
    status: StatusCode,
    body: Value,
    body_bytes: Option<Vec<u8>>,
    content_type: Option<String>,
    headers: axum::http::HeaderMap,
    memory_guard: Option<ProviderResponseMemoryGuard>,
) -> Response {
    let body = if let Some(body_bytes) = body_bytes {
        let body_bytes = if status.is_success() {
            body_bytes
        } else {
            redact_provider_error_bytes(body_bytes)
        };
        Body::from(body_bytes)
    } else {
        let body = if status.is_success() {
            body
        } else {
            redact_json_secrets(body)
        };
        Body::from(serde_json::to_vec(&body).unwrap_or_else(|_| b"{}".to_vec()))
    };
    let mut response = Response::new(body);
    *response.status_mut() = status;
    if let Some(content_type) = content_type
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .and_then(|value| axum::http::HeaderValue::from_str(value).ok())
    {
        response
            .headers_mut()
            .insert(axum::http::header::CONTENT_TYPE, content_type);
    }
    response.headers_mut().extend(headers);
    if !response
        .headers()
        .contains_key(axum::http::header::CONTENT_TYPE)
    {
        response.headers_mut().insert(
            axum::http::header::CONTENT_TYPE,
            axum::http::HeaderValue::from_static("application/json"),
        );
    }
    match memory_guard {
        Some(memory_guard) => memory_guard.wrap_response(response),
        None => response,
    }
}

fn redact_provider_error_bytes(body: Vec<u8>) -> Vec<u8> {
    match std::str::from_utf8(&body) {
        Ok(text) => crate::redaction::redact_sensitive_tokens(text).into_bytes(),
        Err(_) => body,
    }
}

/// Recursively applies credential redaction to every JSON string value.
fn redact_json_secrets(value: Value) -> Value {
    match value {
        Value::String(text) => {
            Value::String(crate::redaction::redact_sensitive_tokens(text.as_str()))
        }
        Value::Array(items) => Value::Array(items.into_iter().map(redact_json_secrets).collect()),
        Value::Object(entries) => Value::Object(
            entries
                .into_iter()
                .map(|(key, value)| (key, redact_json_secrets(value)))
                .collect(),
        ),
        other => other,
    }
}

/// Restores the client-requested `model` in a relayed JSON response body.
///
/// The outbound relay rewrites `model` to the account's provider-native id
/// when the account configures a `provider_native_model` override (or the
/// provider requires a different native name). OpenAI-compatible clients send
/// a catalog/alias `model` and must receive that same id back, so the relayed
/// response's `model` field is restored to the requested value before it is
/// returned. For Responses API objects the nested `response.model` field is
/// restored as well. This mirrors `restore_openai_compatible_model` in the
/// invocation pipeline.
pub(crate) fn restore_relayed_model(mut body: Value, requested_model: &str) -> Value {
    let requested_model = requested_model.trim();
    if requested_model.is_empty() {
        return body;
    }
    let Some(object) = body.as_object_mut() else {
        return body;
    };
    restore_model_field(object, requested_model);
    if let Some(Value::Object(nested)) = object.get_mut("response") {
        restore_model_field(nested, requested_model);
    }
    body
}

fn restore_model_field(object: &mut serde_json::Map<String, Value>, requested_model: &str) {
    match object.get("model") {
        Some(Value::String(current)) if current != requested_model => {
            object.insert(
                "model".to_owned(),
                Value::String(requested_model.to_owned()),
            );
        }
        _ => {}
    }
}

/// Restores the client-requested `model` in each OpenAI-compatible SSE frame of
/// a relayed streaming response. The outbound relay rewrites `model` to the
/// provider-native id when the account has a `provider_native_model` override;
/// streaming frames echo that id back, so we rewrite `model` inside each
/// `data: {json}` payload line. Responses API events nest the model under the
/// `response` object (`response.model`), which is restored the same way. All
/// other bytes are forwarded verbatim.
pub(crate) fn restore_relayed_streaming_model(stream: Body, requested_model: &str) -> Body {
    let requested_model = requested_model.trim();
    if requested_model.is_empty() {
        return stream;
    }
    let requested_model = requested_model.to_owned();
    let state = RelaySseModelRestoreState {
        upstream: stream.into_data_stream(),
        pending_line: Vec::new(),
        requested_model,
    };
    let restored = futures_util::stream::unfold(state, next_relay_sse_model_restore_frame);
    Body::from_stream(restored)
}

async fn next_relay_sse_model_restore_frame(
    mut state: RelaySseModelRestoreState,
) -> Option<(Result<Bytes, axum::Error>, RelaySseModelRestoreState)> {
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
                    output.extend_from_slice(&rewrite_relay_sse_model_line(
                        &line,
                        &state.requested_model,
                    ));
                    output.push(b'\n');
                    continue;
                }
                state.pending_line.push(byte);
                if state.pending_line.len() >= RELAY_SSE_MAX_PENDING_LINE_BYTES {
                    // The model-restore rewrite only applies to a complete
                    // `data:` line; a line this large is forwarded as an opaque
                    // chunk instead of being retained in memory.
                    output.extend_from_slice(&std::mem::take(&mut state.pending_line));
                }
            }
            Some((Ok(Bytes::from(output)), state))
        }
        Err(error) => Some((Err(error), state)),
    }
}

fn rewrite_relay_sse_model_line(line: &[u8], requested_model: &str) -> Vec<u8> {
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
    let Ok(value) = serde_json::from_slice::<Value>(data) else {
        return line.to_vec();
    };
    let restored = restore_relayed_model(value, requested_model);
    if restored.as_object().is_none() {
        return line.to_vec();
    }
    let mut rewritten = Vec::with_capacity(line.len());
    let prefix_len = trimmed.as_ptr() as usize - line.as_ptr() as usize;
    rewritten.extend_from_slice(&line[..prefix_len]);
    rewritten.extend_from_slice(b"data: ");
    let payload = match serde_json::to_vec(&restored) {
        Ok(payload) => payload,
        Err(error) => {
            // Unreachable for `serde_json::Value` (object keys are always
            // strings), but an empty data line must never pass silently.
            tracing::warn!(
                error = %error,
                "sse relay model restore serialization failed; emitting empty data line"
            );
            Vec::new()
        }
    };
    rewritten.extend_from_slice(payload.as_slice());
    rewritten
}

struct RelaySseModelRestoreState {
    upstream: axum::body::BodyDataStream,
    pending_line: Vec<u8>,
    requested_model: String,
}

pub(crate) struct OpenAiRelayExecution<'a, C, R> {
    pub usage_recorder: Option<Arc<dyn GatewayUsageRecorder + Send + Sync>>,
    pub usage_recording: Option<Arc<OpenAiUsageRecorder<C>>>,
    pub plugins: &'a [OpenAiInvocationPluginRef],
    pub invocation_context: &'a OpenAiInvocationContext,
    pub context: AuthenticatedApiKeyContext,
    pub route_plan: ResolvedOpenAiUpstreamRoutePlan,
    pub request: R,
    pub failure_strategy: OpenAiRuntimeFailureStrategy,
    pub default_retry_policy: &'a ProviderRetryPolicy,
}

pub(crate) struct OpenAiRouteRelayExecution<'a, C> {
    pub usage_recorder: Option<Arc<dyn GatewayUsageRecorder + Send + Sync>>,
    pub usage_recording: Option<&'a Arc<OpenAiUsageRecorder<C>>>,
    pub plugins: &'a [OpenAiInvocationPluginRef],
    pub invocation_context: &'a OpenAiInvocationContext,
    pub context: &'a AuthenticatedApiKeyContext,
    pub route: &'a ResolvedOpenAiUpstreamRoute,
    pub requested_model: &'a str,
    pub request_body: Value,
    pub failure_strategy: OpenAiRuntimeFailureStrategy,
    pub route_count: usize,
    pub default_retry_policy: &'a ProviderRetryPolicy,
}

#[cfg(test)]
mod tests {
    use super::{redact_json_secrets, restore_relayed_model, rewrite_relay_sse_model_line};
    use serde_json::json;

    /// A provider rejection that echoes the platform's upstream credential must
    /// not reach the tenant. Structure and non-secret prose stay intact so SDK
    /// error handling keeps working.
    #[test]
    fn provider_error_bodies_do_not_leak_upstream_credentials() {
        let body = json!({
            "error": {
                "message": "Incorrect API key provided: sk-live1234567890abcdef. Please check.",
                "type": "invalid_request_error",
                "code": "invalid_api_key",
                "nested": ["Bearer abcdefghijklmnop", {"deep": "api key: gsk_abcdefgh1234"}]
            }
        });
        let redacted = redact_json_secrets(body);
        let text = redacted.to_string();
        assert!(
            !text.contains("sk-live1234567890abcdef"),
            "gateway key leaked: {text}"
        );
        assert!(
            !text.contains("abcdefghijklmnop"),
            "bearer token leaked: {text}"
        );
        assert!(
            !text.contains("gsk_abcdefgh1234"),
            "provider key leaked: {text}"
        );
        assert_eq!("invalid_request_error", redacted["error"]["type"]);
        assert_eq!("invalid_api_key", redacted["error"]["code"]);
        assert!(redacted["error"]["message"]
            .as_str()
            .unwrap_or_default()
            .contains("Incorrect API key provided"));
    }

    #[test]
    fn relayed_json_model_is_restored_to_requested_model() {
        let body =
            json!({"id":"x","object":"chat.completion","model":"provider-native-9","choices":[]});
        let restored = restore_relayed_model(body, "gpt-4o-mini");
        assert_eq!("gpt-4o-mini", restored["model"]);
        assert_eq!("x", restored["id"]);
    }

    #[test]
    fn relayed_json_model_matching_requested_is_unchanged() {
        let body = json!({"id":"x","model":"gpt-4o-mini"});
        let restored = restore_relayed_model(body, "gpt-4o-mini");
        assert_eq!("gpt-4o-mini", restored["model"]);
    }

    #[test]
    fn relayed_json_without_model_field_is_unchanged() {
        let body = json!({"id":"x","object":"embedding","data":[]});
        let restored = restore_relayed_model(body, "gpt-4o-mini");
        assert_eq!("x", restored["id"]);
        assert!(restored.get("model").is_none());
    }

    #[test]
    fn relayed_responses_nested_model_is_restored_to_requested_model() {
        let body = json!({
            "id":"resp_1",
            "object":"response",
            "response":{
                "id":"resp_1",
                "model":"provider-native-9",
                "usage":{"input_tokens":3,"output_tokens":2,"total_tokens":5}
            }
        });
        let restored = restore_relayed_model(body, "gpt-5");
        assert_eq!("gpt-5", restored["response"]["model"]);
        assert_eq!(restored.get("model"), None);
    }

    #[test]
    fn relayed_chat_chunk_without_response_object_is_unchanged_shape() {
        let body =
            json!({"id":"x","object":"chat.completion.chunk","model":"gpt-4o-mini","choices":[]});
        let restored = restore_relayed_model(body, "gpt-4o-mini");
        assert!(restored.get("response").is_none());
        assert_eq!("gpt-4o-mini", restored["model"]);
    }

    #[test]
    fn relayed_sse_model_line_is_rewritten_to_requested_model() {
        let line = r#"data: {"id":"x","object":"chat.completion.chunk","model":"provider-native-9","choices":[]}"#;
        let rewritten = rewrite_relay_sse_model_line(line.as_bytes(), "gpt-4o-mini");
        let text = String::from_utf8(rewritten).unwrap();
        assert!(text.starts_with("data: "), "{text}");
        assert!(text.contains(r#""model":"gpt-4o-mini""#), "{text}");
        assert!(!text.contains("provider-native-9"), "{text}");
    }

    #[test]
    fn relayed_sse_done_and_non_json_lines_are_forwarded_verbatim() {
        for line in [
            b"data: [DONE]".as_slice(),
            b"event: response.output_text.delta".as_slice(),
            b": keepalive".as_slice(),
            b"".as_slice(),
        ] {
            let rewritten = rewrite_relay_sse_model_line(line, "gpt-4o-mini");
            assert_eq!(line, rewritten.as_slice());
        }
    }
}
