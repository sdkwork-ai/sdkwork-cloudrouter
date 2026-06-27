const POSTGRES_LOGIN_CONTINUATION_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/login_continuation_store.rs");

fn compact_sql(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn assert_sql_contains(sql: &str, expected: &str) {
    let actual = compact_sql(sql);
    let compact_expected = compact_sql(expected);
    assert!(
        actual.contains(&compact_expected),
        "Postgres login continuation SQL must contain `{expected}`"
    );
}

#[test]
fn login_continuation_store_uses_parameterized_iam_login_continuation_table() {
    for expected in [
        "CREATE TABLE IF NOT EXISTS iam_login_continuation",
        "INSERT INTO iam_login_continuation",
        "ON CONFLICT(token_hash) DO UPDATE SET",
        "SELECT tenant_id, user_id, organization_ids_json, auth_level, expires_at_unix",
        "FROM iam_login_continuation",
        "WHERE token_hash = $1",
        "DELETE FROM iam_login_continuation",
    ] {
        assert_sql_contains(POSTGRES_LOGIN_CONTINUATION_STORE, expected);
    }
}

#[test]
fn login_continuation_store_does_not_use_string_format_for_user_input() {
    assert!(
        !POSTGRES_LOGIN_CONTINUATION_STORE.contains("format!("),
        "login continuation store must not build SQL with format! for user-controlled values"
    );
}
