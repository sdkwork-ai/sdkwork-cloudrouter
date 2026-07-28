const POSTGRES_SETTLEMENTS_DASHBOARD_STORE: &str = include_str!(
    "../../../crates/sdkwork-clawrouter-settlements-dashboard-repository-sqlx/src/postgres.rs"
);

#[test]
fn settlements_dashboard_store_uses_scoped_postgres_commerce_read_models() {
    for table in [
        "commerce_usage_statement",
        "commerce_usage_statement_item",
        "commerce_usage_settlement",
        "commerce_billing_export",
        "commerce_invoice",
        "ai_usage",
    ] {
        assert!(
            POSTGRES_SETTLEMENTS_DASHBOARD_STORE.contains(table),
            "settlements dashboard must read {table}"
        );
    }
    for scope in ["tenant_id = $1", "organization_id = $2"] {
        assert!(
            POSTGRES_SETTLEMENTS_DASHBOARD_STORE.contains(scope),
            "settlements dashboard must enforce {scope}"
        );
    }
    assert!(
        !POSTGRES_SETTLEMENTS_DASHBOARD_STORE.contains("plus_invoice"),
        "settlements dashboard must not read legacy plus_invoice"
    );
}
