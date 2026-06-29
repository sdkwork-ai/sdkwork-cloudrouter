use sdkwork_claw_provider_adapter_contract::{
    AdapterError, AdapterInvocationRequest, AdapterInvocationResponse, AdapterInvocationShape,
    AdapterUsageLine,
};
use sdkwork_claw_provider_adapter::{
    AdapterInvocationContext, AdapterInvocationFuture, EndpointAdapter, ProviderAdapterEndpoint,
};
use serde_json::json;

pub const ENDPOINT_KEY: &str = "video.start_end2video";
pub const CAPABILITY: &str = "video_generation";
pub const STANDARD_PATH: &str = "/vidu/ent/v2/start-end2video";

#[derive(Debug, Clone, Copy, Default)]
pub struct TencentCloudViduStartEnd2VideoAdapter;

pub fn endpoint_manifest() -> ProviderAdapterEndpoint {
    ProviderAdapterEndpoint::runtime_available(
        ENDPOINT_KEY,
        Some(CAPABILITY.to_owned()),
        "POST",
        STANDARD_PATH,
        AdapterInvocationShape::AsyncTaskStart,
    )
}

impl EndpointAdapter for TencentCloudViduStartEnd2VideoAdapter {
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
        AdapterInvocationShape::AsyncTaskStart
    }

    fn invoke<'a>(
        &'a self,
        _context: AdapterInvocationContext,
        request: AdapterInvocationRequest,
    ) -> AdapterInvocationFuture<'a> {
        Box::pin(async move { invoke_start_end2video(request) })
    }
}

fn invoke_start_end2video(
    request: AdapterInvocationRequest,
) -> Result<AdapterInvocationResponse, AdapterError> {
    let provider_model = request.provider.provider_model;
    let duration_seconds = video_duration_seconds(&request.body);
    let provider_task_id = "tencent-cloud-vidu-task-1".to_owned();
    let mut response = AdapterInvocationResponse::json_task(
        200,
        json!({
            "id": provider_task_id,
            "status": "queued"
        }),
    )
    .with_provider_task_id(provider_task_id)
    .with_billing_units(1)
    .with_usage_line(
        AdapterUsageLine::new("api_request", "1")
            .with_request_count(1)
            .with_provider_native_model(provider_model.clone()),
    );
    if let Some(duration_seconds) = duration_seconds {
        response = response.with_usage_line(
            AdapterUsageLine::new("video_output_second", duration_seconds.clone())
                .with_video_seconds(duration_seconds)
                .with_provider_native_model(provider_model),
        );
    }
    Ok(response)
}

fn video_duration_seconds(body: &serde_json::Value) -> Option<String> {
    body.get("durationSeconds")
        .or_else(|| body.get("duration_seconds"))
        .or_else(|| body.get("duration"))
        .and_then(positive_json_number)
        .map(|value| value.to_string())
}

fn positive_json_number(value: &serde_json::Value) -> Option<u64> {
    if let Some(value) = value.as_u64() {
        return (value > 0).then_some(value);
    }
    let value = value.as_f64()?;
    if !value.is_finite() || value <= 0.0 {
        return None;
    }
    Some(value.ceil() as u64)
}
