mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::domain::DomainError;
use sdkwork_clawrouter_router_service::ports::{
    AdminTransactionCenterFuture, AdminTransactionCenterStore, AdminTransactionCollection,
    AdminTransactionJsonRecord, CreateAdminPaymentProviderAccountCommand,
    DeleteAdminPaymentProviderAccountCommand, ListAdminTransactionChildRecordsQuery,
    ListAdminTransactionRecordsQuery, LoadAdminTransactionRecordQuery,
    UpdateAdminPaymentProviderAccountCommand, UpdateAdminPaymentProviderAccountStatusCommand,
};
use serde_json::{json, Map, Value};
use tower::ServiceExt;

const TEST_TENANT_ID: i64 = 100001;
const TEST_ORGANIZATION_ID: i64 = 0;
const TEST_OPERATOR_ID: i64 = 30;

#[tokio::test]
async fn admin_transaction_center_provider_accounts_use_standard_list_create_delete_semantics() {
    let store = Arc::new(TestAdminTransactionCenterStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_transaction_center_router_with_store(
        store.clone(),
    );

    let accounts = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/payments/provider_accounts?page=1&page_size=1",
            "",
        ),
        StatusCode::OK,
    )
    .await;
    assert_eq!(0, accounts["code"].as_i64().unwrap());
    assert_eq!("provider-account-1", accounts["data"]["items"][0]["id"]);
    assert_eq!("offset", accounts["data"]["pageInfo"]["mode"]);
    assert_eq!(1, accounts["data"]["pageInfo"]["page"]);
    assert_eq!(1, accounts["data"]["pageInfo"]["pageSize"]);

    let created = request_json(
        router.clone(),
        signed_request(
            "POST",
            "/backend/v3/api/payments/provider_accounts",
            r#"{"providerCode":"stripe","accountRole":"merchant","merchantId":"merchant-1","environment":"sandbox","countryCode":"US","settlementCurrency":"USD","secretRef":"secret://payments/stripe/secret-key","status":"active"}"#,
        ),
        StatusCode::CREATED,
    )
    .await;
    assert_eq!(0, created["code"].as_i64().unwrap());
    assert_eq!("provider-account-created", created["data"]["item"]["id"]);
    assert_eq!("stripe", created["data"]["item"]["providerCode"]);

    request_empty(
        router,
        signed_request(
            "DELETE",
            "/backend/v3/api/payments/provider_accounts/provider-account-created",
            "",
        ),
        StatusCode::NO_CONTENT,
    )
    .await;

    assert_eq!(
        vec![
            "list_payment_provider_accounts",
            "create_payment_provider_account",
            "delete_payment_provider_account"
        ],
        *store.commands.lock().unwrap()
    );
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
    assert_eq!(expected_status, response.status());
    json_payload(response).await
}

async fn request_empty(router: axum::Router, request: Request<Body>, expected_status: StatusCode) {
    let response = router.oneshot(request).await.unwrap();
    assert_eq!(expected_status, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert!(body.is_empty());
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

#[derive(Default)]
struct TestAdminTransactionCenterStore {
    commands: Mutex<Vec<&'static str>>,
}

impl AdminTransactionCenterStore for TestAdminTransactionCenterStore {
    fn list_orders<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move {
            Ok(test_page(
                Vec::new(),
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn load_order<'a>(
        &'a self,
        _query: LoadAdminTransactionRecordQuery,
    ) -> AdminTransactionCenterFuture<'a, Option<AdminTransactionJsonRecord>> {
        Box::pin(async { Ok(None) })
    }

    fn list_order_events<'a>(
        &'a self,
        query: ListAdminTransactionChildRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move {
            Ok(test_page(
                Vec::new(),
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn list_refunds<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move {
            Ok(test_page(
                Vec::new(),
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn load_refund<'a>(
        &'a self,
        _query: LoadAdminTransactionRecordQuery,
    ) -> AdminTransactionCenterFuture<'a, Option<AdminTransactionJsonRecord>> {
        Box::pin(async { Ok(None) })
    }

    fn list_fulfillments<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move {
            Ok(test_page(
                Vec::new(),
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn list_shipments<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move {
            Ok(test_page(
                Vec::new(),
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn list_shipment_tracking_events<'a>(
        &'a self,
        query: ListAdminTransactionChildRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move {
            Ok(test_page(
                Vec::new(),
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn list_payment_providers<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move {
            Ok(test_page(
                Vec::new(),
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
            self.commands
                .lock()
                .unwrap()
                .push("list_payment_provider_accounts");
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

    fn create_payment_provider_account<'a>(
        &'a self,
        command: CreateAdminPaymentProviderAccountCommand,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionJsonRecord> {
        Box::pin(async move {
            self.commands
                .lock()
                .unwrap()
                .push("create_payment_provider_account");
            assert_eq!(TEST_TENANT_ID, command.subject.tenant_id);
            assert_eq!(TEST_ORGANIZATION_ID, command.subject.organization_id);
            assert_eq!(TEST_OPERATOR_ID, command.subject.operator_id);
            assert_eq!(
                "transaction-center-test-idempotency-key",
                command.idempotency_key
            );
            assert_eq!("stripe", command.provider_code);
            assert_eq!(Some("merchant".to_owned()), command.account_role);
            assert_eq!("merchant-1", command.merchant_id);
            assert_eq!("sandbox", command.environment);
            assert_eq!("US", command.country_code);
            assert_eq!("USD", command.settlement_currency);
            assert_eq!("secret://payments/stripe/secret-key", command.secret_ref);
            Ok(record(json!({
                "id": "provider-account-created",
                "accountNo": command.account_no,
                "providerCode": command.provider_code,
                "merchantId": command.merchant_id,
                "environment": command.environment,
                "status": command.status
            })))
        })
    }

    fn update_payment_provider_account<'a>(
        &'a self,
        _command: UpdateAdminPaymentProviderAccountCommand,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionJsonRecord> {
        Box::pin(async { Err(DomainError::new("unsupported test path")) })
    }

    fn update_payment_provider_account_status<'a>(
        &'a self,
        _command: UpdateAdminPaymentProviderAccountStatusCommand,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionJsonRecord> {
        Box::pin(async { Err(DomainError::new("unsupported test path")) })
    }

    fn delete_payment_provider_account<'a>(
        &'a self,
        command: DeleteAdminPaymentProviderAccountCommand,
    ) -> AdminTransactionCenterFuture<'a, bool> {
        Box::pin(async move {
            self.commands
                .lock()
                .unwrap()
                .push("delete_payment_provider_account");
            assert_eq!(TEST_TENANT_ID, command.subject.tenant_id);
            assert_eq!(TEST_ORGANIZATION_ID, command.subject.organization_id);
            assert_eq!(TEST_OPERATOR_ID, command.subject.operator_id);
            assert_eq!("provider-account-created", command.provider_account_id);
            Ok(true)
        })
    }

    fn list_payment_methods<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move {
            Ok(test_page(
                Vec::new(),
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn list_payment_channels<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move {
            Ok(test_page(
                Vec::new(),
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn list_payment_route_rules<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move {
            Ok(test_page(
                Vec::new(),
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn list_payment_intents<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move {
            Ok(test_page(
                Vec::new(),
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn list_payment_attempts<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move {
            Ok(test_page(
                Vec::new(),
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn list_payment_webhook_events<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move {
            Ok(test_page(
                Vec::new(),
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn list_payment_reconciliation_runs<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move {
            Ok(test_page(
                Vec::new(),
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
