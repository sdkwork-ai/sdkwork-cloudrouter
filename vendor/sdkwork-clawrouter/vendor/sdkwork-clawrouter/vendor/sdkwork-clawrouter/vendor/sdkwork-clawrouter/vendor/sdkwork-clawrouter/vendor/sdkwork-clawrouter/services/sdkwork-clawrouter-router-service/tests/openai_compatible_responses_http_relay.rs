use std::sync::{Arc, Mutex};

use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::routing::post;
use axum::{Json, Router};
use sdkwork_clawrouter_router_service::domain::ProviderAuthProfile;
use sdkwork_clawrouter_router_service::infrastructure::provider::{
    OpenAiCompatibleResponsesRelay, UpstreamProviderEndpoint,
};
use sdkwork_clawrouter_router_service::ports::{
    ResponsesRelay, ResponsesRelayRequest, ResponsesRelayResponse,
};
use serde_json::json;

#[derive(Debug, Default)]
struct CapturedUpstreamRequest {
    authorization: Option<String>,
    body: serde_json::Value,
}

#[tokio::test]
async fn openai_compatible_responses_relay_uses_provider_model_and_upstream_secret() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/responses", post(capture_response))
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let endpoint =
        UpstreamProviderEndpoint::new(format!("http://{addr}"), "sk-upstream-provider-secret")
            .unwrap();
    let relay = OpenAiCompatibleResponsesRelay::new(endpoint);
    let request_body = json!({
        "model": "gpt-4.1-mini",
        "input": "ping",
        "temperature": 0.2,
        "stream": false
    });
    let response = relay
        .create_response(ResponsesRelayRequest {
            api_key_id: 101,
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
            model: "gpt-4.1-mini".to_owned(),
            provider_code: "openrouter".to_owned(),
            provider_channel_id: 3001,
            provider_region_code: "global".to_owned(),
            provider_model: "gpt-4.1-mini".to_owned(),
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
        ResponsesRelayResponse::json(
            200,
            json!({
                "id": "resp-upstream",
                "object": "response",
                "model": "gpt-4.1-mini",
                "output": [
                    {
                        "type": "message",
                        "role": "assistant",
                        "content": [{"type": "output_text", "text": "pong"}]
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
    expected_body["model"] = json!("gpt-4.1-mini");
    assert_eq!(expected_body, captured[0].body);
}

async fn capture_response(
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
            "id": "resp-upstream",
            "object": "response",
            "model": "gpt-4.1-mini",
            "output": [
                {
                    "type": "message",
                    "role": "assistant",
                    "content": [{"type": "output_text", "text": "pong"}]
                }
            ]
        })),
    )
}
