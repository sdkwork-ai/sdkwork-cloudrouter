//! Contract and behaviour of the read-only billing decision diagnostics route.

pub mod common;

use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_cloudrouter_router_service::ports::{
    AdminBillingDecision, AdminBillingDecisionFuture, AdminBillingDecisionStore,
    AdminBillingDecisionSubject, AdminBillingDecisionVerdict,
};
use serde_json::Value;
use tower::ServiceExt;

/// Fake store returning one configured snapshot, or nothing for an unknown id.
struct TestAdminBillingDecisionStore {
    decision: Option<AdminBillingDecision>,
}

impl AdminBillingDecisionStore for TestAdminBillingDecisionStore {
    fn read_billing_decision<'a>(
        &'a self,
        subject: AdminBillingDecisionSubject,
        invocation_id: String,
    ) -> AdminBillingDecisionFuture<'a, Option<AdminBillingDecision>> {
        let decision = self.decision.clone();
        Box::pin(async move {
            assert_eq!(100_001, subject.tenant_id, "the route must scope by tenant");
            let Some(mut decision) = decision else {
                return Ok(None);
            };
            decision.invocation_id = invocation_id;
            Ok(Some(decision))
        })
    }
}

fn signed_request(method: &str, path: &str) -> Request<Body> {
    let mut request = common::web_framework_backend_request(
        method,
        path,
        Body::empty(),
        "100001",
        Some("0"),
        "30",
    );
    request
        .headers_mut()
        .insert("content-type", "application/json".parse().unwrap());
    request
}

async fn response_json(router: axum::Router, request: Request<Body>) -> (StatusCode, Value) {
    let response = router.oneshot(request).await.unwrap();
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload = serde_json::from_slice(&body).unwrap_or(Value::Null);
    (status, payload)
}

fn settled_decision() -> AdminBillingDecision {
    AdminBillingDecision {
        invocation_id: String::new(),
        hold_amount: Some("16443980".to_owned()),
        hold_settled_amount: Some("22297".to_owned()),
        hold_status: Some(2),
        hold_expires_at: Some("2026-11-25T14:19:18.810744+00:00".to_owned()),
        charge_line_count: 3,
        charge_amount: "0.002229640000".to_owned(),
        debit_points: 22_297,
        measured_quantity: "73200.000000000000".to_owned(),
        verdict: AdminBillingDecisionVerdict::Settled,
    }
}

#[tokio::test]
async fn admin_billing_decision_returns_the_settled_snapshot() {
    let router = sdkwork_cloudrouter_router_service::api::admin_billing_decision_router_with_store(
        Arc::new(TestAdminBillingDecisionStore {
            decision: Some(settled_decision()),
        }),
    );

    let (status, payload) = response_json(
        router,
        signed_request(
            "GET",
            "/backend/v3/api/billing/decision?invocation_id=d7b76ad8-6dc8-494f-a34b-ad444838c3df",
        ),
    )
    .await;

    assert_eq!(StatusCode::OK, status);
    assert_eq!(0, payload["code"].as_i64().unwrap());
    let data = &payload["data"];
    assert_eq!("d7b76ad8-6dc8-494f-a34b-ad444838c3df", data["invocationId"]);
    assert_eq!("settled", data["verdict"]);
    assert_eq!("16443980", data["holdAmount"]);
    assert_eq!("22297", data["holdSettledAmount"]);
    assert_eq!(2, data["holdStatus"].as_i64().unwrap());
    assert_eq!("3", data["chargeLineCount"], "counts are int64 strings");
    assert_eq!("0.002229640000", data["chargeAmount"]);
    assert_eq!("22297", data["debitPoints"], "points are int64 strings");
    assert_eq!("73200.000000000000", data["measuredQuantity"]);
}

#[tokio::test]
async fn admin_billing_decision_reports_an_overdue_reservation() {
    let router = sdkwork_cloudrouter_router_service::api::admin_billing_decision_router_with_store(
        Arc::new(TestAdminBillingDecisionStore {
            decision: Some(AdminBillingDecision {
                invocation_id: String::new(),
                hold_amount: Some("16577680".to_owned()),
                hold_settled_amount: Some("0".to_owned()),
                hold_status: Some(1),
                hold_expires_at: Some("2026-11-25T13:36:57.037705+00:00".to_owned()),
                charge_line_count: 0,
                charge_amount: "0".to_owned(),
                debit_points: 0,
                measured_quantity: "0".to_owned(),
                verdict: AdminBillingDecisionVerdict::Overdue,
            }),
        }),
    );

    let (status, payload) = response_json(
        router,
        signed_request(
            "GET",
            "/backend/v3/api/billing/decision?invocation_id=47cd79ea-b469-4079-9861-b9cc5bb938dc",
        ),
    )
    .await;

    assert_eq!(StatusCode::OK, status);
    assert_eq!("overdue", payload["data"]["verdict"]);
    assert_eq!("16577680", payload["data"]["holdAmount"]);
    assert_eq!("0", payload["data"]["chargeLineCount"]);
}

#[tokio::test]
async fn admin_billing_decision_answers_not_billed_for_a_dispatch_rejection() {
    let router = sdkwork_cloudrouter_router_service::api::admin_billing_decision_router_with_store(
        Arc::new(TestAdminBillingDecisionStore {
            decision: Some(AdminBillingDecision {
                invocation_id: String::new(),
                hold_amount: None,
                hold_settled_amount: None,
                hold_status: None,
                hold_expires_at: None,
                charge_line_count: 0,
                charge_amount: "0".to_owned(),
                debit_points: 0,
                measured_quantity: "0".to_owned(),
                verdict: AdminBillingDecisionVerdict::NotBilled,
            }),
        }),
    );

    let (status, payload) = response_json(
        router,
        signed_request(
            "GET",
            "/backend/v3/api/billing/decision?invocation_id=50cde1ff-d1ba-42c0-8e1b-5fd01417e699",
        ),
    )
    .await;

    assert_eq!(StatusCode::OK, status);
    assert_eq!("not_billed", payload["data"]["verdict"]);
    assert!(payload["data"]["holdAmount"].is_null());
}

#[tokio::test]
async fn admin_billing_decision_rejects_a_missing_or_unknown_invocation() {
    let router = sdkwork_cloudrouter_router_service::api::admin_billing_decision_router_with_store(
        Arc::new(TestAdminBillingDecisionStore { decision: None }),
    );

    let (missing_status, _) = response_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/billing/decision?invocation_id="),
    )
    .await;
    assert_eq!(StatusCode::BAD_REQUEST, missing_status);

    let (unknown_status, _) = response_json(
        router,
        signed_request(
            "GET",
            "/backend/v3/api/billing/decision?invocation_id=00000000-0000-0000-0000-000000000000",
        ),
    )
    .await;
    assert_eq!(StatusCode::BAD_REQUEST, unknown_status);
}
