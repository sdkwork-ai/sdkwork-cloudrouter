mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::ports::{
    AdminMonitorAlert, AdminMonitorNode, AdminMonitorPerformanceDatum, AdminMonitorQuery,
    AdminMonitorReadFuture, AdminMonitorReadStore,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn admin_monitor_route_returns_nodes_alerts_and_performance() {
    let router = sdkwork_clawrouter_router_service::api::admin_monitor_router_with_read_store(
        Arc::new(TestAdminMonitorReadStore),
    );

    let nodes_response = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/router/monitor/nodes",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, nodes_response.status());
    let nodes_payload = json_payload(nodes_response).await;
    assert_eq!("2000", nodes_payload["code"]);
    assert_eq!("gw-shanghai-01", nodes_payload["data"]["items"][0]["name"]);
    assert_eq!("cn-shanghai", nodes_payload["data"]["items"][0]["region"]);
    assert_eq!("warning", nodes_payload["data"]["items"][0]["status"]);
    assert_eq!(72.5, nodes_payload["data"]["items"][0]["cpu"]);
    assert_eq!(63.0, nodes_payload["data"]["items"][0]["memory"]);
    assert_eq!("10.***.0.8", nodes_payload["data"]["items"][0]["ip"]);

    let alerts_response = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/router/monitor/alerts",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, alerts_response.status());
    let alerts_payload = json_payload(alerts_response).await;
    assert_eq!("critical", alerts_payload["data"]["items"][0]["severity"]);
    assert_eq!("active", alerts_payload["data"]["items"][0]["status"]);
    assert_eq!("gateway", alerts_payload["data"]["items"][0]["source"]);

    let performance_response = router
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/router/monitor/performance",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, performance_response.status());
    let performance_payload = json_payload(performance_response).await;
    assert_eq!("09:00", performance_payload["data"]["items"][0]["time"]);
    assert_eq!(41.0, performance_payload["data"]["items"][0]["cpu"]);
    assert_eq!(58.0, performance_payload["data"]["items"][0]["memory"]);
    assert_eq!(122.0, performance_payload["data"]["items"][0]["network"]);
}

#[tokio::test]
async fn admin_monitor_route_rejects_missing_trusted_subject() {
    let router = sdkwork_clawrouter_router_service::api::admin_monitor_router_with_read_store(
        Arc::new(TestAdminMonitorReadStore),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/router/monitor/nodes")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
    let payload = json_payload(response).await;
    assert_eq!("4010", payload["code"]);
}

fn signed_request(method: &str, path: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .internal_trusted_subject(10, 20, 30)
        .body(Body::empty())
        .unwrap()
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

struct TestAdminMonitorReadStore;

impl AdminMonitorReadStore for TestAdminMonitorReadStore {
    fn list_monitor_nodes<'a>(
        &'a self,
        query: AdminMonitorQuery,
    ) -> AdminMonitorReadFuture<'a, Vec<AdminMonitorNode>> {
        Box::pin(async move {
            assert_eq!(10, query.subject.tenant_id);
            Ok(vec![AdminMonitorNode {
                id: "1".to_owned(),
                name: "gw-shanghai-01".to_owned(),
                region: "cn-shanghai".to_owned(),
                status: "warning".to_owned(),
                cpu: 72.5,
                memory: 63.0,
                uptime: "5d 4h".to_owned(),
                ip: "10.***.0.8".to_owned(),
            }])
        })
    }

    fn list_monitor_alerts<'a>(
        &'a self,
        _query: AdminMonitorQuery,
    ) -> AdminMonitorReadFuture<'a, Vec<AdminMonitorAlert>> {
        Box::pin(async move {
            Ok(vec![AdminMonitorAlert {
                id: "alert-1".to_owned(),
                severity: "critical".to_owned(),
                title: "High error rate".to_owned(),
                message: "5xx error rate exceeded threshold".to_owned(),
                time: "2026-04-29 09:00:00".to_owned(),
                status: "active".to_owned(),
                source: "gateway".to_owned(),
            }])
        })
    }

    fn list_monitor_performance<'a>(
        &'a self,
        _query: AdminMonitorQuery,
    ) -> AdminMonitorReadFuture<'a, Vec<AdminMonitorPerformanceDatum>> {
        Box::pin(async move {
            Ok(vec![AdminMonitorPerformanceDatum {
                time: "09:00".to_owned(),
                cpu: 41.0,
                memory: 58.0,
                network: 122.0,
            }])
        })
    }
}
