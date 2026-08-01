use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::extract::State;
use axum::http::header::CONTENT_TYPE;
use axum::http::{HeaderMap, StatusCode};
use axum::routing::post;
use axum::{Json, Router};
use sdkwork_clawrouter_router_service::domain::ProviderAuthProfile;
use sdkwork_clawrouter_router_service::infrastructure::provider::{
    OpenAiCompatibleChatCompletionStreamRelay, UpstreamProviderEndpoint,
};
use sdkwork_clawrouter_router_service::ports::{
    ChatCompletionRelayRequest, ChatCompletionStreamRelay,
};
use serde_json::json;

#[derive(Debug, Default)]
struct CapturedUpstreamRequest {
    authorization: Option<String>,
    body: serde_json::Value,
}

#[tokio::test]
async fn openai_compatible_chat_stream_relay_uses_provider_model_and_passes_through_sse_body() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/chat/completions", post(capture_chat_stream))
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let endpoint = UpstreamProviderEndpoint::for_local_development(
        format!("http://{addr}"),
        "sk-upstream-provider-secret",
    )
    .unwrap();
    let relay = OpenAiCompatibleChatCompletionStreamRelay::new(endpoint);
    let request_body = json!({
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": "ping"}],
        "temperature": 0.2,
        "stream": true,
        "stream_options": {
            "include_usage": false,
            "provider_metadata": "keep"
        }
    });
    let response = relay
        .create_chat_completion_stream(ChatCompletionRelayRequest {
            api_key_id: 101,
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
            model: "gpt-4o-mini".to_owned(),
            supplier_code: "openrouter".to_owned(),
            provider_account_id: 3001,
            provider_region_code: "global".to_owned(),
            provider_model: "gpt-4o-mini".to_owned(),
            provider_base_url: Some(format!("http://{addr}")),
            provider_secret_ref: Some("vault://providers/openrouter/account/main".to_owned()),
            provider_auth_profile: ProviderAuthProfile::bearer(),
            provider_timeout_ms: None,
            provider_retry_policy: None,
            request_body: request_body.clone(),
        })
        .await
        .unwrap();

    assert_eq!(200, response.status_code);
    assert_eq!(Some("text/event-stream".to_owned()), response.content_type);
    let body = axum::body::to_bytes(response.body, usize::MAX)
        .await
        .unwrap();
    let body = String::from_utf8(body.to_vec()).unwrap();
    assert!(body.contains("chatcmpl-upstream-stream"));
    assert!(body.contains("data: [DONE]"));

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("Bearer sk-upstream-provider-secret".to_owned()),
        captured[0].authorization
    );
    let mut expected_body = request_body;
    expected_body["model"] = json!("gpt-4o-mini");
    expected_body["stream_options"]["include_usage"] = json!(true);
    assert_eq!(expected_body, captured[0].body);
}

#[tokio::test]
async fn openai_compatible_chat_stream_relay_does_not_retry_retryable_upstream_status() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1/chat/completions",
            post(capture_unavailable_chat_stream),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let endpoint = UpstreamProviderEndpoint::for_local_development(
        format!("http://{addr}"),
        "sk-upstream-provider-secret",
    )
    .unwrap();
    let relay = OpenAiCompatibleChatCompletionStreamRelay::new(endpoint);
    let response = relay
        .create_chat_completion_stream(ChatCompletionRelayRequest {
            api_key_id: 101,
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
            model: "gpt-4o-mini".to_owned(),
            supplier_code: "openrouter".to_owned(),
            provider_account_id: 3001,
            provider_region_code: "global".to_owned(),
            provider_model: "gpt-4o-mini".to_owned(),
            provider_base_url: Some(format!("http://{addr}")),
            provider_secret_ref: Some("vault://providers/openrouter/account/main".to_owned()),
            provider_auth_profile: ProviderAuthProfile::bearer(),
            provider_timeout_ms: None,
            provider_retry_policy: None,
            request_body: json!({
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": "ping"}],
                "stream": true
            }),
        })
        .await
        .unwrap();

    assert_eq!(503, response.status_code);
    let body = axum::body::to_bytes(response.body, usize::MAX)
        .await
        .unwrap();
    let body = String::from_utf8(body.to_vec()).unwrap();
    assert!(body.contains("provider_temporarily_unavailable"));
    assert!(!body.contains("sk-upstream-provider-secret"));

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
}

async fn capture_chat_stream(
    State(captured): State<Arc<Mutex<Vec<CapturedUpstreamRequest>>>>,
    headers: HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> (
    StatusCode,
    [(axum::http::HeaderName, &'static str); 1],
    Body,
) {
    captured.lock().unwrap().push(CapturedUpstreamRequest {
        authorization: headers
            .get("authorization")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        body,
    });
    (
        StatusCode::OK,
        [(CONTENT_TYPE, "text/event-stream")],
        Body::from(
            "data: {\"id\":\"chatcmpl-upstream-stream\",\"choices\":[{\"delta\":{\"content\":\"pong\"}}]}\n\ndata: [DONE]\n\n",
        ),
    )
}

async fn capture_unavailable_chat_stream(
    State(captured): State<Arc<Mutex<Vec<CapturedUpstreamRequest>>>>,
    headers: HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> (
    StatusCode,
    [(axum::http::HeaderName, &'static str); 1],
    Body,
) {
    captured.lock().unwrap().push(CapturedUpstreamRequest {
        authorization: headers
            .get("authorization")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        body,
    });
    (
        StatusCode::SERVICE_UNAVAILABLE,
        [(CONTENT_TYPE, "application/json")],
        Body::from(
            "{\"error\":{\"code\":\"provider_temporarily_unavailable\",\"message\":\"retry later\"}}",
        ),
    )
}
