use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use sdkwork_claw_provider_adapter_contract::{
    AdapterEndpointRuntimeState, AdapterError, AdapterInvocationRequest, AdapterInvocationResponse,
    AdapterInvocationShape, ProviderAdapterEndpointManifest, ProviderAdapterManifest,
    ProviderAdapterProviderManifest,
};

pub type AdapterInvocationFuture<'a> =
    Pin<Box<dyn Future<Output = Result<AdapterInvocationResponse, AdapterError>> + Send + 'a>>;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProviderAdapterEndpoint {
    pub endpoint_key: String,
    pub capability: Option<String>,
    pub service_group: Option<String>,
    pub openapi_operation_id: Option<String>,
    pub s3_operation: Option<String>,
    pub iaas_operation: Option<String>,
    pub request_schema: Option<String>,
    pub response_schema: Option<String>,
    pub endpoint_styles: Vec<String>,
    pub runtime_state: AdapterEndpointRuntimeState,
    pub method: String,
    pub standard_path_pattern: String,
    pub invocation_shape: AdapterInvocationShape,
}

impl ProviderAdapterEndpoint {
    pub fn runtime_available(
        endpoint_key: impl Into<String>,
        capability: Option<String>,
        method: impl Into<String>,
        standard_path_pattern: impl Into<String>,
        invocation_shape: AdapterInvocationShape,
    ) -> Self {
        Self {
            endpoint_key: endpoint_key.into(),
            capability,
            service_group: None,
            openapi_operation_id: None,
            s3_operation: None,
            iaas_operation: None,
            request_schema: None,
            response_schema: None,
            endpoint_styles: Vec::new(),
            runtime_state: AdapterEndpointRuntimeState::RuntimeAvailable,
            method: method.into(),
            standard_path_pattern: standard_path_pattern.into(),
            invocation_shape,
        }
    }

    pub fn definition_only(
        endpoint_key: impl Into<String>,
        capability: Option<String>,
        method: impl Into<String>,
        standard_path_pattern: impl Into<String>,
        invocation_shape: AdapterInvocationShape,
    ) -> Self {
        let mut endpoint = Self::runtime_available(
            endpoint_key,
            capability,
            method,
            standard_path_pattern,
            invocation_shape,
        );
        endpoint.runtime_state = AdapterEndpointRuntimeState::DefinitionOnly;
        endpoint
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct AdapterInvocationContext {
    pub provider_code: String,
    pub request_id: Option<String>,
    pub trace_id: Option<String>,
}

pub trait EndpointAdapter: Send + Sync {
    fn endpoint_key(&self) -> &'static str;

    fn method(&self) -> &'static str;

    fn standard_path_pattern(&self) -> &'static str;

    fn invocation_shape(&self) -> AdapterInvocationShape;

    fn invoke<'a>(
        &'a self,
        context: AdapterInvocationContext,
        request: AdapterInvocationRequest,
    ) -> AdapterInvocationFuture<'a>;
}

pub trait ProviderAdapter: Send + Sync {
    fn package(&self) -> &'static str;

    fn provider_family(&self) -> &'static str;

    fn provider_codes(&self) -> &'static [&'static str];

    fn endpoints(&self) -> Vec<ProviderAdapterEndpoint>;

    fn resolve_endpoint(
        &self,
        request: &AdapterInvocationRequest,
    ) -> Option<Arc<dyn EndpointAdapter>>;
}

pub fn provider_adapter_manifest(adapters: &[Arc<dyn ProviderAdapter>]) -> ProviderAdapterManifest {
    ProviderAdapterManifest {
        providers: adapters
            .iter()
            .map(|adapter| ProviderAdapterProviderManifest {
                package: adapter.package().to_owned(),
                provider_family: adapter.provider_family().to_owned(),
                provider_codes: adapter
                    .provider_codes()
                    .iter()
                    .map(|provider_code| (*provider_code).to_owned())
                    .collect(),
                endpoints: adapter
                    .endpoints()
                    .into_iter()
                    .map(|endpoint| ProviderAdapterEndpointManifest {
                        endpoint_key: endpoint.endpoint_key,
                        capability: endpoint.capability,
                        service_group: endpoint.service_group,
                        openapi_operation_id: endpoint.openapi_operation_id,
                        s3_operation: endpoint.s3_operation,
                        iaas_operation: endpoint.iaas_operation,
                        request_schema: endpoint.request_schema,
                        response_schema: endpoint.response_schema,
                        endpoint_styles: endpoint.endpoint_styles,
                        runtime_state: endpoint.runtime_state,
                        method: endpoint.method,
                        standard_path_pattern: endpoint.standard_path_pattern,
                        invocation_shape: endpoint.invocation_shape,
                    })
                    .collect(),
            })
            .collect(),
    }
}
