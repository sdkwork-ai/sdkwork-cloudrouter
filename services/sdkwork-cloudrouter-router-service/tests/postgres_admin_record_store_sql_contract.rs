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
fn postgres_billing_read_projection_exposes_user_id_for_subject_scoped_reads() {
    let projection_sql = compact_sql(POSTGRES_BILLING_READ_PROJECTION);
    assert!(
        projection_sql
            .contains("COALESCE(c.user_id, m.user_id, trace_snapshot.user_id) AS user_id"),
        "billable_usage CTE must expose user_id from charge line, measurement, and trace fallback"
    );
    assert!(
        projection_sql.contains("legacy.user_id"),
        "billable_usage legacy branch must expose user_id"
    );
    assert!(
        projection_sql.contains("trace.user_id,"),
        "billable_usage trace snapshot must carry user_id"
    );
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
fn postgres_admin_record_store_pages_by_keyset_not_by_ranking_every_row() {
    let record_sql = compact_sql(sql_const(
        POSTGRES_ADMIN_RECORD_STORE,
        "LIST_ADMIN_RECORD_LOGS",
    ));
    // The list used to rank every row with ROW_NUMBER() only to keep one per trace,
    // which forced a full sort per page. Keyset pagination replaced it. If a ranked
    // subquery ever returns it must carry an alias, because PostgreSQL rejects an
    // unaliased `FROM (SELECT ...)`, and it must not resurrect the window-based row
    // count either.
    assert!(
        !record_sql.contains("ROW_NUMBER() OVER"),
        "admin record list must page by keyset, not by ranking every row"
    );
    assert!(
        !record_sql.contains("COUNT(*) OVER()"),
        "admin record list must not compute a windowed total per row"
    );
    assert!(
        record_sql.contains("LIMIT $6"),
        "admin record list must bound the page with the keyset limit"
    );
}
