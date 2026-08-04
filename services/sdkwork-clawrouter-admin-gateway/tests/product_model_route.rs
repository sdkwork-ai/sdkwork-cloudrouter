use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_web_core::{
    ServerRequestId, WebApiSurface, WebAuthMode, WebDeploymentMode, WebEnvironment,
    WebLoginScope, WebRequestContext, WebRequestPrincipal, WebTransportFacts,
};
use sdkwork_clawrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, GatewayApiKey, ModelPrice, ModelUpstreamRoute,
    ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan, RouteCandidate,
    RoutingPolicy, RoutingPolicyScope, RoutingRule, UpstreamAccountGroup, UpstreamAccountRoute,
};
use sdkwork_clawrouter_router_service::infrastructure::InMemoryPricingCatalog;
use tower::ServiceExt;

fn catalog() -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "OpenAI",
    ));
    catalog.add_model(AiModel::new(
        "gpt-4o-mini",
        "GPT-4o mini",
        "openai",
        vec!["chat"],
    ));
    catalog.add_model_upstream_route(
        ModelUpstreamRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "openrouter",
            3001,
            "gpt-4o-mini",
        )
        .with_api_code("openai.chat_completions")
        .with_upstream_endpoint(
            Some("https://openrouter.example.test/v1"),
            Some("vault://providers/openrouter/account/main"),
        ),
    );
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openrouter", 3001)
            .with_account_code("openrouter-main")
            .with_upstream_endpoint(
                Some("https://openrouter.example.test/v1"),
                Some("vault://providers/openrouter/account/main"),
            )
            .with_resource_scoped_account_group_binding(
                10,
                1,
                100,
                ["openai.chat_completions"],
                ["llm"],
            ),
    );
    catalog.add_plan(PricingPlan::new(
        "standard",
        PriceSide::OfficialReference,
        DecimalValue::parse("1.200000").unwrap(),
        Money::usd("0.000000").unwrap(),
    ));
    catalog.add_upstream_account_group(UpstreamAccountGroup::new_scoped(
        10,
        10,
        20,
        "standard-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.100000").unwrap(),
    ));
    catalog
        .add_api_key(GatewayApiKey::new(100, 10, "sk-test", "hash:sk-test").with_owner(10, 20, 30));
    catalog.add_routing_policy(RoutingPolicy::new(
        200,
        10,
        20,
        "standard-chat-policy",
        RoutingPolicyScope::UpstreamAccountGroup,
        Some(10),
        Some(201),
    ));
    catalog.add_routing_rule(
        RoutingRule::new(
            202,
            10,
            20,
            201,
            "standard-chat-rule",
            1,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_account_groups(vec![RouteCandidate::new(3001, 100)]),
    );
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "openai/gpt-4o-mini",
        "gpt-4o-mini",
        PriceSide::OfficialReference,
        BillingMeter::LlmInputToken,
        Money::usd("0.150000").unwrap(),
    ));
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.110000").unwrap(),
        )
        .for_upstream_account("openrouter", 3001),
    );
    catalog
}


fn admin_web_context(path: &str, method: &str) -> WebRequestContext {
    let principal = WebRequestPrincipal::builder()
        .tenant_id("100001")
        .organization_id(Some("100001".to_owned()))
        .login_scope(WebLoginScope::Organization)
        .user_id("2")
        .session_id(Some("session-test".to_owned()))
        .app_id("sdkwork-clawrouter")
        .environment(WebEnvironment::Test)
        .deployment_mode(WebDeploymentMode::Local)
        .auth_level(sdkwork_web_core::WebAuthLevel::Password)
        .permission_scope(vec!["clawrouter.admin.access".to_owned()])
        .build();
    WebRequestContext {
        request_id: ServerRequestId("request-test".to_owned()),
        api_surface: WebApiSurface::BackendApi,
        auth_mode: WebAuthMode::DualToken,
        transport: WebTransportFacts {
            path: path.to_owned(),
            method: method.to_owned(),
            auth_token_present: true,
            access_token_present: true,
            api_key_present: false,
            ingress_token_present: false,
            oauth_bearer_present: false,
            agent_token_present: false,
        },
        principal: Some(principal),
        locale: None,
        client_kind: None,
        operation: None,
        trace_id: None,
        idempotency_key: None,
    }
}

#[tokio::test]
async fn injected_product_catalog_route_overrides_manifest_fallback() {
    let router = sdkwork_clawrouter_admin_gateway::router_with_product_catalog(Arc::new(catalog()));
    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/models?api_key_id=100&billing_meter=llm_input_token&vendor_code=openai")
                .extension(admin_web_context(
                    "/backend/v3/api/ai/models",
                    "GET",
                ))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("2000", payload["code"]);
    assert_eq!("gpt-4o-mini", payload["data"]["items"][0]["model"]);
    assert_eq!(
        "available",
        payload["data"]["items"][0]["priceAvailability"]["status"]
    );
}

#[tokio::test]
async fn runtime_route_explain_uses_selector_and_masks_provider_secrets() {
    let router = sdkwork_clawrouter_admin_gateway::router_with_product_catalog(Arc::new(catalog()));
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/ai/upstream_account_groups/10/route_explain")
                .extension(admin_web_context(
                    "/backend/v3/api/ai/upstream_account_groups/10/route_explain",
                    "POST",
                ))
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"apiKeyId":"100","accountGroupId":"10","resourceCode":"api.openai.chat_completions","catalogKey":"openai/gpt-4o-mini","model":"gpt-4o-mini","apiCode":"openai.chat_completions","capability":"chat","billingMeter":"llm_input_token"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("2000", payload["code"]);
    assert_eq!("runtime_selector", payload["data"]["source"]);
    assert_eq!(true, payload["data"]["ready"]);
    assert_eq!(1, payload["data"]["candidateCount"]);
    assert_eq!("200", payload["data"]["policyId"]);
    assert_eq!("202", payload["data"]["ruleId"]);
    assert_eq!(
        "api.openai.chat_completions",
        payload["data"]["resourceCode"]
    );
    assert_eq!("openai/gpt-4o-mini", payload["data"]["catalogKey"]);
    assert_eq!(serde_json::json!([]), payload["data"]["blockedReasons"]);
    assert_eq!(serde_json::json!([]), payload["data"]["warnings"]);
    assert_eq!(
        1,
        payload["data"]["selectedCandidates"]
            .as_array()
            .unwrap()
            .len()
    );
    assert_eq!("model", payload["data"]["selectedCandidates"][0]["kind"]);
    assert_eq!(
        "openrouter",
        payload["data"]["selectedCandidates"][0]["providerCode"]
    );
    assert_eq!(
        "3001",
        payload["data"]["selectedCandidates"][0]["channelId"]
    );
    assert_eq!(
        "gpt-4o-mini",
        payload["data"]["selectedCandidates"][0]["providerModel"]
    );
    assert!(payload["data"]["selectedCandidates"][0]
        .get("secretRef")
        .is_none());
    assert!(payload["data"]["selectedCandidates"][0]
        .get("baseUrl")
        .is_none());
}

#[tokio::test]
async fn runtime_route_explain_reports_selector_pricing_blocking_reason() {
    let router = sdkwork_clawrouter_admin_gateway::router_with_product_catalog(Arc::new(catalog()));
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/ai/upstream_account_groups/10/route_explain")
                .extension(admin_web_context(
                    "/backend/v3/api/ai/upstream_account_groups/10/route_explain",
                    "POST",
                ))
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"apiKeyId":"100","accountGroupId":"10","resourceCode":"api.openai.chat_completions","catalogKey":"openai/gpt-not-configured","model":"gpt-not-configured","apiCode":"openai.chat_completions","capability":"chat","billingMeter":"llm_input_token"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("2000", payload["code"]);
    assert_eq!("runtime_selector", payload["data"]["source"]);
    assert_eq!(false, payload["data"]["ready"]);
    assert_eq!(0, payload["data"]["candidateCount"]);
    assert_eq!(serde_json::json!([]), payload["data"]["selectedCandidates"]);
    assert_eq!(
        "pricing.unavailable",
        payload["data"]["blockedReasons"][0]["code"]
    );
    assert_eq!("blocking", payload["data"]["blockedReasons"][0]["severity"]);
    assert!(payload["data"]["blockedReasons"][0]["message"]
        .as_str()
        .unwrap()
        .contains("pricing is not available"));
}

#[tokio::test]
async fn runtime_route_explain_reports_selector_route_blocking_reason() {
    let router = sdkwork_clawrouter_admin_gateway::router_with_product_catalog(Arc::new(catalog()));
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/ai/upstream_account_groups/10/route_explain")
                .extension(admin_web_context(
                    "/backend/v3/api/ai/upstream_account_groups/10/route_explain",
                    "POST",
                ))
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"apiKeyId":"100","accountGroupId":"10","resourceCode":"api.openai.embeddings","routeKey":"openai.embeddings","apiCode":"openai.embeddings","capability":"embedding","billingMeter":"llm_input_token"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("2000", payload["code"]);
    assert_eq!("runtime_selector", payload["data"]["source"]);
    assert_eq!(false, payload["data"]["ready"]);
    assert_eq!(0, payload["data"]["candidateCount"]);
    assert_eq!(serde_json::json!([]), payload["data"]["selectedCandidates"]);
    assert_eq!(
        "route.unavailable",
        payload["data"]["blockedReasons"][0]["code"]
    );
    assert_eq!("blocking", payload["data"]["blockedReasons"][0]["severity"]);
    assert!(payload["data"]["blockedReasons"][0]["message"]
        .as_str()
        .unwrap()
        .contains("provider route is not available"));
}
