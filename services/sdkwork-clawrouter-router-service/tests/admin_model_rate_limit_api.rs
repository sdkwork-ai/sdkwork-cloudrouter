pub mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::application::EntityUuidGenerator;
use sdkwork_clawrouter_router_service::domain::DomainResult;
use sdkwork_clawrouter_router_service::ports::{
    AdminModelRateLimitCommandFuture, AdminModelRateLimitItem, AdminModelRateLimitListPage,
    AdminModelRateLimitStore, CreateAdminModelRateLimitCommand, ListAdminModelRateLimitsQuery,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn admin_model_rate_limit_route_creates_and_lists_model_limits() {
    let store = Arc::new(TestModelRateLimitStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_model_rate_limit_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let create_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/system/rate_limits/models")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"model":"openai/gpt-4o-mini","accountGroup":"standard-group","rpm":600,"tpm":120000}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, create_response.status());
    let create_payload = json_payload(create_response).await;
    assert_eq!(0, create_payload["code"].as_i64().unwrap());
    assert_eq!(
        "openai/gpt-4o-mini",
        create_payload["data"]["item"]["model"]
    );
    assert_eq!(
        "standard-group",
        create_payload["data"]["item"]["accountGroup"]
    );
    assert_eq!("10", create_payload["data"]["item"]["accountGroupId"]);
    assert_eq!(
        "Standard group",
        create_payload["data"]["item"]["accountGroupName"]
    );
    assert_eq!(600, create_payload["data"]["item"]["rpm"]);
    assert_eq!(120000, create_payload["data"]["item"]["tpm"]);
    assert_eq!("active", create_payload["data"]["item"]["status"]);

    let list_response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/system/rate_limits/models")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, list_response.status());
    let list_payload = json_payload(list_response).await;
    assert_eq!(1, list_payload["data"]["items"].as_array().unwrap().len());
    assert_eq!(
        "openai/gpt-4o-mini",
        list_payload["data"]["items"][0]["model"]
    );
    assert_eq!(vec!["create"], *store.commands.lock().unwrap());
}

#[tokio::test]
async fn admin_model_rate_limit_route_rejects_invalid_model_without_calling_store() {
    let store = Arc::new(TestModelRateLimitStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_model_rate_limit_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/system/rate_limits/models")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"model":"gpt 4o","accountGroup":"standard-group","rpm":600,"tpm":120000}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"].as_str().unwrap().contains("model"));
    assert!(store.commands.lock().unwrap().is_empty());
}

#[tokio::test]
async fn admin_model_rate_limit_route_rejects_invalid_limit_without_calling_store() {
    let store = Arc::new(TestModelRateLimitStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_model_rate_limit_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/system/rate_limits/models")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","accountGroup":"standard-group","rpm":0,"tpm":120000}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"].as_str().unwrap().contains("rpm"));
    assert!(store.commands.lock().unwrap().is_empty());
}

#[tokio::test]
async fn admin_model_rate_limit_route_rejects_missing_trusted_subject() {
    let router = sdkwork_clawrouter_router_service::api::admin_model_rate_limit_router_with_store(
        Arc::new(TestModelRateLimitStore::default()),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/system/rate_limits/models")
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
struct TestModelRateLimitStore {
    items: Mutex<Vec<AdminModelRateLimitItem>>,
    commands: Mutex<Vec<&'static str>>,
}

impl AdminModelRateLimitStore for TestModelRateLimitStore {
    fn list_model_rate_limits<'a>(
        &'a self,
        query: ListAdminModelRateLimitsQuery,
    ) -> AdminModelRateLimitCommandFuture<'a, AdminModelRateLimitListPage> {
        Box::pin(async move {
            let q = query.q.as_deref().map(str::to_ascii_lowercase);
            let items = self
                .items
                .lock()
                .unwrap()
                .iter()
                .filter(|item| {
                    item.tenant_id == query.subject.tenant_id
                        && item.organization_id == query.subject.organization_id
                        && item.deleted_at.is_none()
                        && q.as_ref().is_none_or(|q| {
                            item.model.to_ascii_lowercase().contains(q)
                                || item.account_group.to_ascii_lowercase().contains(q)
                        })
                })
                .cloned()
                .collect::<Vec<_>>();
            let total = items.len() as i64;
            let items = items
                .into_iter()
                .skip(query.offset.max(0) as usize)
                .take(query.page_size.max(0) as usize)
                .collect();
            Ok(AdminModelRateLimitListPage {
                items,
                total,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn create_model_rate_limit<'a>(
        &'a self,
        command: CreateAdminModelRateLimitCommand,
    ) -> AdminModelRateLimitCommandFuture<'a, AdminModelRateLimitItem> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("create");
            let item = AdminModelRateLimitItem {
                id: 1,
                uuid: command.policy_uuid,
                tenant_id: command.subject.tenant_id,
                organization_id: command.subject.organization_id,
                model: command.model,
                account_group: command.account_group,
                account_group_id: 10,
                account_group_name: "Standard group".to_owned(),
                rpm: command.rpm,
                tpm: command.tpm,
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
