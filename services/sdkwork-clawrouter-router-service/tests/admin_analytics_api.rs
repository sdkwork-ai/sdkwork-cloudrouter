mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::ports::{
    AdminAnalyticsInsight, AdminAnalyticsModelRankItem, AdminAnalyticsModelRankings,
    AdminAnalyticsPieItem, AdminAnalyticsQuery, AdminAnalyticsReadFuture, AdminAnalyticsReadStore,
    AdminAnalyticsSnapshot, AdminAnalyticsSubject, AdminAnalyticsSummary, AdminAnalyticsTimeRange,
    AdminAnalyticsTrendPoint, AdminAnalyticsUserRankItem, AdminAnalyticsUserRankings,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn admin_analytics_route_returns_usage_snapshot_for_trusted_subject() {
    let router = sdkwork_clawrouter_router_service::api::admin_analytics_router_with_read_store(
        Arc::new(TestAdminAnalyticsStore),
    );

    let response = router
        .oneshot(
            signed_request(
                "GET",
                "/backend/v3/api/system/analytics/admin/overview?time_range=monthly&start_time=2026-05-01T00:00:00Z&end_time=2026-05-31T23:59:59Z&limit=12",
            ),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!(7, payload["data"]["summary"]["totalRequests"]);
    assert_eq!(1200.0, payload["data"]["summary"]["totalTokens"]);
    assert_eq!(38.5, payload["data"]["summary"]["totalPoints"]);
    assert_eq!("monthly", payload["data"]["timeRange"]);
    assert_eq!(12, payload["data"]["limit"]);
    assert_eq!(
        "alice",
        payload["data"]["userRankings"]["points"][0]["userName"]
    );
    assert_eq!(
        "gpt-4o",
        payload["data"]["modelRankings"]["requests"][0]["model"]
    );
    assert_eq!(
        "admin.analytics.insights.topUserShare.title",
        payload["data"]["insights"][0]["title"]
    );
    assert_eq!(
        "admin.analytics.insights.topUserShare.detail",
        payload["data"]["insights"][0]["detail"]
    );
}

#[tokio::test]
async fn admin_analytics_route_rejects_missing_trusted_subject() {
    let router = sdkwork_clawrouter_router_service::api::admin_analytics_router_with_read_store(
        Arc::new(TestAdminAnalyticsStore),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/system/analytics/admin/overview")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40101, payload["code"].as_i64().unwrap());
}

fn signed_request(method: &str, path: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
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

struct TestAdminAnalyticsStore;

impl AdminAnalyticsReadStore for TestAdminAnalyticsStore {
    fn load_admin_analytics<'a>(
        &'a self,
        query: AdminAnalyticsQuery,
    ) -> AdminAnalyticsReadFuture<'a> {
        Box::pin(async move {
            assert_eq!(
                AdminAnalyticsSubject {
                    tenant_id: 100001,
                    organization_id: 0,
                    operator_id: 30,
                    operator_type: 1,
                },
                query.subject
            );
            assert_eq!(AdminAnalyticsTimeRange::Monthly, query.time_range);
            assert_eq!(Some("2026-05-01T00:00:00Z".to_owned()), query.start_time);
            assert_eq!(Some("2026-05-31T23:59:59Z".to_owned()), query.end_time);
            assert_eq!(12, query.limit);

            Ok(AdminAnalyticsSnapshot {
                time_range: AdminAnalyticsTimeRange::Monthly,
                start_time: Some("2026-05-01T00:00:00Z".to_owned()),
                end_time: Some("2026-05-31T23:59:59Z".to_owned()),
                limit: 12,
                summary: AdminAnalyticsSummary {
                    total_users: 3,
                    active_users: 2,
                    active_models: 2,
                    total_requests: 7,
                    successful_requests: 6,
                    failed_requests: 1,
                    total_tokens: 1200.0,
                    total_points: 38.5,
                    upstream_cost: 18.25,
                    average_tokens_per_request: 171.42857142857142,
                    average_points_per_request: 5.5,
                    error_rate: 14.285714285714285,
                },
                trend: vec![AdminAnalyticsTrendPoint {
                    time: "2026-05".to_owned(),
                    requests: 7.0,
                    tokens: 1200.0,
                    points: 38.5,
                    users: 2,
                }],
                user_rankings: AdminAnalyticsUserRankings {
                    points: vec![user_rank_item(1, "101", "alice", 4, 700.0, 24.5)],
                    tokens: vec![user_rank_item(1, "102", "bob", 3, 500.0, 14.0)],
                    requests: vec![user_rank_item(1, "101", "alice", 4, 700.0, 24.5)],
                },
                model_rankings: AdminAnalyticsModelRankings {
                    points: vec![model_rank_item(1, "gpt-4o", 4, 700.0, 24.5)],
                    tokens: vec![model_rank_item(1, "claude-3-5-sonnet", 3, 500.0, 14.0)],
                    requests: vec![model_rank_item(1, "gpt-4o", 4, 700.0, 24.5)],
                },
                model_distribution: vec![pie_item("gpt-4o", 4.0)],
                modality_distribution: vec![pie_item("text", 7.0)],
                insights: vec![AdminAnalyticsInsight {
                    key: "topUserShare".to_owned(),
                    title: "admin.analytics.insights.topUserShare.title".to_owned(),
                    value: "57.1%".to_owned(),
                    severity: "info".to_owned(),
                    detail: "admin.analytics.insights.topUserShare.detail".to_owned(),
                }],
            })
        })
    }
}

fn user_rank_item(
    rank: i64,
    user_id: &str,
    user_name: &str,
    request_count: i64,
    total_tokens: f64,
    points: f64,
) -> AdminAnalyticsUserRankItem {
    AdminAnalyticsUserRankItem {
        rank,
        user_id: user_id.to_owned(),
        user_name: user_name.to_owned(),
        email: None,
        request_count,
        total_tokens,
        points,
        model_distribution: vec![pie_item("gpt-4o", request_count as f64)],
    }
}

fn model_rank_item(
    rank: i64,
    model: &str,
    request_count: i64,
    total_tokens: f64,
    points: f64,
) -> AdminAnalyticsModelRankItem {
    AdminAnalyticsModelRankItem {
        rank,
        model: model.to_owned(),
        catalog_key: model.to_owned(),
        vendor: "openai".to_owned(),
        modality: "text".to_owned(),
        request_count,
        total_tokens,
        points,
        upstream_cost: points / 2.0,
        user_count: 1,
        average_tokens_per_request: total_tokens / request_count as f64,
        error_rate: 0.0,
    }
}

fn pie_item(name: &str, value: f64) -> AdminAnalyticsPieItem {
    AdminAnalyticsPieItem {
        name: name.to_owned(),
        value,
        color: "#2563eb".to_owned(),
    }
}
