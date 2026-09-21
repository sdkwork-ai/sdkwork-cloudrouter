//! Live-database probe for the payment reconciliation runtime schema.
//!
//! `payment_reconciliation_runtime_store.rs` writes three tables that had no DDL
//! anywhere in the workspace while `commerce_payment_reconciliation_run` (owned
//! by the `payment-control-plane` module) carried the worker columns implicitly.
//! The reconciliation worker fail-closes when the schema is not ready
//! (`postgres_payment_reconciliation_schema_ready` in `infrastructure/sql/pool.rs`),
//! so the defect surfaced as a silently disabled worker rather than a 500.
//!
//! These probes assert the exact predicate the worker uses, against a real
//! database, so missing tables or columns fail the suite instead of silently
//! disabling reconciliation.
//!
//! Run:
//! ```text
//! SDKWORK_DATABASE_URL=postgresql://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:5432/sdkwork_ai_dev \
//!   cargo test -p sdkwork-cloudrouter-router-service --test postgres_payment_reconciliation_live -- --nocapture
//! ```
//! Without `SDKWORK_DATABASE_URL` every probe skips itself.

use sdkwork_cloudrouter_router_service::infrastructure::sql::pool::postgres_payment_reconciliation_schema_ready;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";

async fn live_pool() -> Option<PgPool> {
    let database_url = match std::env::var(POSTGRES_TEST_DATABASE_URL) {
        Ok(value) if !value.trim().is_empty() => value,
        _ => {
            eprintln!(
                "skipping live payment reconciliation probe; set {POSTGRES_TEST_DATABASE_URL} to run it"
            );
            return None;
        }
    };
    Some(
        PgPoolOptions::new()
            .max_connections(2)
            .connect(&database_url)
            .await
            .expect("connect to the configured database"),
    )
}

/// The readiness predicate the worker uses must be satisfied by the live schema.
/// This is the single strongest probe: if it returns false the reconciliation
/// worker never starts.
#[tokio::test]
async fn live_payment_reconciliation_schema_is_ready() {
    let Some(pool) = live_pool().await else {
        return;
    };
    let ready = postgres_payment_reconciliation_schema_ready(&pool)
        .await
        .expect("query reconciliation schema readiness");
    assert!(
        ready,
        "payment reconciliation schema must be ready; the worker fail-closes and stays disabled otherwise"
    );
}

/// Every table the reconciliation store addresses must exist.
#[tokio::test]
async fn live_payment_reconciliation_required_tables_exist() {
    let Some(pool) = live_pool().await else {
        return;
    };
    let required = [
        "commerce_payment_reconciliation_run",
        "commerce_payment_statement",
        "commerce_payment_statement_item",
        "commerce_payment_reconciliation_item",
    ];
    let missing: Vec<String> = sqlx::query_scalar(
        r#"
        SELECT t
        FROM unnest($1::text[]) AS t
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.tables i
            WHERE i.table_schema = current_schema() AND i.table_name = t
        )
        "#,
    )
    .bind(&required[..])
    .fetch_all(&pool)
    .await
    .expect("query information_schema");
    assert!(
        missing.is_empty(),
        "payment reconciliation store references tables that do not exist: {missing:?}"
    );
}

/// The store's insert/select column lists must all exist on the live tables,
/// so a column rename in the owner contract cannot silently break the worker.
#[tokio::test]
async fn live_payment_reconciliation_required_columns_exist() {
    let Some(pool) = live_pool().await else {
        return;
    };
    let required: [(&str, &[&str]); 3] = [
        (
            "commerce_payment_statement",
            &[
                "id",
                "tenant_id",
                "organization_id",
                "statement_no",
                "supplier_code",
                "provider_account_id",
                "statement_type",
                "settlement_currency",
                "period_start",
                "period_end",
                "provider_statement_id",
                "file_ref",
                "file_digest",
                "download_status",
                "parse_status",
                "row_count",
                "total_amount",
                "fee_amount",
                "net_amount",
                "downloaded_at",
                "parsed_at",
                "request_no",
                "idempotency_key",
                "created_at",
                "updated_at",
                "deleted_at",
                "version",
            ],
        ),
        (
            "commerce_payment_statement_item",
            &[
                "id",
                "tenant_id",
                "statement_id",
                "row_no",
                "native_trade_id",
                "native_refund_id",
                "native_order_no",
                "sdkwork_out_trade_no",
                "sdkwork_out_refund_no",
                "transaction_type",
                "occurred_at",
                "settled_at",
                "gross_amount",
                "fee_amount",
                "net_amount",
                "currency_code",
                "provider_status",
                "raw_row_digest",
                "metadata_json",
            ],
        ),
        (
            "commerce_payment_reconciliation_item",
            &[
                "id",
                "tenant_id",
                "reconciliation_run_id",
                "statement_id",
                "statement_item_id",
                "payment_attempt_id",
                "refund_id",
                "refund_attempt_id",
                "supplier_code",
                "difference_type",
                "match_status",
                "internal_amount",
                "provider_amount",
                "difference_amount",
                "currency_code",
                "internal_status",
                "provider_status",
                "resolution_status",
                "resolution_note",
                "resolved_by",
                "resolved_at",
            ],
        ),
    ];

    for (table, columns) in required {
        let missing: Vec<String> = sqlx::query_scalar(
            r#"
            SELECT c
            FROM unnest($2::text[]) AS c
            WHERE NOT EXISTS (
                SELECT 1 FROM information_schema.columns i
                WHERE i.table_schema = current_schema()
                  AND i.table_name = $1
                  AND i.column_name = c
            )
            "#,
        )
        .bind(table)
        .bind(columns)
        .fetch_all(&pool)
        .await
        .expect("query information_schema.columns");
        assert!(
            missing.is_empty(),
            "{table} is missing columns the reconciliation store writes: {missing:?}"
        );
    }
}
