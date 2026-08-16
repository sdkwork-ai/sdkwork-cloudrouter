pub mod common;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_cloudrouter_router_service::ports::{
    AdminTransactionCenterFuture, AdminTransactionCenterStore, AdminTransactionCollection,
    AdminTransactionJsonRecord, ListAdminTransactionRecordsQuery, UpdatePaymentProviderCommand,
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

#[tokio::test]
async fn admin_transaction_center_provider_update_persists_mutation_and_returns_record() {
    let store = Arc::new(TestAdminTransactionCenterStore::default());
    let router =
        sdkwork_cloudrouter_router_service::api::admin_transaction_center_router_with_store(
            store.clone(),
        );

    let payload = request_json(
        router.clone(),
        signed_request(
            "PATCH",
            "/backend/v3/api/payments/providers/provider-stripe",
            r#"{"displayName":"Stripe CN","displayNameI18n":{"zh-CN":"斯特赖普"},"sortOrder":150,"status":"inactive","reason":"rename and pause during review"}"#,
        ),
        StatusCode::OK,
    )
    .await;
    assert_eq!("Stripe CN", payload["data"]["provider"]["displayName"]);
    assert_eq!("inactive", payload["data"]["provider"]["status"]);
    assert_eq!(150, payload["data"]["provider"]["sortOrder"]);
    assert_eq!(
        "斯特赖普",
        payload["data"]["provider"]["displayNameI18n"]["zh-CN"]
    );
    assert!(payload["data"]["requestId"]
        .as_str()
        .is_some_and(|value| !value.is_empty()));

    let updates = store.provider_updates.lock().unwrap();
    assert_eq!(1, updates.len());
    let update = &updates[0];
    assert_eq!("provider-stripe", update.provider_id);
    assert_eq!(Some("Stripe CN".to_owned()), update.display_name);
    assert_eq!(Some(150), update.sort_order);
    assert_eq!(Some("inactive".to_owned()), update.status);
    assert_eq!("rename and pause during review", update.reason);
    assert_eq!(TEST_TENANT_ID, update.subject.tenant_id);
    assert_eq!(TEST_OPERATOR_ID, update.subject.operator_id);
}

#[tokio::test]
async fn admin_transaction_center_provider_update_validates_required_and_unknown_fields() {
    let store = Arc::new(TestAdminTransactionCenterStore::default());
    let router =
        sdkwork_cloudrouter_router_service::api::admin_transaction_center_router_with_store(
            store.clone(),
        );

    // reason is mandatory (missing required field is rejected by the JSON
    // extractor).
    let response = router
        .clone()
        .oneshot(signed_request(
            "PATCH",
            "/backend/v3/api/payments/providers/provider-stripe",
            r#"{"displayName":"Stripe CN"}"#,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::UNPROCESSABLE_ENTITY, response.status());

    // At least one mutable field is required.
    let response = router
        .clone()
        .oneshot(signed_request(
            "PATCH",
            "/backend/v3/api/payments/providers/provider-stripe",
            r#"{"reason":"no-op"}"#,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, response.status());

    // Unknown fields are rejected.
    let response = router
        .clone()
        .oneshot(signed_request(
            "PATCH",
            "/backend/v3/api/payments/providers/provider-stripe",
            r#"{"displayName":"Stripe CN","reason":"review","providerCode":"evil"}"#,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::UNPROCESSABLE_ENTITY, response.status());

    // Status must be one of the canonical provider statuses.
    let response = router
        .clone()
        .oneshot(signed_request(
            "PATCH",
            "/backend/v3/api/payments/providers/provider-stripe",
            r#"{"status":"archived","reason":"review"}"#,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, response.status());

    // The store must not have been touched by any rejected request.
    assert!(store.provider_updates.lock().unwrap().is_empty());
}

fn signed_request(method: &str, path: &str, body: &str) -> Request<Body> {
    let mut request = common::web_framework_backend_request(
        method,
        path,
        Body::from(body.to_owned()),
        "100001",
        Some("0"),
        "30",
    );
    request
        .headers_mut()
        .insert("content-type", "application/json".parse().unwrap());
    request.headers_mut().insert(
        "Idempotency-Key",
        "transaction-center-test-idempotency-key".parse().unwrap(),
    );
    request
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
    provider_updates: Mutex<Vec<UpdatePaymentProviderCommand>>,
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

    fn update_payment_provider<'a>(
        &'a self,
        command: UpdatePaymentProviderCommand,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionJsonRecord> {
        self.provider_updates.lock().unwrap().push(command.clone());
        Box::pin(async move {
            let mut record = record(json!({
                "id": "provider-stripe",
                "providerCode": "stripe",
                "displayName": "Stripe",
                "providerType": "official",
                "supportedCountries": ["US"],
                "supportedCurrencies": ["USD"],
                "capabilities": ["payment_intent"],
                "status": "active",
                "sortOrder": 30
            }));
            if let Some(display_name) = &command.display_name {
                record.insert("displayName".to_owned(), json!(display_name));
            }
            if let Some(display_name_i18n) = &command.display_name_i18n {
                record.insert("displayNameI18n".to_owned(), display_name_i18n.clone());
            }
            if let Some(sort_order) = command.sort_order {
                record.insert("sortOrder".to_owned(), json!(sort_order));
            }
            if let Some(status) = &command.status {
                record.insert("status".to_owned(), json!(status));
            }
            Ok(record)
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
