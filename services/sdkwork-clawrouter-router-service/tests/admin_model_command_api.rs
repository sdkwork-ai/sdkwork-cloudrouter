mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::application::EntityUuidGenerator;
use sdkwork_clawrouter_router_service::domain::DomainResult;
use sdkwork_clawrouter_router_service::ports::{
    AdminAiModelItem, AdminAiModelListPage, AdminAiModelRegionPriceCommand,
    AdminModelCatalogSyncItem, AdminModelCommandFuture, AdminModelMappingRuleItem, AdminModelStore,
    AdminModelVendorItem, CreateAdminAiModelCommand, CreateAdminModelMappingCommand,
    CreateAdminModelVendorCommand, DeleteAdminAiModelCommand, DeleteAdminModelMappingCommand,
    ListAdminAiModelsQuery, ListAdminModelMappingsQuery, ListAdminModelVendorsQuery,
    ResolveAdminModelMappingQuery, ResolveAdminModelMappingResult, SyncAdminModelCatalogCommand,
    UpdateAdminAiModelCommand, UpdateAdminModelMappingCommand,
};
use sdkwork_models_contract_service::AdminModelMappingListPage;
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn admin_model_command_route_creates_lists_and_syncs_catalog_models() {
    let store = Arc::new(TestAdminModelStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_model_management_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let create_vendor = request_json(
        router.clone(),
        signed_request(
            "POST",
            "/backend/v3/api/ai/model_vendors",
            r#"{"name":"Acme AI","status":"active","color":"bg-cyan-700","description":"Acme hosted models"}"#,
        ),
    )
    .await;
    assert_eq!(0, create_vendor["code"].as_i64().unwrap());
    assert_eq!("1", create_vendor["data"]["item"]["id"]);
    assert_eq!("Acme AI", create_vendor["data"]["item"]["name"]);
    assert_eq!("active", create_vendor["data"]["item"]["status"]);
    assert_eq!("bg-cyan-700", create_vendor["data"]["item"]["color"]);

    let create_model = request_json(
        router.clone(),
        signed_request(
            "POST",
            "/backend/v3/api/ai/models",
            r#"{"vendorId":"1","model":"acme-chat-large","type":"Chat","regionPrices":[{"regionCode":"global","priceIn":"0.120000","priceOut":"0.450000","cacheReadPrice":"0.030000","cacheWritePrice":"0.060000"}],"contextTokens":"128000","description":"Acme commercial chat model","modalities":["text"],"inputModalities":["text"],"outputModalities":["text"],"apiFormat":"openai_responses","supportsStreaming":true,"supportsTools":true,"supportsJsonSchema":true}"#,
        ),
    )
    .await;
    assert_eq!("acme-chat-large", create_model["data"]["item"]["name"]);
    assert_eq!("Chat", create_model["data"]["item"]["type"]);
    assert_no_flat_model_prices(&create_model["data"]["item"]);
    assert_eq!(
        serde_json::json!([{
            "regionCode": "global",
            "currency": "USD",
            "priceIn": "0.120000",
            "priceOut": "0.450000",
            "cacheReadPrice": "0.030000",
            "cacheWritePrice": "0.060000"
        }]),
        create_model["data"]["item"]["regionPrices"]
    );
    assert_eq!(128000, create_model["data"]["item"]["contextTokens"]);
    assert_eq!(
        "Acme commercial chat model",
        create_model["data"]["item"]["description"]
    );
    assert_eq!(
        "openai_responses",
        create_model["data"]["item"]["apiFormat"]
    );
    assert_eq!(true, create_model["data"]["item"]["supportsStreaming"]);
    assert_eq!(
        Some(vec![AdminAiModelRegionPriceCommand {
            region_code: "global".to_owned(),
            currency: "USD".to_owned(),
            price_in: "0.120000".to_owned(),
            price_out: "0.450000".to_owned(),
            cache_read_price: Some("0.030000".to_owned()),
            cache_write_price: Some("0.060000".to_owned()),
        }]),
        store.created_region_prices.lock().unwrap().last().cloned()
    );

    let openrouter_style_model = request_json(
        router.clone(),
        signed_request(
            "POST",
            "/backend/v3/api/ai/models",
            r#"{"vendorId":"1","model":"anthropic/claude-3-opus","type":"Chat","regionPrices":[{"regionCode":"global","priceIn":"15.000000","priceOut":"75.000000"}],"contextTokens":"200000"}"#,
        ),
    )
    .await;
    assert_eq!(0, openrouter_style_model["code"].as_i64().unwrap());
    assert_eq!(
        "anthropic/claude-3-opus",
        openrouter_style_model["data"]["item"]["name"]
    );

    let regional_model = request_json(
        router.clone(),
        signed_request(
            "POST",
            "/backend/v3/api/ai/models",
            r#"{"vendorId":"1","model":"acme-chat-regional","type":"Chat","regionPrices":[{"regionCode":"cn","priceIn":"0.180000","priceOut":"0.560000","cacheReadPrice":"0.040000","cacheWritePrice":"0.080000"},{"regionCode":"global","priceIn":"0.120000","priceOut":"0.450000"}],"contextTokens":"128000"}"#,
        ),
    )
    .await;
    assert_eq!("acme-chat-regional", regional_model["data"]["item"]["name"]);
    assert_no_flat_model_prices(&regional_model["data"]["item"]);
    assert_eq!(
        serde_json::json!([
            {
                "regionCode": "cn",
                "currency": "CNY",
                "priceIn": "0.180000",
                "priceOut": "0.560000",
                "cacheReadPrice": "0.040000",
                "cacheWritePrice": "0.080000"
            },
            {
                "regionCode": "global",
                "currency": "USD",
                "priceIn": "0.120000",
                "priceOut": "0.450000",
                "cacheReadPrice": "",
                "cacheWritePrice": ""
            }
        ]),
        regional_model["data"]["item"]["regionPrices"]
    );
    assert_eq!(
        Some(vec![
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
        ]),
        store.created_region_prices.lock().unwrap().last().cloned()
    );

    let create_sfx_model = request_json(
        router.clone(),
        signed_request(
            "POST",
            "/backend/v3/api/ai/models",
            r#"{"vendorId":"1","model":"acme-sfx-pro","type":"sfx","regionPrices":[{"regionCode":"global","priceIn":"0.010000","priceOut":"0.080000"}],"contextTokens":"8"}"#,
        ),
    )
    .await;
    assert_eq!("acme-sfx-pro", create_sfx_model["data"]["item"]["name"]);
    assert_eq!("SoundEffect", create_sfx_model["data"]["item"]["type"]);
    assert_no_flat_model_prices(&create_sfx_model["data"]["item"]);

    let update_model = request_json(
        router.clone(),
        signed_request(
            "PATCH",
            "/backend/v3/api/ai/models/1",
            r#"{"model":"acme-chat-large-v2","type":"Chat","regionPrices":[{"regionCode":"global","priceIn":"0.180000","priceOut":"0.520000","cacheReadPrice":"0.040000","cacheWritePrice":"0.080000"}],"contextTokens":"256k","status":"inactive","description":"Updated Acme commercial chat model","supportsStreaming":true,"supportsTools":true,"supportsJsonSchema":true}"#,
        ),
    )
    .await;
    assert_eq!("acme-chat-large-v2", update_model["data"]["item"]["name"]);
    assert_eq!("inactive", update_model["data"]["item"]["status"]);
    assert_no_flat_model_prices(&update_model["data"]["item"]);
    assert_eq!(
        serde_json::json!([{
            "regionCode": "global",
            "currency": "USD",
            "priceIn": "0.180000",
            "priceOut": "0.520000",
            "cacheReadPrice": "0.040000",
            "cacheWritePrice": "0.080000"
        }]),
        update_model["data"]["item"]["regionPrices"]
    );
    assert_eq!(256000, update_model["data"]["item"]["contextTokens"]);

    let update_openrouter_style_model = request_json(
        router.clone(),
        signed_request(
            "PATCH",
            "/backend/v3/api/ai/models/anthropic%2Fclaude-3-opus",
            r#"{"displayName":"Claude 3 Opus via OpenRouter","type":"Chat","contextTokens":"200000"}"#,
        ),
    )
    .await;
    assert_eq!(0, update_openrouter_style_model["code"].as_i64().unwrap());
    assert_eq!(
        "anthropic/claude-3-opus",
        update_openrouter_style_model["data"]["item"]["model"]
    );
    assert_eq!(
        "Claude 3 Opus via OpenRouter",
        update_openrouter_style_model["data"]["item"]["displayName"]
    );

    let vendors = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/ai/model_vendors", ""),
    )
    .await;
    assert_eq!(1, vendors["data"]["items"].as_array().unwrap().len());
    assert_eq!("Acme AI", vendors["data"]["items"][0]["name"]);

    let sync = request_json(
        router.clone(),
        signed_request(
            "POST",
            "/backend/v3/api/ai/models/refresh",
            r#"{"source":"sdkwork_models","mode":"catalog_version_refresh","vendorCodes":["openai","google","openai"],"force":true,"catalogRoot":"D:/catalogs/sdkwork-models","catalogVersion":"2026.05.08.1"}"#,
        ),
    )
    .await;
    assert_eq!(true, sync["data"]["synced"]);
    assert_eq!("sdkwork_models", sync["data"]["source"]);
    assert_eq!(3, sync["data"]["meterCount"]);
    assert_eq!(2, sync["data"]["vendorCount"]);
    assert_eq!(4, sync["data"]["familyCount"]);
    assert_eq!(5, sync["data"]["modelCount"]);
    assert_eq!(6, sync["data"]["capabilityCount"]);
    assert_eq!(7, sync["data"]["priceCount"]);
    assert_eq!(8, sync["data"]["rankingCount"]);
    assert_eq!(35, sync["data"]["acceptedCount"]);
    assert_eq!("catalog_version_refresh", sync["data"]["mode"]);
    assert_eq!(false, sync["data"]["dryRun"]);
    assert_eq!("2026.05.08.1", sync["data"]["catalogVersion"]);
    assert_eq!("2026.05.08.1", sync["data"]["requestedCatalogVersion"]);
    assert_eq!("D:/catalogs/sdkwork-models", sync["data"]["catalogRoot"]);
    assert_eq!(
        serde_json::json!(["openai", "google"]),
        sync["data"]["vendorCodes"]
    );
    let source_hash = sync["data"]["sourceHash"].as_str().unwrap_or_default();
    assert_eq!(64, source_hash.len());
    assert!(source_hash.chars().all(|ch| ch.is_ascii_hexdigit()));
    assert_eq!("Acme AI", sync["data"]["vendors"][0]["name"]);
    assert_eq!("acme-chat-large-v2", sync["data"]["models"][0]["name"]);

    let models = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/ai/models", ""),
    )
    .await;
    assert_eq!(4, models["data"]["items"].as_array().unwrap().len());
    assert_eq!("acme-chat-large-v2", models["data"]["items"][0]["name"]);
    assert_eq!(
        "Claude 3 Opus via OpenRouter",
        models["data"]["items"][1]["name"]
    );
    assert_eq!("acme-chat-regional", models["data"]["items"][2]["name"]);
    assert_eq!("acme-sfx-pro", models["data"]["items"][3]["name"]);
    assert_eq!("SoundEffect", models["data"]["items"][3]["type"]);
    assert_eq!(
        serde_json::json!([
            {
                "regionCode": "cn",
                "currency": "CNY",
                "priceIn": "0.180000",
                "priceOut": "0.560000",
                "cacheReadPrice": "0.040000",
                "cacheWritePrice": "0.080000"
            },
            {
                "regionCode": "global",
                "currency": "USD",
                "priceIn": "0.120000",
                "priceOut": "0.450000",
                "cacheReadPrice": "",
                "cacheWritePrice": ""
            }
        ]),
        models["data"]["items"][2]["regionPrices"]
    );

    let delete_model = request_json(
        router.clone(),
        signed_request("DELETE", "/backend/v3/api/ai/models/1", ""),
    )
    .await;
    assert_eq!(true, delete_model["data"]["deleted"]);

    let models = request_json(
        router,
        signed_request("GET", "/backend/v3/api/ai/models", ""),
    )
    .await;
    assert_eq!(3, models["data"]["items"].as_array().unwrap().len());
    assert_eq!(
        "Claude 3 Opus via OpenRouter",
        models["data"]["items"][0]["name"]
    );
    assert_eq!("acme-chat-regional", models["data"]["items"][1]["name"]);
    assert_eq!("acme-sfx-pro", models["data"]["items"][2]["name"]);

    assert_eq!(
        vec![
            "create_vendor:acme_ai",
            "create_model:acme-chat-large",
            "create_model:anthropic/claude-3-opus",
            "create_model:acme-chat-regional",
            "create_model:acme-sfx-pro",
            "update_model:1:acme-chat-large-v2",
            "update_model:anthropic/claude-3-opus:",
            "sync:sdkwork_models:catalog_version_refresh:openai,google:true:D:/catalogs/sdkwork-models:2026.05.08.1",
            "delete_model:1"
        ],
        *store.commands.lock().unwrap()
    );
}

#[tokio::test]
async fn admin_model_command_route_rejects_missing_trusted_subject() {
    let router = sdkwork_clawrouter_router_service::api::admin_model_management_router_with_store(
        Arc::new(TestAdminModelStore::default()),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/model_vendors")
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
async fn admin_model_command_route_rejects_invalid_price_without_calling_store() {
    let store = Arc::new(TestAdminModelStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_model_management_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/ai/models",
            r#"{"vendorId":"1","model":"acme-chat-large","type":"Chat","regionPrices":[{"regionCode":"global","priceIn":"-1","priceOut":"0.450000"}],"contextTokens":"128000"}"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"]
        .as_str()
        .unwrap()
        .contains("regionPrices[0].priceIn"));
    assert!(store.commands.lock().unwrap().is_empty());
}

fn assert_no_flat_model_prices(item: &Value) {
    assert!(item.get("priceIn").is_none());
    assert!(item.get("priceOut").is_none());
    assert!(item.get("cacheReadPrice").is_none());
    assert!(item.get("cacheWritePrice").is_none());
}

#[tokio::test]
async fn admin_model_command_route_rejects_integration_provider_as_model_vendor() {
    let store = Arc::new(TestAdminModelStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_model_management_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    for body in [
        r#"{"name":"OpenRouter","status":"active","color":"bg-slate-700"}"#,
        r#"{"vendorCode":"ollama","name":"Local Runtime","status":"active","color":"bg-slate-700"}"#,
        r#"{"vendorCode":"aws_bedrock","name":"AWS Bedrock","status":"active","color":"bg-slate-700"}"#,
    ] {
        let response = router
            .clone()
            .oneshot(signed_request(
                "POST",
                "/backend/v3/api/ai/model_vendors",
                body,
            ))
            .await
            .unwrap();

        assert_eq!(StatusCode::BAD_REQUEST, response.status());
        let payload = json_payload(response).await;
        assert_eq!(40001, payload["code"].as_i64().unwrap());
        assert!(payload["detail"]
            .as_str()
            .unwrap()
            .contains("integration_provider"));
    }

    assert!(store.commands.lock().unwrap().is_empty());
}

fn signed_request(method: &str, path: &str, body: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
        .internal_trusted_subject(100001, 0, 30)
        .header("X-Request-Id", "request-admin-model-test")
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
struct TestAdminModelStore {
    vendors: Mutex<Vec<AdminModelVendorItem>>,
    models: Mutex<Vec<AdminAiModelItem>>,
    commands: Mutex<Vec<String>>,
    created_region_prices: Mutex<Vec<Vec<AdminAiModelRegionPriceCommand>>>,
}

impl AdminModelStore for TestAdminModelStore {
    fn list_vendors<'a>(
        &'a self,
        query: ListAdminModelVendorsQuery,
    ) -> AdminModelCommandFuture<'a, Vec<AdminModelVendorItem>> {
        Box::pin(async move {
            Ok(self
                .vendors
                .lock()
                .unwrap()
                .iter()
                .filter(|item| {
                    item.tenant_id == query.subject.tenant_id
                        && item.organization_id == query.subject.organization_id
                        && item.deleted_at.is_none()
                })
                .cloned()
                .collect())
        })
    }

    fn create_vendor<'a>(
        &'a self,
        command: CreateAdminModelVendorCommand,
    ) -> AdminModelCommandFuture<'a, AdminModelVendorItem> {
        Box::pin(async move {
            self.commands
                .lock()
                .unwrap()
                .push(format!("create_vendor:{}", command.vendor_code));
            let item = AdminModelVendorItem {
                id: 1,
                uuid: command.vendor_uuid,
                tenant_id: command.subject.tenant_id,
                organization_id: command.subject.organization_id,
                vendor_code: command.vendor_code,
                name: command.name,
                status: command.status,
                color: command.color,
                description: command.description,
                supported_protocols: "[]".to_owned(),
                client_api_compatibility: "{}".to_owned(),
                deleted_at: None,
            };
            self.vendors.lock().unwrap().push(item.clone());
            Ok(item)
        })
    }

    fn list_models<'a>(
        &'a self,
        query: ListAdminAiModelsQuery,
    ) -> AdminModelCommandFuture<'a, AdminAiModelListPage> {
        Box::pin(async move {
            let items = self
                .models
                .lock()
                .unwrap()
                .iter()
                .filter(|item| {
                    item.tenant_id == query.subject.tenant_id
                        && item.organization_id == query.subject.organization_id
                        && item.deleted_at.is_none()
                })
                .cloned()
                .collect::<Vec<_>>();
            let total_count = items.len() as i64;
            Ok(AdminAiModelListPage { items, total_count })
        })
    }

    fn list_model_mappings<'a>(
        &'a self,
        _query: ListAdminModelMappingsQuery,
    ) -> AdminModelCommandFuture<'a, AdminModelMappingListPage> {
        Box::pin(async move {
            Ok(AdminModelMappingListPage {
                items: Vec::new(),
                total_count: 0,
            })
        })
    }

    fn create_model<'a>(
        &'a self,
        command: CreateAdminAiModelCommand,
    ) -> AdminModelCommandFuture<'a, AdminAiModelItem> {
        Box::pin(async move {
            self.commands
                .lock()
                .unwrap()
                .push(format!("create_model:{}", command.model));
            self.created_region_prices
                .lock()
                .unwrap()
                .push(command.region_prices.clone());
            let region_prices = command.region_prices.clone();
            let model = command.model;
            let display_name = command.display_name;
            let item = AdminAiModelItem {
                id: self.models.lock().unwrap().len() as i64 + 1,
                uuid: command.model_uuid,
                tenant_id: command.subject.tenant_id,
                organization_id: command.subject.organization_id,
                vendor_id: command.vendor_id,
                vendor_code: "acme_ai".to_owned(),
                catalog_key: format!("acme_ai/{}", model),
                model,
                display_name: display_name.clone(),
                name: display_name,
                model_type: command.model_type,
                region_prices,
                status: "active".to_owned(),
                calls: "0".to_owned(),
                description: command.description,
                modalities: command.modalities,
                input_modalities: command.input_modalities,
                output_modalities: command.output_modalities,
                api_format: Some(command.api_format),
                capability_intro: command.capability_intro,
                limitations: command.limitations,
                supported_languages: command.supported_languages,
                use_cases: command.use_cases,
                training_data_cutoff: command.training_data_cutoff,
                context_tokens: Some(command.context_tokens),
                max_output_tokens: command.max_output_tokens,
                supports_streaming: command.supports_streaming,
                supports_tools: command.supports_tools,
                supports_json_schema: command.supports_json_schema,
                release_stage: Some(command.release_stage),
                shelf_state: Some(command.shelf_state),
                routing_state: Some(command.routing_state),
                replacement_model: command.replacement_model,
                deleted_at: None,
            };
            self.models.lock().unwrap().push(item.clone());
            Ok(item)
        })
    }

    fn create_model_mapping<'a>(
        &'a self,
        _command: CreateAdminModelMappingCommand,
    ) -> AdminModelCommandFuture<'a, AdminModelMappingRuleItem> {
        Box::pin(async move {
            Err(
                sdkwork_clawrouter_router_service::domain::DomainError::not_found(
                    "model mapping is not supported by test store",
                ),
            )
        })
    }

    fn sync_catalog<'a>(
        &'a self,
        command: SyncAdminModelCatalogCommand,
    ) -> AdminModelCommandFuture<'a, AdminModelCatalogSyncItem> {
        Box::pin(async move {
            self.commands.lock().unwrap().push(format!(
                "sync:{}:{}:{}:{}:{}:{}",
                command.source,
                command.mode,
                command.vendor_codes.join(","),
                command.force,
                command.catalog_root.as_deref().unwrap_or(""),
                command.catalog_version.as_deref().unwrap_or("")
            ));
            Ok(AdminModelCatalogSyncItem {
                synced: true,
                source: command.source,
                mode: command.mode,
                dry_run: false,
                catalog_version: command
                    .catalog_version
                    .clone()
                    .unwrap_or_else(|| "2026.05.08.1".to_owned()),
                requested_catalog_version: command.catalog_version,
                catalog_root: command.catalog_root,
                vendor_codes: command.vendor_codes,
                source_hash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
                    .to_owned(),
                meter_count: 3,
                vendor_count: 2,
                family_count: 4,
                model_count: 5,
                capability_count: 6,
                price_count: 7,
                ranking_count: 8,
                voice_count: 0,
                voice_binding_count: 0,
                video_profile_count: 0,
                accepted_count: 35,
                snapshot_id: Some("snapshot-1".to_owned()),
                sync_run_id: Some("sync-run-1".to_owned()),
                vendors: self.vendors.lock().unwrap().clone(),
                models: self.models.lock().unwrap().clone(),
            })
        })
    }

    fn update_model<'a>(
        &'a self,
        command: UpdateAdminAiModelCommand,
    ) -> AdminModelCommandFuture<'a, AdminAiModelItem> {
        Box::pin(async move {
            self.commands.lock().unwrap().push(format!(
                "update_model:{}:{}",
                command.model_id,
                command.model.as_deref().unwrap_or("")
            ));
            let mut models = self.models.lock().unwrap();
            let Some(model) = models.iter_mut().find(|item| {
                (item.id.to_string() == command.model_id || item.model == command.model_id)
                    && item.deleted_at.is_none()
            }) else {
                return Err(
                    sdkwork_clawrouter_router_service::domain::DomainError::not_found(
                        "ai model was not found",
                    ),
                );
            };
            if let Some(vendor_id) = command.vendor_id {
                model.vendor_id = vendor_id;
            }
            if let Some(name) = command.model {
                model.model = name.clone();
                if command.display_name.is_none() {
                    model.display_name = name.clone();
                    model.name = name;
                }
            }
            if let Some(display_name) = command.display_name {
                model.display_name = display_name.clone().unwrap_or_else(|| model.model.clone());
                model.name = model.display_name.clone();
            }
            if let Some(model_type) = command.model_type {
                model.model_type = model_type;
            }
            if let Some(region_prices) = command.region_prices {
                model.region_prices = region_prices;
            }
            if let Some(status) = command.status {
                model.status = status;
            }
            if let Some(description) = command.description {
                model.description = description;
            }
            if let Some(modalities) = command.modalities {
                model.modalities = modalities;
            }
            if let Some(input_modalities) = command.input_modalities {
                model.input_modalities = input_modalities;
            }
            if let Some(output_modalities) = command.output_modalities {
                model.output_modalities = output_modalities;
            }
            if let Some(api_format) = command.api_format {
                model.api_format = Some(api_format);
            }
            if let Some(capability_intro) = command.capability_intro {
                model.capability_intro = capability_intro;
            }
            if let Some(limitations) = command.limitations {
                model.limitations = limitations;
            }
            if let Some(supported_languages) = command.supported_languages {
                model.supported_languages = supported_languages;
            }
            if let Some(use_cases) = command.use_cases {
                model.use_cases = use_cases;
            }
            if let Some(training_data_cutoff) = command.training_data_cutoff {
                model.training_data_cutoff = training_data_cutoff;
            }
            if let Some(context_tokens) = command.context_tokens {
                model.context_tokens = Some(context_tokens);
            }
            if let Some(max_output_tokens) = command.max_output_tokens {
                model.max_output_tokens = max_output_tokens;
            }
            if let Some(supports_streaming) = command.supports_streaming {
                model.supports_streaming = supports_streaming;
            }
            if let Some(supports_tools) = command.supports_tools {
                model.supports_tools = supports_tools;
            }
            if let Some(supports_json_schema) = command.supports_json_schema {
                model.supports_json_schema = supports_json_schema;
            }
            if let Some(release_stage) = command.release_stage {
                model.release_stage = Some(release_stage);
            }
            if let Some(shelf_state) = command.shelf_state {
                model.shelf_state = Some(shelf_state);
            }
            if let Some(routing_state) = command.routing_state {
                model.routing_state = Some(routing_state);
            }
            if let Some(replacement_model) = command.replacement_model {
                model.replacement_model = replacement_model;
            }
            Ok(model.clone())
        })
    }

    fn update_model_mapping<'a>(
        &'a self,
        _command: UpdateAdminModelMappingCommand,
    ) -> AdminModelCommandFuture<'a, AdminModelMappingRuleItem> {
        Box::pin(async move {
            Err(
                sdkwork_clawrouter_router_service::domain::DomainError::not_found(
                    "model mapping is not supported by test store",
                ),
            )
        })
    }

    fn delete_model<'a>(
        &'a self,
        command: DeleteAdminAiModelCommand,
    ) -> AdminModelCommandFuture<'a, ()> {
        Box::pin(async move {
            self.commands
                .lock()
                .unwrap()
                .push(format!("delete_model:{}", command.model_id));
            let mut models = self.models.lock().unwrap();
            let Some(model) = models
                .iter_mut()
                .find(|item| item.id.to_string() == command.model_id && item.deleted_at.is_none())
            else {
                return Err(
                    sdkwork_clawrouter_router_service::domain::DomainError::not_found(
                        "ai model was not found",
                    ),
                );
            };
            model.deleted_at = Some(command.requested_at);
            Ok(())
        })
    }

    fn delete_model_mapping<'a>(
        &'a self,
        _command: DeleteAdminModelMappingCommand,
    ) -> AdminModelCommandFuture<'a, ()> {
        Box::pin(async move {
            Err(
                sdkwork_clawrouter_router_service::domain::DomainError::not_found(
                    "model mapping is not supported by test store",
                ),
            )
        })
    }

    fn resolve_model_mapping<'a>(
        &'a self,
        query: ResolveAdminModelMappingQuery,
    ) -> AdminModelCommandFuture<'a, ResolveAdminModelMappingResult> {
        Box::pin(async move {
            Ok(ResolveAdminModelMappingResult {
                source_model: query.source_model.clone(),
                target_model: query.source_model,
                target_catalog_key: None,
                target_vendor_code: query.vendor_code,
                target_provider_model: None,
                target_provider_native_model: None,
                matched: false,
                matched_binding_type: None,
                rule: None,
            })
        })
    }
}

struct TestUuidGenerator;

impl EntityUuidGenerator for TestUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        Ok("test-uuid".to_owned())
    }
}
