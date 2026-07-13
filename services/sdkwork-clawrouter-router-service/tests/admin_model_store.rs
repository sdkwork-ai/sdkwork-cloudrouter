use sdkwork_clawrouter_router_service::infrastructure::sql::installer::{
    CatalogRefreshOptions, DatabaseInstaller,
};
use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAdminModelStore;
use sdkwork_clawrouter_router_service::ports::{
    AdminAiModelRegionPriceCommand, AdminModelMappingRuleBindingDraft, AdminModelMappingRuleDraft,
    AdminModelMappingRuleItemDraft, AdminModelMappingRulePatch, AdminModelStore, AdminModelSubject,
    CreateAdminAiModelCommand, CreateAdminModelMappingCommand, ListAdminAiModelsQuery,
    ListAdminModelMappingsQuery, ListAdminModelVendorsQuery, ResolveAdminModelMappingQuery,
    SyncAdminModelCatalogCommand, UpdateAdminAiModelCommand, UpdateAdminModelMappingCommand,
};
use sdkwork_clawrouter_router_service_test_support::{
    schema_sqlite_pool, test_database_install_options,
};
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::Row;
use std::collections::BTreeSet;

fn sdkwork_models_pinned_catalog_version() -> String {
    let index_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../../sdkwork-models/models/index.json");
    let raw = std::fs::read_to_string(&index_path).unwrap_or_else(|error| {
        panic!(
            "read sdkwork-models catalog index failed at {}: {error}",
            index_path.display()
        )
    });
    let index: serde_json::Value =
        serde_json::from_str(&raw).expect("parse sdkwork-models catalog index");
    index
        .get("catalogVersion")
        .and_then(|value| value.as_str())
        .expect("catalogVersion in sdkwork-models index")
        .to_owned()
}

#[tokio::test]
async fn sqlite_admin_model_store_creates_region_pricing_catalog_rows() {
    let pool = schema_sqlite_pool().await;
    install_admin_model_catalog(&pool, &["openai"]).await;
    let store = SqliteAdminModelStore::new(pool.clone());
    let subject = AdminModelSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 99,
        operator_type: 1,
    };

    let vendor_id: i64 =
        sqlx::query_scalar("SELECT id FROM ai_model_vendor WHERE vendor_code = 'openai' LIMIT 1")
            .fetch_one(&pool)
            .await
            .unwrap();

    let item = store
        .create_model(CreateAdminAiModelCommand {
            subject,
            model_uuid: "model-region-price-test".to_owned(),
            capability_uuid: "capability-region-price-test".to_owned(),
            audit_log_uuid: "audit-region-price-test".to_owned(),
            vendor_id: vendor_id.to_string(),
            model: "admin-region-model".to_owned(),
            display_name: "admin-region-model".to_owned(),
            model_type: "Chat".to_owned(),
            region_prices: vec![
                AdminAiModelRegionPriceCommand {
                    region_code: "cn".to_owned(),
                    currency: "CNY".to_owned(),
                    price_in: "0.180000".to_owned(),
                    price_out: "0.560000".to_owned(),
                    cache_read_price: Some("0.040000".to_owned()),
                    cache_write_price: Some("0.080000".to_owned()),
                },
                AdminAiModelRegionPriceCommand {
                    region_code: "global".to_owned(),
                    currency: "USD".to_owned(),
                    price_in: "0.120000".to_owned(),
                    price_out: "0.450000".to_owned(),
                    cache_read_price: None,
                    cache_write_price: None,
                },
            ],
            description: Some("Region priced model".to_owned()),
            modalities: vec!["text".to_owned()],
            input_modalities: vec!["text".to_owned()],
            output_modalities: vec!["text".to_owned()],
            api_format: "openai_responses".to_owned(),
            capability_intro: None,
            limitations: Vec::new(),
            supported_languages: Vec::new(),
            use_cases: Vec::new(),
            training_data_cutoff: None,
            context_tokens: 128000,
            max_output_tokens: None,
            supports_streaming: true,
            supports_tools: true,
            supports_json_schema: true,
            release_stage: 1,
            shelf_state: 1,
            routing_state: 1,
            replacement_model: None,
            request_id: "req-region-price-model-store".to_owned(),
            requested_at: "2026-05-07T12:00:00Z".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!("admin-region-model", item.name);
    assert_admin_region_model_prices(&item.region_prices);

    let model_row = sqlx::query(
        r#"
        SELECT catalog_key
        FROM ai_model
        WHERE uuid = 'model-region-price-test'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        "openai/admin-region-model",
        model_row.get::<String, _>("catalog_key")
    );

    let capability_row = sqlx::query(
        r#"
        SELECT catalog_key
        FROM ai_model_capability
        WHERE uuid = 'capability-region-price-test'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        "openai/admin-region-model",
        capability_row.get::<String, _>("catalog_key")
    );

    let pricing_rows = sqlx::query(
        r#"
        SELECT catalog_key, region_code, billing_meter_code, CAST(unit_price AS TEXT) AS unit_price, currency
        FROM ai_model_pricing
        WHERE model_id = ?
          AND price_side = 1
          AND pricing_scope = 1
          AND status = 1
          AND deleted_at IS NULL
        ORDER BY region_code ASC, priority ASC
        "#,
    )
    .bind(item.id)
    .fetch_all(&pool)
    .await
    .unwrap();
    let pricing = pricing_rows
        .iter()
        .map(|row| {
            (
                row.get::<String, _>("catalog_key"),
                row.get::<String, _>("region_code"),
                row.get::<String, _>("billing_meter_code"),
                decimal_value(&row.get::<String, _>("unit_price")),
                row.get::<String, _>("currency"),
            )
        })
        .collect::<Vec<_>>();
    assert_eq!(6, pricing.len());
    assert!(pricing
        .iter()
        .any(|(catalog_key, region, meter, price, currency)| {
            catalog_key == "openai/admin-region-model"
                && region == "cn"
                && meter == "llm_input_token"
                && *price == 0.18
                && currency == "CNY"
        }));
    assert!(pricing
        .iter()
        .any(|(catalog_key, region, meter, price, currency)| {
            catalog_key == "openai/admin-region-model"
                && region == "global"
                && meter == "llm_output_token"
                && *price == 0.45
                && currency == "USD"
        }));
    assert!(pricing.iter().any(|(_, region, meter, price, currency)| {
        region == "cn" && meter == "llm_cache_read_token" && *price == 0.04 && currency == "CNY"
    }));

    let models = store
        .list_models(list_all_admin_models_query(subject))
        .await
        .unwrap()
        .items;
    let listed = models
        .iter()
        .find(|model| model.model == "admin-region-model")
        .expect("created regional model should be listed");
    assert_admin_region_model_prices(&listed.region_prices);
}

#[tokio::test]
async fn sqlite_admin_model_store_lists_catalog_region_prices_for_dual_region_vendors() {
    let pool = schema_sqlite_pool().await;
    install_admin_model_catalog(&pool, &["deepseek", "minimax", "moonshot"]).await;

    let models = SqliteAdminModelStore::new(pool.clone())
        .list_models(list_all_admin_models_query(AdminModelSubject {
            tenant_id: 100001,
            organization_id: 0,
            operator_id: 99,
            operator_type: 1,
        }))
        .await
        .unwrap()
        .items;

    for (vendor_code, model_name) in [
        ("deepseek", "deepseek-v4-pro"),
        ("minimax", "MiniMax-M2.7"),
        ("moonshot", "kimi-k2.6"),
    ] {
        let model = models
            .iter()
            .find(|item| item.vendor_code == vendor_code && item.model == model_name)
            .unwrap_or_else(|| panic!("{vendor_code}/{model_name} should be listed"));
        assert_model_region_codes(&model.region_prices, &["cn", "global"]);
    }
}

#[tokio::test]
async fn sqlite_admin_model_store_lists_catalog_prices_for_latest_media_meters() {
    let pool = schema_sqlite_pool().await;
    install_admin_model_catalog(&pool, &["black_forest_labs", "kuaishou", "openai"]).await;

    let models = SqliteAdminModelStore::new(pool.clone())
        .list_models(list_all_admin_models_query(AdminModelSubject {
            tenant_id: 100001,
            organization_id: 0,
            operator_id: 99,
            operator_type: 1,
        }))
        .await
        .unwrap()
        .items;

    assert_model_region_price_side(
        &models,
        "black_forest_labs",
        "flux-2-pro",
        "global",
        Some(0.015),
        Some(0.03),
    );
    assert_model_region_price_side(
        &models,
        "kuaishou",
        "kling-v3-0-preview",
        "global",
        None,
        Some(0.8),
    );
    assert_model_region_price_side(
        &models,
        "openai",
        "gpt-4o-transcribe",
        "global",
        Some(0.006),
        None,
    );
}

#[tokio::test]
async fn sqlite_admin_model_store_updates_installed_model_graph() {
    let pool = schema_sqlite_pool().await;
    install_admin_model_catalog(&pool, &["openai"]).await;
    let model_id: i64 = sqlx::query_scalar("SELECT id FROM ai_model WHERE model = 'gpt-image-1.5'")
        .fetch_one(&pool)
        .await
        .unwrap();

    let pricing_before = active_model_pricing_snapshot(&pool, model_id).await;

    let item = SqliteAdminModelStore::new(pool.clone())
        .update_model(UpdateAdminAiModelCommand {
            subject: AdminModelSubject {
                tenant_id: 100001,
                organization_id: 0,
                operator_id: 99,
                operator_type: 1,
            },
            capability_uuid: "capability-update-test".to_owned(),
            audit_log_uuid: "audit-update-model-test".to_owned(),
            model_id: model_id.to_string(),
            vendor_id: None,
            model: Some("gpt-image-commercial-edit".to_owned()),
            display_name: None,
            model_type: Some("Image".to_owned()),
            region_prices: None,
            status: Some("inactive".to_owned()),
            description: Some(Some("Updated commercial image model".to_owned())),
            modalities: Some(vec!["image".to_owned()]),
            input_modalities: Some(vec!["text".to_owned(), "image".to_owned()]),
            output_modalities: Some(vec!["image".to_owned()]),
            api_format: Some("openai_compatible".to_owned()),
            capability_intro: Some(Some("Image generation and editing".to_owned())),
            limitations: Some(vec!["No medical diagnosis".to_owned()]),
            supported_languages: Some(vec!["en".to_owned(), "zh".to_owned()]),
            use_cases: Some(vec!["commerce".to_owned()]),
            training_data_cutoff: Some(Some("2026-05".to_owned())),
            context_tokens: Some(2048),
            max_output_tokens: Some(None),
            supports_streaming: Some(false),
            supports_tools: Some(false),
            supports_json_schema: Some(false),
            release_stage: Some(1),
            shelf_state: Some(2),
            routing_state: Some(0),
            replacement_model: Some(Some("gpt-image-1.5".to_owned())),
            request_id: "req-update-model-store".to_owned(),
            requested_at: "2026-05-07T12:00:00Z".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!("GPT Image 1.5", item.name);
    assert_eq!("Image", item.model_type);
    assert_eq!("inactive", item.status);
    assert_eq!(Some(2048), item.context_tokens);
    assert_eq!(None, item.max_output_tokens);
    assert_eq!(vec!["image"], item.modalities);
    assert_eq!(vec!["text", "image"], item.input_modalities);
    assert_eq!(vec!["image"], item.output_modalities);
    assert_eq!(Some("openai_compatible".to_owned()), item.api_format);
    assert_eq!(Some("gpt-image-1.5".to_owned()), item.replacement_model);

    let model_row = sqlx::query(
        r#"
        SELECT model, display_name, vendor_code, vendor_name_snapshot, capability,
               CAST(modalities AS TEXT) AS modalities_json,
               CAST(input_modalities AS TEXT) AS input_modalities_json,
               CAST(output_modalities AS TEXT) AS output_modalities_json,
               status, context_tokens, max_output_tokens, supports_streaming,
               supports_tools, supports_json_schema, api_format, replacement_model, version
        FROM ai_model
        WHERE id = ?
        "#,
    )
    .bind(model_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        "gpt-image-commercial-edit",
        model_row.get::<String, _>("model")
    );
    assert_eq!("GPT Image 1.5", model_row.get::<String, _>("display_name"));
    assert_eq!("openai", model_row.get::<String, _>("vendor_code"));
    assert_eq!("OpenAI", model_row.get::<String, _>("vendor_name_snapshot"));
    assert_eq!(2_i64, model_row.get::<i64, _>("capability"));
    assert_eq!(0_i64, model_row.get::<i64, _>("status"));
    assert_eq!(2048_i64, model_row.get::<i64, _>("context_tokens"));
    assert_eq!(
        None::<i64>,
        model_row.get::<Option<i64>, _>("max_output_tokens")
    );
    assert_eq!(0_i64, model_row.get::<i64, _>("supports_streaming"));
    assert_eq!(0_i64, model_row.get::<i64, _>("supports_tools"));
    assert_eq!(0_i64, model_row.get::<i64, _>("supports_json_schema"));
    assert_eq!(
        "openai_compatible",
        model_row.get::<String, _>("api_format")
    );
    assert_eq!(
        "gpt-image-1.5",
        model_row.get::<String, _>("replacement_model")
    );
    assert_eq!(1_i64, model_row.get::<i64, _>("version"));

    let capability_row = sqlx::query(
        r#"
        SELECT model, vendor_code, capability, capability_code, modality,
               CAST(input_modalities AS TEXT) AS input_modalities_json,
               CAST(output_modalities AS TEXT) AS output_modalities_json
        FROM ai_model_capability
        WHERE model_id = ?
          AND deleted_at IS NULL
        ORDER BY id ASC
        LIMIT 1
        "#,
    )
    .bind(model_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        "gpt-image-commercial-edit",
        capability_row.get::<String, _>("model")
    );
    assert_eq!("openai", capability_row.get::<String, _>("vendor_code"));
    assert_eq!(2_i64, capability_row.get::<i64, _>("capability"));
    assert_eq!("image", capability_row.get::<String, _>("capability_code"));
    assert_eq!(2_i64, capability_row.get::<i64, _>("modality"));
    assert_eq!(
        r#"["text","image"]"#,
        capability_row.get::<String, _>("input_modalities_json")
    );
    assert_eq!(
        r#"["image"]"#,
        capability_row.get::<String, _>("output_modalities_json")
    );

    let pricing_rows = sqlx::query(
        r#"
        SELECT region_code, billing_meter_code, CAST(unit_price AS TEXT) AS unit_price, currency
        FROM ai_model_pricing
        WHERE model_id = ?
          AND price_side = 1
          AND pricing_scope = 1
          AND status = 1
          AND deleted_at IS NULL
        ORDER BY region_code ASC, priority ASC, id ASC
        "#,
    )
    .bind(model_id)
    .fetch_all(&pool)
    .await
    .unwrap();
    let pricing_pairs = pricing_rows
        .iter()
        .map(|row| {
            (
                row.get::<String, _>("region_code"),
                row.get::<String, _>("billing_meter_code"),
                row.get::<String, _>("unit_price"),
                row.get::<String, _>("currency"),
            )
        })
        .collect::<Vec<_>>();
    assert_eq!(
        pricing_before, pricing_pairs,
        "model metadata updates without regionPrices must not mutate regional pricing"
    );

    let audit_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ops_audit_log
        WHERE action = 'update_ai_model'
          AND target_type = 42
          AND target_id = ?
          AND request_id = 'req-update-model-store'
        "#,
    )
    .bind(model_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1, audit_count);
}

#[tokio::test]
async fn sqlite_admin_model_store_replaces_region_prices_when_explicit() {
    let pool = schema_sqlite_pool().await;
    install_admin_model_catalog(&pool, &["minimax"]).await;

    let model_id: i64 = sqlx::query_scalar("SELECT id FROM ai_model WHERE model = 'MiniMax-M2.7'")
        .fetch_one(&pool)
        .await
        .unwrap();
    let store = SqliteAdminModelStore::new(pool.clone());
    let subject = AdminModelSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 99,
        operator_type: 1,
    };

    let updated = store
        .update_model(UpdateAdminAiModelCommand {
            subject,
            capability_uuid: "capability-cache-preserve-test".to_owned(),
            audit_log_uuid: "audit-cache-preserve-model-test".to_owned(),
            model_id: model_id.to_string(),
            vendor_id: None,
            model: Some("MiniMax-M2.7-commercial".to_owned()),
            display_name: None,
            model_type: Some("Chat".to_owned()),
            region_prices: Some(vec![AdminAiModelRegionPriceCommand {
                region_code: "global".to_owned(),
                currency: "USD".to_owned(),
                price_in: "0.333333".to_owned(),
                price_out: "1.444444".to_owned(),
                cache_read_price: Some("0.111111".to_owned()),
                cache_write_price: Some("0.222222".to_owned()),
            }]),
            status: Some("active".to_owned()),
            description: None,
            modalities: Some(vec!["text".to_owned()]),
            input_modalities: Some(vec!["text".to_owned()]),
            output_modalities: Some(vec!["text".to_owned()]),
            api_format: Some("openai_compatible".to_owned()),
            capability_intro: None,
            limitations: None,
            supported_languages: None,
            use_cases: None,
            training_data_cutoff: None,
            context_tokens: Some(204800),
            max_output_tokens: Some(Some(32768)),
            supports_streaming: Some(true),
            supports_tools: Some(true),
            supports_json_schema: Some(true),
            release_stage: Some(1),
            shelf_state: Some(1),
            routing_state: Some(1),
            replacement_model: None,
            request_id: "req-cache-preserve-model-store".to_owned(),
            requested_at: "2026-05-07T13:00:00Z".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!(
        vec![AdminAiModelRegionPriceCommand {
            region_code: "global".to_owned(),
            currency: "USD".to_owned(),
            price_in: "0.333333".to_owned(),
            price_out: "1.444444".to_owned(),
            cache_read_price: Some("0.111111".to_owned()),
            cache_write_price: Some("0.222222".to_owned()),
        }],
        updated.region_prices
    );

    let replaced = store
        .update_model(UpdateAdminAiModelCommand {
            subject,
            capability_uuid: "capability-cache-clear-test".to_owned(),
            audit_log_uuid: "audit-cache-clear-model-test".to_owned(),
            model_id: model_id.to_string(),
            vendor_id: None,
            model: None,
            display_name: None,
            model_type: None,
            region_prices: Some(vec![
                AdminAiModelRegionPriceCommand {
                    region_code: "cn".to_owned(),
                    currency: "CNY".to_owned(),
                    price_in: "0.444444".to_owned(),
                    price_out: "1.555555".to_owned(),
                    cache_read_price: None,
                    cache_write_price: None,
                },
                AdminAiModelRegionPriceCommand {
                    region_code: "global".to_owned(),
                    currency: "USD".to_owned(),
                    price_in: "0.555555".to_owned(),
                    price_out: "1.666666".to_owned(),
                    cache_read_price: None,
                    cache_write_price: None,
                },
            ]),
            status: None,
            description: None,
            modalities: None,
            input_modalities: None,
            output_modalities: None,
            api_format: None,
            capability_intro: None,
            limitations: None,
            supported_languages: None,
            use_cases: None,
            training_data_cutoff: None,
            context_tokens: None,
            max_output_tokens: None,
            supports_streaming: None,
            supports_tools: None,
            supports_json_schema: None,
            release_stage: None,
            shelf_state: None,
            routing_state: None,
            replacement_model: None,
            request_id: "req-cache-clear-model-store".to_owned(),
            requested_at: "2026-05-07T13:05:00Z".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!(
        vec![
            AdminAiModelRegionPriceCommand {
                region_code: "cn".to_owned(),
                currency: "CNY".to_owned(),
                price_in: "0.444444".to_owned(),
                price_out: "1.555555".to_owned(),
                cache_read_price: None,
                cache_write_price: None,
            },
            AdminAiModelRegionPriceCommand {
                region_code: "global".to_owned(),
                currency: "USD".to_owned(),
                price_in: "0.555555".to_owned(),
                price_out: "1.666666".to_owned(),
                cache_read_price: None,
                cache_write_price: None,
            },
        ],
        replaced.region_prices
    );

    let active_cache_pricing_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_model_pricing
        WHERE model_id = ?
          AND price_side = 1
          AND billing_meter_code IN ('llm_cache_read_token', 'llm_cache_write_token')
          AND status = 1
          AND deleted_at IS NULL
        "#,
    )
    .bind(model_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(0, active_cache_pricing_count);

    let active_pricing = active_model_pricing_snapshot(&pool, model_id).await;
    assert_eq!(
        vec![
            (
                "cn".to_owned(),
                "llm_input_token".to_owned(),
                "0.444444".to_owned(),
                "CNY".to_owned()
            ),
            (
                "cn".to_owned(),
                "llm_output_token".to_owned(),
                "1.555555".to_owned(),
                "CNY".to_owned()
            ),
            (
                "global".to_owned(),
                "llm_input_token".to_owned(),
                "0.555555".to_owned(),
                "USD".to_owned()
            ),
            (
                "global".to_owned(),
                "llm_output_token".to_owned(),
                "1.666666".to_owned(),
                "USD".to_owned()
            ),
        ],
        active_pricing
    );
}

#[tokio::test]
async fn sqlite_admin_model_store_uses_subject_latest_commercial_ranking_snapshot_for_calls() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_admin_model_tables(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, uuid, tenant_id, organization_id, status, model, display_name, vendor_id, vendor_code, capability, modalities, input_modalities, output_modalities, rank_score)
        VALUES
            (1, 'model-current', 0, 0, 1, 'gpt-current', 'GPT Current', 1, 'openai', 1, '["text"]', '["text"]', '["text"]', 10),
            (2, 'model-old-only', 0, 0, 1, 'gpt-old-only', 'GPT Old Only', 1, 'openai', 1, '["text"]', '["text"]', '["text"]', 9),
            (3, 'model-tenant-current', 0, 0, 1, 'gpt-tenant-current', 'GPT Tenant Current', 1, 'openai', 1, '["text"]', '["text"]', '["text"]', 8)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ai_model_rank_snapshot
            (id, tenant_id, organization_id, status, snapshot_date, snapshot_period, rank_scope, model, vendor_code, rank_no, request_count, base_volume)
        VALUES
            (1, 0, 0, 1, '2026-05-07', 1, 'commercial-default', 'gpt-current', 'openai', 1, 100, 100),
            (2, 0, 0, 1, '2026-05-06', 1, 'commercial-default', 'gpt-old-only', 'openai', 2, 999, 999),
            (3, 0, 0, 1, '2026-05-08', 1, 'playground-local', 'gpt-old-only', 'openai', 1, 777, 777),
            (4, 100001, 0, 1, '2026-05-07', 1, 'commercial-default', 'gpt-tenant-current', 'openai', 1, 321, 321),
            (5, 0, 0, 1, '2026-05-08', 1, 'commercial-default', 'gpt-current', 'openai', 1, 654, 654)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let models = SqliteAdminModelStore::new(pool)
        .list_models(list_all_admin_models_query(AdminModelSubject {
            tenant_id: 100001,
            organization_id: 0,
            operator_id: 1,
            operator_type: 1,
        }))
        .await
        .unwrap()
        .items;

    let current = models
        .iter()
        .find(|item| item.model == "gpt-current")
        .expect("current model exists");
    let old_only = models
        .iter()
        .find(|item| item.model == "gpt-old-only")
        .expect("old-only model exists");
    let tenant_current = models
        .iter()
        .find(|item| item.model == "gpt-tenant-current")
        .expect("tenant current model exists");

    assert_eq!("0", current.calls);
    assert_eq!("0", old_only.calls);
    assert_eq!("321", tenant_current.calls);
}

#[tokio::test]
async fn sqlite_admin_model_store_does_not_use_global_tenant_organization_ranking_calls() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_admin_model_tables(&pool).await;

    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, uuid, tenant_id, organization_id, status, model, display_name, vendor_id, vendor_code, capability, modalities, input_modalities, output_modalities, rank_score)
        VALUES
            (1, 'model-current', 0, 0, 1, 'gpt-current', 'GPT Current', 1, 'openai', 1, '["text"]', '["text"]', '["text"]', 10)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ai_model_rank_snapshot
            (id, tenant_id, organization_id, status, snapshot_date, snapshot_period, rank_scope, model, vendor_code, rank_no, request_count, base_volume)
        VALUES
            (1, 0, 20, 1, '2026-05-08', 1, 'commercial-default', 'gpt-current', 'openai', 1, 888, 888)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let models = SqliteAdminModelStore::new(pool)
        .list_models(list_all_admin_models_query(AdminModelSubject {
            tenant_id: 100001,
            organization_id: 0,
            operator_id: 1,
            operator_type: 1,
        }))
        .await
        .unwrap()
        .items;

    let current = models
        .iter()
        .find(|item| item.model == "gpt-current")
        .expect("current model exists");

    assert_eq!("0", current.calls);
}

#[tokio::test]
async fn sqlite_admin_model_store_sync_catalog_reapplies_sdkwork_models_catalog() {
    let catalog_version = sdkwork_models_pinned_catalog_version();
    let pool = schema_sqlite_pool().await;
    prepare_admin_model_schema(&pool).await;

    sqlx::query(
        r#"
        DELETE FROM ai_model
        WHERE model = 'qwen3.6-max-preview'
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let synced = SqliteAdminModelStore::new(pool.clone())
        .sync_catalog(SyncAdminModelCatalogCommand {
            subject: AdminModelSubject {
                tenant_id: 100001,
                organization_id: 0,
                operator_id: 99,
                operator_type: 1,
            },
            snapshot_uuid: "sync-catalog-regression".to_owned(),
            audit_log_uuid: "audit-sync-catalog-regression".to_owned(),
            source: "official_docs".to_owned(),
            mode: "official_refresh".to_owned(),
            vendor_codes: vec!["alibaba".to_owned()],
            force: true,
            catalog_root: None,
            catalog_version: Some(catalog_version.clone()),
            request_id: "req-sync-catalog-regression".to_owned(),
            requested_at: "2026-05-07T12:30:00Z".to_owned(),
        })
        .await
        .unwrap();

    assert!(synced.synced);
    assert_eq!("official_docs", synced.source);
    assert!(synced
        .vendors
        .iter()
        .all(|vendor| vendor.vendor_code == "alibaba"));
    assert!(synced
        .models
        .iter()
        .all(|model| model.vendor_code == "alibaba"));
    assert!(synced
        .models
        .iter()
        .any(|model| model.model == "qwen3.6-max-preview"));
    let store = SqliteAdminModelStore::new(pool.clone());
    let admin_subject = AdminModelSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 99,
        operator_type: 1,
    };
    let visible_vendors = store
        .list_vendors(ListAdminModelVendorsQuery {
            subject: admin_subject,
        })
        .await
        .unwrap();
    let visible_models = store
        .list_models(list_all_admin_models_query(admin_subject))
        .await
        .unwrap()
        .items;
    assert!(
        visible_vendors
            .iter()
            .any(|vendor| vendor.vendor_code == "alibaba"),
        "admin vendor list must include the synced sdkwork-models vendor"
    );
    assert!(
        visible_models
            .iter()
            .any(|model| model.model == "qwen3.6-max-preview"),
        "admin model list must include the synced sdkwork-models model"
    );
    assert_eq!("official_refresh", synced.mode);
    assert!(!synced.dry_run);
    assert_eq!(catalog_version, synced.catalog_version);
    assert_eq!(Some(catalog_version), synced.requested_catalog_version);
    assert_eq!(None, synced.catalog_root);
    assert_eq!(vec!["alibaba".to_owned()], synced.vendor_codes);
    assert_eq!(64, synced.source_hash.len());
    assert!(synced.source_hash.chars().all(|ch| ch.is_ascii_hexdigit()));

    let model_row = sqlx::query(
        r#"
        SELECT model, display_name, routing_state
        FROM ai_model
        WHERE model = 'qwen3.6-max-preview'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!("qwen3.6-max-preview", model_row.get::<String, _>("model"));
    assert_eq!(
        "Qwen3.6 Max Preview",
        model_row.get::<String, _>("display_name")
    );
    assert_eq!(1_i64, model_row.get::<i64, _>("routing_state"));

    let sync_metadata: String = sqlx::query_scalar(
        r#"
        SELECT metadata
        FROM ai_model_catalog_sync_run
        WHERE uuid = 'catalog-sync-sync-catalog-regression'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(sync_metadata.contains("\"syncMode\":\"official_refresh\""));
    assert!(sync_metadata.contains("\"vendorCodes\":[\"alibaba\"]"));
    assert!(sync_metadata.contains("\"force\":true"));

    let sync_run = sqlx::query(
        r#"
        SELECT observed_vendor_count, observed_model_count, observed_meter_count, observed_price_count, accepted_count, source_hash, change_summary
        FROM ai_model_catalog_sync_run
        WHERE uuid = 'catalog-sync-sync-catalog-regression'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    let bundled_catalog = sdkwork_models::load_bundled_catalog().unwrap();
    let vendor_catalogs = bundled_catalog
        .vendors
        .iter()
        .filter(|vendor| vendor.vendor.vendor_code == "alibaba")
        .cloned()
        .collect::<Vec<_>>();
    assert!(!vendor_catalogs.is_empty(), "alibaba catalog exists");
    let scoped_catalog = sdkwork_models::ModelCatalog {
        manifest: bundled_catalog.manifest.clone(),
        meters: bundled_catalog.meters.clone(),
        protocols: bundled_catalog.protocols.clone(),
        vendors: vendor_catalogs,
    };
    let scope_counts =
        sdkwork_clawrouter_router_service::catalog_scope_count_snapshot(&scoped_catalog);
    let expected_meter_count = scope_counts.meter_count;
    let expected_family_count = scope_counts.family_count;
    let expected_model_count = scope_counts.model_count;
    let expected_capability_count = scope_counts.capability_count;
    let expected_price_count = scope_counts.price_count;
    let expected_ranking_count = scope_counts.ranking_count;
    assert_eq!(1_i64, sync_run.get::<i64, _>("observed_vendor_count"));
    assert_eq!(
        expected_model_count,
        sync_run.get::<i64, _>("observed_model_count")
    );
    assert_eq!(
        expected_meter_count,
        sync_run.get::<i64, _>("observed_meter_count")
    );
    assert_eq!(
        expected_price_count,
        sync_run.get::<i64, _>("observed_price_count")
    );
    assert_eq!(
        sdkwork_clawrouter_router_service::catalog_accepted_count(&scoped_catalog),
        sync_run.get::<i64, _>("accepted_count"),
        "sync run accepted_count must reflect every imported sdkwork-models fact"
    );
    assert_eq!(
        synced.source_hash,
        sync_run.get::<String, _>("source_hash"),
        "sync response source_hash must identify the exact persisted sync-run source hash"
    );
    let change_summary: serde_json::Value =
        serde_json::from_str(sync_run.get::<String, _>("change_summary").as_str()).unwrap();
    assert_eq!(expected_meter_count, change_summary["counts"]["meters"]);
    assert_eq!(1, change_summary["counts"]["vendors"]);
    assert_eq!(expected_family_count, change_summary["counts"]["families"]);
    assert_eq!(expected_model_count, change_summary["counts"]["models"]);
    assert_eq!(
        expected_capability_count,
        change_summary["counts"]["capabilities"]
    );
    assert_eq!(expected_price_count, change_summary["counts"]["prices"]);
    assert_eq!(expected_ranking_count, change_summary["counts"]["rankings"]);

    let audit_metadata: String = sqlx::query_scalar(
        r#"
        SELECT change_summary
        FROM ops_audit_log
        WHERE uuid = 'audit-sync-catalog-regression'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(audit_metadata.contains("\"mode\":\"official_refresh\""));
    assert!(audit_metadata.contains("\"vendorCodes\":[\"alibaba\"]"));
    assert!(audit_metadata.contains("\"force\":true"));
}

#[tokio::test]
async fn sqlite_admin_model_store_sync_catalog_reactivates_soft_deleted_catalog_source() {
    let pool = schema_sqlite_pool().await;
    prepare_admin_model_schema(&pool).await;
    let store = SqliteAdminModelStore::new(pool.clone());
    let subject = AdminModelSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 99,
        operator_type: 1,
    };

    store
        .sync_catalog(SyncAdminModelCatalogCommand {
            subject,
            snapshot_uuid: "sync-source-first".to_owned(),
            audit_log_uuid: "audit-sync-source-first".to_owned(),
            source: "official_docs".to_owned(),
            mode: "official_refresh".to_owned(),
            vendor_codes: vec!["alibaba".to_owned()],
            force: true,
            catalog_root: None,
            catalog_version: Some(sdkwork_models_pinned_catalog_version()),
            request_id: "req-sync-source-first".to_owned(),
            requested_at: "2026-05-07T12:30:00Z".to_owned(),
        })
        .await
        .unwrap();

    sqlx::query(
        r#"
        UPDATE ai_model_catalog_source
        SET status = 0,
            deleted_at = '2099-01-01T00:00:00Z',
            deleted_by = 9001
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND source_code = 'official_docs'
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    store
        .sync_catalog(SyncAdminModelCatalogCommand {
            subject,
            snapshot_uuid: "sync-source-second".to_owned(),
            audit_log_uuid: "audit-sync-source-second".to_owned(),
            source: "official_docs".to_owned(),
            mode: "official_refresh".to_owned(),
            vendor_codes: vec!["alibaba".to_owned()],
            force: true,
            catalog_root: None,
            catalog_version: Some(sdkwork_models_pinned_catalog_version()),
            request_id: "req-sync-source-second".to_owned(),
            requested_at: "2026-05-07T12:35:00Z".to_owned(),
        })
        .await
        .unwrap();

    let restored_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_model_catalog_source
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND source_code = 'official_docs'
          AND status = 1
          AND deleted_at IS NULL
          AND deleted_by IS NULL
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        1, restored_count,
        "catalog source upsert must restore soft-deleted source observability rows"
    );
}

#[tokio::test]
async fn sqlite_admin_model_store_sync_catalog_source_uuid_is_tenant_scoped() {
    let pool = schema_sqlite_pool().await;
    prepare_admin_model_schema(&pool).await;
    let store = SqliteAdminModelStore::new(pool.clone());

    for (tenant_id, organization_id, suffix) in [(100001, 0, "primary"), (100002, 20, "tenant")] {
        let synced = store
            .sync_catalog(SyncAdminModelCatalogCommand {
                subject: AdminModelSubject {
                    tenant_id,
                    organization_id,
                    operator_id: 99,
                    operator_type: 1,
                },
                snapshot_uuid: format!("sync-source-{suffix}"),
                audit_log_uuid: format!("audit-sync-source-{suffix}"),
                source: "sdkwork_models".to_owned(),
                mode: "official_refresh".to_owned(),
                vendor_codes: vec!["alibaba".to_owned()],
                force: true,
                catalog_root: None,
                catalog_version: Some(sdkwork_models_pinned_catalog_version()),
                request_id: format!("req-sync-source-{suffix}"),
                requested_at: "2026-06-03T12:00:00Z".to_owned(),
            })
            .await
            .unwrap();
        assert!(synced.synced);
    }

    let source_rows = sqlx::query(
        r#"
        SELECT tenant_id, organization_id, uuid
        FROM ai_model_catalog_source
        WHERE source_code = 'sdkwork_models'
        ORDER BY tenant_id, organization_id
        "#,
    )
    .fetch_all(&pool)
    .await
    .unwrap();
    assert_eq!(2, source_rows.len());
    let uuids = source_rows
        .iter()
        .map(|row| row.get::<String, _>("uuid"))
        .collect::<BTreeSet<_>>();
    assert_eq!(
        2,
        uuids.len(),
        "catalog source uuid must include tenant/org identity so admin sync is idempotent across scopes"
    );
}

#[tokio::test]
async fn sqlite_admin_model_store_vendor_refresh_only_imports_selected_vendor() {
    let pool = schema_sqlite_pool().await;
    prepare_admin_model_schema(&pool).await;

    sqlx::query(
        r#"
        DELETE FROM ai_model
        WHERE model IN ('qwen3.6-max-preview', 'gpt-5.2')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let synced = SqliteAdminModelStore::new(pool.clone())
        .sync_catalog(SyncAdminModelCatalogCommand {
            subject: AdminModelSubject {
                tenant_id: 100001,
                organization_id: 0,
                operator_id: 99,
                operator_type: 1,
            },
            snapshot_uuid: "sync-selected-vendor".to_owned(),
            audit_log_uuid: "audit-sync-selected-vendor".to_owned(),
            source: "sdkwork_models".to_owned(),
            mode: "vendor_refresh".to_owned(),
            vendor_codes: vec!["alibaba".to_owned()],
            force: true,
            catalog_root: None,
            catalog_version: Some(sdkwork_models_pinned_catalog_version()),
            request_id: "req-sync-selected-vendor".to_owned(),
            requested_at: "2026-05-07T12:45:00Z".to_owned(),
        })
        .await
        .unwrap();

    assert!(synced.synced);
    assert_eq!("sdkwork_models", synced.source);
    assert!(synced
        .models
        .iter()
        .all(|model| model.vendor_code == "alibaba"));

    let qwen_count: i64 =
        sqlx::query_scalar("SELECT COUNT(1) FROM ai_model WHERE model = 'qwen3.6-max-preview'")
            .fetch_one(&pool)
            .await
            .unwrap();
    let openai_count: i64 =
        sqlx::query_scalar("SELECT COUNT(1) FROM ai_model WHERE model = 'gpt-5.2'")
            .fetch_one(&pool)
            .await
            .unwrap();

    assert_eq!(1, qwen_count);
    assert_eq!(
        0, openai_count,
        "vendor_refresh must not repair unrelated vendors"
    );
}

#[tokio::test]
async fn sqlite_admin_model_store_dry_run_reports_catalog_scope_without_importing() {
    let pool = schema_sqlite_pool().await;
    prepare_admin_model_schema(&pool).await;

    sqlx::query("DELETE FROM ai_model WHERE model = 'qwen3.6-max-preview'")
        .execute(&pool)
        .await
        .unwrap();

    let dry_run = SqliteAdminModelStore::new(pool.clone())
        .sync_catalog(SyncAdminModelCatalogCommand {
            subject: AdminModelSubject {
                tenant_id: 100001,
                organization_id: 0,
                operator_id: 99,
                operator_type: 1,
            },
            snapshot_uuid: "sync-dry-run".to_owned(),
            audit_log_uuid: "audit-sync-dry-run".to_owned(),
            source: "sdkwork_models".to_owned(),
            mode: "dry_run".to_owned(),
            vendor_codes: vec!["alibaba".to_owned()],
            force: false,
            catalog_root: None,
            catalog_version: Some(sdkwork_models_pinned_catalog_version()),
            request_id: "req-sync-dry-run".to_owned(),
            requested_at: "2026-05-07T13:00:00Z".to_owned(),
        })
        .await
        .unwrap();

    assert!(!dry_run.synced);
    assert_eq!("sdkwork_models", dry_run.source);
    assert!(dry_run
        .models
        .iter()
        .any(|model| model.model == "qwen3.6-max-preview"));

    let model_count: i64 =
        sqlx::query_scalar("SELECT COUNT(1) FROM ai_model WHERE model = 'qwen3.6-max-preview'")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(0, model_count, "dry_run must not mutate catalog tables");

    let sync_metadata: String = sqlx::query_scalar(
        r#"
        SELECT metadata
        FROM ai_model_catalog_sync_run
        WHERE uuid = 'catalog-sync-sync-dry-run'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(sync_metadata.contains("\"syncMode\":\"dry_run\""));
    assert!(sync_metadata.contains("\"dryRun\":true"));

    let source_row = sqlx::query(
        r#"
        SELECT CAST(last_success_at AS TEXT) AS last_success_at,
               catalog_version,
               source_hash
        FROM ai_model_catalog_source
        WHERE source_code = 'sdkwork_models'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(
        source_row
            .get::<Option<String>, _>("last_success_at")
            .is_none(),
        "dry_run must not advance catalog source last_success_at because no catalog facts were committed"
    );
    assert!(
        source_row
            .get::<Option<String>, _>("catalog_version")
            .is_none(),
        "dry_run must not publish a committed catalog source version before a real refresh succeeds"
    );
    assert!(
        source_row.get::<Option<String>, _>("source_hash").is_none(),
        "dry_run must not publish a committed catalog source hash before a real refresh succeeds"
    );
}

#[tokio::test]
async fn sqlite_admin_model_store_dry_run_preserves_existing_catalog_source_success_state() {
    let pool = schema_sqlite_pool().await;
    prepare_admin_model_schema(&pool).await;
    let store = SqliteAdminModelStore::new(pool.clone());
    let subject = AdminModelSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 99,
        operator_type: 1,
    };

    store
        .sync_catalog(SyncAdminModelCatalogCommand {
            subject,
            snapshot_uuid: "sync-source-success".to_owned(),
            audit_log_uuid: "audit-sync-source-success".to_owned(),
            source: "sdkwork_models".to_owned(),
            mode: "official_refresh".to_owned(),
            vendor_codes: vec!["openai".to_owned()],
            force: true,
            catalog_root: None,
            catalog_version: Some(sdkwork_models_pinned_catalog_version()),
            request_id: "req-sync-source-success".to_owned(),
            requested_at: "2026-05-07T12:00:00Z".to_owned(),
        })
        .await
        .unwrap();

    let before = sqlx::query(
        r#"
        SELECT CAST(last_observed_at AS TEXT) AS last_observed_at,
               CAST(last_success_at AS TEXT) AS last_success_at,
               catalog_version,
               source_hash,
               metadata
        FROM ai_model_catalog_source
        WHERE source_code = 'sdkwork_models'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    store
        .sync_catalog(SyncAdminModelCatalogCommand {
            subject,
            snapshot_uuid: "sync-source-dry-run-after-success".to_owned(),
            audit_log_uuid: "audit-sync-source-dry-run-after-success".to_owned(),
            source: "sdkwork_models".to_owned(),
            mode: "dry_run".to_owned(),
            vendor_codes: vec!["openai".to_owned()],
            force: false,
            catalog_root: None,
            catalog_version: Some(sdkwork_models_pinned_catalog_version()),
            request_id: "req-sync-source-dry-run-after-success".to_owned(),
            requested_at: "2026-05-07T13:00:00Z".to_owned(),
        })
        .await
        .unwrap();

    let after = sqlx::query(
        r#"
        SELECT CAST(last_observed_at AS TEXT) AS last_observed_at,
               CAST(last_success_at AS TEXT) AS last_success_at,
               catalog_version,
               source_hash,
               metadata
        FROM ai_model_catalog_source
        WHERE source_code = 'sdkwork_models'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(
        before.get::<String, _>("last_success_at"),
        after.get::<String, _>("last_success_at"),
        "dry_run must not clear or rewrite the last successful catalog import timestamp"
    );
    assert_eq!(
        before.get::<String, _>("catalog_version"),
        after.get::<String, _>("catalog_version"),
        "dry_run must not replace the catalog version that was last committed"
    );
    assert_eq!(
        before.get::<String, _>("source_hash"),
        after.get::<String, _>("source_hash"),
        "dry_run must not replace the source hash that identifies the last committed import"
    );
    assert_eq!(
        before.get::<String, _>("metadata"),
        after.get::<String, _>("metadata"),
        "dry_run must not replace source metadata for the last committed import"
    );
    assert_ne!(
        before.get::<String, _>("last_observed_at"),
        after.get::<String, _>("last_observed_at"),
        "dry_run should still update last_observed_at so operators can see the source was checked"
    );

    let dry_run_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_model_catalog_sync_run
        WHERE uuid = 'catalog-sync-sync-source-dry-run-after-success'
          AND run_status = 1
          AND json_extract(metadata, '$.dryRun') = 1
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        1, dry_run_count,
        "dry_run must remain visible as an independent catalog sync run"
    );
}

#[tokio::test]
async fn sqlite_admin_model_store_sync_catalog_source_hash_is_content_stable() {
    let pool = schema_sqlite_pool().await;
    prepare_admin_model_schema(&pool).await;
    let store = SqliteAdminModelStore::new(pool.clone());
    let subject = AdminModelSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 99,
        operator_type: 1,
    };

    let first = store
        .sync_catalog(SyncAdminModelCatalogCommand {
            subject,
            snapshot_uuid: "sync-stable-hash-first".to_owned(),
            audit_log_uuid: "audit-sync-stable-hash-first".to_owned(),
            source: "sdkwork_models".to_owned(),
            mode: "official_refresh".to_owned(),
            vendor_codes: vec!["openai".to_owned()],
            force: true,
            catalog_root: None,
            catalog_version: Some(sdkwork_models_pinned_catalog_version()),
            request_id: "req-sync-stable-hash-first".to_owned(),
            requested_at: "2026-05-07T12:00:00Z".to_owned(),
        })
        .await
        .unwrap();

    let second = store
        .sync_catalog(SyncAdminModelCatalogCommand {
            subject,
            snapshot_uuid: "sync-stable-hash-second".to_owned(),
            audit_log_uuid: "audit-sync-stable-hash-second".to_owned(),
            source: "sdkwork_models".to_owned(),
            mode: "official_refresh".to_owned(),
            vendor_codes: vec!["openai".to_owned()],
            force: true,
            catalog_root: None,
            catalog_version: Some(sdkwork_models_pinned_catalog_version()),
            request_id: "req-sync-stable-hash-second".to_owned(),
            requested_at: "2026-05-07T12:30:00Z".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!(
        first.source_hash, second.source_hash,
        "same source, catalog version, and vendor scope must produce a stable source_hash independent of request entropy"
    );

    let run_hashes = sqlx::query(
        r#"
        SELECT first_run.source_hash AS first_hash,
               second_run.source_hash AS second_hash
        FROM ai_model_catalog_sync_run first_run
        CROSS JOIN ai_model_catalog_sync_run second_run
        WHERE first_run.uuid = 'catalog-sync-sync-stable-hash-first'
          AND second_run.uuid = 'catalog-sync-sync-stable-hash-second'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        run_hashes.get::<String, _>("first_hash"),
        run_hashes.get::<String, _>("second_hash"),
        "persisted sync run source_hash must be content-stable as well"
    );
}

#[tokio::test]
async fn sqlite_admin_model_store_persists_mapping_rule_children_and_resolves_item() {
    let pool = schema_sqlite_pool().await;
    prepare_admin_model_schema(&pool).await;
    let store = SqliteAdminModelStore::new(pool.clone());
    let subject = AdminModelSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 99,
        operator_type: 1,
    };

    let created = store
        .create_model_mapping(CreateAdminModelMappingCommand {
            subject,
            mapping_uuid: "mapping-rule-aggregate".to_owned(),
            binding_uuids: vec!["mapping-binding-global".to_owned()],
            item_uuids: vec![
                "mapping-item-gpt-4o".to_owned(),
                "mapping-item-sonnet".to_owned(),
            ],
            audit_log_uuid: "audit-create-mapping-rule-aggregate".to_owned(),
            draft: AdminModelMappingRuleDraft {
                source_vendor_id: None,
                source_vendor_code: "openai".to_owned(),
                target_vendor_id: None,
                target_vendor_code: "anthropic".to_owned(),
                mapping_mode: "alias".to_owned(),
                match_type: "exact".to_owned(),
                enabled: true,
                bindings: vec![AdminModelMappingRuleBindingDraft {
                    id: None,
                    binding_type: "global".to_owned(),
                    binding_id: None,
                    binding_code: None,
                    binding_name: Some("All requests".to_owned()),
                    enabled: true,
                }],
                mapping_items: vec![
                    AdminModelMappingRuleItemDraft {
                        id: None,
                        source_model: "gpt-4o-mini".to_owned(),
                        source_catalog_key: None,
                        target_model: "claude-haiku".to_owned(),
                        target_catalog_key: Some("anthropic/claude-haiku".to_owned()),
                        target_provider_model: Some("claude-3-haiku".to_owned()),
                        target_provider_native_model: Some("claude-3-haiku-native".to_owned()),
                        enabled: Some(true),
                    },
                    AdminModelMappingRuleItemDraft {
                        id: None,
                        source_model: "sonnet-latest".to_owned(),
                        source_catalog_key: None,
                        target_model: "claude-sonnet".to_owned(),
                        target_catalog_key: Some("anthropic/claude-sonnet".to_owned()),
                        target_provider_model: None,
                        target_provider_native_model: None,
                        enabled: Some(true),
                    },
                ],
            },
            request_id: "req-create-mapping-rule-aggregate".to_owned(),
            requested_at: "2026-06-02T10:00:00Z".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!(1, created.bindings.len());
    assert_eq!(2, created.mapping_items.len());
    assert_eq!("global", created.binding_type);

    let retained_item_id = created.mapping_items[0].id;
    let updated = store
        .update_model_mapping(UpdateAdminModelMappingCommand {
            subject,
            audit_log_uuid: "audit-update-mapping-rule-items".to_owned(),
            mapping_id: created.id.to_string(),
            binding_uuids: Vec::new(),
            item_uuids: vec!["mapping-item-gpt-5".to_owned()],
            patch: AdminModelMappingRulePatch {
                mapping_items: Some(vec![
                    AdminModelMappingRuleItemDraft {
                        id: Some(retained_item_id),
                        source_model: "gpt-4o-mini".to_owned(),
                        source_catalog_key: None,
                        target_model: "claude-haiku-v2".to_owned(),
                        target_catalog_key: Some("anthropic/claude-haiku-v2".to_owned()),
                        target_provider_model: Some("claude-3-5-haiku".to_owned()),
                        target_provider_native_model: Some("claude-3-5-haiku-native".to_owned()),
                        enabled: Some(true),
                    },
                    AdminModelMappingRuleItemDraft {
                        id: None,
                        source_model: "gpt-5-mini".to_owned(),
                        source_catalog_key: None,
                        target_model: "claude-sonnet-v2".to_owned(),
                        target_catalog_key: Some("anthropic/claude-sonnet-v2".to_owned()),
                        target_provider_model: None,
                        target_provider_native_model: None,
                        enabled: Some(true),
                    },
                ]),
                ..AdminModelMappingRulePatch::default()
            },
            request_id: "req-update-mapping-rule-items".to_owned(),
            requested_at: "2026-06-02T10:05:00Z".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!(
        1,
        updated.bindings.len(),
        "relation-only update must preserve existing associated content bindings"
    );
    assert_eq!(2, updated.mapping_items.len());
    assert!(updated
        .mapping_items
        .iter()
        .any(|item| item.source_model == "gpt-5-mini" && item.target_model == "claude-sonnet-v2"));
    assert!(!updated
        .mapping_items
        .iter()
        .any(|item| item.source_model == "sonnet-latest"));

    let soft_deleted_old_item_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_model_mapping_rule_item
        WHERE rule_id = ?
          AND source_model = 'sonnet-latest'
          AND status = 0
          AND deleted_at IS NOT NULL
        "#,
    )
    .bind(created.id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1, soft_deleted_old_item_count);

    let listed = store
        .list_model_mappings(ListAdminModelMappingsQuery {
            subject,
            binding_type: None,
            vendor_code: None,
            channel_id: None,
            channel_code: None,
            q: Some("gpt-5".to_owned()),
            page_size: None,
            offset: None,
        })
        .await
        .unwrap();
    assert_eq!(1, listed.items.len());
    assert_eq!(1, listed.total_count);
    assert_eq!(created.id, listed.items[0].id);

    let resolved = store
        .resolve_model_mapping(ResolveAdminModelMappingQuery {
            subject,
            source_model: "gpt-5-mini".to_owned(),
            vendor_code: Some("openai".to_owned()),
            channel_id: None,
            channel_code: None,
            provider_account_id: None,
            provider_account_code: None,
        })
        .await
        .unwrap();

    assert!(resolved.matched);
    assert_eq!("global", resolved.matched_binding_type.as_deref().unwrap());
    assert_eq!("claude-sonnet-v2", resolved.target_model);
    assert_eq!(
        Some("anthropic/claude-sonnet-v2".to_owned()),
        resolved.target_catalog_key
    );
}

async fn create_admin_model_tables(pool: &sqlx::SqlitePool) {
    sqlx::query(
        r#"
        CREATE TABLE ai_model (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            deleted_at TEXT,
            catalog_key TEXT,
            model TEXT,
            display_name TEXT,
            vendor_id INTEGER,
            vendor_code TEXT,
            region_code TEXT,
            capability INTEGER,
            modalities TEXT,
            input_modalities TEXT,
            output_modalities TEXT,
            description TEXT,
            api_format TEXT,
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
            rank_score REAL,
            release_stage INTEGER,
            shelf_state INTEGER,
            routing_state INTEGER,
            replacement_model TEXT
        )
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        CREATE TABLE ai_model_pricing (
            id INTEGER PRIMARY KEY,
            model_id INTEGER,
            region_code TEXT,
            metadata TEXT NOT NULL DEFAULT '{}',
            price_side INTEGER,
            billing_meter_code TEXT,
            unit_price TEXT,
            currency TEXT,
            priority INTEGER,
            status INTEGER,
            deleted_at TEXT
        )
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        CREATE TABLE ai_model_rank_snapshot (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            snapshot_date TEXT,
            snapshot_period INTEGER,
            rank_scope TEXT,
            model TEXT,
            vendor_code TEXT,
            rank_no INTEGER,
            request_count INTEGER,
            base_volume INTEGER
        )
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn prepare_admin_model_schema(pool: &sqlx::SqlitePool) {
    DatabaseInstaller::for_sqlite(pool.clone())
        .with_options(test_database_install_options())
        .unwrap()
        .refresh_catalog(CatalogRefreshOptions {
            source: "admin_model_store_schema_fixture".to_owned(),
            mode: "dry_run".to_owned(),
            vendor_codes: vec!["alibaba".to_owned()],
            force: false,
            catalog_root: None,
            catalog_version: Some(sdkwork_models_pinned_catalog_version()),
        })
        .await
        .unwrap();
}

async fn install_admin_model_catalog(pool: &sqlx::SqlitePool, vendor_codes: &[&str]) {
    DatabaseInstaller::for_sqlite(pool.clone())
        .with_options(test_database_install_options())
        .unwrap()
        .refresh_catalog(CatalogRefreshOptions {
            source: "admin_model_store_catalog_fixture".to_owned(),
            mode: "vendor_refresh".to_owned(),
            vendor_codes: vendor_codes
                .iter()
                .map(|vendor_code| (*vendor_code).to_owned())
                .collect(),
            force: true,
            catalog_root: None,
            catalog_version: Some(sdkwork_models_pinned_catalog_version()),
        })
        .await
        .unwrap();
}

fn decimal_value(value: &str) -> f64 {
    value
        .parse::<f64>()
        .unwrap_or_else(|error| panic!("invalid decimal value {value}: {error}"))
}

fn catalog_model_is_publicly_active(model: &sdkwork_models::ModelInfo) -> bool {
    matches!(model.release_stage.as_str(), "active" | "preview")
        && model.shelf_state == "listed"
        && model.routing_state == "enabled"
        && !matches!(
            model.lifecycle.as_str(),
            "deprecated" | "catalog_only" | "retired"
        )
}

async fn active_model_pricing_snapshot(
    pool: &sqlx::SqlitePool,
    model_id: i64,
) -> Vec<(String, String, String, String)> {
    sqlx::query(
        r#"
        SELECT region_code, billing_meter_code, CAST(unit_price AS TEXT) AS unit_price, currency
        FROM ai_model_pricing
        WHERE model_id = ?
          AND price_side = 1
          AND pricing_scope = 1
          AND status = 1
          AND deleted_at IS NULL
        ORDER BY region_code ASC, priority ASC, id ASC
        "#,
    )
    .bind(model_id)
    .fetch_all(pool)
    .await
    .unwrap()
    .into_iter()
    .map(|row| {
        (
            row.get::<String, _>("region_code"),
            row.get::<String, _>("billing_meter_code"),
            row.get::<String, _>("unit_price"),
            row.get::<String, _>("currency"),
        )
    })
    .collect()
}

fn assert_admin_region_model_prices(region_prices: &[AdminAiModelRegionPriceCommand]) {
    assert_eq!(2, region_prices.len());
    assert_eq!("cn", region_prices[0].region_code);
    assert_eq!("CNY", region_prices[0].currency);
    assert_eq!(0.18, decimal_value(&region_prices[0].price_in));
    assert_eq!(0.56, decimal_value(&region_prices[0].price_out));
    assert_eq!(
        Some(0.04),
        region_prices[0]
            .cache_read_price
            .as_deref()
            .map(decimal_value)
    );
    assert_eq!(
        Some(0.08),
        region_prices[0]
            .cache_write_price
            .as_deref()
            .map(decimal_value)
    );
    assert_eq!("global", region_prices[1].region_code);
    assert_eq!("USD", region_prices[1].currency);
    assert_eq!(0.12, decimal_value(&region_prices[1].price_in));
    assert_eq!(0.45, decimal_value(&region_prices[1].price_out));
    assert_eq!(None, region_prices[1].cache_read_price);
    assert_eq!(None, region_prices[1].cache_write_price);
}

fn list_all_admin_models_query(subject: AdminModelSubject) -> ListAdminAiModelsQuery {
    ListAdminAiModelsQuery {
        subject,
        vendor_id: None,
        vendor_code: None,
        q: None,
        model_types: None,
        page_size: None,
        offset: None,
    }
}

fn assert_model_region_codes(
    region_prices: &[AdminAiModelRegionPriceCommand],
    expected_region_codes: &[&str],
) {
    let actual = region_prices
        .iter()
        .map(|price| price.region_code.as_str())
        .collect::<Vec<_>>();
    assert_eq!(expected_region_codes, actual.as_slice());
    for region_price in region_prices {
        assert!(
            !region_price.price_in.is_empty() || !region_price.price_out.is_empty(),
            "{} region price must include input or output price",
            region_price.region_code
        );
    }
}

fn assert_model_region_price_side(
    models: &[sdkwork_clawrouter_router_service::ports::AdminAiModelItem],
    vendor_code: &str,
    model_name: &str,
    region_code: &str,
    expected_price_in: Option<f64>,
    expected_price_out: Option<f64>,
) {
    let model = models
        .iter()
        .find(|item| item.vendor_code == vendor_code && item.model == model_name)
        .unwrap_or_else(|| panic!("{vendor_code}/{model_name} should be listed"));
    let region_price = model
        .region_prices
        .iter()
        .find(|price| price.region_code == region_code)
        .unwrap_or_else(|| {
            panic!("{vendor_code}/{model_name} should include {region_code} region price")
        });
    assert_eq!(
        expected_price_in,
        non_empty_decimal_value(&region_price.price_in),
        "{vendor_code}/{model_name} input price"
    );
    assert_eq!(
        expected_price_out,
        non_empty_decimal_value(&region_price.price_out),
        "{vendor_code}/{model_name} output price"
    );
}

fn non_empty_decimal_value(value: &str) -> Option<f64> {
    if value.trim().is_empty() {
        None
    } else {
        Some(decimal_value(value))
    }
}
