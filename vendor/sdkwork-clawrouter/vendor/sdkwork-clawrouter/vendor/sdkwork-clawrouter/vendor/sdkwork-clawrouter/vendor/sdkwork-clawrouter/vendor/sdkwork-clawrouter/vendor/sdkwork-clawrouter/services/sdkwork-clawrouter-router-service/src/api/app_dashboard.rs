use std::sync::Arc;

use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use crate::api::app_sql_subject::{map_optional_app_sql_subject, ResolvedAppSqlScopedSubject};
use crate::api::response::PlusApiResult;
use serde::Deserialize;
use crate::ports::{
    DashboardOverviewQuery, DashboardOverviewReadFuture, DashboardOverviewReadStore,
    DashboardOverviewSnapshot, DashboardOverviewSubject,
};

const MAX_DASHBOARD_RANGE_DAYS: i64 = 1096;
const SECONDS_PER_DAY: i64 = 86_400;
const NANOS_PER_SECOND: i128 = 1_000_000_000;
const SUPPORTED_DASHBOARD_RANGES: [&str; 4] = ["hourly", "daily", "monthly", "yearly"];
const DASHBOARD_RANGE_INVALID_MESSAGE: &str =
    "dashboard overview time_range must be one of hourly, daily, monthly, yearly";
const DASHBOARD_START_TIME_INVALID_MESSAGE: &str =
    "dashboard overview start_time must be a valid UTC timestamp";
const DASHBOARD_END_TIME_INVALID_MESSAGE: &str =
    "dashboard overview end_time must be a valid UTC timestamp";
const DASHBOARD_REVERSED_RANGE_MESSAGE: &str =
    "dashboard overview end_time must be greater than or equal to start_time";

#[derive(Clone)]
struct AppDashboardOverviewState {
    read_store: Arc<dyn DashboardOverviewReadStore + Send + Sync>,
    require_subject: bool,
}

#[derive(Debug, Deserialize)]
struct AppDashboardOverviewQuery {
    time_range: Option<String>,
    start_time: Option<String>,
    end_time: Option<String>,
}

struct ValidatedDashboardOverviewQuery {
    query: DashboardOverviewQuery,
}

struct DashboardOverviewQueryValidationError {
    message: String,
}

impl DashboardOverviewQueryValidationError {
    fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
struct DashboardTimestamp {
    epoch_seconds: i64,
    nanosecond: i64,
    year: i64,
    month: i64,
    day: i64,
    hour: i64,
    minute: i64,
    second: i64,
}

struct EmptyDashboardOverviewReadStore;

impl DashboardOverviewReadStore for EmptyDashboardOverviewReadStore {
    fn load_dashboard_overview<'a>(
        &'a self,
        _query: DashboardOverviewQuery,
        _subject: Option<DashboardOverviewSubject>,
    ) -> DashboardOverviewReadFuture<'a> {
        Box::pin(async { Ok(DashboardOverviewSnapshot::default()) })
    }
}

pub fn app_dashboard_overview_router() -> Router {
    app_dashboard_overview_router_with_state(Arc::new(EmptyDashboardOverviewReadStore), false)
}

pub fn app_dashboard_overview_router_with_read_store(
    read_store: Arc<dyn DashboardOverviewReadStore + Send + Sync>,
) -> Router {
    app_dashboard_overview_router_with_state(read_store, true)
}

fn app_dashboard_overview_router_with_state(
    read_store: Arc<dyn DashboardOverviewReadStore + Send + Sync>,
    require_subject: bool,
) -> Router {
    Router::new()
        .route(
            "/app/v3/api/ai/dashboard/overview",
            get(fetch_dashboard_overview),
        )
        .with_state(AppDashboardOverviewState {
            read_store,
            require_subject,
        })
}

async fn fetch_dashboard_overview(
    State(state): State<AppDashboardOverviewState>,
    ResolvedAppSqlScopedSubject(subject): ResolvedAppSqlScopedSubject,
    Query(query): Query<AppDashboardOverviewQuery>,
) -> Response {
    let subject = match map_optional_app_sql_subject(subject, state.require_subject, |scoped| {
        scoped.into()
    }) {
        Ok(subject) => subject,
        Err(response) => return response,
    };

    let validated_query = match validate_dashboard_overview_query(query) {
        Ok(validated_query) => validated_query,
        Err(error) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(PlusApiResult::error("4001", error.message)),
            )
                .into_response();
        }
    };

    match state
        .read_store
        .load_dashboard_overview(validated_query.query, subject)
        .await
    {
        Ok(snapshot) => Json(PlusApiResult::success(snapshot)).into_response(),
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(PlusApiResult::error(
                "5000",
                format!("dashboard overview read model is unavailable: {error}"),
            )),
        )
            .into_response(),
    }
}

fn validate_dashboard_overview_query(
    query: AppDashboardOverviewQuery,
) -> Result<ValidatedDashboardOverviewQuery, DashboardOverviewQueryValidationError> {
    let keyword = normalize_dashboard_range(query.time_range)?;
    let start_time = normalize_query_string(query.start_time);
    let end_time = normalize_query_string(query.end_time);

    let parsed_start = start_time
        .as_deref()
        .map(|value| parse_dashboard_timestamp(value, "start_time"))
        .transpose()?;
    let parsed_end = end_time
        .as_deref()
        .map(|value| parse_dashboard_timestamp(value, "end_time"))
        .transpose()?;

    if let (Some(start), Some(end)) = (parsed_start.as_ref(), parsed_end.as_ref()) {
        if end < start {
            return Err(DashboardOverviewQueryValidationError::new(
                DASHBOARD_REVERSED_RANGE_MESSAGE,
            ));
        }
        if dashboard_range_exceeds_limit(*start, *end) {
            return Err(DashboardOverviewQueryValidationError::new(format!(
                "dashboard overview time range must not exceed {MAX_DASHBOARD_RANGE_DAYS} days"
            )));
        }
    }

    Ok(ValidatedDashboardOverviewQuery {
        query: DashboardOverviewQuery {
            keyword,
            start_time: parsed_start
                .as_ref()
                .map(format_dashboard_timestamp_for_query),
            end_time: parsed_end
                .as_ref()
                .map(format_dashboard_timestamp_for_query),
        },
    })
}

fn normalize_dashboard_range(
    value: Option<String>,
) -> Result<Option<String>, DashboardOverviewQueryValidationError> {
    let Some(value) = normalize_query_string(value) else {
        return Ok(None);
    };
    let normalized = value.to_ascii_lowercase();
    if SUPPORTED_DASHBOARD_RANGES.contains(&normalized.as_str()) {
        return Ok(Some(normalized));
    }
    Err(DashboardOverviewQueryValidationError::new(
        DASHBOARD_RANGE_INVALID_MESSAGE,
    ))
}

fn normalize_query_string(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

fn parse_dashboard_timestamp(
    value: &str,
    field_name: &str,
) -> Result<DashboardTimestamp, DashboardOverviewQueryValidationError> {
    if !value.ends_with('Z') {
        return invalid_dashboard_timestamp(field_name);
    }
    let value_without_zone = &value[..value.len() - 1];
    let (timestamp, fraction) = match value_without_zone.split_once('.') {
        Some((timestamp, fraction)) => (timestamp, Some(fraction)),
        None => (value_without_zone, None),
    };
    if timestamp.len() != 19 {
        return invalid_dashboard_timestamp(field_name);
    }
    let bytes = timestamp.as_bytes();
    if bytes[4] != b'-'
        || bytes[7] != b'-'
        || bytes[10] != b'T'
        || bytes[13] != b':'
        || bytes[16] != b':'
    {
        return invalid_dashboard_timestamp(field_name);
    }

    let year = parse_timestamp_number(&timestamp[0..4], field_name)?;
    let month = parse_timestamp_number(&timestamp[5..7], field_name)?;
    let day = parse_timestamp_number(&timestamp[8..10], field_name)?;
    let hour = parse_timestamp_number(&timestamp[11..13], field_name)?;
    let minute = parse_timestamp_number(&timestamp[14..16], field_name)?;
    let second = parse_timestamp_number(&timestamp[17..19], field_name)?;
    let nanosecond = parse_timestamp_fraction(fraction, field_name)?;

    if year < 1970
        || !(1..=12).contains(&month)
        || day < 1
        || day > days_in_month(year, month)
        || hour > 23
        || minute > 59
        || second > 59
    {
        return invalid_dashboard_timestamp(field_name);
    }

    let epoch_days = days_since_unix_epoch(year, month, day);
    Ok(DashboardTimestamp {
        epoch_seconds: epoch_days * SECONDS_PER_DAY + hour * 3600 + minute * 60 + second,
        nanosecond,
        year,
        month,
        day,
        hour,
        minute,
        second,
    })
}

fn format_dashboard_timestamp_for_query(value: &DashboardTimestamp) -> String {
    let mut formatted = format!(
        "{:04}-{:02}-{:02} {:02}:{:02}:{:02}",
        value.year, value.month, value.day, value.hour, value.minute, value.second
    );
    if value.nanosecond > 0 {
        let fraction = format!("{:09}", value.nanosecond);
        formatted.push('.');
        formatted.push_str(fraction.trim_end_matches('0'));
    }
    formatted
}

fn parse_timestamp_number(
    value: &str,
    field_name: &str,
) -> Result<i64, DashboardOverviewQueryValidationError> {
    if !value.chars().all(|ch| ch.is_ascii_digit()) {
        return invalid_dashboard_timestamp(field_name);
    }
    value
        .parse::<i64>()
        .map_err(|_| dashboard_timestamp_error(field_name))
}

fn parse_timestamp_fraction(
    fraction: Option<&str>,
    field_name: &str,
) -> Result<i64, DashboardOverviewQueryValidationError> {
    let Some(fraction) = fraction else {
        return Ok(0);
    };
    if fraction.is_empty() || fraction.len() > 9 || !fraction.chars().all(|ch| ch.is_ascii_digit())
    {
        return invalid_dashboard_timestamp(field_name);
    }
    let mut nanosecond = fraction
        .parse::<i64>()
        .map_err(|_| dashboard_timestamp_error(field_name))?;
    for _ in fraction.len()..9 {
        nanosecond *= 10;
    }
    Ok(nanosecond)
}

fn invalid_dashboard_timestamp<T>(
    field_name: &str,
) -> Result<T, DashboardOverviewQueryValidationError> {
    Err(dashboard_timestamp_error(field_name))
}

fn dashboard_timestamp_error(field_name: &str) -> DashboardOverviewQueryValidationError {
    let message = match field_name {
        "start_time" => DASHBOARD_START_TIME_INVALID_MESSAGE,
        "end_time" => DASHBOARD_END_TIME_INVALID_MESSAGE,
        _ => "dashboard overview timestamp must be a valid UTC timestamp",
    };
    DashboardOverviewQueryValidationError::new(message)
}

fn dashboard_range_exceeds_limit(start: DashboardTimestamp, end: DashboardTimestamp) -> bool {
    let start_nanos =
        i128::from(start.epoch_seconds) * NANOS_PER_SECOND + i128::from(start.nanosecond);
    let end_nanos = i128::from(end.epoch_seconds) * NANOS_PER_SECOND + i128::from(end.nanosecond);
    let max_range_nanos = i128::from(MAX_DASHBOARD_RANGE_DAYS * SECONDS_PER_DAY) * NANOS_PER_SECOND;
    end_nanos - start_nanos > max_range_nanos
}

fn days_since_unix_epoch(year: i64, month: i64, day: i64) -> i64 {
    let mut days = 0;
    for current_year in 1970..year {
        days += if is_leap_year(current_year) { 366 } else { 365 };
    }
    for current_month in 1..month {
        days += days_in_month(year, current_month);
    }
    days + day - 1
}

fn days_in_month(year: i64, month: i64) -> i64 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if is_leap_year(year) => 29,
        2 => 28,
        _ => 0,
    }
}

fn is_leap_year(year: i64) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}
