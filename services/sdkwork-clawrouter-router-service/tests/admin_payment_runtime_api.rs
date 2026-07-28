mod common;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use common::InternalTrustedSubjectHeaders;
use sdkwork_clawrouter_router_service::application::{
    InMemoryPaymentProviderRuntimeSnapshotStore, PaymentProviderRuntimeAssemblyFailure,
    PaymentProviderRuntimeAssemblyReport, PaymentProviderRuntimeAssemblySkipped,
    PaymentProviderRuntimeAssemblySuccess, PaymentProviderRuntimeSnapshotService,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn admin_payment_runtime_route_returns_latest_provider_snapshot() {
    let store = InMemoryPaymentProviderRuntimeSnapshotStore::default();
    let service = PaymentProviderRuntimeSnapshotService::new(store.clone());
    service
        .record_report("sandbox", "2026-05-30T09:00:00Z", &assembly_report())
        .await;
    let router =
        sdkwork_clawrouter_router_service::api::admin_payment_runtime_router_with_snapshot_store(
            store,
        );

    let response = router
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/payments/runtime/snapshot?environment=test",
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("sandbox", payload["data"]["environment"]);
    assert_eq!("2026-05-30T09:00:00Z", payload["data"]["recordedAt"]);
    assert_eq!(3, payload["data"]["summary"]["total"]);
    assert_eq!(1, payload["data"]["summary"]["registered"]);
    assert_eq!(1, payload["data"]["summary"]["failed"]);
    assert_eq!(1, payload["data"]["summary"]["skipped"]);
    assert_eq!("stripe", payload["data"]["events"][0]["providerCode"]);
    assert_eq!("failed", payload["data"]["events"][1]["kind"]);
    assert_eq!(
        "<redacted> <redacted> leaked",
        payload["data"]["events"][1]["message"]
    );
    assert_eq!("skipped", payload["data"]["events"][2]["kind"]);
    assert_eq!("disabled", payload["data"]["events"][2]["reason"]);

    let body = serde_json::to_string(&payload).unwrap();
    assert!(!body.contains("secret://"));
    assert!(!body.contains("vault://"));
    assert!(!body.contains("sk_live"));
}

#[tokio::test]
async fn admin_payment_runtime_route_reports_missing_snapshot_as_not_found() {
    let router =
        sdkwork_clawrouter_router_service::api::admin_payment_runtime_router_with_snapshot_store(
            InMemoryPaymentProviderRuntimeSnapshotStore::default(),
        );

    let response = router
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/payments/runtime/snapshot?environment=sandbox",
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::NOT_FOUND, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40401, payload["code"].as_i64().unwrap());
}

#[tokio::test]
async fn admin_payment_runtime_route_rejects_invalid_environment() {
    let router =
        sdkwork_clawrouter_router_service::api::admin_payment_runtime_router_with_snapshot_store(
            InMemoryPaymentProviderRuntimeSnapshotStore::default(),
        );

    let response = router
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/payments/runtime/snapshot?environment=stage",
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"]
        .as_str()
        .unwrap()
        .contains("environment must be one of sandbox, production"));
}

#[tokio::test]
async fn admin_payment_runtime_route_rejects_missing_trusted_subject() {
    let router =
        sdkwork_clawrouter_router_service::api::admin_payment_runtime_router_with_snapshot_store(
            InMemoryPaymentProviderRuntimeSnapshotStore::default(),
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/payments/runtime/snapshot?environment=sandbox")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40101, payload["code"].as_i64().unwrap());
}

fn signed_request(method: &str, path: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .internal_trusted_subject(100001, 0, 30)
        .body(Body::empty())
        .unwrap()
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

fn assembly_report() -> PaymentProviderRuntimeAssemblyReport {
    PaymentProviderRuntimeAssemblyReport::from_parts(
        vec![PaymentProviderRuntimeAssemblySuccess {
            account_no: "stripe-main".to_owned(),
            supplier_code: "stripe".to_owned(),
        }],
        vec![PaymentProviderRuntimeAssemblyFailure {
            account_no: "paypal-bad-secret".to_owned(),
            supplier_code: "paypal".to_owned(),
            message: "secret://payments/paypal sk_live_123 leaked".to_owned(),
        }],
        vec![PaymentProviderRuntimeAssemblySkipped {
            account_no: "wechat-disabled".to_owned(),
            supplier_code: "wechat_pay".to_owned(),
            reason: "disabled".to_owned(),
        }],
    )
}
