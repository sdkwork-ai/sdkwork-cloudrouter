use std::sync::Arc;

use axum::extract::{Extension, Query, State};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use crate::api::app_sql_subject::{map_optional_app_sql_subject, ResolvedAppSqlScopedSubject};
use crate::api::response::{
    json_success_list_response, offset_page_info, problem_from_wire_code_for_context,
    validation_problem_for_context,
};
use sdkwork_web_core::WebRequestContext;
use serde::Deserialize;
use crate::ports::{
    UsageLogsPage, UsageLogsQuery, UsageLogsReadFuture, UsageLogsReadStore, UsageLogsStatus,
    UsageLogsSubject,
};

const DEFAULT_USAGE_LOGS_PAGE_NO: i64 = 1;
const DEFAULT_USAGE_LOGS_PAGE_SIZE: i64 = 10;
const MAX_USAGE_LOGS_PAGE_SIZE: i64 = 100;
const MAX_USAGE_LOGS_KEYWORD_LEN: usize = 128;
const MAX_USAGE_LOGS_RANGE_DAYS: i64 = 1096;
const SECONDS_PER_DAY: i64 = 86_400;
const NANOS_PER_SECOND: i128 = 1_000_000_000;
const USAGE_LOGS_START_TIME_INVALID_MESSAGE: &str =
    "usage logs start_time must be a valid UTC timestamp";
const USAGE_LOGS_END_TIME_INVALID_MESSAGE: &str =
    "usage logs end_time must be a valid UTC timestamp";
const USAGE_LOGS_REVERSED_RANGE_MESSAGE: &str =
    "usage logs end_time must be greater than or equal to start_time";

#[derive(Clone)]
struct AppUsageLogsState {
    read_store: Arc<dyn UsageLogsReadStore + Send + Sync>,
    require_subject: bool,
}

#[derive(Debug, Deserialize)]
struct AppUsageLogsQuery {
    page: Option<i64>,
    page_size: Option<i64>,
    q: Option<String>,
    status: Option<String>,
    start_time: Option<String>,
    end_time: Option<String>,
}

struct ValidatedUsageLogsQuery {
    query: UsageLogsQuery,
}

struct UsageLogsQueryValidationError {
    message: String,
}

impl UsageLogsQueryValidationError {
    fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
struct UsageLogsTimestamp {
    epoch_seconds: i64,
    nanosecond: i64,
    year: i64,
    month: i64,
    day: i64,
    hour: i64,
    minute: i64,
    second: i64,
}

struct EmptyUsageLogsReadStore;

impl UsageLogsReadStore for EmptyUsageLogsReadStore {
    fn load_usage_logs<'a>(
        &'a self,
        query: UsageLogsQuery,
        _subject: Option<UsageLogsSubject>,
    ) -> UsageLogsReadFuture<'a> {
        Box::pin(async move {
            Ok(UsageLogsPage {
                page_no: query.page_no,
                page_size: query.page_size,
                ..UsageLogsPage::default()
            })
        })
    }
}

pub fn app_usage_logs_router() -> Router {
    app_usage_logs_router_with_state(Arc::new(EmptyUsageLogsReadStore), false)
}

pub fn app_usage_logs_router_with_read_store(
    read_store: Arc<dyn UsageLogsReadStore + Send + Sync>,
) -> Router {
    app_usage_logs_router_with_state(read_store, true)
}

fn app_usage_logs_router_with_state(
    read_store: Arc<dyn UsageLogsReadStore + Send + Sync>,
    require_subject: bool,
) -> Router {
    Router::new()
        .route("/app/v3/api/ai/usage/logs", get(fetch_usage_logs))
        .with_state(AppUsageLogsState {
            read_store,
            require_subject,
        })
}

async fn fetch_usage_logs(
    State(state): State<AppUsageLogsState>,
    ResolvedAppSqlScopedSubject(subject): ResolvedAppSqlScopedSubject,
    request_context: Option<Extension<WebRequestContext>>,
    Query(query): Query<AppUsageLogsQuery>,
) -> Response {
    let ctx = request_context.map(|context| context.0);
    let subject = match map_optional_app_sql_subject(subject, state.require_subject, |scoped| {
        scoped.into()
    }) {
        Ok(subject) => subject,
        Err(response) => return response,
    };

    let validated_query = match validate_usage_logs_query(query) {
        Ok(validated_query) => validated_query,
        Err(error) => {
            return validation_problem_for_context(ctx.as_ref(), error.message).into_response();
        }
    };

    match state
        .read_store
        .load_usage_logs(validated_query.query, subject)
        .await
    {
        Ok(page) => json_success_list_response(
            ctx.as_ref(),
            page.logs,
            offset_page_info(page.page_no, page.page_size, page.total),
        ),
        Err(error) => problem_from_wire_code_for_context(
            ctx.as_ref(),
            "5000",
            format!("usage logs read model is unavailable: {error}"),
        )
        .into_response(),
    }
}

fn validate_usage_logs_query(
    query: AppUsageLogsQuery,
) -> Result<ValidatedUsageLogsQuery, UsageLogsQueryValidationError> {
    let page_no = query.page.unwrap_or(DEFAULT_USAGE_LOGS_PAGE_NO);
    if page_no < 1 {
        return Err(UsageLogsQueryValidationError::new(
            "usage logs page must be greater than or equal to 1",
        ));
    }

    let page_size = query.page_size.unwrap_or(DEFAULT_USAGE_LOGS_PAGE_SIZE);
    if !(1..=MAX_USAGE_LOGS_PAGE_SIZE).contains(&page_size) {
        return Err(UsageLogsQueryValidationError::new(format!(
            "usage logs page_size must be between 1 and {MAX_USAGE_LOGS_PAGE_SIZE}"
        )));
    }

    let keyword = normalize_usage_logs_query_string(query.q);
    if keyword
        .as_ref()
        .is_some_and(|value| value.chars().count() > MAX_USAGE_LOGS_KEYWORD_LEN)
    {
        return Err(UsageLogsQueryValidationError::new(format!(
            "usage logs q must not exceed {MAX_USAGE_LOGS_KEYWORD_LEN} characters"
        )));
    }

    let status = normalize_usage_logs_status(query.status)?;
    let start_time = normalize_usage_logs_query_string(query.start_time);
    let end_time = normalize_usage_logs_query_string(query.end_time);
    let parsed_start = start_time
        .as_deref()
        .map(|value| parse_usage_logs_timestamp(value, "start_time"))
        .transpose()?;
    let parsed_end = end_time
        .as_deref()
        .map(|value| parse_usage_logs_timestamp(value, "end_time"))
        .transpose()?;

    if let (Some(start), Some(end)) = (parsed_start.as_ref(), parsed_end.as_ref()) {
        if end < start {
            return Err(UsageLogsQueryValidationError::new(
                USAGE_LOGS_REVERSED_RANGE_MESSAGE,
            ));
        }
        if usage_logs_range_exceeds_limit(*start, *end) {
            return Err(UsageLogsQueryValidationError::new(format!(
                "usage logs time range must not exceed {MAX_USAGE_LOGS_RANGE_DAYS} days"
            )));
        }
    }

    Ok(ValidatedUsageLogsQuery {
        query: UsageLogsQuery {
            page_no,
            page_size,
            offset: (page_no - 1) * page_size,
            keyword,
            status,
            start_time: parsed_start
                .as_ref()
                .map(format_usage_logs_timestamp_for_query),
            end_time: parsed_end
                .as_ref()
                .map(format_usage_logs_timestamp_for_query),
        },
    })
}

fn normalize_usage_logs_status(
    value: Option<String>,
) -> Result<UsageLogsStatus, UsageLogsQueryValidationError> {
    let Some(value) = normalize_usage_logs_query_string(value) else {
        return Ok(UsageLogsStatus::All);
    };
    match value.to_ascii_lowercase().as_str() {
        "all" => Ok(UsageLogsStatus::All),
        "success" => Ok(UsageLogsStatus::Success),
        "error" => Ok(UsageLogsStatus::Error),
        _ => Err(UsageLogsQueryValidationError::new(
            "usage logs status must be one of all, success, error",
        )),
    }
}

fn normalize_usage_logs_query_string(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

fn parse_usage_logs_timestamp(
    value: &str,
    field_name: &str,
) -> Result<UsageLogsTimestamp, UsageLogsQueryValidationError> {
    if !value.ends_with('Z') {
        return invalid_usage_logs_timestamp(field_name);
    }
    let value_without_zone = &value[..value.len() - 1];
    let (timestamp, fraction) = match value_without_zone.split_once('.') {
        Some((timestamp, fraction)) => (timestamp, Some(fraction)),
        None => (value_without_zone, None),
    };
    if timestamp.len() != 19 {
        return invalid_usage_logs_timestamp(field_name);
    }
    let bytes = timestamp.as_bytes();
    if bytes[4] != b'-'
        || bytes[7] != b'-'
        || bytes[10] != b'T'
        || bytes[13] != b':'
        || bytes[16] != b':'
    {
        return invalid_usage_logs_timestamp(field_name);
    }

    let year = parse_usage_logs_timestamp_part(&timestamp[0..4], field_name)?;
    let month = parse_usage_logs_timestamp_part(&timestamp[5..7], field_name)?;
    let day = parse_usage_logs_timestamp_part(&timestamp[8..10], field_name)?;
    let hour = parse_usage_logs_timestamp_part(&timestamp[11..13], field_name)?;
    let minute = parse_usage_logs_timestamp_part(&timestamp[14..16], field_name)?;
    let second = parse_usage_logs_timestamp_part(&timestamp[17..19], field_name)?;

    if !(1..=12).contains(&month)
        || day < 1
        || day > days_in_month(year, month)
        || hour > 23
        || minute > 59
        || second > 59
    {
        return invalid_usage_logs_timestamp(field_name);
    }

    let nanosecond = parse_usage_logs_fraction(fraction, field_name)?;
    let epoch_seconds =
        days_from_civil(year, month, day) * SECONDS_PER_DAY + hour * 3_600 + minute * 60 + second;

    Ok(UsageLogsTimestamp {
        epoch_seconds,
        nanosecond,
        year,
        month,
        day,
        hour,
        minute,
        second,
    })
}

fn parse_usage_logs_timestamp_part(
    value: &str,
    field_name: &str,
) -> Result<i64, UsageLogsQueryValidationError> {
    if value.bytes().all(|byte| byte.is_ascii_digit()) {
        return value
            .parse::<i64>()
            .map_err(|_| invalid_usage_logs_timestamp_error(field_name));
    }
    invalid_usage_logs_timestamp(field_name)
}

fn parse_usage_logs_fraction(
    value: Option<&str>,
    field_name: &str,
) -> Result<i64, UsageLogsQueryValidationError> {
    let Some(value) = value else {
        return Ok(0);
    };
    if value.is_empty() || value.len() > 9 || !value.bytes().all(|byte| byte.is_ascii_digit()) {
        return invalid_usage_logs_timestamp(field_name);
    }
    let mut padded = value.to_owned();
    while padded.len() < 9 {
        padded.push('0');
    }
    padded
        .parse::<i64>()
        .map_err(|_| invalid_usage_logs_timestamp_error(field_name))
}

fn invalid_usage_logs_timestamp<T>(field_name: &str) -> Result<T, UsageLogsQueryValidationError> {
    Err(invalid_usage_logs_timestamp_error(field_name))
}

fn invalid_usage_logs_timestamp_error(field_name: &str) -> UsageLogsQueryValidationError {
    UsageLogsQueryValidationError::new(match field_name {
        "start_time" => USAGE_LOGS_START_TIME_INVALID_MESSAGE,
        "end_time" => USAGE_LOGS_END_TIME_INVALID_MESSAGE,
        _ => "usage logs timestamp must be a valid UTC timestamp",
    })
}

fn usage_logs_range_exceeds_limit(start: UsageLogsTimestamp, end: UsageLogsTimestamp) -> bool {
    let start_nanos =
        i128::from(start.epoch_seconds) * NANOS_PER_SECOND + i128::from(start.nanosecond);
    let end_nanos = i128::from(end.epoch_seconds) * NANOS_PER_SECOND + i128::from(end.nanosecond);
    end_nanos - start_nanos
        > i128::from(MAX_USAGE_LOGS_RANGE_DAYS * SECONDS_PER_DAY) * NANOS_PER_SECOND
}

fn format_usage_logs_timestamp_for_query(value: &UsageLogsTimestamp) -> String {
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

fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let year = year - if month <= 2 { 1 } else { 0 };
    let era = if year >= 0 { year } else { year - 399 } / 400;
    let year_of_era = year - era * 400;
    let month_prime = month + if month > 2 { -3 } else { 9 };
    let day_of_year = (153 * month_prime + 2) / 5 + day - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    era * 146_097 + day_of_era - 719_468
}
