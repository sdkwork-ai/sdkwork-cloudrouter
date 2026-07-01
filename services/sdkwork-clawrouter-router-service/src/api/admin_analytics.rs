use std::sync::Arc;
use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;

use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::Deserialize;

use crate::api::response::{problem_from_wire_code, success_envelope};
use crate::ports::{
    AdminAnalyticsQuery, AdminAnalyticsReadStore, AdminAnalyticsTimeRange,
};

#[derive(Clone)]
struct AdminAnalyticsState {
    read_store: Arc<dyn AdminAnalyticsReadStore + Send + Sync>,
}

#[derive(Debug, Clone, Deserialize)]
struct AdminAnalyticsQueryParams {
    time_range: Option<String>,
    start_time: Option<String>,
    end_time: Option<String>,
    limit: Option<i64>,
}

pub fn admin_analytics_router_with_read_store(
    read_store: Arc<dyn AdminAnalyticsReadStore + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/system/analytics/admin/overview",
            get(fetch_admin_analytics_overview),
        )
        .with_state(AdminAnalyticsState { read_store })
}

async fn fetch_admin_analytics_overview(
    State(state): State<AdminAnalyticsState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Query(params): Query<AdminAnalyticsQueryParams>,
) -> Response {
    let query = analytics_query(scoped, params);

    match state.read_store.load_admin_analytics(query).await {
        Ok(snapshot) => Json(success_envelope(snapshot)).into_response(),
        Err(error) => problem_from_wire_code(
                "5000",
                format!("admin analytics read model is unavailable: {error}"),
            ).into_response(),
    }
}

fn analytics_query(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    params: AdminAnalyticsQueryParams,
) -> AdminAnalyticsQuery {
    AdminAnalyticsQuery {
        subject: scoped.into(),
        time_range: AdminAnalyticsTimeRange::parse(params.time_range.as_deref()),
        start_time: normalize_optional_text(params.start_time),
        end_time: normalize_optional_text(params.end_time),
        limit: normalize_limit(params.limit),
    }
}

fn normalize_optional_text(value: Option<String>) -> Option<String> {
    value.and_then(|item| {
        let trimmed = item.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_owned())
        }
    })
}

fn normalize_limit(value: Option<i64>) -> i64 {
    value.unwrap_or(10).clamp(3, 50)
}
