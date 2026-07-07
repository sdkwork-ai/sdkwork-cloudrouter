use sqlx::{Row, SqlitePool};

use crate::error::{store_error, RepositoryResult};
use crate::modality;
use crate::snapshot::{
    build_snapshot, scope_filter, vendor_from_catalog_key, AnalyticsModelRankRow, AnalyticsPieRow,
    AnalyticsSummaryRow, AnalyticsTrendRow, AnalyticsUserRankRow, PI_LIMIT, USER_MODEL_LIMIT,
};
use crate::types::{
    AdminAnalyticsQuery, AdminAnalyticsReadFuture, AdminAnalyticsReadStore, AdminAnalyticsSnapshot,
    AdminAnalyticsTimeRange,
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

const USER_POINTS_ORDER: &str = "points_sort DESC, request_count DESC, user_name ASC";
const USER_TOKENS_ORDER: &str = "total_tokens_sort DESC, request_count DESC, user_name ASC";
const USER_REQUESTS_ORDER: &str =
    "request_count DESC, total_tokens_sort DESC, points_sort DESC, user_name ASC";

const MODEL_POINTS_ORDER: &str = "points_sort DESC, request_count DESC, model ASC";
const MODEL_TOKENS_ORDER: &str = "total_tokens_sort DESC, request_count DESC, model ASC";
const MODEL_REQUESTS_ORDER: &str =
    "request_count DESC, total_tokens_sort DESC, points_sort DESC, model ASC";

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
        Box::pin(async move { load_snapshot(&self.pool, query).await })
    }
}

async fn load_snapshot(
    pool: &SqlitePool,
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
    let model_distribution_rows =
        load_model_distribution(pool, tenant_id, organization_id, start_time, end_time).await?;
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
    pool: &SqlitePool,
    tenant_id: i64,
    organization_id: i64,
    start_time: Option<&str>,
    end_time: Option<&str>,
) -> RepositoryResult<AnalyticsSummaryRow> {
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
            CAST(COALESCE(COUNT(DISTINCT user_key), 0) AS TEXT) AS active_users,
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
    .bind(tenant_id)
    .bind(organization_id)
    .bind(start_time)
    .bind(end_time)
    .fetch_one(pool)
    .await
    .map_err(|error| store_error("admin analytics query", error))?;

    let failed_requests =
        load_failed_requests(pool, tenant_id, organization_id, start_time, end_time).await?;

    Ok(AnalyticsSummaryRow {
        total_users: integer_cell(&row, "total_users"),
        active_users: integer_cell(&row, "active_users"),
        active_models: integer_cell(&row, "active_models"),
        total_requests: integer_cell(&row, "total_requests"),
        failed_requests,
        total_tokens: decimal_cell(&row, "total_tokens"),
        total_points: decimal_cell(&row, "total_points"),
        upstream_cost: decimal_cell(&row, "upstream_cost"),
    })
}

async fn load_failed_requests(
    pool: &SqlitePool,
    tenant_id: i64,
    organization_id: i64,
    start_time: Option<&str>,
    end_time: Option<&str>,
) -> RepositoryResult<i64> {
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
    .bind(tenant_id)
    .bind(organization_id)
    .bind(start_time)
    .bind(end_time)
    .fetch_one(pool)
    .await
    .map_err(|error| store_error("admin analytics query", error))?;

    Ok(integer_cell(&row, "failed_requests"))
}

async fn load_trend(
    pool: &SqlitePool,
    time_range: AdminAnalyticsTimeRange,
    tenant_id: i64,
    organization_id: i64,
    start_time: Option<&str>,
    end_time: Option<&str>,
) -> RepositoryResult<Vec<AnalyticsTrendRow>> {
    let period_expr = period_expression(time_range);
    let sql = format!(
        r#"
        SELECT
            period AS time_bucket,
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
        .bind(tenant_id)
        .bind(organization_id)
        .bind(start_time)
        .bind(end_time)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("admin analytics query", error))?;

    Ok(rows
        .into_iter()
        .map(|row| AnalyticsTrendRow {
            time: string_cell(&row, "time_bucket"),
            requests: decimal_cell(&row, "requests"),
            tokens: decimal_cell(&row, "tokens"),
            points: decimal_cell(&row, "points"),
            users: integer_cell(&row, "users"),
        })
        .collect())
}

async fn load_user_rankings(
    pool: &SqlitePool,
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
            {USER_ID_EXPR} AS user_id,
            {USER_NAME_EXPR} AS user_name,
            CAST(COALESCE(SUM({REQUEST_COUNT_EXPR}), 0) AS TEXT) AS request_count,
            COALESCE(SUM({TOKEN_COUNT_EXPR}), 0) AS total_tokens_sort,
            CAST(COALESCE(SUM({TOKEN_COUNT_EXPR}), 0) AS TEXT) AS total_tokens,
            COALESCE(SUM({POINTS_EXPR}), 0) AS points_sort,
            CAST(COALESCE(SUM({POINTS_EXPR}), 0) AS TEXT) AS points
        FROM ai_usage_fact
        WHERE status = 1
          AND {usage_scope}
          AND (?3 IS NULL OR occurred_at >= ?3)
          AND (?4 IS NULL OR occurred_at <= ?4)
        GROUP BY {USER_ID_EXPR}, {USER_NAME_EXPR}
        ORDER BY {order_by}
        LIMIT ?5
        "#,
        USER_ID_EXPR = USER_ID_EXPR,
        USER_NAME_EXPR = USER_NAME_EXPR,
        REQUEST_COUNT_EXPR = REQUEST_COUNT_EXPR,
        TOKEN_COUNT_EXPR = TOKEN_COUNT_EXPR,
        POINTS_EXPR = POINTS_EXPR,
        usage_scope = scope_filter("tenant_id", "organization_id", "?1", "?2"),
        order_by = order_by,
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

    Ok(rows
        .into_iter()
        .map(|row| AnalyticsUserRankRow {
            user_id: string_cell(&row, "user_id"),
            user_name: string_cell(&row, "user_name"),
            request_count: integer_cell(&row, "request_count"),
            total_tokens: decimal_cell(&row, "total_tokens"),
            points: decimal_cell(&row, "points"),
        })
        .collect())
}

async fn load_model_rankings(
    pool: &SqlitePool,
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
            {MODEL_KEY_EXPR} AS model,
            COALESCE(NULLIF(catalog_key, ''), {MODEL_KEY_EXPR}) AS catalog_key,
            modality,
            CAST(COALESCE(SUM({REQUEST_COUNT_EXPR}), 0) AS TEXT) AS request_count,
            COALESCE(SUM({TOKEN_COUNT_EXPR}), 0) AS total_tokens_sort,
            CAST(COALESCE(SUM({TOKEN_COUNT_EXPR}), 0) AS TEXT) AS total_tokens,
            COALESCE(SUM({POINTS_EXPR}), 0) AS points_sort,
            CAST(COALESCE(SUM({POINTS_EXPR}), 0) AS TEXT) AS points,
            CAST(COALESCE(SUM({UPSTREAM_COST_EXPR}), 0) AS TEXT) AS upstream_cost,
            CAST(COALESCE(COUNT(DISTINCT {USER_ID_EXPR}), 0) AS TEXT) AS user_count,
            CAST(COALESCE(COUNT(DISTINCT CASE WHEN failed_request.request_key IS NULL THEN NULL ELSE COALESCE(NULLIF(usage.request_id, ''), CAST(usage.id AS TEXT)) END), 0) AS TEXT) AS failed_requests
        FROM ai_usage_fact usage
        LEFT JOIN (
            SELECT DISTINCT
                t.tenant_id,
                t.organization_id,
                COALESCE(NULLIF(t.request_id, ''), CAST(t.id AS TEXT)) AS request_key
            FROM ai_request_trace t
            INNER JOIN ai_usage_fact matched_usage
              ON matched_usage.tenant_id = t.tenant_id
             AND matched_usage.organization_id = t.organization_id
             AND matched_usage.status = 1
             AND NULLIF(matched_usage.request_id, '') IS NOT NULL
             AND matched_usage.request_id = t.request_id
            WHERE t.status = 1
              AND {trace_scope}
              AND t.started_at IS NOT NULL
              AND (?3 IS NULL OR t.started_at >= ?3)
              AND (?4 IS NULL OR t.started_at <= ?4)
              AND (?3 IS NULL OR matched_usage.occurred_at >= ?3)
              AND (?4 IS NULL OR matched_usage.occurred_at <= ?4)
              AND (
                (t.http_status IS NOT NULL AND t.http_status >= 400)
                OR t.error_type IS NOT NULL
                OR NULLIF(t.provider_error_code, '') IS NOT NULL
              )
        ) failed_request
          ON failed_request.tenant_id = usage.tenant_id
         AND failed_request.organization_id = usage.organization_id
         AND failed_request.request_key = COALESCE(NULLIF(usage.request_id, ''), CAST(usage.id AS TEXT))
        WHERE usage.status = 1
          AND {usage_scope}
          AND (?3 IS NULL OR usage.occurred_at >= ?3)
          AND (?4 IS NULL OR usage.occurred_at <= ?4)
        GROUP BY {MODEL_KEY_EXPR}, COALESCE(NULLIF(catalog_key, ''), {MODEL_KEY_EXPR}), modality
        ORDER BY {order_by}
        LIMIT ?5
        "#,
        MODEL_KEY_EXPR = MODEL_KEY_EXPR,
        USER_ID_EXPR = USER_ID_EXPR,
        REQUEST_COUNT_EXPR = REQUEST_COUNT_EXPR,
        TOKEN_COUNT_EXPR = TOKEN_COUNT_EXPR,
        POINTS_EXPR = POINTS_EXPR,
        UPSTREAM_COST_EXPR = UPSTREAM_COST_EXPR,
        trace_scope = scope_filter("t.tenant_id", "t.organization_id", "?1", "?2"),
        usage_scope = scope_filter("usage.tenant_id", "usage.organization_id", "?1", "?2"),
        order_by = order_by,
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

    Ok(rows
        .into_iter()
        .map(|row| {
            let model = string_cell(&row, "model");
            let catalog_key = string_cell(&row, "catalog_key");
            AnalyticsModelRankRow {
                vendor: vendor_from_catalog_key(&catalog_key, &model),
                model,
                catalog_key,
                modality: optional_integer_cell(&row, "modality"),
                request_count: integer_cell(&row, "request_count"),
                total_tokens: decimal_cell(&row, "total_tokens"),
                points: decimal_cell(&row, "points"),
                upstream_cost: decimal_cell(&row, "upstream_cost"),
                user_count: integer_cell(&row, "user_count"),
                failed_requests: integer_cell(&row, "failed_requests"),
            }
        })
        .collect())
}

async fn load_user_model_distributions(
    pool: &SqlitePool,
    tenant_id: i64,
    organization_id: i64,
    start_time: Option<&str>,
    end_time: Option<&str>,
) -> RepositoryResult<Vec<(String, Vec<AnalyticsPieRow>)>> {
    let sql = format!(
        r#"
        WITH agg AS (
            SELECT
                {USER_ID_EXPR} AS user_id,
                {MODEL_KEY_EXPR} AS name,
                COALESCE(SUM({POINTS_EXPR}), 0) AS value
            FROM ai_usage_fact
            WHERE status = 1
              AND {usage_scope}
              AND (?3 IS NULL OR occurred_at >= ?3)
              AND (?4 IS NULL OR occurred_at <= ?4)
            GROUP BY {USER_ID_EXPR}, {MODEL_KEY_EXPR}
            HAVING COALESCE(SUM({POINTS_EXPR}), 0) > 0
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
        SELECT user_id, name, CAST(value AS TEXT) AS value
        FROM top_rows
        UNION ALL
        SELECT user_id, name, CAST(value AS TEXT) AS value
        FROM others
        ORDER BY user_id ASC, CAST(value AS REAL) DESC, name ASC
        "#,
        USER_ID_EXPR = USER_ID_EXPR,
        MODEL_KEY_EXPR = MODEL_KEY_EXPR,
        POINTS_EXPR = POINTS_EXPR,
        usage_scope = scope_filter("tenant_id", "organization_id", "?1", "?2"),
        USER_MODEL_LIMIT = USER_MODEL_LIMIT,
    );
    let rows = sqlx::query(&sql)
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
            value: decimal_cell(&row, "value"),
        };
        match grouped.iter_mut().find(|(id, _)| id == &user_id) {
            Some((_, values)) => values.push(pie),
            None => grouped.push((user_id, vec![pie])),
        }
    }
    Ok(grouped)
}

async fn load_model_distribution(
    pool: &SqlitePool,
    tenant_id: i64,
    organization_id: i64,
    start_time: Option<&str>,
    end_time: Option<&str>,
) -> RepositoryResult<Vec<AnalyticsPieRow>> {
    let sql = format!(
        r#"
        WITH agg AS (
            SELECT
                {MODEL_KEY_EXPR} AS name,
                COALESCE(SUM({REQUEST_COUNT_EXPR}), 0) AS value
            FROM ai_usage_fact
            WHERE status = 1
              AND {usage_scope}
              AND (?3 IS NULL OR occurred_at >= ?3)
              AND (?4 IS NULL OR occurred_at <= ?4)
            GROUP BY {MODEL_KEY_EXPR}
            HAVING COALESCE(SUM({REQUEST_COUNT_EXPR}), 0) > 0
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
        SELECT name, CAST(value AS TEXT) AS value
        FROM top_rows
        UNION ALL
        SELECT name, CAST(value AS TEXT) AS value
        FROM others
        WHERE value > 0
        ORDER BY CAST(value AS REAL) DESC, name ASC
        "#,
        MODEL_KEY_EXPR = MODEL_KEY_EXPR,
        REQUEST_COUNT_EXPR = REQUEST_COUNT_EXPR,
        usage_scope = scope_filter("tenant_id", "organization_id", "?1", "?2"),
        PI_LIMIT = PI_LIMIT,
    );
    load_pie_rows(pool, &sql, tenant_id, organization_id, start_time, end_time).await
}

async fn load_modality_distribution(
    pool: &SqlitePool,
    tenant_id: i64,
    organization_id: i64,
    start_time: Option<&str>,
    end_time: Option<&str>,
) -> RepositoryResult<Vec<AnalyticsPieRow>> {
    let sql = format!(
        r#"
        WITH agg AS (
            SELECT
                COALESCE(CAST(modality AS TEXT), 'unknown') AS modality,
                COALESCE(SUM({REQUEST_COUNT_EXPR}), 0) AS value
            FROM ai_usage_fact
            WHERE status = 1
              AND {usage_scope}
              AND (?3 IS NULL OR occurred_at >= ?3)
              AND (?4 IS NULL OR occurred_at <= ?4)
            GROUP BY COALESCE(CAST(modality AS TEXT), 'unknown')
            HAVING COALESCE(SUM({REQUEST_COUNT_EXPR}), 0) > 0
        ),
        ordered AS (
            SELECT
                modality,
                value,
                ROW_NUMBER() OVER (ORDER BY value DESC, modality ASC) AS rn
            FROM agg
        ),
        top_rows AS (
            SELECT modality AS name_key, value
            FROM ordered
            WHERE rn <= {PI_LIMIT}
        ),
        others AS (
            SELECT 'Others' AS name_key, COALESCE(SUM(value), 0) AS value
            FROM ordered
            WHERE rn > {PI_LIMIT}
        )
        SELECT name_key, CAST(value AS TEXT) AS value
        FROM top_rows
        UNION ALL
        SELECT name_key, CAST(value AS TEXT) AS value
        FROM others
        WHERE value > 0
        ORDER BY CAST(value AS REAL) DESC, name_key ASC
        "#,
        REQUEST_COUNT_EXPR = REQUEST_COUNT_EXPR,
        usage_scope = scope_filter("tenant_id", "organization_id", "?1", "?2"),
        PI_LIMIT = PI_LIMIT,
    );
    let rows = sqlx::query(&sql)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(start_time)
        .bind(end_time)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("admin analytics query", error))?;

    Ok(rows
        .into_iter()
        .map(|row| {
            let name_key = string_cell(&row, "name_key");
            AnalyticsPieRow {
                name: if name_key == "Others" {
                    "Others".to_owned()
                } else {
                    modality::label(name_key.parse::<i64>().ok()).to_owned()
                },
                value: decimal_cell(&row, "value"),
            }
        })
        .collect())
}

async fn load_pie_rows(
    pool: &SqlitePool,
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

    Ok(rows
        .into_iter()
        .map(|row| AnalyticsPieRow {
            name: string_cell(&row, "name"),
            value: decimal_cell(&row, "value"),
        })
        .collect())
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
