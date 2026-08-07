use axum::body::Body;
use axum::http::{Request, StatusCode};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn dashboard_overview_route_returns_standard_empty_read_model_without_database() {
    let response = sdkwork_cloudrouter_standalone_gateway::router()
        .oneshot(
            Request::builder()
                .uri("/app/v3/api/ai/dashboard/overview?time_range=daily")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!(None, payload.get("msg"));
    assert_eq!(None, payload.get("message"));
    assert_eq!(0, payload["data"]["item"]["summary"]["requestCount"]);
    assert_eq!(0, payload["data"]["item"]["summary"]["totalRequestCount"]);
    assert_eq!(0.0, payload["data"]["item"]["summary"]["availableCredits"]);
    assert_eq!(0.0, payload["data"]["item"]["summary"]["usedCredits"]);
    assert_eq!(0.0, payload["data"]["item"]["summary"]["totalUsedCredits"]);
    assert_eq!(0, payload["data"]["item"]["summary"]["errorCount"]);
    assert_eq!(
        Some(0),
        payload["data"]["item"]["chartData"].as_array().map(Vec::len)
    );
    assert_eq!(
        Some(0),
        payload["data"]["item"]["topModels"].as_array().map(Vec::len)
    );
    assert_eq!(
        Some(0),
        payload["data"]["item"]["announcements"].as_array().map(Vec::len)
    );
    assert_eq!(
        Some(0),
        payload["data"]["item"]["configurationDomains"]
            .as_array()
            .map(Vec::len)
    );
    assert_eq!(
        Some(0),
        payload["data"]["item"]["warnings"].as_array().map(Vec::len)
    );
}

#[tokio::test]
async fn dashboard_overview_route_rejects_unsupported_time_range() {
    let response = sdkwork_cloudrouter_standalone_gateway::router()
        .oneshot(
            Request::builder()
                .uri("/app/v3/api/ai/dashboard/overview?time_range=weekly")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_standard_bad_request(
        response,
        "dashboard overview time_range must be one of hourly, daily, monthly, yearly",
    )
    .await;
}

#[tokio::test]
async fn dashboard_overview_route_rejects_invalid_start_time() {
    let response = sdkwork_cloudrouter_standalone_gateway::router()
        .oneshot(
            Request::builder()
                .uri("/app/v3/api/ai/dashboard/overview?start_time=not-a-date")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_standard_bad_request(
        response,
        "dashboard overview start_time must be a valid UTC timestamp",
    )
    .await;
}

#[tokio::test]
async fn dashboard_overview_route_rejects_reversed_time_range() {
    let response = sdkwork_cloudrouter_standalone_gateway::router()
        .oneshot(
            Request::builder()
                .uri("/app/v3/api/ai/dashboard/overview?start_time=2026-02-01T00:00:00Z&end_time=2026-01-01T00:00:00Z")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_standard_bad_request(
        response,
        "dashboard overview end_time must be greater than or equal to start_time",
    )
    .await;
}

#[tokio::test]
async fn dashboard_overview_route_rejects_time_range_above_commercial_limit() {
    let response = sdkwork_cloudrouter_standalone_gateway::router()
        .oneshot(
            Request::builder()
                .uri("/app/v3/api/ai/dashboard/overview?time_range=yearly&start_time=2020-01-01T00:00:00Z&end_time=2031-01-01T00:00:00Z")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_standard_bad_request(response, "dashboard overview time range must not exceed").await;
}

async fn assert_standard_bad_request(response: axum::response::Response, expected_message: &str) {
    assert_eq!(StatusCode::BAD_REQUEST, response.status());

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_text = String::from_utf8(body.to_vec()).unwrap();
    let payload: Value = serde_json::from_str(&body_text).unwrap();

    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"].as_str().unwrap().contains(expected_message));
    assert_eq!(None, payload.get("message"));
    assert_eq!(None, payload.get("msg"));
    assert!(body_text.contains(expected_message));
    assert!(!body_text.contains("timestamptz"));
    assert!(!body_text.contains("sqlx"));
}
