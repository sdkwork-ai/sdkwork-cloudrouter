const POSTGRES_ADMIN_ANALYTICS_READ_STORE: &str = include_str!(
    "../../../crates/sdkwork-clawrouter-admin-analytics-repository-sqlx/src/postgres.rs"
);

fn compact_sql(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn assert_sql_contains(sql: &str, expected: &str) {
    let actual = compact_sql(sql);
    let compact_expected = compact_sql(expected);
    assert!(
        actual.contains(&compact_expected),
        "Postgres admin analytics SQL must contain `{expected}`"
    );
}

#[test]
fn postgres_admin_analytics_read_store_uses_usage_fact_aligned_failed_request_windows() {
    for expected in [
        "COUNT(DISTINCT CASE WHEN failed_request.request_id IS NULL THEN NULL ELSE usage.request_id END) AS failed_requests",
        "AND NULLIF(request_id, '') IS NOT NULL",
        "AND started_at IS NOT NULL",
        "AND ($3::text IS NULL OR started_at >= ($3::timestamp AT TIME ZONE 'UTC'))",
        "AND ($4::text IS NULL OR started_at <= ($4::timestamp AT TIME ZONE 'UTC'))",
        "AND failed_request.request_id = usage.request_id",
        "AND ($3::text IS NULL OR usage.occurred_at >= ($3::timestamp AT TIME ZONE 'UTC'))",
        "AND ($4::text IS NULL OR usage.occurred_at <= ($4::timestamp AT TIME ZONE 'UTC'))",
    ] {
        assert_sql_contains(POSTGRES_ADMIN_ANALYTICS_READ_STORE, expected);
    }
}

#[test]
fn postgres_admin_analytics_read_store_buckets_trend_by_requested_time_range() {
    for expected in [
        "fn postgres_period_expression(time_range: AdminAnalyticsTimeRange) -> &'static str",
        "AdminAnalyticsTimeRange::Hourly => \"to_char(occurred_at, 'YYYY-MM-DD HH24:00')\"",
        "AdminAnalyticsTimeRange::Weekly => \"to_char(occurred_at, 'IYYY-\\\"W\\\"IW')\"",
        "AdminAnalyticsTimeRange::Monthly => \"to_char(occurred_at, 'YYYY-MM')\"",
        "AdminAnalyticsTimeRange::Yearly => \"to_char(occurred_at, 'YYYY')\"",
        "AdminAnalyticsTimeRange::Daily => \"to_char(occurred_at, 'YYYY-MM-DD')\"",
        "let period_expr = postgres_period_expression(time_range);",
        "GROUP BY time_bucket",
        "LIMIT 30",
    ] {
        assert_sql_contains(POSTGRES_ADMIN_ANALYTICS_READ_STORE, expected);
    }
}

#[test]
fn postgres_admin_analytics_read_store_keeps_sqlite_aligned_usage_fact_fallbacks() {
    for expected in [
        "COUNT(DISTINCT COALESCE(CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), NULLIF(owner_name_snapshot, ''), 'unknown')) AS total_users",
        "COUNT(DISTINCT COALESCE(CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), NULLIF(owner_name_snapshot, ''), 'unknown')) AS users",
        "COALESCE(CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), NULLIF(owner_name_snapshot, ''), 'unknown') AS user_id",
        "COALESCE(NULLIF(owner_name_snapshot, ''), CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), 'unknown') AS user_name",
        "COUNT(DISTINCT COALESCE(CAST(NULLIF(owner_id, 0) AS TEXT), CAST(NULLIF(user_id, 0) AS TEXT), NULLIF(owner_name_snapshot, ''), 'unknown')) AS user_count",
        "CAST(COALESCE(SUM(COALESCE(upstream_cost_amount, cost_amount, 0)), 0) AS TEXT) AS upstream_cost",
        "COALESCE(modality, 0) AS modality",
        "GROUP BY COALESCE(modality, 0)",
    ] {
        assert_sql_contains(POSTGRES_ADMIN_ANALYTICS_READ_STORE, expected);
    }

    let actual = compact_sql(POSTGRES_ADMIN_ANALYTICS_READ_STORE);
    assert!(
        !actual.contains("AND user_id IS NOT NULL"),
        "Postgres analytics SQL must not drop anonymous usage rows"
    );
    assert!(
        !actual.contains("AND modality IS NOT NULL"),
        "Postgres analytics SQL must not drop unknown modality usage rows"
    );
    assert!(
        !actual.contains("COALESCE(user_id, 0)"),
        "Postgres analytics SQL must not render null user ownership as display value 0"
    );
    assert!(
        actual.contains("NULLIF(user_id, 0)"),
        "Postgres analytics SQL must treat persisted user_id=0 as unknown ownership"
    );
}

#[test]
fn postgres_admin_analytics_read_store_includes_default_scope_usage_rows() {
    for expected in [
        "usage.tenant_id = $1",
        "(usage.organization_id = $2 OR usage.organization_id = 0 OR usage.organization_id IS NULL)",
        "AND tenant_id = $1",
        "(organization_id = $2 OR organization_id = 0 OR organization_id IS NULL)",
    ] {
        assert_sql_contains(POSTGRES_ADMIN_ANALYTICS_READ_STORE, expected);
    }

    let actual = compact_sql(POSTGRES_ADMIN_ANALYTICS_READ_STORE);
    assert!(
        !actual.contains("AND usage.tenant_id = $1 AND usage.organization_id = $2"),
        "Postgres analytics SQL must not require exact organization scope for usage facts"
    );
    assert!(
        !actual.contains("usage.tenant_id = 0"),
        "Postgres analytics SQL must not include global tenant usage facts in tenant admin analytics"
    );
    assert!(
        !actual.contains("AND tenant_id = $1 AND organization_id = $2"),
        "Postgres analytics SQL must not require exact organization scope for analytics subqueries"
    );
}
