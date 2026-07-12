use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::routing::post;
use axum::{Json, Router};
use sdkwork_clawrouter_router_service::domain::{
    ProviderAuthHeader, ProviderAuthProfile, ProviderRetryPolicy,
};
use sdkwork_clawrouter_router_service::infrastructure::provider::{
    OpenAiCompatibleChatCompletionRelay, UpstreamProviderEndpoint,
};
use sdkwork_clawrouter_router_service::ports::{
    ChatCompletionRelay, ChatCompletionRelayRequest, ChatCompletionRelayResponse,
};
use serde_json::json;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

const SLOW_UPSTREAM_RESPONSE_DELAY_MILLIS: u64 = 50;
const SLOW_UPSTREAM_BODY_TIMEOUT_MILLIS: u64 = 300;
const SLOW_UPSTREAM_BODY_DELAY_MILLIS: u64 = 450;

#[derive(Debug, Default)]
struct CapturedUpstreamRequest {
    authorization: Option<String>,
    api_key: Option<String>,
    account_tier: Option<String>,
    body: serde_json::Value,
}

#[derive(Debug, Default)]
struct RetryingProviderState {
    requests: Vec<CapturedUpstreamRequest>,
}

#[tokio::test]
async fn openai_compatible_relay_uses_provider_model_and_upstream_secret() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/chat/completions", post(capture_chat_completion))
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let endpoint =
        UpstreamProviderEndpoint::new(format!("http://{addr}"), "sk-upstream-provider-secret")
            .unwrap();
    let relay = OpenAiCompatibleChatCompletionRelay::new(endpoint);
    let request_body = json!({
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": "ping"}],
        "temperature": 0.2,
        "top_p": 0.9,
        "tool_choice": "auto",
        "metadata": {"trace": "client-request"},
        "stream": false
    });
    let response = relay
        .create_chat_completion(ChatCompletionRelayRequest {
            api_key_id: 101,
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
            model: "gpt-4o-mini".to_owned(),
            provider_code: "openrouter".to_owned(),
            provider_channel_id: 3001,
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

    assert_eq!(
        ChatCompletionRelayResponse::json(
            200,
            json!({
                "id": "chatcmpl-upstream",
                "object": "chat.completion",
                "model": "gpt-4o-mini",
                "choices": [
                    {
                        "index": 0,
                        "message": {"role": "assistant", "content": "pong"},
                        "finish_reason": "stop"
                    }
                ]
            }),
        ),
        response
    );

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("Bearer sk-upstream-provider-secret".to_owned()),
        captured[0].authorization
    );
    let mut expected_body = request_body;
    expected_body["model"] = json!("gpt-4o-mini");
    assert_eq!(expected_body, captured[0].body);
}

#[tokio::test]
async fn openai_compatible_relay_uses_provider_account_header_auth_profile() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/chat/completions", post(capture_chat_completion))
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let mut auth_profile = ProviderAuthProfile::header("x-api-key");
    auth_profile.default_headers.push(ProviderAuthHeader {
        name: "x-account-tier".to_owned(),
        value: "premium".to_owned(),
    });
    let endpoint =
        UpstreamProviderEndpoint::new(format!("http://{addr}"), "sk-upstream-provider-secret")
            .unwrap()
            .with_auth_profile(auth_profile.clone());
    let relay = OpenAiCompatibleChatCompletionRelay::new(endpoint);
    let response = relay
        .create_chat_completion(ChatCompletionRelayRequest {
            api_key_id: 101,
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            group_id: 10,
            group_code: "premium-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
            model: "gpt-4o-mini".to_owned(),
            provider_code: "azure_openai".to_owned(),
            provider_channel_id: 3002,
            provider_region_code: "global".to_owned(),
            provider_model: "gpt-4o-mini".to_owned(),
            provider_base_url: Some(format!("http://{addr}")),
            provider_secret_ref: Some("vault://providers/azure/account/premium".to_owned()),
            provider_auth_profile: auth_profile,
            provider_timeout_ms: None,
            provider_retry_policy: None,
            request_body: json!({
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": "ping"}],
                "stream": false
            }),
        })
        .await
        .unwrap();

    assert_eq!(200, response.status_code);
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(None, captured[0].authorization);
    assert_eq!(
        Some("sk-upstream-provider-secret"),
        captured[0].api_key.as_deref()
    );
    assert_eq!(Some("premium"), captured[0].account_tier.as_deref());
    assert_eq!("gpt-4o-mini", captured[0].body["model"]);
}

#[tokio::test]
async fn openai_compatible_relay_does_not_duplicate_openai_v1_base_path() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/openai/v1/chat/completions", post(capture_chat_completion))
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let endpoint = UpstreamProviderEndpoint::new(
        format!("http://{addr}/openai/v1"),
        "sk-upstream-provider-secret",
    )
    .unwrap();
    let relay = OpenAiCompatibleChatCompletionRelay::new(endpoint);
    let response = relay
        .create_chat_completion(ChatCompletionRelayRequest {
            api_key_id: 101,
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
            model: "gpt-4o-mini".to_owned(),
            provider_code: "openrouter".to_owned(),
            provider_channel_id: 3001,
            provider_region_code: "global".to_owned(),
            provider_model: "gpt-4o-mini".to_owned(),
            provider_base_url: Some(format!("http://{addr}/openai/v1")),
            provider_secret_ref: Some("vault://providers/openrouter/account/main".to_owned()),
            provider_auth_profile: ProviderAuthProfile::bearer(),
            provider_timeout_ms: None,
            provider_retry_policy: None,
            request_body: json!({
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": "ping"}],
                "stream": false
            }),
        })
        .await
        .unwrap();

    assert_eq!(200, response.status_code);
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!("gpt-4o-mini", captured[0].body["model"]);
}

#[tokio::test]
async fn openai_compatible_relay_times_out_slow_upstream_responses_without_leaking_secret() {
    let provider = Router::new().route(
        "/v1/chat/completions",
        post(|| async {
            tokio::time::sleep(Duration::from_millis(SLOW_UPSTREAM_RESPONSE_DELAY_MILLIS)).await;
            (StatusCode::OK, Json(json!({"id": "late-upstream"})))
        }),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let endpoint =
        UpstreamProviderEndpoint::new(format!("http://{addr}"), "sk-upstream-provider-secret")
            .unwrap();
    let relay = OpenAiCompatibleChatCompletionRelay::with_response_timeout(
        endpoint,
        Duration::from_millis(20),
    );
    let error = relay
        .create_chat_completion(ChatCompletionRelayRequest {
            api_key_id: 101,
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
            model: "gpt-4o-mini".to_owned(),
            provider_code: "openrouter".to_owned(),
            provider_channel_id: 3001,
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
                "stream": false
            }),
        })
        .await
        .unwrap_err();

    assert!(error
        .to_string()
        .contains("upstream provider response timed out"));
    assert!(!error.to_string().contains("sk-upstream-provider-secret"));
}

#[tokio::test]
async fn openai_compatible_relay_retries_retryable_upstream_status_once_without_leaking_secret() {
    let state = Arc::new(Mutex::new(RetryingProviderState::default()));
    let provider = Router::new()
        .route("/v1/chat/completions", post(capture_flaky_chat_completion))
        .with_state(Arc::clone(&state));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let endpoint =
        UpstreamProviderEndpoint::new(format!("http://{addr}"), "sk-upstream-provider-secret")
            .unwrap();
    let relay = OpenAiCompatibleChatCompletionRelay::new(endpoint);
    let response = relay
        .create_chat_completion(ChatCompletionRelayRequest {
            api_key_id: 101,
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
            model: "gpt-4o-mini".to_owned(),
            provider_code: "openrouter".to_owned(),
            provider_channel_id: 3001,
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
                "stream": false
            }),
        })
        .await
        .unwrap();

    assert_eq!(200, response.status_code);
    assert_eq!("chatcmpl-upstream-retry", response.body["id"]);
    assert!(!response
        .body
        .to_string()
        .contains("sk-upstream-provider-secret"));

    let state = state.lock().unwrap();
    assert_eq!(2, state.requests.len());
    assert!(state
        .requests
        .iter()
        .all(|request| request.authorization.as_deref()
            == Some("Bearer sk-upstream-provider-secret")));
    assert!(state
        .requests
        .iter()
        .all(|request| request.body["model"] == "gpt-4o-mini"));
}

#[tokio::test]
async fn openai_compatible_relay_uses_request_retry_policy_for_non_stream_json_attempts() {
    let state = Arc::new(Mutex::new(RetryingProviderState::default()));
    let provider = Router::new()
        .route(
            "/v1/chat/completions",
            post(capture_twice_flaky_chat_completion),
        )
        .with_state(Arc::clone(&state));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let endpoint =
        UpstreamProviderEndpoint::new(format!("http://{addr}"), "sk-upstream-provider-secret")
            .unwrap();
    let relay = OpenAiCompatibleChatCompletionRelay::new(endpoint);
    let response = relay
        .create_chat_completion(ChatCompletionRelayRequest {
            api_key_id: 101,
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
            model: "gpt-4o-mini".to_owned(),
            provider_code: "openrouter".to_owned(),
            provider_channel_id: 3001,
            provider_region_code: "global".to_owned(),
            provider_model: "gpt-4o-mini".to_owned(),
            provider_base_url: Some(format!("http://{addr}")),
            provider_secret_ref: Some("vault://providers/openrouter/account/main".to_owned()),
            provider_auth_profile: ProviderAuthProfile::bearer(),
            provider_timeout_ms: None,
            provider_retry_policy: Some(ProviderRetryPolicy::new(3, vec![503], 0).unwrap()),
            request_body: json!({
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": "ping"}],
                "stream": false
            }),
        })
        .await
        .unwrap();

    assert_eq!(200, response.status_code);
    assert_eq!("chatcmpl-upstream-retry", response.body["id"]);

    let state = state.lock().unwrap();
    assert_eq!(3, state.requests.len());
}

#[tokio::test]
async fn openai_compatible_relay_uses_configured_retryable_statuses_without_default_fallback() {
    let state = Arc::new(Mutex::new(RetryingProviderState::default()));
    let provider = Router::new()
        .route(
            "/v1/chat/completions",
            post(capture_server_error_chat_completion),
        )
        .with_state(Arc::clone(&state));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let endpoint =
        UpstreamProviderEndpoint::new(format!("http://{addr}"), "sk-upstream-provider-secret")
            .unwrap();
    let relay = OpenAiCompatibleChatCompletionRelay::new(endpoint);
    let response = relay
        .create_chat_completion(ChatCompletionRelayRequest {
            api_key_id: 101,
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
            model: "gpt-4o-mini".to_owned(),
            provider_code: "openrouter".to_owned(),
            provider_channel_id: 3001,
            provider_region_code: "global".to_owned(),
            provider_model: "gpt-4o-mini".to_owned(),
            provider_base_url: Some(format!("http://{addr}")),
            provider_secret_ref: Some("vault://providers/openrouter/account/main".to_owned()),
            provider_auth_profile: ProviderAuthProfile::bearer(),
            provider_timeout_ms: None,
            provider_retry_policy: Some(ProviderRetryPolicy::new(3, vec![503], 0).unwrap()),
            request_body: json!({
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": "ping"}],
                "stream": false
            }),
        })
        .await
        .unwrap();

    assert_eq!(500, response.status_code);
    assert_eq!(
        "provider_error",
        response.body["error"]["code"].as_str().unwrap()
    );

    let state = state.lock().unwrap();
    assert_eq!(1, state.requests.len());
}

#[tokio::test]
async fn openai_compatible_relay_does_not_retry_non_retryable_upstream_status() {
    let state = Arc::new(Mutex::new(RetryingProviderState::default()));
    let provider = Router::new()
        .route(
            "/v1/chat/completions",
            post(capture_unauthorized_chat_completion),
        )
        .with_state(Arc::clone(&state));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let endpoint =
        UpstreamProviderEndpoint::new(format!("http://{addr}"), "sk-upstream-provider-secret")
            .unwrap();
    let relay = OpenAiCompatibleChatCompletionRelay::new(endpoint);
    let response = relay
        .create_chat_completion(ChatCompletionRelayRequest {
            api_key_id: 101,
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
            model: "gpt-4o-mini".to_owned(),
            provider_code: "openrouter".to_owned(),
            provider_channel_id: 3001,
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
                "stream": false
            }),
        })
        .await
        .unwrap();

    assert_eq!(401, response.status_code);
    assert_eq!(
        "invalid_api_key",
        response.body["error"]["code"].as_str().unwrap()
    );

    let state = state.lock().unwrap();
    assert_eq!(1, state.requests.len());
}

#[tokio::test]
async fn openai_compatible_relay_uses_request_provider_timeout_over_runtime_default() {
    let provider = Router::new().route(
        "/v1/chat/completions",
        post(|| async {
            tokio::time::sleep(Duration::from_millis(SLOW_UPSTREAM_RESPONSE_DELAY_MILLIS)).await;
            (StatusCode::OK, Json(json!({"id": "late-upstream"})))
        }),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let endpoint =
        UpstreamProviderEndpoint::new(format!("http://{addr}"), "sk-upstream-provider-secret")
            .unwrap();
    let relay = OpenAiCompatibleChatCompletionRelay::with_response_timeout(
        endpoint,
        Duration::from_secs(5),
    );
    let error = relay
        .create_chat_completion(ChatCompletionRelayRequest {
            api_key_id: 101,
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
            model: "gpt-4o-mini".to_owned(),
            provider_code: "openrouter".to_owned(),
            provider_channel_id: 3001,
            provider_region_code: "global".to_owned(),
            provider_model: "gpt-4o-mini".to_owned(),
            provider_base_url: Some(format!("http://{addr}")),
            provider_secret_ref: Some("vault://providers/openrouter/account/main".to_owned()),
            provider_auth_profile: ProviderAuthProfile::bearer(),
            provider_timeout_ms: Some(20),
            provider_retry_policy: None,
            request_body: json!({
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": "ping"}],
                "stream": false
            }),
        })
        .await
        .unwrap_err();

    assert!(error
        .to_string()
        .contains("upstream provider response timed out"));
    assert!(!error.to_string().contains("sk-upstream-provider-secret"));
}

#[tokio::test]
async fn openai_compatible_relay_times_out_slow_upstream_bodies_without_leaking_secret() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        let (mut socket, _) = listener.accept().await.unwrap();
        let mut buffer = [0_u8; 2048];
        let _ = socket.read(&mut buffer).await.unwrap();
        socket
            .write_all(
                b"HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: 27\r\n\r\n",
            )
            .await
            .unwrap();
        socket.flush().await.unwrap();
        // Keep the header/body gap comfortably above the timeout and expected jitter;
        // this test targets body timeout handling after response headers arrive.
        tokio::time::sleep(Duration::from_millis(SLOW_UPSTREAM_BODY_DELAY_MILLIS)).await;
        socket
            .write_all(br#"{"id":"late-body-upstream"}"#)
            .await
            .unwrap();
    });

    let endpoint =
        UpstreamProviderEndpoint::new(format!("http://{addr}"), "sk-upstream-provider-secret")
            .unwrap();
    let relay = OpenAiCompatibleChatCompletionRelay::with_response_timeout(
        endpoint,
        Duration::from_millis(SLOW_UPSTREAM_BODY_TIMEOUT_MILLIS),
    );
    let error = relay
        .create_chat_completion(ChatCompletionRelayRequest {
            api_key_id: 101,
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
            model: "gpt-4o-mini".to_owned(),
            provider_code: "openrouter".to_owned(),
            provider_channel_id: 3001,
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
                "stream": false
            }),
        })
        .await
        .unwrap_err();

    assert!(error
        .to_string()
        .contains("upstream provider body timed out"));
    assert!(!error.to_string().contains("sk-upstream-provider-secret"));
}

#[test]
fn upstream_endpoint_debug_redacts_provider_secret() {
    let endpoint =
        UpstreamProviderEndpoint::new("http://127.0.0.1:8080", "sk-upstream-provider-secret")
            .unwrap();

    assert!(!format!("{endpoint:?}").contains("sk-upstream-provider-secret"));
}

#[test]
fn upstream_endpoint_accepts_https_provider_urls_for_production_egress() {
    let endpoint = UpstreamProviderEndpoint::new(
        "https://api.openai.example/v1",
        "sk-upstream-provider-secret",
    )
    .unwrap();

    let debug = format!("{endpoint:?}");
    assert!(debug.contains("https://api.openai.example/v1"));
    assert!(!debug.contains("sk-upstream-provider-secret"));
}

#[test]
fn upstream_endpoint_rejects_invalid_or_unsupported_base_url_before_requests() {
    let invalid =
        UpstreamProviderEndpoint::new("not-a-url", "sk-upstream-provider-secret").unwrap_err();
    assert!(invalid.to_string().contains("absolute http or https"));
    assert!(!invalid.to_string().contains("sk-upstream-provider-secret"));

    let unsupported =
        UpstreamProviderEndpoint::new("ftp://127.0.0.1:8080", "sk-upstream-provider-secret")
            .unwrap_err();
    assert!(unsupported
        .to_string()
        .contains("http or https provider URL"));
    assert!(!unsupported
        .to_string()
        .contains("sk-upstream-provider-secret"));
}

async fn capture_chat_completion(
    State(captured): State<Arc<Mutex<Vec<CapturedUpstreamRequest>>>>,
    headers: HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    captured.lock().unwrap().push(CapturedUpstreamRequest {
        authorization: headers
            .get("authorization")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        api_key: headers
            .get("x-api-key")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        account_tier: headers
            .get("x-account-tier")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        body,
    });
    (
        StatusCode::OK,
        Json(json!({
            "id": "chatcmpl-upstream",
            "object": "chat.completion",
            "model": "gpt-4o-mini",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": "pong"},
                    "finish_reason": "stop"
                }
            ]
        })),
    )
}

async fn capture_flaky_chat_completion(
    State(state): State<Arc<Mutex<RetryingProviderState>>>,
    headers: HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    let mut state = state.lock().unwrap();
    state.requests.push(CapturedUpstreamRequest {
        authorization: headers
            .get("authorization")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        api_key: headers
            .get("x-api-key")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        account_tier: headers
            .get("x-account-tier")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        body,
    });
    if state.requests.len() == 1 {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({
                "error": {
                    "code": "provider_temporarily_unavailable",
                    "message": "retry later"
                }
            })),
        );
    }

    (
        StatusCode::OK,
        Json(json!({
            "id": "chatcmpl-upstream-retry",
            "object": "chat.completion",
            "model": "gpt-4o-mini",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": "pong"},
                    "finish_reason": "stop"
                }
            ]
        })),
    )
}

async fn capture_twice_flaky_chat_completion(
    State(state): State<Arc<Mutex<RetryingProviderState>>>,
    headers: HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    let mut state = state.lock().unwrap();
    state.requests.push(CapturedUpstreamRequest {
        authorization: headers
            .get("authorization")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        api_key: headers
            .get("x-api-key")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        account_tier: headers
            .get("x-account-tier")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        body,
    });
    if state.requests.len() <= 2 {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({
                "error": {
                    "code": "provider_temporarily_unavailable",
                    "message": "retry later"
                }
            })),
        );
    }

    (
        StatusCode::OK,
        Json(json!({
            "id": "chatcmpl-upstream-retry",
            "object": "chat.completion",
            "model": "gpt-4o-mini",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": "pong"},
                    "finish_reason": "stop"
                }
            ]
        })),
    )
}

async fn capture_unauthorized_chat_completion(
    State(state): State<Arc<Mutex<RetryingProviderState>>>,
    headers: HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    state
        .lock()
        .unwrap()
        .requests
        .push(CapturedUpstreamRequest {
            authorization: headers
                .get("authorization")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            api_key: headers
                .get("x-api-key")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            account_tier: headers
                .get("x-account-tier")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            body,
        });
    (
        StatusCode::UNAUTHORIZED,
        Json(json!({
            "error": {
                "code": "invalid_api_key",
                "message": "provider rejected credentials"
            }
        })),
    )
}

async fn capture_server_error_chat_completion(
    State(state): State<Arc<Mutex<RetryingProviderState>>>,
    headers: HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    state
        .lock()
        .unwrap()
        .requests
        .push(CapturedUpstreamRequest {
            authorization: headers
                .get("authorization")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            api_key: headers
                .get("x-api-key")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            account_tier: headers
                .get("x-account-tier")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            body,
        });
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({
            "error": {
                "code": "provider_error",
                "message": "provider failed"
            }
        })),
    )
}
