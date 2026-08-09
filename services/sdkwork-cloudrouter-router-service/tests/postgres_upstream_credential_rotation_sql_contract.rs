const POSTGRES_UPSTREAM_CREDENTIAL_ROTATION_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/upstream_credential_rotation_store.rs");

fn compact_sql(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn assert_sql_contains(sql: &str, expected: &str) {
    let actual = compact_sql(sql);
    let compact_expected = compact_sql(expected);
    assert!(
        actual.contains(&compact_expected),
        "Postgres upstream credential rotation SQL must contain `{expected}`"
    );
}

#[test]
fn rotation_worker_lists_accounts_due_by_schedule_or_expired_credential() {
    for expected in [
        "FROM ai_upstream_account AS a",
        "a.deleted_at IS NULL",
        "a.status = 1",
        "AND ($1 = 0 OR a.tenant_id = $1)",
        "AND ($2 = 0 OR a.organization_id = $2)",
        "(a.next_rotate_at IS NOT NULL AND a.next_rotate_at <= $3::timestamptz)",
        "c.expires_at IS NOT NULL",
        "AND c.expires_at <= $3::timestamptz",
        "ORDER BY COALESCE(a.next_rotate_at, a.created_at), a.id",
        "LIMIT $4",
    ] {
        assert_sql_contains(POSTGRES_UPSTREAM_CREDENTIAL_ROTATION_STORE, expected);
    }
}

#[test]
fn rotation_worker_locks_the_account_and_rechecks_due_by_schedule() {
    for expected in [
        "FROM ai_upstream_account AS a",
        "AND a.id = $3",
        "AND a.deleted_at IS NULL",
        "FOR UPDATE",
        "COALESCE(a.next_rotate_at IS NOT NULL AND a.next_rotate_at <= $3::timestamptz, FALSE) AS due_by_schedule",
    ] {
        assert_sql_contains(POSTGRES_UPSTREAM_CREDENTIAL_ROTATION_STORE, expected);
    }
}

#[test]
fn rotation_worker_picks_valid_and_expired_active_credentials() {
    for expected in [
        "AND c.is_active = TRUE",
        "AND (c.expires_at IS NULL OR c.expires_at > $4::timestamptz)",
        "AND c.expires_at IS NOT NULL",
        "AND c.expires_at <= $4::timestamptz",
        "ORDER BY c.credential_version DESC, c.id",
    ] {
        assert_sql_contains(POSTGRES_UPSTREAM_CREDENTIAL_ROTATION_STORE, expected);
    }
}

#[test]
fn rotation_worker_deactivates_expired_and_promotes_candidate_guarded() {
    for expected in [
        "UPDATE ai_upstream_account_credential",
        "SET is_active = FALSE",
        "AND is_active = TRUE",
        "AND c.is_active = FALSE",
        "SET is_active = TRUE",
        "last_rotated_at = $4::timestamptz",
        "ORDER BY c.credential_version DESC, c.id",
    ] {
        assert_sql_contains(POSTGRES_UPSTREAM_CREDENTIAL_ROTATION_STORE, expected);
    }
}

#[test]
fn rotation_worker_schedules_next_rotation_from_policy_interval() {
    for expected in [
        "UPDATE ai_upstream_account",
        "SET last_rotated_at = $3::timestamptz",
        "next_rotate_at = $3::timestamptz + ($4 * INTERVAL '1 day')",
        "version = version + 1",
        "WHERE tenant_id = $1",
        "AND id = $5",
    ] {
        assert_sql_contains(POSTGRES_UPSTREAM_CREDENTIAL_ROTATION_STORE, expected);
    }
}
