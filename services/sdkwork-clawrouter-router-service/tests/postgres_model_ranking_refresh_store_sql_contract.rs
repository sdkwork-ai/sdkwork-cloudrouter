const POSTGRES_MODEL_RANKING_REFRESH_STORE: &str = include_str!(
    "../../../data/sdkwork-models/crates/sdkwork-models-catalog-repository-sqlx/src/postgres/model_ranking_refresh_store.rs"
);

fn compact_sql(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn assert_sql_contains(sql: &str, expected: &str) {
    let actual = compact_sql(sql);
    let compact_expected = compact_sql(expected);
    assert!(
        actual.contains(&compact_expected),
        "Postgres model ranking refresh SQL must contain `{expected}`"
    );
}

fn assert_sql_not_contains(sql: &str, forbidden: &str) {
    let actual = compact_sql(sql).to_ascii_lowercase();
    let compact_forbidden = compact_sql(forbidden).to_ascii_lowercase();
    assert!(
        !actual.contains(&compact_forbidden),
        "Postgres model ranking refresh SQL must not contain `{forbidden}`"
    );
}

#[test]
fn postgres_model_ranking_refresh_uses_indexable_usage_occurred_at_window_predicate() {
    for expected in [
        "AND u.occurred_at >= $6::timestamp AT TIME ZONE 'UTC'",
        "AND u.occurred_at < $7::timestamp AT TIME ZONE 'UTC'",
    ] {
        assert_sql_contains(POSTGRES_MODEL_RANKING_REFRESH_STORE, expected);
    }

    for forbidden in [
        "CAST(u.occurred_at AS TEXT)",
        "DATE(u.occurred_at)",
        "to_char(u.occurred_at",
    ] {
        assert_sql_not_contains(POSTGRES_MODEL_RANKING_REFRESH_STORE, forbidden);
    }
}

#[test]
fn postgres_model_ranking_refresh_selects_model_scope_by_exact_tenant_then_tenant_default_then_platform(
) {
    for expected in [
        "WITH model_scope AS",
        "PARTITION BY m.catalog_key",
        "WHEN m.tenant_id = $1 AND m.organization_id = $2 THEN 3",
        "WHEN m.tenant_id = $1 AND m.organization_id = 0 THEN 2",
        "WHEN m.tenant_id = 0 AND m.organization_id = 0 THEN 1",
        "($1 > 0 AND m.tenant_id = $1 AND m.organization_id = $2)",
        "OR ($1 > 0 AND $2 > 0 AND m.tenant_id = $1 AND m.organization_id = 0)",
        "OR (m.tenant_id = 0 AND m.organization_id = 0)",
    ] {
        assert_sql_contains(POSTGRES_MODEL_RANKING_REFRESH_STORE, expected);
    }
}

#[test]
fn postgres_model_ranking_refresh_uses_public_active_models_only() {
    for expected in [
        "AND m.deleted_at IS NULL",
        "AND COALESCE(m.release_stage, 1) IN (1, 2)",
        "AND COALESCE(m.shelf_state, 1) = 1",
        "AND COALESCE(m.routing_state, 1) = 1",
    ] {
        assert_sql_contains(POSTGRES_MODEL_RANKING_REFRESH_STORE, expected);
    }
}

#[test]
fn postgres_model_ranking_refresh_reads_previous_rank_from_same_scope_period_and_earlier_snapshot()
{
    for expected in [
        "previous_rank AS",
        "AND r.tenant_id = $1",
        "AND r.organization_id = $2",
        "AND COALESCE(r.rank_scope, 'commercial-default') = $3",
        "AND r.snapshot_period = $4",
        "AND r.snapshot_date < $5::date",
        "LEFT JOIN previous_rank p",
        "ON p.vendor_code = a.vendor_code",
        "AND p.region_code = a.region_code",
        "AND p.catalog_key = a.catalog_key",
    ] {
        assert_sql_contains(POSTGRES_MODEL_RANKING_REFRESH_STORE, expected);
    }
}

#[test]
fn postgres_model_ranking_refresh_uses_explicit_customer_charge_amount() {
    assert_sql_contains(
        POSTGRES_MODEL_RANKING_REFRESH_STORE,
        "SUM(COALESCE(u.customer_charge_amount, 0)) AS cost_amount",
    );
    assert_sql_not_contains(POSTGRES_MODEL_RANKING_REFRESH_STORE, "u.cost_amount");
}

#[test]
fn postgres_model_ranking_refresh_uses_canonical_catalog_key_and_regionless_model_context() {
    for expected in [
        "'global' AS region_code",
        "m.catalog_key,",
        "ON m.catalog_key = u.catalog_key",
        "PARTITION BY r.vendor_code, r.region_code, r.catalog_key",
    ] {
        assert_sql_contains(POSTGRES_MODEL_RANKING_REFRESH_STORE, expected);
    }

    for forbidden in [
        "NULLIF(m.region_code",
        "m.region_code AS region_code",
        "COALESCE(NULLIF(m.region_code",
        "split_part(u.catalog_key",
        "substr(u.catalog_key",
        "length(COALESCE(u.catalog_key",
        "m.catalog_key = split_part",
        "m.catalog_key = substr",
    ] {
        assert_sql_not_contains(POSTGRES_MODEL_RANKING_REFRESH_STORE, forbidden);
    }
}

#[test]
fn postgres_model_ranking_refresh_upserts_one_active_row_per_snapshot_scope_and_catalog_key() {
    for expected in [
        "UPDATE ai_model_rank_snapshot",
        "SET status = 0",
        "INSERT INTO ai_model_rank_snapshot",
        "ON CONFLICT (tenant_id, organization_id, snapshot_date, snapshot_period, rank_scope, vendor_code, region_code, catalog_key) DO UPDATE SET",
        "status = excluded.status",
        "rank_payload = excluded.rank_payload",
    ] {
        assert_sql_contains(POSTGRES_MODEL_RANKING_REFRESH_STORE, expected);
    }
}

#[test]
fn postgres_model_ranking_refresh_records_typed_audit_job_with_json_payload() {
    for expected in [
        "const MODEL_RANKING_REFRESH_JOB_TYPE: i64 = 20;",
        "fn normalize_trigger_type(value: i64) -> i64",
        "2 => 2",
        "_ => 1",
        "INSERT INTO ops_job_execution",
        "INSERT INTO ops_job_execution (id, uuid, tenant_id, organization_id",
        "job_type, trigger_type",
        "processed_count, success_count",
        "failure_count, failure_reason, payload",
        "$17::jsonb",
        "\"rankScope\": command.rank_scope",
        "\"attemptCount\": command.attempt_count.max(0)",
        "\"retryCount\": command.retry_count.max(0)",
        "\"consecutiveFailureCount\": command.consecutive_failure_count.max(0)",
        "\"alertRecommended\": command.alert_recommended",
        "\"alertSeverity\": command.alert_severity",
        "\"sourceTables\": [\"ai_usage\", \"ai_model\", \"ai_model_rank_snapshot\"]",
    ] {
        assert_sql_contains(POSTGRES_MODEL_RANKING_REFRESH_STORE, expected);
    }
}

#[test]
fn postgres_model_ranking_refresh_writes_explicit_snapshot_ids() {
    for expected in [
        "INSERT INTO ai_model_rank_snapshot",
        "INSERT INTO ai_model_rank_snapshot (id, uuid, tenant_id, organization_id",
        ".bind(next_claw_runtime_id(\"ai_model_rank_snapshot\")?)",
    ] {
        assert_sql_contains(POSTGRES_MODEL_RANKING_REFRESH_STORE, expected);
    }
}
