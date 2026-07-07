pub mod common;
pub mod video;

use std::sync::Arc;

use sdkwork_claw_provider_adapter::{EndpointAdapter, ProviderAdapter, ProviderAdapterEndpoint};

#[derive(Debug, Clone, Copy, Default)]
pub struct TencentCloudProviderAdapter;

pub fn provider_adapter() -> Arc<dyn ProviderAdapter> {
    Arc::new(TencentCloudProviderAdapter)
}

impl ProviderAdapter for TencentCloudProviderAdapter {
    fn package(&self) -> &'static str {
        "tencent-cloud"
    }

    fn provider_family(&self) -> &'static str {
        "tencent-cloud"
    }

    fn provider_codes(&self) -> &'static [&'static str] {
        &["tencent-cloud", "tencent-hunyuan"]
    }

    fn endpoints(&self) -> Vec<ProviderAdapterEndpoint> {
        vec![video::start_end2video::endpoint_manifest()]
    }

    fn resolve_endpoint(
        &self,
        _request: &sdkwork_claw_provider_adapter_contract::AdapterInvocationRequest,
    ) -> Option<Arc<dyn EndpointAdapter>> {
        None
    }
}
