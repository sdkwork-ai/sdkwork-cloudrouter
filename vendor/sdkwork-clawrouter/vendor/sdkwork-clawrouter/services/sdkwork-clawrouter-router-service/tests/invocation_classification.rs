use axum::http::Method;
use sdkwork_clawrouter_router_service::application::{
    BillingMode, InvocationBilling, InvocationClassificationRequest, InvocationResourceClassifier,
    InvocationRouting, InvocationSurface, OpenAiResourceClassifier,
    ProviderNativeResourceClassifier, ResourceType, StickyMode, StickyScope,
};
use sdkwork_clawrouter_router_service::domain::{
    AiRouteModelRequirement, AiRouteStrategy, BillingMeter, RoutingCapability,
};

fn classify_openai(
    method: Method,
    path: &str,
) -> (
    sdkwork_clawrouter_router_service::application::InvocationResource,
    InvocationBilling,
    InvocationRouting,
) {
    OpenAiResourceClassifier::default()
        .classify(&InvocationClassificationRequest::new(method, path))
        .expect("classification")
        .into_parts()
}

#[test]
fn classifies_openai_model_calls_as_model_resources() {
    for (method, path, route_key, api_code, resource_type, capability, meter) in [
        (
            Method::POST,
            "/v1/chat/completions",
            "openai/model/chat_completions",
            "openai.chat_completions",
            ResourceType::ChatCompletion,
            RoutingCapability::Chat,
            BillingMeter::LlmInputToken,
        ),
        (
            Method::POST,
            "/v1/embeddings",
            "openai/model/embeddings",
            "openai.embeddings",
            ResourceType::Embedding,
            RoutingCapability::Embedding,
            BillingMeter::EmbeddingInputToken,
        ),
    ] {
        let (resource, billing, routing) = classify_openai(method, path);

        assert_eq!(InvocationSurface::OpenAiCompatible, resource.surface);
        assert_eq!(route_key, resource.route_key);
        assert_eq!(api_code, resource.api_code);
        assert_eq!(resource_type, resource.resource_type);
        assert_eq!(capability, resource.capability);
        assert_eq!(
            AiRouteModelRequirement::Required,
            resource.model_requirement
        );
        assert_eq!(Some(meter), billing.meter);
        assert_eq!(BillingMode::Composite, billing.mode);
        assert_eq!(AiRouteStrategy::StatelessFailover, routing.strategy);
    }

    let (resource, billing, routing) = classify_openai(Method::POST, "/v1/responses");
    assert_eq!("openai/model/responses", resource.route_key);
    assert_eq!("openai.responses", resource.api_code);
    assert_eq!(ResourceType::Response, resource.resource_type);
    assert_eq!(RoutingCapability::Chat, resource.capability);
    assert_eq!(
        AiRouteModelRequirement::Required,
        resource.model_requirement
    );
    assert_eq!(Some(BillingMeter::LlmInputToken), billing.meter);
    assert_eq!(BillingMode::Composite, billing.mode);
    assert_eq!(AiRouteStrategy::CreateThenSticky, routing.strategy);
    let sticky = routing.sticky.expect("response sticky");
    assert_eq!(StickyMode::CreateThenSticky, sticky.mode);
    assert_eq!("response", sticky.object_type);
}

#[test]
fn classifies_openai_management_api_requests_and_free_endpoints() {
    let (files, billing, routing) = classify_openai(Method::POST, "/v1/files");
    assert_eq!("openai/management/files", files.route_key);
    assert_eq!("openai.files", files.api_code);
    assert_eq!(ResourceType::File, files.resource_type);
    assert_eq!(BillingMode::ApiRequest, billing.mode);
    assert_eq!(Some(BillingMeter::ApiRequest), billing.meter);
    assert_eq!(AiRouteStrategy::CreateThenSticky, routing.strategy);
    let sticky = routing.sticky.expect("file sticky");
    assert_eq!(StickyMode::CreateThenSticky, sticky.mode);
    assert_eq!(StickyScope::Object, sticky.scope);
    assert_eq!("file", sticky.object_type);

    let (models, billing, routing) = classify_openai(Method::GET, "/v1/models");
    assert_eq!("openai/management/models", models.route_key);
    assert_eq!(ResourceType::FreeEndpoint, models.resource_type);
    assert_eq!(BillingMode::Free, billing.mode);
    assert_eq!(None, billing.meter);
    assert_eq!(AiRouteStrategy::PrimaryChannel, routing.strategy);
}

#[test]
fn classifies_lookup_and_parent_sticky_resources() {
    let (file_content, _billing, routing) =
        classify_openai(Method::GET, "/v1/files/file_123/content");
    assert_eq!("openai/management/files", file_content.route_key);
    assert_eq!(ResourceType::File, file_content.resource_type);
    assert_eq!(Some("file_123"), file_content.resource_id.as_deref());
    assert_eq!(AiRouteStrategy::LookupSticky, routing.strategy);
    let sticky = routing.sticky.expect("file lookup sticky");
    assert_eq!(StickyMode::LookupSticky, sticky.mode);
    assert_eq!(Some("file_123"), sticky.object_id.as_deref());

    let (thread_run, _billing, routing) =
        classify_openai(Method::POST, "/v1/threads/thread_123/runs");
    assert_eq!("openai/management/threads", thread_run.route_key);
    assert_eq!(ResourceType::Thread, thread_run.resource_type);
    assert_eq!(Some("thread_123"), thread_run.parent_resource_id.as_deref());
    assert_eq!(AiRouteStrategy::ParentSticky, routing.strategy);
    let sticky = routing.sticky.expect("thread parent sticky");
    assert_eq!(StickyMode::ParentSticky, sticky.mode);
    assert_eq!(StickyScope::Parent, sticky.scope);
    assert_eq!(Some("thread_123"), sticky.parent_object_id.as_deref());
}

#[test]
fn classifies_openai_modal_generation_and_management_resource_families() {
    for (
        method,
        path,
        route_key,
        api_code,
        resource_type,
        capability,
        billing_mode,
        model_requirement,
        route_strategy,
    ) in [
        (
            Method::POST,
            "/v1/images/generations",
            "openai/model/images/generations",
            "openai.images.generations",
            ResourceType::Image,
            RoutingCapability::Image,
            BillingMode::Composite,
            AiRouteModelRequirement::Optional,
            AiRouteStrategy::StatelessFailover,
        ),
        (
            Method::POST,
            "/v1/audio/speech",
            "openai/model/audio",
            "openai.audio.speech",
            ResourceType::Audio,
            RoutingCapability::Audio,
            BillingMode::Composite,
            AiRouteModelRequirement::Required,
            AiRouteStrategy::StatelessFailover,
        ),
        (
            Method::GET,
            "/v1/audio/voices",
            "openai/management/audio_voices",
            "openai.audio.voices",
            ResourceType::Audio,
            RoutingCapability::Audio,
            BillingMode::ApiRequest,
            AiRouteModelRequirement::Ignored,
            AiRouteStrategy::PrimaryChannel,
        ),
        (
            Method::POST,
            "/v1/uploads",
            "openai/management/uploads",
            "openai.uploads",
            ResourceType::Upload,
            RoutingCapability::Network,
            BillingMode::ApiRequest,
            AiRouteModelRequirement::Ignored,
            AiRouteStrategy::CreateThenSticky,
        ),
        (
            Method::POST,
            "/v1/vector_stores",
            "openai/management/vector_stores",
            "openai.vector_stores",
            ResourceType::VectorStore,
            RoutingCapability::Embedding,
            BillingMode::ApiRequest,
            AiRouteModelRequirement::Ignored,
            AiRouteStrategy::CreateThenSticky,
        ),
        (
            Method::POST,
            "/v1/batches",
            "openai/management/batches",
            "openai.batches",
            ResourceType::Batch,
            RoutingCapability::Network,
            BillingMode::ApiRequest,
            AiRouteModelRequirement::Ignored,
            AiRouteStrategy::CreateThenSticky,
        ),
        (
            Method::GET,
            "/v1/fine_tuning/jobs/ftjob_123/events",
            "openai/management/fine_tuning",
            "openai.fine_tuning",
            ResourceType::FineTuningJob,
            RoutingCapability::Network,
            BillingMode::ApiRequest,
            AiRouteModelRequirement::Ignored,
            AiRouteStrategy::LookupSticky,
        ),
        (
            Method::GET,
            "/v1/conversations",
            "openai/management/conversations",
            "openai.conversations",
            ResourceType::Conversation,
            RoutingCapability::Chat,
            BillingMode::ApiRequest,
            AiRouteModelRequirement::Ignored,
            AiRouteStrategy::PrimaryChannel,
        ),
        (
            Method::GET,
            "/v1/containers/container_123/files/file_123/content",
            "openai/management/containers",
            "openai.containers",
            ResourceType::Container,
            RoutingCapability::Network,
            BillingMode::ApiRequest,
            AiRouteModelRequirement::Ignored,
            AiRouteStrategy::LookupSticky,
        ),
        (
            Method::POST,
            "/v1/realtime/calls",
            "openai/model/realtime",
            "openai.realtime",
            ResourceType::RealtimeSession,
            RoutingCapability::Chat,
            BillingMode::Composite,
            AiRouteModelRequirement::Required,
            AiRouteStrategy::CreateThenSticky,
        ),
        (
            Method::POST,
            "/v1/assistants",
            "openai/management/assistants",
            "openai.assistants",
            ResourceType::Assistant,
            RoutingCapability::Chat,
            BillingMode::ApiRequest,
            AiRouteModelRequirement::Optional,
            AiRouteStrategy::CreateThenSticky,
        ),
    ] {
        let (resource, billing, routing) = classify_openai(method, path);

        assert_eq!(route_key, resource.route_key, "{path}");
        assert_eq!(api_code, resource.api_code, "{path}");
        assert_eq!(resource_type, resource.resource_type, "{path}");
        assert_eq!(capability, resource.capability, "{path}");
        assert_eq!(billing_mode, billing.mode, "{path}");
        assert_eq!(model_requirement, resource.model_requirement, "{path}");
        assert_eq!(route_strategy, routing.strategy, "{path}");
    }
}

#[test]
fn classifies_extended_sticky_object_ids() {
    for (method, path, resource_type, expected_id) in [
        (
            Method::GET,
            "/v1/vector_stores/vs_123/search",
            ResourceType::VectorStore,
            "vs_123",
        ),
        (
            Method::POST,
            "/v1/batches/batch_123/cancel",
            ResourceType::Batch,
            "batch_123",
        ),
        (
            Method::GET,
            "/v1/fine_tuning/jobs/ftjob_123/events",
            ResourceType::FineTuningJob,
            "ftjob_123",
        ),
        (
            Method::POST,
            "/v1/realtime/calls/call_123/hangup",
            ResourceType::RealtimeSession,
            "call_123",
        ),
        (
            Method::GET,
            "/v1/responses/resp_123",
            ResourceType::Response,
            "resp_123",
        ),
        (
            Method::GET,
            "/v1/assistants/asst_123",
            ResourceType::Assistant,
            "asst_123",
        ),
    ] {
        let (resource, _billing, routing) = classify_openai(method, path);

        assert_eq!(resource_type, resource.resource_type, "{path}");
        assert_eq!(Some(expected_id), resource.resource_id.as_deref(), "{path}");
        assert_eq!(AiRouteStrategy::LookupSticky, routing.strategy, "{path}");
        assert_eq!(
            Some(expected_id),
            routing
                .sticky
                .as_ref()
                .and_then(|sticky| sticky.object_id.as_deref()),
            "{path}"
        );
    }
}

#[test]
fn classifies_provider_native_routes_from_provider_prefix_and_endpoint_key() {
    let request = InvocationClassificationRequest::new(Method::POST, "/kling/v1/videos/text2video")
        .with_provider_code("kling")
        .with_provider_family("media")
        .with_endpoint_key("text_to_video")
        .with_capability(RoutingCapability::Video);

    let classification = ProviderNativeResourceClassifier::default()
        .classify(&request)
        .expect("provider native classification");
    let (resource, billing, routing) = classification.into_parts();

    assert_eq!(InvocationSurface::ProviderNative, resource.surface);
    assert_eq!(Some("kling"), resource.provider_code.as_deref());
    assert_eq!(Some("media"), resource.provider_family.as_deref());
    assert_eq!("kling.text_to_video", resource.route_key);
    assert_eq!("kling.text_to_video", resource.api_code);
    assert_eq!(Some("text_to_video"), resource.endpoint_key.as_deref());
    assert_eq!(ResourceType::ProviderNativeApi, resource.resource_type);
    assert_eq!(RoutingCapability::Video, resource.capability);
    assert_eq!(BillingMode::ExternalUsageLine, billing.mode);
    assert_eq!(AiRouteStrategy::CreateThenSticky, routing.strategy);
    let sticky = routing.sticky.expect("provider-native media sticky");
    assert_eq!(StickyMode::CreateThenSticky, sticky.mode);
    assert_eq!(StickyScope::Object, sticky.scope);
    assert_eq!("video_task", sticky.object_type);
}

#[test]
fn classifies_provider_native_standard_paths_to_seeded_route_keys() {
    for (provider, path, route_key, capability, model_requirement, route_strategy, sticky_type) in [
        (
            "kling",
            "/v1/videos/text2video",
            "kling.text_to_video",
            RoutingCapability::Video,
            AiRouteModelRequirement::Optional,
            AiRouteStrategy::CreateThenSticky,
            Some("video_task"),
        ),
        (
            "google",
            "/v1beta/models/gemini-2.5-flash:generateContent",
            "gemini.generate_content",
            RoutingCapability::Chat,
            AiRouteModelRequirement::Required,
            AiRouteStrategy::StatelessFailover,
            None,
        ),
        (
            "tencent-cloud",
            "/vidu/ent/v2/start-end2video",
            "vidu.start_end_to_video",
            RoutingCapability::Video,
            AiRouteModelRequirement::Optional,
            AiRouteStrategy::CreateThenSticky,
            Some("video_task"),
        ),
    ] {
        let request = InvocationClassificationRequest::new(Method::POST, path)
            .with_provider_code(provider)
            .with_provider_family("media");

        let classification = ProviderNativeResourceClassifier::default()
            .classify(&request)
            .expect("provider native classification");
        let (resource, billing, routing) = classification.into_parts();

        assert_eq!(
            InvocationSurface::ProviderNative,
            resource.surface,
            "{path}"
        );
        assert_eq!(route_key, resource.route_key, "{path}");
        assert_eq!(route_key, resource.api_code, "{path}");
        assert_eq!(Some(route_key), resource.endpoint_key.as_deref(), "{path}");
        assert_eq!(capability, resource.capability, "{path}");
        assert_eq!(model_requirement, resource.model_requirement, "{path}");
        assert_eq!(BillingMode::ExternalUsageLine, billing.mode, "{path}");
        assert_eq!(route_strategy, routing.strategy, "{path}");
        assert_eq!(
            sticky_type,
            routing
                .sticky
                .as_ref()
                .map(|sticky| sticky.object_type.as_str()),
            "{path}"
        );
    }
}

#[test]
fn classifies_provider_native_unknown_paths_with_normalized_fallback_route_key() {
    let request = InvocationClassificationRequest::new(Method::POST, "/v2/custom/jobs")
        .with_provider_code("Custom-Provider")
        .with_capability(RoutingCapability::Network);

    let classification = ProviderNativeResourceClassifier::default()
        .classify(&request)
        .expect("provider native classification");
    let (resource, _billing, routing) = classification.into_parts();

    assert_eq!(Some("custom-provider"), resource.provider_code.as_deref());
    assert_eq!("custom-provider.jobs", resource.route_key);
    assert_eq!("custom-provider.jobs", resource.api_code);
    assert_eq!(Some("jobs"), resource.endpoint_key.as_deref());
    assert_eq!(RoutingCapability::Network, resource.capability);
    assert_eq!(
        AiRouteModelRequirement::Optional,
        resource.model_requirement
    );
    assert_eq!(AiRouteStrategy::StatelessFailClosed, routing.strategy);
    assert!(routing.sticky.is_none());
}
