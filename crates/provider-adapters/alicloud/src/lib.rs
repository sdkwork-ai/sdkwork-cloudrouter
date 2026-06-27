pub mod common;
pub mod text_generation;
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
        vec![text_generation::endpoint_manifest()]
    }

    fn resolve_endpoint(
        &self,
        request: &sdkwork_claw_provider_adapter_contract::AdapterInvocationRequest,
    ) -> Option<Arc<dyn EndpointAdapter>> {
        if request.invocation.endpoint_key == text_generation::ENDPOINT_KEY
            && request.invocation.method.eq_ignore_ascii_case("POST")
            && request.invocation.standard_path == text_generation::STANDARD_PATH
        {
            return Some(Arc::new(
                text_generation::AliCloudBailianTextGenerationAdapter,
            ));
        }
        None
    }
}
