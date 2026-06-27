use axum::http::Method;

use super::{
    InvocationBilling, InvocationClassification, InvocationClassificationRequest, InvocationError,
    InvocationErrorKind, InvocationResource, InvocationRouting, InvocationSurface, ResourceType,
    StickyRouting,
};
use crate::domain::{AiRouteModelRequirement, AiRouteStrategy, BillingMeter, RoutingCapability};

#[derive(Debug, Clone, Default)]
pub struct OpenAiResourceClassifier;

#[derive(Debug, Clone)]
struct OpenAiRouteSpec {
    route_key: &'static str,
    api_code: &'static str,
    resource_type: ResourceType,
    capability: RoutingCapability,
    model_requirement: AiRouteModelRequirement,
    meter: Option<BillingMeter>,
    billing_mode: ClassifiedBillingMode,
    strategy: AiRouteStrategy,
    sticky_object_type: Option<&'static str>,
    sticky_scope: ClassifiedStickyScope,
}

#[derive(Debug, Clone, Copy)]
enum ClassifiedBillingMode {
    Free,
    ApiRequest,
    Composite,
}

#[derive(Debug, Clone, Copy)]
enum ClassifiedStickyScope {
    None,
    ObjectCreate,
    ObjectLookup,
    ParentLookup,
}

impl super::InvocationResourceClassifier for OpenAiResourceClassifier {
    fn classify(
        &self,
        request: &InvocationClassificationRequest,
    ) -> Result<InvocationClassification, InvocationError> {
        let spec = classify_openai_spec(&request.method, &request.path)?;
        Ok(spec.into_classification(&request.path))
    }
}

impl OpenAiRouteSpec {
    fn into_classification(self, path: &str) -> InvocationClassification {
        let parent_resource_type =
            parent_resource_type_for(self.sticky_scope, self.resource_type.clone());
        let resource_id = object_id_for(self.sticky_scope, self.sticky_object_type, path);
        let sticky_object_id = object_id_for(
            ClassifiedStickyScope::ObjectLookup,
            self.sticky_object_type,
            path,
        );
        let parent_object_id = parent_object_id_for(self.sticky_scope, path);
        let resource = InvocationResource {
            surface: InvocationSurface::OpenAiCompatible,
            provider_family: None,
            provider_code: None,
            route_key: self.route_key.to_owned(),
            api_code: self.api_code.to_owned(),
            endpoint_key: None,
            operation_id: None,
            resource_type: self.resource_type,
            resource_id,
            parent_resource_type,
            parent_resource_id: parent_object_id.clone(),
            capability: self.capability,
            model_requirement: self.model_requirement,
            requested_model: None,
            requested_model_catalog_key: None,
            provider_native_model: None,
        };
        let billing = match self.billing_mode {
            ClassifiedBillingMode::Free => InvocationBilling::free(),
            ClassifiedBillingMode::ApiRequest => {
                InvocationBilling::api_request(self.meter.unwrap_or(BillingMeter::ApiRequest))
            }
            ClassifiedBillingMode::Composite => {
                InvocationBilling::composite(self.meter.unwrap_or(BillingMeter::LlmInputToken))
            }
        };
        let sticky = match (self.sticky_scope, self.sticky_object_type) {
            (ClassifiedStickyScope::ObjectCreate, Some(object_type)) => {
                Some(StickyRouting::create(object_type))
            }
            (ClassifiedStickyScope::ObjectLookup, Some(object_type)) => {
                sticky_object_id.map(|object_id| StickyRouting::lookup(object_type, object_id))
            }
            (ClassifiedStickyScope::ParentLookup, Some(object_type)) => {
                parent_object_id.map(|parent_id| StickyRouting::parent(object_type, parent_id))
            }
            _ => None,
        };
        let routing = InvocationRouting::new(self.strategy, sticky);
        InvocationClassification::new(resource, billing, routing)
    }
}

fn classify_openai_spec(method: &Method, path: &str) -> Result<OpenAiRouteSpec, InvocationError> {
    if method == Method::POST && path == "/v1/chat/completions" {
        return Ok(model(
            "openai/model/chat_completions",
            "openai.chat_completions",
            ResourceType::ChatCompletion,
            RoutingCapability::Chat,
            BillingMeter::LlmInputToken,
        ));
    }
    if path == "/v1/chat/completions" {
        return Ok(api(
            "openai/management/chat_completions",
            "openai.chat_completions",
            ResourceType::ChatCompletion,
            RoutingCapability::Chat,
        ));
    }
    if let Some(rest) = path.strip_prefix("/v1/chat/completions/") {
        if !rest.is_empty() {
            return Ok(api(
                "openai/management/chat_completions",
                "openai.chat_completions",
                ResourceType::ChatCompletion,
                RoutingCapability::Chat,
            ));
        }
    }
    if method == Method::POST && path == "/v1/completions" {
        return Ok(model(
            "openai/model/completions",
            "openai.completions",
            ResourceType::ChatCompletion,
            RoutingCapability::Chat,
            BillingMeter::LlmInputToken,
        ));
    }
    if method == Method::POST && path == "/v1/embeddings" {
        return Ok(model(
            "openai/model/embeddings",
            "openai.embeddings",
            ResourceType::Embedding,
            RoutingCapability::Embedding,
            BillingMeter::EmbeddingInputToken,
        ));
    }
    if method == Method::POST && path == "/v1/responses" {
        return Ok(sticky_model(
            "openai/model/responses",
            "openai.responses",
            ResourceType::Response,
            RoutingCapability::Chat,
            BillingMeter::LlmInputToken,
            "response",
        ));
    }
    if path.starts_with("/v1/responses/") {
        return Ok(api(
            "openai/management/responses",
            "openai.responses",
            ResourceType::Response,
            RoutingCapability::Chat,
        ));
    }
    if method == Method::POST && path == "/v1/images/generations" {
        return Ok(model_optional(
            "openai/model/images/generations",
            "openai.images.generations",
            ResourceType::Image,
            RoutingCapability::Image,
            BillingMeter::ImageResult,
        ));
    }
    if method == Method::POST && path == "/v1/images/edits" {
        return Ok(model_optional(
            "openai/model/images/edits",
            "openai.images.edits",
            ResourceType::Image,
            RoutingCapability::Image,
            BillingMeter::ImageResult,
        ));
    }
    if method == Method::POST && path == "/v1/images/variations" {
        return Ok(model_optional(
            "openai/model/images/variations",
            "openai.images.variations",
            ResourceType::Image,
            RoutingCapability::Image,
            BillingMeter::ImageResult,
        ));
    }
    if method == Method::POST && path == "/v1/audio/speech" {
        return Ok(model(
            "openai/model/audio",
            "openai.audio.speech",
            ResourceType::Audio,
            RoutingCapability::Audio,
            BillingMeter::TtsInputCharacter,
        ));
    }
    if method == Method::POST && path == "/v1/audio/transcriptions" {
        return Ok(model_optional(
            "openai/model/audio",
            "openai.audio.transcriptions",
            ResourceType::Audio,
            RoutingCapability::Audio,
            BillingMeter::AudioInputSecond,
        ));
    }
    if method == Method::POST && path == "/v1/audio/translations" {
        return Ok(model_optional(
            "openai/model/audio",
            "openai.audio.translations",
            ResourceType::Audio,
            RoutingCapability::Audio,
            BillingMeter::AudioInputSecond,
        ));
    }
    if path == "/v1/audio/voices" {
        return Ok(api(
            "openai/management/audio_voices",
            "openai.audio.voices",
            ResourceType::Audio,
            RoutingCapability::Audio,
        ));
    }
    if path.starts_with("/v1/audio/voice_consents/") {
        return Ok(api(
            "openai/management/audio_voice_consents",
            "openai.audio.voice_consents",
            ResourceType::Audio,
            RoutingCapability::Audio,
        ));
    }
    if path == "/v1/audio/voice_consents" {
        if method == Method::POST {
            return Ok(create_api(
                "openai/management/audio_voice_consents",
                "openai.audio.voice_consents",
                ResourceType::Audio,
                RoutingCapability::Audio,
                "audio_voice_consent",
            ));
        }
        return Ok(api(
            "openai/management/audio_voice_consents",
            "openai.audio.voice_consents",
            ResourceType::Audio,
            RoutingCapability::Audio,
        ));
    }
    if method == Method::GET && path == "/v1/models" {
        return Ok(free_endpoint(
            "openai/management/models",
            "openai.models",
            RoutingCapability::Network,
        ));
    }
    if method == Method::DELETE && path.starts_with("/v1/models/") {
        return Ok(api(
            "openai/management/models",
            "openai.models",
            ResourceType::ModelCall,
            RoutingCapability::Network,
        ));
    }
    if path == "/v1/files" {
        if method == Method::POST {
            return Ok(create_api(
                "openai/management/files",
                "openai.files",
                ResourceType::File,
                RoutingCapability::Network,
                "file",
            ));
        }
        return Ok(api(
            "openai/management/files",
            "openai.files",
            ResourceType::File,
            RoutingCapability::Network,
        ));
    }
    if path.starts_with("/v1/files/") {
        return Ok(lookup_api(
            "openai/management/files",
            "openai.files",
            ResourceType::File,
            RoutingCapability::Network,
            "file",
        ));
    }
    if path == "/v1/uploads" {
        if method == Method::POST {
            return Ok(create_api(
                "openai/management/uploads",
                "openai.uploads",
                ResourceType::Upload,
                RoutingCapability::Network,
                "upload",
            ));
        }
        return Ok(api(
            "openai/management/uploads",
            "openai.uploads",
            ResourceType::Upload,
            RoutingCapability::Network,
        ));
    }
    if path.starts_with("/v1/uploads/") {
        return Ok(lookup_api(
            "openai/management/uploads",
            "openai.uploads",
            ResourceType::Upload,
            RoutingCapability::Network,
            "upload",
        ));
    }
    if path == "/v1/threads" {
        if method == Method::POST {
            return Ok(create_api(
                "openai/management/threads",
                "openai.threads",
                ResourceType::Thread,
                RoutingCapability::Chat,
                "thread",
            ));
        }
        return Ok(api(
            "openai/management/threads",
            "openai.threads",
            ResourceType::Thread,
            RoutingCapability::Chat,
        ));
    }
    if method == Method::POST && path == "/v1/threads/runs" {
        return Ok(create_composite_api(
            "openai/management/threads",
            "openai.threads",
            ResourceType::Thread,
            RoutingCapability::Chat,
            BillingMeter::LlmInputToken,
            "thread",
        ));
    }
    if method == Method::POST && path == "/v1/threads/runs" {
        return Ok(create_composite_api(
            "openai/management/threads",
            "openai.threads",
            ResourceType::Thread,
            RoutingCapability::Chat,
            BillingMeter::LlmInputToken,
            "thread",
        ));
    }
    if method == Method::POST && path.starts_with("/v1/threads/") && path.ends_with("/runs") {
        return Ok(parent_composite_api(
            "openai/management/threads",
            "openai.threads",
            ResourceType::Thread,
            RoutingCapability::Chat,
            BillingMeter::LlmInputToken,
            "thread",
        ));
    }
    if path.starts_with("/v1/threads/") {
        return Ok(lookup_composite_api(
            "openai/management/threads",
            "openai.threads",
            ResourceType::Thread,
            RoutingCapability::Chat,
            BillingMeter::LlmInputToken,
            "thread",
        ));
    }
    if path == "/v1/evals" {
        if method == Method::POST {
            return Ok(create_model_optional_api(
                "openai/management/evals",
                "openai.evals",
                ResourceType::Unknown,
                RoutingCapability::Network,
                "eval",
            ));
        }
        return Ok(api(
            "openai/management/evals",
            "openai.evals",
            ResourceType::Unknown,
            RoutingCapability::Network,
        ));
    }
    if method == Method::POST && path.starts_with("/v1/evals/") && path.ends_with("/runs") {
        return Ok(parent_optional_api(
            "openai/management/evals",
            "openai.evals",
            ResourceType::Unknown,
            RoutingCapability::Network,
            "eval",
        ));
    }
    if path.starts_with("/v1/evals/") {
        return Ok(lookup_api(
            "openai/management/evals",
            "openai.evals",
            ResourceType::Unknown,
            RoutingCapability::Network,
            "eval",
        ));
    }
    if path == "/v1/assistants" {
        if method == Method::POST {
            return Ok(create_model_optional_api(
                "openai/management/assistants",
                "openai.assistants",
                ResourceType::Assistant,
                RoutingCapability::Chat,
                "assistant",
            ));
        }
        return Ok(api(
            "openai/management/assistants",
            "openai.assistants",
            ResourceType::Assistant,
            RoutingCapability::Chat,
        ));
    }
    if path.starts_with("/v1/assistants/") {
        return Ok(lookup_api(
            "openai/management/assistants",
            "openai.assistants",
            ResourceType::Assistant,
            RoutingCapability::Chat,
            "assistant",
        ));
    }
    if path == "/v1/vector_stores" {
        if method == Method::POST {
            return Ok(create_api(
                "openai/management/vector_stores",
                "openai.vector_stores",
                ResourceType::VectorStore,
                RoutingCapability::Embedding,
                "vector_store",
            ));
        }
        return Ok(api(
            "openai/management/vector_stores",
            "openai.vector_stores",
            ResourceType::VectorStore,
            RoutingCapability::Embedding,
        ));
    }
    if path.starts_with("/v1/vector_stores/") {
        return Ok(api(
            "openai/management/vector_stores",
            "openai.vector_stores",
            ResourceType::VectorStore,
            RoutingCapability::Embedding,
        ));
    }
    if path == "/v1/batches" {
        if method == Method::POST {
            return Ok(create_api(
                "openai/management/batches",
                "openai.batches",
                ResourceType::Batch,
                RoutingCapability::Network,
                "batch",
            ));
        }
        return Ok(api(
            "openai/management/batches",
            "openai.batches",
            ResourceType::Batch,
            RoutingCapability::Network,
        ));
    }
    if path.starts_with("/v1/batches/") {
        return Ok(api(
            "openai/management/batches",
            "openai.batches",
            ResourceType::Batch,
            RoutingCapability::Network,
        ));
    }
    if path == "/v1/fine_tuning/jobs" {
        if method == Method::POST {
            return Ok(create_model_optional_api(
                "openai/management/fine_tuning",
                "openai.fine_tuning",
                ResourceType::FineTuningJob,
                RoutingCapability::Network,
                "fine_tuning_job",
            ));
        }
        return Ok(api(
            "openai/management/fine_tuning",
            "openai.fine_tuning",
            ResourceType::FineTuningJob,
            RoutingCapability::Network,
        ));
    }
    if path.starts_with("/v1/fine_tuning/jobs/") || path.starts_with("/v1/fine_tuning/checkpoints/")
    {
        return Ok(api(
            "openai/management/fine_tuning",
            "openai.fine_tuning",
            ResourceType::FineTuningJob,
            RoutingCapability::Network,
        ));
    }
    if path.starts_with("/v1/fine_tuning/") {
        return Ok(api(
            "openai/management/fine_tuning",
            "openai.fine_tuning",
            ResourceType::FineTuningJob,
            RoutingCapability::Network,
        ));
    }
    if path == "/v1/conversations" {
        if method == Method::POST {
            return Ok(create_model_optional_api(
                "openai/management/conversations",
                "openai.conversations",
                ResourceType::Conversation,
                RoutingCapability::Chat,
                "conversation",
            ));
        }
        return Ok(api(
            "openai/management/conversations",
            "openai.conversations",
            ResourceType::Conversation,
            RoutingCapability::Chat,
        ));
    }
    if path.starts_with("/v1/conversations/") {
        return Ok(lookup_composite_api(
            "openai/management/conversations",
            "openai.conversations",
            ResourceType::Conversation,
            RoutingCapability::Chat,
            BillingMeter::LlmInputToken,
            "conversation",
        ));
    }
    if path == "/v1/containers" {
        if method == Method::POST {
            return Ok(create_api(
                "openai/management/containers",
                "openai.containers",
                ResourceType::Container,
                RoutingCapability::Network,
                "container",
            ));
        }
        return Ok(api(
            "openai/management/containers",
            "openai.containers",
            ResourceType::Container,
            RoutingCapability::Network,
        ));
    }
    if path.starts_with("/v1/containers/") {
        return Ok(api(
            "openai/management/containers",
            "openai.containers",
            ResourceType::Container,
            RoutingCapability::Network,
        ));
    }
    if path == "/v1/skills" {
        if method == Method::POST {
            return Ok(create_api(
                "openai/management/skills",
                "openai.skills",
                ResourceType::Unknown,
                RoutingCapability::Network,
                "skill",
            ));
        }
        return Ok(api(
            "openai/management/skills",
            "openai.skills",
            ResourceType::Unknown,
            RoutingCapability::Network,
        ));
    }
    if path.starts_with("/v1/skills/") {
        return Ok(api(
            "openai/management/skills",
            "openai.skills",
            ResourceType::Unknown,
            RoutingCapability::Network,
        ));
    }
    if path.starts_with("/v1/organization/") {
        return Ok(api(
            "openai/management/administration",
            "openai.administration",
            ResourceType::Unknown,
            RoutingCapability::Network,
        ));
    }
    if path.starts_with("/v1/projects/") {
        return Ok(api(
            "openai/management/administration",
            "openai.administration",
            ResourceType::Unknown,
            RoutingCapability::Network,
        ));
    }
    if path == "/v1/videos" {
        if method == Method::POST {
            return Ok(create_api(
                "openai/management/videos",
                "openai.videos",
                ResourceType::Video,
                RoutingCapability::Video,
                "video",
            ));
        }
        return Ok(api(
            "openai/management/videos",
            "openai.videos",
            ResourceType::Video,
            RoutingCapability::Video,
        ));
    }
    if path.starts_with("/v1/videos/") {
        return Ok(api(
            "openai/management/videos",
            "openai.videos",
            ResourceType::Video,
            RoutingCapability::Video,
        ));
    }
    if path == "/v1/realtime/calls"
        || path == "/v1/realtime/translations"
        || path == "/v1/realtime/sessions"
        || path == "/v1/realtime/transcription_sessions"
    {
        return Ok(sticky_model(
            "openai/model/realtime",
            "openai.realtime",
            ResourceType::RealtimeSession,
            RoutingCapability::Chat,
            BillingMeter::LlmInputToken,
            "realtime_session",
        ));
    }
    if path.starts_with("/v1/realtime/calls/") {
        return Ok(api(
            "openai/management/realtime",
            "openai.realtime",
            ResourceType::RealtimeSession,
            RoutingCapability::Network,
        ));
    }

    Err(InvocationError::new(
        InvocationErrorKind::ResourceClassification,
        format!("unsupported OpenAI-compatible route: {} {}", method, path),
    ))
}

fn model(
    route_key: &'static str,
    api_code: &'static str,
    resource_type: ResourceType,
    capability: RoutingCapability,
    meter: BillingMeter,
) -> OpenAiRouteSpec {
    OpenAiRouteSpec {
        route_key,
        api_code,
        resource_type,
        capability,
        model_requirement: AiRouteModelRequirement::Required,
        meter: Some(meter),
        billing_mode: ClassifiedBillingMode::Composite,
        strategy: AiRouteStrategy::StatelessFailover,
        sticky_object_type: None,
        sticky_scope: ClassifiedStickyScope::None,
    }
}

fn model_optional(
    route_key: &'static str,
    api_code: &'static str,
    resource_type: ResourceType,
    capability: RoutingCapability,
    meter: BillingMeter,
) -> OpenAiRouteSpec {
    OpenAiRouteSpec {
        model_requirement: AiRouteModelRequirement::Optional,
        ..model(route_key, api_code, resource_type, capability, meter)
    }
}

fn sticky_model(
    route_key: &'static str,
    api_code: &'static str,
    resource_type: ResourceType,
    capability: RoutingCapability,
    meter: BillingMeter,
    sticky_object_type: &'static str,
) -> OpenAiRouteSpec {
    OpenAiRouteSpec {
        strategy: AiRouteStrategy::CreateThenSticky,
        sticky_object_type: Some(sticky_object_type),
        sticky_scope: ClassifiedStickyScope::ObjectCreate,
        ..model(route_key, api_code, resource_type, capability, meter)
    }
}

fn api(
    route_key: &'static str,
    api_code: &'static str,
    resource_type: ResourceType,
    capability: RoutingCapability,
) -> OpenAiRouteSpec {
    OpenAiRouteSpec {
        route_key,
        api_code,
        resource_type,
        capability,
        model_requirement: AiRouteModelRequirement::Ignored,
        meter: Some(BillingMeter::ApiRequest),
        billing_mode: ClassifiedBillingMode::ApiRequest,
        strategy: AiRouteStrategy::PrimaryChannel,
        sticky_object_type: None,
        sticky_scope: ClassifiedStickyScope::None,
    }
}

fn create_api(
    route_key: &'static str,
    api_code: &'static str,
    resource_type: ResourceType,
    capability: RoutingCapability,
    sticky_object_type: &'static str,
) -> OpenAiRouteSpec {
    OpenAiRouteSpec {
        strategy: AiRouteStrategy::CreateThenSticky,
        sticky_object_type: Some(sticky_object_type),
        sticky_scope: ClassifiedStickyScope::ObjectCreate,
        ..api(route_key, api_code, resource_type, capability)
    }
}

fn create_model_optional_api(
    route_key: &'static str,
    api_code: &'static str,
    resource_type: ResourceType,
    capability: RoutingCapability,
    sticky_object_type: &'static str,
) -> OpenAiRouteSpec {
    OpenAiRouteSpec {
        model_requirement: AiRouteModelRequirement::Optional,
        ..create_api(
            route_key,
            api_code,
            resource_type,
            capability,
            sticky_object_type,
        )
    }
}

fn lookup_api(
    route_key: &'static str,
    api_code: &'static str,
    resource_type: ResourceType,
    capability: RoutingCapability,
    sticky_object_type: &'static str,
) -> OpenAiRouteSpec {
    OpenAiRouteSpec {
        strategy: AiRouteStrategy::LookupSticky,
        sticky_object_type: Some(sticky_object_type),
        sticky_scope: ClassifiedStickyScope::ObjectLookup,
        ..api(route_key, api_code, resource_type, capability)
    }
}

fn create_composite_api(
    route_key: &'static str,
    api_code: &'static str,
    resource_type: ResourceType,
    capability: RoutingCapability,
    meter: BillingMeter,
    sticky_object_type: &'static str,
) -> OpenAiRouteSpec {
    OpenAiRouteSpec {
        strategy: AiRouteStrategy::CreateThenSticky,
        sticky_object_type: Some(sticky_object_type),
        sticky_scope: ClassifiedStickyScope::ObjectCreate,
        model_requirement: AiRouteModelRequirement::Optional,
        meter: Some(meter),
        billing_mode: ClassifiedBillingMode::Composite,
        ..api(route_key, api_code, resource_type, capability)
    }
}

fn lookup_composite_api(
    route_key: &'static str,
    api_code: &'static str,
    resource_type: ResourceType,
    capability: RoutingCapability,
    meter: BillingMeter,
    sticky_object_type: &'static str,
) -> OpenAiRouteSpec {
    OpenAiRouteSpec {
        strategy: AiRouteStrategy::LookupSticky,
        sticky_object_type: Some(sticky_object_type),
        sticky_scope: ClassifiedStickyScope::ObjectLookup,
        model_requirement: AiRouteModelRequirement::Ignored,
        meter: Some(meter),
        billing_mode: ClassifiedBillingMode::Composite,
        ..api(route_key, api_code, resource_type, capability)
    }
}

fn parent_composite_api(
    route_key: &'static str,
    api_code: &'static str,
    resource_type: ResourceType,
    capability: RoutingCapability,
    meter: BillingMeter,
    sticky_object_type: &'static str,
) -> OpenAiRouteSpec {
    OpenAiRouteSpec {
        strategy: AiRouteStrategy::ParentSticky,
        sticky_object_type: Some(sticky_object_type),
        sticky_scope: ClassifiedStickyScope::ParentLookup,
        model_requirement: AiRouteModelRequirement::Optional,
        meter: Some(meter),
        billing_mode: ClassifiedBillingMode::Composite,
        ..api(route_key, api_code, resource_type, capability)
    }
}

fn parent_optional_api(
    route_key: &'static str,
    api_code: &'static str,
    resource_type: ResourceType,
    capability: RoutingCapability,
    sticky_object_type: &'static str,
) -> OpenAiRouteSpec {
    OpenAiRouteSpec {
        strategy: AiRouteStrategy::ParentSticky,
        sticky_object_type: Some(sticky_object_type),
        sticky_scope: ClassifiedStickyScope::ParentLookup,
        model_requirement: AiRouteModelRequirement::Optional,
        meter: Some(BillingMeter::ApiRequest),
        billing_mode: ClassifiedBillingMode::ApiRequest,
        ..api(route_key, api_code, resource_type, capability)
    }
}

fn free_endpoint(
    route_key: &'static str,
    api_code: &'static str,
    capability: RoutingCapability,
) -> OpenAiRouteSpec {
    OpenAiRouteSpec {
        route_key,
        api_code,
        resource_type: ResourceType::FreeEndpoint,
        capability,
        model_requirement: AiRouteModelRequirement::Ignored,
        meter: None,
        billing_mode: ClassifiedBillingMode::Free,
        strategy: AiRouteStrategy::PrimaryChannel,
        sticky_object_type: None,
        sticky_scope: ClassifiedStickyScope::None,
    }
}

fn object_id_for(
    scope: ClassifiedStickyScope,
    object_type: Option<&str>,
    path: &str,
) -> Option<String> {
    match scope {
        ClassifiedStickyScope::ObjectLookup => object_id_from_path(path, object_type),
        _ => None,
    }
}

fn parent_object_id_for(scope: ClassifiedStickyScope, path: &str) -> Option<String> {
    match scope {
        ClassifiedStickyScope::ParentLookup => nth_path_segment(path, 2),
        _ => None,
    }
}

fn object_id_from_path(path: &str, object_type: Option<&str>) -> Option<String> {
    let segments = path_segments(path);
    if let Some(marker) = object_type.and_then(object_type_marker) {
        if let Some(index) = segments.iter().position(|segment| *segment == marker) {
            if let Some(value) = segments.get(index + 1) {
                return non_empty_segment(value);
            }
        }
    }
    nth_path_segment(path, 2)
}

fn object_type_marker(object_type: &str) -> Option<&'static str> {
    match object_type {
        "file" => Some("files"),
        "response" => Some("responses"),
        "upload" => Some("uploads"),
        "thread" => Some("threads"),
        "assistant" => Some("assistants"),
        "vector_store" => Some("vector_stores"),
        "batch" => Some("batches"),
        "fine_tuning_job" => Some("jobs"),
        "conversation" => Some("conversations"),
        "container" => Some("containers"),
        "realtime_session" => Some("calls"),
        "audio_voice_consent" => Some("voice_consents"),
        _ => None,
    }
}

fn parent_resource_type_for(
    scope: ClassifiedStickyScope,
    resource_type: ResourceType,
) -> Option<ResourceType> {
    matches!(scope, ClassifiedStickyScope::ParentLookup).then_some(resource_type)
}

fn path_segments(path: &str) -> Vec<&str> {
    path.trim_matches('/')
        .split('/')
        .filter(|segment| !segment.trim().is_empty())
        .collect()
}

fn nth_path_segment(path: &str, index: usize) -> Option<String> {
    path_segments(path)
        .get(index)
        .and_then(|value| non_empty_segment(value))
}

fn non_empty_segment(value: &str) -> Option<String> {
    let value = value.trim();
    (!value.is_empty()).then(|| value.to_owned())
}
