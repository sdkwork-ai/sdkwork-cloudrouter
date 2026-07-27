mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::ports::{
    AdminServiceNodeCommandFuture, AdminServiceNodeDeleteOutcome, AdminServiceNodeItem,
    AdminServiceNodeListPage, AdminServiceNodeStore, AdminServiceNodeSubject,
    CreateAdminServiceNodeCommand, DeleteAdminServiceNodeCommand, ListAdminServiceNodesQuery,
    UpdateAdminServiceNodeCommand, UpdateAdminServiceNodeStatusCommand,
};
use serde_json::{json, Value};
use tower::ServiceExt;

#[tokio::test]
async fn admin_service_node_routes_support_full_crud() {
    let router = sdkwork_clawrouter_router_service::api::admin_service_node_router_with_store(
        Arc::new(TestAdminServiceNodeStore),
    );

    let list_response = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/system/service_nodes?q=shanghai&status=enabled",
            None,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, list_response.status());
    let list_payload = json_payload(list_response).await;
    assert_eq!(0, list_payload["code"].as_i64().unwrap());
    assert_eq!("node-1", list_payload["data"]["items"][0]["id"]);
    assert_eq!(
        "edge-shanghai.example.com",
        list_payload["data"]["items"][0]["domain"]
    );
    assert_eq!("enabled", list_payload["data"]["items"][0]["status"]);
    assert_eq!(
        "https://edge-shanghai.example.com/v1",
        list_payload["data"]["items"][0]["baseUrl"]
    );

    let create_response = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/system/service_nodes",
            Some(json!({
                "name": "edge-beijing-01",
                "deploymentProfile": "cloud",
                "baseUrl": "https://api.example.com/v1/",
                "domains": ["api.example.com", "api-alt.example.com", "API.EXAMPLE.COM"],
                "ip": "10.0.1.10",
                "remark": "Beijing relay node",
                "status": "enabled"
            })),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::CREATED, create_response.status());
    let create_payload = json_payload(create_response).await;
    assert_eq!("node-created", create_payload["data"]["item"]["id"]);
    assert_eq!("cloud", create_payload["data"]["item"]["deploymentProfile"]);
    assert_eq!(
        json!(["api.example.com", "api-alt.example.com"]),
        create_payload["data"]["item"]["domains"]
    );

    let localized_create_response = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/system/service_nodes",
            Some(json!({
                "name": " Beijing-Relay-01 ",
                "domain": "HTTPS://EDGE-BEIJING.EXAMPLE.COM/admin",
                "ip": "2001:db8::1",
                "remark": " North-China primary node ",
                "status": "enabled"
            })),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::CREATED, localized_create_response.status());
    let localized_create_payload = json_payload(localized_create_response).await;
    assert_eq!(
        "Beijing-Relay-01",
        localized_create_payload["data"]["item"]["name"]
    );
    assert_eq!(
        "edge-beijing.example.com",
        localized_create_payload["data"]["item"]["domain"]
    );

    let update_response = router
        .clone()
        .oneshot(signed_request(
            "PUT",
            "/backend/v3/api/system/service_nodes/node-1",
            Some(json!({
                "name": "edge-shanghai-01",
                "deploymentProfile": "cloud",
                "baseUrl": "https://api.example.com/openai/v1",
                "domains": ["api.example.com", "api-backup.example.com"],
                "ip": "",
                "remark": "Primary Shanghai relay"
            })),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, update_response.status());
    let update_payload = json_payload(update_response).await;
    assert_eq!(
        "Primary Shanghai relay",
        update_payload["data"]["item"]["remark"]
    );

    let clear_remark_response = router
        .clone()
        .oneshot(signed_request(
            "PUT",
            "/backend/v3/api/system/service_nodes/node-clear-remark",
            Some(json!({ "remark": "" })),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, clear_remark_response.status());
    let clear_remark_payload = json_payload(clear_remark_response).await;
    assert_eq!("", clear_remark_payload["data"]["item"]["remark"]);

    let status_response = router
        .clone()
        .oneshot(signed_request(
            "PUT",
            "/backend/v3/api/system/service_nodes/node-1/status",
            Some(json!({ "status": "disabled" })),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, status_response.status());
    let status_payload = json_payload(status_response).await;
    assert_eq!("disabled", status_payload["data"]["item"]["status"]);

    let delete_response = router
        .oneshot(signed_request(
            "DELETE",
            "/backend/v3/api/system/service_nodes/node-1",
            None,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::NO_CONTENT, delete_response.status());
}

#[tokio::test]
async fn admin_service_node_routes_reject_missing_trusted_subject() {
    let router = sdkwork_clawrouter_router_service::api::admin_service_node_router_with_store(
        Arc::new(TestAdminServiceNodeStore),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/system/service_nodes")
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
async fn admin_service_node_routes_reject_invalid_management_inputs() {
    let router = sdkwork_clawrouter_router_service::api::admin_service_node_router_with_store(
        Arc::new(TestAdminServiceNodeStore),
    );

    let bad_domain = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/system/service_nodes",
            Some(json!({
                "name": "edge-invalid",
                "domain": "bad domain.example.com",
                "ip": "10.0.0.10"
            })),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, bad_domain.status());
    assert_eq!(
        40001,
        json_payload(bad_domain).await["code"].as_i64().unwrap()
    );

    let bad_ip = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/system/service_nodes",
            Some(json!({
                "name": "edge-invalid",
                "domain": "edge-invalid.example.com",
                "ip": "999.0.0.1"
            })),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, bad_ip.status());
    assert_eq!(
        "ip must be a valid IPv4 or IPv6 address",
        json_payload(bad_ip).await["detail"]
    );

    let bad_search = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/system/service_nodes?q=bad%0Aterm&status=enabled",
            None,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, bad_search.status());
    assert_eq!(
        "q must be visible text and at most 256 characters",
        json_payload(bad_search).await["detail"]
    );

    let bad_name = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/system/service_nodes",
            Some(json!({
                "name": "edge\ninvalid",
                "domain": "edge-invalid.example.com",
                "ip": "10.0.0.10"
            })),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, bad_name.status());
    assert_eq!(
        "name must be visible text and at most 128 characters",
        json_payload(bad_name).await["detail"]
    );

    let empty_update = router
        .clone()
        .oneshot(signed_request(
            "PUT",
            "/backend/v3/api/system/service_nodes/node-1",
            Some(json!({})),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, empty_update.status());
    assert_eq!(
        "service node update fields are required",
        json_payload(empty_update).await["detail"]
    );

    let status_on_update = router
        .oneshot(signed_request(
            "PUT",
            "/backend/v3/api/system/service_nodes/node-1",
            Some(json!({ "status": "disabled" })),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, status_on_update.status());
    assert_eq!(
        "status must be changed through status endpoint",
        json_payload(status_on_update).await["detail"]
    );
}

#[test]
fn admin_service_node_list_query_exposes_only_standard_q_search_param() {
    let source = include_str!("../src/api/admin_service_node.rs");

    assert!(source.contains("struct AdminServiceNodeListQuery"));
    assert!(source.contains("q: Option<String>"));
    assert!(!source.contains("search: Option<String>"));
    assert!(!source.contains("query.q.or(query.search)"));
}

fn signed_request(method: &str, path: &str, body: Option<Value>) -> Request<Body> {
    let mut builder = Request::builder()
        .method(method)
        .uri(path)
        .internal_trusted_subject(100001, 0, 30);
    let body = match body {
        Some(value) => {
            builder = builder.header("content-type", "application/json");
            Body::from(value.to_string())
        }
        None => Body::empty(),
    };
    builder.body(body).unwrap()
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

struct TestAdminServiceNodeStore;

impl AdminServiceNodeStore for TestAdminServiceNodeStore {
    fn list_service_nodes<'a>(
        &'a self,
        query: ListAdminServiceNodesQuery,
    ) -> AdminServiceNodeCommandFuture<'a, AdminServiceNodeListPage> {
        Box::pin(async move {
            assert_eq!(100_001, query.subject.tenant_id);
            assert_eq!(0, query.subject.organization_id);
            assert_eq!(Some("shanghai".to_owned()), query.search);
            assert_eq!(Some("enabled".to_owned()), query.status);
            Ok(AdminServiceNodeListPage {
                items: vec![service_node_item(
                    "node-1",
                    "edge-shanghai-01",
                    "edge-shanghai.example.com",
                    "10.0.0.10",
                    "Shanghai relay node",
                    "enabled",
                    "online",
                )],
                total: 1,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn create_service_node<'a>(
        &'a self,
        command: CreateAdminServiceNodeCommand,
    ) -> AdminServiceNodeCommandFuture<'a, AdminServiceNodeItem> {
        Box::pin(async move {
            assert_eq!(subject(), command.subject);
            if command.name == "Beijing-Relay-01" {
                assert_eq!("standalone", command.deployment_profile);
                assert_eq!("https://edge-beijing.example.com/v1", command.base_url);
                assert_eq!(vec!["edge-beijing.example.com"], command.domains);
                assert_eq!(Some("2001:db8::1".to_owned()), command.ip);
                assert_eq!("North-China primary node", command.remark);
                assert_eq!(Some("enabled".to_owned()), command.status);
                return Ok(service_node_item(
                    "node-created-cn",
                    "Beijing-Relay-01",
                    "edge-beijing.example.com",
                    "2001:db8::1",
                    "North-China primary node",
                    "enabled",
                    "unknown",
                ));
            }
            assert_eq!("edge-beijing-01", command.name);
            assert_eq!("cloud", command.deployment_profile);
            assert_eq!("https://api.example.com/v1", command.base_url);
            assert_eq!(
                vec!["api.example.com", "api-alt.example.com"],
                command.domains
            );
            assert_eq!(Some("10.0.1.10".to_owned()), command.ip);
            assert_eq!("Beijing relay node", command.remark);
            assert_eq!(Some("enabled".to_owned()), command.status);
            let mut item = service_node_item(
                "node-created",
                "edge-beijing-01",
                "api.example.com",
                "10.0.1.10",
                "Beijing relay node",
                "enabled",
                "unknown",
            );
            item.deployment_profile = "cloud".to_owned();
            item.base_url = "https://api.example.com/v1".to_owned();
            item.domains = vec![
                "api.example.com".to_owned(),
                "api-alt.example.com".to_owned(),
            ];
            Ok(item)
        })
    }

    fn update_service_node<'a>(
        &'a self,
        command: UpdateAdminServiceNodeCommand,
    ) -> AdminServiceNodeCommandFuture<'a, AdminServiceNodeItem> {
        Box::pin(async move {
            assert_eq!(subject(), command.subject);
            let remark = if command.node_id == "node-clear-remark" {
                assert_eq!(Some("".to_owned()), command.remark);
                ""
            } else {
                assert_eq!("node-1", command.node_id);
                assert_eq!(Some("cloud".to_owned()), command.deployment_profile);
                assert_eq!(
                    Some("https://api.example.com/openai/v1".to_owned()),
                    command.base_url
                );
                assert_eq!(
                    Some(vec![
                        "api.example.com".to_owned(),
                        "api-backup.example.com".to_owned(),
                    ]),
                    command.domains
                );
                assert_eq!(Some("".to_owned()), command.ip);
                assert_eq!(Some("Primary Shanghai relay".to_owned()), command.remark);
                "Primary Shanghai relay"
            };
            Ok(service_node_item(
                command.node_id.as_str(),
                "edge-shanghai-01",
                "edge-shanghai.example.com",
                "10.0.0.10",
                remark,
                "enabled",
                "online",
            ))
        })
    }

    fn update_service_node_status<'a>(
        &'a self,
        command: UpdateAdminServiceNodeStatusCommand,
    ) -> AdminServiceNodeCommandFuture<'a, AdminServiceNodeItem> {
        Box::pin(async move {
            assert_eq!(subject(), command.subject);
            assert_eq!("node-1", command.node_id);
            assert_eq!("disabled", command.status);
            Ok(service_node_item(
                "node-1",
                "edge-shanghai-01",
                "edge-shanghai.example.com",
                "10.0.0.10",
                "Primary Shanghai relay",
                "disabled",
                "offline",
            ))
        })
    }

    fn delete_service_node<'a>(
        &'a self,
        command: DeleteAdminServiceNodeCommand,
    ) -> AdminServiceNodeCommandFuture<'a, AdminServiceNodeDeleteOutcome> {
        Box::pin(async move {
            assert_eq!(subject(), command.subject);
            assert_eq!("node-1", command.node_id);
            Ok(AdminServiceNodeDeleteOutcome { deleted: true })
        })
    }
}

fn subject() -> AdminServiceNodeSubject {
    AdminServiceNodeSubject {
        tenant_id: 100_001,
        organization_id: 0,
        operator_id: 30,
        operator_type: 1,
    }
}

fn service_node_item(
    id: &str,
    name: &str,
    domain: &str,
    ip: &str,
    remark: &str,
    status: &str,
    health_status: &str,
) -> AdminServiceNodeItem {
    AdminServiceNodeItem {
        id: id.to_owned(),
        name: name.to_owned(),
        deployment_profile: "standalone".to_owned(),
        base_url: format!("https://{domain}/v1"),
        domains: vec![domain.to_owned()],
        domain: domain.to_owned(),
        ip: ip.to_owned(),
        remark: remark.to_owned(),
        status: status.to_owned(),
        health_status: health_status.to_owned(),
        updated_at: "2026-05-26T08:00:00Z".to_owned(),
    }
}
