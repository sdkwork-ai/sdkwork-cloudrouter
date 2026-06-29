const GENERATED_POSTGRES_SCHEMA: &str =
    include_str!("../../../generated/schema/postgres/schema.sql");
const MODELS_CATALOG_FOUNDATION_SQL: &str = include_str!(
    "../../../data/sdkwork-models/database/ddl/baseline/postgres/0001_sdkwork_models_catalog_baseline.sql"
);
const SCHEMA_MANIFEST: &str =
    include_str!("../../../generated/schema/manifest/schema-manifest.json");
const SCHEMA_REGISTRY_TABLES: &str =
    include_str!("../../../generated/schema/registry/sdkwork-clawrouter.tables.effective.yaml");

fn runtime_ranking_schema_sql() -> String {
    format!("{GENERATED_POSTGRES_SCHEMA}\n\n{MODELS_CATALOG_FOUNDATION_SQL}")
}

fn compact_sql(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn assert_contains(source: &str, expected: &str, context: &str) {
    let actual = compact_sql(source);
    let compact_expected = compact_sql(expected);
    assert!(
        actual.contains(&compact_expected),
        "{context} must contain `{expected}`"
    );
}

#[test]
fn generated_schema_has_table_field_contract_for_model_ranking_refresh_and_reads() {
    let runtime_schema = runtime_ranking_schema_sql();
    for expected in [
        "CREATE TABLE IF NOT EXISTS ai_usage",
        "catalog_key VARCHAR(256) NOT NULL",
        "occurred_at TIMESTAMPTZ",
        "cost_amount NUMERIC(38, 12)",
        "currency VARCHAR(10)",
        "pricing_snapshot JSONB",
        "CREATE TABLE IF NOT EXISTS ops_job_execution",
        "job_type INTEGER",
        "trigger_type INTEGER",
        "started_at TIMESTAMPTZ",
        "ended_at TIMESTAMPTZ",
        "payload JSONB",
    ] {
        assert_contains(
            GENERATED_POSTGRES_SCHEMA,
            expected,
            "generated Postgres schema",
        );
    }
    for expected in [
        "CREATE TABLE IF NOT EXISTS ai_model_rank_snapshot",
        "snapshot_date DATE",
        "snapshot_period INTEGER",
        "rank_scope VARCHAR(64)",
        "catalog_key VARCHAR(256) NOT NULL",
        "region_code VARCHAR(64) NOT NULL",
        "rank_no INTEGER",
        "metadata JSONB NOT NULL DEFAULT '{}'::jsonb",
        "rank_payload JSONB",
    ] {
        assert_contains(
            &runtime_schema,
            expected,
            "runtime ranking schema (claw-router generated + sdkwork-models catalog baseline)",
        );
    }
}

#[test]
fn generated_schema_has_index_contract_for_model_ranking_refresh_and_reads() {
    let runtime_schema = runtime_ranking_schema_sql();
    for expected in [
        "CREATE INDEX IF NOT EXISTS idx_ai_usage_model_occurred ON ai_usage (tenant_id, organization_id, catalog_key, occurred_at, id)",
        "CREATE INDEX IF NOT EXISTS idx_ops_job_execution_model_ranking_scope_started ON ops_job_execution (tenant_id, organization_id, status, job_type, job_name, started_at, id)",
    ] {
        assert_contains(expected, expected, "test fixture sanity");
        assert_contains(GENERATED_POSTGRES_SCHEMA, expected, "generated Postgres schema");
    }
    for expected in [
        "CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_model_rank_snapshot_scope_catalog_key ON ai_model_rank_snapshot (tenant_id, organization_id, snapshot_date, snapshot_period, rank_scope, vendor_code, region_code, catalog_key)",
        "CREATE INDEX IF NOT EXISTS idx_ai_model_rank_snapshot_latest_scope ON ai_model_rank_snapshot (tenant_id, organization_id, status, rank_scope, snapshot_date, snapshot_period, rank_no)",
        "CREATE INDEX IF NOT EXISTS idx_ai_model_rank_snapshot_filter_rank ON ai_model_rank_snapshot (tenant_id, organization_id, status, snapshot_date, snapshot_period, rank_scope, vendor_code, region_code, modality, rank_no)",
    ] {
        assert_contains(expected, expected, "test fixture sanity");
        assert_contains(
            &runtime_schema,
            expected,
            "runtime ranking schema (claw-router generated + sdkwork-models catalog baseline)",
        );
    }
}

#[test]
fn schema_registry_declares_the_same_model_ranking_field_and_index_contract() {
    for expected in [
        "occurred_at: instant",
        "pricing_snapshot: json",
        "time_field: occurred_at",
        "window_predicate: half_open_utc",
        "aggregation_grain: - tenant_id - organization_id - catalog_key",
        "snapshot_date: date",
        "snapshot_period: enum_int32",
        "rank_scope: string(64)",
        "rank_payload: json",
        "metadata_contract:",
        "rank_payload_contract:",
        "job_type: enum_int32",
        "trigger_type: enum_int32",
        "started_at: instant",
        "ended_at: instant",
        "payload: json",
        "semantic_contracts:",
        "model_ranking_refresh:",
        "job_name: model_ranking_refresh",
        "code: 20",
        "scheduled: 1",
        "manual: 2",
        "payload_contract:",
        "required_fields: - rankScope - snapshotDate - snapshotPeriod - windowStart - windowEnd - generatedCount - sourceCount - refreshIntervalSeconds - cacheMaxAgeSeconds - nextRefreshAt - status - attemptCount - retryCount - consecutiveFailureCount - alertRecommended - sourceTables",
        "source_tables: - ai_usage - ai_model - ai_model_rank_snapshot",
        "runtime_contract:",
        "scheduler_owner: sdkwork-clawrouter-standalone-gateway",
        "run_on_startup_default: true",
        "default_millis: 300000",
        "max_retry_attempts_default: 1",
        "scope: - worker_instance - tenant_id - organization_id - rank_scope",
        "overlap_behavior: audit_skipped",
        "invalidate_after_status: - succeeded - empty",
        "alert_after_consecutive_failures_default: 3",
        "uk_ai_model_rank_snapshot_scope_catalog_key",
        "columns: - tenant_id - organization_id - snapshot_date - snapshot_period - rank_scope - vendor_code - region_code - catalog_key",
        "idx_ai_model_rank_snapshot_latest_scope",
        "columns: - tenant_id - organization_id - status - rank_scope - snapshot_date - snapshot_period - rank_no",
        "idx_ai_model_rank_snapshot_filter_rank",
        "columns: - tenant_id - organization_id - status - snapshot_date - snapshot_period - rank_scope - vendor_code - region_code - modality - rank_no",
        "idx_ai_usage_model_occurred",
        "columns: - tenant_id - organization_id - catalog_key - occurred_at - id",
        "idx_ops_job_execution_model_ranking_scope_started",
        "columns: - tenant_id - organization_id - status - job_type - job_name - started_at - id",
    ] {
        assert_contains(SCHEMA_REGISTRY_TABLES, expected, "schema registry");
    }
}

#[test]
fn schema_manifest_preserves_model_ranking_semantic_contracts_for_release_audit() {
    let manifest: serde_json::Value = serde_json::from_str(SCHEMA_MANIFEST)
        .expect("generated schema manifest must be valid JSON");
    let usage_fact = manifest_table(&manifest, "ai_usage");
    assert_eq!(
        "occurred_at",
        usage_fact["semantic_contracts"]["ranking_refresh_source_fact"]["time_field"]
    );
    assert_eq!(
        serde_json::json!(["tenant_id", "organization_id", "catalog_key"]),
        usage_fact["semantic_contracts"]["ranking_refresh_source_fact"]["aggregation_grain"]
    );

    let ranking_snapshot = manifest_table(&manifest, "ai_model_rank_snapshot");
    assert_eq!(
        serde_json::json!([
            "snapshotDate",
            "snapshotPeriod",
            "windowStart",
            "windowEnd",
            "generatedAt",
            "refreshIntervalSeconds",
            "nextRefreshAt",
            "cacheMaxAgeSeconds",
            "sourceTables"
        ]),
        ranking_snapshot["semantic_contracts"]["ranking_snapshot"]["metadata_contract"]
            ["required_fields"]
    );
    assert_eq!(
        serde_json::json!([
            "catalogKey",
            "rank",
            "previousRank",
            "sourceRows",
            "requests",
            "tokens",
            "cost",
            "currency"
        ]),
        ranking_snapshot["semantic_contracts"]["ranking_snapshot"]["rank_payload_contract"]
            ["required_fields"]
    );

    let job_execution = manifest_table(&manifest, "ops_job_execution");
    let refresh_contract = &job_execution["semantic_contracts"]["model_ranking_refresh"];
    assert_eq!("model_ranking_refresh", refresh_contract["job_name"]);
    assert_eq!(20, refresh_contract["job_type"]["code"]);
    assert_eq!(1, refresh_contract["trigger_types"]["scheduled"]);
    assert_eq!(2, refresh_contract["trigger_types"]["manual"]);
    assert_eq!(2, refresh_contract["execution_status"]["succeeded"]);
    assert_eq!(3, refresh_contract["execution_status"]["failed"]);
    assert_eq!(
        serde_json::json!([
            "rankScope",
            "snapshotDate",
            "snapshotPeriod",
            "windowStart",
            "windowEnd",
            "generatedCount",
            "sourceCount",
            "refreshIntervalSeconds",
            "cacheMaxAgeSeconds",
            "nextRefreshAt",
            "status",
            "attemptCount",
            "retryCount",
            "consecutiveFailureCount",
            "alertRecommended",
            "sourceTables"
        ]),
        refresh_contract["payload_contract"]["required_fields"]
    );
    assert_eq!(
        serde_json::json!(["ai_usage", "ai_model", "ai_model_rank_snapshot"]),
        refresh_contract["payload_contract"]["source_tables"]
    );
    assert_eq!(
        "sdkwork-clawrouter-standalone-gateway",
        refresh_contract["runtime_contract"]["scheduler_owner"]
    );
    assert_eq!(
        true,
        refresh_contract["runtime_contract"]["startup_policy"]["run_on_startup_default"]
    );
    assert_eq!(
        300_000,
        refresh_contract["runtime_contract"]["timeout"]["default_millis"]
    );
    assert_eq!(
        5,
        refresh_contract["runtime_contract"]["retry"]["max_retry_attempts_max"]
    );
    assert_eq!(
        serde_json::json!([
            "worker_instance",
            "tenant_id",
            "organization_id",
            "rank_scope"
        ]),
        refresh_contract["runtime_contract"]["concurrency_lock"]["scope"]
    );
    assert_eq!(
        serde_json::json!(["succeeded", "empty"]),
        refresh_contract["runtime_contract"]["cache_invalidation"]["invalidate_after_status"]
    );
    assert_eq!(
        3,
        refresh_contract["runtime_contract"]["delayed_alerting"]
            ["alert_after_consecutive_failures_default"]
    );
}

fn manifest_table<'a>(manifest: &'a serde_json::Value, table_name: &str) -> &'a serde_json::Value {
    manifest["tables"]
        .as_array()
        .expect("schema manifest tables must be an array")
        .iter()
        .find(|table| table["table"] == table_name)
        .unwrap_or_else(|| panic!("schema manifest must include {table_name}"))
}
