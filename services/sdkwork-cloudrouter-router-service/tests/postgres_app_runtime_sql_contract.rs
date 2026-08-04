const POSTGRES_APP_RUNTIME_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/app_runtime_store.rs");

fn compact_sql(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn assert_sql_contains(sql: &str, expected: &str) {
    let actual = compact_sql(sql);
    let compact_expected = compact_sql(expected);
    assert!(
        actual.contains(&compact_expected),
        "Postgres app runtime SQL must contain `{expected}`"
    );
}

#[test]
fn runtime_invocation_sql_scopes_every_primary_query_by_trusted_subject() {
    for expected in [
        "WHERE tenant_id = $1",
        "AND organization_id = $2",
        "AND user_id = $3",
        "WHERE tenant_id = $17",
        "AND organization_id = $18",
        "AND user_id = $19",
        "AND uuid = $20",
    ] {
        assert_sql_contains(POSTGRES_APP_RUNTIME_STORE, expected);
    }
}

#[test]
fn runtime_invocation_execution_snapshot_sql_preserves_trusted_user_boundary() {
    for expected in [
        "request_json::text AS request_json",
        "metadata::text AS metadata",
        "AND user_id = $3",
        "AND uuid = $4",
    ] {
        assert_sql_contains(POSTGRES_APP_RUNTIME_STORE, expected);
    }
}

#[test]
fn runtime_invocation_insert_persists_product_user_id() {
    for expected in [
        "organization_id, user_id, conversation_id",
        ".bind(command.subject.user_id)",
        "AND COALESCE(conversation_id, '') = COALESCE($4, '')",
        "AND e.user_id = $4",
        "AND user_id = $3 AND runtime_invocation_id = $4",
    ] {
        assert_sql_contains(POSTGRES_APP_RUNTIME_STORE, expected);
    }
}

#[test]
fn runtime_context_validation_uses_string_lifecycle_statuses() {
    for expected in [
        "AND status <> 'deleted'",
        "FROM ai_chat_conversation",
        "FROM ai_chat_turn",
        "FROM ai_chat_item",
        "FROM ai_agent_run",
        "FROM ai_agent_run_step",
    ] {
        assert_sql_contains(POSTGRES_APP_RUNTIME_STORE, expected);
    }
    assert!(
        !POSTGRES_APP_RUNTIME_STORE.contains("status <> 9"),
        "Postgres runtime context validation must not compare string lifecycle status columns to numeric deleted states"
    );
}

#[test]
fn runtime_agent_step_context_requires_explicit_trusted_user_id() {
    let compact = compact_sql(POSTGRES_APP_RUNTIME_STORE);

    assert!(
        compact.contains("FROM ai_agent_run_step WHERE tenant_id = $1 AND organization_id = $2 AND user_id = $3 AND uuid = $4"),
        "Postgres Runtime AgentRunStep context validation must require the trusted user id"
    );
    assert!(
        !POSTGRES_APP_RUNTIME_STORE.contains("user_id IS NULL"),
        "Postgres Runtime AgentRunStep context validation must not accept ownerless steps"
    );
}
