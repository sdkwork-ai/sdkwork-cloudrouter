use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;
use std::sync::Arc;

use axum::extract::State;
use axum::http::{StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use sdkwork_utils_rust::SdkWorkResultCode;
use serde::Serialize;

use crate::api::query_string::{parse_i64_query_param, query_pairs};
use crate::api::response::{platform_problem, problem_from_wire_code, success_envelope};
use crate::ports::{
    AdminAnalyticsInsight, AdminAnalyticsModelRankings, AdminAnalyticsPieItem, AdminAnalyticsQuery,
    AdminAnalyticsReadStore, AdminAnalyticsSnapshot, AdminAnalyticsSummary,
    AdminAnalyticsTimeRange, AdminAnalyticsTrendPoint, AdminAnalyticsUserRankings,
};

#[derive(Clone)]
struct AdminAnalyticsState {
    read_store: Arc<dyn AdminAnalyticsReadStore + Send + Sync>,
}

#[derive(Debug, Clone, Default)]
struct AdminAnalyticsQueryParams {
    time_range: Option<String>,
    start_time: Option<String>,
    end_time: Option<String>,
    ranking_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminAnalyticsOverviewResponse {
    time_range: AdminAnalyticsTimeRange,
    #[serde(skip_serializing_if = "Option::is_none")]
    start_time: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    end_time: Option<String>,
    ranking_size: i64,
    summary: AdminAnalyticsSummary,
    trend: Vec<AdminAnalyticsTrendPoint>,
    user_rankings: AdminAnalyticsUserRankings,
    model_rankings: AdminAnalyticsModelRankings,
    model_distribution: Vec<AdminAnalyticsPieItem>,
    modality_distribution: Vec<AdminAnalyticsPieItem>,
    insights: Vec<AdminAnalyticsInsight>,
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
    uri: Uri,
) -> Response {
    let params = match parse_admin_analytics_query(uri.query()) {
        Ok(params) => params,
        Err(error) => return analytics_invalid_parameter_response(error),
    };
    let query = match analytics_query(scoped, params) {
        Ok(query) => query,
        Err(error) => return analytics_invalid_parameter_response(error),
    };

    match state.read_store.load_admin_analytics(query).await {
        Ok(snapshot) => Json(success_envelope(AdminAnalyticsOverviewResponse::from(
            snapshot,
        )))
        .into_response(),
        Err(error) => problem_from_wire_code(
            "5000",
            format!("admin analytics read model is unavailable: {error}"),
        )
        .into_response(),
    }
}

fn analytics_query(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    params: AdminAnalyticsQueryParams,
) -> Result<AdminAnalyticsQuery, String> {
    Ok(AdminAnalyticsQuery {
        subject: scoped.into(),
        time_range: AdminAnalyticsTimeRange::parse(params.time_range.as_deref()),
        start_time: normalize_optional_text(params.start_time),
        end_time: normalize_optional_text(params.end_time),
        limit: normalize_ranking_size(params.ranking_size)?,
    })
}

fn parse_admin_analytics_query(query: Option<&str>) -> Result<AdminAnalyticsQueryParams, String> {
    let mut parsed = AdminAnalyticsQueryParams::default();
    for (key, value) in query_pairs(query) {
        match key.as_str() {
            "time_range" => {
                if parsed.time_range.is_some() {
                    return Err("time_range must be provided once".to_owned());
                }
                parsed.time_range = Some(value);
            }
            "start_time" => {
                if parsed.start_time.is_some() {
                    return Err("start_time must be provided once".to_owned());
                }
                parsed.start_time = Some(value);
            }
            "end_time" => {
                if parsed.end_time.is_some() {
                    return Err("end_time must be provided once".to_owned());
                }
                parsed.end_time = Some(value);
            }
            "ranking_size" => {
                if parsed.ranking_size.is_some() {
                    return Err("ranking_size must be provided once".to_owned());
                }
                parsed.ranking_size = Some(parse_i64_query_param("ranking_size", &value)?);
            }
            "limit" | "page_size" | "pageSize" | "page_no" | "pageNo" | "per_page" | "size"
            | "offset" | "page" | "cursor" => {
                return Err(format!(
                    "{key} is not a supported analytics parameter; use ranking_size"
                ));
            }
            "" => {}
            _ => {
                return Err(format!(
                    "unsupported admin analytics query parameter: {key}"
                ))
            }
        }
    }
    Ok(parsed)
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

const DEFAULT_RANKING_SIZE: i64 = 10;
const MIN_RANKING_SIZE: i64 = 3;
const MAX_RANKING_SIZE: i64 = 50;

fn normalize_ranking_size(value: Option<i64>) -> Result<i64, String> {
    let value = value.unwrap_or(DEFAULT_RANKING_SIZE);
    if !(MIN_RANKING_SIZE..=MAX_RANKING_SIZE).contains(&value) {
        return Err(format!(
            "ranking_size must be between {MIN_RANKING_SIZE} and {MAX_RANKING_SIZE}"
        ));
    }
    Ok(value)
}

fn analytics_invalid_parameter_response(detail: impl Into<String>) -> Response {
    (
        StatusCode::BAD_REQUEST,
        platform_problem(SdkWorkResultCode::InvalidParameter, detail),
    )
        .into_response()
}

impl From<AdminAnalyticsSnapshot> for AdminAnalyticsOverviewResponse {
    fn from(snapshot: AdminAnalyticsSnapshot) -> Self {
        Self {
            time_range: snapshot.time_range,
            start_time: snapshot.start_time,
            end_time: snapshot.end_time,
            ranking_size: snapshot.limit,
            summary: snapshot.summary,
            trend: snapshot.trend,
            user_rankings: snapshot.user_rankings,
            model_rankings: snapshot.model_rankings,
            model_distribution: snapshot.model_distribution,
            modality_distribution: snapshot.modality_distribution,
            insights: snapshot.insights,
        }
    }
}
