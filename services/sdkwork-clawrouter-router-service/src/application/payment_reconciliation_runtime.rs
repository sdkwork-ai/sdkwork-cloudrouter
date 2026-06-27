use std::collections::{HashMap, HashSet};
use std::future::Future;
use std::pin::Pin;
use std::sync::{Arc, Mutex};

use serde_json::Value;

use crate::application::EntityUuidGenerator;
use crate::domain::{DomainError, DomainResult};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeImportPaymentStatementCommand {
    pub tenant_id: String,
    pub organization_id: Option<String>,
    pub statement_no: String,
    pub provider_code: String,
    pub provider_account_id: Option<String>,
    pub statement_type: String,
    pub settlement_currency: String,
    pub period_start: String,
    pub period_end: String,
    pub provider_statement_id: Option<String>,
    pub file_ref: Option<String>,
    pub file_digest: String,
    pub download_status: String,
    pub parse_status: String,
    pub row_count: i64,
    pub total_amount: String,
    pub fee_amount: String,
    pub net_amount: String,
    pub downloaded_at: Option<String>,
    pub parsed_at: Option<String>,
    pub request_no: String,
    pub idempotency_key: String,
    pub items: Vec<RuntimeImportPaymentStatementItemCommand>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeImportPaymentStatementItemCommand {
    pub row_no: String,
    pub provider_code: String,
    pub provider_account_id: Option<String>,
    pub native_trade_id: Option<String>,
    pub native_refund_id: Option<String>,
    pub native_order_no: Option<String>,
    pub sdkwork_out_trade_no: Option<String>,
    pub sdkwork_out_refund_no: Option<String>,
    pub transaction_type: String,
    pub occurred_at: String,
    pub settled_at: Option<String>,
    pub gross_amount: String,
    pub fee_amount: String,
    pub net_amount: String,
    pub currency_code: String,
    pub provider_status: String,
    pub raw_row_digest: String,
    pub metadata_json: Value,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeGeneratePaymentReconciliationItemsCommand {
    pub tenant_id: String,
    pub reconciliation_run_id: String,
    pub statement_id: String,
    pub generated_at: String,
    pub internal_items: Vec<RuntimeReconciliationLedgerEntry>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeReconciliationLedgerEntry {
    pub provider_code: String,
    pub payment_attempt_id: Option<String>,
    pub refund_id: Option<String>,
    pub refund_attempt_id: Option<String>,
    pub sdkwork_out_trade_no: Option<String>,
    pub sdkwork_out_refund_no: Option<String>,
    pub internal_amount: String,
    pub provider_amount: String,
    pub internal_fee_amount: String,
    pub provider_fee_amount: String,
    pub currency_code: String,
    pub internal_status: String,
    pub provider_status: String,
    pub occurred_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaymentStatementRecord {
    pub id: String,
    pub tenant_id: String,
    pub organization_id: Option<String>,
    pub statement_no: String,
    pub provider_code: String,
    pub provider_account_id: Option<String>,
    pub statement_type: String,
    pub settlement_currency: String,
    pub period_start: String,
    pub period_end: String,
    pub provider_statement_id: Option<String>,
    pub file_ref: Option<String>,
    pub file_digest: String,
    pub download_status: String,
    pub parse_status: String,
    pub row_count: i64,
    pub total_amount: String,
    pub fee_amount: String,
    pub net_amount: String,
    pub downloaded_at: Option<String>,
    pub parsed_at: Option<String>,
    pub request_no: String,
    pub idempotency_key: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaymentStatementItemRecord {
    pub id: String,
    pub tenant_id: String,
    pub organization_id: Option<String>,
    pub statement_id: String,
    pub provider_code: String,
    pub provider_account_id: Option<String>,
    pub row_no: String,
    pub native_trade_id: Option<String>,
    pub native_refund_id: Option<String>,
    pub native_order_no: Option<String>,
    pub sdkwork_out_trade_no: Option<String>,
    pub sdkwork_out_refund_no: Option<String>,
    pub transaction_type: String,
    pub occurred_at: String,
    pub settled_at: Option<String>,
    pub gross_amount: String,
    pub fee_amount: String,
    pub net_amount: String,
    pub currency_code: String,
    pub provider_status: String,
    pub raw_row_digest: String,
    pub metadata_json: Value,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PaymentReconciliationDifferenceType {
    MissingInSdkwork,
    MissingInProvider,
    AmountMismatch,
    CurrencyMismatch,
    StatusMismatch,
    DuplicateProviderRecord,
    FeeMismatch,
    SettlementMismatch,
    ChargebackMismatch,
}

impl PaymentReconciliationDifferenceType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::MissingInSdkwork => "missing_in_sdkwork",
            Self::MissingInProvider => "missing_in_provider",
            Self::AmountMismatch => "amount_mismatch",
            Self::CurrencyMismatch => "currency_mismatch",
            Self::StatusMismatch => "status_mismatch",
            Self::DuplicateProviderRecord => "duplicate_provider_record",
            Self::FeeMismatch => "fee_mismatch",
            Self::SettlementMismatch => "settlement_mismatch",
            Self::ChargebackMismatch => "chargeback_mismatch",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaymentReconciliationItemRecord {
    pub id: String,
    pub tenant_id: String,
    pub organization_id: Option<String>,
    pub reconciliation_run_id: String,
    pub statement_id: String,
    pub statement_item_id: Option<String>,
    pub payment_attempt_id: Option<String>,
    pub refund_id: Option<String>,
    pub refund_attempt_id: Option<String>,
    pub provider_code: String,
    pub difference_type: PaymentReconciliationDifferenceType,
    pub match_status: String,
    pub internal_amount: Option<String>,
    pub provider_amount: Option<String>,
    pub difference_amount: Option<String>,
    pub currency_code: Option<String>,
    pub internal_status: Option<String>,
    pub provider_status: Option<String>,
    pub resolution_status: String,
    pub resolution_note: Option<String>,
    pub resolved_by: Option<String>,
    pub resolved_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub type PaymentReconciliationRuntimeStoreFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

pub trait PaymentReconciliationRuntimeStore: Send + Sync {
    fn load_statement_by_idempotency(
        &self,
        tenant_id: String,
        idempotency_key: String,
    ) -> PaymentReconciliationRuntimeStoreFuture<'_, Option<PaymentStatementRecord>>;

    fn load_statement_items(
        &self,
        tenant_id: String,
        statement_id: String,
    ) -> PaymentReconciliationRuntimeStoreFuture<'_, Vec<PaymentStatementItemRecord>>;

    fn insert_statement(
        &self,
        statement: PaymentStatementRecord,
        items: Vec<PaymentStatementItemRecord>,
    ) -> PaymentReconciliationRuntimeStoreFuture<'_, PaymentStatementRecord>;

    fn insert_reconciliation_items(
        &self,
        items: Vec<PaymentReconciliationItemRecord>,
    ) -> PaymentReconciliationRuntimeStoreFuture<'_, Vec<PaymentReconciliationItemRecord>>;
}

pub struct PaymentReconciliationRuntimeService<'a, S>
where
    S: PaymentReconciliationRuntimeStore + ?Sized,
{
    store: &'a S,
    entity_uuid_generator: &'a (dyn EntityUuidGenerator + Send + Sync),
}

impl<'a, S> PaymentReconciliationRuntimeService<'a, S>
where
    S: PaymentReconciliationRuntimeStore + ?Sized,
{
    pub fn new(
        store: &'a S,
        entity_uuid_generator: &'a (dyn EntityUuidGenerator + Send + Sync),
    ) -> Self {
        Self {
            store,
            entity_uuid_generator,
        }
    }

    pub async fn import_statement(
        &self,
        command: RuntimeImportPaymentStatementCommand,
    ) -> DomainResult<PaymentStatementRecord> {
        validate_import_statement_command(&command)?;
        if let Some(existing) = self
            .store
            .load_statement_by_idempotency(
                command.tenant_id.clone(),
                command.idempotency_key.clone(),
            )
            .await?
        {
            return Ok(existing);
        }

        let statement_id = self.entity_uuid_generator.generate_entity_uuid()?;
        let statement = PaymentStatementRecord {
            id: statement_id.clone(),
            tenant_id: command.tenant_id.clone(),
            organization_id: command.organization_id.clone(),
            statement_no: command.statement_no.clone(),
            provider_code: command.provider_code.clone(),
            provider_account_id: command.provider_account_id.clone(),
            statement_type: command.statement_type.clone(),
            settlement_currency: command.settlement_currency.clone(),
            period_start: command.period_start.clone(),
            period_end: command.period_end.clone(),
            provider_statement_id: command.provider_statement_id.clone(),
            file_ref: command.file_ref.clone(),
            file_digest: command.file_digest.clone(),
            download_status: command.download_status.clone(),
            parse_status: command.parse_status.clone(),
            row_count: command.row_count,
            total_amount: command.total_amount.clone(),
            fee_amount: command.fee_amount.clone(),
            net_amount: command.net_amount.clone(),
            downloaded_at: command.downloaded_at.clone(),
            parsed_at: command.parsed_at.clone(),
            request_no: command.request_no.clone(),
            idempotency_key: command.idempotency_key.clone(),
            created_at: command
                .parsed_at
                .clone()
                .unwrap_or_else(|| command.period_end.clone()),
            updated_at: command
                .parsed_at
                .clone()
                .unwrap_or_else(|| command.period_end.clone()),
        };
        let items = command
            .items
            .iter()
            .map(|item| self.statement_item(&command, &statement_id, item))
            .collect::<DomainResult<Vec<_>>>()?;
        self.store.insert_statement(statement, items).await
    }

    pub async fn generate_reconciliation_items(
        &self,
        command: RuntimeGeneratePaymentReconciliationItemsCommand,
    ) -> DomainResult<Vec<PaymentReconciliationItemRecord>> {
        validate_generate_command(&command)?;
        let statement_items = self
            .store
            .load_statement_items(command.tenant_id.clone(), command.statement_id.clone())
            .await?;
        let internal_by_key = command
            .internal_items
            .iter()
            .filter_map(|item| reconciliation_key_for_internal(item).map(|key| (key, item)))
            .collect::<HashMap<_, _>>();
        let mut matched_keys = HashSet::new();
        let mut seen_provider_keys = HashSet::new();
        let mut results = Vec::new();

        for statement_item in &statement_items {
            let Some(key) = reconciliation_key_for_statement_item(statement_item) else {
                continue;
            };
            if !seen_provider_keys.insert(key.clone()) {
                results.push(self.reconciliation_item_from_statement(
                    &command,
                    statement_item,
                    None,
                    PaymentReconciliationDifferenceType::DuplicateProviderRecord,
                    "duplicate".to_owned(),
                    Some(
                        "provider statement contains duplicate SDKWORK trade/refund key".to_owned(),
                    ),
                )?);
                continue;
            }
            let Some(internal) = internal_by_key.get(&key).copied() else {
                results.push(self.reconciliation_item_from_statement(
                    &command,
                    statement_item,
                    None,
                    PaymentReconciliationDifferenceType::MissingInSdkwork,
                    "mismatch".to_owned(),
                    Some("provider statement row has no SDKWORK payment/refund fact".to_owned()),
                )?);
                continue;
            };
            matched_keys.insert(key);
            if statement_item.currency_code != internal.currency_code {
                results.push(
                    self.reconciliation_item_from_statement(
                        &command,
                        statement_item,
                        Some(internal),
                        PaymentReconciliationDifferenceType::CurrencyMismatch,
                        "mismatch".to_owned(),
                        Some(
                            "currency mismatch between provider statement and SDKWORK ledger"
                                .to_owned(),
                        ),
                    )?,
                );
            } else if statement_item.gross_amount != internal.internal_amount {
                results.push(self.reconciliation_item_from_statement(
                    &command,
                    statement_item,
                    Some(internal),
                    PaymentReconciliationDifferenceType::AmountMismatch,
                    "mismatch".to_owned(),
                    Some(
                        "amount mismatch between provider statement and SDKWORK ledger".to_owned(),
                    ),
                )?);
            } else if statement_item.fee_amount != internal.internal_fee_amount {
                results.push(self.reconciliation_item_from_statement(
                    &command,
                    statement_item,
                    Some(internal),
                    PaymentReconciliationDifferenceType::FeeMismatch,
                    "mismatch".to_owned(),
                    Some("fee mismatch between provider statement and SDKWORK ledger".to_owned()),
                )?);
            } else if statement_item.provider_status != internal.internal_status {
                let difference_type = status_difference_type(
                    &statement_item.provider_status,
                    &internal.internal_status,
                );
                results.push(self.reconciliation_item_from_statement(
                    &command,
                    statement_item,
                    Some(internal),
                    difference_type,
                    "mismatch".to_owned(),
                    Some(
                        "status mismatch between provider statement and SDKWORK ledger".to_owned(),
                    ),
                )?);
            }
        }

        for internal in &command.internal_items {
            let Some(key) = reconciliation_key_for_internal(internal) else {
                continue;
            };
            if !matched_keys.contains(&key) {
                results.push(self.reconciliation_item_from_internal(
                    &command,
                    internal,
                    PaymentReconciliationDifferenceType::MissingInProvider,
                    "mismatch".to_owned(),
                    Some("SDKWORK payment/refund fact is missing in provider statement".to_owned()),
                )?);
            }
        }

        self.store.insert_reconciliation_items(results).await
    }

    fn statement_item(
        &self,
        command: &RuntimeImportPaymentStatementCommand,
        statement_id: &str,
        item: &RuntimeImportPaymentStatementItemCommand,
    ) -> DomainResult<PaymentStatementItemRecord> {
        Ok(PaymentStatementItemRecord {
            id: self.entity_uuid_generator.generate_entity_uuid()?,
            tenant_id: command.tenant_id.clone(),
            organization_id: command.organization_id.clone(),
            statement_id: statement_id.to_owned(),
            provider_code: item.provider_code.clone(),
            provider_account_id: item.provider_account_id.clone(),
            row_no: item.row_no.clone(),
            native_trade_id: item.native_trade_id.clone(),
            native_refund_id: item.native_refund_id.clone(),
            native_order_no: item.native_order_no.clone(),
            sdkwork_out_trade_no: item.sdkwork_out_trade_no.clone(),
            sdkwork_out_refund_no: item.sdkwork_out_refund_no.clone(),
            transaction_type: item.transaction_type.clone(),
            occurred_at: item.occurred_at.clone(),
            settled_at: item.settled_at.clone(),
            gross_amount: item.gross_amount.clone(),
            fee_amount: item.fee_amount.clone(),
            net_amount: item.net_amount.clone(),
            currency_code: item.currency_code.clone(),
            provider_status: item.provider_status.clone(),
            raw_row_digest: item.raw_row_digest.clone(),
            metadata_json: item.metadata_json.clone(),
            created_at: command
                .parsed_at
                .clone()
                .unwrap_or_else(|| item.occurred_at.clone()),
        })
    }

    fn reconciliation_item_from_statement(
        &self,
        command: &RuntimeGeneratePaymentReconciliationItemsCommand,
        statement_item: &PaymentStatementItemRecord,
        internal: Option<&RuntimeReconciliationLedgerEntry>,
        difference_type: PaymentReconciliationDifferenceType,
        match_status: String,
        resolution_note: Option<String>,
    ) -> DomainResult<PaymentReconciliationItemRecord> {
        Ok(PaymentReconciliationItemRecord {
            id: self.entity_uuid_generator.generate_entity_uuid()?,
            tenant_id: command.tenant_id.clone(),
            organization_id: statement_item.organization_id.clone(),
            reconciliation_run_id: command.reconciliation_run_id.clone(),
            statement_id: command.statement_id.clone(),
            statement_item_id: Some(statement_item.id.clone()),
            payment_attempt_id: internal.and_then(|item| item.payment_attempt_id.clone()),
            refund_id: internal.and_then(|item| item.refund_id.clone()),
            refund_attempt_id: internal.and_then(|item| item.refund_attempt_id.clone()),
            provider_code: statement_item.provider_code.clone(),
            difference_type,
            match_status,
            internal_amount: internal.map(|item| item.internal_amount.clone()),
            provider_amount: Some(statement_item.gross_amount.clone()),
            difference_amount: internal.and_then(|item| {
                decimal_difference(&item.internal_amount, &statement_item.gross_amount)
            }),
            currency_code: Some(statement_item.currency_code.clone()),
            internal_status: internal.map(|item| item.internal_status.clone()),
            provider_status: Some(statement_item.provider_status.clone()),
            resolution_status: "unresolved".to_owned(),
            resolution_note,
            resolved_by: None,
            resolved_at: None,
            created_at: command.generated_at.clone(),
            updated_at: command.generated_at.clone(),
        })
    }

    fn reconciliation_item_from_internal(
        &self,
        command: &RuntimeGeneratePaymentReconciliationItemsCommand,
        internal: &RuntimeReconciliationLedgerEntry,
        difference_type: PaymentReconciliationDifferenceType,
        match_status: String,
        resolution_note: Option<String>,
    ) -> DomainResult<PaymentReconciliationItemRecord> {
        Ok(PaymentReconciliationItemRecord {
            id: self.entity_uuid_generator.generate_entity_uuid()?,
            tenant_id: command.tenant_id.clone(),
            organization_id: None,
            reconciliation_run_id: command.reconciliation_run_id.clone(),
            statement_id: command.statement_id.clone(),
            statement_item_id: None,
            payment_attempt_id: internal.payment_attempt_id.clone(),
            refund_id: internal.refund_id.clone(),
            refund_attempt_id: internal.refund_attempt_id.clone(),
            provider_code: internal.provider_code.clone(),
            difference_type,
            match_status,
            internal_amount: Some(internal.internal_amount.clone()),
            provider_amount: None,
            difference_amount: Some(internal.internal_amount.clone()),
            currency_code: Some(internal.currency_code.clone()),
            internal_status: Some(internal.internal_status.clone()),
            provider_status: None,
            resolution_status: "unresolved".to_owned(),
            resolution_note,
            resolved_by: None,
            resolved_at: None,
            created_at: command.generated_at.clone(),
            updated_at: command.generated_at.clone(),
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
}

impl InMemoryPaymentReconciliationRuntimeStore {
    pub fn statements(&self) -> Vec<PaymentStatementRecord> {
        self.state.lock().unwrap().statements.clone()
    }

    pub fn statement_items(&self) -> Vec<PaymentStatementItemRecord> {
        self.state.lock().unwrap().statement_items.clone()
    }

    pub fn reconciliation_items(&self) -> Vec<PaymentReconciliationItemRecord> {
        self.state.lock().unwrap().reconciliation_items.clone()
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
                .unwrap()
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
                .unwrap()
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
            let mut state = state.lock().unwrap();
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
                .unwrap()
                .reconciliation_items
                .extend(items.clone());
            Ok(items)
        })
    }
}

fn validate_import_statement_command(
    command: &RuntimeImportPaymentStatementCommand,
) -> DomainResult<()> {
    require_non_empty("tenant_id", &command.tenant_id)?;
    require_non_empty("statement_no", &command.statement_no)?;
    require_non_empty("provider_code", &command.provider_code)?;
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
        require_non_empty("statement item provider_code", &item.provider_code)?;
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
