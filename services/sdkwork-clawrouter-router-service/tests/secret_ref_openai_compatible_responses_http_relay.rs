use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::routing::post;
use axum::{Json, Router};
use sdkwork_clawrouter_router_service::domain::ProviderAuthProfile;
use sdkwork_clawrouter_router_service::infrastructure::provider::SecretRefOpenAiCompatibleResponsesRelay;
use sdkwork_clawrouter_router_service::ports::{
    ProviderSecretResolver, ResponsesRelay, ResponsesRelayRequest, ResponsesRelayResponse,
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
async fn secret_ref_responses_relay_resolves_endpoint_and_secret_from_request_context() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/responses", post(capture_response))
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let secret_ref = "vault://providers/openrouter/account/main";
    let relay = SecretRefOpenAiCompatibleResponsesRelay::for_local_development(Arc::new(
        MapSecretResolver {
            secrets: HashMap::from([(
                secret_ref.to_owned(),
                "sk-provider-from-secret-ref".to_owned(),
            )]),
        },
    ));

    let request_body = json!({
        "model": "gpt-4.1-mini",
        "input": "ping",
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
            supplier_code: "openrouter".to_owned(),
            provider_account_id: 3001,
            provider_region_code: "global".to_owned(),
            provider_model: "gpt-4.1-mini".to_owned(),
            provider_base_url: Some(format!("http://{addr}")),
            provider_secret_ref: Some(secret_ref.to_owned()),
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
                "id": "resp-secret-ref",
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
        Some("Bearer sk-provider-from-secret-ref".to_owned()),
        captured[0].authorization
    );
    let mut expected_body = request_body;
    expected_body["model"] = json!("gpt-4.1-mini");
    assert_eq!(expected_body, captured[0].body);
}

#[tokio::test]
async fn secret_ref_responses_relay_rejects_missing_endpoint_or_secret_ref_without_leaking_values()
{
    let relay = SecretRefOpenAiCompatibleResponsesRelay::for_local_development(Arc::new(
        MapSecretResolver {
            secrets: HashMap::new(),
        },
    ));

    let missing_endpoint = relay
        .create_response(ResponsesRelayRequest {
            api_key_id: 101,
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
            model: "gpt-4.1-mini".to_owned(),
            supplier_code: "openrouter".to_owned(),
            provider_account_id: 3001,
            provider_region_code: "global".to_owned(),
            provider_model: "gpt-4.1-mini".to_owned(),
            provider_base_url: None,
            provider_secret_ref: Some("vault://providers/openrouter/account/main".to_owned()),
            provider_auth_profile: ProviderAuthProfile::bearer(),
            provider_timeout_ms: None,
            provider_retry_policy: None,
            request_body: json!({"model": "gpt-4.1-mini", "input": "ping"}),
        })
        .await
        .unwrap_err();
    assert!(missing_endpoint.to_string().contains("provider base URL"));

    let missing_secret_ref = relay
        .create_response(ResponsesRelayRequest {
            api_key_id: 101,
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
            model: "gpt-4.1-mini".to_owned(),
            supplier_code: "openrouter".to_owned(),
            provider_account_id: 3001,
            provider_region_code: "global".to_owned(),
            provider_model: "gpt-4.1-mini".to_owned(),
            provider_base_url: Some("http://127.0.0.1:8080".to_owned()),
            provider_secret_ref: None,
            provider_auth_profile: ProviderAuthProfile::bearer(),
            provider_timeout_ms: None,
            provider_retry_policy: None,
            request_body: json!({"model": "gpt-4.1-mini", "input": "ping"}),
        })
        .await
        .unwrap_err();
    assert!(missing_secret_ref
        .to_string()
        .contains("provider secret_ref"));
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
            "id": "resp-secret-ref",
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
