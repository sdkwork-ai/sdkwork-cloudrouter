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

use sdkwork_claw_provider_adapter_contract::{
    AdapterError, AdapterInvocationRequest, AdapterInvocationResponse, AdapterInvocationShape,
    AdapterUsageLine,
};
use sdkwork_claw_provider_adapter::{
    AdapterInvocationContext, AdapterInvocationFuture, EndpointAdapter, ProviderAdapterEndpoint,
};
use serde_json::json;

pub const ENDPOINT_KEY: &str = "text_generation.generate";
pub const CAPABILITY: &str = "text_generation";
pub const STANDARD_PATH: &str = "/api/v1/services/aigc/text-generation/generation";
pub const HOST: &str = "dashscope.aliyuncs.com";

#[derive(Debug, Clone, Copy, Default)]
pub struct AliCloudBailianTextGenerationAdapter;

pub fn endpoint_manifest() -> ProviderAdapterEndpoint {
    ProviderAdapterEndpoint::runtime_available(
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
    request: AdapterInvocationRequest,
) -> Result<AdapterInvocationResponse, AdapterError> {
    let provider_model = request.provider.provider_model;
    let prompt_tokens = estimate_prompt_tokens(&request.body);
    let provider_task_id = format!("alicloud-bailian-{}", request.invocation.request_id);

    let response = AdapterInvocationResponse::json_task(
        200,
        json!({
            "output": {
                "text": "AliCloud Bailian text generation response placeholder.",
                "finish_reason": "stop"
            },
            "usage": {
                "prompt_tokens": prompt_tokens,
                "total_tokens": prompt_tokens + 10
            },
            "request_id": provider_task_id
        }),
    )
    .with_provider_task_id(provider_task_id)
    .with_billing_units(1)
    .with_usage_line(
        AdapterUsageLine::new("api_request", "1")
            .with_request_count(1)
            .with_provider_native_model(provider_model.clone()),
    )
    .with_usage_line(
        AdapterUsageLine::new("token_input", prompt_tokens.to_string())
            .with_provider_native_model(provider_model.clone()),
    )
    .with_usage_line(
        AdapterUsageLine::new("token_output", "10")
            .with_provider_native_model(provider_model),
    );

    Ok(response)
}

/// Estimate prompt token count from the request body's input field.
/// Falls back to 1 when the field is absent or not a positive integer.
fn estimate_prompt_tokens(body: &serde_json::Value) -> u64 {
    body.get("input")
        .and_then(|v| v.as_str())
        .map(|s| (s.len() as u64 / 4).max(1))
        .or_else(|| {
            body.get("parameters")
                .and_then(|p| p.get("prompt_tokens"))
                .and_then(|t| t.as_u64())
        })
        .unwrap_or(1)
}
