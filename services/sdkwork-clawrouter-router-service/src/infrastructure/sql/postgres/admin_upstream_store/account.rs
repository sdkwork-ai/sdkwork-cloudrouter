use sqlx::postgres::PgRow;
use sqlx::{PgPool, Postgres, Transaction};

use super::shared::{
    column, conflict, masked_secret, not_found, search_pattern, store_error, DEFAULT_DATA_SCOPE,
};
use crate::application::{ApiKeySecretCodec, ApiKeySecretHasher};
use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::ports::{
    AdminUpstreamAccountCredentialItem, AdminUpstreamAccountItem, AdminUpstreamListQuery,
    AdminUpstreamPage, AdminUpstreamSubject, CreateAdminUpstreamAccountCredentialCommand,
    SaveAdminUpstreamAccountCommand,
};

const MAX_CREDENTIAL_SECRET_BYTES: usize = 32 * 1024;
const ACCOUNT_COLUMNS: &str = r#"
    id, uuid, supplier_id, supplier_code, preferred_endpoint_id,
    account_code, account_name, account_type, auth_method_code,
    external_account_id, environment, region_code,
    quota_limit::text AS quota_limit,
    quota_used::text AS quota_used,
    upstream_balance_amount::text AS upstream_balance_amount,
    upstream_balance_currency,
    contract_cost_multiplier::text AS contract_cost_multiplier,
    rpm_limit, timeout_ms, health_status, status, version,
    TO_CHAR(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at
"#;

const CREDENTIAL_COLUMNS: &str = r#"
    id, auth_method_code, credential_name, masked_label, credential_version,
    priority, is_active,
    CASE WHEN expires_at IS NULL THEN NULL ELSE
        TO_CHAR(expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    END AS expires_at,
    CASE WHEN last_rotated_at IS NULL THEN NULL ELSE
        TO_CHAR(last_rotated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    END AS last_rotated_at,
    CASE WHEN last_verified_at IS NULL THEN NULL ELSE
        TO_CHAR(last_verified_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    END AS last_verified_at,
    CASE WHEN last_used_at IS NULL THEN NULL ELSE
        TO_CHAR(last_used_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    END AS last_used_at,
    status
"#;

pub(super) async fn list(
    pool: &PgPool,
    query: AdminUpstreamListQuery,
) -> DomainResult<AdminUpstreamPage<AdminUpstreamAccountItem>> {
    let pattern = search_pattern(query.q.as_deref());
    let total = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM ai_upstream_account account
        WHERE account.tenant_id = $1
          AND account.organization_id = $2
          AND account.deleted_at IS NULL
          AND (
                $3::text IS NULL
                OR account.account_code ILIKE $3 ESCAPE '\'
                OR account.account_name ILIKE $3 ESCAPE '\'
                OR account.supplier_code ILIKE $3 ESCAPE '\'
          )
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(pattern.as_deref())
    .fetch_one(pool)
    .await
    .map_err(|error| store_error("failed to count upstream accounts", error))?;
    let sql = format!(
        r#"
        SELECT {ACCOUNT_COLUMNS}
        FROM ai_upstream_account account
        WHERE account.tenant_id = $1
          AND account.organization_id = $2
          AND account.deleted_at IS NULL
          AND (
                $3::text IS NULL
                OR account.account_code ILIKE $3 ESCAPE '\'
                OR account.account_name ILIKE $3 ESCAPE '\'
                OR account.supplier_code ILIKE $3 ESCAPE '\'
          )
        ORDER BY account.updated_at DESC, account.id ASC
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
        .map_err(|error| store_error("failed to list upstream accounts", error))?;
    let items = rows
        .into_iter()
        .map(map_account_row)
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
    account_id: i64,
) -> DomainResult<Option<AdminUpstreamAccountItem>> {
    let sql = format!(
        r#"
        SELECT {ACCOUNT_COLUMNS}
        FROM ai_upstream_account
        WHERE tenant_id = $1 AND organization_id = $2
          AND id = $3 AND deleted_at IS NULL
        "#
    );
    sqlx::query(&sql)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(account_id)
        .fetch_optional(pool)
        .await
        .map_err(|error| store_error("failed to retrieve upstream account", error))?
        .map(map_account_row)
        .transpose()
}

pub(super) async fn save(
    pool: &PgPool,
    command: SaveAdminUpstreamAccountCommand,
) -> DomainResult<AdminUpstreamAccountItem> {
    validate_account_command(&command)?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin upstream account transaction", error))?;
    let account_id = match command.account_id {
        Some(account_id) => update(&mut tx, account_id, &command).await?,
        None => insert(&mut tx, &command).await?,
    };
    let item = get_in_transaction(&mut tx, &command.subject, account_id)
        .await?
        .ok_or_else(|| DomainError::new("saved upstream account could not be reloaded"))?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit upstream account transaction", error))?;
    Ok(item)
}

pub(super) async fn delete(
    pool: &PgPool,
    subject: AdminUpstreamSubject,
    account_id: i64,
    expected_version: i64,
    requested_at: String,
) -> DomainResult<bool> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin upstream account delete", error))?;
    lock_account_version(&mut tx, &subject, account_id, expected_version).await?;
    let membership_count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM ai_upstream_account_group_member
        WHERE tenant_id = $1 AND organization_id = $2
          AND account_id = $3 AND deleted_at IS NULL
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(account_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|error| store_error("failed to inspect upstream account memberships", error))?;
    if membership_count > 0 {
        return Err(conflict(
            "upstream account cannot be deleted while it belongs to an active account group",
        ));
    }
    sqlx::query(
        r#"
        UPDATE ai_upstream_account_credential
        SET is_active = FALSE, status = 0,
            version = version + 1, updated_at = $1::timestamptz
        WHERE tenant_id = $2 AND organization_id = $3
          AND account_id = $4 AND deleted_at IS NULL
        "#,
    )
    .bind(&requested_at)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(account_id)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to deactivate upstream account credentials", error))?;
    let result = sqlx::query(
        r#"
        UPDATE ai_upstream_account
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
    .bind(account_id)
    .bind(expected_version)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to delete upstream account", error))?;
    if result.rows_affected() != 1 {
        return Err(conflict("upstream account version changed during deletion"));
    }
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit upstream account delete", error))?;
    Ok(true)
}

pub(super) async fn list_credentials(
    pool: &PgPool,
    query: AdminUpstreamListQuery,
    account_id: i64,
) -> DomainResult<AdminUpstreamPage<AdminUpstreamAccountCredentialItem>> {
    ensure_account_exists(pool, &query.subject, account_id).await?;
    let pattern = search_pattern(query.q.as_deref());
    let total = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM ai_upstream_account_credential
        WHERE tenant_id = $1 AND organization_id = $2
          AND account_id = $3 AND deleted_at IS NULL
          AND (
                $4::text IS NULL
                OR credential_name ILIKE $4 ESCAPE '\'
                OR auth_method_code ILIKE $4 ESCAPE '\'
                OR masked_label ILIKE $4 ESCAPE '\'
          )
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(account_id)
    .bind(pattern.as_deref())
    .fetch_one(pool)
    .await
    .map_err(|error| store_error("failed to count upstream account credentials", error))?;
    let sql = format!(
        r#"
        SELECT {CREDENTIAL_COLUMNS}
        FROM ai_upstream_account_credential
        WHERE tenant_id = $1 AND organization_id = $2
          AND account_id = $3 AND deleted_at IS NULL
          AND (
                $4::text IS NULL
                OR credential_name ILIKE $4 ESCAPE '\'
                OR auth_method_code ILIKE $4 ESCAPE '\'
                OR masked_label ILIKE $4 ESCAPE '\'
          )
        ORDER BY is_active DESC, priority ASC, credential_version DESC, id DESC
        LIMIT $5 OFFSET $6
        "#
    );
    let rows = sqlx::query(&sql)
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id)
        .bind(account_id)
        .bind(pattern.as_deref())
        .bind(query.page_size)
        .bind(query.offset)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to list upstream account credentials", error))?;
    let items = rows
        .into_iter()
        .map(map_credential_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminUpstreamPage {
        items,
        page: query.page,
        page_size: query.page_size,
        total,
    })
}

pub(super) async fn create_credential(
    pool: &PgPool,
    secret_codec: &(dyn ApiKeySecretCodec + Send + Sync),
    secret_hasher: &(dyn ApiKeySecretHasher + Send + Sync),
    command: CreateAdminUpstreamAccountCredentialCommand,
) -> DomainResult<AdminUpstreamAccountCredentialItem> {
    if command.secret.trim().is_empty() {
        return Err(DomainError::new("secret must not be blank"));
    }
    if command.secret.len() > MAX_CREDENTIAL_SECRET_BYTES {
        return Err(DomainError::new(format!(
            "secret must not exceed {MAX_CREDENTIAL_SECRET_BYTES} bytes"
        )));
    }
    if command.credential_name.trim().is_empty() {
        return Err(DomainError::new("credentialName is required"));
    }
    if command.priority < 0 {
        return Err(DomainError::new("credential priority must be non-negative"));
    }
    let credential_ref = secret_codec.encode_secret(&command.secret)?;
    let credential_hash = secret_hasher.hash_secret(&command.secret)?;
    let masked_label = masked_secret(&command.secret);
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin credential transaction", error))?;
    let account_row = sqlx::query(
        r#"
        SELECT auth_method_code
        FROM ai_upstream_account
        WHERE tenant_id = $1 AND organization_id = $2
          AND id = $3 AND deleted_at IS NULL
        FOR UPDATE
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.account_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|error| store_error("failed to lock upstream account for credential", error))?
    .ok_or_else(|| not_found("upstream account"))?;
    let auth_method_code: String = column(
        &account_row,
        "auth_method_code",
        "failed to map account auth method",
    )?;
    let credential_version = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COALESCE(MAX(credential_version), 0) + 1
        FROM ai_upstream_account_credential
        WHERE tenant_id = $1 AND organization_id = $2 AND account_id = $3
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.account_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|error| store_error("failed to allocate credential version", error))?;
    let credential_id = next_claw_runtime_id("upstream account credential")?;
    let result = sqlx::query(
        r#"
        INSERT INTO ai_upstream_account_credential (
            id, uuid, tenant_id, organization_id, data_scope, status,
            created_at, updated_at, version, metadata,
            account_id, auth_method_code, credential_name,
            credential_ref, credential_hash, masked_label,
            credential_version, priority, is_active, expires_at, last_rotated_at
        ) VALUES (
            $1, $2, $3, $4, $5, 1,
            $6::timestamptz, $6::timestamptz, 0, '{}'::jsonb,
            $7, $8, $9,
            $10, $11, $12,
            $13, $14, TRUE, $15::timestamptz, $6::timestamptz
        )
        ON CONFLICT (uuid) DO NOTHING
        "#,
    )
    .bind(credential_id)
    .bind(&command.uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(DEFAULT_DATA_SCOPE)
    .bind(&command.requested_at)
    .bind(command.account_id)
    .bind(&auth_method_code)
    .bind(command.credential_name.trim())
    .bind(&credential_ref)
    .bind(&credential_hash)
    .bind(&masked_label)
    .bind(credential_version)
    .bind(command.priority)
    .bind(command.expires_at.as_deref())
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to create upstream account credential", error))?;

    let (resolved_id, existing_hash) = if result.rows_affected() == 1 {
        (credential_id, credential_hash.clone())
    } else {
        let replay = sqlx::query(
            r#"
            SELECT id, credential_hash
            FROM ai_upstream_account_credential
            WHERE uuid = $1 AND tenant_id = $2 AND organization_id = $3
              AND account_id = $4 AND deleted_at IS NULL
            "#,
        )
        .bind(&command.uuid)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(command.account_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|error| store_error("failed to resolve credential idempotency replay", error))?
        .ok_or_else(|| conflict("credential idempotency key is already used in another scope"))?;
        (
            column(&replay, "id", "failed to map replayed credential id")?,
            column(
                &replay,
                "credential_hash",
                "failed to map replayed credential hash",
            )?,
        )
    };
    if existing_hash != credential_hash {
        return Err(conflict(
            "credential idempotency key was already used with a different secret",
        ));
    }
    let item =
        get_credential_in_transaction(&mut tx, &command.subject, command.account_id, resolved_id)
            .await?
            .ok_or_else(|| DomainError::new("created credential could not be reloaded"))?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit credential transaction", error))?;
    Ok(item)
}

pub(super) async fn deactivate_credential(
    pool: &PgPool,
    subject: AdminUpstreamSubject,
    account_id: i64,
    credential_id: i64,
    requested_at: String,
) -> DomainResult<bool> {
    let result = sqlx::query(
        r#"
        UPDATE ai_upstream_account_credential credential
        SET is_active = FALSE,
            status = 0,
            version = version + 1,
            updated_at = $1::timestamptz
        FROM ai_upstream_account account
        WHERE credential.tenant_id = $2
          AND credential.organization_id = $3
          AND credential.account_id = $4
          AND credential.id = $5
          AND credential.deleted_at IS NULL
          AND account.tenant_id = credential.tenant_id
          AND account.organization_id = credential.organization_id
          AND account.id = credential.account_id
          AND account.deleted_at IS NULL
        "#,
    )
    .bind(requested_at)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(account_id)
    .bind(credential_id)
    .execute(pool)
    .await
    .map_err(|error| store_error("failed to deactivate upstream account credential", error))?;
    Ok(result.rows_affected() == 1)
}

async fn insert(
    tx: &mut Transaction<'_, Postgres>,
    command: &SaveAdminUpstreamAccountCommand,
) -> DomainResult<i64> {
    if command.expected_version.is_some() {
        return Err(DomainError::new(
            "expectedVersion must be omitted when creating an upstream account",
        ));
    }
    let supplier_code = validate_supplier_bindings(tx, command).await?;
    let account_id = next_claw_runtime_id("upstream account")?;
    sqlx::query(
        r#"
        INSERT INTO ai_upstream_account (
            id, uuid, tenant_id, organization_id, data_scope, status,
            created_at, updated_at, version, metadata,
            supplier_id, supplier_code, preferred_endpoint_id,
            account_code, account_name, account_type, auth_method_code,
            external_account_id, environment, region_code,
            quota_limit, upstream_balance_currency, contract_cost_multiplier,
            rpm_limit, timeout_ms, health_status, consecutive_error_count
        ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7::timestamptz, $7::timestamptz, 0, '{}'::jsonb,
            $8, $9, $10,
            $11, $12, $13, $14,
            $15, $16, $17,
            $18::numeric, $19, $20::numeric,
            $21, $22, 1, 0
        )
        "#,
    )
    .bind(account_id)
    .bind(&command.uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(DEFAULT_DATA_SCOPE)
    .bind(command.status)
    .bind(&command.requested_at)
    .bind(command.supplier_id)
    .bind(&supplier_code)
    .bind(command.preferred_endpoint_id)
    .bind(command.account_code.trim())
    .bind(command.account_name.trim())
    .bind(command.account_type.trim())
    .bind(command.auth_method_code.trim())
    .bind(command.external_account_id.as_deref().map(str::trim))
    .bind(command.environment)
    .bind(command.region_code.as_deref().map(str::trim))
    .bind(command.quota_limit.as_deref())
    .bind(command.upstream_balance_currency.as_deref().map(str::trim))
    .bind(command.contract_cost_multiplier.trim())
    .bind(command.rpm_limit)
    .bind(command.timeout_ms)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create upstream account", error))?;
    Ok(account_id)
}

async fn update(
    tx: &mut Transaction<'_, Postgres>,
    account_id: i64,
    command: &SaveAdminUpstreamAccountCommand,
) -> DomainResult<i64> {
    let expected_version = command.expected_version.ok_or_else(|| {
        DomainError::new("expectedVersion is required when updating an upstream account")
    })?;
    let existing = sqlx::query(
        r#"
        SELECT account_code, supplier_id, auth_method_code, version
        FROM ai_upstream_account
        WHERE tenant_id = $1 AND organization_id = $2
          AND id = $3 AND deleted_at IS NULL
        FOR UPDATE
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(account_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to lock upstream account for update", error))?
    .ok_or_else(|| not_found("upstream account"))?;
    let current_version: i64 = column(
        &existing,
        "version",
        "failed to map upstream account version",
    )?;
    if current_version != expected_version {
        return Err(conflict(format!(
            "upstream account version mismatch: expected {expected_version}, current {current_version}"
        )));
    }
    let current_code: String = column(
        &existing,
        "account_code",
        "failed to map upstream account code",
    )?;
    if current_code != command.account_code.trim() {
        return Err(conflict(
            "accountCode is immutable after an upstream account is created",
        ));
    }
    let current_supplier_id: i64 = column(
        &existing,
        "supplier_id",
        "failed to map upstream account supplier",
    )?;
    let current_auth_method: String = column(
        &existing,
        "auth_method_code",
        "failed to map upstream account auth method",
    )?;
    if current_supplier_id != command.supplier_id
        || current_auth_method != command.auth_method_code.trim()
    {
        let credential_count = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*)
            FROM ai_upstream_account_credential
            WHERE tenant_id = $1 AND organization_id = $2
              AND account_id = $3 AND deleted_at IS NULL
            "#,
        )
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(account_id)
        .fetch_one(&mut **tx)
        .await
        .map_err(|error| store_error("failed to inspect account credentials", error))?;
        if credential_count > 0 {
            return Err(conflict(
                "supplier or authMethodCode cannot change after credential history exists; create a new account instead",
            ));
        }
    }
    let supplier_code = validate_supplier_bindings(tx, command).await?;
    let result = sqlx::query(
        r#"
        UPDATE ai_upstream_account
        SET supplier_id = $1,
            supplier_code = $2,
            preferred_endpoint_id = $3,
            account_name = $4,
            account_type = $5,
            auth_method_code = $6,
            external_account_id = $7,
            environment = $8,
            region_code = $9,
            quota_limit = $10::numeric,
            upstream_balance_currency = $11,
            contract_cost_multiplier = $12::numeric,
            rpm_limit = $13,
            timeout_ms = $14,
            status = $15,
            version = version + 1,
            updated_at = $16::timestamptz
        WHERE tenant_id = $17 AND organization_id = $18
          AND id = $19 AND version = $20 AND deleted_at IS NULL
        "#,
    )
    .bind(command.supplier_id)
    .bind(supplier_code)
    .bind(command.preferred_endpoint_id)
    .bind(command.account_name.trim())
    .bind(command.account_type.trim())
    .bind(command.auth_method_code.trim())
    .bind(command.external_account_id.as_deref().map(str::trim))
    .bind(command.environment)
    .bind(command.region_code.as_deref().map(str::trim))
    .bind(command.quota_limit.as_deref())
    .bind(command.upstream_balance_currency.as_deref().map(str::trim))
    .bind(command.contract_cost_multiplier.trim())
    .bind(command.rpm_limit)
    .bind(command.timeout_ms)
    .bind(command.status)
    .bind(&command.requested_at)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(account_id)
    .bind(expected_version)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update upstream account", error))?;
    if result.rows_affected() != 1 {
        return Err(conflict("upstream account version changed during update"));
    }
    Ok(account_id)
}

async fn validate_supplier_bindings(
    tx: &mut Transaction<'_, Postgres>,
    command: &SaveAdminUpstreamAccountCommand,
) -> DomainResult<String> {
    let supplier_code = sqlx::query_scalar::<_, String>(
        r#"
        SELECT supplier_code
        FROM ai_upstream_supplier
        WHERE tenant_id = $1 AND organization_id = $2
          AND id = $3 AND status = 1 AND deleted_at IS NULL
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.supplier_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to resolve upstream account supplier", error))?
    .ok_or_else(|| not_found("active upstream supplier"))?;
    let auth_exists = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS (
            SELECT 1
            FROM ai_upstream_supplier_auth_method
            WHERE tenant_id = $1 AND organization_id = $2
              AND supplier_id = $3 AND auth_method_code = $4
              AND status = 1 AND deleted_at IS NULL
        )
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.supplier_id)
    .bind(command.auth_method_code.trim())
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to validate upstream auth method", error))?;
    if !auth_exists {
        return Err(not_found("active upstream supplier auth method"));
    }
    if let Some(endpoint_id) = command.preferred_endpoint_id {
        let endpoint_exists = sqlx::query_scalar::<_, bool>(
            r#"
            SELECT EXISTS (
                SELECT 1
                FROM ai_upstream_supplier_endpoint
                WHERE tenant_id = $1 AND organization_id = $2
                  AND supplier_id = $3 AND id = $4
                  AND status = 1 AND deleted_at IS NULL
            )
            "#,
        )
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(command.supplier_id)
        .bind(endpoint_id)
        .fetch_one(&mut **tx)
        .await
        .map_err(|error| store_error("failed to validate preferred upstream endpoint", error))?;
        if !endpoint_exists {
            return Err(not_found("active preferred upstream endpoint"));
        }
    }
    Ok(supplier_code)
}

async fn lock_account_version(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    account_id: i64,
    expected_version: i64,
) -> DomainResult<()> {
    let version = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT version
        FROM ai_upstream_account
        WHERE tenant_id = $1 AND organization_id = $2
          AND id = $3 AND deleted_at IS NULL
        FOR UPDATE
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(account_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to lock upstream account", error))?
    .ok_or_else(|| not_found("upstream account"))?;
    if version != expected_version {
        return Err(conflict(format!(
            "upstream account version mismatch: expected {expected_version}, current {version}"
        )));
    }
    Ok(())
}

async fn ensure_account_exists(
    pool: &PgPool,
    subject: &AdminUpstreamSubject,
    account_id: i64,
) -> DomainResult<()> {
    let exists = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS (
            SELECT 1 FROM ai_upstream_account
            WHERE tenant_id = $1 AND organization_id = $2
              AND id = $3 AND deleted_at IS NULL
        )
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(account_id)
    .fetch_one(pool)
    .await
    .map_err(|error| store_error("failed to verify upstream account", error))?;
    if !exists {
        return Err(not_found("upstream account"));
    }
    Ok(())
}

async fn get_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    account_id: i64,
) -> DomainResult<Option<AdminUpstreamAccountItem>> {
    let sql = format!(
        r#"
        SELECT {ACCOUNT_COLUMNS}
        FROM ai_upstream_account
        WHERE tenant_id = $1 AND organization_id = $2
          AND id = $3 AND deleted_at IS NULL
        "#
    );
    sqlx::query(&sql)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(account_id)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|error| store_error("failed to reload upstream account", error))?
        .map(map_account_row)
        .transpose()
}

async fn get_credential_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    account_id: i64,
    credential_id: i64,
) -> DomainResult<Option<AdminUpstreamAccountCredentialItem>> {
    let sql = format!(
        r#"
        SELECT {CREDENTIAL_COLUMNS}
        FROM ai_upstream_account_credential
        WHERE tenant_id = $1 AND organization_id = $2
          AND account_id = $3 AND id = $4 AND deleted_at IS NULL
        "#
    );
    sqlx::query(&sql)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(account_id)
        .bind(credential_id)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|error| store_error("failed to reload upstream account credential", error))?
        .map(map_credential_row)
        .transpose()
}

fn validate_account_command(command: &SaveAdminUpstreamAccountCommand) -> DomainResult<()> {
    if command.account_code.trim().is_empty() || command.account_name.trim().is_empty() {
        return Err(DomainError::new("accountCode and accountName are required"));
    }
    if command.auth_method_code.trim().is_empty() {
        return Err(DomainError::new("authMethodCode is required"));
    }
    if command
        .contract_cost_multiplier
        .trim()
        .parse::<f64>()
        .ok()
        .is_none_or(|value| !value.is_finite() || value <= 0.0)
    {
        return Err(DomainError::new(
            "contractCostMultiplier must be a positive decimal",
        ));
    }
    if command.rpm_limit.is_some_and(|value| value < 0) {
        return Err(DomainError::new("rpmLimit must be non-negative"));
    }
    if command.timeout_ms.is_some_and(|value| value <= 0) {
        return Err(DomainError::new("timeoutMs must be positive"));
    }
    Ok(())
}

fn map_account_row(row: PgRow) -> DomainResult<AdminUpstreamAccountItem> {
    Ok(AdminUpstreamAccountItem {
        id: column(&row, "id", "failed to map upstream account id")?,
        uuid: column(&row, "uuid", "failed to map upstream account uuid")?,
        supplier_id: column(
            &row,
            "supplier_id",
            "failed to map upstream account supplier id",
        )?,
        supplier_code: column(
            &row,
            "supplier_code",
            "failed to map upstream account supplier code",
        )?,
        preferred_endpoint_id: column(
            &row,
            "preferred_endpoint_id",
            "failed to map upstream account preferred endpoint",
        )?,
        account_code: column(&row, "account_code", "failed to map upstream account code")?,
        account_name: column(&row, "account_name", "failed to map upstream account name")?,
        account_type: column(&row, "account_type", "failed to map upstream account type")?,
        auth_method_code: column(
            &row,
            "auth_method_code",
            "failed to map upstream account auth method",
        )?,
        external_account_id: column(
            &row,
            "external_account_id",
            "failed to map upstream external account id",
        )?,
        environment: column(
            &row,
            "environment",
            "failed to map upstream account environment",
        )?,
        region_code: column(&row, "region_code", "failed to map upstream account region")?,
        quota_limit: column(
            &row,
            "quota_limit",
            "failed to map upstream account quota limit",
        )?,
        quota_used: column(
            &row,
            "quota_used",
            "failed to map upstream account quota used",
        )?,
        upstream_balance_amount: column(
            &row,
            "upstream_balance_amount",
            "failed to map upstream account balance",
        )?,
        upstream_balance_currency: column(
            &row,
            "upstream_balance_currency",
            "failed to map upstream account balance currency",
        )?,
        contract_cost_multiplier: column(
            &row,
            "contract_cost_multiplier",
            "failed to map upstream account cost multiplier",
        )?,
        rpm_limit: column(
            &row,
            "rpm_limit",
            "failed to map upstream account RPM limit",
        )?,
        timeout_ms: column(&row, "timeout_ms", "failed to map upstream account timeout")?,
        health_status: column(
            &row,
            "health_status",
            "failed to map upstream account health status",
        )?,
        status: column(&row, "status", "failed to map upstream account status")?,
        version: column(&row, "version", "failed to map upstream account version")?,
        updated_at: column(
            &row,
            "updated_at",
            "failed to map upstream account updated time",
        )?,
    })
}

fn map_credential_row(row: PgRow) -> DomainResult<AdminUpstreamAccountCredentialItem> {
    Ok(AdminUpstreamAccountCredentialItem {
        id: column(&row, "id", "failed to map upstream credential id")?,
        auth_method_code: column(
            &row,
            "auth_method_code",
            "failed to map upstream credential auth method",
        )?,
        credential_name: column(
            &row,
            "credential_name",
            "failed to map upstream credential name",
        )?,
        masked_label: column(
            &row,
            "masked_label",
            "failed to map upstream credential masked label",
        )?,
        credential_version: column(
            &row,
            "credential_version",
            "failed to map upstream credential version",
        )?,
        priority: column(
            &row,
            "priority",
            "failed to map upstream credential priority",
        )?,
        is_active: column(
            &row,
            "is_active",
            "failed to map upstream credential active state",
        )?,
        expires_at: column(
            &row,
            "expires_at",
            "failed to map upstream credential expiry",
        )?,
        last_rotated_at: column(
            &row,
            "last_rotated_at",
            "failed to map upstream credential rotation time",
        )?,
        last_verified_at: column(
            &row,
            "last_verified_at",
            "failed to map upstream credential verification time",
        )?,
        last_used_at: column(
            &row,
            "last_used_at",
            "failed to map upstream credential use time",
        )?,
        status: column(&row, "status", "failed to map upstream credential status")?,
    })
}
