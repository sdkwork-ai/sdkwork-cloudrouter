use sdkwork_claw_config::ProviderAdapterConfig;
use sdkwork_claw_provider_adapter_contract::AdapterInvocationShape;
use sdkwork_claw_provider_adapter_registry::{
    ProviderAdapterLookup, ProviderAdapterRegistry, ProviderInvocationMode,
};
use sdkwork_clawrouter_router_service::application::{
    Invocation, InvocationAdapterTarget, InvocationShape,
};
use sdkwork_clawrouter_router_service::ports::ProviderAdapterRouteResolver;

#[derive(Clone)]
pub(crate) struct InvocationProviderAdapterResolver {
    registry: ProviderAdapterRegistry,
    gateway_token: String,
}

impl InvocationProviderAdapterResolver {
    pub(crate) fn from_config(config: ProviderAdapterConfig) -> Option<Self> {
        if config.routes().is_empty() {
            return None;
        }
        Some(Self {
            registry: ProviderAdapterRegistry::new(config.routes().to_vec()),
            gateway_token: config.gateway_token().to_owned(),
        })
    }
}

impl ProviderAdapterRouteResolver for InvocationProviderAdapterResolver {
    fn resolve_adapter_target(&self, invocation: &Invocation) -> Option<InvocationAdapterTarget> {
        let supplier_code = invocation
            .account
            .as_ref()
            .map(|account| account.supplier_code.as_str())
            .or(invocation.resource.supplier_code.as_deref())?;
        for standard_path in adapter_lookup_standard_paths(invocation) {
            let lookup = ProviderAdapterLookup {
                supplier_code,
                method: invocation.request.method.as_str(),
                standard_path: standard_path.as_str(),
                capability: Some(provider_native_capability_code(
                    invocation.resource.capability,
                )),
                endpoint_key: None,
            };
            if let ProviderInvocationMode::InternalHttpAdapter(route) =
                self.registry.resolve_standard_path(&lookup).mode
            {
                let adapter_invocation_shape = route.invocation_shape.clone();
                return Some(InvocationAdapterTarget {
                    supplier_code: route.supplier_code.clone(),
                    endpoint_key: route
                        .endpoint_key
                        .clone()
                        .unwrap_or_else(|| invocation.resource.route_key.clone()),
                    base_url: route.adapter_base_url,
                    path_template: route.adapter_path_template,
                    standard_path,
                    gateway_token: Some(self.gateway_token.clone()),
                    shape: invocation_shape_from_adapter_shape(adapter_invocation_shape.clone()),
                    adapter_invocation_shape,
                });
            }
        }
        None
    }
}

fn adapter_lookup_standard_paths(invocation: &Invocation) -> Vec<String> {
    let path = invocation.request.path.clone();
    let mut paths = vec![path.clone()];
    let supplier_code = invocation
        .account
        .as_ref()
        .map(|account| account.supplier_code.as_str())
        .or(invocation.resource.supplier_code.as_deref())
        .unwrap_or_default();
    if !supplier_code.is_empty() {
        let prefixed = format!(
            "/{}/{}",
            supplier_code.trim().trim_matches('/'),
            path.trim_start_matches('/')
        );
        if prefixed != path && !paths.iter().any(|candidate| candidate == &prefixed) {
            paths.push(prefixed);
        }
    }
    if supplier_code.eq_ignore_ascii_case("tencent-cloud") {
        if path == "/ent/v2/start-end2video" {
            paths.push("/vidu/ent/v2/start-end2video".to_owned());
        } else if path == "/ent/v2/reference2image" {
            paths.push("/vidu/ent/v2/reference2image".to_owned());
        }
    }
    paths
}

fn provider_native_capability_code(
    capability: sdkwork_clawrouter_router_service::domain::RoutingCapability,
) -> &'static str {
    match capability {
        sdkwork_clawrouter_router_service::domain::RoutingCapability::Chat => "chat",
        sdkwork_clawrouter_router_service::domain::RoutingCapability::Embedding => "embedding",
        sdkwork_clawrouter_router_service::domain::RoutingCapability::Image => "image_generation",
        sdkwork_clawrouter_router_service::domain::RoutingCapability::Audio => "audio",
        sdkwork_clawrouter_router_service::domain::RoutingCapability::Music => "music_generation",
        sdkwork_clawrouter_router_service::domain::RoutingCapability::Video => "video_generation",
        sdkwork_clawrouter_router_service::domain::RoutingCapability::Rerank => "rerank",
        sdkwork_clawrouter_router_service::domain::RoutingCapability::Network => "network",
    }
}

fn invocation_shape_from_adapter_shape(shape: AdapterInvocationShape) -> InvocationShape {
    match shape {
        AdapterInvocationShape::SseStream => InvocationShape::SseStream,
        AdapterInvocationShape::ByteStream | AdapterInvocationShape::FileUpload => {
            InvocationShape::ByteStream
        }
        AdapterInvocationShape::HealthProbe => InvocationShape::Empty,
        AdapterInvocationShape::SyncJson
        | AdapterInvocationShape::AsyncTaskStart
        | AdapterInvocationShape::AsyncTaskQuery
        | AdapterInvocationShape::AsyncTaskCancel
        | AdapterInvocationShape::WebhookCallback => InvocationShape::Json,
    }
}
