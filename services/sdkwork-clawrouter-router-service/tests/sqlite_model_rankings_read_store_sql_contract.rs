const SQLITE_MODEL_RANKINGS_READ_STORE: &str = include_str!(
    "../../../../sdkwork-models/crates/sdkwork-models-catalog-repository-sqlx/src/sqlite/model_rankings_read_store.rs"
);

fn compact_sql(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn assert_sql_contains(sql: &str, expected: &str) {
    let actual = compact_sql(sql);
    let compact_expected = compact_sql(expected);
    assert!(
        actual.contains(&compact_expected),
        "SQLite model rankings read SQL must contain `{expected}`"
    );
}

fn assert_sql_contains_any(sql: &str, expected: &[&str], description: &str) {
    let actual = compact_sql(sql);
    assert!(
        expected
            .iter()
            .map(|fragment| compact_sql(fragment))
            .any(|fragment| actual.contains(&fragment)),
        "SQLite model rankings read SQL must contain {description}"
    );
}

#[test]
fn sqlite_model_rankings_read_store_uses_snapshot_scope_fallback_for_rankings_and_source_metadata()
{
    for expected in [
        "const LOAD_MODEL_RANKINGS: &str",
        "const LOAD_MODEL_RANKING_SOURCE: &str",
        "WITH selected_snapshot AS",
        "lower(COALESCE(rank_scope, 'commercial-default')) = ?3",
        "WHEN ?1 > 0 AND tenant_id = ?1 AND organization_id = ?2 THEN 3",
        "WHEN ?1 > 0 AND ?2 > 0 AND tenant_id = ?1 AND organization_id = 0 THEN 2",
        "WHEN tenant_id = 0 AND organization_id = 0 THEN 1",
        "snapshot_date DESC",
        "snapshot_period DESC",
        "LIMIT 1",
    ] {
        assert_sql_contains(SQLITE_MODEL_RANKINGS_READ_STORE, expected);
    }
}

#[test]
fn sqlite_model_rankings_read_store_applies_normalized_filters_and_bound_limits() {
    for expected in [
        "(?4 IS NULL OR lower(COALESCE(r.vendor_code, '')) = ?4)",
        "(?5 IS NULL OR r.modality = ?5)",
        "(?6 IS NULL OR lower(COALESCE(r.model, '') || ' ' || COALESCE(r.vendor_name_snapshot, '') || ' ' || COALESCE(r.vendor_code, '')) LIKE ?6)",
        "LIMIT ?7",
        "LIMIT ?5",
    ] {
        assert_sql_contains(SQLITE_MODEL_RANKINGS_READ_STORE, expected);
    }
}

#[test]
fn sqlite_model_rankings_read_store_uses_public_active_model_catalog_filter() {
    for expected in [
        "public_model_catalog AS",
        "FROM ai_model m",
        "AND COALESCE(m.release_stage, 1) IN (1, 2)",
        "AND COALESCE(m.shelf_state, 1) = 1",
        "AND COALESCE(m.routing_state, 1) = 1",
        "JOIN public_model_catalog visible_model ON visible_model.catalog_key = NULLIF(r.catalog_key, '')",
    ] {
        assert_sql_contains(SQLITE_MODEL_RANKINGS_READ_STORE, expected);
    }

    assert_sql_contains_any(
        SQLITE_MODEL_RANKINGS_READ_STORE,
        &["WHERE m.deleted_at IS NULL", "AND m.deleted_at IS NULL"],
        "the public model catalog deleted-at predicate",
    );
}

#[test]
fn sqlite_model_rankings_read_store_prefers_snapshot_scope_before_fallback_job_scope() {
    for expected in [
        "WITH selected_snapshot_scope AS",
        "selected_fallback_job_scope AS",
        "selected_job_scope AS",
        "FROM selected_snapshot_scope",
        "FROM selected_fallback_job_scope",
        "WHERE NOT EXISTS (SELECT 1 FROM selected_snapshot_scope)",
        "JOIN selected_job_scope s",
    ] {
        assert_sql_contains(SQLITE_MODEL_RANKINGS_READ_STORE, expected);
    }
}

#[test]
fn sqlite_model_rankings_read_store_filters_refresh_jobs_by_json_rank_scope_and_job_type() {
    for expected in [
        "const MODEL_RANKING_REFRESH_JOB_TYPE: i64 = 20;",
        "json_extract(payload, '$.rankScope')",
        "json_extract(payload, '$.rank_scope')",
        "lower(COALESCE(json_extract(payload, '$.rankScope'), json_extract(payload, '$.rank_scope'), 'commercial-default')) = ?3",
        "lower(COALESCE(json_extract(j.payload, '$.rankScope'), json_extract(j.payload, '$.rank_scope'), 'commercial-default')) = ?3",
        "AND job_type = ?4",
        "AND j.job_type = ?4",
        ".bind(MODEL_RANKING_REFRESH_JOB_TYPE)",
    ] {
        assert_sql_contains(SQLITE_MODEL_RANKINGS_READ_STORE, expected);
    }
}

#[test]
fn sqlite_model_rankings_read_store_preserves_source_metadata_when_filtered_rank_items_are_empty() {
    for expected in [
        "load_source_metadata(&self.pool, subject, rank_scope.as_str())",
        "sqlx::query(LOAD_MODEL_RANKING_SOURCE)",
        "CAST(COALESCE(r.metadata, '{}') AS TEXT) AS metadata",
        "ORDER BY r.rank_no ASC, r.id ASC",
    ] {
        assert_sql_contains(SQLITE_MODEL_RANKINGS_READ_STORE, expected);
    }
}
