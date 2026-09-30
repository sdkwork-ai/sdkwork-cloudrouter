use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor, BillingQuantitySource,
    Invocation, InvocationBilling, InvocationBody, InvocationClassificationRequest,
    InvocationDispatch, InvocationInterceptor, InvocationPipeline, InvocationRequest,
    InvocationResourceClassifier, OpenAiResourceClassifier, PayloadExtractionInterceptor,
    ProviderNativeResourceClassifier,
};
use sdkwork_cloudrouter_router_service::domain::{BillingMeter, RoutingCapability};
use serde_json::json;

fn test_subject() -> sdkwork_cloudrouter_router_service::application::InvocationSubject {
    sdkwork_cloudrouter_router_service::application::InvocationSubject::from_api_key_context(
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
    let classification = OpenAiResourceClassifier
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

        BillingPolicyInterceptor
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

    BillingPolicyInterceptor
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
        .with_interceptor(PayloadExtractionInterceptor)
        .with_interceptor(BillingPolicyInterceptor);

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

    BillingPolicyInterceptor
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

        BillingPolicyInterceptor
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

    BillingPolicyInterceptor
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
async fn maps_provider_native_resources_to_fixed_request_until_adapter_resolution() {
    let classification = ProviderNativeResourceClassifier
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

    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");

    assert_eq!(BillingMode::ExternalUsageLine, invocation.billing.mode);
    assert_eq!(Some(BillingMeter::VideoResult), invocation.billing.meter);
    assert_eq!(
        BillingQuantitySource::FixedRequest,
        invocation.billing.quantity_source
    );
    assert!(invocation.billing.pricing_required);
    assert!(invocation.billing.settlement_required);
}

fn provider_native_invocation(method: Method, path: &str, supplier_code: &str) -> Invocation {
    let classification = ProviderNativeResourceClassifier
        .classify(
            &InvocationClassificationRequest::new(method.clone(), path)
                .with_supplier_code(supplier_code),
        )
        .expect("provider native classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(method, path).with_request_id("req-provider-native-billing"),
        test_subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation
}

#[tokio::test]
async fn maps_provider_native_non_streaming_llm_to_composite_token_billing() {
    // ProviderNative 非流式的 token 端点必须与流式兄弟路径同价计费：
    // anthropic.messages 与 gemini.generateContent 都按 Composite token 结算，
    // 不再塌缩成单条 ApiRequest。
    for (path, supplier_code) in [
        ("/anthropic/v1/messages", "anthropic"),
        (
            "/google/v1beta/models/gemini-2.5-pro:generateContent",
            "google",
        ),
    ] {
        let mut invocation = provider_native_invocation(Method::POST, path, supplier_code);

        BillingPolicyInterceptor
            .before(&mut invocation)
            .await
            .expect("billing policy");

        assert_eq!(BillingMode::Composite, invocation.billing.mode, "{path}");
        assert_eq!(
            Some(BillingMeter::LlmInputToken),
            invocation.billing.meter,
            "{path}"
        );
        assert_eq!(
            BillingQuantitySource::Composite,
            invocation.billing.quantity_source,
            "{path}"
        );
        assert!(invocation.billing.pricing_required, "{path}");
        assert!(invocation.billing.settlement_required, "{path}");
    }
}

#[tokio::test]
async fn maps_provider_native_non_streaming_embedding_to_embedding_token_billing() {
    // gemini.embedContent 按 EmbeddingInputToken 的 Token/ResponseBody 结算，
    // 而不是 Composite（避免引入无关的 LlmOutputToken 价目要求）。
    let mut invocation = provider_native_invocation(
        Method::POST,
        "/google/v1beta/models/gemini-embedding-001:embedContent",
        "google",
    );

    BillingPolicyInterceptor
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
async fn maps_provider_native_streaming_llm_to_streaming_accumulator_billing() {
    let mut invocation =
        provider_native_invocation(Method::POST, "/anthropic/v1/messages", "anthropic");
    invocation.dispatch = InvocationDispatch::sse_stream();

    BillingPolicyInterceptor
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
async fn maps_provider_native_non_streaming_media_to_request_fact_billing() {
    // 媒体类（视频/图片）结果量由 adapter 异步产出，非流式 body 里没有
    // 可用量，保持请求事实计费不变。
    let mut invocation = provider_native_invocation(
        Method::POST,
        "/google/v1beta/models/veo-3.0-generate-preview:generateVideos",
        "google",
    );

    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");

    assert_eq!(BillingMode::ExternalUsageLine, invocation.billing.mode);
    assert_eq!(Some(BillingMeter::VideoResult), invocation.billing.meter);
    assert_eq!(
        BillingQuantitySource::FixedRequest,
        invocation.billing.quantity_source
    );
}

#[tokio::test]
async fn maps_provider_native_unmetered_paths_to_request_fact_billing() {
    // 未命中内置路由的 ProviderNative 路径没有计量 meter，保持请求事实计费。
    let mut invocation =
        provider_native_invocation(Method::POST, "/anthropic/v1/totally-unknown", "anthropic");

    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");

    assert_eq!(BillingMode::ExternalUsageLine, invocation.billing.mode);
    assert_eq!(None, invocation.billing.meter);
    assert_eq!(
        BillingQuantitySource::FixedRequest,
        invocation.billing.quantity_source
    );
}

#[tokio::test]
async fn maps_free_resources_to_trace_only_billing() {
    let mut invocation = openai_invocation(Method::GET, "/v1/models", InvocationBody::Empty);
    invocation.billing = InvocationBilling::api_request(BillingMeter::ApiRequest);

    BillingPolicyInterceptor
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
