use sdkwork_clawrouter_router_service::application::{
    EntityUuidGenerator, InMemoryPaymentReconciliationRuntimeStore,
    PaymentReconciliationDifferenceType, PaymentReconciliationRuntimeService,
    RuntimeGeneratePaymentReconciliationItemsCommand, RuntimeImportPaymentStatementCommand,
    RuntimeImportPaymentStatementItemCommand, RuntimeReconciliationLedgerEntry,
};
use sdkwork_clawrouter_router_service::domain::DomainResult;

struct TestUuidGenerator;

impl EntityUuidGenerator for TestUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        use std::sync::atomic::{AtomicU64, Ordering};
        static COUNTER: AtomicU64 = AtomicU64::new(1);
        Ok(format!(
            "recon-runtime-{}",
            COUNTER.fetch_add(1, Ordering::SeqCst)
        ))
    }
}

#[tokio::test]
async fn import_statement_persists_items_and_is_idempotent() {
    let store = InMemoryPaymentReconciliationRuntimeStore::default();
    let service = PaymentReconciliationRuntimeService::new(&store, &TestUuidGenerator);

    let command = import_command();
    let first = service.import_statement(command.clone()).await.unwrap();
    let duplicate = service.import_statement(command).await.unwrap();

    assert_eq!(first.id, duplicate.id);
    assert_eq!(1, store.statements().len());
    assert_eq!(2, store.statement_items().len());
    assert_eq!("stmt-2026-05-001", store.statements()[0].statement_no);
    assert_eq!("statement-row-1", store.statement_items()[0].row_no);
}

#[tokio::test]
async fn generate_reconciliation_items_reports_missing_fee_and_status_cases() {
    let store = InMemoryPaymentReconciliationRuntimeStore::default();
    let service = PaymentReconciliationRuntimeService::new(&store, &TestUuidGenerator);
    let statement = service
        .import_statement(import_command_with_reconciliation_rows())
        .await
        .unwrap();

    let generated = service
        .generate_reconciliation_items(RuntimeGeneratePaymentReconciliationItemsCommand {
            tenant_id: "100001".to_owned(),
            reconciliation_run_id: "run-2026-05-001".to_owned(),
            statement_id: statement.id.clone(),
            generated_at: "2026-05-29T00:00:00Z".to_owned(),
            internal_items: vec![
                RuntimeReconciliationLedgerEntry {
                    provider_code: "stripe".to_owned(),
                    payment_attempt_id: Some("pay-attempt-1".to_owned()),
                    refund_id: None,
                    refund_attempt_id: None,
                    sdkwork_out_trade_no: Some("trade-1001".to_owned()),
                    sdkwork_out_refund_no: None,
                    internal_amount: "20.00".to_owned(),
                    provider_amount: "20.00".to_owned(),
                    internal_fee_amount: "1.00".to_owned(),
                    provider_fee_amount: "1.00".to_owned(),
                    currency_code: "CNY".to_owned(),
                    internal_status: "succeeded".to_owned(),
                    provider_status: "succeeded".to_owned(),
                    occurred_at: "2026-05-29T00:00:00Z".to_owned(),
                },
                RuntimeReconciliationLedgerEntry {
                    provider_code: "stripe".to_owned(),
                    payment_attempt_id: Some("pay-attempt-2".to_owned()),
                    refund_id: None,
                    refund_attempt_id: None,
                    sdkwork_out_trade_no: Some("trade-2001".to_owned()),
                    sdkwork_out_refund_no: None,
                    internal_amount: "10.00".to_owned(),
                    provider_amount: "10.00".to_owned(),
                    internal_fee_amount: "0.50".to_owned(),
                    provider_fee_amount: "0.80".to_owned(),
                    currency_code: "CNY".to_owned(),
                    internal_status: "succeeded".to_owned(),
                    provider_status: "succeeded".to_owned(),
                    occurred_at: "2026-05-29T00:00:00Z".to_owned(),
                },
                RuntimeReconciliationLedgerEntry {
                    provider_code: "stripe".to_owned(),
                    payment_attempt_id: Some("pay-attempt-3".to_owned()),
                    refund_id: None,
                    refund_attempt_id: None,
                    sdkwork_out_trade_no: Some("trade-3001".to_owned()),
                    sdkwork_out_refund_no: None,
                    internal_amount: "11.00".to_owned(),
                    provider_amount: "9.00".to_owned(),
                    internal_fee_amount: "0.90".to_owned(),
                    provider_fee_amount: "0.90".to_owned(),
                    currency_code: "CNY".to_owned(),
                    internal_status: "processing".to_owned(),
                    provider_status: "failed".to_owned(),
                    occurred_at: "2026-05-29T00:00:00Z".to_owned(),
                },
                RuntimeReconciliationLedgerEntry {
                    provider_code: "stripe".to_owned(),
                    payment_attempt_id: None,
                    refund_id: Some("refund-1".to_owned()),
                    refund_attempt_id: Some("refund-attempt-1".to_owned()),
                    sdkwork_out_trade_no: None,
                    sdkwork_out_refund_no: Some("refund-1001".to_owned()),
                    internal_amount: "4.00".to_owned(),
                    provider_amount: "4.00".to_owned(),
                    internal_fee_amount: "0.00".to_owned(),
                    provider_fee_amount: "0.00".to_owned(),
                    currency_code: "CNY".to_owned(),
                    internal_status: "succeeded".to_owned(),
                    provider_status: "succeeded".to_owned(),
                    occurred_at: "2026-05-29T00:00:00Z".to_owned(),
                },
            ],
        })
        .await
        .unwrap();

    let difference_types: Vec<&str> = generated
        .iter()
        .map(|item| item.difference_type.as_str())
        .collect();

    assert!(
        difference_types.contains(&PaymentReconciliationDifferenceType::MissingInSdkwork.as_str())
    );
    assert!(difference_types.contains(&PaymentReconciliationDifferenceType::FeeMismatch.as_str()));
    assert!(
        difference_types.contains(&PaymentReconciliationDifferenceType::StatusMismatch.as_str())
    );
    assert!(
        difference_types.contains(&PaymentReconciliationDifferenceType::MissingInProvider.as_str())
    );
    assert_eq!(4, store.reconciliation_items().len());
}

#[tokio::test]
async fn generate_reconciliation_items_reports_duplicate_amount_and_currency_cases() {
    let store = InMemoryPaymentReconciliationRuntimeStore::default();
    let service = PaymentReconciliationRuntimeService::new(&store, &TestUuidGenerator);
    let statement = service
        .import_statement(import_command_with_duplicate_amount_and_currency_rows())
        .await
        .unwrap();

    let generated = service
        .generate_reconciliation_items(RuntimeGeneratePaymentReconciliationItemsCommand {
            tenant_id: "100001".to_owned(),
            reconciliation_run_id: "run-2026-05-002".to_owned(),
            statement_id: statement.id.clone(),
            generated_at: "2026-05-29T00:00:00Z".to_owned(),
            internal_items: vec![
                RuntimeReconciliationLedgerEntry {
                    provider_code: "stripe".to_owned(),
                    payment_attempt_id: Some("pay-dup".to_owned()),
                    refund_id: None,
                    refund_attempt_id: None,
                    sdkwork_out_trade_no: Some("trade-dup".to_owned()),
                    sdkwork_out_refund_no: None,
                    internal_amount: "8.00".to_owned(),
                    provider_amount: "8.00".to_owned(),
                    internal_fee_amount: "0.40".to_owned(),
                    provider_fee_amount: "0.40".to_owned(),
                    currency_code: "CNY".to_owned(),
                    internal_status: "succeeded".to_owned(),
                    provider_status: "succeeded".to_owned(),
                    occurred_at: "2026-05-29T00:00:00Z".to_owned(),
                },
                RuntimeReconciliationLedgerEntry {
                    provider_code: "stripe".to_owned(),
                    payment_attempt_id: Some("pay-amount".to_owned()),
                    refund_id: None,
                    refund_attempt_id: None,
                    sdkwork_out_trade_no: Some("trade-amount".to_owned()),
                    sdkwork_out_refund_no: None,
                    internal_amount: "10.00".to_owned(),
                    provider_amount: "12.00".to_owned(),
                    internal_fee_amount: "0.50".to_owned(),
                    provider_fee_amount: "0.50".to_owned(),
                    currency_code: "CNY".to_owned(),
                    internal_status: "succeeded".to_owned(),
                    provider_status: "succeeded".to_owned(),
                    occurred_at: "2026-05-29T00:00:00Z".to_owned(),
                },
                RuntimeReconciliationLedgerEntry {
                    provider_code: "stripe".to_owned(),
                    payment_attempt_id: Some("pay-currency".to_owned()),
                    refund_id: None,
                    refund_attempt_id: None,
                    sdkwork_out_trade_no: Some("trade-currency".to_owned()),
                    sdkwork_out_refund_no: None,
                    internal_amount: "6.00".to_owned(),
                    provider_amount: "6.00".to_owned(),
                    internal_fee_amount: "0.30".to_owned(),
                    provider_fee_amount: "0.30".to_owned(),
                    currency_code: "USD".to_owned(),
                    internal_status: "succeeded".to_owned(),
                    provider_status: "succeeded".to_owned(),
                    occurred_at: "2026-05-29T00:00:00Z".to_owned(),
                },
            ],
        })
        .await
        .unwrap();

    let difference_types: Vec<&str> = generated
        .iter()
        .map(|item| item.difference_type.as_str())
        .collect();

    assert!(difference_types
        .contains(&PaymentReconciliationDifferenceType::DuplicateProviderRecord.as_str()));
    assert!(
        difference_types.contains(&PaymentReconciliationDifferenceType::AmountMismatch.as_str())
    );
    assert!(
        difference_types.contains(&PaymentReconciliationDifferenceType::CurrencyMismatch.as_str())
    );
}

#[tokio::test]
async fn generate_reconciliation_items_reports_settlement_and_chargeback_cases() {
    let store = InMemoryPaymentReconciliationRuntimeStore::default();
    let service = PaymentReconciliationRuntimeService::new(&store, &TestUuidGenerator);
    let statement = service
        .import_statement(import_command_with_settlement_and_chargeback_rows())
        .await
        .unwrap();

    let generated = service
        .generate_reconciliation_items(RuntimeGeneratePaymentReconciliationItemsCommand {
            tenant_id: "100001".to_owned(),
            reconciliation_run_id: "run-2026-05-003".to_owned(),
            statement_id: statement.id.clone(),
            generated_at: "2026-05-29T00:00:00Z".to_owned(),
            internal_items: vec![
                RuntimeReconciliationLedgerEntry {
                    provider_code: "stripe".to_owned(),
                    payment_attempt_id: Some("pay-settlement".to_owned()),
                    refund_id: None,
                    refund_attempt_id: None,
                    sdkwork_out_trade_no: Some("trade-settlement".to_owned()),
                    sdkwork_out_refund_no: None,
                    internal_amount: "5.00".to_owned(),
                    provider_amount: "5.00".to_owned(),
                    internal_fee_amount: "0.25".to_owned(),
                    provider_fee_amount: "0.25".to_owned(),
                    currency_code: "CNY".to_owned(),
                    internal_status: "settlement_pending".to_owned(),
                    provider_status: "settled".to_owned(),
                    occurred_at: "2026-05-29T00:00:00Z".to_owned(),
                },
                RuntimeReconciliationLedgerEntry {
                    provider_code: "stripe".to_owned(),
                    payment_attempt_id: Some("pay-chargeback".to_owned()),
                    refund_id: None,
                    refund_attempt_id: None,
                    sdkwork_out_trade_no: Some("trade-chargeback".to_owned()),
                    sdkwork_out_refund_no: None,
                    internal_amount: "7.00".to_owned(),
                    provider_amount: "7.00".to_owned(),
                    internal_fee_amount: "0.35".to_owned(),
                    provider_fee_amount: "0.35".to_owned(),
                    currency_code: "CNY".to_owned(),
                    internal_status: "succeeded".to_owned(),
                    provider_status: "chargeback".to_owned(),
                    occurred_at: "2026-05-29T00:00:00Z".to_owned(),
                },
            ],
        })
        .await
        .unwrap();

    let difference_types: Vec<&str> = generated
        .iter()
        .map(|item| item.difference_type.as_str())
        .collect();

    assert!(difference_types
        .contains(&PaymentReconciliationDifferenceType::SettlementMismatch.as_str()));
    assert!(difference_types
        .contains(&PaymentReconciliationDifferenceType::ChargebackMismatch.as_str()));
}

fn import_command_with_reconciliation_rows() -> RuntimeImportPaymentStatementCommand {
    let mut command = import_command();
    command.row_count = 4;
    command.total_amount = "51.00".to_owned();
    command.fee_amount = "3.20".to_owned();
    command.net_amount = "47.80".to_owned();
    command
        .items
        .push(RuntimeImportPaymentStatementItemCommand {
            row_no: "statement-row-3".to_owned(),
            provider_code: "stripe".to_owned(),
            provider_account_id: Some("acct-1".to_owned()),
            native_trade_id: Some("native-trade-3".to_owned()),
            native_refund_id: None,
            native_order_no: Some("order-3".to_owned()),
            sdkwork_out_trade_no: Some("trade-3001".to_owned()),
            sdkwork_out_refund_no: None,
            transaction_type: "payment".to_owned(),
            occurred_at: "2026-05-29T00:00:00Z".to_owned(),
            settled_at: Some("2026-05-29T00:00:00Z".to_owned()),
            gross_amount: "11.00".to_owned(),
            fee_amount: "0.90".to_owned(),
            net_amount: "10.10".to_owned(),
            currency_code: "CNY".to_owned(),
            provider_status: "failed".to_owned(),
            raw_row_digest: "row-digest-3".to_owned(),
            metadata_json: serde_json::json!({"channel": "stripe"}),
        });
    command
        .items
        .push(RuntimeImportPaymentStatementItemCommand {
            row_no: "statement-row-4".to_owned(),
            provider_code: "stripe".to_owned(),
            provider_account_id: Some("acct-1".to_owned()),
            native_trade_id: Some("native-trade-4".to_owned()),
            native_refund_id: None,
            native_order_no: Some("order-4".to_owned()),
            sdkwork_out_trade_no: Some("trade-provider-only".to_owned()),
            sdkwork_out_refund_no: None,
            transaction_type: "payment".to_owned(),
            occurred_at: "2026-05-29T00:00:00Z".to_owned(),
            settled_at: Some("2026-05-29T00:00:00Z".to_owned()),
            gross_amount: "10.00".to_owned(),
            fee_amount: "0.50".to_owned(),
            net_amount: "9.50".to_owned(),
            currency_code: "CNY".to_owned(),
            provider_status: "succeeded".to_owned(),
            raw_row_digest: "row-digest-4".to_owned(),
            metadata_json: serde_json::json!({"channel": "stripe"}),
        });
    command
}

fn import_command_with_duplicate_amount_and_currency_rows() -> RuntimeImportPaymentStatementCommand
{
    let mut command = import_command();
    command.statement_no = "stmt-2026-05-002".to_owned();
    command.idempotency_key = "stmt-idem-2".to_owned();
    command.row_count = 4;
    command.total_amount = "34.00".to_owned();
    command.fee_amount = "1.70".to_owned();
    command.net_amount = "32.30".to_owned();
    command.items = vec![
        RuntimeImportPaymentStatementItemCommand {
            row_no: "statement-row-dup-1".to_owned(),
            provider_code: "stripe".to_owned(),
            provider_account_id: Some("acct-1".to_owned()),
            native_trade_id: Some("native-dup-1".to_owned()),
            native_refund_id: None,
            native_order_no: Some("order-dup-1".to_owned()),
            sdkwork_out_trade_no: Some("trade-dup".to_owned()),
            sdkwork_out_refund_no: None,
            transaction_type: "payment".to_owned(),
            occurred_at: "2026-05-29T00:00:00Z".to_owned(),
            settled_at: Some("2026-05-29T00:00:00Z".to_owned()),
            gross_amount: "8.00".to_owned(),
            fee_amount: "0.40".to_owned(),
            net_amount: "7.60".to_owned(),
            currency_code: "CNY".to_owned(),
            provider_status: "succeeded".to_owned(),
            raw_row_digest: "row-digest-dup-1".to_owned(),
            metadata_json: serde_json::json!({"channel": "stripe"}),
        },
        RuntimeImportPaymentStatementItemCommand {
            row_no: "statement-row-dup-2".to_owned(),
            provider_code: "stripe".to_owned(),
            provider_account_id: Some("acct-1".to_owned()),
            native_trade_id: Some("native-dup-2".to_owned()),
            native_refund_id: None,
            native_order_no: Some("order-dup-2".to_owned()),
            sdkwork_out_trade_no: Some("trade-dup".to_owned()),
            sdkwork_out_refund_no: None,
            transaction_type: "payment".to_owned(),
            occurred_at: "2026-05-29T00:00:00Z".to_owned(),
            settled_at: Some("2026-05-29T00:00:00Z".to_owned()),
            gross_amount: "8.00".to_owned(),
            fee_amount: "0.40".to_owned(),
            net_amount: "7.60".to_owned(),
            currency_code: "CNY".to_owned(),
            provider_status: "succeeded".to_owned(),
            raw_row_digest: "row-digest-dup-2".to_owned(),
            metadata_json: serde_json::json!({"channel": "stripe"}),
        },
        RuntimeImportPaymentStatementItemCommand {
            row_no: "statement-row-amount".to_owned(),
            provider_code: "stripe".to_owned(),
            provider_account_id: Some("acct-1".to_owned()),
            native_trade_id: Some("native-amount".to_owned()),
            native_refund_id: None,
            native_order_no: Some("order-amount".to_owned()),
            sdkwork_out_trade_no: Some("trade-amount".to_owned()),
            sdkwork_out_refund_no: None,
            transaction_type: "payment".to_owned(),
            occurred_at: "2026-05-29T00:00:00Z".to_owned(),
            settled_at: Some("2026-05-29T00:00:00Z".to_owned()),
            gross_amount: "12.00".to_owned(),
            fee_amount: "0.50".to_owned(),
            net_amount: "11.50".to_owned(),
            currency_code: "CNY".to_owned(),
            provider_status: "succeeded".to_owned(),
            raw_row_digest: "row-digest-amount".to_owned(),
            metadata_json: serde_json::json!({"channel": "stripe"}),
        },
        RuntimeImportPaymentStatementItemCommand {
            row_no: "statement-row-currency".to_owned(),
            provider_code: "stripe".to_owned(),
            provider_account_id: Some("acct-1".to_owned()),
            native_trade_id: Some("native-currency".to_owned()),
            native_refund_id: None,
            native_order_no: Some("order-currency".to_owned()),
            sdkwork_out_trade_no: Some("trade-currency".to_owned()),
            sdkwork_out_refund_no: None,
            transaction_type: "payment".to_owned(),
            occurred_at: "2026-05-29T00:00:00Z".to_owned(),
            settled_at: Some("2026-05-29T00:00:00Z".to_owned()),
            gross_amount: "6.00".to_owned(),
            fee_amount: "0.30".to_owned(),
            net_amount: "5.70".to_owned(),
            currency_code: "CNY".to_owned(),
            provider_status: "succeeded".to_owned(),
            raw_row_digest: "row-digest-currency".to_owned(),
            metadata_json: serde_json::json!({"channel": "stripe"}),
        },
    ];
    command
}

fn import_command_with_settlement_and_chargeback_rows() -> RuntimeImportPaymentStatementCommand {
    let mut command = import_command();
    command.statement_no = "stmt-2026-05-003".to_owned();
    command.idempotency_key = "stmt-idem-3".to_owned();
    command.row_count = 2;
    command.total_amount = "12.00".to_owned();
    command.fee_amount = "0.60".to_owned();
    command.net_amount = "11.40".to_owned();
    command.items = vec![
        RuntimeImportPaymentStatementItemCommand {
            row_no: "statement-row-settlement".to_owned(),
            provider_code: "stripe".to_owned(),
            provider_account_id: Some("acct-1".to_owned()),
            native_trade_id: Some("native-settlement".to_owned()),
            native_refund_id: None,
            native_order_no: Some("order-settlement".to_owned()),
            sdkwork_out_trade_no: Some("trade-settlement".to_owned()),
            sdkwork_out_refund_no: None,
            transaction_type: "payment".to_owned(),
            occurred_at: "2026-05-29T00:00:00Z".to_owned(),
            settled_at: Some("2026-05-29T00:00:00Z".to_owned()),
            gross_amount: "5.00".to_owned(),
            fee_amount: "0.25".to_owned(),
            net_amount: "4.75".to_owned(),
            currency_code: "CNY".to_owned(),
            provider_status: "settled".to_owned(),
            raw_row_digest: "row-digest-settlement".to_owned(),
            metadata_json: serde_json::json!({"channel": "stripe"}),
        },
        RuntimeImportPaymentStatementItemCommand {
            row_no: "statement-row-chargeback".to_owned(),
            provider_code: "stripe".to_owned(),
            provider_account_id: Some("acct-1".to_owned()),
            native_trade_id: Some("native-chargeback".to_owned()),
            native_refund_id: None,
            native_order_no: Some("order-chargeback".to_owned()),
            sdkwork_out_trade_no: Some("trade-chargeback".to_owned()),
            sdkwork_out_refund_no: None,
            transaction_type: "payment".to_owned(),
            occurred_at: "2026-05-29T00:00:00Z".to_owned(),
            settled_at: Some("2026-05-29T00:00:00Z".to_owned()),
            gross_amount: "7.00".to_owned(),
            fee_amount: "0.35".to_owned(),
            net_amount: "6.65".to_owned(),
            currency_code: "CNY".to_owned(),
            provider_status: "chargeback".to_owned(),
            raw_row_digest: "row-digest-chargeback".to_owned(),
            metadata_json: serde_json::json!({"channel": "stripe"}),
        },
    ];
    command
}

fn import_command() -> RuntimeImportPaymentStatementCommand {
    RuntimeImportPaymentStatementCommand {
        tenant_id: "100001".to_owned(),
        organization_id: Some("0".to_owned()),
        statement_no: "stmt-2026-05-001".to_owned(),
        provider_code: "stripe".to_owned(),
        provider_account_id: Some("acct-1".to_owned()),
        statement_type: "payment".to_owned(),
        settlement_currency: "CNY".to_owned(),
        period_start: "2026-05-01T00:00:00Z".to_owned(),
        period_end: "2026-05-31T23:59:59Z".to_owned(),
        provider_statement_id: Some("native-stmt-1".to_owned()),
        file_ref: Some("file://statement.csv".to_owned()),
        file_digest: "digest-1".to_owned(),
        download_status: "downloaded".to_owned(),
        parse_status: "parsed".to_owned(),
        row_count: 2,
        total_amount: "30.00".to_owned(),
        fee_amount: "1.50".to_owned(),
        net_amount: "28.50".to_owned(),
        downloaded_at: Some("2026-05-29T00:00:00Z".to_owned()),
        parsed_at: Some("2026-05-29T00:00:00Z".to_owned()),
        request_no: "req-statement-1".to_owned(),
        idempotency_key: "stmt-idem-1".to_owned(),
        items: vec![
            RuntimeImportPaymentStatementItemCommand {
                row_no: "statement-row-1".to_owned(),
                provider_code: "stripe".to_owned(),
                provider_account_id: Some("acct-1".to_owned()),
                native_trade_id: Some("native-trade-1".to_owned()),
                native_refund_id: None,
                native_order_no: Some("order-1".to_owned()),
                sdkwork_out_trade_no: Some("trade-1001".to_owned()),
                sdkwork_out_refund_no: None,
                transaction_type: "payment".to_owned(),
                occurred_at: "2026-05-29T00:00:00Z".to_owned(),
                settled_at: Some("2026-05-29T00:00:00Z".to_owned()),
                gross_amount: "20.00".to_owned(),
                fee_amount: "1.00".to_owned(),
                net_amount: "19.00".to_owned(),
                currency_code: "CNY".to_owned(),
                provider_status: "succeeded".to_owned(),
                raw_row_digest: "row-digest-1".to_owned(),
                metadata_json: serde_json::json!({"channel": "stripe"}),
            },
            RuntimeImportPaymentStatementItemCommand {
                row_no: "statement-row-2".to_owned(),
                provider_code: "stripe".to_owned(),
                provider_account_id: Some("acct-1".to_owned()),
                native_trade_id: Some("native-trade-2".to_owned()),
                native_refund_id: None,
                native_order_no: Some("order-2".to_owned()),
                sdkwork_out_trade_no: Some("trade-2001".to_owned()),
                sdkwork_out_refund_no: None,
                transaction_type: "payment".to_owned(),
                occurred_at: "2026-05-29T00:00:00Z".to_owned(),
                settled_at: Some("2026-05-29T00:00:00Z".to_owned()),
                gross_amount: "10.00".to_owned(),
                fee_amount: "0.80".to_owned(),
                net_amount: "9.20".to_owned(),
                currency_code: "CNY".to_owned(),
                provider_status: "succeeded".to_owned(),
                raw_row_digest: "row-digest-2".to_owned(),
                metadata_json: serde_json::json!({"channel": "stripe"}),
            },
        ],
    }
}
