use sqlx::{Row, SqlitePool};

use crate::domain::{DecimalValue, DomainError};
use crate::infrastructure::sql::model_modality;
use crate::ports::{
    UsageLogItem, UsageLogsPage, UsageLogsQuery, UsageLogsReadFuture, UsageLogsReadStore,
    UsageLogsStatus, UsageLogsSubject,
};

const USAGE_SPEND_DECIMAL_DIGITS: u32 = 9;

const LOAD_USAGE_LOGS: &str = r#"
WITH selected_trace AS (
    SELECT *
    FROM (
        SELECT
            t.*,
            ROW_NUMBER() OVER (
                PARTITION BY COALESCE(NULLIF(t.request_id, ''), CAST(t.id AS TEXT))
                ORDER BY t.started_at DESC, t.id DESC
            ) AS trace_rank
        FROM ai_request_trace t
        WHERE t.status = 1
          AND t.tenant_id = ?1
          AND t.organization_id = ?2
          AND t.user_id = ?3
          AND t.started_at IS NOT NULL
          AND (?4 IS NULL OR t.started_at >= ?4)
          AND (?5 IS NULL OR t.started_at <= ?5)
    )
    WHERE trace_rank = 1
),
usage_by_request AS (
    SELECT
        tenant_id,
        organization_id,
        request_id,
        MAX(catalog_key) AS catalog_key,
        MAX(requested_model_catalog_key) AS requested_model_catalog_key,
        MAX(model) AS model,
        MAX(provider_native_model) AS provider_native_model,
        MAX(region_code) AS region_code,
        MAX(modality) AS modality,
        CAST(COALESCE(SUM(COALESCE(prompt_tokens, 0)), 0) AS TEXT) AS prompt_tokens,
        CAST(COALESCE(SUM(COALESCE(cached_tokens, 0)), 0) AS TEXT) AS cached_tokens,
        CAST(COALESCE(SUM(COALESCE(completion_tokens, 0)), 0) AS TEXT) AS completion_tokens,
        CAST(COALESCE(SUM(COALESCE(customer_charge_amount, 0)), 0) AS TEXT) AS cost_amount,
        CAST(COALESCE(MAX(COALESCE(rate_multiplier, 1)), 1) AS TEXT) AS rate_multiplier,
        CAST(COALESCE(MAX(COALESCE(base_input_unit_price, 0)), 0) AS TEXT) AS base_input_unit_price,
        CAST(COALESCE(MAX(COALESCE(base_output_unit_price, 0)), 0) AS TEXT) AS base_output_unit_price,
        CAST(COALESCE(MAX(COALESCE(cache_read_unit_price, 0)), 0) AS TEXT) AS cache_read_unit_price
    FROM ai_usage_fact
    WHERE status = 1
      AND tenant_id = ?1
      AND organization_id = ?2
      AND user_id = ?3
      AND NULLIF(request_id, '') IS NOT NULL
      AND (?4 IS NULL OR occurred_at >= ?4)
      AND (?5 IS NULL OR occurred_at <= ?5)
    GROUP BY tenant_id, organization_id, request_id
)
SELECT
    CAST(t.id AS TEXT) AS id,
    COALESCE(NULLIF(t.request_id, ''), CAST(t.id AS TEXT)) AS request_id,
    CAST(COALESCE(t.started_at, t.created_at) AS TEXT) AS started_at,
    COALESCE(NULLIF(t.api_key_name_snapshot, ''), '-') AS api_key_name_snapshot,
    COALESCE(NULLIF(g.group_name, ''), NULLIF(t.channel_group_snapshot, ''), '-') AS channel_group_display_name,
    COALESCE(
        u.modality,
        CASE
            WHEN lower(COALESCE(t.endpoint, t.request_path, '')) LIKE '%embedding%' THEN 6
            ELSE 1
        END
    ) AS modality,
    COALESCE(NULLIF(u.provider_native_model, ''), NULLIF(t.provider_native_model, ''), NULLIF(u.model, ''), NULLIF(t.provider_model, ''), '-') AS model,
    COALESCE(NULLIF(u.provider_native_model, ''), NULLIF(t.provider_native_model, ''), NULLIF(u.model, ''), NULLIF(t.provider_model, ''), '') AS provider_native_model,
    COALESCE(NULLIF(u.requested_model_catalog_key, ''), NULLIF(t.requested_model_catalog_key, ''), NULLIF(u.catalog_key, ''), NULLIF(d.resolved_model, ''), NULLIF(t.requested_model, ''), '') AS requested_model_catalog_key,
    COALESCE(NULLIF(u.region_code, ''), NULLIF(t.region_code, ''), '') AS region_code,
    CASE
        WHEN (
            (t.http_status IS NOT NULL AND t.http_status >= 400)
            OR NULLIF(t.provider_error_code, '') IS NOT NULL
            OR NULLIF(NULLIF(CAST(t.error_type AS TEXT), ''), '0') IS NOT NULL
        ) THEN 'error'
        ELSE 'success'
    END AS log_status,
    COALESCE(t.http_status, 0) AS http_status,
    COALESCE(NULLIF(t.provider_error_code, ''), '') AS error_code,
    CASE NULLIF(NULLIF(CAST(t.error_type AS TEXT), ''), '0')
        WHEN '1' THEN 'provider_error'
        WHEN '2' THEN 'invalid_request_error'
        WHEN '3' THEN 'billing_error'
        ELSE COALESCE(
            NULLIF(NULLIF(CAST(t.error_type AS TEXT), ''), '0'),
            CASE
                WHEN (t.http_status IS NOT NULL AND t.http_status >= 500) THEN 'server_error'
                WHEN (t.http_status IS NOT NULL AND t.http_status >= 400) THEN 'invalid_request_error'
                WHEN NULLIF(t.provider_error_code, '') IS NOT NULL THEN 'provider_error'
                ELSE ''
            END
        )
    END AS error_type,
    COALESCE(NULLIF(t.error_message_masked, ''), '') AS error_message,
    t.latency_ms AS latency_ms,
    COALESCE(t.ttft_ms, 0) AS ttft_ms,
    CASE WHEN COALESCE(t.streaming, 0) THEN 1 ELSE 0 END AS is_stream,
    COALESCE(u.prompt_tokens, CAST(COALESCE(t.prompt_tokens, 0) AS TEXT)) AS prompt_tokens,
    COALESCE(u.cached_tokens, CAST(COALESCE(t.cached_tokens, 0) AS TEXT)) AS cached_tokens,
    COALESCE(u.completion_tokens, CAST(COALESCE(t.completion_tokens, 0) AS TEXT)) AS completion_tokens,
    COALESCE(u.cost_amount, '0') AS cost_amount,
    COALESCE(u.rate_multiplier, '1') AS rate_multiplier,
    COALESCE(u.base_input_unit_price, '0') AS base_input_unit_price,
    COALESCE(u.base_output_unit_price, '0') AS base_output_unit_price,
    COALESCE(u.cache_read_unit_price, '0') AS cache_read_unit_price,
    COALESCE(NULLIF(t.request_path, ''), NULLIF(t.endpoint, ''), '-') AS request_path,
    COALESCE(NULLIF(t.reasoning_effort, ''), '-') AS reasoning_effort,
    COALESCE(NULLIF(t.client_ip_masked, ''), '-') AS client_ip_masked,
    COALESCE(NULLIF(json_extract(t.metadata, '$.userAgent'), ''), '') AS user_agent
FROM selected_trace t
LEFT JOIN ai_channel_group g
  ON g.status = 1
 AND g.tenant_id = t.tenant_id
 AND g.organization_id = t.organization_id
 AND g.id = t.channel_group_id
LEFT JOIN usage_by_request u
  ON u.tenant_id = t.tenant_id
 AND u.organization_id = t.organization_id
 AND u.request_id = t.request_id
LEFT JOIN ai_routing_decision_log d
  ON d.status = 1
 AND d.tenant_id = t.tenant_id
 AND d.organization_id = t.organization_id
 AND d.request_id = t.request_id
WHERE (
    ?6 IS NULL
    OR lower(COALESCE(t.request_id, '')) LIKE ?6
    OR lower(COALESCE(t.api_key_name_snapshot, '')) LIKE ?6
    OR lower(COALESCE(t.channel_group_snapshot, '')) LIKE ?6
    OR lower(COALESCE(g.group_name, '')) LIKE ?6
    OR lower(COALESCE(t.requested_model, '')) LIKE ?6
    OR lower(COALESCE(t.requested_model_catalog_key, '')) LIKE ?6
    OR lower(COALESCE(t.provider_native_model, '')) LIKE ?6
    OR lower(COALESCE(u.catalog_key, '')) LIKE ?6
    OR lower(COALESCE(u.requested_model_catalog_key, '')) LIKE ?6
    OR lower(COALESCE(u.model, '')) LIKE ?6
    OR lower(COALESCE(u.provider_native_model, '')) LIKE ?6
    OR lower(COALESCE(t.request_path, '')) LIKE ?6
    OR lower(COALESCE(t.client_ip_masked, '')) LIKE ?6
    OR lower(COALESCE(json_extract(t.metadata, '$.userAgent'), '')) LIKE ?6
    OR lower(COALESCE(t.provider_error_code, '')) LIKE ?6
    OR lower(COALESCE(t.error_message_masked, '')) LIKE ?6
)
AND (
    ?7 = 0
    OR (?7 = 1 AND NOT ((t.http_status IS NOT NULL AND t.http_status >= 400) OR NULLIF(NULLIF(CAST(t.error_type AS TEXT), ''), '0') IS NOT NULL OR NULLIF(t.provider_error_code, '') IS NOT NULL))
    OR (?7 = 2 AND ((t.http_status IS NOT NULL AND t.http_status >= 400) OR NULLIF(NULLIF(CAST(t.error_type AS TEXT), ''), '0') IS NOT NULL OR NULLIF(t.provider_error_code, '') IS NOT NULL))
)
ORDER BY t.started_at DESC, t.id DESC
LIMIT ?8 OFFSET ?9
"#;

const LOAD_USAGE_LOGS_TOTAL: &str = r#"
WITH selected_trace AS (
    SELECT *
    FROM (
        SELECT
            t.*,
            ROW_NUMBER() OVER (
                PARTITION BY COALESCE(NULLIF(t.request_id, ''), CAST(t.id AS TEXT))
                ORDER BY t.started_at DESC, t.id DESC
            ) AS trace_rank
        FROM ai_request_trace t
        WHERE t.status = 1
          AND t.tenant_id = ?1
          AND t.organization_id = ?2
          AND t.user_id = ?3
          AND t.started_at IS NOT NULL
          AND (?4 IS NULL OR t.started_at >= ?4)
          AND (?5 IS NULL OR t.started_at <= ?5)
    )
    WHERE trace_rank = 1
),
usage_by_request AS (
    SELECT tenant_id, organization_id, request_id, MAX(catalog_key) AS catalog_key,
           MAX(requested_model_catalog_key) AS requested_model_catalog_key,
           MAX(model) AS model, MAX(provider_native_model) AS provider_native_model,
           MAX(region_code) AS region_code
    FROM ai_usage_fact
    WHERE status = 1
      AND tenant_id = ?1
      AND organization_id = ?2
      AND user_id = ?3
      AND NULLIF(request_id, '') IS NOT NULL
      AND (?4 IS NULL OR occurred_at >= ?4)
      AND (?5 IS NULL OR occurred_at <= ?5)
    GROUP BY tenant_id, organization_id, request_id
)
SELECT CAST(COUNT(1) AS TEXT) AS total
FROM selected_trace t
LEFT JOIN ai_channel_group g
  ON g.status = 1
 AND g.tenant_id = t.tenant_id
 AND g.organization_id = t.organization_id
 AND g.id = t.channel_group_id
LEFT JOIN usage_by_request u
  ON u.tenant_id = t.tenant_id
 AND u.organization_id = t.organization_id
 AND u.request_id = t.request_id
LEFT JOIN ai_routing_decision_log d
  ON d.status = 1
 AND d.tenant_id = t.tenant_id
 AND d.organization_id = t.organization_id
 AND d.request_id = t.request_id
WHERE (
    ?6 IS NULL
    OR lower(COALESCE(t.request_id, '')) LIKE ?6
    OR lower(COALESCE(t.api_key_name_snapshot, '')) LIKE ?6
    OR lower(COALESCE(t.channel_group_snapshot, '')) LIKE ?6
    OR lower(COALESCE(g.group_name, '')) LIKE ?6
    OR lower(COALESCE(t.requested_model, '')) LIKE ?6
    OR lower(COALESCE(t.requested_model_catalog_key, '')) LIKE ?6
    OR lower(COALESCE(t.provider_native_model, '')) LIKE ?6
    OR lower(COALESCE(u.catalog_key, '')) LIKE ?6
    OR lower(COALESCE(u.requested_model_catalog_key, '')) LIKE ?6
    OR lower(COALESCE(u.model, '')) LIKE ?6
    OR lower(COALESCE(u.provider_native_model, '')) LIKE ?6
    OR lower(COALESCE(t.request_path, '')) LIKE ?6
    OR lower(COALESCE(t.client_ip_masked, '')) LIKE ?6
    OR lower(COALESCE(json_extract(t.metadata, '$.userAgent'), '')) LIKE ?6
    OR lower(COALESCE(t.provider_error_code, '')) LIKE ?6
    OR lower(COALESCE(t.error_message_masked, '')) LIKE ?6
)
AND (
    ?7 = 0
    OR (?7 = 1 AND NOT ((t.http_status IS NOT NULL AND t.http_status >= 400) OR NULLIF(NULLIF(CAST(t.error_type AS TEXT), ''), '0') IS NOT NULL OR NULLIF(t.provider_error_code, '') IS NOT NULL))
    OR (?7 = 2 AND ((t.http_status IS NOT NULL AND t.http_status >= 400) OR NULLIF(NULLIF(CAST(t.error_type AS TEXT), ''), '0') IS NOT NULL OR NULLIF(t.provider_error_code, '') IS NOT NULL))
)
"#;

pub struct SqliteUsageLogsReadStore {
    pool: SqlitePool,
}

impl SqliteUsageLogsReadStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

impl UsageLogsReadStore for SqliteUsageLogsReadStore {
    fn load_usage_logs<'a>(
        &'a self,
        query: UsageLogsQuery,
        subject: Option<UsageLogsSubject>,
    ) -> UsageLogsReadFuture<'a> {
        Box::pin(async move {
            let subject = subject.ok_or_else(|| {
                DomainError::new("trusted request subject is required for usage logs")
            })?;
            let total = load_usage_logs_total(&self.pool, &query, subject).await?;
            let rows = sqlx::query(LOAD_USAGE_LOGS)
                .bind(subject.tenant_id)
                .bind(subject.organization_id)
                .bind(subject.user_id)
                .bind(query.start_time.as_deref())
                .bind(query.end_time.as_deref())
                .bind(keyword_like(query.keyword.as_deref()))
                .bind(status_code(query.status))
                .bind(query.page_size)
                .bind(query.offset)
                .fetch_all(&self.pool)
                .await
                .map_err(sql_error)?;

            Ok(UsageLogsPage {
                logs: rows
                    .into_iter()
                    .map(row_to_usage_log)
                    .collect::<Result<Vec<_>, DomainError>>()?,
                total,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }
}

async fn load_usage_logs_total(
    pool: &SqlitePool,
    query: &UsageLogsQuery,
    subject: UsageLogsSubject,
) -> Result<i64, DomainError> {
    let row = sqlx::query(LOAD_USAGE_LOGS_TOTAL)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(subject.user_id)
        .bind(query.start_time.as_deref())
        .bind(query.end_time.as_deref())
        .bind(keyword_like(query.keyword.as_deref()))
        .bind(status_code(query.status))
        .fetch_one(pool)
        .await
        .map_err(sql_error)?;
    Ok(integer_cell(&row, "total"))
}

fn row_to_usage_log(row: sqlx::sqlite::SqliteRow) -> Result<UsageLogItem, DomainError> {
    Ok(UsageLogItem {
        id: string_cell(&row, "id"),
        request_id: string_cell(&row, "request_id"),
        time: string_cell(&row, "started_at"),
        token_name: string_cell(&row, "api_key_name_snapshot"),
        group: string_cell(&row, "channel_group_display_name"),
        log_type: modality_label(optional_integer_cell(&row, "modality")),
        model: string_cell(&row, "model"),
        provider_native_model: string_cell(&row, "provider_native_model"),
        requested_model_catalog_key: string_cell(&row, "requested_model_catalog_key"),
        region_code: string_cell(&row, "region_code"),
        status: string_cell(&row, "log_status"),
        http_status: integer_cell(&row, "http_status"),
        error_code: string_cell(&row, "error_code"),
        error_type: string_cell(&row, "error_type"),
        error_message: string_cell(&row, "error_message"),
        total_time: duration_label(latency_cell(&row, "latency_ms")?),
        ttft: duration_label(integer_cell(&row, "ttft_ms")),
        is_stream: integer_cell(&row, "is_stream") != 0,
        input_tokens: integer_cell(&row, "prompt_tokens"),
        cache_read_tokens: integer_cell(&row, "cached_tokens"),
        output_tokens: integer_cell(&row, "completion_tokens"),
        cost: decimal_string_cell(
            &row,
            "cost_amount",
            USAGE_SPEND_DECIMAL_DIGITS,
            "usage log cost",
        )?,
        multiplier: decimal_string_cell(&row, "rate_multiplier", 6, "usage log rate multiplier")?,
        base_input_price: decimal_string_cell(
            &row,
            "base_input_unit_price",
            6,
            "usage log base input price",
        )?,
        base_output_price: decimal_string_cell(
            &row,
            "base_output_unit_price",
            6,
            "usage log base output price",
        )?,
        cache_read_price: decimal_string_cell(
            &row,
            "cache_read_unit_price",
            6,
            "usage log cache read price",
        )?,
        path: string_cell(&row, "request_path"),
        reasoning_effort: string_cell(&row, "reasoning_effort"),
        ip: string_cell(&row, "client_ip_masked"),
        user_agent: string_cell(&row, "user_agent"),
    })
}

fn keyword_like(keyword: Option<&str>) -> Option<String> {
    keyword.map(|value| format!("%{}%", value.to_ascii_lowercase()))
}

fn status_code(status: UsageLogsStatus) -> i64 {
    match status {
        UsageLogsStatus::All => 0,
        UsageLogsStatus::Success => 1,
        UsageLogsStatus::Error => 2,
    }
}

fn duration_label(value: i64) -> String {
    format!("{value}ms")
}

fn modality_label(value: Option<i64>) -> String {
    model_modality::label(value).to_owned()
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

fn latency_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> Result<i64, DomainError> {
    let value = integer_cell(row, column);
    if value < 0 {
        if column == "latency_ms" {
            return Err(DomainError::new(format!(
                "invalid usage log latency_ms from database row: {value}"
            )));
        }
        return Err(DomainError::new(format!(
            "invalid usage log {column} from database row: {value}"
        )));
    }
    Ok(value)
}

fn optional_integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> Option<i64> {
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

fn decimal_string_cell(
    row: &sqlx::sqlite::SqliteRow,
    column: &str,
    digits: u32,
    field_name: &str,
) -> Result<String, DomainError> {
    let value = string_cell(row, column);
    decimal_value_string(&value, digits, field_name)
}

fn decimal_value_string(value: &str, digits: u32, field_name: &str) -> Result<String, DomainError> {
    DecimalValue::parse(&value)
        .map(|amount| amount.to_fixed_string(digits))
        .map_err(|_| DomainError::new(format!("invalid {field_name}: {value}")))
}

fn sql_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sql::model_modality::{MODALITY_IMAGE, MODALITY_TEXT};

    #[test]
    fn decimal_value_string_rejects_invalid_database_amount() {
        assert_eq!(
            "12.300000",
            decimal_value_string("12.3", 6, "usage log amount").unwrap()
        );
        assert_eq!(
            "0.000000990",
            decimal_value_string("0.000000990000", 9, "usage log amount").unwrap()
        );

        let unsupported = decimal_value_string("not-money", 6, "usage log amount")
            .expect_err("invalid usage log money must fail");
        assert!(
            unsupported
                .to_string()
                .contains("invalid usage log amount: not-money"),
            "{unsupported}"
        );
    }

    #[test]
    fn modality_label_reports_unknown_instead_of_defaulting_to_text() {
        assert_eq!("text", modality_label(Some(MODALITY_TEXT)));
        assert_eq!("image", modality_label(Some(MODALITY_IMAGE)));
        assert_eq!("unknown", modality_label(None));
        assert_eq!("unknown", modality_label(Some(99)));
    }

    #[test]
    fn usage_logs_query_uses_channel_group_name_for_display_and_search() {
        for sql in [LOAD_USAGE_LOGS, LOAD_USAGE_LOGS_TOTAL] {
            assert!(
                sql.contains("LEFT JOIN ai_channel_group g"),
                "usage logs SQLite SQL must join the channel group table"
            );
            assert!(
                sql.contains("g.tenant_id = t.tenant_id")
                    && sql.contains("g.organization_id = t.organization_id")
                    && sql.contains("g.id = t.channel_group_id"),
                "usage logs SQLite SQL must scope group lookup by tenant, organization, and group id"
            );
            assert!(
                sql.contains("lower(COALESCE(g.group_name, '')) LIKE ?6"),
                "usage logs SQLite keyword search must include the maintained channel group name"
            );
        }
        assert!(
            LOAD_USAGE_LOGS.contains(
                "COALESCE(NULLIF(g.group_name, ''), NULLIF(t.channel_group_snapshot, ''), '-') AS channel_group_display_name"
            ),
            "usage logs SQLite SQL must project the maintained channel group name with snapshot fallback"
        );
    }

    #[test]
    fn usage_logs_query_projects_native_model_with_catalog_key_tooltip_identity() {
        assert!(
            LOAD_USAGE_LOGS.contains("AS provider_native_model"),
            "usage logs SQLite SQL must project the provider native model separately"
        );
        assert!(
            LOAD_USAGE_LOGS.contains("AS requested_model_catalog_key"),
            "usage logs SQLite SQL must project the vendor/model catalog key separately"
        );
        assert!(
            LOAD_USAGE_LOGS.contains(
                "COALESCE(NULLIF(u.provider_native_model, ''), NULLIF(t.provider_native_model, ''), NULLIF(u.model, ''), NULLIF(t.provider_model, ''), '-') AS model"
            ),
            "usage logs SQLite model display must prefer provider_native_model"
        );
        for sql in [LOAD_USAGE_LOGS, LOAD_USAGE_LOGS_TOTAL] {
            assert!(
                sql.contains("MAX(provider_native_model) AS provider_native_model"),
                "usage logs SQLite aggregation must keep provider native model searchable"
            );
            assert!(
                sql.contains("MAX(requested_model_catalog_key) AS requested_model_catalog_key"),
                "usage logs SQLite aggregation must keep requested model catalog key searchable"
            );
        }
    }

    #[test]
    fn usage_logs_query_projects_user_agent_from_trace_metadata() {
        assert!(
            LOAD_USAGE_LOGS.contains("json_extract(t.metadata, '$.userAgent')"),
            "usage logs SQLite SQL must project the full User-Agent from trace metadata"
        );
        assert!(
            LOAD_USAGE_LOGS.contains("AS user_agent"),
            "usage logs SQLite SQL must expose a user_agent column for API serialization"
        );
    }
}
