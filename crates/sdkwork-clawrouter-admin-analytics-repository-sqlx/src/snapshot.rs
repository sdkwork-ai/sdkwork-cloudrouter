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

pub(crate) fn build_snapshot(
    time_range: AdminAnalyticsTimeRange,
    start_time: String,
    end_time: String,
    limit: i64,
    summary_row: AnalyticsSummaryRow,
    trend_rows: Vec<AnalyticsTrendRow>,
    user_points_rows: Vec<AnalyticsUserRankRow>,
    user_tokens_rows: Vec<AnalyticsUserRankRow>,
    user_requests_rows: Vec<AnalyticsUserRankRow>,
    model_points_rows: Vec<AnalyticsModelRankRow>,
    model_tokens_rows: Vec<AnalyticsModelRankRow>,
    model_requests_rows: Vec<AnalyticsModelRankRow>,
    user_model_distributions: Vec<(String, Vec<AnalyticsPieRow>)>,
    model_distribution_rows: Vec<AnalyticsPieRow>,
    modality_distribution_rows: Vec<AnalyticsPieRow>,
) -> RepositoryResult<AdminAnalyticsSnapshot> {
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
    let error_rate = summary.error_rate;

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
            error_rate,
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
    error_rate: DecimalValue,
) -> RepositoryResult<Vec<AdminAnalyticsInsight>> {
    let top_user_share = safe_percent(top_user_requests, total_requests)?;
    let top_model_share = safe_percent(top_model_requests, total_requests)?;
    Ok(vec![
        AdminAnalyticsInsight {
            key: "topUserShare".to_owned(),
            title: "admin.analytics.insights.topUserShare.title".to_owned(),
            value: format_percent(top_user_share),
            severity: concentration_severity(top_user_requests, total_requests).to_owned(),
            detail: "admin.analytics.insights.topUserShare.detail".to_owned(),
        },
        AdminAnalyticsInsight {
            key: "topModelShare".to_owned(),
            title: "admin.analytics.insights.topModelShare.title".to_owned(),
            value: format_percent(top_model_share),
            severity: concentration_severity(top_model_requests, total_requests).to_owned(),
            detail: "admin.analytics.insights.topModelShare.detail".to_owned(),
        },
        AdminAnalyticsInsight {
            key: "errorRate".to_owned(),
            title: "admin.analytics.insights.errorRate.title".to_owned(),
            value: format_percent(error_rate),
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
    if value < 0 {
        return Err(RepositoryError::new(
            "admin analytics percentage numerator must not be negative",
        ));
    }
    DecimalValue::parse(&value.to_string())
        .and_then(|decimal| decimal.multiply_i64(100))
        .and_then(|decimal| decimal.divide_i64(denominator))
        .map_err(|error| RepositoryError::new(error.to_string()))
}

fn request_share_at_least(value: i64, denominator: i64, percentage: i64) -> bool {
    if value < 0 || denominator <= 0 || percentage < 0 {
        false
    } else {
        i128::from(value) * 100 >= i128::from(denominator) * i128::from(percentage)
    }
}

pub(crate) fn format_percent(value: DecimalValue) -> String {
    format!("{}%", value.to_fixed_string(1))
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

pub(crate) fn scope_filter(
    tenant_column: &str,
    organization_column: &str,
    tenant_placeholder: &str,
    organization_placeholder: &str,
) -> String {
    format!(
        "{tenant_column} = {tenant_placeholder}\n          AND ({organization_column} = {organization_placeholder} OR {organization_column} = 0 OR {organization_column} IS NULL)"
    )
}
