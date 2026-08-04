use std::sync::{Arc, Mutex};

use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::routing::post;
use axum::{Json, Router};
use sdkwork_clawrouter_router_service::domain::ProviderAuthProfile;
use sdkwork_clawrouter_router_service::infrastructure::provider::{
    OpenAiCompatibleEmbeddingsRelay, UpstreamProviderEndpoint,
};
use sdkwork_clawrouter_router_service::ports::{
    EmbeddingsRelay, EmbeddingsRelayRequest,
};
use serde_json::json;

#[derive(Debug, Default)]
struct CapturedUpstreamRequest {
    authorization: Option<String>,
    body: serde_json::Value,
}

#[tokio::test]
async fn openai_compatible_embeddings_relay_uses_provider_model_and_upstream_secret() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/embeddings", post(capture_embedding))
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
    let relay = OpenAiCompatibleEmbeddingsRelay::new(endpoint);
    let request_body = json!({
        "model": "text-embedding-3-small",
        "input": ["ping"],
        "encoding_format": "float",
        "dimensions": 256
    });
    let response = relay
        .create_embedding(EmbeddingsRelayRequest {
            api_key_id: 101,
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
            model: "text-embedding-3-small".to_owned(),
            supplier_code: "openrouter".to_owned(),
            provider_account_id: 3001,
            provider_region_code: "global".to_owned(),
            provider_model: "text-embedding-3-small".to_owned(),
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
    assert_eq!(
        json!({
            "object": "list",
            "model": "text-embedding-3-small",
            "data": [
                {"object": "embedding", "index": 0, "embedding": [0.1, 0.2, 0.3]}
            ],
            "usage": {"prompt_tokens": 1, "total_tokens": 1}
        }),
        response.body
    );
    assert!(
        response.memory_guard.is_some(),
        "relay response must carry the provider response memory guard"
    );

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("Bearer sk-upstream-provider-secret".to_owned()),
        captured[0].authorization
    );
    let mut expected_body = request_body;
    expected_body["model"] = json!("text-embedding-3-small");
    assert_eq!(expected_body, captured[0].body);
}

async fn capture_embedding(
    State(captured): State<Arc<Mutex<Vec<CapturedUpstreamRequest>>>>,
    headers: HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    captured.lock().unwrap().push(CapturedUpstreamRequest {
        authorization: headers
            .get("authorization")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        body,
    });
    (
        StatusCode::OK,
        Json(json!({
            "object": "list",
            "model": "text-embedding-3-small",
            "data": [
                {"object": "embedding", "index": 0, "embedding": [0.1, 0.2, 0.3]}
            ],
            "usage": {"prompt_tokens": 1, "total_tokens": 1}
        })),
    )
}
