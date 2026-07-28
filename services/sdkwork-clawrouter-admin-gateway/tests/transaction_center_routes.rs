use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_claw_http::TrustedRequestSubject;
use sdkwork_claw_test_support::{
    default_trusted_request_subject, seeded_sqlite_catalog, trusted_subject_signature,
};
use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAdminTransactionCenterStore;
use serde_json::{json, Value};
use sqlx::SqlitePool;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tower::ServiceExt;

#[tokio::test]
async fn transaction_center_backend_routes_use_real_database_handlers() {
    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    create_transaction_center_schema(&pool).await;
    seed_transaction_center_data(&pool).await;
    let router = transaction_center_router(&pool);

    for path in [
        "/backend/v3/api/orders",
        "/backend/v3/api/orders/order-900",
        "/backend/v3/api/orders/order-900/events",
        "/backend/v3/api/refunds",
        "/backend/v3/api/refunds/refund-920",
        "/backend/v3/api/fulfillments",
        "/backend/v3/api/shipments",
        "/backend/v3/api/shipments/shipment-1/tracking_events",
        "/backend/v3/api/payments/providers",
        "/backend/v3/api/payments/provider_accounts",
        "/backend/v3/api/payments/methods",
        "/backend/v3/api/payments/channels",
        "/backend/v3/api/payments/route_rules",
        "/backend/v3/api/payments/intents",
        "/backend/v3/api/payments/attempts",
        "/backend/v3/api/payments/webhook_events",
        "/backend/v3/api/payments/reconciliation_runs",
    ] {
        let payload =
            request_json(router.clone(), signed_request("GET", path, Body::empty())).await;
        assert_eq!("2000", payload["code"], "{path}");
        assert_ne!("Not implemented", payload["msg"], "{path}");
    }

    let orders_payload = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/orders", Body::empty()),
    )
    .await;
    assert_eq!("order-900", orders_payload["data"]["items"][0]["order_no"]);
    assert_eq!(
        "points_recharge",
        orders_payload["data"]["items"][0]["order_type"]
    );
    assert_eq!("25.50", orders_payload["data"]["items"][0]["total_amount"]);
    assert_eq!(
        "succeeded",
        orders_payload["data"]["items"][0]["pay_status"]
    );
    assert_eq!(1, orders_payload["data"]["page"]);
    assert_eq!(100, orders_payload["data"]["pageSize"]);
    assert_eq!(1, orders_payload["data"]["total"]);

    let provider_accounts_payload = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/payments/provider_accounts",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!(
        "acct-stripe-main",
        provider_accounts_payload["data"]["items"][0]["accountNo"]
    );
    assert_eq!(
        "stripe",
        provider_accounts_payload["data"]["items"][0]["providerCode"]
    );

    let intents_payload = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/payments/intents", Body::empty()),
    )
    .await;
    assert_eq!("card", intents_payload["data"]["items"][0]["methodCode"]);

    let attempts_payload = request_json(
        router,
        signed_request("GET", "/backend/v3/api/payments/attempts", Body::empty()),
    )
    .await;
    assert_eq!(
        "recharge-100",
        attempts_payload["data"]["items"][0]["attemptNo"]
    );
    assert_eq!(
        "payment-intent-910",
        attempts_payload["data"]["items"][0]["intentId"]
    );
    assert_eq!("card", attempts_payload["data"]["items"][0]["methodCode"]);
    pool.close().await;
}

#[tokio::test]
async fn transaction_center_provider_account_create_persists_to_database() {
    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    create_transaction_center_schema(&pool).await;
    seed_transaction_center_data(&pool).await;
    let router = transaction_center_router(&pool);

    let body = Body::from(
        json!({
            "providerCode": "paypal",
            "merchantId": "merchant-paypal-1",
            "environment": "sandbox",
            "countryCode": "US",
            "settlementCurrency": "USD",
            "secretRef": "vault://payments/paypal/sandbox",
            "webhookSecretRef": "vault://payments/paypal/webhook",
            "rotatedAt": "2026-04-29 10:00:00",
            "clientRequestNo": "client-provider-account-create-1",
            "note": "sandbox account for payment acceptance smoke coverage",
            "status": "active"
        })
        .to_string(),
    );
    let payload = request_json(
        router.clone(),
        signed_request_builder(
            "POST",
            "/backend/v3/api/payments/provider_accounts",
            default_trusted_request_subject(),
        )
        .header("idempotency-key", "provider-account-create-1")
        .header("x-request-id", "provider-account-request-1")
        .body(body)
        .unwrap(),
    )
    .await;

    assert_eq!("2000", payload["code"]);
    let account_no = payload["data"]["item"]["accountNo"].as_str().unwrap();
    assert!(account_no.starts_with("pacc-"));
    assert_eq!(37, account_no.len());
    assert_eq!("paypal", payload["data"]["item"]["providerCode"]);
    assert_eq!("2026-04-29 10:00:00", payload["data"]["item"]["rotatedAt"]);
    assert_eq!(
        "sandbox account for payment acceptance smoke coverage",
        payload["data"]["item"]["note"]
    );

    let replay_payload = request_json(
        router.clone(),
        signed_request_builder(
            "POST",
            "/backend/v3/api/payments/provider_accounts",
            default_trusted_request_subject(),
        )
        .header("idempotency-key", "provider-account-create-1")
        .header("x-request-id", "provider-account-request-1")
        .body(Body::from(
            json!({
                "providerCode": "paypal",
                "merchantId": "merchant-paypal-1",
                "environment": "sandbox",
                "countryCode": "US",
                "settlementCurrency": "USD",
                "secretRef": "vault://payments/paypal/sandbox",
                "webhookSecretRef": "vault://payments/paypal/webhook",
                "rotatedAt": "2026-04-29 10:00:00",
                "clientRequestNo": "client-provider-account-create-1",
                "note": "sandbox account for payment acceptance smoke coverage",
                "status": "active"
            })
            .to_string(),
        ))
        .unwrap(),
    )
    .await;
    assert_eq!("2000", replay_payload["code"]);
    assert_eq!(
        payload["data"]["item"]["id"],
        replay_payload["data"]["item"]["id"]
    );
    assert_eq!(
        payload["data"]["item"]["accountNo"],
        replay_payload["data"]["item"]["accountNo"]
    );

    let conflicting_note_replay = signed_request_builder(
        "POST",
        "/backend/v3/api/payments/provider_accounts",
        default_trusted_request_subject(),
    )
    .header("idempotency-key", "provider-account-create-1")
    .header("x-request-id", "provider-account-request-1")
    .body(Body::from(
        json!({
            "providerCode": "paypal",
            "merchantId": "merchant-paypal-1",
            "environment": "sandbox",
            "countryCode": "US",
            "settlementCurrency": "USD",
            "secretRef": "vault://payments/paypal/sandbox",
            "webhookSecretRef": "vault://payments/paypal/webhook",
            "rotatedAt": "2026-04-29 10:00:00",
            "clientRequestNo": "client-provider-account-create-1",
            "note": "changed note must conflict under the same idempotency key",
            "status": "active"
        })
        .to_string(),
    ))
    .unwrap();
    let conflicting_note_response = router
        .clone()
        .oneshot(conflicting_note_replay)
        .await
        .unwrap();
    assert_eq!(StatusCode::CONFLICT, conflicting_note_response.status());

    let conflicting_replay = signed_request_builder(
        "POST",
        "/backend/v3/api/payments/provider_accounts",
        default_trusted_request_subject(),
    )
    .header("idempotency-key", "provider-account-create-1")
    .body(Body::from(
        json!({
            "providerCode": "paypal",
            "merchantId": "merchant-paypal-1",
            "environment": "sandbox",
            "countryCode": "US",
            "settlementCurrency": "USD",
            "secretRef": "vault://payments/paypal/sandbox",
            "webhookSecretRef": "vault://payments/paypal/webhook",
            "status": "active"
        })
        .to_string(),
    ))
    .unwrap();
    let conflicting_response = router.clone().oneshot(conflicting_replay).await.unwrap();
    assert_eq!(StatusCode::CONFLICT, conflicting_response.status());
    let conflicting_body = axum::body::to_bytes(conflicting_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let conflicting_payload: Value = serde_json::from_slice(&conflicting_body).unwrap();
    assert_eq!("4090", conflicting_payload["code"]);

    let list_payload = request_json(
        router,
        signed_request(
            "GET",
            "/backend/v3/api/payments/provider_accounts",
            Body::empty(),
        ),
    )
    .await;
    let list_items = list_payload["data"]["items"].as_array().unwrap();
    assert!(list_items
        .iter()
        .any(|item| item["accountNo"] == account_no));
    let created_list_item = list_items
        .iter()
        .find(|item| item["accountNo"] == account_no)
        .unwrap()
        .clone();
    assert_eq!(
        "sandbox account for payment acceptance smoke coverage",
        created_list_item["note"]
    );
    let replayed_items = list_items
        .iter()
        .filter(|item| item["accountNo"] == account_no)
        .count();
    assert_eq!(1, replayed_items);
    assert!(!list_items
        .iter()
        .any(|item| item["accountNo"] == "acct-paypal-sandbox"));

    let audit_pool = catalog.open_pool().await.unwrap();
    let audit_rows = sqlx::query_as::<_, (String, String, String, String, i64, i64, String)>(
        r#"
        SELECT action, request_id, target_uuid, change_summary, operator_id, operator_type, uuid
        FROM ops_audit_log
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND target_uuid = ?
          AND action = 'payments.provider_account.create'
        ORDER BY id ASC
        "#,
    )
    .bind(payload["data"]["item"]["id"].as_str().unwrap())
    .fetch_all(&audit_pool)
    .await
    .unwrap();
    audit_pool.close().await;

    assert_eq!(1, audit_rows.len());
    let audit = &audit_rows[0];
    assert_eq!("payments.provider_account.create", audit.0);
    assert_server_request_id(&audit.1, "provider-account-request-1");
    assert_eq!(payload["data"]["item"]["id"], audit.2);
    assert_eq!(30, audit.4);
    assert_eq!(1, audit.5);
    assert!(audit.6.starts_with("transaction-center-audit-"));
    let change_summary: Value = serde_json::from_str(&audit.3).unwrap();
    assert_eq!(account_no, change_summary["accountNo"]);
    assert_eq!("paypal", change_summary["providerCode"]);
    assert_eq!("sandbox", change_summary["environment"]);
    assert_eq!(
        "client-provider-account-create-1",
        change_summary["clientRequestNo"]
    );
    assert_eq!(
        "sandbox account for payment acceptance smoke coverage",
        change_summary["note"]
    );
    pool.close().await;
}

#[tokio::test]
async fn transaction_center_provider_account_crud_and_status_commands_persist_to_database() {
    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    create_transaction_center_schema(&pool).await;
    seed_transaction_center_data(&pool).await;
    let router = transaction_center_router(&pool);

    let create_payload = request_json(
        router.clone(),
        signed_request_builder(
            "POST",
            "/backend/v3/api/payments/provider_accounts",
            default_trusted_request_subject(),
        )
        .header("idempotency-key", "provider-account-crud-create-1")
        .body(Body::from(
            json!({
                "providerCode": "stripe",
                "accountRole": "service_provider",
                "merchantId": "acct-service-main",
                "environment": "sandbox",
                "countryCode": "US",
                "settlementCurrency": "USD",
                "secretRef": "vault://payments/stripe/service",
                "webhookSecretRef": "vault://payments/stripe/service/webhook",
                "clientRequestNo": "client-provider-account-crud-create-1",
                "note": "service provider account for marketplace routing",
                "status": "inactive"
            })
            .to_string(),
        ))
        .unwrap(),
    )
    .await;
    assert_eq!("2000", create_payload["code"]);
    let provider_account_id = create_payload["data"]["item"]["id"].as_str().unwrap();
    let created_account_no = create_payload["data"]["item"]["accountNo"]
        .as_str()
        .unwrap();
    assert!(created_account_no.starts_with("pacc-"));
    assert_eq!(
        "service_provider",
        create_payload["data"]["item"]["accountRole"]
    );

    let update_payload = request_json(
        router.clone(),
        signed_request_builder(
            "PATCH",
            &format!("/backend/v3/api/payments/provider_accounts/{provider_account_id}"),
            default_trusted_request_subject(),
        )
        .header("idempotency-key", "provider-account-crud-update-1")
        .body(Body::from(
            json!({
                "providerCode": "stripe",
                "accountRole": "service_provider",
                "merchantId": "acct-service-updated",
                "environment": "production",
                "countryCode": "US",
                "settlementCurrency": "USD",
                "secretRef": "vault://payments/stripe/service-production",
                "webhookSecretRef": "vault://payments/stripe/service-production/webhook",
                "certificateRef": "vault://payments/stripe/service-production/cert",
                "rotatedAt": "2026-06-01 12:00:00",
                "clientRequestNo": "client-provider-account-crud-update-1",
                "note": "production service provider account",
                "status": "active"
            })
            .to_string(),
        ))
        .unwrap(),
    )
    .await;
    assert_eq!("2000", update_payload["code"]);
    assert_eq!(
        created_account_no,
        update_payload["data"]["item"]["accountNo"]
    );
    assert_eq!(
        "acct-service-updated",
        update_payload["data"]["item"]["merchantId"]
    );
    assert_eq!("production", update_payload["data"]["item"]["environment"]);
    assert_eq!(
        "production service provider account",
        update_payload["data"]["item"]["note"]
    );

    let disable_payload = request_json(
        router.clone(),
        signed_request_builder(
            "PATCH",
            &format!("/backend/v3/api/payments/provider_accounts/{provider_account_id}/status"),
            default_trusted_request_subject(),
        )
        .header("idempotency-key", "provider-account-crud-disable-1")
        .body(Body::from(
            json!({
                "status": "disabled",
                "clientRequestNo": "client-provider-account-crud-disable-1",
                "note": "disabled while rotating provider credentials"
            })
            .to_string(),
        ))
        .unwrap(),
    )
    .await;
    assert_eq!("2000", disable_payload["code"]);
    assert_eq!("disabled", disable_payload["data"]["item"]["status"]);
    assert_eq!(
        "disabled while rotating provider credentials",
        disable_payload["data"]["item"]["note"]
    );

    let enable_payload = request_json(
        router.clone(),
        signed_request_builder(
            "PATCH",
            &format!("/backend/v3/api/payments/provider_accounts/{provider_account_id}/status"),
            default_trusted_request_subject(),
        )
        .header("idempotency-key", "provider-account-crud-enable-1")
        .body(Body::from(
            json!({
                "status": "active",
                "clientRequestNo": "client-provider-account-crud-enable-1",
                "note": "credentials rotation verified"
            })
            .to_string(),
        ))
        .unwrap(),
    )
    .await;
    assert_eq!("2000", enable_payload["code"]);
    assert_eq!("active", enable_payload["data"]["item"]["status"]);

    let delete_payload = request_json(
        router.clone(),
        signed_request(
            "DELETE",
            &format!("/backend/v3/api/payments/provider_accounts/{provider_account_id}"),
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", delete_payload["code"]);
    assert_eq!(true, delete_payload["data"]["deleted"]);

    let list_payload = request_json(
        router,
        signed_request(
            "GET",
            "/backend/v3/api/payments/provider_accounts",
            Body::empty(),
        ),
    )
    .await;
    assert!(!list_payload["data"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item["id"] == provider_account_id));

    pool.close().await;
}

#[tokio::test]
async fn transaction_center_provider_account_active_status_is_exclusive_per_channel_scope() {
    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    create_transaction_center_schema(&pool).await;
    seed_transaction_center_data(&pool).await;
    let router = transaction_center_router(&pool);

    let create_payload = request_json(
        router.clone(),
        signed_request_builder(
            "POST",
            "/backend/v3/api/payments/provider_accounts",
            default_trusted_request_subject(),
        )
        .header("idempotency-key", "provider-account-exclusive-create-1")
        .body(Body::from(
            json!({
                "providerCode": "stripe",
                "accountRole": "merchant",
                "merchantId": "merchant-stripe-backup",
                "environment": "sandbox",
                "countryCode": "US",
                "settlementCurrency": "USD",
                "secretRef": "vault://payments/stripe/backup",
                "webhookSecretRef": "vault://payments/stripe/backup/webhook",
                "clientRequestNo": "client-provider-account-exclusive-create-1",
                "note": "backup account promoted into the channel account pool",
                "status": "active"
            })
            .to_string(),
        ))
        .unwrap(),
    )
    .await;
    assert_eq!("2000", create_payload["code"]);
    let backup_provider_account_id = create_payload["data"]["item"]["id"].as_str().unwrap();
    let backup_account_no = create_payload["data"]["item"]["accountNo"]
        .as_str()
        .unwrap();
    assert!(backup_account_no.starts_with("pacc-"));
    assert_eq!("active", create_payload["data"]["item"]["status"]);

    let list_after_create = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/payments/provider_accounts?supplier_code=stripe",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", list_after_create["code"]);
    assert_provider_account_status(&list_after_create, "acct-stripe-main", "inactive");
    assert_provider_account_status(&list_after_create, backup_account_no, "active");

    let enable_original_payload = request_json(
        router.clone(),
        signed_request_builder(
            "PATCH",
            "/backend/v3/api/payments/provider_accounts/provider-account-stripe/status",
            default_trusted_request_subject(),
        )
        .header(
            "idempotency-key",
            "provider-account-exclusive-enable-original-1",
        )
        .body(Body::from(
            json!({
                "status": "active",
                "clientRequestNo": "client-provider-account-exclusive-enable-original-1",
                "note": "restore primary account as the only available account"
            })
            .to_string(),
        ))
        .unwrap(),
    )
    .await;
    assert_eq!("2000", enable_original_payload["code"]);
    assert_eq!("active", enable_original_payload["data"]["item"]["status"]);

    let list_after_enable = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/payments/provider_accounts?supplier_code=stripe",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", list_after_enable["code"]);
    assert_provider_account_status(&list_after_enable, "acct-stripe-main", "active");
    assert_provider_account_status(&list_after_enable, backup_account_no, "inactive");
    assert_ne!(
        "active",
        provider_account_status(&list_after_enable, backup_provider_account_id)
    );

    let update_backup_payload = request_json(
        router.clone(),
        signed_request_builder(
            "PATCH",
            &format!("/backend/v3/api/payments/provider_accounts/{backup_provider_account_id}"),
            default_trusted_request_subject(),
        )
        .header(
            "idempotency-key",
            "provider-account-exclusive-update-backup-1",
        )
        .body(Body::from(
            json!({
                "providerCode": "stripe",
                "accountRole": "merchant",
                "merchantId": "merchant-stripe-backup",
                "environment": "sandbox",
                "countryCode": "US",
                "settlementCurrency": "USD",
                "secretRef": "vault://payments/stripe/backup-rotated",
                "webhookSecretRef": "vault://payments/stripe/backup-rotated/webhook",
                "clientRequestNo": "client-provider-account-exclusive-update-backup-1",
                "note": "promote rotated backup account as the only available account",
                "status": "active"
            })
            .to_string(),
        ))
        .unwrap(),
    )
    .await;
    assert_eq!("2000", update_backup_payload["code"]);
    assert_eq!("active", update_backup_payload["data"]["item"]["status"]);

    let list_after_update = request_json(
        router,
        signed_request(
            "GET",
            "/backend/v3/api/payments/provider_accounts?supplier_code=stripe",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", list_after_update["code"]);
    assert_provider_account_status(&list_after_update, "acct-stripe-main", "inactive");
    assert_provider_account_status(&list_after_update, backup_account_no, "active");
    pool.close().await;
}

#[tokio::test]
async fn transaction_center_provider_account_create_rejects_contract_invalid_fields() {
    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    create_transaction_center_schema(&pool).await;
    seed_transaction_center_data(&pool).await;
    let router = transaction_center_router(&pool);

    assert_provider_account_create_rejects_patch(
        router.clone(),
        "unknown-account-no",
        json!({ "accountNo": "acct-paypal-sandbox" }),
        "unknown field `accountNo`",
    )
    .await;
    assert_provider_account_create_rejects_patch(
        router.clone(),
        "provider-enum",
        json!({ "providerCode": "venmo" }),
        "providerCode must be one of",
    )
    .await;
    assert_provider_account_create_rejects_patch(
        router.clone(),
        "environment-enum",
        json!({ "environment": "test" }),
        "environment must be one of",
    )
    .await;
    assert_provider_account_create_rejects_patch(
        router.clone(),
        "country-code-pattern",
        json!({ "countryCode": "USA" }),
        "countryCode must match ^[A-Z]{2}$",
    )
    .await;
    assert_provider_account_create_rejects_patch(
        router.clone(),
        "currency-code-pattern",
        json!({ "settlementCurrency": "US" }),
        "settlementCurrency must match ^[A-Z]{3}$",
    )
    .await;
    assert_provider_account_create_rejects_patch(
        router.clone(),
        "status-enum",
        json!({ "status": "paused" }),
        "status must be one of",
    )
    .await;
    assert_provider_account_create_rejects_patch(
        router.clone(),
        "unknown-field",
        json!({ "metadata": { "team": "payments" } }),
        "unknown field",
    )
    .await;
    assert_provider_account_create_rejects_patch(
        router.clone(),
        "merchant-id-length",
        json!({ "merchantId": "m".repeat(129) }),
        "merchantId must be visible ASCII and at most 128 characters",
    )
    .await;
    assert_provider_account_create_rejects_patch(
        router.clone(),
        "secret-ref-length",
        json!({ "secretRef": format!("vault://{}", "s".repeat(250)) }),
        "secretRef must be visible ASCII and at most 256 characters",
    )
    .await;
    assert_provider_account_create_rejects_patch(
        router.clone(),
        "webhook-secret-ref-length",
        json!({ "webhookSecretRef": format!("vault://{}", "w".repeat(250)) }),
        "webhookSecretRef must be visible ASCII and at most 256 characters",
    )
    .await;
    assert_provider_account_create_rejects_patch(
        router.clone(),
        "certificate-ref-length",
        json!({ "certificateRef": format!("vault://{}", "c".repeat(250)) }),
        "certificateRef must be visible ASCII and at most 256 characters",
    )
    .await;

    let list_payload = request_json(
        router,
        signed_request(
            "GET",
            "/backend/v3/api/payments/provider_accounts",
            Body::empty(),
        ),
    )
    .await;
    assert!(!list_payload["data"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item["accountNo"] == "acct-paypal-sandbox"));
    pool.close().await;
}

async fn assert_provider_account_create_rejects_patch(
    router: axum::Router,
    case: &str,
    patch: Value,
    expected_message: &str,
) {
    let mut body = valid_provider_account_body();
    let body_object = body.as_object_mut().unwrap();
    for (key, value) in patch.as_object().unwrap() {
        body_object.insert(key.clone(), value.clone());
    }

    let request = signed_request_builder(
        "POST",
        "/backend/v3/api/payments/provider_accounts",
        default_trusted_request_subject(),
    )
    .header(
        "idempotency-key",
        format!("provider-account-invalid-{case}"),
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let (status, payload) = request_value(router, request).await;

    assert_eq!(StatusCode::BAD_REQUEST, status, "{case}");
    assert_eq!("4001", payload["code"], "{case}");
    assert!(
        payload["msg"]
            .as_str()
            .is_some_and(|message| message.contains(expected_message)),
        "{case}: {}",
        payload["msg"]
    );
}

#[tokio::test]
async fn transaction_center_list_filters_reject_invalid_standard_codes() {
    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    create_transaction_center_schema(&pool).await;
    seed_transaction_center_data(&pool).await;
    let router = transaction_center_router(&pool);

    for (path, expected_message) in [
        (
            "/backend/v3/api/payments/provider_accounts?supplier_code=venmo",
            "providerCode must be one of",
        ),
        (
            "/backend/v3/api/payments/channels?country_code=USA",
            "countryCode must match ^[A-Z]{2}$",
        ),
        (
            "/backend/v3/api/payments/intents?currency_code=US",
            "currencyCode must match ^[A-Z]{3}$",
        ),
        (
            "/backend/v3/api/payments/channels?method_code=venmo",
            "methodCode must be one of",
        ),
        (
            "/backend/v3/api/payments/route_rules?method_code=venmo",
            "methodCode must be one of",
        ),
        (
            "/backend/v3/api/payments/providers?status=abcdefghijklmnopqrstuvwxyzabcdefg",
            "status must be visible ASCII and at most 32 characters",
        ),
        (
            "/backend/v3/api/payments/reconciliation_runs?business_date=2026-05-25-to-2026-06-30-range-extended",
            "businessDate must be visible ASCII and at most 32 characters",
        ),
    ] {
        let (status, payload) =
            request_value(router.clone(), signed_request("GET", path, Body::empty())).await;

        assert_eq!(StatusCode::BAD_REQUEST, status, "{path}");
        assert_eq!("4001", payload["code"], "{path}");
        assert!(
            payload["msg"]
                .as_str()
                .is_some_and(|message| message.contains(expected_message)),
            "{path}: {}",
            payload["msg"]
        );
    }
    pool.close().await;
}

#[tokio::test]
async fn transaction_center_payment_runtime_projection_standardizes_appbase_method_values() {
    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    create_transaction_center_schema(&pool).await;
    seed_transaction_center_data(&pool).await;
    sqlx::query(
        r#"
        UPDATE commerce_order
        SET subject = 'membership'
        WHERE id = 'order-900'
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        UPDATE commerce_payment_intent
        SET provider = 'card'
        WHERE id = 'payment-intent-910'
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        UPDATE commerce_payment_attempt
        SET provider = 'card'
        WHERE id = 'payment-910'
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    let router = transaction_center_router(&pool);

    let intents_payload = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/payments/intents?supplier_code=stripe",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!(1, intents_payload["data"]["total"]);
    assert_eq!(
        "membership_purchase",
        intents_payload["data"]["items"][0]["subjectType"]
    );
    assert_eq!("card", intents_payload["data"]["items"][0]["methodCode"]);
    assert_eq!(
        "stripe",
        intents_payload["data"]["items"][0]["providerCode"]
    );

    let attempts_payload = request_json(
        router,
        signed_request(
            "GET",
            "/backend/v3/api/payments/attempts?supplier_code=stripe",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!(1, attempts_payload["data"]["total"]);
    assert_eq!("card", attempts_payload["data"]["items"][0]["methodCode"]);
    assert_eq!(
        "stripe",
        attempts_payload["data"]["items"][0]["providerCode"]
    );
    pool.close().await;
}

fn valid_provider_account_body() -> Value {
    json!({
        "providerCode": "paypal",
        "merchantId": "merchant-paypal-1",
        "environment": "sandbox",
        "countryCode": "US",
        "settlementCurrency": "USD",
        "secretRef": "vault://payments/paypal/sandbox",
        "webhookSecretRef": "vault://payments/paypal/webhook",
        "certificateRef": "vault://payments/paypal/cert",
        "rotatedAt": "2026-04-29 10:00:00",
        "clientRequestNo": "client-provider-account-create-1",
        "note": "sandbox account for payment acceptance smoke coverage",
        "status": "active"
    })
}

fn transaction_center_router(pool: &SqlitePool) -> axum::Router {
    sdkwork_clawrouter_router_service::api::admin_transaction_center_router_with_store(Arc::new(
        SqliteAdminTransactionCenterStore::new(pool.clone()),
    ))
}

fn signed_request(method: &str, path: &str, body: Body) -> Request<Body> {
    signed_request_builder(method, path, default_trusted_request_subject())
        .body(body)
        .unwrap()
}

fn signed_request_builder(
    method: &str,
    path: &str,
    subject: TrustedRequestSubject,
) -> axum::http::request::Builder {
    let timestamp = current_unix_seconds();
    let signature = trusted_subject_signature(subject, timestamp, method, path).unwrap();
    Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
        .header("x-sdkwork-tenant-id", subject.tenant_id.to_string())
        .header(
            "x-sdkwork-organization-id",
            subject.organization_id.to_string(),
        )
        .header("x-sdkwork-user-id", subject.user_id.to_string())
        .header("x-sdkwork-subject-tenant-id", subject.tenant_id.to_string())
        .header(
            "x-sdkwork-subject-organization-id",
            subject.organization_id.to_string(),
        )
        .header("x-sdkwork-subject-user-id", subject.user_id.to_string())
        .header("x-sdkwork-subject-timestamp", timestamp.to_string())
        .header("x-sdkwork-subject-signature", signature)
}

fn assert_server_request_id(value: &str, client_header_value: &str) {
    let bytes = value.as_bytes();
    assert_eq!(36, bytes.len(), "request id must be a canonical UUID");
    assert_ne!(
        client_header_value, value,
        "server-generated request id must ignore client X-Request-Id"
    );
    assert_eq!(b'-', bytes[8], "request id must use canonical dashes");
    assert_eq!(b'-', bytes[13], "request id must use canonical dashes");
    assert_eq!(b'-', bytes[18], "request id must use canonical dashes");
    assert_eq!(b'-', bytes[23], "request id must use canonical dashes");
    assert_eq!(b'4', bytes[14], "request id must be UUID v4");
    assert!(
        matches!(bytes[19], b'8' | b'9' | b'a' | b'b'),
        "request id must use the RFC 4122 UUID variant"
    );
}

fn assert_provider_account_status(payload: &Value, account_no: &str, expected_status: &str) {
    assert_eq!(
        expected_status,
        provider_account_status(payload, account_no),
        "{account_no} should be {expected_status}"
    );
}

fn provider_account_status(payload: &Value, account_no_or_id: &str) -> String {
    payload["data"]["items"]
        .as_array()
        .and_then(|items| {
            items.iter().find_map(|item| {
                let matches_account = item["accountNo"].as_str() == Some(account_no_or_id)
                    || item["id"].as_str() == Some(account_no_or_id);
                matches_account.then(|| item["status"].as_str().unwrap_or_default().to_owned())
            })
        })
        .unwrap_or_default()
}

async fn request_json(router: axum::Router, request: Request<Body>) -> Value {
    let (status, payload) = request_value(router, request).await;
    assert_eq!(StatusCode::OK, status);
    payload
}

async fn request_value(router: axum::Router, request: Request<Body>) -> (StatusCode, Value) {
    let response = router.oneshot(request).await.unwrap();
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    (status, serde_json::from_slice(&body).unwrap())
}

fn current_unix_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0)
}

async fn create_transaction_center_schema(pool: &SqlitePool) {
    for statement in [
        r#"CREATE TABLE commerce_order (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            owner_user_id TEXT NOT NULL,
            order_no TEXT NOT NULL,
            status TEXT NOT NULL,
            subject TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            paid_at TEXT,
            cancelled_at TEXT,
            expired_at TEXT,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, order_no)
        )"#,
        r#"CREATE TABLE commerce_order_amount_breakdown (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            order_id TEXT NOT NULL,
            original_amount TEXT NOT NULL,
            discount_amount TEXT NOT NULL,
            payable_amount TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE (tenant_id, order_id)
        )"#,
        r#"CREATE TABLE commerce_order_event (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            event_no TEXT NOT NULL,
            order_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            from_status TEXT,
            to_status TEXT NOT NULL,
            actor_type TEXT NOT NULL,
            actor_id TEXT,
            reason_code TEXT,
            message TEXT,
            payload_json TEXT,
            request_id TEXT,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE commerce_refund (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            payment_attempt_id TEXT NOT NULL,
            refund_no TEXT NOT NULL,
            amount TEXT NOT NULL,
            status TEXT NOT NULL,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, refund_no)
        )"#,
        r#"CREATE TABLE commerce_fulfillment_order (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            fulfillment_no TEXT NOT NULL,
            order_id TEXT NOT NULL,
            fulfillment_type TEXT NOT NULL,
            status TEXT NOT NULL,
            warehouse_id TEXT,
            address_snapshot_id TEXT,
            supplier_code TEXT,
            created_at TEXT NOT NULL,
            completed_at TEXT,
            updated_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE commerce_shipment (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            shipment_no TEXT NOT NULL,
            fulfillment_id TEXT NOT NULL,
            carrier_code TEXT NOT NULL,
            tracking_no TEXT NOT NULL,
            status TEXT NOT NULL,
            shipped_at TEXT,
            delivered_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE commerce_shipment_tracking_event (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            shipment_id TEXT NOT NULL,
            event_time TEXT NOT NULL,
            event_code TEXT NOT NULL,
            location TEXT,
            description TEXT,
            raw_payload_json TEXT,
            created_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE commerce_payment_provider (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            supplier_code TEXT NOT NULL,
            display_name TEXT NOT NULL,
            provider_type TEXT NOT NULL,
            supported_countries TEXT,
            supported_currencies TEXT,
            supported_methods TEXT,
            status TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, organization_id, supplier_code)
        )"#,
        r#"CREATE TABLE commerce_payment_provider_account (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            account_no TEXT NOT NULL,
            supplier_code TEXT NOT NULL,
            merchant_id TEXT NOT NULL,
            environment TEXT NOT NULL,
            country_code TEXT NOT NULL,
            settlement_currency TEXT NOT NULL,
            secret_ref TEXT NOT NULL,
            webhook_secret_ref TEXT,
            certificate_ref TEXT,
            status TEXT NOT NULL,
            rotated_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (account_no)
        )"#,
        r#"CREATE TABLE ops_audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            request_id TEXT,
            trace_id TEXT,
            operator_id INTEGER,
            action TEXT,
            target_type INTEGER,
            target_id INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            retention_until TEXT,
            legal_hold INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            operator_type INTEGER,
            operator_name_snapshot TEXT,
            target_uuid TEXT,
            client_ip_hash TEXT,
            user_agent_hash TEXT,
            before_hash TEXT,
            after_hash TEXT,
            change_summary TEXT,
            risk_level INTEGER,
            approval_id INTEGER
        )"#,
        r#"CREATE TABLE commerce_payment_method (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            method_key TEXT NOT NULL,
            display_name TEXT NOT NULL,
            provider TEXT NOT NULL,
            status TEXT NOT NULL,
            sort_weight INTEGER NOT NULL DEFAULT 0,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, organization_id, method_key)
        )"#,
        r#"CREATE TABLE commerce_payment_channel (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            channel_no TEXT NOT NULL,
            provider_account_id TEXT NOT NULL,
            method_id TEXT NOT NULL,
            scene_code TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            country_code TEXT NOT NULL,
            status TEXT NOT NULL,
            priority INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, channel_no)
        )"#,
        r#"CREATE TABLE commerce_payment_route_rule (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            rule_no TEXT NOT NULL,
            priority INTEGER NOT NULL DEFAULT 0,
            purchase_type TEXT,
            country_code TEXT,
            currency_code TEXT,
            client_platform TEXT,
            amount_min TEXT,
            amount_max TEXT,
            user_segment TEXT,
            risk_level TEXT,
            account_id TEXT NOT NULL,
            status TEXT NOT NULL,
            starts_at TEXT,
            ends_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, rule_no)
        )"#,
        r#"CREATE TABLE commerce_payment_intent (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            owner_user_id TEXT NOT NULL,
            order_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            amount TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            status TEXT NOT NULL,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE commerce_payment_attempt (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            owner_user_id TEXT NOT NULL,
            payment_intent_id TEXT NOT NULL,
            order_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            out_trade_no TEXT NOT NULL,
            amount TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            status TEXT NOT NULL,
            callback_payload TEXT,
            created_at TEXT NOT NULL,
            paid_at TEXT,
            updated_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE commerce_payment_webhook_event (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            provider TEXT NOT NULL,
            event_id TEXT NOT NULL,
            nonce TEXT NOT NULL,
            signature TEXT,
            request_timestamp INTEGER,
            out_trade_no TEXT NOT NULL,
            transaction_id TEXT,
            payload_digest TEXT NOT NULL,
            status TEXT NOT NULL,
            message TEXT,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            processed_at TEXT,
            updated_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE commerce_payment_reconciliation_run (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            run_no TEXT NOT NULL,
            supplier_code TEXT NOT NULL,
            provider_account_id TEXT,
            settlement_currency TEXT NOT NULL,
            period_start TEXT NOT NULL,
            period_end TEXT NOT NULL,
            status TEXT NOT NULL,
            total_provider_amount TEXT NOT NULL,
            total_internal_amount TEXT NOT NULL,
            difference_amount TEXT NOT NULL,
            matched_count INTEGER NOT NULL,
            mismatched_count INTEGER NOT NULL,
            missing_provider_count INTEGER NOT NULL,
            missing_internal_count INTEGER NOT NULL,
            report_file_ref TEXT,
            started_at TEXT,
            completed_at TEXT,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_transaction_center_data(pool: &SqlitePool) {
    for statement in [
        r#"INSERT INTO commerce_order
            (id, tenant_id, organization_id, owner_user_id, order_no, status, subject, currency_code, request_no, idempotency_key, created_at, paid_at, cancelled_at, expired_at, updated_at)
            VALUES ('order-900', '100001', '0', '30', 'order-900', 'paid', 'points_recharge', 'USD', 'order-900', 'order-900', '2026-04-29 09:00:00', '2026-04-29 09:10:00', NULL, NULL, '2026-04-29 09:10:00')"#,
        r#"INSERT INTO commerce_order_amount_breakdown
            (id, tenant_id, order_id, original_amount, discount_amount, payable_amount, currency_code, created_at)
            VALUES ('amount-900', '10', 'order-900', '25.50', '0.00', '25.50', 'USD', '2026-04-29 09:00:00')"#,
        r#"INSERT INTO commerce_order_event
            (id, tenant_id, organization_id, event_no, order_id, event_type, from_status, to_status, actor_type, actor_id, reason_code, message, payload_json, request_id, idempotency_key, created_at)
            VALUES ('order-event-1', '100001', '0', 'order-event-1', 'order-900', 'paid', 'pending', 'paid', 'system', '30', NULL, 'Order paid', '{}', 'order-900', 'order-event-1', '2026-04-29 09:10:00')"#,
        r#"INSERT INTO commerce_payment_provider
            (id, tenant_id, organization_id, supplier_code, display_name, provider_type, supported_countries, supported_currencies, supported_methods, status, sort_order, created_at, updated_at)
            VALUES ('provider-stripe', '100001', '0', 'stripe', 'Stripe', 'card_processor', '["US"]', '["USD"]', '["card"]', 'active', 1, '2026-04-29 09:00:00', '2026-04-29 09:00:00')"#,
        r#"INSERT INTO commerce_payment_provider_account
            (id, tenant_id, organization_id, account_no, supplier_code, merchant_id, environment, country_code, settlement_currency, secret_ref, webhook_secret_ref, certificate_ref, status, rotated_at, created_at, updated_at)
            VALUES ('provider-account-stripe', '100001', '0', 'acct-stripe-main', 'stripe', 'merchant-stripe-1', 'sandbox', 'US', 'USD', 'vault://payments/stripe/main', 'vault://payments/stripe/webhook', NULL, 'active', NULL, '2026-04-29 09:00:00', '2026-04-29 09:00:00')"#,
        r#"INSERT INTO commerce_payment_method
            (id, tenant_id, organization_id, method_key, display_name, provider, status, sort_weight, request_no, idempotency_key, created_at, updated_at)
            VALUES ('payment-method-card', '100001', '0', 'card', 'Card', 'stripe', 'active', 1, 'method-card', 'method-card', '2026-04-29 09:00:00', '2026-04-29 09:00:00')"#,
        r#"INSERT INTO commerce_payment_channel
            (id, tenant_id, organization_id, channel_no, provider_account_id, method_id, scene_code, currency_code, country_code, status, priority, created_at, updated_at)
            VALUES ('payment-channel-card', '100001', '0', 'channel-card-usd', 'provider-account-stripe', 'payment-method-card', 'points_recharge', 'USD', 'US', 'active', 1, '2026-04-29 09:00:00', '2026-04-29 09:00:00')"#,
        r#"INSERT INTO commerce_payment_route_rule
            (id, tenant_id, organization_id, rule_no, priority, purchase_type, country_code, currency_code, client_platform, amount_min, amount_max, user_segment, risk_level, account_id, status, starts_at, ends_at, created_at, updated_at)
            VALUES ('route-card-usd', '100001', '0', 'route-card-usd', 1, 'points_recharge', 'US', 'USD', 'web', '0', '1000', 'all', 'low', 'payment-channel-card', 'active', NULL, NULL, '2026-04-29 09:00:00', '2026-04-29 09:00:00')"#,
        r#"INSERT INTO commerce_payment_intent
            (id, tenant_id, organization_id, owner_user_id, order_id, provider, amount, currency_code, status, request_no, idempotency_key, created_at, updated_at)
            VALUES ('payment-intent-910', '100001', '0', '30', 'order-900', 'stripe', '25.50', 'USD', 'succeeded', 'intent-910', 'intent-910', '2026-04-29 09:00:00', '2026-04-29 09:10:00')"#,
        r#"INSERT INTO commerce_payment_attempt
            (id, tenant_id, organization_id, owner_user_id, payment_intent_id, order_id, provider, out_trade_no, amount, currency_code, status, callback_payload, created_at, paid_at, updated_at)
            VALUES ('payment-910', '100001', '0', '30', 'payment-intent-910', 'order-900', 'stripe', 'recharge-100', '25.50', 'USD', 'succeeded', '{"points":1000}', '2026-04-29 09:00:00', '2026-04-29 09:10:00', '2026-04-29 09:10:00')"#,
        r#"INSERT INTO commerce_refund
            (id, tenant_id, payment_attempt_id, refund_no, amount, status, request_no, idempotency_key, created_at, updated_at)
            VALUES ('refund-920', '10', 'payment-910', 'refund-920', '5.00', 'succeeded', 'refund-920', 'refund-920', '2026-04-29 09:30:00', '2026-04-29 09:40:00')"#,
        r#"INSERT INTO commerce_fulfillment_order
            (id, tenant_id, organization_id, fulfillment_no, order_id, fulfillment_type, status, warehouse_id, address_snapshot_id, supplier_code, created_at, completed_at, updated_at)
            VALUES ('fulfillment-1', '100001', '0', 'fulfillment-1', 'order-900', 'virtual', 'completed', NULL, NULL, 'internal', '2026-04-29 09:11:00', '2026-04-29 09:12:00', '2026-04-29 09:12:00')"#,
        r#"INSERT INTO commerce_shipment
            (id, tenant_id, organization_id, shipment_no, fulfillment_id, carrier_code, tracking_no, status, shipped_at, delivered_at, created_at, updated_at)
            VALUES ('shipment-1', '100001', '0', 'shipment-1', 'fulfillment-1', 'ups', '1Z999', 'in_transit', '2026-04-29 09:20:00', NULL, '2026-04-29 09:20:00', '2026-04-29 09:20:00')"#,
        r#"INSERT INTO commerce_shipment_tracking_event
            (id, tenant_id, organization_id, shipment_id, event_time, event_code, location, description, raw_payload_json, created_at)
            VALUES ('shipment-event-1', '100001', '0', 'shipment-1', '2026-04-29 09:21:00', 'picked_up', 'New York', 'Picked up', '{}', '2026-04-29 09:21:00')"#,
        r#"INSERT INTO commerce_payment_webhook_event
            (id, tenant_id, organization_id, provider, event_id, nonce, signature, request_timestamp, out_trade_no, transaction_id, payload_digest, status, message, request_no, idempotency_key, created_at, processed_at, updated_at)
            VALUES ('webhook-1', '100001', '0', 'stripe', 'evt-1', 'nonce-1', NULL, 1777444200, 'recharge-100', 'txn-1', 'digest-1', 'processed', 'payment succeeded', 'webhook-1', 'webhook-1', '2026-04-29 09:10:01', '2026-04-29 09:10:02', '2026-04-29 09:10:02')"#,
        r#"INSERT INTO commerce_payment_reconciliation_run
            (id, tenant_id, organization_id, run_no, supplier_code, provider_account_id, settlement_currency, period_start, period_end, status, total_provider_amount, total_internal_amount, difference_amount, matched_count, mismatched_count, missing_provider_count, missing_internal_count, report_file_ref, started_at, completed_at, request_no, idempotency_key, created_at, updated_at)
            VALUES ('recon-1', '100001', '0', 'recon-1', 'stripe', 'provider-account-stripe', 'USD', '2026-04-29', '2026-04-29', 'succeeded', '25.50', '25.50', '0.00', 1, 0, 0, 0, NULL, '2026-04-30 01:00:00', '2026-04-30 01:01:00', 'recon-1', 'recon-1', '2026-04-30 01:00:00', '2026-04-30 01:01:00')"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}
