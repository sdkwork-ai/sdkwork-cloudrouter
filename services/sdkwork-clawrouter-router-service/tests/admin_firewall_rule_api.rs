mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::application::EntityUuidGenerator;
use sdkwork_clawrouter_router_service::domain::DomainResult;
use sdkwork_clawrouter_router_service::ports::{
    AdminFirewallRuleCommandFuture, AdminFirewallRuleItem, AdminFirewallRuleListPage,
    AdminFirewallRuleStore, CreateAdminFirewallRuleCommand, DeleteAdminFirewallRuleCommand,
    ListAdminFirewallRulesQuery,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn admin_firewall_rule_route_creates_lists_and_deletes_rules() {
    let store = Arc::new(TestFirewallRuleStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_firewall_rule_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );
    let expected_reason = format!("{} crawler source", "\u{4e2d}\u{6587}");

    let create_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/system/firewalls/rules")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"type":"IP blacklist","value":"192.168.1.99/24","reason":"\u4e2d\u6587 crawler source"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, create_response.status());
    let create_payload = json_payload(create_response).await;
    assert_eq!(0, create_payload["code"].as_i64().unwrap());
    assert_eq!("IP blacklist", create_payload["data"]["item"]["type"]);
    assert_eq!("192.168.1.0/24", create_payload["data"]["item"]["value"]);
    assert_eq!(
        expected_reason,
        create_payload["data"]["item"]["reason"].as_str().unwrap()
    );
    assert!(create_payload["data"]["item"]["time"]
        .as_str()
        .unwrap()
        .contains('-'));

    let list_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/system/firewalls/rules")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, list_response.status());
    let list_payload = json_payload(list_response).await;
    assert_eq!(1, list_payload["data"]["items"].as_array().unwrap().len());
    assert_eq!("192.168.1.0/24", list_payload["data"]["items"][0]["value"]);

    let delete_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri("/backend/v3/api/system/firewalls/rules/1")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::NO_CONTENT, delete_response.status());
    let delete_body = axum::body::to_bytes(delete_response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert!(delete_body.is_empty());

    let final_list_response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/system/firewalls/rules")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let final_list_payload = json_payload(final_list_response).await;
    assert_eq!(
        0,
        final_list_payload["data"]["items"]
            .as_array()
            .unwrap()
            .len()
    );
    assert_eq!(vec!["create", "delete"], *store.commands.lock().unwrap());
}

#[tokio::test]
async fn admin_firewall_rule_route_rejects_invalid_value_without_calling_store() {
    let store = Arc::new(TestFirewallRuleStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_firewall_rule_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/system/firewalls/rules")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"type":"IP blacklist","value":"not-an-address","reason":"bad source"}"#,
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
        .contains("firewall value must be an IP address, CIDR block, email address, or domain"));
    assert!(store.commands.lock().unwrap().is_empty());
}

#[tokio::test]
async fn admin_firewall_rule_route_rejects_missing_trusted_subject() {
    let router = sdkwork_clawrouter_router_service::api::admin_firewall_rule_router_with_store(
        Arc::new(TestFirewallRuleStore::default()),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/system/firewalls/rules")
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
struct TestFirewallRuleStore {
    items: Mutex<Vec<AdminFirewallRuleItem>>,
    commands: Mutex<Vec<&'static str>>,
}

impl AdminFirewallRuleStore for TestFirewallRuleStore {
    fn list_firewall_rules<'a>(
        &'a self,
        query: ListAdminFirewallRulesQuery,
    ) -> AdminFirewallRuleCommandFuture<'a, AdminFirewallRuleListPage> {
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
                            item.firewall_type.to_ascii_lowercase().contains(q)
                                || item.value.to_ascii_lowercase().contains(q)
                                || item.reason.to_ascii_lowercase().contains(q)
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
            Ok(AdminFirewallRuleListPage {
                items,
                total,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn create_firewall_rule<'a>(
        &'a self,
        command: CreateAdminFirewallRuleCommand,
    ) -> AdminFirewallRuleCommandFuture<'a, AdminFirewallRuleItem> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("create");
            let item = AdminFirewallRuleItem {
                id: 1,
                uuid: command.rule_uuid,
                tenant_id: command.subject.tenant_id,
                organization_id: command.subject.organization_id,
                firewall_type: command.firewall_type,
                value: command.value,
                reason: command.reason,
                time: command.requested_at,
                deleted_at: None,
            };
            self.items.lock().unwrap().push(item.clone());
            Ok(item)
        })
    }

    fn delete_firewall_rule<'a>(
        &'a self,
        command: DeleteAdminFirewallRuleCommand,
    ) -> AdminFirewallRuleCommandFuture<'a, bool> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("delete");
            let mut items = self.items.lock().unwrap();
            if let Some(item) = items.iter_mut().find(|item| {
                item.id == command.rule_id
                    && item.tenant_id == command.subject.tenant_id
                    && item.organization_id == command.subject.organization_id
                    && item.deleted_at.is_none()
            }) {
                item.deleted_at = Some(command.requested_at);
                Ok(true)
            } else {
                Ok(false)
            }
        })
    }
}

struct TestUuidGenerator;

impl EntityUuidGenerator for TestUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        Ok("test-uuid".to_owned())
    }
}
