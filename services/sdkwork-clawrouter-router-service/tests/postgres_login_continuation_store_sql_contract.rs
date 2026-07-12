// Login continuation persistence is owned by the shared IAM route crate. Keep
// this contract test pointed at that authority after the former Claw Router
// local store was retired.
const POSTGRES_LOGIN_CONTINUATION_STORE: &str =
    include_str!("../../../../sdkwork-iam/crates/sdkwork-routes-iam-app-api/src/ephemeral.rs");

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
        "INSERT INTO iam_ephemeral_artifact",
        "ON CONFLICT (artifact_key) DO UPDATE SET",
        "SELECT payload_json FROM iam_ephemeral_artifact",
        "WHERE artifact_key = $1 AND expires_at > $2",
        "FOR UPDATE",
        "DELETE FROM iam_ephemeral_artifact WHERE artifact_key = $1",
    ] {
        assert_sql_contains(POSTGRES_LOGIN_CONTINUATION_STORE, expected);
    }
}

#[test]
fn login_continuation_store_does_not_use_string_format_for_user_input() {
    for sql_operation in ["INSERT", "SELECT", "UPDATE", "DELETE"] {
        assert!(
            !POSTGRES_LOGIN_CONTINUATION_STORE.contains(&format!("format!(\"{sql_operation}")),
            "login continuation SQL must not interpolate {sql_operation} statements"
        );
    }
}
