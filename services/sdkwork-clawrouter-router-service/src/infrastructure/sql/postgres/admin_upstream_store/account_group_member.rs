use std::collections::HashSet;

use sqlx::postgres::PgRow;
use sqlx::{PgPool, Postgres, Transaction};

use super::account_group;
use super::shared::{
    column, ensure_bounded_collection, generated_uuid, not_found, record_routing_change,
    store_error, DEFAULT_DATA_SCOPE, MAX_NESTED_ITEMS,
};
use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::ports::{
    AdminUpstreamAccountGroupMemberInput, AdminUpstreamAccountGroupMemberItem, AdminUpstreamSubject,
};

const MEMBER_COLUMNS: &str = r#"
    member.id,
    member.account_id,
    account.account_code,
    account.account_name,
    member.priority,
    member.routing_weight,
    member.cost_multiplier_override::text AS cost_multiplier_override,
    member.enabled,
    member.status
"#;

pub(super) async fn list(
    pool: &PgPool,
    subject: AdminUpstreamSubject,
    account_group_id: i64,
) -> DomainResult<Vec<AdminUpstreamAccountGroupMemberItem>> {
    let sql = format!(
        r#"
        SELECT {MEMBER_COLUMNS}
        FROM ai_upstream_account_group_member member
        JOIN ai_upstream_account account
          ON account.tenant_id = member.tenant_id
         AND account.organization_id = member.organization_id
         AND account.id = member.account_id
         AND account.deleted_at IS NULL
        WHERE member.tenant_id = $1 AND member.organization_id = $2
          AND member.account_group_id = $3 AND member.deleted_at IS NULL
        ORDER BY member.priority ASC, member.routing_weight DESC, member.id ASC
        LIMIT {MAX_NESTED_ITEMS}
        "#
    );
    let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(account_group_id)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to list upstream account group members", error))?;
    rows.into_iter().map(map_row).collect()
}

pub(super) async fn replace(
    pool: &PgPool,
    subject: AdminUpstreamSubject,
    account_group_id: i64,
    expected_version: i64,
    items: Vec<AdminUpstreamAccountGroupMemberInput>,
    requested_at: String,
) -> DomainResult<Vec<AdminUpstreamAccountGroupMemberItem>> {
    validate_inputs(&items)?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin account group member replacement", error))?;
    account_group::lock_for_nested(&mut tx, &subject, account_group_id, expected_version).await?;
    let account_ids = items.iter().map(|item| item.account_id).collect::<Vec<_>>();
    ensure_accounts_exist(&mut tx, &subject, &account_ids).await?;

    for item in &items {
        let member_id = next_claw_runtime_id("upstream account group member")?;
        sqlx::query(
            r#"
            INSERT INTO ai_upstream_account_group_member (
                id, uuid, tenant_id, organization_id, data_scope, status,
                created_at, updated_at, version, metadata,
                account_group_id, account_id, priority, routing_weight,
                cost_multiplier_override, enabled
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7::timestamptz, $7::timestamptz, 0, '{}'::jsonb,
                $8, $9, $10, $11,
                $12::numeric, $13
            )
            ON CONFLICT (tenant_id, organization_id, account_group_id, account_id)
            DO UPDATE SET
                priority = EXCLUDED.priority,
                routing_weight = EXCLUDED.routing_weight,
                cost_multiplier_override = EXCLUDED.cost_multiplier_override,
                enabled = EXCLUDED.enabled,
                status = EXCLUDED.status,
                deleted_at = NULL,
                deleted_by = NULL,
                version = ai_upstream_account_group_member.version + 1,
                updated_at = EXCLUDED.updated_at
            "#,
        )
        .bind(member_id)
        .bind(generated_uuid())
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(DEFAULT_DATA_SCOPE)
        .bind(item.status)
        .bind(&requested_at)
        .bind(account_group_id)
        .bind(item.account_id)
        .bind(item.priority)
        .bind(item.routing_weight)
        .bind(item.cost_multiplier_override.as_deref())
        .bind(item.enabled)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("failed to upsert account group member", error))?;
    }

    retire_omitted(
        &mut tx,
        &subject,
        account_group_id,
        &account_ids,
        &requested_at,
    )
    .await?;
    account_group::bump_nested_version(
        &mut tx,
        &subject,
        account_group_id,
        expected_version,
        &requested_at,
    )
    .await?;
    let result = list_in_transaction(&mut tx, &subject, account_group_id).await?;
    record_routing_change(
        &mut tx,
        &subject,
        &requested_at,
        "upstream_account_group",
        account_group_id,
        "replace_upstream_account_group_members",
        serde_json::json!({"memberCount": result.len()}),
    )
    .await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit account group member replacement", error))?;
    Ok(result)
}

async fn ensure_accounts_exist(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    account_ids: &[i64],
) -> DomainResult<()> {
    if account_ids.is_empty() {
        return Ok(());
    }
    let count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM ai_upstream_account
        WHERE tenant_id = $1 AND organization_id = $2
          AND id = ANY($3::bigint[]) AND status = 1 AND deleted_at IS NULL
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(account_ids)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to validate account group member accounts", error))?;
    if count != account_ids.len() as i64 {
        return Err(not_found(
            "one or more active upstream accounts selected for the account group",
        ));
    }
    Ok(())
}

async fn retire_omitted(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    account_group_id: i64,
    account_ids: &[i64],
    requested_at: &str,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE ai_upstream_account_group_member
        SET deleted_at = $1::timestamptz,
            deleted_by = $2,
            enabled = FALSE,
            status = 0,
            version = version + 1,
            updated_at = $1::timestamptz
        WHERE tenant_id = $3 AND organization_id = $4
          AND account_group_id = $5 AND deleted_at IS NULL
          AND NOT (account_id = ANY($6::bigint[]))
        "#,
    )
    .bind(requested_at)
    .bind(subject.operator_id)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(account_group_id)
    .bind(account_ids)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to retire omitted account group members", error))?;
    Ok(())
}

async fn list_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    account_group_id: i64,
) -> DomainResult<Vec<AdminUpstreamAccountGroupMemberItem>> {
    let sql = format!(
        r#"
        SELECT {MEMBER_COLUMNS}
        FROM ai_upstream_account_group_member member
        JOIN ai_upstream_account account
          ON account.tenant_id = member.tenant_id
         AND account.organization_id = member.organization_id
         AND account.id = member.account_id
         AND account.deleted_at IS NULL
        WHERE member.tenant_id = $1 AND member.organization_id = $2
          AND member.account_group_id = $3 AND member.deleted_at IS NULL
        ORDER BY member.priority ASC, member.routing_weight DESC, member.id ASC
        LIMIT {MAX_NESTED_ITEMS}
        "#
    );
    let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(account_group_id)
        .fetch_all(&mut **tx)
        .await
        .map_err(|error| store_error("failed to reload account group members", error))?;
    rows.into_iter().map(map_row).collect()
}

fn validate_inputs(items: &[AdminUpstreamAccountGroupMemberInput]) -> DomainResult<()> {
    ensure_bounded_collection(items, "members")?;
    let mut account_ids = HashSet::with_capacity(items.len());
    for item in items {
        if item.account_id <= 0 || !account_ids.insert(item.account_id) {
            return Err(DomainError::new(
                "accountId must be positive and unique within an account group",
            ));
        }
        if item.priority < 0 || item.routing_weight < 0 {
            return Err(DomainError::new(
                "member priority and routingWeight must be non-negative",
            ));
        }
        if item
            .cost_multiplier_override
            .as_deref()
            .is_some_and(|value| {
                value
                    .trim()
                    .parse::<f64>()
                    .ok()
                    .is_none_or(|number| !number.is_finite() || number <= 0.0)
            })
        {
            return Err(DomainError::new(
                "costMultiplierOverride must be a positive decimal",
            ));
        }
    }
    Ok(())
}

fn map_row(row: PgRow) -> DomainResult<AdminUpstreamAccountGroupMemberItem> {
    Ok(AdminUpstreamAccountGroupMemberItem {
        id: column(&row, "id", "failed to map account group member id")?,
        account_id: column(
            &row,
            "account_id",
            "failed to map account group member account id",
        )?,
        account_code: column(
            &row,
            "account_code",
            "failed to map account group member account code",
        )?,
        account_name: column(
            &row,
            "account_name",
            "failed to map account group member account name",
        )?,
        priority: column(
            &row,
            "priority",
            "failed to map account group member priority",
        )?,
        routing_weight: column(
            &row,
            "routing_weight",
            "failed to map account group member routing weight",
        )?,
        cost_multiplier_override: column(
            &row,
            "cost_multiplier_override",
            "failed to map account group member cost multiplier",
        )?,
        enabled: column(
            &row,
            "enabled",
            "failed to map account group member enabled state",
        )?,
        status: column(&row, "status", "failed to map account group member status")?,
    })
}
