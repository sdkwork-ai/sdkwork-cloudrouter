use sqlx::{PgPool, Row};
use sdkwork_clawrouter_router_service::domain::DomainError;

use crate::error::{row_error, store_error, RepositoryError, RepositoryResult};
use crate::types::{
    AdminMonitorAlert, AdminMonitorCollection, AdminMonitorNode, AdminMonitorPerformanceDatum,
    AdminMonitorQuery, AdminMonitorReadFuture, AdminMonitorReadStore,
};

#[derive(Debug, Clone)]
pub struct PostgresAdminMonitorReadStore {
    pool: PgPool,
}

impl PostgresAdminMonitorReadStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminMonitorReadStore for PostgresAdminMonitorReadStore {
    fn list_monitor_nodes<'a>(
        &'a self,
        query: AdminMonitorQuery,
    ) -> AdminMonitorReadFuture<'a, AdminMonitorCollection<AdminMonitorNode>> {
        Box::pin(async move {
            list_monitor_nodes(&self.pool, query)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }

    fn list_monitor_alerts<'a>(
        &'a self,
        query: AdminMonitorQuery,
    ) -> AdminMonitorReadFuture<'a, AdminMonitorCollection<AdminMonitorAlert>> {
        Box::pin(async move {
            list_monitor_alerts(&self.pool, query)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }

    fn list_monitor_performance<'a>(
        &'a self,
        query: AdminMonitorQuery,
    ) -> AdminMonitorReadFuture<'a, AdminMonitorCollection<AdminMonitorPerformanceDatum>> {
        Box::pin(async move {
            list_monitor_performance(&self.pool, query)
                .await
                .map_err(|error| DomainError::new(error.to_string()))
        })
    }
}

async fn list_monitor_nodes(
    pool: &PgPool,
    query: AdminMonitorQuery,
) -> RepositoryResult<AdminMonitorCollection<AdminMonitorNode>> {
    let search_pattern = query
        .q
        .as_ref()
        .map(|value| format!("%{}%", value.to_ascii_lowercase()));
    let rows = sqlx::query(
        r#"
        WITH filtered_nodes AS (
            SELECT
                i.id,
                COALESCE(NULLIF(i.node_name, ''), NULLIF(i.host_name, ''), NULLIF(i.instance_code, ''), i.uuid) AS name,
                COALESCE(i.region, '') AS region,
                i.health_status AS health_status,
                h.cpu_percent::text AS cpu,
                h.memory_percent::text AS memory,
                h.uptime_seconds,
                COALESCE(i.ip_address_masked, '') AS ip
            FROM ops_gateway_instance i
            LEFT JOIN LATERAL (
                SELECT latest.id, latest.cpu_percent, latest.memory_percent, latest.uptime_seconds
                FROM ops_gateway_heartbeat latest
                WHERE latest.instance_id = i.id
                  AND latest.status = 1
                ORDER BY latest.heartbeat_at DESC NULLS LAST, latest.id DESC
                LIMIT 1
            ) h ON true
            WHERE (i.tenant_id = $1 OR i.tenant_id = 0 OR i.tenant_id IS NULL)
              AND (i.organization_id = $2 OR i.organization_id = 0 OR i.organization_id IS NULL)
              AND i.status = 1
              AND i.deleted_at IS NULL
              AND (
                  $3::text IS NULL
                  OR LOWER(COALESCE(NULLIF(i.node_name, ''), NULLIF(i.host_name, ''), NULLIF(i.instance_code, ''), i.uuid)) LIKE $4
                  OR LOWER(COALESCE(i.region, '')) LIKE $5
                  OR LOWER(COALESCE(i.ip_address_masked, '')) LIKE $6
              )
        )
        SELECT *, COUNT(*) OVER() AS total
        FROM filtered_nodes
        ORDER BY id DESC
        LIMIT $7 OFFSET $8
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(search_pattern.as_deref())
    .bind(search_pattern.as_deref())
    .bind(search_pattern.as_deref())
    .bind(search_pattern.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list monitor nodes", error))?;

    let total = rows
        .first()
        .map(|row| required_integer_cell(row, "total"))
        .transpose()?
        .unwrap_or(0);
    let items = rows
        .into_iter()
        .map(node_from_row)
        .collect::<RepositoryResult<Vec<_>>>()?;
    Ok(AdminMonitorCollection {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn list_monitor_alerts(
    pool: &PgPool,
    query: AdminMonitorQuery,
) -> RepositoryResult<AdminMonitorCollection<AdminMonitorAlert>> {
    let search_pattern = query
        .q
        .as_ref()
        .map(|value| format!("%{}%", value.to_ascii_lowercase()));
    let rows = sqlx::query(
        r#"
        WITH filtered_alerts AS (
            SELECT
                COALESCE(alert_no, id::text) AS id,
                severity,
                COALESCE(title, '') AS title,
                COALESCE(message, '') AS message,
                COALESCE(last_seen_at, first_seen_at, created_at)::text AS alert_time,
                alert_status,
                resolved_at::text AS resolved_at,
                COALESCE(source, '') AS source
            FROM ops_alert_event
            WHERE (tenant_id = $1 OR tenant_id = 0 OR tenant_id IS NULL)
              AND (organization_id = $2 OR organization_id = 0 OR organization_id IS NULL)
              AND status = 1
              AND (
                  $3::text IS NULL
                  OR LOWER(COALESCE(title, '')) LIKE $4
                  OR LOWER(COALESCE(message, '')) LIKE $5
                  OR LOWER(COALESCE(source, '')) LIKE $6
              )
        )
        SELECT *, COUNT(*) OVER() AS total
        FROM filtered_alerts
        ORDER BY alert_time DESC NULLS LAST, id DESC
        LIMIT $7 OFFSET $8
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(search_pattern.as_deref())
    .bind(search_pattern.as_deref())
    .bind(search_pattern.as_deref())
    .bind(search_pattern.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list monitor alerts", error))?;

    let total = rows
        .first()
        .map(|row| required_integer_cell(row, "total"))
        .transpose()?
        .unwrap_or(0);
    let items = rows
        .into_iter()
        .map(alert_from_row)
        .collect::<RepositoryResult<Vec<_>>>()?;
    Ok(AdminMonitorCollection {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn list_monitor_performance(
    pool: &PgPool,
    query: AdminMonitorQuery,
) -> RepositoryResult<AdminMonitorCollection<AdminMonitorPerformanceDatum>> {
    let rows = sqlx::query(
        r#"
        WITH filtered_performance AS (
            SELECT
                period_start::text AS period_start,
                MAX(CASE WHEN metric_name IN ('cpu', 'cpu_percent', 'system.cpu') THEN metric_value END)::text AS cpu,
                MAX(CASE WHEN metric_name IN ('memory', 'memory_percent', 'system.memory') THEN metric_value END)::text AS memory,
                MAX(CASE WHEN metric_name IN ('network', 'network_mbps', 'network_traffic', 'system.network') THEN metric_value END)::text AS network
            FROM ops_metric_snapshot
            WHERE (tenant_id = $1 OR tenant_id = 0 OR tenant_id IS NULL)
              AND (organization_id = $2 OR organization_id = 0 OR organization_id IS NULL)
              AND status = 1
              AND metric_name IN ('cpu', 'cpu_percent', 'system.cpu', 'memory', 'memory_percent', 'system.memory', 'network', 'network_mbps', 'network_traffic', 'system.network')
              AND period_start IS NOT NULL
            GROUP BY period_start
        )
        SELECT *, COUNT(*) OVER() AS total
        FROM filtered_performance
        ORDER BY period_start ASC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list monitor performance", error))?;

    let total = rows
        .first()
        .map(|row| required_integer_cell(row, "total"))
        .transpose()?
        .unwrap_or(0);
    let items = rows
        .into_iter()
        .map(performance_from_row)
        .collect::<RepositoryResult<Vec<_>>>()?;
    Ok(AdminMonitorCollection {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

fn node_from_row(row: sqlx::postgres::PgRow) -> RepositoryResult<AdminMonitorNode> {
    let id = required_integer_cell(&row, "id")?.to_string();
    Ok(AdminMonitorNode {
        id,
        name: row.try_get("name").map_err(row_error)?,
        region: row.try_get("region").map_err(row_error)?,
        status: node_status_label(required_integer_cell(&row, "health_status")?)?,
        cpu: required_decimal_cell(&row, "cpu")?,
        memory: required_decimal_cell(&row, "memory")?,
        uptime: format_uptime(required_integer_cell(&row, "uptime_seconds")?),
        ip: row.try_get("ip").map_err(row_error)?,
    })
}

fn alert_from_row(row: sqlx::postgres::PgRow) -> RepositoryResult<AdminMonitorAlert> {
    Ok(AdminMonitorAlert {
        id: row.try_get("id").map_err(row_error)?,
        severity: severity_label(required_integer_cell(&row, "severity")?)?,
        title: row.try_get("title").map_err(row_error)?,
        message: row.try_get("message").map_err(row_error)?,
        time: row.try_get("alert_time").map_err(row_error)?,
        status: alert_status_label(
            required_integer_cell(&row, "alert_status")?,
            row.try_get::<Option<String>, _>("resolved_at")
                .ok()
                .flatten(),
        ),
        source: row.try_get("source").map_err(row_error)?,
    })
}

fn performance_from_row(
    row: sqlx::postgres::PgRow,
) -> RepositoryResult<AdminMonitorPerformanceDatum> {
    let period_start = row
        .try_get::<String, _>("period_start")
        .map_err(row_error)?;
    Ok(AdminMonitorPerformanceDatum {
        time: format_metric_time(&period_start),
        cpu: required_decimal_cell(&row, "cpu")?,
        memory: required_decimal_cell(&row, "memory")?,
        network: required_decimal_cell(&row, "network")?,
    })
}

fn node_status_label(status: i64) -> RepositoryResult<String> {
    match status {
        1 => Ok("online"),
        2 => Ok("warning"),
        0 => Ok("offline"),
        value => Err(RepositoryError::new(format!(
            "invalid monitor health_status from database row: {value}"
        ))),
    }
    .map(str::to_owned)
}

fn severity_label(severity: i64) -> RepositoryResult<String> {
    match severity {
        value if value >= 3 => Ok("critical"),
        2 => Ok("warning"),
        1 => Ok("info"),
        value => Err(RepositoryError::new(format!(
            "invalid monitor severity from database row: {value}"
        ))),
    }
    .map(str::to_owned)
}

fn alert_status_label(status: i64, resolved_at: Option<String>) -> String {
    if resolved_at.is_some() || status == 2 {
        "resolved"
    } else {
        "active"
    }
    .to_owned()
}

fn format_uptime(seconds: i64) -> String {
    let seconds = seconds.max(0);
    let days = seconds / 86_400;
    let hours = (seconds % 86_400) / 3_600;
    let minutes = (seconds % 3_600) / 60;
    if days > 0 {
        format!("{days}d {hours}h")
    } else if hours > 0 {
        format!("{hours}h {minutes}m")
    } else {
        format!("{minutes}m")
    }
}

fn format_metric_time(value: &str) -> String {
    if value.len() >= 16 && value.as_bytes().get(10) == Some(&b' ') {
        return value[11..16].to_owned();
    }
    if value.len() >= 16 && value.as_bytes().get(10) == Some(&b'T') {
        return value[11..16].to_owned();
    }
    value.to_owned()
}

fn required_integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> RepositoryResult<i64> {
    row.try_get::<Option<i64>, _>(column)
        .ok()
        .flatten()
        .or_else(|| {
            row.try_get::<Option<i32>, _>(column)
                .ok()
                .flatten()
                .map(i64::from)
        })
        .ok_or_else(|| RepositoryError::new(format!("missing monitor {column} from database row")))
}

fn required_decimal_cell(row: &sqlx::postgres::PgRow, column: &str) -> RepositoryResult<f64> {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .and_then(|value| value.parse().ok())
        .ok_or_else(|| RepositoryError::new(format!("invalid monitor {column} from database row")))
}
