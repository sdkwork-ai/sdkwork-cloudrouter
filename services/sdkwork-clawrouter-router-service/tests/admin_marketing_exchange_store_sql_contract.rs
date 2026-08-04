const POSTGRES_ADMIN_MARKETING_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/admin_marketing_store.rs");

#[test]
fn admin_marketing_exchange_rule_uses_appbase_exchange_rule_table() {
    let source = POSTGRES_ADMIN_MARKETING_STORE;
    let exchange_sections = format!(
        "{}{}{}",
        source_section(
            source,
            "async fn list_exchange_rules",
            "async fn insert_recharge_package"
        ),
        source_section(
            source,
            "async fn upsert_exchange_rule",
            "async fn sync_recharge_package_product_for_create"
        ),
        source_section(
            source,
            "fn exchange_rule_from_row",
            "fn payment_attempt_from_row"
        ),
    );

    assert!(exchange_sections.contains("commerce_exchange_rule"));
    assert!(exchange_sections.contains("source_asset_type"));
    assert!(exchange_sections.contains("target_asset_type"));
    assert!(exchange_sections.contains("status"));
    assert!(
        !source.contains("plus_account_exchange_config"),
        "admin marketing exchange rule path must not keep the legacy plus exchange config table"
    );
    assert!(
        !exchange_sections.contains("config_key"),
        "admin marketing exchange rule path must use normalized appbase exchange columns directly"
    );
    assert!(
        !exchange_sections.contains("config_value"),
        "admin marketing exchange rule path must use commerce_exchange_rule.rate directly"
    );
}

#[test]
fn admin_marketing_recharge_catalog_uses_appbase_catalog_tables() {
    let source = POSTGRES_ADMIN_MARKETING_STORE;
    let recharge_catalog_sections = format!(
        "{}{}{}",
        source_section(
            source,
            "async fn list_recharge_packages",
            "async fn list_exchange_rules"
        ),
        source_section(
            source,
            "async fn insert_recharge_package",
            "async fn upsert_exchange_rule"
        ),
        source_section(
            source,
            "async fn sync_recharge_package_product_for_create",
            "async fn list_referral_stats"
        ),
    );

    assert!(recharge_catalog_sections.contains("commerce_recharge_package"));
    assert!(recharge_catalog_sections.contains("commerce_product_spu"));
    assert!(recharge_catalog_sections.contains("commerce_product_sku"));
    assert!(
        !recharge_catalog_sections.contains("plus_vip_recharge_pack"),
        "admin recharge package catalog path must not keep the legacy plus recharge package table"
    );
    assert!(
        !recharge_catalog_sections.contains("plus_product"),
        "admin recharge package catalog path must not keep the legacy plus product table"
    );
    assert!(
        !recharge_catalog_sections.contains("plus_sku"),
        "admin recharge package catalog path must not keep the legacy plus sku table"
    );
    assert!(
        !recharge_catalog_sections.contains("recharge_package_status_code"),
        "admin recharge package catalog path must use appbase string status values directly"
    );
}

#[test]
fn admin_marketing_store_does_not_reimplement_promotion_coupon_surface_locally() {
    let source = POSTGRES_ADMIN_MARKETING_STORE;
    for forbidden in [
        "promotion_offer",
        "promotion_coupon_stock",
        "promotion_code",
        "promotion_user_coupon",
        "promotion_discount_application",
        "COUPON_STATUS_",
        "PROMO_STATUS_",
    ] {
        assert!(
            !source.contains(forbidden),
            "clawrouter admin marketing store must not re-implement promotion coupon SQL `{forbidden}`; sdkwork-promotion owns that surface via the federated commerce pool"
        );
    }
}

#[test]
fn admin_marketing_recharge_records_use_appbase_order_payment_tables() {
    let source = POSTGRES_ADMIN_MARKETING_STORE;
    let recharge_record_sections = source_section(
        source,
        "async fn list_recharge_records",
        "async fn list_recharge_packages",
    );

    assert!(recharge_record_sections.contains("commerce_order"));
    assert!(recharge_record_sections.contains("commerce_payment_attempt"));
    assert!(recharge_record_sections.contains("commerce_payment_method"));
    assert!(
        !recharge_record_sections.contains("plus_vip_recharge"),
        "admin recharge record read path must not keep the legacy plus vip recharge table"
    );
    assert!(
        !recharge_record_sections.contains("plus_vip_recharge_method"),
        "admin recharge record read path must not keep the legacy plus vip recharge method table"
    );
}

#[test]
fn admin_marketing_payment_attempts_use_appbase_payment_tables() {
    let source = POSTGRES_ADMIN_MARKETING_STORE;
    let payment_sections = source_section(
        source,
        "async fn list_payment_attempts",
        "async fn insert_audit_log",
    );

    assert!(payment_sections.contains("commerce_payment_attempt"));
    assert!(payment_sections.contains("commerce_order"));
    assert!(
            payment_sections.contains("COALESCE(NULLIF(o.order_no, ''), NULLIF(pa.out_trade_no, ''), '')"),
            "admin payment attempt orderNo must expose the commerce order number, not the provider out_trade_no"
        );
    assert!(
        !payment_sections.contains("plus_payment"),
        "admin payment attempt read path must not keep the legacy plus payment table"
    );
    assert!(
        !payment_sections.contains("plus_order"),
        "admin payment attempt read path must not keep the legacy plus order table"
    );
}

fn source_section<'a>(source: &'a str, start: &str, end: &str) -> &'a str {
    let start_index = source.find(start).expect("section start must exist");
    let end_index = source[start_index..]
        .find(end)
        .map(|offset| start_index + offset)
        .expect("section end must exist");
    &source[start_index..end_index]
}
