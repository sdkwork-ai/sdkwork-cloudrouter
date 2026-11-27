//! Relay recharge connection resolution and balance caching.
//!
//! The management recharge surface never stores a second copy of the relay API
//! key: it reuses the supplier account credential that already authenticates the
//! supplier's AI traffic. This module is the only place that decrypts that
//! credential for a recharge call, and the decrypted secret only travels into
//! the dedicated recharge request — never into a list response or a log line.

use sqlx::{PgPool, Row};

use crate::application::{UpstreamCredentialSecretCodec, UpstreamCredentialSecretContext};
use crate::domain::{DomainError, DomainResult};
use crate::ports::{AdminUpstreamRechargeBinding, AdminUpstreamSubject};

use super::shared::{column, not_found, store_error};

/// Resolves the relay recharge connection for one supplier.
///
/// Selection order is deterministic so repeated calls target the same relay
/// account: lowest credential priority, then lowest account id, then lowest
/// credential id. Expired credentials are skipped; a supplier whose only
/// credential expired is reported as "not configured" rather than as a relay
/// authentication failure.
pub(super) async fn load_binding(
    pool: &PgPool,
    secret_codec: &(dyn UpstreamCredentialSecretCodec + Send + Sync),
    subject: AdminUpstreamSubject,
    supplier_id: i64,
) -> DomainResult<Option<AdminUpstreamRechargeBinding>> {
    let row = sqlx::query(
        r#"
        SELECT
            supplier.id AS supplier_id,
            supplier.supplier_name,
            supplier.supplier_type,
            supplier.default_base_url,
            account.id AS account_id,
            account.account_code,
            account.upstream_balance_currency,
            credential.id AS credential_id,
            credential.secret_ciphertext,
            credential.secret_key_id,
            endpoint.base_url AS endpoint_base_url
        FROM ai_upstream_supplier supplier
        JOIN ai_upstream_account account
          ON account.tenant_id = supplier.tenant_id
         AND account.organization_id = supplier.organization_id
         AND account.supplier_id = supplier.id
         AND account.deleted_at IS NULL
         AND account.status = 1
        JOIN ai_upstream_account_credential credential
          ON credential.tenant_id = account.tenant_id
         AND credential.organization_id = account.organization_id
         AND credential.account_id = account.id
         AND credential.deleted_at IS NULL
         AND credential.is_active = TRUE
         AND credential.status = 1
         AND (credential.expires_at IS NULL OR credential.expires_at > CURRENT_TIMESTAMP)
        LEFT JOIN LATERAL (
            SELECT endpoint.base_url
            FROM ai_upstream_supplier_endpoint endpoint
            WHERE endpoint.tenant_id = supplier.tenant_id
              AND endpoint.organization_id = supplier.organization_id
              AND endpoint.supplier_id = supplier.id
              AND endpoint.deleted_at IS NULL
              AND endpoint.status = 1
            ORDER BY endpoint.priority ASC, endpoint.id ASC
            LIMIT 1
        ) endpoint ON TRUE
        WHERE supplier.tenant_id = $1
          AND supplier.organization_id = $2
          AND supplier.id = $3
          AND supplier.deleted_at IS NULL
        ORDER BY credential.priority ASC, account.id ASC, credential.id ASC
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(supplier_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("failed to resolve the relay recharge connection", error))?;
    let Some(row) = row else {
        return Ok(None);
    };

    let account_id: i64 = column(&row, "account_id", "failed to map the recharge account id")?;
    let credential_id: i64 = column(
        &row,
        "credential_id",
        "failed to map the recharge credential id",
    )?;
    let ciphertext: String = column(
        &row,
        "secret_ciphertext",
        "failed to map the recharge credential ciphertext",
    )?;
    let key_id: String = column(
        &row,
        "secret_key_id",
        "failed to map the recharge credential key id",
    )?;
    let secret = secret_codec.decode_secret(
        UpstreamCredentialSecretContext::new(
            subject.tenant_id,
            subject.organization_id,
            account_id,
            credential_id,
        ),
        &key_id,
        &ciphertext,
    )?;
    let raw_base_url: Option<String> = column(&row, "default_base_url", "default base URL")?;
    let endpoint_base_url: Option<String> = column(
        &row,
        "endpoint_base_url",
        "failed to map the supplier endpoint base URL",
    )?;
    let base_url = raw_base_url
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .or(endpoint_base_url)
        .ok_or_else(|| {
            DomainError::new(
                "upstream supplier has no base URL to derive the relay recharge origin from",
            )
        })?;
    Ok(Some(AdminUpstreamRechargeBinding {
        supplier_id: column(&row, "supplier_id", "failed to map the supplier id")?,
        supplier_name: column(&row, "supplier_name", "failed to map the supplier name")?,
        supplier_type: column(&row, "supplier_type", "failed to map the supplier type")?,
        account_id,
        account_code: column(&row, "account_code", "failed to map the account code")?,
        base_url,
        api_key: secret,
        currency_code: column(
            &row,
            "upstream_balance_currency",
            "failed to map the balance currency",
        )?,
    }))
}

/// Caches the balance reported by the relay on the account that produced it.
pub(super) async fn record_balance(
    pool: &PgPool,
    subject: AdminUpstreamSubject,
    account_id: i64,
    amount: &str,
    currency_code: Option<&str>,
    checked_at: &str,
) -> DomainResult<()> {
    let updated = sqlx::query(
        r#"
        UPDATE ai_upstream_account
        SET upstream_balance_amount = $4::numeric,
            upstream_balance_currency = $5,
            last_balance_checked_at = $6::timestamptz,
            updated_at = CURRENT_TIMESTAMP,
            version = version + 1
        WHERE tenant_id = $1
          AND organization_id = $2
          AND id = $3
          AND deleted_at IS NULL
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(account_id)
    .bind(amount)
    .bind(currency_code)
    .bind(checked_at)
    .execute(pool)
    .await
    .map_err(|error| store_error("failed to cache the relay account balance", error))?;
    if updated.rows_affected() == 0 {
        return Err(not_found("upstream account"));
    }
    Ok(())
}

/// Applies the cached balance of one supplier list page.
///
/// The list SQL already aggregates the values, so this helper only exists to
/// keep the mapping between the row alias and the response field in one place
/// for tests.
pub(super) fn balance_fields(
    row: &sqlx::postgres::PgRow,
) -> DomainResult<(Option<String>, Option<String>, Option<String>)> {
    let amount: Option<String> = row
        .try_get("balance_amount")
        .map_err(|error| DomainError::new(format!("failed to map the balance amount: {error}")))?;
    let currency: Option<String> = row.try_get("balance_currency").map_err(|error| {
        DomainError::new(format!("failed to map the balance currency: {error}"))
    })?;
    let checked_at: Option<String> = row.try_get("balance_checked_at").map_err(|error| {
        DomainError::new(format!("failed to map the balance check time: {error}"))
    })?;
    Ok((amount, currency, checked_at))
}
