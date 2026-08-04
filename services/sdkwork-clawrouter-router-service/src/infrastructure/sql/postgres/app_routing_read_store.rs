use sqlx::{PgPool, Row};

use crate::domain::{DomainError, DomainResult};
use crate::ports::{
    AppRoutingAccountGroupItem, AppRoutingAccountGroupListPage, AppRoutingApiKeyAccountGroupItem,
    AppRoutingApiKeyItem, AppRoutingApiKeyListPage, AppRoutingListQuery, AppRoutingModelStats,
    AppRoutingReadFuture, AppRoutingReadStore, AppRoutingRequestTraceItem,
    AppRoutingRequestTraceListPage, AppRoutingSubject, AppRoutingUsageData,
    AppRoutingUsageSnapshot,
};

const LOAD_ROUTING_ACCOUNT_GROUPS: &str = r#"
SELECT
    CAST(g.id AS TEXT) AS id,
    g.group_code,
    g.group_name,
    COALESCE(g.description, '') AS description,
    g.routing_strategy,
    g.fallback_mode,
    CAST(g.cost_multiplier AS TEXT) AS cost_multiplier,
    CAST(g.sale_multiplier AS TEXT) AS sale_multiplier,
    g.vendor_code,
    g.modalities::text AS modalities,
    g.status,
    EXISTS (
        SELECT 1
          FROM iam_gateway_api_key k
         WHERE k.tenant_id = g.tenant_id
           AND k.organization_id = g.organization_id
           AND k.user_id = $3
           AND k.status = 1
           AND k.deleted_at IS NULL
           AND (
               k.account_group_id = g.id
               OR EXISTS (
                   SELECT 1
                     FROM iam_gateway_api_key_account_group b
                    WHERE b.tenant_id = k.tenant_id
                      AND b.organization_id = k.organization_id
                      AND b.api_key_id = k.id
                      AND b.account_group_id = g.id
                      AND b.binding_role = 'route'
                      AND b.status = 1
                      AND b.deleted_at IS NULL
                      AND (b.effective_from IS NULL OR b.effective_from <= CURRENT_TIMESTAMP)
                      AND (b.effective_to IS NULL OR b.effective_to > CURRENT_TIMESTAMP)
               )
           )
    ) AS authorized,
    (
        SELECT COUNT(1)
          FROM ai_upstream_account_group_member m
         WHERE m.tenant_id = g.tenant_id
           AND m.organization_id = g.organization_id
           AND m.account_group_id = g.id
           AND m.status = 1
           AND m.enabled
           AND m.deleted_at IS NULL
           AND (m.effective_from IS NULL OR m.effective_from <= CURRENT_TIMESTAMP)
           AND (m.effective_to IS NULL OR m.effective_to > CURRENT_TIMESTAMP)
    ) AS member_account_count,
    (
        SELECT COUNT(1)
          FROM ai_upstream_account_group_member m
          JOIN ai_upstream_account a
            ON a.tenant_id = m.tenant_id
           AND a.organization_id = m.organization_id
           AND a.id = m.account_id
           AND a.status = 1
           AND a.deleted_at IS NULL
          JOIN ai_upstream_account_health_state account_health
            ON account_health.tenant_id = a.tenant_id
           AND account_health.organization_id = a.organization_id
           AND account_health.account_id = a.id
           AND account_health.health_status = 1
          JOIN ai_upstream_supplier s
            ON s.tenant_id = a.tenant_id
           AND s.organization_id = a.organization_id
           AND s.id = a.supplier_id
           AND s.status = 1
           AND s.deleted_at IS NULL
         WHERE m.tenant_id = g.tenant_id
           AND m.organization_id = g.organization_id
           AND m.account_group_id = g.id
           AND m.status = 1
           AND m.enabled
           AND m.deleted_at IS NULL
           AND (m.effective_from IS NULL OR m.effective_from <= CURRENT_TIMESTAMP)
           AND (m.effective_to IS NULL OR m.effective_to > CURRENT_TIMESTAMP)
           AND EXISTS (
               SELECT 1
                 FROM ai_upstream_account_credential c
                WHERE c.tenant_id = a.tenant_id
                  AND c.organization_id = a.organization_id
                  AND c.account_id = a.id
                  AND c.status = 1
                  AND c.is_active
                  AND c.deleted_at IS NULL
                  AND (c.expires_at IS NULL OR c.expires_at > CURRENT_TIMESTAMP)
           )
           AND EXISTS (
               SELECT 1
                 FROM ai_upstream_supplier_endpoint endpoint
                 JOIN ai_upstream_supplier_endpoint_health_state endpoint_health
                   ON endpoint_health.tenant_id = endpoint.tenant_id
                  AND endpoint_health.organization_id = endpoint.organization_id
                  AND endpoint_health.endpoint_id = endpoint.id
                  AND endpoint_health.health_status = 1
                WHERE endpoint.tenant_id = a.tenant_id
                  AND endpoint.organization_id = a.organization_id
                  AND endpoint.supplier_id = a.supplier_id
                  AND endpoint.status = 1
                  AND endpoint.deleted_at IS NULL
                  AND (a.preferred_endpoint_id IS NULL OR endpoint.id = a.preferred_endpoint_id)
           )
    ) AS available_account_count,
    COALESCE(
        (
            SELECT jsonb_agg(r.resource_code ORDER BY r.priority, r.id)::text
              FROM ai_upstream_account_group_resource r
             WHERE r.tenant_id = g.tenant_id
               AND r.organization_id = g.organization_id
               AND r.account_group_id = g.id
               AND r.status = 1
               AND r.deleted_at IS NULL
               AND r.grant_type = 'allow'
               AND NULLIF(r.resource_code, '') IS NOT NULL
               AND (r.effective_from IS NULL OR r.effective_from <= CURRENT_TIMESTAMP)
               AND (r.effective_to IS NULL OR r.effective_to > CURRENT_TIMESTAMP)
        ),
        '[]'
    ) AS resource_codes_json,
    COALESCE(
        (
            SELECT jsonb_agg(r.resource_group_code ORDER BY r.priority, r.id)::text
              FROM ai_upstream_account_group_resource r
             WHERE r.tenant_id = g.tenant_id
               AND r.organization_id = g.organization_id
               AND r.account_group_id = g.id
               AND r.status = 1
               AND r.deleted_at IS NULL
               AND r.grant_type = 'allow'
               AND NULLIF(r.resource_group_code, '') IS NOT NULL
               AND (r.effective_from IS NULL OR r.effective_from <= CURRENT_TIMESTAMP)
               AND (r.effective_to IS NULL OR r.effective_to > CURRENT_TIMESTAMP)
        ),
        '[]'
    ) AS resource_group_codes_json,
    COUNT(*) OVER() AS total
FROM ai_upstream_account_group g
WHERE g.tenant_id = $1
  AND g.organization_id = $2
  AND g.deleted_at IS NULL
  AND ($4::text IS NULL OR lower(CONCAT_WS(' ', g.group_code, g.group_name, g.description)) LIKE lower($4))
ORDER BY g.priority ASC, g.group_code ASC, g.id ASC
LIMIT $5 OFFSET $6
"#;

const LOAD_ROUTING_API_KEYS: &str = r#"
SELECT
    CAST(k.id AS TEXT) AS id,
    COALESCE(NULLIF(k.name, ''), 'API Key #' || CAST(k.id AS TEXT)) AS name,
    COALESCE(NULLIF(k.key_display_masked, ''), NULLIF(k.key_prefix, ''), '') AS key_display_masked,
    k.status AS api_key_status,
    CAST(k.created_at AS TEXT) AS created_at,
    CAST(COALESCE(SUM(COALESCE(u.request_count, 0)), 0) AS TEXT) AS total_usage,
    ag.account_groups_json,
    COUNT(*) OVER() AS total
FROM iam_gateway_api_key k
LEFT JOIN ai_usage u
  ON u.tenant_id = k.tenant_id
 AND u.organization_id = k.organization_id
 AND u.user_id = k.user_id
 AND u.api_key_id = k.id
 AND u.status = 1
LEFT JOIN LATERAL (
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', CAST(g.id AS TEXT),
                'code', g.group_code,
                'name', g.group_name
            ) ORDER BY g.priority, g.group_code, g.id
        ),
        '[]'::jsonb
    )::text AS account_groups_json
    FROM ai_upstream_account_group g
    WHERE g.tenant_id = k.tenant_id
      AND g.organization_id = k.organization_id
      AND g.status = 1
      AND g.deleted_at IS NULL
      AND g.id IN (
          SELECT k.account_group_id WHERE k.account_group_id IS NOT NULL
          UNION
          SELECT b.account_group_id
            FROM iam_gateway_api_key_account_group b
           WHERE b.tenant_id = k.tenant_id
             AND b.organization_id = k.organization_id
             AND b.api_key_id = k.id
             AND b.binding_role = 'route'
             AND b.status = 1
             AND b.deleted_at IS NULL
             AND (b.effective_from IS NULL OR b.effective_from <= CURRENT_TIMESTAMP)
             AND (b.effective_to IS NULL OR b.effective_to > CURRENT_TIMESTAMP)
      )
) ag ON true
WHERE k.tenant_id = $1
  AND k.organization_id = $2
  AND k.user_id = $3
  AND k.deleted_at IS NULL
  AND ($4::text IS NULL OR lower(COALESCE(k.name, k.key_prefix, k.key_display_masked, '')) LIKE lower($4))
GROUP BY k.id, k.name, k.key_prefix, k.key_display_masked, k.metadata, k.status, k.created_at, ag.account_groups_json
ORDER BY k.updated_at DESC NULLS LAST, k.id DESC
LIMIT $5 OFFSET $6
"#;

const LOAD_ROUTING_REQUEST_TRACES: &str = r#"
WITH selected_trace AS (
    SELECT
        id,
        request_id,
        trace_id,
        tenant_id,
        organization_id,
        user_id,
        status,
        created_at,
        ended_at,
        account_group_id,
        account_group_snapshot,
        account_id,
        account_name_snapshot,
        requested_model,
        provider_model,
        request_path,
        http_method,
        http_status,
        provider_error_code,
        error_type,
        error_message_masked,
        request_payload_hash,
        response_payload_hash,
        request_bytes,
        response_bytes,
        streaming,
        started_at,
        latency_ms,
        total_tokens
    FROM (
        SELECT
            t.id,
            t.request_id,
            t.trace_id,
            t.tenant_id,
            t.organization_id,
            t.user_id,
            t.status,
            t.created_at,
            t.ended_at,
            t.account_group_id,
            t.account_group_snapshot,
            t.account_id,
            t.account_name_snapshot,
            t.requested_model,
            t.provider_model,
            t.request_path,
            t.http_method,
            t.http_status,
            t.provider_error_code,
            t.error_type,
            t.error_message_masked,
            t.request_payload_hash,
            t.response_payload_hash,
            t.request_bytes,
            t.response_bytes,
            t.streaming,
            t.started_at,
            t.latency_ms,
            t.total_tokens,
            ROW_NUMBER() OVER (
                PARTITION BY COALESCE(NULLIF(t.request_id, ''), CAST(t.id AS TEXT))
                ORDER BY t.started_at DESC NULLS LAST, t.id DESC
            ) AS trace_rank
        FROM ai_request_trace t
        WHERE t.status = 1
          AND t.tenant_id = $1
          AND t.organization_id = $2
          AND t.user_id = $3
    ) ranked_trace
    WHERE trace_rank = 1
),
usage_by_request AS (
    SELECT
        tenant_id,
        organization_id,
        request_id,
        MAX(catalog_key) AS catalog_key,
        COALESCE(SUM(COALESCE(total_tokens, 0)), 0) AS total_tokens
    FROM ai_usage
    WHERE status = 1
      AND tenant_id = $1
      AND organization_id = $2
      AND user_id = $3
      AND NULLIF(request_id, '') IS NOT NULL
    GROUP BY tenant_id, organization_id, request_id
)
SELECT
    CAST(t.id AS TEXT) AS id,
    COALESCE(CAST(t.started_at AS TEXT), CAST(t.created_at AS TEXT), '') AS trace_time,
    COALESCE(NULLIF(t.trace_id, ''), '') AS trace_id,
    COALESCE(NULLIF(t.request_id, ''), '') AS request_id,
    COALESCE(NULLIF(u.catalog_key, ''), NULLIF(d.resolved_model, ''), NULLIF(t.provider_model, ''), NULLIF(t.requested_model, ''), '-') AS model,
    COALESCE(CAST(t.account_id AS TEXT), CAST(d.selected_account_id AS TEXT), '') AS upstream_account_id,
    COALESCE(NULLIF(a.account_code, ''), '') AS upstream_account_code,
    COALESCE(NULLIF(t.account_name_snapshot, ''), NULLIF(a.account_name, ''), '') AS upstream_account_name,
    COALESCE(CAST(t.account_group_id AS TEXT), '') AS upstream_account_group_id,
    COALESCE(NULLIF(g.group_code, ''), '') AS upstream_account_group_code,
    COALESCE(NULLIF(t.account_group_snapshot, ''), NULLIF(g.group_name, ''), '') AS upstream_account_group_name,
    COALESCE(NULLIF(t.request_path, ''), '') AS request_path,
    COALESCE(NULLIF(t.http_method, ''), '') AS http_method,
    t.http_status AS http_status,
    COALESCE(NULLIF(t.provider_error_code, ''), '') AS provider_error_code,
    COALESCE(CAST(t.error_type AS TEXT), '') AS error_type,
    COALESCE(NULLIF(t.error_message_masked, ''), '') AS error_message_masked,
    COALESCE(NULLIF(t.request_payload_hash, ''), '') AS request_payload_hash,
    COALESCE(NULLIF(t.response_payload_hash, ''), '') AS response_payload_hash,
    COALESCE(t.request_bytes, 0) AS request_bytes,
    COALESCE(t.response_bytes, 0) AS response_bytes,
    COALESCE(CAST(t.started_at AS TEXT), '') AS started_at,
    COALESCE(CAST(t.ended_at AS TEXT), '') AS ended_at,
    CASE WHEN COALESCE(t.streaming, false) THEN 1 ELSE 0 END AS streaming,
    t.latency_ms AS latency_ms,
    CAST(COALESCE(u.total_tokens, t.total_tokens, 0) AS BIGINT) AS total_tokens,
    COUNT(*) OVER() AS total
FROM selected_trace t
LEFT JOIN ai_routing_decision_log d
  ON d.status = 1
 AND d.tenant_id = t.tenant_id
 AND d.organization_id = t.organization_id
 AND d.request_id = t.request_id
LEFT JOIN ai_upstream_account a
  ON a.tenant_id = t.tenant_id
 AND a.organization_id = t.organization_id
 AND a.id = COALESCE(t.account_id, d.selected_account_id)
 AND a.deleted_at IS NULL
LEFT JOIN ai_upstream_account_group g
  ON g.tenant_id = t.tenant_id
 AND g.organization_id = t.organization_id
 AND g.id = t.account_group_id
 AND g.deleted_at IS NULL
LEFT JOIN usage_by_request u
  ON u.tenant_id = t.tenant_id
 AND u.organization_id = t.organization_id
 AND u.request_id = t.request_id
WHERE (
    $4::text IS NULL
    OR lower(CONCAT_WS(
        ' ',
        t.request_id,
        t.trace_id,
        t.requested_model,
        t.provider_model,
        t.request_path,
        t.provider_error_code,
        a.account_code,
        a.account_name,
        g.group_code,
        g.group_name,
        u.catalog_key,
        d.resolved_model
    )) LIKE lower($4)
)
ORDER BY t.started_at DESC NULLS LAST, t.id DESC
LIMIT $5 OFFSET $6
"#;

const LOAD_ROUTING_USAGE_CHART: &str = r#"
SELECT bucket_time, request_count, avg_latency_ms
FROM (
    SELECT
        TO_CHAR(DATE_TRUNC('day', COALESCE(started_at, created_at)), 'YYYY-MM-DD') AS bucket_time,
        COUNT(1) AS request_count,
        CAST(COALESCE(AVG(latency_ms), 0) AS BIGINT) AS avg_latency_ms
    FROM ai_request_trace
    WHERE status = 1
      AND tenant_id = $1
      AND organization_id = $2
      AND user_id = $3
      AND COALESCE(started_at, created_at) IS NOT NULL
    GROUP BY bucket_time
    ORDER BY bucket_time DESC
    LIMIT 14
) recent_usage
ORDER BY bucket_time ASC
"#;

const LOAD_ROUTING_MODEL_STATS: &str = r#"
WITH trace_by_model AS (
    SELECT
        COALESCE(NULLIF(u.catalog_key, ''), NULLIF(d.resolved_model, ''), NULLIF(t.provider_model, ''), NULLIF(t.requested_model, ''), 'unknown') AS model,
        COUNT(1) AS request_count,
        SUM(
            CASE
                WHEN (t.http_status IS NOT NULL AND t.http_status >= 400)
                  OR t.error_type IS NOT NULL
                  OR NULLIF(t.provider_error_code, '') IS NOT NULL THEN 0
                ELSE 1
            END
        ) AS success_count,
        CAST(COALESCE(AVG(t.latency_ms), 0) AS BIGINT) AS avg_latency_ms
    FROM ai_request_trace t
    LEFT JOIN (
        SELECT
            tenant_id,
            organization_id,
            request_id,
            MAX(catalog_key) AS catalog_key
        FROM ai_usage
        WHERE status = 1
          AND tenant_id = $1
          AND organization_id = $2
          AND user_id = $3
          AND NULLIF(request_id, '') IS NOT NULL
        GROUP BY tenant_id, organization_id, request_id
    ) u
      ON u.tenant_id = t.tenant_id
     AND u.organization_id = t.organization_id
     AND u.request_id = t.request_id
    LEFT JOIN ai_routing_decision_log d
      ON d.status = 1
     AND d.tenant_id = t.tenant_id
     AND d.organization_id = t.organization_id
     AND d.request_id = t.request_id
    WHERE t.status = 1
      AND t.tenant_id = $1
      AND t.organization_id = $2
      AND t.user_id = $3
    GROUP BY model
),
usage_by_model AS (
    SELECT
        COALESCE(NULLIF(catalog_key, ''), 'unknown') AS model,
        COALESCE(SUM(COALESCE(total_tokens, 0)), 0) AS total_tokens
    FROM ai_usage
    WHERE status = 1
      AND tenant_id = $1
      AND organization_id = $2
      AND user_id = $3
    GROUP BY COALESCE(NULLIF(catalog_key, ''), 'unknown')
)
SELECT
    t.model,
    t.request_count,
    t.success_count,
    COALESCE(u.total_tokens, 0) AS total_tokens,
    t.avg_latency_ms
FROM trace_by_model t
LEFT JOIN usage_by_model u
  ON u.model = t.model
ORDER BY t.request_count DESC, t.model ASC
LIMIT 10
"#;

#[derive(Clone)]
pub struct PostgresAppRoutingReadStore {
    pool: PgPool,
}

impl PostgresAppRoutingReadStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AppRoutingReadStore for PostgresAppRoutingReadStore {
    fn load_routing_account_groups<'a>(
        &'a self,
        subject: Option<AppRoutingSubject>,
        query: AppRoutingListQuery,
    ) -> AppRoutingReadFuture<'a, AppRoutingAccountGroupListPage> {
        Box::pin(async move {
            let subject = require_subject(subject)?;
            let search = query.q.as_deref().map(|value| format!("%{value}%"));
            let rows = sqlx::query(LOAD_ROUTING_ACCOUNT_GROUPS)
                .bind(subject.tenant_id)
                .bind(subject.organization_id)
                .bind(subject.user_id)
                .bind(search)
                .bind(query.page_size.max(1))
                .bind(query.offset.max(0))
                .fetch_all(&self.pool)
                .await
                .map_err(sql_error)?;
            let total = rows
                .first()
                .and_then(|row| row.try_get::<i64, _>("total").ok())
                .unwrap_or(0);
            let items = rows
                .into_iter()
                .map(row_to_account_group)
                .collect::<DomainResult<Vec<_>>>()?;
            Ok(AppRoutingAccountGroupListPage {
                items,
                total,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn load_routing_api_keys<'a>(
        &'a self,
        subject: Option<AppRoutingSubject>,
        query: AppRoutingListQuery,
    ) -> AppRoutingReadFuture<'a, AppRoutingApiKeyListPage> {
        Box::pin(async move {
            let subject = require_subject(subject)?;
            let search = query.q.as_deref().map(|value| format!("%{value}%"));
            let rows = sqlx::query(LOAD_ROUTING_API_KEYS)
                .bind(subject.tenant_id)
                .bind(subject.organization_id)
                .bind(subject.user_id)
                .bind(search)
                .bind(query.page_size.max(1))
                .bind(query.offset.max(0))
                .fetch_all(&self.pool)
                .await
                .map_err(sql_error)?;
            let total = rows
                .first()
                .and_then(|row| row.try_get::<i64, _>("total").ok())
                .unwrap_or(0);
            let items = rows
                .into_iter()
                .map(row_to_api_key)
                .collect::<DomainResult<Vec<_>>>()?;
            Ok(AppRoutingApiKeyListPage {
                items,
                total,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn load_routing_request_traces<'a>(
        &'a self,
        subject: Option<AppRoutingSubject>,
        query: AppRoutingListQuery,
    ) -> AppRoutingReadFuture<'a, AppRoutingRequestTraceListPage> {
        Box::pin(async move {
            let subject = require_subject(subject)?;
            let search = query.q.as_deref().map(|value| format!("%{value}%"));
            let rows = sqlx::query(LOAD_ROUTING_REQUEST_TRACES)
                .bind(subject.tenant_id)
                .bind(subject.organization_id)
                .bind(subject.user_id)
                .bind(search)
                .bind(query.page_size.max(1))
                .bind(query.offset.max(0))
                .fetch_all(&self.pool)
                .await
                .map_err(sql_error)?;
            let total = rows
                .first()
                .and_then(|row| row.try_get::<i64, _>("total").ok())
                .unwrap_or(0);
            let items = rows
                .into_iter()
                .map(row_to_request_trace)
                .collect::<DomainResult<Vec<_>>>()?;
            Ok(AppRoutingRequestTraceListPage {
                items,
                total,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn load_routing_usage<'a>(
        &'a self,
        subject: Option<AppRoutingSubject>,
    ) -> AppRoutingReadFuture<'a, AppRoutingUsageSnapshot> {
        Box::pin(async move {
            let subject = require_subject(subject)?;
            let chart_rows = sqlx::query(LOAD_ROUTING_USAGE_CHART)
                .bind(subject.tenant_id)
                .bind(subject.organization_id)
                .bind(subject.user_id)
                .fetch_all(&self.pool)
                .await
                .map_err(sql_error)?;
            let model_rows = sqlx::query(LOAD_ROUTING_MODEL_STATS)
                .bind(subject.tenant_id)
                .bind(subject.organization_id)
                .bind(subject.user_id)
                .fetch_all(&self.pool)
                .await
                .map_err(sql_error)?;
            Ok(AppRoutingUsageSnapshot {
                chart_data: chart_rows.into_iter().map(row_to_usage_data).collect(),
                model_stats: model_rows.into_iter().map(row_to_model_stats).collect(),
            })
        })
    }
}

fn row_to_account_group(row: sqlx::postgres::PgRow) -> DomainResult<AppRoutingAccountGroupItem> {
    Ok(AppRoutingAccountGroupItem {
        id: string_cell(&row, "id"),
        group_code: string_cell(&row, "group_code"),
        group_name: string_cell(&row, "group_name"),
        description: string_cell(&row, "description"),
        routing_strategy: string_cell(&row, "routing_strategy"),
        fallback_mode: string_cell(&row, "fallback_mode"),
        cost_multiplier: string_cell(&row, "cost_multiplier"),
        sale_multiplier: string_cell(&row, "sale_multiplier"),
        vendor_code: optional_string_cell(&row, "vendor_code"),
        modalities: parse_string_array(&string_cell(&row, "modalities"))?,
        status: account_group_status_label(required_integer_cell(&row, "status")?)?,
        authorized: required_bool_cell(&row, "authorized")?,
        member_account_count: integer_cell(&row, "member_account_count"),
        available_account_count: integer_cell(&row, "available_account_count"),
        resource_codes: parse_string_array(&string_cell(&row, "resource_codes_json"))?,
        resource_group_codes: parse_string_array(&string_cell(&row, "resource_group_codes_json"))?,
    })
}

fn row_to_api_key(row: sqlx::postgres::PgRow) -> DomainResult<AppRoutingApiKeyItem> {
    Ok(AppRoutingApiKeyItem {
        id: string_cell(&row, "id"),
        name: string_cell(&row, "name"),
        display_key: string_cell(&row, "key_display_masked"),
        status: api_key_status_label(required_integer_cell(&row, "api_key_status")?)?,
        total_usage: string_cell(&row, "total_usage"),
        created_at: string_cell(&row, "created_at"),
        account_groups: parse_api_key_account_groups(&string_cell(&row, "account_groups_json"))?,
    })
}

fn row_to_request_trace(row: sqlx::postgres::PgRow) -> DomainResult<AppRoutingRequestTraceItem> {
    let http_status = routing_trace_http_status(required_integer_cell(&row, "http_status")?)?;
    let latency_ms = routing_trace_latency_ms(integer_cell(&row, "latency_ms"))?;
    Ok(AppRoutingRequestTraceItem {
        id: string_cell(&row, "id"),
        time: string_cell(&row, "trace_time"),
        model: string_cell(&row, "model"),
        upstream_account_id: string_cell(&row, "upstream_account_id"),
        upstream_account_code: string_cell(&row, "upstream_account_code"),
        upstream_account_name: string_cell(&row, "upstream_account_name"),
        upstream_account_group_id: string_cell(&row, "upstream_account_group_id"),
        upstream_account_group_code: string_cell(&row, "upstream_account_group_code"),
        upstream_account_group_name: string_cell(&row, "upstream_account_group_name"),
        status: http_status,
        duration: duration_label(latency_ms),
        tokens: integer_cell(&row, "total_tokens"),
        trace_id: string_cell(&row, "trace_id"),
        request_id: string_cell(&row, "request_id"),
        request_path: string_cell(&row, "request_path"),
        http_method: string_cell(&row, "http_method"),
        request_payload_hash: string_cell(&row, "request_payload_hash"),
        response_payload_hash: string_cell(&row, "response_payload_hash"),
        request_bytes: integer_cell(&row, "request_bytes"),
        response_bytes: integer_cell(&row, "response_bytes"),
        provider_error_code: string_cell(&row, "provider_error_code"),
        error_type: string_cell(&row, "error_type"),
        error_message_masked: string_cell(&row, "error_message_masked"),
        started_at: string_cell(&row, "started_at"),
        ended_at: string_cell(&row, "ended_at"),
        streaming: integer_cell(&row, "streaming") != 0,
    })
}

fn row_to_usage_data(row: sqlx::postgres::PgRow) -> AppRoutingUsageData {
    AppRoutingUsageData {
        time: string_cell(&row, "bucket_time"),
        requests: integer_cell(&row, "request_count"),
        latency: integer_cell(&row, "avg_latency_ms"),
    }
}

fn row_to_model_stats(row: sqlx::postgres::PgRow) -> AppRoutingModelStats {
    let requests = integer_cell(&row, "request_count");
    AppRoutingModelStats {
        m: string_cell(&row, "model"),
        req: requests.to_string(),
        sr: success_rate_label(integer_cell(&row, "success_count"), requests),
        tok: integer_cell(&row, "total_tokens").to_string(),
        lat: duration_label(integer_cell(&row, "avg_latency_ms")),
    }
}

fn require_subject(subject: Option<AppRoutingSubject>) -> DomainResult<AppRoutingSubject> {
    subject.ok_or_else(|| DomainError::new("trusted request subject is required for app routing"))
}

fn parse_string_array(value: &str) -> DomainResult<Vec<String>> {
    let parsed: Vec<String> = serde_json::from_str(value).map_err(|error| {
        DomainError::new(format!(
            "invalid routing resource array from database row: {error}"
        ))
    })?;
    let mut normalized = Vec::new();
    for value in parsed {
        let value = value.trim();
        if value.is_empty() {
            continue;
        }
        if !normalized.iter().any(|existing| existing == value) {
            normalized.push(value.to_owned());
        }
    }
    Ok(normalized)
}

fn parse_api_key_account_groups(
    value: &str,
) -> DomainResult<Vec<AppRoutingApiKeyAccountGroupItem>> {
    serde_json::from_str(value).map_err(|error| {
        DomainError::new(format!(
            "invalid routing API key account-group array from database row: {error}"
        ))
    })
}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> String {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .unwrap_or_default()
}

fn optional_string_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<String> {
    row.try_get::<Option<String>, _>(column).ok().flatten()
}

fn integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> i64 {
    optional_integer_cell(row, column).unwrap_or(0)
}

fn required_integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<i64> {
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

fn required_bool_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<bool> {
    row.try_get::<bool, _>(column).map_err(|error| {
        DomainError::new(format!(
            "missing or invalid routing {column} flag from database row: {error}"
        ))
    })
}

fn account_group_status_label(status: i64) -> DomainResult<String> {
    match status {
        1 => Ok("enabled".to_owned()),
        0 | 4 => Ok("disabled".to_owned()),
        value => Err(DomainError::new(format!(
            "invalid routing account-group status from database row: {value}"
        ))),
    }
}

fn api_key_status_label(status: i64) -> DomainResult<String> {
    match status {
        1 => Ok("enabled".to_owned()),
        0 | 4 => Ok("disabled".to_owned()),
        value => Err(DomainError::new(format!(
            "invalid routing api key status from database row: {value}"
        ))),
    }
}

fn routing_trace_http_status(value: i64) -> DomainResult<i64> {
    if (100..=599).contains(&value) {
        return Ok(value);
    }
    Err(DomainError::new(format!(
        "invalid routing trace http_status from database row: {value}"
    )))
}

fn routing_trace_latency_ms(value: i64) -> DomainResult<i64> {
    if value >= 0 {
        return Ok(value);
    }
    Err(DomainError::new(format!(
        "invalid routing trace latency_ms from database row: {value}"
    )))
}

fn missing_integer_cell_error(column: &str) -> DomainError {
    match column {
        "http_status" => DomainError::new("missing routing trace http_status from database row"),
        "api_key_status" => DomainError::new("missing routing api key status from database row"),
        column => DomainError::new(format!("missing routing {column} from database row")),
    }
}

fn duration_label(value: i64) -> String {
    format!("{value}ms")
}

fn success_rate_label(success: i64, total: i64) -> String {
    if total <= 0 {
        return "0%".to_owned();
    }
    format!("{:.1}%", (success as f64) * 100.0 / (total as f64))
}

fn sql_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_string_array_rejects_invalid_capabilities_json() {
        assert_eq!(
            vec!["llm".to_owned(), "image".to_owned()],
            parse_string_array(r#"["llm", "image"]"#).expect("valid capabilities json")
        );

        let invalid = parse_string_array("not-json")
            .expect_err("invalid routing capabilities json must fail");
        assert!(invalid
            .to_string()
            .contains("invalid routing resource array from database row"));
    }
}
