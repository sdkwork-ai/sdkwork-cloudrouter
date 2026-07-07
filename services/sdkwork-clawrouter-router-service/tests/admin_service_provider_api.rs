mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::ports::{
    AdminServiceProviderCollection, AdminServiceProviderCommandFuture,
    AdminServiceProviderDashboardItem, AdminServiceProviderDownstreamMutationItem,
    AdminServiceProviderJsonRecord, AdminServiceProviderPriceSimulationCommand,
    AdminServiceProviderPriceSimulationItem, AdminServiceProviderPricingRuleMutationItem,
    AdminServiceProviderStore, CreateAdminServiceProviderDownstreamCommand,
    CreateAdminServiceProviderPricingRuleCommand, ListAdminServiceProviderRecordsQuery,
    UpdateAdminServiceProviderPricingRuleCommand,
};
use serde_json::{json, Map, Value};
use tower::ServiceExt;

#[tokio::test]
async fn admin_service_provider_route_exposes_commercial_provider_center() {
    let router = sdkwork_clawrouter_router_service::api::admin_service_provider_router_with_store(
        Arc::new(TestAdminServiceProviderStore),
    );

    let dashboard = request_json(
        router.clone(),
        trusted_request("GET", "/backend/v3/api/service_providers/dashboard"),
    )
    .await;
    assert_eq!(0, dashboard["code"].as_i64().unwrap());
    assert_eq!("sp-dashboard", dashboard["data"]["item"]["id"]);
    assert_eq!("118.75", dashboard["data"]["item"]["incomeAmount"]);
    assert_eq!("42.10", dashboard["data"]["item"]["expenseAmount"]);
    assert_eq!("76.65", dashboard["data"]["item"]["marginAmount"]);

    for (path, expected_id) in [
        (
            "/backend/v3/api/service_providers/providers?page=2&page_size=25&status=active",
            "provider-1",
        ),
        ("/backend/v3/api/service_providers/relations", "relation-1"),
        (
            "/backend/v3/api/service_providers/downstreams",
            "downstream-1",
        ),
        ("/backend/v3/api/service_providers/members", "member-1"),
        ("/backend/v3/api/service_providers/bindings", "binding-1"),
        ("/backend/v3/api/service_providers/contracts", "contract-1"),
        (
            "/backend/v3/api/service_providers/pricing/rules",
            "pricing-1",
        ),
        ("/backend/v3/api/service_providers/usage", "usage-1"),
        (
            "/backend/v3/api/service_providers/wallet/accounts",
            "wallet-1",
        ),
        (
            "/backend/v3/api/service_providers/statements",
            "statement-1",
        ),
        (
            "/backend/v3/api/service_providers/reconciliation_runs",
            "reconciliation-1",
        ),
        (
            "/backend/v3/api/service_providers/adjustments",
            "adjustment-1",
        ),
        ("/backend/v3/api/service_providers/risk/events", "risk-1"),
        ("/backend/v3/api/service_providers/audit/events", "audit-1"),
    ] {
        let payload = request_json(router.clone(), trusted_request("GET", path)).await;
        assert_eq!(0, payload["code"], "{path}");
        assert_eq!(expected_id, payload["data"]["items"][0]["id"], "{path}");
        assert_eq!(1, payload["data"]["total"], "{path}");
        assert!(payload["data"]["pageSize"].as_i64().unwrap() >= 1, "{path}");
    }

    let simulation = request_json(
        router,
        trusted_json_request(
            "POST",
            "/backend/v3/api/service_providers/pricing/simulations",
            r#"{"buyerProviderId":"101","catalogKey":"openai:gpt-4.1","model":"gpt-4.1","billingMeterCode":"llm_input_token","tokenKind":"input","quantity":"1000"}"#,
        ),
    )
    .await;
    assert_eq!(0, simulation["code"].as_i64().unwrap());
    assert_eq!("simulation-1", simulation["data"]["item"]["id"]);
    assert_eq!("12.340000", simulation["data"]["item"]["chargeAmount"]);
    assert_eq!("901", simulation["data"]["item"]["matchedRuleId"]);
}

#[tokio::test]
async fn admin_service_provider_route_rejects_missing_trusted_subject() {
    let router = sdkwork_clawrouter_router_service::api::admin_service_provider_router_with_store(
        Arc::new(TestAdminServiceProviderStore),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/service_providers/providers")
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
async fn admin_service_provider_price_simulation_rejects_invalid_quantity_before_store_call() {
    let router = sdkwork_clawrouter_router_service::api::admin_service_provider_router_with_store(
        Arc::new(TestAdminServiceProviderStore),
    );

    let response = router
        .oneshot(trusted_json_request(
            "POST",
            "/backend/v3/api/service_providers/pricing/simulations",
            r#"{"buyerProviderId":"101","billingMeterCode":"llm_input_token","quantity":"not-a-number"}"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"]
        .as_str()
        .expect("error message should be text")
        .contains("quantity"),);
}

#[tokio::test]
async fn admin_service_provider_list_routes_accept_chain_filters() {
    let router = sdkwork_clawrouter_router_service::api::admin_service_provider_router_with_store(
        Arc::new(TestAdminServiceProviderStore),
    );

    let payload = request_json(
        router,
        trusted_request(
            "GET",
            "/backend/v3/api/service_providers/usage?provider_id=2&seller_provider_id=1&buyer_provider_id=2&edge_id=500",
        ),
    )
    .await;

    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("usage-1", payload["data"]["items"][0]["id"]);
}

#[tokio::test]
async fn admin_service_provider_write_routes_expose_downstream_and_pricing_maintenance() {
    let router = sdkwork_clawrouter_router_service::api::admin_service_provider_router_with_store(
        Arc::new(TestAdminServiceProviderStore),
    );

    let downstream = request_json(
        router.clone(),
        trusted_json_request(
            "POST",
            "/backend/v3/api/service_providers/downstreams",
            r#"{"sellerProviderId":"1","providerNo":"sp-new-child","displayName":"New Child Provider","providerType":"reseller","defaultCurrency":"USD","settlementMode":"prepaid","pricePlanCode":"plan-new-child","defaultMultiplier":"1.1500"}"#,
        ),
    )
    .await;
    assert_eq!(0, downstream["code"].as_i64().unwrap());
    assert_eq!("downstream-created", downstream["data"]["item"]["id"]);
    assert_eq!("sp-new-child", downstream["data"]["item"]["providerNo"]);
    assert_eq!("edge-created", downstream["data"]["item"]["edgeId"]);
    assert_eq!("plan-created", downstream["data"]["item"]["pricePlanId"]);

    let pricing_rule = request_json(
        router.clone(),
        trusted_json_request(
            "POST",
            "/backend/v3/api/service_providers/pricing/rules",
            r#"{"sellerProviderId":"1","buyerProviderId":"2","edgeId":"500","pricePlanId":"8001","catalogKey":"openai:gpt-4.1","model":"gpt-4.1","billingMeterCode":"llm_output_token","tokenKind":"output","unitPrice":"0.0300","unitSize":"1000","minimumCharge":"0","currency":"USD","priority":20}"#,
        ),
    )
    .await;
    assert_eq!(0, pricing_rule["code"].as_i64().unwrap());
    assert_eq!("price-rule-created", pricing_rule["data"]["item"]["id"]);
    assert_eq!(
        "llm_output_token",
        pricing_rule["data"]["item"]["billingMeterCode"]
    );
    assert_eq!("0.0300", pricing_rule["data"]["item"]["unitPrice"]);

    let updated_rule = request_json(
        router,
        trusted_json_request(
            "PATCH",
            "/backend/v3/api/service_providers/pricing/rules/9001",
            r#"{"unitPrice":"0.0200","unitSize":"1000","minimumCharge":"0.1000","priority":30,"status":"active"}"#,
        ),
    )
    .await;
    assert_eq!(0, updated_rule["code"].as_i64().unwrap());
    assert_eq!("9001", updated_rule["data"]["item"]["id"]);
    assert_eq!("0.0200", updated_rule["data"]["item"]["unitPrice"]);
    assert_eq!(30, updated_rule["data"]["item"]["priority"]);
}

#[tokio::test]
async fn admin_service_provider_write_routes_require_idempotency_key() {
    let router = sdkwork_clawrouter_router_service::api::admin_service_provider_router_with_store(
        Arc::new(TestAdminServiceProviderStore),
    );

    let response = router
        .oneshot(trusted_json_request_without_idempotency(
            "POST",
            "/backend/v3/api/service_providers/downstreams",
            r#"{"sellerProviderId":"1","providerNo":"sp-new-child","displayName":"New Child Provider"}"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"]
        .as_str()
        .expect("error message should be text")
        .contains("Idempotency-Key"));
}

fn trusted_request(method: &str, path: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
        .internal_trusted_subject(100001, 0, 30)
        .body(Body::empty())
        .unwrap()
}

fn trusted_json_request(method: &str, path: &str, body: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
        .internal_trusted_subject(100001, 0, 30)
        .header("idempotency-key", "service-provider-sim-test")
        .header("x-request-id", "service-provider-sim-test")
        .body(Body::from(body.to_owned()))
        .unwrap()
}

fn trusted_json_request_without_idempotency(method: &str, path: &str, body: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
        .internal_trusted_subject(100001, 0, 30)
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

struct TestAdminServiceProviderStore;

impl AdminServiceProviderStore for TestAdminServiceProviderStore {
    fn retrieve_dashboard<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderDashboardItem> {
        Box::pin(async move {
            assert_eq!(10, query.subject.tenant_id);
            assert_eq!(20, query.subject.organization_id);
            assert_eq!(30, query.subject.operator_id);
            Ok(AdminServiceProviderDashboardItem {
                id: "sp-dashboard".to_owned(),
                status: "active".to_owned(),
                income_amount: "118.75".to_owned(),
                expense_amount: "42.10".to_owned(),
                margin_amount: "76.65".to_owned(),
                request_count: 880,
                active_downstream_count: 4,
                risk_provider_count: 1,
            })
        })
    }

    fn list_providers<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move {
            assert_eq!(2, query.page_no);
            assert_eq!(25, query.page_size);
            assert_eq!(Some("active"), query.status.as_deref());
            Ok(collection("provider-1", query))
        })
    }

    fn list_relations<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { Ok(collection("relation-1", query)) })
    }

    fn list_downstreams<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { Ok(collection("downstream-1", query)) })
    }

    fn create_downstream<'a>(
        &'a self,
        command: CreateAdminServiceProviderDownstreamCommand,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderDownstreamMutationItem> {
        Box::pin(async move {
            assert_eq!(10, command.subject.tenant_id);
            assert_eq!("1", command.seller_provider_id);
            assert_eq!("sp-new-child", command.provider_no);
            assert_eq!("New Child Provider", command.display_name);
            assert_eq!(Some("reseller"), command.provider_type.as_deref());
            assert_eq!(Some("USD"), command.default_currency.as_deref());
            assert_eq!(Some("prepaid"), command.settlement_mode.as_deref());
            assert_eq!(Some("plan-new-child"), command.price_plan_code.as_deref());
            assert_eq!(Some("1.1500"), command.default_multiplier.as_deref());
            Ok(AdminServiceProviderDownstreamMutationItem {
                id: "downstream-created".to_owned(),
                provider_no: command.provider_no,
                display_name: command.display_name,
                provider_type: command.provider_type,
                status: "active".to_owned(),
                seller_provider_id: command.seller_provider_id,
                edge_id: "edge-created".to_owned(),
                price_plan_id: Some("plan-created".to_owned()),
                default_currency: command.default_currency,
                settlement_mode: command.settlement_mode,
            })
        })
    }

    fn list_members<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { Ok(collection("member-1", query)) })
    }

    fn list_bindings<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { Ok(collection("binding-1", query)) })
    }

    fn list_contracts<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { Ok(collection("contract-1", query)) })
    }

    fn list_pricing_rules<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { Ok(collection("pricing-1", query)) })
    }

    fn create_pricing_rule<'a>(
        &'a self,
        command: CreateAdminServiceProviderPricingRuleCommand,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderPricingRuleMutationItem> {
        Box::pin(async move {
            assert_eq!(10, command.subject.tenant_id);
            assert_eq!("1", command.seller_provider_id);
            assert_eq!("2", command.buyer_provider_id);
            assert_eq!(Some("500"), command.edge_id.as_deref());
            assert_eq!(Some("8001"), command.price_plan_id.as_deref());
            assert_eq!("llm_output_token", command.billing_meter_code);
            assert_eq!(Some("output"), command.token_kind.as_deref());
            assert_eq!("0.0300", command.unit_price);
            assert_eq!("1000", command.unit_size);
            assert_eq!("0", command.minimum_charge);
            assert_eq!(20, command.priority);
            Ok(AdminServiceProviderPricingRuleMutationItem {
                id: "price-rule-created".to_owned(),
                seller_provider_id: command.seller_provider_id,
                buyer_provider_id: command.buyer_provider_id,
                edge_id: command.edge_id.unwrap_or_else(|| "500".to_owned()),
                price_plan_id: command.price_plan_id.unwrap_or_else(|| "8001".to_owned()),
                catalog_key: command.catalog_key,
                model: command.model,
                billing_meter_code: command.billing_meter_code,
                token_kind: command.token_kind,
                unit_price: command.unit_price,
                unit_size: command.unit_size,
                minimum_charge: command.minimum_charge,
                currency: command.currency,
                priority: command.priority,
                status: "active".to_owned(),
            })
        })
    }

    fn update_pricing_rule<'a>(
        &'a self,
        command: UpdateAdminServiceProviderPricingRuleCommand,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderPricingRuleMutationItem> {
        Box::pin(async move {
            assert_eq!(10, command.subject.tenant_id);
            assert_eq!("9001", command.rule_id);
            assert_eq!(Some("0.0200"), command.unit_price.as_deref());
            assert_eq!(Some("1000"), command.unit_size.as_deref());
            assert_eq!(Some("0.1000"), command.minimum_charge.as_deref());
            assert_eq!(Some(30), command.priority);
            assert_eq!(Some("active"), command.status.as_deref());
            Ok(AdminServiceProviderPricingRuleMutationItem {
                id: command.rule_id,
                seller_provider_id: "1".to_owned(),
                buyer_provider_id: "2".to_owned(),
                edge_id: "500".to_owned(),
                price_plan_id: "8001".to_owned(),
                catalog_key: Some("openai:gpt-4.1".to_owned()),
                model: Some("gpt-4.1".to_owned()),
                billing_meter_code: "llm_input_token".to_owned(),
                token_kind: Some("input".to_owned()),
                unit_price: command.unit_price.unwrap_or_else(|| "0.0125".to_owned()),
                unit_size: command.unit_size.unwrap_or_else(|| "1".to_owned()),
                minimum_charge: command.minimum_charge.unwrap_or_else(|| "0".to_owned()),
                currency: Some("USD".to_owned()),
                priority: command.priority.unwrap_or(10),
                status: command.status.unwrap_or_else(|| "active".to_owned()),
            })
        })
    }

    fn simulate_price<'a>(
        &'a self,
        command: AdminServiceProviderPriceSimulationCommand,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderPriceSimulationItem> {
        Box::pin(async move {
            assert_eq!(10, command.subject.tenant_id);
            assert_eq!("101", command.buyer_provider_id);
            assert_eq!("llm_input_token", command.billing_meter_code);
            assert_eq!("1000", command.quantity);
            assert_eq!(Some("input"), command.token_kind.as_deref());
            Ok(AdminServiceProviderPriceSimulationItem {
                id: "simulation-1".to_owned(),
                buyer_provider_id: command.buyer_provider_id,
                billing_meter_code: command.billing_meter_code,
                token_kind: command.token_kind,
                quantity: command.quantity,
                charge_amount: Some("12.340000".to_owned()),
                matched_rule_id: Some("901".to_owned()),
                currency: Some("USD".to_owned()),
            })
        })
    }

    fn list_usage<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move {
            if query.provider_id.is_some()
                || query.seller_provider_id.is_some()
                || query.buyer_provider_id.is_some()
                || query.edge_id.is_some()
            {
                assert_eq!(Some("2"), query.provider_id.as_deref());
                assert_eq!(Some("1"), query.seller_provider_id.as_deref());
                assert_eq!(Some("2"), query.buyer_provider_id.as_deref());
                assert_eq!(Some("500"), query.edge_id.as_deref());
            }
            Ok(collection("usage-1", query))
        })
    }

    fn list_wallet_accounts<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { Ok(collection("wallet-1", query)) })
    }

    fn list_statements<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { Ok(collection("statement-1", query)) })
    }

    fn list_reconciliation_runs<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { Ok(collection("reconciliation-1", query)) })
    }

    fn list_adjustments<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { Ok(collection("adjustment-1", query)) })
    }

    fn list_risk_events<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { Ok(collection("risk-1", query)) })
    }

    fn list_audit_events<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection> {
        Box::pin(async move { Ok(collection("audit-1", query)) })
    }
}

fn collection(
    id: &str,
    query: ListAdminServiceProviderRecordsQuery,
) -> AdminServiceProviderCollection {
    AdminServiceProviderCollection {
        items: vec![record(id)],
        total: 1,
        page_no: query.page_no,
        page_size: query.page_size,
    }
}

fn record(id: &str) -> AdminServiceProviderJsonRecord {
    let mut record = Map::new();
    record.insert("id".to_owned(), json!(id));
    record.insert("status".to_owned(), json!("active"));
    record
}
