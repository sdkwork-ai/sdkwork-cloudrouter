use sdkwork_claw_provider_adapter_contract::{
    AdapterInvocationMetadata, AdapterInvocationRequest, AdapterInvocationResponse,
    AdapterInvocationShape, AdapterProviderContext, AdapterSecret, AdapterSubject,
    AdapterUsageLine,
};
use serde_json::json;

#[test]
fn adapter_invocation_request_serializes_stable_gateway_envelope() {
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
            supplier_code: "vidu-official".to_owned(),
            account_id: 3001,
            region_code: "global".to_owned(),
            provider_model: "vidu-q1".to_owned(),
            base_url: Some("https://api.vidu.example".to_owned()),
            auth_profile: json!({"type": "bearer"}),
            timeout_ms: Some(120000),
        },
        secret: AdapterSecret::GatewayResolved(json!({"token": "redacted-in-test"})),
        body: json!({"prompt": "make a video"}),
    };

    let serialized = serde_json::to_value(request).unwrap();

    assert_eq!(
        serialized["invocation"]["endpointKey"],
        "video.start_end2video"
    );
    assert_eq!(
        serialized["invocation"]["standardPath"],
        "/vidu/ent/v2/start-end2video"
    );
    assert_eq!(serialized["invocation"]["shape"], "async_task_start");
    assert_eq!(serialized["subject"]["tenantId"], 10);
    assert_eq!(serialized["provider"]["providerCode"], "vidu-official");
    assert_eq!(serialized["provider"]["regionCode"], "global");
    assert_eq!(serialized["secret"]["type"], "gateway_resolved");
}

#[test]
fn adapter_invocation_response_serializes_standard_task_response() {
    let response = AdapterInvocationResponse::json_task(
        200,
        serde_json::json!({"id": "task-1", "status": "queued"}),
    )
    .with_provider_task_id("native-task-1")
    .with_billing_units(1);

    let serialized = serde_json::to_value(response).unwrap();

    assert_eq!(serialized["statusCode"], 200);
    assert_eq!(serialized["provider"]["taskId"], "native-task-1");
    assert_eq!(serialized["usage"]["billingUnits"], 1);
    assert_eq!(serialized["body"]["status"], "queued");
}

#[test]
fn adapter_invocation_response_serializes_standard_usage_lines() {
    let response = AdapterInvocationResponse::json_task(
        200,
        serde_json::json!({"id": "task-1", "status": "succeeded"}),
    )
    .with_usage_line(
        AdapterUsageLine::new("video_result", "1")
            .with_result_count(1)
            .with_provider_native_model("vidu-q1")
            .with_requested_model_catalog_key("vidu/vidu-q1"),
    )
    .with_usage_line(
        AdapterUsageLine::new("video_output_second", "8")
            .with_video_seconds("8")
            .with_provider_native_model("vidu-q1")
            .with_requested_model_catalog_key("vidu/vidu-q1"),
    );

    let serialized = serde_json::to_value(response).unwrap();

    assert!(serialized["usage"]["billingUnits"].is_null());
    assert_eq!(
        serialized["usage"]["usageLines"][0]["meterCode"],
        "video_result"
    );
    assert_eq!(
        serialized["usage"]["usageLines"][0]["billableQuantity"],
        "1"
    );
    assert_eq!(serialized["usage"]["usageLines"][0]["resultCount"], 1);
    assert_eq!(
        serialized["usage"]["usageLines"][0]["providerNativeModel"],
        "vidu-q1"
    );
    assert_eq!(
        serialized["usage"]["usageLines"][0]["requestedModelCatalogKey"],
        "vidu/vidu-q1"
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
}
