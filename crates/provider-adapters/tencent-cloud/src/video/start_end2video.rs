use sdkwork_claw_provider_adapter::{
    AdapterInvocationContext, AdapterInvocationFuture, EndpointAdapter, ProviderAdapterEndpoint,
};
use sdkwork_claw_provider_adapter_contract::{
    AdapterError, AdapterErrorKind, AdapterInvocationRequest, AdapterInvocationResponse,
    AdapterInvocationShape,
};

pub const ENDPOINT_KEY: &str = "video.start_end2video";
pub const CAPABILITY: &str = "video_generation";
pub const STANDARD_PATH: &str = "/vidu/ent/v2/start-end2video";

#[derive(Debug, Clone, Copy, Default)]
pub struct TencentCloudViduStartEnd2VideoAdapter;

pub fn endpoint_manifest() -> ProviderAdapterEndpoint {
    ProviderAdapterEndpoint::definition_only(
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
    _request: AdapterInvocationRequest,
) -> Result<AdapterInvocationResponse, AdapterError> {
    Err(AdapterError::new(
        AdapterErrorKind::AdapterNotConfigured,
        "tencent_cloud_vidu_passthrough_required",
        "Tencent Cloud Vidu start-end2video must be routed through provider passthrough relay; direct adapter invocation is not supported",
    ))
}
