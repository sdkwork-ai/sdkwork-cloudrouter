use crate::error::{RepositoryError, RepositoryResult};
use crate::modality;
use crate::types::{
    AdminAnalyticsInsight, AdminAnalyticsModelRankItem, AdminAnalyticsModelRankings,
    AdminAnalyticsPieItem, AdminAnalyticsSnapshot, AdminAnalyticsSummary, AdminAnalyticsTimeRange,
    AdminAnalyticsTrendPoint, AdminAnalyticsUserRankItem, AdminAnalyticsUserRankings,
};
use sdkwork_clawrouter_router_service::domain::DecimalValue;
use sdkwork_models_catalog_service::domain::parse_model_catalog_identity;

pub(crate) const PI_LIMIT: usize = 8;
pub(crate) const USER_MODEL_LIMIT: usize = 5;

const COLORS: [&str; 10] = [
    "#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#65a30d",
    "#ea580c", "#475569",
];
const DECIMAL_SCALE_FACTOR: i128 = 1_000_000_000_000;
const PERCENT_DECIMAL_SCALE_FACTOR: i128 = 100 * DECIMAL_SCALE_FACTOR;

#[derive(Debug, Clone)]
pub(crate) struct AnalyticsSummaryRow {
    pub total_users: i64,
    pub active_users: i64,
    pub active_models: i64,
    pub total_requests: i64,
    pub failed_requests: i64,
    pub total_tokens: DecimalValue,
    pub total_points: DecimalValue,
    pub upstream_cost: DecimalValue,
}

#[derive(Debug, Clone)]
pub(crate) struct AnalyticsTrendRow {
    pub time: String,
    pub requests: DecimalValue,
    pub tokens: DecimalValue,
    pub points: DecimalValue,
    pub users: i64,
}

#[derive(Debug, Clone)]
pub(crate) struct AnalyticsUserRankRow {
    pub user_id: String,
    pub user_name: String,
    pub request_count: i64,
    pub total_tokens: DecimalValue,
    pub points: DecimalValue,
}

#[derive(Debug, Clone)]
pub(crate) struct AnalyticsModelRankRow {
    pub model: String,
    pub catalog_key: String,
    pub vendor: String,
    pub modality: Option<i64>,
    pub request_count: i64,
    pub total_tokens: DecimalValue,
    pub points: DecimalValue,
    pub upstream_cost: DecimalValue,
    pub user_count: i64,
    pub failed_requests: i64,
}

#[derive(Debug, Clone)]
pub(crate) struct AnalyticsPieRow {
    pub name: String,
    pub value: DecimalValue,
}

#[derive(Debug, Clone)]
pub(crate) struct AnalyticsSnapshotInput {
    pub time_range: AdminAnalyticsTimeRange,
    pub start_time: String,
    pub end_time: String,
    pub limit: i64,
    pub summary_row: AnalyticsSummaryRow,
    pub trend_rows: Vec<AnalyticsTrendRow>,
    pub user_points_rows: Vec<AnalyticsUserRankRow>,
    pub user_tokens_rows: Vec<AnalyticsUserRankRow>,
    pub user_requests_rows: Vec<AnalyticsUserRankRow>,
    pub model_points_rows: Vec<AnalyticsModelRankRow>,
    pub model_tokens_rows: Vec<AnalyticsModelRankRow>,
    pub model_requests_rows: Vec<AnalyticsModelRankRow>,
    pub user_model_distributions: Vec<(String, Vec<AnalyticsPieRow>)>,
    pub model_distribution_rows: Vec<AnalyticsPieRow>,
    pub modality_distribution_rows: Vec<AnalyticsPieRow>,
}

pub(crate) fn build_snapshot(
    input: AnalyticsSnapshotInput,
) -> RepositoryResult<AdminAnalyticsSnapshot> {
    let AnalyticsSnapshotInput {
        time_range,
        start_time,
        end_time,
        limit,
        summary_row,
        trend_rows,
        user_points_rows,
        user_tokens_rows,
        user_requests_rows,
        model_points_rows,
        model_tokens_rows,
        model_requests_rows,
        user_model_distributions,
        model_distribution_rows,
        modality_distribution_rows,
    } = input;
    let summary = build_summary(summary_row)?;
    let top_user_requests = user_requests_rows
        .first()
        .map(|item| item.request_count)
        .unwrap_or_default();
    let top_model_requests = model_requests_rows
        .first()
        .map(|item| item.request_count)
        .unwrap_or_default();
    let total_requests = summary.total_requests;
    let failed_requests = summary.failed_requests;
    Ok(AdminAnalyticsSnapshot {
        time_range,
        start_time,
        end_time,
        limit,
        summary,
        trend: trend_rows
            .into_iter()
            .map(|row| AdminAnalyticsTrendPoint {
                time: row.time,
                requests: row.requests,
                tokens: row.tokens,
                points: row.points,
                users: row.users,
            })
            .collect(),
        user_rankings: AdminAnalyticsUserRankings {
            points: map_user_rows(user_points_rows, &user_model_distributions),
            tokens: map_user_rows(user_tokens_rows, &user_model_distributions),
            requests: map_user_rows(user_requests_rows, &user_model_distributions),
        },
        model_rankings: AdminAnalyticsModelRankings {
            points: map_model_rows(model_points_rows)?,
            tokens: map_model_rows(model_tokens_rows)?,
            requests: map_model_rows(model_requests_rows)?,
        },
        model_distribution: map_pie_rows(model_distribution_rows),
        modality_distribution: map_pie_rows(modality_distribution_rows),
        insights: build_insights(
            total_requests,
            top_user_requests,
            top_model_requests,
            failed_requests,
        )?,
    })
}

fn build_summary(row: AnalyticsSummaryRow) -> RepositoryResult<AdminAnalyticsSummary> {
    if row.failed_requests > row.total_requests {
        return Err(RepositoryError::new(
            "admin analytics failed request count exceeds total requests",
        ));
    }
    let successful_requests = row.total_requests - row.failed_requests;
    Ok(AdminAnalyticsSummary {
        total_users: row.total_users,
        active_users: row.active_users,
        active_models: row.active_models,
        total_requests: row.total_requests,
        successful_requests,
        failed_requests: row.failed_requests,
        total_tokens: row.total_tokens,
        total_points: row.total_points,
        upstream_cost: row.upstream_cost,
        average_tokens_per_request: safe_ratio(row.total_tokens, row.total_requests)?,
        average_points_per_request: safe_ratio(row.total_points, row.total_requests)?,
        error_rate: safe_percent(row.failed_requests, row.total_requests)?,
    })
}

fn map_user_rows(
    rows: Vec<AnalyticsUserRankRow>,
    model_distributions: &[(String, Vec<AnalyticsPieRow>)],
) -> Vec<AdminAnalyticsUserRankItem> {
    rows.into_iter()
        .enumerate()
        .map(|(index, row)| {
            let model_distribution = model_distributions
                .iter()
                .find(|(user_id, _)| user_id == &row.user_id)
                .map(|(_, values)| values.clone())
                .unwrap_or_default();
            AdminAnalyticsUserRankItem {
                rank: index as i64 + 1,
                user_id: row.user_id,
                user_name: row.user_name,
                email: None,
                request_count: row.request_count,
                total_tokens: row.total_tokens,
                points: row.points,
                model_distribution: map_pie_rows(model_distribution),
            }
        })
        .collect()
}

fn map_model_rows(
    rows: Vec<AnalyticsModelRankRow>,
) -> RepositoryResult<Vec<AdminAnalyticsModelRankItem>> {
    rows.into_iter()
        .enumerate()
        .map(|(index, row)| {
            Ok(AdminAnalyticsModelRankItem {
                rank: index as i64 + 1,
                model: row.model,
                catalog_key: row.catalog_key,
                vendor: row.vendor,
                modality: modality_label(row.modality),
                request_count: row.request_count,
                total_tokens: row.total_tokens,
                points: row.points,
                upstream_cost: row.upstream_cost,
                user_count: row.user_count,
                average_tokens_per_request: safe_ratio(row.total_tokens, row.request_count)?,
                error_rate: safe_percent(row.failed_requests, row.request_count)?,
            })
        })
        .collect()
}

fn map_pie_rows(rows: Vec<AnalyticsPieRow>) -> Vec<AdminAnalyticsPieItem> {
    rows.into_iter()
        .enumerate()
        .map(|(index, row)| AdminAnalyticsPieItem {
            name: if sdkwork_utils_rust::is_blank(Some(row.name.as_str())) {
                "unknown".to_owned()
            } else {
                row.name
            },
            value: row.value,
            color: color_for_index(index),
        })
        .collect()
}

fn build_insights(
    total_requests: i64,
    top_user_requests: i64,
    top_model_requests: i64,
    failed_requests: i64,
) -> RepositoryResult<Vec<AdminAnalyticsInsight>> {
    Ok(vec![
        AdminAnalyticsInsight {
            key: "topUserShare".to_owned(),
            title: "admin.analytics.insights.topUserShare.title".to_owned(),
            value: format_ratio_percent(top_user_requests, total_requests)?,
            severity: concentration_severity(top_user_requests, total_requests).to_owned(),
            detail: "admin.analytics.insights.topUserShare.detail".to_owned(),
        },
        AdminAnalyticsInsight {
            key: "topModelShare".to_owned(),
            title: "admin.analytics.insights.topModelShare.title".to_owned(),
            value: format_ratio_percent(top_model_requests, total_requests)?,
            severity: concentration_severity(top_model_requests, total_requests).to_owned(),
            detail: "admin.analytics.insights.topModelShare.detail".to_owned(),
        },
        AdminAnalyticsInsight {
            key: "errorRate".to_owned(),
            title: "admin.analytics.insights.errorRate.title".to_owned(),
            value: format_ratio_percent(failed_requests, total_requests)?,
            severity: if request_share_at_least(failed_requests, total_requests, 5) {
                "warning"
            } else {
                "info"
            }
            .to_owned(),
            detail: "admin.analytics.insights.errorRate.detail".to_owned(),
        },
    ])
}

pub(crate) fn color_for_index(index: usize) -> String {
    COLORS[index % COLORS.len()].to_owned()
}

pub(crate) fn modality_label(value: Option<i64>) -> String {
    modality::label(value).to_owned()
}

pub(crate) fn safe_ratio(value: DecimalValue, denominator: i64) -> RepositoryResult<DecimalValue> {
    if denominator <= 0 {
        Ok(DecimalValue::ZERO)
    } else {
        value
            .divide_i64(denominator)
            .map_err(|error| RepositoryError::new(error.to_string()))
    }
}

pub(crate) fn safe_percent(value: i64, denominator: i64) -> RepositoryResult<DecimalValue> {
    if denominator <= 0 {
        return Ok(DecimalValue::ZERO);
    }
    validate_ratio(value, denominator)?;
    let scaled = rounded_ratio(value, denominator, PERCENT_DECIMAL_SCALE_FACTOR)?;
    let whole = scaled / DECIMAL_SCALE_FACTOR;
    let fraction = scaled % DECIMAL_SCALE_FACTOR;
    DecimalValue::parse(&format!("{whole}.{fraction:012}"))
        .map_err(|error| RepositoryError::new(error.to_string()))
}

fn request_share_at_least(value: i64, denominator: i64, percentage: i64) -> bool {
    if value < 0 || denominator <= 0 || percentage < 0 {
        false
    } else {
        i128::from(value) * 100 >= i128::from(denominator) * i128::from(percentage)
    }
}

fn format_ratio_percent(value: i64, denominator: i64) -> RepositoryResult<String> {
    if denominator <= 0 {
        return Ok("0.0%".to_owned());
    }
    validate_ratio(value, denominator)?;
    let tenths = rounded_ratio(value, denominator, 1_000)?;
    Ok(format!("{}.{:01}%", tenths / 10, tenths % 10))
}

fn validate_ratio(value: i64, denominator: i64) -> RepositoryResult<()> {
    if value < 0 {
        return Err(RepositoryError::new(
            "admin analytics percentage numerator must not be negative",
        ));
    }
    if value > denominator {
        return Err(RepositoryError::new(
            "admin analytics percentage numerator exceeds denominator",
        ));
    }
    Ok(())
}

fn rounded_ratio(value: i64, denominator: i64, scale: i128) -> RepositoryResult<i128> {
    let numerator = i128::from(value)
        .checked_mul(scale)
        .ok_or_else(|| RepositoryError::new("admin analytics percentage overflow"))?;
    let rounding = i128::from(denominator) / 2;
    numerator
        .checked_add(rounding)
        .and_then(|rounded| rounded.checked_div(i128::from(denominator)))
        .ok_or_else(|| RepositoryError::new("admin analytics percentage overflow"))
}

pub(crate) fn vendor_from_catalog_key(catalog_key: &str, fallback_model: &str) -> String {
    if let Some(identity) = parse_model_catalog_identity(catalog_key) {
        identity.vendor_code
    } else {
        let model = fallback_model.trim();
        if model.is_empty() {
            "unknown".to_owned()
        } else {
            model.to_owned()
        }
    }
}

pub(crate) fn concentration_severity(value: i64, denominator: i64) -> &'static str {
    if request_share_at_least(value, denominator, 80) {
        "warning"
    } else {
        "info"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn percentages_round_half_up_without_binary_floating_point() {
        assert_eq!("16.7%", format_ratio_percent(1, 6).unwrap());
        assert_eq!("66.7%", format_ratio_percent(2, 3).unwrap());
        assert_eq!("0.0%", format_ratio_percent(0, 0).unwrap());
        assert_eq!(
            "16.666666666667",
            safe_percent(1, 6).unwrap().to_fixed_string(12)
        );
    }

    #[test]
    fn percentages_reject_inconsistent_counts() {
        assert!(safe_percent(-1, 10).is_err());
        assert!(safe_percent(11, 10).is_err());
        assert!(format_ratio_percent(11, 10).is_err());
    }
}
