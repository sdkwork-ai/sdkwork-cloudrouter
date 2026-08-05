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
            let mut tx = self
                .pool
                .begin()
                .await
                .map_err(|error| store_error("failed to begin invite code transaction", error))?;
            for attempt in 0..MAX_INVITE_CODE_GENERATION_ATTEMPTS {
                match issue_invite_code_once(&mut tx, &command).await {
                    Ok(item) => {
                        tx.commit().await.map_err(|error| {
                            store_error("failed to commit invite code transaction", error)
                        })?;
                        return Ok(item);
                    }
                    Err(IssueInviteCodeAttemptError::CodeCollision)
                        if attempt + 1 < MAX_INVITE_CODE_GENERATION_ATTEMPTS =>
                    {
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
    .bind(&command.invite_code)
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| {
        IssueInviteCodeAttemptError::Domain(store_error(
            "failed to write invite code",
            error,
        ))
    })?;

    let invite_code = if insert_result.rows_affected() > 0 {
        command.invite_code.clone()
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

    // The unique code index may collide with another user's code; retry at a
    // higher layer with a fresh candidate when the insert did not commit.
    let code_taken = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(1)
        FROM ops_referral_invite_code
        WHERE tenant_id = $1
          AND organization_id = $2
          AND invite_code = $3
          AND user_id <> $4
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&invite_code)
    .bind(command.subject.user_id)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| {
        IssueInviteCodeAttemptError::Domain(store_error(
            "failed to verify invite code uniqueness",
            error,
        ))
    })?;
    if code_taken > 0 {
        return Err(IssueInviteCodeAttemptError::CodeCollision);
    }
    Ok(AppInviteCodeItem { invite_code })
}

async fn claim_invite_relation(
    pool: &PgPool,
    command: &ClaimAppInviteRelationCommand,
) -> DomainResult<AppInviteRelationClaimed> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin referral relation transaction", error))?;

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

    if let Some((relation_id, inviter_user_id, reward_status)) = existing {
        tx.commit()
            .await
            .map_err(|error| store_error("failed to commit referral relation transaction", error))?;
        if inviter_user_id == command.inviter_user_id {
            return Ok(AppInviteRelationClaimed {
                relation_id,
                reward_status,
            });
        }
        return Err(DomainError::conflict(
            "the user is already bound to another inviter".to_owned(),
        ));
    }

    let id = next_cloud_runtime_id("ops_referral_relation")?;
    let source = if command.source.trim().is_empty() {
        DEFAULT_RELATION_SOURCE.to_owned()
    } else {
        command.source.trim().to_owned()
    };
    sqlx::query(
        r#"
        INSERT INTO ops_referral_relation
            (id, tenant_id, organization_id, invitee_user_id, inviter_user_id, invite_code, source, status, reward_status, claimed_at, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9::timestamptz, $9::timestamptz, $9::timestamptz)
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

    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit referral relation transaction", error))?;
    Ok(AppInviteRelationClaimed {
        relation_id: id,
        reward_status: DEFAULT_REWARD_STATUS.to_owned(),
    })
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}
