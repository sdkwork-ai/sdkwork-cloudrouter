use std::sync::Arc;

use sqlx::{PgPool, Row};

use crate::application::ApiKeySecretCodec;
use crate::domain::{DomainError, DomainResult};
use crate::ports::{
    AppRoutingApiKeyItem, AppRoutingApiKeyListPage, AppRoutingChannelItem,
    AppRoutingChannelListPage, AppRoutingListQuery, AppRoutingModelStats, AppRoutingReadFuture,
    AppRoutingReadStore, AppRoutingRequestTraceItem, AppRoutingRequestTraceListPage,
    AppRoutingRetryPolicyItem, AppRoutingSubject, AppRoutingUsageData, AppRoutingUsageSnapshot,
};

const LOAD_ROUTING_CHANNELS: &str = r#"
SELECT
    CAST(c.id AS TEXT) AS id,
    COALESCE(NULLIF(c.channel_name, ''), NULLIF(c.channel_code, ''), NULLIF(c.provider_code, ''), '') AS name,
    COALESCE(NULLIF(c.provider_code, ''), 'custom') AS vendor,
    COALESCE(NULLIF(c.provider_code, ''), 'custom') AS provider,
    COALESCE(NULLIF(c.provider_code, ''), 'custom') AS provider_code,
    CASE LOWER(COALESCE(NULLIF(c.protocol_code, ''), NULLIF(c.provider_code, ''), 'openai'))
        WHEN 'openai' THEN 1
        WHEN 'anthropic' THEN 2
        WHEN 'gemini' THEN 3
        WHEN 'google' THEN 3
        WHEN 'ollama' THEN 4
        ELSE 9
    END AS protocol,
    COALESCE(c.auth_type, 1) AS access_type,
    COALESCE(NULLIF(cc.base_url, ''), NULLIF(c.base_url, ''), '') AS base_url,
    COALESCE(NULLIF(cc.masked_label, ''), NULLIF(c.masked_label, ''), 'configured') AS api_key,
    COALESCE(
        (
            SELECT jsonb_agg(selected.capability ORDER BY selected.capability)::text
            FROM (
                SELECT DISTINCT capability
                FROM (
                    SELECT CASE LOWER(COALESCE(NULLIF(r.modality_code, ''), NULLIF(cr.resource_code, ''), NULLIF(cr.resource_group_code, '')))
                        WHEN 'llm' THEN 'llm'
                        WHEN 'chat' THEN 'llm'
                        WHEN 'embedding' THEN 'llm'
                        WHEN 'rerank' THEN 'llm'
                        WHEN 'modality.llm' THEN 'llm'
                        WHEN 'modality.chat' THEN 'llm'
                        WHEN 'modality.embedding' THEN 'llm'
                        WHEN 'modality.rerank' THEN 'llm'
                        WHEN 'image' THEN 'image'
                        WHEN 'vision' THEN 'image'
                        WHEN 'modality.image' THEN 'image'
                        WHEN 'modality.vision' THEN 'image'
                        WHEN 'audio' THEN 'audio'
                        WHEN 'speech' THEN 'audio'
                        WHEN 'modality.audio' THEN 'audio'
                        WHEN 'modality.speech' THEN 'audio'
                        WHEN 'music' THEN 'music'
                        WHEN 'modality.music' THEN 'music'
                        WHEN 'sfx' THEN 'sfx'
                        WHEN 'sound_effect' THEN 'sfx'
                        WHEN 'sound_effects' THEN 'sfx'
                        WHEN 'modality.sfx' THEN 'sfx'
                        WHEN 'modality.sound_effect' THEN 'sfx'
                        WHEN 'modality.sound_effects' THEN 'sfx'
                        WHEN 'video' THEN 'video'
                        WHEN 'modality.video' THEN 'video'
                    END AS capability
                    FROM ai_channel_resource cr
                    LEFT JOIN ai_resource r
                      ON r.resource_code = cr.resource_code
                     AND r.tenant_id = cr.tenant_id
                     AND r.organization_id = cr.organization_id
                     AND r.deleted_at IS NULL
                    LEFT JOIN ai_resource_group rg
                      ON rg.group_code = cr.resource_group_code
                     AND rg.tenant_id = cr.tenant_id
                     AND rg.organization_id = cr.organization_id
                     AND rg.deleted_at IS NULL
                    WHERE cr.channel_id = c.id
                      AND cr.tenant_id = c.tenant_id
                      AND cr.organization_id = c.organization_id
                      AND cr.deleted_at IS NULL
                      AND cr.status = 1
                      AND cr.grant_type = 'allow'
                      AND (
                          COALESCE(r.resource_type, rg.group_type, '') = 'modality'
                          OR cr.resource_code LIKE 'modality.%'
                          OR cr.resource_group_code LIKE 'modality.%'
                      )
                ) capability_source
                WHERE capability IS NOT NULL
            ) selected
        ),
        '["llm"]'
    ) AS capabilities_json,
    c.timeout_ms,
    c.retry_policy::text AS retry_policy_json,
    c.circuit_breaker_policy::text AS circuit_breaker_policy_json,
    COALESCE(c.weight, 0) AS weight,
    c.status AS status,
    c.health_status AS health_status,
    COALESCE(c.last_latency_ms, 0) AS latency_ms,
    COALESCE(c.rpm_limit, 0) AS rpm_limit,
    CAST(c.upstream_balance_amount AS TEXT) AS balance_amount,
    COALESCE(c.upstream_balance_currency, '') AS balance_currency,
    COALESCE(c.consecutive_error_count, 0) AS errors,
    COUNT(*) OVER() AS total
FROM ai_channel c
LEFT JOIN LATERAL (
    SELECT credential.id, credential.base_url, credential.masked_label
    FROM ai_channel_credential credential
    WHERE credential.channel_id = c.id
      AND credential.tenant_id = c.tenant_id
      AND credential.organization_id = c.organization_id
      AND credential.status = 1
      AND credential.deleted_at IS NULL
    ORDER BY COALESCE(credential.priority, 100) ASC, COALESCE(credential.weight, 100) DESC, credential.id ASC
    LIMIT 1
) cc ON true
WHERE c.tenant_id = $1
  AND c.organization_id = $2
  AND c.deleted_at IS NULL
  AND ($3::text IS NULL OR lower(COALESCE(c.channel_name, c.channel_code, c.provider_code, '')) LIKE lower($3))
ORDER BY c.priority ASC NULLS LAST, c.weight DESC NULLS LAST, c.id DESC
LIMIT $4 OFFSET $5
"#;

const LOAD_ROUTING_API_KEYS: &str = r#"
SELECT
    CAST(k.id AS TEXT) AS id,
    COALESCE(NULLIF(k.name, ''), 'API Key #' || CAST(k.id AS TEXT)) AS name,
    COALESCE(NULLIF(k.key_display_masked, ''), NULLIF(k.key_prefix, ''), '') AS key_display_masked,
    k.metadata ->> 'copyableKeyCiphertext' AS copyable_key_ciphertext,
    k.status AS api_key_status,
    CAST(k.created_at AS TEXT) AS created_at,
    CAST(COALESCE(SUM(COALESCE(u.request_count, 0)), 0) AS TEXT) AS total_usage,
    COUNT(*) OVER() AS total
FROM iam_gateway_api_key k
LEFT JOIN ai_usage u
  ON u.tenant_id = k.tenant_id
 AND u.organization_id = k.organization_id
 AND u.user_id = k.user_id
 AND u.api_key_id = k.id
 AND u.status = 1
WHERE k.tenant_id = $1
  AND k.organization_id = $2
  AND k.user_id = $3
  AND k.deleted_at IS NULL
  AND ($4::text IS NULL OR lower(COALESCE(k.name, k.key_prefix, k.key_display_masked, '')) LIKE lower($4))
GROUP BY k.id, k.name, k.key_prefix, k.key_display_masked, k.metadata, k.status, k.created_at
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
        channel_name_snapshot,
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
            t.channel_name_snapshot,
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
    COALESCE(NULLIF(t.channel_name_snapshot, ''), CAST(d.selected_channel_id AS TEXT), '-') AS channel,
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
    COALESCE(u.total_tokens, t.total_tokens, 0) AS total_tokens,
    COUNT(*) OVER() AS total
FROM selected_trace t
LEFT JOIN ai_routing_decision_log d
  ON d.status = 1
 AND d.tenant_id = t.tenant_id
 AND d.organization_id = t.organization_id
 AND d.request_id = t.request_id
LEFT JOIN usage_by_request u
  ON u.tenant_id = t.tenant_id
 AND u.organization_id = t.organization_id
 AND u.request_id = t.request_id
ORDER BY t.started_at DESC NULLS LAST, t.id DESC
LIMIT $4 OFFSET $5
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
    api_key_secret_codec: Option<Arc<dyn ApiKeySecretCodec + Send + Sync>>,
}

impl PostgresAppRoutingReadStore {
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            api_key_secret_codec: None,
        }
    }

    pub fn with_api_key_secret_codec(
        pool: PgPool,
        api_key_secret_codec: Arc<dyn ApiKeySecretCodec + Send + Sync>,
    ) -> Self {
        Self {
            pool,
            api_key_secret_codec: Some(api_key_secret_codec),
        }
    }
}

impl AppRoutingReadStore for PostgresAppRoutingReadStore {
    fn load_routing_channels<'a>(
        &'a self,
        subject: Option<AppRoutingSubject>,
        query: AppRoutingListQuery,
    ) -> AppRoutingReadFuture<'a, AppRoutingChannelListPage> {
        Box::pin(async move {
            let subject = require_subject(subject)?;
            let search = query.q.as_deref().map(|value| format!("%{value}%"));
            let rows = sqlx::query(LOAD_ROUTING_CHANNELS)
                .bind(subject.tenant_id)
                .bind(subject.organization_id)
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
            let items = rows.into_iter().map(row_to_channel).collect::<DomainResult<Vec<_>>>()?;
            Ok(AppRoutingChannelListPage {
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
            let row_to_api_key = |row| row_to_api_key(row, self.api_key_secret_codec.as_deref());
            let items = rows.into_iter().map(row_to_api_key).collect::<DomainResult<Vec<_>>>()?;
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
            let rows = sqlx::query(LOAD_ROUTING_REQUEST_TRACES)
                .bind(subject.tenant_id)
                .bind(subject.organization_id)
                .bind(subject.user_id)
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

fn row_to_channel(row: sqlx::postgres::PgRow) -> DomainResult<AppRoutingChannelItem> {
    let id = string_cell(&row, "id");
    let capabilities = parse_string_array(&string_cell(&row, "capabilities_json"))?;
    let errors = integer_cell(&row, "errors");
    let status = required_integer_cell(&row, "status")?;
    let health_status = required_integer_cell(&row, "health_status")?;
    let retry_policy_json = string_cell(&row, "retry_policy_json");
    let circuit_breaker_policy_json = string_cell(&row, "circuit_breaker_policy_json");
    Ok(AppRoutingChannelItem {
        id: id.clone(),
        name: string_cell(&row, "name"),
        vendor: display_vendor(&string_cell(&row, "vendor")),
        provider: display_vendor(&string_cell(&row, "provider")),
        provider_code: string_cell(&row, "provider_code"),
        protocol: protocol_label(required_integer_cell(&row, "protocol")?)?,
        access_type: access_type_label(required_integer_cell(&row, "access_type")?)?,
        base_url: string_cell(&row, "base_url"),
        api_key: string_cell(&row, "api_key"),
        models: Vec::new(),
        is_multimodal: capabilities.iter().any(|capability| capability != "llm"),
        capabilities,
        timeout_ms: row.try_get("timeout_ms").ok().flatten(),
        retry_policy: retry_policy_json
            .trim()
            .is_empty()
            .then_some(None)
            .unwrap_or_else(|| AppRoutingRetryPolicyItem::from_json(&retry_policy_json)),
        circuit_breaker_policy: circuit_breaker_policy_json
            .trim()
            .is_empty()
            .then_some(None)
            .unwrap_or_else(|| {
                crate::ports::AppRoutingCircuitBreakerPolicyItem::from_json(
                    &circuit_breaker_policy_json,
                )
            }),
        weight: integer_cell(&row, "weight"),
        status: status_label(status, health_status, errors)?,
        latency: duration_or_na(integer_cell(&row, "latency_ms")),
        rpm: integer_cell(&row, "rpm_limit"),
        balance: balance_label(
            &string_cell(&row, "balance_amount"),
            &string_cell(&row, "balance_currency"),
        ),
        errors,
    })
}

fn row_to_api_key(
    row: sqlx::postgres::PgRow,
    api_key_secret_codec: Option<&(dyn ApiKeySecretCodec + Send + Sync)>,
) -> DomainResult<AppRoutingApiKeyItem> {
    let copyable_key = decode_api_key_copyable_key(
        string_cell(&row, "copyable_key_ciphertext"),
        api_key_secret_codec,
    )?;
    Ok(AppRoutingApiKeyItem {
        id: string_cell(&row, "id"),
        name: string_cell(&row, "name"),
        display_key: string_cell(&row, "key_display_masked"),
        copyable_key,
        status: api_key_status_label(required_integer_cell(&row, "api_key_status")?)?,
        total_usage: string_cell(&row, "total_usage"),
        created_at: string_cell(&row, "created_at"),
    })
}

fn row_to_request_trace(row: sqlx::postgres::PgRow) -> DomainResult<AppRoutingRequestTraceItem> {
    let http_status = routing_trace_http_status(required_integer_cell(&row, "http_status")?)?;
    let latency_ms = routing_trace_latency_ms(integer_cell(&row, "latency_ms"))?;
    Ok(AppRoutingRequestTraceItem {
        id: string_cell(&row, "id"),
        time: string_cell(&row, "trace_time"),
        model: string_cell(&row, "model"),
        channel: string_cell(&row, "channel"),
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
            "invalid routing channel capabilities json from database row: {error}"
        ))
    })?;
    let mut normalized = Vec::new();
    for value in parsed {
        let Some(capability) = normalize_capability(&value) else {
            continue;
        };
        if !normalized.iter().any(|value| value == capability) {
            normalized.push(capability.to_owned());
        }
    }
    if normalized.is_empty() {
        normalized.push("llm".to_owned());
    }
    Ok(normalized)
}

fn normalize_capability(value: &str) -> Option<&'static str> {
    match value.trim().to_ascii_lowercase().as_str() {
        "" => None,
        "llm" | "chat" | "completion" | "completions" | "response" | "responses" | "embedding"
        | "embeddings" | "rerank" | "modality.llm" | "modality.chat" | "modality.embedding"
        | "modality.rerank" => Some("llm"),
        "image" | "images" | "vision" | "modality.image" | "modality.images"
        | "modality.vision" => Some("image"),
        "audio" | "speech" | "stt" | "tts" | "modality.audio" | "modality.speech"
        | "modality.stt" | "modality.tts" => Some("audio"),
        "music" | "modality.music" => Some("music"),
        "sfx"
        | "sound_effect"
        | "sound_effects"
        | "modality.sfx"
        | "modality.sound_effect"
        | "modality.sound_effects" => Some("sfx"),
        "video" | "videos" | "modality.video" | "modality.videos" => Some("video"),
        value
            if value.starts_with("vendor.")
                || value.starts_with("api.")
                || value.starts_with("model.")
                || value.starts_with("bundle.") =>
        {
            None
        }
        _ => None,
    }
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

fn display_vendor(value: &str) -> String {
    match value {
        "openai" => "OpenAI",
        "anthropic" => "Anthropic",
        "google" => "Gemini",
        "openrouter" => "OpenRouter",
        "deepseek" => "DeepSeek",
        "zhipu" => "Zhipu",
        "mistral" => "Mistral",
        "meta" => "Meta",
        "ollama" => "Ollama",
        "azure_openai" => "Azure OpenAI",
        "custom" => "Custom",
        _ => value,
    }
    .to_owned()
}

fn protocol_label(value: i64) -> DomainResult<String> {
    match value {
        1 => Ok("OpenAI"),
        2 => Ok("Anthropic"),
        3 => Ok("Gemini"),
        4 => Ok("Ollama"),
        9 => Ok("Custom"),
        value => Err(DomainError::new(format!(
            "invalid routing channel protocol from database row: {value}"
        ))),
    }
    .map(str::to_owned)
}

fn access_type_label(value: i64) -> DomainResult<String> {
    match value {
        1 => Ok("Standard API Key"),
        2 => Ok("GCP Vertex OAuth"),
        3 => Ok("AWS Bedrock"),
        4 => Ok("Azure OpenAI"),
        5 => Ok("Claude Code"),
        value => Err(DomainError::new(format!(
            "invalid routing channel access_type from database row: {value}"
        ))),
    }
    .map(str::to_owned)
}

fn status_label(status: i64, health_status: i64, errors: i64) -> DomainResult<String> {
    match health_status {
        1 | 2 => {}
        value => {
            return Err(DomainError::new(format!(
                "invalid routing channel health_status from database row: {value}"
            )));
        }
    }

    let label = match status {
        -1 | 0 => "disabled",
        1 if health_status == 2 || errors > 0 => "error",
        1 => "active",
        2 => "error",
        value => {
            return Err(DomainError::new(format!(
                "invalid routing channel status from database row: {value}"
            )));
        }
    };
    Ok(label.to_owned())
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

fn decode_api_key_copyable_key(
    copyable_key_ciphertext: String,
    api_key_secret_codec: Option<&(dyn ApiKeySecretCodec + Send + Sync)>,
) -> DomainResult<Option<String>> {
    let copyable_key_ciphertext = copyable_key_ciphertext.trim();
    if copyable_key_ciphertext.is_empty() {
        return Ok(None);
    }
    let Some(api_key_secret_codec) = api_key_secret_codec else {
        return Err(DomainError::new(
            "api key secret codec is required to load routing copyable key material",
        ));
    };
    Ok(Some(
        api_key_secret_codec.decode_secret(copyable_key_ciphertext)?,
    ))
}

fn missing_integer_cell_error(column: &str) -> DomainError {
    match column {
        "http_status" => DomainError::new("missing routing trace http_status from database row"),
        "api_key_status" => DomainError::new("missing routing api key status from database row"),
        column => DomainError::new(format!(
            "missing routing channel {column} from database row"
        )),
    }
}

fn duration_or_na(value: i64) -> String {
    if value > 0 {
        duration_label(value)
    } else {
        "N/A".to_owned()
    }
}

fn duration_label(value: i64) -> String {
    format!("{value}ms")
}

fn balance_label(amount: &str, currency: &str) -> String {
    if amount.trim().is_empty() {
        return "N/A".to_owned();
    }
    if currency.trim().is_empty() {
        return amount.trim().to_owned();
    }
    format!("{} {}", currency.trim(), amount.trim())
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
            .contains("invalid routing channel capabilities json from database row"));
    }
}
