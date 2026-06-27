use sdkwork_clawrouter_router_service::infrastructure::sql::installer::{
    CatalogRefreshOptions, DatabaseInstallOptions, DatabaseInstaller, InstallationStatus,
    CURRENT_SCHEMA_VERSION,
};
use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAdminAiResourceStore;
use sdkwork_clawrouter_router_service::ports::{
    AdminAiResourceStore, AdminAiResourceSubject, ListAdminAiResourceGroupResourcesQuery,
    ListAdminAiResourceGroupsQuery,
};
use sdkwork_clawrouter_router_service_test_support::installed_sqlite_pool;
use sqlx::{Row, SqlitePool};
use std::collections::{BTreeMap, BTreeSet};

const SCHEMA_VERSION: &str = CURRENT_SCHEMA_VERSION;
const CATALOG_VERSION: &str = "2026.05.08.1";

#[tokio::test]
async fn sqlite_installer_upgrades_existing_installation_when_versions_change() {
    let pool = installed_sqlite_pool().await;
    let installer = installer(pool.clone());
    sqlx::query(
        r#"
        UPDATE system_installation_state
        SET schema_version = '2026.05.06.1',
            catalog_version = '2026.05.06.1'
        WHERE id = 1
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    assert_eq!(
        InstallationStatus::UpgradeRequired,
        installer.status().await.unwrap()
    );
    sqlx::query(
        r#"
        END
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let upgraded = installer.ensure_installed().await.unwrap();
    assert_eq!(InstallationStatus::Installed, upgraded.status);
    assert!(upgraded.changed);
    assert_eq!(CATALOG_VERSION, upgraded.catalog_version);

    let state = sqlx::query(
        r#"
        SELECT schema_version, catalog_version, status
        FROM system_installation_state
        WHERE id = 1
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(SCHEMA_VERSION, state.get::<String, _>("schema_version"));
    assert_eq!(CATALOG_VERSION, state.get::<String, _>("catalog_version"));
    assert_eq!("installed", state.get::<String, _>("status"));

    assert_catalog_rows(&pool, &bundled_catalog()).await;
}

#[tokio::test]
async fn sqlite_installer_catalog_sync_failure_rolls_back_catalog_rows() {
    let pool = installed_sqlite_pool().await;
    let installer = installer(pool.clone());

    let original_price: String = sqlx::query_scalar(
        r#"
        SELECT printf('%.6f', unit_price)
        FROM ai_model_pricing
        WHERE model = 'gpt-5.5-pro'
          AND billing_meter_code = 'llm_input_token'
          AND status = 1
        LIMIT 1
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        UPDATE ai_model_pricing
        SET unit_price = '999999.000000'
        WHERE model = 'gpt-5.5-pro'
          AND billing_meter_code = 'llm_input_token'
          AND status = 1
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        CREATE TRIGGER reject_catalog_refresh_snapshot
        BEFORE INSERT ON ai_pricing_import_snapshot
        BEGIN
            SELECT RAISE(ABORT, 'test forced pricing import snapshot failure');
        END
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let error = installer
        .refresh_catalog(CatalogRefreshOptions {
            mode: "vendor_refresh".to_owned(),
            vendor_codes: vec!["openai".to_owned()],
            force: true,
            ..CatalogRefreshOptions::default()
        })
        .await
        .unwrap_err();

    assert!(
        error
            .to_string()
            .contains("test forced pricing import snapshot failure"),
        "refresh must return the root snapshot failure"
    );
    let price_after_failure: String = sqlx::query_scalar(
        r#"
        SELECT printf('%.6f', unit_price)
        FROM ai_model_pricing
        WHERE model = 'gpt-5.5-pro'
          AND billing_meter_code = 'llm_input_token'
          AND status = 1
        LIMIT 1
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        "999999.000000", price_after_failure,
        "failed catalog sync must not partially update model pricing before sync audit commits"
    );
    assert_ne!(
        original_price, price_after_failure,
        "the test must prove rollback against a catalog value that would otherwise be restored"
    );
}

#[tokio::test]
async fn sqlite_installer_imports_canonical_ranking_catalog_keys() {
    let pool = installed_sqlite_pool().await;

    assert_eq!(
        0_i64,
        sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(1)
            FROM ai_model_rank_snapshot
            WHERE status = 1
              AND catalog_key = vendor_code || '/' || region_code || '/' || model
            "#,
        )
        .fetch_one(&pool)
        .await
        .unwrap(),
        "ranking catalog_key must use canonical vendor/model identity; region_code is a separate supply context"
    );

    let catalog_key: String = sqlx::query_scalar(
        r#"
        SELECT catalog_key
        FROM ai_model_rank_snapshot
        WHERE vendor_code = 'openai'
          AND model = 'gpt-5.5'
          AND status = 1
        LIMIT 1
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!("openai/gpt-5.5", catalog_key);
}

#[tokio::test]
async fn sqlite_installer_imports_bundled_ai_routing_seed_catalog() {
    let pool = installed_sqlite_pool().await;
    let repeated_install = installer(pool.clone()).ensure_installed().await.unwrap();
    assert_eq!(InstallationStatus::Installed, repeated_install.status);

    let endpoint_codes = sqlx::query_scalar::<_, String>(
        r#"
        SELECT endpoint_code
        FROM ai_api_endpoint
        WHERE tenant_id = 0
          AND organization_id = 0
          AND status = 1
          AND deleted_at IS NULL
          AND json_extract(metadata, '$.catalogCode') = 'sdkwork-ai-routing'
        "#,
    )
    .fetch_all(&pool)
    .await
    .unwrap()
    .into_iter()
    .collect::<BTreeSet<_>>();

    for expected in [
        "openai.responses",
        "openai.conversations",
        "openai.images.edits",
        "openai.audio.speech",
        "openai.codex.responses",
        "openai.administration",
        "gemini.stream_generate_content",
        "gemini.nano_banana.image_generation",
        "kling.image_to_video",
        "jimeng.video_generation",
        "volcengine.task_query",
        "minimax.music_generation",
        "vidu.reference_to_image",
    ] {
        assert!(
            endpoint_codes.contains(expected),
            "bundled AI routing endpoint seed must include {expected}"
        );
    }

    let seeded_resource_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_resource
        WHERE tenant_id = 0
          AND organization_id = 0
          AND status = 1
          AND deleted_at IS NULL
          AND json_extract(metadata, '$.catalogCode') = 'sdkwork-ai-routing'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(
        seeded_resource_count >= 50,
        "AI routing seed must install a complete vendor/modality/API resource catalog"
    );

    let admin_api_group_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_resource_group
        WHERE tenant_id = 0
          AND organization_id = 0
          AND group_type = 'api_group'
          AND status = 1
          AND deleted_at IS NULL
          AND json_extract(metadata, '$.catalogCode') = 'sdkwork-ai-routing'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        21, admin_api_group_count,
        "admin model resource management must seed exactly the 21 requested API groups"
    );

    let codex_group = sqlx::query(
        r#"
        SELECT id, group_name, description
        FROM ai_resource_group
        WHERE tenant_id = 0
          AND organization_id = 0
          AND group_code = 'api.openai.codex'
          AND group_type = 'api_group'
          AND status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        "OpenAI Codex API",
        codex_group.get::<String, _>("group_name")
    );
    assert_eq!(
        "OpenAI Codex API resources.",
        codex_group.get::<String, _>("description")
    );

    let codex_resource_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_resource
        WHERE tenant_id = 0
          AND organization_id = 0
          AND resource_type = 'api_endpoint'
          AND (
              resource_code = 'api.openai.codex'
              OR resource_code LIKE 'api.openai.codex.%'
              OR resource_code IN ('api.openai.containers', 'api.openai.skills')
          )
          AND status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    let codex_group_item_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_resource_group_item
        WHERE tenant_id = 0
          AND organization_id = 0
          AND resource_group_id = ?
          AND (
              resource_code = 'api.openai.codex'
              OR resource_code LIKE 'api.openai.codex.%'
              OR resource_code IN ('api.openai.containers', 'api.openai.skills')
          )
          AND status = 1
          AND deleted_at IS NULL
        "#,
    )
    .bind(codex_group.get::<i64, _>("id"))
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        codex_resource_count, codex_group_item_count,
        "OpenAI Codex API group must include every bundled Codex API resource"
    );

    let default_channel_credential_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_channel c
        JOIN ai_channel_credential cc
          ON cc.channel_id = c.id
         AND cc.tenant_id = c.tenant_id
         AND cc.organization_id = c.organization_id
         AND cc.status = 1
         AND cc.deleted_at IS NULL
        WHERE c.tenant_id = 100001
          AND c.organization_id = 0
          AND c.channel_code = 'openai-default'
          AND c.deleted_at IS NULL
          AND NULLIF(cc.base_url, '') IS NOT NULL
          AND NULLIF(cc.credential_ref, '') IS NOT NULL
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        1, default_channel_credential_count,
        "default admin OpenAI channel seed must install an active credential row for runtime routing"
    );

    let all_api_group = sqlx::query(
        r#"
        SELECT id, selection_mode
        FROM ai_resource_group
        WHERE tenant_id = 0
          AND organization_id = 0
          AND group_code = 'api.all'
          AND group_type = 'api_group'
          AND status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!("all", all_api_group.get::<String, _>("selection_mode"));

    let bundled_api_resource_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_resource
        WHERE tenant_id = 0
          AND organization_id = 0
          AND resource_type = 'api_endpoint'
          AND status = 1
          AND deleted_at IS NULL
          AND json_extract(metadata, '$.catalogCode') = 'sdkwork-ai-routing'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    let all_api_item_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_resource_group_item
        WHERE tenant_id = 0
          AND organization_id = 0
          AND resource_group_id = ?
          AND status = 1
          AND deleted_at IS NULL
        "#,
    )
    .bind(all_api_group.get::<i64, _>("id"))
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        bundled_api_resource_count, all_api_item_count,
        "api.all must persist a group item relationship for every bundled API endpoint resource"
    );

    let all_api_required_item_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_resource_group_item item
        WHERE item.tenant_id = 0
          AND item.organization_id = 0
          AND item.resource_group_id = ?
          AND item.resource_code IN ('api.minimax.music_generation', 'api.vidu.reference_to_image')
          AND item.status = 1
          AND item.deleted_at IS NULL
        "#,
    )
    .bind(all_api_group.get::<i64, _>("id"))
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        2, all_api_required_item_count,
        "api.all must include newly seeded Minimax music and Vidu image API resources"
    );

    let nullable_unique_key_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_resource_group_item
        WHERE tenant_id = 0
          AND organization_id = 0
          AND status = 1
          AND deleted_at IS NULL
          AND json_extract(metadata, '$.catalogCode') = 'sdkwork-ai-routing'
          AND (resource_code IS NULL OR child_resource_group_code IS NULL)
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        0, nullable_unique_key_count,
        "AI routing resource group seed items must bind empty strings instead of NULL for the unused unique-key side"
    );

    let duplicate_item_key_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM (
            SELECT resource_group_id, item_type, resource_code, child_resource_group_code, COUNT(1) AS item_count
            FROM ai_resource_group_item
            WHERE tenant_id = 0
              AND organization_id = 0
              AND status = 1
              AND deleted_at IS NULL
              AND json_extract(metadata, '$.catalogCode') = 'sdkwork-ai-routing'
            GROUP BY resource_group_id, item_type, resource_code, child_resource_group_code
            HAVING COUNT(1) > 1
        ) duplicated
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        0, duplicate_item_key_count,
        "AI routing resource group items must stay idempotent across repeated installer repairs"
    );

    let default_channel_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_channel
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND channel_code = 'openai-default'
          AND provider_code = 'openai'
          AND channel_type = 'official'
          AND status = 0
          AND deleted_at IS NULL
          AND json_extract(metadata, '$.catalogCode') = 'sdkwork-ai-routing'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        1, default_channel_count,
        "AI routing seed must create a disabled default admin channel for configuring provider endpoints"
    );

    let default_channel_credential_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_channel_credential cc
        INNER JOIN ai_channel c
          ON c.id = cc.channel_id
         AND c.tenant_id = cc.tenant_id
         AND c.organization_id = cc.organization_id
        WHERE cc.tenant_id = 100001
          AND cc.organization_id = 0
          AND cc.provider_code = 'openai'
          AND cc.channel_code = 'openai-default'
          AND cc.base_url = 'https://api.openai.com/v1'
          AND cc.status = 1
          AND cc.deleted_at IS NULL
          AND c.channel_code = 'openai-default'
          AND c.deleted_at IS NULL
          AND json_extract(cc.metadata, '$.catalogCode') = 'sdkwork-ai-routing'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        1, default_channel_credential_count,
        "AI routing seed must create one active credential for the disabled default admin channel"
    );
}

#[tokio::test]
async fn sqlite_ai_routing_seed_reimport_disables_removed_system_api_groups() {
    let pool = installed_sqlite_pool().await;
    sqlx::query(
        r#"
        INSERT INTO ai_resource_group
            (uuid, tenant_id, organization_id, data_scope, status, metadata, group_code, group_name, group_type, selection_mode, description, sort_order)
        VALUES
            ('legacy-removed-api-group', 0, 0, 1, 1, '{"catalogCode":"sdkwork-ai-routing","itemType":"resource_group","itemCode":"api.legacy.removed"}', 'api.legacy.removed', 'Removed Legacy API', 'api_group', 'all', 'Removed legacy API resources.', 3)
        ON CONFLICT(tenant_id, organization_id, group_code) DO UPDATE SET
            status = 1,
            deleted_at = NULL,
            metadata = excluded.metadata,
            group_name = excluded.group_name,
            description = excluded.description
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        UPDATE system_schema_migration
        SET checksum = 'stale-ai-routing-checksum'
        WHERE migration_key = ?
        "#,
    )
    .bind(format!("ai-routing:{SCHEMA_VERSION}"))
    .execute(&pool)
    .await
    .unwrap();

    let report = installer(pool.clone()).ensure_installed().await.unwrap();
    assert_eq!(InstallationStatus::Installed, report.status);

    let legacy_active_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_resource_group
        WHERE tenant_id = 0
          AND organization_id = 0
          AND group_code = 'api.legacy.removed'
          AND group_type = 'api_group'
          AND status = 1
          AND deleted_at IS NULL
          AND json_extract(metadata, '$.catalogCode') = 'sdkwork-ai-routing'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        0, legacy_active_count,
        "AI routing seed reimport must disable removed system API groups"
    );

    let current_active_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_resource_group
        WHERE tenant_id = 0
          AND organization_id = 0
          AND group_code = 'api.openai.codex'
          AND group_name = 'OpenAI Codex API'
          AND group_type = 'api_group'
          AND status = 1
          AND deleted_at IS NULL
          AND json_extract(metadata, '$.catalogCode') = 'sdkwork-ai-routing'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1, current_active_count);
}

#[tokio::test]
async fn sqlite_installed_admin_ai_resource_store_exposes_seeded_api_groups_to_admin_subject() {
    let pool = installed_sqlite_pool().await;
    let store = SqliteAdminAiResourceStore::new(pool);
    let subject = AdminAiResourceSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 30,
        operator_type: 1,
    };

    let groups = store
        .list_ai_resource_groups(ListAdminAiResourceGroupsQuery { subject })
        .await
        .unwrap();
    assert_eq!(
        21,
        groups
            .iter()
            .filter(|group| group.group_type == "api_group")
            .count(),
        "resource management should see bundled system-level API groups after installation"
    );
    let api_all = groups
        .iter()
        .find(|group| group.group_code == "api.all")
        .expect("api.all group should be visible to admin resource management");
    assert_eq!("all", api_all.selection_mode);
    assert!(!api_all.dynamic);
    assert!(
        api_all.resource_count >= 50,
        "api.all should expose the installed API endpoint resources"
    );

    let resources = store
        .list_ai_resource_group_resources(ListAdminAiResourceGroupResourcesQuery {
            subject,
            group_id_or_code: "api.all".to_owned(),
        })
        .await
        .unwrap();
    assert_eq!(api_all.resource_count as usize, resources.len());
    assert!(
        resources
            .iter()
            .any(|resource| resource.resource_code == "api.openai.chat_completions"),
        "api.all should include OpenAI Chat API resource"
    );
    assert!(
        resources
            .iter()
            .any(|resource| resource.resource_code == "api.minimax.music_generation"),
        "api.all should include Minimax music API resource"
    );
}

fn installer(pool: SqlitePool) -> DatabaseInstaller {
    DatabaseInstaller::for_sqlite(pool)
        .with_options(DatabaseInstallOptions::new("test", "commercial").unwrap())
        .unwrap()
}

async fn assert_catalog_rows(pool: &SqlitePool, catalog: &sdkwork_models::ModelCatalog) {
    let expected_active_model_keys = catalog_public_model_keys(catalog);
    let expected_price_keys = catalog_price_keys(catalog);
    let expected_ranking_keys = catalog_ranking_keys(catalog);

    let vendor_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(DISTINCT vendor_code)
        FROM ai_model_vendor
        WHERE status = 1
        "#,
    )
    .fetch_one(pool)
    .await
    .unwrap();
    let family_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(DISTINCT vendor_code || '/' || family_code)
        FROM ai_model_family
        WHERE status = 1
        "#,
    )
    .fetch_one(pool)
    .await
    .unwrap();
    let model_count: i64 = sqlx::query_scalar("SELECT COUNT(1) FROM ai_model WHERE status = 1")
        .fetch_one(pool)
        .await
        .unwrap();
    let meter_count: i64 =
        sqlx::query_scalar("SELECT COUNT(1) FROM ai_billing_meter WHERE status = 1")
            .fetch_one(pool)
            .await
            .unwrap();
    let pricing_count: i64 =
        sqlx::query_scalar("SELECT COUNT(1) FROM ai_model_pricing WHERE status = 1")
            .fetch_one(pool)
            .await
            .unwrap();
    let ranking_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_model_rank_snapshot
        WHERE status = 1
        "#,
    )
    .fetch_one(pool)
    .await
    .unwrap();

    assert_eq!(catalog_vendor_codes(catalog).len() as i64, vendor_count);
    assert_eq!(catalog_family_keys(catalog).len() as i64, family_count);
    assert_eq!(expected_active_model_keys.len() as i64, model_count);
    assert_eq!(catalog.meters.len() as i64, meter_count);
    assert!(
        pricing_count >= expected_price_keys.len() as i64,
        "ai_model_pricing may expand catalog price entries into runtime-specific rows, but it must contain every catalog price key"
    );
    assert_eq!(expected_ranking_keys.len() as i64, ranking_count);

    let actual_vendor_capabilities = sqlx::query(
        r#"
        SELECT vendor_code, supported_protocols, client_api_compatibility
        FROM ai_model_vendor
        WHERE status = 1
        "#,
    )
    .fetch_all(pool)
    .await
    .unwrap()
    .into_iter()
    .map(|row| {
        (
            row.get::<String, _>("vendor_code"),
            (
                row.get::<Option<String>, _>("supported_protocols")
                    .unwrap_or_default(),
                row.get::<Option<String>, _>("client_api_compatibility")
                    .unwrap_or_default(),
            ),
        )
    })
    .collect::<BTreeMap<_, _>>();

    for vendor in &catalog.vendors {
        let (supported_protocols, client_api_compatibility) = actual_vendor_capabilities
            .get(&vendor.vendor.vendor_code)
            .unwrap_or_else(|| {
                panic!(
                    "{} vendor metadata must be imported",
                    vendor.vendor.vendor_code
                )
            });
        let supported_protocols: Vec<String> = serde_json::from_str(supported_protocols)
            .expect("ai_model_vendor.supported_protocols must be a JSON string array");
        for expected in &vendor.vendor.supported_protocols {
            assert!(
                supported_protocols.contains(expected),
                "{} supported_protocols must include {expected}",
                vendor.vendor.vendor_code
            );
        }
        let client_api_compatibility: serde_json::Value =
            serde_json::from_str(client_api_compatibility)
                .expect("ai_model_vendor.client_api_compatibility must be JSON");
        for client_api_code in ["codex", "claude_code", "gemini_cli"] {
            assert!(
                client_api_compatibility.get(client_api_code).is_some(),
                "{} client_api_compatibility must include {client_api_code}",
                vendor.vendor.vendor_code
            );
        }
    }

    let actual_model_capabilities = sqlx::query(
        r#"
        SELECT catalog_key, capabilities
        FROM ai_model
        WHERE status = 1
        "#,
    )
    .fetch_all(pool)
    .await
    .unwrap()
    .into_iter()
    .map(|row| {
        (
            row.get::<String, _>("catalog_key"),
            row.get::<Option<String>, _>("capabilities")
                .unwrap_or_default(),
        )
    })
    .collect::<BTreeMap<_, _>>();

    for vendor in &catalog.vendors {
        for model in &vendor.models {
            if !catalog_model_is_publicly_active(model) {
                continue;
            }
            let catalog_key = catalog_model_key(&vendor.vendor.vendor_code, &model.model_id);
            let capabilities = actual_model_capabilities
                .get(&catalog_key)
                .unwrap_or_else(|| panic!("{catalog_key} must be imported from sdkwork-models"));
            let capabilities: Vec<String> = serde_json::from_str(&capabilities)
                .expect("ai_model.capabilities must be a JSON string array");
            assert!(
                !capabilities.is_empty(),
                "{} must not import an empty ai_model.capabilities array",
                catalog_key
            );
            let expected_capabilities = if model.capabilities.is_empty() {
                vec![model.primary_capability.clone()]
            } else {
                model.capabilities.clone()
            };
            for expected in expected_capabilities {
                assert!(
                    capabilities.contains(&expected),
                    "{} capabilities must include {expected}",
                    catalog_key
                );
            }
        }
    }

    let actual_price_keys = sqlx::query(
        r#"
        SELECT catalog_key, billing_meter_code, price_side, pricing_scope
        FROM ai_model_pricing
        WHERE status = 1
        "#,
    )
    .fetch_all(pool)
    .await
    .unwrap()
    .into_iter()
    .map(|row| CatalogPriceKey {
        catalog_key: row.get::<String, _>("catalog_key"),
        meter_code: row.get::<String, _>("billing_meter_code"),
        price_side: row.get::<i64, _>("price_side") as i32,
        pricing_scope: row.get::<i64, _>("pricing_scope") as i32,
    })
    .collect::<BTreeSet<_>>();
    for price_key in expected_price_keys {
        assert!(
            actual_price_keys.contains(&price_key),
            "{} {} side={} scope={} must be imported from sdkwork-models pricing",
            price_key.catalog_key,
            price_key.meter_code,
            price_key.price_side,
            price_key.pricing_scope
        );
    }

    let actual_ranking_keys = sqlx::query(
        r#"
        SELECT snapshot_date, rank_scope, vendor_code, region_code, catalog_key
        FROM ai_model_rank_snapshot
        WHERE status = 1
        "#,
    )
    .fetch_all(pool)
    .await
    .unwrap()
    .into_iter()
    .map(|row| CatalogRankingKey {
        snapshot_date: row.get::<String, _>("snapshot_date"),
        rank_scope: row.get::<String, _>("rank_scope"),
        vendor_code: row.get::<String, _>("vendor_code"),
        region_code: row.get::<String, _>("region_code"),
        catalog_key: row.get::<String, _>("catalog_key"),
    })
    .collect::<BTreeSet<_>>();
    for ranking_key in expected_ranking_keys {
        assert!(
            actual_ranking_keys.contains(&ranking_key),
            "{} {} {} {} {} must be imported from sdkwork-models rankings",
            ranking_key.snapshot_date,
            ranking_key.rank_scope,
            ranking_key.vendor_code,
            ranking_key.region_code,
            ranking_key.catalog_key
        );
    }
}

fn bundled_catalog() -> sdkwork_models::ModelCatalog {
    sdkwork_models::load_bundled_catalog().unwrap()
}

fn catalog_public_model_keys(catalog: &sdkwork_models::ModelCatalog) -> Vec<String> {
    let mut catalog_keys = catalog
        .vendors
        .iter()
        .flat_map(|vendor| {
            vendor
                .models
                .iter()
                .filter(|model| catalog_model_is_publicly_active(model))
                .map(|model| catalog_model_key(&vendor.vendor.vendor_code, &model.model_id))
        })
        .collect::<Vec<_>>();
    catalog_keys.sort();
    catalog_keys.dedup();
    catalog_keys
}

fn catalog_model_key(vendor_code: &str, model_id: &str) -> String {
    format!("{vendor_code}/{model_id}")
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

fn catalog_family_keys(catalog: &sdkwork_models::ModelCatalog) -> BTreeSet<String> {
    catalog
        .vendors
        .iter()
        .flat_map(|vendor| {
            vendor
                .families
                .iter()
                .map(|family| format!("{}/{}", vendor.vendor.vendor_code, family.family_code))
        })
        .collect()
}

fn catalog_vendor_codes(catalog: &sdkwork_models::ModelCatalog) -> BTreeSet<String> {
    catalog
        .vendors
        .iter()
        .map(|vendor| vendor.vendor.vendor_code.clone())
        .collect()
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct CatalogPriceKey {
    catalog_key: String,
    meter_code: String,
    price_side: i32,
    pricing_scope: i32,
}

fn catalog_price_keys(catalog: &sdkwork_models::ModelCatalog) -> BTreeSet<CatalogPriceKey> {
    let public_model_keys = catalog_public_model_keys(catalog)
        .into_iter()
        .collect::<BTreeSet<_>>();
    catalog
        .vendors
        .iter()
        .flat_map(|vendor| vendor.pricing.iter().map(move |pricing| (vendor, pricing)))
        .filter_map(|(vendor, pricing)| {
            let catalog_key =
                sdkwork_models::catalog_key(&vendor.vendor.vendor_code, &pricing.model_id);
            let model_catalog_key =
                catalog_model_key(&vendor.vendor.vendor_code, &pricing.model_id);
            if !public_model_keys.contains(&model_catalog_key) {
                return None;
            }
            Some(pricing.prices.iter().map(move |price| CatalogPriceKey {
                catalog_key: catalog_key.clone(),
                meter_code: price.meter_code.clone(),
                price_side: catalog_price_side_code(&price.price_side),
                pricing_scope: catalog_pricing_scope_code(price.pricing_scope.as_deref()),
            }))
        })
        .flatten()
        .collect()
}

fn catalog_price_side_code(value: &str) -> i32 {
    match value {
        "upstream" => 2,
        "customer" => 3,
        _ => 1,
    }
}

fn catalog_pricing_scope_code(value: Option<&str>) -> i32 {
    match value {
        Some("provider") => 2,
        Some("channel") => 3,
        Some("plan") => 4,
        _ => 1,
    }
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct CatalogRankingKey {
    snapshot_date: String,
    rank_scope: String,
    vendor_code: String,
    region_code: String,
    catalog_key: String,
}

fn catalog_ranking_keys(catalog: &sdkwork_models::ModelCatalog) -> BTreeSet<CatalogRankingKey> {
    let model_catalog_keys = catalog_public_model_keys(catalog)
        .into_iter()
        .collect::<BTreeSet<_>>();
    catalog
        .vendors
        .iter()
        .flat_map(|vendor| {
            vendor
                .rankings
                .iter()
                .map(move |snapshot| (vendor, snapshot))
        })
        .flat_map(|(vendor, snapshot)| {
            let model_catalog_keys = model_catalog_keys.clone();
            snapshot.items.iter().filter_map(move |item| {
                let catalog_key =
                    sdkwork_models::catalog_key(&vendor.vendor.vendor_code, &item.model_id);
                let model_catalog_key =
                    catalog_model_key(&vendor.vendor.vendor_code, &item.model_id);
                if model_catalog_keys.contains(&model_catalog_key) {
                    Some(CatalogRankingKey {
                        snapshot_date: snapshot.snapshot_date.clone(),
                        rank_scope: snapshot.rank_scope.clone(),
                        vendor_code: vendor.vendor.vendor_code.clone(),
                        region_code: vendor.vendor.region_code.clone(),
                        catalog_key,
                    })
                } else {
                    None
                }
            })
        })
        .collect()
}
