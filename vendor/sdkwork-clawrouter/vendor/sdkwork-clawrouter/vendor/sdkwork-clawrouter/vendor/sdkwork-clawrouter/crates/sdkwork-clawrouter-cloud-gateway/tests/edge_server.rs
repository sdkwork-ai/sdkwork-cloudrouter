use std::io::ErrorKind;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::path::{Path, PathBuf};
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use axum::body::{to_bytes, Body};
use axum::extract::{ConnectInfo, Request, State};
use axum::http::{header, HeaderValue, Method, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::{Json, Router};
use bytes::Bytes;
use futures_core::Stream;
use http_body_util::BodyExt;
use serde_json::json;
use tokio::net::TcpListener;
use tokio::sync::{oneshot, Mutex};
use tokio::time::{sleep, timeout};
use tower::ServiceExt;

struct UpstreamServer {
    base_url: String,
    stop: oneshot::Sender<()>,
}

#[derive(Debug, Clone)]
struct CapturedSdkGeneratorRequest {
    method: String,
    path: String,
    content_type: Option<String>,
    body: Vec<u8>,
}

#[derive(Clone)]
struct SdkGeneratorFixtureState {
    requests: Arc<Mutex<Vec<CapturedSdkGeneratorRequest>>>,
}

async fn upstream_echo(State(name): State<&'static str>, request: Request) -> Response {
    let method = request.method().clone();
    let path_and_query = request
        .uri()
        .path_and_query()
        .map(|value| value.as_str().to_owned())
        .unwrap_or_else(|| "/".to_owned());
    let authorization = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned);
    let forwarded_host = request
        .headers()
        .get("x-forwarded-host")
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned);
    let forwarded_proto = request
        .headers()
        .get("x-forwarded-proto")
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned);
    let forwarded_for = request
        .headers()
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned);
    let forwarded = request
        .headers()
        .get("forwarded")
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned);
    let real_ip = request
        .headers()
        .get("x-real-ip")
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned);
    let connection_declared_header = request
        .headers()
        .get("x-connection-token-header")
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned);
    let end_to_end_header = request
        .headers()
        .get("x-end-to-end-header")
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned);
    let body = to_bytes(request.into_body(), usize::MAX).await.unwrap();

    Json(json!({
        "upstream": name,
        "method": method.as_str(),
        "path": path_and_query,
        "authorization": authorization,
        "forwardedHost": forwarded_host,
        "forwardedProto": forwarded_proto,
        "forwardedFor": forwarded_for,
        "forwarded": forwarded,
        "realIp": real_ip,
        "connectionDeclaredHeader": connection_declared_header,
        "endToEndHeader": end_to_end_header,
        "body": String::from_utf8_lossy(&body),
    }))
    .into_response()
}

async fn spawn_upstream(name: &'static str) -> UpstreamServer {
    let app = Router::new().fallback(upstream_echo).with_state(name);
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let (stop, stopped) = oneshot::channel::<()>();

    tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async {
                let _ = stopped.await;
            })
            .await
            .unwrap();
    });

    UpstreamServer {
        base_url: format!("http://{address}"),
        stop,
    }
}

async fn upstream_health(State((name, healthy)): State<(&'static str, bool)>) -> Response {
    let body = Json(json!({
        "status": if healthy { "ok" } else { "unavailable" },
        "service": name,
    }));
    if healthy {
        body.into_response()
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, body).into_response()
    }
}

async fn spawn_health_upstream(name: &'static str, healthy: bool) -> UpstreamServer {
    let app = Router::new()
        .route("/healthz", axum::routing::get(upstream_health))
        .with_state((name, healthy));
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let (stop, stopped) = oneshot::channel::<()>();

    tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async {
                let _ = stopped.await;
            })
            .await
            .unwrap();
    });

    UpstreamServer {
        base_url: format!("http://{address}"),
        stop,
    }
}

async fn slow_upstream(State(delay): State<Duration>) -> Response {
    sleep(delay).await;
    Json(json!({
        "status": "ok",
        "service": "slow-upstream",
    }))
    .into_response()
}

async fn spawn_slow_upstream(delay: Duration) -> UpstreamServer {
    let app = Router::new().fallback(slow_upstream).with_state(delay);
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let (stop, stopped) = oneshot::channel::<()>();

    tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async {
                let _ = stopped.await;
            })
            .await
            .unwrap();
    });

    UpstreamServer {
        base_url: format!("http://{address}"),
        stop,
    }
}

async fn slow_health(State(delay): State<Duration>) -> Response {
    sleep(delay).await;
    Json(json!({
        "status": "ok",
        "service": "slow-health",
    }))
    .into_response()
}

async fn spawn_slow_health_upstream(delay: Duration) -> UpstreamServer {
    let app = Router::new()
        .route("/healthz", axum::routing::get(slow_health))
        .with_state(delay);
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let (stop, stopped) = oneshot::channel::<()>();

    tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async {
                let _ = stopped.await;
            })
            .await
            .unwrap();
    });

    UpstreamServer {
        base_url: format!("http://{address}"),
        stop,
    }
}

async fn sdk_generator_fixture_handler(
    State(state): State<SdkGeneratorFixtureState>,
    request: Request,
) -> Response {
    let method = request.method().as_str().to_owned();
    let path = request
        .uri()
        .path_and_query()
        .map(|value| value.as_str().to_owned())
        .unwrap_or_else(|| "/".to_owned());
    let content_type = request
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned);
    let body = to_bytes(request.into_body(), usize::MAX).await.unwrap();
    state
        .requests
        .lock()
        .await
        .push(CapturedSdkGeneratorRequest {
            method,
            path: path.clone(),
            content_type,
            body: body.to_vec(),
        });

    match path.as_str() {
        "/v1/sdk-generator/generations:upload" => Json(json!({
            "jobId": "job-123",
            "status": "completed",
            "downloadUrl": "/v1/sdk-generator/jobs/job-123/download"
        }))
        .into_response(),
        "/v1/sdk-generator/jobs/job-123" => Json(json!({
            "jobId": "job-123",
            "status": "completed",
            "downloadUrl": "/v1/sdk-generator/jobs/job-123/download"
        }))
        .into_response(),
        "/v1/sdk-generator/jobs/job-123/download?format=zip" => {
            let mut response = Response::new(Body::from(Bytes::from_static(
                b"PK\x03\x04generated-sdk-archive",
            )));
            *response.status_mut() = StatusCode::OK;
            response.headers_mut().insert(
                header::CONTENT_TYPE,
                HeaderValue::from_static("application/zip"),
            );
            response.headers_mut().insert(
                header::CONTENT_DISPOSITION,
                HeaderValue::from_static("attachment; filename=\"generated-clawrouter-sdk.zip\""),
            );
            response
        }
        _ => (StatusCode::NOT_FOUND, "not found").into_response(),
    }
}

async fn spawn_sdk_generator_fixture(
) -> (UpstreamServer, Arc<Mutex<Vec<CapturedSdkGeneratorRequest>>>) {
    let requests = Arc::new(Mutex::new(Vec::new()));
    let app = Router::new()
        .fallback(sdk_generator_fixture_handler)
        .with_state(SdkGeneratorFixtureState {
            requests: requests.clone(),
        });
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let (stop, stopped) = oneshot::channel::<()>();

    tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async {
                let _ = stopped.await;
            })
            .await
            .unwrap();
    });

    (
        UpstreamServer {
            base_url: format!("http://{address}"),
            stop,
        },
        requests,
    )
}

async fn write_all(socket: &tokio::net::TcpStream, mut bytes: &[u8]) {
    while !bytes.is_empty() {
        socket.writable().await.unwrap();
        match socket.try_write(bytes) {
            Ok(0) => panic!("streaming upstream connection closed while writing"),
            Ok(written) => bytes = &bytes[written..],
            Err(error) if error.kind() == ErrorKind::WouldBlock => {}
            Err(error) => panic!("failed to write streaming upstream response: {error}"),
        }
    }
}

async fn spawn_streaming_upstream() -> UpstreamServer {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let (stop, stopped) = oneshot::channel::<()>();

    tokio::spawn(async move {
        tokio::select! {
            accepted = listener.accept() => {
                let (socket, _) = accepted.unwrap();
                write_all(
                    &socket,
                    b"HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nTransfer-Encoding: chunked\r\nConnection: close\r\n\r\n",
                ).await;
                write_all(&socket, b"d\r\ndata: first\n\n\r\n").await;
                sleep(Duration::from_millis(500)).await;
                write_all(&socket, b"e\r\ndata: second\n\n\r\n0\r\n\r\n").await;
            }
            _ = stopped => {}
        }
    });

    UpstreamServer {
        base_url: format!("http://{address}"),
        stop,
    }
}

async fn read_until(socket: &tokio::net::TcpStream, expected: &[u8]) {
    let mut bytes = Vec::new();
    let mut buffer = [0_u8; 1024];
    loop {
        if bytes
            .windows(expected.len())
            .any(|window| window == expected)
        {
            return;
        }

        socket.readable().await.unwrap();
        match socket.try_read(&mut buffer) {
            Ok(0) => panic!("streaming request upstream connection closed before expected bytes"),
            Ok(read) => bytes.extend_from_slice(&buffer[..read]),
            Err(error) if error.kind() == ErrorKind::WouldBlock => {}
            Err(error) => panic!("failed to read streaming upstream request: {error}"),
        }
    }
}

async fn spawn_request_streaming_upstream() -> UpstreamServer {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let (stop, stopped) = oneshot::channel::<()>();

    tokio::spawn(async move {
        tokio::select! {
            accepted = listener.accept() => {
                let (socket, _) = accepted.unwrap();
                read_until(&socket, b"first-upload-chunk").await;
                write_all(
                    &socket,
                    b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 24\r\nConnection: close\r\n\r\n{\"streamed\":true,\"ok\":1}",
                ).await;
            }
            _ = stopped => {}
        }
    });

    UpstreamServer {
        base_url: format!("http://{address}"),
        stop,
    }
}

async fn spawn_vary_upstream() -> UpstreamServer {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let (stop, stopped) = oneshot::channel::<()>();

    tokio::spawn(async move {
        tokio::select! {
            accepted = listener.accept() => {
                let (socket, _) = accepted.unwrap();
                read_until(&socket, b"\r\n\r\n").await;
                write_all(
                    &socket,
                    b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 11\r\nVary: Accept-Encoding\r\nConnection: close\r\n\r\n{\"ok\":true}",
                ).await;
            }
            _ = stopped => {}
        }
    });

    UpstreamServer {
        base_url: format!("http://{address}"),
        stop,
    }
}

async fn spawn_connection_declared_response_header_upstream() -> UpstreamServer {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let (stop, stopped) = oneshot::channel::<()>();

    tokio::spawn(async move {
        tokio::select! {
            accepted = listener.accept() => {
                let (socket, _) = accepted.unwrap();
                read_until(&socket, b"\r\n\r\n").await;
                write_all(
                    &socket,
                    b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 11\r\nConnection: x-transient-upstream-header\r\nX-Transient-Upstream-Header: should-drop\r\nX-End-To-End-Header: should-keep\r\n\r\n{\"ok\":true}",
                ).await;
            }
            _ = stopped => {}
        }
    });

    UpstreamServer {
        base_url: format!("http://{address}"),
        stop,
    }
}

struct SlowUploadStream {
    state: u8,
}

impl SlowUploadStream {
    fn new() -> Self {
        Self { state: 0 }
    }
}

impl Stream for SlowUploadStream {
    type Item = Result<Bytes, std::io::Error>;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        match self.state {
            0 => {
                self.state = 1;
                Poll::Ready(Some(Ok(Bytes::from_static(b"first-upload-chunk"))))
            }
            1 => {
                self.state = 2;
                let waker = cx.waker().clone();
                tokio::spawn(async move {
                    sleep(Duration::from_millis(500)).await;
                    waker.wake();
                });
                Poll::Pending
            }
            2 => {
                self.state = 3;
                Poll::Ready(Some(Ok(Bytes::from_static(b"second-upload-chunk"))))
            }
            _ => Poll::Ready(None),
        }
    }
}

async fn json_request(router: Router, method: Method, path: &str, body: &str) -> serde_json::Value {
    let response = router
        .oneshot(
            Request::builder()
                .method(method)
                .uri(path)
                .header(header::HOST, "sdkwork.example.test")
                .header(header::AUTHORIZATION, "Bearer test-token")
                .body(Body::from(body.to_owned()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    serde_json::from_slice(&body).unwrap()
}

async fn json_request_with_status(
    router: Router,
    method: Method,
    path: &str,
    body: &str,
) -> (StatusCode, serde_json::Value) {
    let response = router
        .oneshot(
            Request::builder()
                .method(method)
                .uri(path)
                .header(header::HOST, "sdkwork.example.test")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(body.to_owned()))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    (status, serde_json::from_slice(&body).unwrap())
}

async fn request_with_json_body(
    router: Router,
    method: Method,
    path: &str,
    body: &str,
) -> Response {
    request_with_json_body_with_host(router, method, path, body, "sdkwork.example.test").await
}

async fn request_with_json_body_with_host(
    router: Router,
    method: Method,
    path: &str,
    body: &str,
    host: &str,
) -> Response {
    router
        .oneshot(
            Request::builder()
                .method(method)
                .uri(path)
                .header(header::HOST, host)
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(body.to_owned()))
                .unwrap(),
        )
        .await
        .unwrap()
}

async fn request_with_json_body_from_addr(
    router: Router,
    method: Method,
    path: &str,
    body: &str,
    remote_addr: SocketAddr,
) -> Response {
    router
        .oneshot(
            Request::builder()
                .method(method)
                .uri(path)
                .header(header::HOST, "sdkwork.example.test")
                .header(header::CONTENT_TYPE, "application/json")
                .extension(ConnectInfo(remote_addr))
                .body(Body::from(body.to_owned()))
                .unwrap(),
        )
        .await
        .unwrap()
}

async fn request_with_json_body_from_addr_and_forwarded_for(
    router: Router,
    method: Method,
    path: &str,
    body: &str,
    remote_addr: SocketAddr,
    forwarded_for: &str,
) -> Response {
    router
        .oneshot(
            Request::builder()
                .method(method)
                .uri(path)
                .header(header::HOST, "sdkwork.example.test")
                .header(header::CONTENT_TYPE, "application/json")
                .header("x-forwarded-for", forwarded_for)
                .extension(ConnectInfo(remote_addr))
                .body(Body::from(body.to_owned()))
                .unwrap(),
        )
        .await
        .unwrap()
}

fn temp_portal_dist_dir(test_name: &str) -> PathBuf {
    let suffix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    std::env::temp_dir().join(format!("sdkwork-clawrouter-{test_name}-{suffix}"))
}

fn write_portal_dist_fixture(root: &Path) {
    std::fs::create_dir_all(root.join("assets")).unwrap();
    std::fs::write(
        root.join("index.html"),
        r#"<!doctype html>
<html lang="en">
  <head><title>Claw Router</title></head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/index-test.js"></script>
  </body>
</html>
"#,
    )
    .unwrap();
    std::fs::write(
        root.join("assets").join("index-test.js"),
        r#"import React from "react"; console.log(React);"#,
    )
    .unwrap();
    std::fs::write(
        root.join("openapi.json"),
        r#"{"openapi":"3.0.0","info":{"title":"Static Portal API","version":"1.0.0"},"paths":{"/v1/chat/completions":{"post":{"tags":["Chat"],"summary":"Create Chat Completion"}}}}"#,
    )
    .unwrap();
}

#[tokio::test]
async fn edge_server_exposes_own_health_check_without_upstream_probe() {
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(
        sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
            "http://127.0.0.1:1",
            "http://127.0.0.1:1",
            "http://127.0.0.1:1",
            "http://127.0.0.1:1",
        )
        .unwrap(),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/healthz")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("ok", json["status"]);
    assert_eq!("sdkwork-claw-edge-server", json["service"]);
}

#[tokio::test]
async fn edge_server_can_dispatch_to_in_process_upstreams() {
    let portal_dist = temp_portal_dist_dir("in-process-upstreams");
    write_portal_dist_fixture(&portal_dist);
    let gateway_router = Router::new()
        .route(
            "/healthz",
            axum::routing::get(|| async {
                Json(json!({
                    "status": "ok",
                    "service": "embedded-gateway",
                }))
            }),
        )
        .route(
            "/v1/models",
            axum::routing::get(|| async {
                Json(json!({
                    "surface": "gateway",
                }))
            }),
        )
        .route(
            "/app/v3/api/auth/login",
            axum::routing::get(|| async {
                Json(json!({
                    "surface": "embedded-gateway",
                }))
            }),
        );
    let backend_router = Router::new()
        .route(
            "/healthz",
            axum::routing::get(|| async {
                Json(json!({
                    "status": "ok",
                    "service": "embedded-backend",
                }))
            }),
        )
        .route(
            "/backend/v3/api/ai/models",
            axum::routing::get(|| async {
                Json(json!({
                    "surface": "backend",
                }))
            }),
        );
    let app_router = Router::new()
        .route(
            "/healthz",
            axum::routing::get(|| async {
                Json(json!({
                    "status": "ok",
                    "service": "embedded-app",
                }))
            }),
        )
        .route(
            "/app/v3/api/ai/models",
            axum::routing::get(|| async {
                Json(json!({
                    "surface": "app",
                }))
            }),
        )
        .route(
            "/app/v3/api/auth/login",
            axum::routing::get(|| async {
                Json(json!({
                    "surface": "app",
                }))
            }),
        );
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router_with_in_process_upstreams(
        sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
            "http://127.0.0.1:1",
            "http://127.0.0.1:1",
            "http://127.0.0.1:1",
            "http://127.0.0.1:1",
        )
        .unwrap()
        .with_portal_static_dist(portal_dist.clone())
        .unwrap(),
        sdkwork_clawrouter_cloud_gateway::EdgeInProcessUpstreams::new(
            gateway_router,
            backend_router,
            app_router,
        ),
    );

    let gateway = json_request(router.clone(), Method::GET, "/v1/models", "").await;
    assert_eq!("gateway", gateway["surface"]);

    let backend = json_request(router.clone(), Method::GET, "/backend/v3/api/ai/models", "").await;
    assert_eq!("backend", backend["surface"]);

    let app = json_request(router.clone(), Method::GET, "/app/v3/api/ai/models", "").await;
    assert_eq!("app", app["surface"]);

    let appbase_auth =
        json_request(router.clone(), Method::GET, "/app/v3/api/auth/login", "").await;
    assert_eq!("embedded-gateway", appbase_auth["surface"]);

    let ready = json_request(router, Method::GET, "/readyz", "").await;
    assert_eq!("ok", ready["status"]);
    assert_eq!("embedded-gateway", ready["upstreams"]["gateway"]["service"]);
    assert_eq!("embedded-backend", ready["upstreams"]["backend"]["service"]);
    assert_eq!("embedded-app", ready["upstreams"]["app"]["service"]);

    let _ = std::fs::remove_dir_all(&portal_dist);
}

#[tokio::test]
async fn edge_server_readyz_reports_all_upstreams_ready() {
    let gateway = spawn_health_upstream("gateway", true).await;
    let admin = spawn_health_upstream("admin", true).await;
    let app = spawn_health_upstream("app", true).await;
    let portal = spawn_health_upstream("portal", true).await;
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(
        sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
            &gateway.base_url,
            &admin.base_url,
            &app.base_url,
            &portal.base_url,
        )
        .unwrap(),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/readyz")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("ok", json["status"]);
    assert_eq!("sdkwork-claw-edge-server", json["service"]);
    assert_eq!("ok", json["upstreams"]["gateway"]["status"]);
    assert_eq!("ok", json["upstreams"]["backend"]["status"]);
    assert_eq!("ok", json["upstreams"]["app"]["status"]);
    assert_eq!("ok", json["upstreams"]["portal"]["status"]);

    let _ = gateway.stop.send(());
    let _ = admin.stop.send(());
    let _ = app.stop.send(());
    let _ = portal.stop.send(());
}

#[tokio::test]
async fn edge_server_readyz_returns_unavailable_when_any_upstream_is_unhealthy() {
    let gateway = spawn_health_upstream("gateway", true).await;
    let admin = spawn_health_upstream("admin", false).await;
    let app = spawn_health_upstream("app", true).await;
    let portal = spawn_health_upstream("portal", true).await;
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(
        sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
            &gateway.base_url,
            &admin.base_url,
            &app.base_url,
            &portal.base_url,
        )
        .unwrap(),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/readyz")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::SERVICE_UNAVAILABLE, response.status());
    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("unavailable", json["status"]);
    assert_eq!("ok", json["upstreams"]["gateway"]["status"]);
    assert_eq!("unavailable", json["upstreams"]["backend"]["status"]);
    assert_eq!(503, json["upstreams"]["backend"]["httpStatus"]);
    assert_eq!("ok", json["upstreams"]["app"]["status"]);
    assert_eq!("ok", json["upstreams"]["portal"]["status"]);

    let _ = gateway.stop.send(());
    let _ = admin.stop.send(());
    let _ = app.stop.send(());
    let _ = portal.stop.send(());
}

#[tokio::test]
async fn edge_server_uses_configured_ready_timeout() {
    let gateway = spawn_slow_health_upstream(Duration::from_millis(80)).await;
    let admin = spawn_health_upstream("admin", true).await;
    let app = spawn_health_upstream("app", true).await;
    let portal = spawn_health_upstream("portal", true).await;
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(
        sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
            &gateway.base_url,
            &admin.base_url,
            &app.base_url,
            &portal.base_url,
        )
        .unwrap()
        .with_ready_check_timeout(Duration::from_millis(20))
        .unwrap(),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/readyz")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::SERVICE_UNAVAILABLE, response.status());
    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(
        "upstream health check timed out",
        json["upstreams"]["gateway"]["error"]
    );

    let _ = gateway.stop.send(());
    let _ = admin.stop.send(());
    let _ = app.stop.send(());
    let _ = portal.stop.send(());
}

#[tokio::test]
async fn edge_server_uses_configured_upstream_request_timeout() {
    let upstream = spawn_slow_upstream(Duration::from_millis(80)).await;
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(
        sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
            &upstream.base_url,
            &upstream.base_url,
            &upstream.base_url,
            &upstream.base_url,
        )
        .unwrap()
        .with_upstream_request_timeout(Duration::from_millis(20))
        .unwrap(),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/v1/models")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_GATEWAY, response.status());
    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("upstream request timed out", json["error"]);

    let _ = upstream.stop.send(());
}

#[tokio::test]
async fn edge_server_streams_request_bodies_without_buffering_before_upstream() {
    let upstream = spawn_request_streaming_upstream().await;
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(
        sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
            &upstream.base_url,
            &upstream.base_url,
            &upstream.base_url,
            &upstream.base_url,
        )
        .unwrap(),
    );

    let response = timeout(
        Duration::from_millis(150),
        router.oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/v1/files")
                .body(Body::from_stream(SlowUploadStream::new()))
                .unwrap(),
        ),
    )
    .await
    .expect("edge server should forward upload chunks before the full request body completes")
    .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(true, json["streamed"]);

    let _ = upstream.stop.send(());
}

#[tokio::test]
async fn edge_server_streams_upstream_responses_without_buffering() {
    let upstream = spawn_streaming_upstream().await;
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(
        sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
            &upstream.base_url,
            &upstream.base_url,
            &upstream.base_url,
            &upstream.base_url,
        )
        .unwrap(),
    );

    let response = timeout(
        Duration::from_millis(150),
        router.oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/v1/chat/completions")
                .body(Body::empty())
                .unwrap(),
        ),
    )
    .await
    .expect("edge server should return response headers before upstream stream completes")
    .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let mut body = response.into_body();
    let first_frame = timeout(Duration::from_millis(150), body.frame())
        .await
        .expect("edge server should stream the first upstream body chunk before completion")
        .expect("response body should produce a frame")
        .expect("response body frame should be valid");
    let first_chunk = first_frame
        .into_data()
        .expect("first streamed frame should contain data");
    assert_eq!("data: first\n\n", String::from_utf8_lossy(&first_chunk));

    let _ = upstream.stop.send(());
}

#[tokio::test]
async fn edge_server_forwards_api_and_portal_paths_through_rust() {
    let gateway = spawn_upstream("gateway").await;
    let admin = spawn_upstream("admin").await;
    let app = spawn_upstream("app").await;
    let portal = spawn_upstream("portal").await;

    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(
        sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
            &gateway.base_url,
            &admin.base_url,
            &app.base_url,
            &portal.base_url,
        )
        .unwrap(),
    );

    let app_response = json_request(
        router.clone(),
        Method::POST,
        "/app/v3/api/router/channels?limit=1",
        r#"{"kind":"app"}"#,
    )
    .await;
    assert_eq!("app", app_response["upstream"]);
    assert_eq!("/app/v3/api/router/channels?limit=1", app_response["path"]);
    assert_eq!("Bearer test-token", app_response["authorization"]);
    assert_eq!("sdkwork.example.test", app_response["forwardedHost"]);
    assert_eq!("http", app_response["forwardedProto"]);
    assert_eq!(r#"{"kind":"app"}"#, app_response["body"]);

    let admin_response =
        json_request(router.clone(), Method::GET, "/backend/v3/api/ai/models", "").await;
    assert_eq!("admin", admin_response["upstream"]);
    assert_eq!("/backend/v3/api/ai/models", admin_response["path"]);

    let models_response = json_request(router.clone(), Method::GET, "/v1/models", "").await;
    assert_eq!("gateway", models_response["upstream"]);
    assert_eq!("/v1/models", models_response["path"]);

    let openapi_response = json_request(router.clone(), Method::GET, "/openapi.json", "").await;
    assert_eq!("gateway", openapi_response["upstream"]);
    assert_eq!("/openapi.json", openapi_response["path"]);

    let schema_tabs_response =
        json_request(router.clone(), Method::GET, "/openapi/schema-tabs.json", "").await;
    assert_eq!("gateway", schema_tabs_response["upstream"]);
    assert_eq!("/openapi/schema-tabs.json", schema_tabs_response["path"]);

    let portal_response = json_request(router, Method::GET, "/console/dashboard", "").await;
    assert_eq!("portal", portal_response["upstream"]);
    assert_eq!("/console/dashboard", portal_response["path"]);

    let _ = gateway.stop.send(());
    let _ = admin.stop.send(());
    let _ = app.stop.send(());
    let _ = portal.stop.send(());
}

#[tokio::test]
async fn edge_server_can_serve_portal_dist_without_node_server() {
    let gateway = spawn_upstream("gateway").await;
    let admin = spawn_upstream("admin").await;
    let app = spawn_upstream("app").await;
    let portal_dist = temp_portal_dist_dir("portal-dist");
    write_portal_dist_fixture(&portal_dist);

    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        &gateway.base_url,
        &admin.base_url,
        &app.base_url,
        "http://127.0.0.1:3901",
    )
    .unwrap()
    .with_portal_static_dist(portal_dist.clone())
    .unwrap()
    .with_portal_public_api_base_url("https://tenant-api.example.com/api")
    .unwrap()
    .with_portal_public_app_api_base_url("/app/v3/api")
    .unwrap()
    .with_portal_public_backend_api_base_url("/backend/v3/api")
    .unwrap()
    .with_portal_public_appbase_backend_api_base_url("https://appbase.example.com/backend/v3/api")
    .unwrap()
    .with_portal_static_cache_control("private, no-cache", "public, max-age=86400, immutable")
    .unwrap()
    .with_portal_public_tool_api_enabled(false);
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(config);

    let root_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, root_response.status());
    assert_eq!(
        "nosniff",
        root_response
            .headers()
            .get("x-content-type-options")
            .unwrap()
            .to_str()
            .unwrap()
    );
    assert_eq!(
        "DENY",
        root_response
            .headers()
            .get("x-frame-options")
            .unwrap()
            .to_str()
            .unwrap()
    );
    let content_security_policy = root_response
        .headers()
        .get("content-security-policy")
        .unwrap()
        .to_str()
        .unwrap();
    assert!(content_security_policy.contains("connect-src 'self' https://api.sdkwork.com"));
    assert!(content_security_policy.contains("https://tenant-api.example.com"));
    assert!(content_security_policy.contains("https://appbase.example.com"));
    assert_eq!(
        "private, no-cache",
        root_response
            .headers()
            .get(header::CACHE_CONTROL)
            .unwrap()
            .to_str()
            .unwrap()
    );
    let root_body = to_bytes(root_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let root_html = String::from_utf8_lossy(&root_body);
    assert!(root_html.contains(r#"<div id="root"></div>"#));
    assert!(root_html.contains(r#"<script type="module" src="/runtime-env.js"></script>"#));
    assert!(
        root_html.find(r#"src="/runtime-env.js""#).unwrap()
            < root_html.find(r#"src="/assets/index-test.js""#).unwrap()
    );

    let runtime_env_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/runtime-env.js")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, runtime_env_response.status());
    assert_eq!(
        "application/javascript; charset=utf-8",
        runtime_env_response
            .headers()
            .get(header::CONTENT_TYPE)
            .unwrap()
            .to_str()
            .unwrap()
    );
    let runtime_env_body = to_bytes(runtime_env_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let runtime_env = String::from_utf8_lossy(&runtime_env_body);
    assert!(runtime_env.contains("window.__CLAWROUTER_ENV__ = Object.freeze("));
    assert!(runtime_env.contains(r#""VITE_API_BASE_URL":"https://tenant-api.example.com/api""#));
    assert!(runtime_env
        .contains(r#""VITE_CLAWROUTER_OPEN_API_BASE_URL":"https://tenant-api.example.com/api""#));
    assert!(runtime_env.contains(r#""VITE_CLAWROUTER_APP_API_BASE_URL":"/app/v3/api""#));
    assert!(runtime_env.contains(r#""VITE_CLAWROUTER_BACKEND_API_BASE_URL":"/backend/v3/api""#));
    assert!(runtime_env.contains(
        r#""VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL":"https://appbase.example.com/backend/v3/api""#
    ));
    assert!(runtime_env.contains(r#""VITE_TOOL_API_ENABLED":"false""#));

    let (tool_status, tool_payload) =
        json_request_with_status(router.clone(), Method::POST, "/api/code-snippet", "{}").await;
    assert_eq!(StatusCode::NOT_FOUND, tool_status);
    assert_eq!("Not found", tool_payload["error"]);

    let asset_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/assets/index-test.js")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, asset_response.status());
    assert_eq!(
        "public, max-age=86400, immutable",
        asset_response
            .headers()
            .get(header::CACHE_CONTROL)
            .unwrap()
            .to_str()
            .unwrap()
    );

    let schema_tabs_payload =
        json_request(router.clone(), Method::GET, "/openapi/schema-tabs.json", "").await;
    let schema_tabs = schema_tabs_payload["tabs"].as_array().unwrap();
    let schema_tab_ids = schema_tabs
        .iter()
        .map(|tab| tab["id"].as_str().unwrap())
        .collect::<Vec<_>>();
    assert_eq!(
        vec![
            "llm-open-api",
            "image-open-api",
            "video-open-api",
            "audio-open-api",
            "drive-open-api",
            "knowledgebase-open-api",
            "memory-open-api",
            "agent-open-api",
            "payment-open-api",
            "iaas-open-api",
            "paas-open-api",
            "app-api",
            "backend-api",
        ],
        schema_tab_ids
    );
    assert_eq!("LLM Open API", schema_tabs[0]["name"]);
    assert_eq!("available", schema_tabs[0]["status"]);
    assert_eq!(10, schema_tabs[0]["order"]);
    assert_eq!("/openapi.json", schema_tabs[0]["schemaUrls"][0]);
    assert!(schema_tabs[0]["aliases"]
        .as_array()
        .unwrap()
        .contains(&json!("gateway")));
    assert_eq!("llm", schema_tabs[0]["serviceGroups"][0]["code"]);

    assert_eq!("Image Open API", schema_tabs[1]["name"]);
    assert_eq!(
        "image_generation",
        schema_tabs[1]["serviceGroups"][0]["code"]
    );
    assert_eq!("Video Open API", schema_tabs[2]["name"]);
    assert_eq!(
        "video_generation",
        schema_tabs[2]["serviceGroups"][0]["code"]
    );
    assert!(schema_tabs[2]["serviceGroups"][0]["providerCodes"]
        .as_array()
        .unwrap()
        .contains(&json!("kling")));
    assert_eq!("Audio Open API", schema_tabs[3]["name"]);
    assert!(schema_tabs[3]["aliases"]
        .as_array()
        .unwrap()
        .contains(&json!("voice-open-api")));
    assert_eq!(
        "audio_generation",
        schema_tabs[3]["serviceGroups"][0]["code"]
    );

    assert_eq!("Drive Open API", schema_tabs[4]["name"]);
    assert_eq!(50, schema_tabs[4]["order"]);
    assert_eq!("drive", schema_tabs[4]["serviceGroups"][0]["code"]);
    assert!(schema_tabs[4]["serviceGroups"][0]["operations"]
        .as_array()
        .unwrap()
        .contains(&json!("file_upload")));

    assert_eq!("Knowledgebase Open API", schema_tabs[5]["name"]);
    assert_eq!(60, schema_tabs[5]["order"]);
    assert_eq!("knowledgebase", schema_tabs[5]["serviceGroups"][0]["code"]);
    assert!(schema_tabs[5]["serviceGroups"][0]["operations"]
        .as_array()
        .unwrap()
        .contains(&json!("vector_store_search")));

    assert_eq!("Memory Open API", schema_tabs[6]["name"]);
    assert_eq!(70, schema_tabs[6]["order"]);
    assert_eq!("memory", schema_tabs[6]["serviceGroups"][0]["code"]);
    assert!(schema_tabs[6]["serviceGroups"][0]["operations"]
        .as_array()
        .unwrap()
        .contains(&json!("conversation_items")));

    assert_eq!("Agent Open API", schema_tabs[7]["name"]);
    assert_eq!(80, schema_tabs[7]["order"]);
    assert_eq!("agent", schema_tabs[7]["serviceGroups"][0]["code"]);
    assert!(schema_tabs[7]["serviceGroups"][0]["operations"]
        .as_array()
        .unwrap()
        .contains(&json!("assistant_runs")));

    assert_eq!("Payment Open API", schema_tabs[8]["name"]);
    assert_eq!(90, schema_tabs[8]["order"]);
    assert_eq!(
        "/payments/v3/openapi.json",
        schema_tabs[8]["defaultSchemaUrl"]
    );
    assert!(schema_tabs[8]["aliases"]
        .as_array()
        .unwrap()
        .contains(&json!("payment-aggregate")));

    assert_eq!("IaaS Open API", schema_tabs[9]["name"]);
    assert_eq!(100, schema_tabs[9]["order"]);
    assert_eq!("/cloud/v3/openapi.json", schema_tabs[9]["schemaUrls"][0]);
    assert!(schema_tabs[9]["aliases"]
        .as_array()
        .unwrap()
        .contains(&json!("cloud-services")));
    assert_eq!("object_storage", schema_tabs[9]["serviceGroups"][0]["code"]);
    assert!(schema_tabs[9]["serviceGroups"][0]["providerCodes"]
        .as_array()
        .unwrap()
        .contains(&json!("huawei_obs")));
    assert!(schema_tabs[9]["serviceGroups"][0]["providerCodes"]
        .as_array()
        .unwrap()
        .contains(&json!("volcengine_tos")));
    assert!(schema_tabs[9]["serviceGroups"][0]["operations"]
        .as_array()
        .unwrap()
        .contains(&json!("s3_object_batch_delete")));
    assert!(schema_tabs[9]["serviceGroups"][0]["operations"]
        .as_array()
        .unwrap()
        .contains(&json!("s3_server_side_encryption")));
    let iaas_service_groups = schema_tabs[9]["serviceGroups"].as_array().unwrap();
    assert!(iaas_service_groups
        .iter()
        .any(|group| group["code"] == "cloud_compute"));
    assert!(iaas_service_groups
        .iter()
        .any(|group| group["code"] == "container_runtime"));
    assert!(iaas_service_groups
        .iter()
        .any(|group| group["code"] == "deployment_orchestration"));

    assert_eq!("PaaS Open API", schema_tabs[10]["name"]);
    assert_eq!(110, schema_tabs[10]["order"]);
    assert_eq!("/paas/v3/openapi.json", schema_tabs[10]["defaultSchemaUrl"]);
    assert!(schema_tabs[10]["aliases"]
        .as_array()
        .unwrap()
        .contains(&json!("paas-api")));
    assert_eq!("ocr", schema_tabs[10]["serviceGroups"][0]["code"]);
    assert!(schema_tabs[10]["serviceGroups"]
        .as_array()
        .unwrap()
        .iter()
        .any(|group| group["code"] == "content_moderation"));

    assert_eq!("app-api", schema_tabs[11]["id"]);
    assert_eq!(120, schema_tabs[11]["order"]);
    assert_eq!("backend-api", schema_tabs[12]["id"]);
    assert_eq!(130, schema_tabs[12]["order"]);
    let openapi_payload = json_request(router.clone(), Method::GET, "/openapi.json", "").await;
    assert_eq!("3.0.3", openapi_payload["openapi"]);
    assert_eq!("Claw Router Open API", openapi_payload["info"]["title"]);
    assert!(openapi_payload["paths"]
        .get("/v1/chat/completions")
        .is_some());

    let payment_openapi_payload =
        json_request(router.clone(), Method::GET, "/payments/v3/openapi.json", "").await;
    assert_eq!("3.1.2", payment_openapi_payload["openapi"]);
    assert_eq!(
        "SDKWork Payment Aggregate API",
        payment_openapi_payload["info"]["title"]
    );

    let paas_openapi_payload =
        json_request(router.clone(), Method::GET, "/paas/v3/openapi.json", "").await;
    assert_eq!("3.1.2", paas_openapi_payload["openapi"]);
    assert_eq!("SDKWork PaaS API", paas_openapi_payload["info"]["title"]);
    assert!(paas_openapi_payload["paths"]
        .get("/paas/v3/ocr/recognitions")
        .is_some());
    assert!(payment_openapi_payload["paths"]
        .get("/payments/v3/payment_intents")
        .is_some());

    let cloud_openapi_payload =
        json_request(router.clone(), Method::GET, "/cloud/v3/openapi.json", "").await;
    assert_eq!("3.1.2", cloud_openapi_payload["openapi"]);
    assert_eq!(
        "SDKWork Cloud Services API",
        cloud_openapi_payload["info"]["title"]
    );
    assert_eq!(true, cloud_openapi_payload["x-s3-compatible"]);
    assert!(cloud_openapi_payload["paths"]
        .get("/cloud/v3/storage/buckets")
        .is_some());
    assert!(cloud_openapi_payload["paths"]
        .get("/cloud/v3/storage/presigned-urls")
        .is_some());
    assert!(cloud_openapi_payload["paths"]
        .get("/cloud/v3/storage/sdk-config")
        .is_some());
    assert!(cloud_openapi_payload["paths"]
        .get("/cloud/v3/storage/buckets/{bucket}/acl")
        .is_some());
    assert!(cloud_openapi_payload["paths"]
        .get("/cloud/v3/iaas/compute/instances")
        .is_some());
    assert!(cloud_openapi_payload["paths"]
        .get("/cloud/v3/iaas/containers")
        .is_some());
    assert!(cloud_openapi_payload["paths"]
        .get("/cloud/v3/iaas/deployments/applications")
        .is_some());
    assert!(cloud_openapi_payload["paths"]
        .get("/cloud/v3/storage/buckets/{bucket}/tagging")
        .is_some());
    assert!(cloud_openapi_payload["paths"]
        .get("/cloud/v3/storage/buckets/{bucket}/objects/delete")
        .is_some());
    assert!(cloud_openapi_payload["paths"]
        .get("/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}/acl")
        .is_some());
    assert!(cloud_openapi_payload["paths"]
        .get("/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}/tagging")
        .is_some());
    assert!(cloud_openapi_payload["paths"]
        .get("/cloud/v3/storage/buckets/{bucket}/multipart_uploads")
        .is_some());
    assert!(cloud_openapi_payload["components"]["schemas"]["S3AccessControlPolicy"].is_object());
    assert!(
        cloud_openapi_payload["components"]["schemas"]["S3ObjectBatchDeleteRequest"].is_object()
    );
    assert!(
        cloud_openapi_payload["components"]["schemas"]["S3MultipartUploadListResult"].is_object()
    );

    let app_openapi_payload =
        json_request(router.clone(), Method::GET, "/app/v3/api/openapi.json", "").await;
    assert_eq!("3.1.2", app_openapi_payload["openapi"]);
    assert_eq!("/app/v3/api", app_openapi_payload["x-api-prefix"]);

    let backend_openapi_payload = json_request(
        router.clone(),
        Method::GET,
        "/backend/v3/api/openapi.json",
        "",
    )
    .await;
    assert_eq!("3.1.2", backend_openapi_payload["openapi"]);
    assert_eq!("/backend/v3/api", backend_openapi_payload["x-api-prefix"]);

    let spa_response = router
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/console/dashboard")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, spa_response.status());
    let spa_body = to_bytes(spa_response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert!(String::from_utf8_lossy(&spa_body).contains(r#"<div id="root"></div>"#));

    let _ = std::fs::remove_dir_all(&portal_dist);
    let _ = gateway.stop.send(());
    let _ = admin.stop.send(());
    let _ = app.stop.send(());
}

#[tokio::test]
async fn edge_server_handles_enabled_portal_tool_api_inside_rust_edge() {
    let gateway = spawn_upstream("gateway").await;
    let admin = spawn_upstream("admin").await;
    let app = spawn_upstream("app").await;
    let portal_dist = temp_portal_dist_dir("portal-tool-api");
    write_portal_dist_fixture(&portal_dist);

    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        &gateway.base_url,
        &admin.base_url,
        &app.base_url,
        "http://127.0.0.1:3901",
    )
    .unwrap()
    .with_portal_static_dist(portal_dist.clone())
    .unwrap()
    .with_portal_public_tool_api_enabled(true);
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(config);

    let code_snippet_body = json!({
        "path": "/v1/models",
        "method": "get",
        "operation": {},
        "pathItem": {},
        "baseUrl": "/v1",
        "language": "typescript",
        "library": "fetch",
        "openAPISpec": {
            "openapi": "3.1.0",
            "info": { "title": "SDKWork Claw Router", "version": "1.0.0" },
            "paths": { "/v1/models": { "get": {} } }
        }
    });
    let response = request_with_json_body(
        router.clone(),
        Method::POST,
        "/api/code-snippet",
        &code_snippet_body.to_string(),
    )
    .await;
    assert_eq!("no-store", response.headers()[header::CACHE_CONTROL]);
    assert_eq!("nosniff", response.headers()["x-content-type-options"]);
    let status = response.status();
    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(StatusCode::OK, status);
    let code = payload["code"].as_str().unwrap();
    assert!(code.contains(r#"await fetch("/v1/models""#));
    assert!(code.contains("CLAWROUTER_API_KEY"));

    let mut invalid_base_url_body = code_snippet_body.clone();
    invalid_base_url_body["baseUrl"] = json!("https://api.example.test?token=leak");
    let (status, payload) = json_request_with_status(
        router.clone(),
        Method::POST,
        "/api/code-snippet",
        &invalid_base_url_body.to_string(),
    )
    .await;
    assert_eq!(StatusCode::BAD_REQUEST, status);
    assert_eq!(
        "baseUrl must be an HTTP/HTTPS URL or root-relative path without query strings or fragments",
        payload["error"]
    );

    let sdk_readme_body = json!({
        "spec": {
            "openapi": "3.1.0",
            "info": { "title": "SDKWork Claw Router", "version": "1.0.0" },
            "paths": { "/v1/models": { "get": {} } }
        },
        "language": "typescript",
        "config": {
            "name": "SdkworkAppClient",
            "version": "0.1.0",
            "language": "typescript",
            "baseUrl": "/app/v3/api",
            "packageName": "@sdkwork/clawrouter-app-sdk",
            "description": "SDKWork Claw Router app API SDK"
        }
    });
    let (status, payload) = json_request_with_status(
        router.clone(),
        Method::POST,
        "/api/sdk-readme",
        &sdk_readme_body.to_string(),
    )
    .await;
    assert_eq!(StatusCode::OK, status);
    let readme = payload["readme"].as_str().unwrap();
    assert!(readme.contains("# SdkworkAppClient"));
    assert!(readme.contains("@sdkwork/clawrouter-app-sdk"));
    assert!(readme.contains("/app/v3/api"));

    let default_sdk_readme_body = json!({
        "spec": {
            "openapi": "3.1.0",
            "info": { "title": "SDKWork Claw Router", "version": "1.0.0" },
            "paths": { "/v1/models": { "get": {} } }
        },
        "language": "typescript"
    });
    let (status, payload) = json_request_with_status(
        router.clone(),
        Method::POST,
        "/api/sdk-readme",
        &default_sdk_readme_body.to_string(),
    )
    .await;
    assert_eq!(StatusCode::OK, status);
    let default_readme = payload["readme"].as_str().unwrap();
    assert!(default_readme.contains("# SdkworkAppClient"));
    assert!(default_readme.contains("@sdkwork/clawrouter-app-sdk"));
    assert!(default_readme.contains("`0.1.0`"));
    assert!(default_readme.contains("/app/v3/api"));

    let (status, payload) = json_request_with_status(
        router,
        Method::POST,
        "/api/generate-sdk",
        &sdk_readme_body.to_string(),
    )
    .await;
    assert_eq!(StatusCode::BAD_GATEWAY, status);
    assert_eq!("sdk_generator_failed", payload["code"]);

    let _ = std::fs::remove_dir_all(&portal_dist);
    let _ = gateway.stop.send(());
    let _ = admin.stop.send(());
    let _ = app.stop.send(());
}

#[tokio::test]
async fn edge_server_uses_configured_portal_tool_api_max_body_bytes() {
    let gateway = spawn_upstream("gateway").await;
    let admin = spawn_upstream("admin").await;
    let app = spawn_upstream("app").await;
    let portal_dist = temp_portal_dist_dir("portal-tool-api-body-limit");
    write_portal_dist_fixture(&portal_dist);

    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        &gateway.base_url,
        &admin.base_url,
        &app.base_url,
        "http://127.0.0.1:3901",
    )
    .unwrap()
    .with_portal_static_dist(portal_dist.clone())
    .unwrap()
    .with_portal_public_tool_api_enabled(true)
    .with_portal_tool_api_max_body_bytes(32)
    .unwrap();
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(config);

    let response = request_with_json_body(
        router,
        Method::POST,
        "/api/code-snippet",
        r#"{"path":"/v1/models","method":"get","baseUrl":"/v1"}"#,
    )
    .await;

    assert_eq!(StatusCode::PAYLOAD_TOO_LARGE, response.status());
    assert_eq!("no-store", response.headers()[header::CACHE_CONTROL]);
    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("Request body is too large", payload["error"]);

    let _ = std::fs::remove_dir_all(&portal_dist);
    let _ = gateway.stop.send(());
    let _ = admin.stop.send(());
    let _ = app.stop.send(());
}

#[tokio::test]
async fn edge_server_serves_prebuilt_sdk_archive_from_configured_root() {
    let gateway = spawn_upstream("gateway").await;
    let admin = spawn_upstream("admin").await;
    let app = spawn_upstream("app").await;
    let portal_dist = temp_portal_dist_dir("portal-tool-api-sdk-archive");
    let archive_root = temp_portal_dist_dir("portal-tool-api-sdk-archive-root");
    write_portal_dist_fixture(&portal_dist);
    std::fs::create_dir_all(&archive_root).unwrap();
    let archive_bytes = b"PK\x03\x04prebuilt-sdk-archive";
    std::fs::write(
        archive_root.join("sdkwork-clawrouter-app-sdk-typescript-0.1.0.zip"),
        archive_bytes,
    )
    .unwrap();

    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        &gateway.base_url,
        &admin.base_url,
        &app.base_url,
        "http://127.0.0.1:3901",
    )
    .unwrap()
    .with_portal_static_dist(portal_dist.clone())
    .unwrap()
    .with_portal_public_tool_api_enabled(true)
    .with_portal_tool_api_sdk_archive_root(archive_root.clone())
    .unwrap();
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(config);

    let body = json!({
        "spec": {
            "openapi": "3.1.0",
            "info": { "title": "SDKWork Claw Router", "version": "1.0.0" },
            "paths": { "/v1/models": { "get": {} } }
        },
        "language": "typescript",
        "config": {
            "name": "SdkworkAppClient",
            "version": "0.1.0",
            "language": "typescript",
            "baseUrl": "/app/v3/api",
            "packageName": "@sdkwork/clawrouter-app-sdk",
            "description": "SDKWork Claw Router app API SDK"
        }
    });

    let response =
        request_with_json_body(router, Method::POST, "/api/generate-sdk", &body.to_string()).await;

    assert_eq!(StatusCode::OK, response.status());
    assert_eq!("application/zip", response.headers()[header::CONTENT_TYPE]);
    assert_eq!("no-store", response.headers()[header::CACHE_CONTROL]);
    assert_eq!("nosniff", response.headers()["x-content-type-options"]);
    assert_eq!("119", response.headers()["ratelimit-remaining"]);
    assert!(response.headers()[header::CONTENT_DISPOSITION]
        .to_str()
        .unwrap()
        .contains("sdkwork-clawrouter-app-sdk-typescript-0.1.0.zip"));
    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    assert_eq!(archive_bytes.as_slice(), body.as_ref());

    let _ = std::fs::remove_dir_all(&portal_dist);
    let _ = std::fs::remove_dir_all(&archive_root);
    let _ = gateway.stop.send(());
    let _ = admin.stop.send(());
    let _ = app.stop.send(());
}

#[tokio::test]
async fn edge_server_generates_sdk_with_default_current_origin_generator_url() {
    let (gateway, generator_requests) = spawn_sdk_generator_fixture().await;
    let admin = spawn_upstream("admin").await;
    let app = spawn_upstream("app").await;
    let portal_dist = temp_portal_dist_dir("portal-tool-api-sdk-generator-default-origin");
    write_portal_dist_fixture(&portal_dist);

    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        &gateway.base_url,
        &admin.base_url,
        &app.base_url,
        "http://127.0.0.1:3901",
    )
    .unwrap()
    .with_portal_static_dist(portal_dist.clone())
    .unwrap()
    .with_portal_public_tool_api_enabled(true);
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(config);

    let body = json!({
        "spec": {
            "openapi": "3.1.0",
            "info": { "title": "SDKWork Claw Router App API", "version": "1.0.0" },
            "paths": { "/app/v3/api/ai/models": { "get": {} } }
        },
        "language": "typescript",
        "config": {
            "name": "SdkworkAppClient",
            "version": "0.1.0",
            "language": "typescript",
            "sdkType": "app",
            "baseUrl": "/app/v3/api",
            "apiPrefix": "/app/v3/api",
            "packageName": "@sdkwork/clawrouter-app-sdk",
            "description": "SDKWork Claw Router app API SDK"
        }
    });

    let response = request_with_json_body_with_host(
        router,
        Method::POST,
        "/api/generate-sdk",
        &body.to_string(),
        gateway.base_url.strip_prefix("http://").unwrap(),
    )
    .await;

    assert_eq!(StatusCode::OK, response.status());
    assert_eq!("application/zip", response.headers()[header::CONTENT_TYPE]);
    assert_eq!("no-store", response.headers()[header::CACHE_CONTROL]);
    assert!(response.headers()[header::CONTENT_DISPOSITION]
        .to_str()
        .unwrap()
        .contains("generated-clawrouter-sdk.zip"));
    let archive = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    assert_eq!(
        b"PK\x03\x04generated-sdk-archive".as_slice(),
        archive.as_ref()
    );

    let requests = generator_requests.lock().await;
    assert_eq!(3, requests.len());
    assert_eq!("POST", requests[0].method);
    assert_eq!("/v1/sdk-generator/generations:upload", requests[0].path);
    assert!(requests[0]
        .content_type
        .as_deref()
        .unwrap_or_default()
        .starts_with("multipart/form-data"));
    let upload_body = String::from_utf8_lossy(&requests[0].body);
    assert!(upload_body.contains("SDKWork Claw Router App API"));
    assert!(upload_body.contains("name=\"language\""));
    assert!(upload_body.contains("typescript"));
    assert!(upload_body.contains("name=\"sdkType\""));
    assert!(upload_body.contains("app"));
    assert!(upload_body.contains("name=\"apiPrefix\""));
    assert!(upload_body.contains("/app/v3/api"));
    assert_eq!("GET", requests[1].method);
    assert_eq!("/v1/sdk-generator/jobs/job-123", requests[1].path);
    assert_eq!("GET", requests[2].method);
    assert_eq!(
        "/v1/sdk-generator/jobs/job-123/download?format=zip",
        requests[2].path
    );
    drop(requests);

    let _ = std::fs::remove_dir_all(&portal_dist);
    let _ = gateway.stop.send(());
    let _ = admin.stop.send(());
    let _ = app.stop.send(());
}

#[tokio::test]
async fn edge_server_returns_not_found_when_prebuilt_sdk_archive_is_missing() {
    let gateway = spawn_upstream("gateway").await;
    let admin = spawn_upstream("admin").await;
    let app = spawn_upstream("app").await;
    let portal_dist = temp_portal_dist_dir("portal-tool-api-sdk-archive-missing");
    let archive_root = temp_portal_dist_dir("portal-tool-api-sdk-archive-missing-root");
    write_portal_dist_fixture(&portal_dist);
    std::fs::create_dir_all(&archive_root).unwrap();

    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        &gateway.base_url,
        &admin.base_url,
        &app.base_url,
        "http://127.0.0.1:3901",
    )
    .unwrap()
    .with_portal_static_dist(portal_dist.clone())
    .unwrap()
    .with_portal_public_tool_api_enabled(true)
    .with_portal_tool_api_sdk_archive_root(archive_root.clone())
    .unwrap();
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(config);

    let body = json!({
        "spec": {
            "openapi": "3.1.0",
            "info": { "title": "SDKWork Claw Router", "version": "1.0.0" },
            "paths": { "/v1/models": { "get": {} } }
        },
        "language": "typescript",
        "config": {
            "name": "SdkworkBackendClient",
            "version": "0.1.0",
            "language": "typescript",
            "baseUrl": "/backend/v3/api",
            "packageName": "@sdkwork/clawrouter-backend-sdk"
        }
    });

    let (status, payload) =
        json_request_with_status(router, Method::POST, "/api/generate-sdk", &body.to_string())
            .await;

    assert_eq!(StatusCode::NOT_FOUND, status);
    assert_eq!("sdk_archive_not_found", payload["code"]);

    let _ = std::fs::remove_dir_all(&portal_dist);
    let _ = std::fs::remove_dir_all(&archive_root);
    let _ = gateway.stop.send(());
    let _ = admin.stop.send(());
    let _ = app.stop.send(());
}

#[tokio::test]
async fn edge_server_rejects_non_generated_sdk_archive_package() {
    let gateway = spawn_upstream("gateway").await;
    let admin = spawn_upstream("admin").await;
    let app = spawn_upstream("app").await;
    let portal_dist = temp_portal_dist_dir("portal-tool-api-sdk-archive-unsupported");
    let archive_root = temp_portal_dist_dir("portal-tool-api-sdk-archive-unsupported-root");
    write_portal_dist_fixture(&portal_dist);
    std::fs::create_dir_all(&archive_root).unwrap();
    std::fs::write(
        archive_root.join("example-custom-sdk-typescript-1.0.0.zip"),
        b"PK\x03\x04custom-sdk-archive",
    )
    .unwrap();

    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        &gateway.base_url,
        &admin.base_url,
        &app.base_url,
        "http://127.0.0.1:3901",
    )
    .unwrap()
    .with_portal_static_dist(portal_dist.clone())
    .unwrap()
    .with_portal_public_tool_api_enabled(true)
    .with_portal_tool_api_sdk_archive_root(archive_root.clone())
    .unwrap();
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(config);

    let body = json!({
        "spec": {
            "openapi": "3.1.0",
            "info": { "title": "SDKWork Claw Router", "version": "1.0.0" },
            "paths": { "/v1/models": { "get": {} } }
        },
        "language": "typescript",
        "config": {
            "name": "ExampleCustomClient",
            "version": "1.0.0",
            "language": "typescript",
            "baseUrl": "/v1",
            "packageName": "@example/custom-sdk"
        }
    });

    let (status, payload) =
        json_request_with_status(router, Method::POST, "/api/generate-sdk", &body.to_string())
            .await;

    assert_eq!(StatusCode::BAD_REQUEST, status);
    assert_eq!("unsupported_sdk_archive", payload["code"]);

    let _ = std::fs::remove_dir_all(&portal_dist);
    let _ = std::fs::remove_dir_all(&archive_root);
    let _ = gateway.stop.send(());
    let _ = admin.stop.send(());
    let _ = app.stop.send(());
}

#[tokio::test]
async fn edge_server_rejects_unsafe_sdk_archive_identity() {
    let gateway = spawn_upstream("gateway").await;
    let admin = spawn_upstream("admin").await;
    let app = spawn_upstream("app").await;
    let portal_dist = temp_portal_dist_dir("portal-tool-api-sdk-archive-unsafe");
    let archive_root = temp_portal_dist_dir("portal-tool-api-sdk-archive-unsafe-root");
    write_portal_dist_fixture(&portal_dist);
    std::fs::create_dir_all(&archive_root).unwrap();

    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        &gateway.base_url,
        &admin.base_url,
        &app.base_url,
        "http://127.0.0.1:3901",
    )
    .unwrap()
    .with_portal_static_dist(portal_dist.clone())
    .unwrap()
    .with_portal_public_tool_api_enabled(true)
    .with_portal_tool_api_sdk_archive_root(archive_root.clone())
    .unwrap();
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(config);

    let body = json!({
        "spec": {
            "openapi": "3.1.0",
            "info": { "title": "SDKWork Claw Router", "version": "1.0.0" },
            "paths": { "/v1/models": { "get": {} } }
        },
        "language": "typescript",
        "config": {
            "name": "SdkworkAppClient",
            "version": "0.1.0",
            "language": "typescript",
            "baseUrl": "/app/v3/api",
            "packageName": "../outside"
        }
    });

    let (status, payload) =
        json_request_with_status(router, Method::POST, "/api/generate-sdk", &body.to_string())
            .await;

    assert_eq!(StatusCode::BAD_REQUEST, status);
    assert_eq!(
        "config.packageName contains unsafe archive identity characters",
        payload["error"]
    );

    let _ = std::fs::remove_dir_all(&portal_dist);
    let _ = std::fs::remove_dir_all(&archive_root);
    let _ = gateway.stop.send(());
    let _ = admin.stop.send(());
    let _ = app.stop.send(());
}

#[test]
fn edge_server_config_rejects_invalid_portal_tool_api_sdk_archive_root() {
    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        "http://127.0.0.1:18080",
        "http://127.0.0.1:18081",
        "http://127.0.0.1:18082",
        "http://127.0.0.1:3901",
    )
    .unwrap();
    let missing_root = temp_portal_dist_dir("portal-tool-api-sdk-archive-root-missing");

    assert!(config
        .with_portal_tool_api_sdk_archive_root(missing_root)
        .is_err());
}

#[tokio::test]
async fn edge_server_rate_limits_enabled_portal_tool_api_requests() {
    let gateway = spawn_upstream("gateway").await;
    let admin = spawn_upstream("admin").await;
    let app = spawn_upstream("app").await;
    let portal_dist = temp_portal_dist_dir("portal-tool-api-rate-limit");
    write_portal_dist_fixture(&portal_dist);

    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        &gateway.base_url,
        &admin.base_url,
        &app.base_url,
        "http://127.0.0.1:3901",
    )
    .unwrap()
    .with_portal_static_dist(portal_dist.clone())
    .unwrap()
    .with_portal_public_tool_api_enabled(true)
    .with_portal_tool_api_rate_limit(2, Duration::from_secs(60))
    .unwrap();
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(config);

    let body = json!({
        "path": "/v1/models",
        "method": "get",
        "operation": {},
        "pathItem": {},
        "baseUrl": "/v1",
        "language": "typescript",
        "library": "fetch",
        "openAPISpec": {
            "openapi": "3.1.0",
            "info": { "title": "SDKWork Claw Router", "version": "1.0.0" },
            "paths": { "/v1/models": { "get": {} } }
        }
    })
    .to_string();

    let first =
        request_with_json_body(router.clone(), Method::POST, "/api/code-snippet", &body).await;
    assert_eq!(StatusCode::OK, first.status());
    assert_eq!("2", first.headers()["ratelimit-limit"]);
    assert_eq!("1", first.headers()["ratelimit-remaining"]);

    let second =
        request_with_json_body(router.clone(), Method::POST, "/api/code-snippet", &body).await;
    assert_eq!(StatusCode::OK, second.status());
    assert_eq!("0", second.headers()["ratelimit-remaining"]);

    let limited = request_with_json_body(router, Method::POST, "/api/code-snippet", &body).await;
    assert_eq!(StatusCode::TOO_MANY_REQUESTS, limited.status());
    assert_eq!("no-store", limited.headers()[header::CACHE_CONTROL]);
    assert_eq!("nosniff", limited.headers()["x-content-type-options"]);
    assert_eq!("2", limited.headers()["ratelimit-limit"]);
    assert_eq!("0", limited.headers()["ratelimit-remaining"]);
    assert!(limited.headers().get("ratelimit-reset").is_some());
    assert!(limited.headers().get(header::RETRY_AFTER).is_some());
    let body = to_bytes(limited.into_body(), usize::MAX).await.unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("tool_api_rate_limited", payload["code"]);

    let _ = std::fs::remove_dir_all(&portal_dist);
    let _ = gateway.stop.send(());
    let _ = admin.stop.send(());
    let _ = app.stop.send(());
}

#[tokio::test]
async fn edge_server_rate_limits_portal_tool_api_by_client_address() {
    let gateway = spawn_upstream("gateway").await;
    let admin = spawn_upstream("admin").await;
    let app = spawn_upstream("app").await;
    let portal_dist = temp_portal_dist_dir("portal-tool-api-rate-limit-client");
    write_portal_dist_fixture(&portal_dist);

    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        &gateway.base_url,
        &admin.base_url,
        &app.base_url,
        "http://127.0.0.1:3901",
    )
    .unwrap()
    .with_portal_static_dist(portal_dist.clone())
    .unwrap()
    .with_portal_public_tool_api_enabled(true)
    .with_portal_tool_api_rate_limit(1, Duration::from_secs(60))
    .unwrap();
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(config);

    let body = json!({
        "path": "/v1/models",
        "method": "get",
        "operation": {},
        "pathItem": {},
        "baseUrl": "/v1",
        "language": "typescript",
        "library": "fetch",
        "openAPISpec": {
            "openapi": "3.1.0",
            "info": { "title": "SDKWork Claw Router", "version": "1.0.0" },
            "paths": { "/v1/models": { "get": {} } }
        }
    })
    .to_string();
    let first_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(203, 0, 113, 10)), 40000);
    let second_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(203, 0, 113, 11)), 40001);

    let first = request_with_json_body_from_addr(
        router.clone(),
        Method::POST,
        "/api/code-snippet",
        &body,
        first_addr,
    )
    .await;
    assert_eq!(StatusCode::OK, first.status());

    let limited = request_with_json_body_from_addr(
        router.clone(),
        Method::POST,
        "/api/code-snippet",
        &body,
        first_addr,
    )
    .await;
    assert_eq!(StatusCode::TOO_MANY_REQUESTS, limited.status());

    let separate_client = request_with_json_body_from_addr(
        router,
        Method::POST,
        "/api/code-snippet",
        &body,
        second_addr,
    )
    .await;
    assert_eq!(StatusCode::OK, separate_client.status());
    assert_eq!("0", separate_client.headers()["ratelimit-remaining"]);

    let _ = std::fs::remove_dir_all(&portal_dist);
    let _ = gateway.stop.send(());
    let _ = admin.stop.send(());
    let _ = app.stop.send(());
}

#[tokio::test]
async fn edge_server_rate_limits_portal_tool_api_by_trusted_forwarded_client() {
    let gateway = spawn_upstream("gateway").await;
    let admin = spawn_upstream("admin").await;
    let app = spawn_upstream("app").await;
    let portal_dist = temp_portal_dist_dir("portal-tool-api-rate-limit-forwarded-client");
    write_portal_dist_fixture(&portal_dist);

    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        &gateway.base_url,
        &admin.base_url,
        &app.base_url,
        "http://127.0.0.1:3901",
    )
    .unwrap()
    .with_portal_static_dist(portal_dist.clone())
    .unwrap()
    .with_trusted_forwarded_headers(true)
    .with_portal_public_tool_api_enabled(true)
    .with_portal_tool_api_rate_limit(1, Duration::from_secs(60))
    .unwrap();
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(config);

    let body = json!({
        "path": "/v1/models",
        "method": "get",
        "operation": {},
        "pathItem": {},
        "baseUrl": "/v1",
        "language": "typescript",
        "library": "fetch",
        "openAPISpec": {
            "openapi": "3.1.0",
            "info": { "title": "SDKWork Claw Router", "version": "1.0.0" },
            "paths": { "/v1/models": { "get": {} } }
        }
    })
    .to_string();
    let proxy_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(10, 0, 0, 1)), 40000);

    let first = request_with_json_body_from_addr_and_forwarded_for(
        router.clone(),
        Method::POST,
        "/api/code-snippet",
        &body,
        proxy_addr,
        "203.0.113.10, 10.0.0.1",
    )
    .await;
    assert_eq!(StatusCode::OK, first.status());

    let limited = request_with_json_body_from_addr_and_forwarded_for(
        router.clone(),
        Method::POST,
        "/api/code-snippet",
        &body,
        proxy_addr,
        "203.0.113.10, 10.0.0.1",
    )
    .await;
    assert_eq!(StatusCode::TOO_MANY_REQUESTS, limited.status());

    let separate_forwarded_client = request_with_json_body_from_addr_and_forwarded_for(
        router,
        Method::POST,
        "/api/code-snippet",
        &body,
        proxy_addr,
        "203.0.113.11, 10.0.0.1",
    )
    .await;
    assert_eq!(StatusCode::OK, separate_forwarded_client.status());

    let _ = std::fs::remove_dir_all(&portal_dist);
    let _ = gateway.stop.send(());
    let _ = admin.stop.send(());
    let _ = app.stop.send(());
}

#[tokio::test]
async fn edge_server_portal_csp_allows_explicit_private_api_origins() {
    let gateway = spawn_upstream("gateway").await;
    let admin = spawn_upstream("admin").await;
    let app = spawn_upstream("app").await;
    let portal_dist = temp_portal_dist_dir("portal-csp");
    write_portal_dist_fixture(&portal_dist);

    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        &gateway.base_url,
        &admin.base_url,
        &app.base_url,
        "http://127.0.0.1:3901",
    )
    .unwrap()
    .with_portal_static_dist(portal_dist.clone())
    .unwrap()
    .with_portal_public_api_base_url("https://tenant-api.example.com/api")
    .unwrap()
    .with_portal_public_open_api_base_url("https://open-sdk.example.com/v1")
    .unwrap()
    .with_portal_public_app_api_base_url("https://app-api.example.com/app/v3/api")
    .unwrap()
    .with_portal_public_backend_api_base_url("https://admin-api.example.com/backend/v3/api")
    .unwrap()
    .with_portal_public_appbase_backend_api_base_url(
        "https://appbase-admin.example.com/backend/v3/api",
    )
    .unwrap()
    .with_portal_csp_connect_src("https://analytics.example.com https://audit.example.com")
    .unwrap();
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(config);

    let response = router
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, response.status());
    let csp = response
        .headers()
        .get("content-security-policy")
        .unwrap()
        .to_str()
        .unwrap();

    assert!(csp.contains("connect-src 'self' https://api.sdkwork.com"));
    assert!(csp.contains("https://tenant-api.example.com"));
    assert!(csp.contains("https://open-sdk.example.com"));
    assert!(csp.contains("https://app-api.example.com"));
    assert!(csp.contains("https://admin-api.example.com"));
    assert!(csp.contains("https://appbase-admin.example.com"));
    assert!(csp.contains("https://analytics.example.com"));
    assert!(csp.contains("https://audit.example.com"));
    assert!(!csp.contains("/app/v3/api"));
    assert!(!csp.contains("/backend/v3/api"));
    assert!(!csp.contains("; https://analytics.example.com"));

    let _ = std::fs::remove_dir_all(&portal_dist);
    let _ = gateway.stop.send(());
    let _ = admin.stop.send(());
    let _ = app.stop.send(());
}

#[test]
fn edge_server_portal_csp_rejects_non_origin_connect_src_values() {
    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        "http://127.0.0.1:18080",
        "http://127.0.0.1:18081",
        "http://127.0.0.1:18082",
        "http://127.0.0.1:3901",
    )
    .unwrap();

    assert!(config
        .clone()
        .with_portal_csp_connect_src("https://tenant-api.example.com/api")
        .is_err());
    assert!(config
        .clone()
        .with_portal_csp_connect_src("javascript:alert(1)")
        .is_err());
    assert!(config
        .with_portal_csp_connect_src("https://ok.example.com; script-src *")
        .is_err());
}

#[test]
fn edge_server_rejects_unsafe_cors_allowed_origins() {
    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        "http://127.0.0.1:18080",
        "http://127.0.0.1:18081",
        "http://127.0.0.1:18082",
        "http://127.0.0.1:3901",
    )
    .unwrap();

    assert!(config.clone().with_cors_allowed_origins(["*"]).is_err());
    assert!(config
        .clone()
        .with_cors_allowed_origins(["https://portal.example.com/app"])
        .is_err());
    assert!(config
        .with_cors_allowed_origins(["javascript:alert(1)"])
        .is_err());
}

#[tokio::test]
async fn edge_server_handles_direct_portal_dev_cors_preflight() {
    let upstream = spawn_upstream("unused").await;
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(
        sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
            &upstream.base_url,
            &upstream.base_url,
            &upstream.base_url,
            &upstream.base_url,
        )
        .unwrap(),
    );

    let allowed_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::OPTIONS)
                .uri("/app/v3/api/ai/models")
                .header(header::ORIGIN, &upstream.base_url)
                .header(header::ACCESS_CONTROL_REQUEST_METHOD, "GET")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::NO_CONTENT, allowed_response.status());
    assert_eq!(
        upstream.base_url,
        allowed_response
            .headers()
            .get(header::ACCESS_CONTROL_ALLOW_ORIGIN)
            .unwrap()
            .to_str()
            .unwrap(),
    );
    assert_eq!(
        "Origin",
        allowed_response
            .headers()
            .get(header::VARY)
            .unwrap()
            .to_str()
            .unwrap(),
    );
    assert!(allowed_response
        .headers()
        .get(header::ACCESS_CONTROL_ALLOW_HEADERS)
        .unwrap()
        .to_str()
        .unwrap()
        .contains("authorization"));

    let rejected_response = router
        .oneshot(
            Request::builder()
                .method(Method::OPTIONS)
                .uri("/app/v3/api/ai/models")
                .header(header::ORIGIN, "https://evil.example.com")
                .header(header::ACCESS_CONTROL_REQUEST_METHOD, "GET")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::FORBIDDEN, rejected_response.status());
    assert!(rejected_response
        .headers()
        .get(header::ACCESS_CONTROL_ALLOW_ORIGIN)
        .is_none());

    let _ = upstream.stop.send(());
}

#[tokio::test]
async fn edge_server_allows_configured_external_cors_origins() {
    let upstream = spawn_upstream("unused").await;
    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        &upstream.base_url,
        &upstream.base_url,
        &upstream.base_url,
        &upstream.base_url,
    )
    .unwrap()
    .with_cors_allowed_origins(["https://portal.customer.example"])
    .unwrap();
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(config);

    let response = router
        .oneshot(
            Request::builder()
                .method(Method::OPTIONS)
                .uri("/app/v3/api/ai/models")
                .header(header::ORIGIN, "https://portal.customer.example")
                .header(header::ACCESS_CONTROL_REQUEST_METHOD, "GET")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::NO_CONTENT, response.status());
    assert_eq!(
        "https://portal.customer.example",
        response
            .headers()
            .get(header::ACCESS_CONTROL_ALLOW_ORIGIN)
            .unwrap()
            .to_str()
            .unwrap(),
    );

    let _ = upstream.stop.send(());
}

#[tokio::test]
async fn edge_server_preserves_upstream_vary_when_adding_cors_origin_vary() {
    let upstream = spawn_vary_upstream().await;
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(
        sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
            &upstream.base_url,
            &upstream.base_url,
            &upstream.base_url,
            &upstream.base_url,
        )
        .unwrap(),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/app/v3/api/ai/models")
                .header(header::ORIGIN, &upstream.base_url)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    assert_eq!(
        upstream.base_url,
        response
            .headers()
            .get(header::ACCESS_CONTROL_ALLOW_ORIGIN)
            .unwrap()
            .to_str()
            .unwrap(),
    );
    let vary = response
        .headers()
        .get(header::VARY)
        .unwrap()
        .to_str()
        .unwrap();
    assert!(vary.contains("Accept-Encoding"));
    assert!(vary.contains("Origin"));

    let _ = upstream.stop.send(());
}

#[tokio::test]
async fn edge_server_forwards_non_cors_options_requests_to_upstream() {
    let upstream = spawn_upstream("gateway").await;
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(
        sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
            &upstream.base_url,
            &upstream.base_url,
            &upstream.base_url,
            &upstream.base_url,
        )
        .unwrap(),
    );

    let response = json_request(router, Method::OPTIONS, "/v1/models", "").await;

    assert_eq!("gateway", response["upstream"]);
    assert_eq!("OPTIONS", response["method"]);
    assert_eq!("/v1/models", response["path"]);

    let _ = upstream.stop.send(());
}

#[tokio::test]
async fn edge_server_rejects_spoofed_forwarded_headers_by_default() {
    let upstream = spawn_upstream("gateway").await;
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(
        sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
            &upstream.base_url,
            &upstream.base_url,
            &upstream.base_url,
            &upstream.base_url,
        )
        .unwrap(),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/v1/models")
                .header(header::HOST, "sdkwork.example.test")
                .header("x-forwarded-host", "evil.example.test")
                .header("x-forwarded-proto", "https")
                .header("x-forwarded-for", "203.0.113.10")
                .header(
                    "forwarded",
                    "for=203.0.113.10;proto=https;host=evil.example.test",
                )
                .header("x-real-ip", "203.0.113.10")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("sdkwork.example.test", json["forwardedHost"]);
    assert_eq!("http", json["forwardedProto"]);
    assert!(json["forwardedFor"].is_null());
    assert!(json["forwarded"].is_null());
    assert!(json["realIp"].is_null());

    let _ = upstream.stop.send(());
}

#[tokio::test]
async fn edge_server_filters_request_headers_declared_by_connection_header() {
    let upstream = spawn_upstream("gateway").await;
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(
        sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
            &upstream.base_url,
            &upstream.base_url,
            &upstream.base_url,
            &upstream.base_url,
        )
        .unwrap(),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/v1/models")
                .header(header::HOST, "sdkwork.example.test")
                .header(header::CONNECTION, "x-connection-token-header")
                .header("x-connection-token-header", "should-drop")
                .header("x-end-to-end-header", "should-keep")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert!(json["connectionDeclaredHeader"].is_null());
    assert_eq!("should-keep", json["endToEndHeader"]);

    let _ = upstream.stop.send(());
}

#[tokio::test]
async fn edge_server_filters_response_headers_declared_by_connection_header() {
    let upstream = spawn_connection_declared_response_header_upstream().await;
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(
        sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
            &upstream.base_url,
            &upstream.base_url,
            &upstream.base_url,
            &upstream.base_url,
        )
        .unwrap(),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/v1/models")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    assert!(response
        .headers()
        .get("x-transient-upstream-header")
        .is_none());
    assert_eq!(
        "should-keep",
        response
            .headers()
            .get("x-end-to-end-header")
            .unwrap()
            .to_str()
            .unwrap(),
    );

    let _ = upstream.stop.send(());
}

#[tokio::test]
async fn edge_server_uses_configured_external_scheme_when_headers_are_untrusted() {
    let upstream = spawn_upstream("gateway").await;
    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        &upstream.base_url,
        &upstream.base_url,
        &upstream.base_url,
        &upstream.base_url,
    )
    .unwrap()
    .with_external_scheme("https")
    .unwrap();
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(config);

    let response = json_request(router, Method::GET, "/v1/models", "").await;

    assert_eq!("sdkwork.example.test", response["forwardedHost"]);
    assert_eq!("https", response["forwardedProto"]);
    assert!(response["forwardedFor"].is_null());

    let _ = upstream.stop.send(());
}

#[tokio::test]
async fn edge_server_preserves_forwarded_headers_only_when_trusted() {
    let upstream = spawn_upstream("gateway").await;
    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        &upstream.base_url,
        &upstream.base_url,
        &upstream.base_url,
        &upstream.base_url,
    )
    .unwrap()
    .with_trusted_forwarded_headers(true);
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(config);

    let response = router
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/v1/models")
                .header(header::HOST, "sdkwork.example.test")
                .header("x-forwarded-host", "public.example.test")
                .header("x-forwarded-proto", "https")
                .header("x-forwarded-for", "203.0.113.10")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("public.example.test", json["forwardedHost"]);
    assert_eq!("https", json["forwardedProto"]);
    assert_eq!("203.0.113.10", json["forwardedFor"]);

    let _ = upstream.stop.send(());
}

#[tokio::test]
async fn edge_server_rejects_invalid_trusted_forwarded_proto_values() {
    let upstream = spawn_upstream("gateway").await;
    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        &upstream.base_url,
        &upstream.base_url,
        &upstream.base_url,
        &upstream.base_url,
    )
    .unwrap()
    .with_external_scheme("https")
    .unwrap()
    .with_trusted_forwarded_headers(true);
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(config);

    let response = router
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/v1/models")
                .header(header::HOST, "sdkwork.example.test")
                .header("x-forwarded-host", "public.example.test")
                .header("x-forwarded-proto", "javascript")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("public.example.test", json["forwardedHost"]);
    assert_eq!("https", json["forwardedProto"]);

    let _ = upstream.stop.send(());
}

#[test]
fn edge_server_config_rejects_non_origin_forward_targets() {
    assert!(sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        "http://127.0.0.1:18080/path",
        "http://127.0.0.1:18081",
        "http://127.0.0.1:18082",
        "http://127.0.0.1:3901",
    )
    .is_err());
}

#[test]
fn edge_server_config_rejects_invalid_external_scheme() {
    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        "http://127.0.0.1:18080",
        "http://127.0.0.1:18081",
        "http://127.0.0.1:18082",
        "http://127.0.0.1:3901",
    )
    .unwrap();

    assert!(config.with_external_scheme("ftp").is_err());
}

#[test]
fn edge_server_config_rejects_invalid_portal_tool_api_rate_limit() {
    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        "http://127.0.0.1:18080",
        "http://127.0.0.1:18081",
        "http://127.0.0.1:18082",
        "http://127.0.0.1:3901",
    )
    .unwrap();

    assert!(config
        .clone()
        .with_portal_tool_api_rate_limit(0, Duration::from_secs(60))
        .is_err());
    assert!(config
        .with_portal_tool_api_rate_limit(1, Duration::ZERO)
        .is_err());
}

#[tokio::test]
async fn edge_server_applies_configured_portal_security_policy_headers() {
    let gateway = spawn_upstream("gateway").await;
    let admin = spawn_upstream("admin").await;
    let app = spawn_upstream("app").await;
    let portal_dist = temp_portal_dist_dir("portal-security-policy");
    write_portal_dist_fixture(&portal_dist);

    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        &gateway.base_url,
        &admin.base_url,
        &app.base_url,
        "http://127.0.0.1:3901",
    )
    .unwrap()
    .with_portal_static_dist(portal_dist.clone())
    .unwrap()
    .with_portal_strict_transport_security(true, 31_536_000, true, true)
    .unwrap()
    .with_portal_csp_frame_src(["https://player.example.com", "https://videos.example.com"])
    .unwrap();
    let router = sdkwork_clawrouter_cloud_gateway::edge_server_router(config);

    let response = router
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    assert_eq!(
        "max-age=31536000; includeSubDomains; preload",
        response
            .headers()
            .get("strict-transport-security")
            .unwrap()
            .to_str()
            .unwrap()
    );
    assert_eq!(
        "strict-origin-when-cross-origin",
        response
            .headers()
            .get("referrer-policy")
            .unwrap()
            .to_str()
            .unwrap()
    );
    assert_eq!(
        "camera=(), microphone=(), geolocation=(), payment=()",
        response
            .headers()
            .get("permissions-policy")
            .unwrap()
            .to_str()
            .unwrap()
    );
    let csp = response
        .headers()
        .get("content-security-policy")
        .unwrap()
        .to_str()
        .unwrap();
    assert!(csp.contains(
        "frame-src 'self' https://player.bilibili.com https://player.example.com https://videos.example.com"
    ));
    assert!(csp.contains("frame-ancestors 'none'"));

    let _ = std::fs::remove_dir_all(&portal_dist);
    let _ = gateway.stop.send(());
    let _ = admin.stop.send(());
    let _ = app.stop.send(());
}

#[test]
fn edge_server_rejects_unsafe_portal_security_policy_values() {
    let config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        "http://127.0.0.1:18080",
        "http://127.0.0.1:18081",
        "http://127.0.0.1:18082",
        "http://127.0.0.1:3901",
    )
    .unwrap();

    assert!(config
        .clone()
        .with_portal_strict_transport_security(true, 0, true, false)
        .is_err());
    assert!(config
        .clone()
        .with_portal_strict_transport_security(true, 300, true, true)
        .is_err());
    assert!(config
        .clone()
        .with_portal_csp_frame_src(["https://player.example.com/embed"])
        .is_err());
    assert!(config
        .with_portal_csp_frame_src(["javascript:alert(1)"])
        .is_err());
}
