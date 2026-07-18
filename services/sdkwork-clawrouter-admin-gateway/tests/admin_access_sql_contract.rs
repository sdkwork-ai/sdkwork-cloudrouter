const ADMIN_API_SOURCE: &str =
    include_str!("../../../crates/sdkwork-routes-clawrouter-backend-api/src/routes.rs");

fn compact_sql(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn assert_sql_contains(source: &str, expected: &str) {
    let actual = compact_sql(source);
    let compact_expected = compact_sql(expected);
    assert!(
        actual.contains(&compact_expected),
        "admin access SQL must contain `{expected}`"
    );
}

fn assert_sql_not_contains(source: &str, forbidden: &str) {
    let actual = compact_sql(source).to_ascii_lowercase();
    let compact_forbidden = compact_sql(forbidden).to_ascii_lowercase();
    assert!(
        !actual.contains(&compact_forbidden),
        "admin access SQL must not contain `{forbidden}`"
    );
}

#[test]
fn postgres_admin_access_casts_iam_member_identity_columns_to_text() {
    for expected in [
        "WHERE CAST(tenant_id AS TEXT) = $1",
        "AND CAST(organization_id AS TEXT) = $2",
        "AND CAST(user_id AS TEXT) = $3",
    ] {
        assert_sql_contains(ADMIN_API_SOURCE, expected);
    }

    for forbidden in [
        "WHERE tenant_id = $1",
        "AND organization_id = $2",
        "AND user_id = $3",
    ] {
        assert_sql_not_contains(ADMIN_API_SOURCE, forbidden);
    }
}

#[test]
fn admin_access_accepts_only_canonical_elevated_membership_kinds() {
    let elevated_membership_predicate =
        "AND LOWER(COALESCE(membership_kind, '')) IN ('admin', 'owner')";
    let predicate_count = compact_sql(ADMIN_API_SOURCE)
        .matches(elevated_membership_predicate)
        .count();

    assert_eq!(
        2, predicate_count,
        "SQLite and PostgreSQL admin access checks must accept IAM admin and owner memberships"
    );
    assert_sql_not_contains(
        ADMIN_API_SOURCE,
        "LOWER(COALESCE(membership_kind, '')) = 'admin'",
    );
}
