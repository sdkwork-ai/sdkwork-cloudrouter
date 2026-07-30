use sdkwork_clawrouter_router_service::domain::{DecimalValue, DomainError};
use std::collections::BTreeSet;

use sqlx::{PgConnection, PgPool, Row};

use crate::error::{store_error, RepositoryError, RepositoryResult};
use crate::modality;
use crate::snapshot::{
    build_snapshot, vendor_from_catalog_key, AnalyticsModelRankRow, AnalyticsPieRow,
    AnalyticsSummaryRow, AnalyticsTrendRow, AnalyticsUserRankRow, PI_LIMIT, USER_MODEL_LIMIT,
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
    CAST(COALESCE(SUM(COALESCE(request_count, 1)), 0) AS TEXT) AS total_requests,
    COUNT(DISTINCT CASE WHEN failed_request.request_id IS NULL THEN NULL ELSE usage.request_id END) AS failed_requests,
    CAST(COALESCE(SUM(COALESCE(total_tokens, prompt_tokens + completion_tokens + cached_tokens, 0)), 0) AS TEXT) AS total_tokens,
    CAST(COALESCE(SUM(COALESCE(customer_charge_amount, 0)), 0) AS TEXT) AS total_points,
    CAST(COALESCE(SUM(COALESCE(upstream_cost_amount, 0)), 0) AS TEXT) AS upstream_cost
FROM ai_usage usage
LEFT JOIN (
    SELECT DISTINCT tenant_id, organization_id, request_id
    FROM ai_request_trace
    WHERE status = 1
      AND tenant_id = $1
      AND (organization_id = $2 OR organization_id = 0 OR organization_id IS NULL)
      AND NULLIF(request_id, '') IS NOT NULL
      AND started_at IS NOT NULL
       AND started_at >= $3::timestamptz
       AND started_at <= $4::timestamptz
      AND ((http_status IS NOT NULL AND http_status >= 400)
        OR error_type IS NOT NULL
        OR NULLIF(provider_error_code, '') IS NOT NULL)
) failed_request
  ON failed_request.tenant_id = usage.tenant_id
 AND failed_request.organization_id IS NOT DISTINCT FROM usage.organization_id
 AND failed_request.request_id = usage.request_id
WHERE usage.status = 1
  AND usage.tenant_id = $1
  AND (usage.organization_id = $2 OR usage.organization_id = 0 OR usage.organization_id IS NULL)
  AND usage.occurred_at >= $3::timestamptz
  AND usage.occurred_at <= $4::timestamptz
"#;

const USER_POINTS_ORDER: &str = "points_sort DESC, request_count_sort DESC, user_name ASC";
const USER_TOKENS_ORDER: &str = "total_tokens_sort DESC, request_count_sort DESC, user_name ASC";
const USER_REQUESTS_ORDER: &str =
    "request_count_sort DESC, total_tokens_sort DESC, points_sort DESC, user_name ASC";

const MODEL_POINTS_ORDER: &str = "points_sort DESC, request_count_sort DESC, model ASC";
const MODEL_TOKENS_ORDER: &str = "total_tokens_sort DESC, request_count_sort DESC, model ASC";
const MODEL_REQUESTS_ORDER: &str =
    "request_count_sort DESC, total_tokens_sort DESC, points_sort DESC, model ASC";

fn user_model_distribution_sql() -> String {
    format!(
        r#"
WITH agg AS (
    SELECT
        COALESCE(CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), NULLIF(owner_name_snapshot, ''), 'unknown') AS user_id,
        COALESCE(NULLIF(model, ''), NULLIF(catalog_key, ''), 'unknown') AS name,
        COALESCE(SUM(COALESCE(customer_charge_amount, 0)), 0) AS value
    FROM ai_usage
    WHERE status = 1
      AND tenant_id = $1
      AND (organization_id = $2 OR organization_id = 0 OR organization_id IS NULL)
      AND occurred_at >= $3::timestamptz
      AND occurred_at <= $4::timestamptz
      AND COALESCE(CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), NULLIF(owner_name_snapshot, ''), 'unknown') = ANY($5::text[])
    GROUP BY COALESCE(CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), NULLIF(owner_name_snapshot, ''), 'unknown'), COALESCE(NULLIF(model, ''), NULLIF(catalog_key, ''), 'unknown')
    HAVING COALESCE(SUM(COALESCE(customer_charge_amount, 0)), 0) > 0
),
ordered AS (
    SELECT
        user_id,
        name,
        value,
        ROW_NUMBER() OVER (
            PARTITION BY user_id
            ORDER BY value DESC, name ASC
        ) AS rn
    FROM agg
),
top_rows AS (
    SELECT user_id, name, value
    FROM ordered
    WHERE rn <= {USER_MODEL_LIMIT}
),
others AS (
    SELECT user_id, 'Others' AS name, COALESCE(SUM(value), 0) AS value
    FROM ordered
    WHERE rn > {USER_MODEL_LIMIT}
    GROUP BY user_id
    HAVING COALESCE(SUM(value), 0) > 0
)
,
combined AS (
    SELECT user_id, name, value AS value_decimal
    FROM top_rows
    UNION ALL
    SELECT user_id, name, value AS value_decimal
    FROM others
)
SELECT user_id, name, CAST(value_decimal AS TEXT) AS value
FROM combined
ORDER BY user_id ASC, value_decimal DESC, name ASC
"#
    )
}

fn model_distribution_sql() -> String {
    format!(
        r#"
WITH agg AS (
    SELECT
        COALESCE(NULLIF(model, ''), NULLIF(catalog_key, ''), 'unknown') AS name,
        COALESCE(SUM(COALESCE(request_count, 1)), 0) AS value
    FROM ai_usage
    WHERE status = 1
      AND tenant_id = $1
      AND (organization_id = $2 OR organization_id = 0 OR organization_id IS NULL)
      AND occurred_at >= $3::timestamptz
      AND occurred_at <= $4::timestamptz
    GROUP BY COALESCE(NULLIF(model, ''), NULLIF(catalog_key, ''), 'unknown')
    HAVING COALESCE(SUM(COALESCE(request_count, 1)), 0) > 0
),
ordered AS (
    SELECT
        name,
        value,
        ROW_NUMBER() OVER (ORDER BY value DESC, name ASC) AS rn
    FROM agg
),
top_rows AS (
    SELECT name, value
    FROM ordered
    WHERE rn <= {PI_LIMIT}
),
others AS (
    SELECT 'Others' AS name, COALESCE(SUM(value), 0) AS value
    FROM ordered
    WHERE rn > {PI_LIMIT}
)
,
combined AS (
    SELECT name, value AS value_decimal
    FROM top_rows
    UNION ALL
    SELECT name, value AS value_decimal
    FROM others
    WHERE value > 0
)
SELECT name, CAST(value_decimal AS TEXT) AS value
FROM combined
ORDER BY value_decimal DESC, name ASC
"#
    )
}

fn modality_distribution_sql() -> String {
    format!(
        r#"
WITH agg AS (
    SELECT
        COALESCE(modality, 0) AS modality,
        COALESCE(SUM(COALESCE(request_count, 1)), 0) AS value
    FROM ai_usage
    WHERE status = 1
      AND tenant_id = $1
      AND (organization_id = $2 OR organization_id = 0 OR organization_id IS NULL)
      AND occurred_at >= $3::timestamptz
      AND occurred_at <= $4::timestamptz
    GROUP BY COALESCE(modality, 0)
    HAVING COALESCE(SUM(COALESCE(request_count, 1)), 0) > 0
),
ordered AS (
    SELECT
        modality,
        value,
        ROW_NUMBER() OVER (ORDER BY value DESC, modality ASC) AS rn
    FROM agg
),
top_rows AS (
    SELECT modality, value
    FROM ordered
    WHERE rn <= {PI_LIMIT}
),
others AS (
    SELECT -1 AS modality, COALESCE(SUM(value), 0) AS value
    FROM ordered
    WHERE rn > {PI_LIMIT}
)
,
combined AS (
    SELECT modality, value AS value_decimal
    FROM top_rows
    UNION ALL
    SELECT modality, value AS value_decimal
    FROM others
    WHERE value > 0
)
SELECT modality, CAST(value_decimal AS TEXT) AS value
FROM combined
ORDER BY value_decimal DESC, modality ASC
"#
    )
}

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
        Box::pin(async move {
            load_snapshot(&self.pool, query)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }
}

async fn load_snapshot(
    pool: &PgPool,
    query: AdminAnalyticsQuery,
) -> RepositoryResult<AdminAnalyticsSnapshot> {
    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| store_error("admin analytics transaction begin", error))?;
    sqlx::query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
        .execute(&mut *transaction)
        .await
        .map_err(|error| store_error("admin analytics transaction configuration", error))?;

    let tenant_id = query.subject.tenant_id;
    let organization_id = query.subject.organization_id;
    let start_time = query.start_time.as_str();
    let end_time = query.end_time.as_str();
    if !(3..=50).contains(&query.limit) {
        return Err(RepositoryError::new(
            "admin analytics ranking size must be between 3 and 50",
        ));
    }
    let limit = query.limit;

    let summary_row = load_summary(
        &mut transaction,
        tenant_id,
        organization_id,
        start_time,
        end_time,
    )
    .await?;
    let trend_rows = load_trend(
        &mut transaction,
        query.time_range,
        tenant_id,
        organization_id,
        start_time,
        end_time,
    )
    .await?;
    let user_points_rows = load_user_rankings(
        &mut transaction,
        tenant_id,
        organization_id,
        start_time,
        end_time,
        limit,
        USER_POINTS_ORDER,
    )
    .await?;
    let user_tokens_rows = load_user_rankings(
        &mut transaction,
        tenant_id,
        organization_id,
        start_time,
        end_time,
        limit,
        USER_TOKENS_ORDER,
    )
    .await?;
    let user_requests_rows = load_user_rankings(
        &mut transaction,
        tenant_id,
        organization_id,
        start_time,
        end_time,
        limit,
        USER_REQUESTS_ORDER,
    )
    .await?;
    let model_points_rows = load_model_rankings(
        &mut transaction,
        tenant_id,
        organization_id,
        start_time,
        end_time,
        limit,
        MODEL_POINTS_ORDER,
    )
    .await?;
    let model_tokens_rows = load_model_rankings(
        &mut transaction,
        tenant_id,
        organization_id,
        start_time,
        end_time,
        limit,
        MODEL_TOKENS_ORDER,
    )
    .await?;
    let model_requests_rows = load_model_rankings(
        &mut transaction,
        tenant_id,
        organization_id,
        start_time,
        end_time,
        limit,
        MODEL_REQUESTS_ORDER,
    )
    .await?;
    let ranked_user_ids = user_points_rows
        .iter()
        .chain(&user_tokens_rows)
        .chain(&user_requests_rows)
        .map(|row| row.user_id.clone())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();
    let user_model_distributions = load_user_model_distributions(
        &mut transaction,
        tenant_id,
        organization_id,
        start_time,
        end_time,
        &ranked_user_ids,
    )
    .await?;
    let model_distribution_rows = load_pie_rows(
        &mut transaction,
        &model_distribution_sql(),
        tenant_id,
        organization_id,
        start_time,
        end_time,
    )
    .await?;
    let modality_distribution_rows = load_modality_distribution(
        &mut transaction,
        tenant_id,
        organization_id,
        start_time,
        end_time,
    )
    .await?;

    let snapshot = build_snapshot(
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
    )?;
    transaction
        .commit()
        .await
        .map_err(|error| store_error("admin analytics transaction commit", error))?;
    Ok(snapshot)
}

async fn load_summary(
    connection: &mut PgConnection,
    tenant_id: i64,
    organization_id: i64,
    start_time: &str,
    end_time: &str,
) -> RepositoryResult<AnalyticsSummaryRow> {
    let row = sqlx::query(LOAD_SUMMARY)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(start_time)
        .bind(end_time)
        .fetch_one(&mut *connection)
        .await
        .map_err(|error| store_error("admin analytics query", error))?;

    Ok(AnalyticsSummaryRow {
        total_users: integer_cell(&row, "total_users")?,
        active_users: integer_cell(&row, "active_users")?,
        active_models: integer_cell(&row, "active_models")?,
        total_requests: integer_cell(&row, "total_requests")?,
        failed_requests: integer_cell(&row, "failed_requests")?,
        total_tokens: decimal_cell(&row, "total_tokens")?,
        total_points: decimal_cell(&row, "total_points")?,
        upstream_cost: decimal_cell(&row, "upstream_cost")?,
    })
}

async fn load_trend(
    connection: &mut PgConnection,
    time_range: AdminAnalyticsTimeRange,
    tenant_id: i64,
    organization_id: i64,
    start_time: &str,
    end_time: &str,
) -> RepositoryResult<Vec<AnalyticsTrendRow>> {
    let period_expr = postgres_period_expression(time_range);
    let sql = format!(
        r#"
        SELECT time_bucket, requests, tokens, points, users
        FROM (
            SELECT
                {period_expr} AS time_bucket,
                CAST(COALESCE(SUM(COALESCE(request_count, 1)), 0) AS TEXT) AS requests,
                CAST(COALESCE(SUM(COALESCE(total_tokens, prompt_tokens + completion_tokens + cached_tokens, 0)), 0) AS TEXT) AS tokens,
                CAST(COALESCE(SUM(COALESCE(customer_charge_amount, 0)), 0) AS TEXT) AS points,
                COUNT(DISTINCT COALESCE(CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), NULLIF(owner_name_snapshot, ''), 'unknown')) AS users
            FROM ai_usage
            WHERE status = 1
              AND tenant_id = $1
              AND (organization_id = $2 OR organization_id = 0 OR organization_id IS NULL)
              AND occurred_at IS NOT NULL
              AND occurred_at >= $3::timestamptz
              AND occurred_at <= $4::timestamptz
            GROUP BY time_bucket
            ORDER BY time_bucket DESC
            LIMIT 30
        ) recent_buckets
        ORDER BY time_bucket ASC
        "#,
        period_expr = period_expr,
    );
    let rows = sqlx::query(&sql)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(start_time)
        .bind(end_time)
        .fetch_all(&mut *connection)
        .await
        .map_err(|error| store_error("admin analytics query", error))?;

    rows.into_iter()
        .map(|row| {
            Ok(AnalyticsTrendRow {
                time: string_cell(&row, "time_bucket")?,
                requests: decimal_cell(&row, "requests")?,
                tokens: decimal_cell(&row, "tokens")?,
                points: decimal_cell(&row, "points")?,
                users: integer_cell(&row, "users")?,
            })
        })
        .collect()
}

fn postgres_period_expression(time_range: AdminAnalyticsTimeRange) -> &'static str {
    match time_range {
        AdminAnalyticsTimeRange::Hourly => {
            "to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:00')"
        }
        AdminAnalyticsTimeRange::Weekly => {
            "to_char(occurred_at AT TIME ZONE 'UTC', 'IYYY-\"W\"IW')"
        }
        AdminAnalyticsTimeRange::Monthly => "to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM')",
        AdminAnalyticsTimeRange::Yearly => "to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY')",
        AdminAnalyticsTimeRange::Daily => "to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')",
    }
}

async fn load_user_rankings(
    connection: &mut PgConnection,
    tenant_id: i64,
    organization_id: i64,
    start_time: &str,
    end_time: &str,
    limit: i64,
    order_by: &str,
) -> RepositoryResult<Vec<AnalyticsUserRankRow>> {
    let sql = format!(
        r#"
        SELECT
            COALESCE(CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), NULLIF(owner_name_snapshot, ''), 'unknown') AS user_id,
            COALESCE(NULLIF(owner_name_snapshot, ''), CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), 'unknown') AS user_name,
            COALESCE(SUM(COALESCE(request_count, 1)), 0) AS request_count_sort,
            CAST(COALESCE(SUM(COALESCE(request_count, 1)), 0) AS TEXT) AS request_count,
            COALESCE(SUM(COALESCE(total_tokens, prompt_tokens + completion_tokens + cached_tokens, 0)), 0) AS total_tokens_sort,
            CAST(COALESCE(SUM(COALESCE(total_tokens, prompt_tokens + completion_tokens + cached_tokens, 0)), 0) AS TEXT) AS total_tokens,
            COALESCE(SUM(COALESCE(customer_charge_amount, 0)), 0) AS points_sort,
            CAST(COALESCE(SUM(COALESCE(customer_charge_amount, 0)), 0) AS TEXT) AS points
        FROM ai_usage
        WHERE status = 1
          AND tenant_id = $1
          AND (organization_id = $2 OR organization_id = 0 OR organization_id IS NULL)
          AND occurred_at >= $3::timestamptz
          AND occurred_at <= $4::timestamptz
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
        .fetch_all(&mut *connection)
        .await
        .map_err(|error| store_error("admin analytics query", error))?;

    rows.into_iter()
        .map(|row| {
            Ok(AnalyticsUserRankRow {
                user_id: string_cell(&row, "user_id")?,
                user_name: string_cell(&row, "user_name")?,
                request_count: integer_cell(&row, "request_count")?,
                total_tokens: decimal_cell(&row, "total_tokens")?,
                points: decimal_cell(&row, "points")?,
            })
        })
        .collect()
}

async fn load_model_rankings(
    connection: &mut PgConnection,
    tenant_id: i64,
    organization_id: i64,
    start_time: &str,
    end_time: &str,
    limit: i64,
    order_by: &str,
) -> RepositoryResult<Vec<AnalyticsModelRankRow>> {
    let sql = format!(
        r#"
        SELECT
            COALESCE(NULLIF(model, ''), NULLIF(catalog_key, ''), 'unknown') AS model,
            COALESCE(NULLIF(catalog_key, ''), NULLIF(model, ''), 'unknown') AS catalog_key,
            modality AS modality,
            COALESCE(SUM(COALESCE(request_count, 1)), 0) AS request_count_sort,
            CAST(COALESCE(SUM(COALESCE(request_count, 1)), 0) AS TEXT) AS request_count,
            COALESCE(SUM(COALESCE(total_tokens, prompt_tokens + completion_tokens + cached_tokens, 0)), 0) AS total_tokens_sort,
            CAST(COALESCE(SUM(COALESCE(total_tokens, prompt_tokens + completion_tokens + cached_tokens, 0)), 0) AS TEXT) AS total_tokens,
            COALESCE(SUM(COALESCE(customer_charge_amount, 0)), 0) AS points_sort,
            CAST(COALESCE(SUM(COALESCE(customer_charge_amount, 0)), 0) AS TEXT) AS points,
            CAST(COALESCE(SUM(COALESCE(upstream_cost_amount, 0)), 0) AS TEXT) AS upstream_cost,
            COUNT(DISTINCT COALESCE(CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), NULLIF(owner_name_snapshot, ''), 'unknown')) AS user_count,
            COUNT(DISTINCT CASE WHEN failed_request.request_id IS NULL THEN NULL ELSE usage.request_id END) AS failed_requests
        FROM ai_usage usage
        LEFT JOIN (
            SELECT DISTINCT tenant_id, organization_id, request_id
            FROM ai_request_trace
            WHERE status = 1
              AND tenant_id = $1
              AND (organization_id = $2 OR organization_id = 0 OR organization_id IS NULL)
              AND NULLIF(request_id, '') IS NOT NULL
              AND started_at IS NOT NULL
              AND started_at >= $3::timestamptz
              AND started_at <= $4::timestamptz
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
          AND usage.occurred_at >= $3::timestamptz
          AND usage.occurred_at <= $4::timestamptz
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
        .fetch_all(&mut *connection)
        .await
        .map_err(|error| store_error("admin analytics query", error))?;

    rows.into_iter()
        .map(|row| {
            let model = string_cell(&row, "model")?;
            let catalog_key = string_cell(&row, "catalog_key")?;
            Ok(AnalyticsModelRankRow {
                vendor: vendor_from_catalog_key(&catalog_key, &model),
                model,
                catalog_key,
                modality: optional_integer_cell(&row, "modality")?,
                request_count: integer_cell(&row, "request_count")?,
                total_tokens: decimal_cell(&row, "total_tokens")?,
                points: decimal_cell(&row, "points")?,
                upstream_cost: decimal_cell(&row, "upstream_cost")?,
                user_count: integer_cell(&row, "user_count")?,
                failed_requests: integer_cell(&row, "failed_requests")?,
            })
        })
        .collect()
}

async fn load_user_model_distributions(
    connection: &mut PgConnection,
    tenant_id: i64,
    organization_id: i64,
    start_time: &str,
    end_time: &str,
    user_ids: &[String],
) -> RepositoryResult<Vec<(String, Vec<AnalyticsPieRow>)>> {
    if user_ids.is_empty() {
        return Ok(Vec::new());
    }
    let rows = sqlx::query(&user_model_distribution_sql())
        .bind(tenant_id)
        .bind(organization_id)
        .bind(start_time)
        .bind(end_time)
        .bind(user_ids)
        .fetch_all(&mut *connection)
        .await
        .map_err(|error| store_error("admin analytics query", error))?;

    let mut grouped: Vec<(String, Vec<AnalyticsPieRow>)> = Vec::new();
    for row in rows {
        let user_id = string_cell(&row, "user_id")?;
        let pie = AnalyticsPieRow {
            name: string_cell(&row, "name")?,
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
    connection: &mut PgConnection,
    sql: &str,
    tenant_id: i64,
    organization_id: i64,
    start_time: &str,
    end_time: &str,
) -> RepositoryResult<Vec<AnalyticsPieRow>> {
    let rows = sqlx::query(sql)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(start_time)
        .bind(end_time)
        .fetch_all(&mut *connection)
        .await
        .map_err(|error| store_error("admin analytics query", error))?;

    rows.into_iter()
        .map(|row| {
            Ok(AnalyticsPieRow {
                name: string_cell(&row, "name")?,
                value: decimal_cell(&row, "value")?,
            })
        })
        .collect()
}

async fn load_modality_distribution(
    connection: &mut PgConnection,
    tenant_id: i64,
    organization_id: i64,
    start_time: &str,
    end_time: &str,
) -> RepositoryResult<Vec<AnalyticsPieRow>> {
    let rows = sqlx::query(&modality_distribution_sql())
        .bind(tenant_id)
        .bind(organization_id)
        .bind(start_time)
        .bind(end_time)
        .fetch_all(&mut *connection)
        .await
        .map_err(|error| store_error("admin analytics query", error))?;

    rows.into_iter()
        .map(|row| {
            let modality_value = optional_integer_cell(&row, "modality")?;
            Ok(AnalyticsPieRow {
                name: if modality_value == Some(-1) {
                    "Others".to_owned()
                } else {
                    modality::label(modality_value).to_owned()
                },
                value: decimal_cell(&row, "value")?,
            })
        })
        .collect()
}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> RepositoryResult<String> {
    if let Ok(value) = row.try_get::<String, _>(column) {
        return Ok(value);
    }
    if let Ok(Some(value)) = row.try_get::<Option<String>, _>(column) {
        return Ok(value);
    }
    Err(RepositoryError::new(format!(
        "missing or invalid admin analytics {column}"
    )))
}

fn integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> RepositoryResult<i64> {
    let value = optional_integer_cell(row, column)?
        .ok_or_else(|| RepositoryError::new(format!("missing admin analytics {column}")))?;
    if value < 0 {
        return Err(RepositoryError::new(format!(
            "admin analytics {column} must not be negative: {value}"
        )));
    }
    Ok(value)
}

fn optional_integer_cell(
    row: &sqlx::postgres::PgRow,
    column: &str,
) -> RepositoryResult<Option<i64>> {
    if let Ok(value) = row.try_get::<Option<i64>, _>(column) {
        return Ok(value);
    }
    if let Ok(value) = row.try_get::<i64, _>(column) {
        return Ok(Some(value));
    }
    if let Ok(value) = row.try_get::<Option<i32>, _>(column) {
        return Ok(value.map(i64::from));
    }
    if let Ok(value) = row.try_get::<i32, _>(column) {
        return Ok(Some(i64::from(value)));
    }
    if let Ok(value) = row.try_get::<Option<String>, _>(column) {
        return value
            .map(|value| parse_integer_cell(column, &value))
            .transpose();
    }
    if let Ok(value) = row.try_get::<String, _>(column) {
        return parse_integer_cell(column, &value).map(Some);
    }
    Err(RepositoryError::new(format!(
        "missing or invalid admin analytics {column}"
    )))
}

fn parse_integer_cell(column: &str, value: &str) -> RepositoryResult<i64> {
    value
        .trim()
        .parse::<i64>()
        .map_err(|_| RepositoryError::new(format!("invalid admin analytics {column}: {value}")))
}

fn decimal_cell(row: &sqlx::postgres::PgRow, column: &str) -> RepositoryResult<DecimalValue> {
    let value = string_cell(row, column)?;
    let decimal = DecimalValue::parse(&value)
        .map_err(|_| RepositoryError::new(format!("invalid admin analytics {column}: {value}")))?;
    if decimal < DecimalValue::ZERO {
        return Err(RepositoryError::new(format!(
            "admin analytics {column} must not be negative: {value}"
        )));
    }
    Ok(decimal)
}
