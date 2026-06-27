const SQLITE_MODEL_RANKING_REFRESH_STORE: &str = include_str!(
    "../../../data/sdkwork-models/crates/sdkwork-models-catalog-repository-sqlx/src/sqlite/model_ranking_refresh_store.rs"
);

fn compact_sql(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[test]
fn sqlite_model_ranking_refresh_uses_indexable_usage_occurred_at_window_predicate() {
    let sql = compact_sql(SQLITE_MODEL_RANKING_REFRESH_STORE);

    assert!(
        sql.contains("AND u.occurred_at >= ?6"),
        "SQLite model ranking refresh must compare ai_usage_fact.occurred_at directly to keep the tenant/catalog/time index usable"
    );
    assert!(
        sql.contains("AND u.occurred_at < ?7"),
        "SQLite model ranking refresh must use a direct half-open occurred_at window predicate"
    );
    assert!(
        !sql.contains("replace(COALESCE(CAST(u.occurred_at AS TEXT), ''), ' ', 'T')"),
        "SQLite model ranking refresh must not wrap u.occurred_at in functions because that disables the occurred_at index"
    );
}

#[test]
fn sqlite_model_ranking_refresh_uses_public_active_models_only() {
    let sql = compact_sql(SQLITE_MODEL_RANKING_REFRESH_STORE);

    for expected in [
        "AND m.deleted_at IS NULL",
        "AND COALESCE(m.release_stage, 1) IN (1, 2)",
        "AND COALESCE(m.shelf_state, 1) = 1",
        "AND COALESCE(m.routing_state, 1) = 1",
    ] {
        assert!(
            sql.contains(expected),
            "SQLite model ranking refresh must contain public-active model predicate `{expected}`"
        );
    }
}

#[test]
fn sqlite_model_ranking_refresh_records_normalized_audit_trigger_type() {
    let sql = compact_sql(SQLITE_MODEL_RANKING_REFRESH_STORE);

    assert!(
        sql.contains("INSERT INTO ops_job_execution (id, uuid, tenant_id, organization_id"),
        "SQLite audit writer must assign explicit ids for the installed BIGINT primary key"
    );
    assert!(
        sql.contains("fn normalize_trigger_type(value: i64) -> i64"),
        "SQLite audit writer must normalize trigger_type from the worker command"
    );
    assert!(
        sql.contains("2 => 2"),
        "SQLite audit writer must preserve manual trigger_type=2"
    );
    assert!(
        sql.contains("_ => 1"),
        "SQLite audit writer must default all unknown trigger types to scheduled=1"
    );
}

#[test]
fn sqlite_model_ranking_refresh_records_runtime_audit_payload_fields() {
    let sql = compact_sql(SQLITE_MODEL_RANKING_REFRESH_STORE);

    for expected in [
        "\"attemptCount\": command.attempt_count.max(0)",
        "\"retryCount\": command.retry_count.max(0)",
        "\"consecutiveFailureCount\": command.consecutive_failure_count.max(0)",
        "\"alertRecommended\": command.alert_recommended",
        "\"alertSeverity\": command.alert_severity",
    ] {
        assert!(
            sql.contains(expected),
            "SQLite audit payload must contain runtime field `{expected}`"
        );
    }
}

#[test]
fn sqlite_model_ranking_refresh_writes_explicit_snapshot_ids() {
    let sql = compact_sql(SQLITE_MODEL_RANKING_REFRESH_STORE);

    assert!(
        sql.contains("INSERT INTO ai_model_rank_snapshot (id, uuid, tenant_id, organization_id"),
        "SQLite ranking refresh must assign explicit ids for the installed BIGINT primary key"
    );
    assert!(
        sql.contains(".bind(next_claw_runtime_id(\"ai_model_rank_snapshot\")?)"),
        "SQLite ranking refresh must generate snapshot ids through the Claw runtime id generator"
    );
}
