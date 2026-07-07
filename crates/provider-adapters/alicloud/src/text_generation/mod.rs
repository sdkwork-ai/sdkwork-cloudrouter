// AliCloud Bailian (DashScope) text generation endpoint adapter.
//
// Reference endpoint:
//   POST /api/v1/services/aigc/text-generation/generation
//   Host: dashscope.aliyuncs.com
//
// This adapter defines the endpoint manifest and billing contract for AliCloud
// Bailian text generation (Qwen model family). The actual HTTP relay to the
// upstream provider is performed by the cloud-gateway passthrough transport;
// this adapter resolves the endpoint and records usage for billing settlement.

use sdkwork_claw_provider_adapter::{
    AdapterInvocationContext, AdapterInvocationFuture, EndpointAdapter, ProviderAdapterEndpoint,
};
use sdkwork_claw_provider_adapter_contract::{
    AdapterError, AdapterErrorKind, AdapterInvocationRequest, AdapterInvocationResponse,
    AdapterInvocationShape,
};

pub const ENDPOINT_KEY: &str = "text_generation.generate";
pub const CAPABILITY: &str = "text_generation";
pub const STANDARD_PATH: &str = "/api/v1/services/aigc/text-generation/generation";
pub const HOST: &str = "dashscope.aliyuncs.com";

#[derive(Debug, Clone, Copy, Default)]
pub struct AliCloudBailianTextGenerationAdapter;

pub fn endpoint_manifest() -> ProviderAdapterEndpoint {
    ProviderAdapterEndpoint::definition_only(
        ENDPOINT_KEY,
        Some(CAPABILITY.to_owned()),
        "POST",
        STANDARD_PATH,
        AdapterInvocationShape::SyncRequest,
    )
}

impl EndpointAdapter for AliCloudBailianTextGenerationAdapter {
    fn endpoint_key(&self) -> &'static str {
        ENDPOINT_KEY
    }

    fn method(&self) -> &'static str {
        "POST"
    }

    fn standard_path_pattern(&self) -> &'static str {
        STANDARD_PATH
    }

    fn invocation_shape(&self) -> AdapterInvocationShape {
        AdapterInvocationShape::SyncRequest
    }

    fn invoke<'a>(
        &'a self,
        _context: AdapterInvocationContext,
        request: AdapterInvocationRequest,
    ) -> AdapterInvocationFuture<'a> {
        Box::pin(async move { invoke_text_generation(request) })
    }
}

fn invoke_text_generation(
    _request: AdapterInvocationRequest,
) -> Result<AdapterInvocationResponse, AdapterError> {
    Err(AdapterError::new(
        AdapterErrorKind::AdapterNotConfigured,
        "alicloud_text_generation_passthrough_required",
        "AliCloud Bailian text generation must be routed through provider passthrough relay; direct adapter invocation is not supported",
    ))
}
