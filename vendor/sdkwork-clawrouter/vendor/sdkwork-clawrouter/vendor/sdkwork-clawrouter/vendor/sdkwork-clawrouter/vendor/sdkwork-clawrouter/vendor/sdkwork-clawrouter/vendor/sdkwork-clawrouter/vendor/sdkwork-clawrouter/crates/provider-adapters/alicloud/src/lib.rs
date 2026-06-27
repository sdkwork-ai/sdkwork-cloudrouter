pub mod common;
pub mod video;

use std::sync::Arc;

use sdkwork_claw_provider_adapter_core::{
    EndpointAdapter, ProviderAdapter, ProviderAdapterEndpoint,
};

#[derive(Debug, Clone, Copy, Default)]
pub struct AliCloudProviderAdapter;

pub fn provider_adapter() -> Arc<dyn ProviderAdapter> {
    Arc::new(AliCloudProviderAdapter)
}

impl ProviderAdapter for AliCloudProviderAdapter {
    fn package(&self) -> &'static str {
        "alicloud"
    }

    fn provider_family(&self) -> &'static str {
        "alicloud"
    }

    fn provider_codes(&self) -> &'static [&'static str] {
        &["alicloud", "aliyun"]
    }

    fn endpoints(&self) -> Vec<ProviderAdapterEndpoint> {
        Vec::new()
    }

    fn resolve_endpoint(
        &self,
        _request: &sdkwork_claw_provider_adapter_contract::AdapterInvocationRequest,
    ) -> Option<Arc<dyn EndpointAdapter>> {
        None
    }
}
