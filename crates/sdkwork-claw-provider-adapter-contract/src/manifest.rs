use serde::{Deserialize, Serialize};

use crate::endpoint::{AdapterEndpointRuntimeState, AdapterInvocationShape};

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProviderAdapterManifest {
    #[serde(default)]
    pub providers: Vec<ProviderAdapterProviderManifest>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProviderAdapterProviderManifest {
    pub package: String,
    pub provider_family: String,
    /// Public manifest contract uses `providerCodes`; `supplier_codes` is the
    /// internal domain name for the same concept.
    #[serde(default, rename = "providerCodes")]
    pub supplier_codes: Vec<String>,
    #[serde(default)]
    pub endpoints: Vec<ProviderAdapterEndpointManifest>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProviderAdapterEndpointManifest {
    pub endpoint_key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub capability: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub service_group: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub openapi_operation_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub s3_operation: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub iaas_operation: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request_schema: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_schema: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub endpoint_styles: Vec<String>,
    #[serde(default)]
    pub runtime_state: AdapterEndpointRuntimeState,
    pub method: String,
    pub standard_path_pattern: String,
    pub invocation_shape: AdapterInvocationShape,
}
