const SQLITE_ADMIN_FINANCE_STORE: &str =
    include_str!("../src/infrastructure/sql/sqlite/admin_finance_store.rs");
const POSTGRES_ADMIN_FINANCE_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/admin_finance_store.rs");

#[test]
fn admin_finance_store_uses_appbase_commerce_finance_tables() {
    for source in [SQLITE_ADMIN_FINANCE_STORE, POSTGRES_ADMIN_FINANCE_STORE] {
        assert!(source.contains("commerce_account_ledger_entry"));
        assert!(source.contains("commerce_statement"));
        assert!(source.contains("commerce_settlement"));
        assert!(source.contains("commerce_invoice"));
        assert!(
            source.contains("pi.owner_user_id"),
            "admin finance invoice join must use the standard commerce_invoice owner_user_id field"
        );
    }
}

#[test]
fn admin_finance_store_has_no_legacy_account_transaction_dependency() {
    for source in [SQLITE_ADMIN_FINANCE_STORE, POSTGRES_ADMIN_FINANCE_STORE] {
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
}
