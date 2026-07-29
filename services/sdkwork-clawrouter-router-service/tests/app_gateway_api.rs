mod common;

use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::StatusCode;
use sdkwork_clawrouter_router_service::api::{
    app_gateway_traces_router, app_gateway_traces_router_with_read_store,
};
use sdkwork_clawrouter_router_service::domain::DomainError;
use sdkwork_clawrouter_router_service::ports::{
    AppGatewayTraceItem, AppGatewayTracesCursor, AppGatewayTracesPage, AppGatewayTracesQuery,
    AppGatewayTracesReadFuture, AppGatewayTracesReadStore, AppGatewayTracesSubject,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn app_gateway_traces_returns_scoped_cursor_page_with_safe_fields() {
    let read_store = Arc::new(CapturingGatewayTracesReadStore::default());
    let router = app_gateway_traces_router_with_read_store(read_store.clone());

    let response = router
        .oneshot(common::web_framework_app_request(
            "GET",
            "/app/v3/api/ai/gateway/traces?page_size=2&q=%20Trace-42%20",
            Body::empty(),
            "100001",
            Some("30002"),
            "40003",
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("trace-42", payload["data"]["items"][0]["id"]);
    assert_eq!("10.***.***.42", payload["data"]["items"][0]["ip"]);
    assert_eq!(
        "openai-primary",
        payload["data"]["items"][0]["upstreamAccount"]
    );
    assert!(payload["data"]["items"][0].get("metadata").is_none());
    assert!(payload["data"]["items"][0].get("payloadHash").is_none());
    assert_eq!("cursor", payload["data"]["pageInfo"]["mode"]);
    assert_eq!(2, payload["data"]["pageInfo"]["pageSize"]);
    assert_eq!(true, payload["data"]["pageInfo"]["hasMore"]);
    let next_cursor = payload["data"]["pageInfo"]["nextCursor"].as_str().unwrap();
    let cursor_payload: Value =
        serde_json::from_slice(&sdkwork_utils_rust::base64url_decode(next_cursor).unwrap())
            .unwrap();
    assert_eq!(42, cursor_payload["id"]);

    let query = read_store.query.lock().unwrap().clone().unwrap();
    let subject = read_store.subject.lock().unwrap().unwrap();
    assert_eq!(2, query.page_size);
    assert_eq!(Some("Trace-42"), query.keyword.as_deref());
    assert_eq!(100_001, subject.tenant_id);
    assert_eq!(30_002, subject.organization_id);
    assert_eq!(40_003, subject.user_id);
}

#[tokio::test]
async fn app_gateway_traces_rejects_invalid_cursor_before_store_access() {
    let read_store = Arc::new(CapturingGatewayTracesReadStore::default());
    let router = app_gateway_traces_router_with_read_store(read_store.clone());

    let response = router
        .oneshot(common::web_framework_app_request(
            "GET",
            "/app/v3/api/ai/gateway/traces?cursor=not-a-cursor",
            Body::empty(),
            "100001",
            Some("0"),
            "40003",
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(40003, payload["code"].as_i64().unwrap());
    assert!(read_store.query.lock().unwrap().is_none());
}

#[tokio::test]
async fn app_gateway_traces_rejects_noncanonical_or_unknown_query_parameters() {
    for uri in [
        "/app/v3/api/ai/gateway/traces?pageSize=20",
        "/app/v3/api/ai/gateway/traces?limit=20",
        "/app/v3/api/ai/gateway/traces?page=2",
        "/app/v3/api/ai/gateway/traces?page_size=201",
    ] {
        let read_store = Arc::new(CapturingGatewayTracesReadStore::default());
        let response = app_gateway_traces_router_with_read_store(read_store.clone())
            .oneshot(common::web_framework_app_request(
                "GET",
                uri,
                Body::empty(),
                "100001",
                Some("0"),
                "40003",
            ))
            .await
            .unwrap();

        assert_eq!(StatusCode::BAD_REQUEST, response.status(), "{uri}");
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let payload: Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(40003, payload["code"].as_i64().unwrap(), "{uri}");
        assert!(read_store.query.lock().unwrap().is_none(), "{uri}");
    }
}

#[tokio::test]
async fn app_gateway_traces_without_a_read_store_fails_closed() {
    let response = app_gateway_traces_router()
        .oneshot(common::web_framework_app_request(
            "GET",
            "/app/v3/api/ai/gateway/traces",
            Body::empty(),
            "100001",
            Some("0"),
            "40003",
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::INTERNAL_SERVER_ERROR, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(50001, payload["code"].as_i64().unwrap());
    assert_eq!("An internal error occurred", payload["detail"]);
    assert!(payload.get("items").is_none());
}

#[tokio::test]
async fn app_gateway_traces_does_not_expose_store_error_details() {
    let router = app_gateway_traces_router_with_read_store(Arc::new(FailingGatewayTracesReadStore));

    let response = router
        .oneshot(common::web_framework_app_request(
            "GET",
            "/app/v3/api/ai/gateway/traces",
            Body::empty(),
            "100001",
            Some("0"),
            "40003",
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::INTERNAL_SERVER_ERROR, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(50001, payload["code"].as_i64().unwrap());
    assert_eq!(
        "An internal error occurred",
        payload["detail"].as_str().unwrap()
    );
    assert!(!String::from_utf8_lossy(&body).contains("database-host-secret"));
}

#[derive(Default)]
struct CapturingGatewayTracesReadStore {
    query: Mutex<Option<AppGatewayTracesQuery>>,
    subject: Mutex<Option<AppGatewayTracesSubject>>,
}

impl AppGatewayTracesReadStore for CapturingGatewayTracesReadStore {
    fn load_gateway_traces<'a>(
        &'a self,
        query: AppGatewayTracesQuery,
        subject: Option<AppGatewayTracesSubject>,
    ) -> AppGatewayTracesReadFuture<'a> {
        Box::pin(async move {
            *self.query.lock().unwrap() = Some(query.clone());
            *self.subject.lock().unwrap() = subject;
            Ok(AppGatewayTracesPage {
                items: vec![AppGatewayTraceItem {
                    id: "trace-42".to_owned(),
                    time: "2026-07-29 08:00:00+00".to_owned(),
                    ip: "10.***.***.42".to_owned(),
                    endpoint: "/v1/chat/completions".to_owned(),
                    method: "POST".to_owned(),
                    status: 200,
                    duration: "128ms".to_owned(),
                    upstream_account: "openai-primary".to_owned(),
                }],
                next_cursor: Some(AppGatewayTracesCursor {
                    started_at_micros: 1_785_283_200_000_000,
                    id: 42,
                }),
                has_more: true,
                page_size: query.page_size,
            })
        })
    }
}

struct FailingGatewayTracesReadStore;

impl AppGatewayTracesReadStore for FailingGatewayTracesReadStore {
    fn load_gateway_traces<'a>(
        &'a self,
        _query: AppGatewayTracesQuery,
        _subject: Option<AppGatewayTracesSubject>,
    ) -> AppGatewayTracesReadFuture<'a> {
        Box::pin(async {
            Err(DomainError::new(
                "database-host-secret connection details must stay private",
            ))
        })
    }
}
