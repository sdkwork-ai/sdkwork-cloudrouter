use sqlx::{PgPool, Row};

use crate::domain::{DomainError, DomainResult};
use crate::ports::{
    AdminTransactionCenterFuture, AdminTransactionCenterStore, AdminTransactionCollection,
    AdminTransactionJsonRecord, ListAdminTransactionRecordsQuery,
};

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

fn store_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}
