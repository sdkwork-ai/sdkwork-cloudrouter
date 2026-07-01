mod common;
use common::InternalTrustedSubjectHeaders;
use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::application::EntityUuidGenerator;
use sdkwork_clawrouter_router_service::domain::DomainResult;
use sdkwork_clawrouter_router_service::ports::{
    AdminExchangeRuleItem, AdminMarketingCommandFuture, AdminMarketingStore, AdminMarketingSubject,
    AdminPaymentAttemptItem, AdminRechargePackageItem, AdminRechargeRecordItem,
    AdminRechargeSettingsItem, AdminReferralStatItem, CreateAdminRechargePackageCommand,
    CreatePromotionOfferCommand, DeleteAdminRechargePackageCommand, DeletePromotionOfferCommand,
    GeneratePromotionCouponStockCommand, ListAdminExchangeRulesQuery,
    ListAdminPaymentAttemptsQuery, ListAdminRechargePackagesQuery, ListAdminRechargeRecordsQuery,
    ListAdminReferralStatsQuery, ListPromotionCodeRedemptionsQuery, ListPromotionCodesQuery,
    ListPromotionCouponStocksQuery, ListPromotionOffersQuery, LoadAdminRechargeRecordQuery,
    PromotionCodeItem, PromotionCodeRedemptionItem, PromotionCouponStockItem, PromotionOfferItem,
    RechargeSettingsUpdateCommand, UpdateAdminExchangeRuleCommand,
    UpdateAdminRechargePackageCommand, UpdatePromotionCodeStatusCommand,
    UpdatePromotionOfferCommand,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn admin_marketing_route_lists_all_marketing_read_models() {
    let router = sdkwork_clawrouter_router_service::api::admin_marketing_router_with_store(
        Arc::new(TestAdminMarketingStore::default()),
        Arc::new(TestUuidGenerator),
    );

    let offers = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/promotions/offers", ""),
    )
    .await;
    assert_eq!(0, offers["code"].as_i64().unwrap());
    assert_eq!("Welcome credit", offers["data"]["items"][0]["name"]);
    assert_eq!("coupon", offers["data"]["items"][0]["offer_type"]);
    assert_eq!("offer-1", offers["data"]["items"][0]["offer_no"]);

    let stocks = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/promotions/coupon_stocks", ""),
    )
    .await;
    assert_eq!("Welcome stock", stocks["data"]["items"][0]["name"]);
    assert_eq!("1", stocks["data"]["items"][0]["offer_id"]);
    assert_eq!(2, stocks["data"]["items"][0]["total_quantity"]);
    assert!(!stocks["data"]["items"][0]
        .as_object()
        .unwrap()
        .contains_key("batch_no"));

    let promotion_codes = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/promotions/codes", ""),
    )
    .await;
    assert_eq!(
        "0001",
        promotion_codes["data"]["items"][0]["promotion_code_last4"]
    );
    assert_eq!("available", promotion_codes["data"]["items"][0]["status"]);
    assert_eq!(
        "owner@example.com",
        promotion_codes["data"]["items"][1]["owner_user_id"]
    );
    assert_eq!(
        false,
        promotion_codes["data"]["items"][0]
            .as_object()
            .unwrap()
            .contains_key("code")
    );

    let redemptions = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/promotions/codes/redemptions", ""),
    )
    .await;
    assert_eq!("30", redemptions["data"]["items"][0]["owner_user_id"]);
    assert_eq!(
        "0002",
        redemptions["data"]["items"][0]["submitted_code_suffix"]
    );
    assert_eq!(
        "succeeded",
        redemptions["data"]["items"][0]["result_status"]
    );

    let recharges = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/billing/recharges/records", ""),
    )
    .await;
    assert_eq!("recharge-100", recharges["data"]["items"][0]["tradeNo"]);
    assert_eq!("1000", recharges["data"]["items"][0]["usd_credited"]);
    assert_eq!("stripe", recharges["data"]["items"][0]["method"]);

    let recharge = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/billing/recharges/records/recharge-100",
            "",
        ),
    )
    .await;
    assert_eq!("recharge-100", recharge["data"]["item"]["tradeNo"]);
    assert_eq!("30", recharge["data"]["item"]["userId"]);
    assert_eq!("completed", recharge["data"]["item"]["status"]);

    let recharge_packages = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/recharges/packages", ""),
    )
    .await;
    assert_eq!("100", recharge_packages["data"]["items"][0]["id"]);
    assert_eq!(
        "10.00",
        recharge_packages["data"]["items"][0]["priceAmount"]
    );
    assert_eq!("CNY", recharge_packages["data"]["items"][0]["currencyCode"]);
    assert_eq!(25, recharge_packages["data"]["items"][0]["bonusPoints"]);
    assert_eq!(125, recharge_packages["data"]["items"][0]["grantAmount"]);
    assert_eq!(125, recharge_packages["data"]["items"][0]["points"]);

    let recharge_settings = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/recharges/settings", ""),
    )
    .await;
    assert_eq!("CNY", recharge_settings["data"]["baseCurrencyCode"]);
    assert_eq!("10", recharge_settings["data"]["basePointsPerCny"]);
    assert_eq!("1", recharge_settings["data"]["currencyToCnyRates"]["CNY"]);
    assert_eq!("7", recharge_settings["data"]["currencyToCnyRates"]["USD"]);

    let exchange_rules = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/billing/exchange_rules", ""),
    )
    .await;
    assert_eq!("exchange-1", exchange_rules["data"][0]["id"]);
    assert_eq!("POINTS", exchange_rules["data"][0]["sourceAssetType"]);
    assert_eq!("CASH", exchange_rules["data"][0]["targetAssetType"]);
    assert_eq!("120", exchange_rules["data"][0]["rate"]);
    assert_eq!("active", exchange_rules["data"][0]["status"]);

    let payment_attempts = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/billing/payments/attempts", ""),
    )
    .await;
    assert_eq!("payment-1", payment_attempts["data"]["items"][0]["id"]);
    assert_eq!("order-100", payment_attempts["data"]["items"][0]["orderNo"]);
    assert_eq!("wechat", payment_attempts["data"]["items"][0]["provider"]);
    assert_eq!("25.50", payment_attempts["data"]["items"][0]["amount"]);
    assert_eq!("success", payment_attempts["data"]["items"][0]["status"]);

    let referrals = request_json(
        router,
        signed_request("GET", "/backend/v3/api/router/referrals/stats", ""),
    )
    .await;
    assert_eq!("Owner", referrals["data"]["items"][0]["inviter"]);
    assert_eq!(3, referrals["data"]["items"][0]["total_invited"]);
    assert_eq!("$120.00", referrals["data"]["items"][0]["total_revenue"]);
}

#[tokio::test]
async fn admin_marketing_promotion_routes_expose_standard_card_lifecycle_models() {
    let router = sdkwork_clawrouter_router_service::api::admin_marketing_router_with_store(
        Arc::new(TestAdminMarketingStore::default()),
        Arc::new(TestUuidGenerator),
    );

    let offers = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/promotions/offers", ""),
    )
    .await;
    let offer = &offers["data"]["items"][0];
    assert_eq!("offer-1", offer["offer_no"]);
    assert_eq!("1", offer["offer_code"]);
    assert_eq!("Welcome credit", offer["name"]);
    assert_eq!("coupon", offer["offer_type"]);
    assert_eq!("all", offer["audience_scope"]);
    assert_eq!("exclusive", offer["combinability"]);
    assert_eq!("active", offer["status"]);

    let stocks = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/promotions/coupon_stocks", ""),
    )
    .await;
    let stock = &stocks["data"]["items"][0];
    assert_eq!("stock-11", stock["stock_no"]);
    assert!(!stock.as_object().unwrap().contains_key("batch_no"));
    assert_eq!("preloaded", stock["code_mode"]);
    assert_eq!("admin", stock["issue_channel"]);
    assert_eq!("USD", stock["currency_code"]);
    assert_eq!("active", stock["activation_status"]);
    assert_eq!(true, stock["can_resend"]);

    let codes = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/promotions/codes", ""),
    )
    .await;
    let code = &codes["data"]["items"][0];
    assert_eq!("code-501", code["code_no"]);
    assert_eq!("0001", code["promotion_code_last4"]);
    assert!(!code.as_object().unwrap().contains_key("code_batch_no"));
    assert_eq!("11", code["stock_id"]);
    assert_eq!("single_use", code["code_type"]);
    assert_eq!("USD", code["currency_code"]);
    assert_eq!("available", code["status"]);
    assert_eq!(false, code.as_object().unwrap().contains_key("code"));

    let redemptions = request_json(
        router,
        signed_request("GET", "/backend/v3/api/promotions/codes/redemptions", ""),
    )
    .await;
    let redemption = &redemptions["data"]["items"][0];
    assert_eq!("redemption-502", redemption["redemption_no"]);
    assert_eq!("0002", redemption["submitted_code_suffix"]);
    assert_eq!("30", redemption["owner_user_id"]);
    assert_eq!("USD", redemption["currency_code"]);
    assert_eq!("succeeded", redemption["result_status"]);
    assert_eq!("admin", redemption["redemption_channel"]);
    assert_eq!("2026-04-29 09:30:00", redemption["occurred_at"]);
}

#[tokio::test]
async fn admin_marketing_route_creates_deletes_generates_and_updates_codes() {
    let store = Arc::new(TestAdminMarketingStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_marketing_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let create_promotion_offer = request_json(
        router.clone(),
        signed_request(
            "POST",
            "/backend/v3/api/promotions/offers",
            r#"{"name":"Launch credit","discount_type":"amount","value":"$8.50"}"#,
        ),
    )
    .await;
    assert_eq!(
        "offer-99",
        create_promotion_offer["data"]["item"]["offer_no"]
    );
    assert_eq!("99", create_promotion_offer["data"]["item"]["offer_code"]);
    assert_eq!(
        "Launch credit",
        create_promotion_offer["data"]["item"]["name"]
    );
    assert_eq!(
        "coupon",
        create_promotion_offer["data"]["item"]["offer_type"]
    );
    assert_eq!("active", create_promotion_offer["data"]["item"]["status"]);

    let update_promotion_offer = request_json(
        router.clone(),
        signed_request(
            "PATCH",
            "/backend/v3/api/promotions/offers/99",
            r#"{"name":"Launch credit updated","discount_type":"discount","value":"15%","status":"inactive"}"#,
        ),
    )
    .await;
    assert_eq!(
        "offer-99",
        update_promotion_offer["data"]["item"]["offer_no"]
    );
    assert_eq!(
        "Launch credit updated",
        update_promotion_offer["data"]["item"]["name"]
    );
    assert_eq!(
        "coupon",
        update_promotion_offer["data"]["item"]["offer_type"]
    );
    assert_eq!("inactive", update_promotion_offer["data"]["item"]["status"]);

    let generate_promotion_coupon_stock = request_json(
        router.clone(),
        signed_request(
            "POST",
            "/backend/v3/api/promotions/coupon_stocks",
            r#"{"offer_id":"99","name":"Launch stock","total_quantity":3,"code_prefix":"LAUNCH"}"#,
        ),
    )
    .await;
    assert_eq!(
        "stock-12",
        generate_promotion_coupon_stock["data"]["item"]["stock_no"]
    );
    assert_eq!(
        "99",
        generate_promotion_coupon_stock["data"]["item"]["offer_id"]
    );
    assert_eq!(
        "Launch stock",
        generate_promotion_coupon_stock["data"]["item"]["name"]
    );
    assert!(!generate_promotion_coupon_stock["data"]["item"]
        .as_object()
        .unwrap()
        .contains_key("batch_no"));
    assert_eq!(
        3,
        generate_promotion_coupon_stock["data"]["codes"]
            .as_array()
            .unwrap()
            .len()
    );
    assert_eq!(
        "0001",
        generate_promotion_coupon_stock["data"]["codes"][0]["promotion_code_last4"]
    );
    assert!(!generate_promotion_coupon_stock["data"]["codes"][0]
        .as_object()
        .unwrap()
        .contains_key("code_batch_no"));
    assert_eq!(
        false,
        generate_promotion_coupon_stock["data"]["codes"][0]
            .as_object()
            .unwrap()
            .contains_key("code")
    );

    let update_status = request_json(
        router.clone(),
        signed_request(
            "PATCH",
            "/backend/v3/api/promotions/codes/501/status",
            r#"{"status":"voided"}"#,
        ),
    )
    .await;
    assert_eq!(true, update_status["data"]["updated"]);

    let create_package = request_json(
        router.clone(),
        signed_request(
            "POST",
            "/backend/v3/api/recharges/packages",
            r#"{"priceAmount":"12.00","currencyCode":"CNY","bonusPoints":30,"status":"active"}"#,
        ),
    )
    .await;
    assert_eq!(
        "recharge-package-10-20-901",
        create_package["data"]["item"]["id"]
    );
    assert_eq!("12.00", create_package["data"]["item"]["priceAmount"]);
    assert_eq!("CNY", create_package["data"]["item"]["currencyCode"]);
    assert_eq!(30, create_package["data"]["item"]["bonusPoints"]);
    assert_eq!(150, create_package["data"]["item"]["grantAmount"]);
    assert_eq!(150, create_package["data"]["item"]["points"]);

    let update_recharge_settings = request_json(
        router.clone(),
        signed_request(
            "PUT",
            "/backend/v3/api/recharges/settings",
            r#"{"baseCurrencyCode":"CNY","basePointsPerCny":"10","currencyToCnyRates":{"CNY":"1","USD":"7.5"}}"#,
        ),
    )
    .await;
    assert_eq!("10", update_recharge_settings["data"]["basePointsPerCny"]);
    assert_eq!(
        "7.5",
        update_recharge_settings["data"]["currencyToCnyRates"]["USD"]
    );

    let update_package = request_json(
        router.clone(),
        signed_request(
            "PATCH",
            "/backend/v3/api/recharges/packages/recharge-package-10-20-901",
            r#"{"priceAmount":"20.00","currencyCode":"USD","bonusPoints":50,"status":"inactive"}"#,
        ),
    )
    .await;
    assert_eq!(
        "recharge-package-10-20-901",
        update_package["data"]["item"]["id"]
    );
    assert_eq!("20.00", update_package["data"]["item"]["priceAmount"]);
    assert_eq!("USD", update_package["data"]["item"]["currencyCode"]);
    assert_eq!(50, update_package["data"]["item"]["bonusPoints"]);
    assert_eq!(1550, update_package["data"]["item"]["grantAmount"]);
    assert_eq!(1550, update_package["data"]["item"]["points"]);

    let update_exchange_rule = request_json(
        router.clone(),
        signed_request(
            "PUT",
            "/backend/v3/api/billing/exchange_rules",
            r#"{"sourceAssetType":"points","targetAssetType":"cash","rate":"250.000000","status":"active"}"#,
        ),
    )
    .await;
    assert_eq!(
        "exchange-upserted",
        update_exchange_rule["data"]["item"]["id"]
    );
    assert_eq!(
        "POINTS",
        update_exchange_rule["data"]["item"]["sourceAssetType"]
    );
    assert_eq!(
        "CASH",
        update_exchange_rule["data"]["item"]["targetAssetType"]
    );
    assert_eq!("250", update_exchange_rule["data"]["item"]["rate"]);
    assert_eq!("active", update_exchange_rule["data"]["item"]["status"]);

    let delete_package = request_json(
        router.clone(),
        signed_request(
            "DELETE",
            "/backend/v3/api/recharges/packages/recharge-package-10-20-901",
            "",
        ),
    )
    .await;
    assert_eq!(true, delete_package["data"]["deleted"]);

    let delete_promotion_offer = request_json(
        router,
        signed_request("DELETE", "/backend/v3/api/promotions/offers/99", ""),
    )
    .await;
    assert_eq!(true, delete_promotion_offer["data"]["deleted"]);

    assert_eq!(
        vec![
            "create_promotion_offer",
            "update_promotion_offer",
            "generate_promotion_coupon_stock",
            "update_promotion_code_status",
            "create_recharge_package",
            "update_recharge_settings",
            "update_recharge_package",
            "update_exchange_rule",
            "delete_recharge_package",
            "delete_promotion_offer"
        ],
        *store.commands.lock().unwrap()
    );
}

#[tokio::test]
async fn admin_marketing_legacy_billing_coupon_routes_are_retired() {
    let router = sdkwork_clawrouter_router_service::api::admin_marketing_router_with_store(
        Arc::new(TestAdminMarketingStore::default()),
        Arc::new(TestUuidGenerator),
    );

    for (method, path) in [
        ("GET", "/backend/v3/api/billing/coupons"),
        ("POST", "/backend/v3/api/billing/coupons"),
        ("PUT", "/backend/v3/api/billing/coupons/99"),
        ("DELETE", "/backend/v3/api/billing/coupons/99"),
        ("GET", "/backend/v3/api/billing/coupon_batches"),
        ("POST", "/backend/v3/api/billing/coupon_batches"),
        ("GET", "/backend/v3/api/billing/coupon_codes"),
        ("PATCH", "/backend/v3/api/billing/coupon_codes/501/status"),
        ("GET", "/backend/v3/api/billing/users/coupons"),
    ] {
        let response = router
            .clone()
            .oneshot(signed_request(method, path, "{}"))
            .await
            .unwrap();
        assert_eq!(StatusCode::NOT_FOUND, response.status(), "{method} {path}");
    }
}

#[tokio::test]
async fn admin_marketing_route_rejects_missing_trusted_subject() {
    let router = sdkwork_clawrouter_router_service::api::admin_marketing_router_with_store(
        Arc::new(TestAdminMarketingStore::default()),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/router/referrals/stats")
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
async fn admin_marketing_route_rejects_invalid_stock_quantity_without_calling_store() {
    let store = Arc::new(TestAdminMarketingStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_marketing_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/promotions/coupon_stocks",
            r#"{"offer_id":"1","name":"Invalid","total_quantity":0,"code_prefix":"BAD"}"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"]
        .as_str()
        .unwrap()
        .contains("total_quantity must be between"));
    assert!(store.commands.lock().unwrap().is_empty());
}

#[tokio::test]
async fn admin_marketing_route_rejects_inactive_exchange_rules_without_calling_store() {
    let store = Arc::new(TestAdminMarketingStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_marketing_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(signed_request(
            "PUT",
            "/backend/v3/api/billing/exchange_rules",
            r#"{"sourceAssetType":"POINTS","targetAssetType":"CASH","rate":"250","status":"inactive"}"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"]
        .as_str()
        .unwrap()
        .contains("exchange rule status only supports active"));
    assert!(store.commands.lock().unwrap().is_empty());
}

fn signed_request(method: &str, path: &str, body: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
        .internal_trusted_subject(10, 20, 30)
        .header("X-Request-Id", "request-admin-marketing-test")
        .body(Body::from(body.to_owned()))
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
struct TestAdminMarketingStore {
    commands: Mutex<Vec<&'static str>>,
}

impl AdminMarketingStore for TestAdminMarketingStore {
    fn list_promotion_offers<'a>(
        &'a self,
        query: ListPromotionOffersQuery,
    ) -> AdminMarketingCommandFuture<'a, Vec<PromotionOfferItem>> {
        Box::pin(async move {
            assert_eq!(10, query.subject.tenant_id);
            Ok(vec![PromotionOfferItem {
                id: "1".to_owned(),
                name: "Welcome credit".to_owned(),
                discount_type: "amount".to_owned(),
                value: "$5.00".to_owned(),
                status: "active".to_owned(),
            }])
        })
    }

    fn create_promotion_offer<'a>(
        &'a self,
        command: CreatePromotionOfferCommand,
    ) -> AdminMarketingCommandFuture<'a, PromotionOfferItem> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("create_promotion_offer");
            assert_eq!(20, command.subject.organization_id);
            assert_eq!(850, command.amount_cents);
            Ok(PromotionOfferItem {
                id: "99".to_owned(),
                name: command.name,
                discount_type: command.discount_type,
                value: command.value,
                status: "active".to_owned(),
            })
        })
    }

    fn delete_promotion_offer<'a>(
        &'a self,
        command: DeletePromotionOfferCommand,
    ) -> AdminMarketingCommandFuture<'a, bool> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("delete_promotion_offer");
            assert_eq!("99", command.offer_id);
            Ok(true)
        })
    }

    fn update_promotion_offer<'a>(
        &'a self,
        command: UpdatePromotionOfferCommand,
    ) -> AdminMarketingCommandFuture<'a, PromotionOfferItem> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("update_promotion_offer");
            assert_eq!("99", command.offer_id);
            assert_eq!("Launch credit updated", command.name);
            assert_eq!("discount", command.discount_type);
            assert_eq!("15.00%", command.value);
            assert_eq!(0, command.amount_cents);
            assert_eq!(Some("15.0000".to_owned()), command.discount_value);
            assert_eq!("inactive", command.status);
            Ok(PromotionOfferItem {
                id: command.offer_id.to_string(),
                name: command.name,
                discount_type: command.discount_type,
                value: command.value,
                status: command.status,
            })
        })
    }

    fn list_promotion_coupon_stocks<'a>(
        &'a self,
        query: ListPromotionCouponStocksQuery,
    ) -> AdminMarketingCommandFuture<'a, Vec<PromotionCouponStockItem>> {
        Box::pin(async move {
            assert_eq!(30, query.subject.operator_id);
            Ok(vec![PromotionCouponStockItem {
                id: "11".to_owned(),
                offer_id: "1".to_owned(),
                name: "Welcome stock".to_owned(),
                total_quantity: 2,
                code_prefix: "WELCOME".to_owned(),
                created_at: "2026-04-29 09:00:00".to_owned(),
            }])
        })
    }

    fn generate_promotion_coupon_stock<'a>(
        &'a self,
        command: GeneratePromotionCouponStockCommand,
    ) -> AdminMarketingCommandFuture<'a, (PromotionCouponStockItem, Vec<PromotionCodeItem>)> {
        Box::pin(async move {
            self.commands
                .lock()
                .unwrap()
                .push("generate_promotion_coupon_stock");
            assert_eq!("99", command.offer_id);
            assert_eq!(3, command.total_quantity);
            let stock = PromotionCouponStockItem {
                id: "12".to_owned(),
                offer_id: command.offer_id.to_string(),
                name: command.name,
                total_quantity: command.total_quantity,
                code_prefix: command.code_prefix.clone(),
                created_at: command.requested_at,
            };
            let codes = (1..=command.total_quantity)
                .map(|sequence| PromotionCodeItem {
                    id: format!("{}", 500 + sequence),
                    stock_id: "12".to_owned(),
                    promotion_code: format!("{}-{sequence:04}", command.code_prefix),
                    status: "available".to_owned(),
                    used_by: None,
                    used_at: None,
                })
                .collect();
            Ok((stock, codes))
        })
    }

    fn list_promotion_codes<'a>(
        &'a self,
        _query: ListPromotionCodesQuery,
    ) -> AdminMarketingCommandFuture<'a, Vec<PromotionCodeItem>> {
        Box::pin(async move {
            Ok(vec![
                PromotionCodeItem {
                    id: "501".to_owned(),
                    stock_id: "11".to_owned(),
                    promotion_code: "WELCOME-0001".to_owned(),
                    status: "available".to_owned(),
                    used_by: None,
                    used_at: None,
                },
                PromotionCodeItem {
                    id: "502".to_owned(),
                    stock_id: "11".to_owned(),
                    promotion_code: "WELCOME-0002".to_owned(),
                    status: "used".to_owned(),
                    used_by: Some("owner@example.com".to_owned()),
                    used_at: Some("2026-04-29 09:30:00".to_owned()),
                },
            ])
        })
    }

    fn update_promotion_code_status<'a>(
        &'a self,
        command: UpdatePromotionCodeStatusCommand,
    ) -> AdminMarketingCommandFuture<'a, bool> {
        Box::pin(async move {
            self.commands
                .lock()
                .unwrap()
                .push("update_promotion_code_status");
            assert_eq!("501", command.code_id);
            assert_eq!("voided", command.status);
            Ok(true)
        })
    }

    fn list_promotion_code_redemptions<'a>(
        &'a self,
        _query: ListPromotionCodeRedemptionsQuery,
    ) -> AdminMarketingCommandFuture<'a, Vec<PromotionCodeRedemptionItem>> {
        Box::pin(async move {
            Ok(vec![PromotionCodeRedemptionItem {
                id: "502".to_owned(),
                owner_user_id: "30".to_owned(),
                user: "owner@example.com".to_owned(),
                submitted_code: "WELCOME-0002".to_owned(),
                amount: "$5.00".to_owned(),
                occurred_at: "2026-04-29 09:30:00".to_owned(),
            }])
        })
    }

    fn list_recharge_records<'a>(
        &'a self,
        _query: ListAdminRechargeRecordsQuery,
    ) -> AdminMarketingCommandFuture<'a, Vec<AdminRechargeRecordItem>> {
        Box::pin(async move {
            Ok(vec![AdminRechargeRecordItem {
                id: "701".to_owned(),
                trade_no: "recharge-100".to_owned(),
                user_id: "30".to_owned(),
                user: "owner@example.com".to_owned(),
                amount: "$10.00".to_owned(),
                usd_credited: "1000".to_owned(),
                method: "stripe".to_owned(),
                status: "success".to_owned(),
                time: "2026-04-29 10:00:00".to_owned(),
            }])
        })
    }

    fn load_recharge_record<'a>(
        &'a self,
        query: LoadAdminRechargeRecordQuery,
    ) -> AdminMarketingCommandFuture<'a, Option<AdminRechargeRecordItem>> {
        Box::pin(async move {
            assert_eq!("recharge-100", query.order_no);
            Ok(Some(AdminRechargeRecordItem {
                id: "100".to_owned(),
                trade_no: "recharge-100".to_owned(),
                user_id: "30".to_owned(),
                user: "owner@example.com".to_owned(),
                amount: "10.00".to_owned(),
                usd_credited: "1000".to_owned(),
                method: "stripe".to_owned(),
                status: "completed".to_owned(),
                time: "2026-04-29 10:00:00".to_owned(),
            }))
        })
    }

    fn list_recharge_packages<'a>(
        &'a self,
        query: ListAdminRechargePackagesQuery,
    ) -> AdminMarketingCommandFuture<'a, Vec<AdminRechargePackageItem>> {
        Box::pin(async move {
            assert_eq!(10, query.subject.tenant_id);
            Ok(vec![AdminRechargePackageItem {
                id: "100".to_owned(),
                package_no: "RECHARGE-PACKAGE-100".to_owned(),
                name: "Starter Recharge Pack".to_owned(),
                sku_id: "recharge-sku-100".to_owned(),
                price_amount: "10.00".to_owned(),
                currency_code: "CNY".to_owned(),
                bonus_points: 25,
                grant_amount: 125,
                points: 125,
                status: "active".to_owned(),
                updated_at: "2026-04-29 10:00:00".to_owned(),
            }])
        })
    }

    fn list_exchange_rules<'a>(
        &'a self,
        query: ListAdminExchangeRulesQuery,
    ) -> AdminMarketingCommandFuture<'a, Vec<AdminExchangeRuleItem>> {
        Box::pin(async move {
            assert_eq!(10, query.subject.tenant_id);
            if let Some(source_asset_type) = query.source_asset_type.as_deref() {
                assert_eq!("POINTS", source_asset_type);
            }
            if let Some(target_asset_type) = query.target_asset_type.as_deref() {
                assert_eq!("CASH", target_asset_type);
            }
            if let Some(status) = query.status.as_deref() {
                assert_eq!("active", status);
            }
            Ok(vec![AdminExchangeRuleItem {
                id: "exchange-1".to_owned(),
                source_asset_type: "POINTS".to_owned(),
                target_asset_type: "CASH".to_owned(),
                rate: "120".to_owned(),
                status: "active".to_owned(),
            }])
        })
    }

    fn create_recharge_package<'a>(
        &'a self,
        command: CreateAdminRechargePackageCommand,
    ) -> AdminMarketingCommandFuture<'a, AdminRechargePackageItem> {
        Box::pin(async move {
            self.commands
                .lock()
                .unwrap()
                .push("create_recharge_package");
            assert_eq!("12.00", command.price_amount);
            assert_eq!("CNY", command.currency_code);
            assert_eq!(30, command.bonus_points);
            Ok(AdminRechargePackageItem {
                id: "recharge-package-10-20-901".to_owned(),
                package_no: "RECHARGE-PACKAGE-901".to_owned(),
                name: "Points recharge 12.00 CNY".to_owned(),
                sku_id: "recharge-sku-10-20-901".to_owned(),
                price_amount: command.price_amount,
                currency_code: command.currency_code,
                bonus_points: command.bonus_points,
                grant_amount: 150,
                points: 150,
                status: "active".to_owned(),
                updated_at: "2026-04-29 10:05:00".to_owned(),
            })
        })
    }

    fn update_recharge_package<'a>(
        &'a self,
        command: UpdateAdminRechargePackageCommand,
    ) -> AdminMarketingCommandFuture<'a, AdminRechargePackageItem> {
        Box::pin(async move {
            self.commands
                .lock()
                .unwrap()
                .push("update_recharge_package");
            assert_eq!("recharge-package-10-20-901", command.package_id);
            assert_eq!("20.00", command.price_amount);
            assert_eq!("USD", command.currency_code);
            assert_eq!(50, command.bonus_points);
            Ok(AdminRechargePackageItem {
                id: command.package_id,
                package_no: "RECHARGE-PACKAGE-901".to_owned(),
                name: "Points recharge 20.00 USD".to_owned(),
                sku_id: "recharge-sku-10-20-901".to_owned(),
                price_amount: command.price_amount,
                currency_code: command.currency_code,
                bonus_points: command.bonus_points,
                grant_amount: 1550,
                points: 1550,
                status: "inactive".to_owned(),
                updated_at: "2026-04-29 10:06:00".to_owned(),
            })
        })
    }

    fn load_recharge_settings<'a>(
        &'a self,
        subject: AdminMarketingSubject,
    ) -> AdminMarketingCommandFuture<'a, AdminRechargeSettingsItem> {
        Box::pin(async move {
            assert_eq!(10, subject.tenant_id);
            Ok(AdminRechargeSettingsItem {
                base_currency_code: "CNY".to_owned(),
                base_points_per_cny: "10".to_owned(),
                currency_to_cny_rates: BTreeMap::from([
                    ("CNY".to_owned(), "1".to_owned()),
                    ("USD".to_owned(), "7".to_owned()),
                ]),
            })
        })
    }

    fn update_exchange_rule<'a>(
        &'a self,
        command: UpdateAdminExchangeRuleCommand,
    ) -> AdminMarketingCommandFuture<'a, AdminExchangeRuleItem> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("update_exchange_rule");
            assert_eq!(10, command.subject.tenant_id);
            assert_eq!(20, command.subject.organization_id);
            assert_eq!("POINTS", command.source_asset_type);
            assert_eq!("CASH", command.target_asset_type);
            assert_eq!("250", command.rate);
            Ok(AdminExchangeRuleItem {
                id: "exchange-upserted".to_owned(),
                source_asset_type: command.source_asset_type,
                target_asset_type: command.target_asset_type,
                rate: command.rate,
                status: "active".to_owned(),
            })
        })
    }

    fn update_recharge_settings<'a>(
        &'a self,
        command: RechargeSettingsUpdateCommand,
    ) -> AdminMarketingCommandFuture<'a, AdminRechargeSettingsItem> {
        Box::pin(async move {
            self.commands
                .lock()
                .unwrap()
                .push("update_recharge_settings");
            assert_eq!("CNY", command.base_currency_code);
            assert_eq!("10", command.base_points_per_cny);
            assert_eq!(
                Some(&"7.5".to_owned()),
                command.currency_to_cny_rates.get("USD")
            );
            Ok(AdminRechargeSettingsItem {
                base_currency_code: command.base_currency_code,
                base_points_per_cny: command.base_points_per_cny,
                currency_to_cny_rates: command.currency_to_cny_rates,
            })
        })
    }

    fn delete_recharge_package<'a>(
        &'a self,
        command: DeleteAdminRechargePackageCommand,
    ) -> AdminMarketingCommandFuture<'a, bool> {
        Box::pin(async move {
            self.commands
                .lock()
                .unwrap()
                .push("delete_recharge_package");
            assert_eq!("recharge-package-10-20-901", command.package_id);
            Ok(true)
        })
    }

    fn list_payment_attempts<'a>(
        &'a self,
        query: ListAdminPaymentAttemptsQuery,
    ) -> AdminMarketingCommandFuture<'a, Vec<AdminPaymentAttemptItem>> {
        Box::pin(async move {
            assert_eq!(10, query.subject.tenant_id);
            Ok(vec![AdminPaymentAttemptItem {
                id: "payment-1".to_owned(),
                order_no: "order-100".to_owned(),
                provider: "wechat".to_owned(),
                amount: "25.50".to_owned(),
                status: "success".to_owned(),
                created_at: "2026-04-29 09:10:00".to_owned(),
            }])
        })
    }

    fn list_referral_stats<'a>(
        &'a self,
        _query: ListAdminReferralStatsQuery,
    ) -> AdminMarketingCommandFuture<'a, Vec<AdminReferralStatItem>> {
        Box::pin(async move {
            Ok(vec![AdminReferralStatItem {
                id: "801".to_owned(),
                inviter: "Owner".to_owned(),
                total_invited: 3,
                total_revenue: "$120.00".to_owned(),
                bonus_awarded: "$12.00".to_owned(),
                link: "https://claw.local/invite/OWNER".to_owned(),
            }])
        })
    }
}

struct TestUuidGenerator;

impl EntityUuidGenerator for TestUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        Ok("entity-uuid-test".to_owned())
    }
}
