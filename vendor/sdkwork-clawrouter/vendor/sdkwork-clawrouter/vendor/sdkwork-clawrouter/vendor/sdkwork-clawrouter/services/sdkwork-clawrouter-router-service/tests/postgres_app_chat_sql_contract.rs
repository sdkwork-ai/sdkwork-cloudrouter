const POSTGRES_APP_CHAT_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/app_chat_store.rs");

fn compact_sql(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn assert_sql_contains(sql: &str, expected: &str) {
    let actual = compact_sql(sql);
    let compact_expected = compact_sql(expected);
    assert!(
        actual.contains(&compact_expected),
        "Postgres app chat SQL must contain `{expected}`"
    );
}

#[test]
fn postgres_chat_usage_link_insert_persists_trusted_product_user_id() {
    for expected in [
        "INSERT INTO ai_runtime_usage_link",
        "tenant_id, organization_id, user_id, conversation_id",
        ".bind(command.subject.user_id)",
        "'chat_response'",
    ] {
        assert_sql_contains(POSTGRES_APP_CHAT_STORE, expected);
    }
}

#[test]
fn postgres_chat_completion_persists_context_snapshot_and_links_turn() {
    for expected in [
        "INSERT INTO ai_chat_context_snapshot",
        "included_item_ids",
        "context_json",
        "'full_turn_context'",
        "context_snapshot_id = $15",
        "load_runtime_invocation_pk",
    ] {
        assert_sql_contains(POSTGRES_APP_CHAT_STORE, expected);
    }
}
