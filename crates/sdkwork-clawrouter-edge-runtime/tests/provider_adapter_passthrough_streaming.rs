use std::convert::Infallible;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::body::{Body, Bytes};
use axum::extract::State;
use axum::http::header::CONTENT_TYPE;
use axum::http::{Request, StatusCode};
use axum::response::Response;
use axum::routing::post;
use axum::Router;
use http_body_util::BodyExt;
use sdkwork_claw_config::{ProviderAdapterConfig, ProviderRelayConfig};
use sdkwork_claw_provider_adapter_contract::AdapterInvocationRequest;
use tokio::sync::oneshot;
use tokio::time::timeout;
use tower::ServiceExt;

#[tokio::test]
async fn provider_adapter_streaming_passthrough_returns_headers_before_adapter_eof() {
    let (release_sender, release_receiver) = oneshot::channel();
    let release_receiver = Arc::new(Mutex::new(Some(release_receiver)));
    let adapter = Router::new()
        .route(
            "/providers/tencent-cloud/v1/stream",
            post(streaming_adapter_response),
        )
        .with_state(Arc::clone(&release_receiver));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let adapter_addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, adapter).await.unwrap();
    });

    let relay_config = ProviderRelayConfig::from_provider_passthrough_json(
        r#"{
            "tencent-cloud": {
                "baseUrl": "https://api.openai.com",
                "auth": {
                    "type": "bearer",
                    "value": "provider-secret"
                }
            }
        }"#,
    )
    .unwrap();
    let adapter_config = ProviderAdapterConfig::from_json(
        format!(
            r#"{{
                "routes": [{{
                    "providerCode": "tencent-cloud",
                    "adapterKind": "internal_http",
                    "adapterBaseUrl": "http://{adapter_addr}",
                    "endpointKey": "test.stream",
                    "method": "POST",
                    "standardPathPattern": "/v1/stream",
                    "adapterPathTemplate": "/providers/{{provider_code}}{{standard_path}}",
                    "invocationShape": "sse_stream",
                    "status": "enabled",
                    "priority": 10
                }}]
            }}"#,
        ),
        Some("adapter-token".to_owned()),
    )
    .unwrap();
    let router =
        sdkwork_clawrouter_edge_runtime::router_with_provider_passthrough_and_adapter_config_for_development(
            relay_config,
            Some(adapter_config),
        );

    // The adapter keeps the stream open until after this request has received
    // its response headers. A full-body collector would time out here.
    let response = timeout(
        Duration::from_secs(1),
        router.oneshot(
            Request::builder()
                .method("POST")
                .uri("/tencent-cloud/v1/stream")
                .header(CONTENT_TYPE, "application/json")
                .body(Body::from(r#"{"model":"test-stream"}"#))
                .unwrap(),
        ),
    )
    .await
    .expect("gateway must return streaming response headers before adapter EOF")
    .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    assert_eq!(
        Some("text/event-stream"),
        response
            .headers()
            .get(CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
    );

    let mut body = response.into_body();
    let first_frame = timeout(Duration::from_secs(1), body.frame())
        .await
        .expect("first adapter frame must arrive without waiting for EOF")
        .expect("adapter stream must not fail")
        .expect("adapter stream must contain a first frame")
        .into_data()
        .expect("adapter stream frame must contain data");
    assert_eq!(b"data: {\"delta\":\"first\"}\n\n", first_frame.as_ref());

    release_sender
        .send(())
        .expect("adapter stream must still be waiting for release");
    let final_frame = timeout(Duration::from_secs(1), body.frame())
        .await
        .expect("final adapter frame must arrive after release")
        .expect("adapter stream must not fail")
        .expect("adapter stream must contain a final frame")
        .into_data()
        .expect("adapter stream frame must contain data");
    assert_eq!(b"data: [DONE]\n\n", final_frame.as_ref());
    assert!(timeout(Duration::from_secs(1), body.frame())
        .await
        .expect("stream completion must be prompt")
        .is_none());
}

async fn streaming_adapter_response(
    State(release_receiver): State<Arc<Mutex<Option<oneshot::Receiver<()>>>>>,
    _request: axum::Json<AdapterInvocationRequest>,
) -> Response {
    let release_receiver = release_receiver
        .lock()
        .unwrap()
        .take()
        .expect("streaming adapter should receive one request");
    let stream = futures_util::stream::unfold(
        (Some(release_receiver), 0_u8),
        |(release_receiver, phase)| async move {
            match phase {
                0 => Some((
                    Ok::<Bytes, Infallible>(Bytes::from_static(b"data: {\"delta\":\"first\"}\n\n")),
                    (release_receiver, 1),
                )),
                1 => {
                    let receiver = release_receiver.expect("release receiver must exist");
                    let _ = receiver.await;
                    Some((
                        Ok::<Bytes, Infallible>(Bytes::from_static(b"data: [DONE]\n\n")),
                        (None, 2),
                    ))
                }
                _ => None,
            }
        },
    );
    Response::builder()
        .status(StatusCode::OK)
        .header(CONTENT_TYPE, "text/event-stream")
        .body(Body::from_stream(stream))
        .unwrap()
}
