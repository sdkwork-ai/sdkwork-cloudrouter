use sqlx::{PgPool, Row};

use crate::domain::{DomainError, DomainResult};
use crate::ports::{
    AppGatewayTraceItem, AppGatewayTracesCursor, AppGatewayTracesPage, AppGatewayTracesQuery,
    AppGatewayTracesReadFuture, AppGatewayTracesReadStore, AppGatewayTracesSubject,
};

const LOAD_GATEWAY_TRACES: &str = r#"
SELECT
    COALESCE(NULLIF(t.trace_id, ''), NULLIF(t.request_id, ''), CAST(t.id AS TEXT)) AS public_id,
    CAST(t.started_at AS TEXT) AS started_at,
    COALESCE(NULLIF(t.client_ip_masked, ''), '-') AS client_ip_masked,
    COALESCE(NULLIF(t.request_path, ''), NULLIF(t.endpoint, ''), '-') AS request_endpoint,
    UPPER(t.http_method) AS http_method,
    t.http_status AS http_status,
    t.latency_ms AS latency_ms,
    COALESCE(NULLIF(t.account_name_snapshot, ''), '-') AS upstream_account,
    CAST(TRUNC(EXTRACT(EPOCH FROM t.started_at) * 1000000) AS BIGINT) AS cursor_started_at_micros,
    t.id AS cursor_id
FROM ai_request_trace t
WHERE t.status = 1
  AND t.tenant_id = $1
  AND t.organization_id = $2
  AND t.user_id = $3
  AND (
      $4::bigint IS NULL
      OR t.started_at < TIMESTAMPTZ 'epoch' + ($4::bigint * INTERVAL '1 microsecond')
      OR (
          t.started_at = TIMESTAMPTZ 'epoch' + ($4::bigint * INTERVAL '1 microsecond')
          AND t.id < $5
      )
  )
  AND (
      $6::text IS NULL
      OR LOWER(COALESCE(t.trace_id, '')) LIKE $6 ESCAPE '\'
      OR LOWER(COALESCE(t.request_id, '')) LIKE $6 ESCAPE '\'
      OR LOWER(COALESCE(t.request_path, '')) LIKE $6 ESCAPE '\'
      OR LOWER(COALESCE(t.endpoint, '')) LIKE $6 ESCAPE '\'
      OR LOWER(COALESCE(t.client_ip_masked, '')) LIKE $6 ESCAPE '\'
      OR LOWER(COALESCE(t.account_name_snapshot, '')) LIKE $6 ESCAPE '\'
  )
ORDER BY t.started_at DESC, t.id DESC
LIMIT $7
"#;

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
        query: AppGatewayTracesQuery,
        subject: Option<AppGatewayTracesSubject>,
    ) -> AppGatewayTracesReadFuture<'a> {
        Box::pin(async move {
            let subject = subject.ok_or_else(|| {
                DomainError::new("trusted request subject is required for gateway traces")
            })?;
            let cursor_started_at_micros =
                query.cursor.as_ref().map(|cursor| cursor.started_at_micros);
            let cursor_id = query.cursor.as_ref().map(|cursor| cursor.id);
            let fetch_limit = query.page_size.checked_add(1).ok_or_else(|| {
                DomainError::new("gateway traces page size exceeds the supported range")
            })?;
            let rows = sqlx::query(LOAD_GATEWAY_TRACES)
                .bind(subject.tenant_id)
                .bind(subject.organization_id)
                .bind(subject.user_id)
                .bind(cursor_started_at_micros)
                .bind(cursor_id)
                .bind(keyword_like(query.keyword.as_deref()))
                .bind(fetch_limit)
                .fetch_all(&self.pool)
                .await
                .map_err(masked_sql_error)?;

            map_gateway_trace_page(rows, query.page_size)
        })
    }
}

fn map_gateway_trace_page(
    rows: Vec<sqlx::postgres::PgRow>,
    page_size: i64,
) -> DomainResult<AppGatewayTracesPage> {
    let page_size_usize = usize::try_from(page_size)
        .map_err(|_| DomainError::new("gateway traces page size is invalid"))?;
    let has_more = rows.len() > page_size_usize;
    let mut mapped_rows = rows
        .into_iter()
        .take(page_size_usize)
        .map(row_to_gateway_trace)
        .collect::<DomainResult<Vec<_>>>()?;
    let next_cursor = if has_more {
        mapped_rows.last().map(|row| row.cursor.clone())
    } else {
        None
    };
    let items = mapped_rows.drain(..).map(|row| row.item).collect();

    Ok(AppGatewayTracesPage {
        items,
        next_cursor,
        has_more,
        page_size,
    })
}

struct MappedGatewayTraceRow {
    item: AppGatewayTraceItem,
    cursor: AppGatewayTracesCursor,
}

fn row_to_gateway_trace(row: sqlx::postgres::PgRow) -> DomainResult<MappedGatewayTraceRow> {
    let method = required_string_cell(&row, "http_method", "gateway trace HTTP method")?;
    if !matches!(
        method.as_str(),
        "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD" | "CONNECT" | "TRACE"
    ) {
        return Err(DomainError::new(
            "invalid gateway trace HTTP method from database row",
        ));
    }
    let status = required_integer_cell(&row, "http_status", "gateway trace HTTP status")?;
    if !(100..=599).contains(&status) {
        return Err(DomainError::new(
            "invalid gateway trace HTTP status from database row",
        ));
    }
    let latency_ms = optional_integer_cell(&row, "latency_ms").unwrap_or(0);
    if latency_ms < 0 {
        return Err(DomainError::new(
            "invalid gateway trace latency from database row",
        ));
    }

    Ok(MappedGatewayTraceRow {
        item: AppGatewayTraceItem {
            id: required_string_cell(&row, "public_id", "gateway trace id")?,
            time: required_string_cell(&row, "started_at", "gateway trace start time")?,
            ip: required_string_cell(&row, "client_ip_masked", "gateway trace masked IP")?,
            endpoint: required_string_cell(&row, "request_endpoint", "gateway trace endpoint")?,
            method,
            status,
            duration: format!("{latency_ms}ms"),
            upstream_account: required_string_cell(
                &row,
                "upstream_account",
                "gateway trace upstream account",
            )?,
        },
        cursor: AppGatewayTracesCursor {
            started_at_micros: required_integer_cell(
                &row,
                "cursor_started_at_micros",
                "gateway trace cursor timestamp",
            )?,
            id: required_integer_cell(&row, "cursor_id", "gateway trace cursor id")?,
        },
    })
}

fn keyword_like(keyword: Option<&str>) -> Option<String> {
    keyword.map(|value| {
        let escaped = value
            .to_ascii_lowercase()
            .replace('\\', "\\\\")
            .replace('%', "\\%")
            .replace('_', "\\_");
        format!("%{escaped}%")
    })
}

fn required_string_cell(
    row: &sqlx::postgres::PgRow,
    column: &str,
    field_name: &str,
) -> DomainResult<String> {
    let value = row
        .try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .unwrap_or_default();
    if value.trim().is_empty() {
        return Err(DomainError::new(format!(
            "missing {field_name} from database row"
        )));
    }
    Ok(value)
}

fn required_integer_cell(
    row: &sqlx::postgres::PgRow,
    column: &str,
    field_name: &str,
) -> DomainResult<i64> {
    optional_integer_cell(row, column).ok_or_else(|| {
        DomainError::new(format!("missing {field_name} from database row"))
    })
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
}

fn masked_sql_error(error: sqlx::Error) -> DomainError {
    tracing::error!(
        error_kind = sql_error_kind(&error),
        "gateway traces database query failed"
    );
    DomainError::new("gateway traces database query failed")
}

fn sql_error_kind(error: &sqlx::Error) -> &'static str {
    match error {
        sqlx::Error::Configuration(_) => "configuration",
        sqlx::Error::Database(_) => "database",
        sqlx::Error::Io(_) => "io",
        sqlx::Error::Tls(_) => "tls",
        sqlx::Error::Protocol(_) => "protocol",
        sqlx::Error::RowNotFound => "row_not_found",
        sqlx::Error::TypeNotFound { .. } => "type_not_found",
        sqlx::Error::ColumnIndexOutOfBounds { .. } => "column_index",
        sqlx::Error::ColumnNotFound(_) => "column_not_found",
        sqlx::Error::ColumnDecode { .. } => "column_decode",
        sqlx::Error::Decode(_) => "decode",
        sqlx::Error::AnyDriverError(_) => "driver",
        sqlx::Error::PoolTimedOut => "pool_timeout",
        sqlx::Error::PoolClosed => "pool_closed",
        sqlx::Error::WorkerCrashed => "worker_crashed",
        _ => "unknown",
    }
}
