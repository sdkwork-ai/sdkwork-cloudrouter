const POSTGRES_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/admin_transaction_center_store.rs");
const API: &str = include_str!("../src/api/admin_transaction_center.rs");
const PAYMENT_ACCOUNT_RESOLVER: &str =
    include_str!("../src/application/payment_provider_account_resolver.rs");
const PAYMENT_OPENAPI: &str =
    include_str!("../../../crates/sdkwork-claw-http/specs/payment-aggregate-openapi.json");

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
fn transaction_center_provider_account_create_uses_command_scoped_idempotency() {
    let source = POSTGRES_STORE;
    assert!(
        source.contains("payment_provider_account_idempotency_id"),
        "postgres store must isolate provider account command idempotency in a named helper"
    );
    assert!(
        source.contains("\"payment-provider-account-command\""),
        "postgres store must use a command-scoped id namespace"
    );
    let helper = source
        .split("fn payment_provider_account_idempotency_id")
        .nth(1)
        .unwrap_or_default()
        .split("fn ensure_payment_provider_account_replay_matches")
        .next()
        .unwrap_or_default();
    assert!(
        helper.contains("command.subject.tenant_id")
            && helper.contains("command.subject.organization_id")
            && helper.contains("command.idempotency_key"),
        "postgres command idempotency must include tenant, organization, and Idempotency-Key"
    );
    assert!(
        !helper.contains("command.account_no"),
        "postgres command idempotency must not include mutable payload fields such as accountNo"
    );
}

#[test]
fn transaction_center_api_enforces_generated_provider_account_contract() {
    assert!(
        API.contains("deny_unknown_fields"),
        "provider account mutation payload must reject fields outside the generated contract"
    );
    for expected in [
        "PAYMENT_PROVIDER_CODES",
        "PAYMENT_METHOD_CODES",
        "PAYMENT_PROVIDER_ENVIRONMENTS",
        "PAYMENT_CONFIG_STATUSES",
        "normalize_optional_enum",
        "\"countryCode\"",
        "\"settlementCurrency\"",
        "\"^[A-Z]{2}$\"",
        "\"^[A-Z]{3}$\"",
        "MAX_MERCHANT_ID_LEN",
        "MAX_SECRET_REF_LEN",
        "is_ascii_identifier(&account_no)",
        "validate_secret_ref(",
    ] {
        assert!(
            API.contains(expected),
            "transaction center API must enforce provider account contract fragment {expected}"
        );
    }
    for expected in [
        "validate_payment_secret_ref(",
        "secretRef must start with vault:// or secret://",
    ] {
        assert!(
            PAYMENT_ACCOUNT_RESOLVER.contains(expected),
            "payment account resolver must enforce provider account secret contract fragment {expected}"
        );
    }
    assert!(
        API.contains("MAX_QUERY_STATUS_LEN") && API.contains("MAX_BUSINESS_DATE_LEN"),
        "transaction center API must align list query string length limits with the generated OpenAPI contract"
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
fn transaction_center_sql_stores_persist_rotated_at_from_provider_account_command() {
    let source = POSTGRES_STORE;
    assert!(
        source.contains("command.rotated_at.as_deref()"),
        "postgres store must persist rotatedAt from the provider account command"
    );
    assert!(
        source.contains("(\"rotatedAt\", command.rotated_at.as_deref())"),
        "postgres store must include rotatedAt in provider account idempotent replay checks"
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
fn transaction_center_provider_account_create_writes_ops_audit_log() {
    let source = POSTGRES_STORE;
    assert!(source.contains("PAYMENT_PROVIDER_ACCOUNT_AUDIT_ACTION"));
    assert!(!source.contains("PAYMENT_PROVIDER_ACCOUNT_CREATE_AUDIT_ACTION"));
    assert!(source.contains("payments.provider_account.create"));
    assert!(source.contains("INSERT INTO ops_audit_log"));
    assert!(source.contains("target_uuid"));
    assert!(source.contains("WHERE NOT EXISTS"));
    assert!(
        source.contains("\"clientRequestNo\": command.client_request_no")
            && source.contains("\"note\": command.note"),
        "postgres store must persist SDK request metadata in the provider account audit summary"
    );
    assert!(
        source.contains("ensure_payment_provider_account_replay_audit_matches"),
        "postgres store must verify audit-backed request metadata during idempotent replays"
    );
    let audit_replay = source
        .split("fn ensure_payment_provider_account_replay_matches")
        .nth(1)
        .unwrap_or_default();
    assert!(
        audit_replay.contains("(\"clientRequestNo\", command.client_request_no.as_deref())")
            && audit_replay.contains("(\"note\", command.note.as_deref())"),
        "postgres store must reject provider account replays that mutate SDK request metadata"
    );
}

#[test]
fn transaction_center_payment_route_rule_projection_matches_generated_item_contract() {
    assert!(POSTGRES_STORE.contains("fallbackChannelId"));
    assert!(POSTGRES_STORE.contains("fallbackEnabled"));
}

#[test]
fn transaction_center_payment_provider_and_method_projections_match_generated_item_contracts() {
    let source = POSTGRES_STORE;
    for field in [
        "supportedCountries",
        "supportedCurrencies",
        "capabilities",
        "methodType",
        "checkoutScenes",
    ] {
        assert!(
            source.contains(field),
            "postgres store must expose {field} required by generated payment SDK item contracts"
        );
    }
    assert!(
        source.contains("NULLIF(provider, 'wallet_balance')"),
        "postgres payment method projection must expose wallet_balance providerCode as null to match the SDK enum"
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
fn transaction_center_payment_runtime_projection_standardizes_method_provider_and_subject_codes() {
    let source = POSTGRES_STORE;
    for expected in [
        "WHEN pi.provider = 'stripe' THEN 'card'",
        "WHEN pa.provider = 'stripe' THEN 'card'",
        "WHEN pi.provider = 'card' THEN 'stripe'",
        "WHEN pa.provider = 'card' THEN 'stripe'",
        "WHEN pi.provider IN ('wechat', 'wechatpay') THEN 'wechat_pay'",
        "WHEN pa.provider IN ('wechat', 'wechatpay') THEN 'wechat_pay'",
        "WHEN 'membership' THEN 'membership_purchase'",
    ] {
        assert!(
            source.contains(expected),
            "postgres payment runtime projection must include normalization fragment {expected}"
        );
    }
    assert!(
        !source.contains("'providerCode', pi.provider")
            && !source.contains("'providerCode', pa.provider")
            && !source.contains("pi.provider AS providerCode")
            && !source.contains("pa.provider AS providerCode"),
        "postgres payment runtime projection must not expose raw provider as providerCode"
    );
}
