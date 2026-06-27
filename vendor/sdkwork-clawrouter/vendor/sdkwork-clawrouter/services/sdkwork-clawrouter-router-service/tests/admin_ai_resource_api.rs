mod common;
use common::InternalTrustedSubjectHeaders;

use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::application::{
    default_desktop_cache_manager, AiRoutingCacheInvalidatingAdminAiResourceStore,
    EntityUuidGenerator, ROUTING_CONFIG_VERSION_CACHE_NAMESPACE,
    ROUTING_PROVIDER_OBJECT_ROUTE_CACHE_NAMESPACE, ROUTING_SNAPSHOT_CACHE_NAMESPACE,
};
use sdkwork_clawrouter_router_service::domain::DomainError;
use sdkwork_clawrouter_router_service::ports::{
    AdminAiResourceGroupItem, AdminAiResourceGroupResourceItem, AdminAiResourceItem,
    AdminAiResourceMemberItem, AdminAiResourceReadFuture, AdminAiResourceStore,
    AdminAiResourceSubject, CreateAdminAiResourceCommand, CreateAdminAiResourceGroupCommand,
    DeleteAdminAiResourceGroupCommand, ListAdminAiResourceGroupResourcesQuery,
    ListAdminAiResourceGroupsQuery, ListAdminAiResourcesQuery, UpdateAdminAiResourceCommand,
    UpdateAdminAiResourceGroupCommand,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn admin_ai_resource_route_lists_resources_with_members() {
    let router = sdkwork_clawrouter_router_service::api::admin_ai_resource_router_with_store(
        Arc::new(TestAiResourceStore),
        Arc::new(TestUuidGenerator::default()),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/resources")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!("vendor.openai", payload["data"]["items"][0]["resourceCode"]);
    assert_eq!("vendor", payload["data"]["items"][0]["resourceType"]);
    assert_eq!(
        "bundle.openrouter.openai.standard",
        payload["data"]["items"][1]["resourceCode"]
    );
    assert_eq!(
        "model.openai.gpt-4o-mini.chat",
        payload["data"]["items"][1]["members"][0]["memberResourceCode"]
    );
    assert_eq!(true, payload["data"]["items"][1]["members"][0]["required"]);
}

#[tokio::test]
async fn admin_ai_resource_group_route_manages_groups_and_static_all_api_resources() {
    let router = sdkwork_clawrouter_router_service::api::admin_ai_resource_router_with_store(
        Arc::new(TestAiResourceStore),
        Arc::new(TestUuidGenerator::default()),
    );

    let list_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/resource_groups")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, list_response.status());
    let list_payload = json_payload(list_response).await;
    assert_eq!("2000", list_payload["code"]);
    assert_eq!("api.all", list_payload["data"]["items"][0]["groupCode"]);
    assert_eq!("全部API", list_payload["data"]["items"][0]["groupName"]);
    assert_eq!("all", list_payload["data"]["items"][0]["selectionMode"]);
    assert_eq!("openai", list_payload["data"]["items"][0]["vendorCodes"][0]);
    assert_eq!("llm", list_payload["data"]["items"][0]["capability"]);
    assert_eq!("llm", list_payload["data"]["items"][0]["capabilities"][0]);
    assert_eq!(false, list_payload["data"]["items"][0]["dynamic"]);

    let all_resources_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/resource_groups/api.all/resources")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, all_resources_response.status());
    let all_resources_payload = json_payload(all_resources_response).await;
    assert_eq!("2000", all_resources_payload["code"]);
    assert_eq!(
        "api.openai.chat_completions",
        all_resources_payload["data"]["items"][0]["resourceCode"]
    );
    assert_eq!(
        "api_endpoint",
        all_resources_payload["data"]["items"][0]["resourceType"]
    );

    let create_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/ai/resource_groups")
                .internal_trusted_subject(10, 20, 30)
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"groupCode":" API.Custom.Chat ","groupName":"Custom Chat API","groupType":"api_group","selectionMode":"manual","description":"Custom group","sortOrder":30,"status":"active","members":[{"resourceCode":"api.openai.chat_completions","itemRole":"included","sortOrder":1}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, create_response.status());
    let create_payload = json_payload(create_response).await;
    assert_eq!(
        "api.custom.chat",
        create_payload["data"]["item"]["groupCode"]
    );
    assert_eq!(1, create_payload["data"]["item"]["resourceCount"]);

    let update_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri("/backend/v3/api/ai/resource_groups/3")
                .internal_trusted_subject(10, 20, 30)
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"groupName":"Custom Chat API v2","members":[{"resourceCode":"api.openai.responses","itemRole":"optional","sortOrder":2}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, update_response.status());
    let update_payload = json_payload(update_response).await;
    assert_eq!(
        "Custom Chat API v2",
        update_payload["data"]["item"]["groupName"]
    );
    assert_eq!(1, update_payload["data"]["item"]["resourceCount"]);

    let delete_response = router
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri("/backend/v3/api/ai/resource_groups/3")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, delete_response.status());
    let delete_payload = json_payload(delete_response).await;
    assert_eq!(true, delete_payload["data"]["deleted"]);
}

#[tokio::test]
async fn admin_ai_resource_route_creates_and_updates_resources() {
    let router = sdkwork_clawrouter_router_service::api::admin_ai_resource_router_with_store(
        Arc::new(TestAiResourceStore),
        Arc::new(TestUuidGenerator::default()),
    );

    let create_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/ai/resources")
                .internal_trusted_subject(10, 20, 30)
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"resourceCode":" Bundle.OpenRouter.OpenAI.Standard ","resourceType":"bundle","displayName":"OpenRouter OpenAI Standard","vendorCode":" OpenAI ","compositionMode":"all","status":"active","sortOrder":5,"members":[{"memberResourceCode":"model.openai.gpt-4o-mini.chat","memberRole":"included","required":true,"sortOrder":1}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, create_response.status());
    let create_payload = json_payload(create_response).await;
    assert_eq!("2000", create_payload["code"]);
    assert_eq!(
        "bundle.openrouter.openai.standard",
        create_payload["data"]["item"]["resourceCode"]
    );
    assert_eq!("bundle", create_payload["data"]["item"]["resourceType"]);
    assert_eq!("all", create_payload["data"]["item"]["compositionMode"]);
    assert_eq!(
        "model.openai.gpt-4o-mini.chat",
        create_payload["data"]["item"]["members"][0]["memberResourceCode"]
    );

    let update_response = router
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/backend/v3/api/ai/resources/5")
                .internal_trusted_subject(10, 20, 30)
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"displayName":"OpenRouter OpenAI Bundle","status":"disabled","members":[]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, update_response.status());
    let update_payload = json_payload(update_response).await;
    assert_eq!("disabled", update_payload["data"]["item"]["status"]);
    assert_eq!(
        "OpenRouter OpenAI Bundle",
        update_payload["data"]["item"]["displayName"]
    );
    assert_eq!(
        0,
        update_payload["data"]["item"]["members"]
            .as_array()
            .unwrap()
            .len()
    );
}

#[tokio::test]
async fn admin_ai_resource_route_invalidates_routing_cache_after_successful_mutation() {
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
            ROUTING_PROVIDER_OBJECT_ROUTE_CACHE_NAMESPACE,
            "tenant:10:org:20:object:resp_123",
            serde_json::json!({ "channelId": 1 }),
        )
        .await
        .unwrap();
    let router = sdkwork_clawrouter_router_service::api::admin_ai_resource_router_with_store(
        Arc::new(AiRoutingCacheInvalidatingAdminAiResourceStore::new(
            Arc::new(TestAiResourceStore),
            manager.clone(),
        )),
        Arc::new(TestUuidGenerator::default()),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/ai/resources")
                .internal_trusted_subject(10, 20, 30)
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"resourceCode":"bundle.openrouter.openai.standard","resourceType":"bundle","displayName":"OpenRouter OpenAI Standard","vendorCode":"OpenAI","compositionMode":"all","status":"active","sortOrder":5,"members":[{"memberResourceCode":"model.openai.gpt-4o-mini.chat"}]}"#,
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
            ROUTING_PROVIDER_OBJECT_ROUTE_CACHE_NAMESPACE,
            "tenant:10:org:20:object:resp_123"
        )
        .await
        .unwrap()
        .is_some());
}

#[tokio::test]
async fn admin_ai_resource_route_maps_missing_member_resource_to_not_found() {
    let router = sdkwork_clawrouter_router_service::api::admin_ai_resource_router_with_store(
        Arc::new(MissingMemberAiResourceStore),
        Arc::new(TestUuidGenerator::default()),
    );

    let create_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/ai/resources")
                .internal_trusted_subject(10, 20, 30)
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"resourceCode":"bundle.openrouter.openai.invalid","resourceType":"bundle","displayName":"Invalid Bundle","members":[{"memberResourceCode":"model.openai.missing.chat"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::NOT_FOUND, create_response.status());
    let create_payload = json_payload(create_response).await;
    assert_eq!("4040", create_payload["code"]);
    assert!(create_payload["msg"]
        .as_str()
        .unwrap()
        .contains("model.openai.missing.chat"));

    let update_response = router
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/backend/v3/api/ai/resources/5")
                .internal_trusted_subject(10, 20, 30)
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"members":[{"memberResourceCode":"model.openai.missing.chat"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::NOT_FOUND, update_response.status());
    let update_payload = json_payload(update_response).await;
    assert_eq!("4040", update_payload["code"]);
    assert!(update_payload["msg"]
        .as_str()
        .unwrap()
        .contains("model.openai.missing.chat"));
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

struct TestAiResourceStore;

impl AdminAiResourceStore for TestAiResourceStore {
    fn list_ai_resources<'a>(
        &'a self,
        query: ListAdminAiResourcesQuery,
    ) -> AdminAiResourceReadFuture<'a, Vec<AdminAiResourceItem>> {
        Box::pin(async move {
            assert_eq!(
                AdminAiResourceSubject {
                    tenant_id: 100001,
                    organization_id: 0,
                    operator_id: 30,
                    operator_type: 1,
                },
                query.subject
            );
            Ok(vec![
                AdminAiResourceItem {
                    id: 1,
                    resource_code: "vendor.openai".to_owned(),
                    resource_type: "vendor".to_owned(),
                    display_name: "OpenAI".to_owned(),
                    vendor_code: Some("openai".to_owned()),
                    modality_code: None,
                    api_endpoint_code: None,
                    catalog_key: None,
                    model: None,
                    provider_native_model: None,
                    capability: Some("network".to_owned()),
                    capabilities: vec![
                        "llm".to_owned(),
                        "image".to_owned(),
                        "audio".to_owned(),
                        "video".to_owned(),
                        "embedding".to_owned(),
                        "network".to_owned(),
                    ],
                    composition_mode: "single".to_owned(),
                    status: "active".to_owned(),
                    sort_order: Some(1),
                    members: Vec::new(),
                },
                AdminAiResourceItem {
                    id: 5,
                    resource_code: "bundle.openrouter.openai.standard".to_owned(),
                    resource_type: "bundle".to_owned(),
                    display_name: "OpenRouter OpenAI Standard".to_owned(),
                    vendor_code: Some("openai".to_owned()),
                    modality_code: None,
                    api_endpoint_code: None,
                    catalog_key: None,
                    model: None,
                    provider_native_model: None,
                    capability: Some("llm".to_owned()),
                    capabilities: vec!["llm".to_owned(), "chat".to_owned()],
                    composition_mode: "all".to_owned(),
                    status: "active".to_owned(),
                    sort_order: Some(5),
                    members: vec![AdminAiResourceMemberItem {
                        parent_resource_code: "bundle.openrouter.openai.standard".to_owned(),
                        member_resource_code: "model.openai.gpt-4o-mini.chat".to_owned(),
                        member_role: "included".to_owned(),
                        required: true,
                        sort_order: Some(1),
                    }],
                },
            ])
        })
    }

    fn create_ai_resource<'a>(
        &'a self,
        command: CreateAdminAiResourceCommand,
    ) -> AdminAiResourceReadFuture<'a, AdminAiResourceItem> {
        Box::pin(async move {
            assert_eq!("entity-1", command.resource_uuid);
            assert_eq!("entity-2", command.member_uuids[0]);
            assert_eq!("entity-3", command.audit_log_uuid);
            assert_eq!("bundle.openrouter.openai.standard", command.resource_code);
            assert_eq!("OpenRouter OpenAI Standard", command.display_name);
            assert_eq!(Some("openai"), command.vendor_code.as_deref());
            assert_eq!("all", command.composition_mode);
            assert_eq!(Some(5), command.sort_order);
            assert_eq!(1, command.members.len());
            assert_eq!(
                "model.openai.gpt-4o-mini.chat",
                command.members[0].member_resource_code
            );
            assert_eq!("included", command.members[0].member_role);
            assert!(command.members[0].required);
            Ok(AdminAiResourceItem {
                id: 5,
                resource_code: command.resource_code,
                resource_type: command.resource_type,
                display_name: command.display_name,
                vendor_code: command.vendor_code,
                modality_code: command.modality_code,
                api_endpoint_code: command.api_endpoint_code,
                catalog_key: command.catalog_key,
                model: command.model,
                provider_native_model: command.provider_native_model,
                capability: None,
                capabilities: Vec::new(),
                composition_mode: command.composition_mode,
                status: command.status,
                sort_order: command.sort_order,
                members: vec![AdminAiResourceMemberItem {
                    parent_resource_code: "bundle.openrouter.openai.standard".to_owned(),
                    member_resource_code: "model.openai.gpt-4o-mini.chat".to_owned(),
                    member_role: "included".to_owned(),
                    required: true,
                    sort_order: Some(1),
                }],
            })
        })
    }

    fn update_ai_resource<'a>(
        &'a self,
        command: UpdateAdminAiResourceCommand,
    ) -> AdminAiResourceReadFuture<'a, Option<AdminAiResourceItem>> {
        Box::pin(async move {
            assert_eq!(5, command.resource_id);
            assert_eq!("entity-4", command.audit_log_uuid);
            assert_eq!(
                Some("OpenRouter OpenAI Bundle"),
                command.display_name.as_deref()
            );
            assert_eq!(Some("disabled"), command.status.as_deref());
            assert_eq!(Some(0), command.members.as_ref().map(Vec::len));
            Ok(Some(AdminAiResourceItem {
                id: command.resource_id,
                resource_code: "bundle.openrouter.openai.standard".to_owned(),
                resource_type: "bundle".to_owned(),
                display_name: command.display_name.unwrap(),
                vendor_code: Some("openai".to_owned()),
                modality_code: None,
                api_endpoint_code: None,
                catalog_key: None,
                model: None,
                provider_native_model: None,
                capability: Some("llm".to_owned()),
                capabilities: vec!["llm".to_owned(), "chat".to_owned()],
                composition_mode: "all".to_owned(),
                status: command.status.unwrap(),
                sort_order: Some(5),
                members: Vec::new(),
            }))
        })
    }

    fn list_ai_resource_groups<'a>(
        &'a self,
        query: ListAdminAiResourceGroupsQuery,
    ) -> AdminAiResourceReadFuture<'a, Vec<AdminAiResourceGroupItem>> {
        assert_eq!(
            AdminAiResourceSubject {
                tenant_id: 100001,
                organization_id: 0,
                operator_id: 30,
                operator_type: 1,
            },
            query.subject
        );
        Box::pin(async {
            Ok(vec![
                AdminAiResourceGroupItem {
                    id: 1,
                    group_code: "api.all".to_owned(),
                    group_name: "全部API".to_owned(),
                    group_type: "api_group".to_owned(),
                    selection_mode: "all".to_owned(),
                    description: Some("All seeded API resources".to_owned()),
                    vendor_codes: vec!["openai".to_owned()],
                    capability: Some("llm".to_owned()),
                    capabilities: vec!["llm".to_owned()],
                    sort_order: Some(1),
                    status: "active".to_owned(),
                    resource_count: 2,
                    dynamic: false,
                },
                AdminAiResourceGroupItem {
                    id: 2,
                    group_code: "api.openai.chat".to_owned(),
                    group_name: "OpenAI Chat API".to_owned(),
                    group_type: "api_group".to_owned(),
                    selection_mode: "manual".to_owned(),
                    description: None,
                    vendor_codes: vec!["openai".to_owned()],
                    capability: Some("llm".to_owned()),
                    capabilities: vec!["llm".to_owned()],
                    sort_order: Some(4),
                    status: "active".to_owned(),
                    resource_count: 1,
                    dynamic: false,
                },
            ])
        })
    }

    fn list_ai_resource_group_resources<'a>(
        &'a self,
        query: ListAdminAiResourceGroupResourcesQuery,
    ) -> AdminAiResourceReadFuture<'a, Vec<AdminAiResourceGroupResourceItem>> {
        assert_eq!("api.all", query.group_id_or_code);
        Box::pin(async {
            Ok(vec![
                AdminAiResourceGroupResourceItem {
                    id: 11,
                    resource_code: "api.openai.chat_completions".to_owned(),
                    resource_type: "api_endpoint".to_owned(),
                    display_name: "OpenAI Chat Completions".to_owned(),
                    vendor_code: Some("openai".to_owned()),
                    modality_code: Some("llm".to_owned()),
                    api_endpoint_code: Some("openai.chat_completions".to_owned()),
                    catalog_key: None,
                    model: None,
                    provider_native_model: None,
                    status: "active".to_owned(),
                    sort_order: Some(1),
                    member_role: "included".to_owned(),
                },
                AdminAiResourceGroupResourceItem {
                    id: 12,
                    resource_code: "api.openai.responses".to_owned(),
                    resource_type: "api_endpoint".to_owned(),
                    display_name: "OpenAI Responses".to_owned(),
                    vendor_code: Some("openai".to_owned()),
                    modality_code: Some("llm".to_owned()),
                    api_endpoint_code: Some("openai.responses".to_owned()),
                    catalog_key: None,
                    model: None,
                    provider_native_model: None,
                    status: "active".to_owned(),
                    sort_order: Some(2),
                    member_role: "included".to_owned(),
                },
            ])
        })
    }

    fn create_ai_resource_group<'a>(
        &'a self,
        command: CreateAdminAiResourceGroupCommand,
    ) -> AdminAiResourceReadFuture<'a, AdminAiResourceGroupItem> {
        assert_eq!("api.custom.chat", command.group_code);
        assert_eq!("Custom Chat API", command.group_name);
        assert_eq!("api_group", command.group_type);
        assert_eq!("manual", command.selection_mode);
        assert_eq!(1, command.members.len());
        assert_eq!(
            "api.openai.chat_completions",
            command.members[0].resource_code
        );
        Box::pin(async {
            Ok(AdminAiResourceGroupItem {
                id: 3,
                group_code: "api.custom.chat".to_owned(),
                group_name: "Custom Chat API".to_owned(),
                group_type: "api_group".to_owned(),
                selection_mode: "manual".to_owned(),
                description: Some("Custom group".to_owned()),
                vendor_codes: vec!["openai".to_owned()],
                capability: Some("llm".to_owned()),
                capabilities: vec!["llm".to_owned()],
                sort_order: Some(30),
                status: "active".to_owned(),
                resource_count: 1,
                dynamic: false,
            })
        })
    }

    fn update_ai_resource_group<'a>(
        &'a self,
        command: UpdateAdminAiResourceGroupCommand,
    ) -> AdminAiResourceReadFuture<'a, Option<AdminAiResourceGroupItem>> {
        assert_eq!(3, command.group_id);
        assert_eq!(Some("Custom Chat API v2"), command.group_name.as_deref());
        assert_eq!(
            1,
            command.members.as_ref().map(Vec::len).unwrap_or_default()
        );
        Box::pin(async {
            Ok(Some(AdminAiResourceGroupItem {
                id: 3,
                group_code: "api.custom.chat".to_owned(),
                group_name: "Custom Chat API v2".to_owned(),
                group_type: "api_group".to_owned(),
                selection_mode: "manual".to_owned(),
                description: Some("Custom group".to_owned()),
                vendor_codes: vec!["openai".to_owned()],
                capability: Some("llm".to_owned()),
                capabilities: vec!["llm".to_owned()],
                sort_order: Some(30),
                status: "active".to_owned(),
                resource_count: 1,
                dynamic: false,
            }))
        })
    }

    fn delete_ai_resource_group<'a>(
        &'a self,
        command: DeleteAdminAiResourceGroupCommand,
    ) -> AdminAiResourceReadFuture<'a, bool> {
        assert_eq!(3, command.group_id);
        Box::pin(async { Ok(true) })
    }
}

struct MissingMemberAiResourceStore;

impl AdminAiResourceStore for MissingMemberAiResourceStore {
    fn list_ai_resources<'a>(
        &'a self,
        _query: ListAdminAiResourcesQuery,
    ) -> AdminAiResourceReadFuture<'a, Vec<AdminAiResourceItem>> {
        Box::pin(async { Ok(Vec::new()) })
    }

    fn create_ai_resource<'a>(
        &'a self,
        _command: CreateAdminAiResourceCommand,
    ) -> AdminAiResourceReadFuture<'a, AdminAiResourceItem> {
        Box::pin(async { Err(missing_member_error()) })
    }

    fn update_ai_resource<'a>(
        &'a self,
        _command: UpdateAdminAiResourceCommand,
    ) -> AdminAiResourceReadFuture<'a, Option<AdminAiResourceItem>> {
        Box::pin(async { Err(missing_member_error()) })
    }

    fn list_ai_resource_groups<'a>(
        &'a self,
        _query: ListAdminAiResourceGroupsQuery,
    ) -> AdminAiResourceReadFuture<'a, Vec<AdminAiResourceGroupItem>> {
        Box::pin(async { Ok(Vec::new()) })
    }

    fn list_ai_resource_group_resources<'a>(
        &'a self,
        _query: ListAdminAiResourceGroupResourcesQuery,
    ) -> AdminAiResourceReadFuture<'a, Vec<AdminAiResourceGroupResourceItem>> {
        Box::pin(async { Ok(Vec::new()) })
    }

    fn create_ai_resource_group<'a>(
        &'a self,
        _command: CreateAdminAiResourceGroupCommand,
    ) -> AdminAiResourceReadFuture<'a, AdminAiResourceGroupItem> {
        Box::pin(async { Err(missing_member_error()) })
    }

    fn update_ai_resource_group<'a>(
        &'a self,
        _command: UpdateAdminAiResourceGroupCommand,
    ) -> AdminAiResourceReadFuture<'a, Option<AdminAiResourceGroupItem>> {
        Box::pin(async { Err(missing_member_error()) })
    }

    fn delete_ai_resource_group<'a>(
        &'a self,
        _command: DeleteAdminAiResourceGroupCommand,
    ) -> AdminAiResourceReadFuture<'a, bool> {
        Box::pin(async { Ok(false) })
    }
}

fn missing_member_error() -> DomainError {
    DomainError::not_found("AI resource member was not found: model.openai.missing.chat")
}

struct TestUuidGenerator {
    next: AtomicUsize,
}

impl Default for TestUuidGenerator {
    fn default() -> Self {
        Self {
            next: AtomicUsize::new(1),
        }
    }
}

impl EntityUuidGenerator for TestUuidGenerator {
    fn generate_entity_uuid(
        &self,
    ) -> sdkwork_clawrouter_router_service::domain::DomainResult<String> {
        Ok(format!(
            "entity-{}",
            self.next.fetch_add(1, Ordering::SeqCst)
        ))
    }
}
