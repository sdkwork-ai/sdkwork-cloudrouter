use sqlx::{PgPool, Row};
use sdkwork_clawrouter_router_service::domain::DomainError;

use crate::error::{store_error, RepositoryError, RepositoryResult};
use crate::modality;
use crate::types::{
    AdminDashboardQuery, AdminDashboardReadFuture, AdminDashboardReadStore,
    AdminDashboardRecentUsageItem, AdminDashboardSnapshot, AdminDashboardTrafficItem,
    AdminPieChartItem,
};

const COLORS: [&str; 10] = [
    "#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#65a30d",
    "#ea580c", "#475569",
];

const LOAD_USER_CONSUMPTION: &str = r#"
SELECT
    COALESCE(NULLIF(owner_name_snapshot, ''), NULLIF(CAST(user_id AS TEXT), ''), '-') AS name,
    CAST(COALESCE(SUM(COALESCE(customer_charge_amount, 0)), 0) AS TEXT) AS value
FROM ai_usage
WHERE status = 1
  AND tenant_id = $1
  AND organization_id = $2
GROUP BY COALESCE(NULLIF(owner_name_snapshot, ''), NULLIF(CAST(user_id AS TEXT), ''), '-')
HAVING COALESCE(SUM(COALESCE(customer_charge_amount, 0)), 0) > 0
ORDER BY COALESCE(SUM(COALESCE(customer_charge_amount, 0)), 0) DESC, name ASC
LIMIT 8
"#;

const LOAD_MULTIMODAL: &str = r#"
SELECT
    modality,
    CAST(COALESCE(SUM(COALESCE(request_count, 1)), 0) AS TEXT) AS value
FROM ai_usage
WHERE status = 1
  AND tenant_id = $1
  AND organization_id = $2
  AND modality IS NOT NULL
GROUP BY modality
HAVING COALESCE(SUM(COALESCE(request_count, 1)), 0) > 0
ORDER BY COALESCE(SUM(COALESCE(request_count, 1)), 0) DESC, modality ASC
"#;

const LOAD_TRAFFIC: &str = r#"
SELECT
    substr(CAST(occurred_at AS TEXT), 1, 10) AS period,
    CAST(COALESCE(SUM(COALESCE(total_tokens, prompt_tokens + completion_tokens + cached_tokens, 0)), 0) AS TEXT) AS tokens,
    CAST(COALESCE(SUM(COALESCE(request_count, 1)), 0) AS TEXT) AS requests,
        CAST(COALESCE(SUM(COALESCE(customer_charge_amount, 0)), 0) AS TEXT) AS cost
FROM ai_usage
WHERE status = 1
  AND tenant_id = $1
  AND organization_id = $2
  AND occurred_at IS NOT NULL
GROUP BY period
ORDER BY period ASC
LIMIT 30
"#;

const LOAD_MODEL_DISTRIBUTION: &str = r#"
SELECT
    COALESCE(NULLIF(model, ''), NULLIF(catalog_key, ''), '-') AS name,
    CAST(COALESCE(SUM(COALESCE(request_count, 1)), 0) AS TEXT) AS value
FROM ai_usage
WHERE status = 1
  AND tenant_id = $1
  AND organization_id = $2
GROUP BY COALESCE(NULLIF(model, ''), NULLIF(catalog_key, ''), '-')
HAVING COALESCE(SUM(COALESCE(request_count, 1)), 0) > 0
ORDER BY COALESCE(SUM(COALESCE(request_count, 1)), 0) DESC, name ASC
LIMIT 8
"#;

const LOAD_RECENT_USAGE: &str = r#"
WITH selected_trace AS (
    SELECT *
    FROM (
        SELECT
            t.*,
            ROW_NUMBER() OVER (
                PARTITION BY COALESCE(NULLIF(t.request_id, ''), CAST(t.id AS TEXT))
                ORDER BY t.started_at DESC NULLS LAST, t.id DESC
            ) AS trace_rank
        FROM ai_request_trace t
        WHERE t.status = 1
          AND t.tenant_id = $1
          AND t.organization_id = $2
          AND t.started_at IS NOT NULL
    )
    WHERE trace_rank = 1
),
usage_by_request AS (
    SELECT
        tenant_id,
        organization_id,
        request_id,
        MAX(owner_name_snapshot) AS owner_name_snapshot,
        MAX(api_key_name_snapshot) AS api_key_name_snapshot,
        MAX(COALESCE(NULLIF(model, ''), NULLIF(catalog_key, ''))) AS model,
        MAX(modality) AS modality,
        CAST(COALESCE(SUM(COALESCE(prompt_tokens, 0)), 0) AS TEXT) AS prompt_tokens,
        CAST(COALESCE(SUM(COALESCE(completion_tokens, 0)), 0) AS TEXT) AS completion_tokens,
        CAST(COALESCE(SUM(COALESCE(request_count, 1)), 0) AS TEXT) AS request_count,
        CAST(COALESCE(SUM(COALESCE(customer_charge_amount, 0)), 0) AS TEXT) AS customer_charge_amount
    FROM ai_usage
    WHERE status = 1
      AND tenant_id = $1
      AND organization_id = $2
      AND NULLIF(request_id, '') IS NOT NULL
    GROUP BY tenant_id, organization_id, request_id
)
SELECT
    COALESCE(NULLIF(t.uuid, ''), 'trace-' || CAST(t.id AS TEXT)) AS id,
    COALESCE(NULLIF(t.owner_name_snapshot, ''), NULLIF(u.owner_name_snapshot, ''), NULLIF(CAST(t.user_id AS TEXT), ''), '-') AS user_label,
    CASE WHEN COALESCE(NULLIF(t.api_key_name_snapshot, ''), NULLIF(u.api_key_name_snapshot, ''), '') = '' THEN 0 ELSE 1 END AS is_api_user,
    COALESCE(NULLIF(u.model, ''), NULLIF(d.resolved_model, ''), NULLIF(t.provider_model, ''), NULLIF(t.requested_model, ''), '-') AS model,
    u.modality AS modality,
    COALESCE(u.prompt_tokens, CAST(COALESCE(t.prompt_tokens, 0) AS TEXT)) AS prompt_tokens,
    COALESCE(u.completion_tokens, CAST(COALESCE(t.completion_tokens, 0) AS TEXT)) AS completion_tokens,
    COALESCE(u.request_count, '1') AS request_count,
    CAST(COALESCE(t.started_at, t.created_at) AS TEXT) AS started_at,
    CASE
        WHEN (t.http_status IS NOT NULL AND t.http_status >= 400)
          OR t.error_type IS NOT NULL
          OR NULLIF(t.provider_error_code, '') IS NOT NULL THEN 'failed'
        ELSE 'success'
    END AS usage_status,
    COALESCE(u.customer_charge_amount, '0') AS customer_charge_amount
FROM selected_trace t
LEFT JOIN usage_by_request u
  ON u.tenant_id = t.tenant_id
 AND u.organization_id = t.organization_id
 AND u.request_id = t.request_id
LEFT JOIN ai_routing_decision_log d
  ON d.status = 1
 AND d.tenant_id = t.tenant_id
 AND d.organization_id = t.organization_id
 AND d.request_id = t.request_id
ORDER BY t.started_at DESC NULLS LAST, t.id DESC
LIMIT 10
"#;

const LOAD_ACTIVE_USERS: &str = r#"
SELECT COUNT(DISTINCT u.id) AS active_users
FROM iam_user u
JOIN iam_organization_membership m
  ON m.tenant_id = u.tenant_id
 AND m.user_id = u.id
 AND m.organization_id = $2::text
 AND (LOWER(CAST(m.status AS TEXT)) = 'active' OR CAST(m.status AS TEXT) = '1')
WHERE u.tenant_id = $1::text
  AND (LOWER(CAST(u.status AS TEXT)) = 'active' OR CAST(u.status AS TEXT) = '1')
"#;

#[derive(Debug, Clone)]
pub struct PostgresAdminDashboardReadStore {
    pool: PgPool,
}

impl PostgresAdminDashboardReadStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminDashboardReadStore for PostgresAdminDashboardReadStore {
    fn load_dashboard<'a>(&'a self, query: AdminDashboardQuery) -> AdminDashboardReadFuture<'a> {
        Box::pin(async move {
            let result: RepositoryResult<_> = async {
                let subject = query.subject;
                let active_users =
                    load_active_users(&self.pool, subject.tenant_id, subject.organization_id)
                        .await?;
                let user_consumption =
                    load_user_consumption(&self.pool, subject.tenant_id, subject.organization_id)
                        .await?;
                let multimodal =
                    load_multimodal(&self.pool, subject.tenant_id, subject.organization_id).await?;
                let traffic =
                    load_traffic(&self.pool, subject.tenant_id, subject.organization_id).await?;
                let model_distribution =
                    load_model_distribution(&self.pool, subject.tenant_id, subject.organization_id)
                        .await?;
                let recent_usage =
                    load_recent_usage(&self.pool, subject.tenant_id, subject.organization_id)
                        .await?;

                Ok(AdminDashboardSnapshot {
                    active_users,
                    user_consumption,
                    multimodal,
                    traffic,
                    model_distribution,
                    recent_usage,
                })
            }
            .await;
            result.map_err(|error| DomainError::new(error.to_string()))
        })
    }
}

async fn load_active_users(
    pool: &PgPool,
    tenant_id: i64,
    organization_id: i64,
) -> Result<i64, RepositoryError> {
    sqlx::query_scalar::<_, i64>(LOAD_ACTIVE_USERS)
        .bind(tenant_id)
        .bind(organization_id)
        .fetch_one(pool)
        .await
        .map_err(|error| store_error("failed to load admin dashboard active users", error))
}

async fn load_user_consumption(
    pool: &PgPool,
    tenant_id: i64,
    organization_id: i64,
) -> Result<Vec<AdminPieChartItem>, RepositoryError> {
    let rows = sqlx::query(LOAD_USER_CONSUMPTION)
        .bind(tenant_id)
        .bind(organization_id)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to load admin dashboard user consumption", error))?;
    rows.into_iter()
        .enumerate()
        .map(|(index, row)| pie_chart_item(row, "name", "value", index))
        .collect()
}

async fn load_multimodal(
    pool: &PgPool,
    tenant_id: i64,
    organization_id: i64,
) -> Result<Vec<AdminPieChartItem>, RepositoryError> {
    let rows = sqlx::query(LOAD_MULTIMODAL)
        .bind(tenant_id)
        .bind(organization_id)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to load admin dashboard multimodal usage", error))?;
    rows.into_iter()
        .enumerate()
        .map(|(index, row)| {
            Ok(AdminPieChartItem {
                name: modality_label(optional_integer_cell(&row, "modality")),
                value: non_negative_decimal_cell(&row, "value", "admin dashboard multimodal")?,
                color: color_for_index(index),
            })
        })
        .collect()
}

async fn load_traffic(
    pool: &PgPool,
    tenant_id: i64,
    organization_id: i64,
) -> Result<Vec<AdminDashboardTrafficItem>, RepositoryError> {
    let rows = sqlx::query(LOAD_TRAFFIC)
        .bind(tenant_id)
        .bind(organization_id)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to load admin dashboard traffic", error))?;
    rows.into_iter()
        .map(|row| {
            Ok(AdminDashboardTrafficItem {
                time: string_cell(&row, "period"),
                tokens: non_negative_decimal_cell(
                    &row,
                    "tokens",
                    "admin dashboard traffic tokens",
                )?,
                requests: non_negative_decimal_cell(
                    &row,
                    "requests",
                    "admin dashboard traffic requests",
                )?,
                cost: non_negative_decimal_cell(&row, "cost", "admin dashboard traffic cost")?,
            })
        })
        .collect()
}

async fn load_model_distribution(
    pool: &PgPool,
    tenant_id: i64,
    organization_id: i64,
) -> Result<Vec<AdminPieChartItem>, RepositoryError> {
    let rows = sqlx::query(LOAD_MODEL_DISTRIBUTION)
        .bind(tenant_id)
        .bind(organization_id)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to load admin dashboard model distribution", error))?;
    rows.into_iter()
        .enumerate()
        .map(|(index, row)| pie_chart_item(row, "name", "value", index))
        .collect()
}

async fn load_recent_usage(
    pool: &PgPool,
    tenant_id: i64,
    organization_id: i64,
) -> Result<Vec<AdminDashboardRecentUsageItem>, RepositoryError> {
    let rows = sqlx::query(LOAD_RECENT_USAGE)
        .bind(tenant_id)
        .bind(organization_id)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to load admin dashboard recent usage", error))?;
    rows.into_iter().map(recent_usage_item).collect()
}

fn pie_chart_item(
    row: sqlx::postgres::PgRow,
    name_column: &str,
    value_column: &str,
    index: usize,
) -> Result<AdminPieChartItem, RepositoryError> {
    Ok(AdminPieChartItem {
        name: string_cell(&row, name_column),
        value: non_negative_decimal_cell(&row, value_column, "admin dashboard pie chart value")?,
        color: color_for_index(index),
    })
}

fn recent_usage_item(
    row: sqlx::postgres::PgRow,
) -> Result<AdminDashboardRecentUsageItem, RepositoryError> {
    Ok(AdminDashboardRecentUsageItem {
        id: required_string_cell(&row, "id", "admin dashboard recent usage id")?,
        user: required_string_cell(&row, "user_label", "admin dashboard recent usage user")?,
        is_api_user: integer_cell(&row, "is_api_user") != 0,
        model: required_string_cell(&row, "model", "admin dashboard recent usage model")?,
        usage_type: modality_label(optional_integer_cell(&row, "modality")),
        billing_mode: "usage".to_owned(),
        usage_in: Some(non_negative_decimal_cell(
            &row,
            "prompt_tokens",
            "admin dashboard recent usage input tokens",
        )?),
        usage_out: Some(non_negative_decimal_cell(
            &row,
            "completion_tokens",
            "admin dashboard recent usage output tokens",
        )?),
        usage_count: Some(non_negative_decimal_cell(
            &row,
            "request_count",
            "admin dashboard recent usage request count",
        )?),
        time: required_string_cell(&row, "started_at", "admin dashboard recent usage time")?,
        status: required_string_cell(&row, "usage_status", "admin dashboard recent usage status")?,
        cost: decimal_string_cell(
            &row,
            "customer_charge_amount",
            6,
            "admin dashboard recent usage customer charge",
        )?,
    })
}

fn color_for_index(index: usize) -> String {
    COLORS[index % COLORS.len()].to_owned()
}

fn modality_label(value: Option<i64>) -> String {
    modality::label(value).to_owned()
}

fn required_string_cell(
    row: &sqlx::postgres::PgRow,
    column: &str,
    field_name: &str,
) -> Result<String, RepositoryError> {
    let value = string_cell(row, column);
    if sdkwork_utils_rust::is_blank(Some(value.as_str())) {
        return Err(RepositoryError::new(format!("missing {field_name}")));
    }
    Ok(value)
}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> String {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .unwrap_or_default()
}

fn integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> i64 {
    optional_integer_cell(row, column).unwrap_or(0)
}

fn optional_integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<i64> {
    row.try_get::<Option<i64>, _>(column)
        .ok()
        .flatten()
        .or_else(|| integer_string_cell(&string_cell(row, column)))
}

fn integer_string_cell(value: &str) -> Option<i64> {
    let value = value.trim();
    if let Ok(parsed) = value.parse::<i64>() {
        return Some(parsed);
    }
    let (whole, fraction) = value.split_once('.')?;
    if fraction.chars().all(|ch| ch == '0') {
        return whole.parse::<i64>().ok();
    }
    None
}

fn non_negative_decimal_cell(
    row: &sqlx::postgres::PgRow,
    column: &str,
    field_name: &str,
) -> Result<f64, RepositoryError> {
    let value = string_cell(row, column);
    let parsed = value
        .trim()
        .parse::<f64>()
        .map_err(|_| RepositoryError::new(format!("invalid {field_name}: {value}")))?;
    if !parsed.is_finite() || parsed < 0.0 {
        return Err(RepositoryError::new(format!(
            "invalid {field_name}: {value}"
        )));
    }
    Ok(parsed)
}

fn decimal_string_cell(
    row: &sqlx::postgres::PgRow,
    column: &str,
    digits: u32,
    field_name: &str,
) -> Result<String, RepositoryError> {
    let value = string_cell(row, column);
    format_decimal_fixed(&value, digits)
        .map_err(|_| RepositoryError::new(format!("invalid {field_name}: {value}")))
}

fn format_decimal_fixed(value: &str, digits: u32) -> RepositoryResult<String> {
    let trimmed = value.trim();
    let parsed: f64 = trimmed
        .parse()
        .map_err(|_| RepositoryError::new(format!("invalid decimal: {value}")))?;
    if !parsed.is_finite() {
        return Err(RepositoryError::new(format!("invalid decimal: {value}")));
    }
    Ok(format!("{parsed:.prec$}", prec = digits as usize))
}
