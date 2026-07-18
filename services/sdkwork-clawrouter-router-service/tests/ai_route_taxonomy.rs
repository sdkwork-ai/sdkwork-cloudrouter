use sdkwork_clawrouter_router_service::application::{
    builtin_ai_route_taxonomy, find_builtin_ai_route, AiRoutingIndex,
};
use sdkwork_clawrouter_router_service::domain::{
    AiRouteFailureStrategy, AiRouteModelRequirement, AiRouteStrategy, BillingMeter,
    ProviderChannelRoute, RoutingCapability,
};
use sdkwork_clawrouter_router_service::infrastructure::InMemoryPricingCatalog;

#[test]
fn builtin_route_taxonomy_classifies_standard_ai_api_routes() {
    let routes = builtin_ai_route_taxonomy();
    assert!(
        routes.len() >= 50,
        "route taxonomy must cover OpenAI, OpenAI-compatible, Gemini, Codex, Claude Code, Kling, Jimeng, Volcengine, and Nano Banana"
    );

    let route_keys = routes
        .iter()
        .map(|route| route.route_key)
        .collect::<std::collections::BTreeSet<_>>();
    assert_eq!(
        route_keys.len(),
        routes.len(),
        "route_key values must be unique"
    );

    for expected in [
        "openai.responses",
        "openai.conversations",
        "openai.chat_completions",
        "openai.completions",
        "openai.embeddings",
        "openai.images.generations",
        "openai.images",
        "openai.images.edits",
        "openai.images.variations",
        "openai.audio.transcriptions",
        "openai.audio.translations",
        "openai.audio.speech",
        "openai.audio",
        "openai.files",
        "openai.uploads",
        "openai.batches",
        "openai.realtime",
        "openai.videos",
        "openai.video",
        "openai.models",
        "openai.moderations",
        "openai.assistants",
        "openai.threads",
        "openai.vector_stores",
        "openai.chatkit.sessions",
        "openai.containers",
        "openai_compatible.chat_completions",
        "openai_compatible.images.generations",
        "openai_compatible.audio.transcriptions",
        "openai.codex.responses",
        "anthropic.claude_code",
        "gemini.generate_content",
        "gemini.embed_content",
        "gemini.live",
        "gemini.nano_banana.image_generation",
        "kling.text_to_video",
        "jimeng.image_generation",
        "volcengine.video_generation",
        "minimax.music_generation",
        "vidu.reference_to_image",
        "vidu.start_end_to_video",
    ] {
        assert!(
            route_keys.contains(expected),
            "route taxonomy must include {expected}"
        );
    }

    let chat = find_builtin_ai_route("openai.chat_completions").unwrap();
    assert_eq!("openai.chat_completions", chat.api_code);
    assert_eq!(RoutingCapability::Chat, chat.capability);
    assert_eq!(BillingMeter::LlmInputToken, chat.billing_meter.clone());
    assert_eq!(AiRouteModelRequirement::Required, chat.model_requirement);
    assert_eq!(AiRouteStrategy::StatelessFailover, chat.route_strategy);
    assert_eq!(AiRouteFailureStrategy::Failover, chat.failure_strategy);
    assert_eq!(None, chat.sticky_object_type);

    let files = find_builtin_ai_route("openai.files").unwrap();
    assert_eq!("openai.files", files.api_code);
    assert_eq!(RoutingCapability::Network, files.capability);
    assert_eq!(BillingMeter::ApiRequest, files.billing_meter.clone());
    assert_eq!(AiRouteModelRequirement::Ignored, files.model_requirement);
    assert_eq!(AiRouteStrategy::CreateThenSticky, files.route_strategy);
    assert_eq!(AiRouteFailureStrategy::FailClosed, files.failure_strategy);
    assert_eq!(Some("file"), files.sticky_object_type);
    assert_eq!(Some("object"), files.sticky_scope);

    let containers = find_builtin_ai_route("openai.containers").unwrap();
    assert_eq!("openai.containers", containers.api_code);
    assert_eq!(RoutingCapability::Network, containers.capability);
    assert_eq!(BillingMeter::ApiRequest, containers.billing_meter.clone());
    assert_eq!(
        AiRouteModelRequirement::Ignored,
        containers.model_requirement
    );
    assert_eq!(AiRouteStrategy::CreateThenSticky, containers.route_strategy);
    assert_eq!(Some("container"), containers.sticky_object_type);

    let kling = find_builtin_ai_route("kling.text_to_video").unwrap();
    assert_eq!("kling.text_to_video", kling.api_code);
    assert_eq!(RoutingCapability::Video, kling.capability);
    assert_eq!(BillingMeter::VideoResult, kling.billing_meter.clone());
    assert_eq!(AiRouteModelRequirement::Optional, kling.model_requirement);
    assert_eq!(AiRouteStrategy::CreateThenSticky, kling.route_strategy);
    assert_eq!(AiRouteFailureStrategy::FailClosed, kling.failure_strategy);
    assert_eq!(Some("video_task"), kling.sticky_object_type);

    let codex = find_builtin_ai_route("openai.codex.responses").unwrap();
    assert_eq!("openai.codex.responses", codex.api_code);
    assert_eq!(RoutingCapability::Chat, codex.capability);
    assert_eq!(AiRouteModelRequirement::Required, codex.model_requirement);

    let nano_banana = find_builtin_ai_route("gemini.nano_banana.image_generation").unwrap();
    assert_eq!("gemini.nano_banana.image_generation", nano_banana.api_code);
    assert_eq!(RoutingCapability::Image, nano_banana.capability);
    assert_eq!(
        AiRouteModelRequirement::Required,
        nano_banana.model_requirement
    );

    let vidu = find_builtin_ai_route("vidu.start_end_to_video").unwrap();
    assert_eq!("vidu.start_end_to_video", vidu.api_code);
    assert_eq!(RoutingCapability::Video, vidu.capability);
    assert_eq!(BillingMeter::VideoResult, vidu.billing_meter.clone());
    assert_eq!(AiRouteModelRequirement::Optional, vidu.model_requirement);
    assert_eq!(Some("video_task"), vidu.sticky_object_type);

    let vidu_image = find_builtin_ai_route("vidu.reference_to_image").unwrap();
    assert_eq!("vidu.reference_to_image", vidu_image.api_code);
    assert_eq!(RoutingCapability::Image, vidu_image.capability);
    assert_eq!(BillingMeter::ImageResult, vidu_image.billing_meter.clone());
    assert_eq!(
        AiRouteModelRequirement::Optional,
        vidu_image.model_requirement
    );
    assert_eq!(Some("image_task"), vidu_image.sticky_object_type);

    let minimax_music = find_builtin_ai_route("minimax.music_generation").unwrap();
    assert_eq!("minimax.music_generation", minimax_music.api_code);
    assert_eq!(RoutingCapability::Music, minimax_music.capability);
    assert_eq!(
        BillingMeter::MusicOutputSecond,
        minimax_music.billing_meter.clone()
    );
    assert_eq!(
        AiRouteModelRequirement::Optional,
        minimax_music.model_requirement
    );
    assert_eq!(Some("music_task"), minimax_music.sticky_object_type);
}

#[test]
fn routing_index_filters_group_api_and_capability_without_full_selector_policy() {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-chat", 3001)
            .with_provider_endpoint(
                Some("https://openrouter.example/v1"),
                Some("vault://openrouter/chat"),
            )
            .with_resource_scoped_group_binding(
                10,
                10,
                100,
                vec!["openai.chat_completions"],
                vec!["llm"],
            ),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-image", 3002)
            .with_provider_endpoint(
                Some("https://openrouter.example/v1"),
                Some("vault://openrouter/image"),
            )
            .with_resource_scoped_group_binding(
                10,
                20,
                100,
                vec!["openai.images.generations"],
                vec!["image"],
            ),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("other-group-chat", 3003)
            .with_provider_endpoint(Some("https://other.example/v1"), Some("vault://other/chat"))
            .with_resource_scoped_group_binding(
                99,
                1,
                100,
                vec!["openai.chat_completions"],
                vec!["llm"],
            ),
    );

    let index = AiRoutingIndex::compile(&catalog);

    let chat_candidates = index.matching_channels(
        10,
        "openai.chat_completions",
        RoutingCapability::Chat,
        Some("openai/gpt-4o-mini"),
        Some("gpt-4o-mini"),
    );
    assert_eq!(vec![3001], channel_ids(&chat_candidates));

    let image_candidates = index.matching_channels(
        10,
        "openai.images.generations",
        RoutingCapability::Image,
        Some("openai/gpt-image-1"),
        Some("gpt-image-1"),
    );
    assert_eq!(vec![3002], channel_ids(&image_candidates));

    let other_model_same_api = index.matching_channels(
        10,
        "openai.chat_completions",
        RoutingCapability::Chat,
        Some("openai/gpt-5"),
        Some("gpt-5"),
    );
    assert_eq!(vec![3001], channel_ids(&other_model_same_api));

    let wrong_group = index.matching_channels(
        11,
        "openai.chat_completions",
        RoutingCapability::Chat,
        Some("openai/gpt-4o-mini"),
        Some("gpt-4o-mini"),
    );
    assert!(wrong_group.is_empty());
}

fn channel_ids(routes: &[ProviderChannelRoute]) -> Vec<i64> {
    routes.iter().map(|route| route.channel_id).collect()
}
