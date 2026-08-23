use std::sync::Arc;

use axum::body::Body;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
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

pub(crate) fn guarded_openai_json_response(
    status: StatusCode,
    body: Value,
    memory_guard: Option<ProviderResponseMemoryGuard>,
) -> Response {
    let response = (status, Json(body)).into_response();
    match memory_guard {
        Some(memory_guard) => memory_guard.wrap_response(response),
        None => response,
    }
}

/// Restores the client-requested `model` in a relayed JSON response body.
///
/// The outbound relay rewrites `model` to the account's provider-native id
/// when the account configures a `provider_native_model` override (or the
/// provider requires a different native name). OpenAI-compatible clients send
/// a catalog/alias `model` and must receive that same id back, so the relayed
/// response's `model` field is restored to the requested value before it is
/// returned. This mirrors `restore_openai_compatible_model` in the invocation
/// pipeline.
pub(crate) fn restore_relayed_model(mut body: Value, requested_model: &str) -> Value {
    let requested_model = requested_model.trim();
    if requested_model.is_empty() {
        return body;
    }
    let Some(object) = body.as_object_mut() else {
        return body;
    };
    match object.get("model") {
        Some(Value::String(current)) if current != requested_model => {
            object.insert("model".to_owned(), Value::String(requested_model.to_owned()));
        }
        _ => {}
    }
    body
}

/// Restores the client-requested `model` in each OpenAI-compatible SSE frame of
/// a relayed streaming response. The outbound relay rewrites `model` to the
/// provider-native id when the account has a `provider_native_model` override;
/// streaming frames echo that id back, so we rewrite `model` inside each
/// `data: {json}` payload line. All other bytes are forwarded verbatim.
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
) -> Option<(
    Result<Bytes, axum::Error>,
    RelaySseModelRestoreState,
)> {
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
    rewritten.extend_from_slice(serde_json::to_vec(&restored).unwrap_or_default().as_slice());
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
    use super::{restore_relayed_model, rewrite_relay_sse_model_line};
    use serde_json::json;

    #[test]
    fn relayed_json_model_is_restored_to_requested_model() {
        let body = json!({"id":"x","object":"chat.completion","model":"provider-native-9","choices":[]});
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
