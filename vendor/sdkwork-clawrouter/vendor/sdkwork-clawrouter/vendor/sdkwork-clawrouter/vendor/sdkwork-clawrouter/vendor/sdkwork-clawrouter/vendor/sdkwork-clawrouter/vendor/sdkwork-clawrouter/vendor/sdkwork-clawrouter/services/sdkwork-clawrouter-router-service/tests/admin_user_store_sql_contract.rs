const SQLITE_ADMIN_USER_STORE: &str =
    include_str!("../src/infrastructure/sql/sqlite/admin_user_store.rs");
const POSTGRES_ADMIN_USER_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/admin_user_store.rs");

#[test]
fn admin_user_store_uses_appbase_commerce_account_tables() {
    for source in [SQLITE_ADMIN_USER_STORE, POSTGRES_ADMIN_USER_STORE] {
        assert!(source.contains("commerce_account"));
        assert!(source.contains("commerce_account_ledger_entry"));
        assert!(source.contains("CommerceAccountAssetType::Cash"));
        assert!(source.contains("CommerceLedgerDirection"));
    }
}

#[test]
fn admin_user_store_has_no_legacy_plus_account_dependency() {
    for source in [SQLITE_ADMIN_USER_STORE, POSTGRES_ADMIN_USER_STORE] {
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
                !source.contains(forbidden),
                "admin user store must not keep legacy account design `{forbidden}`"
            );
        }
    }
}

#[test]
fn admin_user_balance_adjustment_uses_account_version_guard() {
    for source in [SQLITE_ADMIN_USER_STORE, POSTGRES_ADMIN_USER_STORE] {
        assert!(
            source.contains("COALESCE(version, 0) AS version"),
            "admin user balance adjustment must load account version for optimistic locking"
        );
        assert!(
            source.contains("AND version = ?") || source.contains("AND version = $4"),
            "admin user balance adjustment must guard balance update with account version"
        );
        assert!(
            source.contains("rows_affected() != 1"),
            "admin user balance adjustment must verify exactly one account row was updated"
        );
        assert!(
            source.contains("admin user balance update was not applied atomically"),
            "admin user balance adjustment must return a conflict when the version guard fails"
        );
    }
}
