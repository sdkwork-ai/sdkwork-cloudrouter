const POSTGRES_ADMIN_RECORD_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/admin_record_store.rs");
const POSTGRES_BILLING_READ_PROJECTION: &str =
    include_str!("../src/infrastructure/sql/postgres/billing_read_projection.rs");

fn compact_sql(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn sql_const<'a>(source: &'a str, name: &str) -> &'a str {
    let start = format!("const {name}: &str = r#\"");
    source
        .split_once(&start)
        .unwrap_or_else(|| panic!("missing const {name}"))
        .1
        .split_once("\"#")
        .unwrap_or_else(|| panic!("unterminated const {name}"))
        .0
}

#[test]
fn postgres_admin_record_store_aggregates_billable_usage_cte_column_names() {
    let record_sql = compact_sql(sql_const(
        POSTGRES_ADMIN_RECORD_STORE,
        "LIST_ADMIN_RECORD_LOGS",
    ));
    let projection_sql = compact_sql(POSTGRES_BILLING_READ_PROJECTION);

    assert!(
        projection_sql
            .contains("trace_snapshot.account_group_snapshot AS upstream_account_group_snapshot"),
        "billable_usage CTE must expose upstream_account_group_snapshot, not account_group_snapshot"
    );
    assert!(
        record_sql
            .contains("MAX(upstream_account_group_snapshot) AS upstream_account_group_snapshot"),
        "admin record SQL must aggregate the billable_usage CTE column upstream_account_group_snapshot"
    );
    assert!(
        !record_sql.contains("MAX(account_group_snapshot)"),
        "admin record SQL must not aggregate a missing billable_usage column named account_group_snapshot"
    );
}

#[test]
fn postgres_admin_record_store_aliases_ranked_trace_subquery() {
    let record_sql = compact_sql(sql_const(
        POSTGRES_ADMIN_RECORD_STORE,
        "LIST_ADMIN_RECORD_LOGS",
    ));
    assert!(
        record_sql.contains(") ranked_trace WHERE trace_rank = 1"),
        "admin record SQL must alias the ROW_NUMBER subquery; PostgreSQL rejects FROM (SELECT ...) without an alias"
    );
}
