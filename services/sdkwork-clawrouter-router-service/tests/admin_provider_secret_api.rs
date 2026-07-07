mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::application::{
    default_desktop_cache_manager, AiRoutingCacheInvalidatingAdminProviderSecretStore,
    EntityUuidGenerator, ROUTING_CONFIG_VERSION_CACHE_NAMESPACE,
    ROUTING_DISABLED_CHANNEL_CACHE_NAMESPACE, ROUTING_PROVIDER_OBJECT_ROUTE_CACHE_NAMESPACE,
    ROUTING_SNAPSHOT_CACHE_NAMESPACE,
};
use sdkwork_clawrouter_router_service::domain::DomainResult;
use sdkwork_clawrouter_router_service::ports::{
    AdminProviderSecretCommandFuture, AdminProviderSecretItem, AdminProviderSecretStore,
    CreateAdminProviderSecretCommand, DeleteAdminProviderSecretCommand,
    ListAdminProviderSecretsQuery, UpdateAdminProviderSecretCommand,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn admin_provider_secret_route_creates_lists_updates_and_soft_deletes_metadata() {
    let store = Arc::new(TestProviderSecretStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_provider_secret_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let create_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/provider_secrets")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"providerCode":"OpenAI","name":"OpenAI production","secretRef":"vault://providers/openai/account/main","authType":"api-key"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, create_response.status());
    let create_payload = json_payload(create_response).await;
    assert_eq!(0, create_payload["code"].as_i64().unwrap());
    assert_eq!("OpenAI production", create_payload["data"]["item"]["name"]);
    assert_eq!("openai", create_payload["data"]["item"]["providerCode"]);
    assert_eq!(
        "vault://providers/openai/account/main",
        create_payload["data"]["item"]["secretRef"]
    );
    assert_eq!("ref:***main", create_payload["data"]["item"]["maskedLabel"]);
    assert_eq!("active", create_payload["data"]["item"]["status"]);
    assert!(create_payload["data"]["item"].get("secretValue").is_none());
    assert!(create_payload["data"]["item"].get("apiKey").is_none());

    let update_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/backend/v3/api/provider_secrets")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"id":"1","name":"OpenAI rotated","secretRef":"vault://providers/openai/account/rotated","status":"disabled"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, update_response.status());
    let update_payload = json_payload(update_response).await;
    assert_eq!("OpenAI rotated", update_payload["data"]["item"]["name"]);
    assert_eq!(
        "vault://providers/openai/account/rotated",
        update_payload["data"]["item"]["secretRef"]
    );
    assert_eq!(
        "ref:***rotated",
        update_payload["data"]["item"]["maskedLabel"]
    );
    assert_eq!("disabled", update_payload["data"]["item"]["status"]);

    let list_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/provider_secrets/list")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(r#"{"providerCode":"openai"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, list_response.status());
    let list_payload = json_payload(list_response).await;
    assert_eq!(1, list_payload["data"]["items"].as_array().unwrap().len());
    assert_eq!("disabled", list_payload["data"]["items"][0]["status"]);

    let delete_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri("/backend/v3/api/provider_secrets/1")
                .internal_trusted_subject(100001, 0, 30)
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
                .method("POST")
                .uri("/backend/v3/api/provider_secrets/list")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from("{}"))
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
async fn admin_provider_secret_route_invalidates_routing_cache_after_successful_mutation() {
    let store = Arc::new(TestProviderSecretStore::default());
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
            "tenant:10:org:20:channel:1",
            serde_json::json!({ "disabled": true }),
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
    let router = sdkwork_clawrouter_router_service::api::admin_provider_secret_router_with_store(
        Arc::new(AiRoutingCacheInvalidatingAdminProviderSecretStore::new(
            store,
            manager.clone(),
        )),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/provider_secrets")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"providerCode":"OpenAI","name":"OpenAI production","secretRef":"vault://providers/openai/account/main","authType":"api-key"}"#,
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
            "tenant:10:org:20:channel:1"
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
async fn admin_provider_secret_route_rejects_missing_trusted_subject() {
    let router = sdkwork_clawrouter_router_service::api::admin_provider_secret_router_with_store(
        Arc::new(TestProviderSecretStore::default()),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/provider_secrets/list")
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
async fn admin_provider_secret_route_rejects_plaintext_secret_without_calling_store() {
    let store = Arc::new(TestProviderSecretStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_provider_secret_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/provider_secrets")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"providerCode":"openai","name":"OpenAI production","secretRef":"vault://providers/openai/account/main","secretValue":"sk-live-secret"}"#,
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
        .contains("plaintext provider secret values are not accepted"));
    assert!(store.commands.lock().unwrap().is_empty());
}

#[tokio::test]
async fn admin_provider_secret_route_rejects_invalid_secret_ref_without_calling_store() {
    let store = Arc::new(TestProviderSecretStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_provider_secret_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/provider_secrets")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"providerCode":"openai","name":"OpenAI production","secretRef":"plain-secret-path"}"#,
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
        .contains("secretRef must start with vault:// or secret://"));
    assert!(store.commands.lock().unwrap().is_empty());
}

#[tokio::test]
async fn admin_provider_secret_route_rejects_plaintext_alias_and_empty_locator_without_store_call()
{
    let store = Arc::new(TestProviderSecretStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_provider_secret_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let plaintext_alias_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/provider_secrets")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"providerCode":"openai","name":"OpenAI production","secretRef":"vault://providers/openai/account/main","api_key":"sk-live-secret"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, plaintext_alias_response.status());
    let plaintext_alias_payload = json_payload(plaintext_alias_response).await;
    assert_eq!(40001, plaintext_alias_payload["code"].as_i64().unwrap());
    assert!(plaintext_alias_payload["detail"]
        .as_str()
        .unwrap()
        .contains("plaintext provider secret values are not accepted"));

    let empty_locator_response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/provider_secrets")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"providerCode":"openai","name":"OpenAI production","secretRef":"vault://"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, empty_locator_response.status());
    let empty_locator_payload = json_payload(empty_locator_response).await;
    assert_eq!(40001, empty_locator_payload["code"].as_i64().unwrap());
    assert!(empty_locator_payload["detail"]
        .as_str()
        .unwrap()
        .contains("secretRef must include a non-empty locator"));
    assert!(store.commands.lock().unwrap().is_empty());
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

#[derive(Default)]
struct TestProviderSecretStore {
    items: Mutex<Vec<AdminProviderSecretItem>>,
    commands: Mutex<Vec<&'static str>>,
}

impl AdminProviderSecretStore for TestProviderSecretStore {
    fn list_provider_secrets<'a>(
        &'a self,
        query: ListAdminProviderSecretsQuery,
    ) -> AdminProviderSecretCommandFuture<'a, Vec<AdminProviderSecretItem>> {
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
                .filter(|item| {
                    query
                        .provider_code
                        .as_ref()
                        .map(|provider_code| item.provider_code == *provider_code)
                        .unwrap_or(true)
                })
                .cloned()
                .collect())
        })
    }

    fn create_provider_secret<'a>(
        &'a self,
        command: CreateAdminProviderSecretCommand,
    ) -> AdminProviderSecretCommandFuture<'a, AdminProviderSecretItem> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("create");
            let item = AdminProviderSecretItem {
                id: 1,
                uuid: command.account_uuid,
                tenant_id: command.subject.tenant_id,
                organization_id: command.subject.organization_id,
                provider_code: command.provider_code,
                account_code: command.account_code,
                name: command.name,
                auth_type: command.auth_type,
                secret_ref: command.secret_ref,
                masked_label: command.masked_label,
                status: command.status,
                created_at: command.requested_at.clone(),
                updated_at: command.requested_at,
                deleted_at: None,
            };
            self.items.lock().unwrap().push(item.clone());
            Ok(item)
        })
    }

    fn update_provider_secret<'a>(
        &'a self,
        command: UpdateAdminProviderSecretCommand,
    ) -> AdminProviderSecretCommandFuture<'a, Option<AdminProviderSecretItem>> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("update");
            let mut items = self.items.lock().unwrap();
            let Some(item) = items.iter_mut().find(|item| {
                item.id == command.secret_id
                    && item.tenant_id == command.subject.tenant_id
                    && item.organization_id == command.subject.organization_id
                    && item.deleted_at.is_none()
            }) else {
                return Ok(None);
            };
            if let Some(provider_code) = command.provider_code {
                item.provider_code = provider_code;
            }
            if let Some(name) = command.name {
                item.name = name;
            }
            if let Some(auth_type) = command.auth_type {
                item.auth_type = auth_type;
            }
            if let Some(secret_ref) = command.secret_ref {
                item.secret_ref = secret_ref;
            }
            if let Some(masked_label) = command.masked_label {
                item.masked_label = masked_label;
            }
            if let Some(status) = command.status {
                item.status = status;
            }
            item.updated_at = command.requested_at;
            Ok(Some(item.clone()))
        })
    }

    fn delete_provider_secret<'a>(
        &'a self,
        command: DeleteAdminProviderSecretCommand,
    ) -> AdminProviderSecretCommandFuture<'a, bool> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("delete");
            let mut items = self.items.lock().unwrap();
            let Some(item) = items.iter_mut().find(|item| {
                item.id == command.secret_id
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
}

struct TestUuidGenerator;

impl EntityUuidGenerator for TestUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        Ok("test-uuid".to_owned())
    }
}
