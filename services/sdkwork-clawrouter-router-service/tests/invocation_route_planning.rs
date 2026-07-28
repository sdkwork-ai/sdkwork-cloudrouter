use axum::http::Method;
use sdkwork_clawrouter_router_service::application::{
    AccountResolutionInterceptor, AuthenticatedApiKeyContext, Invocation, InvocationBody,
    InvocationClassificationRequest, InvocationInterceptor, InvocationRequest,
    InvocationResourceClassifier, OpenAiResourceClassifier, ProviderNativeResourceClassifier,
    RoutePlanningInterceptor, StickyRouteConstraint,
};
use sdkwork_clawrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, GatewayApiKey, ModelPrice, ModelUpstreamRoute,
    ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan, RouteCandidate,
    RoutingCapability, RoutingPolicy, RoutingPolicyScope, RoutingRule, UpstreamAccountGroup,
    UpstreamAccountRoute,
};
use sdkwork_clawrouter_router_service::infrastructure::InMemoryPricingCatalog;
use serde_json::json;
use std::sync::Arc;

fn base_catalog() -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "OpenAI",
    ));
    catalog.add_model(
        AiModel::new("gpt-4o-mini", "GPT-4o mini", "openai", vec!["chat"])
            .with_catalog_key("openai/gpt-4o-mini"),
    );
    catalog.add_plan(PricingPlan::new(
        "standard",
        PriceSide::OfficialReference,
        DecimalValue::parse("1.000000").unwrap(),
        Money::usd("0.000000").unwrap(),
    ));
    catalog.add_upstream_account_group(UpstreamAccountGroup::new_scoped(
        10,
        10,
        20,
        "standard-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.000000").unwrap(),
    ));
    catalog
        .add_api_key(GatewayApiKey::new(100, 10, "sk-test", "hash:sk-test").with_owner(10, 20, 30));
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "openai/gpt-4o-mini",
        "gpt-4o-mini",
        PriceSide::OfficialReference,
        BillingMeter::LlmInputToken,
        Money::usd("0.150000").unwrap(),
    ));
    catalog
}

fn add_model_route(
    catalog: &mut InMemoryPricingCatalog,
    account_id: i64,
    supplier_code: &str,
    provider_model: &str,
    api_code: &str,
    unit_price: &str,
) {
    catalog.add_provider_route(
        ModelUpstreamRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            supplier_code,
            account_id,
            provider_model,
        )
        .with_api_code(api_code)
        .with_upstream_endpoint(
            Some(format!("https://provider.example/{supplier_code}")),
            Some(format!("vault://providers/{supplier_code}/main")),
        ),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd(unit_price).unwrap(),
        )
        .for_provider(supplier_code, account_id),
    );
}

fn add_channel_route(catalog: &mut InMemoryPricingCatalog, account_id: i64, supplier_code: &str) {
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new(supplier_code, account_id).with_upstream_endpoint(
            Some(format!("https://provider.example/{supplier_code}")),
            Some(format!("vault://providers/{supplier_code}/main")),
        ),
    );
}

fn add_group_policy_rule(
    catalog: &mut InMemoryPricingCatalog,
    policy_id: i64,
    profile_id: i64,
    rule_id: i64,
    match_expression: &str,
    target_model: &str,
    candidates: Vec<RouteCandidate>,
    fallback: Vec<RouteCandidate>,
) {
    catalog.add_routing_policy(RoutingPolicy::new(
        policy_id,
        10,
        20,
        &format!("group-policy-{policy_id}"),
        RoutingPolicyScope::UpstreamAccountGroup,
        Some(10),
        Some(profile_id),
    ));
    catalog.add_routing_rule(
        RoutingRule::new(
            rule_id,
            10,
            20,
            profile_id,
            &format!("rule-{rule_id}"),
            1,
            match_expression,
            target_model,
        )
        .with_candidate_account_groups(candidates)
        .with_fallback_chain(fallback),
    );
}

fn subject() -> sdkwork_clawrouter_router_service::application::InvocationSubject {
    sdkwork_clawrouter_router_service::application::InvocationSubject::from_api_key_context(
        AuthenticatedApiKeyContext {
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            api_key_id: 100,
            api_key_name_snapshot: "Test key".to_owned(),
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
        },
    )
}

fn openai_invocation(method: Method, path: &str, body: InvocationBody) -> Invocation {
    let classification = OpenAiResourceClassifier::default()
        .classify(&InvocationClassificationRequest::new(method.clone(), path))
        .expect("classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(method, path)
            .with_request_id("req-route")
            .with_body(body),
        subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation
}

fn provider_native_invocation(
    supplier_code: &str,
    path: &str,
    capability: RoutingCapability,
) -> Invocation {
    let classification = ProviderNativeResourceClassifier::default()
        .classify(
            &InvocationClassificationRequest::new(Method::POST, path)
                .with_supplier_code(supplier_code)
                .with_capability(capability),
        )
        .expect("provider-native classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, path)
            .with_request_id("req-provider-native-route")
            .with_body(InvocationBody::json(json!({"prompt": "city skyline"}))),
        subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation
}

#[tokio::test]
async fn plans_model_route_and_resolves_account() {
    let mut catalog = base_catalog();
    add_model_route(
        &mut catalog,
        3001,
        "openrouter-main",
        "gpt-4o-mini-main",
        "openai.chat_completions",
        "0.110000",
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
        "openai/gpt-4o-mini",
        vec![RouteCandidate::new(3001, 100)],
        vec![],
    );
    let catalog = Arc::new(catalog);
    let mut invocation = openai_invocation(
        Method::POST,
        "/v1/chat/completions",
        InvocationBody::json(json!({
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": "ping"}]
        })),
    );
    invocation.resource.requested_model = Some("gpt-4o-mini".to_owned());

    RoutePlanningInterceptor::new(catalog.clone())
        .before(&mut invocation)
        .await
        .expect("route planning");

    let plan = invocation.routing.route_plan.as_ref().expect("route plan");
    assert_eq!(1, plan.candidates.len());
    assert_eq!(Some(2), invocation.routing.policy_id);
    assert_eq!(Some(202), invocation.routing.rule_id);
    assert_eq!(
        Some("openai/gpt-4o-mini"),
        invocation.resource.requested_model_catalog_key.as_deref()
    );

    AccountResolutionInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .expect("account resolution");

    let account = invocation.account.expect("account");
    assert_eq!("openrouter-main", account.supplier_code);
    assert_eq!(3001, account.account_id);
    assert_eq!(Some("gpt-4o-mini-main"), account.provider_model.as_deref());
    assert_eq!(
        Some("https://provider.example/openrouter-main"),
        account.base_url.as_deref()
    );
    assert_eq!(
        Some("vault://providers/openrouter-main/main"),
        account.secret_ref.as_deref()
    );
}

#[tokio::test]
async fn plans_management_api_channel_route() {
    let mut catalog = base_catalog();
    add_channel_route(&mut catalog, 3002, "openrouter-files");
    add_group_policy_rule(
        &mut catalog,
        3,
        301,
        302,
        r#"{"routeKey":"openai/management/files"}"#,
        "",
        vec![RouteCandidate::new(3002, 100)],
        vec![],
    );
    let catalog = Arc::new(catalog);
    let mut invocation = openai_invocation(Method::POST, "/v1/files", InvocationBody::Empty);

    RoutePlanningInterceptor::new(catalog.clone())
        .before(&mut invocation)
        .await
        .expect("route planning");
    AccountResolutionInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .expect("account resolution");

    let account = invocation.account.expect("account");
    assert_eq!("openrouter-files", account.supplier_code);
    assert_eq!(3002, account.account_id);
    assert_eq!(Some(3), invocation.routing.policy_id);
    assert_eq!(Some(302), invocation.routing.rule_id);
}

#[tokio::test]
async fn plans_provider_native_channel_route_and_resolves_account() {
    let mut catalog = base_catalog();
    add_channel_route(&mut catalog, 4001, "kling");
    add_group_policy_rule(
        &mut catalog,
        6,
        601,
        602,
        r#"{"routeKey":"kling.text_to_video"}"#,
        "kling.text_to_video",
        vec![RouteCandidate::new(4001, 100)],
        vec![],
    );
    let catalog = Arc::new(catalog);
    let mut invocation =
        provider_native_invocation("kling", "/v1/videos/text2video", RoutingCapability::Video);

    RoutePlanningInterceptor::new(catalog.clone())
        .before(&mut invocation)
        .await
        .expect("route planning");
    AccountResolutionInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .expect("account resolution");

    let account = invocation.account.expect("account");
    assert_eq!("kling", account.supplier_code);
    assert_eq!(4001, account.account_id);
    assert_eq!(Some(6), invocation.routing.policy_id);
    assert_eq!(Some(602), invocation.routing.rule_id);
    assert_eq!("kling.text_to_video", invocation.resource.route_key);
    assert_eq!(
        Some("https://provider.example/kling"),
        account.base_url.as_deref()
    );
    assert_eq!(
        Some("vault://providers/kling/main"),
        account.secret_ref.as_deref()
    );
}

#[tokio::test]
async fn plans_provider_native_channel_route_even_when_request_contains_model_metadata() {
    let mut catalog = base_catalog();
    add_channel_route(&mut catalog, 4001, "kling");
    add_group_policy_rule(
        &mut catalog,
        6,
        601,
        602,
        r#"{"routeKey":"kling.text_to_video"}"#,
        "kling.text_to_video",
        vec![RouteCandidate::new(4001, 100)],
        vec![],
    );
    let catalog = Arc::new(catalog);
    let mut invocation =
        provider_native_invocation("kling", "/v1/videos/text2video", RoutingCapability::Video);
    invocation.resource.requested_model = Some("kling-v2".to_owned());
    invocation.resource.provider_native_model = Some("kling-v2".to_owned());
    invocation.resource.requested_model_catalog_key = Some("kling/kling-v2".to_owned());

    RoutePlanningInterceptor::new(catalog.clone())
        .before(&mut invocation)
        .await
        .expect("route planning");
    AccountResolutionInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .expect("account resolution");

    let account = invocation.account.expect("account");
    assert_eq!("kling", account.supplier_code);
    assert_eq!(4001, account.account_id);
    assert_eq!("kling.text_to_video", invocation.resource.route_key);
    assert_eq!(
        Some("kling-v2"),
        invocation.resource.provider_native_model.as_deref()
    );
}

#[tokio::test]
async fn sticky_route_constraint_overrides_normal_route_selection() {
    let mut catalog = base_catalog();
    add_channel_route(&mut catalog, 3003, "sticky-provider");
    let catalog = Arc::new(catalog);
    let mut invocation = openai_invocation(
        Method::GET,
        "/v1/files/file_123/content",
        InvocationBody::Empty,
    );
    invocation.routing.sticky_route = Some(StickyRouteConstraint {
        supplier_code: "sticky-provider".to_owned(),
        account_id: 3003,
        account_group_id: Some(10),
        vendor_code: Some("sticky-provider".to_owned()),
        api_code: Some("openai.files".to_owned()),
        catalog_key: Some("openai/gpt-4o-mini".to_owned()),
        provider_model: Some("sticky-model".to_owned()),
        region_code: Some("global".to_owned()),
        sticky_scope: Some("object".to_owned()),
    });

    RoutePlanningInterceptor::new(catalog.clone())
        .before(&mut invocation)
        .await
        .expect("route planning");
    AccountResolutionInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .expect("account resolution");

    let account = invocation.account.expect("account");
    assert_eq!("sticky-provider", account.supplier_code);
    assert_eq!(3003, account.account_id);
    assert_eq!(Some("sticky-model"), account.provider_model.as_deref());
}

#[tokio::test]
async fn model_route_plan_preserves_failover_order() {
    let mut catalog = base_catalog();
    add_model_route(
        &mut catalog,
        3001,
        "primary-provider",
        "gpt-4o-mini-primary",
        "openai.chat_completions",
        "0.110000",
    );
    add_model_route(
        &mut catalog,
        3002,
        "fallback-provider",
        "gpt-4o-mini-fallback",
        "openai.chat_completions",
        "0.120000",
    );
    add_group_policy_rule(
        &mut catalog,
        4,
        401,
        402,
        r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
        "openai/gpt-4o-mini",
        vec![RouteCandidate::new(3001, 100)],
        vec![RouteCandidate::new(3002, 50)],
    );
    let catalog = Arc::new(catalog);
    let mut invocation = openai_invocation(
        Method::POST,
        "/v1/chat/completions",
        InvocationBody::json(json!({"model": "gpt-4o-mini"})),
    );
    invocation.resource.requested_model = Some("gpt-4o-mini".to_owned());

    RoutePlanningInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .expect("route planning");

    let plan = invocation.routing.route_plan.expect("route plan");
    assert_eq!(
        vec!["primary-provider", "fallback-provider"],
        plan.candidates
            .iter()
            .map(|candidate| candidate.supplier_code.as_str())
            .collect::<Vec<_>>()
    );
}

#[tokio::test]
async fn account_resolution_preserves_credential_rotation() {
    let mut catalog = base_catalog();
    catalog.add_provider_route(
        ModelUpstreamRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "credential-provider",
            3004,
            "gpt-4o-mini-credential",
        )
        .with_api_code("openai.chat_completions")
        .with_credential(Some(9001), "round_robin", 10, 100)
        .with_upstream_endpoint(
            Some("https://provider.example/credential-provider"),
            Some("vault://providers/credential-provider/9001"),
        ),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.110000").unwrap(),
        )
        .for_provider("credential-provider", 3004),
    );
    add_group_policy_rule(
        &mut catalog,
        5,
        501,
        502,
        r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
        "openai/gpt-4o-mini",
        vec![RouteCandidate::new(3004, 100)],
        vec![],
    );
    let catalog = Arc::new(catalog);
    let mut invocation = openai_invocation(
        Method::POST,
        "/v1/chat/completions",
        InvocationBody::json(json!({"model": "gpt-4o-mini"})),
    );
    invocation.resource.requested_model = Some("gpt-4o-mini".to_owned());

    RoutePlanningInterceptor::new(catalog.clone())
        .before(&mut invocation)
        .await
        .expect("route planning");
    AccountResolutionInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .expect("account resolution");

    let account = invocation.account.expect("account");
    assert_eq!(Some(9001), account.credential_id);
    assert_eq!(Some("round_robin"), account.credential_rotation.as_deref());
}
