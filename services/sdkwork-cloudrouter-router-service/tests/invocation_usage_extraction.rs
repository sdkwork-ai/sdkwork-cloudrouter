use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor, BillingQuantitySource,
    Invocation, InvocationBilling, InvocationClassificationRequest, InvocationDispatch,
    InvocationInterceptor, InvocationPricingQuote, InvocationRequest, InvocationResource,
    InvocationResourceClassifier, InvocationSubject, InvocationSurface, OpenAiResourceClassifier,
    PriceResolutionStatus, PricingAuditSnapshot, ProviderNativeResourceClassifier,
    ResourceBillability, ResourceType, UsageExtractionInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::{
    BillingMeter, Money, ResourceDefinition, RoutingCapability,
};
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

fn api_request_quote() -> InvocationPricingQuote {
    let price = Money::usd("0.010000").expect("valid test price");
    InvocationPricingQuote {
        catalog_key: "provider/api".to_owned(),
        requested_model: "provider-api".to_owned(),
        supplier_code: Some("provider".to_owned()),
        account_id: Some(100),
        region_code: "global".to_owned(),
        meter: BillingMeter::ApiRequest,
        unit_size: "1".to_owned(),
        official_reference_unit_price: price.clone(),
        raw_upstream_cost_unit_price: Some(price.clone()),
        procurement_cost_unit_price: Some(price.clone()),
        account_contract_cost_multiplier: Some("1.000000".to_owned()),
        account_group_cost_multiplier: Some("1.000000".to_owned()),
        procurement_cost_multiplier: Some("1.000000".to_owned()),
        customer_charge_before_sale_multiplier: price.clone(),
        customer_charge_unit_price: price,
        sale_multiplier: "1.000000".to_owned(),
        reference_multiplier: "1.000000".to_owned(),
        pricing_plan_code: "standard".to_owned(),
        group_code: "standard-group".to_owned(),
        rate_metadata: None,
        billing: None,
        pricing_audit_snapshot: PricingAuditSnapshot {
            resource: ResourceDefinition::new(
                "provider/api",
                BillingMeter::ApiRequest,
                chrono::Utc::now(),
            ),
            status: PriceResolutionStatus::Quoted,
            billability: ResourceBillability::Chargeable,
            rate_identity: None,
            strategy: None,
            failure: None,
        },
    }
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
        sdkwork_cloudrouter_router_service::application::InvocationDispatchResponse::bytes(
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
        sdkwork_cloudrouter_router_service::application::InvocationDispatchResponse::bytes(
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
    invocation.usage.add_pricing_quote(api_request_quote());
    invocation.dispatch = InvocationDispatch::json_response(200, json!({"id": "file-1"}));

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
            sdkwork_cloudrouter_router_service::domain::AiRouteModelRequirement::Optional,
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
            sdkwork_cloudrouter_router_service::domain::AiRouteModelRequirement::Optional,
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
            sdkwork_cloudrouter_router_service::domain::AiRouteModelRequirement::Optional,
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
async fn fixed_request_requires_a_successful_response_and_chargeable_price() {
    let mut invocation = openai_invocation(Method::POST, "/v1/files");
    invocation.billing = InvocationBilling::api_request(BillingMeter::ApiRequest);
    invocation.usage.add_pricing_quote(api_request_quote());
    invocation.dispatch = InvocationDispatch::json_response(500, json!({"error": "failed"}));

    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("failed response usage extraction");
    assert!(invocation.usage.lines.is_empty());

    invocation.dispatch = InvocationDispatch::json_response(200, json!({"id": "file-1"}));
    invocation.usage.pricing_quotes.clear();
    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("unpriced response usage extraction");
    assert!(invocation.usage.lines.is_empty());

    invocation.usage.add_pricing_quote(api_request_quote());
    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("chargeable response usage extraction");
    assert_eq!(1, invocation.usage.lines.len());
    assert_eq!(BillingMeter::ApiRequest, invocation.usage.lines[0].meter);
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

fn provider_native_invocation(method: Method, path: &str, supplier_code: &str) -> Invocation {
    let classification = ProviderNativeResourceClassifier
        .classify(
            &InvocationClassificationRequest::new(method.clone(), path)
                .with_supplier_code(supplier_code),
        )
        .expect("provider native classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(method, path).with_request_id("req-provider-native-usage"),
        subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation
}

#[tokio::test]
async fn extracts_anthropic_messages_token_lines_from_non_streaming_body() {
    // ProviderNative 非流式 LLM 端点（anthropic.messages）修复后走 Composite
    // 记账：非流式 body 的 token 量必须按 Input/CacheRead/Output 三行结算，
    // 而不是塌缩成单条 ApiRequest。
    let mut invocation =
        provider_native_invocation(Method::POST, "/anthropic/v1/messages", "anthropic");
    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");
    assert_eq!(
        BillingQuantitySource::Composite,
        invocation.billing.quantity_source
    );
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "id": "msg_1",
            "role": "assistant",
            "content": [{"type": "text", "text": "hi"}],
            "usage": {
                "input_tokens": 3000,
                "cache_read_input_tokens": 1000,
                "output_tokens": 42
            }
        }),
    );

    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");

    assert_eq!(3, invocation.usage.lines.len());
    assert_eq!(BillingMeter::LlmInputToken, invocation.usage.lines[0].meter);
    assert_eq!("3000", invocation.usage.lines[0].quantity.billable_quantity);
    assert_eq!(
        BillingMeter::LlmCacheReadToken,
        invocation.usage.lines[1].meter
    );
    assert_eq!("1000", invocation.usage.lines[1].quantity.billable_quantity);
    assert_eq!(
        BillingMeter::LlmOutputToken,
        invocation.usage.lines[2].meter
    );
    assert_eq!("42", invocation.usage.lines[2].quantity.billable_quantity);
}

#[tokio::test]
async fn extracts_gemini_embed_content_token_line_from_usage_metadata() {
    // gemini.embedContent 修复后按 EmbeddingInputToken 的 Token/ResponseBody
    // 结算：usageMetadata.promptTokenCount 必须被识别为计费数量。
    let mut invocation = provider_native_invocation(
        Method::POST,
        "/google/v1beta/models/gemini-embedding-001:embedContent",
        "google",
    );
    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");
    assert_eq!(
        BillingQuantitySource::ResponseBody,
        invocation.billing.quantity_source
    );
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "embedding": {"values": [0.1, 0.2, 0.3]},
            "usageMetadata": {"promptTokenCount": 210}
        }),
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
    assert_eq!("210", invocation.usage.lines[0].quantity.billable_quantity);
}
