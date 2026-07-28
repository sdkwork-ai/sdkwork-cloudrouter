use sqlx::postgres::PgRow;
use sqlx::{PgPool, Postgres, Row, Transaction};

use super::shared::{column, conflict, not_found, search_pattern, store_error, DEFAULT_DATA_SCOPE};
use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::ports::{
    AdminUpstreamListQuery, AdminUpstreamPage, AdminUpstreamSubject, AdminUpstreamSupplierItem,
    SaveAdminUpstreamSupplierCommand,
};

const SUPPLIER_COLUMNS: &str = r#"
    id,
    uuid,
    supplier_code,
    supplier_name,
    display_name,
    description,
    supplier_type,
    adapter_code,
    protocol_code,
    website_url,
    docs_url,
    region_code,
    environment,
    health_status,
    sort_order,
    status,
    version,
    TO_CHAR(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at
"#;

pub(super) async fn list(
    pool: &PgPool,
    query: AdminUpstreamListQuery,
) -> DomainResult<AdminUpstreamPage<AdminUpstreamSupplierItem>> {
    let pattern = search_pattern(query.q.as_deref());
    let total = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM ai_upstream_supplier
        WHERE tenant_id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
          AND (
                $3::text IS NULL
                OR supplier_code ILIKE $3 ESCAPE '\'
                OR supplier_name ILIKE $3 ESCAPE '\'
                OR display_name ILIKE $3 ESCAPE '\'
          )
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(pattern.as_deref())
    .fetch_one(pool)
    .await
    .map_err(|error| store_error("failed to count upstream suppliers", error))?;

    let sql = format!(
        r#"
        SELECT {SUPPLIER_COLUMNS}
        FROM ai_upstream_supplier
        WHERE tenant_id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
          AND (
                $3::text IS NULL
                OR supplier_code ILIKE $3 ESCAPE '\'
                OR supplier_name ILIKE $3 ESCAPE '\'
                OR display_name ILIKE $3 ESCAPE '\'
          )
        ORDER BY sort_order ASC, updated_at DESC, id ASC
        LIMIT $4 OFFSET $5
        "#
    );
    let rows = sqlx::query(&sql)
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id)
        .bind(pattern.as_deref())
        .bind(query.page_size)
        .bind(query.offset)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to list upstream suppliers", error))?;
    let items = rows
        .into_iter()
        .map(map_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminUpstreamPage {
        items,
        page: query.page,
        page_size: query.page_size,
        total,
    })
}

pub(super) async fn get(
    pool: &PgPool,
    subject: AdminUpstreamSubject,
    supplier_id: i64,
) -> DomainResult<Option<AdminUpstreamSupplierItem>> {
    let sql = format!(
        r#"
        SELECT {SUPPLIER_COLUMNS}
        FROM ai_upstream_supplier
        WHERE tenant_id = $1
          AND organization_id = $2
          AND id = $3
          AND deleted_at IS NULL
        "#
    );
    sqlx::query(&sql)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(supplier_id)
        .fetch_optional(pool)
        .await
        .map_err(|error| store_error("failed to retrieve upstream supplier", error))?
        .map(map_row)
        .transpose()
}

pub(super) async fn save(
    pool: &PgPool,
    command: SaveAdminUpstreamSupplierCommand,
) -> DomainResult<AdminUpstreamSupplierItem> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin upstream supplier transaction", error))?;
    let supplier_id = match command.supplier_id {
        Some(supplier_id) => update(&mut tx, supplier_id, &command).await?,
        None => insert(&mut tx, &command).await?,
    };
    let item = get_in_transaction(&mut tx, &command.subject, supplier_id)
        .await?
        .ok_or_else(|| DomainError::new("saved upstream supplier could not be reloaded"))?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit upstream supplier transaction", error))?;
    Ok(item)
}

pub(super) async fn delete(
    pool: &PgPool,
    subject: AdminUpstreamSubject,
    supplier_id: i64,
    expected_version: i64,
    requested_at: String,
) -> DomainResult<bool> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin upstream supplier delete", error))?;
    lock_for_nested(&mut tx, &subject, supplier_id, expected_version).await?;
    let active_accounts = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM ai_upstream_account
        WHERE tenant_id = $1 AND organization_id = $2
          AND supplier_id = $3 AND deleted_at IS NULL
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(supplier_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|error| store_error("failed to inspect upstream supplier dependencies", error))?;
    if active_accounts > 0 {
        return Err(conflict(
            "upstream supplier cannot be deleted while active upstream accounts reference it",
        ));
    }

    for table in [
        "ai_upstream_supplier_endpoint",
        "ai_upstream_supplier_auth_method",
        "ai_upstream_supplier_resource",
    ] {
        let sql = format!(
            r#"
            UPDATE {table}
            SET deleted_at = $1::timestamptz,
                deleted_by = $2,
                status = 0,
                version = version + 1,
                updated_at = $1::timestamptz
            WHERE tenant_id = $3 AND organization_id = $4
              AND supplier_id = $5 AND deleted_at IS NULL
            "#
        );
        sqlx::query(&sql)
            .bind(&requested_at)
            .bind(subject.operator_id)
            .bind(subject.tenant_id)
            .bind(subject.organization_id)
            .bind(supplier_id)
            .execute(&mut *tx)
            .await
            .map_err(|error| store_error("failed to retire upstream supplier children", error))?;
    }

    let result = sqlx::query(
        r#"
        UPDATE ai_upstream_supplier
        SET deleted_at = $1::timestamptz,
            deleted_by = $2,
            status = 0,
            version = version + 1,
            updated_at = $1::timestamptz
        WHERE tenant_id = $3 AND organization_id = $4
          AND id = $5 AND version = $6 AND deleted_at IS NULL
        "#,
    )
    .bind(&requested_at)
    .bind(subject.operator_id)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(supplier_id)
    .bind(expected_version)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to delete upstream supplier", error))?;
    if result.rows_affected() != 1 {
        return Err(conflict("upstream supplier version changed during deletion"));
    }
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit upstream supplier delete", error))?;
    Ok(true)
}

pub(super) async fn lock_for_nested(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    supplier_id: i64,
    expected_version: i64,
) -> DomainResult<String> {
    let row = sqlx::query(
        r#"
        SELECT supplier_code, version
        FROM ai_upstream_supplier
        WHERE tenant_id = $1 AND organization_id = $2
          AND id = $3 AND deleted_at IS NULL
        FOR UPDATE
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(supplier_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to lock upstream supplier", error))?
    .ok_or_else(|| not_found("upstream supplier"))?;
    let version: i64 = column(&row, "version", "failed to map upstream supplier version")?;
    if version != expected_version {
        return Err(conflict(format!(
            "upstream supplier version mismatch: expected {expected_version}, current {version}"
        )));
    }
    column(
        &row,
        "supplier_code",
        "failed to map upstream supplier code",
    )
}

pub(super) async fn bump_nested_version(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    supplier_id: i64,
    expected_version: i64,
    requested_at: &str,
) -> DomainResult<()> {
    let result = sqlx::query(
        r#"
        UPDATE ai_upstream_supplier
        SET version = version + 1, updated_at = $1::timestamptz
        WHERE tenant_id = $2 AND organization_id = $3
          AND id = $4 AND version = $5 AND deleted_at IS NULL
        "#,
    )
    .bind(requested_at)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(supplier_id)
    .bind(expected_version)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to advance upstream supplier version", error))?;
    if result.rows_affected() != 1 {
        return Err(conflict(
            "upstream supplier version changed while replacing nested configuration",
        ));
    }
    Ok(())
}

async fn insert(
    tx: &mut Transaction<'_, Postgres>,
    command: &SaveAdminUpstreamSupplierCommand,
) -> DomainResult<i64> {
    if command.expected_version.is_some() {
        return Err(DomainError::new(
            "expectedVersion must be omitted when creating an upstream supplier",
        ));
    }
    let supplier_id = next_claw_runtime_id("upstream supplier")?;
    sqlx::query(
        r#"
        INSERT INTO ai_upstream_supplier (
            id, uuid, tenant_id, organization_id, data_scope, status,
            created_at, updated_at, version, metadata,
            supplier_code, supplier_name, display_name, description,
            supplier_type, adapter_code, protocol_code, website_url, docs_url,
            region_code, environment, health_status, sort_order
        ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7::timestamptz, $7::timestamptz, 0, '{}'::jsonb,
            $8, $9, $10, $11,
            $12, $13, $14, $15, $16,
            $17, $18, 1, $19
        )
        "#,
    )
    .bind(supplier_id)
    .bind(&command.uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(DEFAULT_DATA_SCOPE)
    .bind(command.status)
    .bind(&command.requested_at)
    .bind(command.supplier_code.trim())
    .bind(command.supplier_name.trim())
    .bind(command.display_name.trim())
    .bind(command.description.as_deref().map(str::trim))
    .bind(command.supplier_type.trim())
    .bind(command.adapter_code.trim())
    .bind(command.protocol_code.trim())
    .bind(command.website_url.as_deref().map(str::trim))
    .bind(command.docs_url.as_deref().map(str::trim))
    .bind(command.region_code.as_deref().map(str::trim))
    .bind(command.environment)
    .bind(command.sort_order)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create upstream supplier", error))?;
    Ok(supplier_id)
}

async fn update(
    tx: &mut Transaction<'_, Postgres>,
    supplier_id: i64,
    command: &SaveAdminUpstreamSupplierCommand,
) -> DomainResult<i64> {
    let expected_version = command.expected_version.ok_or_else(|| {
        DomainError::new("expectedVersion is required when updating an upstream supplier")
    })?;
    let existing = sqlx::query(
        r#"
        SELECT supplier_code, version
        FROM ai_upstream_supplier
        WHERE tenant_id = $1 AND organization_id = $2
          AND id = $3 AND deleted_at IS NULL
        FOR UPDATE
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(supplier_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to lock upstream supplier for update", error))?
    .ok_or_else(|| not_found("upstream supplier"))?;
    let current_code: String = column(
        &existing,
        "supplier_code",
        "failed to map upstream supplier code",
    )?;
    let current_version: i64 = column(
        &existing,
        "version",
        "failed to map upstream supplier version",
    )?;
    if current_version != expected_version {
        return Err(conflict(format!(
            "upstream supplier version mismatch: expected {expected_version}, current {current_version}"
        )));
    }
    if current_code != command.supplier_code.trim() {
        return Err(conflict(
            "supplierCode is immutable after an upstream supplier is created",
        ));
    }

    sqlx::query(
        r#"
        UPDATE ai_upstream_supplier
        SET supplier_name = $1,
            display_name = $2,
            description = $3,
            supplier_type = $4,
            adapter_code = $5,
            protocol_code = $6,
            website_url = $7,
            docs_url = $8,
            region_code = $9,
            environment = $10,
            sort_order = $11,
            status = $12,
            version = version + 1,
            updated_at = $13::timestamptz
        WHERE tenant_id = $14 AND organization_id = $15
          AND id = $16 AND version = $17 AND deleted_at IS NULL
        "#,
    )
    .bind(command.supplier_name.trim())
    .bind(command.display_name.trim())
    .bind(command.description.as_deref().map(str::trim))
    .bind(command.supplier_type.trim())
    .bind(command.adapter_code.trim())
    .bind(command.protocol_code.trim())
    .bind(command.website_url.as_deref().map(str::trim))
    .bind(command.docs_url.as_deref().map(str::trim))
    .bind(command.region_code.as_deref().map(str::trim))
    .bind(command.environment)
    .bind(command.sort_order)
    .bind(command.status)
    .bind(&command.requested_at)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(supplier_id)
    .bind(expected_version)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update upstream supplier", error))?;
    Ok(supplier_id)
}

async fn get_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    supplier_id: i64,
) -> DomainResult<Option<AdminUpstreamSupplierItem>> {
    let sql = format!(
        r#"
        SELECT {SUPPLIER_COLUMNS}
        FROM ai_upstream_supplier
        WHERE tenant_id = $1 AND organization_id = $2
          AND id = $3 AND deleted_at IS NULL
        "#
    );
    sqlx::query(&sql)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(supplier_id)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|error| store_error("failed to reload upstream supplier", error))?
        .map(map_row)
        .transpose()
}

fn map_row(row: PgRow) -> DomainResult<AdminUpstreamSupplierItem> {
    Ok(AdminUpstreamSupplierItem {
        id: column(&row, "id", "failed to map upstream supplier id")?,
        uuid: column(&row, "uuid", "failed to map upstream supplier uuid")?,
        supplier_code: column(
            &row,
            "supplier_code",
            "failed to map upstream supplier code",
        )?,
        supplier_name: column(
            &row,
            "supplier_name",
            "failed to map upstream supplier name",
        )?,
        display_name: column(
            &row,
            "display_name",
            "failed to map upstream supplier display name",
        )?,
        description: column(
            &row,
            "description",
            "failed to map upstream supplier description",
        )?,
        supplier_type: column(
            &row,
            "supplier_type",
            "failed to map upstream supplier type",
        )?,
        adapter_code: column(
            &row,
            "adapter_code",
            "failed to map upstream supplier adapter",
        )?,
        protocol_code: column(
            &row,
            "protocol_code",
            "failed to map upstream supplier protocol",
        )?,
        website_url: column(
            &row,
            "website_url",
            "failed to map upstream supplier website URL",
        )?,
        docs_url: column(
            &row,
            "docs_url",
            "failed to map upstream supplier docs URL",
        )?,
        region_code: column(
            &row,
            "region_code",
            "failed to map upstream supplier region",
        )?,
        environment: column(
            &row,
            "environment",
            "failed to map upstream supplier environment",
        )?,
        health_status: column(
            &row,
            "health_status",
            "failed to map upstream supplier health status",
        )?,
        sort_order: column(
            &row,
            "sort_order",
            "failed to map upstream supplier sort order",
        )?,
        status: column(&row, "status", "failed to map upstream supplier status")?,
        version: column(
            &row,
            "version",
            "failed to map upstream supplier version",
        )?,
        updated_at: column(
            &row,
            "updated_at",
            "failed to map upstream supplier updated time",
        )?,
    })
}
