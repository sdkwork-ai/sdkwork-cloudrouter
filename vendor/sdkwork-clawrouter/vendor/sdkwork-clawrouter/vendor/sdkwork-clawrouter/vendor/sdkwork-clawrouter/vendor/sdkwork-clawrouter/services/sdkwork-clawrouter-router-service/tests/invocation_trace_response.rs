use axum::http::Method;
use sdkwork_clawrouter_router_service::application::{
    AuthenticatedApiKeyContext, DispatchMode, Invocation, InvocationBilling, InvocationDispatch,
    InvocationError, InvocationErrorKind, InvocationInterceptor, InvocationRequest,
    InvocationResource, InvocationRouteAttempt, InvocationSubject,
    ResponseNormalizationInterceptor, TraceTelemetryInterceptor,
};
use sdkwork_clawrouter_router_service::domain::{
    AiRouteModelRequirement, BillingMeter, RoutingCapability,
};
use serde_json::json;

fn invocation() -> Invocation {
    Invocation::new(
        InvocationRequest::new(Method::POST, "/v1/chat/completions").with_request_id("req-trace"),
        InvocationSubject::from_api_key_context(AuthenticatedApiKeyContext {
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            api_key_id: 100,
            api_key_name_snapshot: "Test key".to_owned(),
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
        }),
        InvocationResource::model_call(
            "openai/model/chat_completions",
            "openai.chat_completions",
            RoutingCapability::Chat,
            AiRouteModelRequirement::Required,
        ),
        InvocationBilling::composite(BillingMeter::LlmInputToken),
    )
}

#[tokio::test]
async fn trace_records_success_attempt_latency() {
    let mut invocation = invocation();
    invocation
        .routing
        .attempted_routes
        .push(InvocationRouteAttempt {
            provider_code: "openrouter".to_owned(),
            channel_id: 3001,
            candidate_index: 0,
            status_code: Some(200),
            success: true,
            retryable: false,
            error_code: None,
            error_message: None,
            latency_ms: Some(37),
        });

    TraceTelemetryInterceptor::default()
        .after(&mut invocation)
        .await
        .expect("trace");

    assert_eq!(Some(37), invocation.telemetry.latency_ms);
    assert!(invocation.telemetry.error_type.is_none());
}

#[tokio::test]
async fn trace_masks_error_messages() {
    let mut invocation = invocation();
    let error = InvocationError::new(
        InvocationErrorKind::Dispatch,
        "provider rejected key sk-provider-secret",
    );

    TraceTelemetryInterceptor::default()
        .on_error(&mut invocation, &error)
        .await
        .expect("trace");

    assert_eq!(
        Some("dispatch_failed"),
        invocation.telemetry.error_type.as_deref()
    );
    assert_eq!(
        Some("provider rejected key sk-***provider-secret"),
        invocation.telemetry.error_message_masked.as_deref()
    );
}

#[tokio::test]
async fn normalizes_success_response() {
    let mut invocation = invocation();
    invocation.dispatch = InvocationDispatch::json_response(200, json!({"id": "ok"}));

    ResponseNormalizationInterceptor::default()
        .after(&mut invocation)
        .await
        .expect("normalize");

    let response = invocation.telemetry.normalized_response.unwrap();
    assert_eq!(200, response.status_code);
    assert_eq!(Some("application/json"), response.content_type.as_deref());
    assert_eq!(
        Some("ok"),
        response
            .body
            .as_ref()
            .and_then(|v| v.get("id"))
            .and_then(|v| v.as_str())
    );
}

#[tokio::test]
async fn trace_ignores_body_status_code_for_direct_provider_success_response() {
    let mut invocation = invocation();
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "statusCode": 400,
            "message": "business status field, not gateway wrapper"
        }),
    );

    TraceTelemetryInterceptor::default()
        .after(&mut invocation)
        .await
        .expect("trace");

    assert!(invocation.telemetry.error_type.is_none());
    assert!(invocation.telemetry.provider_error_code.is_none());
    assert!(invocation.telemetry.error_message_masked.is_none());
}

#[tokio::test]
async fn normalizes_internal_adapter_response_to_provider_body() {
    let mut invocation = invocation();
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "statusCode": 202,
            "headers": {"content-type": "application/json"},
            "body": {
                "id": "video-task-1",
                "status": "queued",
                "_gateway_usage": {
                    "lines": [{"meter": "api_result", "quantity": "1"}]
                }
            }
        }),
    );
    invocation.dispatch.mode = DispatchMode::InternalProviderAdapter;

    ResponseNormalizationInterceptor::default()
        .after(&mut invocation)
        .await
        .expect("normalize");

    let response = invocation.telemetry.normalized_response.unwrap();
    assert_eq!(202, response.status_code);
    assert_eq!(Some("application/json"), response.content_type.as_deref());
    assert_eq!(
        Some("video-task-1"),
        response
            .body
            .as_ref()
            .and_then(|v| v.get("id"))
            .and_then(|v| v.as_str())
    );
}

#[tokio::test]
async fn normalizes_invocation_error_response() {
    let mut invocation = invocation();
    let error = InvocationError::new(InvocationErrorKind::Routing, "no route for sk-secret");

    ResponseNormalizationInterceptor::default()
        .on_error(&mut invocation, &error)
        .await
        .expect("normalize");

    let response = invocation.telemetry.normalized_response.unwrap();
    assert_eq!(502, response.status_code);
    assert_eq!(
        Some("routing_failed"),
        response
            .body
            .as_ref()
            .and_then(|body| body.pointer("/error/code"))
            .and_then(|value| value.as_str())
    );
    assert_eq!(
        Some("no route for sk-***secret"),
        response
            .body
            .as_ref()
            .and_then(|body| body.pointer("/error/message"))
            .and_then(|value| value.as_str())
    );
}
