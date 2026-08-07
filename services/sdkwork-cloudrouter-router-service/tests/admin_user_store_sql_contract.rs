const POSTGRES_ADMIN_USER_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/admin_user_store.rs");

#[test]
fn postgres_admin_user_store_has_no_legacy_wallet_dependency() {
    // S5: the admin user store no longer seeds or adjusts a legacy wallet;
    // balances live in the account domain (acct_*) written by other stores.
    for forbidden in [
        "commerce_account",
        "commerce_account_ledger_entry",
        "CommerceAccountAssetType",
        "CommerceLedgerDirection",
        "insert_cash_account",
        "ensure_cash_account",
        "adjust_balance",
        "AdjustAdminUserBalanceCommand",
    ] {
        assert!(
            !POSTGRES_ADMIN_USER_STORE.contains(forbidden),
            "admin user store must not keep legacy wallet logic `{forbidden}`"
        );
    }
}

#[test]
fn postgres_admin_user_store_has_no_legacy_plus_account_dependency() {
    for forbidden in [
        "plus_account",
        "plus_account_history",
        "available_balance",
        "account_type",
        "BALANCE_ASSET_TYPE",
        "CASH_ACCOUNT_TYPE",
        "TRANSACTION_RECHARGE",
        "TRANSACTION_REFUND",
        "TRANSACTION_STATUS_SUCCESS",
        "table_exists",
    ] {
        assert!(
            !POSTGRES_ADMIN_USER_STORE.contains(forbidden),
            "admin user store must not keep legacy account design `{forbidden}`"
        );
    }
}
