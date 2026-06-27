use std::collections::BTreeMap;
use std::sync::Arc;

use axum::body::Body;
use sdkwork_claw_provider_adapter_contract::{
    AdapterInvocationRequest, AdapterInvocationResponse, AdapterInvocationShape,
};
use sdkwork_claw_provider_adapter_http::ProviderAdapterHttpClient;
use sdkwork_claw_provider_adapter_registry::{
    ProviderAdapterLookup, ProviderAdapterRegistry, ProviderInvocationMode,
};
use serde_json::Value;

use super::adapter_aware_openai_relay::{
    adapter_http_error, build_openai_adapter_invocation_with_shape, OpenAiAdapterEndpoint,
    OpenAiAdapterInvocationParts, ProviderSecretResolverRef,
};
use crate::domain::DomainResult;
use crate::ports::{
    ChatCompletionRelayRequest, ChatCompletionStreamRelay, ChatCompletionStreamRelayFuture,
    ChatCompletionStreamRelayResponse,
};

const CHAT_COMPLETIONS_ENDPOINT: OpenAiAdapterEndpoint = OpenAiAdapterEndpoint {
    method: "POST",
    standard_path: "/v1/chat/completions",
    capability: "chat",
    endpoint_key: "openai.chat_completions",
    invocation_id_prefix: "chat-stream",
};

#[derive(Clone)]
pub struct AdapterAwareChatCompletionStreamRelay {
    direct_relay: Arc<dyn ChatCompletionStreamRelay + Send + Sync>,
    adapter_registry: Arc<ProviderAdapterRegistry>,
    adapter_client: ProviderAdapterHttpClient,
    provider_secret_resolver: Option<ProviderSecretResolverRef>,
}

impl AdapterAwareChatCompletionStreamRelay {
    pub fn new(
        direct_relay: Arc<dyn ChatCompletionStreamRelay + Send + Sync>,
        adapter_registry: Arc<ProviderAdapterRegistry>,
        adapter_client: ProviderAdapterHttpClient,
    ) -> Self {
        Self {
            direct_relay,
            adapter_registry,
            adapter_client,
            provider_secret_resolver: None,
        }
    }

    pub fn with_secret_resolver(mut self, resolver: ProviderSecretResolverRef) -> Self {
        self.provider_secret_resolver = Some(resolver);
        self
    }
}

impl ChatCompletionStreamRelay for AdapterAwareChatCompletionStreamRelay {
    fn create_chat_completion_stream<'a>(
        &'a self,
        request: ChatCompletionRelayRequest,
    ) -> ChatCompletionStreamRelayFuture<'a> {
        Box::pin(async move {
            let lookup = ProviderAdapterLookup {
                provider_code: request.provider_code.as_str(),
                method: CHAT_COMPLETIONS_ENDPOINT.method,
                standard_path: CHAT_COMPLETIONS_ENDPOINT.standard_path,
                capability: Some(CHAT_COMPLETIONS_ENDPOINT.capability),
                endpoint_key: Some(CHAT_COMPLETIONS_ENDPOINT.endpoint_key),
            };

            match self.adapter_registry.resolve(&lookup).mode {
                ProviderInvocationMode::DirectHttp => {
                    self.direct_relay
                        .create_chat_completion_stream(request)
                        .await
                }
                ProviderInvocationMode::InternalHttpAdapter(route) => {
                    let invocation = chat_completion_stream_adapter_invocation(
                        request,
                        self.provider_secret_resolver.as_ref(),
                        route.invocation_shape.clone(),
                    )?;
                    let response = self
                        .adapter_client
                        .invoke(&route, invocation)
                        .await
                        .map_err(adapter_http_error)?;
                    Ok(adapter_response_to_stream_response(response))
                }
            }
        })
    }
}

fn chat_completion_stream_adapter_invocation(
    request: ChatCompletionRelayRequest,
    secret_resolver: Option<&ProviderSecretResolverRef>,
    shape: AdapterInvocationShape,
) -> DomainResult<AdapterInvocationRequest> {
    build_openai_adapter_invocation_with_shape(
        CHAT_COMPLETIONS_ENDPOINT,
        OpenAiAdapterInvocationParts {
            api_key_id: request.api_key_id,
            tenant_id: request.tenant_id,
            organization_id: request.organization_id,
            user_id: request.user_id,
            group_id: request.group_id,
            group_code: request.group_code,
            pricing_plan_code: request.pricing_plan_code,
            provider_code: request.provider_code,
            provider_channel_id: request.provider_channel_id,
            provider_region_code: request.provider_region_code,
            provider_model: request.provider_model,
            provider_base_url: request.provider_base_url,
            provider_secret_ref: request.provider_secret_ref,
            provider_auth_profile: request.provider_auth_profile,
            provider_timeout_ms: request.provider_timeout_ms,
            request_body: request.request_body,
        },
        secret_resolver,
        shape,
        true,
    )
}

fn adapter_response_to_stream_response(
    response: AdapterInvocationResponse,
) -> ChatCompletionStreamRelayResponse {
    if !(200..300).contains(&response.status_code) {
        return ChatCompletionStreamRelayResponse::new(
            response.status_code,
            response_content_type(&response.headers)
                .or_else(|| Some("application/json".to_owned())),
            Body::from(response.body.to_string()),
        );
    }

    ChatCompletionStreamRelayResponse::new(
        response.status_code,
        Some("text/event-stream".to_owned()),
        Body::from(adapter_body_to_sse(response.body)),
    )
}

fn adapter_body_to_sse(body: Value) -> String {
    match body {
        Value::String(value) if looks_like_sse(&value) => ensure_sse_done(value),
        Value::Array(events) => {
            let mut output = String::new();
            for event in events {
                push_json_sse_event(&mut output, event);
            }
            push_sse_done(&mut output);
            output
        }
        value => {
            let mut output = String::new();
            push_json_sse_event(&mut output, normalize_chat_completion_stream_event(value));
            push_sse_done(&mut output);
            output
        }
    }
}

fn normalize_chat_completion_stream_event(mut value: Value) -> Value {
    let Some(object) = value.as_object_mut() else {
        return value;
    };
    if !object.contains_key("object") {
        object.insert(
            "object".to_owned(),
            Value::String("chat.completion.chunk".to_owned()),
        );
    } else if object
        .get("object")
        .and_then(Value::as_str)
        .is_some_and(|object| object == "chat.completion")
    {
        object.insert(
            "object".to_owned(),
            Value::String("chat.completion.chunk".to_owned()),
        );
    }
    if let Some(choices) = object.get_mut("choices").and_then(Value::as_array_mut) {
        for choice in choices {
            let Some(choice_object) = choice.as_object_mut() else {
                continue;
            };
            if choice_object.contains_key("delta") {
                continue;
            }
            if let Some(message) = choice_object.remove("message") {
                let delta = message_to_delta(message);
                choice_object.insert("delta".to_owned(), delta);
            }
        }
    }
    value
}

fn message_to_delta(message: Value) -> Value {
    let Some(message_object) = message.as_object() else {
        return message;
    };
    let mut delta = serde_json::Map::new();
    if let Some(role) = message_object.get("role") {
        delta.insert("role".to_owned(), role.clone());
    }
    if let Some(content) = message_object.get("content") {
        delta.insert("content".to_owned(), content.clone());
    }
    if let Some(tool_calls) = message_object.get("tool_calls") {
        delta.insert("tool_calls".to_owned(), tool_calls.clone());
    }
    Value::Object(delta)
}

fn push_json_sse_event(output: &mut String, value: Value) {
    let payload = serde_json::to_string(&value).unwrap_or_else(|_| "null".to_owned());
    output.push_str("data: ");
    output.push_str(&payload);
    output.push_str("\n\n");
}

fn push_sse_done(output: &mut String) {
    if !output.contains("data: [DONE]") {
        output.push_str("data: [DONE]\n\n");
    }
}

fn looks_like_sse(value: &str) -> bool {
    value
        .lines()
        .any(|line| line.trim_start().starts_with("data:"))
}

fn ensure_sse_done(mut value: String) -> String {
    if !value.contains("data: [DONE]") {
        if !value.ends_with("\n\n") && !value.ends_with("\r\n\r\n") {
            while value.ends_with('\n') || value.ends_with('\r') {
                value.pop();
            }
            value.push_str("\n\n");
        }
        value.push_str("data: [DONE]\n\n");
    }
    value
}

fn response_content_type(headers: &BTreeMap<String, String>) -> Option<String> {
    headers
        .iter()
        .find(|(name, _)| name.eq_ignore_ascii_case("content-type"))
        .map(|(_, value)| value.to_owned())
}
