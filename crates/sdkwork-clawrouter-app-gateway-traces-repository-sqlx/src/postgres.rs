use sqlx::{PgPool, Row};

use crate::error::{sql_error, RepositoryError, RepositoryResult};
use crate::types::{
    AppGatewayTraceItem, AppGatewayTracesListPage, AppGatewayTracesListQuery,
    AppGatewayTracesReadFuture, AppGatewayTracesReadStore, AppGatewayTracesSubject,
};

fn gateway_traces_select_sql() -> &'static str {
    r#"
WITH current_gateway AS (
    SELECT
        id AS gateway_id,
        deployment_mode,
        region,
        node_name,
        health_status,
        last_heartbeat_at
    FROM ops_gateway_instance
    WHERE status = 1
      AND deleted_at IS NULL
      AND (tenant_id IS NULL OR tenant_id = 0 OR tenant_id = $1)
      AND (organization_id IS NULL OR organization_id = 0 OR organization_id = $2)
    ORDER BY
        CASE WHEN health_status = 1 THEN 0 ELSE 1 END,
        last_heartbeat_at DESC NULLS LAST,
        id DESC
    LIMIT 1
)
SELECT
    COALESCE(NULLIF(t.trace_id, ''), NULLIF(t.request_id, ''), CAST(t.id AS TEXT)) AS id,
    CAST(COALESCE(t.started_at, t.created_at) AS TEXT) AS time,
    COALESCE(NULLIF(t.client_ip_masked, ''), '-') AS ip,
    COALESCE(NULLIF(t.request_path, ''), NULLIF(t.endpoint, ''), '-') AS endpoint,
    COALESCE(NULLIF(t.http_method, ''), 'POST') AS method,
    t.http_status AS status,
    t.latency_ms AS latency_ms,
    COALESCE(NULLIF(t.channel_name_snapshot, ''), '') AS channel_name_snapshot,
    CAST(cg.gateway_id AS TEXT) AS gateway_id,
    cg.deployment_mode AS deployment_mode,
    COALESCE(NULLIF(cg.region, ''), '') AS region,
    COALESCE(NULLIF(cg.node_name, ''), '') AS node_name,
    cg.health_status AS health_status,
    CAST(cg.last_heartbeat_at AS TEXT) AS last_heartbeat_at,
    COUNT(*) OVER() AS total
FROM ai_request_trace t
LEFT JOIN current_gateway cg ON true
WHERE t.status = 1
  AND t.tenant_id = $1
  AND t.organization_id = $2
  AND t.user_id = $3
  AND t.started_at IS NOT NULL
  AND ($4::text IS NULL OR lower(COALESCE(t.trace_id, t.request_id, CAST(t.id AS TEXT), '')) LIKE lower($4)
       OR lower(COALESCE(t.request_path, t.endpoint, '')) LIKE lower($4)
       OR lower(COALESCE(t.channel_name_snapshot, '')) LIKE lower($4))
ORDER BY t.started_at DESC NULLS LAST, t.id DESC
LIMIT $5 OFFSET $6
"#
}

#[derive(Debug, Clone)]
pub struct PostgresAppGatewayTracesReadStore {
    pool: PgPool,
}

impl PostgresAppGatewayTracesReadStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AppGatewayTracesReadStore for PostgresAppGatewayTracesReadStore {
    fn load_gateway_traces<'a>(
        &'a self,
        subject: Option<AppGatewayTracesSubject>,
        query: AppGatewayTracesListQuery,
    ) -> AppGatewayTracesReadFuture<'a, AppGatewayTracesListPage> {
        Box::pin(async move { load_gateway_traces(&self.pool, subject, query).await })
    }
}

async fn load_gateway_traces(
    pool: &PgPool,
    subject: Option<AppGatewayTracesSubject>,
    query: AppGatewayTracesListQuery,
) -> RepositoryResult<AppGatewayTracesListPage> {
    let subject = require_subject(subject)?;
    let search = query.q.as_deref().map(|value| format!("%{value}%"));
    let rows = sqlx::query(gateway_traces_select_sql())
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(subject.user_id)
        .bind(search)
        .bind(query.page_size.max(1))
        .bind(query.offset.max(0))
        .fetch_all(pool)
        .await
        .map_err(sql_error)?;
    let total = rows
        .first()
        .and_then(|row| optional_integer_cell(row, "total"))
        .unwrap_or(0);
    let items = rows
        .into_iter()
        .map(row_to_gateway_trace)
        .collect::<RepositoryResult<Vec<_>>>()?;
    Ok(AppGatewayTracesListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

fn row_to_gateway_trace(row: sqlx::postgres::PgRow) -> RepositoryResult<AppGatewayTraceItem> {
    let status = gateway_http_status(required_integer_cell(&row, "status")?)?;
    let latency_ms = gateway_latency_ms(required_integer_cell(&row, "latency_ms")?)?;
    let health_status = gateway_health_status(&row)?;
    let deployment_mode = gateway_deployment_mode(&row)?;
    Ok(AppGatewayTraceItem {
        id: string_cell(&row, "id"),
        time: string_cell(&row, "time"),
        ip: string_cell(&row, "ip"),
        endpoint: string_cell(&row, "endpoint"),
        method: http_method_label(&string_cell(&row, "method")),
        status,
        duration: latency_label(latency_ms),
        channel: gateway_channel_label(
            &string_cell(&row, "channel_name_snapshot"),
            &string_cell(&row, "node_name"),
            &string_cell(&row, "region"),
            deployment_mode,
            health_status,
            &string_cell(&row, "last_heartbeat_at"),
        ),
    })
}

fn require_subject(
    subject: Option<AppGatewayTracesSubject>,
) -> RepositoryResult<AppGatewayTracesSubject> {
    subject.ok_or_else(|| {
        RepositoryError::new("trusted request subject is required for app gateway traces")
    })
}

fn http_method_label(value: &str) -> String {
    match value.trim().to_ascii_uppercase().as_str() {
        "GET" => "GET",
        "PUT" => "PUT",
        "PATCH" => "PATCH",
        "DELETE" => "DELETE",
        "OPTIONS" => "OPTIONS",
        "HEAD" => "HEAD",
        _ => "POST",
    }
    .to_owned()
}

fn latency_label(value: i64) -> String {
    format!("{}ms", value.max(0))
}

fn gateway_channel_label(
    channel_name_snapshot: &str,
    node_name: &str,
    region: &str,
    deployment_mode: i64,
    health_status: i64,
    last_heartbeat_at: &str,
) -> String {
    if !channel_name_snapshot.trim().is_empty() {
        return channel_name_snapshot.trim().to_owned();
    }
    let node_name = node_name.trim();
    let region = region.trim();
    if !node_name.is_empty() && !region.is_empty() {
        return format!("{node_name}@{region}");
    }
    if !node_name.is_empty() {
        return node_name.to_owned();
    }
    if !region.is_empty() {
        return format!("gateway-{region}");
    }
    let mode = match deployment_mode {
        1 => "desktop",
        2 => "server",
        3 => "docker",
        4 => "kubernetes",
        _ => "gateway",
    };
    if health_status > 0 && !last_heartbeat_at.trim().is_empty() {
        return format!("{mode}-node");
    }
    mode.to_owned()
}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> String {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .unwrap_or_default()
}

fn required_integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> RepositoryResult<i64> {
    optional_integer_cell(row, column).ok_or_else(|| missing_integer_cell_error(column))
}

fn optional_integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<i64> {
    row.try_get::<Option<i64>, _>(column)
        .ok()
        .flatten()
        .or_else(|| {
            row.try_get::<Option<i32>, _>(column)
                .ok()
                .flatten()
                .map(i64::from)
        })
        .or_else(|| string_cell(row, column).parse::<i64>().ok())
}

fn gateway_http_status(value: i64) -> RepositoryResult<i64> {
    if (100..=599).contains(&value) {
        Ok(value)
    } else {
        Err(RepositoryError::new(format!(
            "invalid gateway trace status from database row: {value}"
        )))
    }
}

fn gateway_latency_ms(value: i64) -> RepositoryResult<i64> {
    if value >= 0 {
        Ok(value)
    } else {
        Err(RepositoryError::new(format!(
            "invalid gateway trace latency_ms from database row: {value}"
        )))
    }
}

fn gateway_health_status(row: &sqlx::postgres::PgRow) -> RepositoryResult<i64> {
    if string_cell(row, "gateway_id").trim().is_empty() {
        return Ok(0);
    }
    let value = required_integer_cell(row, "health_status")?;
    match value {
        1 | 2 => Ok(value),
        value => Err(RepositoryError::new(format!(
            "invalid gateway trace health_status from database row: {value}"
        ))),
    }
}

fn gateway_deployment_mode(row: &sqlx::postgres::PgRow) -> RepositoryResult<i64> {
    if string_cell(row, "gateway_id").trim().is_empty() {
        return Ok(0);
    }
    let value = required_integer_cell(row, "deployment_mode")?;
    match value {
        1..=4 => Ok(value),
        value => Err(RepositoryError::new(format!(
            "invalid gateway trace deployment_mode from database row: {value}"
        ))),
    }
}

fn missing_integer_cell_error(column: &str) -> RepositoryError {
    match column {
        "health_status" => {
            RepositoryError::new("missing gateway trace health_status from database row")
        }
        "deployment_mode" => {
            RepositoryError::new("missing gateway trace deployment_mode from database row")
        }
        column => RepositoryError::new(format!("missing gateway trace {column} from database row")),
    }
}
