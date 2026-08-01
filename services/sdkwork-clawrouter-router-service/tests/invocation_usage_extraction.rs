use axum::http::Method;
use sdkwork_clawrouter_router_service::application::{
    AuthenticatedApiKeyContext, BillingMode, BillingQuantitySource, Invocation, InvocationBilling,
    InvocationClassificationRequest, InvocationDispatch, InvocationInterceptor, InvocationRequest,
    InvocationResource, InvocationResourceClassifier, InvocationSubject, InvocationSurface,
    OpenAiResourceClassifier, ResourceType, UsageExtractionInterceptor,
};
use sdkwork_clawrouter_router_service::domain::{BillingMeter, RoutingCapability};
use serde_json::json;

fn subject() -> InvocationSubject {
    InvocationSubject::from_api_key_context(AuthenticatedApiKeyContext {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        api_key_id: 100,
        api_key_name_snapshot: "Test key".to_owned(),
        group_id: 10,
        group_code: "standard-group".to_owned(),
        pricing_plan_code: "standard".to_owned(),
    })
}

fn openai_invocation(method: Method, path: &str) -> Invocation {
    let classification = OpenAiResourceClassifier
        .classify(&InvocationClassificationRequest::new(method.clone(), path))
        .expect("classification");
    let (mut resource, billing, routing) = classification.into_parts();
    resource.requested_model = Some("gpt-4o-mini".to_owned());
    resource.requested_model_catalog_key = Some("openai/gpt-4o-mini".to_owned());
    let mut invocation = Invocation::new(
        InvocationRequest::new(method, path).with_request_id("req-usage"),
        subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation
}

#[tokio::test]
async fn extracts_openai_chat_usage_lines() {
    let mut invocation = openai_invocation(Method::POST, "/v1/chat/completions");
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "usage": {
                "prompt_tokens": 12,
                "completion_tokens": 8,
                "total_tokens": 20,
                "prompt_tokens_details": {"cached_tokens": 3}
            }
        }),
    );

    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");

    assert_eq!(3, invocation.usage.lines.len());
    assert_eq!(BillingMeter::LlmInputToken, invocation.usage.lines[0].meter);
    assert_eq!("9", invocation.usage.lines[0].quantity.billable_quantity);
    assert_eq!(
        BillingMeter::LlmCacheReadToken,
        invocation.usage.lines[1].meter
    );
    assert_eq!("3", invocation.usage.lines[1].quantity.billable_quantity);
    assert_eq!(
        BillingMeter::LlmOutputToken,
        invocation.usage.lines[2].meter
    );
    assert_eq!("8", invocation.usage.lines[2].quantity.billable_quantity);
}

#[tokio::test]
async fn ignores_body_status_code_for_direct_provider_success_response() {
    let mut invocation = openai_invocation(Method::POST, "/v1/chat/completions");
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "statusCode": 400,
            "usage": {
                "prompt_tokens": 12,
                "completion_tokens": 8,
                "total_tokens": 20
            }
        }),
    );

    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");

    assert_eq!(2, invocation.usage.lines.len());
    assert_eq!(BillingMeter::LlmInputToken, invocation.usage.lines[0].meter);
    assert_eq!(
        BillingMeter::LlmOutputToken,
        invocation.usage.lines[1].meter
    );
}

#[tokio::test]
async fn extracts_openai_streaming_usage_lines_from_sse_chunks() {
    let mut invocation = openai_invocation(Method::POST, "/v1/chat/completions");
    invocation.billing = InvocationBilling {
        mode: BillingMode::Composite,
        meter: Some(BillingMeter::LlmInputToken),
        quantity_source: BillingQuantitySource::StreamingAccumulator,
        pricing_required: true,
        settlement_required: true,
        prepaid_required: false,
    };
    invocation.dispatch = InvocationDispatch::sse_stream();
    invocation.dispatch.response = Some(
        sdkwork_clawrouter_router_service::application::InvocationDispatchResponse::bytes(
            200,
            concat!(
                "data: {\"id\":\"chatcmpl-stream\",\"choices\":[{\"delta\":{\"content\":\"pong\"}}]}\n\n",
                "data: {\"choices\":[],\"usage\":{\"prompt_tokens\":12,\"completion_tokens\":8,\"total_tokens\":20,\"prompt_tokens_details\":{\"cached_tokens\":3}}}\n\n",
                "data: [DONE]\n\n"
            ),
            Some("text/event-stream".to_owned()),
        ),
    );

    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");

    assert_eq!(3, invocation.usage.lines.len());
    assert_eq!(BillingMeter::LlmInputToken, invocation.usage.lines[0].meter);
    assert_eq!("9", invocation.usage.lines[0].quantity.billable_quantity);
    assert_eq!(
        BillingMeter::LlmCacheReadToken,
        invocation.usage.lines[1].meter
    );
    assert_eq!("3", invocation.usage.lines[1].quantity.billable_quantity);
    assert_eq!(
        BillingMeter::LlmOutputToken,
        invocation.usage.lines[2].meter
    );
    assert_eq!("8", invocation.usage.lines[2].quantity.billable_quantity);
}

#[tokio::test]
async fn skips_streaming_usage_extraction_when_sse_has_no_usage_chunk() {
    let mut invocation = openai_invocation(Method::POST, "/v1/chat/completions");
    invocation.billing = InvocationBilling {
        mode: BillingMode::Composite,
        meter: Some(BillingMeter::LlmInputToken),
        quantity_source: BillingQuantitySource::StreamingAccumulator,
        pricing_required: true,
        settlement_required: true,
        prepaid_required: false,
    };
    invocation.dispatch = InvocationDispatch::sse_stream();
    invocation.dispatch.response = Some(
        sdkwork_clawrouter_router_service::application::InvocationDispatchResponse::bytes(
            200,
            "data: {\"choices\":[{\"delta\":{\"content\":\"pong\"}}]}\n\ndata: [DONE]\n\n",
            Some("text/event-stream".to_owned()),
        ),
    );

    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");

    assert!(invocation.usage.lines.is_empty());
}

#[tokio::test]
async fn skips_usage_extraction_for_provider_error_response() {
    let mut invocation = openai_invocation(Method::POST, "/v1/chat/completions");
    invocation.dispatch = InvocationDispatch::json_response(
        400,
        json!({"error": {"message": "bad provider request"}}),
    );

    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");

    assert!(invocation.usage.lines.is_empty());
}

#[tokio::test]
async fn extracts_responses_usage_lines() {
    let mut invocation = openai_invocation(Method::POST, "/v1/responses");
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "id": "resp_123",
            "usage": {
                "input_tokens": 7,
                "output_tokens": 5,
                "total_tokens": 12,
                "input_tokens_details": {"cached_tokens": 2}
            }
        }),
    );

    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");

    assert_eq!(3, invocation.usage.lines.len());
    assert_eq!(BillingMeter::LlmInputToken, invocation.usage.lines[0].meter);
    assert_eq!("5", invocation.usage.lines[0].quantity.billable_quantity);
    assert_eq!(
        BillingMeter::LlmCacheReadToken,
        invocation.usage.lines[1].meter
    );
    assert_eq!("2", invocation.usage.lines[1].quantity.billable_quantity);
    assert_eq!(
        BillingMeter::LlmOutputToken,
        invocation.usage.lines[2].meter
    );
    assert_eq!("5", invocation.usage.lines[2].quantity.billable_quantity);
}

#[tokio::test]
async fn extracts_embeddings_usage_line() {
    let mut invocation = openai_invocation(Method::POST, "/v1/embeddings");
    invocation.billing = InvocationBilling {
        mode: BillingMode::Token,
        meter: Some(BillingMeter::EmbeddingInputToken),
        quantity_source: BillingQuantitySource::ResponseBody,
        pricing_required: true,
        settlement_required: true,
        prepaid_required: false,
    };
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({"usage": {"prompt_tokens": 18, "total_tokens": 18}}),
    );

    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");

    assert_eq!(1, invocation.usage.lines.len());
    assert_eq!(
        BillingMeter::EmbeddingInputToken,
        invocation.usage.lines[0].meter
    );
    assert_eq!("18", invocation.usage.lines[0].quantity.billable_quantity);
}

#[tokio::test]
async fn preserves_fixed_api_request_usage_line() {
    let mut invocation = openai_invocation(Method::POST, "/v1/files");
    invocation.billing = InvocationBilling::api_request(BillingMeter::ApiRequest);

    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");

    assert_eq!(1, invocation.usage.lines.len());
    assert_eq!(BillingMeter::ApiRequest, invocation.usage.lines[0].meter);
    assert_eq!("1", invocation.usage.lines[0].quantity.billable_quantity);
}

#[tokio::test]
async fn extracts_adapter_usage_lines_from_standard_response_shape() {
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/kling/v1/videos/text2video")
            .with_request_id("req-adapter"),
        subject(),
        InvocationResource::model_call(
            "kling.text_to_video",
            "kling.text_to_video",
            RoutingCapability::Video,
            sdkwork_clawrouter_router_service::domain::AiRouteModelRequirement::Optional,
        ),
        InvocationBilling {
            mode: BillingMode::ExternalUsageLine,
            meter: None,
            quantity_source: BillingQuantitySource::AdapterUsageLines,
            pricing_required: true,
            settlement_required: true,
            prepaid_required: false,
        },
    );
    invocation.resource.resource_type = ResourceType::ProviderNativeApi;
    invocation.resource.surface = InvocationSurface::ProviderNative;
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "_gateway_usage": {
                "lines": [
                    {"meter": "api_result", "quantity": "2"},
                    {"meter": "video_output_second", "quantity": "12.5"}
                ]
            }
        }),
    );

    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");

    assert_eq!(2, invocation.usage.lines.len());
    assert_eq!(BillingMeter::ApiResult, invocation.usage.lines[0].meter);
    assert_eq!("2", invocation.usage.lines[0].quantity.billable_quantity);
    assert_eq!(
        BillingMeter::VideoOutputSecond,
        invocation.usage.lines[1].meter
    );
    assert_eq!(
        "12.500000000000",
        invocation.usage.lines[1].quantity.billable_quantity
    );
}

#[tokio::test]
async fn extracts_adapter_usage_lines_from_adapter_invocation_response_wrapper() {
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/kling/v1/videos/text2video")
            .with_request_id("req-adapter-wrapper"),
        subject(),
        InvocationResource::model_call(
            "kling.text_to_video",
            "kling.text_to_video",
            RoutingCapability::Video,
            sdkwork_clawrouter_router_service::domain::AiRouteModelRequirement::Optional,
        ),
        InvocationBilling {
            mode: BillingMode::ExternalUsageLine,
            meter: None,
            quantity_source: BillingQuantitySource::AdapterUsageLines,
            pricing_required: true,
            settlement_required: true,
            prepaid_required: false,
        },
    );
    invocation.resource.resource_type = ResourceType::ProviderNativeApi;
    invocation.resource.surface = InvocationSurface::ProviderNative;
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "statusCode": 202,
            "body": {
                "id": "video-task-1",
                "_gateway_usage": {
                    "lines": [
                        {"meter": "api_result", "quantity": "1"}
                    ]
                }
            }
        }),
    );

    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");

    assert_eq!(1, invocation.usage.lines.len());
    assert_eq!(BillingMeter::ApiResult, invocation.usage.lines[0].meter);
    assert_eq!("1", invocation.usage.lines[0].quantity.billable_quantity);
}

#[tokio::test]
async fn skips_adapter_usage_extraction_when_adapter_wrapper_status_is_not_success() {
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/kling/v1/videos/text2video")
            .with_request_id("req-adapter-wrapper-error"),
        subject(),
        InvocationResource::model_call(
            "kling.text_to_video",
            "kling.text_to_video",
            RoutingCapability::Video,
            sdkwork_clawrouter_router_service::domain::AiRouteModelRequirement::Optional,
        ),
        InvocationBilling {
            mode: BillingMode::ExternalUsageLine,
            meter: None,
            quantity_source: BillingQuantitySource::AdapterUsageLines,
            pricing_required: true,
            settlement_required: true,
            prepaid_required: false,
        },
    );
    invocation.resource.resource_type = ResourceType::ProviderNativeApi;
    invocation.resource.surface = InvocationSurface::ProviderNative;
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "statusCode": 400,
            "body": {
                "error": {"message": "provider rejected request"}
            }
        }),
    );

    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");

    assert!(invocation.usage.lines.is_empty());
}

#[tokio::test]
async fn extracts_image_result_count() {
    let mut invocation = openai_invocation(Method::POST, "/v1/chat/completions");
    invocation.resource.resource_type = ResourceType::Image;
    invocation.billing = InvocationBilling {
        mode: BillingMode::ResultCount,
        meter: Some(BillingMeter::ImageResult),
        quantity_source: BillingQuantitySource::ResponseBody,
        pricing_required: true,
        settlement_required: true,
        prepaid_required: false,
    };
    invocation.dispatch =
        InvocationDispatch::json_response(200, json!({"data": [{"url": "a"}, {"url": "b"}]}));

    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");

    assert_eq!(1, invocation.usage.lines.len());
    assert_eq!(BillingMeter::ImageResult, invocation.usage.lines[0].meter);
    assert_eq!("2", invocation.usage.lines[0].quantity.billable_quantity);
}

#[tokio::test]
async fn extracts_audio_seconds_from_response_body() {
    let mut invocation = openai_invocation(Method::POST, "/v1/chat/completions");
    invocation.resource.resource_type = ResourceType::Audio;
    invocation.billing = InvocationBilling {
        mode: BillingMode::AudioSecond,
        meter: Some(BillingMeter::AudioOutputSecond),
        quantity_source: BillingQuantitySource::ResponseBody,
        pricing_required: true,
        settlement_required: true,
        prepaid_required: false,
    };
    invocation.dispatch =
        InvocationDispatch::json_response(200, json!({"usage": {"audio_seconds": "3.5"}}));

    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");

    assert_eq!(1, invocation.usage.lines.len());
    assert_eq!(
        BillingMeter::AudioOutputSecond,
        invocation.usage.lines[0].meter
    );
    assert_eq!(
        "3.500000000000",
        invocation.usage.lines[0].quantity.billable_quantity
    );
}

#[tokio::test]
async fn free_invocations_do_not_create_usage_lines() {
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::GET, "/health").with_request_id("req-free"),
        InvocationSubject::anonymous_free(10, 20),
        InvocationResource::free_endpoint(
            "internal/health",
            "internal.health",
            RoutingCapability::Network,
        ),
        InvocationBilling::free(),
    );

    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");

    assert!(invocation.usage.lines.is_empty());
}
