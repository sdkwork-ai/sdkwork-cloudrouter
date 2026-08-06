// SQL contract guard for the invite-code stores: pins the parameterized
// tenant-scoped query shapes so refactors cannot silently drop scope filters,
// pagination bounds, or idempotency targets.

const POSTGRES_APP_INVITE_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/app_invite_store.rs");
const POSTGRES_ADMIN_REFERRAL_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/admin_referral_store.rs");

fn compact_sql(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn assert_sql_contains(sql: &str, expected: &str) {
    let actual = compact_sql(sql);
    let compact_expected = compact_sql(expected);
    assert!(
        actual.contains(&compact_expected),
        "store SQL must contain `{expected}`"
    );
}

#[test]
fn invite_code_validation_looks_up_by_parameterized_code_and_status() {
    let sql = POSTGRES_APP_INVITE_STORE;
    assert_sql_contains(
        sql,
        "SELECT user_id FROM ops_referral_invite_code WHERE invite_code = $1 AND status = 1 LIMIT 1",
    );
}

#[test]
fn invite_code_issue_upserts_idempotently_and_retries_collisions_with_fresh_code() {
    let sql = POSTGRES_APP_INVITE_STORE;
    assert_sql_contains(
        sql,
        "ON CONFLICT (tenant_id, organization_id, user_id) DO NOTHING",
    );
    // The retry path must draw a new code instead of reusing the colliding one.
    assert_sql_contains(sql, "invite_code = generate_invite_code()?");
    assert_sql_contains(sql, "uk_ops_referral_invite_code_tenant_code");
}

#[test]
fn invite_code_issue_reuses_existing_user_code_after_do_nothing() {
    let sql = POSTGRES_APP_INVITE_STORE;
    assert_sql_contains(
        sql,
        "SELECT invite_code FROM ops_referral_invite_code WHERE tenant_id = $1 AND organization_id = $2 AND user_id = $3 AND status = 1 LIMIT 1",
    );
}

#[test]
fn invite_claim_inserts_idempotently_and_reads_existing_binding_on_conflict() {
    let sql = POSTGRES_APP_INVITE_STORE;
    assert_sql_contains(
        sql,
        "ON CONFLICT (tenant_id, organization_id, invitee_user_id) DO NOTHING",
    );
    assert_sql_contains(
        sql,
        "SELECT id, inviter_user_id, reward_status FROM ops_referral_relation WHERE tenant_id = $1 AND organization_id = $2 AND invitee_user_id = $3 LIMIT 1",
    );
}

#[test]
fn invite_code_generation_uses_cryptographic_randomness() {
    let sql = POSTGRES_APP_INVITE_STORE;
    assert_sql_contains(sql, "getrandom::fill");
}

#[test]
fn referral_relations_search_is_parameterized_and_tenant_scoped() {
    let sql = POSTGRES_ADMIN_REFERRAL_STORE;
    assert_sql_contains(
        sql,
        "WHERE tenant_id = $1 AND organization_id = $2 AND status = 1 AND ( $5 = '' OR invite_code ILIKE '%' || $5 || '%'",
    );
    assert_sql_contains(sql, "LIMIT $3 OFFSET $4");
}

#[test]
fn referral_strategies_search_is_parameterized_in_all_status_branches() {
    let sql = POSTGRES_ADMIN_REFERRAL_STORE;
    // Every status branch binds the search as a parameter instead of
    // interpolating user input into the SQL text.
    let branches = sql.matches("($5 = '' OR name ILIKE '%' || $5 || '%')").count();
    assert_eq!(3, branches, "all three status branches must parameterize search");
    assert_sql_contains(sql, "LIMIT $3 OFFSET $4");
}

#[test]
fn referral_strategy_commands_write_audit_logs_in_same_transaction() {
    let sql = POSTGRES_ADMIN_REFERRAL_STORE;
    assert_sql_contains(sql, "INSERT INTO ops_audit_log");
    assert_sql_contains(sql, "create_referral_strategy");
    assert_sql_contains(sql, "update_referral_strategy");
    assert_sql_contains(sql, "delete_referral_strategy");
}

#[test]
fn referral_strategy_updates_clear_optional_timestamps_with_null() {
    let sql = POSTGRES_ADMIN_REFERRAL_STORE;
    // optional_timestamp maps empty values to NULL so a PATCH can clear the
    // window; the UPDATE column list must include both bounds.
    assert_sql_contains(
        sql,
        "starts_at = $11::timestamptz, ends_at = $12::timestamptz",
    );
}
