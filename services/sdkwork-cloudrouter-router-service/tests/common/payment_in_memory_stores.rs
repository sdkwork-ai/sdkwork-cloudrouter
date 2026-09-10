//! In-process doubles for payment runtime stores. Integration tests need a
//! compiled (non-`cfg(test)`) library, so the doubles live here instead of
//! behind `#[cfg(test)]` in the library itself.

#![allow(dead_code)]

use std::sync::{Arc, Mutex};

use sdkwork_cloudrouter_router_service::application::{
    FinishReconciliationRunCommand, LoadReconciliationLedgerCommand,
    LoadReconciliationStatementCommand, PaymentIntentRuntimeRecord, PaymentIntentRuntimeStore,
    PaymentIntentRuntimeStoreFuture, PaymentIntentStatus, PaymentOperationAttemptRecord,
    PaymentReconciliationDifferenceType, PaymentReconciliationItemRecord,
    PaymentReconciliationRuntimeStore, PaymentReconciliationRuntimeStoreFuture,
    PaymentRefundAttemptRecord, PaymentRefundEventRecord, PaymentRefundItemRecord,
    PaymentRefundRuntimeRecord, PaymentRefundRuntimeStore, PaymentRefundRuntimeStoreFuture,
    PaymentRefundStatus, PaymentRouteDecisionRecord, PaymentStatementItemRecord,
    PaymentStatementRecord, ReconciliationRunClaimCommand, ReconciliationRunRecord,
    RuntimeGeneratePaymentReconciliationItemsCommand, RuntimeImportPaymentStatementCommand,
    RuntimeReconciliationLedgerEntry,
};
use sdkwork_cloudrouter_router_service::domain::{DomainError, DomainResult};

#[derive(Default, Clone)]
pub struct InMemoryPaymentIntentRuntimeStore {
    state: Arc<Mutex<InMemoryPaymentIntentRuntimeState>>,
}

#[derive(Default)]
struct InMemoryPaymentIntentRuntimeState {
    payment_intents: Vec<PaymentIntentRuntimeRecord>,
    route_decisions: Vec<PaymentRouteDecisionRecord>,
    operation_attempts: Vec<PaymentOperationAttemptRecord>,
    refunds: Vec<PaymentRefundRuntimeRecord>,
    refund_items: Vec<PaymentRefundItemRecord>,
    refund_attempts: Vec<PaymentRefundAttemptRecord>,
    refund_events: Vec<PaymentRefundEventRecord>,
}

impl InMemoryPaymentIntentRuntimeStore {
    pub fn payment_intents(&self) -> Vec<PaymentIntentRuntimeRecord> {
        self.state.lock().unwrap().payment_intents.clone()
    }

    pub fn route_decisions(&self) -> Vec<PaymentRouteDecisionRecord> {
        self.state.lock().unwrap().route_decisions.clone()
    }

    pub fn operation_attempts(&self) -> Vec<PaymentOperationAttemptRecord> {
        self.state.lock().unwrap().operation_attempts.clone()
    }

    pub fn refunds(&self) -> Vec<PaymentRefundRuntimeRecord> {
        self.state.lock().unwrap().refunds.clone()
    }

    pub fn refund_items(&self) -> Vec<PaymentRefundItemRecord> {
        self.state.lock().unwrap().refund_items.clone()
    }

    pub fn refund_attempts(&self) -> Vec<PaymentRefundAttemptRecord> {
        self.state.lock().unwrap().refund_attempts.clone()
    }

    pub fn refund_events(&self) -> Vec<PaymentRefundEventRecord> {
        self.state.lock().unwrap().refund_events.clone()
    }
}

impl PaymentIntentRuntimeStore for InMemoryPaymentIntentRuntimeStore {
    fn load_by_idempotency(
        &self,
        tenant_id: String,
        idempotency_key: String,
    ) -> PaymentIntentRuntimeStoreFuture<'_, Option<PaymentIntentRuntimeRecord>> {
        let state = self.state.clone();
        Box::pin(async move {
            Ok(state
                .lock()
                .unwrap()
                .payment_intents
                .iter()
                .find(|intent| {
                    intent.tenant_id == tenant_id && intent.idempotency_key == idempotency_key
                })
                .cloned())
        })
    }

    fn load_by_id(
        &self,
        tenant_id: String,
        id: String,
    ) -> PaymentIntentRuntimeStoreFuture<'_, Option<PaymentIntentRuntimeRecord>> {
        let state = self.state.clone();
        Box::pin(async move {
            Ok(state
                .lock()
                .unwrap()
                .payment_intents
                .iter()
                .find(|intent| intent.tenant_id == tenant_id && intent.id == id)
                .cloned())
        })
    }

    fn insert_payment_intent(
        &self,
        intent: PaymentIntentRuntimeRecord,
        route_decision: PaymentRouteDecisionRecord,
    ) -> PaymentIntentRuntimeStoreFuture<'_, PaymentIntentRuntimeRecord> {
        let state = self.state.clone();
        Box::pin(async move {
            let mut state = state.lock().unwrap();
            state.route_decisions.push(route_decision);
            state.payment_intents.push(intent.clone());
            Ok(intent)
        })
    }

    fn record_intent_provider_dispatch(
        &self,
        tenant_id: String,
        intent_id: String,
        status: PaymentIntentStatus,
        next_action_json: Option<String>,
        updated_at: String,
    ) -> PaymentIntentRuntimeStoreFuture<'_, ()> {
        let state = self.state.clone();
        Box::pin(async move {
            let mut state = state.lock().unwrap();
            let intent = state
                .payment_intents
                .iter_mut()
                .find(|intent| intent.tenant_id == tenant_id && intent.id == intent_id)
                .ok_or_else(|| DomainError::not_found("payment intent was not found"))?;
            intent.status = status;
            intent.updated_at = updated_at;
            let _ = next_action_json;
            Ok(())
        })
    }

    fn insert_operation_attempt(
        &self,
        attempt: PaymentOperationAttemptRecord,
    ) -> PaymentIntentRuntimeStoreFuture<'_, PaymentOperationAttemptRecord> {
        let state = self.state.clone();
        Box::pin(async move {
            state
                .lock()
                .unwrap()
                .operation_attempts
                .push(attempt.clone());
            Ok(attempt)
        })
    }

    fn finish_operation_attempt(
        &self,
        id: String,
        status: String,
        response_digest: Option<String>,
        provider_error_code: Option<String>,
        provider_error_message: Option<String>,
        completed_at: String,
    ) -> PaymentIntentRuntimeStoreFuture<'_, PaymentOperationAttemptRecord> {
        let state = self.state.clone();
        Box::pin(async move {
            let mut state = state.lock().unwrap();
            let attempt = state
                .operation_attempts
                .iter_mut()
                .find(|attempt| attempt.id == id)
                .ok_or_else(|| DomainError::not_found("payment operation attempt was not found"))?;
            attempt.status = status;
            attempt.response_digest = response_digest;
            attempt.provider_error_code = provider_error_code;
            attempt.provider_error_message = provider_error_message;
            attempt.completed_at = Some(completed_at);
            Ok(attempt.clone())
        })
    }
}

impl PaymentRefundRuntimeStore for InMemoryPaymentIntentRuntimeStore {
    fn load_refund_by_idempotency(
        &self,
        tenant_id: String,
        idempotency_key: String,
    ) -> PaymentRefundRuntimeStoreFuture<'_, Option<PaymentRefundRuntimeRecord>> {
        let state = self.state.clone();
        Box::pin(async move {
            Ok(state
                .lock()
                .unwrap()
                .refunds
                .iter()
                .find(|refund| {
                    refund.tenant_id == tenant_id && refund.idempotency_key == idempotency_key
                })
                .cloned())
        })
    }

    fn load_refund_by_id(
        &self,
        tenant_id: String,
        id: String,
    ) -> PaymentRefundRuntimeStoreFuture<'_, Option<PaymentRefundRuntimeRecord>> {
        let state = self.state.clone();
        Box::pin(async move {
            Ok(state
                .lock()
                .unwrap()
                .refunds
                .iter()
                .find(|refund| refund.tenant_id == tenant_id && refund.id == id)
                .cloned())
        })
    }

    fn insert_refund(
        &self,
        refund: PaymentRefundRuntimeRecord,
        attempt: PaymentRefundAttemptRecord,
        items: Vec<PaymentRefundItemRecord>,
    ) -> PaymentRefundRuntimeStoreFuture<'_, PaymentRefundRuntimeRecord> {
        let state = self.state.clone();
        Box::pin(async move {
            let mut state = state.lock().unwrap();
            state.refund_attempts.push(attempt);
            state.refund_items.extend(items);
            state.refunds.push(refund.clone());
            Ok(refund)
        })
    }

    fn finish_refund_attempt(
        &self,
        id: String,
        status: String,
        provider_refund_id: Option<String>,
        failure_code: Option<String>,
        failure_message: Option<String>,
        finished_at: String,
    ) -> PaymentRefundRuntimeStoreFuture<'_, PaymentRefundAttemptRecord> {
        let state = self.state.clone();
        Box::pin(async move {
            let mut state = state.lock().unwrap();
            let attempt = state
                .refund_attempts
                .iter_mut()
                .find(|attempt| attempt.id == id || attempt.refund_id == id)
                .ok_or_else(|| DomainError::not_found("payment refund attempt was not found"))?;
            attempt.status = status;
            attempt.provider_refund_id = provider_refund_id;
            attempt.failure_code = failure_code;
            attempt.failure_message = failure_message;
            match attempt.status.as_str() {
                "SUCCEEDED" => attempt.succeeded_at = Some(finished_at.clone()),
                "FAILED" => attempt.failed_at = Some(finished_at.clone()),
                _ => {}
            }
            attempt.updated_at = finished_at;
            Ok(attempt.clone())
        })
    }

    fn finish_refund(
        &self,
        id: String,
        status: PaymentRefundStatus,
        updated_at: String,
        event: PaymentRefundEventRecord,
    ) -> PaymentRefundRuntimeStoreFuture<'_, PaymentRefundRuntimeRecord> {
        let state = self.state.clone();
        Box::pin(async move {
            let mut state = state.lock().unwrap();
            let refund = state
                .refunds
                .iter_mut()
                .find(|refund| refund.id == id)
                .ok_or_else(|| DomainError::not_found("payment refund was not found"))?;
            refund.status = status;
            refund.updated_at = updated_at;
            let refund = refund.clone();
            state.refund_events.push(event);
            Ok(refund)
        })
    }
}

#[derive(Default, Clone)]
pub struct InMemoryPaymentReconciliationRuntimeStore {
    state: Arc<Mutex<InMemoryPaymentReconciliationRuntimeState>>,
}

#[derive(Default)]
struct InMemoryPaymentReconciliationRuntimeState {
    statements: Vec<PaymentStatementRecord>,
    statement_items: Vec<PaymentStatementItemRecord>,
    reconciliation_items: Vec<PaymentReconciliationItemRecord>,
    runs: Vec<ReconciliationRunRecord>,
    ledger_entries: Vec<RuntimeReconciliationLedgerEntry>,
}

impl InMemoryPaymentReconciliationRuntimeStore {
    pub fn statements(&self) -> Vec<PaymentStatementRecord> {
        self.state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .statements
            .clone()
    }

    pub fn statement_items(&self) -> Vec<PaymentStatementItemRecord> {
        self.state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .statement_items
            .clone()
    }

    pub fn reconciliation_items(&self) -> Vec<PaymentReconciliationItemRecord> {
        self.state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .reconciliation_items
            .clone()
    }

    pub fn runs(&self) -> Vec<ReconciliationRunRecord> {
        self.state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .runs
            .clone()
    }

    pub fn with_runs(self, runs: Vec<ReconciliationRunRecord>) -> Self {
        {
            let mut state = self
                .state
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner);
            state.runs.extend(runs);
        }
        self
    }

    pub fn with_ledger_entries(self, entries: Vec<RuntimeReconciliationLedgerEntry>) -> Self {
        {
            let mut state = self
                .state
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner);
            state.ledger_entries.extend(entries);
        }
        self
    }

    pub fn with_statement(
        self,
        statement: PaymentStatementRecord,
        items: Vec<PaymentStatementItemRecord>,
    ) -> Self {
        {
            let mut state = self
                .state
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner);
            state.statements.push(statement);
            state.statement_items.extend(items);
        }
        self
    }
}

impl PaymentReconciliationRuntimeStore for InMemoryPaymentReconciliationRuntimeStore {
    fn load_statement_by_idempotency(
        &self,
        tenant_id: String,
        idempotency_key: String,
    ) -> PaymentReconciliationRuntimeStoreFuture<'_, Option<PaymentStatementRecord>> {
        let state = self.state.clone();
        Box::pin(async move {
            Ok(state
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner)
                .statements
                .iter()
                .find(|statement| {
                    statement.tenant_id == tenant_id && statement.idempotency_key == idempotency_key
                })
                .cloned())
        })
    }

    fn load_statement_items(
        &self,
        tenant_id: String,
        statement_id: String,
    ) -> PaymentReconciliationRuntimeStoreFuture<'_, Vec<PaymentStatementItemRecord>> {
        let state = self.state.clone();
        Box::pin(async move {
            Ok(state
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner)
                .statement_items
                .iter()
                .filter(|item| item.tenant_id == tenant_id && item.statement_id == statement_id)
                .cloned()
                .collect())
        })
    }

    fn insert_statement(
        &self,
        statement: PaymentStatementRecord,
        items: Vec<PaymentStatementItemRecord>,
    ) -> PaymentReconciliationRuntimeStoreFuture<'_, PaymentStatementRecord> {
        let state = self.state.clone();
        Box::pin(async move {
            let mut state = state
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner);
            state.statement_items.extend(items);
            state.statements.push(statement.clone());
            Ok(statement)
        })
    }

    fn insert_reconciliation_items(
        &self,
        items: Vec<PaymentReconciliationItemRecord>,
    ) -> PaymentReconciliationRuntimeStoreFuture<'_, Vec<PaymentReconciliationItemRecord>> {
        let state = self.state.clone();
        Box::pin(async move {
            state
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner)
                .reconciliation_items
                .extend(items.clone());
            Ok(items)
        })
    }

    fn claim_due_reconciliation_runs(
        &self,
        command: ReconciliationRunClaimCommand,
    ) -> PaymentReconciliationRuntimeStoreFuture<'_, Vec<ReconciliationRunRecord>> {
        let state = self.state.clone();
        Box::pin(async move {
            let mut state = state
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner);
            let mut claimed = Vec::new();
            for run in &mut state.runs {
                if claimed.len() as i64 >= command.limit {
                    break;
                }
                if run.tenant_id != command.tenant_id {
                    continue;
                }
                if let Some(organization_id) = command.organization_id.as_deref() {
                    if run.organization_id.as_deref() != Some(organization_id) {
                        continue;
                    }
                }
                if run.status != "queued" && run.status != "pending" {
                    continue;
                }
                run.status = "running".to_owned();
                claimed.push(run.clone());
            }
            Ok(claimed)
        })
    }

    fn load_statement_for_reconciliation_run(
        &self,
        command: LoadReconciliationStatementCommand,
    ) -> PaymentReconciliationRuntimeStoreFuture<'_, Option<PaymentStatementRecord>> {
        let state = self.state.clone();
        Box::pin(async move {
            Ok(state
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner)
                .statements
                .iter()
                .find(|statement| {
                    statement.tenant_id == command.tenant_id
                        && statement.supplier_code == command.provider_code
                        && statement.period_start == command.period_start
                        && statement.period_end == command.period_end
                        && statement.parse_status == "parsed"
                })
                .cloned())
        })
    }

    fn load_reconciliation_ledger_entries(
        &self,
        command: LoadReconciliationLedgerCommand,
    ) -> PaymentReconciliationRuntimeStoreFuture<'_, Vec<RuntimeReconciliationLedgerEntry>> {
        let state = self.state.clone();
        Box::pin(async move {
            Ok(state
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner)
                .ledger_entries
                .iter()
                .filter(|entry| {
                    entry.supplier_code == command.provider_code.as_deref().unwrap_or("")
                        && entry.occurred_at >= command.period_start
                        && entry.occurred_at <= command.period_end
                })
                .cloned()
                .collect())
        })
    }

    fn finish_reconciliation_run(
        &self,
        command: FinishReconciliationRunCommand,
    ) -> PaymentReconciliationRuntimeStoreFuture<'_, ()> {
        let state = self.state.clone();
        Box::pin(async move {
            let mut state = state
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner);
            let Some(run) = state
                .runs
                .iter_mut()
                .find(|run| run.id == command.reconciliation_run_id)
            else {
                return Err(DomainError::new(format!(
                    "reconciliation run {} not found",
                    command.reconciliation_run_id
                )));
            };
            run.status = command.status;
            Ok(())
        })
    }
}

fn validate_import_statement_command(
    command: &RuntimeImportPaymentStatementCommand,
) -> DomainResult<()> {
    require_non_empty("tenant_id", &command.tenant_id)?;
    require_non_empty("statement_no", &command.statement_no)?;
    require_non_empty("supplier_code", &command.supplier_code)?;
    require_non_empty("statement_type", &command.statement_type)?;
    require_non_empty("settlement_currency", &command.settlement_currency)?;
    require_non_empty("period_start", &command.period_start)?;
    require_non_empty("period_end", &command.period_end)?;
    require_non_empty("request_no", &command.request_no)?;
    require_non_empty("idempotency_key", &command.idempotency_key)?;
    if command.row_count < 0 {
        return Err(DomainError::new(
            "payment statement row_count must not be negative",
        ));
    }
    if command.row_count as usize != command.items.len() {
        return Err(DomainError::new(
            "payment statement row_count must equal imported item count",
        ));
    }
    for item in &command.items {
        require_non_empty("statement item row_no", &item.row_no)?;
        require_non_empty("statement item supplier_code", &item.supplier_code)?;
        require_non_empty("statement item transaction_type", &item.transaction_type)?;
        require_non_empty("statement item occurred_at", &item.occurred_at)?;
        require_non_empty("statement item gross_amount", &item.gross_amount)?;
        require_non_empty("statement item fee_amount", &item.fee_amount)?;
        require_non_empty("statement item net_amount", &item.net_amount)?;
        require_non_empty("statement item currency_code", &item.currency_code)?;
        require_non_empty("statement item raw_row_digest", &item.raw_row_digest)?;
    }
    Ok(())
}

fn validate_generate_command(
    command: &RuntimeGeneratePaymentReconciliationItemsCommand,
) -> DomainResult<()> {
    require_non_empty("tenant_id", &command.tenant_id)?;
    require_non_empty("reconciliation_run_id", &command.reconciliation_run_id)?;
    require_non_empty("statement_id", &command.statement_id)?;
    require_non_empty("generated_at", &command.generated_at)
}

fn reconciliation_key_for_statement_item(item: &PaymentStatementItemRecord) -> Option<String> {
    item.sdkwork_out_refund_no
        .as_ref()
        .map(|value| format!("refund:{value}"))
        .or_else(|| {
            item.sdkwork_out_trade_no
                .as_ref()
                .map(|value| format!("trade:{value}"))
        })
}

fn reconciliation_key_for_internal(item: &RuntimeReconciliationLedgerEntry) -> Option<String> {
    item.sdkwork_out_refund_no
        .as_ref()
        .map(|value| format!("refund:{value}"))
        .or_else(|| {
            item.sdkwork_out_trade_no
                .as_ref()
                .map(|value| format!("trade:{value}"))
        })
}

fn decimal_difference(left: &str, right: &str) -> Option<String> {
    let left = decimal_amount_to_minor(left)?;
    let right = decimal_amount_to_minor(right)?;
    let difference = left.checked_sub(right)?;
    Some(format_minor_amount(difference))
}

fn status_difference_type(
    provider_status: &str,
    internal_status: &str,
) -> PaymentReconciliationDifferenceType {
    let provider = provider_status.to_ascii_lowercase();
    let internal = internal_status.to_ascii_lowercase();
    if provider.contains("chargeback") || internal.contains("chargeback") {
        PaymentReconciliationDifferenceType::ChargebackMismatch
    } else if provider.contains("settle") || internal.contains("settle") {
        PaymentReconciliationDifferenceType::SettlementMismatch
    } else {
        PaymentReconciliationDifferenceType::StatusMismatch
    }
}

fn decimal_amount_to_minor(amount: &str) -> Option<i64> {
    let (units, fraction) = amount.split_once('.').unwrap_or((amount, "0"));
    let units = units.parse::<i64>().ok()?;
    let cents = format!("{fraction:0<2}");
    let cents = cents.get(..2)?.parse::<i64>().ok()?;
    units.checked_mul(100)?.checked_add(cents)
}

fn format_minor_amount(amount: i64) -> String {
    let sign = if amount < 0 { "-" } else { "" };
    let abs_amount = amount.abs();
    format!("{sign}{}.{:02}", abs_amount / 100, abs_amount % 100)
}

fn require_non_empty(field: &str, value: &str) -> DomainResult<()> {
    if value.trim().is_empty() {
        Err(DomainError::new(format!("{field} must not be empty")))
    } else {
        Ok(())
    }
}
