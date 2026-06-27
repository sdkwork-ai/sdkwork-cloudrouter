use sqlx::{Row, SqlitePool};

use crate::error::{sql_error, RepositoryError, RepositoryResult};
use crate::types::{
    AppGatewayTraceItem, AppGatewayTracesReadFuture, AppGatewayTracesReadStore,
    AppGatewayTracesSubject,
};

const LOAD_GATEWAY_TRACES: &str = r#"
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
      AND (tenant_id IS NULL OR tenant_id = 0 OR tenant_id = ?1)
      AND (organization_id IS NULL OR organization_id = 0 OR organization_id = ?2)
    ORDER BY
        CASE WHEN health_status = 1 THEN 0 ELSE 1 END,
        last_heartbeat_at DESC,
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
    CAST(cg.last_heartbeat_at AS TEXT) AS last_heartbeat_at
FROM ai_request_trace t
LEFT JOIN current_gateway cg ON 1 = 1
WHERE t.status = 1
  AND t.tenant_id = ?1
  AND t.organization_id = ?2
  AND t.user_id = ?3
  AND t.started_at IS NOT NULL
ORDER BY t.started_at DESC, t.id DESC
LIMIT 100
"#;

#[derive(Debug, Clone)]
pub struct SqliteAppGatewayTracesReadStore {
    pool: SqlitePool,
}

impl SqliteAppGatewayTracesReadStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

impl AppGatewayTracesReadStore for SqliteAppGatewayTracesReadStore {
    fn load_gateway_traces<'a>(
        &'a self,
        subject: Option<AppGatewayTracesSubject>,
    ) -> AppGatewayTracesReadFuture<'a, Vec<AppGatewayTraceItem>> {
        Box::pin(async move { load_gateway_traces(&self.pool, subject).await })
    }
}

async fn load_gateway_traces(
    pool: &SqlitePool,
    subject: Option<AppGatewayTracesSubject>,
) -> RepositoryResult<Vec<AppGatewayTraceItem>> {
    let subject = require_subject(subject)?;
    let rows = sqlx::query(LOAD_GATEWAY_TRACES)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(subject.user_id)
        .fetch_all(pool)
        .await
        .map_err(sql_error)?;
    rows.into_iter().map(row_to_gateway_trace).collect()
}

fn row_to_gateway_trace(row: sqlx::sqlite::SqliteRow) -> RepositoryResult<AppGatewayTraceItem> {
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

fn string_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> String {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .unwrap_or_default()
}

fn required_integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> RepositoryResult<i64> {
    optional_integer_cell(row, column).ok_or_else(|| missing_integer_cell_error(column))
}

fn optional_integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> Option<i64> {
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

fn gateway_health_status(row: &sqlx::sqlite::SqliteRow) -> RepositoryResult<i64> {
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

fn gateway_deployment_mode(row: &sqlx::sqlite::SqliteRow) -> RepositoryResult<i64> {
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
