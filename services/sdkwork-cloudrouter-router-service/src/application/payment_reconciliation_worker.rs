//! Payment reconciliation worker.
//!
//! Consumes queued `commerce_payment_reconciliation_run` rows: claims them,
//! loads the imported provider statement and the internal SDKWORK payment/
//! refund ledger for the run period, generates reconciliation differences via
//! [`PaymentReconciliationRuntimeService`], and writes back the run outcome.
//!
//! Runs whose provider statement has not been imported/parsed yet are returned
//! to `queued` and retried on the next cycle — the statement is produced by the
//! external bill download/parse pipeline, so a run legitimately waits for it.

use std::sync::Arc;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use sdkwork_models_contract_service::DecimalValue;

use super::{
    EntityUuidGenerator, FinishReconciliationRunCommand, LoadReconciliationLedgerCommand,
    LoadReconciliationStatementCommand, PaymentReconciliationDifferenceType,
    PaymentReconciliationRuntimeService, PaymentReconciliationRuntimeStore,
    ReconciliationRunClaimCommand, ReconciliationRunRecord,
    RuntimeGeneratePaymentReconciliationItemsCommand,
};
use crate::domain::{DomainError, DomainResult};

pub(crate) const MIN_BATCH_SIZE: i64 = 1;
pub(crate) const MAX_BATCH_SIZE: i64 = 100;
const DEFAULT_BATCH_SIZE: i64 = 10;
const DEFAULT_INTERVAL_MILLIS: u64 = 60 * 60 * 1_000;
const MIN_INTERVAL_MILLIS: u64 = 60_000;
const DIFFERENCE_DIGITS: u32 = 2;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PaymentReconciliationWorkerConfig {
    pub enabled: bool,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub batch_size: i64,
    pub interval_millis: u64,
}

impl PaymentReconciliationWorkerConfig {
    pub const MIN_BATCH_SIZE: i64 = MIN_BATCH_SIZE;
    pub const MAX_BATCH_SIZE: i64 = MAX_BATCH_SIZE;

    pub fn disabled() -> Self {
        Self {
            enabled: false,
            ..Self::default()
        }
    }

    pub fn normalized(self) -> Self {
        Self {
            enabled: self.enabled,
            tenant_id: self.tenant_id.max(0),
            organization_id: self.organization_id.max(0),
            batch_size: sdkwork_utils_rust::clamp(self.batch_size, MIN_BATCH_SIZE, MAX_BATCH_SIZE),
            interval_millis: self.interval_millis.max(MIN_INTERVAL_MILLIS),
        }
    }

    pub fn validate_for_deployment(&self) -> Result<(), String> {
        if !(MIN_BATCH_SIZE..=MAX_BATCH_SIZE).contains(&self.batch_size) {
            return Err(format!(
                "payment reconciliation worker batch_size must be between {MIN_BATCH_SIZE} and {MAX_BATCH_SIZE}"
            ));
        }
        if !self.enabled {
            return Ok(());
        }
        if self.tenant_id > 0 {
            return Ok(());
        }
        if platform_reconciliation_scope_allowed() {
            return Ok(());
        }
        Err(
            "payment reconciliation worker requires SDKWORK_CLOUDROUTER_PAYMENT_RECONCILIATION_TENANT_ID > 0 or explicit SDKWORK_CLOUDROUTER_PAYMENT_RECONCILIATION_PLATFORM_SCOPE=true when enabled"
                .to_owned(),
        )
    }
}

impl Default for PaymentReconciliationWorkerConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            tenant_id: 0,
            organization_id: 0,
            batch_size: DEFAULT_BATCH_SIZE,
            interval_millis: DEFAULT_INTERVAL_MILLIS,
        }
    }
}

fn platform_reconciliation_scope_allowed() -> bool {
    std::env::var("SDKWORK_CLOUDROUTER_PAYMENT_RECONCILIATION_PLATFORM_SCOPE")
        .ok()
        .map(|value| {
            matches!(
                value.trim().to_ascii_lowercase().as_str(),
                "1" | "true" | "yes" | "on"
            )
        })
        .unwrap_or(false)
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct PaymentReconciliationRunOutcome {
    pub runs_claimed: i64,
    pub runs_succeeded: i64,
    pub runs_failed: i64,
    pub runs_skipped_no_statement: i64,
    pub differences_generated: i64,
}

#[derive(Clone)]
pub struct PaymentReconciliationWorker {
    store: Arc<dyn PaymentReconciliationRuntimeStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    config: PaymentReconciliationWorkerConfig,
}

impl PaymentReconciliationWorker {
    pub fn new(
        store: Arc<dyn PaymentReconciliationRuntimeStore + Send + Sync>,
        entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
        config: PaymentReconciliationWorkerConfig,
    ) -> Self {
        Self {
            store,
            entity_uuid_generator,
            config: config.normalized(),
        }
    }

    pub fn config(&self) -> PaymentReconciliationWorkerConfig {
        self.config
    }

    pub async fn run_once(&self) -> DomainResult<PaymentReconciliationRunOutcome> {
        let started_at = Instant::now();
        let mut outcome = PaymentReconciliationRunOutcome::default();
        if !self.config.enabled {
            return Ok(outcome);
        }
        let now = current_iso_timestamp();
        let claimed = self
            .store
            .claim_due_reconciliation_runs(ReconciliationRunClaimCommand {
                tenant_id: tenant_scope(self.config.tenant_id),
                organization_id: organization_scope(self.config.organization_id),
                limit: self.config.batch_size,
                claimed_at: now.clone(),
            })
            .await?;
        outcome.runs_claimed = claimed.len() as i64;
        for run in &claimed {
            match self.execute_run(run, &now).await {
                Ok(RunExecutionSummary::Completed {
                    differences_generated,
                }) => {
                    outcome.runs_succeeded += 1;
                    outcome.differences_generated += differences_generated;
                }
                Ok(RunExecutionSummary::SkippedNoStatement) => {
                    outcome.runs_skipped_no_statement += 1;
                }
                Err(error) => {
                    outcome.runs_failed += 1;
                    tracing::warn!(
                        run_id = %run.id,
                        run_no = %run.run_no,
                        error = %error,
                        "payment reconciliation run failed"
                    );
                    if let Err(finish_error) = self
                        .store
                        .finish_reconciliation_run(FinishReconciliationRunCommand {
                            tenant_id: run.tenant_id.clone(),
                            reconciliation_run_id: run.id.clone(),
                            status: "failed".to_owned(),
                            matched_count: 0,
                            mismatched_count: 0,
                            unmatched_count: 0,
                            total_difference_amount: "0.00".to_owned(),
                            finished_at: now.clone(),
                        })
                        .await
                    {
                        tracing::warn!(
                            run_id = %run.id,
                            error = %finish_error,
                            "failed to mark payment reconciliation run failed"
                        );
                    }
                }
            }
        }
        if outcome.runs_claimed > 0 {
            reconciliation_runs_counter()
                .with_label_values(&["success"])
                .inc_by(outcome.runs_succeeded as u64);
            reconciliation_runs_counter()
                .with_label_values(&["failed"])
                .inc_by(outcome.runs_failed as u64);
            reconciliation_runs_counter()
                .with_label_values(&["skipped_no_statement"])
                .inc_by(outcome.runs_skipped_no_statement as u64);
        }
        tracing::info!(
            tenant_id = self.config.tenant_id,
            organization_id = self.config.organization_id,
            runs_claimed = outcome.runs_claimed,
            runs_succeeded = outcome.runs_succeeded,
            runs_failed = outcome.runs_failed,
            runs_skipped_no_statement = outcome.runs_skipped_no_statement,
            differences_generated = outcome.differences_generated,
            elapsed_ms = started_at.elapsed().as_millis() as u64,
            "payment reconciliation run completed"
        );
        Ok(outcome)
    }

    async fn execute_run(
        &self,
        run: &ReconciliationRunRecord,
        now: &str,
    ) -> DomainResult<RunExecutionSummary> {
        let provider_code = run.provider_code.clone().unwrap_or_default();
        if provider_code.trim().is_empty() {
            return Err(DomainError::new(format!(
                "reconciliation run {} has no provider_code",
                run.id
            )));
        }
        let statement = self
            .store
            .load_statement_for_reconciliation_run(LoadReconciliationStatementCommand {
                tenant_id: run.tenant_id.clone(),
                organization_id: run.organization_id.clone(),
                provider_code: provider_code.clone(),
                period_start: run.period_start.clone(),
                period_end: run.period_end.clone(),
            })
            .await?;
        let Some(statement) = statement else {
            // The statement has not been imported/parsed yet; leave the run
            // queued so the next cycle retries it.
            self.store
                .finish_reconciliation_run(FinishReconciliationRunCommand {
                    tenant_id: run.tenant_id.clone(),
                    reconciliation_run_id: run.id.clone(),
                    status: "queued".to_owned(),
                    matched_count: 0,
                    mismatched_count: 0,
                    unmatched_count: 0,
                    total_difference_amount: "0.00".to_owned(),
                    finished_at: now.to_owned(),
                })
                .await?;
            return Ok(RunExecutionSummary::SkippedNoStatement);
        };
        let statement_items = self
            .store
            .load_statement_items(run.tenant_id.clone(), statement.id.clone())
            .await?;
        let ledger_entries = self
            .store
            .load_reconciliation_ledger_entries(LoadReconciliationLedgerCommand {
                tenant_id: run.tenant_id.clone(),
                organization_id: run.organization_id.clone(),
                provider_code: Some(provider_code),
                period_start: run.period_start.clone(),
                period_end: run.period_end.clone(),
            })
            .await?;
        let service = PaymentReconciliationRuntimeService::new(
            self.store.as_ref(),
            self.entity_uuid_generator.as_ref(),
        );
        let items = service
            .generate_reconciliation_items(RuntimeGeneratePaymentReconciliationItemsCommand {
                tenant_id: run.tenant_id.clone(),
                reconciliation_run_id: run.id.clone(),
                statement_id: statement.id.clone(),
                generated_at: now.to_owned(),
                internal_items: ledger_entries,
            })
            .await?;
        let (matched_count, mismatched_count, unmatched_count, total_difference_amount) =
            summarize_differences(&items, statement_items.len());
        self.store
            .finish_reconciliation_run(FinishReconciliationRunCommand {
                tenant_id: run.tenant_id.clone(),
                reconciliation_run_id: run.id.clone(),
                status: "succeeded".to_owned(),
                matched_count,
                mismatched_count,
                unmatched_count,
                total_difference_amount,
                finished_at: now.to_owned(),
            })
            .await?;
        Ok(RunExecutionSummary::Completed {
            differences_generated: items.len() as i64,
        })
    }
}

enum RunExecutionSummary {
    Completed { differences_generated: i64 },
    SkippedNoStatement,
}

fn summarize_differences(
    items: &[crate::application::PaymentReconciliationItemRecord],
    statement_item_count: usize,
) -> (i64, i64, i64, String) {
    let mut mismatched = 0_i64;
    let mut unmatched = 0_i64;
    let mut statement_side_differences = 0_i64;
    let mut total_difference = DecimalValue::parse("0.00").unwrap_or_else(|_| zero_decimal());
    for item in items {
        if item.match_status == "mismatch" {
            mismatched += 1;
        }
        match item.difference_type {
            PaymentReconciliationDifferenceType::MissingInSdkwork
            | PaymentReconciliationDifferenceType::MissingInProvider => {
                unmatched += 1;
            }
            _ => {}
        }
        if item.statement_item_id.is_some() {
            statement_side_differences += 1;
        }
        // Difference amounts are signed; the run total is the sum of absolute
        // exposure so opposite-sign differences cannot cancel each other out.
        if let Some(amount) = item.difference_amount.as_deref() {
            if let Ok(value) = DecimalValue::parse(amount.trim_start_matches('-')) {
                total_difference = total_difference.checked_add(value).unwrap_or(total_difference);
            }
        }
    }
    let matched = (statement_item_count as i64).saturating_sub(statement_side_differences);
    (
        matched,
        mismatched,
        unmatched,
        total_difference.to_fixed_string(DIFFERENCE_DIGITS),
    )
}

fn zero_decimal() -> DecimalValue {
    DecimalValue::parse("0.00").expect("zero decimal must parse")
}

fn tenant_scope(tenant_id: i64) -> String {
    if tenant_id > 0 {
        tenant_id.to_string()
    } else {
        String::new()
    }
}

fn organization_scope(organization_id: i64) -> Option<String> {
    (organization_id > 0).then(|| organization_id.to_string())
}

fn current_iso_timestamp() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    let days = seconds.div_euclid(86_400);
    let seconds_of_day = seconds.rem_euclid(86_400);
    let (year, month, day) = civil_from_days(days);
    let hour = seconds_of_day / 3_600;
    let minute = (seconds_of_day % 3_600) / 60;
    let second = seconds_of_day % 60;
    format!("{year:04}-{month:02}-{day:02}T{hour:02}:{minute:02}:{second:02}Z")
}

fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = mp + if mp < 10 { 3 } else { -9 };
    let year = y + if m <= 2 { 1 } else { 0 };
    (year, m, d)
}

fn reconciliation_runs_counter() -> prometheus::IntCounterVec {
    use std::sync::OnceLock;
    static METRIC: OnceLock<prometheus::IntCounterVec> = OnceLock::new();
    METRIC
        .get_or_init(|| {
            let metric = prometheus::IntCounterVec::new(
                prometheus::Opts::new(
                    "payment_reconciliation_runs_total",
                    "Payment reconciliation worker run outcomes.",
                )
                .namespace("cloudrouter"),
                &["outcome"],
            )
            .expect("payment reconciliation run metric");
            let _ = prometheus::register(Box::new(metric.clone()));
            metric
        })
        .clone()
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use super::*;
    use crate::application::{
        InMemoryPaymentReconciliationRuntimeStore, PaymentStatementItemRecord,
        PaymentStatementRecord, RuntimeReconciliationLedgerEntry,
    };

    struct FixedUuidGenerator;

    impl EntityUuidGenerator for FixedUuidGenerator {
        fn generate_entity_uuid(&self) -> DomainResult<String> {
            static NEXT: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(1);
            Ok(format!(
                "test-{}",
                NEXT.fetch_add(1, std::sync::atomic::Ordering::SeqCst)
            ))
        }
    }

    fn statement(tenant_id: &str, period_start: &str, period_end: &str) -> PaymentStatementRecord {
        PaymentStatementRecord {
            id: "statement-1".to_owned(),
            tenant_id: tenant_id.to_owned(),
            organization_id: None,
            statement_no: "ST-2026-07".to_owned(),
            supplier_code: "openai".to_owned(),
            provider_account_id: None,
            statement_type: "daily".to_owned(),
            settlement_currency: "CNY".to_owned(),
            period_start: period_start.to_owned(),
            period_end: period_end.to_owned(),
            provider_statement_id: None,
            file_ref: None,
            file_digest: "digest".to_owned(),
            download_status: "downloaded".to_owned(),
            parse_status: "parsed".to_owned(),
            row_count: 2,
            total_amount: "199.00".to_owned(),
            fee_amount: "0.00".to_owned(),
            net_amount: "199.00".to_owned(),
            downloaded_at: None,
            parsed_at: None,
            request_no: "req-1".to_owned(),
            idempotency_key: "idem-1".to_owned(),
            created_at: "2026-08-01T00:00:00Z".to_owned(),
            updated_at: "2026-08-01T00:00:00Z".to_owned(),
        }
    }

    fn statement_item(statement_id: &str, trade_no: &str, amount: &str) -> PaymentStatementItemRecord {
        PaymentStatementItemRecord {
            id: format!("item-{trade_no}"),
            tenant_id: "10".to_owned(),
            organization_id: None,
            statement_id: statement_id.to_owned(),
            supplier_code: "openai".to_owned(),
            provider_account_id: None,
            row_no: trade_no.to_owned(),
            native_trade_id: None,
            native_refund_id: None,
            native_order_no: None,
            sdkwork_out_trade_no: Some(trade_no.to_owned()),
            sdkwork_out_refund_no: None,
            transaction_type: "payment".to_owned(),
            occurred_at: "2026-08-01T10:00:00Z".to_owned(),
            settled_at: None,
            gross_amount: amount.to_owned(),
            fee_amount: "0.00".to_owned(),
            net_amount: amount.to_owned(),
            currency_code: "CNY".to_owned(),
            provider_status: "succeeded".to_owned(),
            raw_row_digest: "row-digest".to_owned(),
            metadata_json: serde_json::Value::Null,
            created_at: "2026-08-01T00:00:00Z".to_owned(),
        }
    }

    fn ledger_entry(trade_no: &str, amount: &str, occurred_at: &str) -> RuntimeReconciliationLedgerEntry {
        RuntimeReconciliationLedgerEntry {
            supplier_code: "openai".to_owned(),
            payment_attempt_id: Some(format!("attempt-{trade_no}")),
            refund_id: None,
            refund_attempt_id: None,
            sdkwork_out_trade_no: Some(trade_no.to_owned()),
            sdkwork_out_refund_no: None,
            internal_amount: amount.to_owned(),
            provider_amount: amount.to_owned(),
            internal_fee_amount: "0.00".to_owned(),
            provider_fee_amount: "0.00".to_owned(),
            currency_code: "CNY".to_owned(),
            internal_status: "succeeded".to_owned(),
            provider_status: "succeeded".to_owned(),
            occurred_at: occurred_at.to_owned(),
        }
    }

    fn due_run(run_id: &str, provider_code: Option<&str>) -> ReconciliationRunRecord {
        ReconciliationRunRecord {
            id: run_id.to_owned(),
            tenant_id: "10".to_owned(),
            organization_id: None,
            run_no: run_id.to_uppercase(),
            provider_code: provider_code.map(str::to_owned),
            period_start: "2026-08-01T00:00:00Z".to_owned(),
            period_end: "2026-08-02T00:00:00Z".to_owned(),
            status: "queued".to_owned(),
        }
    }

    fn worker(store: InMemoryPaymentReconciliationRuntimeStore) -> PaymentReconciliationWorker {
        PaymentReconciliationWorker::new(
            Arc::new(store),
            Arc::new(FixedUuidGenerator),
            PaymentReconciliationWorkerConfig {
                enabled: true,
                tenant_id: 10,
                organization_id: 0,
                batch_size: 10,
                interval_millis: DEFAULT_INTERVAL_MILLIS,
            },
        )
    }

    #[test]
    fn reconciliation_config_normalizes_and_validates() {
        let normalized = PaymentReconciliationWorkerConfig {
            enabled: true,
            tenant_id: 10,
            organization_id: 0,
            batch_size: 500,
            interval_millis: 1,
        }
        .normalized();
        assert_eq!(MAX_BATCH_SIZE, normalized.batch_size);
        assert_eq!(MIN_INTERVAL_MILLIS, normalized.interval_millis);
        assert!(normalized.validate_for_deployment().is_ok());
        assert!(PaymentReconciliationWorkerConfig::disabled()
            .validate_for_deployment()
            .is_ok());
    }

    #[test]
    fn enabled_worker_without_scope_is_rejected_outside_platform_scope() {
        std::env::remove_var("SDKWORK_CLOUDROUTER_PAYMENT_RECONCILIATION_PLATFORM_SCOPE");
        let error = PaymentReconciliationWorkerConfig {
            enabled: true,
            tenant_id: 0,
            organization_id: 0,
            batch_size: 10,
            interval_millis: DEFAULT_INTERVAL_MILLIS,
        }
        .validate_for_deployment()
        .expect_err("platform-scope reconciliation requires explicit opt-in");
        assert!(error.contains("PAYMENT_RECONCILIATION_TENANT_ID"));
    }

    #[tokio::test]
    async fn disabled_worker_does_not_touch_the_store() {
        let store = InMemoryPaymentReconciliationRuntimeStore::default();
        let worker = PaymentReconciliationWorker::new(
            Arc::new(store.clone()),
            Arc::new(FixedUuidGenerator),
            PaymentReconciliationWorkerConfig::disabled(),
        );
        let outcome = worker.run_once().await.expect("disabled run must succeed");
        assert_eq!(0, outcome.runs_claimed);
        assert!(store.runs().is_empty());
    }

    #[tokio::test]
    async fn worker_reconciles_a_run_and_writes_success_outcome() {
        let store = InMemoryPaymentReconciliationRuntimeStore::default()
            .with_runs(vec![due_run("run-1", Some("openai"))])
            .with_statement(
                statement("10", "2026-08-01T00:00:00Z", "2026-08-02T00:00:00Z"),
                vec![
                    statement_item("statement-1", "trade-1", "100.00"),
                    statement_item("statement-1", "trade-2", "99.00"),
                ],
            )
            .with_ledger_entries(vec![
                ledger_entry("trade-1", "100.00", "2026-08-01T10:00:00Z"),
                ledger_entry("trade-2", "50.00", "2026-08-01T11:00:00Z"),
            ]);

        let worker = worker(store.clone());
        let outcome = worker.run_once().await.expect("reconciliation must succeed");
        assert_eq!(1, outcome.runs_claimed);
        assert_eq!(1, outcome.runs_succeeded);
        assert_eq!(0, outcome.runs_failed);
        assert_eq!(1, outcome.differences_generated);
        assert_eq!(0, outcome.runs_skipped_no_statement);

        let items = store.reconciliation_items();
        assert_eq!(1, items.len());
        assert_eq!(
            PaymentReconciliationDifferenceType::AmountMismatch,
            items[0].difference_type
        );
        assert_eq!("-49.00", items[0].difference_amount.as_deref().unwrap());
        let runs = store.runs();
        assert_eq!("succeeded", runs[0].status);
    }

    #[tokio::test]
    async fn worker_skips_runs_without_an_imported_statement() {
        let store = InMemoryPaymentReconciliationRuntimeStore::default()
            .with_runs(vec![due_run("run-1", Some("openai"))])
            .with_ledger_entries(vec![ledger_entry(
                "trade-1",
                "100.00",
                "2026-08-01T10:00:00Z",
            )]);

        let worker = worker(store.clone());
        let outcome = worker.run_once().await.expect("reconciliation must succeed");
        assert_eq!(1, outcome.runs_claimed);
        assert_eq!(1, outcome.runs_skipped_no_statement);
        assert_eq!(0, outcome.differences_generated);
        assert_eq!("queued", store.runs()[0].status);
        assert!(store.reconciliation_items().is_empty());
    }

    #[tokio::test]
    async fn worker_marks_failed_runs_when_provider_code_is_missing() {
        let store = InMemoryPaymentReconciliationRuntimeStore::default()
            .with_runs(vec![due_run("run-1", None)]);

        let worker = worker(store.clone());
        let outcome = worker.run_once().await.expect("reconciliation must succeed");
        assert_eq!(1, outcome.runs_claimed);
        assert_eq!(1, outcome.runs_failed);
        assert_eq!("failed", store.runs()[0].status);
    }

    #[test]
    fn summarize_uses_absolute_difference_exposure() {
        let summary = summarize_differences(
            &[
                crate::application::PaymentReconciliationItemRecord {
                    id: "a".to_owned(),
                    tenant_id: "10".to_owned(),
                    organization_id: None,
                    reconciliation_run_id: "run-1".to_owned(),
                    statement_id: "statement-1".to_owned(),
                    statement_item_id: Some("item-1".to_owned()),
                    payment_attempt_id: None,
                    refund_id: None,
                    refund_attempt_id: None,
                    supplier_code: "openai".to_owned(),
                    difference_type: PaymentReconciliationDifferenceType::AmountMismatch,
                    match_status: "mismatch".to_owned(),
                    internal_amount: Some("100.00".to_owned()),
                    provider_amount: Some("90.00".to_owned()),
                    difference_amount: Some("10.00".to_owned()),
                    currency_code: Some("CNY".to_owned()),
                    internal_status: None,
                    provider_status: None,
                    resolution_status: "unresolved".to_owned(),
                    resolution_note: None,
                    resolved_by: None,
                    resolved_at: None,
                    created_at: "2026-08-01T00:00:00Z".to_owned(),
                    updated_at: "2026-08-01T00:00:00Z".to_owned(),
                },
                crate::application::PaymentReconciliationItemRecord {
                    id: "b".to_owned(),
                    tenant_id: "10".to_owned(),
                    organization_id: None,
                    reconciliation_run_id: "run-1".to_owned(),
                    statement_id: "statement-1".to_owned(),
                    statement_item_id: None,
                    payment_attempt_id: Some("attempt-1".to_owned()),
                    refund_id: None,
                    refund_attempt_id: None,
                    supplier_code: "openai".to_owned(),
                    difference_type: PaymentReconciliationDifferenceType::MissingInProvider,
                    match_status: "mismatch".to_owned(),
                    internal_amount: Some("-5.00".to_owned()),
                    provider_amount: None,
                    difference_amount: Some("-5.00".to_owned()),
                    currency_code: Some("CNY".to_owned()),
                    internal_status: None,
                    provider_status: None,
                    resolution_status: "unresolved".to_owned(),
                    resolution_note: None,
                    resolved_by: None,
                    resolved_at: None,
                    created_at: "2026-08-01T00:00:00Z".to_owned(),
                    updated_at: "2026-08-01T00:00:00Z".to_owned(),
                },
            ],
            3,
        );
        assert_eq!((2, 2, 1, "15.00".to_owned()), summary);
    }
}
