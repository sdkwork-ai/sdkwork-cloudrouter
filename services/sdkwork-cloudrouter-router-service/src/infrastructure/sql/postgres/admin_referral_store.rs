use sqlx::{PgPool, Postgres, Row, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_cloud_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    AdminReferralCommandFuture, AdminReferralListPage, AdminReferralRelationItem,
    AdminReferralStore, AdminReferralStrategyItem, AdminReferralSubject,
    CreateAdminReferralStrategyCommand, DeleteAdminReferralStrategyCommand,
    ListAdminReferralRelationsQuery, ListAdminReferralStrategiesQuery,
    RetrieveAdminReferralStrategyQuery, UpdateAdminReferralStrategyCommand,
};

const TARGET_TYPE_REFERRAL_STRATEGY: i32 = 78;

#[derive(Debug, Clone)]
pub struct PostgresAdminReferralStore {
    pool: PgPool,
}

impl PostgresAdminReferralStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminReferralStore for PostgresAdminReferralStore {
    fn list_referral_relations<'a>(
        &'a self,
        query: ListAdminReferralRelationsQuery,
    ) -> AdminReferralCommandFuture<'a, AdminReferralListPage<AdminReferralRelationItem>> {
        Box::pin(async move { list_referral_relations(&self.pool, query).await })
    }

    fn list_referral_strategies<'a>(
        &'a self,
        query: ListAdminReferralStrategiesQuery,
    ) -> AdminReferralCommandFuture<'a, AdminReferralListPage<AdminReferralStrategyItem>> {
        Box::pin(async move { list_referral_strategies(&self.pool, query).await })
    }

    fn retrieve_referral_strategy<'a>(
        &'a self,
        query: RetrieveAdminReferralStrategyQuery,
    ) -> AdminReferralCommandFuture<'a, Option<AdminReferralStrategyItem>> {
        Box::pin(async move { retrieve_referral_strategy(&self.pool, query).await })
    }

    fn create_referral_strategy<'a>(
        &'a self,
        command: CreateAdminReferralStrategyCommand,
    ) -> AdminReferralCommandFuture<'a, AdminReferralStrategyItem> {
        Box::pin(async move {
            let mut tx = self
                .pool
                .begin()
                .await
                .map_err(|error| store_error("failed to begin referral strategy transaction", error))?;
            let item = insert_referral_strategy(&mut tx, &command).await?;
            insert_audit_log(
                &mut tx,
                &command.subject,
                &command.audit_log_uuid,
                &command.request_id,
                "create_referral_strategy",
                TARGET_TYPE_REFERRAL_STRATEGY,
                &command.strategy_uuid,
                serde_json::json!({ "name": command.name }),
            )
            .await?;
            tx.commit().await.map_err(|error| {
                store_error("failed to commit referral strategy transaction", error)
            })?;
            Ok(item)
        })
    }

    fn update_referral_strategy<'a>(
        &'a self,
        command: UpdateAdminReferralStrategyCommand,
    ) -> AdminReferralCommandFuture<'a, AdminReferralStrategyItem> {
        Box::pin(async move {
            let mut tx = self
                .pool
                .begin()
                .await
                .map_err(|error| store_error("failed to begin referral strategy transaction", error))?;
            let updated = update_referral_strategy(&mut tx, &command).await?;
            match updated {
                Some(item) => {
                    insert_audit_log(
                        &mut tx,
                        &command.subject,
                        &command.audit_log_uuid,
                        &command.request_id,
                        "update_referral_strategy",
                        TARGET_TYPE_REFERRAL_STRATEGY,
                        &item.id,
                        serde_json::json!({ "name": item.name }),
                    )
                    .await?;
                    tx.commit().await.map_err(|error| {
                        store_error("failed to commit referral strategy transaction", error)
                    })?;
                    Ok(item)
                }
                None => {
                    tx.rollback().await.map_err(|error| {
                        store_error("failed to roll back referral strategy transaction", error)
                    })?;
                    Err(DomainError::not_found(
                        "referral strategy was not found".to_owned(),
                    ))
                }
            }
        })
    }

    fn delete_referral_strategy<'a>(
        &'a self,
        command: DeleteAdminReferralStrategyCommand,
    ) -> AdminReferralCommandFuture<'a, bool> {
        Box::pin(async move {
            let mut tx = self
                .pool
                .begin()
                .await
                .map_err(|error| store_error("failed to begin referral strategy transaction", error))?;
            let deleted = sqlx::query(
                r#"
                DELETE FROM ops_referral_strategy
                WHERE tenant_id = $1
                  AND organization_id = $2
                  AND id::text = $3
                "#,
            )
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(&command.strategy_id)
            .execute(&mut *tx)
            .await
            .map_err(|error| store_error("failed to delete referral strategy", error))?
            .rows_affected();
            if deleted > 0 {
                insert_audit_log(
                    &mut tx,
                    &command.subject,
                    &command.audit_log_uuid,
                    &command.request_id,
                    "delete_referral_strategy",
                    TARGET_TYPE_REFERRAL_STRATEGY,
                    &command.strategy_id,
                    serde_json::json!({}),
                )
                .await?;
            }
            tx.commit().await.map_err(|error| {
                store_error("failed to commit referral strategy transaction", error)
            })?;
            Ok(deleted > 0)
        })
    }
}

async fn list_referral_relations(
    pool: &PgPool,
    query: ListAdminReferralRelationsQuery,
) -> DomainResult<AdminReferralListPage<AdminReferralRelationItem>> {
    let rows = sqlx::query(
        r#"
        SELECT
            id::text AS id,
            inviter_user_id::text AS inviter,
            invitee_user_id::text AS invitee,
            invite_code AS invite_code,
            source AS source,
            reward_status AS reward_status,
            COALESCE(claimed_at, created_at)::text AS claimed_at,
            COUNT(*) OVER() AS total
        FROM ops_referral_relation
        WHERE tenant_id = $1
          AND organization_id = $2
          AND status = 1
          AND (
                $5 = ''
                OR invite_code ILIKE '%' || $5 || '%'
                OR inviter_user_id::text ILIKE '%' || $5 || '%'
                OR invitee_user_id::text ILIKE '%' || $5 || '%'
              )
        ORDER BY created_at DESC, id DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.page_size)
    .bind(query.offset)
    .bind(query.search.unwrap_or_default())
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list referral relations", error))?;

    let total = list_total(&rows);
    let items = rows
        .iter()
        .map(|row| {
            Ok(AdminReferralRelationItem {
                id: string_cell(row, "id"),
                inviter: string_cell(row, "inviter"),
                invitee: string_cell(row, "invitee"),
                invite_code: string_cell(row, "invite_code"),
                source: string_cell(row, "source"),
                reward_status: string_cell(row, "reward_status"),
                claimed_at: string_cell(row, "claimed_at"),
            })
        })
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminReferralListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn list_referral_strategies(
    pool: &PgPool,
    query: ListAdminReferralStrategiesQuery,
) -> DomainResult<AdminReferralListPage<AdminReferralStrategyItem>> {
    let rows = match query.status.as_deref().map(str::trim).filter(|value| !value.is_empty()) {
        Some("active") | Some("enabled") => {
            sqlx::query(
                r#"
                SELECT
                    id::text AS id,
                    name AS name,
                    description AS description,
                    status AS status,
                    reward_type AS reward_type,
                    reward_value AS reward_value,
                    reward_target AS reward_target,
                    trigger_event AS trigger_event,
                    max_rewards_per_inviter AS max_rewards_per_inviter,
                    COALESCE(starts_at, '')::text AS starts_at,
                    COALESCE(ends_at, '')::text AS ends_at,
                    updated_at::text AS updated_at,
                    COUNT(*) OVER() AS total
                FROM ops_referral_strategy
                WHERE tenant_id = $1
                  AND organization_id = $2
                  AND status = 'active'
                  AND ($5 = '' OR name ILIKE '%' || $5 || '%')
                ORDER BY updated_at DESC, id DESC
                LIMIT $3 OFFSET $4
                "#,
            )
        }
        Some("disabled") | Some("inactive") => {
            sqlx::query(
                r#"
                SELECT
                    id::text AS id,
                    name AS name,
                    description AS description,
                    status AS status,
                    reward_type AS reward_type,
                    reward_value AS reward_value,
                    reward_target AS reward_target,
                    trigger_event AS trigger_event,
                    max_rewards_per_inviter AS max_rewards_per_inviter,
                    COALESCE(starts_at, '')::text AS starts_at,
                    COALESCE(ends_at, '')::text AS ends_at,
                    updated_at::text AS updated_at,
                    COUNT(*) OVER() AS total
                FROM ops_referral_strategy
                WHERE tenant_id = $1
                  AND organization_id = $2
                  AND status = 'disabled'
                  AND ($5 = '' OR name ILIKE '%' || $5 || '%')
                ORDER BY updated_at DESC, id DESC
                LIMIT $3 OFFSET $4
                "#,
            )
        }
        _ => {
            sqlx::query(
                r#"
                SELECT
                    id::text AS id,
                    name AS name,
                    description AS description,
                    status AS status,
                    reward_type AS reward_type,
                    reward_value AS reward_value,
                    reward_target AS reward_target,
                    trigger_event AS trigger_event,
                    max_rewards_per_inviter AS max_rewards_per_inviter,
                    COALESCE(starts_at, '')::text AS starts_at,
                    COALESCE(ends_at, '')::text AS ends_at,
                    updated_at::text AS updated_at,
                    COUNT(*) OVER() AS total
                FROM ops_referral_strategy
                WHERE tenant_id = $1
                  AND organization_id = $2
                  AND ($5 = '' OR name ILIKE '%' || $5 || '%')
                ORDER BY updated_at DESC, id DESC
                LIMIT $3 OFFSET $4
                "#,
            )
        }
    }
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.page_size)
    .bind(query.offset)
    .bind(query.search.unwrap_or_default())
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list referral strategies", error))?;

    let total = list_total(&rows);
    let items = rows
        .iter()
        .map(|row| {
            Ok(AdminReferralStrategyItem {
                id: string_cell(row, "id"),
                name: string_cell(row, "name"),
                description: string_cell(row, "description"),
                status: string_cell(row, "status"),
                reward_type: string_cell(row, "reward_type"),
                reward_value: string_cell(row, "reward_value"),
                reward_target: string_cell(row, "reward_target"),
                trigger_event: string_cell(row, "trigger_event"),
                max_rewards_per_inviter: integer_cell(row, "max_rewards_per_inviter"),
                starts_at: string_cell(row, "starts_at"),
                ends_at: string_cell(row, "ends_at"),
                updated_at: string_cell(row, "updated_at"),
            })
        })
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminReferralListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn retrieve_referral_strategy(
    pool: &PgPool,
    query: RetrieveAdminReferralStrategyQuery,
) -> DomainResult<Option<AdminReferralStrategyItem>> {
    let row = sqlx::query(
        r#"
        SELECT
            id::text AS id,
            name AS name,
            description AS description,
            status AS status,
            reward_type AS reward_type,
            reward_value AS reward_value,
            reward_target AS reward_target,
            trigger_event AS trigger_event,
            max_rewards_per_inviter AS max_rewards_per_inviter,
            COALESCE(starts_at, '')::text AS starts_at,
            COALESCE(ends_at, '')::text AS ends_at,
            updated_at::text AS updated_at
        FROM ops_referral_strategy
        WHERE tenant_id = $1
          AND organization_id = $2
          AND id::text = $3
        LIMIT 1
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(&query.strategy_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("failed to retrieve referral strategy", error))?;

    row.map(|row| {
        Ok(AdminReferralStrategyItem {
            id: string_cell(&row, "id"),
            name: string_cell(&row, "name"),
            description: string_cell(&row, "description"),
            status: string_cell(&row, "status"),
            reward_type: string_cell(&row, "reward_type"),
            reward_value: string_cell(&row, "reward_value"),
            reward_target: string_cell(&row, "reward_target"),
            trigger_event: string_cell(&row, "trigger_event"),
            max_rewards_per_inviter: integer_cell(&row, "max_rewards_per_inviter"),
            starts_at: string_cell(&row, "starts_at"),
            ends_at: string_cell(&row, "ends_at"),
            updated_at: string_cell(&row, "updated_at"),
        })
    })
    .transpose()
}

async fn insert_referral_strategy(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateAdminReferralStrategyCommand,
) -> DomainResult<AdminReferralStrategyItem> {
    let id = next_cloud_runtime_id("ops_referral_strategy")?;
    sqlx::query(
        r#"
        INSERT INTO ops_referral_strategy
            (id, tenant_id, organization_id, name, description, status, reward_type, reward_value, reward_target, trigger_event, max_rewards_per_inviter, starts_at, ends_at, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz, $13::timestamptz, $14::timestamptz, $14::timestamptz)
        "#,
    )
    .bind(id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.name)
    .bind(&command.description)
    .bind(&command.status)
    .bind(&command.reward_type)
    .bind(&command.reward_value)
    .bind(&command.reward_target)
    .bind(&command.trigger_event)
    .bind(command.max_rewards_per_inviter)
    .bind(optional_timestamp(&command.starts_at))
    .bind(optional_timestamp(&command.ends_at))
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create referral strategy", error))?;
    Ok(AdminReferralStrategyItem {
        id: id.to_string(),
        name: command.name.clone(),
        description: command.description.clone(),
        status: command.status.clone(),
        reward_type: command.reward_type.clone(),
        reward_value: command.reward_value.clone(),
        reward_target: command.reward_target.clone(),
        trigger_event: command.trigger_event.clone(),
        max_rewards_per_inviter: command.max_rewards_per_inviter,
        starts_at: command.starts_at.clone().unwrap_or_default(),
        ends_at: command.ends_at.clone().unwrap_or_default(),
        updated_at: command.requested_at.clone(),
    })
}

async fn update_referral_strategy(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdateAdminReferralStrategyCommand,
) -> DomainResult<Option<AdminReferralStrategyItem>> {
    let result = sqlx::query(
        r#"
        UPDATE ops_referral_strategy
        SET name = $3,
            description = $4,
            status = $5,
            reward_type = $6,
            reward_value = $7,
            reward_target = $8,
            trigger_event = $9,
            max_rewards_per_inviter = $10,
            starts_at = $11::timestamptz,
            ends_at = $12::timestamptz,
            updated_at = $13::timestamptz
        WHERE tenant_id = $1
          AND organization_id = $2
          AND id::text = $14
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.name)
    .bind(&command.description)
    .bind(&command.status)
    .bind(&command.reward_type)
    .bind(&command.reward_value)
    .bind(&command.reward_target)
    .bind(&command.trigger_event)
    .bind(command.max_rewards_per_inviter)
    .bind(optional_timestamp(&command.starts_at))
    .bind(optional_timestamp(&command.ends_at))
    .bind(&command.requested_at)
    .bind(&command.strategy_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update referral strategy", error))?
    .rows_affected();

    if result == 0 {
        return Ok(None);
    }
    Ok(Some(AdminReferralStrategyItem {
        id: command.strategy_id.clone(),
        name: command.name.clone(),
        description: command.description.clone(),
        status: command.status.clone(),
        reward_type: command.reward_type.clone(),
        reward_value: command.reward_value.clone(),
        reward_target: command.reward_target.clone(),
        trigger_event: command.trigger_event.clone(),
        max_rewards_per_inviter: command.max_rewards_per_inviter,
        starts_at: command.starts_at.clone().unwrap_or_default(),
        ends_at: command.ends_at.clone().unwrap_or_default(),
        updated_at: command.requested_at.clone(),
    }))
}

fn optional_timestamp(value: &Option<String>) -> Option<&str> {
    value
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

async fn insert_audit_log(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminReferralSubject,
    audit_log_uuid: &str,
    request_id: &str,
    action: &'static str,
    target_type: i32,
    target_uuid: &str,
    change_summary: serde_json::Value,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (id, uuid, tenant_id, organization_id, action, target_type, target_uuid, request_id, operator_id, operator_type, change_summary)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
        "#,
    )
    .bind(next_cloud_runtime_id("ops_audit_log")?)
    .bind(audit_log_uuid)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(action)
    .bind(target_type)
    .bind(target_uuid)
    .bind(request_id)
    .bind(subject.operator_id)
    .bind(subject.operator_type)
    .bind(change_summary.to_string())
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write referral audit log", error))?;
    Ok(())
}

fn list_total(rows: &[sqlx::postgres::PgRow]) -> i64 {
    rows.first()
        .and_then(|row| row.try_get::<i64, _>("total").ok())
        .unwrap_or(0)
}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> String {
    row.try_get::<String, _>(column).unwrap_or_default()
}

fn integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> i64 {
    row.try_get::<i64, _>(column).unwrap_or(0)
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}
