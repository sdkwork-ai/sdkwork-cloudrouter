use sqlx::{PgPool, Row};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    CredentialRotationAccount, CredentialRotationAction, CredentialRotationSweepCommand,
    TryRotateCredentialCommand, UpstreamCredentialRotationStore,
    UpstreamCredentialRotationStoreFuture,
};

#[derive(Debug, Clone)]
pub struct PostgresUpstreamCredentialRotationStore {
    pool: PgPool,
}

impl PostgresUpstreamCredentialRotationStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl UpstreamCredentialRotationStore for PostgresUpstreamCredentialRotationStore {
    fn list_accounts_due_for_rotation(
        &self,
        command: CredentialRotationSweepCommand,
    ) -> UpstreamCredentialRotationStoreFuture<'_, Vec<CredentialRotationAccount>> {
        let pool = self.pool.clone();
        Box::pin(async move { list_accounts_due_for_rotation(&pool, command).await })
    }

    fn try_rotate_account(
        &self,
        command: TryRotateCredentialCommand,
    ) -> UpstreamCredentialRotationStoreFuture<'_, CredentialRotationAction> {
        let pool = self.pool.clone();
        Box::pin(async move { try_rotate_account(&pool, command).await })
    }
}

async fn list_accounts_due_for_rotation(
    pool: &PgPool,
    command: CredentialRotationSweepCommand,
) -> DomainResult<Vec<CredentialRotationAccount>> {
    let rows = sqlx::query(
        r#"
        SELECT a.tenant_id, a.organization_id, a.id AS account_id,
               a.supplier_code, a.account_code, a.credential_rotation_policy::text AS credential_rotation_policy
        FROM ai_upstream_account AS a
        WHERE a.deleted_at IS NULL
          AND a.status = 1
          AND ($1 = 0 OR a.tenant_id = $1)
          AND ($2 = 0 OR a.organization_id = $2)
          AND (
              (a.next_rotate_at IS NOT NULL AND a.next_rotate_at <= $3::timestamptz)
              OR EXISTS (
                  SELECT 1
                  FROM ai_upstream_account_credential AS c
                  WHERE c.tenant_id = a.tenant_id
                    AND c.organization_id = a.organization_id
                    AND c.account_id = a.id
                    AND c.deleted_at IS NULL
                    AND c.is_active = TRUE
                    AND c.expires_at IS NOT NULL
                    AND c.expires_at <= $3::timestamptz
              )
          )
        ORDER BY COALESCE(a.next_rotate_at, a.created_at), a.id
        LIMIT $4
        "#,
    )
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(&command.now)
    .bind(command.limit)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list accounts due for credential rotation", error))?;
    rows.iter()
        .map(|row| {
            Ok(CredentialRotationAccount {
                tenant_id: required_i64_cell(row, "tenant_id", "rotation account")?,
                organization_id: required_i64_cell(row, "organization_id", "rotation account")?,
                account_id: required_i64_cell(row, "account_id", "rotation account")?,
                supplier_code: string_cell(row, "supplier_code"),
                account_code: string_cell(row, "account_code"),
                credential_rotation_policy: optional_string_cell(row, "credential_rotation_policy"),
            })
        })
        .collect()
}

async fn try_rotate_account(
    pool: &PgPool,
    command: TryRotateCredentialCommand,
) -> DomainResult<CredentialRotationAction> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin credential rotation transaction", error))?;

    // Lock the account row and re-check whether a scheduled rotation is due;
    // the account may have been rotated by another node between list and here.
    let account_state = sqlx::query(
        r#"
        SELECT a.id AS account_id,
               COALESCE(a.next_rotate_at IS NOT NULL AND a.next_rotate_at <= $3::timestamptz, FALSE) AS due_by_schedule
        FROM ai_upstream_account AS a
        WHERE a.tenant_id = $1
          AND a.organization_id = $2
          AND a.id = $3
          AND a.deleted_at IS NULL
        FOR UPDATE
        "#,
    )
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(command.account_id)
    .bind(&command.now)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|error| store_error("failed to lock upstream account for rotation", error))?;
    let Some(account_state) = account_state else {
        tx.rollback()
            .await
            .map_err(|error| store_error("failed to roll back credential rotation", error))?;
        return Ok(CredentialRotationAction::Noop {
            tenant_id: command.tenant_id,
            organization_id: command.organization_id,
            account_id: command.account_id,
        });
    };
    let due_by_schedule: bool = account_state
        .try_get("due_by_schedule")
        .map_err(|error| store_error("failed to read rotation due flag", error))?;

    // Active credential that is still valid.
    let active_valid_id: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT c.id
        FROM ai_upstream_account_credential AS c
        WHERE c.tenant_id = $1
          AND c.organization_id = $2
          AND c.account_id = $3
          AND c.deleted_at IS NULL
          AND c.is_active = TRUE
          AND (c.expires_at IS NULL OR c.expires_at > $4::timestamptz)
        ORDER BY c.credential_version DESC, c.id
        LIMIT 1
        "#,
    )
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(command.account_id)
    .bind(&command.now)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|error| store_error("failed to load active upstream credential", error))?;

    // Active credential that has expired and must be deactivated.
    let expired_id: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT c.id
        FROM ai_upstream_account_credential AS c
        WHERE c.tenant_id = $1
          AND c.organization_id = $2
          AND c.account_id = $3
          AND c.deleted_at IS NULL
          AND c.is_active = TRUE
          AND c.expires_at IS NOT NULL
          AND c.expires_at <= $4::timestamptz
        ORDER BY c.credential_version DESC, c.id
        LIMIT 1
        "#,
    )
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(command.account_id)
    .bind(&command.now)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|error| store_error("failed to load expired upstream credential", error))?;

    if let Some(expired_id) = expired_id {
        let deactivated = sqlx::query(
            r#"
            UPDATE ai_upstream_account_credential
            SET is_active = FALSE,
                version = version + 1,
                updated_at = $4::timestamptz
            WHERE id = $1
              AND tenant_id = $2
              AND organization_id = $3
              AND is_active = TRUE
            "#,
        )
        .bind(expired_id)
        .bind(command.tenant_id)
        .bind(command.organization_id)
        .bind(&command.now)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("failed to deactivate expired upstream credential", error))?;
        if deactivated.rows_affected() != 1 {
            tx.rollback()
                .await
                .map_err(|error| store_error("failed to roll back credential rotation", error))?;
            return Ok(CredentialRotationAction::Noop {
                tenant_id: command.tenant_id,
                organization_id: command.organization_id,
                account_id: command.account_id,
            });
        }
    }

    let rotation_needed = due_by_schedule || expired_id.is_some();
    if !rotation_needed {
        tx.rollback()
            .await
            .map_err(|error| store_error("failed to roll back credential rotation", error))?;
        return Ok(CredentialRotationAction::Noop {
            tenant_id: command.tenant_id,
            organization_id: command.organization_id,
            account_id: command.account_id,
        });
    }

    // Prefer the newest pre-provisioned candidate credential.
    let candidate_id: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT c.id
        FROM ai_upstream_account_credential AS c
        WHERE c.tenant_id = $1
          AND c.organization_id = $2
          AND c.account_id = $3
          AND c.deleted_at IS NULL
          AND c.status = 1
          AND c.is_active = FALSE
          AND (c.expires_at IS NULL OR c.expires_at > $4::timestamptz)
        ORDER BY c.credential_version DESC, c.id
        LIMIT 1
        "#,
    )
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(command.account_id)
    .bind(&command.now)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|error| store_error("failed to load rotation candidate credential", error))?;

    let Some(candidate_id) = candidate_id else {
        if expired_id.is_some() {
            tx.commit()
                .await
                .map_err(|error| store_error("failed to commit credential rotation", error))?;
            return Ok(CredentialRotationAction::ExpiredDeactivated {
                tenant_id: command.tenant_id,
                organization_id: command.organization_id,
                account_id: command.account_id,
                deactivated_credential_id: expired_id.unwrap_or_default(),
            });
        }
        tx.rollback()
            .await
            .map_err(|error| store_error("failed to roll back credential rotation", error))?;
        return Ok(CredentialRotationAction::Overdue {
            tenant_id: command.tenant_id,
            organization_id: command.organization_id,
            account_id: command.account_id,
        });
    };

    let promoted = sqlx::query(
        r#"
        UPDATE ai_upstream_account_credential
        SET is_active = TRUE,
            last_rotated_at = $4::timestamptz,
            version = version + 1,
            updated_at = $4::timestamptz
        WHERE id = $1
          AND tenant_id = $2
          AND organization_id = $3
          AND is_active = FALSE
        "#,
    )
    .bind(candidate_id)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(&command.now)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to promote rotation candidate credential", error))?;
    if promoted.rows_affected() != 1 {
        // Another node promoted the candidate first.
        tx.rollback()
            .await
            .map_err(|error| store_error("failed to roll back credential rotation", error))?;
        return Ok(CredentialRotationAction::Noop {
            tenant_id: command.tenant_id,
            organization_id: command.organization_id,
            account_id: command.account_id,
        });
    }

    sqlx::query(
        r#"
        UPDATE ai_upstream_account
        SET last_rotated_at = $3::timestamptz,
            next_rotate_at = $3::timestamptz + ($4 * INTERVAL '1 day'),
            version = version + 1,
            updated_at = $3::timestamptz
        WHERE tenant_id = $1
          AND organization_id = $2
          AND id = $5
          AND deleted_at IS NULL
        "#,
    )
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(&command.now)
    .bind(command.rotation_interval_days)
    .bind(command.account_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to schedule next credential rotation", error))?;

    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit credential rotation", error))?;

    let next_rotate_at = {
        let row = sqlx::query(
            r#"
            SELECT TO_CHAR(next_rotate_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS next_rotate_at
            FROM ai_upstream_account
            WHERE tenant_id = $1 AND organization_id = $2 AND id = $3
            "#,
        )
        .bind(command.tenant_id)
        .bind(command.organization_id)
        .bind(command.account_id)
        .fetch_one(pool)
        .await
        .map_err(|error| store_error("failed to read next credential rotation", error))?;
        string_cell(&row, "next_rotate_at")
    };

    Ok(CredentialRotationAction::Rotated {
        tenant_id: command.tenant_id,
        organization_id: command.organization_id,
        account_id: command.account_id,
        promoted_credential_id: candidate_id,
        previous_credential_id: active_valid_id.or(expired_id),
        next_rotate_at,
    })
}

fn required_i64_cell(row: &sqlx::postgres::PgRow, name: &str, source: &str) -> DomainResult<i64> {
    row.try_get::<i64, _>(name).map_err(|error| {
        DomainError::new(format!("failed to read {source} column {name}: {error}"))
    })
}

fn string_cell(row: &sqlx::postgres::PgRow, name: &str) -> String {
    row.try_get::<String, _>(name).unwrap_or_default()
}

fn optional_string_cell(row: &sqlx::postgres::PgRow, name: &str) -> Option<String> {
    row.try_get::<Option<String>, _>(name).ok().flatten()
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}
