const SQLITE_ADMIN_MARKETING_STORE: &str =
    include_str!("../src/infrastructure/sql/sqlite/admin_marketing_store.rs");
const POSTGRES_ADMIN_MARKETING_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/admin_marketing_store.rs");

#[test]
fn admin_marketing_exchange_rule_uses_appbase_exchange_rule_table() {
    for source in [SQLITE_ADMIN_MARKETING_STORE, POSTGRES_ADMIN_MARKETING_STORE] {
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
}

#[test]
fn admin_marketing_recharge_catalog_uses_appbase_catalog_tables() {
    for source in [SQLITE_ADMIN_MARKETING_STORE, POSTGRES_ADMIN_MARKETING_STORE] {
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
}

#[test]
fn admin_marketing_promotion_coupon_uses_appbase_coupon_tables() {
    for source in [SQLITE_ADMIN_MARKETING_STORE, POSTGRES_ADMIN_MARKETING_STORE] {
        let coupon_sections = source_section(
            source,
            "async fn list_promotion_offers",
            "async fn list_recharge_records",
        );

        assert!(coupon_sections.contains("promotion_offer"));
        assert!(coupon_sections.contains("promotion_offer_version"));
        assert!(coupon_sections.contains("promotion_coupon_stock"));
        assert!(coupon_sections.contains("promotion_code"));
        assert!(coupon_sections.contains("promotion_user_coupon"));
        assert!(coupon_sections.contains("PromotionCouponStatus"));
        assert!(
            coupon_sections.contains("current_offer_version_id"),
            "promotion offer path must use promotion_offer.current_offer_version_id instead of inferring current version from version_no ordering"
        );
        assert!(
            !coupon_sections.contains("current_version_id"),
            "promotion offer path must not use the ambiguous current_version_id column name"
        );
        assert!(
            coupon_sections.contains("INSERT INTO promotion_offer_version"),
            "promotion offer update path must publish immutable offer versions instead of mutating an existing version"
        );
        assert!(
            coupon_sections.contains("offer_version_id, promotion_code"),
            "promotion code inventory must record the offer version snapshot used by its stock"
        );
        assert!(
            !coupon_sections.contains("version_no = 'v1'"),
            "promotion offer updates must not target v1 in place"
        );
        assert!(
            !coupon_sections.contains("version_no DESC"),
            "promotion offer path must not sort textual version numbers to infer the current version"
        );
        assert!(
            !coupon_sections.contains("commerce_coupon_template"),
            "promotion offer definition path must use promotion_offer and promotion_offer_version"
        );
        assert!(
            !coupon_sections.contains("commerce_coupon_issue_batch"),
            "promotion coupon stock path must use promotion_coupon_stock"
        );
        assert!(
            !coupon_sections.contains("commerce_coupon"),
            "promotion code path must use promotion_code and promotion_user_coupon"
        );
        assert!(
            !coupon_sections.contains("plus_coupon"),
            "promotion offer path must not keep the legacy plus coupon table"
        );
        assert!(
            !coupon_sections.contains("plus_coupon_template"),
            "promotion offer path must not keep the legacy plus coupon template table"
        );
        assert!(
            !coupon_sections.contains("plus_user_coupon"),
            "promotion code path must not keep the legacy plus user coupon table"
        );
        assert!(
            !coupon_sections.contains("ops_coupon_issue_batch"),
            "promotion coupon stock path must not keep the legacy ops coupon issue batch table"
        );
        assert!(
            !coupon_sections.contains("COUPON_STATUS_"),
            "promotion offer path must use appbase string coupon statuses directly"
        );
        assert!(
            !coupon_sections.contains("PROMO_STATUS_"),
            "promotion code path must use appbase string coupon statuses directly"
        );
    }
}

#[test]
fn admin_marketing_recharge_records_use_appbase_order_payment_tables() {
    for source in [SQLITE_ADMIN_MARKETING_STORE, POSTGRES_ADMIN_MARKETING_STORE] {
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
}

#[test]
fn admin_marketing_payment_attempts_use_appbase_payment_tables() {
    for source in [SQLITE_ADMIN_MARKETING_STORE, POSTGRES_ADMIN_MARKETING_STORE] {
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
}

fn source_section<'a>(source: &'a str, start: &str, end: &str) -> &'a str {
    let start_index = source.find(start).expect("section start must exist");
    let end_index = source[start_index..]
        .find(end)
        .map(|offset| start_index + offset)
        .expect("section end must exist");
    &source[start_index..end_index]
}
