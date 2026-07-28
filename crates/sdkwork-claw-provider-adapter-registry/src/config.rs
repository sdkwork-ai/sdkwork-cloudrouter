use sdkwork_claw_provider_adapter_contract::{
    AdapterEndpointRuntimeState, AdapterInvocationShape, AdapterKind, AdapterRouteStatus,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProviderAdapterRouteConfig {
    pub supplier_code: String,
    pub adapter_kind: AdapterKind,
    pub adapter_base_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub capability: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub endpoint_key: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub service_group: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub openapi_operation_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub s3_operation: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub iaas_operation: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub endpoint_styles: Vec<String>,
    #[serde(default)]
    pub runtime_state: AdapterEndpointRuntimeState,
    pub method: String,
    #[serde(default)]
    pub invocation_shape: AdapterInvocationShape,
    pub standard_path_pattern: String,
    pub adapter_path_template: String,
    pub status: AdapterRouteStatus,
    pub priority: i32,
}

impl ProviderAdapterRouteConfig {
    pub fn adapter_path(&self, standard_path: &str) -> String {
        self.adapter_path_template
            .replace("{supplier_code}", self.supplier_code.as_str())
            .replace("{standard_path}", standard_path)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ProviderAdapterLookup<'a> {
    pub supplier_code: &'a str,
    pub method: &'a str,
    pub standard_path: &'a str,
    pub capability: Option<&'a str>,
    pub endpoint_key: Option<&'a str>,
}
