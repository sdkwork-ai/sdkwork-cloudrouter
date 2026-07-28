use axum::http::Method;
use sdkwork_clawrouter_router_service::application::{
    AuthenticatedApiKeyContext, Invocation, InvocationBody, InvocationClassificationRequest,
    InvocationDispatch, InvocationErrorKind, InvocationInterceptor, InvocationRequest,
    InvocationResourceClassifier, InvocationShape, OpenAiResourceClassifier,
    PayloadExtractionInterceptor, ProviderNativeResourceClassifier,
};
use sdkwork_clawrouter_router_service::domain::RoutingCapability;
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

fn classified_invocation(method: Method, path: &str, body: InvocationBody) -> Invocation {
    let classification = OpenAiResourceClassifier::default()
        .classify(&InvocationClassificationRequest::new(method.clone(), path))
        .expect("classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut request = InvocationRequest::new(method, path)
        .with_request_id("req-payload")
        .with_body(body);
    if let Some((_, query)) = path.split_once('?') {
        request = request.with_query(query);
    }
    let mut invocation = Invocation::new(request, test_subject(), resource, billing);
    invocation.routing = routing;
    invocation
}

fn provider_native_invocation(supplier_code: &str, path: &str, body: InvocationBody) -> Invocation {
    let classification = ProviderNativeResourceClassifier::default()
        .classify(
            &InvocationClassificationRequest::new(Method::POST, path)
                .with_supplier_code(supplier_code)
                .with_capability(RoutingCapability::Video),
        )
        .expect("provider native classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, path)
            .with_request_id("req-provider-native-payload")
            .with_body(body),
        test_subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation
}

#[tokio::test]
async fn extracts_model_and_stream_from_json_body() {
    let mut invocation = classified_invocation(
        Method::POST,
        "/v1/chat/completions",
        InvocationBody::json(json!({
            "model": "gpt-4o-mini",
            "stream": true,
            "messages": [{"role": "user", "content": "ping"}]
        })),
    );

    PayloadExtractionInterceptor::default()
        .before(&mut invocation)
        .await
        .expect("payload extraction");

    assert_eq!(
        Some("gpt-4o-mini"),
        invocation.resource.requested_model.as_deref()
    );
    assert_eq!(
        InvocationDispatch::sse_stream(),
        invocation.dispatch,
        "stream=true must switch the invocation shape to SSE"
    );
}

#[tokio::test]
async fn extracts_model_from_query_when_body_is_empty() {
    let mut invocation = classified_invocation(
        Method::POST,
        "/v1/chat/completions?model=gpt-4o-mini",
        InvocationBody::Empty,
    );

    PayloadExtractionInterceptor::default()
        .before(&mut invocation)
        .await
        .expect("payload extraction");

    assert_eq!(
        Some("gpt-4o-mini"),
        invocation.resource.requested_model.as_deref()
    );
}

#[tokio::test]
async fn preserves_object_and_parent_ids_from_classification() {
    let mut file = classified_invocation(
        Method::GET,
        "/v1/files/file_123/content",
        InvocationBody::Empty,
    );
    let mut thread_run = classified_invocation(
        Method::POST,
        "/v1/threads/thread_123/runs",
        InvocationBody::json(json!({"model": "gpt-4o-mini"})),
    );

    PayloadExtractionInterceptor::default()
        .before(&mut file)
        .await
        .expect("file payload extraction");
    PayloadExtractionInterceptor::default()
        .before(&mut thread_run)
        .await
        .expect("thread payload extraction");

    assert_eq!(Some("file_123"), file.resource.resource_id.as_deref());
    assert_eq!(
        Some("file_123"),
        file.routing
            .sticky
            .as_ref()
            .and_then(|sticky| sticky.object_id.as_deref())
    );
    assert_eq!(
        Some("thread_123"),
        thread_run.resource.parent_resource_id.as_deref()
    );
    assert_eq!(
        Some("thread_123"),
        thread_run
            .routing
            .sticky
            .as_ref()
            .and_then(|sticky| sticky.parent_object_id.as_deref())
    );
}

#[tokio::test]
async fn extracts_provider_native_model_metadata_without_changing_resource_identity() {
    let mut invocation = provider_native_invocation(
        "kling",
        "/v1/videos/text2video",
        InvocationBody::json(json!({
            "model": "kling-v2",
            "prompt": "city skyline"
        })),
    );

    PayloadExtractionInterceptor::default()
        .before(&mut invocation)
        .await
        .expect("provider native payload extraction");

    assert_eq!("kling.text_to_video", invocation.resource.route_key);
    assert_eq!("kling.text_to_video", invocation.resource.api_code);
    assert_eq!(
        Some("kling-v2"),
        invocation.resource.requested_model.as_deref()
    );
    assert_eq!(
        Some("kling-v2"),
        invocation.resource.provider_native_model.as_deref()
    );
    assert_eq!(
        Some("kling/kling-v2"),
        invocation.resource.requested_model_catalog_key.as_deref()
    );
}

#[tokio::test]
async fn preserves_provider_native_model_metadata_extracted_from_standard_path() {
    let mut invocation = provider_native_invocation(
        "google",
        "/v1beta/models/gemini-2.5-flash:generateContent",
        InvocationBody::json(json!({
            "contents": [{"role": "user", "parts": [{"text": "ping"}]}]
        })),
    );

    PayloadExtractionInterceptor::default()
        .before(&mut invocation)
        .await
        .expect("provider native path model payload extraction");

    assert_eq!("gemini.generate_content", invocation.resource.route_key);
    assert_eq!(
        Some("gemini-2.5-flash"),
        invocation.resource.requested_model.as_deref()
    );
    assert_eq!(
        Some("gemini-2.5-flash"),
        invocation.resource.provider_native_model.as_deref()
    );
    assert_eq!(
        Some("google/gemini-2.5-flash"),
        invocation.resource.requested_model_catalog_key.as_deref()
    );
}

#[tokio::test]
async fn required_model_missing_fails_before_routing() {
    let mut invocation = classified_invocation(
        Method::POST,
        "/v1/chat/completions",
        InvocationBody::json(json!({"messages": [{"role": "user", "content": "ping"}]})),
    );

    let error = PayloadExtractionInterceptor::default()
        .before(&mut invocation)
        .await
        .expect_err("model required");

    assert_eq!(InvocationErrorKind::InvalidRequest, error.kind);
    assert!(
        error.message.contains("model is required"),
        "actual error: {}",
        error.message
    );
    assert_eq!(InvocationShape::Json, invocation.dispatch.invocation_shape);
}
