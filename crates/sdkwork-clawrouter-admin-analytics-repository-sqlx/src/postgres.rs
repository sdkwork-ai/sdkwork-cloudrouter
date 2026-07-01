use sqlx::{PgPool, Row};

use crate::error::{store_error, RepositoryError, RepositoryResult};
use crate::modality;
use crate::snapshot::{
    build_snapshot, vendor_from_catalog_key, AnalyticsModelRankRow, AnalyticsPieRow,
    AnalyticsSummaryRow, AnalyticsTrendRow, AnalyticsUserRankRow,
};
use crate::types::{
    AdminAnalyticsQuery, AdminAnalyticsReadFuture, AdminAnalyticsReadStore, AdminAnalyticsSnapshot,
    AdminAnalyticsTimeRange,
};

const LOAD_SUMMARY: &str = r#"
SELECT
    COUNT(DISTINCT COALESCE(CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), NULLIF(owner_name_snapshot, ''), 'unknown')) AS total_users,
    COUNT(DISTINCT COALESCE(CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), NULLIF(owner_name_snapshot, ''), 'unknown')) AS active_users,
    COUNT(DISTINCT COALESCE(NULLIF(model, ''), NULLIF(catalog_key, ''))) AS active_models,
    COALESCE(SUM(COALESCE(request_count, 1)), 0) AS total_requests,
    COUNT(DISTINCT CASE WHEN failed_request.request_id IS NULL THEN NULL ELSE usage.request_id END) AS failed_requests,
    CAST(COALESCE(SUM(COALESCE(total_tokens, prompt_tokens + completion_tokens + cached_tokens, 0)), 0) AS TEXT) AS total_tokens,
    CAST(COALESCE(SUM(COALESCE(customer_charge_amount, cost_amount, 0)), 0) AS TEXT) AS total_points,
    CAST(COALESCE(SUM(COALESCE(upstream_cost_amount, cost_amount, 0)), 0) AS TEXT) AS upstream_cost
FROM ai_usage_fact usage
LEFT JOIN (
    SELECT DISTINCT tenant_id, organization_id, request_id
    FROM ai_request_trace
    WHERE status = 1
      AND tenant_id = $1
      AND (organization_id = $2 OR organization_id = 0 OR organization_id IS NULL)
      AND NULLIF(request_id, '') IS NOT NULL
      AND started_at IS NOT NULL
      AND ($3::text IS NULL OR started_at >= $3::timestamptz)
      AND ($4::text IS NULL OR started_at <= $4::timestamptz)
      AND ((http_status IS NOT NULL AND http_status >= 400)
        OR error_type IS NOT NULL
        OR NULLIF(provider_error_code, '') IS NOT NULL)
) failed_request
  ON failed_request.tenant_id = usage.tenant_id
 AND failed_request.organization_id = usage.organization_id
 AND failed_request.request_id = usage.request_id
WHERE usage.status = 1
  AND usage.tenant_id = $1
  AND (usage.organization_id = $2 OR usage.organization_id = 0 OR usage.organization_id IS NULL)
  AND ($3::text IS NULL OR usage.occurred_at >= $3::timestamptz)
  AND ($4::text IS NULL OR usage.occurred_at <= $4::timestamptz)
"#;

const USER_POINTS_ORDER: &str = "points_sort DESC, request_count DESC, user_name ASC";
const USER_TOKENS_ORDER: &str = "total_tokens_sort DESC, request_count DESC, user_name ASC";
const USER_REQUESTS_ORDER: &str =
    "request_count DESC, total_tokens_sort DESC, points_sort DESC, user_name ASC";

const MODEL_POINTS_ORDER: &str = "points_sort DESC, request_count DESC, model ASC";
const MODEL_TOKENS_ORDER: &str = "total_tokens_sort DESC, request_count DESC, model ASC";
const MODEL_REQUESTS_ORDER: &str =
    "request_count DESC, total_tokens_sort DESC, points_sort DESC, model ASC";

const LOAD_USER_MODEL_DISTRIBUTION: &str = r#"
SELECT
    COALESCE(CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), NULLIF(owner_name_snapshot, ''), 'unknown') AS user_id,
    COALESCE(NULLIF(model, ''), NULLIF(catalog_key, ''), 'unknown') AS name,
    CAST(COALESCE(SUM(COALESCE(customer_charge_amount, cost_amount, 0)), 0) AS TEXT) AS value
FROM ai_usage_fact
WHERE status = 1
  AND tenant_id = $1
  AND (organization_id = $2 OR organization_id = 0 OR organization_id IS NULL)
  AND ($3::text IS NULL OR occurred_at >= $3::timestamptz)
  AND ($4::text IS NULL OR occurred_at <= $4::timestamptz)
GROUP BY COALESCE(CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), NULLIF(owner_name_snapshot, ''), 'unknown'), COALESCE(NULLIF(model, ''), NULLIF(catalog_key, ''), 'unknown')
HAVING COALESCE(SUM(COALESCE(customer_charge_amount, cost_amount, 0)), 0) > 0
ORDER BY user_id ASC, COALESCE(SUM(COALESCE(customer_charge_amount, cost_amount, 0)), 0) DESC, name ASC
"#;

const LOAD_MODEL_DISTRIBUTION: &str = r#"
SELECT
    COALESCE(NULLIF(model, ''), NULLIF(catalog_key, ''), 'unknown') AS name,
    CAST(COALESCE(SUM(COALESCE(request_count, 1)), 0) AS TEXT) AS value
FROM ai_usage_fact
WHERE status = 1
  AND tenant_id = $1
  AND (organization_id = $2 OR organization_id = 0 OR organization_id IS NULL)
  AND ($3::text IS NULL OR occurred_at >= $3::timestamptz)
  AND ($4::text IS NULL OR occurred_at <= $4::timestamptz)
GROUP BY COALESCE(NULLIF(model, ''), NULLIF(catalog_key, ''), 'unknown')
HAVING COALESCE(SUM(COALESCE(request_count, 1)), 0) > 0
ORDER BY COALESCE(SUM(COALESCE(request_count, 1)), 0) DESC, name ASC
"#;

const LOAD_MODALITY_DISTRIBUTION: &str = r#"
SELECT
    COALESCE(modality, 0) AS modality,
    CAST(COALESCE(SUM(COALESCE(request_count, 1)), 0) AS TEXT) AS value
FROM ai_usage_fact
WHERE status = 1
  AND tenant_id = $1
  AND (organization_id = $2 OR organization_id = 0 OR organization_id IS NULL)
  AND ($3::text IS NULL OR occurred_at >= $3::timestamptz)
  AND ($4::text IS NULL OR occurred_at <= $4::timestamptz)
GROUP BY COALESCE(modality, 0)
HAVING COALESCE(SUM(COALESCE(request_count, 1)), 0) > 0
ORDER BY COALESCE(SUM(COALESCE(request_count, 1)), 0) DESC, modality ASC
"#;

#[derive(Debug, Clone)]
pub struct PostgresAdminAnalyticsReadStore {
    pool: PgPool,
}

impl PostgresAdminAnalyticsReadStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminAnalyticsReadStore for PostgresAdminAnalyticsReadStore {
    fn load_admin_analytics<'a>(
        &'a self,
        query: AdminAnalyticsQuery,
    ) -> AdminAnalyticsReadFuture<'a> {
        Box::pin(async move { load_snapshot(&self.pool, query).await })
    }
}

async fn load_snapshot(
    pool: &PgPool,
    query: AdminAnalyticsQuery,
) -> RepositoryResult<AdminAnalyticsSnapshot> {
    let tenant_id = query.subject.tenant_id;
    let organization_id = query.subject.organization_id;
    let start_time = query.start_time.as_deref();
    let end_time = query.end_time.as_deref();
    let limit = query.limit.clamp(3, 50);

    let summary_row = load_summary(pool, tenant_id, organization_id, start_time, end_time).await?;
    let trend_rows = load_trend(
        pool,
        query.time_range,
        tenant_id,
        organization_id,
        start_time,
        end_time,
    )
    .await?;
    let user_points_rows = load_user_rankings(
        pool,
        tenant_id,
        organization_id,
        start_time,
        end_time,
        limit,
        USER_POINTS_ORDER,
    )
    .await?;
    let user_tokens_rows = load_user_rankings(
        pool,
        tenant_id,
        organization_id,
        start_time,
        end_time,
        limit,
        USER_TOKENS_ORDER,
    )
    .await?;
    let user_requests_rows = load_user_rankings(
        pool,
        tenant_id,
        organization_id,
        start_time,
        end_time,
        limit,
        USER_REQUESTS_ORDER,
    )
    .await?;
    let model_points_rows = load_model_rankings(
        pool,
        tenant_id,
        organization_id,
        start_time,
        end_time,
        limit,
        MODEL_POINTS_ORDER,
    )
    .await?;
    let model_tokens_rows = load_model_rankings(
        pool,
        tenant_id,
        organization_id,
        start_time,
        end_time,
        limit,
        MODEL_TOKENS_ORDER,
    )
    .await?;
    let model_requests_rows = load_model_rankings(
        pool,
        tenant_id,
        organization_id,
        start_time,
        end_time,
        limit,
        MODEL_REQUESTS_ORDER,
    )
    .await?;
    let user_model_distributions =
        load_user_model_distributions(pool, tenant_id, organization_id, start_time, end_time)
            .await?;
    let model_distribution_rows = load_pie_rows(
        pool,
        LOAD_MODEL_DISTRIBUTION,
        tenant_id,
        organization_id,
        start_time,
        end_time,
    )
    .await?;
    let modality_distribution_rows =
        load_modality_distribution(pool, tenant_id, organization_id, start_time, end_time).await?;

    Ok(build_snapshot(
        query.time_range,
        query.start_time,
        query.end_time,
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
    ))
}

async fn load_summary(
    pool: &PgPool,
    tenant_id: i64,
    organization_id: i64,
    start_time: Option<&str>,
    end_time: Option<&str>,
) -> RepositoryResult<AnalyticsSummaryRow> {
    let row = sqlx::query(LOAD_SUMMARY)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(start_time)
        .bind(end_time)
        .fetch_one(pool)
        .await
        .map_err(|error| store_error("admin analytics query", error))?;

    Ok(AnalyticsSummaryRow {
        total_users: integer_cell(&row, "total_users"),
        active_users: integer_cell(&row, "active_users"),
        active_models: integer_cell(&row, "active_models"),
        total_requests: integer_cell(&row, "total_requests"),
        failed_requests: integer_cell(&row, "failed_requests"),
        total_tokens: decimal_cell(&row, "total_tokens")?,
        total_points: decimal_cell(&row, "total_points")?,
        upstream_cost: decimal_cell(&row, "upstream_cost")?,
    })
}

async fn load_trend(
    pool: &PgPool,
    time_range: AdminAnalyticsTimeRange,
    tenant_id: i64,
    organization_id: i64,
    start_time: Option<&str>,
    end_time: Option<&str>,
) -> RepositoryResult<Vec<AnalyticsTrendRow>> {
    let period_expr = postgres_period_expression(time_range);
    let sql = format!(
        r#"
        SELECT
            {period_expr} AS time_bucket,
            CAST(COALESCE(SUM(COALESCE(request_count, 1)), 0) AS TEXT) AS requests,
            CAST(COALESCE(SUM(COALESCE(total_tokens, prompt_tokens + completion_tokens + cached_tokens, 0)), 0) AS TEXT) AS tokens,
            CAST(COALESCE(SUM(COALESCE(customer_charge_amount, cost_amount, 0)), 0) AS TEXT) AS points,
            COUNT(DISTINCT COALESCE(CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), NULLIF(owner_name_snapshot, ''), 'unknown')) AS users
        FROM ai_usage_fact
        WHERE status = 1
          AND tenant_id = $1
          AND (organization_id = $2 OR organization_id = 0 OR organization_id IS NULL)
          AND occurred_at IS NOT NULL
          AND ($3::text IS NULL OR occurred_at >= $3::timestamptz)
          AND ($4::text IS NULL OR occurred_at <= $4::timestamptz)
        GROUP BY time_bucket
        ORDER BY time_bucket ASC
        LIMIT 30
        "#,
        period_expr = period_expr,
    );
    let rows = sqlx::query(&sql)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(start_time)
        .bind(end_time)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("admin analytics query", error))?;

    rows.into_iter()
        .map(|row| {
            Ok(AnalyticsTrendRow {
                time: string_cell(&row, "time_bucket"),
                requests: decimal_cell(&row, "requests")?,
                tokens: decimal_cell(&row, "tokens")?,
                points: decimal_cell(&row, "points")?,
                users: integer_cell(&row, "users"),
            })
        })
        .collect()
}

fn postgres_period_expression(time_range: AdminAnalyticsTimeRange) -> &'static str {
    match time_range {
        AdminAnalyticsTimeRange::Hourly => "to_char(occurred_at, 'YYYY-MM-DD HH24:00')",
        AdminAnalyticsTimeRange::Weekly => "to_char(occurred_at, 'IYYY-\"W\"IW')",
        AdminAnalyticsTimeRange::Monthly => "to_char(occurred_at, 'YYYY-MM')",
        AdminAnalyticsTimeRange::Yearly => "to_char(occurred_at, 'YYYY')",
        AdminAnalyticsTimeRange::Daily => "to_char(occurred_at, 'YYYY-MM-DD')",
    }
}

async fn load_user_rankings(
    pool: &PgPool,
    tenant_id: i64,
    organization_id: i64,
    start_time: Option<&str>,
    end_time: Option<&str>,
    limit: i64,
    order_by: &str,
) -> RepositoryResult<Vec<AnalyticsUserRankRow>> {
    let sql = format!(
        r#"
        SELECT
            COALESCE(CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), NULLIF(owner_name_snapshot, ''), 'unknown') AS user_id,
            COALESCE(NULLIF(owner_name_snapshot, ''), CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), 'unknown') AS user_name,
            COALESCE(SUM(COALESCE(request_count, 1)), 0) AS request_count,
            COALESCE(SUM(COALESCE(total_tokens, prompt_tokens + completion_tokens + cached_tokens, 0)), 0) AS total_tokens_sort,
            CAST(COALESCE(SUM(COALESCE(total_tokens, prompt_tokens + completion_tokens + cached_tokens, 0)), 0) AS TEXT) AS total_tokens,
            COALESCE(SUM(COALESCE(customer_charge_amount, cost_amount, 0)), 0) AS points_sort,
            CAST(COALESCE(SUM(COALESCE(customer_charge_amount, cost_amount, 0)), 0) AS TEXT) AS points
        FROM ai_usage_fact
        WHERE status = 1
          AND tenant_id = $1
          AND (organization_id = $2 OR organization_id = 0 OR organization_id IS NULL)
          AND ($3::text IS NULL OR occurred_at >= $3::timestamptz)
          AND ($4::text IS NULL OR occurred_at <= $4::timestamptz)
        GROUP BY COALESCE(CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), NULLIF(owner_name_snapshot, ''), 'unknown'), COALESCE(NULLIF(owner_name_snapshot, ''), CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), 'unknown')
        ORDER BY {order_by}
        LIMIT $5
        "#
    );
    let rows = sqlx::query(&sql)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(start_time)
        .bind(end_time)
        .bind(limit)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("admin analytics query", error))?;

    rows.into_iter()
        .map(|row| {
            Ok(AnalyticsUserRankRow {
                user_id: string_cell(&row, "user_id"),
                user_name: string_cell(&row, "user_name"),
                request_count: integer_cell(&row, "request_count"),
                total_tokens: decimal_cell(&row, "total_tokens")?,
                points: decimal_cell(&row, "points")?,
            })
        })
        .collect()
}

async fn load_model_rankings(
    pool: &PgPool,
    tenant_id: i64,
    organization_id: i64,
    start_time: Option<&str>,
    end_time: Option<&str>,
    limit: i64,
    order_by: &str,
) -> RepositoryResult<Vec<AnalyticsModelRankRow>> {
    let sql = format!(
        r#"
        SELECT
            COALESCE(NULLIF(model, ''), NULLIF(catalog_key, ''), 'unknown') AS model,
            COALESCE(NULLIF(catalog_key, ''), NULLIF(model, ''), 'unknown') AS catalog_key,
            modality AS modality,
            COALESCE(SUM(COALESCE(request_count, 1)), 0) AS request_count,
            COALESCE(SUM(COALESCE(total_tokens, prompt_tokens + completion_tokens + cached_tokens, 0)), 0) AS total_tokens_sort,
            CAST(COALESCE(SUM(COALESCE(total_tokens, prompt_tokens + completion_tokens + cached_tokens, 0)), 0) AS TEXT) AS total_tokens,
            COALESCE(SUM(COALESCE(customer_charge_amount, cost_amount, 0)), 0) AS points_sort,
            CAST(COALESCE(SUM(COALESCE(customer_charge_amount, cost_amount, 0)), 0) AS TEXT) AS points,
            CAST(COALESCE(SUM(COALESCE(upstream_cost_amount, cost_amount, 0)), 0) AS TEXT) AS upstream_cost,
            COUNT(DISTINCT COALESCE(CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), NULLIF(owner_name_snapshot, ''), 'unknown')) AS user_count,
            COUNT(DISTINCT CASE WHEN failed_request.request_id IS NULL THEN NULL ELSE usage.request_id END) AS failed_requests
        FROM ai_usage_fact usage
        LEFT JOIN (
            SELECT DISTINCT tenant_id, organization_id, request_id
            FROM ai_request_trace
            WHERE status = 1
              AND tenant_id = $1
              AND (organization_id = $2 OR organization_id = 0 OR organization_id IS NULL)
              AND NULLIF(request_id, '') IS NOT NULL
              AND started_at IS NOT NULL
              AND ($3::text IS NULL OR started_at >= $3::timestamptz)
              AND ($4::text IS NULL OR started_at <= $4::timestamptz)
              AND ((http_status IS NOT NULL AND http_status >= 400)
                OR error_type IS NOT NULL
                OR NULLIF(provider_error_code, '') IS NOT NULL)
        ) failed_request
          ON failed_request.tenant_id = usage.tenant_id
         AND failed_request.organization_id = usage.organization_id
         AND failed_request.request_id = usage.request_id
        WHERE usage.status = 1
          AND usage.tenant_id = $1
          AND (usage.organization_id = $2 OR usage.organization_id = 0 OR usage.organization_id IS NULL)
          AND ($3::text IS NULL OR usage.occurred_at >= $3::timestamptz)
          AND ($4::text IS NULL OR usage.occurred_at <= $4::timestamptz)
        GROUP BY
            COALESCE(NULLIF(model, ''), NULLIF(catalog_key, ''), 'unknown'),
            COALESCE(NULLIF(catalog_key, ''), NULLIF(model, ''), 'unknown'),
            modality
        ORDER BY {order_by}
        LIMIT $5
        "#
    );
    let rows = sqlx::query(&sql)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(start_time)
        .bind(end_time)
        .bind(limit)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("admin analytics query", error))?;

    rows.into_iter()
        .map(|row| {
            let model = string_cell(&row, "model");
            let catalog_key = string_cell(&row, "catalog_key");
            Ok(AnalyticsModelRankRow {
                vendor: vendor_from_catalog_key(&catalog_key, &model),
                model,
                catalog_key,
                modality: optional_integer_cell(&row, "modality"),
                request_count: integer_cell(&row, "request_count"),
                total_tokens: decimal_cell(&row, "total_tokens")?,
                points: decimal_cell(&row, "points")?,
                upstream_cost: decimal_cell(&row, "upstream_cost")?,
                user_count: integer_cell(&row, "user_count"),
                failed_requests: integer_cell(&row, "failed_requests"),
            })
        })
        .collect()
}

async fn load_user_model_distributions(
    pool: &PgPool,
    tenant_id: i64,
    organization_id: i64,
    start_time: Option<&str>,
    end_time: Option<&str>,
) -> RepositoryResult<Vec<(String, Vec<AnalyticsPieRow>)>> {
    let rows = sqlx::query(LOAD_USER_MODEL_DISTRIBUTION)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(start_time)
        .bind(end_time)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("admin analytics query", error))?;

    let mut grouped: Vec<(String, Vec<AnalyticsPieRow>)> = Vec::new();
    for row in rows {
        let user_id = string_cell(&row, "user_id");
        let pie = AnalyticsPieRow {
            name: string_cell(&row, "name"),
            value: decimal_cell(&row, "value")?,
        };
        match grouped.iter_mut().find(|(id, _)| id == &user_id) {
            Some((_, values)) => values.push(pie),
            None => grouped.push((user_id, vec![pie])),
        }
    }
    Ok(grouped)
}

async fn load_pie_rows(
    pool: &PgPool,
    sql: &str,
    tenant_id: i64,
    organization_id: i64,
    start_time: Option<&str>,
    end_time: Option<&str>,
) -> RepositoryResult<Vec<AnalyticsPieRow>> {
    let rows = sqlx::query(sql)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(start_time)
        .bind(end_time)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("admin analytics query", error))?;

    rows.into_iter()
        .map(|row| {
            Ok(AnalyticsPieRow {
                name: string_cell(&row, "name"),
                value: decimal_cell(&row, "value")?,
            })
        })
        .collect()
}

async fn load_modality_distribution(
    pool: &PgPool,
    tenant_id: i64,
    organization_id: i64,
    start_time: Option<&str>,
    end_time: Option<&str>,
) -> RepositoryResult<Vec<AnalyticsPieRow>> {
    let rows = sqlx::query(LOAD_MODALITY_DISTRIBUTION)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(start_time)
        .bind(end_time)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("admin analytics query", error))?;

    rows.into_iter()
        .map(|row| {
            Ok(AnalyticsPieRow {
                name: modality::label(optional_integer_cell(&row, "modality")).to_owned(),
                value: decimal_cell(&row, "value")?,
            })
        })
        .collect()
}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> String {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .or_else(|| row.try_get::<String, _>(column).ok())
        .unwrap_or_default()
}

fn integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> i64 {
    optional_integer_cell(row, column).unwrap_or_default()
}

fn optional_integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<i64> {
    row.try_get::<Option<i64>, _>(column)
        .ok()
        .flatten()
        .or_else(|| row.try_get::<i64, _>(column).ok())
        .or_else(|| {
            row.try_get::<Option<i32>, _>(column)
                .ok()
                .flatten()
                .map(i64::from)
        })
        .or_else(|| row.try_get::<i32, _>(column).ok().map(i64::from))
        .or_else(|| string_cell(row, column).trim().parse::<i64>().ok())
}

fn decimal_cell(row: &sqlx::postgres::PgRow, column: &str) -> RepositoryResult<f64> {
    let value = string_cell(row, column);
    let parsed = value
        .trim()
        .parse::<f64>()
        .map_err(|_| RepositoryError::new(format!("invalid admin analytics {column}: {value}")))?;
    if parsed.is_finite() {
        Ok(parsed)
    } else {
        Err(RepositoryError::new(format!(
            "invalid admin analytics {column}: {value}"
        )))
    }
}
