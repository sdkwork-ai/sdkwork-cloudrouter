use std::sync::Arc;

use sdkwork_claw_provider_adapter_contract::AdapterInvocationRequest;
use sdkwork_claw_provider_adapter_http::{AdapterInvokeResult, ProviderAdapterHttpClient};
use sdkwork_claw_provider_adapter_registry::{
    ProviderAdapterLookup, ProviderAdapterRegistry, ProviderInvocationMode,
};

use super::adapter_aware_openai_relay::{
    adapter_http_error, build_openai_adapter_invocation, provider_response_memory_error,
    OpenAiAdapterEndpoint, OpenAiAdapterInvocationParts, ProviderSecretResolverRef,
};
use super::response_memory_budget::ProviderResponseMemoryBudget;
use crate::domain::DomainResult;
use crate::ports::{
    ResponsesRelay, ResponsesRelayFuture, ResponsesRelayRequest, ResponsesRelayResponse,
};

const RESPONSES_ENDPOINT: OpenAiAdapterEndpoint = OpenAiAdapterEndpoint {
    method: "POST",
    standard_path: "/v1/responses",
    capability: "responses",
    endpoint_key: "openai.responses",
    invocation_id_prefix: "responses",
};

#[derive(Clone)]
pub struct AdapterAwareResponsesRelay {
    direct_relay: Arc<dyn ResponsesRelay + Send + Sync>,
    adapter_registry: Arc<ProviderAdapterRegistry>,
    adapter_client: ProviderAdapterHttpClient,
    provider_secret_resolver: Option<ProviderSecretResolverRef>,
    response_memory_budget: ProviderResponseMemoryBudget,
}

impl AdapterAwareResponsesRelay {
    pub fn new(
        direct_relay: Arc<dyn ResponsesRelay + Send + Sync>,
        adapter_registry: Arc<ProviderAdapterRegistry>,
        adapter_client: ProviderAdapterHttpClient,
    ) -> Self {
        Self {
            direct_relay,
            adapter_registry,
            adapter_client,
            provider_secret_resolver: None,
            response_memory_budget: ProviderResponseMemoryBudget::with_default_limit(),
        }
    }

    pub fn with_secret_resolver(mut self, resolver: ProviderSecretResolverRef) -> Self {
        self.provider_secret_resolver = Some(resolver);
        self
    }

    pub fn with_shared_response_memory_budget(
        mut self,
        response_memory_budget: ProviderResponseMemoryBudget,
    ) -> Self {
        self.response_memory_budget = response_memory_budget;
        self
    }
}

impl ResponsesRelay for AdapterAwareResponsesRelay {
    fn create_response<'a>(&'a self, request: ResponsesRelayRequest) -> ResponsesRelayFuture<'a> {
        Box::pin(async move {
            let lookup = ProviderAdapterLookup {
                supplier_code: request.supplier_code.as_str(),
                method: RESPONSES_ENDPOINT.method,
                standard_path: RESPONSES_ENDPOINT.standard_path,
                capability: Some(RESPONSES_ENDPOINT.capability),
                endpoint_key: Some(RESPONSES_ENDPOINT.endpoint_key),
            };

            match self.adapter_registry.resolve(&lookup).mode {
                ProviderInvocationMode::DirectHttp => {
                    self.direct_relay.create_response(request).await
                }
                ProviderInvocationMode::InternalHttpAdapter(route) => {
                    let invocation = responses_adapter_invocation(
                        request,
                        self.provider_secret_resolver.as_ref(),
                    )?;
                    let memory_guard = self
                        .response_memory_budget
                        .try_reserve(ProviderAdapterHttpClient::MAX_BUFFERED_RESPONSE_BYTES as u64)
                        .map_err(provider_response_memory_error)?;
                    let response = self
                        .adapter_client
                        .invoke(&route, invocation)
                        .await
                        .map_err(adapter_http_error)?;
                    match response {
                        AdapterInvokeResult::Buffered(response) => Ok(
                            ResponsesRelayResponse::json(response.status_code, response.body)
                                .with_memory_guard(memory_guard),
                        ),
                        AdapterInvokeResult::Streaming { .. } => Err(crate::domain::DomainError::new(
                            "provider adapter returned a streaming body for a non-streaming responses request",
                        )),
                    }
                }
            }
        })
    }
}

fn responses_adapter_invocation(
    request: ResponsesRelayRequest,
    secret_resolver: Option<&ProviderSecretResolverRef>,
) -> DomainResult<AdapterInvocationRequest> {
    build_openai_adapter_invocation(
        RESPONSES_ENDPOINT,
        OpenAiAdapterInvocationParts {
            api_key_id: request.api_key_id,
            tenant_id: request.tenant_id,
            organization_id: request.organization_id,
            user_id: request.user_id,
            group_id: request.group_id,
            group_code: request.group_code,
            pricing_plan_code: request.pricing_plan_code,
            supplier_code: request.supplier_code,
            provider_account_id: request.provider_account_id,
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
