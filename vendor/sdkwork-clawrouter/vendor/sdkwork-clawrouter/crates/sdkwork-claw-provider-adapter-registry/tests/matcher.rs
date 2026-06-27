use sdkwork_claw_provider_adapter_contract::{
    AdapterEndpointRuntimeState, AdapterInvocationShape, AdapterKind, AdapterRouteStatus,
};
use sdkwork_claw_provider_adapter_registry::{
    ProviderAdapterLookup, ProviderAdapterRegistry, ProviderAdapterRouteConfig,
    ProviderInvocationMode,
};

fn vidu_route(priority: i32, status: AdapterRouteStatus) -> ProviderAdapterRouteConfig {
    ProviderAdapterRouteConfig {
        provider_code: "tencent-cloud".to_owned(),
        adapter_kind: AdapterKind::InternalHttp,
        adapter_base_url: "http://127.0.0.1:39110".to_owned(),
        capability: Some("video_generation".to_owned()),
        endpoint_key: Some("video.start_end2video".to_owned()),
        service_group: None,
        openapi_operation_id: None,
        s3_operation: None,
        iaas_operation: None,
        endpoint_styles: Vec::new(),
        runtime_state: AdapterEndpointRuntimeState::RuntimeAvailable,
        method: "POST".to_owned(),
        invocation_shape: AdapterInvocationShape::AsyncTaskStart,
        standard_path_pattern: "/vidu/ent/v2/start-end2video".to_owned(),
        adapter_path_template: "/providers/{provider_code}{standard_path}".to_owned(),
        status,
        priority,
    }
}

fn tencent_cloud_vidu_route(
    priority: i32,
    status: AdapterRouteStatus,
) -> ProviderAdapterRouteConfig {
    ProviderAdapterRouteConfig {
        provider_code: "tencent-cloud".to_owned(),
        adapter_kind: AdapterKind::InternalHttp,
        adapter_base_url: "http://127.0.0.1:39110".to_owned(),
        capability: Some("video_generation".to_owned()),
        endpoint_key: Some("video.start_end2video".to_owned()),
        service_group: None,
        openapi_operation_id: None,
        s3_operation: None,
        iaas_operation: None,
        endpoint_styles: Vec::new(),
        runtime_state: AdapterEndpointRuntimeState::RuntimeAvailable,
        method: "POST".to_owned(),
        invocation_shape: AdapterInvocationShape::AsyncTaskStart,
        standard_path_pattern: "/vidu/ent/v2/start-end2video".to_owned(),
        adapter_path_template: "/providers/{provider_code}{standard_path}".to_owned(),
        status,
        priority,
    }
}

fn openrouter_text2video_route(
    priority: i32,
    status: AdapterRouteStatus,
) -> ProviderAdapterRouteConfig {
    let mut route = vidu_route(priority, status);
    route.provider_code = "openrouter".to_owned();
    route.endpoint_key = Some("text2video".to_owned());
    route.standard_path_pattern = "/v1/videos/text2video".to_owned();
    route.adapter_path_template = "/providers/{provider_code}{standard_path}".to_owned();
    route
}

#[test]
fn exact_provider_method_and_path_match_returns_internal_adapter_route() {
    let registry = ProviderAdapterRegistry::new(vec![vidu_route(10, AdapterRouteStatus::Enabled)]);

    let resolution = registry.resolve(&ProviderAdapterLookup {
        provider_code: "tencent-cloud",
        method: "POST",
        standard_path: "/vidu/ent/v2/start-end2video",
        capability: Some("video_generation"),
        endpoint_key: Some("video.start_end2video"),
    });

    let ProviderInvocationMode::InternalHttpAdapter(route) = resolution.mode else {
        panic!("expected internal http adapter route");
    };
    assert_eq!(route.adapter_base_url, "http://127.0.0.1:39110");
    assert_eq!(
        route.adapter_path("/vidu/ent/v2/start-end2video"),
        "/providers/tencent-cloud/vidu/ent/v2/start-end2video"
    );
}

#[test]
fn standard_path_lookup_matches_endpoint_route_when_endpoint_key_is_unknown() {
    let registry = ProviderAdapterRegistry::new(vec![vidu_route(10, AdapterRouteStatus::Enabled)]);

    let resolution = registry.resolve_standard_path(&ProviderAdapterLookup {
        provider_code: "tencent-cloud",
        method: "POST",
        standard_path: "/vidu/ent/v2/start-end2video",
        capability: None,
        endpoint_key: None,
    });

    let ProviderInvocationMode::InternalHttpAdapter(route) = resolution.mode else {
        panic!("expected internal http adapter route");
    };
    assert_eq!(Some("video.start_end2video"), route.endpoint_key.as_deref());
}

#[test]
fn standard_path_lookup_allows_endpoint_alias_when_exact_path_matches() {
    let registry = ProviderAdapterRegistry::new(vec![openrouter_text2video_route(
        10,
        AdapterRouteStatus::Enabled,
    )]);

    let resolution = registry.resolve_standard_path(&ProviderAdapterLookup {
        provider_code: "openrouter",
        method: "POST",
        standard_path: "/v1/videos/text2video",
        capability: Some("video_generation"),
        endpoint_key: Some("kling.text_to_video"),
    });

    let ProviderInvocationMode::InternalHttpAdapter(route) = resolution.mode else {
        panic!("expected internal http adapter route");
    };
    assert_eq!(Some("text2video"), route.endpoint_key.as_deref());
}

#[test]
fn standard_path_metadata_can_be_resolved_without_implying_public_provider_adapter_dispatch() {
    let registry = ProviderAdapterRegistry::new(vec![tencent_cloud_vidu_route(
        10,
        AdapterRouteStatus::Enabled,
    )]);

    let public_provider_resolution = registry.resolve_standard_path(&ProviderAdapterLookup {
        provider_code: "vidu",
        method: "POST",
        standard_path: "/vidu/ent/v2/start-end2video",
        capability: None,
        endpoint_key: None,
    });
    assert!(matches!(
        public_provider_resolution.mode,
        ProviderInvocationMode::DirectHttp
    ));

    let metadata_route = registry
        .resolve_standard_path_metadata("POST", "/vidu/ent/v2/start-end2video")
        .expect("exact standard path metadata should be available from concrete adapter routes");
    assert_eq!("tencent-cloud", metadata_route.provider_code);
    assert_eq!(
        Some("video.start_end2video"),
        metadata_route.endpoint_key.as_deref()
    );
    assert_eq!(
        Some("video_generation"),
        metadata_route.capability.as_deref()
    );
}

#[test]
fn disabled_adapter_endpoint_is_ignored_and_returns_direct_http() {
    let registry = ProviderAdapterRegistry::new(vec![vidu_route(10, AdapterRouteStatus::Disabled)]);

    let resolution = registry.resolve(&ProviderAdapterLookup {
        provider_code: "tencent-cloud",
        method: "POST",
        standard_path: "/vidu/ent/v2/start-end2video",
        capability: Some("video_generation"),
        endpoint_key: Some("video.start_end2video"),
    });

    assert!(matches!(
        resolution.mode,
        ProviderInvocationMode::DirectHttp
    ));
}

#[test]
fn more_specific_path_wins_over_capability_default() {
    let mut fallback = vidu_route(100, AdapterRouteStatus::Enabled);
    fallback.endpoint_key = None;
    fallback.standard_path_pattern = "/*".to_owned();

    let exact = vidu_route(1, AdapterRouteStatus::Enabled);
    let registry = ProviderAdapterRegistry::new(vec![fallback, exact]);

    let resolution = registry.resolve(&ProviderAdapterLookup {
        provider_code: "tencent-cloud",
        method: "POST",
        standard_path: "/vidu/ent/v2/start-end2video",
        capability: Some("video_generation"),
        endpoint_key: Some("video.start_end2video"),
    });

    let ProviderInvocationMode::InternalHttpAdapter(route) = resolution.mode else {
        panic!("expected internal http adapter route");
    };
    assert_eq!(route.standard_path_pattern, "/vidu/ent/v2/start-end2video");
}

#[test]
fn registry_miss_returns_direct_http() {
    let registry = ProviderAdapterRegistry::new(vec![vidu_route(10, AdapterRouteStatus::Enabled)]);

    let resolution = registry.resolve(&ProviderAdapterLookup {
        provider_code: "openrouter",
        method: "POST",
        standard_path: "/v1/chat/completions",
        capability: Some("chat"),
        endpoint_key: Some("openai.chat_completions"),
    });

    assert!(matches!(
        resolution.mode,
        ProviderInvocationMode::DirectHttp
    ));
}

#[test]
fn official_standard_provider_stays_direct_http_when_only_non_standard_adapter_routes_exist() {
    let registry = ProviderAdapterRegistry::new(vec![vidu_route(10, AdapterRouteStatus::Enabled)]);

    let resolution = registry.resolve(&ProviderAdapterLookup {
        provider_code: "openai-official",
        method: "POST",
        standard_path: "/v1/chat/completions",
        capability: Some("chat"),
        endpoint_key: Some("openai.chat_completions"),
    });

    assert!(
        matches!(resolution.mode, ProviderInvocationMode::DirectHttp),
        "official standard providers must not be routed through adapter HTTP unless explicitly configured"
    );
}
