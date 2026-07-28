use sdkwork_clawrouter_router_service::application::{
    ListModelCatalogQuery, ModelCatalogQueryService, PriceAvailability, PricingResolver,
    ResolveModelPriceQuery,
};
use sdkwork_clawrouter_router_service::domain::{BillingMeter, PriceSide};
use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqlitePricingCatalogLoader;
use sdkwork_clawrouter_router_service::ports::PricingCatalog;
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;

#[tokio::test]
async fn sqlite_loader_builds_pricing_catalog_snapshot_from_schema_tables() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();
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
            page_size: Some(200),
            offset: None,
        })
        .unwrap();

    let item = page
        .items
        .iter()
        .find(|item| item.catalog_key == "openai/gpt-4o-mini")
        .expect("database-owned custom models must be merged into the public model dictionary");
    assert_eq!("gpt-4o-mini", item.model);
    assert_eq!("openai/gpt-4o-mini", item.catalog_key);
    assert!(
        item.official_reference_prices
            .iter()
            .any(|price| price.region_code == "global"),
        "model catalog identity must stay region-free; region belongs to reference prices"
    );
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
            panic!("sqlite loader must preserve complete pricing catalog: {reason}");
        }
    }

    let routes = snapshot.list_model_upstream_routes("openai/gpt-4o-mini");
    let openrouter = routes
        .iter()
        .find(|route| route.supplier_code == "openrouter")
        .unwrap();
    assert_eq!(
        Some("http://provider-proxy.internal/openrouter"),
        openrouter.base_url.as_deref()
    );
    assert_eq!(
        Some("vault://providers/openrouter/account/main"),
        openrouter.secret_ref.as_deref()
    );
    assert_eq!(Some(30_000), openrouter.timeout_ms);
    assert_eq!(
        Some(3),
        openrouter
            .retry_policy
            .as_ref()
            .map(|policy| policy.max_attempts)
    );
    let openrouter_pool = snapshot
        .list_upstream_account_routes()
        .into_iter()
        .find(|route| route.supplier_code == "openrouter")
        .unwrap();
    assert_eq!(1, openrouter_pool.account_group_bindings.len());
    assert_eq!(10, openrouter_pool.account_group_bindings[0].group_id);
    assert_eq!(1, openrouter_pool.account_group_bindings[0].priority);
    assert_eq!(100, openrouter_pool.account_group_bindings[0].weight);
    assert_eq!(
        vec!["openai.chat_completions"],
        openrouter_pool.account_group_bindings[0].api_scope
    );
    assert_eq!(
        vec!["llm", "chat", "openai.chat_completions"],
        openrouter_pool.account_group_bindings[0].capabilities
    );

    let api_key = snapshot.find_api_key(100).unwrap();
    assert_eq!("Production Key", api_key.name);
    assert_eq!("sk-test********ABCD", api_key.key_display_masked);
    assert_eq!(1, api_key.account_group_bindings.len());
    assert_eq!(10, api_key.account_group_bindings[0].group_id);
    assert_eq!("standard-group", api_key.account_group_bindings[0].group_code);
    let policy = snapshot
        .find_access_policy(api_key.policy_id.unwrap())
        .unwrap();
    assert_eq!(vec!["text", "image"], policy.allowed_capabilities);
    assert_eq!(vec!["192.168.1.1", "10.0.0.0/24"], policy.ip_allowlist);
    let quota = snapshot
        .find_quota_policy(api_key.quota_policy_id.unwrap())
        .unwrap();
    assert_eq!("1000.000000", quota.quota_limit.unwrap().to_fixed_string(6));
    let metric = snapshot
        .find_latest_upstream_account_group_metric_snapshot(api_key.default_account_group_id)
        .unwrap();
    assert_eq!(
        "37.500000",
        metric.usage_amount_total.unwrap().to_fixed_string(6)
    );
}

#[tokio::test]
async fn sqlite_loader_anonymous_model_catalog_hides_tenant_upstream_prices() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();
    let page = ModelCatalogQueryService::new(&snapshot)
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
            page_size: Some(200),
            offset: None,
        })
        .unwrap();
    let item = page
        .items
        .iter()
        .find(|item| item.catalog_key == "openai/gpt-4o-mini")
        .expect("database-owned public model must remain listed");

    assert_eq!(
        None, item.lowest_upstream_cost_unit_price,
        "anonymous catalog must use platform 0/0 scope and hide tenant provider/channel costs"
    );
    assert_eq!(
        vec!["0.150000"],
        item.official_reference_prices
            .iter()
            .filter(|price| price.billing_meter == "llm_input_token")
            .map(|price| price.unit_price.as_str())
            .collect::<Vec<_>>()
    );
    assert!(matches!(
        item.price_availability,
        PriceAvailability::Unavailable { .. }
    ));
}

#[tokio::test]
async fn sqlite_loader_loads_explicit_api_key_upstream_account_group_bindings() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    for statement in [
        "INSERT INTO ai_upstream_account_group (id, tenant_id, organization_id, group_name, group_code, pricing_plan_code, rate_multiplier, official_price_multiplier, status) VALUES (20, 100001, 0, 'Premium Group', 'premium-group', 'standard', '1.000000', '1.000000', 1)",
        "INSERT INTO iam_gateway_api_key_upstream_account_group (id, tenant_id, organization_id, user_id, api_key_id, account_group_id, account_group_code, binding_role, routing_strategy, priority, weight, status) VALUES (2000, 100001, 0, 30, 100, 20, 'premium-group', 'route', 'auto', 1, 100, 1)",
        "INSERT INTO iam_gateway_api_key_upstream_account_group (id, tenant_id, organization_id, user_id, api_key_id, account_group_id, account_group_code, binding_role, routing_strategy, priority, weight, status) VALUES (2001, 100001, 0, 30, 100, 10, 'standard-group', 'route', 'auto', 50, 10, 1)",
    ] {
        sqlx::query(statement).execute(&pool).await.unwrap();
    }

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();

    let api_key = snapshot.find_api_key(100).unwrap();
    assert_eq!(10, api_key.default_account_group_id);
    assert_eq!(2, api_key.account_group_bindings.len());
    assert_eq!(20, api_key.account_group_bindings[0].group_id);
    assert_eq!("premium-group", api_key.account_group_bindings[0].group_code);
    assert_eq!("route", api_key.account_group_bindings[0].binding_role);
    assert_eq!("auto", api_key.account_group_bindings[0].routing_strategy);
    assert_eq!(1, api_key.account_group_bindings[0].priority);
    assert_eq!(100, api_key.account_group_bindings[0].weight);
    assert_eq!(10, api_key.account_group_bindings[1].group_id);
    assert_eq!("standard-group", api_key.account_group_bindings[1].group_code);
}

#[tokio::test]
async fn sqlite_loader_uses_credential_and_channel_deployment_for_default_account_routes() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    sqlx::query(
        r#"
        UPDATE ai_channel
        SET base_url = 'http://provider-proxy.internal/openrouter-channel',
            timeout_ms = 45000,
            retry_policy = '{"max_attempts":2,"retryable_status_codes":[429,503],"backoff_ms":10}'
        WHERE id = 3001
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        UPDATE ai_channel_credential
        SET base_url = 'http://provider-proxy.internal/openrouter-credential'
        WHERE id = 300101
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();
    let routes = snapshot
        .list_upstream_account_routes()
        .into_iter()
        .filter(|route| route.supplier_code == "openrouter" && route.account_id == 3001)
        .collect::<Vec<_>>();

    assert_eq!(1, routes.len());
    assert_eq!("global", routes[0].region_code);
    assert_eq!(
        Some("http://provider-proxy.internal/openrouter-credential"),
        routes[0].base_url.as_deref()
    );
    assert_eq!(Some(45_000), routes[0].timeout_ms);
}

#[tokio::test]
async fn sqlite_loader_matches_group_vendor_resource_to_model_api_resource() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_resource
            (id, tenant_id, organization_id, resource_code, resource_type, vendor_code, status)
        VALUES
            (9101, 100001, 0, 'vendor.openai', 'vendor', 'openai', 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        UPDATE ai_upstream_account_group_resource
        SET resource_id = 9101,
            resource_code = 'vendor.openai'
        WHERE id = 610
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();
    let channel_route = snapshot
        .list_upstream_account_routes()
        .into_iter()
        .find(|route| route.supplier_code == "openrouter")
        .expect("vendor-scoped group resource must intersect with a channel resource");

    assert_eq!(1, channel_route.account_group_bindings.len());
    assert_eq!(
        vec!["openai.chat_completions"],
        channel_route.account_group_bindings[0].api_scope
    );
    assert_eq!(
        vec!["llm", "chat", "openai.chat_completions"],
        channel_route.account_group_bindings[0].capabilities
    );
}

#[tokio::test]
async fn sqlite_loader_does_not_match_distinct_model_resources_only_by_shared_api() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_resource
            (id, tenant_id, organization_id, resource_code, resource_type, vendor_code,
             modality_code, api_code, catalog_key, model, provider_native_model, status)
        VALUES
            (9105, 100001, 0, 'model.openai.gpt-4.1.chat', 'model_api', 'openai',
             'chat', 'openai.chat_completions', 'openai/gpt-4.1', 'gpt-4.1', 'gpt-4.1', 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        UPDATE ai_channel_resource
        SET resource_id = 9105,
            resource_code = 'model.openai.gpt-4.1.chat'
        WHERE id = 620
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();
    let channel_route = snapshot
        .list_upstream_account_routes()
        .into_iter()
        .find(|route| route.supplier_code == "openrouter")
        .expect("channel route row should still load for a configured group member");

    assert_eq!(1, channel_route.account_group_bindings.len());
    assert_eq!(vec!["__deny__"], channel_route.account_group_bindings[0].api_scope);
    assert_eq!(
        vec!["__deny__"],
        channel_route.account_group_bindings[0].capabilities
    );
}

#[tokio::test]
async fn sqlite_loader_expands_direct_bundle_resource_bindings_to_member_resources() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_resource
            (id, tenant_id, organization_id, resource_code, resource_type, vendor_code, status)
        VALUES
            (9104, 100001, 0, 'bundle.openrouter.openai.standard', 'bundle', 'openai', 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_resource_group
            (id, tenant_id, organization_id, group_code, group_name, group_type, status)
        VALUES
            (9301, 100001, 0, 'bundle.openrouter.openai.standard', 'OpenRouter OpenAI Standard', 'bundle', 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_resource_group_item
            (id, tenant_id, organization_id, resource_group_id, resource_group_code,
             item_type, resource_id, resource_code, status)
        VALUES
            (9302, 100001, 0, 9301, 'bundle.openrouter.openai.standard',
             'resource', 9102, 'model.openai.gpt-4o-mini.chat', 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        UPDATE ai_upstream_account_group_resource
        SET resource_id = 9104,
            resource_code = 'bundle.openrouter.openai.standard'
        WHERE id = 610
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        UPDATE ai_channel_resource
        SET resource_id = 9104,
            resource_code = 'bundle.openrouter.openai.standard'
        WHERE id = 620
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();
    let channel_route = snapshot
        .list_upstream_account_routes()
        .into_iter()
        .find(|route| route.supplier_code == "openrouter")
        .expect("bundle resource binding must keep openrouter route callable");

    assert_eq!(1, channel_route.account_group_bindings.len());
    assert_eq!(
        vec!["openai.chat_completions"],
        channel_route.account_group_bindings[0].api_scope
    );
    assert_eq!(
        vec!["llm", "chat", "openai.chat_completions"],
        channel_route.account_group_bindings[0].capabilities
    );
}

#[tokio::test]
async fn sqlite_loader_excludes_disabled_upstream_account_group_members_from_channel_routes() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    sqlx::query("UPDATE ai_upstream_account_group_member SET enabled = 0 WHERE id = 600")
        .execute(&pool)
        .await
        .unwrap();

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();

    assert!(
        snapshot
            .list_upstream_account_routes()
            .into_iter()
            .all(|route| route.supplier_code != "openrouter"),
        "disabled group-channel bindings must not leave callable channel routes in the runtime snapshot"
    );
}

#[tokio::test]
async fn sqlite_loader_treats_rfc3339_effective_from_as_active_timestamp() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    sqlx::query(
        r#"
        UPDATE ai_model_pricing
        SET effective_from = strftime('%Y-%m-%dT00:00:00Z', 'now')
        WHERE id = 1
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();

    let price = snapshot
        .find_model_price(
            "openai/gpt-4o-mini",
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
            None,
            None,
        )
        .expect("RFC3339 effective_from at today's midnight must be active in SQLite");

    assert_eq!("0.150000", price.unit_price.to_fixed_string(6));
}

#[tokio::test]
async fn sqlite_loader_applies_pricing_scope_specificity_and_sql_priority() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    for statement in [
        r#"
        INSERT INTO ai_pricing_plan
            (id, tenant_id, organization_id, plan_code, base_price_side,
             default_multiplier, default_markup_amount, currency, status, priority)
        VALUES
            (20, 0, 0, 'scope-plan', 1, '1.000000', '0.000000', 'USD', 1, 100),
            (21, 100001, 0, 'scope-plan', 1, '1.100000', '0.000000', 'USD', 1, 50),
            (22, 100001, 20, 'scope-plan', 1, '1.200000', '0.000000', 'USD', 1, 1),
            (23, 200002, 0, 'scope-plan', 1, '2.000000', '0.000000', 'USD', 1, 1)
        "#,
        r#"
        INSERT INTO ai_model_pricing
            (id, tenant_id, organization_id, catalog_key, model, region_code, price_side,
             billing_meter_code, unit_price, currency, supplier_code, account_id, status, priority)
        VALUES
            (20, 0, 0, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'global', 1,
             'llm_input_token', '0.100000', 'USD', NULL, NULL, 1, 100),
            (21, 100001, 0, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'global', 1,
             'llm_input_token', '0.200000', 'USD', NULL, NULL, 1, 50),
            (22, 100001, 20, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'global', 1,
             'llm_input_token', '0.300000', 'USD', NULL, NULL, 1, 1),
            (23, 100001, 20, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'global', 1,
             'llm_input_token', '0.310000', 'USD', NULL, NULL, 1, 10),
            (24, 200002, 0, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'global', 1,
             'llm_input_token', '0.400000', 'USD', NULL, NULL, 1, 1),
            (25, 200002, 0, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'global', 2,
             'llm_input_token', '0.010000', 'USD', 'foreign-provider', 9901, 1, 1)
        "#,
    ] {
        sqlx::query(statement).execute(&pool).await.unwrap();
    }

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();

    for (tenant_id, organization_id, expected_multiplier) in [
        (100001, 20, "1.200000"),
        (100001, 21, "1.100000"),
        (200002, 9, "2.000000"),
        (300003, 30, "1.000000"),
    ] {
        assert_eq!(
            expected_multiplier,
            snapshot
                .find_pricing_plan_for_scope(tenant_id, organization_id, "scope-plan")
                .expect("visible pricing plan must resolve")
                .default_multiplier
                .to_fixed_string(6)
        );
    }

    for (tenant_id, organization_id, expected_price) in [
        (100001, 20, "0.300000"),
        (100001, 21, "0.200000"),
        (200002, 9, "0.400000"),
        (300003, 30, "0.150000"),
    ] {
        let prices = snapshot.list_model_prices_for_scope(
            tenant_id,
            organization_id,
            "openai/gpt-4o-mini",
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
        );
        assert_eq!(1, prices.len());
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
            .iter()
            .all(|price| price.supplier_code.as_deref() != Some("foreign-provider")),
        "foreign tenant provider/channel prices must not cross the scope boundary"
    );
}

#[tokio::test]
async fn sqlite_loader_prefers_bundled_official_price_over_stale_platform_row() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model_pricing
            (id, tenant_id, organization_id, catalog_key, model, region_code, price_side,
             billing_meter_code, unit_price, currency, status, priority)
        VALUES
            (30, 0, 0, 'openai/gpt-5.4-mini', 'gpt-5.4-mini', 'global', 1,
             'llm_input_token', '0.000001', 'USD', 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();
    let price = snapshot
        .find_model_price(
            "openai/gpt-5.4-mini",
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
            None,
            None,
        )
        .expect("bundled platform official price must remain available");

    assert_eq!(
        "0.750000",
        price.unit_price.to_fixed_string(6),
        "stale platform database imports must not shadow the bundled catalog version"
    );
}

#[tokio::test]
async fn sqlite_loader_redacts_copyable_key_material_when_secret_codec_is_absent() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    sqlx::query(
        r#"
        UPDATE iam_gateway_api_key
        SET metadata = json_set(COALESCE(metadata, '{}'), '$.copyableKeyCiphertext', 'encrypted-copyable-key')
        WHERE id = 100
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();
    let api_key = snapshot.find_api_key(100).unwrap();

    assert_eq!("sk-test********ABCD", api_key.key_display_masked);
    assert_eq!(None, api_key.copyable_key);
}

#[tokio::test]
async fn sqlite_loader_defaults_empty_upstream_account_group_pricing_plan_for_runtime_billing_subject() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    sqlx::query("UPDATE ai_upstream_account_group SET pricing_plan_code = '' WHERE id = 10")
        .execute(&pool)
        .await
        .unwrap();

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();

    let group = snapshot.find_upstream_account_group(10).unwrap();
    assert_eq!("standard", group.pricing_plan_code);
}

#[tokio::test]
async fn sqlite_loader_supplies_standard_pricing_plan_when_runtime_plan_table_is_empty() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    sqlx::query("DELETE FROM ai_pricing_plan")
        .execute(&pool)
        .await
        .unwrap();

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();

    assert!(
        snapshot.find_pricing_plan("standard").is_some(),
        "runtime catalog must provide a standard pricing plan fallback for seeded/default channel groups"
    );

    let price = PricingResolver::new(&snapshot)
        .resolve(ResolveModelPriceQuery {
            api_key_id: 100,
            account_group_id: None,
            model: "openai/gpt-4o-mini".to_owned(),
            billing_meter: BillingMeter::LlmInputToken,
            supplier_code: Some("openrouter".to_owned()),
            account_id: Some(3001),
            region_code: None,
        })
        .expect("default standard plan must allow route pricing to resolve");

    assert_eq!("standard", price.pricing_plan_code);
    assert_eq!("standard-group", price.group_code);
    assert_eq!(
        "0.110000",
        price
            .upstream_cost
            .expect("tenant provider/channel upstream price must resolve")
            .unit_price
            .to_fixed_string(6)
    );
}

#[tokio::test]
async fn sqlite_loader_keeps_channel_base_url_routes_when_provider_registry_row_is_absent() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    sqlx::query("DELETE FROM ai_provider WHERE supplier_code = 'openrouter'")
        .execute(&pool)
        .await
        .unwrap();

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();

    let model_route = snapshot
        .list_model_upstream_routes("openai/gpt-4o-mini")
        .into_iter()
        .find(|route| route.supplier_code == "openrouter")
        .expect("channel base_url plus account secret_ref must be enough for model route loading");
    assert_eq!(
        Some("http://provider-proxy.internal/openrouter"),
        model_route.base_url.as_deref()
    );
    assert_eq!(
        Some("vault://providers/openrouter/account/main"),
        model_route.secret_ref.as_deref()
    );

    let channel_route = snapshot
        .list_upstream_account_routes()
        .into_iter()
        .find(|route| route.supplier_code == "openrouter")
        .expect("channel base_url plus account secret_ref must be enough for account-pool route loading");
    assert_eq!(
        Some("http://provider-proxy.internal/openrouter"),
        channel_route.base_url.as_deref()
    );
    assert_eq!(1, channel_route.account_group_bindings.len());
    assert_eq!(10, channel_route.account_group_bindings[0].group_id);
}

#[tokio::test]
async fn sqlite_loader_derives_routes_from_vendor_resource_and_credentials_not_channel_models() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    let channel_model_table_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM sqlite_master WHERE type = 'table' AND name = 'ai_channel_model'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        0, channel_model_table_count,
        "provider routes must not depend on ai_channel_model schema"
    );

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();

    let model_route = snapshot
        .list_model_upstream_routes("openai/gpt-4o-mini")
        .into_iter()
        .find(|route| route.supplier_code == "openrouter")
        .expect("vendor/resource/credential facts must keep openrouter model route callable");

    assert_eq!(
        Some("http://provider-proxy.internal/openrouter"),
        model_route.base_url.as_deref()
    );
    assert_eq!(
        Some("vault://providers/openrouter/account/main"),
        model_route.secret_ref.as_deref()
    );
    assert_eq!(
        Some("openai.chat_completions"),
        model_route.api_code.as_deref()
    );

    let channel_route = snapshot
        .list_upstream_account_routes()
        .into_iter()
        .find(|route| route.supplier_code == "openrouter")
        .expect("resource-scoped group membership must keep account-pool route callable");
    assert_eq!(
        Some("http://provider-proxy.internal/openrouter"),
        channel_route.base_url.as_deref()
    );
    assert_eq!(1, channel_route.account_group_bindings.len());
    assert_eq!(10, channel_route.account_group_bindings[0].group_id);
}

#[tokio::test]
async fn sqlite_loader_resolves_global_resource_id_and_prefers_specific_resource_scope() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    for statement in [
        r#"
        INSERT INTO ai_channel
            (id, tenant_id, organization_id, supplier_code, account_code, channel_name,
             channel_type, base_url, credential_ref, status, priority, weight)
        VALUES
            (4001, 100001, 20, 'inheritance-provider', 'inheritance-org', 'Inheritance Org',
             'relay', 'http://provider-proxy.internal/inheritance',
             'vault://providers/inheritance/channel', 1, 1, 100)
        "#,
        r#"
        INSERT INTO ai_channel_credential
            (id, tenant_id, organization_id, account_id, supplier_code, account_code,
             credential_name, base_url, auth_config, credential_ref, credential_hash,
             priority, weight, health_status, status)
        VALUES
            (400101, 100001, 20, 4001, 'inheritance-provider', 'inheritance-org',
             'org-account', 'http://provider-proxy.internal/inheritance', '{}',
             'vault://providers/inheritance/org-account', 'hash:inheritance-org', 1, 100, 1, 1)
        "#,
        r#"
        INSERT INTO ai_resource
            (id, tenant_id, organization_id, resource_code, resource_type, vendor_code,
             modality_code, api_code, catalog_key, model, provider_native_model, status)
        VALUES
            (9200, 0, 0, 'model.inheritance.chat', 'model_api', 'openai', 'chat',
             'openai.chat_completions', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'global-model', 1),
            (9201, 100001, 0, 'model.inheritance.chat', 'model_api', 'openai', 'chat',
             'openai.chat_completions', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'tenant-model', 1),
            (9202, 100001, 20, 'model.inheritance.chat', 'model_api', 'openai', 'chat',
             'openai.chat_completions', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'organization-model', 1),
            (9203, 200002, 20, 'model.inheritance.chat', 'model_api', 'openai', 'chat',
             'openai.chat_completions', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'other-tenant-model', 1),
            (9205, 100001, 21, 'model.inheritance.chat', 'model_api', 'openai', 'chat',
             'openai.chat_completions', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'sibling-organization-model', 1),
            (9204, 0, 20, 'model.inheritance.chat', 'model_api', 'openai', 'chat',
             'openai.chat_completions', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'invalid-scope-model', 1)
        "#,
        r#"
        INSERT INTO ai_channel_resource
            (id, tenant_id, organization_id, account_id, resource_id, resource_code, grant_type, status)
        VALUES
            (9401, 100001, 20, 4001, 9200, '', 'allow', 1)
        "#,
    ] {
        sqlx::query(statement).execute(&pool).await.unwrap();
    }

    let snapshot = SqlitePricingCatalogLoader::new(pool.clone())
        .load_snapshot()
        .await
        .unwrap();
    let routes = snapshot
        .list_model_upstream_routes("openai/gpt-4o-mini")
        .into_iter()
        .filter(|route| route.account_id == 4001)
        .collect::<Vec<_>>();
    assert_eq!(1, routes.len());
    assert_eq!("organization-model", routes[0].provider_model);

    sqlx::query("UPDATE ai_resource SET status = 0 WHERE id = 9202")
        .execute(&pool)
        .await
        .unwrap();
    let snapshot = SqlitePricingCatalogLoader::new(pool.clone())
        .load_snapshot()
        .await
        .unwrap();
    let routes = snapshot
        .list_model_upstream_routes("openai/gpt-4o-mini")
        .into_iter()
        .filter(|route| route.account_id == 4001)
        .collect::<Vec<_>>();
    assert_eq!(1, routes.len());
    let route = &routes[0];
    assert_eq!("tenant-model", route.provider_model);

    sqlx::query("UPDATE ai_resource SET deleted_at = '2026-07-11T00:00:00Z' WHERE id = 9201")
        .execute(&pool)
        .await
        .unwrap();
    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();
    let routes = snapshot
        .list_model_upstream_routes("openai/gpt-4o-mini")
        .into_iter()
        .filter(|route| route.account_id == 4001)
        .collect::<Vec<_>>();
    assert_eq!(1, routes.len());
    let route = &routes[0];
    assert_eq!("global-model", route.provider_model);
}

#[tokio::test]
async fn sqlite_loader_resolves_global_resource_group_id_with_tenant_override() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    for statement in [
        r#"
        INSERT INTO ai_channel
            (id, tenant_id, organization_id, supplier_code, account_code, channel_name,
             channel_type, base_url, credential_ref, status, priority, weight)
        VALUES
            (4002, 100001, 20, 'group-inheritance-provider', 'group-inheritance', 'Group Inheritance',
             'relay', 'http://provider-proxy.internal/group-inheritance',
             'vault://providers/group-inheritance/channel', 1, 1, 100)
        "#,
        r#"
        INSERT INTO ai_channel_credential
            (id, tenant_id, organization_id, account_id, supplier_code, account_code,
             credential_name, base_url, auth_config, credential_ref, credential_hash,
             priority, weight, health_status, status)
        VALUES
            (400201, 100001, 20, 4002, 'group-inheritance-provider', 'group-inheritance',
             'group-account', 'http://provider-proxy.internal/group-inheritance', '{}',
             'vault://providers/group-inheritance/account', 'hash:group-inheritance', 1, 100, 1, 1)
        "#,
        r#"
        INSERT INTO ai_resource
            (id, tenant_id, organization_id, resource_code, resource_type, vendor_code,
             modality_code, api_code, catalog_key, model, provider_native_model, status)
        VALUES
            (9210, 0, 0, 'model.group-inheritance.chat', 'model_api', 'openai', 'chat',
             'openai.chat_completions', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'global-group-model', 1),
            (9211, 100001, 0, 'model.group-inheritance.chat', 'model_api', 'openai', 'chat',
             'openai.chat_completions', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'tenant-group-model', 1),
            (9212, 100001, 20, 'model.group-inheritance.chat', 'model_api', 'openai', 'chat',
             'openai.chat_completions', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'organization-group-model', 1)
        "#,
        r#"
        INSERT INTO ai_resource_group
            (id, tenant_id, organization_id, group_code, group_name, group_type, status)
        VALUES
            (9300, 0, 0, 'group.inheritance', 'Global Inheritance Group', 'bundle', 1)
        "#,
        r#"
        INSERT INTO ai_resource_group_item
            (id, tenant_id, organization_id, resource_group_id, resource_group_code,
             item_type, resource_id, resource_code, status)
        VALUES
            (9301, 0, 0, 9300, 'group.inheritance', 'resource', 9210, '', 1)
        "#,
        r#"
        INSERT INTO ai_channel_resource
            (id, tenant_id, organization_id, account_id, resource_group_id, resource_code, grant_type, status)
        VALUES
            (9402, 100001, 20, 4002, 9300, '', 'allow', 1)
        "#,
    ] {
        sqlx::query(statement).execute(&pool).await.unwrap();
    }

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();
    let route = snapshot
        .list_model_upstream_routes("openai/gpt-4o-mini")
        .into_iter()
        .find(|route| route.account_id == 4002)
        .expect("global resource group id must resolve for a tenant channel");
    assert_eq!("organization-group-model", route.provider_model);
}

#[tokio::test]
async fn sqlite_loader_does_not_inherit_cross_tenant_resource_or_global_credentials() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    for statement in [
        r#"
        INSERT INTO ai_channel
            (id, tenant_id, organization_id, supplier_code, account_code, channel_name,
             channel_type, base_url, credential_ref, status, priority, weight)
        VALUES
            (4003, 100001, 20, 'cross-tenant-provider', 'cross-tenant', 'Cross Tenant',
             'relay', 'http://provider-proxy.internal/cross-tenant',
             'vault://providers/cross-tenant/channel', 1, 1, 100)
        "#,
        r#"
        INSERT INTO ai_channel_credential
            (id, tenant_id, organization_id, account_id, supplier_code, account_code,
             credential_name, base_url, auth_config, credential_ref, credential_hash,
             priority, weight, health_status, status)
        VALUES
            (400301, 0, 0, 4003, 'cross-tenant-provider', 'cross-tenant',
             'global-account', 'http://provider-proxy.internal/global-account', '{}',
             'vault://providers/global/account', 'hash:global-account', 1, 100, 1, 1)
        "#,
        r#"
        INSERT INTO ai_resource
            (id, tenant_id, organization_id, resource_code, resource_type, vendor_code,
             modality_code, api_code, catalog_key, model, provider_native_model, status)
        VALUES
            (9220, 200002, 20, 'model.cross-tenant.chat', 'model_api', 'openai', 'chat',
             'openai.chat_completions', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'other-tenant-model', 1)
        "#,
        r#"
        INSERT INTO ai_channel_resource
            (id, tenant_id, organization_id, account_id, resource_id, resource_code, grant_type, status)
        VALUES
            (9403, 100001, 20, 4003, 9220, '', 'allow', 1)
        "#,
    ] {
        sqlx::query(statement).execute(&pool).await.unwrap();
    }

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();
    assert!(snapshot
        .list_model_upstream_routes("openai/gpt-4o-mini")
        .into_iter()
        .all(|route| route.account_id != 4003));
    assert!(snapshot
        .list_upstream_account_routes()
        .into_iter()
        .all(|route| route.account_id != 4003));
}

#[tokio::test]
async fn sqlite_loader_requires_channel_resource_binding_for_model_routes() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    sqlx::query("DELETE FROM ai_channel_resource WHERE account_id = 3001")
        .execute(&pool)
        .await
        .unwrap();

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();

    assert!(
        snapshot
            .list_model_upstream_routes("openai/gpt-4o-mini")
            .into_iter()
            .all(|route| route.supplier_code != "openrouter"),
        "accounts without explicit ai_channel_resource bindings must not be treated as unrestricted model routes"
    );

    let channel_route = snapshot
        .list_upstream_account_routes()
        .into_iter()
        .find(|route| route.supplier_code == "openrouter")
        .expect("group membership may still load an account-pool row for diagnostics");
    assert_eq!(1, channel_route.account_group_bindings.len());
    assert_eq!(vec!["__deny__"], channel_route.account_group_bindings[0].api_scope);
    assert_eq!(
        vec!["__deny__"],
        channel_route.account_group_bindings[0].capabilities
    );
}

#[tokio::test]
async fn sqlite_loader_does_not_cross_tenant_models_into_provider_routes() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, tenant_id, organization_id, catalog_key, model, display_name, vendor_code,
             capability, capabilities, api_format, release_stage, shelf_state, routing_state,
             status, rank_score)
        VALUES
            (9001, 30, 40, 'openai/gpt-4o-mini', 'gpt-4o-mini-shadow',
             'Tenant shadow GPT-4o mini', 'openai', 1, '["chat"]', 'openai_compatible',
             1, 1, 1, 1, '200.0')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();

    let openrouter_routes = snapshot
        .list_model_upstream_routes("openai/gpt-4o-mini")
        .into_iter()
        .filter(|route| route.supplier_code == "openrouter")
        .collect::<Vec<_>>();

    assert_eq!(
        1,
        openrouter_routes.len(),
        "model-scoped provider routes must not combine one tenant's models with another tenant's channel resource bindings"
    );
    assert_eq!("gpt-4o-mini", openrouter_routes[0].model);
}

#[tokio::test]
async fn sqlite_loader_preserves_file_api_endpoint_for_channel_routes() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    sqlx::query(
        r#"
        UPDATE ai_resource
        SET modality_code = 'network',
            api_code = 'openai.files',
            catalog_key = NULL,
            model = NULL,
            provider_native_model = NULL
        WHERE id = 9102
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query("UPDATE ai_channel SET base_url = NULL WHERE id = 3001")
        .execute(&pool)
        .await
        .unwrap();

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();
    let channel_route = snapshot
        .list_upstream_account_routes()
        .into_iter()
        .find(|route| route.supplier_code == "openrouter")
        .expect("file API resource must keep openrouter channel route callable");

    assert_eq!(
        Some("http://provider-proxy.internal/openrouter"),
        channel_route.base_url.as_deref()
    );
    assert_eq!(
        vec!["openai.files"],
        channel_route.account_group_bindings[0].api_scope
    );
}

#[tokio::test]
async fn sqlite_loader_excludes_unhealthy_provider_channels_from_routing_snapshot() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    sqlx::query(
        "UPDATE ai_channel SET health_status = 2, updated_at = CURRENT_TIMESTAMP WHERE id = 3001",
    )
    .execute(&pool)
    .await
    .unwrap();

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();

    assert!(
        snapshot
            .list_model_upstream_routes("openai/gpt-4o-mini")
            .iter()
            .all(|route| route.supplier_code != "openrouter"),
        "unhealthy provider model routes must be excluded from the runtime catalog snapshot"
    );
    assert!(
        snapshot
            .list_upstream_account_routes()
            .iter()
            .all(|route| route.supplier_code != "openrouter"),
        "unhealthy account-pool routes must be excluded from the runtime catalog snapshot"
    );
}

#[tokio::test]
async fn sqlite_loader_reincludes_unhealthy_provider_channels_after_recovery_probe_window() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_catalog(&pool).await;

    sqlx::query(
        r#"
        UPDATE ai_channel
        SET health_status = 2,
            updated_at = datetime(CURRENT_TIMESTAMP, '-61 seconds')
        WHERE id = 3001
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let snapshot = SqlitePricingCatalogLoader::new(pool)
        .load_snapshot()
        .await
        .unwrap();

    assert!(
        snapshot
            .list_model_upstream_routes("openai/gpt-4o-mini")
            .iter()
            .any(|route| route.supplier_code == "openrouter"),
        "unhealthy provider model routes must be re-included after the recovery probe window"
    );
    assert!(
        snapshot
            .list_upstream_account_routes()
            .iter()
            .any(|route| route.supplier_code == "openrouter"),
        "unhealthy account-pool routes must be re-included after the recovery probe window"
    );
}

#[tokio::test]
async fn sqlite_loader_reads_routing_config_version_without_loading_snapshot() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    let loader = SqlitePricingCatalogLoader::new(pool.clone());

    assert_eq!(0, loader.load_routing_config_version().await.unwrap());

    sqlx::query(
        r#"
        INSERT INTO ai_config_version
            (tenant_id, organization_id, config_scope, config_version, status)
        VALUES
            (10, 20, 'routing', 7, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    assert_eq!(7, loader.load_routing_config_version().await.unwrap());

    sqlx::query(
        r#"
        INSERT INTO ai_config_version
            (tenant_id, organization_id, config_scope, config_version, status)
        VALUES
            (30, 40, 'routing', 5, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    assert_eq!(
        12,
        loader.load_routing_config_version().await.unwrap(),
        "fallback routing config watermark must change when any tenant or organization changes"
    );

    sqlx::query(
        r#"
        INSERT INTO ai_config_version
            (tenant_id, organization_id, config_scope, config_version, status)
        VALUES
            (0, 0, 'routing', 12, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    assert_eq!(
        12,
        loader.load_routing_config_version().await.unwrap(),
        "global routing config version is the fast-path refresh watermark"
    );

    sqlx::query(
        r#"
        UPDATE ai_config_version
        SET config_version = 13
        WHERE tenant_id = 0
          AND organization_id = 0
          AND config_scope = 'routing'
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    assert_eq!(13, loader.load_routing_config_version().await.unwrap());
}

async fn create_schema(pool: &SqlitePool) {
    for statement in [
        r#"CREATE TABLE ai_model_vendor (
            id INTEGER PRIMARY KEY,
            vendor_code TEXT NOT NULL,
            display_name TEXT NOT NULL,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            sort_order INTEGER NOT NULL
        )"#,
        r#"CREATE TABLE ai_model (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            catalog_key TEXT NOT NULL,
            model TEXT NOT NULL,
            display_name TEXT NOT NULL,
            vendor_code TEXT NOT NULL,
            capability INTEGER,
            capabilities TEXT NOT NULL,
            modalities TEXT,
            input_modalities TEXT,
            output_modalities TEXT,
            description TEXT,
            capability_intro TEXT,
            limitations TEXT,
            supported_languages TEXT,
            use_cases TEXT,
            training_data_cutoff TEXT,
            context_tokens INTEGER,
            max_output_tokens INTEGER,
            supports_streaming INTEGER,
            supports_tools INTEGER,
            supports_json_schema INTEGER,
            api_format TEXT,
            release_stage INTEGER,
            shelf_state INTEGER,
            routing_state INTEGER,
            replacement_model TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            rank_score TEXT
        )"#,
        r#"CREATE TABLE ai_model_capability (
            id INTEGER PRIMARY KEY,
            model_id INTEGER NOT NULL,
            catalog_key TEXT NOT NULL,
            capability_code TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE ai_provider (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            supplier_code TEXT NOT NULL,
            default_vendor_code TEXT,
            integration_type INTEGER,
            base_url TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE ai_channel (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            supplier_code TEXT NOT NULL,
            account_code TEXT NOT NULL,
            channel_name TEXT NOT NULL,
            channel_type TEXT NOT NULL,
            base_url TEXT,
            region_code TEXT,
            supplier_id INTEGER,
            supplier_code TEXT,
            endpoint_id INTEGER,
            endpoint_code TEXT,
            timeout_ms INTEGER,
            retry_policy TEXT,
            health_status INTEGER,
            updated_at TEXT,
            auth_type INTEGER,
            auth_config TEXT,
            credential_ref TEXT,
            credential_rotation_strategy TEXT,
            status INTEGER NOT NULL,
            priority INTEGER NOT NULL,
            weight INTEGER NOT NULL,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE ai_channel_credential (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            account_id INTEGER NOT NULL,
            supplier_code TEXT,
            account_code TEXT,
            credential_name TEXT NOT NULL,
            base_url TEXT,
            auth_config TEXT NOT NULL DEFAULT '{}',
            credential_ref TEXT,
            credential_hash TEXT,
            masked_label TEXT,
            priority INTEGER NOT NULL DEFAULT 100,
            weight INTEGER NOT NULL DEFAULT 100,
            health_status INTEGER,
            updated_at TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE ai_routing_policy (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            policy_code TEXT NOT NULL,
            policy_scope INTEGER NOT NULL,
            subject_id INTEGER,
            capability INTEGER,
            default_profile_id INTEGER,
            fallback_mode INTEGER,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            updated_at TEXT
        )"#,
        r#"CREATE TABLE ai_routing_profile (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            policy_id INTEGER NOT NULL,
            profile_code TEXT,
            profile_version INTEGER,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE ai_routing_rule (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            profile_id INTEGER NOT NULL,
            rule_code TEXT NOT NULL,
            priority INTEGER NOT NULL,
            match_expression TEXT,
            target_model TEXT,
            candidate_account_groups TEXT NOT NULL,
            fallback_chain TEXT,
            constraints TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            effective_from TEXT,
            effective_to TEXT
        )"#,
        r#"CREATE TABLE ai_model_mapping_rule (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            target_vendor_code TEXT,
            mapping_mode TEXT NOT NULL DEFAULT 'alias',
            match_type TEXT NOT NULL DEFAULT 'exact',
            enabled INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            updated_at TEXT
        )"#,
        r#"CREATE TABLE ai_model_mapping_rule_binding (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            rule_id INTEGER NOT NULL,
            binding_type TEXT NOT NULL DEFAULT 'global',
            binding_id INTEGER,
            binding_code TEXT,
            sort_order INTEGER NOT NULL DEFAULT 100,
            enabled INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE ai_model_mapping_rule_item (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            rule_id INTEGER NOT NULL,
            source_model TEXT NOT NULL,
            source_catalog_key TEXT,
            target_model TEXT NOT NULL,
            target_catalog_key TEXT,
            target_provider_model TEXT,
            target_provider_native_model TEXT,
            sort_order INTEGER NOT NULL DEFAULT 100,
            enabled INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE ai_pricing_plan (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            plan_code TEXT NOT NULL,
            base_price_side INTEGER NOT NULL,
            default_multiplier TEXT NOT NULL,
            default_markup_amount TEXT NOT NULL,
            currency TEXT NOT NULL,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            priority INTEGER NOT NULL,
            effective_from TEXT,
            effective_to TEXT
        )"#,
        r#"CREATE TABLE ai_upstream_account_group (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            group_name TEXT,
            group_code TEXT NOT NULL,
            pricing_plan_code TEXT NOT NULL,
            rate_multiplier TEXT NOT NULL,
            official_price_multiplier TEXT NOT NULL,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            updated_at TEXT
        )"#,
        r#"CREATE TABLE ai_upstream_account_group_member (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            account_group_id INTEGER NOT NULL,
            account_id INTEGER NOT NULL,
            priority INTEGER,
            weight INTEGER,
            enabled INTEGER,
            effective_from TEXT,
            effective_to TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE ai_resource (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            resource_code TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            vendor_code TEXT,
            modality_code TEXT,
            api_code TEXT,
            catalog_key TEXT,
            model TEXT,
            provider_native_model TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE ai_resource_group (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            group_code TEXT NOT NULL,
            group_name TEXT,
            group_type TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE ai_resource_group_item (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            resource_group_id INTEGER NOT NULL,
            resource_group_code TEXT,
            item_type TEXT NOT NULL,
            resource_id INTEGER,
            resource_code TEXT,
            child_resource_group_id INTEGER,
            child_resource_group_code TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE ai_upstream_account_group_resource (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            account_group_id INTEGER NOT NULL,
            resource_id INTEGER,
            resource_code TEXT,
            resource_group_id INTEGER,
            resource_group_code TEXT,
            grant_type TEXT NOT NULL DEFAULT 'allow',
            status INTEGER NOT NULL,
            effective_from TEXT,
            effective_to TEXT,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE ai_channel_resource (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            account_id INTEGER NOT NULL,
            resource_id INTEGER,
            resource_code TEXT,
            resource_group_id INTEGER,
            resource_group_code TEXT,
            priority INTEGER,
            weight INTEGER,
            grant_type TEXT NOT NULL DEFAULT 'allow',
            status INTEGER NOT NULL,
            effective_from TEXT,
            effective_to TEXT,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE iam_gateway_api_key (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            account_group_id INTEGER NOT NULL,
            name TEXT,
            key_prefix TEXT NOT NULL,
            key_display_masked TEXT,
            key_hash TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            policy_id INTEGER,
            quota_policy_id INTEGER,
            status INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            deleted_at TEXT,
            revoked_at TEXT,
            expire_at TEXT,
            updated_at TEXT,
            metadata TEXT NOT NULL DEFAULT '{}'
        )"#,
        r#"CREATE TABLE iam_gateway_api_key_upstream_account_group (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL DEFAULT 0,
            api_key_id INTEGER NOT NULL,
            account_group_id INTEGER NOT NULL,
            account_group_code TEXT,
            binding_role TEXT NOT NULL DEFAULT 'route',
            routing_strategy TEXT NOT NULL DEFAULT 'auto',
            priority INTEGER NOT NULL DEFAULT 100,
            weight INTEGER NOT NULL DEFAULT 100,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            effective_from TEXT,
            effective_to TEXT
        )"#,
        r#"CREATE TABLE iam_gateway_access_policy (
            id INTEGER PRIMARY KEY,
            allowed_capabilities TEXT,
            ip_allowlist TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            effective_from TEXT,
            effective_to TEXT,
            updated_at TEXT
        )"#,
        r#"CREATE TABLE ai_quota_policy (
            id INTEGER PRIMARY KEY,
            quota_limit TEXT,
            requests_per_second INTEGER,
            requests_per_day INTEGER,
            burst_limit TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            effective_from TEXT,
            effective_to TEXT,
            updated_at TEXT
        )"#,
        r#"CREATE TABLE iam_gateway_risk_rule (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER,
            organization_id INTEGER,
            rule_category INTEGER,
            rule_type INTEGER,
            scope_type INTEGER,
            scope_id INTEGER,
            target_type INTEGER,
            target_value TEXT,
            match_mode INTEGER,
            action INTEGER,
            priority INTEGER,
            requests_per_second INTEGER,
            requests_per_minute INTEGER,
            requests_per_day INTEGER,
            burst_limit TEXT,
            block_duration_seconds INTEGER,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            effective_from TEXT,
            effective_to TEXT
        )"#,
        r#"CREATE TABLE ai_upstream_account_group_metric_snapshot (
            id INTEGER PRIMARY KEY,
            account_group_id INTEGER NOT NULL,
            capacity_used TEXT,
            capacity_limit TEXT,
            usage_amount_total TEXT,
            snapshot_at TEXT,
            status INTEGER NOT NULL
        )"#,
        r#"CREATE TABLE ai_model_pricing (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            catalog_key TEXT NOT NULL,
            model TEXT NOT NULL,
            region_code TEXT NOT NULL DEFAULT 'global',
            price_side INTEGER NOT NULL,
            billing_meter_code TEXT NOT NULL,
            unit_price TEXT NOT NULL,
            currency TEXT NOT NULL,
            supplier_code TEXT,
            account_id INTEGER,
            pricing_plan_code TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            effective_from TEXT,
            effective_to TEXT,
            priority INTEGER NOT NULL
        )"#,
        r#"CREATE TABLE ai_config_version (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            config_scope TEXT NOT NULL,
            config_version INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            deleted_at TEXT
        )"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_catalog(pool: &SqlitePool) {
    for statement in [
        "INSERT INTO ai_model_vendor (id, vendor_code, display_name, status, sort_order) VALUES (1, 'openai', 'OpenAI', 1, 1)",
        r#"INSERT INTO ai_model
            (id, catalog_key, model, display_name, vendor_code, capability, capabilities, modalities, input_modalities, output_modalities, description, capability_intro, limitations, supported_languages, use_cases, training_data_cutoff, context_tokens, max_output_tokens, supports_streaming, supports_tools, supports_json_schema, api_format, release_stage, shelf_state, routing_state, status, rank_score)
            VALUES (1, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'GPT-4o mini', 'openai', 1, '["chat","tools","json_schema"]', '["text","image"]', '["text","image"]', '["text"]', 'Fast public model.', 'Low latency chat model.', '["Validate facts"]', '["English","Chinese"]', '["Support","Extraction"]', '2025', 128000, 16384, 1, 1, 1, 'openai_compatible', 1, 1, 1, 1, '100.0')"#,
        "INSERT INTO ai_model_capability (id, model_id, catalog_key, capability_code, status) VALUES (1, 1, 'openai/gpt-4o-mini', 'chat', 1)",
        "INSERT INTO ai_provider (id, tenant_id, organization_id, supplier_code, default_vendor_code, integration_type, base_url, status) VALUES (1, 100001, 0, 'azure_openai', 'openai', 2, 'http://provider-proxy.internal/azure-template', 1)",
        "INSERT INTO ai_provider (id, tenant_id, organization_id, supplier_code, default_vendor_code, integration_type, base_url, status) VALUES (2, 100001, 0, 'openrouter', 'openai', 3, 'http://provider-proxy.internal/openrouter-template', 1)",
        "INSERT INTO ai_channel (id, tenant_id, organization_id, supplier_code, account_code, channel_name, channel_type, base_url, credential_ref, status, priority, weight) VALUES (2001, 100001, 0, 'azure_openai', 'azure-main', 'Azure main', 'official', 'http://provider-proxy.internal/azure', 'vault://providers/azure/account/main', 1, 10, 100)",
        "INSERT INTO ai_channel (id, tenant_id, organization_id, supplier_code, account_code, channel_name, channel_type, base_url, timeout_ms, retry_policy, credential_ref, status, priority, weight) VALUES (3001, 100001, 0, 'openrouter', 'openrouter-main', 'OpenRouter main', 'relay', 'http://provider-proxy.internal/openrouter', 30000, '{\"max_attempts\":3,\"retryable_status_codes\":[429,503],\"backoff_ms\":0}', 'vault://providers/openrouter/account/main', 1, 20, 100)",
        "INSERT INTO ai_channel_credential (id, tenant_id, organization_id, account_id, supplier_code, account_code, credential_name, base_url, auth_config, credential_ref, credential_hash, priority, weight, health_status, status) VALUES (200101, 100001, 0, 2001, 'azure_openai', 'azure-main', 'primary', 'http://provider-proxy.internal/azure', '{}', 'vault://providers/azure/account/main', 'hash:azure', 1, 100, 1, 1)",
        "INSERT INTO ai_channel_credential (id, tenant_id, organization_id, account_id, supplier_code, account_code, credential_name, base_url, auth_config, credential_ref, credential_hash, priority, weight, health_status, status) VALUES (300101, 100001, 0, 3001, 'openrouter', 'openrouter-main', 'primary', 'http://provider-proxy.internal/openrouter', '{}', 'vault://providers/openrouter/account/main', 'hash:openrouter', 1, 100, 1, 1)",
        "INSERT INTO ai_resource (id, tenant_id, organization_id, resource_code, resource_type, vendor_code, modality_code, api_code, catalog_key, model, provider_native_model, status) VALUES (9102, 100001, 0, 'model.openai.gpt-4o-mini.chat', 'model_api', 'openai', 'chat', 'openai.chat_completions', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'gpt-4o-mini', 1)",
        "INSERT INTO ai_routing_profile (id, tenant_id, organization_id, policy_id, profile_code, profile_version, status) VALUES (9101, 100001, 0, 9001, 'standard-profile', 1, 1)",
        "INSERT INTO ai_routing_policy (id, tenant_id, organization_id, policy_code, policy_scope, subject_id, default_profile_id, fallback_mode, status) VALUES (9001, 100001, 0, 'standard-group-policy', 5, 10, 9101, 1, 1)",
        "INSERT INTO ai_routing_rule (id, tenant_id, organization_id, profile_id, rule_code, priority, match_expression, target_model, candidate_account_groups, fallback_chain, constraints, status) VALUES (9102, 100001, 0, 9101, 'standard-group-gpt-4o-mini', 1, '{\"catalogKey\":\"openai/gpt-4o-mini\"}', 'openai/gpt-4o-mini', '[{\"account_id\":3001,\"weight\":100}]', '[]', '{}', 1)",
        "INSERT INTO ai_pricing_plan (id, tenant_id, organization_id, plan_code, base_price_side, default_multiplier, default_markup_amount, currency, status, priority) VALUES (1, 100001, 0, 'standard', 1, '1.200000', '0.000000', 'USD', 1, 1)",
        "INSERT INTO ai_upstream_account_group (id, tenant_id, organization_id, group_name, group_code, pricing_plan_code, rate_multiplier, official_price_multiplier, status) VALUES (10, 100001, 0, 'Standard Group', 'standard-group', 'standard', '1.000000', '1.100000', 1)",
        "INSERT INTO ai_upstream_account_group_member (id, tenant_id, organization_id, account_group_id, account_id, priority, weight, status) VALUES (600, 100001, 0, 10, 3001, 1, 100, 1)",
        "INSERT INTO ai_upstream_account_group_resource (id, tenant_id, organization_id, account_group_id, resource_id, resource_code, grant_type, status) VALUES (610, 100001, 0, 10, 9102, 'model.openai.gpt-4o-mini.chat', 'allow', 1)",
        "INSERT INTO ai_channel_resource (id, tenant_id, organization_id, account_id, resource_id, resource_code, grant_type, status) VALUES (621, 100001, 0, 2001, 9102, 'model.openai.gpt-4o-mini.chat', 'allow', 1)",
        "INSERT INTO ai_channel_resource (id, tenant_id, organization_id, account_id, resource_id, resource_code, grant_type, status) VALUES (620, 100001, 0, 3001, 9102, 'model.openai.gpt-4o-mini.chat', 'allow', 1)",
        "INSERT INTO iam_gateway_access_policy (id, allowed_capabilities, ip_allowlist, status) VALUES (700, '[\"text\",\"image\"]', '[\"192.168.1.1\",\"10.0.0.0/24\"]', 1)",
        "INSERT INTO ai_quota_policy (id, quota_limit, status) VALUES (900, '1000.000000', 1)",
        "INSERT INTO ai_upstream_account_group_metric_snapshot (id, account_group_id, capacity_used, capacity_limit, usage_amount_total, snapshot_at, status) VALUES (800, 10, '37.500000', '1000.000000', '37.500000', '2026-04-29 00:00:00', 1)",
        "INSERT INTO iam_gateway_api_key (id, tenant_id, organization_id, user_id, account_group_id, name, key_prefix, key_display_masked, key_hash, idempotency_key, policy_id, quota_policy_id, status) VALUES (100, 100001, 0, 30, 10, 'Production Key', 'sk-test', 'sk-test********ABCD', 'hash:sk-test', 'seed-api-key-100', 700, 900, 1)",
        "INSERT INTO ai_model_pricing (id, tenant_id, organization_id, catalog_key, model, region_code, price_side, billing_meter_code, unit_price, currency, status, priority) VALUES (1, 0, 0, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'global', 1, 'llm_input_token', '0.150000', 'USD', 1, 1)",
        "INSERT INTO ai_model_pricing (id, tenant_id, organization_id, catalog_key, model, region_code, price_side, billing_meter_code, unit_price, currency, supplier_code, account_id, status, priority) VALUES (2, 100001, 0, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'global', 2, 'llm_input_token', '0.110000', 'USD', 'openrouter', 3001, 1, 1)",
        "INSERT INTO ai_model_pricing (id, tenant_id, organization_id, catalog_key, model, region_code, price_side, billing_meter_code, unit_price, currency, supplier_code, account_id, status, priority) VALUES (3, 100001, 0, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'global', 2, 'llm_input_token', '0.120000', 'USD', 'azure_openai', 2001, 1, 1)",
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}
