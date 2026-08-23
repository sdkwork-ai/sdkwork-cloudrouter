use super::RouteKind;
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
    Moderation,
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
    /// 资源配置的路由类型：`model`（模型类）或 `api`（API 资源类）。
    /// 由资源管理（`ai_resource.route_kind`）显式标记；未配置时为空，
    /// 运行时按"是否携带模型 + 表面"推导（见 [`RouteKind::of`]）。
    pub route_kind: Option<RouteKind>,
    pub requested_model: Option<String>,
    pub requested_model_catalog_key: Option<String>,
    /// 模型类路由解析出的支持该模型的 vendor 代码列表（对应流程第 2 步）。
    /// 由 `sdkwork-models` 目录解析，供 supplier 收敛与决策日志使用。
    pub resolved_vendor_codes: Vec<String>,
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
            route_kind: Some(RouteKind::Model),
            requested_model: None,
            requested_model_catalog_key: None,
            resolved_vendor_codes: Vec::new(),
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
            route_kind: Some(RouteKind::Api),
            requested_model: None,
            requested_model_catalog_key: None,
            resolved_vendor_codes: Vec::new(),
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

    /// 显式标记路由类型（对应 `ai_resource.route_kind`）。
    /// 资源管理已标记 `model`/`api` 时使用，覆盖运行时推导。
    pub fn with_route_kind(mut self, route_kind: RouteKind) -> Self {
        self.route_kind = Some(route_kind);
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
