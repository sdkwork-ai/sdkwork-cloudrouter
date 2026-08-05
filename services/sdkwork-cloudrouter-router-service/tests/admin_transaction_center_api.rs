pub mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_cloudrouter_router_service::ports::{
    AdminTransactionCenterFuture, AdminTransactionCenterStore, AdminTransactionCollection,
    AdminTransactionJsonRecord, ListAdminTransactionChildRecordsQuery,
    ListAdminTransactionRecordsQuery, LoadAdminTransactionRecordQuery,
};
use serde_json::{json, Map, Value};
use tower::ServiceExt;

const TEST_TENANT_ID: i64 = 100001;
const TEST_ORGANIZATION_ID: i64 = 0;
const TEST_OPERATOR_ID: i64 = 30;

#[tokio::test]
async fn admin_transaction_center_provider_inventory_uses_canonical_filters_and_rejects_aliases() {
    let store = Arc::new(TestAdminTransactionCenterStore::default());
    let router =
        sdkwork_cloudrouter_router_service::api::admin_transaction_center_router_with_store(
            store.clone(),
        );

    let providers = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/payments/providers?page=1&page_size=20&provider_code=stripe&status=active",
            "",
        ),
        StatusCode::OK,
    )
    .await;
    assert_eq!("stripe", providers["data"]["items"][0]["providerCode"]);

    {
        let queries = store.provider_queries.lock().unwrap();
        assert_eq!(1, queries.len());
        assert_eq!(Some("stripe"), queries[0].supplier_code.as_deref());
        assert_eq!(Some("active"), queries[0].status.as_deref());
    }

    for alias in ["pageSize", "limit", "page_no", "pageNo", "per_page", "size"] {
        let path = format!("/backend/v3/api/payments/providers?{alias}=20");
        let response = router
            .clone()
            .oneshot(signed_request("GET", &path, ""))
            .await
            .unwrap();
        assert_eq!(StatusCode::BAD_REQUEST, response.status(), "alias {alias}");
    }
}

fn signed_request(method: &str, path: &str, body: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
        .header("Idempotency-Key", "transaction-center-test-idempotency-key")
        .internal_trusted_subject(TEST_TENANT_ID, TEST_ORGANIZATION_ID, TEST_OPERATOR_ID)
        .body(Body::from(body.to_owned()))
        .unwrap()
}

async fn request_json(
    router: axum::Router,
    request: Request<Body>,
    expected_status: StatusCode,
) -> Value {
    let response = router.oneshot(request).await.unwrap();
    let status = response.status();
    let payload = json_payload(response).await;
    assert_eq!(
        expected_status, status,
        "unexpected response payload: {payload}"
    );
    payload
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

#[derive(Default)]
struct TestAdminTransactionCenterStore {
    provider_queries: Mutex<Vec<ListAdminTransactionRecordsQuery>>,
}

impl AdminTransactionCenterStore for TestAdminTransactionCenterStore {
    fn list_payment_providers<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        self.provider_queries.lock().unwrap().push(query.clone());
        Box::pin(async move {
            Ok(test_page(
                vec![record(json!({
                    "id": "provider-stripe",
                    "providerCode": "stripe",
                    "displayName": "Stripe",
                    "providerType": "official",
                    "supportedCountries": ["US"],
                    "supportedCurrencies": ["USD"],
                    "capabilities": ["payment_intent"],
                    "status": "active",
                    "sortOrder": 30
                }))],
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn list_payment_provider_accounts<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move {
            assert_eq!(TEST_TENANT_ID, query.subject.tenant_id);
            assert_eq!(TEST_ORGANIZATION_ID, query.subject.organization_id);
            assert_eq!(TEST_OPERATOR_ID, query.subject.operator_id);
            Ok(test_page(
                vec![record(json!({
                    "id": "provider-account-1",
                    "providerCode": "stripe",
                    "merchantId": "merchant-1",
                    "environment": "sandbox",
                    "status": "active"
                }))],
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }
}

fn test_page(
    items: Vec<AdminTransactionJsonRecord>,
    page_no: i64,
    page_size: i64,
    offset: i64,
) -> AdminTransactionCollection {
    let total = items.len() as i64;
    let items = items
        .into_iter()
        .skip(offset.max(0) as usize)
        .take(page_size.max(0) as usize)
        .collect();
    AdminTransactionCollection {
        items,
        total,
        page_no,
        page_size,
    }
}

fn record(value: Value) -> Map<String, Value> {
    value.as_object().unwrap().clone()
}
