//! SQL contract guards for the API key / admin default account group upserts.
//!
//! Migration `0003_standardize_upstream_supplier_routing` renamed
//! `ai_upstream_account_group.rate_multiplier`/`official_price_multiplier` to
//! `cost_multiplier`/`sale_multiplier`. These tests keep the default-account-group
//! upserts aligned with the canonical post-0003 schema so creating an API key (or
//! an admin user) never regresses into a `column does not exist` 50001 failure.

const POSTGRES_API_KEY_COMMAND_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/api_key_command_store.rs");

const POSTGRES_ADMIN_USER_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/admin_user_store.rs");

fn compact_sql(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn assert_sql_contains(sql: &str, expected: &str) {
    let actual = compact_sql(sql);
    let compact_expected = compact_sql(expected);
    assert!(
        actual.contains(&compact_expected),
        "default account group upsert SQL must contain `{expected}`"
    );
}

fn function_block<'a>(source: &'a str, start: &str, end: &str) -> &'a str {
    source
        .split_once(start)
        .unwrap_or_else(|| panic!("missing function marker: {start}"))
        .1
        .split_once(end)
        .unwrap_or_else(|| panic!("missing function marker: {end}"))
        .0
}

fn assert_no_retired_multiplier_columns(sql: &str) {
    for retired in ["rate_multiplier", "official_price_multiplier"] {
        assert!(
            !compact_sql(sql).contains(retired),
            "default account group upsert must not reference retired column `{retired}`"
        );
    }
}

#[test]
fn api_key_command_store_persists_raw_key_secret_columns() {
    let sql = function_block(
        POSTGRES_API_KEY_COMMAND_STORE,
        "INSERT INTO iam_gateway_api_key",
        ".execute(&mut **tx)",
    );
    for expected in [
        "key_secret_mode",
        "key_secret_plaintext",
        "key_secret_ciphertext",
        "key_secret_key_id",
    ] {
        assert_sql_contains(sql, expected);
    }
}

#[test]
fn api_key_command_store_default_group_upsert_uses_canonical_multiplier_columns() {
    let sql = function_block(
        POSTGRES_API_KEY_COMMAND_STORE,
        "INSERT INTO ai_upstream_account_group",
        ".fetch_one(&mut **tx)",
    );
    for expected in [
        "cost_multiplier",
        "sale_multiplier",
        ".bind(command.cost_multiplier.to_fixed_string(6))",
        ".bind(command.sale_multiplier.to_fixed_string(6))",
        "COALESCE(cost_multiplier::text, '1.000000') AS cost_multiplier",
        "COALESCE(sale_multiplier::text, '1.000000') AS sale_multiplier",
    ] {
        assert_sql_contains(sql, expected);
    }
    assert_no_retired_multiplier_columns(sql);
}

#[test]
fn admin_user_store_default_group_upsert_uses_canonical_multiplier_columns() {
    let sql = function_block(
        POSTGRES_ADMIN_USER_STORE,
        "INSERT INTO ai_upstream_account_group",
        ".fetch_one(&mut **tx)",
    );
    for expected in [
        "cost_multiplier",
        "sale_multiplier",
        "cost_multiplier = COALESCE(ai_upstream_account_group.cost_multiplier, EXCLUDED.cost_multiplier)",
        "sale_multiplier = COALESCE(ai_upstream_account_group.sale_multiplier, EXCLUDED.sale_multiplier)",
    ] {
        assert_sql_contains(sql, expected);
    }
    assert_no_retired_multiplier_columns(sql);
}
