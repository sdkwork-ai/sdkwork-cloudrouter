use sqlx::{PgPool, Postgres, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_cloud_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    AppInviteCodeItem, AppInviteCodeOwner, AppInviteCommandFuture, AppInviteRelationClaimed,
    AppInviteStore, ClaimAppInviteRelationCommand, IssueAppInviteCodeCommand,
    ValidateAppInviteCodeQuery,
};

const DEFAULT_RELATION_SOURCE: &str = "register";
const DEFAULT_REWARD_STATUS: &str = "pending";
const MAX_INVITE_CODE_GENERATION_ATTEMPTS: usize = 3;

#[derive(Debug, Clone)]
pub struct PostgresAppInviteStore {
    pool: PgPool,
}

impl PostgresAppInviteStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AppInviteStore for PostgresAppInviteStore {
    fn validate_invite_code<'a>(
        &'a self,
        query: ValidateAppInviteCodeQuery,
    ) -> AppInviteCommandFuture<'a, Option<AppInviteCodeOwner>> {
        Box::pin(async move {
            let user_id = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT user_id
                FROM ops_referral_invite_code
                WHERE invite_code = $1
                  AND status = 1
                LIMIT 1
                "#,
            )
            .bind(&query.invite_code)
            .fetch_optional(&self.pool)
            .await
            .map_err(|error| store_error("failed to validate invite code", error))?;
            Ok(user_id.map(|user_id| AppInviteCodeOwner { user_id }))
        })
    }

    fn issue_invite_code<'a>(
        &'a self,
        command: IssueAppInviteCodeCommand,
    ) -> AppInviteCommandFuture<'a, AppInviteCodeItem> {
        Box::pin(async move {
            // Each attempt uses its own transaction: a unique-code collision
            // aborts the PostgreSQL transaction, so a retry must start from a
            // fresh transaction instead of reusing the aborted one. The
            // colliding code is also taken, so a retry regenerates the code.
            let mut invite_code = command.invite_code.clone();
            for attempt in 0..MAX_INVITE_CODE_GENERATION_ATTEMPTS {
                let mut tx = self
                    .pool
                    .begin()
                    .await
                    .map_err(|error| store_error("failed to begin invite code transaction", error))?;
                match issue_invite_code_once(&mut tx, &command, &invite_code).await {
                    Ok(item) => {
                        tx.commit().await.map_err(|error| {
                            store_error("failed to commit invite code transaction", error)
                        })?;
                        return Ok(item);
                    }
                    Err(IssueInviteCodeAttemptError::CodeCollision)
                        if attempt + 1 < MAX_INVITE_CODE_GENERATION_ATTEMPTS =>
                    {
                        // Dropping the aborted transaction rolls it back; the
                        // colliding code is taken, so draw a fresh one.
                        invite_code = generate_invite_code()?;
                        continue;
                    }
                    Err(IssueInviteCodeAttemptError::CodeCollision) => {
                        return Err(DomainError::new(
                            "failed to generate a unique invite code after repeated attempts"
                                .to_owned(),
                        ));
                    }
                    Err(IssueInviteCodeAttemptError::Domain(error)) => {
                        return Err(error);
                    }
                }
            }
            Err(DomainError::new(
                "failed to generate a unique invite code".to_owned(),
            ))
        })
    }

    fn claim_invite_relation<'a>(
        &'a self,
        command: ClaimAppInviteRelationCommand,
    ) -> AppInviteCommandFuture<'a, AppInviteRelationClaimed> {
        Box::pin(async move { claim_invite_relation(&self.pool, &command).await })
    }
}

enum IssueInviteCodeAttemptError {
    Domain(DomainError),
    CodeCollision,
}

async fn issue_invite_code_once(
    tx: &mut Transaction<'_, Postgres>,
    command: &IssueAppInviteCodeCommand,
    invite_code: &str,
) -> Result<AppInviteCodeItem, IssueInviteCodeAttemptError> {
    let id = next_cloud_runtime_id("ops_referral_invite_code")
        .map_err(IssueInviteCodeAttemptError::Domain)?;
    let insert_result = sqlx::query(
        r#"
        INSERT INTO ops_referral_invite_code
            (id, tenant_id, organization_id, user_id, invite_code, status, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, 1, $6::timestamptz, $6::timestamptz)
        ON CONFLICT (tenant_id, organization_id, user_id) DO NOTHING
        "#,
    )
    .bind(id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.subject.user_id)
    .bind(invite_code)
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| {
        // The generated code may collide with another user's code on the
        // unique code index; surface it as a retryable collision instead of a
        // system error. The user-scoped conflict target above stays untouched.
        if is_invite_code_unique_violation(&error) {
            return IssueInviteCodeAttemptError::CodeCollision;
        }
        IssueInviteCodeAttemptError::Domain(store_error(
            "failed to write invite code",
            error,
        ))
    })?;

    // A fresh insert means the code is unique (the unique index would have
    // rejected a collision above). A DO NOTHING result means the user already
    // has a code; reuse it.
    let invite_code = if insert_result.rows_affected() > 0 {
        invite_code.to_owned()
    } else {
        let existing = sqlx::query_scalar::<_, String>(
            r#"
            SELECT invite_code
            FROM ops_referral_invite_code
            WHERE tenant_id = $1
              AND organization_id = $2
              AND user_id = $3
              AND status = 1
            LIMIT 1
            "#,
        )
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(command.subject.user_id)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|error| {
            IssueInviteCodeAttemptError::Domain(store_error(
                "failed to load existing invite code",
                error,
            ))
        })?;
        existing.ok_or_else(|| {
            IssueInviteCodeAttemptError::Domain(DomainError::new(
                "invite code row was not found after upsert".to_owned(),
            ))
        })?
    };
    Ok(AppInviteCodeItem { invite_code })
}

fn is_invite_code_unique_violation(error: &sqlx::Error) -> bool {
    error
        .as_database_error()
        .and_then(|database_error| database_error.constraint())
        .is_some_and(|constraint| constraint == "uk_ops_referral_invite_code_tenant_code")
}

/// De-confused invite code alphabet (no 0/O/1/I/L to avoid typos); 32 symbols
/// divide 256 evenly so `%` sampling stays uniform.
const INVITE_CODE_ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_CODE_LENGTH: usize = 8;

/// Draws a fresh code for the collision-retry path; the API layer generates
/// the first attempt's code via the same scheme.
fn generate_invite_code() -> DomainResult<String> {
    let mut buffer = [0u8; INVITE_CODE_LENGTH];
    getrandom::fill(&mut buffer)
        .map_err(|error| DomainError::new(error.to_string()))?;
    Ok(buffer
        .iter()
        .map(|byte| INVITE_CODE_ALPHABET[(*byte as usize) % INVITE_CODE_ALPHABET.len()] as char)
        .collect())
}

async fn claim_invite_relation(
    pool: &PgPool,
    command: &ClaimAppInviteRelationCommand,
) -> DomainResult<AppInviteRelationClaimed> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin referral relation transaction", error))?;

    let id = next_cloud_runtime_id("ops_referral_relation")?;
    let source = if command.source.trim().is_empty() {
        DEFAULT_RELATION_SOURCE.to_owned()
    } else {
        command.source.trim().to_owned()
    };
    let insert_result = sqlx::query(
        r#"
        INSERT INTO ops_referral_relation
            (id, tenant_id, organization_id, invitee_user_id, inviter_user_id, invite_code, source, status, reward_status, claimed_at, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9::timestamptz, $9::timestamptz, $9::timestamptz)
        ON CONFLICT (tenant_id, organization_id, invitee_user_id) DO NOTHING
        "#,
    )
    .bind(id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.subject.user_id)
    .bind(command.inviter_user_id)
    .bind(&command.invite_code)
    .bind(&source)
    .bind(DEFAULT_REWARD_STATUS)
    .bind(&command.requested_at)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to write referral relation", error))?;

    if insert_result.rows_affected() > 0 {
        tx.commit()
            .await
            .map_err(|error| store_error("failed to commit referral relation transaction", error))?;
        return Ok(AppInviteRelationClaimed {
            relation_id: id,
            reward_status: DEFAULT_REWARD_STATUS.to_owned(),
        });
    }

    // Another claim for the same invitee won the race (or the relation already
    // exists). Load the existing binding: same inviter is an idempotent
    // success, a different inviter is a conflict.
    let existing = sqlx::query_as::<_, (i64, i64, String)>(
        r#"
        SELECT id, inviter_user_id, reward_status
        FROM ops_referral_relation
        WHERE tenant_id = $1
          AND organization_id = $2
          AND invitee_user_id = $3
        LIMIT 1
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.subject.user_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|error| store_error("failed to load referral relation", error))?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit referral relation transaction", error))?;

    match existing {
        Some((relation_id, inviter_user_id, reward_status)) if inviter_user_id == command.inviter_user_id => {
            Ok(AppInviteRelationClaimed {
                relation_id,
                reward_status,
            })
        }
        Some((_relation_id, _inviter_user_id, _reward_status)) => {
            Err(DomainError::conflict(
                "the user is already bound to another inviter".to_owned(),
            ))
        }
        None => Err(DomainError::new(
            "referral relation row was not found after upsert".to_owned(),
        )),
    }
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}
