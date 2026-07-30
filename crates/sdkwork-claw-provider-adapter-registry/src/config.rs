use sdkwork_claw_provider_adapter_contract::{
    AdapterEndpointRuntimeState, AdapterInvocationShape, AdapterKind, AdapterRouteStatus,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProviderAdapterRouteConfig {
    #[serde(rename = "providerCode", alias = "supplierCode")]
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

#[cfg(test)]
mod tests {
    use super::ProviderAdapterRouteConfig;
    use serde_json::json;

    fn canonical_route_json() -> serde_json::Value {
        json!({
            "providerCode": "openrouter",
            "adapterKind": "internal_http",
            "adapterBaseUrl": "http://adapter.internal",
            "method": "POST",
            "standardPathPattern": "/v1/chat/completions",
            "adapterPathTemplate": "/providers/{supplier_code}{standard_path}",
            "status": "enabled",
            "priority": 10
        })
    }

    #[test]
    fn route_config_serializes_the_canonical_provider_code() {
        let route: ProviderAdapterRouteConfig =
            serde_json::from_value(canonical_route_json()).expect("canonical provider route");

        let serialized = serde_json::to_value(route).expect("serialized provider route");
        assert_eq!(Some("openrouter"), serialized["providerCode"].as_str());
        assert!(serialized.get("supplierCode").is_none());
    }

    #[test]
    fn route_config_accepts_the_legacy_supplier_code_alias() {
        let mut value = canonical_route_json();
        let object = value.as_object_mut().expect("provider route object");
        let provider_code = object.remove("providerCode").expect("providerCode");
        object.insert("supplierCode".to_owned(), provider_code);

        let route: ProviderAdapterRouteConfig =
            serde_json::from_value(value).expect("legacy provider route");
        assert_eq!("openrouter", route.supplier_code);
    }
}
