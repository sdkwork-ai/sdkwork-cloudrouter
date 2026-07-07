mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::ports::{
    AdminRecordLogItem, AdminRecordLogsPage, AdminRecordReadFuture, AdminRecordStore,
    ListAdminRecordLogsQuery,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn admin_record_route_lists_logs_and_normalizes_filters() {
    let store = Arc::new(TestAdminRecordStore::default());
    let router =
        sdkwork_clawrouter_router_service::api::admin_record_router_with_store(store.clone());

    let payload = request_json(
        router,
        signed_request(
            "GET",
            "/backend/v3/api/system/records?user=%20owner@example.com%20&token=Production&model=gpt-4o-mini&page=2&page_size=50",
        ),
    )
    .await;

    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!(7, payload["data"]["total"]);
    assert_eq!(2, payload["data"]["page"]);
    assert_eq!(50, payload["data"]["pageSize"]);
    assert!(payload["data"]["pageNo"].is_null());
    assert_eq!("trace-100", payload["data"]["logs"][0]["id"]);
    assert_eq!("owner@example.com", payload["data"]["logs"][0]["user"]);
    assert_eq!(
        "req-admin-record-1",
        payload["data"]["logs"][0]["requestId"]
    );
    assert_eq!("2026-04-29 09:30:00", payload["data"]["logs"][0]["time"]);
    assert_eq!("Production", payload["data"]["logs"][0]["tokenName"]);
    assert_eq!("standard-group", payload["data"]["logs"][0]["group"]);
    assert_eq!("text", payload["data"]["logs"][0]["type"]);
    assert_eq!("gpt-4o-mini", payload["data"]["logs"][0]["model"]);
    assert_eq!(
        "gpt-4o-mini-2026-05-13",
        payload["data"]["logs"][0]["providerNativeModel"]
    );
    assert_eq!(
        "openai/gpt-4o-mini",
        payload["data"]["logs"][0]["requestedModelCatalogKey"]
    );
    assert_eq!("success", payload["data"]["logs"][0]["status"]);
    assert_eq!(200, payload["data"]["logs"][0]["httpStatus"]);
    assert_eq!("POST", payload["data"]["logs"][0]["httpMethod"]);
    assert_eq!("", payload["data"]["logs"][0]["errorCode"]);
    assert_eq!("", payload["data"]["logs"][0]["errorType"]);
    assert_eq!("", payload["data"]["logs"][0]["errorMessage"]);
    assert_eq!("842ms", payload["data"]["logs"][0]["totalTime"]);
    assert_eq!("120ms", payload["data"]["logs"][0]["ttft"]);
    assert_eq!(true, payload["data"]["logs"][0]["isStream"]);
    assert_eq!(1200, payload["data"]["logs"][0]["inputTokens"]);
    assert_eq!(128, payload["data"]["logs"][0]["cacheReadTokens"]);
    assert_eq!(300, payload["data"]["logs"][0]["outputTokens"]);
    assert_eq!("0.012300", payload["data"]["logs"][0]["cost"]);
    assert_eq!("1.200000", payload["data"]["logs"][0]["multiplier"]);
    assert_eq!("0.150000", payload["data"]["logs"][0]["baseInputPrice"]);
    assert_eq!("0.600000", payload["data"]["logs"][0]["baseOutputPrice"]);
    assert_eq!("0.030000", payload["data"]["logs"][0]["cacheReadPrice"]);
    assert_eq!("/v1/chat/completions", payload["data"]["logs"][0]["path"]);
    assert_eq!("medium", payload["data"]["logs"][0]["reasoningEffort"]);
    assert_eq!("203.0.113.***", payload["data"]["logs"][0]["ip"]);
    assert_eq!(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0",
        payload["data"]["logs"][0]["userAgent"]
    );

    let captured = store.captured.lock().unwrap();
    let query = captured.as_ref().expect("store should be called");
    assert_eq!(10, query.subject.tenant_id);
    assert_eq!(20, query.subject.organization_id);
    assert_eq!(30, query.subject.operator_id);
    assert_eq!(2, query.page_no);
    assert_eq!(50, query.page_size);
    assert_eq!(50, query.offset);
    assert_eq!(Some("owner@example.com".to_owned()), query.user);
    assert_eq!(Some("Production".to_owned()), query.token);
    assert_eq!(Some("gpt-4o-mini".to_owned()), query.model);
}

#[tokio::test]
async fn admin_record_route_rejects_missing_trusted_subject() {
    let router = sdkwork_clawrouter_router_service::api::admin_record_router_with_store(Arc::new(
        TestAdminRecordStore::default(),
    ));

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/system/records")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40101, payload["code"].as_i64().unwrap());
}

#[tokio::test]
async fn admin_record_route_rejects_invalid_filter_without_calling_store() {
    let store = Arc::new(TestAdminRecordStore::default());
    let router =
        sdkwork_clawrouter_router_service::api::admin_record_router_with_store(store.clone());

    let response = router
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/system/records?user=owner@example.com&token=Production&model=bad%01model",
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"]
        .as_str()
        .unwrap()
        .contains("model must be visible ASCII"));
    assert!(store.captured.lock().unwrap().is_none());
}

fn signed_request(method: &str, path: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .internal_trusted_subject(100001, 0, 30)
        .body(Body::empty())
        .unwrap()
}

async fn request_json(router: axum::Router, request: Request<Body>) -> Value {
    let response = router.oneshot(request).await.unwrap();
    assert_eq!(StatusCode::OK, response.status());
    json_payload(response).await
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

#[derive(Default)]
struct TestAdminRecordStore {
    captured: Mutex<Option<ListAdminRecordLogsQuery>>,
}

impl AdminRecordStore for TestAdminRecordStore {
    fn list_logs<'a>(
        &'a self,
        query: ListAdminRecordLogsQuery,
    ) -> AdminRecordReadFuture<'a, AdminRecordLogsPage> {
        Box::pin(async move {
            *self.captured.lock().unwrap() = Some(query.clone());
            Ok(AdminRecordLogsPage {
                logs: vec![AdminRecordLogItem {
                    id: "trace-100".to_owned(),
                    user: "owner@example.com".to_owned(),
                    request_id: "req-admin-record-1".to_owned(),
                    time: "2026-04-29 09:30:00".to_owned(),
                    token_name: "Production".to_owned(),
                    group: "standard-group".to_owned(),
                    log_type: "text".to_owned(),
                    model: "gpt-4o-mini".to_owned(),
                    provider_native_model: "gpt-4o-mini-2026-05-13".to_owned(),
                    requested_model_catalog_key: "openai/gpt-4o-mini".to_owned(),
                    region_code: "global".to_owned(),
                    status: "success".to_owned(),
                    http_status: 200,
                    http_method: "POST".to_owned(),
                    error_code: String::new(),
                    error_type: String::new(),
                    error_message: String::new(),
                    total_time: "842ms".to_owned(),
                    ttft: "120ms".to_owned(),
                    is_stream: true,
                    input_tokens: 1200,
                    cache_read_tokens: 128,
                    output_tokens: 300,
                    cost: "0.012300".to_owned(),
                    multiplier: "1.200000".to_owned(),
                    base_input_price: "0.150000".to_owned(),
                    base_output_price: "0.600000".to_owned(),
                    cache_read_price: "0.030000".to_owned(),
                    path: "/v1/chat/completions".to_owned(),
                    reasoning_effort: "medium".to_owned(),
                    ip: "203.0.113.***".to_owned(),
                    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0"
                        .to_owned(),
                }],
                total: 7,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }
}
