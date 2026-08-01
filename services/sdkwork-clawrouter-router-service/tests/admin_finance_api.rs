pub mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::ports::{
    AdminBillingRecordItem, AdminFinanceCollection, AdminFinanceReadFuture, AdminFinanceStore,
    AdminTransactionRecordItem, ListAdminBillingRecordsQuery, ListAdminTransactionsQuery,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn admin_finance_route_lists_transactions_and_billing_records() {
    let router = sdkwork_clawrouter_router_service::api::admin_finance_router_with_store(Arc::new(
        TestAdminFinanceStore,
    ));

    let transactions = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/billing/finance/ledger"),
    )
    .await;
    assert_eq!(0, transactions["code"].as_i64().unwrap());
    assert_eq!("ledger-100", transactions["data"]["items"][0]["id"]);
    assert_eq!(
        "2026-04-29 09:10:00",
        transactions["data"]["items"][0]["time"]
    );
    assert_eq!("30", transactions["data"]["items"][0]["userId"]);
    assert_eq!("recharge", transactions["data"]["items"][0]["type"]);
    assert_eq!("25.50", transactions["data"]["items"][0]["amount"]);
    assert_eq!("125.50", transactions["data"]["items"][0]["balance"]);
    assert_eq!(
        "Payment success",
        transactions["data"]["items"][0]["description"]
    );
    assert_eq!("success", transactions["data"]["items"][0]["status"]);

    let billing = request_json(
        router,
        signed_request("GET", "/backend/v3/api/billing/finance/usage_statements"),
    )
    .await;
    assert_eq!(0, billing["code"].as_i64().unwrap());
    assert_eq!("stmt-202604", billing["data"]["items"][0]["id"]);
    assert_eq!("30", billing["data"]["items"][0]["userId"]);
    assert_eq!("2026-04", billing["data"]["items"][0]["period"]);
    assert_eq!(12000, billing["data"]["items"][0]["totalTokens"]);
    assert_eq!("88.25", billing["data"]["items"][0]["totalCost"]);
    assert_eq!("unpaid", billing["data"]["items"][0]["status"]);
    assert_eq!(
        "2026-05-10 00:00:00",
        billing["data"]["items"][0]["dueDate"]
    );
}

#[tokio::test]
async fn admin_finance_route_rejects_missing_trusted_subject() {
    let router = sdkwork_clawrouter_router_service::api::admin_finance_router_with_store(Arc::new(
        TestAdminFinanceStore,
    ));

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/billing/finance/ledger")
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
        .header("content-type", "application/json")
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

struct TestAdminFinanceStore;

impl AdminFinanceStore for TestAdminFinanceStore {
    fn list_transactions<'a>(
        &'a self,
        query: ListAdminTransactionsQuery,
    ) -> AdminFinanceReadFuture<'a, AdminFinanceCollection<AdminTransactionRecordItem>> {
        Box::pin(async move {
            assert_eq!(100001, query.subject.tenant_id);
            assert_eq!(0, query.subject.organization_id);
            let items = vec![AdminTransactionRecordItem {
                id: "ledger-100".to_owned(),
                time: "2026-04-29 09:10:00".to_owned(),
                user_id: "30".to_owned(),
                transaction_type: "recharge".to_owned(),
                amount: "25.50".to_owned(),
                balance: "125.50".to_owned(),
                description: "Payment success".to_owned(),
                status: "success".to_owned(),
            }];
            Ok(finance_page(items, query.page_no, query.page_size))
        })
    }

    fn list_billing_records<'a>(
        &'a self,
        query: ListAdminBillingRecordsQuery,
    ) -> AdminFinanceReadFuture<'a, AdminFinanceCollection<AdminBillingRecordItem>> {
        Box::pin(async move {
            assert_eq!(30, query.subject.operator_id);
            let items = vec![AdminBillingRecordItem {
                id: "stmt-202604".to_owned(),
                user_id: "30".to_owned(),
                period: "2026-04".to_owned(),
                total_tokens: 12000,
                total_cost: "88.25".to_owned(),
                status: "unpaid".to_owned(),
                due_date: "2026-05-10 00:00:00".to_owned(),
            }];
            Ok(finance_page(items, query.page_no, query.page_size))
        })
    }
}

fn finance_page<T>(items: Vec<T>, page_no: i64, page_size: i64) -> AdminFinanceCollection<T> {
    let total = items.len() as i64;
    let offset = page_no.saturating_sub(1).saturating_mul(page_size).max(0) as usize;
    let items = items
        .into_iter()
        .skip(offset)
        .take(page_size.max(0) as usize)
        .collect();
    AdminFinanceCollection {
        items,
        total,
        page_no,
        page_size,
    }
}
