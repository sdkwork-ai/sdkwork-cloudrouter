use crate::ports::DashboardOverviewQuery;

const SECONDS_PER_DAY: i64 = 86_400;
const NANOS_PER_SECOND: i128 = 1_000_000_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
struct DashboardQueryTimestamp {
    epoch_seconds: i64,
    nanosecond: i64,
}

pub(crate) fn derive_dashboard_summary_rates(
    query: &DashboardOverviewQuery,
    request_count: i64,
    total_tokens: f64,
) -> (f64, f64) {
    let Some(start) = query
        .start_time
        .as_deref()
        .and_then(parse_dashboard_query_timestamp)
    else {
        return (0.0, 0.0);
    };
    let Some(end) = query
        .end_time
        .as_deref()
        .and_then(parse_dashboard_query_timestamp)
    else {
        return (0.0, 0.0);
    };
    let duration_seconds = seconds_between(start, end);
    if duration_seconds <= 0.0 || !total_tokens.is_finite() {
        return (0.0, 0.0);
    }

    let minutes = duration_seconds / 60.0;
    (
        finite_rate(request_count as f64 / minutes),
        finite_rate(total_tokens / minutes),
    )
}

fn parse_dashboard_query_timestamp(value: &str) -> Option<DashboardQueryTimestamp> {
    let (timestamp, fraction) = match value.split_once('.') {
        Some((timestamp, fraction)) => (timestamp, Some(fraction)),
        None => (value, None),
    };
    if timestamp.len() != 19 {
        return None;
    }
    let bytes = timestamp.as_bytes();
    if bytes[4] != b'-'
        || bytes[7] != b'-'
        || bytes[10] != b' '
        || bytes[13] != b':'
        || bytes[16] != b':'
    {
        return None;
    }

    let year = parse_timestamp_number(&timestamp[0..4])?;
    let month = parse_timestamp_number(&timestamp[5..7])?;
    let day = parse_timestamp_number(&timestamp[8..10])?;
    let hour = parse_timestamp_number(&timestamp[11..13])?;
    let minute = parse_timestamp_number(&timestamp[14..16])?;
    let second = parse_timestamp_number(&timestamp[17..19])?;
    let nanosecond = parse_timestamp_fraction(fraction)?;

    if year < 1970
        || !(1..=12).contains(&month)
        || day < 1
        || day > days_in_month(year, month)
        || hour > 23
        || minute > 59
        || second > 59
    {
        return None;
    }

    let epoch_days = days_since_unix_epoch(year, month, day);
    Some(DashboardQueryTimestamp {
        epoch_seconds: epoch_days * SECONDS_PER_DAY + hour * 3600 + minute * 60 + second,
        nanosecond,
    })
}

fn parse_timestamp_number(value: &str) -> Option<i64> {
    if !value.chars().all(|ch| ch.is_ascii_digit()) {
        return None;
    }
    value.parse::<i64>().ok()
}

fn parse_timestamp_fraction(fraction: Option<&str>) -> Option<i64> {
    let Some(fraction) = fraction else {
        return Some(0);
    };
    if fraction.is_empty() || fraction.len() > 9 || !fraction.chars().all(|ch| ch.is_ascii_digit())
    {
        return None;
    }
    let mut nanosecond = fraction.parse::<i64>().ok()?;
    for _ in fraction.len()..9 {
        nanosecond *= 10;
    }
    Some(nanosecond)
}

fn seconds_between(start: DashboardQueryTimestamp, end: DashboardQueryTimestamp) -> f64 {
    let start_nanos =
        i128::from(start.epoch_seconds) * NANOS_PER_SECOND + i128::from(start.nanosecond);
    let end_nanos = i128::from(end.epoch_seconds) * NANOS_PER_SECOND + i128::from(end.nanosecond);
    (end_nanos - start_nanos) as f64 / NANOS_PER_SECOND as f64
}

fn finite_rate(value: f64) -> f64 {
    if value.is_finite() && value >= 0.0 {
        value
    } else {
        0.0
    }
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
