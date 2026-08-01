use std::collections::HashSet;

use sqlx::postgres::PgRow;
use sqlx::{PgPool, Postgres, Transaction};
use url::Url;

use super::shared::{
    column, conflict, ensure_bounded_collection, generated_uuid, record_routing_change,
    store_error, DEFAULT_DATA_SCOPE, MAX_NESTED_ITEMS,
};
use super::supplier;
use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::ports::{
    AdminUpstreamSubject, AdminUpstreamSupplierEndpointInput, AdminUpstreamSupplierEndpointItem,
};

const ENDPOINT_COLUMNS: &str = r#"
    endpoint.id, endpoint.endpoint_code, endpoint.endpoint_name, endpoint.base_url,
    endpoint.protocol_code, endpoint.region_code, endpoint.environment,
    endpoint.priority, endpoint.routing_weight, endpoint.timeout_ms,
    COALESCE(endpoint_health.health_status, 0) AS health_status,
    endpoint.status
"#;

pub(super) async fn list(
    pool: &PgPool,
    subject: AdminUpstreamSubject,
    supplier_id: i64,
) -> DomainResult<Vec<AdminUpstreamSupplierEndpointItem>> {
    let sql = format!(
        r#"
        SELECT {ENDPOINT_COLUMNS}
        FROM ai_upstream_supplier_endpoint endpoint
        LEFT JOIN ai_upstream_supplier_endpoint_health_state endpoint_health
          ON endpoint_health.tenant_id = endpoint.tenant_id
         AND endpoint_health.organization_id = endpoint.organization_id
         AND endpoint_health.endpoint_id = endpoint.id
        WHERE endpoint.tenant_id = $1 AND endpoint.organization_id = $2
          AND endpoint.supplier_id = $3 AND endpoint.deleted_at IS NULL
        ORDER BY endpoint.priority ASC, endpoint.routing_weight DESC, endpoint.id ASC
        LIMIT {MAX_NESTED_ITEMS}
        "#
    );
    let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(supplier_id)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to list upstream supplier endpoints", error))?;
    rows.into_iter().map(map_row).collect()
}

pub(super) async fn replace(
    pool: &PgPool,
    subject: AdminUpstreamSubject,
    supplier_id: i64,
    expected_version: i64,
    items: Vec<AdminUpstreamSupplierEndpointInput>,
    requested_at: String,
) -> DomainResult<Vec<AdminUpstreamSupplierEndpointItem>> {
    validate_inputs(&items)?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin upstream endpoint replacement", error))?;
    let supplier_code =
        supplier::lock_for_nested(&mut tx, &subject, supplier_id, expected_version).await?;
    let endpoint_codes = items
        .iter()
        .map(|item| item.endpoint_code.trim().to_owned())
        .collect::<Vec<_>>();
    ensure_removed_endpoints_are_unused(&mut tx, &subject, supplier_id, &endpoint_codes).await?;

    for item in &items {
        let endpoint_id = next_claw_runtime_id("upstream supplier endpoint")?;
        let persisted_endpoint_id = sqlx::query_scalar::<_, i64>(
            r#"
            INSERT INTO ai_upstream_supplier_endpoint (
                id, uuid, tenant_id, organization_id, data_scope, status,
                created_at, updated_at, version, metadata,
                supplier_id, supplier_code, endpoint_code, endpoint_name, base_url,
                protocol_code, region_code, environment,
                priority, routing_weight, timeout_ms
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7::timestamptz, $7::timestamptz, 0, '{}'::jsonb,
                $8, $9, $10, $11, $12,
                $13, $14, $15,
                $16, $17, $18
            )
            ON CONFLICT (tenant_id, organization_id, supplier_id, endpoint_code)
            DO UPDATE SET
                endpoint_name = EXCLUDED.endpoint_name,
                base_url = EXCLUDED.base_url,
                protocol_code = EXCLUDED.protocol_code,
                region_code = EXCLUDED.region_code,
                environment = EXCLUDED.environment,
                priority = EXCLUDED.priority,
                routing_weight = EXCLUDED.routing_weight,
                timeout_ms = EXCLUDED.timeout_ms,
                status = EXCLUDED.status,
                deleted_at = NULL,
                deleted_by = NULL,
                version = ai_upstream_supplier_endpoint.version + 1,
                updated_at = EXCLUDED.updated_at
            RETURNING id
            "#,
        )
        .bind(endpoint_id)
        .bind(generated_uuid())
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(DEFAULT_DATA_SCOPE)
        .bind(item.status)
        .bind(&requested_at)
        .bind(supplier_id)
        .bind(&supplier_code)
        .bind(item.endpoint_code.trim())
        .bind(item.endpoint_name.trim())
        .bind(item.base_url.trim())
        .bind(item.protocol_code.as_deref().map(str::trim))
        .bind(item.region_code.as_deref().map(str::trim))
        .bind(item.environment)
        .bind(item.priority)
        .bind(item.routing_weight)
        .bind(item.timeout_ms)
        .fetch_one(&mut *tx)
        .await
        .map_err(|error| store_error("failed to upsert upstream supplier endpoint", error))?;
        sqlx::query(
            r#"
            INSERT INTO ai_upstream_supplier_endpoint_health_state (
                id, tenant_id, organization_id, created_at, updated_at,
                supplier_id, endpoint_id, health_status, consecutive_error_count
            ) VALUES ($1, $2, $3, $4::timestamptz, $4::timestamptz, $5, $1, 0, 0)
            ON CONFLICT (tenant_id, organization_id, endpoint_id)
            DO UPDATE SET
                health_status = 0,
                last_latency_ms = NULL,
                consecutive_error_count = 0,
                last_checked_at = NULL,
                last_success_at = NULL,
                last_failure_at = NULL,
                updated_at = EXCLUDED.updated_at
            "#,
        )
        .bind(persisted_endpoint_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(&requested_at)
        .bind(supplier_id)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("failed to reset upstream endpoint health", error))?;
    }

    retire_omitted(
        &mut tx,
        &subject,
        supplier_id,
        &endpoint_codes,
        &requested_at,
    )
    .await?;
    supplier::bump_nested_version(
        &mut tx,
        &subject,
        supplier_id,
        expected_version,
        &requested_at,
    )
    .await?;
    let result = list_in_transaction(&mut tx, &subject, supplier_id).await?;
    record_routing_change(
        &mut tx,
        &subject,
        &requested_at,
        "upstream_supplier",
        supplier_id,
        "replace_upstream_supplier_endpoints",
        serde_json::json!({"endpointCount": result.len()}),
    )
    .await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit upstream endpoint replacement", error))?;
    Ok(result)
}

async fn ensure_removed_endpoints_are_unused(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    supplier_id: i64,
    retained_codes: &[String],
) -> DomainResult<()> {
    let count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM ai_upstream_account account
        JOIN ai_upstream_supplier_endpoint endpoint
          ON endpoint.tenant_id = account.tenant_id
         AND endpoint.organization_id = account.organization_id
         AND endpoint.supplier_id = account.supplier_id
         AND endpoint.id = account.preferred_endpoint_id
        WHERE account.tenant_id = $1
          AND account.organization_id = $2
          AND account.supplier_id = $3
          AND account.deleted_at IS NULL
          AND endpoint.deleted_at IS NULL
          AND NOT (endpoint.endpoint_code = ANY($4::text[]))
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(supplier_id)
    .bind(retained_codes)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to inspect preferred endpoint references", error))?;
    if count > 0 {
        return Err(conflict(
            "an endpoint selected by an active upstream account cannot be removed",
        ));
    }
    Ok(())
}

async fn retire_omitted(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    supplier_id: i64,
    retained_codes: &[String],
    requested_at: &str,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE ai_upstream_supplier_endpoint
        SET deleted_at = $1::timestamptz,
            deleted_by = $2,
            status = 0,
            version = version + 1,
            updated_at = $1::timestamptz
        WHERE tenant_id = $3 AND organization_id = $4
          AND supplier_id = $5 AND deleted_at IS NULL
          AND NOT (endpoint_code = ANY($6::text[]))
        "#,
    )
    .bind(requested_at)
    .bind(subject.operator_id)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(supplier_id)
    .bind(retained_codes)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to retire omitted supplier endpoints", error))?;
    Ok(())
}

async fn list_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    supplier_id: i64,
) -> DomainResult<Vec<AdminUpstreamSupplierEndpointItem>> {
    let sql = format!(
        r#"
        SELECT {ENDPOINT_COLUMNS}
        FROM ai_upstream_supplier_endpoint endpoint
        LEFT JOIN ai_upstream_supplier_endpoint_health_state endpoint_health
          ON endpoint_health.tenant_id = endpoint.tenant_id
         AND endpoint_health.organization_id = endpoint.organization_id
         AND endpoint_health.endpoint_id = endpoint.id
        WHERE endpoint.tenant_id = $1 AND endpoint.organization_id = $2
          AND endpoint.supplier_id = $3 AND endpoint.deleted_at IS NULL
        ORDER BY endpoint.priority ASC, endpoint.routing_weight DESC, endpoint.id ASC
        LIMIT {MAX_NESTED_ITEMS}
        "#
    );
    let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(supplier_id)
        .fetch_all(&mut **tx)
        .await
        .map_err(|error| store_error("failed to reload upstream supplier endpoints", error))?;
    rows.into_iter().map(map_row).collect()
}

fn validate_inputs(items: &[AdminUpstreamSupplierEndpointInput]) -> DomainResult<()> {
    ensure_bounded_collection(items, "endpoints")?;
    let mut codes = HashSet::with_capacity(items.len());
    for item in items {
        let code = item.endpoint_code.trim();
        if code.is_empty() || !codes.insert(code.to_owned()) {
            return Err(DomainError::new(
                "endpointCode is required and must be unique within a supplier",
            ));
        }
        if item.endpoint_name.trim().is_empty() {
            return Err(DomainError::new("endpointName is required"));
        }
        let url = Url::parse(item.base_url.trim())
            .map_err(|_| DomainError::new("baseUrl must be an absolute URL"))?;
        let development_http = item.environment == 0 && url.scheme() == "http";
        if url.scheme() != "https" && !development_http {
            return Err(DomainError::new(
                "baseUrl must use HTTPS; HTTP is allowed only for environment 0 development endpoints",
            ));
        }
        if !url.username().is_empty() || url.password().is_some() {
            return Err(DomainError::new(
                "baseUrl must not contain embedded credentials",
            ));
        }
        if url.query().is_some() || url.fragment().is_some() {
            return Err(DomainError::new(
                "baseUrl must not contain a query string or fragment",
            ));
        }
        if item.priority < 0 || item.routing_weight < 0 {
            return Err(DomainError::new(
                "endpoint priority and routingWeight must be non-negative",
            ));
        }
        if item.timeout_ms.is_some_and(|value| value <= 0) {
            return Err(DomainError::new("endpoint timeoutMs must be positive"));
        }
    }
    Ok(())
}

fn map_row(row: PgRow) -> DomainResult<AdminUpstreamSupplierEndpointItem> {
    Ok(AdminUpstreamSupplierEndpointItem {
        id: column(&row, "id", "failed to map upstream endpoint id")?,
        endpoint_code: column(
            &row,
            "endpoint_code",
            "failed to map upstream endpoint code",
        )?,
        endpoint_name: column(
            &row,
            "endpoint_name",
            "failed to map upstream endpoint name",
        )?,
        base_url: column(&row, "base_url", "failed to map upstream endpoint base URL")?,
        protocol_code: column(
            &row,
            "protocol_code",
            "failed to map upstream endpoint protocol",
        )?,
        region_code: column(
            &row,
            "region_code",
            "failed to map upstream endpoint region",
        )?,
        environment: column(
            &row,
            "environment",
            "failed to map upstream endpoint environment",
        )?,
        priority: column(&row, "priority", "failed to map upstream endpoint priority")?,
        routing_weight: column(
            &row,
            "routing_weight",
            "failed to map upstream endpoint routing weight",
        )?,
        timeout_ms: column(
            &row,
            "timeout_ms",
            "failed to map upstream endpoint timeout",
        )?,
        health_status: column(
            &row,
            "health_status",
            "failed to map upstream endpoint health status",
        )?,
        status: column(&row, "status", "failed to map upstream endpoint status")?,
    })
}
