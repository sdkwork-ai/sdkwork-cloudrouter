mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::application::{
    default_desktop_cache_manager, AiRoutingCacheInvalidatingAdminChannelGroupStore,
    EntityUuidGenerator, ROUTING_CONFIG_VERSION_CACHE_NAMESPACE,
    ROUTING_DISABLED_CHANNEL_CACHE_NAMESPACE, ROUTING_PROVIDER_OBJECT_ROUTE_CACHE_NAMESPACE,
    ROUTING_SNAPSHOT_CACHE_NAMESPACE,
};
use sdkwork_clawrouter_router_service::domain::DomainResult;
use sdkwork_clawrouter_router_service::ports::{
    AdminChannelGroupChannelBindingItem, AdminChannelGroupCommandFuture, AdminChannelGroupItem,
    AdminChannelGroupStore, CreateAdminChannelGroupCommand, DeleteAdminChannelGroupCommand,
    ListAdminChannelGroupChannelBindingsQuery, ListAdminChannelGroupsQuery,
    ReplaceAdminChannelGroupChannelBindingsCommand, UpdateAdminChannelGroupCommand,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn admin_channel_group_route_creates_lists_updates_and_soft_deletes_groups() {
    let store = Arc::new(TestChannelGroupStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_channel_group_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );
    let expected_create_name = format!("{} standard", "\u{4e2d}\u{6587}");

    let create_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/ai/channel_groups")
                .header("content-type", "application/json")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::from(
                    r#"{"groupName":"\u4e2d\u6587 standard","groupCode":"zh-standard","priceReferenceMode":"multiplier","rateMultiplier":1.25,"groupType":"dedicated","capacity":{"total":500},"status":"active","resourceGroupCodes":[" api.openai.chat ","api.google.image","api.openai.chat"],"resourceCodes":[" api.openai.chat_completions ","api.openai.responses","api.openai.chat_completions"]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, create_response.status());
    let create_payload = json_payload(create_response).await;
    assert_eq!(0, create_payload["code"].as_i64().unwrap());
    assert_eq!(
        expected_create_name,
        create_payload["data"]["item"]["groupName"]
            .as_str()
            .unwrap()
    );
    assert_eq!("zh-standard", create_payload["data"]["item"]["groupCode"]);
    assert_eq!("openai", create_payload["data"]["item"]["providerCode"]);
    assert_eq!(
        "multiplier",
        create_payload["data"]["item"]["priceReferenceMode"]
    );
    assert_eq!(1.25, create_payload["data"]["item"]["rateMultiplier"]);
    assert_eq!(
        1.0,
        create_payload["data"]["item"]["officialPriceMultiplier"]
    );
    assert_eq!("dedicated", create_payload["data"]["item"]["groupType"]);
    assert_eq!(500.0, create_payload["data"]["item"]["capacity"]["total"]);
    assert_eq!("active", create_payload["data"]["item"]["status"]);
    assert_eq!(
        serde_json::json!(["api.openai.chat", "api.google.image"]),
        create_payload["data"]["item"]["resourceGroupCodes"]
    );
    assert_eq!(
        serde_json::json!(["api.openai.chat_completions", "api.openai.responses"]),
        create_payload["data"]["item"]["resourceCodes"]
    );

    let update_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri("/backend/v3/api/ai/channel_groups/1")
                .header("content-type", "application/json")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::from(
                    r#"{"groupName":"OpenAI enterprise","priceReferenceMode":"official_price","officialPriceMultiplier":1.5,"capacity":{"total":750},"status":"disabled","resourceGroupCodes":["api.openai.codex"],"resourceCodes":["api.openai.containers","api.openai.skills"]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, update_response.status());
    let update_payload = json_payload(update_response).await;
    assert_eq!(
        "OpenAI enterprise",
        update_payload["data"]["item"]["groupName"]
    );
    assert_eq!(
        "official_price",
        update_payload["data"]["item"]["priceReferenceMode"]
    );
    assert_eq!(1.0, update_payload["data"]["item"]["rateMultiplier"]);
    assert_eq!(
        1.5,
        update_payload["data"]["item"]["officialPriceMultiplier"]
    );
    assert_eq!(750.0, update_payload["data"]["item"]["capacity"]["total"]);
    assert_eq!("disabled", update_payload["data"]["item"]["status"]);
    assert_eq!(
        serde_json::json!(["api.openai.codex"]),
        update_payload["data"]["item"]["resourceGroupCodes"]
    );
    assert_eq!(
        serde_json::json!(["api.openai.containers", "api.openai.skills"]),
        update_payload["data"]["item"]["resourceCodes"]
    );

    let list_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/channel_groups")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, list_response.status());
    let list_payload = json_payload(list_response).await;
    assert_eq!(1, list_payload["data"]["items"].as_array().unwrap().len());
    assert_eq!("disabled", list_payload["data"]["items"][0]["status"]);
    assert_eq!(
        serde_json::json!(["api.openai.codex"]),
        list_payload["data"]["items"][0]["resourceGroupCodes"]
    );
    assert_eq!(
        serde_json::json!(["api.openai.containers", "api.openai.skills"]),
        list_payload["data"]["items"][0]["resourceCodes"]
    );

    let delete_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri("/backend/v3/api/ai/channel_groups/1")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, delete_response.status());
    let delete_payload = json_payload(delete_response).await;
    assert_eq!(true, delete_payload["data"]["deleted"]);

    let final_list_response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/channel_groups")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let final_payload = json_payload(final_list_response).await;
    assert_eq!(0, final_payload["data"]["items"].as_array().unwrap().len());

    let commands = store.commands.lock().unwrap();
    assert_eq!(vec!["create", "update", "delete"], *commands);
}

#[tokio::test]
async fn admin_channel_group_route_lists_and_replaces_channel_bindings() {
    let store = Arc::new(TestChannelGroupStore::with_bindings(vec![
        channel_binding_item(1, 10, 3001, "OpenAI primary", "openai", 10, 80, "active"),
        channel_binding_item(
            2,
            10,
            3002,
            "OpenRouter backup",
            "openrouter",
            20,
            30,
            "active",
        ),
        channel_binding_item(3, 11, 3001, "OpenAI primary", "openai", 10, 50, "active"),
    ]));
    let router = sdkwork_clawrouter_router_service::api::admin_channel_group_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let list_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/channel_groups/10/channel_bindings")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, list_response.status());
    let list_payload = json_payload(list_response).await;
    assert_eq!(0, list_payload["code"].as_i64().unwrap());
    assert_eq!(2, list_payload["data"]["items"].as_array().unwrap().len());
    assert_eq!("3001", list_payload["data"]["items"][0]["channelId"]);
    assert_eq!(
        "OpenAI primary",
        list_payload["data"]["items"][0]["channelName"]
    );
    assert_eq!("openai", list_payload["data"]["items"][0]["providerCode"]);
    assert_eq!(80, list_payload["data"]["items"][0]["weight"]);
    assert!(list_payload["data"]["items"][0].get("secretRef").is_none());
    assert!(list_payload["data"]["items"][0].get("models").is_none());
    assert!(list_payload["data"]["items"][0].get("modelScope").is_none());

    let replace_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/backend/v3/api/ai/channel_groups/10/channel_bindings")
                .header("content-type", "application/json")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::from(
                    r#"{"items":[{"channelId":"3001","priority":5,"weight":100,"status":"active","apiScope":["openai.chat_completions"],"capabilities":["llm"],"resourceCodes":["model.openai.gpt-4o-mini.chat","api.openai.chat_completions","bundle.openrouter.openai.standard"]},{"channelId":"3003","priority":30,"weight":20,"status":"disabled"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, replace_response.status());
    let replace_payload = json_payload(replace_response).await;
    assert_eq!(0, replace_payload["code"].as_i64().unwrap());
    assert_eq!(
        2,
        replace_payload["data"]["items"].as_array().unwrap().len()
    );
    assert_eq!("3001", replace_payload["data"]["items"][0]["channelId"]);
    assert_eq!(5, replace_payload["data"]["items"][0]["priority"]);
    assert_eq!(100, replace_payload["data"]["items"][0]["weight"]);
    assert!(replace_payload["data"]["items"][0].get("models").is_none());
    assert!(replace_payload["data"]["items"][0]
        .get("modelScope")
        .is_none());
    assert_eq!(
        "llm",
        replace_payload["data"]["items"][0]["capabilities"][0]
    );
    assert_eq!(
        "openai.chat_completions",
        replace_payload["data"]["items"][0]["apiScope"][0]
    );
    assert_eq!(
        "api.openai.chat_completions",
        replace_payload["data"]["items"][0]["resourceCodes"][1]
    );

    let final_list_response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/channel_groups/11/channel_bindings")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let final_payload = json_payload(final_list_response).await;
    assert_eq!(
        "3001", final_payload["data"]["items"][0]["channelId"],
        "a channel account can remain bound to another group"
    );

    let commands = store.commands.lock().unwrap();
    assert_eq!(vec!["replace_channel_bindings"], *commands);
}

#[tokio::test]
async fn admin_channel_group_route_explain_reports_backend_config_readiness() {
    let store = Arc::new(TestChannelGroupStore::with_items_and_bindings(
        vec![channel_group_item(
            10,
            "standard",
            "Standard",
            "active",
            2,
            vec!["api.openai.chat".to_owned()],
            vec!["api.openai.chat_completions".to_owned()],
        )],
        vec![
            channel_binding_item(1, 10, 3001, "OpenAI primary", "openai", 10, 80, "active"),
            channel_binding_item(
                2,
                10,
                3002,
                "OpenRouter backup",
                "openrouter",
                20,
                30,
                "disabled",
            ),
        ],
    ));
    let router = sdkwork_clawrouter_router_service::api::admin_channel_group_router_with_store(
        store,
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/channel_groups/10/route_explain")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("backend_config", payload["data"]["source"]);
    assert_eq!(true, payload["data"]["ready"]);
    assert_eq!(2, payload["data"]["configuredResourceAccessCount"]);
    assert_eq!(1, payload["data"]["configuredResourceGroupAccessCount"]);
    assert_eq!(1, payload["data"]["activeHealthyBindingCount"]);
    assert_eq!(1, payload["data"]["routableBindingCount"]);
    assert_eq!(
        serde_json::json!(["api.openai.chat"]),
        payload["data"]["resourceGroupCodes"]
    );
    assert_eq!(
        serde_json::json!(["api.openai.chat_completions"]),
        payload["data"]["resourceCodes"]
    );
    assert_eq!(
        serde_json::json!(["api.openai.chat_completions"]),
        payload["data"]["effectiveResourceCodes"]
    );
    assert_eq!(
        serde_json::json!(["openai.chat_completions"]),
        payload["data"]["apiScope"]
    );
    assert_eq!(serde_json::json!(["llm"]), payload["data"]["capabilities"]);
    assert_eq!(serde_json::json!([]), payload["data"]["issueCodes"]);
    assert_eq!(serde_json::json!([]), payload["data"]["issues"]);
}

#[tokio::test]
async fn admin_channel_group_route_explain_reports_blocking_backend_config_issues() {
    let store = Arc::new(TestChannelGroupStore::with_items_and_bindings(
        vec![channel_group_item(
            11,
            "blocked",
            "Blocked",
            "disabled",
            0,
            Vec::new(),
            Vec::new(),
        )],
        Vec::new(),
    ));
    let router = sdkwork_clawrouter_router_service::api::admin_channel_group_router_with_store(
        store,
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/channel_groups/11/route_explain")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!(false, payload["data"]["ready"]);
    assert_eq!(
        serde_json::json!([
            "group.disabled",
            "group.account_count.empty",
            "group.resource_access.empty",
            "group.bindings.empty"
        ]),
        payload["data"]["issueCodes"]
    );
    assert_eq!(4, payload["data"]["issues"].as_array().unwrap().len());
    for issue in payload["data"]["issues"].as_array().unwrap() {
        assert_eq!("blocking", issue["severity"]);
    }
}

#[tokio::test]
async fn admin_channel_group_route_invalidates_routing_cache_after_successful_binding_mutation() {
    let store = Arc::new(TestChannelGroupStore::with_bindings(vec![
        channel_binding_item(1, 10, 3001, "OpenAI primary", "openai", 10, 80, "active"),
    ]));
    let manager = default_desktop_cache_manager();
    manager
        .set_json(
            ROUTING_SNAPSHOT_CACHE_NAMESPACE,
            "tenant:10:org:20",
            serde_json::json!({ "status": "warm" }),
        )
        .await
        .unwrap();
    manager
        .set_json(
            ROUTING_CONFIG_VERSION_CACHE_NAMESPACE,
            "tenant:10:org:20",
            serde_json::json!({ "version": 7 }),
        )
        .await
        .unwrap();
    manager
        .set_json(
            ROUTING_DISABLED_CHANNEL_CACHE_NAMESPACE,
            "tenant:10:org:20:channel:3001",
            serde_json::json!({ "disabled": true }),
        )
        .await
        .unwrap();
    manager
        .set_json(
            ROUTING_PROVIDER_OBJECT_ROUTE_CACHE_NAMESPACE,
            "tenant:10:org:20:object:resp_123",
            serde_json::json!({ "channelId": 3001 }),
        )
        .await
        .unwrap();
    let router = sdkwork_clawrouter_router_service::api::admin_channel_group_router_with_store(
        Arc::new(AiRoutingCacheInvalidatingAdminChannelGroupStore::new(
            store,
            manager.clone(),
        )),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/backend/v3/api/ai/channel_groups/10/channel_bindings")
                .header("content-type", "application/json")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::from(
                    r#"{"items":[{"channelId":"3001","priority":5,"weight":100,"status":"active","resourceCodes":["model.openai.gpt-4o-mini.chat"]}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    assert!(manager
        .get_json(ROUTING_SNAPSHOT_CACHE_NAMESPACE, "tenant:10:org:20")
        .await
        .unwrap()
        .is_none());
    assert!(manager
        .get_json(ROUTING_CONFIG_VERSION_CACHE_NAMESPACE, "tenant:10:org:20")
        .await
        .unwrap()
        .is_none());
    assert!(manager
        .get_json(
            ROUTING_DISABLED_CHANNEL_CACHE_NAMESPACE,
            "tenant:10:org:20:channel:3001"
        )
        .await
        .unwrap()
        .is_none());
    assert!(manager
        .get_json(
            ROUTING_PROVIDER_OBJECT_ROUTE_CACHE_NAMESPACE,
            "tenant:10:org:20:object:resp_123"
        )
        .await
        .unwrap()
        .is_some());
}

#[tokio::test]
async fn admin_channel_group_route_rejects_missing_trusted_subject() {
    let router = sdkwork_clawrouter_router_service::api::admin_channel_group_router_with_store(
        Arc::new(TestChannelGroupStore::default()),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/channel_groups")
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
async fn admin_channel_group_route_rejects_invalid_multiplier_without_calling_store() {
    let store = Arc::new(TestChannelGroupStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_channel_group_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/ai/channel_groups")
                .header("content-type", "application/json")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::from(
                    r#"{"groupName":"Invalid","groupCode":"invalid","priceReferenceMode":"multiplier","rateMultiplier":0}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"]
        .as_str()
        .unwrap()
        .contains("rateMultiplier must be between"));
    assert!(store.commands.lock().unwrap().is_empty());
}

#[tokio::test]
async fn admin_channel_group_route_does_not_expose_legacy_public_paths() {
    let router = sdkwork_clawrouter_router_service::api::admin_channel_group_router_with_store(
        Arc::new(TestChannelGroupStore::default()),
        Arc::new(TestUuidGenerator),
    );
    let legacy_group_segment = format!("{}{}", "access_", "groups");
    let legacy_paths = [
        format!("/backend/v3/api/router/{legacy_group_segment}"),
        format!("/backend/v3/api/iam/{legacy_group_segment}"),
    ];

    for path in legacy_paths {
        let response = router
            .clone()
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri(path.as_str())
                    .internal_trusted_subject(10, 20, 30)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(
            StatusCode::NOT_FOUND,
            response.status(),
            "{path} should not remain public"
        );
    }
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

#[derive(Default)]
struct TestChannelGroupStore {
    items: Mutex<Vec<AdminChannelGroupItem>>,
    bindings: Mutex<Vec<AdminChannelGroupChannelBindingItem>>,
    commands: Mutex<Vec<&'static str>>,
}

impl TestChannelGroupStore {
    fn with_bindings(bindings: Vec<AdminChannelGroupChannelBindingItem>) -> Self {
        Self {
            bindings: Mutex::new(bindings),
            ..Self::default()
        }
    }

    fn with_items_and_bindings(
        items: Vec<AdminChannelGroupItem>,
        bindings: Vec<AdminChannelGroupChannelBindingItem>,
    ) -> Self {
        Self {
            items: Mutex::new(items),
            bindings: Mutex::new(bindings),
            ..Self::default()
        }
    }
}

impl AdminChannelGroupStore for TestChannelGroupStore {
    fn list_channel_groups<'a>(
        &'a self,
        query: ListAdminChannelGroupsQuery,
    ) -> AdminChannelGroupCommandFuture<'a, Vec<AdminChannelGroupItem>> {
        Box::pin(async move {
            Ok(self
                .items
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

    fn create_channel_group<'a>(
        &'a self,
        command: CreateAdminChannelGroupCommand,
    ) -> AdminChannelGroupCommandFuture<'a, AdminChannelGroupItem> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("create");
            let item = AdminChannelGroupItem {
                id: 1,
                uuid: command.group_uuid,
                tenant_id: command.subject.tenant_id,
                organization_id: command.subject.organization_id,
                group_code: command.group_code,
                group_name: command.group_name,
                provider_code: command.provider_code,
                price_reference_mode: command.price_reference_mode,
                rate_multiplier: command.rate_multiplier,
                official_price_multiplier: command.official_price_multiplier,
                group_type: command.group_type,
                resource_group_codes: command.resource_group_codes,
                resource_codes: command.resource_codes,
                account_available: 0,
                account_total: 0,
                capacity_used: 0.0,
                capacity_total: command.capacity_total,
                usage_today: 0.0,
                usage_total: 0.0,
                status: command.status,
                deleted_at: None,
            };
            self.items.lock().unwrap().push(item.clone());
            Ok(item)
        })
    }

    fn update_channel_group<'a>(
        &'a self,
        command: UpdateAdminChannelGroupCommand,
    ) -> AdminChannelGroupCommandFuture<'a, Option<AdminChannelGroupItem>> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("update");
            let mut items = self.items.lock().unwrap();
            let Some(item) = items.iter_mut().find(|item| {
                item.id == command.group_id
                    && item.tenant_id == command.subject.tenant_id
                    && item.organization_id == command.subject.organization_id
                    && item.deleted_at.is_none()
            }) else {
                return Ok(None);
            };
            if let Some(group_code) = command.group_code {
                item.group_code = group_code;
            }
            if let Some(group_name) = command.group_name {
                item.group_name = group_name;
            }
            if let Some(provider_code) = command.provider_code {
                item.provider_code = provider_code;
            }
            if let Some(price_reference_mode) = command.price_reference_mode {
                item.price_reference_mode = price_reference_mode;
            }
            if let Some(rate_multiplier) = command.rate_multiplier {
                item.rate_multiplier = rate_multiplier;
            }
            if let Some(official_price_multiplier) = command.official_price_multiplier {
                item.official_price_multiplier = official_price_multiplier;
            }
            if let Some(group_type) = command.group_type {
                item.group_type = group_type;
            }
            if let Some(resource_group_codes) = command.resource_group_codes {
                item.resource_group_codes = resource_group_codes;
            }
            if let Some(resource_codes) = command.resource_codes {
                item.resource_codes = resource_codes;
            }
            if let Some(capacity_total) = command.capacity_total {
                item.capacity_total = capacity_total;
            }
            if let Some(status) = command.status {
                item.status = status;
            }
            Ok(Some(item.clone()))
        })
    }

    fn delete_channel_group<'a>(
        &'a self,
        command: DeleteAdminChannelGroupCommand,
    ) -> AdminChannelGroupCommandFuture<'a, bool> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("delete");
            let mut items = self.items.lock().unwrap();
            let Some(item) = items.iter_mut().find(|item| {
                item.id == command.group_id
                    && item.tenant_id == command.subject.tenant_id
                    && item.organization_id == command.subject.organization_id
                    && item.deleted_at.is_none()
            }) else {
                return Ok(false);
            };
            item.status = "deleted".to_owned();
            item.deleted_at = Some(command.requested_at);
            Ok(true)
        })
    }

    fn list_channel_bindings<'a>(
        &'a self,
        query: ListAdminChannelGroupChannelBindingsQuery,
    ) -> AdminChannelGroupCommandFuture<'a, Vec<AdminChannelGroupChannelBindingItem>> {
        Box::pin(async move {
            Ok(self
                .bindings
                .lock()
                .unwrap()
                .iter()
                .filter(|item| {
                    item.tenant_id == query.subject.tenant_id
                        && item.organization_id == query.subject.organization_id
                        && item.group_id == query.group_id
                        && item.deleted_at.is_none()
                })
                .cloned()
                .collect())
        })
    }

    fn replace_channel_bindings<'a>(
        &'a self,
        command: ReplaceAdminChannelGroupChannelBindingsCommand,
    ) -> AdminChannelGroupCommandFuture<'a, Vec<AdminChannelGroupChannelBindingItem>> {
        Box::pin(async move {
            self.commands
                .lock()
                .unwrap()
                .push("replace_channel_bindings");
            let mut bindings = self.bindings.lock().unwrap();
            for item in bindings.iter_mut().filter(|item| {
                item.tenant_id == command.subject.tenant_id
                    && item.organization_id == command.subject.organization_id
                    && item.group_id == command.group_id
                    && item.deleted_at.is_none()
            }) {
                item.deleted_at = Some(command.requested_at.clone());
            }
            for (index, input) in command.items.into_iter().enumerate() {
                let mut item = channel_binding_item(
                    100 + index as i64,
                    command.group_id,
                    input.channel_id,
                    match input.channel_id {
                        3001 => "OpenAI primary",
                        3003 => "Gemini fallback",
                        _ => "Provider channel",
                    },
                    match input.channel_id {
                        3001 => "openai",
                        3003 => "google",
                        _ => "custom",
                    },
                    input.priority,
                    input.weight,
                    &input.status,
                );
                item.api_scope = input.api_scope;
                item.capabilities = input.capabilities;
                item.resource_codes = input.resource_codes;
                bindings.push(item);
            }
            Ok(bindings
                .iter()
                .filter(|item| {
                    item.tenant_id == command.subject.tenant_id
                        && item.organization_id == command.subject.organization_id
                        && item.group_id == command.group_id
                        && item.deleted_at.is_none()
                })
                .cloned()
                .collect())
        })
    }
}

fn channel_binding_item(
    id: i64,
    group_id: i64,
    channel_id: i64,
    channel_name: &str,
    provider_code: &str,
    priority: i64,
    weight: i64,
    status: &str,
) -> AdminChannelGroupChannelBindingItem {
    AdminChannelGroupChannelBindingItem {
        id,
        uuid: format!("binding-{id}"),
        tenant_id: 100001,
        organization_id: 0,
        group_id,
        channel_id,
        channel_name: channel_name.to_owned(),
        provider_code: provider_code.to_owned(),
        provider_name: provider_code.to_owned(),
        channel_code: format!("{provider_code}-{channel_id}"),
        resource_codes: vec!["api.openai.chat_completions".to_owned()],
        api_scope: vec!["openai.chat_completions".to_owned()],
        capabilities: vec!["llm".to_owned()],
        priority,
        weight,
        status: status.to_owned(),
        health_status: "active".to_owned(),
        deleted_at: None,
    }
}

fn channel_group_item(
    id: i64,
    group_code: &str,
    group_name: &str,
    status: &str,
    account_available: i64,
    resource_group_codes: Vec<String>,
    resource_codes: Vec<String>,
) -> AdminChannelGroupItem {
    AdminChannelGroupItem {
        id,
        uuid: format!("group-{id}"),
        tenant_id: 100001,
        organization_id: 0,
        group_code: group_code.to_owned(),
        group_name: group_name.to_owned(),
        provider_code: "openai".to_owned(),
        price_reference_mode: "multiplier".to_owned(),
        rate_multiplier: 1.0,
        official_price_multiplier: 1.0,
        group_type: "public".to_owned(),
        resource_group_codes,
        resource_codes,
        account_available,
        account_total: account_available,
        capacity_used: 0.0,
        capacity_total: 100.0,
        usage_today: 0.0,
        usage_total: 0.0,
        status: status.to_owned(),
        deleted_at: None,
    }
}

struct TestUuidGenerator;

impl EntityUuidGenerator for TestUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        Ok("test-uuid".to_owned())
    }
}
