use sqlx::{PgPool, Postgres, Transaction};

use super::shared::{
    generated_uuid, map_resource_row, store_error, validate_resource_inputs, DEFAULT_DATA_SCOPE,
    MAX_NESTED_ITEMS,
};
use super::supplier;
use crate::domain::DomainResult;
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::ports::{AdminUpstreamResourceInput, AdminUpstreamResourceItem, AdminUpstreamSubject};

pub(super) async fn list(
    pool: &PgPool,
    subject: AdminUpstreamSubject,
    supplier_id: i64,
) -> DomainResult<Vec<AdminUpstreamResourceItem>> {
    let sql = format!(
        r#"
        SELECT id, resource_code, resource_group_code, grant_type, priority, status
        FROM ai_upstream_supplier_resource
        WHERE tenant_id = $1 AND organization_id = $2
          AND supplier_id = $3 AND deleted_at IS NULL
        ORDER BY priority ASC, resource_group_code ASC, resource_code ASC, id ASC
        LIMIT {MAX_NESTED_ITEMS}
        "#
    );
    let rows = sqlx::query(&sql)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(supplier_id)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to list upstream supplier resources", error))?;
    rows.into_iter().map(map_resource_row).collect()
}

pub(super) async fn replace(
    pool: &PgPool,
    subject: AdminUpstreamSubject,
    supplier_id: i64,
    expected_version: i64,
    items: Vec<AdminUpstreamResourceInput>,
    requested_at: String,
) -> DomainResult<Vec<AdminUpstreamResourceItem>> {
    validate_resource_inputs(&items)?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin supplier resource replacement", error))?;
    let supplier_code =
        supplier::lock_for_nested(&mut tx, &subject, supplier_id, expected_version).await?;
    let resource_codes = items
        .iter()
        .map(|item| item.resource_code.trim().to_owned())
        .collect::<Vec<_>>();
    let group_codes = items
        .iter()
        .map(|item| item.resource_group_code.trim().to_owned())
        .collect::<Vec<_>>();

    for item in &items {
        let binding_id = next_claw_runtime_id("upstream supplier resource")?;
        sqlx::query(
            r#"
            INSERT INTO ai_upstream_supplier_resource (
                id, uuid, tenant_id, organization_id, data_scope, status,
                created_at, updated_at, version, metadata,
                supplier_id, supplier_code, resource_code, resource_group_code,
                grant_type, priority
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7::timestamptz, $7::timestamptz, 0, '{}'::jsonb,
                $8, $9, $10, $11,
                $12, $13
            )
            ON CONFLICT (
                tenant_id, organization_id, supplier_id, resource_code, resource_group_code
            ) DO UPDATE SET
                grant_type = EXCLUDED.grant_type,
                priority = EXCLUDED.priority,
                status = EXCLUDED.status,
                deleted_at = NULL,
                deleted_by = NULL,
                version = ai_upstream_supplier_resource.version + 1,
                updated_at = EXCLUDED.updated_at
            "#,
        )
        .bind(binding_id)
        .bind(generated_uuid())
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(DEFAULT_DATA_SCOPE)
        .bind(item.status)
        .bind(&requested_at)
        .bind(supplier_id)
        .bind(&supplier_code)
        .bind(item.resource_code.trim())
        .bind(item.resource_group_code.trim())
        .bind(item.grant_type.trim())
        .bind(item.priority)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("failed to upsert upstream supplier resource", error))?;
    }

    retire_omitted(
        &mut tx,
        &subject,
        supplier_id,
        &resource_codes,
        &group_codes,
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
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit supplier resource replacement", error))?;
    Ok(result)
}

async fn retire_omitted(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    supplier_id: i64,
    resource_codes: &[String],
    group_codes: &[String],
    requested_at: &str,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE ai_upstream_supplier_resource binding
        SET deleted_at = $1::timestamptz,
            deleted_by = $2,
            status = 0,
            version = version + 1,
            updated_at = $1::timestamptz
        WHERE tenant_id = $3 AND organization_id = $4
          AND supplier_id = $5 AND deleted_at IS NULL
          AND NOT EXISTS (
              SELECT 1
              FROM UNNEST($6::text[], $7::text[]) AS retained(resource_code, group_code)
              WHERE retained.resource_code = binding.resource_code
                AND retained.group_code = binding.resource_group_code
          )
        "#,
    )
    .bind(requested_at)
    .bind(subject.operator_id)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(supplier_id)
    .bind(resource_codes)
    .bind(group_codes)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to retire omitted supplier resources", error))?;
    Ok(())
}

async fn list_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    supplier_id: i64,
) -> DomainResult<Vec<AdminUpstreamResourceItem>> {
    let sql = format!(
        r#"
        SELECT id, resource_code, resource_group_code, grant_type, priority, status
        FROM ai_upstream_supplier_resource
        WHERE tenant_id = $1 AND organization_id = $2
          AND supplier_id = $3 AND deleted_at IS NULL
        ORDER BY priority ASC, resource_group_code ASC, resource_code ASC, id ASC
        LIMIT {MAX_NESTED_ITEMS}
        "#
    );
    let rows = sqlx::query(&sql)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(supplier_id)
        .fetch_all(&mut **tx)
        .await
        .map_err(|error| store_error("failed to reload upstream supplier resources", error))?;
    rows.into_iter().map(map_resource_row).collect()
}
