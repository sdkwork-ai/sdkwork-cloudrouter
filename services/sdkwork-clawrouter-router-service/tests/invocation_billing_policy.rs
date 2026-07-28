use axum::http::Method;
use sdkwork_clawrouter_router_service::application::{
    AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor, BillingQuantitySource,
    Invocation, InvocationBilling, InvocationBody, InvocationClassificationRequest,
    InvocationDispatch, InvocationInterceptor, InvocationPipeline, InvocationRequest,
    InvocationResourceClassifier, OpenAiResourceClassifier, PayloadExtractionInterceptor,
    ProviderNativeResourceClassifier,
};
use sdkwork_clawrouter_router_service::domain::{BillingMeter, RoutingCapability};
use serde_json::json;

fn test_subject() -> sdkwork_clawrouter_router_service::application::InvocationSubject {
    sdkwork_clawrouter_router_service::application::InvocationSubject::from_api_key_context(
        AuthenticatedApiKeyContext {
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            api_key_id: 100,
            api_key_name_snapshot: "Test key".to_owned(),
            group_id: 200,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
        },
    )
}

fn openai_invocation(method: Method, path: &str, body: InvocationBody) -> Invocation {
    let classification = OpenAiResourceClassifier::default()
        .classify(&InvocationClassificationRequest::new(method.clone(), path))
        .expect("classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(method, path)
            .with_request_id("req-billing")
            .with_body(body),
        test_subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation
}

#[tokio::test]
async fn maps_chat_and_responses_to_composite_token_billing() {
    for (path, body) in [
        (
            "/v1/chat/completions",
            InvocationBody::json(json!({
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": "ping"}]
            })),
        ),
        (
            "/v1/responses",
            InvocationBody::json(json!({
                "model": "gpt-4o-mini",
                "input": "ping"
            })),
        ),
    ] {
        let mut invocation = openai_invocation(Method::POST, path, body);

        BillingPolicyInterceptor::default()
            .before(&mut invocation)
            .await
            .expect("billing policy");

        assert_eq!(BillingMode::Composite, invocation.billing.mode);
        assert_eq!(Some(BillingMeter::LlmInputToken), invocation.billing.meter);
        assert_eq!(
            BillingQuantitySource::Composite,
            invocation.billing.quantity_source
        );
        assert!(invocation.billing.pricing_required);
        assert!(invocation.billing.settlement_required);
        assert!(!invocation.billing.prepaid_required);
    }
}

#[tokio::test]
async fn maps_streaming_model_calls_to_streaming_usage_accumulator() {
    let mut invocation = openai_invocation(
        Method::POST,
        "/v1/chat/completions",
        InvocationBody::json(json!({
            "model": "gpt-4o-mini",
            "stream": true,
            "messages": [{"role": "user", "content": "ping"}]
        })),
    );
    invocation.dispatch = InvocationDispatch::sse_stream();

    BillingPolicyInterceptor::default()
        .before(&mut invocation)
        .await
        .expect("billing policy");

    assert_eq!(BillingMode::Composite, invocation.billing.mode);
    assert_eq!(Some(BillingMeter::LlmInputToken), invocation.billing.meter);
    assert_eq!(
        BillingQuantitySource::StreamingAccumulator,
        invocation.billing.quantity_source
    );
    assert!(invocation.billing.pricing_required);
    assert!(invocation.billing.settlement_required);
}

#[tokio::test]
async fn payload_then_billing_pipeline_maps_stream_true_to_streaming_usage_source() {
    let mut invocation = openai_invocation(
        Method::POST,
        "/v1/chat/completions",
        InvocationBody::json(json!({
            "model": "gpt-4o-mini",
            "stream": true,
            "messages": [{"role": "user", "content": "ping"}]
        })),
    );
    let pipeline = InvocationPipeline::new()
        .with_interceptor(PayloadExtractionInterceptor::default())
        .with_interceptor(BillingPolicyInterceptor::default());

    pipeline
        .execute(&mut invocation)
        .await
        .expect("payload and billing pipeline");

    assert_eq!(
        BillingQuantitySource::StreamingAccumulator,
        invocation.billing.quantity_source
    );
}

#[tokio::test]
async fn maps_embeddings_to_single_embedding_token_billing() {
    let mut invocation = openai_invocation(
        Method::POST,
        "/v1/embeddings",
        InvocationBody::json(json!({
            "model": "text-embedding-3-small",
            "input": "hello"
        })),
    );

    BillingPolicyInterceptor::default()
        .before(&mut invocation)
        .await
        .expect("billing policy");

    assert_eq!(BillingMode::Token, invocation.billing.mode);
    assert_eq!(
        Some(BillingMeter::EmbeddingInputToken),
        invocation.billing.meter
    );
    assert_eq!(
        BillingQuantitySource::ResponseBody,
        invocation.billing.quantity_source
    );
    assert!(invocation.billing.pricing_required);
    assert!(invocation.billing.settlement_required);
}

#[tokio::test]
async fn maps_modal_and_realtime_model_resources_to_metered_billing() {
    for (path, expected_mode, expected_meter, expected_source) in [
        (
            "/v1/images/generations",
            BillingMode::ResultCount,
            BillingMeter::ImageResult,
            BillingQuantitySource::ResponseBody,
        ),
        (
            "/v1/audio/speech",
            BillingMode::Character,
            BillingMeter::TtsInputCharacter,
            BillingQuantitySource::ResponseBody,
        ),
        (
            "/v1/realtime/calls",
            BillingMode::Composite,
            BillingMeter::LlmInputToken,
            BillingQuantitySource::Composite,
        ),
    ] {
        let mut invocation = openai_invocation(
            Method::POST,
            path,
            InvocationBody::json(json!({"model": "gpt-4o-mini"})),
        );

        BillingPolicyInterceptor::default()
            .before(&mut invocation)
            .await
            .expect("billing policy");

        assert_eq!(expected_mode, invocation.billing.mode, "{path}");
        assert_eq!(Some(expected_meter), invocation.billing.meter, "{path}");
        assert_eq!(
            expected_source, invocation.billing.quantity_source,
            "{path}"
        );
    }
}

#[tokio::test]
async fn maps_management_resources_to_fixed_api_request_billing() {
    let mut invocation = openai_invocation(Method::POST, "/v1/files", InvocationBody::Empty);

    BillingPolicyInterceptor::default()
        .before(&mut invocation)
        .await
        .expect("billing policy");

    assert_eq!(BillingMode::ApiRequest, invocation.billing.mode);
    assert_eq!(Some(BillingMeter::ApiRequest), invocation.billing.meter);
    assert_eq!(
        BillingQuantitySource::FixedRequest,
        invocation.billing.quantity_source
    );
    assert!(invocation.billing.pricing_required);
    assert!(invocation.billing.settlement_required);
}

#[tokio::test]
async fn maps_provider_native_resources_to_adapter_usage_line_billing() {
    let classification = ProviderNativeResourceClassifier::default()
        .classify(
            &InvocationClassificationRequest::new(Method::POST, "/kling/v1/videos/text2video")
                .with_supplier_code("kling")
                .with_provider_family("media")
                .with_endpoint_key("text_to_video")
                .with_capability(RoutingCapability::Video),
        )
        .expect("provider native classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/kling/v1/videos/text2video")
            .with_request_id("req-provider-native"),
        test_subject(),
        resource,
        billing,
    );
    invocation.routing = routing;

    BillingPolicyInterceptor::default()
        .before(&mut invocation)
        .await
        .expect("billing policy");

    assert_eq!(BillingMode::ExternalUsageLine, invocation.billing.mode);
    assert_eq!(Some(BillingMeter::VideoResult), invocation.billing.meter);
    assert_eq!(
        BillingQuantitySource::AdapterUsageLines,
        invocation.billing.quantity_source
    );
    assert!(invocation.billing.pricing_required);
    assert!(invocation.billing.settlement_required);
}

#[tokio::test]
async fn maps_free_resources_to_trace_only_billing() {
    let mut invocation = openai_invocation(Method::GET, "/v1/models", InvocationBody::Empty);
    invocation.billing = InvocationBilling::api_request(BillingMeter::ApiRequest);

    BillingPolicyInterceptor::default()
        .before(&mut invocation)
        .await
        .expect("billing policy");

    assert_eq!(BillingMode::Free, invocation.billing.mode);
    assert_eq!(None, invocation.billing.meter);
    assert_eq!(
        BillingQuantitySource::None,
        invocation.billing.quantity_source
    );
    assert!(!invocation.billing.pricing_required);
    assert!(!invocation.billing.settlement_required);
    assert!(!invocation.billing.prepaid_required);
}
