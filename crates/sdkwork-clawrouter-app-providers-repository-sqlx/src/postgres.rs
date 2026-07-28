use sqlx::{PgPool, Row};

use crate::error::store_error;
use crate::mapping::{require_subject, row_to_provider};
use crate::types::{
    AppProvidersListPage, AppProvidersListQuery, AppProvidersReadFuture, AppProvidersReadStore,
    AppProvidersSubject,
};

const LOAD_PROVIDERS: &str = r#"
WITH latest_config AS (
    SELECT
        tenant_id,
        organization_id,
        MAX(created_at) AS latest_config_at
    FROM ops_config_snapshot
    WHERE tenant_id = $1
      AND organization_id = $2
      AND status = 1
      AND source_table IN (
          'ai_provider',
          'ai_channel',
          'ai_channel_resource',
          'integration_proxy'
      )
    GROUP BY tenant_id, organization_id
),
ranked_channel AS (
    SELECT
        c.id AS account_id,
        c.provider_id,
        c.supplier_code,
        c.id AS account_identity_id,
        c.proxy_id AS proxy_id,
        COALESCE(NULLIF(c.base_url, ''), NULLIF(px.endpoint, '')) AS channel_url,
        c.status AS channel_status,
        c.health_status AS channel_health_status,
        px.status AS proxy_status,
        px.health_status AS proxy_health_status,
        COUNT(DISTINCT r.catalog_key) AS model_count,
        ROW_NUMBER() OVER (
            PARTITION BY COALESCE(CAST(c.provider_id AS TEXT), c.supplier_code)
            ORDER BY
                CASE WHEN c.status = 1 THEN 0 ELSE 1 END,
                CASE WHEN c.health_status = 1 THEN 0 ELSE 1 END,
                COALESCE(c.priority, 999999) ASC,
                COALESCE(c.weight, 0) DESC,
                c.id DESC
        ) AS channel_rank
    FROM ai_channel c
    LEFT JOIN integration_proxy px
      ON px.id = c.proxy_id
     AND px.tenant_id = c.tenant_id
     AND px.organization_id = c.organization_id
     AND px.deleted_at IS NULL
    LEFT JOIN ai_channel_resource cr
      ON cr.account_id = c.id
     AND cr.tenant_id = c.tenant_id
     AND cr.organization_id = c.organization_id
     AND cr.deleted_at IS NULL
     AND cr.status = 1
     AND cr.grant_type = 'allow'
     AND (cr.effective_from IS NULL OR cr.effective_from <= CURRENT_TIMESTAMP)
     AND (cr.effective_to IS NULL OR cr.effective_to > CURRENT_TIMESTAMP)
    LEFT JOIN ai_resource r
      ON r.tenant_id = cr.tenant_id
     AND r.organization_id = cr.organization_id
     AND r.deleted_at IS NULL
     AND r.status = 1
     AND (
          r.id = cr.resource_id
          OR (NULLIF(cr.resource_code, '') IS NOT NULL AND r.resource_code = cr.resource_code)
     )
     AND COALESCE(NULLIF(r.catalog_key, ''), '') <> ''
    WHERE c.tenant_id = $1
      AND c.organization_id = $2
      AND c.deleted_at IS NULL
    GROUP BY
        c.id,
        c.provider_id,
        c.supplier_code,
        c.account_code,
        c.proxy_id,
        c.base_url,
        px.endpoint,
        c.status,
        c.health_status,
        px.status,
        px.health_status,
        c.priority,
        c.weight
)
SELECT
    CAST(p.id AS TEXT) AS id,
    COALESCE(NULLIF(p.supplier_code, ''), CAST(p.id AS TEXT)) AS supplier_code,
    COALESCE(NULLIF(p.default_vendor_code, ''), '') AS default_vendor_code,
    CASE COALESCE(NULLIF(p.provider_type, ''), '')
        WHEN 'cloud_platform' THEN 2
        WHEN 'relay_aggregator' THEN 3
        ELSE COALESCE(p.auth_type, 0)
    END AS integration_type,
    COALESCE(NULLIF(p.display_name, ''), NULLIF(p.supplier_code, ''), 'Provider') AS name,
    COALESCE(NULLIF(p.description, ''), NULLIF(p.supplier_code, ''), 'Provider integration') AS description,
    COALESCE(NULLIF(rc.channel_url, ''), NULLIF(p.base_url, ''), '') AS url,
    rc.account_id AS account_id,
    rc.proxy_id AS proxy_id,
    p.status AS provider_status,
    rc.channel_status AS channel_status,
    rc.channel_health_status AS channel_health_status,
    rc.proxy_status AS proxy_status,
    rc.proxy_health_status AS proxy_health_status,
    COALESCE(rc.model_count, 0) AS model_count,
    CAST(lc.latest_config_at AS TEXT) AS latest_config_at,
    COUNT(*) OVER() AS total
FROM ai_provider p
LEFT JOIN ranked_channel rc
  ON rc.channel_rank = 1
 AND (
       (p.id IS NOT NULL AND rc.provider_id = p.id)
       OR (NULLIF(rc.supplier_code, '') IS NOT NULL AND rc.supplier_code = p.supplier_code)
     )
LEFT JOIN latest_config lc
  ON lc.tenant_id = $1
 AND lc.organization_id = $2
WHERE p.deleted_at IS NULL
  AND (p.tenant_id IS NULL OR p.tenant_id = 0 OR p.tenant_id = $1)
  AND (p.organization_id IS NULL OR p.organization_id = 0 OR p.organization_id = $2)
  AND ($3::text IS NULL OR lower(COALESCE(p.display_name, p.supplier_code, p.description, '')) LIKE lower($3))
ORDER BY COALESCE(p.sort_order, 999999) ASC NULLS LAST, p.id ASC
LIMIT $4 OFFSET $5
"#;

#[derive(Debug, Clone)]
pub struct PostgresAppProvidersReadStore {
    pool: PgPool,
}

impl PostgresAppProvidersReadStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AppProvidersReadStore for PostgresAppProvidersReadStore {
    fn load_providers<'a>(
        &'a self,
        subject: Option<AppProvidersSubject>,
        query: AppProvidersListQuery,
    ) -> AppProvidersReadFuture<'a, AppProvidersListPage> {
        Box::pin(async move {
            let subject = require_subject(subject)?;
            let _request_user_id = subject.user_id;
            let search = query.q.as_deref().map(|value| format!("%{value}%"));
            let rows = sqlx::query(LOAD_PROVIDERS)
                .bind(subject.tenant_id)
                .bind(subject.organization_id)
                .bind(search)
                .bind(query.page_size.max(1))
                .bind(query.offset.max(0))
                .fetch_all(&self.pool)
                .await
                .map_err(|error| store_error("app providers query", error))?;
            let total = rows
                .first()
                .and_then(|row| row.try_get::<i64, _>("total").ok())
                .unwrap_or(0);
            let items = rows
                .into_iter()
                .map(|row| row_to_provider(&row))
                .collect::<Result<Vec<_>, _>>()?;
            Ok(AppProvidersListPage {
                items,
                total,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }
}
