use sdkwork_clawrouter_router_service::domain::{
    DecimalValue, RouteCandidate, UpstreamAccountFallbackMode, UpstreamAccountRoutingStrategy,
};
use sdkwork_clawrouter_router_service::infrastructure::sql::rows::{
    ModelMappingRuleRow, RoutingRuleRow, UpstreamAccountGroupRow, UpstreamAccountRouteRow,
};
use sdkwork_clawrouter_router_service::infrastructure::sql::PricingCatalogSql;

const CANONICAL_UPSTREAM_TABLES: [&str; 11] = [
    "ai_upstream_supplier",
    "ai_upstream_supplier_endpoint",
    "ai_upstream_supplier_auth_method",
    "ai_upstream_supplier_resource",
    "ai_upstream_account",
    "ai_upstream_account_health_state",
    "ai_upstream_account_credential",
    "ai_upstream_account_group",
    "ai_upstream_account_group_member",
    "ai_upstream_account_group_resource",
    "ai_upstream_supplier_endpoint_health_state",
];

const RETIRED_UPSTREAM_TABLES: [&str; 10] = [
    "ai_provider",
    "ai_site",
    "ai_site_service",
    "ai_channel",
    "ai_channel_credential",
    "ai_channel_resource",
    "ai_upstream_pool",
    "integration_provider_account",
    "integration_service_provider",
    "provider_secrets",
];

#[test]
fn snapshot_query_set_is_complete_and_uses_only_postgresql_upstream_authorities() {
    let queries = PricingCatalogSql::snapshot_load_queries();
    assert_eq!(14, queries.len());

    let sql = queries.join("\n");
    for table in CANONICAL_UPSTREAM_TABLES {
        assert!(
            sql.contains(table),
            "PostgreSQL catalog snapshot must use canonical table {table}"
        );
    }
    for table in RETIRED_UPSTREAM_TABLES {
        assert!(
            !sql.contains(table),
            "PostgreSQL catalog snapshot must not use retired table {table}"
        );
    }
}

#[test]
fn upstream_account_route_query_projects_the_complete_callable_route() {
    let sql = PricingCatalogSql::load_upstream_account_routes();

    for table in CANONICAL_UPSTREAM_TABLES {
        assert!(
            sql.contains(table),
            "upstream account route query must join {table}"
        );
    }
    for projection in [
        "c.contract_cost_multiplier::text AS contract_cost_multiplier",
        "account_health.last_latency_ms",
        "e.id AS endpoint_id",
        "e.base_url",
        "cc.id AS credential_id",
        "cc.credential_ref AS secret_ciphertext",
        "am.auth_type",
        "account_group_bindings_json",
        "endpoint_health_status",
        "account_health_status",
        "credential_health_status",
    ] {
        assert!(
            sql.contains(projection),
            "upstream account route query must project {projection}"
        );
    }
    assert!(sql.contains("matched_resource_scope AS ("));
    assert!(sql.contains("JOIN supplier_resource_scope sr"));
    assert!(sql.contains("sr.tenant_id = gr.tenant_id"));
    assert!(sql.contains("sr.organization_id = gr.organization_id"));
    assert!(sql.contains("NULLIF(cc.credential_ref, '') IS NOT NULL"));
    assert!(sql.contains("NULLIF(e.base_url, '') IS NOT NULL"));
    assert!(sql.contains("member.account_id = c.id"));
    assert!(sql.contains("COALESCE(member.enabled, true)"));
}

#[test]
fn model_mapping_query_uses_only_the_six_canonical_binding_types() {
    let sql = PricingCatalogSql::load_model_mappings();
    let expected = [
        ("upstream_account", 0),
        ("upstream_account_group", 1),
        ("supplier_endpoint", 2),
        ("upstream_supplier", 3),
        ("vendor", 4),
        ("global", 5),
    ];

    assert!(sql.contains("JOIN ai_model_mapping_rule_binding b"));
    assert!(sql.contains("JOIN ai_model_mapping_rule_item i"));
    for (binding_type, rank) in expected {
        assert!(
            sql.contains(&format!("WHEN '{binding_type}' THEN {rank}")),
            "model mapping query must rank {binding_type} at {rank}"
        );
    }
    for retired in ["provider_account", "channel", "site", "site_service"] {
        assert!(
            !sql.contains(&format!("'{retired}'")),
            "model mapping query must reject retired binding type {retired}"
        );
    }
}

#[test]
fn account_group_query_projects_routing_and_settlement_controls() {
    let sql = PricingCatalogSql::load_upstream_account_groups();

    for field in [
        "routing_strategy",
        "fallback_mode",
        "priority",
        "cost_multiplier",
        "sale_multiplier",
    ] {
        assert!(
            sql.contains(field),
            "upstream account group query must project {field}"
        );
    }
    for retired in ["rate_multiplier", "official_price_multiplier"] {
        assert!(
            !sql.contains(retired),
            "upstream account group query must not project retired field {retired}"
        );
    }
}

#[test]
fn routing_rule_rows_require_account_group_candidates() {
    let row = RoutingRuleRow {
        id: 9102,
        tenant_id: 10,
        organization_id: 20,
        profile_id: 9101,
        rule_code: "standard-group-route".to_owned(),
        priority: 10,
        match_expression_json: r#"{"catalogKey":"openai/gpt-4o-mini"}"#.to_owned(),
        target_model: Some("openai/gpt-4o-mini".to_owned()),
        candidate_account_groups_json:
            r#"[{"account_group_id":10,"weight":100,"region_code":"global"}]"#.to_owned(),
        fallback_chain_json: r#"[{"accountGroupId":20,"weight":50}]"#.to_owned(),
        constraints_json: "{}".to_owned(),
    };

    let rule = row.try_into_domain().unwrap();
    assert_eq!(
        vec![RouteCandidate::new(10, 100).with_region_code("global")],
        rule.candidate_account_groups
    );
    assert_eq!(vec![RouteCandidate::new(20, 50)], rule.fallback_chain);

    let legacy = RoutingRuleRow {
        id: 9103,
        tenant_id: 10,
        organization_id: 20,
        profile_id: 9101,
        rule_code: "legacy-account-route".to_owned(),
        priority: 20,
        match_expression_json: "{}".to_owned(),
        target_model: None,
        candidate_account_groups_json: r#"[{"account_id":3001,"weight":100}]"#.to_owned(),
        fallback_chain_json: "[]".to_owned(),
        constraints_json: "{}".to_owned(),
    };
    assert!(legacy.try_into_domain().is_err());
}

#[test]
fn account_group_rows_use_decimal_cost_and_sale_multipliers() {
    let group = UpstreamAccountGroupRow {
        id: 10,
        tenant_id: 10,
        organization_id: 20,
        name: "Primary Accounts".to_owned(),
        code: "primary-accounts".to_owned(),
        pricing_plan_code: "standard".to_owned(),
        routing_strategy: "least_cost".to_owned(),
        fallback_mode: "same_supplier".to_owned(),
        priority: 10,
        cost_multiplier: "1.080000".to_owned(),
        sale_multiplier: "1.250000".to_owned(),
    }
    .try_into_domain()
    .unwrap();

    assert_eq!(
        UpstreamAccountRoutingStrategy::LeastCost,
        group.routing_strategy
    );
    assert_eq!(
        UpstreamAccountFallbackMode::SameSupplier,
        group.fallback_mode
    );
    assert_eq!(
        DecimalValue::parse("1.080000").unwrap(),
        group.cost_multiplier
    );
    assert_eq!(
        DecimalValue::parse("1.250000").unwrap(),
        group.sale_multiplier
    );

    let invalid = UpstreamAccountGroupRow {
        id: 11,
        tenant_id: 10,
        organization_id: 20,
        name: "Invalid".to_owned(),
        code: "invalid".to_owned(),
        pricing_plan_code: "standard".to_owned(),
        routing_strategy: "weighted".to_owned(),
        fallback_mode: "sequential".to_owned(),
        priority: 100,
        cost_multiplier: "not-a-decimal".to_owned(),
        sale_multiplier: "1.000000".to_owned(),
    };
    assert!(invalid.try_into_domain().is_err());
}

#[test]
fn model_mapping_rows_reject_retired_binding_types() {
    for binding_type in [
        "upstream_account",
        "upstream_account_group",
        "supplier_endpoint",
        "upstream_supplier",
        "vendor",
        "global",
    ] {
        let rule = model_mapping_row(binding_type).try_into_domain().unwrap();
        assert_eq!(binding_type, rule.binding_type.as_str());
    }
    for retired in ["provider_account", "channel", "site", "site_service"] {
        assert!(model_mapping_row(retired).try_into_domain().is_err());
    }
}

#[test]
fn upstream_account_route_rows_preserve_endpoint_credential_and_group_identity() {
    let route = UpstreamAccountRouteRow {
        supplier_code: "openai".to_owned(),
        account_id: 3001,
        credential_id: Some(7001),
        credential_rotation: "priority".to_owned(),
        credential_priority: 10,
        credential_weight: 100,
        contract_cost_multiplier: "0.950000".to_owned(),
        last_latency_ms: Some(125),
        account_code: Some("openai-primary".to_owned()),
        region_code: "global".to_owned(),
        supplier_id: 5001,
        endpoint_id: Some(6001),
        endpoint_code: Some("global-primary".to_owned()),
        endpoint_priority: 10,
        endpoint_weight: 100,
        endpoint_health_status: 1,
        base_url: Some("https://api.openai.com/v1".to_owned()),
        secret_ref: Some("managed://upstream-account-credential/7001".to_owned()),
        secret_ciphertext: Some("encrypted-value".to_owned()),
        auth_type: Some("api_key".to_owned()),
        runtime_auth_config_json:
            r#"{"credentialTransport":"bearer","defaultHeaders":{}}"#.to_owned(),
        timeout_ms: Some(30_000),
        retry_policy_json: Some(
            r#"{"max_attempts":2,"retryable_status_codes":[429,503],"backoff_ms":25}"#
                .to_owned(),
        ),
        account_group_bindings_json:
            r#"[{"accountGroupId":10,"priority":10,"weight":100,"costMultiplierOverride":"1.020000","apiScope":["openai.chat_completions"],"capabilities":["llm"]}]"#.to_owned(),
        account_health_status: 1,
        credential_health_status: 1,
    }
    .try_into_domain()
    .unwrap();

    assert_eq!(3001, route.account_id);
    assert_eq!(Some(7001), route.credential_id);
    assert_eq!(Some(6001), route.endpoint_id);
    assert_eq!(
        DecimalValue::parse("0.950000").unwrap(),
        route.contract_cost_multiplier
    );
    assert_eq!(Some(125), route.last_latency_ms);
    assert_eq!(1, route.account_group_bindings.len());
    assert_eq!(10, route.account_group_bindings[0].account_group_id);
    assert_eq!(
        Some(DecimalValue::parse("1.020000").unwrap()),
        route.account_group_bindings[0].cost_multiplier_override
    );
}

fn model_mapping_row(binding_type: &str) -> ModelMappingRuleRow {
    ModelMappingRuleRow {
        id: 5001,
        binding_type: binding_type.to_owned(),
        binding_id: Some(3001),
        binding_code: Some("binding-code".to_owned()),
        source_model: "fast-chat".to_owned(),
        source_catalog_key: Some("openai/fast-chat".to_owned()),
        target_model: "gpt-4o-mini".to_owned(),
        target_catalog_key: Some("openai/gpt-4o-mini".to_owned()),
        target_vendor_code: Some("openai".to_owned()),
        target_provider_model: Some("gpt-4o-mini".to_owned()),
        target_provider_native_model: None,
        binding_sort_order: 10,
        item_sort_order: 20,
    }
}
