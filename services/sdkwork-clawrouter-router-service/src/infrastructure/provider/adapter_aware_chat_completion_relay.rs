use std::sync::Arc;

use sdkwork_claw_provider_adapter_contract::AdapterInvocationRequest;
use sdkwork_claw_provider_adapter_http::{AdapterInvokeResult, ProviderAdapterHttpClient};
use sdkwork_claw_provider_adapter_registry::{
    ProviderAdapterLookup, ProviderAdapterRegistry, ProviderInvocationMode,
};

use super::adapter_aware_openai_relay::{
    adapter_http_error, build_openai_adapter_invocation, OpenAiAdapterEndpoint,
    OpenAiAdapterInvocationParts, ProviderSecretResolverRef,
};
use crate::domain::DomainResult;
use crate::ports::{
    ChatCompletionRelay, ChatCompletionRelayFuture, ChatCompletionRelayRequest,
    ChatCompletionRelayResponse,
};

const CHAT_COMPLETIONS_ENDPOINT: OpenAiAdapterEndpoint = OpenAiAdapterEndpoint {
    method: "POST",
    standard_path: "/v1/chat/completions",
    capability: "chat",
    endpoint_key: "openai.chat_completions",
    invocation_id_prefix: "chat",
};

#[derive(Clone)]
pub struct AdapterAwareChatCompletionRelay {
    direct_relay: Arc<dyn ChatCompletionRelay + Send + Sync>,
    adapter_registry: Arc<ProviderAdapterRegistry>,
    adapter_client: ProviderAdapterHttpClient,
    provider_secret_resolver: Option<ProviderSecretResolverRef>,
}

impl AdapterAwareChatCompletionRelay {
    pub fn new(
        direct_relay: Arc<dyn ChatCompletionRelay + Send + Sync>,
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

impl ChatCompletionRelay for AdapterAwareChatCompletionRelay {
    fn create_chat_completion<'a>(
        &'a self,
        request: ChatCompletionRelayRequest,
    ) -> ChatCompletionRelayFuture<'a> {
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
                    self.direct_relay.create_chat_completion(request).await
                }
                ProviderInvocationMode::InternalHttpAdapter(route) => {
                    let invocation = chat_completion_adapter_invocation(
                        request,
                        self.provider_secret_resolver.as_ref(),
                    )?;
                    let response = self
                        .adapter_client
                        .invoke(&route, invocation)
                        .await
                        .map_err(adapter_http_error)?;
                    let (status_code, body) = match response {
                        AdapterInvokeResult::Buffered(resp) => (resp.status_code, resp.body),
                        AdapterInvokeResult::Streaming {
                            status_code,
                            stream_body,
                            ..
                        } => {
                            let bytes = axum::body::to_bytes(stream_body, 16 * 1024 * 1024)
                                .await
                                .unwrap_or_default();
                            let body =
                                serde_json::from_slice(&bytes).unwrap_or(serde_json::Value::Null);
                            (status_code, body)
                        }
                    };
                    Ok(ChatCompletionRelayResponse::json(status_code, body))
                }
            }
        })
    }
}

fn chat_completion_adapter_invocation(
    request: ChatCompletionRelayRequest,
    secret_resolver: Option<&ProviderSecretResolverRef>,
) -> DomainResult<AdapterInvocationRequest> {
    build_openai_adapter_invocation(
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
    )
}
