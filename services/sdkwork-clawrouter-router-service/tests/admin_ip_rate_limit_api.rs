mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::application::EntityUuidGenerator;
use sdkwork_clawrouter_router_service::domain::DomainResult;
use sdkwork_clawrouter_router_service::ports::{
    AdminIpRateLimitCommandFuture, AdminIpRateLimitItem, AdminIpRateLimitListPage,
    AdminIpRateLimitStore, CreateAdminIpRateLimitCommand, ListAdminIpRateLimitsQuery,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn admin_ip_rate_limit_route_creates_and_lists_ip_rules() {
    let store = Arc::new(TestIpRateLimitStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_ip_rate_limit_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );
    let expected_name = format!("{} crawler guard", "\u{4e2d}\u{6587}");

    let create_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/router/rate_limits/ip")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"ruleName":"\u4e2d\u6587 crawler guard","targetIp":"192.168.1.99/24","rps":10,"rpm":300,"blockDuration":"10m"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, create_response.status());
    let create_payload = json_payload(create_response).await;
    assert_eq!(0, create_payload["code"].as_i64().unwrap());
    assert_eq!(
        expected_name,
        create_payload["data"]["item"]["ruleName"].as_str().unwrap()
    );
    assert_eq!("192.168.1.0/24", create_payload["data"]["item"]["targetIp"]);
    assert_eq!(10, create_payload["data"]["item"]["rps"]);
    assert_eq!(300, create_payload["data"]["item"]["rpm"]);
    assert_eq!("10m", create_payload["data"]["item"]["blockDuration"]);
    assert_eq!("active", create_payload["data"]["item"]["status"]);

    let list_response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/router/rate_limits/ip")
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
        "192.168.1.0/24",
        list_payload["data"]["items"][0]["targetIp"]
    );
    assert_eq!(vec!["create"], *store.commands.lock().unwrap());
}

#[tokio::test]
async fn admin_ip_rate_limit_route_rejects_invalid_ip_without_calling_store() {
    let store = Arc::new(TestIpRateLimitStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_ip_rate_limit_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/router/rate_limits/ip")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"ruleName":"Invalid","targetIp":"not-an-ip","rps":10,"rpm":300}"#,
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
        .contains("targetIp must be an IP address or CIDR block"));
    assert!(store.commands.lock().unwrap().is_empty());
}

#[tokio::test]
async fn admin_ip_rate_limit_route_rejects_missing_trusted_subject() {
    let router = sdkwork_clawrouter_router_service::api::admin_ip_rate_limit_router_with_store(
        Arc::new(TestIpRateLimitStore::default()),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/router/rate_limits/ip")
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
struct TestIpRateLimitStore {
    items: Mutex<Vec<AdminIpRateLimitItem>>,
    commands: Mutex<Vec<&'static str>>,
}

impl AdminIpRateLimitStore for TestIpRateLimitStore {
    fn list_ip_rate_limits<'a>(
        &'a self,
        query: ListAdminIpRateLimitsQuery,
    ) -> AdminIpRateLimitCommandFuture<'a, AdminIpRateLimitListPage> {
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
                        && q.as_ref().map_or(true, |q| {
                            item.rule_name.to_ascii_lowercase().contains(q)
                                || item.target_ip.to_ascii_lowercase().contains(q)
                        })
                })
                .cloned()
                .collect::<Vec<_>>();
            let total = i64::try_from(items.len()).unwrap_or(i64::MAX);
            let items = items
                .into_iter()
                .skip(query.offset.max(0) as usize)
                .take(query.page_size.max(0) as usize)
                .collect();
            Ok(AdminIpRateLimitListPage {
                items,
                total,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn create_ip_rate_limit<'a>(
        &'a self,
        command: CreateAdminIpRateLimitCommand,
    ) -> AdminIpRateLimitCommandFuture<'a, AdminIpRateLimitItem> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("create");
            let item = AdminIpRateLimitItem {
                id: 1,
                uuid: command.rule_uuid,
                tenant_id: command.subject.tenant_id,
                organization_id: command.subject.organization_id,
                rule_name: command.rule_name,
                target_ip: command.target_ip,
                rps: command.rps,
                rpm: command.rpm,
                block_duration_seconds: command.block_duration_seconds,
                status: command.status,
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
