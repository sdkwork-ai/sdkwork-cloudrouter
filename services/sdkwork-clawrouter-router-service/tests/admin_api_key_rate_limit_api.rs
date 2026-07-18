mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::application::EntityUuidGenerator;
use sdkwork_clawrouter_router_service::domain::DomainResult;
use sdkwork_clawrouter_router_service::ports::{
    AdminApiKeyRateLimitCommandFuture, AdminApiKeyRateLimitItem, AdminApiKeyRateLimitListPage,
    AdminApiKeyRateLimitStore, CreateAdminApiKeyRateLimitCommand, ListAdminApiKeyRateLimitsQuery,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn admin_api_key_rate_limit_route_creates_and_lists_token_limits() {
    let store = Arc::new(TestApiKeyRateLimitStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_api_key_rate_limit_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let create_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/router/rate_limits/api_keys")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"keyPrefix":"sk-test","user":"30","rps":7,"rpd":1200,"burst":14}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, create_response.status());
    let create_payload = json_payload(create_response).await;
    assert_eq!(0, create_payload["code"].as_i64().unwrap());
    assert_eq!("sk-test", create_payload["data"]["item"]["keyPrefix"]);
    assert_eq!("30", create_payload["data"]["item"]["user"]);
    assert_eq!(7, create_payload["data"]["item"]["rps"]);
    assert_eq!(1200, create_payload["data"]["item"]["rpd"]);
    assert_eq!(14, create_payload["data"]["item"]["burst"]);
    assert_eq!("active", create_payload["data"]["item"]["status"]);

    let list_response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/router/rate_limits/api_keys")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, list_response.status());
    let list_payload = json_payload(list_response).await;
    assert_eq!(1, list_payload["data"]["items"].as_array().unwrap().len());
    assert_eq!("sk-test", list_payload["data"]["items"][0]["keyPrefix"]);
    assert_eq!(vec!["create"], *store.commands.lock().unwrap());
}

#[tokio::test]
async fn admin_api_key_rate_limit_route_rejects_placeholder_prefix_without_calling_store() {
    let store = Arc::new(TestApiKeyRateLimitStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_api_key_rate_limit_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/router/rate_limits/api_keys")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"keyPrefix":"sk-proj-...","user":"30","rps":7,"rpd":1200,"burst":14}"#,
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
        .contains("keyPrefix must identify an existing API key prefix"));
    assert!(store.commands.lock().unwrap().is_empty());
}

#[tokio::test]
async fn admin_api_key_rate_limit_route_rejects_missing_trusted_subject() {
    let router = sdkwork_clawrouter_router_service::api::admin_api_key_rate_limit_router_with_store(
        Arc::new(TestApiKeyRateLimitStore::default()),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/router/rate_limits/api_keys")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40101, payload["code"].as_i64().unwrap());
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

#[derive(Default)]
struct TestApiKeyRateLimitStore {
    items: Mutex<Vec<AdminApiKeyRateLimitItem>>,
    commands: Mutex<Vec<&'static str>>,
}

impl AdminApiKeyRateLimitStore for TestApiKeyRateLimitStore {
    fn list_api_key_rate_limits<'a>(
        &'a self,
        query: ListAdminApiKeyRateLimitsQuery,
    ) -> AdminApiKeyRateLimitCommandFuture<'a, AdminApiKeyRateLimitListPage> {
        Box::pin(async move {
            let items =
                self.items
                    .lock()
                    .unwrap()
                    .iter()
                    .filter(|item| {
                        item.tenant_id == query.subject.tenant_id
                            && item.organization_id == query.subject.organization_id
                            && item.deleted_at.is_none()
                            && query.q.as_ref().is_none_or(|q| {
                                item.key_prefix.contains(q) || item.user.contains(q)
                            })
                    })
                    .cloned()
                    .collect::<Vec<_>>();
            let total = i64::try_from(items.len()).unwrap_or(i64::MAX);
            let items = items
                .into_iter()
                .skip(usize::try_from(query.offset).unwrap_or(usize::MAX))
                .take(usize::try_from(query.page_size).unwrap_or_default())
                .collect();
            Ok(AdminApiKeyRateLimitListPage {
                items,
                total,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn create_api_key_rate_limit<'a>(
        &'a self,
        command: CreateAdminApiKeyRateLimitCommand,
    ) -> AdminApiKeyRateLimitCommandFuture<'a, AdminApiKeyRateLimitItem> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("create");
            let item = AdminApiKeyRateLimitItem {
                id: 1,
                uuid: command.policy_uuid,
                tenant_id: command.subject.tenant_id,
                organization_id: command.subject.organization_id,
                key_prefix: command.key_prefix,
                user: command.user,
                rps: command.rps,
                rpd: command.rpd,
                burst: command.burst,
                status: "active".to_owned(),
                deleted_at: None,
            };
            self.items.lock().unwrap().push(item.clone());
            Ok(item)
        })
    }
}

struct TestUuidGenerator;

impl EntityUuidGenerator for TestUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        Ok("test-uuid".to_owned())
    }
}
