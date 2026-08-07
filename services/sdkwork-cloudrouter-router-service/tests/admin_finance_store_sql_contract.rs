const POSTGRES_ADMIN_FINANCE_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/admin_finance_store.rs");

#[test]
fn admin_finance_store_reads_transactions_from_the_account_domain_ledger() {
    let source = POSTGRES_ADMIN_FINANCE_STORE;
    // S5: the finance transaction view reads `acct_ledger_entry` (USER +
    // PARTNER unified ledger); the legacy commerce_account_ledger_entry view
    // is retired.
    assert!(source.contains("FROM acct_ledger_entry e"));
    assert!(
        source.contains("e.business_type = 'points_recharge'"),
        "recharge credits must join payment attempts via the out-trade-no"
    );
    assert!(source.contains("commerce_statement"));
    assert!(
        source.contains("ai_metering_usage"),
        "admin finance statement settlement count must join the ai-metering usage fact"
    );
    assert!(
        !source.contains("commerce_settlement"),
        "admin finance must not reference the retired commerce_settlement bridge"
    );
    assert!(source.contains("commerce_invoice"));
    assert!(
        source.contains("pi.owner_user_id"),
        "admin finance invoice join must use the standard commerce_invoice owner_user_id field"
    );
    for forbidden in [
        "commerce_account_ledger_entry",
        "FROM commerce_account_ledger_entry l",
        "l.source_type",
    ] {
        assert!(
            !source.contains(forbidden),
            "admin finance must not keep the legacy wallet ledger `{forbidden}`"
        );
    }
}

#[test]
fn admin_finance_store_has_no_legacy_account_transaction_dependency() {
    let source = POSTGRES_ADMIN_FINANCE_STORE;
    for forbidden in [
        "plus_account",
        "plus_account_history",
        "plus_vip_point_change",
        "points_change",
        "plus_order",
        "plus_payment",
        "plus_refund",
        "plus_invoice",
    ] {
        assert!(
            !source.contains(forbidden),
            "admin finance store must not keep legacy finance design `{forbidden}`"
        );
    }
}
