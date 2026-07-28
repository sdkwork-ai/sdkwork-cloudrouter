mod common;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::application::{ApiKeySecretGenerator, ApiKeySecretHasher};
use sdkwork_clawrouter_router_service::domain::{
    DecimalValue, DomainResult, GatewayApiKey, QuotaPolicy, UpstreamAccountGroup,
};
use sdkwork_clawrouter_router_service::ports::{
    ApiKeyCommandStoreFuture, ApiKeyManagementReadFuture, AppUpstreamAccountGroupListPage,
    CreateGatewayApiKeyCommand, CreatedGatewayApiKey, DeleteGatewayApiKeyCommand,
    DeleteGatewayApiKeyForOrganizationCommand, EnsureDefaultUpstreamAccountGroupCommand,
    GatewayApiKeyCommandStore, GatewayApiKeyListPage, GatewayApiKeyManagementReadStore,
    GatewayApiKeyManagementSnapshot, ListAppUpstreamAccountGroupsQuery, ListGatewayApiKeysQuery,
    UpdateGatewayApiKeyCommand, UpdatedGatewayApiKey,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn app_api_key_create_ensures_default_group_when_missing() {
    let read_store = Arc::new(TestApiKeyReadStore::default());
    let command_store = Arc::new(TestApiKeyCommandStore::default());
    let router = sdkwork_clawrouter_router_service::api::app_api_key_router_with_read_store_and_command_store(
        read_store,
        command_store.clone(),
        Arc::new(TestHasher),
        Arc::new(TestSecretGenerator),
    );

    let response = router
        .oneshot(signed_request(
            "POST",
            "/app/v3/api/iam/api_keys",
            r#"{"name":"Console Key","channelGroup":"default","quota":"1000","modalities":["text"]}"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("default", payload["data"]["item"]["channelGroup"]);
    assert_eq!("Default", payload["data"]["item"]["channelGroupName"]);
    assert_eq!("sk-claw-test-secret", payload["data"]["rawKey"]);
    assert_eq!(
        "sk-claw-test-secret",
        payload["data"]["item"]["copyableKey"]
    );

    let commands = command_store.commands.lock().unwrap();
    assert_eq!(1, commands.len());
    assert_eq!(10, commands[0].tenant_id);
    assert_eq!(20, commands[0].organization_id);
    assert_eq!(30, commands[0].user_id);
    assert_eq!(501, commands[0].group_id);
}

#[tokio::test]
async fn app_api_key_update_rebinds_key_to_available_group_for_owner() {
    let read_store = Arc::new(TestApiKeyReadStore::with_owner_key());
    let command_store = Arc::new(TestApiKeyCommandStore::default());
    let router = sdkwork_clawrouter_router_service::api::app_api_key_router_with_read_store_and_command_store(
        read_store,
        command_store,
        Arc::new(TestHasher),
        Arc::new(TestSecretGenerator),
    );

    let response = router
        .oneshot(signed_request(
            "PATCH",
            "/app/v3/api/iam/api_keys/701",
            r#"{"channelGroup":"premium","name":"Updated Console Key"}"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("701", payload["data"]["item"]["id"]);
    assert_eq!("Updated Console Key", payload["data"]["item"]["name"]);
    assert_eq!("premium", payload["data"]["item"]["channelGroup"]);
    assert_eq!(
        "sk-claw-owner-secret",
        payload["data"]["item"]["copyableKey"]
    );
}

#[tokio::test]
async fn app_api_key_update_marks_one_owner_key_as_runtime_default() {
    let read_store = Arc::new(TestApiKeyReadStore::with_owner_key());
    let command_store = Arc::new(TestApiKeyCommandStore::default());
    let router = sdkwork_clawrouter_router_service::api::app_api_key_router_with_read_store_and_command_store(
        read_store,
        command_store,
        Arc::new(TestHasher),
        Arc::new(TestSecretGenerator),
    );

    let response = router
        .oneshot(signed_request(
            "PATCH",
            "/app/v3/api/iam/api_keys/701",
            r#"{"defaultForRuntime":true}"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("701", payload["data"]["item"]["id"]);
    assert_eq!(true, payload["data"]["item"]["defaultForRuntime"]);
}

#[tokio::test]
async fn app_api_key_list_returns_persisted_copyable_key_for_owner() {
    let read_store = Arc::new(TestApiKeyReadStore::with_owner_key());
    let command_store = Arc::new(TestApiKeyCommandStore::default());
    let router = sdkwork_clawrouter_router_service::api::app_api_key_router_with_read_store_and_command_store(
        read_store,
        command_store,
        Arc::new(TestHasher),
        Arc::new(TestSecretGenerator),
    );

    let response = router
        .oneshot(signed_request("GET", "/app/v3/api/iam/api_keys", ""))
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("701", payload["data"]["items"][0]["id"]);
    assert_eq!(
        "sk-claw-owner-secret",
        payload["data"]["items"][0]["copyableKey"]
    );
    assert_ne!(
        payload["data"]["items"][0]["maskedKey"],
        payload["data"]["items"][0]["copyableKey"]
    );
    assert_eq!("default", payload["data"]["items"][0]["channelGroup"]);
    assert_eq!(
        "Default customers",
        payload["data"]["items"][0]["channelGroupName"]
    );
    assert!(payload["data"]["pageInfo"].is_object());
}

#[tokio::test]
async fn app_upstream_account_group_list_returns_owner_groups_with_display_names() {
    let read_store = Arc::new(TestApiKeyReadStore::with_owner_key());
    let command_store = Arc::new(TestApiKeyCommandStore::default());
    let router = sdkwork_clawrouter_router_service::api::app_api_key_router_with_read_store_and_command_store(
        read_store,
        command_store,
        Arc::new(TestHasher),
        Arc::new(TestSecretGenerator),
    );

    let response = router
        .oneshot(signed_request(
            "GET",
            "/app/v3/api/ai/upstream_account_groups",
            "",
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!(
        "premium",
        payload["data"]["items"][0]["code"].as_str().unwrap()
    );
    assert_eq!("Premium customers", payload["data"]["items"][0]["name"]);
    assert_eq!(
        "default",
        payload["data"]["items"][1]["code"].as_str().unwrap()
    );
    assert_eq!("Default customers", payload["data"]["items"][1]["name"]);
    assert_eq!(2, payload["data"]["items"].as_array().unwrap().len());
    assert!(payload["data"]["pageInfo"].is_object());
}

#[tokio::test]
async fn app_api_key_delete_revokes_owner_key() {
    let read_store = Arc::new(TestApiKeyReadStore::with_owner_key());
    let command_store = Arc::new(TestApiKeyCommandStore::default());
    let router = sdkwork_clawrouter_router_service::api::app_api_key_router_with_read_store_and_command_store(
        read_store,
        command_store,
        Arc::new(TestHasher),
        Arc::new(TestSecretGenerator),
    );

    let response = router
        .oneshot(signed_request("DELETE", "/app/v3/api/iam/api_keys/701", ""))
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("701", payload["data"]["id"]);
}

#[tokio::test]
async fn app_upstream_account_group_routes_do_not_expose_legacy_public_path() {
    let read_store = Arc::new(TestApiKeyReadStore::with_owner_key());
    let command_store = Arc::new(TestApiKeyCommandStore::default());
    let router = sdkwork_clawrouter_router_service::api::app_api_key_router_with_read_store_and_command_store(
        read_store,
        command_store,
        Arc::new(TestHasher),
        Arc::new(TestSecretGenerator),
    );

    let legacy_group_path = format!("/app/v3/api/iam/{}{}", "api_key_", "groups");
    let response = router
        .oneshot(signed_request("GET", &legacy_group_path, ""))
        .await
        .unwrap();

    assert_eq!(StatusCode::NOT_FOUND, response.status());
}

fn signed_request(method: &str, path: &str, body: &str) -> Request<Body> {
    let mut request = common::web_framework_app_request(
        method,
        path,
        Body::from(body.to_owned()),
        "10",
        Some("20"),
        "30",
    );
    request.headers_mut().insert(
        "content-type",
        axum::http::HeaderValue::from_static("application/json"),
    );
    request.headers_mut().insert(
        "Idempotency-Key",
        axum::http::HeaderValue::from_static("idem-app-api-key-test"),
    );
    request.headers_mut().insert(
        "X-Request-Id",
        axum::http::HeaderValue::from_static("22222222-2222-4333-8444-555555555555"),
    );
    request
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

#[derive(Default)]
struct TestApiKeyReadStore {
    include_owner_key: bool,
}

impl TestApiKeyReadStore {
    fn with_owner_key() -> Self {
        Self {
            include_owner_key: true,
        }
    }
}

impl GatewayApiKeyManagementReadStore for TestApiKeyReadStore {
    fn load_gateway_api_key_management_snapshot<'a>(
        &'a self,
    ) -> ApiKeyManagementReadFuture<'a, GatewayApiKeyManagementSnapshot> {
        Box::pin(async move {
            let mut snapshot = GatewayApiKeyManagementSnapshot {
                upstream_account_groups: vec![UpstreamAccountGroup::new_scoped(
                    99,
                    999,
                    999,
                    "enterprise",
                    "enterprise-plan",
                    DecimalValue::ONE,
                    DecimalValue::ONE,
                )
                .with_name("Enterprise customers")],
                ..Default::default()
            };
            if self.include_owner_key {
                snapshot.api_keys.push(GatewayApiKey {
                    id: 701,
                    tenant_id: 100001,
                    organization_id: 0,
                    user_id: 30,
                    group_id: 501,
                    name: "Console Key".to_owned(),
                    key_prefix: "sk-claw-test".to_owned(),
                    key_display_masked: "sk-claw-test********CRET".to_owned(),
                    key_hash: "hash:sk-claw-test-secret".to_owned(),
                    copyable_key: Some("sk-claw-owner-secret".to_owned()),
                    policy_id: None,
                    quota_policy_id: Some(801),
                    created_at: "2026-05-17 10:00:00".to_owned(),
                    expire_at: None,
                    status_code: 1,
                    default_for_runtime: false,
                    account_group_bindings: Vec::new(),
                });
                snapshot.upstream_account_groups.push(
                    UpstreamAccountGroup::new_scoped(
                        502,
                        10,
                        20,
                        "premium",
                        "premium-plan",
                        DecimalValue::ONE,
                        DecimalValue::ONE,
                    )
                    .with_name("Premium customers"),
                );
                snapshot.upstream_account_groups.push(
                    UpstreamAccountGroup::new_scoped(
                        501,
                        10,
                        20,
                        "default",
                        "standard",
                        DecimalValue::ONE,
                        DecimalValue::ONE,
                    )
                    .with_name("Default customers"),
                );
                snapshot.quota_policies.push(QuotaPolicy::new(
                    801,
                    Some(DecimalValue::parse("1000.000000").unwrap()),
                ));
            }
            Ok(snapshot)
        })
    }

    fn list_gateway_api_keys<'a>(
        &'a self,
        query: ListGatewayApiKeysQuery,
    ) -> ApiKeyManagementReadFuture<'a, GatewayApiKeyListPage> {
        Box::pin(async move {
            let snapshot = self.load_gateway_api_key_management_snapshot().await?;
            let scoped =
                snapshot.for_subject(query.tenant_id, query.organization_id, query.user_id);
            let mut items: Vec<_> = scoped
                .api_keys
                .into_iter()
                .filter(|api_key| {
                    query.q.as_ref().is_none_or(|search| {
                        let search = search.to_lowercase();
                        api_key.name.to_lowercase().contains(&search)
                            || api_key.key_prefix.to_lowercase().contains(&search)
                            || api_key.key_display_masked.to_lowercase().contains(&search)
                    })
                })
                .collect();
            let total = items.len() as i64;
            let offset = query.offset.max(0) as usize;
            let page_size = query.page_size.max(0) as usize;
            if offset >= items.len() {
                items.clear();
            } else {
                items = items.into_iter().skip(offset).take(page_size).collect();
            }
            Ok(GatewayApiKeyListPage {
                items,
                total,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn list_app_upstream_account_groups<'a>(
        &'a self,
        query: ListAppUpstreamAccountGroupsQuery,
    ) -> ApiKeyManagementReadFuture<'a, AppUpstreamAccountGroupListPage> {
        Box::pin(async move {
            let snapshot = self.load_gateway_api_key_management_snapshot().await?;
            let mut items: Vec<_> = snapshot
                .upstream_account_groups
                .into_iter()
                .filter(|group| {
                    (group.tenant_id == 0 || group.tenant_id == query.tenant_id)
                        && (group.organization_id == 0
                            || group.organization_id == query.organization_id)
                })
                .filter(|group| {
                    query.q.as_ref().is_none_or(|search| {
                        let search = search.to_lowercase();
                        group.name.to_lowercase().contains(&search)
                            || group.code.to_lowercase().contains(&search)
                    })
                })
                .collect();
            let total = items.len() as i64;
            let offset = query.offset.max(0) as usize;
            let page_size = query.page_size.max(0) as usize;
            if offset >= items.len() {
                items.clear();
            } else {
                items = items.into_iter().skip(offset).take(page_size).collect();
            }
            Ok(AppUpstreamAccountGroupListPage {
                items,
                total,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }
}

#[derive(Default)]
struct TestApiKeyCommandStore {
    commands: Mutex<Vec<CreateGatewayApiKeyCommand>>,
    update_commands: Mutex<Vec<UpdateGatewayApiKeyCommand>>,
}

impl GatewayApiKeyCommandStore for TestApiKeyCommandStore {
    fn ensure_default_upstream_account_group<'a>(
        &'a self,
        command: EnsureDefaultUpstreamAccountGroupCommand,
    ) -> ApiKeyCommandStoreFuture<'a, UpstreamAccountGroup> {
        Box::pin(async move {
            assert_eq!("standard", command.pricing_plan_code);
            Ok(UpstreamAccountGroup::new_scoped(
                501,
                command.tenant_id,
                command.organization_id,
                &command.code,
                &command.pricing_plan_code,
                command.rate_multiplier,
                command.official_price_multiplier,
            )
            .with_name(&command.name))
        })
    }

    fn create_gateway_api_key<'a>(
        &'a self,
        command: CreateGatewayApiKeyCommand,
    ) -> ApiKeyCommandStoreFuture<'a, CreatedGatewayApiKey> {
        Box::pin(async move {
            self.commands.lock().unwrap().push(command.clone());
            Ok(CreatedGatewayApiKey {
                api_key: GatewayApiKey {
                    id: 701,
                    tenant_id: command.tenant_id,
                    organization_id: command.organization_id,
                    user_id: command.user_id,
                    group_id: command.group_id,
                    name: command.name,
                    key_prefix: command.key_prefix,
                    key_display_masked: command.key_display_masked,
                    key_hash: command.key_hash,
                    copyable_key: Some(command.copyable_key),
                    policy_id: None,
                    quota_policy_id: Some(801),
                    created_at: command.created_at,
                    expire_at: command.expire_at,
                    status_code: 1,
                    default_for_runtime: false,
                    account_group_bindings: Vec::new(),
                },
                access_policy: None,
                quota_policy: Some(QuotaPolicy::new(
                    801,
                    Some(DecimalValue::parse("1000.000000").unwrap()),
                )),
            })
        })
    }

    fn update_gateway_api_key<'a>(
        &'a self,
        command: UpdateGatewayApiKeyCommand,
    ) -> ApiKeyCommandStoreFuture<'a, Option<UpdatedGatewayApiKey>> {
        Box::pin(async move {
            self.update_commands.lock().unwrap().push(command.clone());
            Ok(Some(UpdatedGatewayApiKey {
                api_key: GatewayApiKey {
                    id: command.api_key_id,
                    tenant_id: command.tenant_id,
                    organization_id: command.organization_id,
                    user_id: command.user_id,
                    group_id: command.group_id.unwrap_or(501),
                    name: command.name.unwrap_or_else(|| "Console Key".to_owned()),
                    key_prefix: "sk-claw-test".to_owned(),
                    key_display_masked: "sk-claw-test********CRET".to_owned(),
                    key_hash: "hash:sk-claw-test-secret".to_owned(),
                    copyable_key: Some("sk-claw-owner-secret".to_owned()),
                    policy_id: None,
                    quota_policy_id: Some(801),
                    created_at: "2026-05-17 10:00:00".to_owned(),
                    expire_at: None,
                    status_code: 1,
                    default_for_runtime: command.default_for_runtime.unwrap_or(false),
                    account_group_bindings: Vec::new(),
                },
                access_policy: None,
                quota_policy: Some(QuotaPolicy::new(
                    801,
                    Some(DecimalValue::parse("1000.000000").unwrap()),
                )),
            }))
        })
    }

    fn delete_gateway_api_key<'a>(
        &'a self,
        _command: DeleteGatewayApiKeyCommand,
    ) -> ApiKeyCommandStoreFuture<'a, bool> {
        Box::pin(async move { Ok(true) })
    }

    fn delete_gateway_api_key_for_organization<'a>(
        &'a self,
        _command: DeleteGatewayApiKeyForOrganizationCommand,
    ) -> ApiKeyCommandStoreFuture<'a, bool> {
        Box::pin(async move { Ok(true) })
    }
}

struct TestHasher;

impl ApiKeySecretHasher for TestHasher {
    fn hash_secret(&self, secret: &str) -> DomainResult<String> {
        Ok(format!("hash:{secret}"))
    }
}

struct TestSecretGenerator;

impl sdkwork_clawrouter_router_service::application::EntityUuidGenerator for TestSecretGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        Ok("entity-uuid-test".to_owned())
    }
}

impl ApiKeySecretGenerator for TestSecretGenerator {
    fn generate_api_key_secret(&self) -> DomainResult<String> {
        Ok("sk-claw-test-secret".to_owned())
    }
}
