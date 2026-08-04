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

fn assert_sql_excludes(sql: &str, forbidden: &str) {
    let actual = compact_sql(sql);
    let compact_forbidden = compact_sql(forbidden);
    assert!(
        !actual.contains(&compact_forbidden),
        "Postgres app chat SQL must not contain `{forbidden}`"
    );
}

fn chat_message_list_sql() -> &'static str {
    let start = POSTGRES_APP_CHAT_STORE
        .find("const LIST_CHAT_MESSAGES")
        .expect("chat message list SQL constant must exist");
    let end = POSTGRES_APP_CHAT_STORE[start..]
        .find("pub struct PostgresAppChatStore")
        .map(|offset| start + offset)
        .expect("chat message list SQL constant must end before the store type");
    &POSTGRES_APP_CHAT_STORE[start..end]
}

#[test]
fn postgres_chat_message_history_uses_bounded_keyset_pagination() {
    let sql = chat_message_list_sql();
    for expected in [
        "m.message_no AS cursor_message_no",
        "m.id AS cursor_id",
        "$5::bigint IS NULL OR (m.message_no, m.id) < ($5, $6)",
        "ORDER BY m.message_no DESC, m.id DESC",
        "LIMIT $7",
    ] {
        assert_sql_contains(sql, expected);
    }
    assert_sql_excludes(sql, "OFFSET");
    assert_sql_excludes(sql, "COUNT(*) OVER()");

    for expected in [
        "let fetch_limit = page_size .checked_add(1)",
        ".bind(fetch_limit)",
        "let has_more = rows.len() > page_size_usize",
        "rows.into_iter().take(page_size_usize)",
        "Vec::with_capacity(rows.len().min(page_size_usize))",
        "items.reverse()",
    ] {
        assert_sql_contains(POSTGRES_APP_CHAT_STORE, expected);
    }
}

#[test]
fn postgres_chat_usage_link_insert_persists_trusted_product_user_id() {
    for expected in [
        "INSERT INTO ai_runtime_usage_link",
        "tenant_id, organization_id, user_id, conversation_id",
        ".bind(command.subject.user_id)",
        "'chat_response'",
        "AND u.user_id = m.user_id",
        "WHERE tenant_id = $18 AND organization_id = $19 AND user_id = $20 AND uuid = $21",
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
        "UPDATE ai_chat_turn SET context_snapshot_count = context_snapshot_count + 1",
        "AND context_snapshot_count < 9223372036854775807 RETURNING context_snapshot_count",
    ] {
        assert_sql_contains(POSTGRES_APP_CHAT_STORE, expected);
    }
}

#[test]
fn postgres_chat_sequences_are_allocated_from_the_locked_conversation_row() {
    for expected in [
        "SELECT id, conversation_code, message_count, turn_count, item_count",
        "FROM ai_chat_conversation",
        "FOR UPDATE",
        "checked_counter_next(&conversation, \"turn_count\", \"chat turn\")",
        "checked_counter_next(&conversation, \"item_count\", \"chat item\")",
        "checked_counter_next(&conversation, \"message_count\", \"chat message\")",
        "message_count = message_count + 1",
        "turn_count = turn_count + 1",
        "item_count = item_count + 2",
        ".checked_add(1)",
        "if current < 0",
    ] {
        assert_sql_contains(POSTGRES_APP_CHAT_STORE, expected);
    }

    assert_sql_excludes(POSTGRES_APP_CHAT_STORE, "COUNT(*) + 1");
    assert_sql_excludes(POSTGRES_APP_CHAT_STORE, "MAX(sequence_no) + 1");
    assert_sql_excludes(POSTGRES_APP_CHAT_STORE, "ChatCountTable");
}

#[test]
fn postgres_chat_mutations_bind_the_full_trusted_subject_scope() {
    for expected in [
        "WHERE tenant_id = $5 AND organization_id = $6 AND user_id = $7 AND id = $8",
        "WHERE id = $8 AND tenant_id = $9 AND organization_id = $10 AND user_id = $11 AND conversation_id = $12 AND turn_id = $13",
        "WHERE id = $17 AND tenant_id = $18 AND organization_id = $19 AND user_id = $20 AND conversation_id = $21",
        "WHERE id = $11 AND tenant_id = $12 AND organization_id = $13 AND user_id = $14",
    ] {
        assert_sql_contains(POSTGRES_APP_CHAT_STORE, expected);
    }
}

#[test]
fn postgres_chat_persists_turn_mode_and_bounds_conversation_preview() {
    for expected in [
        "conversation_id, turn_no, mode, status",
        ".bind(&command.mode)",
        "truncate(&command.message, 1024, None)",
        "last_item_id = $4",
        ".bind(output_item_id)",
    ] {
        assert_sql_contains(POSTGRES_APP_CHAT_STORE, expected);
    }
}
