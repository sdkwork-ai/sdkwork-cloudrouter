const POSTGRES_DASHBOARD_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/dashboard_overview_read_store.rs");

fn compact_sql(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn assert_sql_contains(expected: &str) {
    let actual = compact_sql(POSTGRES_DASHBOARD_STORE);
    let compact_expected = compact_sql(expected);
    assert!(
        actual.contains(&compact_expected),
        "Postgres dashboard SQL must contain `{expected}`"
    );
}

#[test]
fn dashboard_counts_only_distinct_billable_rated_invocations() {
    for expected in [
        "FROM cloudrouter_charge_line c",
        "JOIN cloudrouter_rating_decision d",
        "JOIN cloudrouter_usage_measurement m",
        "c.charge_status IN ('rated', 'settled')",
        "d.decision_status = 'rated'",
        "d.billability = 'chargeable'",
        "WHERE amount > 0",
        "COUNT(DISTINCT invocation_id)",
    ] {
        assert_sql_contains(expected);
    }
}

#[test]
fn dashboard_uses_positive_legacy_charges_only_as_unmigrated_fallback() {
    for expected in [
        "COALESCE(legacy.customer_charge_amount, 0) > 0",
        "NOT EXISTS ( SELECT 1 FROM cloudrouter_rating_decision current_decision",
        "current_decision.invocation_id = legacy.request_id",
        "current_decision.status = 1",
    ] {
        assert_sql_contains(expected);
    }
}
