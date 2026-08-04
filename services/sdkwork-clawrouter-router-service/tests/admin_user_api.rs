pub mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::application::{ApiKeySecretGenerator, ApiKeySecretHasher};
use sdkwork_clawrouter_router_service::domain::{
    DomainError, DomainResult, GatewayApiKey, UpstreamAccountGroup,
};
use sdkwork_clawrouter_router_service::ports::{
    AdjustAdminUserBalanceCommand, AdminUserApiKeyItem, AdminUserApiKeyListPage,
    AdminUserCommandFuture, AdminUserItem, AdminUserListPage, AdminUserStore,
    ApiKeyCommandStoreFuture, CreateAdminUserApiKeyCommand, CreateAdminUserCommand,
    CreateGatewayApiKeyCommand, CreatedGatewayApiKey, DeleteAdminUserApiKeyCommand,
    DeleteGatewayApiKeyCommand, DeleteGatewayApiKeyForOrganizationCommand,
    EnsureDefaultUpstreamAccountGroupCommand, GatewayApiKeyCommandStore, ListAdminUserApiKeysQuery,
    ListAdminUsersQuery, UpdateAdminUserCommand, UpdateGatewayApiKeyCommand, UpdatedGatewayApiKey,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn admin_user_route_lists_users_and_api_keys_by_user() {
    let store = Arc::new(TestAdminUserStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_user_router_with_store(
        store,
        Arc::new(TestHasher),
        Arc::new(TestSecretGenerator),
    );

    let users_response = router
        .clone()
        .oneshot(signed_request("POST", "/backend/v3/api/user/list", "{}"))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, users_response.status());
    let users_payload = json_payload(users_response).await;
    assert_eq!(0, users_payload["code"].as_i64().unwrap());
    assert_eq!(30, users_payload["data"]["items"][0]["id"]);
    assert_eq!(
        "owner@example.com",
        users_payload["data"]["items"][0]["email"]
    );
    assert_eq!("standard", users_payload["data"]["items"][0]["group"]);
    assert_eq!("$25.50", users_payload["data"]["items"][0]["balance"]);
    assert_eq!("offset", users_payload["data"]["pageInfo"]["mode"]);
    assert_eq!(1, users_payload["data"]["pageInfo"]["page"]);
    assert_eq!(20, users_payload["data"]["pageInfo"]["pageSize"]);
    assert_eq!("1", users_payload["data"]["pageInfo"]["totalItems"]);

    let api_keys_response = router
        .oneshot(signed_request("POST", "/backend/v3/api/apikey/list", "{}"))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, api_keys_response.status());
    let api_keys_payload = json_payload(api_keys_response).await;
    assert_eq!(0, api_keys_payload["code"].as_i64().unwrap());
    assert_eq!("Production", api_keys_payload["data"]["items"][0]["name"]);
    assert_eq!(
        "sk-live********",
        api_keys_payload["data"]["items"][0]["key"]
    );
    assert_eq!("offset", api_keys_payload["data"]["pageInfo"]["mode"]);
    assert_eq!(1, api_keys_payload["data"]["pageInfo"]["page"]);
    assert_eq!(20, api_keys_payload["data"]["pageInfo"]["pageSize"]);
    assert_eq!("1", api_keys_payload["data"]["pageInfo"]["totalItems"]);
}

#[tokio::test]
async fn admin_user_route_does_not_serve_appbase_backend_iam_dependency_operations() {
    let store = Arc::new(TestAdminUserStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_user_router_with_store(
        store.clone(),
        Arc::new(TestHasher),
        Arc::new(TestSecretGenerator),
    );

    for (method, path) in [
        ("GET", "/backend/v3/api/iam/users"),
        ("POST", "/backend/v3/api/iam/users"),
        ("PATCH", "/backend/v3/api/iam/users/30"),
        ("GET", "/backend/v3/api/iam/api_keys"),
    ] {
        let response = router
            .clone()
            .oneshot(signed_request(method, path, "{}"))
            .await
            .unwrap();

        assert_ne!(StatusCode::OK, response.status(), "{method} {path}");
    }

    assert!(store.commands.lock().unwrap().is_empty());
}

#[tokio::test]
async fn admin_user_api_key_command_route_serves_backend_iam_api_key_commands() {
    let store = Arc::new(TestApiKeyCommandStore::default());
    let router =
        sdkwork_clawrouter_router_service::api::admin_user_api_key_command_router_with_store(
            store.clone(),
            Arc::new(TestHasher),
            Arc::new(TestSecretGenerator),
        );

    let create_key_response = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/iam/api_keys",
            r#"{"userId":30,"name":"Console Key"}"#,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::CREATED, create_key_response.status());
    let create_key_payload = json_payload(create_key_response).await;
    assert_eq!("sk-test-secret", create_key_payload["data"]["rawKey"]);

    let delete_key_response = router
        .oneshot(signed_request(
            "DELETE",
            "/backend/v3/api/iam/api_keys/100",
            "",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::NO_CONTENT, delete_key_response.status());

    assert_eq!(1, store.commands.lock().unwrap().len());
    assert_eq!(1, store.delete_org_commands.lock().unwrap().len());
}

#[tokio::test]
async fn admin_user_route_normalizes_user_list_query_at_request_boundary() {
    let store = Arc::new(TestAdminUserStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_user_router_with_store(
        store.clone(),
        Arc::new(TestHasher),
        Arc::new(TestSecretGenerator),
    );

    let response = router
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/user/list?page_size=20&q=%20owner%20",
            "",
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let queries = store.list_queries.lock().unwrap();
    assert_eq!(1, queries.len());
    assert_eq!(Some("owner".to_owned()), queries[0].q);
    assert_eq!(20, queries[0].page_size);
}

#[tokio::test]
async fn admin_user_route_creates_updates_adjusts_and_deletes() {
    let store = Arc::new(TestAdminUserStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_user_router_with_store(
        store.clone(),
        Arc::new(TestHasher),
        Arc::new(TestSecretGenerator),
    );

    let create_user_response = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/user",
            r#"{"email":"new@example.com","username":"new-user","balance":"$10.00"}"#,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, create_user_response.status());
    let create_user_payload = json_payload(create_user_response).await;
    assert_eq!(
        "new@example.com",
        create_user_payload["data"]["item"]["email"]
    );
    assert_eq!("$10.00", create_user_payload["data"]["item"]["balance"]);

    let update_user_response = router
        .clone()
        .oneshot(signed_request(
            "PUT",
            "/backend/v3/api/user",
            r#"{"id":30,"username":"renamed","group":"vip"}"#,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, update_user_response.status());
    let update_user_payload = json_payload(update_user_response).await;
    assert_eq!("renamed", update_user_payload["data"]["item"]["username"]);
    assert_eq!("vip", update_user_payload["data"]["item"]["group"]);

    let balance_response = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/billing/users/30/balance_adjustments",
            r#"{"amount":5,"type":"recharge"}"#,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, balance_response.status());
    let balance_payload = json_payload(balance_response).await;
    assert_eq!("$30.50", balance_payload["data"]["item"]["balance"]);

    let create_key_response = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/apikey",
            r#"{"userId":30,"name":"Console Key"}"#,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::CREATED, create_key_response.status());
    let create_key_payload = json_payload(create_key_response).await;
    assert_eq!("sk-test-secret", create_key_payload["data"]["rawKey"]);
    assert_eq!("Console Key", create_key_payload["data"]["key"]["name"]);
    assert_eq!(
        "sk-test-secret********cret",
        create_key_payload["data"]["key"]["key"]
    );

    let delete_key_response = router
        .oneshot(signed_request("DELETE", "/backend/v3/api/apikey/100", ""))
        .await
        .unwrap();
    assert_eq!(StatusCode::NO_CONTENT, delete_key_response.status());
    assert_eq!(
        vec![
            "create_user",
            "update_user",
            "adjust_balance",
            "create_api_key",
            "delete_api_key"
        ],
        *store.commands.lock().unwrap()
    );
}

#[tokio::test]
async fn admin_user_route_rejects_missing_trusted_subject() {
    let router = sdkwork_clawrouter_router_service::api::admin_user_router_with_store(
        Arc::new(TestAdminUserStore::default()),
        Arc::new(TestHasher),
        Arc::new(TestSecretGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/user/list")
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40101, payload["code"].as_i64().unwrap());
}

#[tokio::test]
async fn admin_user_route_returns_not_found_when_api_key_user_is_missing() {
    let router = sdkwork_clawrouter_router_service::api::admin_user_router_with_store(
        Arc::new(TestAdminUserStore {
            missing_api_key_user: true,
            ..Default::default()
        }),
        Arc::new(TestHasher),
        Arc::new(TestSecretGenerator),
    );

    let response = router
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/apikey",
            r#"{"userId":404,"name":"Missing User Key"}"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::NOT_FOUND, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40401, payload["code"].as_i64().unwrap());
    assert_eq!("user was not found", payload["detail"]);
}

fn signed_request(method: &str, path: &str, body: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
        .internal_trusted_subject(100001, 0, 30)
        .header("Idempotency-Key", "idem-admin-user-test")
        .header("X-Request-Id", "request-admin-user-test")
        .body(Body::from(body.to_owned()))
        .unwrap()
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

#[derive(Default)]
struct TestAdminUserStore {
    commands: Mutex<Vec<&'static str>>,
    list_queries: Mutex<Vec<ListAdminUsersQuery>>,
    missing_api_key_user: bool,
}

#[derive(Default)]
struct TestApiKeyCommandStore {
    commands: Mutex<Vec<CreateGatewayApiKeyCommand>>,
    delete_commands: Mutex<Vec<DeleteGatewayApiKeyCommand>>,
    delete_org_commands: Mutex<Vec<DeleteGatewayApiKeyForOrganizationCommand>>,
}

impl GatewayApiKeyCommandStore for TestApiKeyCommandStore {
    fn ensure_default_upstream_account_group<'a>(
        &'a self,
        command: EnsureDefaultUpstreamAccountGroupCommand,
    ) -> ApiKeyCommandStoreFuture<'a, UpstreamAccountGroup> {
        Box::pin(async move {
            Ok(UpstreamAccountGroup::new_scoped(
                501,
                command.tenant_id,
                command.organization_id,
                &command.code,
                &command.pricing_plan_code,
                command.cost_multiplier,
                command.sale_multiplier,
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
                    default_account_group_id: command.group_id,
                    name: command.name,
                    key_prefix: command.key_prefix,
                    key_display_masked: command.key_display_masked,
                    key_hash: command.key_hash,
                    raw_key: Some(command.raw_key),
                    policy_id: None,
                    quota_policy_id: None,
                    created_at: command.created_at,
                    expire_at: command.expire_at,
                    status_code: 1,
                    default_for_runtime: false,
                    account_group_bindings: Vec::new(),
                },
                access_policy: None,
                quota_policy: None,
            })
        })
    }

    fn update_gateway_api_key<'a>(
        &'a self,
        _command: UpdateGatewayApiKeyCommand,
    ) -> ApiKeyCommandStoreFuture<'a, Option<UpdatedGatewayApiKey>> {
        Box::pin(async move { Ok(None) })
    }

    fn delete_gateway_api_key<'a>(
        &'a self,
        command: DeleteGatewayApiKeyCommand,
    ) -> ApiKeyCommandStoreFuture<'a, bool> {
        Box::pin(async move {
            self.delete_commands.lock().unwrap().push(command);
            Ok(true)
        })
    }

    fn delete_gateway_api_key_for_organization<'a>(
        &'a self,
        command: DeleteGatewayApiKeyForOrganizationCommand,
    ) -> ApiKeyCommandStoreFuture<'a, bool> {
        Box::pin(async move {
            self.delete_org_commands.lock().unwrap().push(command);
            Ok(true)
        })
    }
}

impl AdminUserStore for TestAdminUserStore {
    fn list_users<'a>(
        &'a self,
        query: ListAdminUsersQuery,
    ) -> AdminUserCommandFuture<'a, AdminUserListPage> {
        Box::pin(async move {
            assert_eq!(100001, query.subject.tenant_id);
            let page_no = query.page_no;
            let page_size = query.page_size;
            self.list_queries.lock().unwrap().push(query);
            Ok(AdminUserListPage {
                items: vec![base_user()],
                total: 1,
                page_no,
                page_size,
            })
        })
    }

    fn list_api_keys<'a>(
        &'a self,
        query: ListAdminUserApiKeysQuery,
    ) -> AdminUserCommandFuture<'a, AdminUserApiKeyListPage> {
        Box::pin(async move {
            assert_eq!(0, query.subject.organization_id);
            let page_no = query.page_no;
            let page_size = query.page_size;
            Ok(AdminUserApiKeyListPage {
                items: vec![AdminUserApiKeyItem {
                    id: 100,
                    user_id: 30,
                    name: "Production".to_owned(),
                    key: "sk-live********".to_owned(),
                    used: "1.250000".to_owned(),
                    status: "active".to_owned(),
                }],
                total: 1,
                page_no,
                page_size,
            })
        })
    }

    fn create_user<'a>(
        &'a self,
        command: CreateAdminUserCommand,
    ) -> AdminUserCommandFuture<'a, AdminUserItem> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("create_user");
            Ok(AdminUserItem {
                id: 31,
                email: command.email,
                display_name: command.username.clone(),
                username: command.username,
                mobile: String::new(),
                role: "user".to_owned(),
                group: "standard".to_owned(),
                balance: "$10.00".to_owned(),
                status: "active".to_owned(),
                last_active: "-".to_owned(),
                last_used: "-".to_owned(),
                created_at: "2026-04-29 09:00:00".to_owned(),
                updated_at: "2026-04-29 09:00:00".to_owned(),
            })
        })
    }

    fn update_user<'a>(
        &'a self,
        command: UpdateAdminUserCommand,
    ) -> AdminUserCommandFuture<'a, Option<AdminUserItem>> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("update_user");
            let mut user = base_user();
            user.username = command.username.unwrap_or(user.username);
            user.group = command.group.unwrap_or(user.group);
            Ok(Some(user))
        })
    }

    fn adjust_balance<'a>(
        &'a self,
        command: AdjustAdminUserBalanceCommand,
    ) -> AdminUserCommandFuture<'a, Option<AdminUserItem>> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("adjust_balance");
            assert_eq!(30, command.user_id);
            let mut user = base_user();
            user.balance = "$30.50".to_owned();
            Ok(Some(user))
        })
    }

    fn create_api_key<'a>(
        &'a self,
        command: CreateAdminUserApiKeyCommand,
    ) -> AdminUserCommandFuture<'a, AdminUserApiKeyItem> {
        Box::pin(async move {
            if self.missing_api_key_user {
                return Err(DomainError::not_found("user was not found"));
            }
            self.commands.lock().unwrap().push("create_api_key");
            assert_eq!("hash:sk-test-secret", command.key_hash);
            Ok(AdminUserApiKeyItem {
                id: 101,
                user_id: command.user_id,
                name: command.name,
                key: command.key_display_masked,
                used: "0.000000".to_owned(),
                status: "active".to_owned(),
            })
        })
    }

    fn delete_api_key<'a>(
        &'a self,
        command: DeleteAdminUserApiKeyCommand,
    ) -> AdminUserCommandFuture<'a, bool> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("delete_api_key");
            assert_eq!(100, command.api_key_id);
            Ok(true)
        })
    }
}

fn base_user() -> AdminUserItem {
    AdminUserItem {
        id: 30,
        email: "owner@example.com".to_owned(),
        username: "owner".to_owned(),
        display_name: "Owner".to_owned(),
        mobile: "+15555550100".to_owned(),
        role: "admin".to_owned(),
        group: "standard".to_owned(),
        balance: "$25.50".to_owned(),
        status: "active".to_owned(),
        last_active: "2026-04-29 09:00:00".to_owned(),
        last_used: "2026-04-29 09:05:00".to_owned(),
        created_at: "2026-04-01 08:00:00".to_owned(),
        updated_at: "2026-04-29 09:00:00".to_owned(),
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
        Ok("sk-test-secret".to_owned())
    }
}
