use std::sync::{Arc, Mutex};

use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::IntoResponse;
use axum::routing::post;
use axum::{Json, Router};
use sdkwork_claw_provider_adapter_contract::{
    AdapterEndpointRuntimeState, AdapterInvocationMetadata, AdapterInvocationRequest,
    AdapterInvocationResponse, AdapterInvocationShape, AdapterKind, AdapterProviderContext,
    AdapterRouteStatus, AdapterSecret, AdapterSubject,
};
use sdkwork_claw_provider_adapter_registry::ProviderAdapterRouteConfig;
use serde_json::json;

#[derive(Debug, Clone)]
struct CapturedAdapterCall {
    authorization: Option<String>,
    body: AdapterInvocationRequest,
}

#[derive(Clone)]
struct FakeAdapterServer {
    base_url: String,
    calls: Arc<Mutex<Vec<CapturedAdapterCall>>>,
}

#[tokio::test]
async fn gateway_adapter_transport_posts_stable_envelope_to_internal_adapter() {
    let fake = spawn_fake_adapter_server(StatusCode::OK).await;
    let route = adapter_route(fake.base_url.as_str());
    let transport =
        sdkwork_clawrouter_cloud_gateway::provider_adapter_transport::ProviderAdapterHttpTransport::new(
            "test-token",
        );

    let response = transport
        .invoke(&route, adapter_request())
        .await
        .expect("adapter invocation should succeed");

    assert_eq!(200, response.status_code);
    assert_eq!("native-task-1", response.provider.task_id.unwrap());
    let calls = fake.calls.lock().unwrap();
    assert_eq!(1, calls.len());
    assert_eq!(Some("Bearer test-token".to_owned()), calls[0].authorization);
    assert_eq!(
        "video.start_end2video",
        calls[0].body.invocation.endpoint_key
    );
    assert_eq!("tencent-cloud", calls[0].body.provider.provider_code);
}

#[tokio::test]
async fn gateway_adapter_transport_maps_adapter_error_to_gateway_error() {
    let fake = spawn_fake_adapter_server(StatusCode::BAD_GATEWAY).await;
    let route = adapter_route(fake.base_url.as_str());
    let transport =
        sdkwork_clawrouter_cloud_gateway::provider_adapter_transport::ProviderAdapterHttpTransport::new(
            "test-token",
        );

    let error = transport
        .invoke(&route, adapter_request())
        .await
        .expect_err("adapter non-success response should fail");

    assert_eq!(Some(502), error.status_code);
    assert!(error.retryable);
    assert!(error.message.contains("adapter returned HTTP 502"));
}

fn adapter_route(base_url: &str) -> ProviderAdapterRouteConfig {
    ProviderAdapterRouteConfig {
        provider_code: "tencent-cloud".to_owned(),
        adapter_kind: AdapterKind::InternalHttp,
        adapter_base_url: base_url.to_owned(),
        capability: Some("video_generation".to_owned()),
        endpoint_key: Some("video.start_end2video".to_owned()),
        service_group: None,
        openapi_operation_id: None,
        s3_operation: None,
        iaas_operation: None,
        endpoint_styles: Vec::new(),
        runtime_state: AdapterEndpointRuntimeState::RuntimeAvailable,
        method: "POST".to_owned(),
        invocation_shape: AdapterInvocationShape::AsyncTaskStart,
        standard_path_pattern: "/vidu/ent/v2/start-end2video".to_owned(),
        adapter_path_template: "/providers/{provider_code}{standard_path}".to_owned(),
        status: AdapterRouteStatus::Enabled,
        priority: 10,
    }
}

fn adapter_request() -> AdapterInvocationRequest {
    AdapterInvocationRequest {
        invocation: AdapterInvocationMetadata {
            id: "inv-1".to_owned(),
            endpoint_key: "video.start_end2video".to_owned(),
            method: "POST".to_owned(),
            standard_path: "/vidu/ent/v2/start-end2video".to_owned(),
            shape: AdapterInvocationShape::AsyncTaskStart,
            stream: false,
            request_id: Some("req-1".to_owned()),
            trace_id: Some("trace-1".to_owned()),
        },
        subject: AdapterSubject {
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            api_key_id: 100,
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
        },
        provider: AdapterProviderContext {
            provider_code: "tencent-cloud".to_owned(),
            channel_id: 3001,
            region_code: "global".to_owned(),
            provider_model: "vidu-q1".to_owned(),
            base_url: Some("https://api.vidu.example".to_owned()),
            auth_profile: json!({"type": "bearer"}),
            timeout_ms: Some(120000),
        },
        secret: AdapterSecret::None,
        body: json!({"prompt": "make a video"}),
    }
}

async fn spawn_fake_adapter_server(status: StatusCode) -> FakeAdapterServer {
    let calls = Arc::new(Mutex::new(Vec::new()));
    let state = (Arc::clone(&calls), status);
    let app = Router::new()
        .route(
            "/providers/tencent-cloud/vidu/ent/v2/start-end2video",
            post(capture_adapter_invocation),
        )
        .with_state(state);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    FakeAdapterServer {
        base_url: format!("http://{addr}"),
        calls,
    }
}

async fn capture_adapter_invocation(
    State((calls, status)): State<(Arc<Mutex<Vec<CapturedAdapterCall>>>, StatusCode)>,
    headers: HeaderMap,
    Json(body): Json<AdapterInvocationRequest>,
) -> impl IntoResponse {
    calls.lock().unwrap().push(CapturedAdapterCall {
        authorization: headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        body,
    });

    if status.is_success() {
        (
            status,
            Json(
                AdapterInvocationResponse::json_task(
                    200,
                    json!({"id": "task-1", "status": "queued"}),
                )
                .with_provider_task_id("native-task-1"),
            ),
        )
            .into_response()
    } else {
        (
            status,
            Json(json!({
                "error": {
                    "code": "adapter_unavailable",
                    "message": "adapter unavailable"
                }
            })),
        )
            .into_response()
    }
}
