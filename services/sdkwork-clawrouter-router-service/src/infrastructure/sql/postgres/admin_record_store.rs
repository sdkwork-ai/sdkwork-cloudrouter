use sqlx::{PgPool, Row};

use crate::domain::{DecimalValue, DomainError};
use crate::infrastructure::sql::model_modality;
use crate::ports::{
    AdminRecordListPage, AdminRecordLogItem, AdminRecordReadFuture, AdminRecordStore,
    ListAdminRecordLogsQuery,
};

const LIST_ADMIN_RECORD_LOGS: &str = r#"
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
        MAX(upstream_account_group_snapshot) AS upstream_account_group_snapshot,
        MAX(catalog_key) AS catalog_key,
        MAX(requested_model_catalog_key) AS requested_model_catalog_key,
        MAX(model) AS model,
        MAX(provider_native_model) AS provider_native_model,
        MAX(region_code) AS region_code,
        MAX(modality) AS modality,
        CAST(COALESCE(SUM(COALESCE(prompt_tokens, 0)), 0) AS TEXT) AS prompt_tokens,
        CAST(COALESCE(SUM(COALESCE(cached_tokens, 0)), 0) AS TEXT) AS cached_tokens,
        CAST(COALESCE(SUM(COALESCE(completion_tokens, 0)), 0) AS TEXT) AS completion_tokens,
        CAST(COALESCE(SUM(COALESCE(customer_charge_amount, 0)), 0) AS TEXT) AS customer_charge_amount,
        CAST(COALESCE(MAX(COALESCE(rate_multiplier, 1)), 1) AS TEXT) AS rate_multiplier,
        CAST(COALESCE(MAX(COALESCE(base_input_unit_price, 0)), 0) AS TEXT) AS base_input_unit_price,
        CAST(COALESCE(MAX(COALESCE(base_output_unit_price, 0)), 0) AS TEXT) AS base_output_unit_price,
        CAST(COALESCE(MAX(COALESCE(cache_read_unit_price, 0)), 0) AS TEXT) AS cache_read_unit_price
    FROM ai_usage
    WHERE status = 1
      AND tenant_id = $1
      AND organization_id = $2
      AND NULLIF(request_id, '') IS NOT NULL
    GROUP BY tenant_id, organization_id, request_id
)
SELECT
    COALESCE(NULLIF(t.uuid, ''), 'trace-' || CAST(t.id AS TEXT)) AS id,
    COALESCE(
        NULLIF(NULLIF(t.owner_name_snapshot, ''), CAST(t.user_id AS TEXT)),
        NULLIF(NULLIF(u.owner_name_snapshot, ''), CAST(t.user_id AS TEXT)),
        NULLIF(iu.display_name, ''),
        NULLIF(iu.email, ''),
        NULLIF(iu.username, ''),
        NULLIF(CAST(t.user_id AS TEXT), ''),
        '-'
    ) AS user_label,
    COALESCE(NULLIF(t.request_id, ''), CAST(t.id AS TEXT)) AS request_id,
    CAST(COALESCE(t.started_at, t.created_at) AS TEXT) AS started_at,
    COALESCE(NULLIF(t.api_key_name_snapshot, ''), NULLIF(u.api_key_name_snapshot, ''), '-') AS api_key_name_snapshot,
    COALESCE(NULLIF(t.upstream_account_group_snapshot, ''), NULLIF(u.upstream_account_group_snapshot, ''), '-') AS upstream_account_group_snapshot,
    u.modality AS modality,
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
    COALESCE(NULLIF(t.http_method, ''), 'POST') AS http_method,
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
    CASE WHEN COALESCE(t.streaming, false) THEN 1 ELSE 0 END AS is_stream,
    COALESCE(u.prompt_tokens, CAST(COALESCE(t.prompt_tokens, 0) AS TEXT)) AS prompt_tokens,
    COALESCE(u.cached_tokens, CAST(COALESCE(t.cached_tokens, 0) AS TEXT)) AS cached_tokens,
    COALESCE(u.completion_tokens, CAST(COALESCE(t.completion_tokens, 0) AS TEXT)) AS completion_tokens,
    COALESCE(u.customer_charge_amount, '0') AS customer_charge_amount,
    COALESCE(u.rate_multiplier, '1') AS rate_multiplier,
    COALESCE(u.base_input_unit_price, '0') AS base_input_unit_price,
    COALESCE(u.base_output_unit_price, '0') AS base_output_unit_price,
    COALESCE(u.cache_read_unit_price, '0') AS cache_read_unit_price,
    COALESCE(NULLIF(t.request_path, ''), NULLIF(t.endpoint, ''), '-') AS request_path,
    COALESCE(NULLIF(t.reasoning_effort, ''), '-') AS reasoning_effort,
    COALESCE(NULLIF(t.client_ip_masked, ''), '-') AS client_ip_masked,
    COALESCE(NULLIF(t.metadata->>'userAgent', ''), '') AS user_agent,
    COUNT(*) OVER() AS total
FROM selected_trace t
LEFT JOIN usage_by_request u
  ON u.tenant_id = t.tenant_id
 AND u.organization_id = t.organization_id
 AND u.request_id = t.request_id
LEFT JOIN iam_user iu
  ON iu.tenant_id = CAST(t.tenant_id AS TEXT)
 AND iu.id = CAST(t.user_id AS TEXT)
LEFT JOIN ai_routing_decision_log d
  ON d.status = 1
 AND d.tenant_id = t.tenant_id
 AND d.organization_id = t.organization_id
 AND d.request_id = t.request_id
WHERE (
    $3::text IS NULL
    OR lower(COALESCE(t.owner_name_snapshot, '')) LIKE $3
    OR lower(COALESCE(u.owner_name_snapshot, '')) LIKE $3
    OR lower(COALESCE(iu.display_name, '')) LIKE $3
    OR lower(COALESCE(iu.email, '')) LIKE $3
    OR lower(COALESCE(iu.username, '')) LIKE $3
    OR lower(COALESCE(CAST(t.user_id AS TEXT), '')) LIKE $3
)
AND (
    $4::text IS NULL
    OR lower(COALESCE(t.request_id, '')) LIKE $4
    OR lower(COALESCE(t.api_key_name_snapshot, '')) LIKE $4
    OR lower(COALESCE(t.upstream_account_group_snapshot, '')) LIKE $4
    OR lower(COALESCE(u.api_key_name_snapshot, '')) LIKE $4
    OR lower(COALESCE(u.upstream_account_group_snapshot, '')) LIKE $4
)
AND (
    $5::text IS NULL
    OR lower(COALESCE(t.requested_model, '')) LIKE $5
    OR lower(COALESCE(t.provider_model, '')) LIKE $5
    OR lower(COALESCE(u.catalog_key, '')) LIKE $5
    OR lower(COALESCE(u.model, '')) LIKE $5
    OR lower(COALESCE(d.requested_model, '')) LIKE $5
    OR lower(COALESCE(d.resolved_model, '')) LIKE $5
)
ORDER BY t.started_at DESC NULLS LAST, t.id DESC
LIMIT $6 OFFSET $7
"#;

#[derive(Debug, Clone)]
pub struct PostgresAdminRecordStore {
    pool: PgPool,
}

impl PostgresAdminRecordStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminRecordStore for PostgresAdminRecordStore {
    fn list_logs<'a>(
        &'a self,
        query: ListAdminRecordLogsQuery,
    ) -> AdminRecordReadFuture<'a, AdminRecordListPage> {
        Box::pin(async move {
            let rows = sqlx::query(LIST_ADMIN_RECORD_LOGS)
                .bind(query.subject.tenant_id)
                .bind(query.subject.organization_id)
                .bind(like_filter(query.user.as_deref()))
                .bind(like_filter(query.token.as_deref()))
                .bind(like_filter(query.model.as_deref()))
                .bind(query.page_size)
                .bind(query.offset)
                .fetch_all(&self.pool)
                .await
                .map_err(sql_error)?;

            let total = rows
                .first()
                .map(|row| integer_cell(row, "total"))
                .unwrap_or(0);
            Ok(AdminRecordListPage {
                items: rows
                    .into_iter()
                    .map(row_to_log)
                    .collect::<Result<Vec<_>, DomainError>>()?,
                total,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }
}

fn row_to_log(row: sqlx::postgres::PgRow) -> Result<AdminRecordLogItem, DomainError> {
    Ok(AdminRecordLogItem {
        id: string_cell(&row, "id"),
        user: string_cell(&row, "user_label"),
        request_id: string_cell(&row, "request_id"),
        time: string_cell(&row, "started_at"),
        token_name: string_cell(&row, "api_key_name_snapshot"),
        group: string_cell(&row, "upstream_account_group_snapshot"),
        log_type: modality_label(optional_integer_cell(&row, "modality")),
        model: string_cell(&row, "model"),
        provider_native_model: string_cell(&row, "provider_native_model"),
        requested_model_catalog_key: string_cell(&row, "requested_model_catalog_key"),
        region_code: string_cell(&row, "region_code"),
        status: string_cell(&row, "log_status"),
        http_status: integer_cell(&row, "http_status"),
        http_method: http_method_label(&string_cell(&row, "http_method")),
        error_code: string_cell(&row, "error_code"),
        error_type: string_cell(&row, "error_type"),
        error_message: string_cell(&row, "error_message"),
        total_time: duration_label(required_latency_cell(&row, "latency_ms")?),
        ttft: duration_label(integer_cell(&row, "ttft_ms")),
        is_stream: integer_cell(&row, "is_stream") != 0,
        input_tokens: integer_cell(&row, "prompt_tokens"),
        cache_read_tokens: integer_cell(&row, "cached_tokens"),
        output_tokens: integer_cell(&row, "completion_tokens"),
        cost: decimal_string_cell(
            &row,
            "customer_charge_amount",
            6,
            "admin record customer charge",
        )?,
        multiplier: decimal_string_cell(
            &row,
            "rate_multiplier",
            6,
            "admin record rate multiplier",
        )?,
        base_input_price: decimal_string_cell(
            &row,
            "base_input_unit_price",
            6,
            "admin record base input price",
        )?,
        base_output_price: decimal_string_cell(
            &row,
            "base_output_unit_price",
            6,
            "admin record base output price",
        )?,
        cache_read_price: decimal_string_cell(
            &row,
            "cache_read_unit_price",
            6,
            "admin record cache read price",
        )?,
        path: string_cell(&row, "request_path"),
        reasoning_effort: string_cell(&row, "reasoning_effort"),
        ip: string_cell(&row, "client_ip_masked"),
        user_agent: string_cell(&row, "user_agent"),
    })
}

fn like_filter(value: Option<&str>) -> Option<String> {
    value.map(|value| format!("%{}%", value.to_ascii_lowercase()))
}

fn duration_label(value: i64) -> String {
    format!("{value}ms")
}

fn modality_label(value: Option<i64>) -> String {
    model_modality::label(value).to_owned()
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

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> String {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .unwrap_or_default()
}

fn integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> i64 {
    optional_integer_cell(row, column).unwrap_or(0)
}

fn required_latency_cell(row: &sqlx::postgres::PgRow, column: &str) -> Result<i64, DomainError> {
    let value = optional_integer_cell(row, column).ok_or_else(|| {
        if column == "latency_ms" {
            DomainError::new("missing admin record latency_ms from database row")
        } else {
            DomainError::new(format!("missing admin record {column} from database row"))
        }
    })?;
    if value < 0 {
        if column == "latency_ms" {
            return Err(DomainError::new(format!(
                "invalid admin record latency_ms from database row: {value}"
            )));
        }
        return Err(DomainError::new(format!(
            "invalid admin record {column} from database row: {value}"
        )));
    }
    Ok(value)
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
    row: &sqlx::postgres::PgRow,
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
    fn modality_label_reports_unknown_instead_of_defaulting_to_text() {
        assert_eq!("text", modality_label(Some(MODALITY_TEXT)));
        assert_eq!("image", modality_label(Some(MODALITY_IMAGE)));
        assert_eq!("unknown", modality_label(None));
        assert_eq!("unknown", modality_label(Some(99)));
    }

    #[test]
    fn http_method_label_normalizes_known_methods_and_defaults_to_post() {
        assert_eq!("GET", http_method_label("get"));
        assert_eq!("PATCH", http_method_label(" PATCH "));
        assert_eq!("POST", http_method_label(""));
        assert_eq!("POST", http_method_label("TRACE"));
    }

    #[test]
    fn list_logs_projects_http_method_for_request_url_signature() {
        assert!(LIST_ADMIN_RECORD_LOGS
            .contains("COALESCE(NULLIF(t.http_method, ''), 'POST') AS http_method"));
    }

    #[test]
    fn decimal_value_string_rejects_invalid_database_amount() {
        assert_eq!(
            "12.300000",
            decimal_value_string("12.3", 6, "admin record amount").unwrap()
        );

        let unsupported = decimal_value_string("not-money", 6, "admin record amount")
            .expect_err("invalid admin record money must fail");
        assert!(
            unsupported
                .to_string()
                .contains("invalid admin record amount: not-money"),
            "{unsupported}"
        );
    }

    #[test]
    fn list_logs_enriches_user_label_from_iam_user_before_numeric_id() {
        assert!(LIST_ADMIN_RECORD_LOGS.contains("LEFT JOIN iam_user iu"));
        assert!(LIST_ADMIN_RECORD_LOGS.contains("iu.tenant_id = CAST(t.tenant_id AS TEXT)"));
        assert!(LIST_ADMIN_RECORD_LOGS.contains("iu.id = CAST(t.user_id AS TEXT)"));
        assert_user_label_order(LIST_ADMIN_RECORD_LOGS);
    }

    #[test]
    fn list_logs_user_filter_searches_iam_user_identity_fields() {
        assert!(LIST_ADMIN_RECORD_LOGS.contains("lower(COALESCE(iu.display_name, '')) LIKE $3"));
        assert!(LIST_ADMIN_RECORD_LOGS.contains("lower(COALESCE(iu.email, '')) LIKE $3"));
        assert!(LIST_ADMIN_RECORD_LOGS.contains("lower(COALESCE(iu.username, '')) LIKE $3"));
    }

    #[test]
    fn list_logs_projects_user_agent_from_trace_metadata() {
        assert!(
            LIST_ADMIN_RECORD_LOGS.contains("t.metadata->>'userAgent'"),
            "admin record Postgres SQL must project the full User-Agent from trace metadata"
        );
        assert!(
            LIST_ADMIN_RECORD_LOGS.contains("AS user_agent"),
            "admin record Postgres SQL must expose a user_agent column for API serialization"
        );
    }

    fn assert_user_label_order(sql: &str) {
        let owner_snapshot = sql.find("NULLIF(t.owner_name_snapshot, '')").unwrap();
        let usage_snapshot = sql.find("NULLIF(u.owner_name_snapshot, '')").unwrap();
        let display_name = sql.find("NULLIF(iu.display_name, '')").unwrap();
        let email = sql.find("NULLIF(iu.email, '')").unwrap();
        let username = sql.find("NULLIF(iu.username, '')").unwrap();
        let user_id = sql.find("NULLIF(CAST(t.user_id AS TEXT), '')").unwrap();

        assert!(owner_snapshot < usage_snapshot);
        assert!(usage_snapshot < display_name);
        assert!(display_name < email);
        assert!(email < username);
        assert!(username < user_id);
    }
}
