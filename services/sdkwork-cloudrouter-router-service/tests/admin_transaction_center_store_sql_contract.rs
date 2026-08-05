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
fn transaction_center_mainstream_payment_supplier_codes_match_aggregate_contract() {
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

    let supplier_codes = API
        .split("const PAYMENT_PROVIDER_CODES")
        .nth(1)
        .expect("transaction center provider code allowlist")
        .split("const PAYMENT_METHOD_CODES")
        .next()
        .expect("transaction center provider code block");
    for provider in &expected {
        assert!(
            supplier_codes.contains(&format!("\"{provider}\"")),
            "transaction center provider account mutations must allow mainstream provider {provider}"
        );
    }
    assert!(
        supplier_codes.contains("\"sandbox\""),
        "transaction center provider allowlist must accept the seeded sandbox provider"
    );
    let method_codes = API
        .split("const PAYMENT_METHOD_CODES")
        .nth(1)
        .expect("transaction center method code allowlist");
    for method in ["stripe_card", "alipay_qr", "wechat_native", "sandbox_test"] {
        assert!(
            method_codes.contains(&format!("\"{method}\"")),
            "transaction center method allowlist must accept seeded catalog method {method}"
        );
    }
    for extension in [
        "unionpay",
        "yeepay",
        "jd_pay",
        "lianlian_pay",
        "lakala",
        "allinpay",
        "china_ums",
        "fuiou_pay",
        "sandpay",
        "huifu_pay",
        "baofoo",
        "bill99",
        "pingan_pay",
        "icbc_pay",
        "cmb_pay",
        "ccb_pay",
        "boc_pay",
        "psbc_pay",
    ] {
        assert!(
            !supplier_codes.contains(&format!("\"{extension}\"")),
            "extension provider {extension} must not be accepted by active transaction center mutations yet"
        );
    }
    assert!(
        supplier_codes.find("\"stripe\"") < supplier_codes.find("\"paypal\""),
        "transaction center provider allowlist order must match payment aggregate supported provider order"
    );
}

#[test]
fn transaction_center_provider_account_projection_exposes_sdk_note_from_audit_summary() {
    assert!(
        POSTGRES_STORE.contains("audit.change_summary->>'note'"),
        "postgres provider account projection must expose SDK note from audit change_summary"
    );
    assert!(
        POSTGRES_STORE.contains("'payments.provider_account.create'"),
        "postgres provider account note projection must scope audit reads to create events"
    );
}

#[test]
fn transaction_center_payment_provider_projection_exposes_only_canonical_api_fields() {
    let provider_projection = POSTGRES_STORE
        .split("async fn list_payment_providers")
        .nth(1)
        .unwrap_or_default()
        .split("async fn list_payment_provider_accounts")
        .next()
        .unwrap_or_default();
    for forbidden in [
        "'tenant_id'",
        "'organization_id'",
        "'supplier_code'",
        "'display_name'",
        "'provider_type'",
        "'supported_countries'",
        "'supported_currencies'",
        "'supported_methods'",
        "'sort_order'",
        "'created_at'",
        "'updated_at'",
    ] {
        assert!(
            !provider_projection.contains(forbidden),
            "product provider inventory must not expose non-canonical field {forbidden}"
        );
    }
}

#[test]
fn transaction_center_provider_account_projection_exposes_sdk_credential_flags_and_mode() {
    let source = POSTGRES_STORE;
    for fragment in [
        "'hasPrimarySecret', (secret_ref IS NOT NULL AND secret_ref <> '')",
        "'hasWebhookSecret', (webhook_secret_ref IS NOT NULL AND webhook_secret_ref <> '')",
        "'hasCertificate', (certificate_ref IS NOT NULL AND certificate_ref <> '')",
        "audit.change_summary->>'accountMode'",
    ] {
        assert!(
            source.contains(fragment),
            "postgres provider account projection must expose SDK fragment {fragment}"
        );
    }
}
