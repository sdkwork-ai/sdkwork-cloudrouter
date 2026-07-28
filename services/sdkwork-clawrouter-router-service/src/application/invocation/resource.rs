use crate::domain::{AiRouteModelRequirement, RoutingCapability};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InvocationSurface {
    OpenAiCompatible,
    ProviderNative,
    CloudStorage,
    CloudIaas,
    AppApi,
    AdminApi,
    Internal,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ResourceType {
    ModelCall,
    ChatCompletion,
    Response,
    Embedding,
    Image,
    Audio,
    Video,
    File,
    Upload,
    Thread,
    Assistant,
    VectorStore,
    Batch,
    FineTuningJob,
    Conversation,
    Container,
    RealtimeSession,
    ProviderNativeApi,
    StorageBucket,
    StorageObject,
    IaasInstance,
    FreeEndpoint,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvocationResource {
    pub surface: InvocationSurface,
    pub provider_family: Option<String>,
    pub supplier_code: Option<String>,
    pub route_key: String,
    pub api_code: String,
    pub endpoint_key: Option<String>,
    pub operation_id: Option<String>,
    pub resource_type: ResourceType,
    pub resource_id: Option<String>,
    pub parent_resource_type: Option<ResourceType>,
    pub parent_resource_id: Option<String>,
    pub capability: RoutingCapability,
    pub model_requirement: AiRouteModelRequirement,
    pub requested_model: Option<String>,
    pub requested_model_catalog_key: Option<String>,
    pub provider_native_model: Option<String>,
}

impl InvocationResource {
    pub fn model_call(
        route_key: impl Into<String>,
        api_code: impl Into<String>,
        capability: RoutingCapability,
        model_requirement: AiRouteModelRequirement,
    ) -> Self {
        Self {
            surface: InvocationSurface::OpenAiCompatible,
            provider_family: None,
            supplier_code: None,
            route_key: route_key.into(),
            api_code: api_code.into(),
            endpoint_key: None,
            operation_id: None,
            resource_type: ResourceType::ModelCall,
            resource_id: None,
            parent_resource_type: None,
            parent_resource_id: None,
            capability,
            model_requirement,
            requested_model: None,
            requested_model_catalog_key: None,
            provider_native_model: None,
        }
    }

    pub fn api_resource(
        route_key: impl Into<String>,
        api_code: impl Into<String>,
        capability: RoutingCapability,
    ) -> Self {
        Self {
            surface: InvocationSurface::OpenAiCompatible,
            provider_family: None,
            supplier_code: None,
            route_key: route_key.into(),
            api_code: api_code.into(),
            endpoint_key: None,
            operation_id: None,
            resource_type: ResourceType::Unknown,
            resource_id: None,
            parent_resource_type: None,
            parent_resource_id: None,
            capability,
            model_requirement: AiRouteModelRequirement::Ignored,
            requested_model: None,
            requested_model_catalog_key: None,
            provider_native_model: None,
        }
    }

    pub fn free_endpoint(
        route_key: impl Into<String>,
        api_code: impl Into<String>,
        capability: RoutingCapability,
    ) -> Self {
        Self {
            resource_type: ResourceType::FreeEndpoint,
            ..Self::api_resource(route_key, api_code, capability)
        }
    }

    pub fn with_requested_model(mut self, model: impl Into<String>) -> Self {
        self.requested_model = Some(model.into());
        self
    }

    pub fn with_sticky_create(mut self, object_type: impl Into<String>) -> Self {
        self.resource_type = resource_type_from_sticky_object(&object_type.into());
        self.resource_id = None;
        self
    }

    pub fn with_sticky_lookup(
        mut self,
        object_type: impl Into<String>,
        object_id: impl Into<String>,
    ) -> Self {
        let object_type = object_type.into();
        self.resource_type = resource_type_from_sticky_object(&object_type);
        self.resource_id = Some(object_id.into());
        self
    }
}

fn resource_type_from_sticky_object(value: &str) -> ResourceType {
    match value {
        "file" => ResourceType::File,
        "upload" => ResourceType::Upload,
        "thread" => ResourceType::Thread,
        "assistant" => ResourceType::Assistant,
        "vector_store" => ResourceType::VectorStore,
        "batch" => ResourceType::Batch,
        "fine_tuning_job" => ResourceType::FineTuningJob,
        "conversation" => ResourceType::Conversation,
        "container" => ResourceType::Container,
        "response" => ResourceType::Response,
        "video" => ResourceType::Video,
        "realtime_session" => ResourceType::RealtimeSession,
        _ => ResourceType::Unknown,
    }
}
