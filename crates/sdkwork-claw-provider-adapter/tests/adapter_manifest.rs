use std::sync::Arc;

use sdkwork_claw_provider_adapter::{ProviderAdapter, ProviderAdapterEndpoint};
use sdkwork_claw_provider_adapter_contract::AdapterInvocationShape;

#[derive(Debug)]
struct EchoProviderAdapter;

impl ProviderAdapter for EchoProviderAdapter {
    fn package(&self) -> &'static str {
        "echo"
    }

    fn provider_family(&self) -> &'static str {
        "echo"
    }

    fn supplier_codes(&self) -> &'static [&'static str] {
        &["echo-provider"]
    }

    fn endpoints(&self) -> Vec<ProviderAdapterEndpoint> {
        vec![ProviderAdapterEndpoint::runtime_available(
            "video.start_end2video",
            Some("video_generation".to_owned()),
            "POST",
            "/vidu/ent/v2/start-end2video",
            AdapterInvocationShape::AsyncTaskStart,
        )]
    }

    fn resolve_endpoint(
        &self,
        _request: &sdkwork_claw_provider_adapter_contract::AdapterInvocationRequest,
    ) -> Option<Arc<dyn sdkwork_claw_provider_adapter::EndpointAdapter>> {
        None
    }
}

#[test]
fn provider_adapter_exposes_manifest_endpoint_metadata() {
    let adapter = EchoProviderAdapter;

    let endpoints = adapter.endpoints();

    assert_eq!(adapter.package(), "echo");
    assert_eq!(adapter.supplier_codes(), &["echo-provider"]);
    assert_eq!(endpoints[0].endpoint_key, "video.start_end2video");
    assert_eq!(endpoints[0].capability.as_deref(), Some("video_generation"));
    assert_eq!(
        endpoints[0].standard_path_pattern,
        "/vidu/ent/v2/start-end2video"
    );
    assert_eq!(
        endpoints[0].invocation_shape,
        AdapterInvocationShape::AsyncTaskStart
    );
}
