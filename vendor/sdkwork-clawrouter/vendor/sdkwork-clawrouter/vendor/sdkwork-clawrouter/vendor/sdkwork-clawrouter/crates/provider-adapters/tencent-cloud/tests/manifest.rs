use sdkwork_claw_provider_adapter_contract::{
    AdapterInvocationMetadata, AdapterInvocationRequest, AdapterInvocationShape,
    AdapterProviderContext, AdapterSecret, AdapterSubject,
};
use serde_json::json;

#[test]
fn tencent_cloud_adapter_exposes_provider_family_and_vidu_standard_endpoint_mapping() {
    let adapter = sdkwork_provider_adapter_tencent_cloud::provider_adapter();

    assert_eq!("tencent-cloud", adapter.package());
    assert_eq!("tencent-cloud", adapter.provider_family());
    assert!(adapter.provider_codes().contains(&"tencent-cloud"));
    assert!(adapter.provider_codes().contains(&"tencent-hunyuan"));
    let endpoints = adapter.endpoints();
    let start_end2video = endpoints
        .iter()
        .find(|endpoint| endpoint.endpoint_key == "video.start_end2video")
        .expect("Tencent Cloud adapter should expose Vidu standard start-end2video mapping");
    assert_eq!(
        Some("video_generation"),
        start_end2video.capability.as_deref()
    );
    assert_eq!("POST", start_end2video.method);
    assert_eq!(
        "/vidu/ent/v2/start-end2video",
        start_end2video.standard_path_pattern
    );
}

#[test]
fn tc3_credentials_debug_redacts_secret_key() {
    let credentials =
        sdkwork_provider_adapter_tencent_cloud::common::signer_tc3::Tc3Credentials::new(
            "secret-id",
            "secret-key",
        );

    let debug = format!("{credentials:?}");

    assert!(debug.contains("secret-id"));
    assert!(!debug.contains("secret-key"));
    assert!(debug.contains("[REDACTED]"));
}

#[tokio::test]
async fn start_end2video_adapter_returns_standard_video_usage_lines() {
    let adapter = sdkwork_provider_adapter_tencent_cloud::provider_adapter();
    let request = AdapterInvocationRequest {
        invocation: AdapterInvocationMetadata {
            id: "inv-1".to_owned(),
            endpoint_key: "video.start_end2video".to_owned(),
            method: "POST".to_owned(),
            standard_path: "/vidu/ent/v2/start-end2video".to_owned(),
            shape: AdapterInvocationShape::AsyncTaskStart,
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
            provider_code: "tencent-cloud".to_owned(),
            channel_id: 9301,
            region_code: "global".to_owned(),
            provider_model: "vidu2.0".to_owned(),
            base_url: Some("https://vidu.example.test".to_owned()),
            auth_profile: json!({"type": "bearer"}),
            timeout_ms: Some(120000),
        },
        secret: AdapterSecret::GatewayResolved(json!({"token": "redacted"})),
        body: json!({"model": "vidu2.0", "duration": 8, "prompt": "adapter route"}),
    };
    let endpoint = adapter
        .resolve_endpoint(&request)
        .expect("Tencent Cloud Vidu start-end2video endpoint should resolve");

    let response = endpoint
        .invoke(Default::default(), request)
        .await
        .expect("Tencent Cloud Vidu adapter should produce a response");
    let serialized = serde_json::to_value(response).unwrap();

    assert_eq!(
        serialized["usage"]["usageLines"][0]["meterCode"],
        "api_request"
    );
    assert_eq!(
        serialized["usage"]["usageLines"][0]["billableQuantity"],
        "1"
    );
    assert_eq!(serialized["usage"]["usageLines"][0]["requestCount"], 1);
    assert_eq!(
        serialized["usage"]["usageLines"][0]["providerNativeModel"],
        "vidu2.0"
    );
    assert_eq!(
        serialized["usage"]["usageLines"][1]["meterCode"],
        "video_output_second"
    );
    assert_eq!(
        serialized["usage"]["usageLines"][1]["billableQuantity"],
        "8"
    );
    assert_eq!(serialized["usage"]["usageLines"][1]["videoSeconds"], "8");
    assert_eq!(
        serialized["usage"]["usageLines"][1]["providerNativeModel"],
        "vidu2.0"
    );
}
