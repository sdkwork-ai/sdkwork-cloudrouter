const SQLITE_SETTLEMENTS_DASHBOARD_STORE: &str = include_str!(
    "../../../crates/sdkwork-clawrouter-settlements-dashboard-repository-sqlx/src/sqlite.rs"
);
const POSTGRES_SETTLEMENTS_DASHBOARD_STORE: &str = include_str!(
    "../../../crates/sdkwork-clawrouter-settlements-dashboard-repository-sqlx/src/postgres.rs"
);

#[test]
fn settlements_dashboard_store_uses_appbase_commerce_invoice() {
    for source in [
        SQLITE_SETTLEMENTS_DASHBOARD_STORE,
        POSTGRES_SETTLEMENTS_DASHBOARD_STORE,
    ] {
        assert!(source.contains("commerce_statement"));
        assert!(source.contains("commerce_settlement"));
        assert!(source.contains("commerce_billing_export"));
        assert!(source.contains("commerce_invoice"));
        assert!(
            !source.contains("plus_invoice"),
            "settlements dashboard must not read legacy plus_invoice"
        );
    }
}
