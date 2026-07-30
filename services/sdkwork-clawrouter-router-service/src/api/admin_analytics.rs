use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;
use std::sync::Arc;

use axum::extract::State;
use axum::http::{StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use sdkwork_utils_rust::{
    add_days, add_hours, format_datetime, now, parse_datetime, SdkWorkResultCode,
};
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
    start_time: String,
    end_time: String,
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
    let time_range = normalize_time_range(params.time_range)?;
    let (start_time, end_time) = normalize_time_window(
        time_range,
        normalize_optional_text(params.start_time),
        normalize_optional_text(params.end_time),
    )?;
    Ok(AdminAnalyticsQuery {
        subject: scoped.into(),
        time_range,
        start_time,
        end_time,
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
                ));
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
const MAX_TIMESTAMP_LEN: usize = 35;
const MILLIS_PER_HOUR: i64 = 3_600_000;
const MILLIS_PER_DAY: i64 = 24 * MILLIS_PER_HOUR;

fn normalize_time_range(value: Option<String>) -> Result<AdminAnalyticsTimeRange, String> {
    let Some(value) = normalize_optional_text(value) else {
        return Ok(AdminAnalyticsTimeRange::Daily);
    };
    AdminAnalyticsTimeRange::parse(&value).ok_or_else(|| {
        "time_range must be one of hourly, daily, weekly, monthly, yearly".to_owned()
    })
}

fn normalize_time_window(
    time_range: AdminAnalyticsTimeRange,
    start_time: Option<String>,
    end_time: Option<String>,
) -> Result<(String, String), String> {
    match (start_time, end_time) {
        (None, None) => Ok(default_time_window(time_range)),
        (Some(start_time), Some(end_time)) => {
            let start_millis = parse_timestamp_millis(&start_time, "start_time")?;
            let end_millis = parse_timestamp_millis(&end_time, "end_time")?;
            if end_millis < start_millis {
                return Err("end_time must be greater than or equal to start_time".to_owned());
            }
            let max_window_millis = max_window_millis(time_range);
            if end_millis - start_millis > max_window_millis {
                return Err(format!(
                    "analytics time range exceeds the maximum window for {}",
                    time_range_name(time_range)
                ));
            }
            Ok((start_time, end_time))
        }
        _ => Err("start_time and end_time must be provided together".to_owned()),
    }
}

fn default_time_window(time_range: AdminAnalyticsTimeRange) -> (String, String) {
    let end = now();
    let start = match time_range {
        AdminAnalyticsTimeRange::Hourly => add_hours(end, -24),
        AdminAnalyticsTimeRange::Daily => add_days(end, -30),
        AdminAnalyticsTimeRange::Weekly => add_days(end, -84),
        AdminAnalyticsTimeRange::Monthly => add_days(end, -366),
        AdminAnalyticsTimeRange::Yearly => add_days(end, -3653),
    };
    (format_datetime(start, None), format_datetime(end, None))
}

fn parse_timestamp_millis(value: &str, field_name: &str) -> Result<i64, String> {
    if value.len() > MAX_TIMESTAMP_LEN || !value.ends_with('Z') {
        return Err(format!(
            "{field_name} must be a valid ISO 8601 UTC timestamp"
        ));
    }
    parse_datetime(value, None)
        .map(|timestamp| timestamp.timestamp_millis())
        .ok_or_else(|| format!("{field_name} must be a valid ISO 8601 UTC timestamp"))
}

fn max_window_millis(time_range: AdminAnalyticsTimeRange) -> i64 {
    match time_range {
        AdminAnalyticsTimeRange::Hourly => 30 * MILLIS_PER_HOUR,
        AdminAnalyticsTimeRange::Daily => 31 * MILLIS_PER_DAY,
        AdminAnalyticsTimeRange::Weekly => 210 * MILLIS_PER_DAY,
        AdminAnalyticsTimeRange::Monthly => 731 * MILLIS_PER_DAY,
        AdminAnalyticsTimeRange::Yearly => 3653 * MILLIS_PER_DAY,
    }
}

fn time_range_name(time_range: AdminAnalyticsTimeRange) -> &'static str {
    match time_range {
        AdminAnalyticsTimeRange::Hourly => "hourly",
        AdminAnalyticsTimeRange::Daily => "daily",
        AdminAnalyticsTimeRange::Weekly => "weekly",
        AdminAnalyticsTimeRange::Monthly => "monthly",
        AdminAnalyticsTimeRange::Yearly => "yearly",
    }
}

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_time_window_is_utc_and_bounded() {
        let (start_time, end_time) = default_time_window(AdminAnalyticsTimeRange::Daily);
        let start_millis = parse_timestamp_millis(&start_time, "start_time").unwrap();
        let end_millis = parse_timestamp_millis(&end_time, "end_time").unwrap();

        assert_eq!(30 * MILLIS_PER_DAY, end_millis - start_millis);
        assert!(start_time.ends_with('Z'));
        assert!(end_time.ends_with('Z'));
    }

    #[test]
    fn explicit_time_window_requires_two_strict_utc_timestamps() {
        for (start_time, end_time) in [
            (Some("2026-01-01T00:00:00Z"), None),
            (None, Some("2026-01-02T00:00:00Z")),
            (
                Some("2026-01-01T00:00:00+08:00"),
                Some("2026-01-02T00:00:00Z"),
            ),
            (Some("invalid"), Some("2026-01-02T00:00:00Z")),
            (Some("2026-01-02T00:00:00Z"), Some("2026-01-01T00:00:00Z")),
        ] {
            assert!(normalize_time_window(
                AdminAnalyticsTimeRange::Daily,
                start_time.map(str::to_owned),
                end_time.map(str::to_owned),
            )
            .is_err());
        }
    }

    #[test]
    fn explicit_time_window_rejects_ranges_above_selected_bucket_limit() {
        let result = normalize_time_window(
            AdminAnalyticsTimeRange::Hourly,
            Some("2026-01-01T00:00:00Z".to_owned()),
            Some("2026-02-01T00:00:01Z".to_owned()),
        );

        assert!(result.is_err());
    }

    #[test]
    fn unknown_time_range_is_not_silently_downgraded() {
        assert!(normalize_time_range(Some("quarterly".to_owned())).is_err());
    }
}
