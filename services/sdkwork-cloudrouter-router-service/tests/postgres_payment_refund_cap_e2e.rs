//! Live-PostgreSQL semantic tests for the payment refund cumulative cap.
//!
//! The cap guard UPDATE runs inside the refund-insert transaction and sums
//! the active (`pending`/`processing`/`succeeded`) refunds of the intent.
//! The just-inserted row of THIS refund is visible to that same-statement
//! subquery, so the guard must exclude it by id — otherwise every amount is
//! counted twice and full refunds are always rejected. These tests exercise
//! that semantic against a real database; a SQL string-contract test cannot.
//!
//! Skipped unless `SDKWORK_DATABASE_URL` is set (same convention as
//! `postgres_usage_settlement_store_e2e`).

use sdkwork_cloudrouter_router_service::application::{
    PaymentIntentRuntimeRecord, PaymentIntentRuntimeStore as _, PaymentIntentStatus,
    PaymentRefundAttemptRecord, PaymentRefundEventRecord, PaymentRefundItemRecord,
    PaymentRefundRuntimeRecord, PaymentRefundRuntimeStore as _, PaymentRefundStatus,
    PaymentRouteDecisionRecord,
};
use sdkwork_cloudrouter_router_service::infrastructure::sql::postgres::PostgresPaymentIntentRuntimeStore;
use sqlx::postgres::PgPoolOptions;
use sqlx::{PgPool, Row};
use std::env;

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";
const PAYMENT_BASELINE: &str = include_str!(
    "../../../database/modules/payment-runtime/ddl/baseline/postgres/0001_payment_runtime_baseline.sql"
);

const TENANT_ID: &str = "tenant-refund-cap-e2e";

struct PostgresTestContext {
    pool: PgPool,
    database_url: String,
    schema: String,
}

impl PostgresTestContext {
    async fn new(label: &str) -> Option<Self> {
        let database_url = match env::var(POSTGRES_TEST_DATABASE_URL) {
            Ok(value) if !value.trim().is_empty() => value,
            _ => {
                eprintln!(
                    "skipping payment refund cap e2e test; set {POSTGRES_TEST_DATABASE_URL} to run it"
                );
                return None;
            }
        };
        let schema = format!("sdkwork_payment_refund_cap_e2e_{label}");
        let quoted_schema = quote_identifier(&schema);
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "DROP SCHEMA IF EXISTS {quoted_schema} CASCADE"
        )))
        .execute(&admin_pool)
        .await
        .unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!("CREATE SCHEMA {quoted_schema}")))
            .execute(&admin_pool)
            .await
            .unwrap();
        admin_pool.close().await;

        let schema_for_connections = schema.clone();
        let pool = PgPoolOptions::new()
            .max_connections(4)
            .after_connect(move |connection, _metadata| {
                let schema = schema_for_connections.clone();
                Box::pin(async move {
                    sqlx::query(sqlx::AssertSqlSafe(format!(
                        "SET search_path TO {}",
                        quote_identifier(&schema)
                    )))
                    .execute(&mut *connection)
                    .await?;
                    Ok(())
                })
            })
            .connect(&database_url)
            .await
            .unwrap();
        for statement in split_statements(PAYMENT_BASELINE) {
            sqlx::query(sqlx::AssertSqlSafe(statement))
                .execute(&pool)
                .await
                .expect("apply payment runtime baseline DDL");
        }

        Some(Self {
            pool,
            database_url,
            schema,
        })
    }

    async fn cleanup(self) {
        let Self {
            pool,
            database_url,
            schema,
        } = self;
        pool.close().await;
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "DROP SCHEMA IF EXISTS {} CASCADE",
            quote_identifier(&schema)
        )))
        .execute(&admin_pool)
        .await
        .unwrap();
        admin_pool.close().await;
    }
}

fn quote_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

fn split_statements(baseline: &str) -> Vec<String> {
    let without_comments = baseline
        .lines()
        .filter(|line| !line.trim_start().starts_with("--"))
        .collect::<Vec<_>>()
        .join("\n");
    without_comments
        .split(';')
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
        .map(str::to_owned)
        .collect()
}

fn timestamp(offset_seconds: i64) -> String {
    format!("2026-09-19 00:{:02}:{:02}+00", offset_seconds / 60, offset_seconds % 60)
}

async fn insert_intent(pool: &PgPool, intent_id: &str, amount: &str) {
    let store = PostgresPaymentIntentRuntimeStore::new(pool.clone());
    let intent = PaymentIntentRuntimeRecord {
        id: intent_id.to_owned(),
        tenant_id: TENANT_ID.to_owned(),
        organization_id: None,
        owner_user_id: "user-1".to_owned(),
        merchant_order_no: format!("order-{intent_id}"),
        amount: amount.to_owned(),
        currency_code: "CNY".to_owned(),
        subject: "refund cap e2e".to_owned(),
        business_type: "order".to_owned(),
        supplier_code: "stripe".to_owned(),
        payment_method: "card".to_owned(),
        scene: "web".to_owned(),
        status: PaymentIntentStatus::Processing,
        idempotency_key: format!("intent-key-{intent_id}"),
        created_at: timestamp(0),
        updated_at: timestamp(0),
    };
    let route_decision = PaymentRouteDecisionRecord {
        id: format!("route-{intent_id}"),
        tenant_id: TENANT_ID.to_owned(),
        organization_id: None,
        payment_intent_id: intent_id.to_owned(),
        payment_attempt_id: format!("attempt-{intent_id}"),
        account_id: "account-1".to_owned(),
        supplier_code: "stripe".to_owned(),
        provider_account_id: Some("provider-account-1".to_owned()),
        method_code: "card".to_owned(),
        scene_code: "web".to_owned(),
        currency_code: "CNY".to_owned(),
        amount: amount.to_owned(),
        decision_reason: "e2e".to_owned(),
        created_at: timestamp(0),
    };
    store
        .insert_payment_intent(intent, route_decision)
        .await
        .expect("insert payment intent");
}

fn refund_record(refund_id: &str, intent_id: &str, amount: &str, sequence: usize) -> PaymentRefundRuntimeRecord {
    PaymentRefundRuntimeRecord {
        id: refund_id.to_owned(),
        tenant_id: TENANT_ID.to_owned(),
        organization_id: None,
        payment_intent_id: intent_id.to_owned(),
        payment_attempt_id: format!("attempt-{intent_id}"),
        merchant_refund_no: format!("refund-no-{refund_id}"),
        amount: amount.to_owned(),
        currency_code: "CNY".to_owned(),
        supplier_code: "stripe".to_owned(),
        reason: "e2e refund cap".to_owned(),
        status: PaymentRefundStatus::Pending,
        idempotency_key: format!("refund-key-{refund_id}"),
        items: Vec::new(),
        created_at: timestamp(sequence as i64 * 10),
        updated_at: timestamp(sequence as i64 * 10),
    }
}

fn refund_attempt(refund_id: &str, sequence: usize) -> PaymentRefundAttemptRecord {
    PaymentRefundAttemptRecord {
        id: format!("refund-attempt-{refund_id}"),
        tenant_id: TENANT_ID.to_owned(),
        organization_id: None,
        refund_attempt_no: format!("ra-{refund_id}"),
        refund_id: refund_id.to_owned(),
        supplier_code: "stripe".to_owned(),
        provider_account_id: Some("provider-account-1".to_owned()),
        out_refund_no: format!("out-{refund_id}"),
        provider_refund_id: None,
        amount: "0.00".to_owned(),
        currency_code: "CNY".to_owned(),
        status: "pending".to_owned(),
        failure_code: None,
        failure_message: None,
        submitted_at: Some(timestamp(sequence as i64 * 10)),
        succeeded_at: None,
        failed_at: None,
        created_at: timestamp(sequence as i64 * 10),
        updated_at: timestamp(sequence as i64 * 10),
    }
}

fn refund_item(refund_id: &str, sequence: usize) -> PaymentRefundItemRecord {
    PaymentRefundItemRecord {
        id: format!("refund-item-{refund_id}"),
        tenant_id: TENANT_ID.to_owned(),
        organization_id: None,
        refund_id: refund_id.to_owned(),
        order_item_id: format!("item-{sequence}"),
        quantity: 1,
        refund_amount: "0.00".to_owned(),
        tax_refund_amount: "0.00".to_owned(),
        shipping_refund_amount: "0.00".to_owned(),
        created_at: timestamp(sequence as i64 * 10),
    }
}

async fn insert_refund_ok(store: &PostgresPaymentIntentRuntimeStore, refund_id: &str, intent_id: &str, amount: &str, sequence: usize) {
    store
        .insert_refund(
            refund_record(refund_id, intent_id, amount, sequence),
            refund_attempt(refund_id, sequence),
            vec![refund_item(refund_id, sequence)],
        )
        .await
        .unwrap_or_else(|error| panic!("refund {refund_id} ({amount}) must be accepted: {error}"));
}

async fn insert_refund_conflict(store: &PostgresPaymentIntentRuntimeStore, refund_id: &str, intent_id: &str, amount: &str, sequence: usize) {
    let error = store
        .insert_refund(
            refund_record(refund_id, intent_id, amount, sequence),
            refund_attempt(refund_id, sequence),
            vec![refund_item(refund_id, sequence)],
        )
        .await
        .expect_err("refund over the cumulative cap must be rejected");
    assert!(
        error.to_string().contains("exceeds the remaining refundable amount"),
        "expected a refund-cap conflict, got: {error}"
    );
}

async fn refund_row_count(pool: &PgPool, intent_id: &str) -> i64 {
    sqlx::query("SELECT COUNT(*) AS rows FROM commerce_refund WHERE payment_intent_id = $1")
        .bind(intent_id)
        .fetch_one(pool)
        .await
        .unwrap()
        .get::<i64, _>("rows")
}

#[tokio::test]
async fn full_refund_of_the_intent_amount_is_accepted() {
    let Some(ctx) = PostgresTestContext::new("full_refund").await else {
        return;
    };
    insert_intent(&ctx.pool, "intent-full", "100.00").await;

    let store = PostgresPaymentIntentRuntimeStore::new(ctx.pool.clone());
    // Regression: the guard previously double-counted the just-inserted
    // pending refund, so `2 x 100.00 <= 100.00` always failed.
    insert_refund_ok(&store, "refund-full", "intent-full", "100.00", 1).await;
    assert_eq!(1, refund_row_count(&ctx.pool, "intent-full").await);

    ctx.cleanup().await;
}

#[tokio::test]
async fn cumulative_refunds_stop_exactly_at_the_intent_amount() {
    let Some(ctx) = PostgresTestContext::new("cumulative_cap").await else {
        return;
    };
    insert_intent(&ctx.pool, "intent-partial", "100.00").await;

    let store = PostgresPaymentIntentRuntimeStore::new(ctx.pool.clone());
    insert_refund_ok(&store, "refund-60", "intent-partial", "60.00", 1).await;
    // 60.00 (active) + 50.00 > 100.00 -> rejected, no orphan row survives.
    insert_refund_conflict(&store, "refund-50", "intent-partial", "50.00", 2).await;
    assert_eq!(1, refund_row_count(&ctx.pool, "intent-partial").await);
    // 60.00 + 40.00 == 100.00 -> exactly fills the cap.
    insert_refund_ok(&store, "refund-40", "intent-partial", "40.00", 3).await;
    // 100.00 (active) + 0.01 > 100.00 -> rejected.
    insert_refund_conflict(&store, "refund-001", "intent-partial", "0.01", 4).await;
    assert_eq!(2, refund_row_count(&ctx.pool, "intent-partial").await);

    ctx.cleanup().await;
}

#[tokio::test]
async fn failed_refunds_release_their_cap_reservation() {
    let Some(ctx) = PostgresTestContext::new("failed_release").await else {
        return;
    };
    insert_intent(&ctx.pool, "intent-release", "100.00").await;

    let store = PostgresPaymentIntentRuntimeStore::new(ctx.pool.clone());
    insert_refund_ok(&store, "refund-first", "intent-release", "100.00", 1).await;
    // A failed refund must release its reservation: the active sum drops
    // back to zero, so a retry of the full amount is accepted again.
    store
        .finish_refund(
            "refund-first".to_owned(),
            PaymentRefundStatus::Failed,
            timestamp(120),
            PaymentRefundEventRecord {
                id: "event-failed".to_owned(),
                tenant_id: TENANT_ID.to_owned(),
                organization_id: None,
                refund_id: "refund-first".to_owned(),
                event_type: "failed".to_owned(),
                from_status: Some("pending".to_owned()),
                to_status: "failed".to_owned(),
                reason: Some("provider rejected".to_owned()),
                created_at: timestamp(120),
            },
        )
        .await
        .expect("fail the first refund");
    insert_refund_ok(&store, "refund-retry", "intent-release", "100.00", 5).await;
    assert_eq!(2, refund_row_count(&ctx.pool, "intent-release").await);

    ctx.cleanup().await;
}
