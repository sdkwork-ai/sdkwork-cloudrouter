use sdkwork_claw_provider_adapter_contract::{
    AdapterEndpointRuntimeState, AdapterKind, AdapterRouteStatus, ProviderAdapterManifest,
};
use serde::{Deserialize, Serialize};

use crate::config::ProviderAdapterRouteConfig;

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProviderAdapterSnapshot {
    pub routes: Vec<ProviderAdapterRouteConfig>,
}

impl ProviderAdapterSnapshot {
    pub fn from_manifest(
        manifest: &ProviderAdapterManifest,
        adapter_base_url: impl AsRef<str>,
    ) -> Result<Self, String> {
        let adapter_base_url = adapter_base_url.as_ref().trim().trim_end_matches('/');
        if manifest
            .providers
            .iter()
            .any(|provider| !provider.supplier_codes.is_empty() && !provider.endpoints.is_empty())
            && adapter_base_url.is_empty()
        {
            return Err("adapter base URL must not be blank".to_owned());
        }

        let routes = manifest
            .providers
            .iter()
            .flat_map(|provider| {
                provider
                    .supplier_codes
                    .iter()
                    .flat_map(move |supplier_code| {
                        provider
                            .endpoints
                            .iter()
                            .filter(|endpoint| {
                                endpoint.runtime_state
                                    == AdapterEndpointRuntimeState::RuntimeAvailable
                            })
                            .map(move |endpoint| ProviderAdapterRouteConfig {
                                supplier_code: supplier_code.clone(),
                                adapter_kind: AdapterKind::InternalHttp,
                                adapter_base_url: adapter_base_url.to_owned(),
                                capability: endpoint.capability.clone(),
                                endpoint_key: Some(endpoint.endpoint_key.clone()),
                                service_group: endpoint.service_group.clone(),
                                openapi_operation_id: endpoint.openapi_operation_id.clone(),
                                s3_operation: endpoint.s3_operation.clone(),
                                iaas_operation: endpoint.iaas_operation.clone(),
                                endpoint_styles: endpoint.endpoint_styles.clone(),
                                runtime_state: endpoint.runtime_state.clone(),
                                method: endpoint.method.to_ascii_uppercase(),
                                invocation_shape: endpoint.invocation_shape.clone(),
                                standard_path_pattern: normalize_path(
                                    endpoint.standard_path_pattern.as_str(),
                                ),
                                adapter_path_template: "/providers/{supplier_code}{standard_path}"
                                    .to_owned(),
                                status: AdapterRouteStatus::Enabled,
                                priority: 10,
                            })
                    })
            })
            .collect();

        Ok(Self { routes })
    }
}

fn normalize_path(value: &str) -> String {
    let value = value.trim();
    if value.starts_with('/') {
        value.to_owned()
    } else {
        format!("/{value}")
    }
}
