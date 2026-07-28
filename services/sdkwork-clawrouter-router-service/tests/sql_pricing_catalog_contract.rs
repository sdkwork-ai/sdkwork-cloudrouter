use sdkwork_clawrouter_router_service::application::{
    ListModelCatalogQuery, ModelCatalogQueryService, PriceAvailability, PricingResolver,
    ResolveModelPriceQuery,
};
use sdkwork_clawrouter_router_service::domain::{
    ensure_canonical_model_catalog_key, parse_model_catalog_identity, provider_native_model_id,
    BillingMeter, DecimalValue, ModelMappingBindingType, ModelVendor, PriceSide, ProviderAuthType,
    ProviderRetryPolicy, ResolveModelMappingContext, RouteCandidate, RoutingCapability,
    RoutingFallbackMode, RoutingPolicyScope,
};
use sdkwork_clawrouter_router_service::infrastructure::sql::catalog::{
    PricingCatalogRows, RefreshableSqlPricingCatalog, SqlPricingCatalogSnapshot,
};
use sdkwork_clawrouter_router_service::infrastructure::sql::rows::{
    AiModelRow, UpstreamAccountGroupMetricSnapshotRow, UpstreamAccountGroupRow, GatewayAccessPolicyRow,
    GatewayApiKeyRow, ModelMappingRuleRow, ModelPriceRow, ModelUpstreamRouteRow, ModelVendorRow,
    PricingPlanRow, UpstreamAccountRouteRow, QuotaPolicyRow, RoutingPolicyRow, RoutingRuleRow,
};
use sdkwork_clawrouter_router_service::infrastructure::sql::PricingCatalogSql;
use sdkwork_clawrouter_router_service::ports::PricingCatalog;

fn ai_model_row(
    model: &str,
    display_name: &str,
    vendor_code: &str,
    capabilities_json: &str,
) -> AiModelRow {
    AiModelRow {
        catalog_key: format!("{vendor_code}/{model}"),
        model: model.to_owned(),
        display_name: display_name.to_owned(),
        vendor_code: vendor_code.to_owned(),
        capabilities_json: capabilities_json.to_owned(),
        description: Some("Fast commercial model.".to_owned()),
        modalities_json: r#"["text","image"]"#.to_owned(),
        input_modalities_json: r#"["text","image"]"#.to_owned(),
        output_modalities_json: r#"["text"]"#.to_owned(),
        api_format: Some("openai_responses".to_owned()),
        capability_intro: Some("Low latency chat and tool calling.".to_owned()),
        limitations_json: r#"["May need verification for facts."]"#.to_owned(),
        supported_languages_json: r#"["English","Chinese"]"#.to_owned(),
        use_cases_json: r#"["Customer support","Data extraction"]"#.to_owned(),
        training_data_cutoff: Some("2025".to_owned()),
        context_tokens: Some(128000),
        max_output_tokens: Some(16384),
        supports_streaming: true,
        supports_tools: true,
        supports_json_schema: true,
        release_stage: Some(1),
        shelf_state: Some(1),
        routing_state: Some(1),
        replacement_model: None,
    }
}

#[test]
fn sql_queries_use_schema_registry_tables_and_never_forbidden_synonyms() {
    let sql = PricingCatalogSql::all_queries().join("\n");

    for required_table in [
        "ai_model_vendor",
        "ai_model",
        "ai_model_pricing",
        "ai_pricing_plan",
        "iam_gateway_api_key",
        "ai_upstream_account_group",
        "ai_upstream_account_group_metric_snapshot",
        "ai_provider",
        "ai_channel",
        "ai_channel_credential",
        "ai_channel_resource",
        "ai_resource",
        "ai_routing_policy",
        "ai_routing_profile",
        "ai_routing_rule",
    ] {
        assert!(
            sql.contains(required_table),
            "query set must reference schema table {required_table}"
        );
    }

    for forbidden in [
        "ai_gateway_model",
        "gateway_model",
        "ai_pricing_group",
        "claw_",
        "sdkwork_",
        "portal_",
        "console_",
        "router_",
    ] {
        assert!(
            !sql.contains(forbidden),
            "query set must not reference forbidden table/prefix {forbidden}"
        );
    }
}

#[test]
fn provider_native_model_id_strips_only_catalog_vendor_scope() {
    assert_eq!("gpt-5.5", provider_native_model_id("openai/gpt-5.5"));
    assert_eq!(
        "openai//gpt-5.5",
        provider_native_model_id("openai//gpt-5.5"),
        "empty catalog identity segments must not be normalized before provider-native routing"
    );
    assert_eq!(
        "openai/gpt-5.5/",
        provider_native_model_id("openai/gpt-5.5/"),
        "slash-padded catalog identities must not be normalized before provider-native routing"
    );
    assert_eq!(
        "openai/global/gpt-5.5",
        provider_native_model_id("openai/global/gpt-5.5"),
        "legacy vendor/region/model identities must not be normalized into provider-native ids"
    );
    assert_eq!(
        "openai/cn-north-1/gpt-5.5",
        provider_native_model_id("openai/cn-north-1/gpt-5.5"),
        "cloud region segments must remain invalid catalog identities instead of being treated as provider-native namespaces"
    );
    assert_eq!(
        "openrouter/global/anthropic/claude-3-opus",
        provider_native_model_id("openrouter/global/anthropic/claude-3-opus"),
        "relay catalog keys must not accept a region segment in the model identity"
    );
    assert_eq!(
        "openrouter/cn-north-1/anthropic/claude-3-opus",
        provider_native_model_id("openrouter/cn-north-1/anthropic/claude-3-opus"),
        "relay catalog keys must not accept cloud region segments in the model identity"
    );
    assert_eq!(
        "anthropic/claude-3-opus",
        provider_native_model_id("openrouter/anthropic/claude-3-opus")
    );
    assert_eq!(
        "anthropic/claude-3-opus",
        provider_native_model_id("anthropic/claude-3-opus"),
        "provider-native slash model ids must not be stripped as catalog keys"
    );
}

#[test]
fn shared_model_catalog_identity_standard_rejects_region_segments_and_empty_parts() {
    let identity = parse_model_catalog_identity("openrouter/anthropic/claude-3-opus")
        .expect("OpenRouter nested provider-native ids are canonical vendor/model identities");

    assert_eq!("openrouter", identity.vendor_code);
    assert_eq!(vec!["anthropic", "claude-3-opus"], identity.model_parts);
    assert_eq!("anthropic/claude-3-opus", identity.model_id());

    assert!(
        parse_model_catalog_identity("openrouter/global/anthropic/claude-3-opus").is_none(),
        "region segments must not be accepted as part of catalog identity"
    );
    assert!(
        parse_model_catalog_identity("openai/cn-north-1/gpt-5.5").is_none(),
        "cloud deployment regions belong to region_code, not catalog_key"
    );
    assert!(
        parse_model_catalog_identity("openai//gpt-4o-mini").is_none(),
        "empty catalog key segments must be rejected instead of normalized away"
    );
    assert!(
        parse_model_catalog_identity("/openai/gpt-4o-mini").is_none(),
        "leading slash catalog keys must be rejected instead of normalized away"
    );
    assert!(
        parse_model_catalog_identity("openai/gpt-4o-mini/").is_none(),
        "trailing slash catalog keys must be rejected instead of normalized away"
    );
    assert!(
        !sdkwork_clawrouter_router_service::domain::model_catalog_scope_matches_key(
            "*",
            "openai/gpt-4o-mini/"
        ),
        "wildcard scopes must not match invalid slash-padded catalog keys"
    );

    let error = ensure_canonical_model_catalog_key(
        "tencent-cloud/global/vidu2.0",
        "requestedModelCatalogKey",
    )
    .expect_err("regional catalog keys must fail loudly");
    assert!(
        error
            .to_string()
            .contains("requestedModelCatalogKey must use vendorCode/modelId"),
        "{error}"
    );
}

#[test]
fn row_mappers_reject_empty_catalog_key_segments_with_shared_identity_standard() {
    let mut model_row = ai_model_row("gpt-4o-mini", "GPT-4o mini", "openai", r#"["chat"]"#);
    model_row.catalog_key = "openai//gpt-4o-mini".to_owned();
    let error = model_row
        .try_into_domain()
        .expect_err("ai_model.catalog_key must reject empty path segments");
    assert!(
        error
            .to_string()
            .contains("ai_model.catalog_key must use vendor/model identity"),
        "{error}"
    );

    let route_error = ModelUpstreamRouteRow {
        catalog_key: "openai//gpt-4o-mini".to_owned(),
        model: "gpt-4o-mini".to_owned(),
        api_code: Some("openai.chat_completions".to_owned()),
        region_code: "global".to_owned(),
        supplier_code: "openai".to_owned(),
        account_id: 3001,
        credential_id: Some(300101),
        credential_rotation: "priority".to_owned(),
        credential_priority: 10,
        credential_weight: 100,
        provider_model: "gpt-4o-mini".to_owned(),
        base_url: Some("https://api.openai.com/v1".to_owned()),
        secret_ref: Some("vault://providers/openai/account/main".to_owned()),
        auth_type: Some("bearer".to_owned()),
        auth_config_json: Some("{}".to_owned()),
        timeout_ms: None,
        retry_policy_json: None,
    }
    .try_into_domain()
    .expect_err("provider route catalog_key must reject empty path segments");
    assert!(
        route_error
            .to_string()
            .contains("provider route catalog_key must use vendor/model identity"),
        "{route_error}"
    );

    let mapping_source_error = ModelMappingRuleRow {
        id: 5004,
        binding_type: "global".to_owned(),
        binding_id: None,
        binding_code: None,
        source_model: "gpt-4o-mini".to_owned(),
        source_catalog_key: Some("openai//gpt-4o-mini".to_owned()),
        target_model: "gpt-4o-mini".to_owned(),
        target_catalog_key: Some("openai/gpt-4o-mini".to_owned()),
        target_vendor_code: Some("openai".to_owned()),
        target_provider_model: None,
        target_provider_native_model: None,
        binding_sort_order: 100,
        item_sort_order: 100,
    }
    .try_into_domain()
    .expect_err("mapping source catalog key must reject empty path segments");
    assert!(
        mapping_source_error.to_string().contains(
            "ai_model_mapping_rule_item.source_catalog_key must use vendor/model identity"
        ),
        "{mapping_source_error}"
    );

    let mapping_target_error = ModelMappingRuleRow {
        id: 5005,
        binding_type: "global".to_owned(),
        binding_id: None,
        binding_code: None,
        source_model: "legacy-fast".to_owned(),
        source_catalog_key: Some("openai/legacy-fast".to_owned()),
        target_model: "gpt-4o-mini".to_owned(),
        target_catalog_key: Some("openai//gpt-4o-mini".to_owned()),
        target_vendor_code: Some("openai".to_owned()),
        target_provider_model: None,
        target_provider_native_model: None,
        binding_sort_order: 100,
        item_sort_order: 100,
    }
    .try_into_domain()
    .expect_err("mapping target catalog key must reject empty path segments");
    assert!(
        mapping_target_error.to_string().contains(
            "ai_model_mapping_rule_item.target_catalog_key must use vendor/model identity"
        ),
        "{mapping_target_error}"
    );
}

#[test]
fn sql_queries_project_stable_codes_instead_of_enum_ordinals() {
    let price_sql = PricingCatalogSql::list_model_prices();
    assert!(price_sql.contains("price_side_code"));
    assert!(price_sql.contains("'official_reference'"));
    assert!(price_sql.contains("'upstream_cost'"));
    assert!(price_sql.contains("'customer_charge'"));
    assert!(price_sql.contains("'internal_transfer'"));

    let plan_sql = PricingCatalogSql::find_pricing_plan();
    assert!(plan_sql.contains("base_price_side_code"));
    assert!(plan_sql.contains("'official_reference'"));
}

#[test]
fn pricing_queries_project_explicit_tenant_and_organization_scope() {
    for (query_name, sql) in [
        (
            "postgres pricing plans",
            PricingCatalogSql::load_pricing_plans(),
        ),
        ("postgres prices", PricingCatalogSql::load_prices()),
    ] {
        assert!(
            sql.contains("tenant_id") && sql.contains("organization_id"),
            "{query_name} must project tenant_id and organization_id for scope-aware row mapping"
        );
    }

    let sqlite_source = include_str!("../src/infrastructure/sql/sqlite/queries.rs");
    for (query_name, marker) in [
        (
            "sqlite pricing plans",
            "pub const LOAD_PRICING_PLANS: &str = r#\"",
        ),
        ("sqlite prices", "pub const LOAD_PRICES: &str = r#\""),
    ] {
        let sql = sqlite_source
            .split(marker)
            .nth(1)
            .and_then(|value| value.split("\"#;").next())
            .expect("sqlite pricing query must be present");
        assert!(
            sql.contains("tenant_id") && sql.contains("organization_id"),
            "{query_name} must project tenant_id and organization_id for scope-aware row mapping"
        );
    }
}

#[test]
fn provider_route_queries_use_explicit_region_context_not_catalog_key_segments() {
    let postgres_sql = PricingCatalogSql::load_provider_routes();
    assert!(postgres_sql.contains("AS region_code"));
    assert!(postgres_sql.contains("COALESCE(NULLIF(c.region_code, ''), 'global') AS region_code"));
    assert!(
        !PricingCatalogSql::load_upstream_account_routes()
            .contains("endpoint.region_code IN"),
        "channel route SQL must not filter endpoint deployments by channel region; endpoint region is the deployment dimension"
    );
    assert!(
        !PricingCatalogSql::load_upstream_account_routes().contains("LIMIT 1"),
        "channel route SQL must not collapse region deployments to one endpoint; each endpoint region is a deployment row"
    );
    for forbidden in [
        "strpos(m.catalog_key",
        "substr(m.catalog_key",
        "split_part(m.catalog_key",
    ] {
        assert!(
            !postgres_sql.contains(forbidden),
            "provider route SQL must not derive region from catalog_key with {forbidden}"
        );
    }

    let sqlite_source = include_str!("../src/infrastructure/sql/sqlite/queries.rs");
    let sqlite_sql = sqlite_source
        .split("pub const LOAD_PROVIDER_CHANNEL_ROUTES: &str = r#\"")
        .nth(1)
        .and_then(|value| value.split("\"#;").next())
        .expect("sqlite load provider channel routes query must be present");
    assert!(sqlite_sql.contains("AS region_code"));
    assert!(sqlite_sql.contains("COALESCE(NULLIF(c.region_code, ''), 'global') AS region_code"));
    assert!(
        !sqlite_sql.contains("endpoint.region_code IN"),
        "sqlite channel route SQL must not filter endpoint deployments by channel region; endpoint region is the deployment dimension"
    );
    assert!(
        !sqlite_sql.contains("LIMIT 1"),
        "sqlite channel route SQL must not collapse region deployments to one endpoint; each endpoint region is a deployment row"
    );
    for forbidden in ["instr(m.catalog_key", "substr(m.catalog_key"] {
        assert!(
            !sqlite_sql.contains(forbidden),
            "sqlite provider route SQL must not derive region from catalog_key with {forbidden}"
        );
    }
}

#[test]
fn model_mapping_snapshot_queries_use_normalized_rule_binding_item_tables() {
    let postgres_sql = PricingCatalogSql::load_model_mappings();
    assert!(
        postgres_sql.contains("JOIN ai_model_mapping_rule_binding b"),
        "runtime model mapping snapshot must load rule bindings instead of legacy rule scope columns"
    );
    assert!(
        postgres_sql.contains("JOIN ai_model_mapping_rule_item i"),
        "runtime model mapping snapshot must load mapping items instead of legacy rule model columns"
    );
    assert!(
        postgres_sql.contains("b.binding_type AS binding_type"),
        "runtime mapping rows must project the matched binding type"
    );
    assert!(
        postgres_sql.contains("i.source_model AS source_model")
            && postgres_sql.contains("NULLIF(i.source_catalog_key, '') AS source_catalog_key")
            && postgres_sql.contains("i.target_model AS target_model"),
        "runtime mapping rows must project model relationships from ai_model_mapping_rule_item"
    );
    for forbidden in [
        "scope_type",
        "NULLIF(vendor_code, '')",
        "\n    account_id,",
        "NULLIF(account_code, '')",
        "\n    source_model,",
        "\n    target_model,",
        "\n    priority",
    ] {
        assert!(
            !postgres_sql.contains(forbidden),
            "runtime mapping SQL must not read legacy ai_model_mapping_rule.{forbidden}"
        );
    }
    assert!(
        postgres_sql.contains("WHEN 'provider_account' THEN 0")
            && postgres_sql.contains("WHEN 'channel' THEN 1")
            && postgres_sql.contains("WHEN 'upstream_account_group' THEN 2")
            && postgres_sql.contains("WHEN 'vendor' THEN 3")
            && postgres_sql.contains("WHEN 'global' THEN 4"),
        "runtime mapping SQL must preserve the standard binding priority order"
    );

    let sqlite_source = include_str!("../src/infrastructure/sql/sqlite/queries.rs");
    let sqlite_start = sqlite_source
        .find("pub const LOAD_MODEL_MAPPINGS")
        .expect("sqlite load model mappings query must be present");
    let sqlite_end = sqlite_source[sqlite_start..]
        .find("pub const LOAD_PRICING_PLANS")
        .map(|offset| sqlite_start + offset)
        .expect("sqlite load pricing plans query must follow load model mappings");
    let sqlite_sql = &sqlite_source[sqlite_start..sqlite_end];
    assert!(sqlite_sql.contains("JOIN ai_model_mapping_rule_binding b"));
    assert!(sqlite_sql.contains("JOIN ai_model_mapping_rule_item i"));
    assert!(sqlite_sql.contains("b.binding_type AS binding_type"));
    assert!(sqlite_sql.contains("NULLIF(i.source_catalog_key, '') AS source_catalog_key"));
    for forbidden in [
        "scope_type",
        "NULLIF(vendor_code, '')",
        "\n    account_id,",
        "NULLIF(account_code, '')",
        "\n    source_model,",
        "\n    target_model,",
        "\n    priority",
    ] {
        assert!(
            !sqlite_sql.contains(forbidden),
            "sqlite runtime mapping SQL must not read legacy ai_model_mapping_rule.{forbidden}"
        );
    }
}

#[test]
fn snapshot_load_queries_are_parameterless_and_cover_every_catalog_row_set() {
    let queries = PricingCatalogSql::snapshot_load_queries();
    assert_eq!(15, queries.len());

    let sql = queries.join("\n");
    for required_table in [
        "ai_model_vendor",
        "ai_model",
        "ai_model_pricing",
        "ai_pricing_plan",
        "iam_gateway_api_key",
        "ai_upstream_account_group",
        "ai_upstream_account_group_metric_snapshot",
        "iam_gateway_access_policy",
        "ai_quota_policy",
        "iam_gateway_risk_rule",
        "ai_provider",
        "ai_channel",
        "ai_channel_credential",
        "ai_channel_resource",
        "ai_resource",
        "ai_routing_policy",
        "ai_routing_profile",
        "ai_routing_rule",
        "ai_model_mapping_rule",
    ] {
        assert!(
            sql.contains(required_table),
            "snapshot load queries must reference {required_table}"
        );
    }

    for request_filter in ["api_key_id = $", "group_id = $"] {
        assert!(
            !sql.contains(request_filter),
            "snapshot load queries must not depend on request-time route selection parameters"
        );
    }
    assert!(
        !sql.contains("gateway_model"),
        "snapshot load queries must use normalized model and resource tables"
    );
    assert!(sql.contains("price_side_code"));
    assert!(sql.contains("base_price_side_code"));
    assert!(
        PricingCatalogSql::load_api_keys().contains("key_hash"),
        "API key snapshot query must load iam_gateway_api_key.key_hash for credential authentication"
    );
    assert!(
        PricingCatalogSql::load_api_keys().contains("account_group_id"),
        "API key snapshot query must keep iam_gateway_api_key.account_group_id as the default route group"
    );
    assert!(
        PricingCatalogSql::load_api_keys().contains("iam_gateway_api_key_upstream_account_group")
            && PricingCatalogSql::load_api_keys().contains("account_group_bindings_json"),
        "API key snapshot query must load explicit multi-group route bindings from iam_gateway_api_key_upstream_account_group"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_groups().contains("ai_upstream_account_group"),
        "channel group snapshot query must load reusable AI channel groups"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_group_metric_snapshots()
            .contains("ai_upstream_account_group_metric_snapshot"),
        "channel group metric snapshot query must load AI channel group metric projections"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_groups().contains("NULLIF(BTRIM(pricing_plan_code), '')")
            && PricingCatalogSql::load_upstream_account_groups().contains("'standard'"),
        "channel group snapshot query must default empty pricing_plan_code before runtime billing subject validation"
    );
    assert!(
        PricingCatalogSql::load_api_keys().contains("key_display_masked"),
        "API key snapshot query must load only masked key material for console listing"
    );
    assert!(
        PricingCatalogSql::load_access_policies().contains("allowed_capabilities"),
        "API key snapshot query must load access policy capabilities for route modality rendering"
    );
    assert!(
        PricingCatalogSql::load_provider_routes().contains("base_url"),
        "provider route snapshot query must project resolved provider base_url"
    );
    assert!(
        !PricingCatalogSql::load_provider_routes().contains("ai_route_candidate"),
        "provider route snapshot query must not read the precomputed route candidate projection"
    );
    assert!(
        !PricingCatalogSql::load_provider_routes().contains("ai_channel_endpoint"),
        "provider route snapshot query must not depend on channel endpoints"
    );
    for sql in [
        PricingCatalogSql::list_model_upstream_routes(),
        PricingCatalogSql::find_model_upstream_route(),
    ] {
        assert!(
            !sql.contains("ai_channel_model"),
            "provider route lookup queries must not depend on account model allowlists"
        );
        assert!(
            !sql.contains("ai_channel_vendor") && sql.contains("ai_channel_resource"),
            "provider route lookup queries must derive account support from resource bindings"
        );
        assert!(
            sql.contains("scope.binding_id IS NOT NULL"),
            "provider route lookup queries must require explicit account resource bindings"
        );
        assert!(
            sql.contains("c.tenant_id = m.tenant_id")
                && sql.contains("c.organization_id = m.organization_id"),
            "provider route lookup queries must not combine models and channel accounts across tenant boundaries"
        );
        assert!(
            !sql.contains("cr_check"),
            "provider route lookup queries must not treat accounts without resources as unrestricted"
        );
    }
    assert!(
        PricingCatalogSql::load_provider_routes()
            .contains("COALESCE(NULLIF(cc.base_url, ''), NULLIF(c.base_url, ''), p.base_url)"),
        "provider route snapshot query must resolve base_url from credential/channel/provider"
    );
    assert!(
        PricingCatalogSql::load_provider_routes().contains("scope.binding_id IS NOT NULL"),
        "provider route snapshot query must require explicit account resource bindings"
    );
    assert!(
        !PricingCatalogSql::load_provider_routes().contains("cr_check"),
        "provider route snapshot query must not treat accounts without resources as unrestricted"
    );
    assert!(
        PricingCatalogSql::load_provider_routes().contains("JOIN ai_channel_credential cc"),
        "provider route snapshot query must expand one callable route per active channel credential"
    );
    assert!(
        PricingCatalogSql::load_provider_routes().contains("cc.id AS credential_id")
            && PricingCatalogSql::load_provider_routes().contains(
                "COALESCE(NULLIF(c.credential_rotation_strategy, ''), 'default') AS credential_rotation"
            ),
        "provider route snapshot query must project credential identity and channel rotation strategy"
    );
    assert!(
        PricingCatalogSql::load_provider_routes()
            .contains("COALESCE(NULLIF(c.region_code, ''), 'global') AS region_code"),
        "provider route snapshot query must preserve account route region with global fallback"
    );
    assert!(
        PricingCatalogSql::load_provider_routes().contains("LEFT JOIN ai_provider p"),
        "provider route snapshot query must allow channel-owned base_url routes when provider registry metadata is absent"
    );
    assert!(
        PricingCatalogSql::load_provider_routes().contains("JOIN ai_channel c"),
        "provider route snapshot query must require an active channel for callable routing"
    );
    assert!(
        PricingCatalogSql::load_provider_routes().contains("c.tenant_id = scope.tenant_id")
            && PricingCatalogSql::load_provider_routes()
                .contains("c.organization_id = scope.organization_id"),
        "provider route snapshot query must not combine resources and channel accounts across tenant boundaries"
    );
    assert!(
        PricingCatalogSql::load_provider_routes().contains("FROM channel_resource_scope scope")
            && PricingCatalogSql::load_provider_routes().contains("JOIN ai_resource resource"),
        "provider route snapshot query must drive model-scoped routing from gateway-owned resources without sdkwork-models SoR tables"
    );
    assert!(
        PricingCatalogSql::load_provider_routes().contains("secret_ref"),
        "provider route snapshot query must project credential credential_ref as secret_ref"
    );
    assert!(
        PricingCatalogSql::load_provider_routes().contains("auth_type"),
        "provider route snapshot query must project channel auth_type"
    );
    assert!(
        PricingCatalogSql::load_provider_routes().contains("auth_config"),
        "provider route snapshot query must project credential auth_config"
    );
    assert!(
        PricingCatalogSql::load_provider_routes().contains("NULLIF(cc.credential_ref, '')"),
        "provider route snapshot query must filter routes without credential credential_ref"
    );
    assert!(
        PricingCatalogSql::load_provider_routes().contains("p.id IS NULL OR p.status = 1"),
        "provider route snapshot query must still exclude disabled provider metadata when it exists"
    );
    assert!(
        PricingCatalogSql::load_provider_routes().contains(
            "NULLIF(COALESCE(NULLIF(cc.base_url, ''), NULLIF(c.base_url, ''), p.base_url), '')"
        ),
        "provider route snapshot query must filter routes without resolved base_url"
    );
    assert!(
        PricingCatalogSql::load_provider_routes().contains("timeout_ms"),
        "provider route snapshot query must project ai_channel.timeout_ms for provider egress timeout control"
    );
    assert!(
        PricingCatalogSql::load_provider_routes().contains("retry_policy"),
        "provider route snapshot query must project ai_channel.retry_policy for provider egress retry control"
    );
    assert!(
        PricingCatalogSql::load_provider_routes().contains("COALESCE(c.health_status, 1) = 1")
            && PricingCatalogSql::load_provider_routes()
                .contains("$1 * INTERVAL '1 second'"),
        "provider route snapshot query must filter circuit-broken channels until the recovery probe window opens"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes().contains("base_url"),
        "channel group snapshot query must project resolved provider base_url for model-less route-scoped forwarding"
    );
    assert!(
        !PricingCatalogSql::load_upstream_account_routes().contains("ai_channel_endpoint"),
        "channel group snapshot query must not depend on channel endpoints for forwarding"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes()
            .contains("COALESCE(NULLIF(cc.base_url, ''), NULLIF(c.base_url, ''), p.base_url)"),
        "channel group snapshot query must resolve base_url from credential/channel/provider"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes().contains("JOIN ai_channel_credential cc"),
        "channel group snapshot query must expand one callable route per active channel credential"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes().contains("cc.id AS credential_id")
            && PricingCatalogSql::load_upstream_account_routes().contains(
                "COALESCE(NULLIF(c.credential_rotation_strategy, ''), 'default') AS credential_rotation"
            ),
        "channel group snapshot query must project credential identity and channel rotation strategy"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes()
            .contains("COALESCE(NULLIF(c.region_code, ''), 'global') AS region_code"),
        "channel group snapshot query must project explicit route region context for pricing and usage"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes()
            .contains("LEFT JOIN ai_provider p"),
        "channel group snapshot query must allow channel-owned base_url routes when provider registry metadata is absent"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes().contains("FROM ai_channel c"),
        "channel group snapshot query must read active AI channels for callable forwarding"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes().contains("ai_upstream_account_group_member"),
        "channel group snapshot query must derive group membership from ai_upstream_account_group_member"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes().contains("ai_upstream_account_group_resource"),
        "channel group snapshot query must derive group resource scope from ai_upstream_account_group_resource"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes().contains("ai_channel_resource"),
        "channel group snapshot query must derive channel resource scope from ai_channel_resource"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes().contains("ai_resource_group_item"),
        "channel group snapshot query must expand resource group members when building routing scopes"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes().contains("apiScope"),
        "channel group snapshot query must include API scope separately from modality capability scope"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes().contains("matched_resource_scope"),
        "channel group snapshot query must route from the intersection of channel and group resource scopes"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes().contains("resource_group_tree")
            && PricingCatalogSql::load_upstream_account_routes()
                .contains("routing_resource_reference")
            && PricingCatalogSql::load_upstream_account_routes()
                .contains("child_resource_group_code"),
        "channel group snapshot query must recursively expand reusable resource groups"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes().contains("r.vendor_code")
            && PricingCatalogSql::load_upstream_account_routes()
                .contains("gr.vendor_code = cr.vendor_code")
            && PricingCatalogSql::load_upstream_account_routes()
                .contains("gr.resource_type = 'vendor' OR cr.resource_type = 'vendor'"),
        "channel group snapshot query must allow vendor resources to intersect with more specific vendor-owned resources"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes()
            .contains("gr.resource_type = 'api_endpoint' OR cr.resource_type = 'api_endpoint'")
            && PricingCatalogSql::load_upstream_account_routes()
                .contains("gr.resource_type = 'modality' OR cr.resource_type = 'modality'"),
        "channel group snapshot query must not match distinct model resources only by shared API or modality"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes().contains("'__deny__'"),
        "channel group snapshot query must deny routes when channel/group resources do not overlap"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes().contains("COALESCE(b.enabled, true)")
            && PricingCatalogSql::load_upstream_account_routes()
                .contains("COALESCE(member.enabled, true)"),
        "channel group snapshot query must exclude disabled group-channel bindings"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes().contains("c.timeout_ms AS timeout_ms")
            && PricingCatalogSql::load_upstream_account_routes()
                .contains("c.retry_policy::text AS retry_policy_json"),
        "channel group snapshot query must project account timeout and retry policy"
    );
    assert!(
        !PricingCatalogSql::load_upstream_account_routes().contains("FROM ai_route_candidate b"),
        "channel group snapshot query must not derive resource authorization from route candidate projections"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes().contains("secret_ref"),
        "channel group snapshot query must project credential credential_ref as secret_ref"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes().contains("auth_type"),
        "channel group snapshot query must project channel auth_type"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes().contains("auth_config"),
        "channel group snapshot query must project credential auth_config"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes().contains("NULLIF(cc.credential_ref, '')"),
        "channel group snapshot query must filter channels without credential credential_ref"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes().contains("p.id IS NULL OR p.status = 1"),
        "channel route snapshot query must still exclude disabled provider metadata when it exists"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes().contains(
            "NULLIF(COALESCE(NULLIF(cc.base_url, ''), NULLIF(c.base_url, ''), p.base_url), '')"
        ),
        "channel route snapshot query must filter channels without resolved base_url"
    );
    assert!(
        PricingCatalogSql::load_upstream_account_routes()
            .contains("COALESCE(c.health_status, 1) = 1")
            && PricingCatalogSql::load_upstream_account_routes()
                .contains("$1 * INTERVAL '1 second'"),
        "channel route snapshot query must filter circuit-broken channels until the recovery probe window opens"
    );
    assert!(
        !PricingCatalogSql::load_upstream_account_routes().contains("modelScope")
            && PricingCatalogSql::load_upstream_account_routes().contains("apiScope")
            && PricingCatalogSql::load_upstream_account_routes().contains("capabilities"),
        "channel route snapshot query must scope account-pool bindings by API and capability, not direct model bindings"
    );
    assert!(
        PricingCatalogSql::load_routing_policies().contains("default_profile_id"),
        "routing policy snapshot query must project the default active profile"
    );
    assert!(
        PricingCatalogSql::load_routing_rules().contains("candidate_account_groups"),
        "routing rule snapshot query must project candidate account-pool channels"
    );
    assert!(
        PricingCatalogSql::load_routing_rules().contains("fallback_chain"),
        "routing rule snapshot query must project configured fallback account-pool channels"
    );
}

#[test]
fn provider_route_queries_inherit_only_resource_definitions_by_scope_specificity() {
    let sqlite_source = include_str!("../src/infrastructure/sql/sqlite/queries.rs");
    let sqlite_query = |constant: &str| {
        sqlite_source
            .split(constant)
            .nth(1)
            .and_then(|value| value.split("\"#;").next())
            .expect("sqlite routing query must be present")
    };
    let sqlite_provider_routes = sqlite_query("pub const LOAD_PROVIDER_ROUTES: &str = r#\"");
    let sqlite_upstream_account_routes =
        sqlite_query("pub const LOAD_PROVIDER_CHANNEL_ROUTES: &str = r#\"");

    for (query_name, sql) in [
        (
            "postgres provider route snapshot",
            PricingCatalogSql::load_provider_routes(),
        ),
        (
            "postgres provider channel route snapshot",
            PricingCatalogSql::load_upstream_account_routes(),
        ),
        (
            "postgres provider route list",
            PricingCatalogSql::list_model_upstream_routes(),
        ),
        (
            "postgres provider route lookup",
            PricingCatalogSql::find_model_upstream_route(),
        ),
        ("sqlite provider route snapshot", sqlite_provider_routes),
        (
            "sqlite provider channel route snapshot",
            sqlite_upstream_account_routes,
        ),
    ] {
        for required_cte in [
            "routing_scope_owner AS (",
            "resource_group_candidate AS (",
            "effective_resource_group AS (",
            "resource_group_tree AS (",
            "resource_reference_target AS (",
            "resource_candidate AS (",
        ] {
            assert!(
                sql.contains(required_cte),
                "{query_name} must contain {required_cte}"
            );
        }
        assert!(
            sql.contains("active_channel_resource AS (")
                || sql.contains("active_routing_resource_binding AS ("),
            "{query_name} must start from active exact-scope routing bindings"
        );
        assert!(
            sql.contains("ROW_NUMBER() OVER (") && sql.contains("WHERE candidate_rank = 1"),
            "{query_name} must keep only the most specific definition for each stable code"
        );
        assert!(
            sql.contains("resource_group.tenant_id = owner.tenant_id AND resource_group.organization_id = owner.organization_id")
                && sql.contains("owner.tenant_id > 0 AND resource_group.tenant_id = owner.tenant_id AND resource_group.organization_id = 0")
                && sql.contains("resource_group.tenant_id = 0 AND resource_group.organization_id = 0"),
            "{query_name} must resolve resource groups through exact organization, tenant, then platform scope"
        );
        assert!(
            sql.contains("resource.tenant_id = reference.scope_tenant_id AND resource.organization_id = reference.scope_organization_id")
                && sql.contains("reference.scope_tenant_id > 0")
                && sql.contains("resource.tenant_id = reference.scope_tenant_id")
                && sql.contains("resource.organization_id = 0")
                && sql.contains("resource.tenant_id = 0 AND resource.organization_id = 0"),
            "{query_name} must resolve resources through exact organization, tenant, then platform scope"
        );
        assert!(
            sql.contains("(resource_group.tenant_id > 0 OR resource_group.organization_id = 0)")
                && sql.contains("(resource.tenant_id > 0 OR resource.organization_id = 0)"),
            "{query_name} must reject invalid platform-tenant organization definitions"
        );
        assert!(
            (sql.contains("referenced_group.resource_group_id = cr.resource_group_id")
                || sql.contains(
                    "referenced_group.resource_group_id = binding.resource_group_id"
                ))
                && sql.contains("referenced_resource.id = reference.resource_id"),
            "{query_name} must resolve explicit visible resource and resource-group IDs to stable codes"
        );
        for active_filter in [
            "resource_group.deleted_at IS NULL",
            "resource_group.status = 1",
            "item.deleted_at IS NULL",
            "item.status = 1",
            "referenced_resource.deleted_at IS NULL",
            "referenced_resource.status = 1",
            "resource.deleted_at IS NULL",
            "resource.status = 1",
        ] {
            assert!(
                sql.contains(active_filter),
                "{query_name} must enforce {active_filter}"
            );
        }
        assert!(
            sql.contains("cr.tenant_id AS scope_tenant_id")
                && sql.contains("cr.organization_id AS scope_organization_id")
                && sql.contains("scope_tenant_id AS tenant_id")
                && sql.contains("scope_organization_id AS organization_id"),
            "{query_name} must preserve the exact binding owner after definition inheritance"
        );
    }

    for (query_name, sql) in [
        (
            "postgres provider route snapshot",
            PricingCatalogSql::load_provider_routes(),
        ),
        (
            "postgres provider channel route snapshot",
            PricingCatalogSql::load_upstream_account_routes(),
        ),
        ("sqlite provider route snapshot", sqlite_provider_routes),
        (
            "sqlite provider channel route snapshot",
            sqlite_upstream_account_routes,
        ),
    ] {
        assert!(
            sql.contains("cc.tenant_id = c.tenant_id")
                && sql.contains("cc.organization_id = c.organization_id")
                && sql.contains("cc.account_id = c.id"),
            "{query_name} must keep credentials exact to the channel owner"
        );
        assert!(
            sql.contains("p.tenant_id = c.tenant_id")
                && sql.contains("p.organization_id = c.organization_id"),
            "{query_name} must keep provider metadata exact to the channel owner"
        );
    }
}

#[test]
fn provider_route_snapshot_derives_model_routes_from_normalized_channel_facts() {
    let sql = PricingCatalogSql::load_provider_routes();

    assert!(
        !sql.contains("ai_route_candidate"),
        "provider route snapshot must not depend on the precomputed route candidate projection; it would grow as upstream_account_group x api x model data"
    );
    for required_table in [
        "ai_channel_resource",
        "ai_resource",
        "ai_channel",
        "ai_provider",
    ] {
        assert!(
            sql.contains(required_table),
            "provider route snapshot must derive callable model routes from normalized table {required_table}"
        );
    }
    assert!(
        sql.contains(
            "COALESCE(NULLIF(scope.catalog_key, ''), NULLIF(scope.model, '')) AS catalog_key"
        )
            && sql.contains("COALESCE(NULLIF(c.region_code, ''), 'global') AS region_code"),
        "provider route snapshot must keep model identity region-free and resolve region only from account context"
    );
}

#[test]
fn row_mappers_convert_sql_rows_into_domain_objects() {
    let vendor = ModelVendorRow {
        vendor_code: "openai".to_owned(),
        display_name: "OpenAI".to_owned(),
    }
    .try_into_domain()
    .unwrap();
    assert_eq!(ModelVendor::OpenAi, vendor.vendor);

    let model = ai_model_row(
        "gpt-4o-mini",
        "GPT-4o mini",
        "openai",
        r#"["chat","tools","json_schema"]"#,
    )
    .try_into_domain()
    .unwrap();
    assert_eq!(vec!["chat", "tools", "json_schema"], model.capabilities);
    assert_eq!(Some("Fast commercial model."), model.description.as_deref());
    assert_eq!(vec!["text", "image"], model.modalities);
    assert_eq!(Some("openai_responses"), model.api_format.as_deref());
    assert_eq!(Some(128000), model.context_tokens);

    let route = ModelUpstreamRouteRow {
        catalog_key: "openai/gpt-4o-mini".to_owned(),
        model: "gpt-4o-mini".to_owned(),
        api_code: Some("openai.chat_completions".to_owned()),
        region_code: "global".to_owned(),
        supplier_code: "openrouter".to_owned(),
        account_id: 3001,
        credential_id: Some(300101),
        credential_rotation: "priority".to_owned(),
        credential_priority: 10,
        credential_weight: 100,
        provider_model: "gpt-4o-mini".to_owned(),
        base_url: Some("http://provider-proxy.internal/openrouter".to_owned()),
        secret_ref: Some("vault://providers/openrouter/account/main".to_owned()),
        auth_type: Some("bearer".to_owned()),
        auth_config_json: Some("{}".to_owned()),
        timeout_ms: Some(30_000),
        retry_policy_json: Some(
            r#"{"max_attempts":3,"retryable_status_codes":[429,500,503],"backoff_ms":25}"#
                .to_owned(),
        ),
    }
    .try_into_domain()
    .unwrap();
    assert_eq!("openrouter", route.supplier_code);
    assert_eq!(
        Some("http://provider-proxy.internal/openrouter"),
        route.base_url.as_deref()
    );
    assert_eq!(
        Some("vault://providers/openrouter/account/main"),
        route.secret_ref.as_deref()
    );
    assert_eq!(Some(30_000), route.timeout_ms);
    assert_eq!(
        Some(ProviderRetryPolicy::new(3, vec![429, 500, 503], 25).unwrap()),
        route.retry_policy
    );
    assert_eq!(ProviderAuthType::Bearer, route.auth_profile.auth_type);
    assert_eq!(None, route.auth_profile.name);

    let channel_route = UpstreamAccountRouteRow {
        supplier_code: "openrouter".to_owned(),
        account_id: 3001,
        credential_id: Some(300101),
        credential_rotation: "priority".to_owned(),
        credential_priority: 10,
        credential_weight: 100,
        account_code: Some("openrouter-main".to_owned()),
        region_code: "cn".to_owned(),
        supplier_id: Some(4001),
        supplier_code: Some("cn-site".to_owned()),
        endpoint_id: Some(4101),
        endpoint_code: Some("cn-chat".to_owned()),
        base_url: Some("http://provider-proxy.internal/openrouter".to_owned()),
        secret_ref: Some("vault://providers/openrouter/account/main".to_owned()),
        auth_type: Some("header".to_owned()),
        auth_config_json: Some(r#"{"name":"x-api-key"}"#.to_owned()),
        timeout_ms: Some(30_000),
        retry_policy_json: Some(
            r#"{"max_attempts":3,"retryable_status_codes":[429,500,503],"backoff_ms":25}"#
                .to_owned(),
        ),
        account_group_bindings_json: r#"[{"groupId":10,"priority":7,"weight":80,"apiScope":["openai.chat_completions"],"capabilities":["llm"]}]"#.to_owned(),
        channel_health_status: 1,
        credential_health_status: 1,
    }
    .try_into_domain()
    .unwrap();
    assert_eq!("openrouter", channel_route.supplier_code);
    assert_eq!(3001, channel_route.account_id);
    assert_eq!(
        Some("openrouter-main"),
        channel_route.account_code.as_deref()
    );
    assert_eq!("cn", channel_route.region_code);
    assert_eq!(Some(4001), channel_route.supplier_id);
    assert_eq!(Some("cn-site"), channel_route.supplier_code.as_deref());
    assert_eq!(Some(4101), channel_route.endpoint_id);
    assert_eq!(Some("cn-chat"), channel_route.endpoint_code.as_deref());
    assert_eq!(
        Some("http://provider-proxy.internal/openrouter"),
        channel_route.base_url.as_deref()
    );
    assert_eq!(
        Some("vault://providers/openrouter/account/main"),
        channel_route.secret_ref.as_deref()
    );
    assert_eq!(Some(30_000), channel_route.timeout_ms);
    assert_eq!(
        Some(ProviderRetryPolicy::new(3, vec![429, 500, 503], 25).unwrap()),
        channel_route.retry_policy
    );
    assert_eq!(
        ProviderAuthType::Header,
        channel_route.auth_profile.auth_type
    );
    assert_eq!(
        Some("x-api-key"),
        channel_route.auth_profile.name.as_deref()
    );
    assert_eq!(1, channel_route.account_group_bindings.len());
    assert_eq!(10, channel_route.account_group_bindings[0].group_id);
    assert_eq!(7, channel_route.account_group_bindings[0].priority);
    assert_eq!(80, channel_route.account_group_bindings[0].weight);
    assert_eq!(
        vec!["openai.chat_completions".to_owned()],
        channel_route.account_group_bindings[0].api_scope
    );
    assert_eq!(
        vec!["llm".to_owned()],
        channel_route.account_group_bindings[0].capabilities
    );

    let api_key = GatewayApiKeyRow {
        id: 100,
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        group_id: 10,
        account_group_bindings_json: r#"[{"groupId":20,"groupCode":"premium-group","bindingRole":"route","routingStrategy":"auto","priority":1,"weight":100},{"groupId":10,"groupCode":"standard-group","bindingRole":"route","routingStrategy":"auto","priority":50,"weight":10}]"#.to_owned(),
        name: "Production Key".to_owned(),
        key_prefix: "sk-test".to_owned(),
        key_display_masked: "sk-test********ABCD".to_owned(),
        key_hash: "hash:sk-test".to_owned(),
        copyable_key: Some("sk-test-secret".to_owned()),
        policy_id: Some(700),
        quota_policy_id: Some(900),
        created_at: "2026-04-10 20:55:41".to_owned(),
        expire_at: Some("2027-01-01 00:00:00".to_owned()),
        status_code: 1,
        default_for_runtime: false,
    }
    .into_domain();
    assert_eq!(10, api_key.default_account_group_id);
    assert_eq!(2, api_key.account_group_bindings.len());
    assert_eq!(20, api_key.account_group_bindings[0].group_id);
    assert_eq!("premium-group", api_key.account_group_bindings[0].group_code);
    assert_eq!("route", api_key.account_group_bindings[0].binding_role);
    assert_eq!("auto", api_key.account_group_bindings[0].routing_strategy);
    assert_eq!(1, api_key.account_group_bindings[0].priority);
    assert_eq!(100, api_key.account_group_bindings[0].weight);
    assert_eq!("hash:sk-test", api_key.key_hash);
    assert_eq!("Production Key", api_key.name);
    assert_eq!("sk-test********ABCD", api_key.key_display_masked);

    let access_policy = GatewayAccessPolicyRow {
        id: 700,
        allowed_capabilities_json: r#"["text","image"]"#.to_owned(),
        ip_allowlist_json: r#"["192.168.1.1","10.0.0.0/24"]"#.to_owned(),
    }
    .try_into_domain()
    .unwrap();
    assert_eq!(vec!["text", "image"], access_policy.allowed_capabilities);

    let quota_policy = QuotaPolicyRow {
        id: 900,
        quota_limit: Some("1000.000000".to_owned()),
        requests_per_second: None,
        requests_per_day: None,
        burst_limit: None,
    }
    .try_into_domain()
    .unwrap();
    assert_eq!(
        "1000.000000",
        quota_policy.quota_limit.unwrap().to_fixed_string(6)
    );

    let metric_snapshot = UpstreamAccountGroupMetricSnapshotRow {
        group_id: 10,
        capacity_used: Some("37.500000".to_owned()),
        capacity_limit: Some("1000.000000".to_owned()),
        usage_amount_total: Some("37.500000".to_owned()),
        snapshot_at: Some("2026-04-29 00:00:00".to_owned()),
    }
    .try_into_domain()
    .unwrap();
    assert_eq!(
        "37.500000",
        metric_snapshot
            .usage_amount_total
            .unwrap()
            .to_fixed_string(6)
    );

    let group = UpstreamAccountGroupRow {
        id: 10,
        tenant_id: 100001,
        organization_id: 0,
        name: "Standard Group".to_owned(),
        code: "standard-group".to_owned(),
        pricing_plan_code: "standard".to_owned(),
        rate_multiplier: "1.200000".to_owned(),
        official_price_multiplier: "1.100000".to_owned(),
    }
    .try_into_domain()
    .unwrap();
    assert_eq!(
        DecimalValue::parse("1.100000").unwrap(),
        group.official_price_multiplier
    );

    let plan = PricingPlanRow {
        tenant_id: 0,
        organization_id: 0,
        plan_code: "standard".to_owned(),
        base_price_side_code: "official_reference".to_owned(),
        default_multiplier: "1.300000".to_owned(),
        default_markup_amount: "0.020000".to_owned(),
        currency: "USD".to_owned(),
    }
    .try_into_domain()
    .unwrap();
    assert_eq!(PriceSide::OfficialReference, plan.base_price_side);

    let price = ModelPriceRow {
        tenant_id: 100001,
        organization_id: 0,
        catalog_key: "openai/gpt-4o-mini".to_owned(),
        model: "gpt-4o-mini".to_owned(),
        region_code: "global".to_owned(),
        price_side_code: "upstream_cost".to_owned(),
        billing_meter_code: "llm_input_token".to_owned(),
        unit_price: "0.110000".to_owned(),
        currency: "USD".to_owned(),
        supplier_code: Some("openrouter".to_owned()),
        account_id: Some(3001),
        pricing_plan_code: None,
    }
    .try_into_domain()
    .unwrap();
    assert_eq!(PriceSide::UpstreamCost, price.price_side);
    assert_eq!(BillingMeter::LlmInputToken, price.billing_meter);
    assert_eq!("global", price.region_code);
    assert_eq!("0.110000", price.unit_price.to_fixed_string(6));

    let routing_policy = RoutingPolicyRow {
        id: 9001,
        tenant_id: 100001,
        organization_id: 0,
        policy_code: "standard-group-routing".to_owned(),
        policy_scope: 5,
        subject_id: Some(10),
        capability: Some(1),
        default_profile_id: Some(9101),
        fallback_mode: Some(1),
    }
    .try_into_domain()
    .unwrap();
    assert_eq!(
        RoutingPolicyScope::UpstreamAccountGroup,
        routing_policy.policy_scope
    );
    assert_eq!(Some(RoutingCapability::Chat), routing_policy.capability);
    assert_eq!(
        Some(RoutingFallbackMode::None),
        routing_policy.fallback_mode
    );
    assert_eq!(Some(10), routing_policy.subject_id);
    assert_eq!(Some(9101), routing_policy.default_profile_id);

    let routing_rule = RoutingRuleRow {
        id: 9102,
        tenant_id: 100001,
        organization_id: 0,
        profile_id: 9101,
        rule_code: "gpt-4o-mini-account-pool".to_owned(),
        priority: 10,
        match_expression_json: r#"{"catalogKey":"openai/gpt-4o-mini"}"#.to_owned(),
        target_model: Some("openai/gpt-4o-mini".to_owned()),
        candidate_account_groups_json: r#"[{"account_id":3001,"weight":100}]"#.to_owned(),
        fallback_chain_json: r#"[{"channelId":3002,"weight":50}]"#.to_owned(),
        constraints_json: r#"{"max_latency_ms":30000}"#.to_owned(),
    }
    .try_into_domain()
    .unwrap();
    assert!(routing_rule.matches_catalog_key("openai/gpt-4o-mini", "gpt-4o-mini"));
    assert_eq!(
        vec![RouteCandidate::new(3001, 100)],
        routing_rule.candidate_account_groups
    );
    assert_eq!(
        vec![RouteCandidate::new(3002, 50)],
        routing_rule.fallback_chain
    );
}

#[test]
fn row_mappers_reject_invalid_decimal_and_unknown_price_side() {
    let invalid_group = UpstreamAccountGroupRow {
        id: 10,
        tenant_id: 100001,
        organization_id: 0,
        name: "Standard Group".to_owned(),
        code: "standard-group".to_owned(),
        pricing_plan_code: "standard".to_owned(),
        rate_multiplier: "not-a-decimal".to_owned(),
        official_price_multiplier: "1.000000".to_owned(),
    };
    assert!(invalid_group.try_into_domain().is_err());

    let invalid_price = ModelPriceRow {
        tenant_id: 0,
        organization_id: 0,
        catalog_key: "openai/gpt-4o-mini".to_owned(),
        model: "gpt-4o-mini".to_owned(),
        region_code: "global".to_owned(),
        price_side_code: "wrong_side".to_owned(),
        billing_meter_code: "llm_input_token".to_owned(),
        unit_price: "0.110000".to_owned(),
        currency: "USD".to_owned(),
        supplier_code: None,
        account_id: None,
        pricing_plan_code: None,
    };
    assert!(invalid_price.try_into_domain().is_err());

    let invalid_timeout = ModelUpstreamRouteRow {
        catalog_key: "openai/gpt-4o-mini".to_owned(),
        model: "gpt-4o-mini".to_owned(),
        api_code: Some("openai.chat_completions".to_owned()),
        region_code: "global".to_owned(),
        supplier_code: "openrouter".to_owned(),
        account_id: 3001,
        credential_id: Some(300101),
        credential_rotation: "priority".to_owned(),
        credential_priority: 10,
        credential_weight: 100,
        provider_model: "gpt-4o-mini".to_owned(),
        base_url: Some("http://provider-proxy.internal/openrouter".to_owned()),
        secret_ref: Some("vault://providers/openrouter/account/main".to_owned()),
        auth_type: None,
        auth_config_json: None,
        timeout_ms: Some(0),
        retry_policy_json: None,
    };
    let error = invalid_timeout.try_into_domain().unwrap_err();
    assert!(error.to_string().contains("timeout_ms must be positive"));

    let invalid_retry_policy = ModelUpstreamRouteRow {
        catalog_key: "openai/gpt-4o-mini".to_owned(),
        model: "gpt-4o-mini".to_owned(),
        api_code: Some("openai.chat_completions".to_owned()),
        region_code: "global".to_owned(),
        supplier_code: "openrouter".to_owned(),
        account_id: 3001,
        credential_id: Some(300101),
        credential_rotation: "priority".to_owned(),
        credential_priority: 10,
        credential_weight: 100,
        provider_model: "gpt-4o-mini".to_owned(),
        base_url: Some("http://provider-proxy.internal/openrouter".to_owned()),
        secret_ref: Some("vault://providers/openrouter/account/main".to_owned()),
        auth_type: None,
        auth_config_json: None,
        timeout_ms: Some(30_000),
        retry_policy_json: Some(r#"{"max_attempts":0,"retryable_status_codes":[503]}"#.to_owned()),
    };
    let error = invalid_retry_policy.try_into_domain().unwrap_err();
    assert!(error.to_string().contains("ai_channel.retry_policy"));
}

#[test]
fn model_provider_route_row_normalizes_catalog_key_provider_model_to_native_model() {
    let route = ModelUpstreamRouteRow {
        catalog_key: "openai/gpt-5.5".to_owned(),
        model: "gpt-5.5".to_owned(),
        api_code: Some("openai.chat_completions".to_owned()),
        region_code: "global".to_owned(),
        supplier_code: "openai".to_owned(),
        account_id: 3001,
        credential_id: Some(300101),
        credential_rotation: "priority".to_owned(),
        credential_priority: 10,
        credential_weight: 100,
        provider_model: "openai/gpt-5.5".to_owned(),
        base_url: Some("http://provider-proxy.internal/openai".to_owned()),
        secret_ref: Some("vault://providers/openai/account/main".to_owned()),
        auth_type: Some("bearer".to_owned()),
        auth_config_json: Some("{}".to_owned()),
        timeout_ms: None,
        retry_policy_json: None,
    }
    .try_into_domain()
    .unwrap();

    assert_eq!(
        "gpt-5.5", route.provider_model,
        "default provider route mappings must send provider-native model ids upstream"
    );
}

#[test]
fn model_provider_route_row_normalizes_slash_catalog_provider_model_to_native_model() {
    let route = ModelUpstreamRouteRow {
        catalog_key: "openrouter/anthropic/claude-3-opus".to_owned(),
        model: "anthropic/claude-3-opus".to_owned(),
        api_code: Some("openai.chat_completions".to_owned()),
        region_code: "global".to_owned(),
        supplier_code: "openrouter".to_owned(),
        account_id: 3001,
        credential_id: Some(300101),
        credential_rotation: "priority".to_owned(),
        credential_priority: 10,
        credential_weight: 100,
        provider_model: "openrouter/anthropic/claude-3-opus".to_owned(),
        base_url: Some("http://provider-proxy.internal/openrouter".to_owned()),
        secret_ref: Some("vault://providers/openrouter/account/main".to_owned()),
        auth_type: Some("bearer".to_owned()),
        auth_config_json: Some("{}".to_owned()),
        timeout_ms: None,
        retry_policy_json: None,
    }
    .try_into_domain()
    .unwrap();

    assert_eq!(
        "anthropic/claude-3-opus", route.provider_model,
        "catalog keys with slash-containing provider-native ids must drop only vendor before relay"
    );
}

#[test]
fn sql_catalog_snapshot_implements_pricing_catalog_from_database_rows() {
    let snapshot = SqlPricingCatalogSnapshot::from_rows(priced_catalog_rows()).unwrap();
    let api_key = snapshot.find_api_key_by_hash("hash:sk-test").unwrap();
    assert_eq!(100, api_key.id);
    let service = ModelCatalogQueryService::new(&snapshot);

    let page = service
        .list_models(ListModelCatalogQuery {
            api_key_id: Some(100),
            billing_meter: BillingMeter::LlmInputToken,
            vendor_code: Some("openai".to_owned()),
            vendor_codes: Vec::new(),
            modalities: Vec::new(),
            capabilities: Vec::new(),
            categories: Vec::new(),
            groups: Vec::new(),
            search_query: None,
            page_size: None,
            offset: None,
        })
        .unwrap();

    assert_eq!(1, page.items.len());
    let item = &page.items[0];
    assert_eq!("gpt-4o-mini", item.model);
    assert_eq!(vec!["azure_openai", "openrouter"], item.supplier_codes);
    assert_eq!(
        "0.110000",
        item.lowest_upstream_cost_unit_price.as_deref().unwrap()
    );

    match &item.price_availability {
        PriceAvailability::Available(price) => {
            assert_eq!("standard-group", price.group_code);
            assert_eq!("standard", price.pricing_plan_code);
            assert_eq!("0.198000", price.customer_unit_price);
            assert_eq!("0.088000", price.gross_margin_per_unit.as_deref().unwrap());
        }
        PriceAvailability::Unavailable { reason } => {
            panic!("snapshot must preserve pricing rows: {reason}");
        }
    }

    let resolved = PricingResolver::new(&snapshot)
        .resolve(ResolveModelPriceQuery {
            api_key_id: 100,
            account_group_id: None,
            model: "openai/gpt-4o-mini".to_owned(),
            billing_meter: BillingMeter::LlmInputToken,
            supplier_code: Some("openrouter".to_owned()),
            account_id: Some(3001),
            region_code: None,
        })
        .expect("tenant-scoped provider/channel upstream price must resolve");
    assert_eq!(
        "0.110000",
        resolved
            .upstream_cost
            .as_ref()
            .expect("tenant upstream price must be retained")
            .unit_price
            .to_fixed_string(6)
    );

    let public_page = service
        .list_models(ListModelCatalogQuery {
            api_key_id: None,
            billing_meter: BillingMeter::LlmInputToken,
            vendor_code: Some("openai".to_owned()),
            vendor_codes: Vec::new(),
            modalities: Vec::new(),
            capabilities: Vec::new(),
            categories: Vec::new(),
            groups: Vec::new(),
            search_query: None,
            page_size: None,
            offset: None,
        })
        .unwrap();
    let public_item = &public_page.items[0];
    assert_eq!(
        None, public_item.lowest_upstream_cost_unit_price,
        "anonymous model catalog must not expose tenant upstream costs"
    );
    assert!(matches!(
        public_item.price_availability,
        PriceAvailability::Unavailable { .. }
    ));

    let policies = snapshot.list_routing_policies();
    assert_eq!(1, policies.len());
    assert_eq!(RoutingPolicyScope::UpstreamAccountGroup, policies[0].policy_scope);
    assert_eq!(Some(10), policies[0].subject_id);

    let rules = snapshot.list_routing_rules(9101);
    assert_eq!(1, rules.len());
    assert_eq!(
        vec![RouteCandidate::new(3001, 100)],
        rules[0].candidate_account_groups
    );

    let channel_routes = snapshot.list_upstream_account_routes();
    assert_eq!(2, channel_routes.len());
    assert_eq!(3001, channel_routes[0].account_id);
    assert_eq!(
        Some("vault://providers/openrouter/account/main"),
        channel_routes[0].secret_ref.as_deref()
    );
}

#[test]
fn sql_catalog_snapshot_isolates_pricing_scope_and_prefers_specific_rows() {
    let mut rows = priced_catalog_rows();
    rows.pricing_plans = vec![
        scoped_pricing_plan_row(0, 0, "shared", "1.000000"),
        scoped_pricing_plan_row(100001, 0, "shared", "1.100000"),
        scoped_pricing_plan_row(100001, 20, "shared", "1.200000"),
        scoped_pricing_plan_row(200002, 0, "shared", "2.000000"),
    ];
    rows.prices = vec![
        scoped_model_price_row(0, 0, "official_reference", "0.100000", None, None),
        scoped_model_price_row(100001, 0, "official_reference", "0.200000", None, None),
        scoped_model_price_row(100001, 20, "official_reference", "0.300000", None, None),
        scoped_model_price_row(100001, 20, "official_reference", "0.310000", None, None),
        scoped_model_price_row(200002, 0, "official_reference", "0.400000", None, None),
        scoped_model_price_row(
            200002,
            0,
            "upstream_cost",
            "0.010000",
            Some("foreign-provider"),
            Some(9901),
        ),
    ];

    let snapshot = SqlPricingCatalogSnapshot::from_rows(rows).unwrap();

    for (tenant_id, organization_id, expected_multiplier) in [
        (100001, 20, "1.200000"),
        (100001, 21, "1.100000"),
        (200002, 99, "2.000000"),
        (300003, 30, "1.000000"),
    ] {
        let plan = snapshot
            .find_pricing_plan_for_scope(tenant_id, organization_id, "shared")
            .expect("visible pricing plan must resolve");
        assert_eq!(
            DecimalValue::parse(expected_multiplier).unwrap(),
            plan.default_multiplier,
            "pricing plan resolution must use exact organization, tenant-global, then platform scope"
        );
    }
    assert_eq!(
        DecimalValue::parse("1.000000").unwrap(),
        snapshot
            .find_pricing_plan("shared")
            .expect("legacy plan lookup must expose only platform scope")
            .default_multiplier
    );

    for (tenant_id, organization_id, expected_price) in [
        (100001, 20, "0.300000"),
        (100001, 21, "0.200000"),
        (200002, 99, "0.400000"),
        (300003, 30, "0.100000"),
    ] {
        let prices = snapshot.list_model_prices_for_scope(
            tenant_id,
            organization_id,
            "openai/gpt-4o-mini",
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
        );
        assert_eq!(
            1,
            prices.len(),
            "one business price identity must remain after scope selection and ordered-row deduplication"
        );
        assert_eq!(expected_price, prices[0].unit_price.to_fixed_string(6));
    }

    assert!(
        snapshot
            .list_model_prices_for_scope(
                100001,
                20,
                "openai/gpt-4o-mini",
                PriceSide::UpstreamCost,
                BillingMeter::LlmInputToken,
            )
            .is_empty(),
        "another tenant's provider/channel price must never be visible"
    );
    assert_eq!(
        "0.100000",
        snapshot
            .find_model_price(
                "openai/gpt-4o-mini",
                PriceSide::OfficialReference,
                BillingMeter::LlmInputToken,
                None,
                None,
            )
            .expect("legacy price lookup must expose platform scope")
            .unit_price
            .to_fixed_string(6)
    );
}

#[test]
fn sql_catalog_snapshot_rejects_legacy_regional_route_identity() {
    let mut rows = priced_catalog_rows();
    rows.provider_routes.push(ModelUpstreamRouteRow {
        catalog_key: "openai/global/gpt-4o-mini".to_owned(),
        model: "gpt-4o-mini".to_owned(),
        api_code: Some("openai.chat_completions".to_owned()),
        region_code: "global".to_owned(),
        supplier_code: "legacy-region-route".to_owned(),
        account_id: 4001,
        credential_id: Some(400101),
        credential_rotation: "priority".to_owned(),
        credential_priority: 10,
        credential_weight: 100,
        provider_model: "gpt-4o-mini".to_owned(),
        base_url: Some("http://provider-proxy.internal/legacy-region-route".to_owned()),
        secret_ref: Some("vault://providers/legacy-region-route/account/main".to_owned()),
        auth_type: Some("bearer".to_owned()),
        auth_config_json: Some("{}".to_owned()),
        timeout_ms: None,
        retry_policy_json: None,
    });

    let error = match SqlPricingCatalogSnapshot::from_rows(rows) {
        Ok(_) => panic!("catalog snapshot must reject legacy regional route identity"),
        Err(error) => error,
    };
    assert!(
        error
            .to_string()
            .contains("provider route catalog_key must use vendor/model identity"),
        "{error}"
    );
}

#[test]
fn sql_catalog_snapshot_rejects_cloud_region_route_identity() {
    let mut rows = priced_catalog_rows();
    rows.provider_routes.push(ModelUpstreamRouteRow {
        catalog_key: "openai/cn-north-1/gpt-4o-mini".to_owned(),
        model: "gpt-4o-mini".to_owned(),
        api_code: Some("openai.chat_completions".to_owned()),
        region_code: "cn-north-1".to_owned(),
        supplier_code: "cn-region-route".to_owned(),
        account_id: 4002,
        credential_id: Some(400201),
        credential_rotation: "priority".to_owned(),
        credential_priority: 10,
        credential_weight: 100,
        provider_model: "gpt-4o-mini".to_owned(),
        base_url: Some("http://provider-proxy.internal/cn-region-route".to_owned()),
        secret_ref: Some("vault://providers/cn-region-route/account/main".to_owned()),
        auth_type: Some("bearer".to_owned()),
        auth_config_json: Some("{}".to_owned()),
        timeout_ms: None,
        retry_policy_json: None,
    });

    let error = match SqlPricingCatalogSnapshot::from_rows(rows) {
        Ok(_) => panic!("catalog snapshot must reject cloud regional route identity"),
        Err(error) => error,
    };
    assert!(
        error
            .to_string()
            .contains("provider route catalog_key must use vendor/model identity"),
        "{error}"
    );
}

#[test]
fn sql_catalog_snapshot_uses_base_model_identity_and_region_scoped_prices() {
    let snapshot = SqlPricingCatalogSnapshot::from_rows(priced_catalog_rows()).unwrap();

    assert!(snapshot.find_model("openai/global/gpt-4o-mini").is_none());
    assert!(snapshot
        .list_model_upstream_routes("openai/global/gpt-4o-mini")
        .is_empty());
    let price = snapshot
        .find_model_price(
            "openai/gpt-4o-mini",
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
            None,
            None,
        )
        .expect(
            "base vendor/model catalog keys must resolve price rows through explicit region_code",
        );
    assert_eq!("openai/gpt-4o-mini", price.catalog_key);
    assert_eq!("global", price.region_code);

    assert!(
        snapshot
            .find_model_price(
                "openai/global/gpt-4o-mini",
                PriceSide::OfficialReference,
                BillingMeter::LlmInputToken,
                None,
                None,
            )
            .is_none(),
        "legacy vendor/region/model price identities must not be accepted"
    );
}

#[test]
fn sql_catalog_snapshot_resolves_normalized_model_mapping_bindings() {
    let mut rows = priced_catalog_rows();
    rows.model_mappings = vec![
        ModelMappingRuleRow {
            id: 5001,
            binding_type: "global".to_owned(),
            binding_id: None,
            binding_code: None,
            source_model: "fast-chat".to_owned(),
            source_catalog_key: None,
            target_model: "openai/gpt-4o-mini".to_owned(),
            target_catalog_key: Some("openai/gpt-4o-mini".to_owned()),
            target_vendor_code: Some("openai".to_owned()),
            target_provider_model: Some("openrouter/global-fallback".to_owned()),
            target_provider_native_model: None,
            binding_sort_order: 100,
            item_sort_order: 100,
        },
        ModelMappingRuleRow {
            id: 5002,
            binding_type: "upstream_account_group".to_owned(),
            binding_id: Some(10),
            binding_code: Some("standard-group".to_owned()),
            source_model: "fast-chat".to_owned(),
            source_catalog_key: Some("openai/fast-chat".to_owned()),
            target_model: "openai/gpt-4o-mini".to_owned(),
            target_catalog_key: Some("openai/gpt-4o-mini".to_owned()),
            target_vendor_code: Some("openai".to_owned()),
            target_provider_model: Some("openrouter/group-fast".to_owned()),
            target_provider_native_model: None,
            binding_sort_order: 10,
            item_sort_order: 20,
        },
    ];
    let snapshot = SqlPricingCatalogSnapshot::from_rows(rows).unwrap();

    let resolved = snapshot
        .resolve_model_mapping(
            "openai/fast-chat",
            &ResolveModelMappingContext::new()
                .with_vendor_code("openai")
                .with_account_group_id(10)
                .with_account_group_code("standard-group"),
        )
        .expect("channel-group mapping must resolve from normalized binding rows");

    assert_eq!(ModelMappingBindingType::UpstreamAccountGroup, resolved.binding_type);
    assert_eq!("openai/gpt-4o-mini", resolved.effective_catalog_key());
    assert_eq!(
        Some("openrouter/group-fast"),
        resolved.effective_provider_model()
    );
}

#[test]
fn sql_catalog_snapshot_rejects_regional_model_mapping_catalog_keys() {
    let mut rows = priced_catalog_rows();
    rows.model_mappings.push(ModelMappingRuleRow {
        id: 5003,
        binding_type: "global".to_owned(),
        binding_id: None,
        binding_code: None,
        source_model: "legacy-fast".to_owned(),
        source_catalog_key: Some("openai/global/legacy-fast".to_owned()),
        target_model: "openai/gpt-4o-mini".to_owned(),
        target_catalog_key: Some("openai/gpt-4o-mini".to_owned()),
        target_vendor_code: Some("openai".to_owned()),
        target_provider_model: None,
        target_provider_native_model: None,
        binding_sort_order: 100,
        item_sort_order: 100,
    });

    let error = match SqlPricingCatalogSnapshot::from_rows(rows) {
        Ok(_) => panic!("regional source catalog keys must be rejected"),
        Err(error) => error,
    };
    assert!(
        error.to_string().contains(
            "ai_model_mapping_rule_item.source_catalog_key must use vendor/model identity"
        ),
        "{error}"
    );
}

#[test]
fn sql_catalog_snapshot_rejects_invalid_rows_before_serving_catalog() {
    let mut rows = priced_catalog_rows();
    rows.prices.push(ModelPriceRow {
        tenant_id: 0,
        organization_id: 0,
        catalog_key: "openai/gpt-4o-mini".to_owned(),
        model: "gpt-4o-mini".to_owned(),
        region_code: "global".to_owned(),
        price_side_code: "customer_charge".to_owned(),
        billing_meter_code: "llm_input_token".to_owned(),
        unit_price: "invalid-decimal".to_owned(),
        currency: "USD".to_owned(),
        supplier_code: None,
        account_id: None,
        pricing_plan_code: Some("standard".to_owned()),
    });

    let result = SqlPricingCatalogSnapshot::from_rows(rows);

    assert!(result.is_err());
}

#[test]
fn refreshable_sql_catalog_serves_replaced_snapshot_without_rebuilding_runtime_routes() {
    let initial_snapshot = SqlPricingCatalogSnapshot::from_rows(priced_catalog_rows()).unwrap();
    let catalog = RefreshableSqlPricingCatalog::new(initial_snapshot);

    let initial_routes = catalog.list_model_upstream_routes("openai/gpt-4o-mini");
    assert_eq!(2, initial_routes.len());
    assert!(initial_routes
        .iter()
        .any(|route| route.supplier_code == "openrouter"));

    let mut refreshed_rows = priced_catalog_rows();
    refreshed_rows
        .provider_routes
        .retain(|route| route.supplier_code != "openrouter");
    refreshed_rows
        .upstream_account_routes
        .retain(|route| route.supplier_code != "openrouter");
    let refreshed_snapshot = SqlPricingCatalogSnapshot::from_rows(refreshed_rows).unwrap();

    catalog.replace_snapshot(refreshed_snapshot);

    let refreshed_routes = catalog.list_model_upstream_routes("openai/gpt-4o-mini");
    assert_eq!(1, refreshed_routes.len());
    assert_eq!("azure_openai", refreshed_routes[0].supplier_code);
    let channel_routes = catalog.list_upstream_account_routes();
    assert_eq!(1, channel_routes.len());
    assert_eq!("azure_openai", channel_routes[0].supplier_code);
}

#[test]
fn sql_catalog_snapshot_rejects_invalid_provider_timeout_before_serving_catalog() {
    let mut rows = priced_catalog_rows();
    rows.provider_routes[0].timeout_ms = Some(-1);

    let result = SqlPricingCatalogSnapshot::from_rows(rows);

    let error = match result {
        Ok(_) => panic!("catalog snapshot must reject invalid provider timeout"),
        Err(error) => error,
    };
    assert!(error.to_string().contains("timeout_ms must be positive"));
}

#[test]
fn sql_catalog_snapshot_rejects_invalid_provider_retry_policy_before_serving_catalog() {
    let mut rows = priced_catalog_rows();
    rows.provider_routes[0].retry_policy_json =
        Some(r#"{"max_attempts":3,"retryable_status_codes":[503],"unexpected":true}"#.to_owned());

    let result = SqlPricingCatalogSnapshot::from_rows(rows);

    let error = match result {
        Ok(_) => panic!("catalog snapshot must reject invalid provider retry policy"),
        Err(error) => error,
    };
    assert!(error.to_string().contains("ai_channel.retry_policy"));
}

#[test]
fn sql_catalog_snapshot_rejects_invalid_routing_rule_json_before_serving_catalog() {
    let mut rows = priced_catalog_rows();
    rows.routing_rules[0].candidate_account_groups_json = "not-json".to_owned();

    let result = SqlPricingCatalogSnapshot::from_rows(rows);

    let error = match result {
        Ok(_) => panic!("catalog snapshot must reject invalid routing candidate channels"),
        Err(error) => error,
    };
    assert!(error.to_string().contains("candidate_account_groups"));
}

#[test]
fn sql_catalog_snapshot_rejects_unknown_routing_fallback_mode_before_serving_catalog() {
    let mut rows = priced_catalog_rows();
    rows.routing_policies[0].fallback_mode = Some(99);

    let result = SqlPricingCatalogSnapshot::from_rows(rows);

    let error = match result {
        Ok(_) => panic!("catalog snapshot must reject unknown routing fallback modes"),
        Err(error) => error,
    };
    assert!(error.to_string().contains("fallback_mode"));
}

#[test]
fn sql_catalog_snapshot_rejects_unknown_routing_capability_before_serving_catalog() {
    let mut rows = priced_catalog_rows();
    rows.routing_policies[0].capability = Some(99);

    let result = SqlPricingCatalogSnapshot::from_rows(rows);

    let error = match result {
        Ok(_) => panic!("catalog snapshot must reject unknown routing capabilities"),
        Err(error) => error,
    };
    assert!(error.to_string().contains("capability"));
}

fn priced_catalog_rows() -> PricingCatalogRows {
    PricingCatalogRows {
        vendors: vec![ModelVendorRow {
            vendor_code: "openai".to_owned(),
            display_name: "OpenAI".to_owned(),
        }],
        models: vec![ai_model_row(
            "gpt-4o-mini",
            "GPT-4o mini",
            "openai",
            r#"["chat","tools","json_schema"]"#,
        )],
        provider_routes: vec![
            ModelUpstreamRouteRow {
                catalog_key: "openai/gpt-4o-mini".to_owned(),
                model: "gpt-4o-mini".to_owned(),
                api_code: Some("openai.chat_completions".to_owned()),
                region_code: "global".to_owned(),
                supplier_code: "openrouter".to_owned(),
                account_id: 3001,
                credential_id: Some(300101),
                credential_rotation: "priority".to_owned(),
                credential_priority: 10,
                credential_weight: 100,
                provider_model: "gpt-4o-mini".to_owned(),
                base_url: Some("http://provider-proxy.internal/openrouter".to_owned()),
                secret_ref: Some("vault://providers/openrouter/account/main".to_owned()),
                auth_type: Some("bearer".to_owned()),
                auth_config_json: Some("{}".to_owned()),
                timeout_ms: Some(30_000),
                retry_policy_json: Some(
                    r#"{"max_attempts":3,"retryable_status_codes":[429,500,503],"backoff_ms":25}"#
                        .to_owned(),
                ),
            },
            ModelUpstreamRouteRow {
                catalog_key: "openai/gpt-4o-mini".to_owned(),
                model: "gpt-4o-mini".to_owned(),
                api_code: Some("openai.chat_completions".to_owned()),
                region_code: "global".to_owned(),
                supplier_code: "azure_openai".to_owned(),
                account_id: 2001,
                credential_id: Some(200101),
                credential_rotation: "priority".to_owned(),
                credential_priority: 10,
                credential_weight: 100,
                provider_model: "gpt-4o-mini".to_owned(),
                base_url: Some("http://provider-proxy.internal/azure".to_owned()),
                secret_ref: Some("vault://providers/azure/account/main".to_owned()),
                auth_type: Some("azure_openai".to_owned()),
                auth_config_json: Some("{}".to_owned()),
                timeout_ms: None,
                retry_policy_json: None,
            },
        ],
        upstream_account_routes: vec![
            UpstreamAccountRouteRow {
                supplier_code: "openrouter".to_owned(),
                account_id: 3001,
                credential_id: Some(300101),
                credential_rotation: "priority".to_owned(),
                credential_priority: 10,
                credential_weight: 100,
                account_code: Some("openrouter-main".to_owned()),
                region_code: "global".to_owned(),
                supplier_id: None,
                supplier_code: None,
                endpoint_id: None,
                endpoint_code: None,
                base_url: Some("http://provider-proxy.internal/openrouter".to_owned()),
                secret_ref: Some("vault://providers/openrouter/account/main".to_owned()),
                auth_type: Some("bearer".to_owned()),
                auth_config_json: Some("{}".to_owned()),
                timeout_ms: Some(30_000),
                retry_policy_json: Some(
                    r#"{"max_attempts":3,"retryable_status_codes":[429,500,503],"backoff_ms":25}"#
                        .to_owned(),
                ),
                account_group_bindings_json: "[]".to_owned(),
                channel_health_status: 1,
                credential_health_status: 1,
            },
            UpstreamAccountRouteRow {
                supplier_code: "azure_openai".to_owned(),
                account_id: 2001,
                credential_id: Some(200101),
                credential_rotation: "priority".to_owned(),
                credential_priority: 10,
                credential_weight: 100,
                account_code: Some("azure-main".to_owned()),
                region_code: "global".to_owned(),
                supplier_id: None,
                supplier_code: None,
                endpoint_id: None,
                endpoint_code: None,
                base_url: Some("http://provider-proxy.internal/azure".to_owned()),
                secret_ref: Some("vault://providers/azure/account/main".to_owned()),
                auth_type: Some("azure_openai".to_owned()),
                auth_config_json: Some("{}".to_owned()),
                timeout_ms: None,
                retry_policy_json: None,
                account_group_bindings_json: "[]".to_owned(),
                channel_health_status: 1,
                credential_health_status: 1,
            },
        ],
        routing_policies: vec![RoutingPolicyRow {
            id: 9001,
            tenant_id: 100001,
            organization_id: 0,
            policy_code: "standard-group-routing".to_owned(),
            policy_scope: 5,
            subject_id: Some(10),
            capability: Some(1),
            default_profile_id: Some(9101),
            fallback_mode: Some(1),
        }],
        routing_rules: vec![RoutingRuleRow {
            id: 9102,
            tenant_id: 100001,
            organization_id: 0,
            profile_id: 9101,
            rule_code: "gpt-4o-mini-account-pool".to_owned(),
            priority: 10,
            match_expression_json: r#"{"catalogKey":"openai/gpt-4o-mini"}"#.to_owned(),
            target_model: Some("openai/gpt-4o-mini".to_owned()),
            candidate_account_groups_json: r#"[{"account_id":3001,"weight":100}]"#.to_owned(),
            fallback_chain_json: "[]".to_owned(),
            constraints_json: "{}".to_owned(),
        }],
        model_mappings: Vec::<ModelMappingRuleRow>::new(),
        pricing_plans: vec![PricingPlanRow {
            tenant_id: 100001,
            organization_id: 0,
            plan_code: "standard".to_owned(),
            base_price_side_code: "official_reference".to_owned(),
            default_multiplier: "1.200000".to_owned(),
            default_markup_amount: "0.000000".to_owned(),
            currency: "USD".to_owned(),
        }],
        upstream_account_groups: vec![UpstreamAccountGroupRow {
            id: 10,
            tenant_id: 100001,
            organization_id: 0,
            name: "Standard Group".to_owned(),
            code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
            rate_multiplier: "1.000000".to_owned(),
            official_price_multiplier: "1.100000".to_owned(),
        }],
        api_keys: vec![GatewayApiKeyRow {
            id: 100,
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            group_id: 10,
            account_group_bindings_json: "[]".to_owned(),
            name: "Production Key".to_owned(),
            key_prefix: "sk-test".to_owned(),
            key_display_masked: "sk-test********ABCD".to_owned(),
            key_hash: "hash:sk-test".to_owned(),
            copyable_key: Some("sk-test-secret".to_owned()),
            policy_id: Some(700),
            quota_policy_id: Some(900),
            created_at: "2026-04-10 20:55:41".to_owned(),
            expire_at: Some("2027-01-01 00:00:00".to_owned()),
            status_code: 1,
            default_for_runtime: false,
        }],
        access_policies: vec![GatewayAccessPolicyRow {
            id: 700,
            allowed_capabilities_json: r#"["text","image"]"#.to_owned(),
            ip_allowlist_json: r#"["192.168.1.1","10.0.0.0/24"]"#.to_owned(),
        }],
        quota_policies: vec![QuotaPolicyRow {
            id: 900,
            quota_limit: Some("1000.000000".to_owned()),
            requests_per_second: None,
            requests_per_day: None,
            burst_limit: None,
        }],
        gateway_risk_rules: vec![],
        upstream_account_group_metric_snapshots: vec![UpstreamAccountGroupMetricSnapshotRow {
            group_id: 10,
            capacity_used: Some("37.500000".to_owned()),
            capacity_limit: Some("1000.000000".to_owned()),
            usage_amount_total: Some("37.500000".to_owned()),
            snapshot_at: Some("2026-04-29 00:00:00".to_owned()),
        }],
        prices: vec![
            ModelPriceRow {
                tenant_id: 0,
                organization_id: 0,
                catalog_key: "openai/gpt-4o-mini".to_owned(),
                model: "gpt-4o-mini".to_owned(),
                region_code: "global".to_owned(),
                price_side_code: "official_reference".to_owned(),
                billing_meter_code: "llm_input_token".to_owned(),
                unit_price: "0.150000".to_owned(),
                currency: "USD".to_owned(),
                supplier_code: None,
                account_id: None,
                pricing_plan_code: None,
            },
            ModelPriceRow {
                tenant_id: 100001,
                organization_id: 0,
                catalog_key: "openai/gpt-4o-mini".to_owned(),
                model: "gpt-4o-mini".to_owned(),
                region_code: "global".to_owned(),
                price_side_code: "upstream_cost".to_owned(),
                billing_meter_code: "llm_input_token".to_owned(),
                unit_price: "0.110000".to_owned(),
                currency: "USD".to_owned(),
                supplier_code: Some("openrouter".to_owned()),
                account_id: Some(3001),
                pricing_plan_code: None,
            },
            ModelPriceRow {
                tenant_id: 100001,
                organization_id: 0,
                catalog_key: "openai/gpt-4o-mini".to_owned(),
                model: "gpt-4o-mini".to_owned(),
                region_code: "global".to_owned(),
                price_side_code: "upstream_cost".to_owned(),
                billing_meter_code: "llm_input_token".to_owned(),
                unit_price: "0.120000".to_owned(),
                currency: "USD".to_owned(),
                supplier_code: Some("azure_openai".to_owned()),
                account_id: Some(2001),
                pricing_plan_code: None,
            },
        ],
    }
}

fn scoped_pricing_plan_row(
    tenant_id: i64,
    organization_id: i64,
    plan_code: &str,
    default_multiplier: &str,
) -> PricingPlanRow {
    PricingPlanRow {
        tenant_id,
        organization_id,
        plan_code: plan_code.to_owned(),
        base_price_side_code: "official_reference".to_owned(),
        default_multiplier: default_multiplier.to_owned(),
        default_markup_amount: "0.000000".to_owned(),
        currency: "USD".to_owned(),
    }
}

fn scoped_model_price_row(
    tenant_id: i64,
    organization_id: i64,
    price_side_code: &str,
    unit_price: &str,
    supplier_code: Option<&str>,
    account_id: Option<i64>,
) -> ModelPriceRow {
    ModelPriceRow {
        tenant_id,
        organization_id,
        catalog_key: "openai/gpt-4o-mini".to_owned(),
        model: "gpt-4o-mini".to_owned(),
        region_code: "global".to_owned(),
        price_side_code: price_side_code.to_owned(),
        billing_meter_code: "llm_input_token".to_owned(),
        unit_price: unit_price.to_owned(),
        currency: "USD".to_owned(),
        supplier_code: supplier_code.map(str::to_owned),
        account_id,
        pricing_plan_code: None,
    }
}
