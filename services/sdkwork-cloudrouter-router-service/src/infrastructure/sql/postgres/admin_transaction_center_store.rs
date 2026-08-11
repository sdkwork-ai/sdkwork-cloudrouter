use sqlx::{PgPool, Row};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::model_catalog_import::stable_uuid;
use crate::infrastructure::sql::runtime_id::next_cloud_runtime_id;
use crate::ports::{
    AdminTransactionCenterFuture, AdminTransactionCenterStore, AdminTransactionCollection,
    AdminTransactionJsonRecord, ListAdminTransactionRecordsQuery, UpdatePaymentProviderCommand,
};

const PAYMENT_PROVIDER_AUDIT_TARGET: i32 = 2201;

#[derive(Debug, Clone)]
pub struct PostgresAdminTransactionCenterStore {
    pool: PgPool,
}

impl PostgresAdminTransactionCenterStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminTransactionCenterStore for PostgresAdminTransactionCenterStore {
    fn list_payment_providers<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move { list_payment_providers(&self.pool, query).await })
    }

    fn list_payment_provider_accounts<'a>(
        &'a self,
        query: ListAdminTransactionRecordsQuery,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionCollection> {
        Box::pin(async move { list_payment_provider_accounts(&self.pool, query).await })
    }

    fn update_payment_provider<'a>(
        &'a self,
        command: UpdatePaymentProviderCommand,
    ) -> AdminTransactionCenterFuture<'a, AdminTransactionJsonRecord> {
        Box::pin(async move { update_payment_provider(&self.pool, command).await })
    }
}

async fn list_payment_providers(
    pool: &PgPool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let rows = sqlx::query(
        r#"
        SELECT json_build_object(
            'id', id,
            'providerCode', provider_code,
            'displayName', display_name,
            'displayNameI18n', display_name_i18n,
            'providerType', provider_type,
            'supportedCountries', COALESCE(NULLIF(supported_countries::text, '')::json, '[]'::json),
            'supportedCurrencies', COALESCE(NULLIF(supported_currencies::text, '')::json, '[]'::json),
            'capabilities', '["payment_intent","payment_query","payment_close","refund","webhook","reconciliation"]'::json,
            'status', status,
            'sortOrder', sort_order,
            'createdAt', created_at,
            'updatedAt', updated_at
        ) AS item,
        COUNT(*) OVER() AS total
        FROM commerce_payment_provider
        WHERE tenant_id IN (CAST($1 AS TEXT), '0')
          AND (organization_id = CAST($2 AS TEXT) OR organization_id = '0')
          AND (CAST($3 AS TEXT) IS NULL OR status = CAST($3 AS TEXT))
          AND (CAST($4 AS TEXT) IS NULL OR provider_code = CAST($4 AS TEXT))
        ORDER BY
            CASE
                WHEN tenant_id = CAST($1 AS TEXT) AND organization_id = CAST($2 AS TEXT) THEN 0
                ELSE 1
            END ASC,
            sort_order ASC,
            updated_at DESC NULLS LAST,
            id DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.supplier_code.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, &query)
}

async fn update_payment_provider(
    pool: &PgPool,
    command: UpdatePaymentProviderCommand,
) -> DomainResult<AdminTransactionJsonRecord> {
    let result = sqlx::query(
        r#"
        UPDATE commerce_payment_provider
        SET display_name = COALESCE($4, display_name),
            display_name_i18n = COALESCE($5::jsonb, display_name_i18n),
            sort_order = COALESCE($6, sort_order),
            status = COALESCE($7, status),
            updated_at = now()
        WHERE tenant_id IN (CAST($1 AS TEXT), '0')
          AND (organization_id = CAST($2 AS TEXT) OR organization_id = '0')
          AND id = CAST($3 AS TEXT)
          AND deleted_at IS NULL
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.provider_id)
    .bind(command.display_name.as_deref())
    .bind(command.display_name_i18n.as_ref().map(json_text))
    .bind(command.sort_order)
    .bind(command.status.as_deref())
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to update payment provider", error))?;
    ensure_affected(result.rows_affected(), "payment provider was not found")?;
    insert_provider_update_audit(pool, &command).await?;
    load_payment_provider(pool, command.subject, &command.provider_id).await
}

/// Idempotent audit trail for provider edits: a stable uuid derived from the
/// subject, provider, request id, and reason keeps replays from writing
/// duplicate rows while still recording every distinct operator mutation.
async fn insert_provider_update_audit(
    pool: &PgPool,
    command: &UpdatePaymentProviderCommand,
) -> DomainResult<()> {
    let change_summary = provider_update_change_summary(command);
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (uuid, tenant_id, organization_id, request_id, operator_id, operator_type,
             action, target_type, target_uuid, change_summary, created_at, id)
        SELECT
            $1, $2, $3, $4, $5, $6, 'payments.provider.update', $7, $8, $9::jsonb, now(), $10
        WHERE NOT EXISTS (
            SELECT 1::bigint
            FROM ops_audit_log
            WHERE tenant_id = $11
              AND organization_id = $12
              AND action = 'payments.provider.update'
              AND target_uuid = $13
              AND request_id = $14
        )
        "#,
    )
    .bind(stable_uuid(
        "payments-provider-update",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            &command.provider_id,
            request_id_or(&command.request_id, "provider-update"),
            &command.reason,
        ],
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.request_id.as_deref())
    .bind(command.subject.operator_id)
    .bind(command.subject.operator_type)
    .bind(PAYMENT_PROVIDER_AUDIT_TARGET)
    .bind(&command.provider_id)
    .bind(json_text(&change_summary))
    .bind(next_cloud_runtime_id("ops_audit_log")?)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.provider_id)
    .bind(command.request_id.as_deref())
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to write payment provider audit log", error))?;
    Ok(())
}

fn provider_update_change_summary(command: &UpdatePaymentProviderCommand) -> serde_json::Value {
    let mut object = serde_json::Map::new();
    if let Some(display_name) = &command.display_name {
        object.insert(
            "displayName".to_owned(),
            serde_json::Value::String(display_name.clone()),
        );
    }
    if let Some(display_name_i18n) = &command.display_name_i18n {
        object.insert("displayNameI18n".to_owned(), display_name_i18n.clone());
    }
    if let Some(sort_order) = command.sort_order {
        object.insert("sortOrder".to_owned(), serde_json::json!(sort_order));
    }
    if let Some(status) = &command.status {
        object.insert("status".to_owned(), serde_json::Value::String(status.clone()));
    }
    object.insert(
        "reason".to_owned(),
        serde_json::Value::String(command.reason.clone()),
    );
    serde_json::Value::Object(object)
}

async fn load_payment_provider(
    pool: &PgPool,
    subject: crate::ports::AdminTransactionCenterSubject,
    provider_id: &str,
) -> DomainResult<AdminTransactionJsonRecord> {
    let rows = sqlx::query(
        r#"
        SELECT json_build_object(
            'id', id,
            'providerCode', provider_code,
            'displayName', display_name,
            'displayNameI18n', display_name_i18n,
            'providerType', provider_type,
            'supportedCountries', COALESCE(NULLIF(supported_countries::text, '')::json, '[]'::json),
            'supportedCurrencies', COALESCE(NULLIF(supported_currencies::text, '')::json, '[]'::json),
            'capabilities', '["payment_intent","payment_query","payment_close","refund","webhook","reconciliation"]'::json,
            'status', status,
            'sortOrder', sort_order,
            'createdAt', created_at,
            'updatedAt', updated_at
        ) AS item
        FROM commerce_payment_provider
        WHERE tenant_id IN (CAST($1 AS TEXT), '0')
          AND (organization_id = CAST($2 AS TEXT) OR organization_id = '0')
          AND id = CAST($3 AS TEXT)
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(provider_id)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;
    let row = rows
        .into_iter()
        .next()
        .ok_or_else(|| DomainError::not_found("payment provider was not found"))?;
    json_record_cell(&row)
}

async fn list_payment_provider_accounts(
    pool: &PgPool,
    query: ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let payment_provider_accounts_sql = payment_provider_account_json_sql(
        "COUNT(*) OVER() AS total",
        r#"
        WHERE tenant_id IN (CAST($1 AS TEXT), '0')
          AND (organization_id = CAST($2 AS TEXT) OR organization_id = '0')
          AND (CAST($3 AS TEXT) IS NULL OR status = CAST($3 AS TEXT))
          AND (CAST($4 AS TEXT) IS NULL OR provider_code = CAST($4 AS TEXT))
          AND (CAST($5 AS TEXT) IS NULL OR id = CAST($5 AS TEXT) OR account_no = CAST($5 AS TEXT))
        ORDER BY
            CASE
                WHEN tenant_id = CAST($1 AS TEXT) AND organization_id = CAST($2 AS TEXT) THEN 0
                ELSE 1
            END ASC,
            updated_at DESC NULLS LAST,
            id DESC
        LIMIT $6 OFFSET $7
        "#,
    );
    let rows = sqlx::query(sqlx::AssertSqlSafe(payment_provider_accounts_sql))
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id)
        .bind(query.status.as_deref())
        .bind(query.supplier_code.as_deref())
        .bind(query.provider_account_id.as_deref())
        .bind(query.page_size)
        .bind(query.offset)
        .fetch_all(pool)
        .await
        .map_err(store_error)?;

    collection_from_rows(rows, &query)
}

fn payment_provider_account_json_sql(
    total_projection: &'static str,
    suffix: &'static str,
) -> String {
    let total_projection = if total_projection.trim().is_empty() {
        String::new()
    } else {
        format!(", {total_projection}")
    };
    format!(
        r#"
        SELECT json_build_object(
            'id', id,
            'tenant_id', tenant_id,
            'organization_id', organization_id,
            'account_no', account_no,
            'accountNo', account_no,
            'provider_code', provider_code,
            'providerCode', provider_code,
            'account_name', account_name,
            'accountName', account_name,
            'account_name_i18n', account_name_i18n,
            'accountNameI18n', account_name_i18n,
            'accountRole', (
                SELECT audit.change_summary->>'accountRole'
                FROM ops_audit_log audit
                WHERE audit.tenant_id = CAST(commerce_payment_provider_account.tenant_id AS BIGINT)
                  AND audit.organization_id = CAST(commerce_payment_provider_account.organization_id AS BIGINT)
                  AND audit.action IN ('payments.provider_account.create', 'payments.provider_account.update')
                  AND audit.target_uuid = commerce_payment_provider_account.id
                ORDER BY audit.id DESC
                LIMIT 1
            ),
            'accountMode', (
                SELECT COALESCE(audit.change_summary->>'accountMode', audit.change_summary->>'accountRole')
                FROM ops_audit_log audit
                WHERE audit.tenant_id = CAST(commerce_payment_provider_account.tenant_id AS BIGINT)
                  AND audit.organization_id = CAST(commerce_payment_provider_account.organization_id AS BIGINT)
                  AND audit.action IN ('payments.provider_account.create', 'payments.provider_account.update')
                  AND audit.target_uuid = commerce_payment_provider_account.id
                ORDER BY audit.id DESC
                LIMIT 1
            ),
            'merchant_id', merchant_id,
            'merchantId', merchant_id,
            'environment', environment,
            'country_code', country_code,
            'countryCode', country_code,
            'settlement_currency', settlement_currency,
            'settlementCurrency', settlement_currency,
            'secret_ref', secret_ref,
            'secretRef', secret_ref,
            'webhook_secret_ref', webhook_secret_ref,
            'webhookSecretRef', webhook_secret_ref,
            'certificate_ref', certificate_ref,
            'certificateRef', certificate_ref,
            'hasPrimarySecret', (secret_ref IS NOT NULL AND secret_ref <> ''),
            'hasWebhookSecret', (webhook_secret_ref IS NOT NULL AND webhook_secret_ref <> ''),
            'hasCertificate', (certificate_ref IS NOT NULL AND certificate_ref <> ''),
            'status', status,
            'rotated_at', rotated_at,
            'rotatedAt', rotated_at,
            'note', (
                SELECT audit.change_summary->>'note'
                FROM ops_audit_log audit
                WHERE audit.tenant_id = CAST(commerce_payment_provider_account.tenant_id AS BIGINT)
                  AND audit.organization_id = CAST(commerce_payment_provider_account.organization_id AS BIGINT)
                  AND audit.action IN ('payments.provider_account.create', 'payments.provider_account.update', 'payments.provider_account.status.update')
                  AND audit.target_uuid = commerce_payment_provider_account.id
                ORDER BY audit.id DESC
                LIMIT 1
            ),
            'created_at', created_at,
            'createdAt', created_at,
            'updated_at', updated_at,
            'updatedAt', updated_at
        ) AS item
        {total_projection}
        FROM commerce_payment_provider_account
        {suffix}
        "#
    )
}

fn collection_from_rows(
    rows: Vec<sqlx::postgres::PgRow>,
    query: &ListAdminTransactionRecordsQuery,
) -> DomainResult<AdminTransactionCollection> {
    let total = rows
        .first()
        .map(|row| integer_cell(row, "total"))
        .transpose()?
        .unwrap_or(0);
    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        items.push(json_record_cell(&row)?);
    }
    Ok(AdminTransactionCollection {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

fn json_record_cell(row: &sqlx::postgres::PgRow) -> DomainResult<AdminTransactionJsonRecord> {
    let value = row
        .try_get::<serde_json::Value, _>("item")
        .map_err(|error| DomainError::new(error.to_string()))?;
    match value {
        serde_json::Value::Object(record) => Ok(record),
        _ => Err(DomainError::new(
            "transaction center JSON projection was not an object",
        )),
    }
}

fn integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<i64> {
    if let Ok(value) = row.try_get::<i64, _>(column) {
        return Ok(value);
    }
    if let Ok(value) = row.try_get::<Option<i64>, _>(column) {
        return Ok(value.unwrap_or_default());
    }
    if let Ok(value) = row.try_get::<i32, _>(column) {
        return Ok(i64::from(value));
    }
    Err(DomainError::new(format!(
        "transaction center row column {column} is not readable as integer"
    )))
}

fn ensure_affected(rows_affected: u64, message: &str) -> DomainResult<()> {
    if rows_affected == 0 {
        return Err(DomainError::not_found(message));
    }
    Ok(())
}

fn request_id_or<'a>(request_id: &'a Option<String>, fallback: &'a str) -> &'a str {
    request_id.as_deref().unwrap_or(fallback)
}

fn json_text(value: &serde_json::Value) -> String {
    serde_json::to_string(value).unwrap_or_else(|_| "{}".to_owned())
}

fn write_error(context: &str, error: sqlx::Error) -> DomainError {
    DomainError::new(format!("{context}: {error}"))
}

fn store_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}
