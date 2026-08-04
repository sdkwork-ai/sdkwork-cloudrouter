use sdkwork_claw_provider_adapter_contract::AdapterEndpointRuntimeState;

#[test]
fn alicloud_adapter_exposes_definition_only_text_generation_mapping() {
    let adapter = sdkwork_provider_adapter_alicloud::provider_adapter();

    assert_eq!("alicloud", adapter.package());
    assert_eq!("alicloud", adapter.provider_family());
    assert!(adapter.supplier_codes().contains(&"alicloud"));
    assert!(adapter.supplier_codes().contains(&"aliyun"));

    let endpoints = adapter.endpoints();
    assert_eq!(1, endpoints.len());
    let text_generation = &endpoints[0];
    assert_eq!("text_generation.generate", text_generation.endpoint_key);
    assert_eq!(
        AdapterEndpointRuntimeState::DefinitionOnly,
        text_generation.runtime_state
    );
    assert_eq!(
        "/api/v1/services/aigc/text-generation/generation",
        text_generation.standard_path_pattern
    );
    assert!(adapter.resolve_endpoint(&sample_request()).is_none());
}

#[test]
fn alicloud_credentials_debug_redacts_access_key_secret() {
    let credentials =
        sdkwork_provider_adapter_alicloud::common::signer_v3::AliCloudCredentials::new(
            "access-key-id",
            "access-key-secret",
        );

    let debug = format!("{credentials:?}");

    assert!(debug.contains("access-key-id"));
    assert!(!debug.contains("access-key-secret"));
    assert!(debug.contains("[REDACTED]"));
}

fn sample_request() -> sdkwork_claw_provider_adapter_contract::AdapterInvocationRequest {
    use sdkwork_claw_provider_adapter_contract::{
        AdapterInvocationMetadata, AdapterInvocationShape, AdapterProviderContext, AdapterSecret,
        AdapterSubject,
    };
    use serde_json::json;

    sdkwork_claw_provider_adapter_contract::AdapterInvocationRequest {
        invocation: AdapterInvocationMetadata {
            id: "inv-1".to_owned(),
            endpoint_key: "text_generation.generate".to_owned(),
            method: "POST".to_owned(),
            standard_path: "/api/v1/services/aigc/text-generation/generation".to_owned(),
            shape: AdapterInvocationShape::SyncJson,
            stream: false,
            request_id: Some("req-1".to_owned()),
            trace_id: Some("trace-1".to_owned()),
        },
        subject: AdapterSubject {
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            api_key_id: 100,
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
        },
        provider: AdapterProviderContext {
            supplier_code: "alicloud".to_owned(),
            account_id: 9301,
            region_code: "global".to_owned(),
            provider_model: "qwen-plus".to_owned(),
            base_url: Some("https://dashscope.aliyuncs.com".to_owned()),
            auth_profile: json!({"type": "bearer"}),
            timeout_ms: Some(120000),
        },
        secret: AdapterSecret::GatewayResolved(json!({"token": "redacted"})),
        body: json!({"input": "hello"}),
    }
}
