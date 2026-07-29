const POSTGRES_ADMIN_USER_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/admin_user_store.rs");

#[test]
fn postgres_admin_user_store_uses_appbase_commerce_account_tables() {
    assert!(POSTGRES_ADMIN_USER_STORE.contains("commerce_account"));
    assert!(POSTGRES_ADMIN_USER_STORE.contains("commerce_account_ledger_entry"));
    assert!(POSTGRES_ADMIN_USER_STORE.contains("CommerceAccountAssetType::Cash"));
    assert!(POSTGRES_ADMIN_USER_STORE.contains("CommerceLedgerDirection"));
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

#[test]
fn postgres_admin_user_balance_adjustment_uses_account_version_guard() {
    assert!(
        POSTGRES_ADMIN_USER_STORE.contains("COALESCE(version, 0) AS version"),
        "admin user balance adjustment must load account version for optimistic locking"
    );
    assert!(
        POSTGRES_ADMIN_USER_STORE.contains("AND version = $4"),
        "admin user balance adjustment must guard balance update with account version"
    );
    assert!(
        POSTGRES_ADMIN_USER_STORE.contains("rows_affected() != 1"),
        "admin user balance adjustment must verify exactly one account row was updated"
    );
    assert!(
        POSTGRES_ADMIN_USER_STORE.contains("admin user balance update was not applied atomically"),
        "admin user balance adjustment must return a conflict when the version guard fails"
    );
}
