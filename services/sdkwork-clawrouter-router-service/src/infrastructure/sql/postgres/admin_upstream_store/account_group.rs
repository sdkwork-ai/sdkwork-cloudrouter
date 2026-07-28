use sqlx::postgres::PgRow;
use sqlx::{PgPool, Postgres, Transaction};

use super::shared::{column, conflict, not_found, search_pattern, store_error, DEFAULT_DATA_SCOPE};
use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::ports::{
    AdminUpstreamAccountGroupItem, AdminUpstreamListQuery, AdminUpstreamPage,
    AdminUpstreamSubject, SaveAdminUpstreamAccountGroupCommand,
};

const GROUP_COLUMNS: &str = r#"
    id, uuid, group_code, group_name, description, group_type,
    routing_strategy, fallback_mode, priority,
    cost_multiplier::text AS cost_multiplier,
    sale_multiplier::text AS sale_multiplier,
    environment, status, version,
    TO_CHAR(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at
"#;

pub(super) async fn list(
    pool: &PgPool,
    query: AdminUpstreamListQuery,
) -> DomainResult<AdminUpstreamPage<AdminUpstreamAccountGroupItem>> {
    let pattern = search_pattern(query.q.as_deref());
    let total = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM ai_upstream_account_group
        WHERE tenant_id = $1 AND organization_id = $2
          AND deleted_at IS NULL
          AND (
                $3::text IS NULL
                OR group_code ILIKE $3 ESCAPE '\'
                OR group_name ILIKE $3 ESCAPE '\'
          )
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(pattern.as_deref())
    .fetch_one(pool)
    .await
    .map_err(|error| store_error("failed to count upstream account groups", error))?;
    let sql = format!(
        r#"
        SELECT {GROUP_COLUMNS}
        FROM ai_upstream_account_group
        WHERE tenant_id = $1 AND organization_id = $2
          AND deleted_at IS NULL
          AND (
                $3::text IS NULL
                OR group_code ILIKE $3 ESCAPE '\'
                OR group_name ILIKE $3 ESCAPE '\'
          )
        ORDER BY priority ASC, updated_at DESC, id ASC
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
        .map_err(|error| store_error("failed to list upstream account groups", error))?;
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
    account_group_id: i64,
) -> DomainResult<Option<AdminUpstreamAccountGroupItem>> {
    let sql = format!(
        r#"
        SELECT {GROUP_COLUMNS}
        FROM ai_upstream_account_group
        WHERE tenant_id = $1 AND organization_id = $2
          AND id = $3 AND deleted_at IS NULL
        "#
    );
    sqlx::query(&sql)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(account_group_id)
        .fetch_optional(pool)
        .await
        .map_err(|error| store_error("failed to retrieve upstream account group", error))?
        .map(map_row)
        .transpose()
}

pub(super) async fn save(
    pool: &PgPool,
    command: SaveAdminUpstreamAccountGroupCommand,
) -> DomainResult<AdminUpstreamAccountGroupItem> {
    validate_command(&command)?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin account group transaction", error))?;
    let account_group_id = match command.account_group_id {
        Some(account_group_id) => update(&mut tx, account_group_id, &command).await?,
        None => insert(&mut tx, &command).await?,
    };
    let item = get_in_transaction(&mut tx, &command.subject, account_group_id)
        .await?
        .ok_or_else(|| DomainError::new("saved upstream account group could not be reloaded"))?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit account group transaction", error))?;
    Ok(item)
}

pub(super) async fn delete(
    pool: &PgPool,
    subject: AdminUpstreamSubject,
    account_group_id: i64,
    expected_version: i64,
    requested_at: String,
) -> DomainResult<bool> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin account group delete", error))?;
    lock_for_nested(&mut tx, &subject, account_group_id, expected_version).await?;
    let entitlement_count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT
            (SELECT COUNT(*) FROM iam_gateway_api_key
             WHERE tenant_id = $1 AND organization_id = $2
               AND account_group_id = $3 AND status = 1 AND deleted_at IS NULL)
          + (SELECT COUNT(*) FROM iam_gateway_api_key_account_group
             WHERE tenant_id = $1 AND organization_id = $2
               AND account_group_id = $3 AND status = 1 AND deleted_at IS NULL)
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(account_group_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|error| store_error("failed to inspect account group entitlements", error))?;
    if entitlement_count > 0 {
        return Err(conflict(
            "account group cannot be deleted while active API key entitlements reference it",
        ));
    }
    for table in [
        "ai_upstream_account_group_member",
        "ai_upstream_account_group_resource",
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
              AND account_group_id = $5 AND deleted_at IS NULL
            "#
        );
        sqlx::query(&sql)
            .bind(&requested_at)
            .bind(subject.operator_id)
            .bind(subject.tenant_id)
            .bind(subject.organization_id)
            .bind(account_group_id)
            .execute(&mut *tx)
            .await
            .map_err(|error| store_error("failed to retire account group children", error))?;
    }
    let result = sqlx::query(
        r#"
        UPDATE ai_upstream_account_group
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
    .bind(account_group_id)
    .bind(expected_version)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to delete upstream account group", error))?;
    if result.rows_affected() != 1 {
        return Err(conflict(
            "upstream account group version changed during deletion",
        ));
    }
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit account group delete", error))?;
    Ok(true)
}

pub(super) async fn lock_for_nested(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    account_group_id: i64,
    expected_version: i64,
) -> DomainResult<()> {
    let version = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT version
        FROM ai_upstream_account_group
        WHERE tenant_id = $1 AND organization_id = $2
          AND id = $3 AND deleted_at IS NULL
        FOR UPDATE
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(account_group_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to lock upstream account group", error))?
    .ok_or_else(|| not_found("upstream account group"))?;
    if version != expected_version {
        return Err(conflict(format!(
            "upstream account group version mismatch: expected {expected_version}, current {version}"
        )));
    }
    Ok(())
}

pub(super) async fn bump_nested_version(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    account_group_id: i64,
    expected_version: i64,
    requested_at: &str,
) -> DomainResult<()> {
    let result = sqlx::query(
        r#"
        UPDATE ai_upstream_account_group
        SET version = version + 1, updated_at = $1::timestamptz
        WHERE tenant_id = $2 AND organization_id = $3
          AND id = $4 AND version = $5 AND deleted_at IS NULL
        "#,
    )
    .bind(requested_at)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(account_group_id)
    .bind(expected_version)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to advance account group version", error))?;
    if result.rows_affected() != 1 {
        return Err(conflict(
            "account group version changed while replacing nested configuration",
        ));
    }
    Ok(())
}

async fn insert(
    tx: &mut Transaction<'_, Postgres>,
    command: &SaveAdminUpstreamAccountGroupCommand,
) -> DomainResult<i64> {
    if command.expected_version.is_some() {
        return Err(DomainError::new(
            "expectedVersion must be omitted when creating an account group",
        ));
    }
    let account_group_id = next_claw_runtime_id("upstream account group")?;
    sqlx::query(
        r#"
        INSERT INTO ai_upstream_account_group (
            id, uuid, tenant_id, organization_id, data_scope, status,
            created_at, updated_at, version, metadata,
            group_code, group_name, description, group_type,
            routing_strategy, fallback_mode, priority,
            cost_multiplier, sale_multiplier, environment
        ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7::timestamptz, $7::timestamptz, 0, '{}'::jsonb,
            $8, $9, $10, $11,
            $12, $13, $14,
            $15::numeric, $16::numeric, $17
        )
        "#,
    )
    .bind(account_group_id)
    .bind(&command.uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(DEFAULT_DATA_SCOPE)
    .bind(command.status)
    .bind(&command.requested_at)
    .bind(command.group_code.trim())
    .bind(command.group_name.trim())
    .bind(command.description.as_deref().map(str::trim))
    .bind(command.group_type.trim())
    .bind(command.routing_strategy.trim())
    .bind(command.fallback_mode.trim())
    .bind(command.priority)
    .bind(command.cost_multiplier.trim())
    .bind(command.sale_multiplier.trim())
    .bind(command.environment)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create upstream account group", error))?;
    Ok(account_group_id)
}

async fn update(
    tx: &mut Transaction<'_, Postgres>,
    account_group_id: i64,
    command: &SaveAdminUpstreamAccountGroupCommand,
) -> DomainResult<i64> {
    let expected_version = command.expected_version.ok_or_else(|| {
        DomainError::new("expectedVersion is required when updating an account group")
    })?;
    let existing = sqlx::query(
        r#"
        SELECT group_code, version
        FROM ai_upstream_account_group
        WHERE tenant_id = $1 AND organization_id = $2
          AND id = $3 AND deleted_at IS NULL
        FOR UPDATE
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(account_group_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to lock upstream account group for update", error))?
    .ok_or_else(|| not_found("upstream account group"))?;
    let current_version: i64 = column(
        &existing,
        "version",
        "failed to map upstream account group version",
    )?;
    if current_version != expected_version {
        return Err(conflict(format!(
            "upstream account group version mismatch: expected {expected_version}, current {current_version}"
        )));
    }
    let current_code: String = column(
        &existing,
        "group_code",
        "failed to map upstream account group code",
    )?;
    if current_code != command.group_code.trim() {
        return Err(conflict(
            "groupCode is immutable after an account group is created",
        ));
    }
    let result = sqlx::query(
        r#"
        UPDATE ai_upstream_account_group
        SET group_name = $1,
            description = $2,
            group_type = $3,
            routing_strategy = $4,
            fallback_mode = $5,
            priority = $6,
            cost_multiplier = $7::numeric,
            sale_multiplier = $8::numeric,
            environment = $9,
            status = $10,
            version = version + 1,
            updated_at = $11::timestamptz
        WHERE tenant_id = $12 AND organization_id = $13
          AND id = $14 AND version = $15 AND deleted_at IS NULL
        "#,
    )
    .bind(command.group_name.trim())
    .bind(command.description.as_deref().map(str::trim))
    .bind(command.group_type.trim())
    .bind(command.routing_strategy.trim())
    .bind(command.fallback_mode.trim())
    .bind(command.priority)
    .bind(command.cost_multiplier.trim())
    .bind(command.sale_multiplier.trim())
    .bind(command.environment)
    .bind(command.status)
    .bind(&command.requested_at)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(account_group_id)
    .bind(expected_version)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update upstream account group", error))?;
    if result.rows_affected() != 1 {
        return Err(conflict(
            "upstream account group version changed during update",
        ));
    }
    Ok(account_group_id)
}

async fn get_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    account_group_id: i64,
) -> DomainResult<Option<AdminUpstreamAccountGroupItem>> {
    let sql = format!(
        r#"
        SELECT {GROUP_COLUMNS}
        FROM ai_upstream_account_group
        WHERE tenant_id = $1 AND organization_id = $2
          AND id = $3 AND deleted_at IS NULL
        "#
    );
    sqlx::query(&sql)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(account_group_id)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|error| store_error("failed to reload upstream account group", error))?
        .map(map_row)
        .transpose()
}

fn validate_command(command: &SaveAdminUpstreamAccountGroupCommand) -> DomainResult<()> {
    if command.group_code.trim().is_empty() || command.group_name.trim().is_empty() {
        return Err(DomainError::new("groupCode and groupName are required"));
    }
    if !matches!(command.group_type.as_str(), "shared" | "dedicated") {
        return Err(DomainError::new("groupType must be shared or dedicated"));
    }
    if !matches!(
        command.routing_strategy.as_str(),
        "weighted" | "round_robin" | "least_latency" | "least_cost" | "failover"
    ) {
        return Err(DomainError::new("routingStrategy is not supported"));
    }
    if !matches!(
        command.fallback_mode.as_str(),
        "none" | "sequential" | "same_supplier" | "cross_supplier"
    ) {
        return Err(DomainError::new("fallbackMode is not supported"));
    }
    if command.priority < 0 {
        return Err(DomainError::new("group priority must be non-negative"));
    }
    for (field, value) in [
        ("costMultiplier", command.cost_multiplier.as_str()),
        ("saleMultiplier", command.sale_multiplier.as_str()),
    ] {
        if value
            .trim()
            .parse::<f64>()
            .ok()
            .is_none_or(|number| !number.is_finite() || number <= 0.0)
        {
            return Err(DomainError::new(format!(
                "{field} must be a positive decimal"
            )));
        }
    }
    Ok(())
}

fn map_row(row: PgRow) -> DomainResult<AdminUpstreamAccountGroupItem> {
    Ok(AdminUpstreamAccountGroupItem {
        id: column(&row, "id", "failed to map upstream account group id")?,
        uuid: column(&row, "uuid", "failed to map upstream account group uuid")?,
        group_code: column(
            &row,
            "group_code",
            "failed to map upstream account group code",
        )?,
        group_name: column(
            &row,
            "group_name",
            "failed to map upstream account group name",
        )?,
        description: column(
            &row,
            "description",
            "failed to map upstream account group description",
        )?,
        group_type: column(
            &row,
            "group_type",
            "failed to map upstream account group type",
        )?,
        routing_strategy: column(
            &row,
            "routing_strategy",
            "failed to map upstream account group routing strategy",
        )?,
        fallback_mode: column(
            &row,
            "fallback_mode",
            "failed to map upstream account group fallback mode",
        )?,
        priority: column(
            &row,
            "priority",
            "failed to map upstream account group priority",
        )?,
        cost_multiplier: column(
            &row,
            "cost_multiplier",
            "failed to map upstream account group cost multiplier",
        )?,
        sale_multiplier: column(
            &row,
            "sale_multiplier",
            "failed to map upstream account group sale multiplier",
        )?,
        environment: column(
            &row,
            "environment",
            "failed to map upstream account group environment",
        )?,
        status: column(
            &row,
            "status",
            "failed to map upstream account group status",
        )?,
        version: column(
            &row,
            "version",
            "failed to map upstream account group version",
        )?,
        updated_at: column(
            &row,
            "updated_at",
            "failed to map upstream account group updated time",
        )?,
    })
}
