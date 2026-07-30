mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::domain::DecimalValue;
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
                "/backend/v3/api/system/analytics/admin/overview?time_range=monthly&start_time=2026-05-01T00:00:00Z&end_time=2026-05-31T23:59:59Z&ranking_size=12",
            ),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("7", payload["data"]["summary"]["totalRequests"]);
    assert_eq!(
        "1200.000000000000",
        payload["data"]["summary"]["totalTokens"]
    );
    assert_eq!("38.500000000000", payload["data"]["summary"]["totalPoints"]);
    assert_eq!("monthly", payload["data"]["timeRange"]);
    assert!(payload["data"].get("limit").is_none());
    assert_eq!(12, payload["data"]["rankingSize"]);
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
async fn admin_analytics_route_rejects_pagination_alias_and_invalid_ranking_size() {
    let router = sdkwork_clawrouter_router_service::api::admin_analytics_router_with_read_store(
        Arc::new(TestAdminAnalyticsStore),
    );

    let legacy_limit_response = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/system/analytics/admin/overview?page_size=12",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, legacy_limit_response.status());
    let legacy_limit_payload = json_payload(legacy_limit_response).await;
    assert_eq!(40003, legacy_limit_payload["code"].as_i64().unwrap());

    let undersized_response = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/system/analytics/admin/overview?ranking_size=2",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, undersized_response.status());
    let undersized_payload = json_payload(undersized_response).await;
    assert_eq!(40003, undersized_payload["code"].as_i64().unwrap());

    let oversized_response = router
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/system/analytics/admin/overview?ranking_size=51",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, oversized_response.status());
    let oversized_payload = json_payload(oversized_response).await;
    assert_eq!(40003, oversized_payload["code"].as_i64().unwrap());
}

#[tokio::test]
async fn admin_analytics_route_rejects_invalid_or_unbounded_time_windows() {
    let router = sdkwork_clawrouter_router_service::api::admin_analytics_router_with_read_store(
        Arc::new(TestAdminAnalyticsStore),
    );

    for query in [
        "time_range=quarterly",
        "start_time=2026-05-01T00:00:00Z",
        "end_time=2026-05-31T23:59:59Z",
        "start_time=not-a-time&end_time=2026-05-31T23:59:59Z",
        "start_time=2026-05-01T00:00:00%2B08:00&end_time=2026-05-31T23:59:59Z",
        "start_time=2026-06-01T00:00:00Z&end_time=2026-05-01T00:00:00Z",
        "time_range=monthly&start_time=2020-01-01T00:00:00Z&end_time=2023-01-01T00:00:00Z",
    ] {
        let response = router
            .clone()
            .oneshot(signed_request(
                "GET",
                &format!("/backend/v3/api/system/analytics/admin/overview?{query}"),
            ))
            .await
            .unwrap();
        assert_eq!(StatusCode::BAD_REQUEST, response.status(), "query: {query}");
        let payload = json_payload(response).await;
        assert_eq!(40003, payload["code"].as_i64().unwrap(), "query: {query}");
    }
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
        .internal_trusted_subject(100001, 0, 30)
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
            assert_eq!("2026-05-01T00:00:00Z", query.start_time);
            assert_eq!("2026-05-31T23:59:59Z", query.end_time);
            assert_eq!(12, query.limit);

            Ok(AdminAnalyticsSnapshot {
                time_range: AdminAnalyticsTimeRange::Monthly,
                start_time: "2026-05-01T00:00:00Z".to_owned(),
                end_time: "2026-05-31T23:59:59Z".to_owned(),
                limit: 12,
                summary: AdminAnalyticsSummary {
                    total_users: 3,
                    active_users: 2,
                    active_models: 2,
                    total_requests: 7,
                    successful_requests: 6,
                    failed_requests: 1,
                    total_tokens: decimal("1200"),
                    total_points: decimal("38.5"),
                    upstream_cost: decimal("18.25"),
                    average_tokens_per_request: decimal("171.428571428571"),
                    average_points_per_request: decimal("5.5"),
                    error_rate: decimal("14.285714285714"),
                },
                trend: vec![AdminAnalyticsTrendPoint {
                    time: "2026-05".to_owned(),
                    requests: decimal("7"),
                    tokens: decimal("1200"),
                    points: decimal("38.5"),
                    users: 2,
                }],
                user_rankings: AdminAnalyticsUserRankings {
                    points: vec![user_rank_item(1, "101", "alice", 4, "700", "24.5")],
                    tokens: vec![user_rank_item(1, "102", "bob", 3, "500", "14")],
                    requests: vec![user_rank_item(1, "101", "alice", 4, "700", "24.5")],
                },
                model_rankings: AdminAnalyticsModelRankings {
                    points: vec![model_rank_item(1, "gpt-4o", 4, "700", "24.5")],
                    tokens: vec![model_rank_item(1, "claude-3-5-sonnet", 3, "500", "14")],
                    requests: vec![model_rank_item(1, "gpt-4o", 4, "700", "24.5")],
                },
                model_distribution: vec![pie_item("gpt-4o", "4")],
                modality_distribution: vec![pie_item("text", "7")],
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
    total_tokens: &str,
    points: &str,
) -> AdminAnalyticsUserRankItem {
    AdminAnalyticsUserRankItem {
        rank,
        user_id: user_id.to_owned(),
        user_name: user_name.to_owned(),
        email: None,
        request_count,
        total_tokens: decimal(total_tokens),
        points: decimal(points),
        model_distribution: vec![pie_item("gpt-4o", &request_count.to_string())],
    }
}

fn model_rank_item(
    rank: i64,
    model: &str,
    request_count: i64,
    total_tokens: &str,
    points: &str,
) -> AdminAnalyticsModelRankItem {
    AdminAnalyticsModelRankItem {
        rank,
        model: model.to_owned(),
        catalog_key: model.to_owned(),
        vendor: "openai".to_owned(),
        modality: "text".to_owned(),
        request_count,
        total_tokens: decimal(total_tokens),
        points: decimal(points),
        upstream_cost: decimal(points).divide_i64(2).unwrap(),
        user_count: 1,
        average_tokens_per_request: decimal(total_tokens).divide_i64(request_count).unwrap(),
        error_rate: DecimalValue::ZERO,
    }
}

fn pie_item(name: &str, value: &str) -> AdminAnalyticsPieItem {
    AdminAnalyticsPieItem {
        name: name.to_owned(),
        value: decimal(value),
        color: "#2563eb".to_owned(),
    }
}

fn decimal(value: &str) -> DecimalValue {
    DecimalValue::parse(value).unwrap()
}
