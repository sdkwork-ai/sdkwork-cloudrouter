use std::sync::Arc;
use std::time::Duration;

use sqlx::{PgPool, Row};

use super::shared::store_error;
use crate::application::{UpstreamCredentialSecretCodec, UpstreamCredentialSecretContext};
use crate::domain::{
    resolve_upstream_runtime_auth_profile, DomainError, DomainResult, ProviderAuthProfile,
};
use crate::infrastructure::provider::UpstreamProviderEndpoint;
use crate::ports::{
    AdminUpstreamAccountVerificationError, AdminUpstreamAccountVerificationFuture,
    AdminUpstreamAccountVerificationItem, AdminUpstreamAccountVerifier,
    VerifyAdminUpstreamAccountCommand,
};

const HEALTHY: i32 = 1;
const UNHEALTHY: i32 = 2;

#[derive(Clone)]
pub struct PostgresAdminUpstreamAccountVerifier {
    pool: PgPool,
    secret_codec: Arc<dyn UpstreamCredentialSecretCodec + Send + Sync>,
}

impl std::fmt::Debug for PostgresAdminUpstreamAccountVerifier {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("PostgresAdminUpstreamAccountVerifier")
            .field("pool", &self.pool)
            .field("secret_codec", &"[configured]")
            .finish()
    }
}

impl PostgresAdminUpstreamAccountVerifier {
    pub fn new(
        pool: PgPool,
        secret_codec: Arc<dyn UpstreamCredentialSecretCodec + Send + Sync>,
    ) -> Self {
        Self { pool, secret_codec }
    }
}

impl AdminUpstreamAccountVerifier for PostgresAdminUpstreamAccountVerifier {
    fn verify_account<'a>(
        &'a self,
        command: VerifyAdminUpstreamAccountCommand,
    ) -> AdminUpstreamAccountVerificationFuture<'a> {
        Box::pin(
            async move { verify_account(&self.pool, self.secret_codec.as_ref(), command).await },
        )
    }
}

struct VerificationTarget {
    supplier_id: i64,
    supplier_code: String,
    protocol_code: String,
    endpoint_id: i64,
    base_url: String,
    credential_id: i64,
    secret_ciphertext: String,
    secret_key_id: String,
    auth_type: String,
    runtime_auth_config_json: String,
}

async fn verify_account(
    pool: &PgPool,
    secret_codec: &(dyn UpstreamCredentialSecretCodec + Send + Sync),
    command: VerifyAdminUpstreamAccountCommand,
) -> Result<AdminUpstreamAccountVerificationItem, AdminUpstreamAccountVerificationError> {
    let target = load_verification_target(pool, &command).await?;
    ensure_openai_compatible_protocol(&target.protocol_code)?;
    let secret_context = UpstreamCredentialSecretContext::new(
        command.subject.tenant_id,
        command.subject.organization_id,
        command.account_id,
        target.credential_id,
    );
    let secret = secret_codec
        .decode_secret(
            secret_context,
            &target.secret_key_id,
            &target.secret_ciphertext,
        )
        .map_err(|_| AdminUpstreamAccountVerificationError::InvalidConfiguration)?;
    let auth_profile = verification_auth_profile(&target)?;
    let endpoint = UpstreamProviderEndpoint::new(&target.base_url, secret)
        .map_err(|_| AdminUpstreamAccountVerificationError::InvalidConfiguration)?
        .with_auth_profile(auth_profile);
    let outcome = endpoint
        .verify_models(Duration::from_millis(command.timeout_ms))
        .await;
    let (success, status_code, latency_ms, message) = match outcome {
        Ok(outcome) => (
            outcome.success,
            Some(outcome.status_code),
            outcome.latency_ms,
            outcome.message,
        ),
        Err(error) => (false, None, 0, sanitized_verification_error(error)),
    };
    let item = AdminUpstreamAccountVerificationItem {
        account_id: command.account_id,
        supplier_code: target.supplier_code.clone(),
        endpoint_id: target.endpoint_id,
        credential_id: target.credential_id,
        success,
        status_code,
        latency_ms,
        verified_at: command.requested_at.clone(),
        message,
    };
    record_verification_result(pool, &command, &target, &item)
        .await
        .map_err(|_| AdminUpstreamAccountVerificationError::Internal)?;
    Ok(item)
}

async fn load_verification_target(
    pool: &PgPool,
    command: &VerifyAdminUpstreamAccountCommand,
) -> Result<VerificationTarget, AdminUpstreamAccountVerificationError> {
    let row = sqlx::query(
        r#"
        SELECT
            supplier.id AS supplier_id,
            supplier.supplier_code,
            COALESCE(NULLIF(endpoint.protocol_code, ''), supplier.protocol_code) AS protocol_code,
            endpoint.id AS endpoint_id,
            endpoint.base_url,
            credential.id AS credential_id,
            credential.secret_ciphertext,
            credential.secret_key_id,
            auth_method.auth_type,
            auth_method.runtime_auth_config::text AS runtime_auth_config_json
        FROM ai_upstream_account account
        JOIN ai_upstream_supplier supplier
          ON supplier.tenant_id = account.tenant_id
         AND supplier.organization_id = account.organization_id
         AND supplier.id = account.supplier_id
         AND supplier.supplier_code = account.supplier_code
         AND supplier.status = 1
         AND supplier.deleted_at IS NULL
        JOIN ai_upstream_supplier_auth_method auth_method
          ON auth_method.tenant_id = account.tenant_id
         AND auth_method.organization_id = account.organization_id
         AND auth_method.supplier_id = account.supplier_id
         AND auth_method.auth_method_code = account.auth_method_code
         AND auth_method.status = 1
         AND auth_method.deleted_at IS NULL
        JOIN LATERAL (
            SELECT candidate.id, candidate.base_url, candidate.protocol_code
            FROM ai_upstream_supplier_endpoint candidate
            LEFT JOIN ai_upstream_supplier_endpoint_health_state candidate_health
              ON candidate_health.tenant_id = candidate.tenant_id
             AND candidate_health.organization_id = candidate.organization_id
             AND candidate_health.endpoint_id = candidate.id
            WHERE candidate.tenant_id = account.tenant_id
              AND candidate.organization_id = account.organization_id
              AND candidate.supplier_id = account.supplier_id
              AND candidate.status = 1
              AND candidate.deleted_at IS NULL
              AND ($4::bigint IS NULL OR candidate.id = $4)
            ORDER BY
              CASE WHEN candidate.id = account.preferred_endpoint_id THEN 0 ELSE 1 END,
              CASE COALESCE(candidate_health.health_status, 0)
                  WHEN 1 THEN 0
                  WHEN 0 THEN 1
                  ELSE 2
              END,
              candidate.priority ASC,
              candidate.routing_weight DESC,
              candidate.id ASC
            LIMIT 1
        ) endpoint ON TRUE
        JOIN LATERAL (
            SELECT candidate.id, candidate.secret_ciphertext, candidate.secret_key_id
            FROM ai_upstream_account_credential candidate
            WHERE candidate.tenant_id = account.tenant_id
              AND candidate.organization_id = account.organization_id
              AND candidate.account_id = account.id
              AND candidate.auth_method_code = account.auth_method_code
              AND candidate.status = 1
              AND candidate.is_active
              AND candidate.deleted_at IS NULL
              AND (candidate.expires_at IS NULL OR candidate.expires_at > CURRENT_TIMESTAMP)
              AND ($5::bigint IS NULL OR candidate.id = $5)
            ORDER BY candidate.priority ASC, candidate.credential_version DESC, candidate.id ASC
            LIMIT 1
        ) credential ON TRUE
        WHERE account.tenant_id = $1
          AND account.organization_id = $2
          AND account.id = $3
          AND account.status = 1
          AND account.deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.account_id)
    .bind(command.endpoint_id)
    .bind(command.credential_id)
    .fetch_optional(pool)
    .await
    .map_err(|_| AdminUpstreamAccountVerificationError::Internal)?
    .ok_or(AdminUpstreamAccountVerificationError::TargetNotFound)?;

    Ok(VerificationTarget {
        supplier_id: row
            .try_get("supplier_id")
            .map_err(|_| AdminUpstreamAccountVerificationError::Internal)?,
        supplier_code: row
            .try_get("supplier_code")
            .map_err(|_| AdminUpstreamAccountVerificationError::Internal)?,
        protocol_code: row
            .try_get("protocol_code")
            .map_err(|_| AdminUpstreamAccountVerificationError::Internal)?,
        endpoint_id: row
            .try_get("endpoint_id")
            .map_err(|_| AdminUpstreamAccountVerificationError::Internal)?,
        base_url: row
            .try_get("base_url")
            .map_err(|_| AdminUpstreamAccountVerificationError::Internal)?,
        credential_id: row
            .try_get("credential_id")
            .map_err(|_| AdminUpstreamAccountVerificationError::Internal)?,
        secret_ciphertext: row
            .try_get("secret_ciphertext")
            .map_err(|_| AdminUpstreamAccountVerificationError::Internal)?,
        secret_key_id: row
            .try_get("secret_key_id")
            .map_err(|_| AdminUpstreamAccountVerificationError::Internal)?,
        auth_type: row
            .try_get("auth_type")
            .map_err(|_| AdminUpstreamAccountVerificationError::Internal)?,
        runtime_auth_config_json: row
            .try_get("runtime_auth_config_json")
            .map_err(|_| AdminUpstreamAccountVerificationError::Internal)?,
    })
}

fn ensure_openai_compatible_protocol(
    protocol_code: &str,
) -> Result<(), AdminUpstreamAccountVerificationError> {
    let protocol = protocol_code.trim().to_ascii_lowercase().replace('-', "_");
    if matches!(
        protocol.as_str(),
        "openai" | "openai_v1" | "openai_compatible" | "openai_compat"
    ) {
        return Ok(());
    }
    Err(AdminUpstreamAccountVerificationError::UnsupportedProtocol)
}

fn verification_auth_profile(
    target: &VerificationTarget,
) -> Result<ProviderAuthProfile, AdminUpstreamAccountVerificationError> {
    resolve_upstream_runtime_auth_profile(&target.auth_type, &target.runtime_auth_config_json)
        .map_err(|_| AdminUpstreamAccountVerificationError::InvalidConfiguration)
}

fn sanitized_verification_error(error: DomainError) -> String {
    let message = error.to_string();
    if message.len() <= 512 {
        message
    } else {
        format!("{}...", message.chars().take(509).collect::<String>())
    }
}

async fn record_verification_result(
    pool: &PgPool,
    command: &VerifyAdminUpstreamAccountCommand,
    target: &VerificationTarget,
    item: &AdminUpstreamAccountVerificationItem,
) -> DomainResult<()> {
    let health_status = if item.success { HEALTHY } else { UNHEALTHY };
    let latency_ms = i32::try_from(item.latency_ms).unwrap_or(i32::MAX);
    let mut tx = pool.begin().await.map_err(|error| {
        store_error(
            "failed to begin upstream account verification result transaction",
            error,
        )
    })?;
    sqlx::query(
        r#"
        INSERT INTO ai_upstream_account_health_state (
            id, tenant_id, organization_id, created_at, updated_at,
            account_id, health_status, last_latency_ms, consecutive_error_count,
            last_verified_at, last_success_at, last_failure_at
        ) VALUES (
            $7, $5, $6, $1::timestamptz, $1::timestamptz,
            $7, $2, $3, CASE WHEN $4 THEN 0 ELSE 1 END,
            $1::timestamptz,
            CASE WHEN $4 THEN $1::timestamptz ELSE NULL END,
            CASE WHEN $4 THEN NULL ELSE $1::timestamptz END
        )
        ON CONFLICT (tenant_id, organization_id, account_id)
        DO UPDATE SET
            health_status = EXCLUDED.health_status,
            last_latency_ms = EXCLUDED.last_latency_ms,
            consecutive_error_count = CASE
                WHEN $4 THEN 0
                ELSE ai_upstream_account_health_state.consecutive_error_count + 1
            END,
            last_verified_at = EXCLUDED.last_verified_at,
            last_success_at = CASE
                WHEN $4 THEN EXCLUDED.last_verified_at
                ELSE ai_upstream_account_health_state.last_success_at
            END,
            last_failure_at = CASE
                WHEN $4 THEN ai_upstream_account_health_state.last_failure_at
                ELSE EXCLUDED.last_verified_at
            END,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(&command.requested_at)
    .bind(health_status)
    .bind(latency_ms)
    .bind(item.success)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.account_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| {
        store_error(
            "failed to record upstream account verification result",
            error,
        )
    })?;
    sqlx::query(
        r#"
        INSERT INTO ai_upstream_supplier_endpoint_health_state (
            id, tenant_id, organization_id, created_at, updated_at,
            supplier_id, endpoint_id, health_status, last_latency_ms,
            consecutive_error_count, last_checked_at, last_success_at, last_failure_at
        ) VALUES (
            $7, $5, $6, $1::timestamptz, $1::timestamptz,
            $8, $7, $2, $3, CASE WHEN $4 THEN 0 ELSE 1 END,
            $1::timestamptz,
            CASE WHEN $4 THEN $1::timestamptz ELSE NULL END,
            CASE WHEN $4 THEN NULL ELSE $1::timestamptz END
        )
        ON CONFLICT (tenant_id, organization_id, endpoint_id)
        DO UPDATE SET
            supplier_id = EXCLUDED.supplier_id,
            health_status = EXCLUDED.health_status,
            last_latency_ms = EXCLUDED.last_latency_ms,
            consecutive_error_count = CASE
                WHEN $4 THEN 0
                ELSE ai_upstream_supplier_endpoint_health_state.consecutive_error_count + 1
            END,
            last_checked_at = EXCLUDED.last_checked_at,
            last_success_at = CASE
                WHEN $4 THEN EXCLUDED.last_checked_at
                ELSE ai_upstream_supplier_endpoint_health_state.last_success_at
            END,
            last_failure_at = CASE
                WHEN $4 THEN ai_upstream_supplier_endpoint_health_state.last_failure_at
                ELSE EXCLUDED.last_checked_at
            END,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(&command.requested_at)
    .bind(health_status)
    .bind(latency_ms)
    .bind(item.success)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(target.endpoint_id)
    .bind(target.supplier_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| {
        store_error(
            "failed to record upstream endpoint verification result",
            error,
        )
    })?;
    sqlx::query(
        r#"
        UPDATE ai_upstream_account_credential
        SET last_verified_at = $1::timestamptz
        WHERE tenant_id = $2 AND organization_id = $3 AND id = $4 AND account_id = $5
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.requested_at)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(target.credential_id)
    .bind(command.account_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| {
        store_error(
            "failed to record upstream credential verification result",
            error,
        )
    })?;
    tx.commit().await.map_err(|error| {
        store_error(
            "failed to commit upstream account verification result",
            error,
        )
    })?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn target(auth_type: &str) -> VerificationTarget {
        VerificationTarget {
            supplier_id: 1,
            supplier_code: "openai".to_owned(),
            protocol_code: "openai_v1".to_owned(),
            endpoint_id: 2,
            base_url: "https://api.openai.com".to_owned(),
            credential_id: 3,
            secret_ciphertext: "encrypted-credential".to_owned(),
            secret_key_id: "test-key".to_owned(),
            auth_type: auth_type.to_owned(),
            runtime_auth_config_json: r#"{"credentialTransport":"bearer","defaultHeaders":{}}"#
                .to_owned(),
        }
    }

    #[test]
    fn verification_protocols_are_explicitly_registered() {
        for protocol in ["openai", "openai-v1", "openai_compatible", "openai-compat"] {
            assert!(ensure_openai_compatible_protocol(protocol).is_ok());
        }
        assert_eq!(
            AdminUpstreamAccountVerificationError::UnsupportedProtocol,
            ensure_openai_compatible_protocol("anthropic_messages").unwrap_err()
        );
    }

    #[test]
    fn verification_auth_types_are_explicitly_registered() {
        for auth_type in ["api_key", "bearer_token", "custom"] {
            assert!(verification_auth_profile(&target(auth_type)).is_ok());
        }
        assert_eq!(
            AdminUpstreamAccountVerificationError::InvalidConfiguration,
            verification_auth_profile(&target("unsupported")).unwrap_err()
        );
    }

    #[test]
    fn verification_target_sql_enforces_scope_ownership_and_credential_lifecycle() {
        let source = include_str!("verifier.rs");
        for required_clause in [
            "WHERE account.tenant_id = $1",
            "AND account.organization_id = $2",
            "AND account.id = $3",
            "candidate.tenant_id = account.tenant_id",
            "candidate.organization_id = account.organization_id",
            "candidate.supplier_id = account.supplier_id",
            "candidate.account_id = account.id",
            "candidate.auth_method_code = account.auth_method_code",
            "candidate.status = 1",
            "candidate.is_active",
            "candidate.expires_at > CURRENT_TIMESTAMP",
            "$4::bigint IS NULL OR candidate.id = $4",
            "$5::bigint IS NULL OR candidate.id = $5",
        ] {
            assert!(
                source.contains(required_clause),
                "verification target SQL is missing: {required_clause}"
            );
        }
    }
}
