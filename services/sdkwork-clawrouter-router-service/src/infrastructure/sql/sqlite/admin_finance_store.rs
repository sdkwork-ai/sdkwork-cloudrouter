use sdkwork_contract_service::{CommercePaymentStatus, CommerceRechargeStatus};
use sdkwork_invoice_service::InvoiceStatus;
use sdkwork_payment_service::RefundStatus;
use sqlx::{Row, SqlitePool};

use crate::domain::{DecimalValue, DomainError};
use crate::ports::{
    AdminBillingRecordItem, AdminFinanceCollection, AdminFinanceReadFuture, AdminFinanceStore,
    AdminTransactionRecordItem, ListAdminBillingRecordsQuery, ListAdminTransactionsQuery,
};

const LIST_ADMIN_TRANSACTIONS: &str = r#"
WITH ledger_entries AS (
    SELECT
        CAST(l.id AS TEXT) AS id,
        CAST(l.created_at AS TEXT) AS occurred_at,
        CAST(l.owner_user_id AS TEXT) AS user_id,
        CASE
            WHEN l.business_type IN ('recharge', 'refund', 'usage', 'consume', 'redeem') THEN l.business_type
            WHEN l.direction = 'credit' THEN 'recharge'
            ELSE 'consume'
        END AS normalized_type,
        CAST(COALESCE(NULLIF(l.amount, ''), '0') AS TEXT) AS amount,
        CAST(COALESCE(NULLIF(l.balance_after, ''), '0') AS TEXT) AS balance,
        COALESCE(
            NULLIF(l.remark, ''),
            NULLIF(l.source_type, ''),
            NULLIF(l.transaction_no, ''),
            'Account ledger entry'
        ) AS description,
        l.source_type AS source_type,
        l.source_id AS source_id,
        CASE
            WHEN l.source_type = 'commerce_payment_attempt' THEN 'payment'
            WHEN l.source_type = 'commerce_refund' THEN 'refund'
            WHEN l.source_type = 'commerce_order' THEN 'order'
            ELSE 'transaction'
        END AS status_source,
        CASE
            WHEN pa.id IS NULL AND r.id IS NULL AND o.id IS NULL THEN 'success'
        END AS transaction_status,
        pa.status AS payment_status,
        r.status AS refund_status,
        o.status AS order_status,
        CASE
            WHEN pa.id IS NOT NULL THEN
                CASE
                    WHEN pa.status = 'succeeded' THEN 'success'
                    WHEN pa.status IN ('failed', 'canceled') THEN 'failed'
                    WHEN pa.status = 'pending' THEN 'pending'
                    ELSE '__unsupported__'
                END
            WHEN r.id IS NOT NULL THEN
                CASE
                    WHEN r.status = 'succeeded' THEN 'success'
                    WHEN r.status IN ('failed', 'closed') THEN 'failed'
                    WHEN r.status IN ('requested', 'processing') THEN 'pending'
                    ELSE '__unsupported__'
                END
            WHEN o.id IS NOT NULL THEN
                CASE
                    WHEN o.status IN ('paid', 'fulfilled') THEN 'success'
                    WHEN o.status = 'closed' THEN 'failed'
                    WHEN o.status = 'pending' THEN 'pending'
                    ELSE '__unsupported__'
                END
            WHEN pa.id IS NULL AND r.id IS NULL AND o.id IS NULL THEN 'success'
            ELSE '__unsupported__'
        END AS normalized_status
    FROM commerce_account_ledger_entry l
    LEFT JOIN commerce_payment_attempt pa
      ON pa.tenant_id = l.tenant_id
     AND (pa.organization_id IS NULL OR l.organization_id IS NULL OR pa.organization_id = l.organization_id)
     AND l.source_type = 'commerce_payment_attempt'
     AND pa.id = l.source_id
    LEFT JOIN commerce_refund r
      ON r.tenant_id = l.tenant_id
     AND l.source_type = 'commerce_refund'
     AND r.id = l.source_id
    LEFT JOIN commerce_order o
      ON o.tenant_id = l.tenant_id
     AND (o.organization_id IS NULL OR l.organization_id IS NULL OR o.organization_id = l.organization_id)
     AND (
        (l.source_type = 'commerce_order' AND o.id = l.source_id)
        OR (pa.id IS NOT NULL AND o.id = pa.order_id)
     )
    WHERE l.tenant_id = CAST(?1 AS TEXT)
      AND l.organization_id = CAST(?2 AS TEXT)
),
filtered_entries AS (
    SELECT *
    FROM ledger_entries
    WHERE (?3 IS NULL OR id LIKE ('%' || ?3 || '%') OR user_id LIKE ('%' || ?3 || '%') OR description LIKE ('%' || ?3 || '%'))
      AND (?4 IS NULL OR normalized_status = ?4 OR normalized_status = '__unsupported__')
      AND (?5 IS NULL OR occurred_at >= ?5)
      AND (?6 IS NULL OR occurred_at <= ?6)
)
SELECT id, occurred_at, user_id, normalized_type, amount, balance, description, source_type, source_id, status_source, transaction_status, payment_status, refund_status, order_status, normalized_status, COUNT(*) OVER() AS total
FROM filtered_entries
ORDER BY occurred_at DESC, id DESC
LIMIT ?7 OFFSET ?8
"#;

const LIST_ADMIN_BILLING_RECORDS: &str = r#"
WITH billing_entries AS (
    SELECT
        COALESCE(NULLIF(s.statement_no, ''), 'statement-' || CAST(s.id AS TEXT)) AS id,
        CAST(COALESCE(s.owner_id, pi.owner_user_id, 0) AS TEXT) AS user_id,
        COALESCE(NULLIF(s.period, ''), substr(CAST(s.period_start AS TEXT), 1, 7), '-') AS period,
        COALESCE(s.total_tokens, 0) AS total_tokens,
        CAST(COALESCE(s.total_cost, '0') AS TEXT) AS total_cost,
        s.payment_status AS payment_status_code,
        s.statement_status AS statement_status_code,
        pi.id AS invoice_id,
        pi.status AS invoice_status_code,
        CASE
            WHEN s.payment_status IS NULL OR s.statement_status IS NULL THEN '__unsupported__'
            WHEN s.payment_status NOT IN (0, 1, 2, 3, 4, 5) OR s.statement_status NOT IN (0, 1, 2, 3, 4, 5) THEN '__unsupported__'
            WHEN pi.id IS NOT NULL AND (pi.status IS NULL OR pi.status NOT IN ('draft', 'submitted', 'reviewing', 'issued', 'cancelled', 'rejected', 'voided')) THEN '__unsupported__'
            WHEN s.payment_status = 2 OR s.statement_status = 2 OR pi.status = 'issued' THEN 'paid'
            WHEN s.payment_status = 3 OR s.statement_status = 3 THEN 'overdue'
            WHEN s.payment_status IN (0, 1, 4, 5)
             AND s.statement_status IN (0, 1, 4, 5)
             AND (pi.id IS NULL OR pi.status IN ('draft', 'submitted', 'reviewing', 'cancelled', 'rejected', 'voided')) THEN 'unpaid'
            ELSE '__unsupported__'
        END AS normalized_status,
        CAST(COALESCE(s.due_at, pi.issued_at, s.period_end, s.updated_at, s.created_at) AS TEXT) AS due_date,
        CAST(COALESCE(s.period_end, s.updated_at, s.created_at) AS TEXT) AS sort_time,
        COUNT(DISTINCT us.id) AS settlement_count
    FROM commerce_statement s
    LEFT JOIN commerce_invoice pi
      ON pi.id = s.invoice_id
     AND pi.tenant_id = CAST(s.tenant_id AS TEXT)
     AND pi.organization_id = CAST(s.organization_id AS TEXT)
    LEFT JOIN commerce_settlement us
      ON us.status = 1
     AND us.tenant_id = s.tenant_id
     AND us.organization_id = s.organization_id
     AND us.created_at >= s.period_start
     AND us.created_at <= s.period_end
    WHERE s.status = 1
      AND s.tenant_id = ?1
      AND s.organization_id = ?2
    GROUP BY
        s.id,
        s.statement_no,
        s.owner_id,
        s.period,
        s.period_start,
        s.period_end,
        s.total_tokens,
        s.total_cost,
        s.payment_status,
        s.statement_status,
        s.due_at,
        s.updated_at,
        s.created_at,
        pi.id,
        pi.owner_user_id,
        pi.status,
        pi.issued_at
),
filtered_entries AS (
    SELECT *
    FROM billing_entries
    WHERE (?3 IS NULL OR id LIKE ('%' || ?3 || '%') OR user_id LIKE ('%' || ?3 || '%') OR period LIKE ('%' || ?3 || '%'))
      AND (?4 IS NULL OR normalized_status = ?4 OR normalized_status = '__unsupported__')
      AND (?5 IS NULL OR sort_time >= ?5)
      AND (?6 IS NULL OR sort_time <= ?6)
)
SELECT id, user_id, period, total_tokens, total_cost, payment_status_code, statement_status_code, invoice_id, invoice_status_code, normalized_status, due_date, COUNT(*) OVER() AS total
FROM filtered_entries
ORDER BY sort_time DESC, id DESC
LIMIT ?7 OFFSET ?8
"#;

#[derive(Debug, Clone)]
pub struct SqliteAdminFinanceStore {
    pool: SqlitePool,
}

impl SqliteAdminFinanceStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

impl AdminFinanceStore for SqliteAdminFinanceStore {
    fn list_transactions<'a>(
        &'a self,
        query: ListAdminTransactionsQuery,
    ) -> AdminFinanceReadFuture<'a, AdminFinanceCollection<AdminTransactionRecordItem>> {
        Box::pin(async move { list_transactions(&self.pool, query).await })
    }

    fn list_billing_records<'a>(
        &'a self,
        query: ListAdminBillingRecordsQuery,
    ) -> AdminFinanceReadFuture<'a, AdminFinanceCollection<AdminBillingRecordItem>> {
        Box::pin(async move { list_billing_records(&self.pool, query).await })
    }
}

async fn list_transactions(
    pool: &SqlitePool,
    query: ListAdminTransactionsQuery,
) -> Result<AdminFinanceCollection<AdminTransactionRecordItem>, DomainError> {
    let rows = sqlx::query(LIST_ADMIN_TRANSACTIONS)
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id)
        .bind(query.keyword.as_deref())
        .bind(query.status.as_deref())
        .bind(query.start_time.as_deref())
        .bind(query.end_time.as_deref())
        .bind(query.page_size)
        .bind(offset(query.page_no, query.page_size))
        .fetch_all(pool)
        .await
        .map_err(sql_error)?;

    let total = rows
        .first()
        .map(|row| integer_cell(row, "total"))
        .unwrap_or(0);
    let items = rows.into_iter().map(row_to_transaction).collect::<Result<Vec<_>, _>>()?;

    Ok(AdminFinanceCollection {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn list_billing_records(
    pool: &SqlitePool,
    query: ListAdminBillingRecordsQuery,
) -> Result<AdminFinanceCollection<AdminBillingRecordItem>, DomainError> {
    let rows = sqlx::query(LIST_ADMIN_BILLING_RECORDS)
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id)
        .bind(query.keyword.as_deref())
        .bind(query.status.as_deref())
        .bind(query.start_time.as_deref())
        .bind(query.end_time.as_deref())
        .bind(query.page_size)
        .bind(offset(query.page_no, query.page_size))
        .fetch_all(pool)
        .await
        .map_err(sql_error)?;

    let total = rows
        .first()
        .map(|row| integer_cell(row, "total"))
        .unwrap_or(0);
    let items = rows
        .into_iter()
        .map(row_to_billing_record)
        .collect::<Result<Vec<_>, _>>()?;

    Ok(AdminFinanceCollection {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

fn row_to_transaction(
    row: sqlx::sqlite::SqliteRow,
) -> Result<AdminTransactionRecordItem, DomainError> {
    let status_source = string_cell(&row, "status_source");
    let status_value = transaction_status_cell(&row, &status_source)?;
    Ok(AdminTransactionRecordItem {
        id: string_cell(&row, "id"),
        time: string_cell(&row, "occurred_at"),
        user_id: string_cell(&row, "user_id"),
        transaction_type: string_cell(&row, "normalized_type"),
        amount: decimal_string_cell(&row, "amount", 2, "admin finance transaction amount")?,
        balance: decimal_string_cell(&row, "balance", 2, "admin finance transaction balance")?,
        description: string_cell(&row, "description"),
        status: transaction_status_label(&status_source, status_value.as_deref())?.to_owned(),
    })
}

fn row_to_billing_record(
    row: sqlx::sqlite::SqliteRow,
) -> Result<AdminBillingRecordItem, DomainError> {
    let payment_status = required_billing_status_cell(&row, "payment_status_code", "payment")?;
    let statement_status =
        required_billing_status_cell(&row, "statement_status_code", "statement")?;
    let invoice_status =
        related_billing_status_cell(&row, "invoice_id", "invoice_status_code", "invoice")?;
    Ok(AdminBillingRecordItem {
        id: string_cell(&row, "id"),
        user_id: string_cell(&row, "user_id"),
        period: string_cell(&row, "period"),
        total_tokens: integer_cell(&row, "total_tokens"),
        total_cost: decimal_string_cell(&row, "total_cost", 2, "admin finance billing total cost")?,
        status: billing_status_label(payment_status, statement_status, invoice_status.as_deref())?
            .to_owned(),
        due_date: string_cell(&row, "due_date"),
    })
}

fn offset(page_no: i64, page_size: i64) -> i64 {
    (page_no - 1) * page_size
}

fn string_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> String {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .unwrap_or_default()
}

fn optional_string_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> Option<String> {
    row.try_get::<Option<String>, _>(column).ok().flatten()
}

fn integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> i64 {
    optional_integer_cell(row, column).unwrap_or(0)
}

fn optional_integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> Option<i64> {
    row.try_get::<Option<i64>, _>(column)
        .ok()
        .flatten()
        .or_else(|| string_cell(row, column).trim().parse::<i64>().ok())
}

fn transaction_status_cell(
    row: &sqlx::sqlite::SqliteRow,
    status_source: &str,
) -> Result<Option<String>, DomainError> {
    match status_source {
        "transaction" => {
            required_transaction_status_cell(row, "transaction_status", "transaction").map(Some)
        }
        "payment" => required_transaction_status_cell(row, "payment_status", "payment").map(Some),
        "refund" => required_transaction_status_cell(row, "refund_status", "refund").map(Some),
        "order" => required_transaction_status_cell(row, "order_status", "order").map(Some),
        value => Err(DomainError::new(format!(
            "unsupported admin finance transaction status source: {value}"
        ))),
    }
}

fn required_transaction_status_cell(
    row: &sqlx::sqlite::SqliteRow,
    column: &str,
    source: &str,
) -> Result<String, DomainError> {
    optional_string_cell(row, column)
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            DomainError::new(format!("missing admin finance transaction status {source}"))
        })
}

fn required_billing_status_cell(
    row: &sqlx::sqlite::SqliteRow,
    column: &str,
    source: &str,
) -> Result<i64, DomainError> {
    optional_integer_cell(row, column)
        .ok_or_else(|| DomainError::new(format!("missing admin finance billing status {source}")))
}

fn related_billing_status_cell(
    row: &sqlx::sqlite::SqliteRow,
    relation_column: &str,
    status_column: &str,
    source: &str,
) -> Result<Option<String>, DomainError> {
    if optional_string_cell(row, relation_column)
        .map(|value| value.trim().is_empty())
        .unwrap_or(true)
    {
        return Ok(None);
    }
    optional_string_cell(row, status_column)
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .map(Some)
        .ok_or_else(|| DomainError::new(format!("missing admin finance billing status {source}")))
}

fn decimal_string_cell(
    row: &sqlx::sqlite::SqliteRow,
    column: &str,
    digits: u32,
    field_name: &str,
) -> Result<String, DomainError> {
    let value = string_cell(row, column).replace(',', "");
    decimal_value_string(value.trim().trim_start_matches('$'), digits, field_name)
}

fn decimal_value_string(value: &str, digits: u32, field_name: &str) -> Result<String, DomainError> {
    DecimalValue::parse(value)
        .map(|amount| amount.to_fixed_string(digits))
        .map_err(|_| DomainError::new(format!("invalid {field_name}: {value}")))
}

fn transaction_status_label(
    source: &str,
    status: Option<&str>,
) -> Result<&'static str, DomainError> {
    let status = status.ok_or_else(|| {
        DomainError::new(format!("missing admin finance transaction status {source}"))
    })?;
    match source {
        "transaction" => ledger_status_label(status),
        "payment" => payment_status_label(status),
        "refund" => refund_status_label(status),
        "order" => order_status_label(status),
        value => Err(DomainError::new(format!(
            "unsupported admin finance transaction status source: {value}"
        ))),
    }
}

fn ledger_status_label(status: &str) -> Result<&'static str, DomainError> {
    match status {
        "success" => Ok("success"),
        value => Err(DomainError::new(format!(
            "unsupported admin finance transaction status: {value}"
        ))),
    }
}

fn payment_status_label(status: &str) -> Result<&'static str, DomainError> {
    match status.trim().to_ascii_lowercase().as_str() {
        value if value == CommercePaymentStatus::Pending.as_str() => Ok("pending"),
        value if value == CommercePaymentStatus::Succeeded.as_str() => Ok("success"),
        value if value == CommercePaymentStatus::Failed.as_str() => Ok("failed"),
        value if value == CommercePaymentStatus::Canceled.as_str() => Ok("failed"),
        value => Err(DomainError::new(format!(
            "unsupported admin finance transaction status: {value}"
        ))),
    }
}

fn refund_status_label(status: &str) -> Result<&'static str, DomainError> {
    match status.trim().to_ascii_lowercase().as_str() {
        value if value == refund_status_value(RefundStatus::Requested) => Ok("pending"),
        value if value == refund_status_value(RefundStatus::Processing) => Ok("pending"),
        value if value == refund_status_value(RefundStatus::Succeeded) => Ok("success"),
        value if value == refund_status_value(RefundStatus::Failed) => Ok("failed"),
        value if value == refund_status_value(RefundStatus::Closed) => Ok("failed"),
        value => Err(DomainError::new(format!(
            "unsupported admin finance transaction status: {value}"
        ))),
    }
}

fn order_status_label(status: &str) -> Result<&'static str, DomainError> {
    match status.trim().to_ascii_lowercase().as_str() {
        value if value == CommerceRechargeStatus::Pending.as_str() => Ok("pending"),
        value if value == CommerceRechargeStatus::Paid.as_str() => Ok("success"),
        value if value == CommerceRechargeStatus::Fulfilled.as_str() => Ok("success"),
        value if value == CommerceRechargeStatus::Closed.as_str() => Ok("failed"),
        value => Err(DomainError::new(format!(
            "unsupported admin finance transaction status: {value}"
        ))),
    }
}

fn billing_status_label(
    payment_status: i64,
    statement_status: i64,
    invoice_status: Option<&str>,
) -> Result<&'static str, DomainError> {
    ensure_usage_statement_status("payment", payment_status)?;
    ensure_usage_statement_status("statement", statement_status)?;
    let invoice_status = invoice_status.map(invoice_status_label).transpose()?;
    if payment_status == 2 || statement_status == 2 || invoice_status == Some("paid") {
        return Ok("paid");
    }
    if payment_status == 3 || statement_status == 3 {
        return Ok("overdue");
    }
    Ok("unpaid")
}

fn ensure_usage_statement_status(source: &str, status: i64) -> Result<(), DomainError> {
    if (0..=5).contains(&status) {
        Ok(())
    } else {
        Err(DomainError::new(format!(
            "unsupported admin finance billing status {source}: {status}"
        )))
    }
}

fn invoice_status_label(status: &str) -> Result<&'static str, DomainError> {
    match status.trim().to_ascii_lowercase().as_str() {
        value if value == invoice_status_value(InvoiceStatus::Issued) => Ok("paid"),
        value if value == invoice_status_value(InvoiceStatus::Draft) => Ok("unpaid"),
        value if value == invoice_status_value(InvoiceStatus::Submitted) => Ok("unpaid"),
        value if value == invoice_status_value(InvoiceStatus::Reviewing) => Ok("unpaid"),
        value if value == invoice_status_value(InvoiceStatus::Cancelled) => Ok("unpaid"),
        value if value == invoice_status_value(InvoiceStatus::Rejected) => Ok("unpaid"),
        value if value == invoice_status_value(InvoiceStatus::Voided) => Ok("unpaid"),
        value => Err(DomainError::new(format!(
            "unsupported admin finance billing status invoice: {value}"
        ))),
    }
}

fn refund_status_value(status: RefundStatus) -> &'static str {
    match status {
        RefundStatus::Requested => "requested",
        RefundStatus::Processing => "processing",
        RefundStatus::Succeeded => "succeeded",
        RefundStatus::Failed => "failed",
        RefundStatus::Closed => "closed",
    }
}

fn invoice_status_value(status: InvoiceStatus) -> &'static str {
    match status {
        InvoiceStatus::Draft => "draft",
        InvoiceStatus::Submitted => "submitted",
        InvoiceStatus::Reviewing => "reviewing",
        InvoiceStatus::Issued => "issued",
        InvoiceStatus::Cancelled => "cancelled",
        InvoiceStatus::Rejected => "rejected",
        InvoiceStatus::Voided => "voided",
    }
}

fn sql_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decimal_value_string_rejects_invalid_database_amount() {
        assert_eq!(
            "12.300000",
            decimal_value_string("12.3", 6, "admin finance amount").unwrap()
        );

        let unsupported = decimal_value_string("not-money", 2, "admin finance amount")
            .expect_err("invalid finance money must fail");
        assert!(
            unsupported
                .to_string()
                .contains("invalid admin finance amount: not-money"),
            "{unsupported}"
        );
    }

    #[test]
    fn transaction_status_label_rejects_unknown_database_status() {
        assert_eq!(
            "pending",
            transaction_status_label("payment", Some(CommercePaymentStatus::Pending.as_str()))
                .unwrap()
        );
        assert_eq!(
            "success",
            transaction_status_label("payment", Some(CommercePaymentStatus::Succeeded.as_str()))
                .unwrap()
        );
        assert_eq!(
            "failed",
            transaction_status_label("payment", Some(CommercePaymentStatus::Failed.as_str()))
                .unwrap()
        );

        let unsupported = transaction_status_label("payment", Some("unknown"))
            .expect_err("unknown transaction status must fail");
        assert!(
            unsupported
                .to_string()
                .contains("unsupported admin finance transaction status: unknown"),
            "{unsupported}"
        );
    }

    #[test]
    fn billing_status_label_rejects_unknown_database_status() {
        assert_eq!("paid", billing_status_label(2, 1, None).unwrap());
        assert_eq!("overdue", billing_status_label(3, 1, None).unwrap());
        assert_eq!("unpaid", billing_status_label(1, 1, None).unwrap());

        let unsupported =
            billing_status_label(9, 1, None).expect_err("unknown billing status must fail");
        assert!(
            unsupported
                .to_string()
                .contains("unsupported admin finance billing status payment: 9"),
            "{unsupported}"
        );
    }
}
