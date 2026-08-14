const POSTGRES_SETTLEMENTS_DASHBOARD_STORE: &str = include_str!(
    "../../../crates/sdkwork-cloudrouter-settlements-dashboard-repository-sqlx/src/postgres.rs"
);

#[test]
fn settlements_dashboard_store_uses_scoped_postgres_metering_read_models() {
    // 计量域模块化（S2）后仪表盘从 metering 事实表（ai_metering_usage）聚合，
    // legacy 结算桥表（commerce_usage_statement* / commerce_usage_settlement /
    // commerce_billing_export / commerce_invoice）已无写入方并退役。
    assert!(
        POSTGRES_SETTLEMENTS_DASHBOARD_STORE.contains("ai_metering_usage"),
        "settlements dashboard must read ai_metering_usage"
    );
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
