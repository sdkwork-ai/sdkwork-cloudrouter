const POSTGRES_SETTLEMENTS_DASHBOARD_STORE: &str = include_str!(
    "../../../crates/sdkwork-cloudrouter-settlements-dashboard-repository-sqlx/src/postgres.rs"
);

#[test]
fn settlements_dashboard_store_uses_scoped_charge_ledger_with_guarded_legacy_fallback() {
    for expected in [
        "FROM cloudrouter_charge_line c",
        "JOIN cloudrouter_rating_decision d",
        "JOIN cloudrouter_usage_measurement m",
        "d.decision_status = 'rated'",
        "d.billability = 'chargeable'",
        "c.amount > 0",
        "FROM ai_metering_usage legacy",
        "NOT EXISTS (",
        "current_decision.invocation_id = legacy.request_id",
    ] {
        assert!(
            POSTGRES_SETTLEMENTS_DASHBOARD_STORE.contains(expected),
            "settlements dashboard billing projection must contain {expected}"
        );
    }
    for table in [
        "commerce_usage_statement",
        "commerce_usage_statement_item",
        "commerce_usage_settlement",
        "commerce_billing_export",
        "commerce_invoice",
        "plus_invoice",
    ] {
        // 注释可能提及 legacy 表名，断言只针对 SQL 语句引用
        for keyword in ["FROM ", "JOIN ", "INTO ", "UPDATE "] {
            assert!(
                !POSTGRES_SETTLEMENTS_DASHBOARD_STORE.contains(&format!("{keyword}{table}")),
                "settlements dashboard must not read legacy {table}"
            );
        }
    }
    for scope in ["tenant_id = $1", "organization_id = $2"] {
        assert!(
            POSTGRES_SETTLEMENTS_DASHBOARD_STORE.contains(scope),
            "settlements dashboard must enforce {scope}"
        );
    }
}
