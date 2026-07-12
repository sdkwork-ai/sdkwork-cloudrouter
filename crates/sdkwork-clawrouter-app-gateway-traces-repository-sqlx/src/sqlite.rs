use sqlx::{Row, SqlitePool};

use crate::error::{sql_error, RepositoryError, RepositoryResult};
use crate::types::{
    encode_cursor, validate_subject, AppGatewayTraceItem, AppGatewayTracesListPage,
    AppGatewayTracesListQuery, AppGatewayTracesReadFuture, AppGatewayTracesReadStore,
    AppGatewayTracesSubject,
};

const GATEWAY_TRACES_SELECT_SQL: &str = r#"
SELECT
    COALESCE(NULLIF(t.trace_id, ''), NULLIF(t.request_id, ''), CAST(t.id AS TEXT)) AS id,
    CAST(COALESCE(t.started_at, t.created_at) AS TEXT) AS time,
    COALESCE(NULLIF(t.client_ip_masked, ''), '-') AS ip,
    COALESCE(NULLIF(t.request_path, ''), NULLIF(t.endpoint, ''), '-') AS endpoint,
    COALESCE(NULLIF(t.http_method, ''), 'POST') AS method,
    t.http_status AS status,
    t.latency_ms AS latency_ms,
    COALESCE(NULLIF(t.channel_name_snapshot, ''), '') AS channel_name_snapshot,
    CAST(t.gateway_instance_id AS TEXT) AS gateway_instance_id,
    COALESCE(NULLIF(t.gateway_instance_code_snapshot, ''), '') AS gateway_instance_code_snapshot,
    COALESCE(NULLIF(t.gateway_region_code_snapshot, ''), '') AS gateway_region_code_snapshot,
    COALESCE(NULLIF(t.gateway_node_name_snapshot, ''), '') AS gateway_node_name_snapshot,
    CAST(t.started_at AS TEXT) AS cursor_started_at,
    t.id AS cursor_id
FROM ai_request_trace t
WHERE t.status = 1
  AND t.tenant_id = ?1
  AND t.organization_id = ?2
  AND t.user_id = ?3
  AND t.started_at IS NOT NULL
  AND ?4 IS NULL
  AND (?5 IS NULL OR t.started_at < ?5 OR (t.started_at = ?5 AND t.id < ?6))
ORDER BY t.started_at DESC, t.id DESC
LIMIT ?7
"#;

const GATEWAY_TRACES_EXACT_SEARCH_SQL: &str = r#"
SELECT
    COALESCE(NULLIF(t.trace_id, ''), NULLIF(t.request_id, ''), CAST(t.id AS TEXT)) AS id,
    CAST(COALESCE(t.started_at, t.created_at) AS TEXT) AS time,
    COALESCE(NULLIF(t.client_ip_masked, ''), '-') AS ip,
    COALESCE(NULLIF(t.request_path, ''), NULLIF(t.endpoint, ''), '-') AS endpoint,
    COALESCE(NULLIF(t.http_method, ''), 'POST') AS method,
    t.http_status AS status,
    t.latency_ms AS latency_ms,
    COALESCE(NULLIF(t.channel_name_snapshot, ''), '') AS channel_name_snapshot,
    CAST(t.gateway_instance_id AS TEXT) AS gateway_instance_id,
    COALESCE(NULLIF(t.gateway_instance_code_snapshot, ''), '') AS gateway_instance_code_snapshot,
    COALESCE(NULLIF(t.gateway_region_code_snapshot, ''), '') AS gateway_region_code_snapshot,
    COALESCE(NULLIF(t.gateway_node_name_snapshot, ''), '') AS gateway_node_name_snapshot,
    CAST(t.started_at AS TEXT) AS cursor_started_at,
    t.id AS cursor_id
FROM ai_request_trace t
WHERE t.status = 1
  AND t.tenant_id = ?1
  AND t.organization_id = ?2
  AND t.user_id = ?3
  AND t.started_at IS NOT NULL
  AND (t.trace_id = ?4 OR t.request_id = ?4)
  AND (?5 IS NULL OR t.started_at < ?5 OR (t.started_at = ?5 AND t.id < ?6))
ORDER BY t.started_at DESC, t.id DESC
LIMIT ?7
"#;

const GATEWAY_TRACES_FUZZY_SEARCH_SQL: &str = r#"
SELECT
    COALESCE(NULLIF(t.trace_id, ''), NULLIF(t.request_id, ''), CAST(t.id AS TEXT)) AS id,
    CAST(COALESCE(t.started_at, t.created_at) AS TEXT) AS time,
    COALESCE(NULLIF(t.client_ip_masked, ''), '-') AS ip,
    COALESCE(NULLIF(t.request_path, ''), NULLIF(t.endpoint, ''), '-') AS endpoint,
    COALESCE(NULLIF(t.http_method, ''), 'POST') AS method,
    t.http_status AS status,
    t.latency_ms AS latency_ms,
    COALESCE(NULLIF(t.channel_name_snapshot, ''), '') AS channel_name_snapshot,
    CAST(t.gateway_instance_id AS TEXT) AS gateway_instance_id,
    COALESCE(NULLIF(t.gateway_instance_code_snapshot, ''), '') AS gateway_instance_code_snapshot,
    COALESCE(NULLIF(t.gateway_region_code_snapshot, ''), '') AS gateway_region_code_snapshot,
    COALESCE(NULLIF(t.gateway_node_name_snapshot, ''), '') AS gateway_node_name_snapshot,
    CAST(t.started_at AS TEXT) AS cursor_started_at,
    t.id AS cursor_id
FROM ai_request_trace t
WHERE t.status = 1
  AND t.tenant_id = ?1
  AND t.organization_id = ?2
  AND t.user_id = ?3
  AND t.started_at IS NOT NULL
  AND t.started_at >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-7 days')
  AND (lower(COALESCE(t.trace_id, '')) LIKE lower(?4) ESCAPE '\'
       OR lower(COALESCE(t.request_id, '')) LIKE lower(?4) ESCAPE '\'
       OR lower(COALESCE(NULLIF(t.request_path, ''), NULLIF(t.endpoint, ''), '')) LIKE lower(?4) ESCAPE '\'
       OR lower(COALESCE(t.channel_name_snapshot, '')) LIKE lower(?4) ESCAPE '\'
       OR lower(COALESCE(t.gateway_instance_code_snapshot, '')) LIKE lower(?4) ESCAPE '\'
       OR lower(COALESCE(t.gateway_region_code_snapshot, '')) LIKE lower(?4) ESCAPE '\'
       OR lower(COALESCE(t.gateway_node_name_snapshot, '')) LIKE lower(?4) ESCAPE '\')
  AND (?5 IS NULL OR t.started_at < ?5 OR (t.started_at = ?5 AND t.id < ?6))
ORDER BY t.started_at DESC, t.id DESC
LIMIT ?7
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
        query: AppGatewayTracesListQuery,
    ) -> AppGatewayTracesReadFuture<'a, AppGatewayTracesListPage> {
        Box::pin(async move { load_gateway_traces(&self.pool, subject, query).await })
    }
}

async fn load_gateway_traces(
    pool: &SqlitePool,
    subject: Option<AppGatewayTracesSubject>,
    query: AppGatewayTracesListQuery,
) -> RepositoryResult<AppGatewayTracesListPage> {
    let subject = require_subject(subject)?;
    let exact_search = query.search_query();
    let mut rows = fetch_gateway_trace_rows(
        pool,
        &subject,
        &query,
        if exact_search.is_some() {
            GATEWAY_TRACES_EXACT_SEARCH_SQL
        } else {
            GATEWAY_TRACES_SELECT_SQL
        },
        exact_search,
    )
    .await?;

    if exact_search.is_some() && rows.is_empty() {
        let fuzzy_search = query.search_pattern();
        rows = fetch_gateway_trace_rows(
            pool,
            &subject,
            &query,
            GATEWAY_TRACES_FUZZY_SEARCH_SQL,
            fuzzy_search.as_deref(),
        )
        .await?;
    }

    page_from_rows(rows, query.page_size())
}

async fn fetch_gateway_trace_rows(
    pool: &SqlitePool,
    subject: &AppGatewayTracesSubject,
    query: &AppGatewayTracesListQuery,
    sql: &str,
    search: Option<&str>,
) -> RepositoryResult<Vec<sqlx::sqlite::SqliteRow>> {
    let (cursor_started_at, cursor_id) = query
        .cursor_key()
        .map(|(started_at, id)| (Some(started_at), Some(id)))
        .unwrap_or((None, None));
    sqlx::query(sql)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(subject.user_id)
        .bind(search)
        .bind(cursor_started_at)
        .bind(cursor_id)
        .bind(query.page_size() + 1)
        .fetch_all(pool)
        .await
        .map_err(sql_error)
}

fn page_from_rows(
    mut rows: Vec<sqlx::sqlite::SqliteRow>,
    page_size: i64,
) -> RepositoryResult<AppGatewayTracesListPage> {
    let has_more = rows.len() > page_size as usize;
    if has_more {
        rows.truncate(page_size as usize);
    }
    let rows = rows
        .into_iter()
        .map(row_to_gateway_trace)
        .collect::<RepositoryResult<Vec<_>>>()?;
    let next_cursor = if has_more {
        rows.last()
            .map(|row| encode_cursor(&row.cursor_started_at, row.cursor_id))
            .transpose()?
    } else {
        None
    };
    Ok(AppGatewayTracesListPage {
        items: rows.into_iter().map(|row| row.item).collect(),
        page_size,
        next_cursor,
        has_more,
    })
}

struct AppGatewayTraceRow {
    item: AppGatewayTraceItem,
    cursor_started_at: String,
    cursor_id: i64,
}

fn row_to_gateway_trace(row: sqlx::sqlite::SqliteRow) -> RepositoryResult<AppGatewayTraceRow> {
    let status = gateway_http_status(required_integer_cell(&row, "status")?)?;
    let latency_ms = gateway_latency_ms(optional_integer_cell(&row, "latency_ms").unwrap_or(0))?;
    Ok(AppGatewayTraceRow {
        item: AppGatewayTraceItem {
            id: string_cell(&row, "id"),
            time: string_cell(&row, "time"),
            ip: string_cell(&row, "ip"),
            endpoint: string_cell(&row, "endpoint"),
            method: http_method_label(&string_cell(&row, "method")),
            status,
            duration: latency_label(latency_ms),
            channel: gateway_channel_label(
                &string_cell(&row, "channel_name_snapshot"),
                &string_cell(&row, "gateway_instance_id"),
                &string_cell(&row, "gateway_instance_code_snapshot"),
                &string_cell(&row, "gateway_node_name_snapshot"),
                &string_cell(&row, "gateway_region_code_snapshot"),
            ),
        },
        cursor_started_at: string_cell(&row, "cursor_started_at"),
        cursor_id: required_integer_cell(&row, "cursor_id")?,
    })
}

fn require_subject(
    subject: Option<AppGatewayTracesSubject>,
) -> RepositoryResult<AppGatewayTracesSubject> {
    let subject = subject.ok_or_else(|| {
        RepositoryError::new("trusted request subject is required for app gateway traces")
    })?;
    validate_subject(&subject)?;
    Ok(subject)
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
    gateway_instance_id: &str,
    gateway_instance_code_snapshot: &str,
    gateway_node_name_snapshot: &str,
    gateway_region_code_snapshot: &str,
) -> String {
    if !channel_name_snapshot.trim().is_empty() {
        return channel_name_snapshot.trim().to_owned();
    }
    let instance_code = gateway_instance_code_snapshot.trim();
    let node_name = gateway_node_name_snapshot.trim();
    let region_code = gateway_region_code_snapshot.trim();
    if !instance_code.is_empty() && !region_code.is_empty() {
        return format!("{instance_code}@{region_code}");
    }
    if !node_name.is_empty() && !region_code.is_empty() {
        return format!("{node_name}@{region_code}");
    }
    if !instance_code.is_empty() {
        return instance_code.to_owned();
    }
    if !node_name.is_empty() {
        return node_name.to_owned();
    }
    if !region_code.is_empty() {
        return format!("gateway-{region_code}");
    }
    let gateway_instance_id = gateway_instance_id.trim();
    if !gateway_instance_id.is_empty() {
        return format!("gateway-{gateway_instance_id}");
    }
    "unknown".to_owned()
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

fn missing_integer_cell_error(column: &str) -> RepositoryError {
    RepositoryError::new(format!("missing gateway trace {column} from database row"))
}
