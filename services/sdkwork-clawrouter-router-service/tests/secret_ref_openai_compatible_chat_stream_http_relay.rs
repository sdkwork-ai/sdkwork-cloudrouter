use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::extract::State;
use axum::http::header::CONTENT_TYPE;
use axum::http::{HeaderMap, StatusCode};
use axum::routing::post;
use axum::{Json, Router};
use sdkwork_clawrouter_router_service::domain::ProviderAuthProfile;
use sdkwork_clawrouter_router_service::infrastructure::provider::SecretRefOpenAiCompatibleChatCompletionStreamRelay;
use sdkwork_clawrouter_router_service::ports::{
    ChatCompletionRelayRequest, ChatCompletionStreamRelay, ProviderSecretResolver,
};
use serde_json::json;

#[derive(Debug, Default)]
struct CapturedUpstreamRequest {
    authorization: Option<String>,
    body: serde_json::Value,
}

#[derive(Debug)]
struct MapSecretResolver {
    secrets: HashMap<String, String>,
}

impl ProviderSecretResolver for MapSecretResolver {
    fn resolve_secret_value(
        &self,
        secret_ref: &str,
    ) -> sdkwork_clawrouter_router_service::domain::DomainResult<String> {
        self.secrets.get(secret_ref).cloned().ok_or_else(|| {
            sdkwork_clawrouter_router_service::domain::DomainError::new("secret ref not found")
        })
    }
}

#[tokio::test]
async fn secret_ref_chat_stream_relay_resolves_endpoint_and_secret_from_request_context() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/chat/completions", post(capture_chat_stream))
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let secret_ref = "vault://providers/openrouter/account/main";
    let relay =
        SecretRefOpenAiCompatibleChatCompletionStreamRelay::new(Arc::new(MapSecretResolver {
            secrets: HashMap::from([(
                secret_ref.to_owned(),
                "sk-provider-from-secret-ref".to_owned(),
            )]),
        }));

    let request_body = json!({
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": "ping"}],
        "stream": true
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
            provider_secret_ref: Some(secret_ref.to_owned()),
            provider_auth_profile: ProviderAuthProfile::bearer(),
            provider_timeout_ms: None,
            provider_retry_policy: None,
            request_body: request_body.clone(),
        })
        .await
        .unwrap();

    assert_eq!(200, response.status_code);
    let body = axum::body::to_bytes(response.body, usize::MAX)
        .await
        .unwrap();
    let body = String::from_utf8(body.to_vec()).unwrap();
    assert!(body.contains("chatcmpl-secret-ref-stream"));
    assert!(body.contains("data: [DONE]"));

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("Bearer sk-provider-from-secret-ref".to_owned()),
        captured[0].authorization
    );
    let mut expected_body = request_body;
    expected_body["model"] = json!("gpt-4o-mini");
    assert_eq!(expected_body, captured[0].body);
}

#[tokio::test]
async fn secret_ref_chat_stream_relay_rejects_missing_endpoint_or_secret_ref_without_leaking_values(
) {
    let relay =
        SecretRefOpenAiCompatibleChatCompletionStreamRelay::new(Arc::new(MapSecretResolver {
            secrets: HashMap::new(),
        }));

    let missing_endpoint = relay
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
            provider_base_url: None,
            provider_secret_ref: Some("vault://providers/openrouter/account/main".to_owned()),
            provider_auth_profile: ProviderAuthProfile::bearer(),
            provider_timeout_ms: None,
            provider_retry_policy: None,
            request_body: json!({"model": "gpt-4o-mini", "messages": [], "stream": true}),
        })
        .await
        .unwrap_err();
    assert!(missing_endpoint.to_string().contains("provider base URL"));

    let missing_secret_ref = relay
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
            provider_base_url: Some("http://127.0.0.1:8080".to_owned()),
            provider_secret_ref: None,
            provider_auth_profile: ProviderAuthProfile::bearer(),
            provider_timeout_ms: None,
            provider_retry_policy: None,
            request_body: json!({"model": "gpt-4o-mini", "messages": [], "stream": true}),
        })
        .await
        .unwrap_err();
    assert!(missing_secret_ref
        .to_string()
        .contains("provider secret_ref"));
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
            "data: {\"id\":\"chatcmpl-secret-ref-stream\",\"choices\":[{\"delta\":{\"content\":\"pong\"}}]}\n\ndata: [DONE]\n\n",
        ),
    )
}
