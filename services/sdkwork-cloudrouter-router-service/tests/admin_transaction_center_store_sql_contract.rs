const POSTGRES_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/admin_transaction_center_store.rs");
const API: &str = include_str!("../src/api/admin_transaction_center.rs");
const PAYMENT_OPENAPI: &str =
    include_str!("../../../crates/sdkwork-cloudrouter-http/specs/payment-aggregate-openapi.json");

#[test]
fn transaction_center_postgres_provider_json_projection_tolerates_blank_text_columns() {
    for field in ["supported_countries", "supported_currencies"] {
        let expected = format!("COALESCE(NULLIF({field}::text, '')::json, '[]'::json)");
        assert!(
            POSTGRES_STORE.contains(&expected),
            "postgres provider JSON projection must tolerate blank {field} values"
        );
        assert!(
            !POSTGRES_STORE.contains(&format!("COALESCE({field}::json")),
            "postgres provider JSON projection must not cast {field} directly"
        );
    }
    assert!(
        !POSTGRES_STORE.contains("'supported_methods', supported_methods"),
        "product provider inventory must not expose the database-only supported_methods field"
    );
    assert!(
        POSTGRES_STORE
            .contains("'capabilities', '[\"payment_intent\",\"payment_query\",\"payment_close\",\"refund\",\"webhook\",\"reconciliation\"]'::json"),
        "postgres provider item capabilities must use the SDK capability enum values instead of payment method codes"
    );
    assert!(
        !POSTGRES_STORE.contains("'capabilities', COALESCE(NULLIF(supported_methods::text"),
        "postgres provider item capabilities must not reinterpret supported_methods as SDK capabilities"
    );
}

#[test]
fn transaction_center_sql_stores_keep_tenant_rows_before_global_seed_fallback() {
    let source = POSTGRES_STORE;
    assert!(
        source.contains("tenant_id IN (CAST(") && source.contains(", '0')"),
        "postgres transaction center store must query tenant rows plus global seed rows"
    );
    assert!(
        source.contains("WHEN tenant_id = CAST(")
            || source.contains("WHEN c.tenant_id = CAST(")
            || source.contains("WHEN r.tenant_id = CAST("),
        "postgres transaction center store must sort tenant rows ahead of global seed rows"
    );
}

#[test]
fn transaction_center_sql_provider_writes_never_touch_shared_platform_rows() {
    let source = POSTGRES_STORE;
    let start = source
        .find("UPDATE commerce_payment_provider")
        .expect("postgres transaction center store must update payment providers");
    // The update statement runs until the next SELECT (the post-commit
    // reload); shared '0' rows are a read-fallback only and must never match
    // a tenant admin's write.
    let statement = source[start..]
        .split("SELECT")
        .next()
        .expect("update statement text");
    assert!(
        !statement.contains("'0')"),
        "payment provider writes must be scoped to the caller's tenant exactly; \
         the shared '0' platform row is read-fallback only"
    );
    assert!(
        statement.contains("WHERE tenant_id = CAST($1 AS TEXT)"),
        "payment provider writes must use an exact tenant predicate"
    );
}

#[test]
fn transaction_center_sql_stores_do_not_hide_missing_standard_tables() {
    let source = POSTGRES_STORE;
    assert!(
        !source.contains("table_exists("),
        "postgres transaction center store must fail fast when a standard table is missing"
    );
    assert!(
        !source.contains("empty_collection(") && !source.contains("empty_child_collection("),
        "postgres transaction center store must not silently convert schema defects to empty pages"
    );
}

#[test]
fn transaction_center_filters_accept_configured_channels_without_a_closed_allowlist() {
    let spec: serde_json::Value =
        serde_json::from_str(PAYMENT_OPENAPI).expect("payment aggregate OpenAPI parses");
    let supported = spec
        .get("x-supported-provider-codes")
        .and_then(|value| value.as_array())
        .expect("payment aggregate OpenAPI declares supported provider codes")
        .iter()
        .map(|value| value.as_str().expect("provider code is a string"))
        .collect::<Vec<_>>();
    let expected = vec![
        "wechat_pay",
        "alipay",
        "stripe",
        "paypal",
        "apple_pay",
        "google_pay",
    ];
    assert_eq!(
        supported, expected,
        "payment aggregate OpenAPI must expose only the initial mainstream provider set"
    );
    // Providers and methods are deployment configuration in the payment centre, not
    // compile-time variants, so the transaction centre must not carry a closed
    // allowlist: it would reject a newly connected channel and hide a retired one's
    // historical rows. The API validates the shape of the filter instead, and the
    // payment centre's catalogue is the authority on which codes exist.
    assert!(
        !API.contains("const PAYMENT_PROVIDER_CODES"),
        "the transaction centre must not hard-code a closed provider allowlist"
    );
    assert!(
        !API.contains("const PAYMENT_METHOD_CODES"),
        "the transaction centre must not hard-code a closed method allowlist"
    );
    assert!(
        API.contains("normalize_optional_filter_code(query.provider_code"),
        "the provider filter must be normalized by shape, not by membership"
    );
    assert!(
        API.contains("normalize_optional_filter_code(query.method_code"),
        "the method filter must be normalized by shape, not by membership"
    );
}