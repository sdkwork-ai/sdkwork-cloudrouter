use std::collections::HashSet;

use sqlx::postgres::PgRow;
use sqlx::{PgPool, Postgres, Transaction};
use url::Url;

use super::shared::{
    column, conflict, ensure_bounded_collection, generated_uuid, store_error, DEFAULT_DATA_SCOPE,
    MAX_NESTED_ITEMS,
};
use super::supplier;
use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::ports::{
    AdminUpstreamSubject, AdminUpstreamSupplierAuthMethodInput, AdminUpstreamSupplierAuthMethodItem,
};

const AUTH_COLUMNS: &str = r#"
    id, auth_method_code, auth_method_name, auth_type, config_schema,
    authorization_url, token_url, scopes, priority, status
"#;

pub(super) async fn list(
    pool: &PgPool,
    subject: AdminUpstreamSubject,
    supplier_id: i64,
) -> DomainResult<Vec<AdminUpstreamSupplierAuthMethodItem>> {
    let sql = format!(
        r#"
        SELECT {AUTH_COLUMNS}
        FROM ai_upstream_supplier_auth_method
        WHERE tenant_id = $1 AND organization_id = $2
          AND supplier_id = $3 AND deleted_at IS NULL
        ORDER BY priority ASC, id ASC
        LIMIT {MAX_NESTED_ITEMS}
        "#
    );
    let rows = sqlx::query(&sql)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(supplier_id)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to list upstream supplier auth methods", error))?;
    rows.into_iter().map(map_row).collect()
}

pub(super) async fn replace(
    pool: &PgPool,
    subject: AdminUpstreamSubject,
    supplier_id: i64,
    expected_version: i64,
    items: Vec<AdminUpstreamSupplierAuthMethodInput>,
    requested_at: String,
) -> DomainResult<Vec<AdminUpstreamSupplierAuthMethodItem>> {
    validate_inputs(&items)?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin upstream auth replacement", error))?;
    let supplier_code =
        supplier::lock_for_nested(&mut tx, &subject, supplier_id, expected_version).await?;
    let method_codes = items
        .iter()
        .map(|item| item.auth_method_code.trim().to_owned())
        .collect::<Vec<_>>();
    ensure_removed_methods_are_unused(&mut tx, &subject, supplier_id, &method_codes).await?;

    for item in &items {
        let method_id = next_claw_runtime_id("upstream supplier auth method")?;
        sqlx::query(
            r#"
            INSERT INTO ai_upstream_supplier_auth_method (
                id, uuid, tenant_id, organization_id, data_scope, status,
                created_at, updated_at, version, metadata,
                supplier_id, supplier_code, auth_method_code, auth_method_name,
                auth_type, config_schema, authorization_url, token_url, scopes, priority
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7::timestamptz, $7::timestamptz, 0, '{}'::jsonb,
                $8, $9, $10, $11,
                $12, $13::jsonb, $14, $15, $16::jsonb, $17
            )
            ON CONFLICT (tenant_id, organization_id, supplier_id, auth_method_code)
            DO UPDATE SET
                auth_method_name = EXCLUDED.auth_method_name,
                auth_type = EXCLUDED.auth_type,
                config_schema = EXCLUDED.config_schema,
                authorization_url = EXCLUDED.authorization_url,
                token_url = EXCLUDED.token_url,
                scopes = EXCLUDED.scopes,
                priority = EXCLUDED.priority,
                status = EXCLUDED.status,
                deleted_at = NULL,
                deleted_by = NULL,
                version = ai_upstream_supplier_auth_method.version + 1,
                updated_at = EXCLUDED.updated_at
            "#,
        )
        .bind(method_id)
        .bind(generated_uuid())
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(DEFAULT_DATA_SCOPE)
        .bind(item.status)
        .bind(&requested_at)
        .bind(supplier_id)
        .bind(&supplier_code)
        .bind(item.auth_method_code.trim())
        .bind(item.auth_method_name.trim())
        .bind(item.auth_type.trim())
        .bind(item.config_schema.to_string())
        .bind(item.authorization_url.as_deref().map(str::trim))
        .bind(item.token_url.as_deref().map(str::trim))
        .bind(item.scopes.as_ref().map(serde_json::Value::to_string))
        .bind(item.priority)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("failed to upsert upstream supplier auth method", error))?;
    }

    retire_omitted(&mut tx, &subject, supplier_id, &method_codes, &requested_at).await?;
    supplier::bump_nested_version(
        &mut tx,
        &subject,
        supplier_id,
        expected_version,
        &requested_at,
    )
    .await?;
    let result = list_in_transaction(&mut tx, &subject, supplier_id).await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit upstream auth replacement", error))?;
    Ok(result)
}

async fn ensure_removed_methods_are_unused(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    supplier_id: i64,
    retained_codes: &[String],
) -> DomainResult<()> {
    let count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM ai_upstream_account
        WHERE tenant_id = $1 AND organization_id = $2
          AND supplier_id = $3 AND deleted_at IS NULL
          AND NOT (auth_method_code = ANY($4::text[]))
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(supplier_id)
    .bind(retained_codes)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to inspect upstream auth method references", error))?;
    if count > 0 {
        return Err(conflict(
            "an authentication method selected by an active upstream account cannot be removed",
        ));
    }
    Ok(())
}

async fn retire_omitted(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    supplier_id: i64,
    retained_codes: &[String],
    requested_at: &str,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE ai_upstream_supplier_auth_method
        SET deleted_at = $1::timestamptz,
            deleted_by = $2,
            status = 0,
            version = version + 1,
            updated_at = $1::timestamptz
        WHERE tenant_id = $3 AND organization_id = $4
          AND supplier_id = $5 AND deleted_at IS NULL
          AND NOT (auth_method_code = ANY($6::text[]))
        "#,
    )
    .bind(requested_at)
    .bind(subject.operator_id)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(supplier_id)
    .bind(retained_codes)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to retire omitted supplier auth methods", error))?;
    Ok(())
}

async fn list_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    subject: &AdminUpstreamSubject,
    supplier_id: i64,
) -> DomainResult<Vec<AdminUpstreamSupplierAuthMethodItem>> {
    let sql = format!(
        r#"
        SELECT {AUTH_COLUMNS}
        FROM ai_upstream_supplier_auth_method
        WHERE tenant_id = $1 AND organization_id = $2
          AND supplier_id = $3 AND deleted_at IS NULL
        ORDER BY priority ASC, id ASC
        LIMIT {MAX_NESTED_ITEMS}
        "#
    );
    let rows = sqlx::query(&sql)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(supplier_id)
        .fetch_all(&mut **tx)
        .await
        .map_err(|error| store_error("failed to reload upstream supplier auth methods", error))?;
    rows.into_iter().map(map_row).collect()
}

fn validate_inputs(items: &[AdminUpstreamSupplierAuthMethodInput]) -> DomainResult<()> {
    ensure_bounded_collection(items, "authMethods")?;
    let mut codes = HashSet::with_capacity(items.len());
    for item in items {
        let code = item.auth_method_code.trim();
        if code.is_empty() || !codes.insert(code.to_owned()) {
            return Err(DomainError::new(
                "authMethodCode is required and must be unique within a supplier",
            ));
        }
        if item.auth_method_name.trim().is_empty() {
            return Err(DomainError::new("authMethodName is required"));
        }
        if !matches!(
            item.auth_type.as_str(),
            "api_key"
                | "bearer_token"
                | "oauth2_client_credentials"
                | "oauth2_authorization_code"
                | "aws_sigv4"
                | "custom"
        ) {
            return Err(DomainError::new("authType is not supported"));
        }
        if !item.config_schema.is_object() {
            return Err(DomainError::new("configSchema must be a JSON object"));
        }
        if item.scopes.as_ref().is_some_and(|value| !value.is_array()) {
            return Err(DomainError::new("scopes must be a JSON array"));
        }
        validate_https_url(item.authorization_url.as_deref(), "authorizationUrl")?;
        validate_https_url(item.token_url.as_deref(), "tokenUrl")?;
        if matches!(
            item.auth_type.as_str(),
            "oauth2_client_credentials" | "oauth2_authorization_code"
        ) && item
            .token_url
            .as_deref()
            .is_none_or(|value| value.trim().is_empty())
        {
            return Err(DomainError::new(
                "tokenUrl is required for OAuth2 authentication methods",
            ));
        }
        if item.auth_type == "oauth2_authorization_code"
            && item
                .authorization_url
                .as_deref()
                .is_none_or(|value| value.trim().is_empty())
        {
            return Err(DomainError::new(
                "authorizationUrl is required for OAuth2 authorization code methods",
            ));
        }
        if item.priority < 0 {
            return Err(DomainError::new(
                "auth method priority must be non-negative",
            ));
        }
    }
    Ok(())
}

fn validate_https_url(value: Option<&str>, field: &str) -> DomainResult<()> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(());
    };
    let url = Url::parse(value)
        .map_err(|_| DomainError::new(format!("{field} must be an absolute URL")))?;
    if url.scheme() != "https" {
        return Err(DomainError::new(format!("{field} must use HTTPS")));
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err(DomainError::new(format!(
            "{field} must not contain embedded credentials"
        )));
    }
    Ok(())
}

fn map_row(row: PgRow) -> DomainResult<AdminUpstreamSupplierAuthMethodItem> {
    Ok(AdminUpstreamSupplierAuthMethodItem {
        id: column(&row, "id", "failed to map upstream auth method id")?,
        auth_method_code: column(
            &row,
            "auth_method_code",
            "failed to map upstream auth method code",
        )?,
        auth_method_name: column(
            &row,
            "auth_method_name",
            "failed to map upstream auth method name",
        )?,
        auth_type: column(&row, "auth_type", "failed to map upstream auth method type")?,
        config_schema: column(
            &row,
            "config_schema",
            "failed to map upstream auth method config schema",
        )?,
        authorization_url: column(
            &row,
            "authorization_url",
            "failed to map upstream auth method authorization URL",
        )?,
        token_url: column(
            &row,
            "token_url",
            "failed to map upstream auth method token URL",
        )?,
        scopes: column(&row, "scopes", "failed to map upstream auth method scopes")?,
        priority: column(
            &row,
            "priority",
            "failed to map upstream auth method priority",
        )?,
        status: column(&row, "status", "failed to map upstream auth method status")?,
    })
}
