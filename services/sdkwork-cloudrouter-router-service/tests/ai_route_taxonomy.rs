use sdkwork_cloudrouter_router_service::application::{
    builtin_ai_route_taxonomy, find_builtin_ai_route, AiRoutingIndex,
};
use sdkwork_cloudrouter_router_service::domain::{
    AiRouteFailureStrategy, AiRouteModelRequirement, AiRouteStrategy, BillingMeter,
    RoutingCapability, UpstreamAccountRoute,
};
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;

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
        "vidu.motion_sync",
        "kling.avatar",
        "kling.motion_control",
        "volcengine.speech",
        "elevenlabs.text_to_speech",
        "elevenlabs.sound_generation",
        "suno.music_generation",
        "suno.music_task_query",
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
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openrouter-chat", 3001)
            .with_upstream_endpoint(
                Some("https://openrouter.example/v1"),
                Some("vault://openrouter/chat"),
            )
            .with_resource_scoped_account_group_binding(
                10,
                10,
                100,
                vec!["openai.chat_completions"],
                vec!["llm"],
            ),
    );
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openrouter-image", 3002)
            .with_upstream_endpoint(
                Some("https://openrouter.example/v1"),
                Some("vault://openrouter/image"),
            )
            .with_resource_scoped_account_group_binding(
                10,
                20,
                100,
                vec!["openai.images.generations"],
                vec!["image"],
            ),
    );
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("other-group-chat", 3003)
            .with_upstream_endpoint(Some("https://other.example/v1"), Some("vault://other/chat"))
            .with_resource_scoped_account_group_binding(
                99,
                1,
                100,
                vec!["openai.chat_completions"],
                vec!["llm"],
            ),
    );

    let index = AiRoutingIndex::compile(&catalog);

    let chat_candidates = index.matching_accounts(
        10,
        "openai.chat_completions",
        RoutingCapability::Chat,
        Some("openai/gpt-4o-mini"),
        Some("gpt-4o-mini"),
    );
    assert_eq!(vec![3001], account_ids(&chat_candidates));

    let image_candidates = index.matching_accounts(
        10,
        "openai.images.generations",
        RoutingCapability::Image,
        Some("openai/gpt-image-1"),
        Some("gpt-image-1"),
    );
    assert_eq!(vec![3002], account_ids(&image_candidates));

    let other_model_same_api = index.matching_accounts(
        10,
        "openai.chat_completions",
        RoutingCapability::Chat,
        Some("openai/gpt-5"),
        Some("gpt-5"),
    );
    assert_eq!(vec![3001], account_ids(&other_model_same_api));

    let wrong_group = index.matching_accounts(
        11,
        "openai.chat_completions",
        RoutingCapability::Chat,
        Some("openai/gpt-4o-mini"),
        Some("gpt-4o-mini"),
    );
    assert!(wrong_group.is_empty());
}

fn account_ids(routes: &[UpstreamAccountRoute]) -> Vec<i64> {
    routes.iter().map(|route| route.account_id).collect()
}

#[test]
fn deepseek_web_tools_resolve_to_the_deepseek_account_by_api_scope() {
    // The two DeepSeek web tools are model-less `api` routes billed per request.
    // Routing therefore resolves them by api scope alone: an account only
    // reaches them when its group binding names the api code, and the taxonomy
    // route must stay `Ignored` + `ApiRequest` (DeepSeek's own rule: 5 CNY per
    // 1,000 successful calls, never per result).
    for api_code in ["deepseek.web_search", "deepseek.web_fetch"] {
        let route = find_builtin_ai_route(api_code).expect("taxonomy route must exist");
        assert_eq!(api_code, route.route_key, "{api_code}");
        assert_eq!(api_code, route.api_code, "{api_code}");
        assert_eq!(RoutingCapability::Network, route.capability, "{api_code}");
        assert_eq!(BillingMeter::ApiRequest, route.billing_meter, "{api_code}");
        assert_eq!(
            AiRouteModelRequirement::Ignored,
            route.model_requirement,
            "{api_code}"
        );
        assert_eq!(
            AiRouteStrategy::PrimaryAccount,
            route.route_strategy,
            "{api_code}"
        );
        assert_eq!(
            AiRouteFailureStrategy::FailClosed,
            route.failure_strategy,
            "{api_code}"
        );
        assert_eq!(None, route.sticky_object_type, "{api_code}");
    }

    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("deepseek", 4001)
            .with_upstream_endpoint(
                Some("https://api.deepseek.com"),
                Some("vault://deepseek/default"),
            )
            .with_resource_scoped_account_group_binding(
                10,
                10,
                100,
                vec!["deepseek.web_search", "deepseek.web_fetch"],
                vec!["network"],
            ),
    );
    // An account in the same group that is not granted these scopes must never
    // be selected, even though it is callable for other APIs.
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openai", 4002)
            .with_upstream_endpoint(
                Some("https://api.openai.com/v1"),
                Some("vault://openai/default"),
            )
            .with_resource_scoped_account_group_binding(
                10,
                20,
                100,
                vec!["openai.chat_completions"],
                vec!["llm"],
            ),
    );

    let index = AiRoutingIndex::compile(&catalog);
    for api_code in ["deepseek.web_search", "deepseek.web_fetch"] {
        let candidates =
            index.matching_accounts(10, api_code, RoutingCapability::Network, None, None);
        assert_eq!(vec![4001], account_ids(&candidates), "{api_code}");
    }
}
