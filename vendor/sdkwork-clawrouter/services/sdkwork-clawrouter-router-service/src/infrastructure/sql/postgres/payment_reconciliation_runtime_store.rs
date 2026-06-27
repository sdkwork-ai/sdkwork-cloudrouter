use sqlx::{PgPool, Row};

use crate::application::{
    PaymentReconciliationItemRecord, PaymentReconciliationRuntimeStore,
    PaymentReconciliationRuntimeStoreFuture, PaymentStatementItemRecord, PaymentStatementRecord,
};
use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::store_error::redacted_store_error;

#[derive(Debug, Clone)]
pub struct PostgresPaymentReconciliationRuntimeStore {
    pool: PgPool,
}

impl PostgresPaymentReconciliationRuntimeStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl PaymentReconciliationRuntimeStore for PostgresPaymentReconciliationRuntimeStore {
    fn load_statement_by_idempotency(
        &self,
        tenant_id: String,
        idempotency_key: String,
    ) -> PaymentReconciliationRuntimeStoreFuture<'_, Option<PaymentStatementRecord>> {
        let pool = self.pool.clone();
        Box::pin(
            async move { load_statement_by_idempotency(&pool, &tenant_id, &idempotency_key).await },
        )
    }

    fn load_statement_items(
        &self,
        tenant_id: String,
        statement_id: String,
    ) -> PaymentReconciliationRuntimeStoreFuture<'_, Vec<PaymentStatementItemRecord>> {
        let pool = self.pool.clone();
        Box::pin(async move { load_statement_items(&pool, &tenant_id, &statement_id).await })
    }

    fn insert_statement(
        &self,
        statement: PaymentStatementRecord,
        items: Vec<PaymentStatementItemRecord>,
    ) -> PaymentReconciliationRuntimeStoreFuture<'_, PaymentStatementRecord> {
        let pool = self.pool.clone();
        Box::pin(async move { insert_statement(&pool, statement, items).await })
    }

    fn insert_reconciliation_items(
        &self,
        items: Vec<PaymentReconciliationItemRecord>,
    ) -> PaymentReconciliationRuntimeStoreFuture<'_, Vec<PaymentReconciliationItemRecord>> {
        let pool = self.pool.clone();
        Box::pin(async move { insert_reconciliation_items(&pool, items).await })
    }
}

async fn load_statement_by_idempotency(
    pool: &PgPool,
    tenant_id: &str,
    idempotency_key: &str,
) -> DomainResult<Option<PaymentStatementRecord>> {
    let row = sqlx::query(
        r#"
        SELECT id, tenant_id, organization_id, statement_no, provider_code, provider_account_id,
               statement_type, settlement_currency, period_start, period_end, provider_statement_id,
               file_ref, file_digest, download_status, parse_status, row_count, total_amount,
               fee_amount, net_amount, downloaded_at, parsed_at, request_no, idempotency_key,
               created_at, updated_at
        FROM commerce_payment_statement
        WHERE tenant_id = $1
          AND idempotency_key = $2
        LIMIT 1
        "#,
    )
    .bind(tenant_id)
    .bind(idempotency_key)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("failed to load payment statement by idempotency", error))?;
    row.map(|row| statement_from_row(&row)).transpose()
}

async fn load_statement_items(
    pool: &PgPool,
    tenant_id: &str,
    statement_id: &str,
) -> DomainResult<Vec<PaymentStatementItemRecord>> {
    let rows = sqlx::query(
        r#"
        SELECT id, tenant_id, organization_id, statement_id, provider_code, provider_account_id,
               row_no, native_trade_id, native_refund_id, native_order_no, sdkwork_out_trade_no,
               sdkwork_out_refund_no, transaction_type, occurred_at, settled_at, gross_amount,
               fee_amount, net_amount, currency_code, provider_status, raw_row_digest,
               metadata_json, created_at
        FROM commerce_payment_statement_item
        WHERE tenant_id = $1
          AND statement_id = $2
        ORDER BY row_no, id
        "#,
    )
    .bind(tenant_id)
    .bind(statement_id)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to load payment statement items", error))?;
    rows.iter().map(statement_item_from_row).collect()
}

async fn insert_statement(
    pool: &PgPool,
    statement: PaymentStatementRecord,
    items: Vec<PaymentStatementItemRecord>,
) -> DomainResult<PaymentStatementRecord> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin payment statement transaction", error))?;
    sqlx::query(
        r#"
        INSERT INTO commerce_payment_statement
            (id, tenant_id, organization_id, statement_no, provider_code, provider_account_id,
             statement_type, settlement_currency, period_start, period_end, provider_statement_id,
             file_ref, file_digest, download_status, parse_status, row_count, total_amount,
             fee_amount, net_amount, downloaded_at, parsed_at, request_no, idempotency_key,
             created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
             $17, $18, $19, $20, $21, $22, $23, $24, $25)
        "#,
    )
    .bind(&statement.id)
    .bind(&statement.tenant_id)
    .bind(statement.organization_id.as_deref())
    .bind(&statement.statement_no)
    .bind(&statement.provider_code)
    .bind(statement.provider_account_id.as_deref())
    .bind(&statement.statement_type)
    .bind(&statement.settlement_currency)
    .bind(&statement.period_start)
    .bind(&statement.period_end)
    .bind(statement.provider_statement_id.as_deref())
    .bind(statement.file_ref.as_deref())
    .bind(&statement.file_digest)
    .bind(&statement.download_status)
    .bind(&statement.parse_status)
    .bind(statement.row_count)
    .bind(&statement.total_amount)
    .bind(&statement.fee_amount)
    .bind(&statement.net_amount)
    .bind(statement.downloaded_at.as_deref())
    .bind(statement.parsed_at.as_deref())
    .bind(&statement.request_no)
    .bind(&statement.idempotency_key)
    .bind(&statement.created_at)
    .bind(&statement.updated_at)
    .execute(&mut *tx)
    .await
    .map_err(|error| store_error("failed to insert payment statement", error))?;

    for item in &items {
        sqlx::query(
            r#"
            INSERT INTO commerce_payment_statement_item
                (id, tenant_id, organization_id, statement_id, provider_code, provider_account_id,
                 row_no, native_trade_id, native_refund_id, native_order_no, sdkwork_out_trade_no,
                 sdkwork_out_refund_no, transaction_type, occurred_at, settled_at, gross_amount,
                 fee_amount, net_amount, currency_code, provider_status, raw_row_digest,
                 metadata_json, created_at)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                 $16, $17, $18, $19, $20, $21, $22, $23)
            "#,
        )
        .bind(&item.id)
        .bind(&item.tenant_id)
        .bind(item.organization_id.as_deref())
        .bind(&item.statement_id)
        .bind(&item.provider_code)
        .bind(item.provider_account_id.as_deref())
        .bind(&item.row_no)
        .bind(item.native_trade_id.as_deref())
        .bind(item.native_refund_id.as_deref())
        .bind(item.native_order_no.as_deref())
        .bind(item.sdkwork_out_trade_no.as_deref())
        .bind(item.sdkwork_out_refund_no.as_deref())
        .bind(&item.transaction_type)
        .bind(&item.occurred_at)
        .bind(item.settled_at.as_deref())
        .bind(&item.gross_amount)
        .bind(&item.fee_amount)
        .bind(&item.net_amount)
        .bind(&item.currency_code)
        .bind(&item.provider_status)
        .bind(&item.raw_row_digest)
        .bind(item.metadata_json.to_string())
        .bind(&item.created_at)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("failed to insert payment statement item", error))?;
    }
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit payment statement transaction", error))?;
    Ok(statement)
}

async fn insert_reconciliation_items(
    pool: &PgPool,
    items: Vec<PaymentReconciliationItemRecord>,
) -> DomainResult<Vec<PaymentReconciliationItemRecord>> {
    let mut tx = pool.begin().await.map_err(|error| {
        store_error("failed to begin payment reconciliation transaction", error)
    })?;
    for item in &items {
        sqlx::query(
            r#"
            INSERT INTO commerce_payment_reconciliation_item
                (id, tenant_id, organization_id, reconciliation_run_id, statement_id, statement_item_id,
                 payment_attempt_id, refund_id, refund_attempt_id, provider_code, difference_type,
                 match_status, internal_amount, provider_amount, difference_amount, currency_code,
                 internal_status, provider_status, resolution_status, resolution_note, resolved_by,
                 resolved_at, created_at, updated_at)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                 $16, $17, $18, $19, $20, $21, $22, $23, $24)
            "#,
        )
        .bind(&item.id)
        .bind(&item.tenant_id)
        .bind(item.organization_id.as_deref())
        .bind(&item.reconciliation_run_id)
        .bind(&item.statement_id)
        .bind(item.statement_item_id.as_deref())
        .bind(item.payment_attempt_id.as_deref())
        .bind(item.refund_id.as_deref())
        .bind(item.refund_attempt_id.as_deref())
        .bind(&item.provider_code)
        .bind(item.difference_type.as_str())
        .bind(&item.match_status)
        .bind(item.internal_amount.as_deref())
        .bind(item.provider_amount.as_deref())
        .bind(item.difference_amount.as_deref())
        .bind(item.currency_code.as_deref())
        .bind(item.internal_status.as_deref())
        .bind(item.provider_status.as_deref())
        .bind(&item.resolution_status)
        .bind(item.resolution_note.as_deref())
        .bind(item.resolved_by.as_deref())
        .bind(item.resolved_at.as_deref())
        .bind(&item.created_at)
        .bind(&item.updated_at)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("failed to insert payment reconciliation item", error))?;
    }
    tx.commit().await.map_err(|error| {
        store_error("failed to commit payment reconciliation transaction", error)
    })?;
    Ok(items)
}

fn statement_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<PaymentStatementRecord> {
    Ok(PaymentStatementRecord {
        id: string_cell(row, "id"),
        tenant_id: string_cell(row, "tenant_id"),
        organization_id: optional_string_cell(row, "organization_id"),
        statement_no: string_cell(row, "statement_no"),
        provider_code: string_cell(row, "provider_code"),
        provider_account_id: optional_string_cell(row, "provider_account_id"),
        statement_type: string_cell(row, "statement_type"),
        settlement_currency: string_cell(row, "settlement_currency"),
        period_start: string_cell(row, "period_start"),
        period_end: string_cell(row, "period_end"),
        provider_statement_id: optional_string_cell(row, "provider_statement_id"),
        file_ref: optional_string_cell(row, "file_ref"),
        file_digest: optional_string_cell(row, "file_digest").unwrap_or_default(),
        download_status: string_cell(row, "download_status"),
        parse_status: string_cell(row, "parse_status"),
        row_count: row
            .try_get::<i64, _>("row_count")
            .map_err(|error| store_error("failed to read statement row_count", error))?,
        total_amount: string_cell(row, "total_amount"),
        fee_amount: string_cell(row, "fee_amount"),
        net_amount: string_cell(row, "net_amount"),
        downloaded_at: optional_string_cell(row, "downloaded_at"),
        parsed_at: optional_string_cell(row, "parsed_at"),
        request_no: string_cell(row, "request_no"),
        idempotency_key: string_cell(row, "idempotency_key"),
        created_at: string_cell(row, "created_at"),
        updated_at: string_cell(row, "updated_at"),
    })
}

fn statement_item_from_row(
    row: &sqlx::postgres::PgRow,
) -> DomainResult<PaymentStatementItemRecord> {
    let metadata_json = optional_string_cell(row, "metadata_json")
        .and_then(|value| serde_json::from_str(&value).ok())
        .unwrap_or(serde_json::Value::Null);
    Ok(PaymentStatementItemRecord {
        id: string_cell(row, "id"),
        tenant_id: string_cell(row, "tenant_id"),
        organization_id: optional_string_cell(row, "organization_id"),
        statement_id: string_cell(row, "statement_id"),
        provider_code: string_cell(row, "provider_code"),
        provider_account_id: optional_string_cell(row, "provider_account_id"),
        row_no: string_cell(row, "row_no"),
        native_trade_id: optional_string_cell(row, "native_trade_id"),
        native_refund_id: optional_string_cell(row, "native_refund_id"),
        native_order_no: optional_string_cell(row, "native_order_no"),
        sdkwork_out_trade_no: optional_string_cell(row, "sdkwork_out_trade_no"),
        sdkwork_out_refund_no: optional_string_cell(row, "sdkwork_out_refund_no"),
        transaction_type: string_cell(row, "transaction_type"),
        occurred_at: string_cell(row, "occurred_at"),
        settled_at: optional_string_cell(row, "settled_at"),
        gross_amount: string_cell(row, "gross_amount"),
        fee_amount: string_cell(row, "fee_amount"),
        net_amount: string_cell(row, "net_amount"),
        currency_code: string_cell(row, "currency_code"),
        provider_status: string_cell(row, "provider_status"),
        raw_row_digest: string_cell(row, "raw_row_digest"),
        metadata_json,
        created_at: string_cell(row, "created_at"),
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
