use std::collections::HashMap;

use sqlx::{Row, SqlitePool};

use crate::error::{store_error, RepositoryError};
use crate::snapshot::{
    color_for_index, concentration_severity, format_percent, modality_label, safe_percent,
    safe_ratio, scope_filter, vendor_from_catalog_key,
};
use crate::types::{
    AdminAnalyticsInsight, AdminAnalyticsModelRankItem, AdminAnalyticsModelRankings,
    AdminAnalyticsPieItem, AdminAnalyticsQuery, AdminAnalyticsReadFuture, AdminAnalyticsReadStore,
    AdminAnalyticsSnapshot, AdminAnalyticsSubject, AdminAnalyticsSummary, AdminAnalyticsTimeRange,
    AdminAnalyticsTrendPoint, AdminAnalyticsUserRankItem, AdminAnalyticsUserRankings,
};

const USER_KEY_EXPR: &str = "COALESCE(CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), NULLIF(owner_name_snapshot, ''), 'unknown')";
const USER_ID_EXPR: &str = USER_KEY_EXPR;
const USER_NAME_EXPR: &str = "COALESCE(NULLIF(owner_name_snapshot, ''), CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), 'unknown')";
const MODEL_KEY_EXPR: &str = "COALESCE(NULLIF(model, ''), NULLIF(catalog_key, ''), 'unknown')";
const REQUEST_COUNT_EXPR: &str = "COALESCE(request_count, 1)";
const TOKEN_COUNT_EXPR: &str =
    "COALESCE(total_tokens, prompt_tokens + completion_tokens + cached_tokens, 0)";
const POINTS_EXPR: &str = "COALESCE(customer_charge_amount, cost_amount, 0)";
const UPSTREAM_COST_EXPR: &str = "COALESCE(upstream_cost_amount, cost_amount, 0)";
const PI_LIMIT: usize = 8;
const USER_MODEL_LIMIT: usize = 5;

#[derive(Debug, Clone)]
struct UserAggregate {
    user_id: String,
    user_name: String,
    request_count: i64,
    total_tokens: f64,
    points: f64,
    model_counts: HashMap<String, f64>,
}

#[derive(Debug, Clone)]
struct ModelAggregate {
    model: String,
    catalog_key: String,
    request_count: i64,
    total_tokens: f64,
    points: f64,
    upstream_cost: f64,
    user_count: i64,
    failed_requests: i64,
    modality: Option<i64>,
}

#[derive(Debug, Clone)]
struct ModelFailedRequest {
    model: String,
    catalog_key: String,
    modality: Option<i64>,
    failed_requests: i64,
}

#[derive(Debug, Clone)]
pub struct SqliteAdminAnalyticsReadStore {
    pool: SqlitePool,
}

impl SqliteAdminAnalyticsReadStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

impl AdminAnalyticsReadStore for SqliteAdminAnalyticsReadStore {
    fn load_admin_analytics<'a>(
        &'a self,
        query: AdminAnalyticsQuery,
    ) -> AdminAnalyticsReadFuture<'a> {
        Box::pin(async move {
            let subject = query.subject;
            let limit = query.limit.clamp(3, 50);
            let summary = load_summary(&self.pool, &query, subject).await?;
            let trend = load_trend(&self.pool, &query, subject).await?;
            let user_aggregates = load_user_aggregates(&self.pool, &query, subject).await?;
            let model_failed_requests =
                load_model_failed_requests(&self.pool, &query, subject).await?;
            let model_aggregates =
                load_model_aggregates(&self.pool, &query, subject, &model_failed_requests).await?;
            let model_distribution =
                load_distribution(&self.pool, &query, subject, MODEL_KEY_EXPR, PI_LIMIT).await?;
            let modality_distribution = load_distribution(
                &self.pool,
                &query,
                subject,
                "COALESCE(CAST(modality AS TEXT), 'unknown')",
                PI_LIMIT,
            )
            .await?;
            let modality_distribution = modality_distribution
                .into_iter()
                .map(|mut item| {
                    item.name = modality_label(item.name.parse::<i64>().ok());
                    item
                })
                .collect();

            Ok(build_snapshot(
                query.time_range,
                query.start_time,
                query.end_time,
                limit,
                summary,
                trend,
                user_aggregates,
                model_aggregates,
                model_distribution,
                modality_distribution,
            ))
        })
    }
}

fn build_snapshot(
    time_range: AdminAnalyticsTimeRange,
    start_time: Option<String>,
    end_time: Option<String>,
    limit: i64,
    summary: AdminAnalyticsSummary,
    trend: Vec<AdminAnalyticsTrendPoint>,
    user_aggregates: Vec<UserAggregate>,
    model_aggregates: Vec<ModelAggregate>,
    model_distribution: Vec<AdminAnalyticsPieItem>,
    modality_distribution: Vec<AdminAnalyticsPieItem>,
) -> AdminAnalyticsSnapshot {
    let top_user_requests = user_aggregates
        .iter()
        .map(|item| item.request_count)
        .max()
        .unwrap_or_default();
    let top_model_requests = model_aggregates
        .iter()
        .map(|item| item.request_count)
        .max()
        .unwrap_or_default();

    AdminAnalyticsSnapshot {
        time_range,
        start_time,
        end_time,
        limit,
        summary: summary.clone(),
        trend,
        user_rankings: AdminAnalyticsUserRankings {
            points: rank_users(&user_aggregates, UserRankMetric::Points, limit),
            tokens: rank_users(&user_aggregates, UserRankMetric::Tokens, limit),
            requests: rank_users(&user_aggregates, UserRankMetric::Requests, limit),
        },
        model_rankings: AdminAnalyticsModelRankings {
            points: rank_models(&model_aggregates, ModelRankMetric::Points, limit),
            tokens: rank_models(&model_aggregates, ModelRankMetric::Tokens, limit),
            requests: rank_models(&model_aggregates, ModelRankMetric::Requests, limit),
        },
        model_distribution,
        modality_distribution,
        insights: vec![
            AdminAnalyticsInsight {
                key: "topUserShare".to_owned(),
                title: "admin.analytics.insights.topUserShare.title".to_owned(),
                value: format_percent(safe_percent(top_user_requests, summary.total_requests)),
                severity: concentration_severity(safe_percent(
                    top_user_requests,
                    summary.total_requests,
                ))
                .to_owned(),
                detail: "admin.analytics.insights.topUserShare.detail".to_owned(),
            },
            AdminAnalyticsInsight {
                key: "topModelShare".to_owned(),
                title: "admin.analytics.insights.topModelShare.title".to_owned(),
                value: format_percent(safe_percent(top_model_requests, summary.total_requests)),
                severity: concentration_severity(safe_percent(
                    top_model_requests,
                    summary.total_requests,
                ))
                .to_owned(),
                detail: "admin.analytics.insights.topModelShare.detail".to_owned(),
            },
            AdminAnalyticsInsight {
                key: "errorRate".to_owned(),
                title: "admin.analytics.insights.errorRate.title".to_owned(),
                value: format_percent(summary.error_rate),
                severity: if summary.error_rate >= 5.0 {
                    "warning".to_owned()
                } else {
                    "info".to_owned()
                },
                detail: "admin.analytics.insights.errorRate.detail".to_owned(),
            },
        ],
    }
}

async fn load_summary(
    pool: &SqlitePool,
    query: &AdminAnalyticsQuery,
    subject: AdminAnalyticsSubject,
) -> Result<AdminAnalyticsSummary, RepositoryError> {
    let row = sqlx::query(&format!(
        r#"
        WITH usage_fact AS (
            SELECT
                {USER_KEY_EXPR} AS user_key,
                {MODEL_KEY_EXPR} AS model_key,
                {REQUEST_COUNT_EXPR} AS request_count,
                {TOKEN_COUNT_EXPR} AS total_tokens,
                {POINTS_EXPR} AS points,
                {UPSTREAM_COST_EXPR} AS upstream_cost,
                COALESCE(NULLIF(request_id, ''), CAST(id AS TEXT)) AS request_key
            FROM ai_usage_fact
            WHERE status = 1
              AND {usage_scope}
              AND (?3 IS NULL OR occurred_at >= ?3)
              AND (?4 IS NULL OR occurred_at <= ?4)
        )
        SELECT
            CAST(COALESCE(COUNT(DISTINCT user_key), 0) AS TEXT) AS total_users,
            CAST(COALESCE(COUNT(DISTINCT model_key), 0) AS TEXT) AS active_models,
            CAST(COALESCE(SUM(request_count), 0) AS TEXT) AS total_requests,
            CAST(COALESCE(SUM(total_tokens), 0) AS TEXT) AS total_tokens,
            CAST(COALESCE(SUM(points), 0) AS TEXT) AS total_points,
            CAST(COALESCE(SUM(upstream_cost), 0) AS TEXT) AS upstream_cost
        FROM usage_fact
        "#,
        USER_KEY_EXPR = USER_KEY_EXPR,
        MODEL_KEY_EXPR = MODEL_KEY_EXPR,
        REQUEST_COUNT_EXPR = REQUEST_COUNT_EXPR,
        TOKEN_COUNT_EXPR = TOKEN_COUNT_EXPR,
        POINTS_EXPR = POINTS_EXPR,
        UPSTREAM_COST_EXPR = UPSTREAM_COST_EXPR,
        usage_scope = scope_filter("tenant_id", "organization_id", "?1", "?2"),
    ))
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(query.start_time.as_deref())
    .bind(query.end_time.as_deref())
    .fetch_one(pool)
    .await
    .map_err(|error| store_error("admin analytics query", error))?;

    let total_requests = integer_cell(&row, "total_requests");
    let failed_requests = load_failed_requests(pool, query, subject).await?;
    Ok(AdminAnalyticsSummary {
        total_users: integer_cell(&row, "total_users"),
        active_users: integer_cell(&row, "total_users"),
        active_models: integer_cell(&row, "active_models"),
        total_requests,
        successful_requests: (total_requests - failed_requests).max(0),
        failed_requests,
        total_tokens: decimal_cell(&row, "total_tokens"),
        total_points: decimal_cell(&row, "total_points"),
        upstream_cost: decimal_cell(&row, "upstream_cost"),
        average_tokens_per_request: safe_ratio(decimal_cell(&row, "total_tokens"), total_requests),
        average_points_per_request: safe_ratio(decimal_cell(&row, "total_points"), total_requests),
        error_rate: safe_percent(failed_requests, total_requests),
    })
}

async fn load_failed_requests(
    pool: &SqlitePool,
    query: &AdminAnalyticsQuery,
    subject: AdminAnalyticsSubject,
) -> Result<i64, RepositoryError> {
    let row = sqlx::query(&format!(
        r#"
        SELECT CAST(COALESCE(COUNT(DISTINCT COALESCE(NULLIF(t.request_id, ''), CAST(t.id AS TEXT))), 0) AS TEXT) AS failed_requests
        FROM ai_request_trace t
        INNER JOIN ai_usage_fact usage
          ON usage.tenant_id = t.tenant_id
         AND usage.organization_id = t.organization_id
         AND usage.status = 1
         AND NULLIF(usage.request_id, '') IS NOT NULL
         AND usage.request_id = t.request_id
        WHERE t.status = 1
          AND {trace_scope}
          AND t.started_at IS NOT NULL
          AND (?3 IS NULL OR t.started_at >= ?3)
          AND (?4 IS NULL OR t.started_at <= ?4)
          AND (?3 IS NULL OR usage.occurred_at >= ?3)
          AND (?4 IS NULL OR usage.occurred_at <= ?4)
          AND (
            (t.http_status IS NOT NULL AND t.http_status >= 400)
            OR t.error_type IS NOT NULL
            OR NULLIF(t.provider_error_code, '') IS NOT NULL
          )
        "#,
        trace_scope = scope_filter("t.tenant_id", "t.organization_id", "?1", "?2"),
    ))
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(query.start_time.as_deref())
    .bind(query.end_time.as_deref())
    .fetch_one(pool)
    .await
    .map_err(|error| store_error("admin analytics query", error))?;

    Ok(integer_cell(&row, "failed_requests"))
}

async fn load_trend(
    pool: &SqlitePool,
    query: &AdminAnalyticsQuery,
    subject: AdminAnalyticsSubject,
) -> Result<Vec<AdminAnalyticsTrendPoint>, RepositoryError> {
    let period_expr = period_expression(query.time_range);
    let sql = format!(
        r#"
        SELECT
            period,
            CAST(COALESCE(SUM(request_count), 0) AS TEXT) AS requests,
            CAST(COALESCE(SUM(total_tokens), 0) AS TEXT) AS tokens,
            CAST(COALESCE(SUM(points), 0) AS TEXT) AS points,
            CAST(COALESCE(COUNT(DISTINCT user_key), 0) AS TEXT) AS users
        FROM (
            SELECT
                {period_expr} AS period,
                {USER_KEY_EXPR} AS user_key,
                {REQUEST_COUNT_EXPR} AS request_count,
                {TOKEN_COUNT_EXPR} AS total_tokens,
                {POINTS_EXPR} AS points
            FROM ai_usage_fact
            WHERE status = 1
              AND {usage_scope}
              AND occurred_at IS NOT NULL
              AND (?3 IS NULL OR occurred_at >= ?3)
              AND (?4 IS NULL OR occurred_at <= ?4)
        )
        GROUP BY period
        ORDER BY period ASC
        LIMIT 30
        "#,
        period_expr = period_expr,
        USER_KEY_EXPR = USER_KEY_EXPR,
        REQUEST_COUNT_EXPR = REQUEST_COUNT_EXPR,
        TOKEN_COUNT_EXPR = TOKEN_COUNT_EXPR,
        POINTS_EXPR = POINTS_EXPR,
        usage_scope = scope_filter("tenant_id", "organization_id", "?1", "?2"),
    );
    let rows = sqlx::query(&sql)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(query.start_time.as_deref())
        .bind(query.end_time.as_deref())
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("admin analytics query", error))?;

    Ok(rows
        .into_iter()
        .map(|row| AdminAnalyticsTrendPoint {
            time: string_cell(&row, "period"),
            requests: decimal_cell(&row, "requests"),
            tokens: decimal_cell(&row, "tokens"),
            points: decimal_cell(&row, "points"),
            users: integer_cell(&row, "users"),
        })
        .collect())
}

async fn load_user_aggregates(
    pool: &SqlitePool,
    query: &AdminAnalyticsQuery,
    subject: AdminAnalyticsSubject,
) -> Result<Vec<UserAggregate>, RepositoryError> {
    let sql = format!(
        r#"
        SELECT
            user_id,
            user_name,
            model,
            CAST(COALESCE(SUM(request_count), 0) AS TEXT) AS request_count,
            CAST(COALESCE(SUM(total_tokens), 0) AS TEXT) AS total_tokens,
            CAST(COALESCE(SUM(points), 0) AS TEXT) AS points
        FROM (
            SELECT
                {USER_ID_EXPR} AS user_id,
                {USER_NAME_EXPR} AS user_name,
                {MODEL_KEY_EXPR} AS model,
                {REQUEST_COUNT_EXPR} AS request_count,
                {TOKEN_COUNT_EXPR} AS total_tokens,
                {POINTS_EXPR} AS points
            FROM ai_usage_fact
            WHERE status = 1
              AND {usage_scope}
              AND (?3 IS NULL OR occurred_at >= ?3)
              AND (?4 IS NULL OR occurred_at <= ?4)
        )
        GROUP BY user_id, user_name, model
        ORDER BY SUM(points) DESC, SUM(total_tokens) DESC, SUM(request_count) DESC, user_name ASC
        "#,
        USER_ID_EXPR = USER_ID_EXPR,
        USER_NAME_EXPR = USER_NAME_EXPR,
        MODEL_KEY_EXPR = MODEL_KEY_EXPR,
        REQUEST_COUNT_EXPR = REQUEST_COUNT_EXPR,
        TOKEN_COUNT_EXPR = TOKEN_COUNT_EXPR,
        POINTS_EXPR = POINTS_EXPR,
        usage_scope = scope_filter("tenant_id", "organization_id", "?1", "?2"),
    );
    let rows = sqlx::query(&sql)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(query.start_time.as_deref())
        .bind(query.end_time.as_deref())
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("admin analytics query", error))?;

    let mut aggregates: HashMap<String, UserAggregate> = HashMap::new();
    for row in rows {
        let user_id = string_cell(&row, "user_id");
        let user_name = string_cell(&row, "user_name");
        let model = string_cell(&row, "model");
        let request_count = integer_cell(&row, "request_count");
        let total_tokens = decimal_cell(&row, "total_tokens");
        let points = decimal_cell(&row, "points");
        let entry = aggregates
            .entry(user_id.clone())
            .or_insert_with(|| UserAggregate {
                user_id: user_id.clone(),
                user_name: user_name.clone(),
                request_count: 0,
                total_tokens: 0.0,
                points: 0.0,
                model_counts: HashMap::new(),
            });
        entry.user_name = user_name;
        entry.request_count += request_count;
        entry.total_tokens += total_tokens;
        entry.points += points;
        *entry.model_counts.entry(model).or_insert(0.0) += points;
    }

    Ok(aggregates.into_values().collect())
}

async fn load_model_aggregates(
    pool: &SqlitePool,
    query: &AdminAnalyticsQuery,
    subject: AdminAnalyticsSubject,
    model_failed_requests: &[ModelFailedRequest],
) -> Result<Vec<ModelAggregate>, RepositoryError> {
    let sql = format!(
        r#"
        SELECT
            model,
            catalog_key,
            CAST(COALESCE(SUM(request_count), 0) AS TEXT) AS request_count,
            CAST(COALESCE(SUM(total_tokens), 0) AS TEXT) AS total_tokens,
            CAST(COALESCE(SUM(points), 0) AS TEXT) AS points,
            CAST(COALESCE(SUM(upstream_cost), 0) AS TEXT) AS upstream_cost,
            CAST(COALESCE(COUNT(DISTINCT user_id), 0) AS TEXT) AS user_count,
            modality
        FROM (
            SELECT
                {MODEL_KEY_EXPR} AS model,
                COALESCE(NULLIF(catalog_key, ''), {MODEL_KEY_EXPR}) AS catalog_key,
                {USER_ID_EXPR} AS user_id,
                {REQUEST_COUNT_EXPR} AS request_count,
                {TOKEN_COUNT_EXPR} AS total_tokens,
                {POINTS_EXPR} AS points,
                {UPSTREAM_COST_EXPR} AS upstream_cost,
                modality
            FROM ai_usage_fact
            WHERE status = 1
              AND {usage_scope}
              AND (?3 IS NULL OR occurred_at >= ?3)
              AND (?4 IS NULL OR occurred_at <= ?4)
        )
        GROUP BY model, catalog_key, modality
        ORDER BY SUM(points) DESC, SUM(total_tokens) DESC, SUM(request_count) DESC, model ASC
        "#,
        MODEL_KEY_EXPR = MODEL_KEY_EXPR,
        USER_ID_EXPR = USER_ID_EXPR,
        REQUEST_COUNT_EXPR = REQUEST_COUNT_EXPR,
        TOKEN_COUNT_EXPR = TOKEN_COUNT_EXPR,
        POINTS_EXPR = POINTS_EXPR,
        UPSTREAM_COST_EXPR = UPSTREAM_COST_EXPR,
        usage_scope = scope_filter("tenant_id", "organization_id", "?1", "?2"),
    );
    let rows = sqlx::query(&sql)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(query.start_time.as_deref())
        .bind(query.end_time.as_deref())
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("admin analytics query", error))?;

    let mut aggregates = Vec::with_capacity(rows.len());
    for row in rows {
        let model = string_cell(&row, "model");
        let catalog_key = string_cell(&row, "catalog_key");
        let modality = optional_integer_cell(&row, "modality");
        aggregates.push(ModelAggregate {
            failed_requests: failed_requests_for_model(
                model_failed_requests,
                &model,
                &catalog_key,
                modality,
            ),
            model,
            catalog_key,
            request_count: integer_cell(&row, "request_count"),
            total_tokens: decimal_cell(&row, "total_tokens"),
            points: decimal_cell(&row, "points"),
            upstream_cost: decimal_cell(&row, "upstream_cost"),
            user_count: integer_cell(&row, "user_count"),
            modality,
        });
    }

    Ok(aggregates)
}

async fn load_model_failed_requests(
    pool: &SqlitePool,
    query: &AdminAnalyticsQuery,
    subject: AdminAnalyticsSubject,
) -> Result<Vec<ModelFailedRequest>, RepositoryError> {
    let sql = format!(
        r#"
        SELECT
            model,
            catalog_key,
            modality,
            CAST(COALESCE(COUNT(DISTINCT request_key), 0) AS TEXT) AS failed_requests
        FROM (
            SELECT
                {MODEL_KEY_EXPR} AS model,
                COALESCE(NULLIF(usage.catalog_key, ''), {MODEL_KEY_EXPR}) AS catalog_key,
                usage.modality AS modality,
                COALESCE(NULLIF(t.request_id, ''), CAST(t.id AS TEXT)) AS request_key
            FROM ai_request_trace t
            INNER JOIN ai_usage_fact usage
              ON usage.tenant_id = t.tenant_id
             AND usage.organization_id = t.organization_id
             AND usage.status = 1
             AND NULLIF(usage.request_id, '') IS NOT NULL
             AND usage.request_id = t.request_id
            WHERE t.status = 1
              AND {trace_scope}
              AND t.started_at IS NOT NULL
              AND (?3 IS NULL OR t.started_at >= ?3)
              AND (?4 IS NULL OR t.started_at <= ?4)
              AND (?3 IS NULL OR usage.occurred_at >= ?3)
              AND (?4 IS NULL OR usage.occurred_at <= ?4)
              AND (
                (t.http_status IS NOT NULL AND t.http_status >= 400)
                OR t.error_type IS NOT NULL
                OR NULLIF(t.provider_error_code, '') IS NOT NULL
              )
        )
        GROUP BY model, catalog_key, modality
        "#,
        MODEL_KEY_EXPR = MODEL_KEY_EXPR,
        trace_scope = scope_filter("t.tenant_id", "t.organization_id", "?1", "?2"),
    );
    let rows = sqlx::query(&sql)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(query.start_time.as_deref())
        .bind(query.end_time.as_deref())
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("admin analytics query", error))?;

    Ok(rows
        .into_iter()
        .map(|row| ModelFailedRequest {
            model: string_cell(&row, "model"),
            catalog_key: string_cell(&row, "catalog_key"),
            modality: optional_integer_cell(&row, "modality"),
            failed_requests: integer_cell(&row, "failed_requests"),
        })
        .collect())
}

fn failed_requests_for_model(
    failures: &[ModelFailedRequest],
    model: &str,
    catalog_key: &str,
    modality: Option<i64>,
) -> i64 {
    failures
        .iter()
        .find(|item| {
            item.model == model && item.catalog_key == catalog_key && item.modality == modality
        })
        .map(|item| item.failed_requests)
        .unwrap_or_default()
}

async fn load_distribution(
    pool: &SqlitePool,
    query: &AdminAnalyticsQuery,
    subject: AdminAnalyticsSubject,
    value_expr: &str,
    limit: usize,
) -> Result<Vec<AdminAnalyticsPieItem>, RepositoryError> {
    let sql = format!(
        r#"
        SELECT
            name,
            CAST(COALESCE(SUM(value), 0) AS TEXT) AS value
        FROM (
            SELECT
                {value_expr} AS name,
                {REQUEST_COUNT_EXPR} AS value
            FROM ai_usage_fact
            WHERE status = 1
              AND {usage_scope}
              AND (?3 IS NULL OR occurred_at >= ?3)
              AND (?4 IS NULL OR occurred_at <= ?4)
        )
        GROUP BY name
        ORDER BY SUM(value) DESC, name ASC
        "#,
        value_expr = value_expr,
        REQUEST_COUNT_EXPR = REQUEST_COUNT_EXPR,
        usage_scope = scope_filter("tenant_id", "organization_id", "?1", "?2"),
    );
    let rows = sqlx::query(&sql)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(query.start_time.as_deref())
        .bind(query.end_time.as_deref())
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("admin analytics query", error))?;

    Ok(build_pie_items(rows, limit))
}

fn build_pie_items(rows: Vec<sqlx::sqlite::SqliteRow>, limit: usize) -> Vec<AdminAnalyticsPieItem> {
    let mut items: Vec<(String, f64)> = rows
        .into_iter()
        .map(|row| (string_cell(&row, "name"), decimal_cell(&row, "value")))
        .filter(|(_, value)| *value > 0.0)
        .collect();
    items.sort_by(|left, right| {
        right
            .1
            .total_cmp(&left.1)
            .then_with(|| left.0.cmp(&right.0))
    });
    if items.len() > limit {
        let rest: f64 = items.iter().skip(limit).map(|item| item.1).sum();
        items.truncate(limit);
        if rest > 0.0 {
            items.push(("Others".to_owned(), rest));
        }
    }
    items
        .into_iter()
        .enumerate()
        .map(|(index, (name, value))| AdminAnalyticsPieItem {
            name: if name.trim().is_empty() {
                "unknown".to_owned()
            } else {
                name
            },
            value,
            color: color_for_index(index),
        })
        .collect()
}

#[derive(Clone, Copy)]
enum UserRankMetric {
    Points,
    Tokens,
    Requests,
}

#[derive(Clone, Copy)]
enum ModelRankMetric {
    Points,
    Tokens,
    Requests,
}

fn rank_users(
    aggregates: &[UserAggregate],
    metric: UserRankMetric,
    limit: i64,
) -> Vec<AdminAnalyticsUserRankItem> {
    let mut rows = aggregates.to_vec();
    rows.sort_by(|left, right| compare_user(left, right, metric));
    rows.into_iter()
        .take(limit.max(0) as usize)
        .enumerate()
        .map(|(index, aggregate)| AdminAnalyticsUserRankItem {
            rank: index as i64 + 1,
            user_id: aggregate.user_id,
            user_name: aggregate.user_name,
            email: None,
            request_count: aggregate.request_count,
            total_tokens: aggregate.total_tokens,
            points: aggregate.points,
            model_distribution: build_user_model_distribution(&aggregate.model_counts),
        })
        .collect()
}

fn rank_models(
    aggregates: &[ModelAggregate],
    metric: ModelRankMetric,
    limit: i64,
) -> Vec<AdminAnalyticsModelRankItem> {
    let mut rows = aggregates.to_vec();
    rows.sort_by(|left, right| compare_model(left, right, metric));
    rows.into_iter()
        .take(limit.max(0) as usize)
        .enumerate()
        .map(|(index, aggregate)| AdminAnalyticsModelRankItem {
            rank: index as i64 + 1,
            model: aggregate.model.clone(),
            catalog_key: aggregate.catalog_key.clone(),
            vendor: vendor_from_catalog_key(&aggregate.catalog_key, &aggregate.model),
            modality: modality_label(aggregate.modality),
            request_count: aggregate.request_count,
            total_tokens: aggregate.total_tokens,
            points: aggregate.points,
            upstream_cost: aggregate.upstream_cost,
            user_count: aggregate.user_count,
            average_tokens_per_request: safe_ratio(aggregate.total_tokens, aggregate.request_count),
            error_rate: safe_percent(aggregate.failed_requests, aggregate.request_count),
        })
        .collect()
}

fn compare_user(
    left: &UserAggregate,
    right: &UserAggregate,
    metric: UserRankMetric,
) -> std::cmp::Ordering {
    match metric {
        UserRankMetric::Points => right
            .points
            .total_cmp(&left.points)
            .then_with(|| right.total_tokens.total_cmp(&left.total_tokens))
            .then_with(|| right.request_count.cmp(&left.request_count))
            .then_with(|| left.user_name.cmp(&right.user_name))
            .then_with(|| left.user_id.cmp(&right.user_id)),
        UserRankMetric::Tokens => right
            .total_tokens
            .total_cmp(&left.total_tokens)
            .then_with(|| right.points.total_cmp(&left.points))
            .then_with(|| right.request_count.cmp(&left.request_count))
            .then_with(|| left.user_name.cmp(&right.user_name))
            .then_with(|| left.user_id.cmp(&right.user_id)),
        UserRankMetric::Requests => right
            .request_count
            .cmp(&left.request_count)
            .then_with(|| right.total_tokens.total_cmp(&left.total_tokens))
            .then_with(|| right.points.total_cmp(&left.points))
            .then_with(|| left.user_name.cmp(&right.user_name))
            .then_with(|| left.user_id.cmp(&right.user_id)),
    }
}

fn compare_model(
    left: &ModelAggregate,
    right: &ModelAggregate,
    metric: ModelRankMetric,
) -> std::cmp::Ordering {
    match metric {
        ModelRankMetric::Points => right
            .points
            .total_cmp(&left.points)
            .then_with(|| right.total_tokens.total_cmp(&left.total_tokens))
            .then_with(|| right.request_count.cmp(&left.request_count))
            .then_with(|| left.model.cmp(&right.model))
            .then_with(|| left.catalog_key.cmp(&right.catalog_key)),
        ModelRankMetric::Tokens => right
            .total_tokens
            .total_cmp(&left.total_tokens)
            .then_with(|| right.points.total_cmp(&left.points))
            .then_with(|| right.request_count.cmp(&left.request_count))
            .then_with(|| left.model.cmp(&right.model))
            .then_with(|| left.catalog_key.cmp(&right.catalog_key)),
        ModelRankMetric::Requests => right
            .request_count
            .cmp(&left.request_count)
            .then_with(|| right.total_tokens.total_cmp(&left.total_tokens))
            .then_with(|| right.points.total_cmp(&left.points))
            .then_with(|| left.model.cmp(&right.model))
            .then_with(|| left.catalog_key.cmp(&right.catalog_key)),
    }
}

fn build_user_model_distribution(counts: &HashMap<String, f64>) -> Vec<AdminAnalyticsPieItem> {
    let mut items: Vec<(String, f64)> = counts
        .iter()
        .map(|(name, value)| (name.clone(), *value))
        .collect();
    items.sort_by(|left, right| {
        right
            .1
            .total_cmp(&left.1)
            .then_with(|| left.0.cmp(&right.0))
    });
    if items.len() > USER_MODEL_LIMIT {
        let rest: f64 = items.iter().skip(USER_MODEL_LIMIT).map(|item| item.1).sum();
        items.truncate(USER_MODEL_LIMIT);
        if rest > 0.0 {
            items.push(("Others".to_owned(), rest));
        }
    }
    items
        .into_iter()
        .enumerate()
        .map(|(index, (name, value))| AdminAnalyticsPieItem {
            name,
            value,
            color: color_for_index(index),
        })
        .collect()
}

fn period_expression(time_range: AdminAnalyticsTimeRange) -> &'static str {
    match time_range {
        AdminAnalyticsTimeRange::Hourly => "strftime('%Y-%m-%d %H:00', occurred_at)",
        AdminAnalyticsTimeRange::Weekly => "strftime('%Y-W%W', occurred_at)",
        AdminAnalyticsTimeRange::Monthly => "strftime('%Y-%m', occurred_at)",
        AdminAnalyticsTimeRange::Yearly => "strftime('%Y', occurred_at)",
        AdminAnalyticsTimeRange::Daily => "substr(occurred_at, 1, 10)",
    }
}

fn string_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> String {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .unwrap_or_default()
}

fn integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> i64 {
    optional_integer_cell(row, column).unwrap_or(0)
}

fn optional_integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> Option<i64> {
    row.try_get::<Option<i64>, _>(column)
        .ok()
        .flatten()
        .or_else(|| {
            string_cell(row, column)
                .trim()
                .parse::<f64>()
                .ok()
                .map(|value| value as i64)
        })
}

fn decimal_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> f64 {
    row.try_get::<Option<f64>, _>(column)
        .ok()
        .flatten()
        .or_else(|| string_cell(row, column).trim().parse::<f64>().ok())
        .unwrap_or(0.0)
}
