use sdkwork_commerce_storage_repository_sqlx::{
    commerce_business_repository_sql_catalogs, commerce_database_indexes, commerce_database_tables,
    commerce_idempotency_repository_sql_contract, commerce_initial_migration_sql,
    commerce_migration_names, commerce_migration_plan, commerce_migration_runner_execution_plan,
    commerce_migration_runner_execution_result, commerce_migration_runner_failed_execution_result,
    commerce_migration_runner_failure_recovery, commerce_migration_runner_final_state,
    commerce_migration_runner_lock_acquire_outcome, commerce_migration_runner_lock_cleanup,
    commerce_migration_runner_lock_lifecycle, commerce_migration_runner_lock_record,
    commerce_migration_runner_preflight, commerce_migration_runner_sql_contract,
    commerce_repository_bindings, commerce_shop_service_area_key,
    commerce_storage_applied_migration_record, commerce_storage_capability_manifest,
    commerce_transaction_boundary_sql_contract, validate_commerce_migration_plan,
    validate_commerce_migration_runner_execution_plan,
    validate_commerce_migration_runner_execution_result,
    validate_commerce_migration_runner_failure_recovery,
    validate_commerce_migration_runner_final_state,
    validate_commerce_migration_runner_lock_cleanup,
    validate_commerce_migration_runner_lock_lifecycle,
    validate_commerce_migration_runner_sql_contract, CommerceShopServiceAreaKeyError,
    CommerceSqlConflictClassifier,
};

#[test]
fn exposes_first_slice_commerce_table_catalog() {
    let tables = commerce_database_tables();

    assert_eq!(tables.len(), 108);
    assert!(tables.contains(&"commerce_idempotency_key"));
    assert!(tables.contains(&"commerce_shop"));
    assert!(tables.contains(&"commerce_shop_application"));
    assert!(tables.contains(&"commerce_shop_verification"));
    assert!(tables.contains(&"commerce_shop_status_event"));
    assert!(tables.contains(&"commerce_shop_channel"));
    assert!(tables.contains(&"commerce_shop_fulfillment_profile"));
    assert!(tables.contains(&"commerce_shop_settlement_profile"));
    assert!(tables.contains(&"commerce_shop_metric_snapshot"));
    assert!(tables.contains(&"commerce_shop_readiness"));
    assert!(tables.contains(&"commerce_shop_business_hour"));
    assert!(tables.contains(&"commerce_shop_service_area"));
    assert!(tables.contains(&"commerce_shop_policy"));
    assert!(tables.contains(&"commerce_shop_deposit_account"));
    assert!(tables.contains(&"commerce_shop_risk_signal"));
    assert!(tables.contains(&"commerce_shop_category_binding"));
    assert!(tables.contains(&"commerce_shop_brand_authorization"));
    assert!(tables.contains(&"commerce_shop_qualification"));
    assert!(tables.contains(&"commerce_shop_customer_service"));
    assert!(tables.contains(&"commerce_shop_return_address"));
    assert!(tables.contains(&"commerce_shop_shipping_template"));
    assert!(tables.contains(&"commerce_account"));
    assert!(tables.contains(&"commerce_account_ledger_entry"));
    assert!(tables.contains(&"commerce_billing_prehold"));
    assert!(tables.contains(&"commerce_billing_history"));
    assert!(tables.contains(&"benefit_definition"));
    assert!(tables.contains(&"entitlement_grant"));
    assert!(tables.contains(&"entitlement_account"));
    assert!(tables.contains(&"entitlement_ledger_entry"));
    assert!(tables.contains(&"membership_plan"));
    assert!(tables.contains(&"membership_plan_version"));
    assert!(tables.contains(&"membership_plan_benefit"));
    assert!(tables.contains(&"membership_package_group"));
    assert!(tables.contains(&"membership_package"));
    assert!(tables.contains(&"membership_subscription"));
    assert!(tables.contains(&"membership_period"));
    assert!(tables.contains(&"promotion_offer"));
    assert!(tables.contains(&"promotion_offer_version"));
    assert!(tables.contains(&"promotion_coupon_stock"));
    assert!(tables.contains(&"promotion_code"));
    assert!(tables.contains(&"promotion_user_coupon"));
    assert!(tables.contains(&"promotion_coupon_ledger_entry"));
    assert!(tables.contains(&"promotion_discount_application"));
    assert!(tables.contains(&"promotion_discount_allocation"));
    assert!(tables.contains(&"commerce_product_category"));
    assert!(tables.contains(&"commerce_product_attribute"));
    assert!(tables.contains(&"commerce_product_attribute_value"));
    assert!(tables.contains(&"commerce_product_spu"));
    assert!(tables.contains(&"commerce_product_sku"));
    assert!(tables.contains(&"commerce_product_sku_attribute"));
    assert!(tables.contains(&"commerce_product_media"));
    assert!(tables.contains(&"commerce_price_list"));
    assert!(tables.contains(&"commerce_price_list_item"));
    assert!(tables.contains(&"commerce_recharge_package"));
    assert!(tables.contains(&"commerce_inventory_stock"));
    assert!(tables.contains(&"commerce_inventory_reservation"));
    assert!(tables.contains(&"commerce_inventory_movement"));
    assert!(tables.contains(&"commerce_cart"));
    assert!(tables.contains(&"commerce_cart_item"));
    assert!(tables.contains(&"commerce_user_address"));
    assert!(tables.contains(&"commerce_checkout_session"));
    assert!(tables.contains(&"commerce_checkout_line"));
    assert!(tables.contains(&"commerce_checkout_quote"));
    assert!(tables.contains(&"commerce_order_address_snapshot"));
    assert!(tables.contains(&"commerce_order"));
    assert!(tables.contains(&"commerce_order_item"));
    assert!(tables.contains(&"commerce_order_amount_breakdown"));
    assert!(tables.contains(&"commerce_order_event"));
    assert!(tables.contains(&"commerce_order_cancellation"));
    assert!(tables.contains(&"commerce_fulfillment_order"));
    assert!(tables.contains(&"commerce_fulfillment_item"));
    assert!(tables.contains(&"commerce_shipment"));
    assert!(tables.contains(&"commerce_shipment_package"));
    assert!(tables.contains(&"commerce_shipment_tracking_event"));
    assert!(tables.contains(&"commerce_digital_delivery"));
    assert!(tables.contains(&"commerce_payment_intent"));
    assert!(tables.contains(&"commerce_payment_attempt"));
    assert!(tables.contains(&"commerce_payment_webhook_event"));
    assert!(tables.contains(&"commerce_payment_method"));
    assert!(tables.contains(&"commerce_payment_provider"));
    assert!(tables.contains(&"commerce_payment_provider_account"));
    assert!(tables.contains(&"commerce_payment_channel"));
    assert!(tables.contains(&"commerce_payment_route_rule"));
    assert!(tables.contains(&"commerce_payment_provider_capability"));
    assert!(tables.contains(&"commerce_payment_operation_attempt"));
    assert!(tables.contains(&"commerce_payment_route_decision"));
    assert!(tables.contains(&"commerce_payment_capture"));
    assert!(tables.contains(&"commerce_payment_webhook_delivery"));
    assert!(tables.contains(&"commerce_payment_statement"));
    assert!(tables.contains(&"commerce_payment_statement_item"));
    assert!(tables.contains(&"commerce_payment_reconciliation_run"));
    assert!(tables.contains(&"commerce_payment_reconciliation_item"));
    assert!(tables.contains(&"commerce_payment_fee"));
    assert!(tables.contains(&"commerce_payment_dispute"));
    assert!(tables.contains(&"commerce_payment_dispute_event"));
    assert!(tables.contains(&"commerce_refund"));
    assert!(tables.contains(&"commerce_refund_item"));
    assert!(tables.contains(&"commerce_refund_attempt"));
    assert!(tables.contains(&"commerce_refund_event"));
    assert!(tables.contains(&"commerce_after_sales_request"));
    assert!(tables.contains(&"commerce_after_sales_item"));
    assert!(tables.contains(&"commerce_after_sales_return_shipment"));
    assert!(tables.contains(&"commerce_after_sales_event"));
    assert!(tables.contains(&"commerce_exchange_rule"));
    assert!(tables.contains(&"commerce_invoice_title"));
    assert!(tables.contains(&"commerce_invoice"));
    assert!(tables.contains(&"commerce_invoice_item"));

    for legacy_table in [
        "commerce_coupon_template",
        "commerce_coupon_issue_batch",
        "commerce_coupon",
        "commerce_coupon_redemption",
        "commerce_membership_plan",
        "commerce_membership_package_group",
        "commerce_membership_package",
        "commerce_membership",
        "commerce_membership_entitlement",
        "commerce_membership_entitlement_usage",
        "commerce_shop_staff",
        "commerce_shop_member",
        "commerce_shop_role",
        "commerce_shop_permission",
        "commerce_shop_department",
        "commerce_shop_position",
    ] {
        assert!(
            !tables.contains(&legacy_table),
            "commerce storage must not expose duplicate IAM/shop staff table: {legacy_table}",
        );
    }

    for table in tables {
        assert!(
            table.starts_with("commerce_")
                || table.starts_with("benefit_")
                || table.starts_with("entitlement_")
                || table.starts_with("membership_")
                || table.starts_with("promotion_")
        );
        assert!(!table.contains("__"));
        assert!(!table.starts_with("plus_"));
    }
}

#[test]
fn first_slice_migrations_are_domain_ordered() {
    assert_eq!(
        commerce_migration_names(),
        vec![
            "0001_core_idempotency.sql",
            "0002_account_ledger.sql",
            "0003_benefit.sql",
            "0004_entitlement.sql",
            "0005_membership.sql",
            "0006_promotion.sql",
            "0007_catalog.sql",
            "0008_inventory.sql",
            "0009_order.sql",
            "0010_payment_refund.sql",
            "0011_exchange.sql",
            "0012_invoice.sql",
            "0013_billing_history.sql",
            "0014_shop.sql",
        ],
    );
}

#[test]
fn initial_migration_declares_first_slice_tables_and_columns() {
    let sql = commerce_initial_migration_sql();
    let customer_service_table = sql
        .split("CREATE TABLE IF NOT EXISTS commerce_shop_customer_service")
        .nth(1)
        .and_then(|tail| {
            tail.split("CREATE TABLE IF NOT EXISTS commerce_shop_return_address")
                .next()
        })
        .expect("customer service table must be declared before return address table");
    let shipping_template_table = sql
        .split("CREATE TABLE IF NOT EXISTS commerce_shop_shipping_template")
        .nth(1)
        .and_then(|tail| {
            tail.split("CREATE TABLE IF NOT EXISTS commerce_account")
                .next()
        })
        .expect("shipping template table must be declared before account table");
    let readiness_table = sql
        .split("CREATE TABLE IF NOT EXISTS commerce_shop_readiness")
        .nth(1)
        .and_then(|tail| {
            tail.split("CREATE TABLE IF NOT EXISTS commerce_shop_business_hour")
                .next()
        })
        .expect("shop readiness table must be declared before business hour table");

    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_idempotency_key"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_shop"));
    assert!(sql.contains("organization_id TEXT NOT NULL"));
    assert!(sql.contains("shop_no TEXT NOT NULL"));
    assert!(sql.contains("shop_name TEXT NOT NULL"));
    assert!(sql.contains("shop_type TEXT NOT NULL"));
    assert!(sql.contains("business_model TEXT NOT NULL"));
    assert!(sql.contains("storefront_status TEXT NOT NULL"));
    assert!(sql.contains("operation_status TEXT NOT NULL"));
    assert!(sql.contains("default_currency_code TEXT NOT NULL"));
    assert!(sql.contains("UNIQUE (tenant_id, shop_no)"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_shop_readiness"));
    assert!(readiness_table.contains("readiness_scope TEXT NOT NULL"));
    assert!(readiness_table.contains("readiness_status TEXT NOT NULL"));
    assert!(readiness_table.contains("blocking_count INTEGER NOT NULL DEFAULT 0"));
    assert!(readiness_table.contains("warning_count INTEGER NOT NULL DEFAULT 0"));
    assert!(readiness_table.contains("checklist_json TEXT NOT NULL DEFAULT '[]'"));
    assert!(readiness_table.contains("evaluated_at TEXT NOT NULL"));
    assert!(readiness_table.contains("version INTEGER NOT NULL DEFAULT 0"));
    assert!(readiness_table.contains("UNIQUE (tenant_id, shop_id, readiness_scope)"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_shop_business_hour"));
    assert!(sql.contains("schedule_type TEXT NOT NULL"));
    assert!(sql.contains("weekly_schedule_json TEXT NOT NULL"));
    assert!(sql.contains("holiday_schedule_json TEXT"));
    assert!(sql.contains("UNIQUE (tenant_id, shop_id, schedule_type)"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_shop_service_area"));
    assert!(sql.contains("area_type TEXT NOT NULL"));
    assert!(sql.contains("region_code TEXT"));
    assert!(sql.contains("area_key TEXT NOT NULL"));
    assert!(sql.contains("delivery_radius_meters INTEGER"));
    assert!(sql.contains("CHECK (delivery_radius_meters IS NULL OR delivery_radius_meters >= 0)"));
    assert!(sql.contains("service_status TEXT NOT NULL"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_shop_policy"));
    assert!(sql.contains("policy_type TEXT NOT NULL"));
    assert!(sql.contains("policy_status TEXT NOT NULL"));
    assert!(sql.contains("policy_version INTEGER NOT NULL"));
    assert!(sql.contains("policy_json TEXT NOT NULL"));
    assert!(sql.contains("UNIQUE (tenant_id, shop_id, policy_type, policy_version)"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_shop_deposit_account"));
    assert!(sql.contains("deposit_status TEXT NOT NULL"));
    assert!(sql.contains("required_amount TEXT NOT NULL DEFAULT '0'"));
    assert!(sql.contains("paid_amount TEXT NOT NULL DEFAULT '0'"));
    assert!(sql.contains("frozen_amount TEXT NOT NULL DEFAULT '0'"));
    assert!(sql.contains("account_ref TEXT"));
    assert!(sql.contains("UNIQUE (tenant_id, shop_id, currency_code)"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_shop_risk_signal"));
    assert!(sql.contains("signal_no TEXT NOT NULL"));
    assert!(sql.contains("signal_type TEXT NOT NULL"));
    assert!(sql.contains("risk_level TEXT NOT NULL"));
    assert!(sql.contains("signal_status TEXT NOT NULL"));
    assert!(sql.contains("risk_score INTEGER NOT NULL DEFAULT 0"));
    assert!(sql.contains("payload_json TEXT NOT NULL"));
    assert!(sql.contains("UNIQUE (tenant_id, signal_no)"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_shop_category_binding"));
    assert!(sql.contains("shop_category_code TEXT NOT NULL"));
    assert!(sql.contains("platform_category_code TEXT"));
    assert!(sql.contains("category_path TEXT"));
    assert!(sql.contains("category_status TEXT NOT NULL"));
    assert!(sql.contains("qualification_required INTEGER NOT NULL DEFAULT 0"));
    assert!(sql.contains("UNIQUE (tenant_id, shop_id, shop_category_code)"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_shop_brand_authorization"));
    assert!(sql.contains("brand_code TEXT NOT NULL"));
    assert!(sql.contains("brand_name TEXT NOT NULL"));
    assert!(sql.contains("authorization_type TEXT NOT NULL"));
    assert!(sql.contains("authorization_status TEXT NOT NULL"));
    assert!(sql.contains("trademark_no_hash TEXT"));
    assert!(sql.contains("UNIQUE (tenant_id, shop_id, brand_code)"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_shop_qualification"));
    assert!(sql.contains("qualification_type TEXT NOT NULL"));
    assert!(sql.contains("qualification_status TEXT NOT NULL"));
    assert!(sql.contains("subject_type TEXT NOT NULL"));
    assert!(sql.contains("subject_id TEXT"));
    assert!(sql.contains("credential_no_hash TEXT"));
    assert!(
        sql.contains("UNIQUE (tenant_id, shop_id, qualification_type, subject_type, subject_id)")
    );
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_shop_customer_service"));
    assert!(sql.contains("service_channel TEXT NOT NULL"));
    assert!(sql.contains("contact_ref TEXT NOT NULL"));
    assert!(customer_service_table.contains("is_default INTEGER NOT NULL DEFAULT 0"));
    assert!(customer_service_table.contains("CHECK (is_default IN (0, 1))"));
    assert!(sql.contains("UNIQUE (tenant_id, shop_id, service_channel, contact_ref)"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_shop_return_address"));
    assert!(sql.contains("address_usage TEXT NOT NULL"));
    assert!(sql.contains("receiver_name TEXT NOT NULL"));
    assert!(sql.contains("phone_hash TEXT"));
    assert!(sql.contains("is_default INTEGER NOT NULL DEFAULT 0"));
    assert!(sql.contains("UNIQUE (tenant_id, shop_id, address_usage, address_key)"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_shop_shipping_template"));
    assert!(shipping_template_table.contains("template_code TEXT NOT NULL"));
    assert!(shipping_template_table.contains("template_name TEXT NOT NULL"));
    assert!(shipping_template_table.contains("pricing_mode TEXT NOT NULL"));
    assert!(shipping_template_table.contains("base_fee_amount TEXT NOT NULL DEFAULT '0'"));
    assert!(shipping_template_table.contains("currency_code TEXT NOT NULL"));
    assert!(shipping_template_table.contains("is_default INTEGER NOT NULL DEFAULT 0"));
    assert!(shipping_template_table.contains("CHECK (is_default IN (0, 1))"));
    assert!(shipping_template_table.contains("UNIQUE (tenant_id, shop_id, template_code)"));
    assert!(!sql.contains("CREATE TABLE IF NOT EXISTS commerce_shop_staff"));
    assert!(!sql.contains("CREATE TABLE IF NOT EXISTS commerce_shop_member"));
    assert!(!sql.contains("CREATE TABLE IF NOT EXISTS commerce_shop_role"));
    assert!(!sql.contains("CREATE TABLE IF NOT EXISTS commerce_shop_permission"));
    assert!(!sql.contains("CREATE TABLE IF NOT EXISTS commerce_shop_department"));
    assert!(!sql.contains("CREATE TABLE IF NOT EXISTS commerce_shop_position"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_account"));
    assert!(sql.contains("tenant_id"));
    assert!(sql.contains("organization_id"));
    assert!(sql.contains("owner_user_id"));
    assert!(sql.contains("asset_type"));
    assert!(sql.contains("available_amount"));
    assert!(sql.contains("frozen_amount"));
    assert!(sql.contains("version"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_account_ledger_entry"));
    assert!(sql.contains("request_no"));
    assert!(sql.contains("idempotency_key"));
    assert!(sql.contains("balance_after"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_billing_prehold"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_billing_history"));
    assert!(sql.contains("history_no"));
    assert!(sql.contains("history_type"));
    assert!(sql.contains("direction"));
    assert!(sql.contains("asset_type"));
    assert!(sql.contains("points_delta"));
    assert!(sql.contains("source_type"));
    assert!(sql.contains("source_id"));
    assert!(sql.contains("related_order_no"));
    assert!(sql.contains("payment_method"));
    assert!(sql.contains("occurred_at"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS benefit_definition"));
    assert!(sql.contains("benefit_code"));
    assert!(sql.contains("value_unit"));
    assert!(sql.contains("measurement_type"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS entitlement_grant"));
    assert!(sql.contains("grant_no"));
    assert!(sql.contains("subject_type"));
    assert!(sql.contains("subject_id"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS entitlement_account"));
    assert!(sql.contains("total_granted"));
    assert!(sql.contains("total_used"));
    assert!(sql.contains("balance"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS entitlement_ledger_entry"));
    assert!(sql.contains("ledger_no"));
    assert!(sql.contains("balance_after"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS membership_plan"));
    assert!(sql.contains("plan_code"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS membership_plan_version"));
    assert!(sql.contains("version_no"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS membership_plan_benefit"));
    assert!(sql.contains("benefit_id"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS membership_package_group"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS membership_package"));
    assert!(sql.contains("billing_cycle"));
    assert!(sql.contains("duration_days"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS membership_subscription"));
    assert!(sql.contains("subscription_no"));
    assert!(sql.contains("current_period_id"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS membership_period"));
    assert!(sql.contains("period_no"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS promotion_offer"));
    assert!(sql.contains("offer_no"));
    assert!(sql.contains("offer_code"));
    assert!(sql.contains("current_offer_version_id TEXT NOT NULL"));
    assert!(!sql.contains("current_version_id TEXT"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS promotion_offer_version"));
    assert!(sql.contains("discount_type"));
    assert!(sql.contains("rule_json"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS promotion_coupon_stock"));
    assert!(sql.contains("stock_no"));
    assert!(sql.contains("name TEXT NOT NULL"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS promotion_code"));
    assert!(sql.contains("promotion_code"));
    assert!(sql.contains("offer_version_id TEXT NOT NULL"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS promotion_user_coupon"));
    assert!(sql.contains("coupon_no"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS promotion_coupon_ledger_entry"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS promotion_discount_application"));
    assert!(sql.contains("application_no"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS promotion_discount_allocation"));
    assert!(sql.contains("UNIQUE (tenant_id, coupon_code)"));
    assert!(sql.contains("UNIQUE (tenant_id, offer_no)"));
    assert!(sql.contains("UNIQUE (tenant_id, stock_no)"));
    assert!(!sql.contains("CREATE TABLE IF NOT EXISTS commerce_coupon_template"));
    assert!(!sql.contains("CREATE TABLE IF NOT EXISTS commerce_coupon_issue_batch"));
    assert!(!sql.contains("CREATE TABLE IF NOT EXISTS commerce_coupon ("));
    assert!(!sql.contains("CREATE TABLE IF NOT EXISTS commerce_coupon_redemption"));
    let product_catalog_sql = sql
        .split("CREATE TABLE IF NOT EXISTS commerce_product_category")
        .nth(1)
        .unwrap()
        .split("CREATE TABLE IF NOT EXISTS commerce_recharge_package")
        .next()
        .unwrap();
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_product_category"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_product_attribute"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_product_attribute_value"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_product_spu"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_product_spu_category"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_product_sku"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_product_sku_attribute"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_product_media"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_price_list"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_price_list_item"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_recharge_package"));
    assert!(!sql.contains("CREATE TABLE IF NOT EXISTS commerce_product ("));
    assert!(!sql.contains("CREATE TABLE IF NOT EXISTS commerce_sku ("));
    assert!(sql.contains("parent_id TEXT"));
    assert!(product_catalog_sql.contains("parent_id TEXT"));
    assert!(product_catalog_sql.contains("path TEXT NOT NULL"));
    assert!(sql.contains("level_no INTEGER NOT NULL"));
    assert!(sql.contains("sort_order INTEGER NOT NULL DEFAULT 0"));
    assert!(sql.contains("scope TEXT NOT NULL"));
    assert!(sql.contains("value_code TEXT NOT NULL"));
    assert!(sql.contains("custom_value TEXT"));
    assert!(sql.contains("spu_no"));
    assert!(sql.contains("product_type"));
    assert!(sql.contains("fulfillment_type"));
    assert!(sql.contains("inventory_tracking"));
    assert!(sql.contains("published_at"));
    assert!(!product_catalog_sql.contains("parent_category_id"));
    assert!(!product_catalog_sql.contains("sort_weight"));
    assert!(!product_catalog_sql.contains("delivery_mode"));
    assert!(!product_catalog_sql.contains("sales_status"));
    assert!(!sql.contains("CREATE TABLE IF NOT EXISTS commerce_product_sku_attribute_value"));
    assert!(sql.contains("UNIQUE (tenant_id, spu_no)"));
    assert!(sql.contains("UNIQUE (tenant_id, sku_no)"));
    assert!(sql.contains("UNIQUE (tenant_id, price_list_no)"));
    assert!(sql.contains("UNIQUE (tenant_id, price_list_id, sku_id)"));
    assert!(sql.contains("UNIQUE (tenant_id, organization_id, external_id)"));
    assert!(sql.contains("UNIQUE (tenant_id, package_no)"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_inventory_stock"));
    assert!(sql.contains("available_quantity"));
    assert!(sql.contains("reserved_quantity"));
    assert!(sql.contains("sold_quantity"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_inventory_reservation"));
    assert!(sql.contains("reservation_no"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_inventory_movement"));
    assert!(sql.contains("movement_no"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_cart"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_cart_item"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_user_address"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_checkout_session"));
    assert!(sql.contains("checkout_session_no"));
    assert!(sql.contains("request_hash TEXT NOT NULL"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_checkout_line"));
    assert!(sql.contains("purchase_type TEXT NOT NULL"));
    assert!(sql.contains("fulfillment_type TEXT NOT NULL"));
    assert!(sql.contains("price_amount_snapshot TEXT NOT NULL"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_checkout_quote"));
    assert!(sql.contains("quote_no TEXT NOT NULL"));
    assert!(sql.contains("shipping_amount TEXT NOT NULL DEFAULT '0'"));
    assert!(sql.contains("tax_amount TEXT NOT NULL DEFAULT '0'"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_order_address_snapshot"));
    assert!(sql.contains("address_type TEXT NOT NULL"));
    assert!(sql.contains("phone_hash TEXT"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_order"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_order_item"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_order_amount_breakdown"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_order_event"));
    assert!(sql.contains("event_no TEXT NOT NULL"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_order_cancellation"));
    assert!(sql.contains("cancellation_no TEXT NOT NULL"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_fulfillment_order"));
    assert!(sql.contains("fulfillment_no TEXT NOT NULL"));
    assert!(sql.contains("shop_id TEXT"));
    assert!(sql.contains("warehouse_id TEXT"));
    assert!(sql.contains("delivery_method TEXT"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_fulfillment_item"));
    assert!(sql.contains("fulfilled_quantity INTEGER NOT NULL DEFAULT 0"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_shipment"));
    assert!(sql.contains("shipment_no TEXT NOT NULL"));
    assert!(sql.contains("carrier_code TEXT NOT NULL"));
    assert!(sql.contains("tracking_no TEXT"));
    assert!(sql.contains("label_ref TEXT"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_shipment_package"));
    assert!(sql.contains("package_no TEXT NOT NULL"));
    assert!(sql.contains("weight_gram INTEGER"));
    assert!(sql.contains("length_mm INTEGER"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_shipment_tracking_event"));
    assert!(sql.contains("event_time TEXT NOT NULL"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_digital_delivery"));
    assert!(sql.contains("delivery_no TEXT NOT NULL"));
    assert!(sql.contains("asset_ref TEXT NOT NULL"));
    assert!(sql.contains("access_grant_ref TEXT"));
    assert!(sql.contains("UNIQUE (tenant_id, order_no)"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_payment_intent"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_payment_attempt"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_payment_webhook_event"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_payment_method"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_payment_provider"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_payment_provider_account"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_payment_channel"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_payment_route_rule"));
    assert!(sql.contains("UNIQUE (tenant_id, provider_code, out_trade_no)"));
    assert!(sql.contains("UNIQUE (tenant_id, provider_code, event_id)"));
    assert!(sql.contains("UNIQUE (tenant_id, provider_code, nonce)"));
    assert!(sql.contains("UNIQUE (tenant_id, organization_id, method_key)"));
    assert!(sql.contains("UNIQUE (tenant_id, organization_id, provider_code)"));
    assert!(sql.contains("UNIQUE (tenant_id, account_no)"));
    assert!(sql.contains("UNIQUE (tenant_id, channel_no)"));
    assert!(sql.contains("UNIQUE (tenant_id, rule_no)"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_refund"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_exchange_rule"));
    assert!(sql.contains("source_asset_type"));
    assert!(sql.contains("target_asset_type"));
    assert!(sql.contains("rate"));
    let membership_plan = table_definition(sql, "membership_plan");
    assert!(!membership_plan.contains("level_code"));
    assert!(!sql.contains("benefits_json"));
    assert!(!sql.contains("CREATE TABLE IF NOT EXISTS commerce_membership_plan"));
    assert!(!sql.contains("CREATE TABLE IF NOT EXISTS commerce_membership_entitlement"));
    assert!(!sql.contains("CREATE TABLE IF NOT EXISTS commerce_membership_entitlement_usage"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_invoice_title"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_invoice"));
    assert!(sql.contains("CREATE TABLE IF NOT EXISTS commerce_invoice_item"));
    assert!(sql.contains("prehold_no"));
    assert!(sql.contains("expires_at"));
    assert!(sql.contains("settled_at"));
    assert!(sql.contains("released_at"));
}

#[test]
fn order_tables_separate_lifecycle_and_amount_allocation_facts() {
    let sql = commerce_initial_migration_sql();
    let order = table_definition(sql, "commerce_order");
    let item = table_definition(sql, "commerce_order_item");
    let breakdown = table_definition(sql, "commerce_order_amount_breakdown");

    for required_column in [
        "payment_status TEXT NOT NULL",
        "fulfillment_status TEXT NOT NULL",
        "refund_status TEXT NOT NULL",
    ] {
        assert!(
            order.contains(required_column),
            "commerce_order must include {required_column}",
        );
    }

    for required_column in [
        "product_id TEXT",
        "shop_id TEXT",
        "sku_snapshot_json TEXT NOT NULL DEFAULT '{}'",
        "discount_amount TEXT NOT NULL DEFAULT '0'",
        "tax_amount TEXT NOT NULL DEFAULT '0'",
        "fulfillment_status TEXT NOT NULL",
        "refund_status TEXT NOT NULL",
    ] {
        assert!(
            item.contains(required_column),
            "commerce_order_item must include {required_column}",
        );
    }

    assert!(
        breakdown.contains(
            "UNIQUE (tenant_id, order_id, allocation_type, order_item_id, source_type, source_id)",
        ),
        "commerce_order_amount_breakdown must allow multiple allocation rows per order",
    );
    assert!(
        !breakdown.contains("UNIQUE (tenant_id, order_id)"),
        "commerce_order_amount_breakdown must not collapse every allocation into one order row",
    );
}

#[test]
fn payment_intent_and_refund_tables_are_auditable_and_idempotent() {
    let sql = commerce_initial_migration_sql();
    let intent = table_definition(sql, "commerce_payment_intent");
    let refund = table_definition(sql, "commerce_refund");

    for required_column in [
        "payment_intent_no TEXT NOT NULL",
        "request_no TEXT NOT NULL",
        "idempotency_key TEXT NOT NULL",
    ] {
        assert!(
            intent.contains(required_column),
            "commerce_payment_intent must include {required_column}",
        );
    }
    assert!(intent.contains("UNIQUE (tenant_id, payment_intent_no)"));
    assert!(intent.contains("UNIQUE (tenant_id, order_id, idempotency_key)"));

    for required_column in [
        "organization_id TEXT",
        "order_id TEXT NOT NULL",
        "currency_code TEXT NOT NULL",
        "refund_reason_code TEXT",
        "requested_by_type TEXT NOT NULL",
        "requested_by TEXT",
        "request_no TEXT NOT NULL",
        "idempotency_key TEXT NOT NULL",
    ] {
        assert!(
            refund.contains(required_column),
            "commerce_refund must include {required_column}",
        );
    }
    assert!(refund.contains("UNIQUE (tenant_id, order_id, idempotency_key)"));
}

#[test]
fn after_sales_tables_support_request_items_return_logistics_and_events() {
    let sql = commerce_initial_migration_sql();
    let request = table_definition(sql, "commerce_after_sales_request");
    let item = table_definition(sql, "commerce_after_sales_item");
    let return_shipment = table_definition(sql, "commerce_after_sales_return_shipment");
    let event = table_definition(sql, "commerce_after_sales_event");

    for required_column in [
        "after_sales_no TEXT NOT NULL",
        "order_id TEXT NOT NULL",
        "refund_id TEXT",
        "replacement_order_id TEXT",
        "after_sales_type TEXT NOT NULL",
        "status TEXT NOT NULL",
        "refund_status TEXT NOT NULL DEFAULT 'none'",
        "return_status TEXT NOT NULL DEFAULT 'none'",
        "exchange_status TEXT NOT NULL DEFAULT 'none'",
        "reason_code TEXT",
        "description TEXT",
        "evidence_snapshot_json TEXT NOT NULL DEFAULT '[]'",
        "requested_amount TEXT NOT NULL DEFAULT '0'",
        "approved_amount TEXT NOT NULL DEFAULT '0'",
        "currency_code TEXT NOT NULL",
        "requested_by_type TEXT NOT NULL",
        "requested_by TEXT",
        "request_no TEXT NOT NULL",
        "idempotency_key TEXT NOT NULL",
    ] {
        assert!(
            request.contains(required_column),
            "commerce_after_sales_request must include {required_column}",
        );
    }
    assert!(request.contains("UNIQUE (tenant_id, after_sales_no)"));
    assert!(request.contains("UNIQUE (tenant_id, order_id, idempotency_key)"));

    for required_column in [
        "after_sales_id TEXT NOT NULL",
        "order_item_id TEXT NOT NULL",
        "sku_id TEXT",
        "sku_snapshot_json TEXT NOT NULL DEFAULT '{}'",
        "requested_quantity INTEGER NOT NULL DEFAULT 0",
        "approved_quantity INTEGER NOT NULL DEFAULT 0",
        "received_quantity INTEGER NOT NULL DEFAULT 0",
        "refunded_quantity INTEGER NOT NULL DEFAULT 0",
        "replacement_sku_id TEXT",
        "item_status TEXT NOT NULL",
    ] {
        assert!(
            item.contains(required_column),
            "commerce_after_sales_item must include {required_column}",
        );
    }
    assert!(item.contains("UNIQUE (tenant_id, after_sales_id, order_item_id)"));

    for required_column in [
        "after_sales_id TEXT NOT NULL",
        "return_shipment_no TEXT NOT NULL",
        "shipment_direction TEXT NOT NULL DEFAULT 'buyer_to_merchant'",
        "carrier_code TEXT",
        "tracking_no TEXT",
        "package_snapshot_json TEXT NOT NULL DEFAULT '[]'",
        "ship_from_address_snapshot_json TEXT NOT NULL DEFAULT '{}'",
        "ship_to_address_snapshot_json TEXT NOT NULL DEFAULT '{}'",
        "status TEXT NOT NULL",
        "shipped_at TEXT",
        "received_at TEXT",
        "request_no TEXT NOT NULL",
        "idempotency_key TEXT NOT NULL",
    ] {
        assert!(
            return_shipment.contains(required_column),
            "commerce_after_sales_return_shipment must include {required_column}",
        );
    }
    assert!(return_shipment.contains("UNIQUE (tenant_id, return_shipment_no)"));
    assert!(return_shipment.contains("UNIQUE (tenant_id, after_sales_id, idempotency_key)"));

    for required_column in [
        "after_sales_id TEXT NOT NULL",
        "event_no TEXT NOT NULL",
        "event_type TEXT NOT NULL",
        "from_status TEXT",
        "to_status TEXT NOT NULL",
        "actor_type TEXT NOT NULL",
        "actor_id TEXT",
        "payload_json TEXT NOT NULL DEFAULT '{}'",
        "request_id TEXT",
        "idempotency_key TEXT NOT NULL",
    ] {
        assert!(
            event.contains(required_column),
            "commerce_after_sales_event must include {required_column}",
        );
    }
    assert!(event.contains("UNIQUE (tenant_id, event_no)"));
}

#[test]
fn cart_tables_support_owner_scope_and_line_snapshots() {
    let sql = commerce_initial_migration_sql();
    let cart = table_definition(sql, "commerce_cart");
    let item = table_definition(sql, "commerce_cart_item");

    for required_column in [
        "cart_no TEXT NOT NULL",
        "owner_user_id TEXT",
        "owner_type TEXT NOT NULL DEFAULT 'user'",
        "owner_id TEXT NOT NULL",
        "channel_code TEXT",
        "currency_code TEXT",
        "expires_at TEXT",
    ] {
        assert!(
            cart.contains(required_column),
            "commerce_cart must include {required_column}",
        );
    }
    assert!(cart.contains("UNIQUE (tenant_id, cart_no)"));
    assert!(cart.contains("UNIQUE (tenant_id, owner_type, owner_id, status)"));
    assert!(
        !cart.contains("UNIQUE (tenant_id, owner_user_id, status)"),
        "commerce_cart must not collapse every owner scope into owner_user_id",
    );

    for required_column in [
        "product_id TEXT",
        "shop_id TEXT",
        "sku_snapshot_json TEXT NOT NULL DEFAULT '{}'",
        "selected_options_hash TEXT NOT NULL DEFAULT ''",
        "selected_options_json TEXT NOT NULL DEFAULT '{}'",
        "price_amount_snapshot TEXT",
        "currency_code TEXT",
        "added_source TEXT",
    ] {
        assert!(
            item.contains(required_column),
            "commerce_cart_item must include {required_column}",
        );
    }
    assert!(item.contains("UNIQUE (tenant_id, cart_id, sku_id, selected_options_hash)"));
    assert!(
        !item.contains("UNIQUE (tenant_id, cart_id, sku_id)"),
        "commerce_cart_item must allow the same sku with different option selections",
    );
}

#[test]
fn checkout_tables_preserve_submission_snapshots_and_reservations() {
    let sql = commerce_initial_migration_sql();
    let session = table_definition(sql, "commerce_checkout_session");
    let line = table_definition(sql, "commerce_checkout_line");
    let quote = table_definition(sql, "commerce_checkout_quote");

    for required_column in [
        "cart_id TEXT",
        "channel_code TEXT",
        "shipping_address_snapshot_json TEXT",
        "billing_address_snapshot_json TEXT",
        "promotion_snapshot_json TEXT NOT NULL DEFAULT '[]'",
        "inventory_reservation_id TEXT",
    ] {
        assert!(
            session.contains(required_column),
            "commerce_checkout_session must include {required_column}",
        );
    }
    assert!(session.contains("UNIQUE (tenant_id, owner_user_id, idempotency_key)"));

    for required_column in [
        "product_id TEXT",
        "sku_snapshot_json TEXT NOT NULL DEFAULT '{}'",
        "selected_options_hash TEXT NOT NULL DEFAULT ''",
        "selected_options_json TEXT NOT NULL DEFAULT '{}'",
        "promotion_snapshot_json TEXT NOT NULL DEFAULT '[]'",
        "inventory_reservation_id TEXT",
    ] {
        assert!(
            line.contains(required_column),
            "commerce_checkout_line must include {required_column}",
        );
    }
    assert!(line.contains("UNIQUE (tenant_id, checkout_session_id, sku_id, selected_options_hash)"));
    assert!(
        !line.contains("UNIQUE (tenant_id, checkout_session_id, sku_id)"),
        "commerce_checkout_line must allow the same sku with different option selections",
    );

    for required_column in [
        "shipping_quote_snapshot_json TEXT NOT NULL DEFAULT '{}'",
        "tax_quote_snapshot_json TEXT NOT NULL DEFAULT '{}'",
        "promotion_snapshot_json TEXT NOT NULL DEFAULT '[]'",
        "inventory_reservation_snapshot_json TEXT NOT NULL DEFAULT '{}'",
    ] {
        assert!(
            quote.contains(required_column),
            "commerce_checkout_quote must include {required_column}",
        );
    }
}

#[test]
fn inventory_tables_support_checkout_reservation_and_movement_ledger_facts() {
    let sql = commerce_initial_migration_sql();
    let stock = table_definition(sql, "commerce_inventory_stock");
    let reservation = table_definition(sql, "commerce_inventory_reservation");
    let movement = table_definition(sql, "commerce_inventory_movement");

    for required_column in [
        "shop_id TEXT",
        "fulfillment_node_id TEXT NOT NULL DEFAULT ''",
        "on_hand_quantity INTEGER NOT NULL DEFAULT 0",
        "locked_quantity INTEGER NOT NULL DEFAULT 0",
        "safety_stock_quantity INTEGER NOT NULL DEFAULT 0",
    ] {
        assert!(
            stock.contains(required_column),
            "commerce_inventory_stock must include {required_column}",
        );
    }
    assert!(stock.contains("UNIQUE (tenant_id, sku_id, warehouse_id, fulfillment_node_id)"));

    for required_column in [
        "order_id TEXT",
        "checkout_session_id TEXT",
        "order_item_id TEXT",
        "reservation_source_type TEXT NOT NULL DEFAULT 'order'",
        "reservation_source_id TEXT NOT NULL",
        "reservation_type TEXT NOT NULL DEFAULT 'stock'",
        "reserved_quantity INTEGER NOT NULL",
        "consumed_quantity INTEGER NOT NULL DEFAULT 0",
        "released_quantity INTEGER NOT NULL DEFAULT 0",
        "release_reason_code TEXT",
    ] {
        assert!(
            reservation.contains(required_column),
            "commerce_inventory_reservation must include {required_column}",
        );
    }
    assert!(
        !reservation.contains("order_id TEXT NOT NULL"),
        "commerce_inventory_reservation must support checkout reservations before order creation",
    );
    assert!(reservation.contains(
        "UNIQUE (tenant_id, reservation_source_type, reservation_source_id, sku_id, warehouse_id, idempotency_key)",
    ));

    for required_column in [
        "source_type TEXT NOT NULL",
        "direction TEXT NOT NULL",
        "quantity_before INTEGER",
        "quantity_after INTEGER",
        "occurred_at TEXT NOT NULL",
    ] {
        assert!(
            movement.contains(required_column),
            "commerce_inventory_movement must include {required_column}",
        );
    }
    assert!(movement
        .contains("UNIQUE (tenant_id, source_type, source_id, movement_type, idempotency_key)"));
}

#[test]
fn fulfillment_tables_support_split_execution_quantities() {
    let sql = commerce_initial_migration_sql();
    let fulfillment = table_definition(sql, "commerce_fulfillment_order");
    let item = table_definition(sql, "commerce_fulfillment_item");

    for required_column in [
        "fulfillment_source_type TEXT NOT NULL DEFAULT 'order'",
        "fulfillment_source_id TEXT",
        "service_level_code TEXT",
        "ship_from_address_snapshot_json TEXT NOT NULL DEFAULT '{}'",
        "ship_to_address_snapshot_json TEXT NOT NULL DEFAULT '{}'",
    ] {
        assert!(
            fulfillment.contains(required_column),
            "commerce_fulfillment_order must include {required_column}",
        );
    }
    assert!(fulfillment.contains("UNIQUE (tenant_id, order_id, idempotency_key)"));

    for required_column in [
        "requested_quantity INTEGER NOT NULL",
        "reserved_quantity INTEGER NOT NULL DEFAULT 0",
        "picked_quantity INTEGER NOT NULL DEFAULT 0",
        "packed_quantity INTEGER NOT NULL DEFAULT 0",
        "shipped_quantity INTEGER NOT NULL DEFAULT 0",
        "delivered_quantity INTEGER NOT NULL DEFAULT 0",
        "cancelled_quantity INTEGER NOT NULL DEFAULT 0",
    ] {
        assert!(
            item.contains(required_column),
            "commerce_fulfillment_item must include {required_column}",
        );
    }
}

#[test]
fn shipment_tables_capture_package_tracking_and_delivery_audit() {
    let sql = commerce_initial_migration_sql();
    let shipment = table_definition(sql, "commerce_shipment");
    let package = table_definition(sql, "commerce_shipment_package");
    let event = table_definition(sql, "commerce_shipment_tracking_event");
    let delivery = table_definition(sql, "commerce_digital_delivery");

    for required_column in [
        "shipping_method TEXT",
        "carrier_account_ref TEXT",
        "tracking_url TEXT",
        "ship_from_address_snapshot_json TEXT NOT NULL DEFAULT '{}'",
        "ship_to_address_snapshot_json TEXT NOT NULL DEFAULT '{}'",
        "request_no TEXT NOT NULL DEFAULT ''",
        "idempotency_key TEXT NOT NULL DEFAULT ''",
    ] {
        assert!(
            shipment.contains(required_column),
            "commerce_shipment must include {required_column}",
        );
    }
    assert!(shipment.contains("UNIQUE (tenant_id, fulfillment_id, idempotency_key)"));

    for required_column in [
        "tracking_no TEXT",
        "item_snapshot_json TEXT NOT NULL DEFAULT '[]'",
        "label_payload_hash TEXT",
    ] {
        assert!(
            package.contains(required_column),
            "commerce_shipment_package must include {required_column}",
        );
    }

    for required_column in [
        "tracking_event_no TEXT NOT NULL",
        "event_id TEXT",
        "ingested_at TEXT NOT NULL",
        "payload_hash TEXT",
        "payload_json TEXT NOT NULL DEFAULT '{}'",
    ] {
        assert!(
            event.contains(required_column),
            "commerce_shipment_tracking_event must include {required_column}",
        );
    }
    assert!(event.contains("UNIQUE (tenant_id, carrier_code, tracking_event_no)"));

    for required_column in [
        "delivery_type TEXT NOT NULL DEFAULT 'digital_asset'",
        "recipient_user_id TEXT",
        "license_key_hash TEXT",
        "payload_json TEXT NOT NULL DEFAULT '{}'",
        "request_no TEXT NOT NULL DEFAULT ''",
        "idempotency_key TEXT NOT NULL DEFAULT ''",
    ] {
        assert!(
            delivery.contains(required_column),
            "commerce_digital_delivery must include {required_column}",
        );
    }
    assert!(delivery.contains("UNIQUE (tenant_id, fulfillment_id, idempotency_key)"));
}

#[test]
fn cart_checkout_and_inventory_indexes_follow_hardened_scope_keys() {
    let sql = commerce_initial_migration_sql();

    assert!(sql.contains("ON commerce_cart (tenant_id, owner_type, owner_id, status)"));
    assert!(
        !sql.contains("ON commerce_cart (tenant_id, owner_user_id, status)"),
        "commerce_cart owner index must match the owner_type/owner_id scope",
    );
    assert!(
        sql.contains("ON commerce_cart_item (tenant_id, cart_id, sku_id, selected_options_hash)",)
    );
    assert!(sql.contains(
        "ON commerce_checkout_line (tenant_id, checkout_session_id, sku_id, selected_options_hash)",
    ));
    assert!(
        sql.contains("CREATE INDEX IF NOT EXISTS idx_commerce_inventory_reservation_source_status")
    );
    assert!(sql.contains(
        "ON commerce_inventory_reservation (tenant_id, reservation_source_type, reservation_source_id, status)",
    ));
}

#[test]
fn shop_service_area_key_normalizes_nullable_location_scope_for_unique_storage() {
    assert_eq!(
        commerce_shop_service_area_key("CN", Some(" GD "), Some("SZ"), None, None).unwrap(),
        "CN|gd|sz|*|*",
    );
    assert_eq!(
        commerce_shop_service_area_key("us", None, None, Some(" 94* "), Some(5000)).unwrap(),
        "US|*|*|94*|5000",
    );
    assert_eq!(
        commerce_shop_service_area_key(" jp ", Some(" "), Some("Tokyo"), Some(" "), None).unwrap(),
        "JP|*|tokyo|*|*",
    );
}

#[test]
fn shop_service_area_key_rejects_negative_delivery_radius() {
    let error: CommerceShopServiceAreaKeyError =
        commerce_shop_service_area_key("CN", Some("GD"), Some("SZ"), None, Some(-1)).unwrap_err();

    assert_eq!(error.code, "commerce-shop-service-area-radius-invalid");
    assert!(error
        .message
        .contains("delivery_radius_meters must be zero or positive"),);
}

#[test]
fn initial_migration_declares_standard_query_indexes() {
    let sql = commerce_initial_migration_sql();
    let indexes = commerce_database_indexes();

    let required_indexes = [
        "idx_commerce_idempotency_key_tenant_key",
        "idx_commerce_shop_organization",
        "idx_commerce_shop_status",
        "idx_commerce_shop_readiness_status",
        "idx_commerce_shop_business_hour_shop",
        "uk_commerce_shop_service_area_scope",
        "idx_commerce_shop_service_area_region",
        "idx_commerce_shop_policy_type_status",
        "idx_commerce_shop_deposit_account_status",
        "idx_commerce_shop_risk_signal_status",
        "idx_commerce_shop_category_binding_status",
        "idx_commerce_shop_brand_authorization_status",
        "idx_commerce_shop_qualification_status",
        "idx_commerce_shop_customer_service_status",
        "uk_commerce_shop_customer_service_single_default",
        "idx_commerce_shop_return_address_default",
        "uk_commerce_shop_return_address_single_default",
        "idx_commerce_shop_shipping_template_status",
        "uk_commerce_shop_shipping_template_single_default",
        "idx_commerce_account_owner_asset",
        "idx_commerce_account_ledger_account_created_at",
        "idx_commerce_account_ledger_request_no",
        "idx_commerce_account_ledger_idempotency_key",
        "idx_commerce_billing_prehold_request_no",
        "idx_commerce_billing_prehold_status_expires_at",
        "idx_commerce_billing_history_owner_occurred_at",
        "idx_commerce_billing_history_owner_type_occurred_at",
        "idx_commerce_billing_history_source",
        "idx_benefit_definition_code_status",
        "idx_entitlement_grant_subject_status",
        "idx_entitlement_grant_source",
        "idx_entitlement_account_subject_status",
        "idx_entitlement_ledger_entry_account_occurred_at",
        "idx_commerce_product_category_parent_status",
        "idx_commerce_product_attribute_status",
        "idx_commerce_product_spu_category_status",
        "idx_commerce_product_spu_category_category",
        "idx_commerce_product_spu_category_spu",
        "idx_commerce_product_spu_type_status",
        "idx_commerce_product_sku_spu_status",
        "idx_commerce_product_sku_price_status",
        "idx_commerce_product_media_owner",
        "idx_commerce_price_list_market_status",
        "idx_commerce_price_list_item_sku",
        "idx_commerce_recharge_package_amount_status",
        "idx_commerce_inventory_stock_sku_warehouse",
        "idx_commerce_inventory_reservation_order_status",
        "idx_commerce_inventory_reservation_source_status",
        "idx_commerce_inventory_reservation_expires_at",
        "idx_commerce_inventory_movement_source",
        "idx_commerce_cart_owner_status",
        "idx_commerce_cart_item_cart_sku",
        "idx_commerce_user_address_owner_default",
        "idx_commerce_checkout_session_owner_status",
        "idx_commerce_checkout_line_session_sku",
        "idx_commerce_checkout_quote_session_status",
        "idx_commerce_order_owner_status_created_at",
        "idx_commerce_order_no",
        "idx_commerce_order_address_snapshot_order_type",
        "idx_commerce_order_event_order_created",
        "idx_commerce_order_cancellation_order_status",
        "idx_commerce_fulfillment_order_order_status",
        "idx_commerce_fulfillment_item_fulfillment_status",
        "idx_commerce_shipment_fulfillment_status",
        "idx_commerce_shipment_tracking_no",
        "idx_commerce_shipment_package_shipment",
        "idx_commerce_shipment_tracking_event_shipment_time",
        "idx_commerce_digital_delivery_fulfillment_status",
        "idx_commerce_payment_intent_order",
        "idx_commerce_payment_attempt_provider_code_trade_no",
        "idx_commerce_payment_webhook_event_provider_code_event",
        "idx_commerce_payment_webhook_event_provider_code_nonce",
        "idx_commerce_payment_webhook_event_status_processed_at",
        "idx_commerce_payment_method_status",
        "idx_commerce_payment_provider_status",
        "idx_commerce_payment_provider_account_provider",
        "idx_commerce_payment_channel_route",
        "idx_commerce_payment_route_rule_match",
        "idx_commerce_payment_provider_capability_lookup",
        "idx_commerce_payment_operation_attempt_resource",
        "idx_commerce_payment_operation_attempt_native_request",
        "idx_commerce_payment_route_decision_intent",
        "idx_commerce_payment_capture_attempt_status",
        "idx_commerce_payment_webhook_delivery_status",
        "idx_commerce_payment_statement_period",
        "idx_commerce_payment_statement_item_trade",
        "idx_commerce_payment_statement_item_out_trade",
        "idx_commerce_payment_reconciliation_run_status",
        "idx_commerce_payment_reconciliation_run_period",
        "idx_commerce_payment_reconciliation_item_run_status",
        "idx_commerce_payment_reconciliation_item_resolution",
        "idx_commerce_payment_reconciliation_item_payment",
        "idx_commerce_payment_fee_payment",
        "idx_commerce_payment_fee_refund",
        "idx_commerce_payment_dispute_payment_status",
        "idx_commerce_payment_dispute_event_created",
        "idx_commerce_refund_payment",
        "idx_commerce_refund_item_refund",
        "idx_commerce_refund_attempt_status",
        "idx_commerce_refund_event_created",
        "idx_commerce_after_sales_request_order_status",
        "idx_commerce_after_sales_item_request_status",
        "idx_commerce_after_sales_return_shipment_request_status",
        "idx_commerce_after_sales_event_request_created",
        "idx_commerce_exchange_rule_pair_status",
        "idx_membership_plan_status",
        "idx_membership_plan_code",
        "idx_membership_plan_version_plan_status",
        "idx_membership_plan_benefit_plan_version",
        "idx_membership_package_group_status",
        "idx_membership_package_status",
        "idx_membership_package_group_plan",
        "idx_membership_subscription_subject_status",
        "idx_membership_period_subscription_range",
        "idx_promotion_offer_status",
        "idx_promotion_offer_code",
        "idx_promotion_offer_current_version",
        "idx_promotion_offer_version_offer_status",
        "idx_promotion_coupon_stock_offer_status",
        "idx_promotion_code_code",
        "idx_promotion_code_stock_status",
        "idx_promotion_user_coupon_subject_status",
        "idx_promotion_discount_application_order",
        "idx_promotion_discount_allocation_application_item",
        "idx_commerce_invoice_order_payment",
        "idx_commerce_invoice_owner_status",
    ];

    for index_name in required_indexes {
        assert!(indexes.contains(&index_name));
        let index_marker = format!("CREATE INDEX IF NOT EXISTS {index_name}");
        let unique_index_marker = format!("CREATE UNIQUE INDEX IF NOT EXISTS {index_name}");
        assert!(
            sql.contains(&index_marker) || sql.contains(&unique_index_marker),
            "missing standard commerce migration index: {index_name}",
        );
    }
    assert!(sql.contains(
        "CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_shop_customer_service_single_default",
    ));
    assert!(
        sql.contains("ON commerce_shop_customer_service (tenant_id, shop_id, service_channel)",)
    );
    assert!(sql.contains("WHERE is_default = 1"));
    assert!(sql.contains(
        "CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_shop_return_address_single_default",
    ));
    assert!(sql.contains("ON commerce_shop_return_address (tenant_id, shop_id, address_usage)",));
    assert!(sql.contains("WHERE is_default = 1"));
    assert!(sql.contains(
        "CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_shop_shipping_template_single_default",
    ));
    assert!(
        sql.contains("ON commerce_shop_shipping_template (tenant_id, shop_id, delivery_method)",)
    );
    assert!(sql.contains("WHERE is_default = 1"));
}

#[test]
fn payment_extension_indexes_use_table_scoped_names() {
    let sql = commerce_initial_migration_sql();

    for legacy_prefix in [
        "CREATE INDEX IF NOT EXISTS idx_pay_",
        "CREATE UNIQUE INDEX IF NOT EXISTS uk_pay_",
        "CREATE INDEX IF NOT EXISTS idx_refund_",
        "CREATE UNIQUE INDEX IF NOT EXISTS uk_refund_",
    ] {
        assert!(
            !sql.contains(legacy_prefix),
            "payment center indexes must use full table-scoped commerce names, not {legacy_prefix}",
        );
    }

    for unique_index in [
        "uk_commerce_payment_provider_capability_scope",
        "uk_commerce_payment_operation_attempt_no",
        "uk_commerce_payment_operation_attempt_idempotency",
        "uk_commerce_payment_route_decision_attempt",
        "uk_commerce_payment_capture_no",
        "uk_commerce_payment_capture_native",
        "uk_commerce_payment_webhook_delivery_event",
        "uk_commerce_payment_webhook_delivery_nonce",
        "uk_commerce_payment_statement_no",
        "uk_commerce_payment_statement_scope",
        "uk_commerce_payment_statement_item_row",
        "uk_commerce_payment_reconciliation_run_no",
        "uk_commerce_payment_reconciliation_run_idempotency",
        "uk_commerce_payment_dispute_no",
        "uk_commerce_payment_dispute_native",
        "uk_commerce_payment_dispute_event_no",
        "uk_commerce_refund_attempt_out_no",
        "uk_commerce_refund_event_no",
    ] {
        assert!(
            sql.contains(&format!("CREATE UNIQUE INDEX IF NOT EXISTS {unique_index}")),
            "missing standard unique payment center index: {unique_index}",
        );
    }
}

#[test]
fn repository_bindings_cover_first_slice_storage_boundaries() {
    let bindings = commerce_repository_bindings();

    assert_eq!(
        bindings
            .iter()
            .map(|binding| binding.repository_name)
            .collect::<Vec<_>>(),
        vec![
            "idempotency.repository",
            "shop.repository",
            "account.repository",
            "benefit.repository",
            "entitlement.repository",
            "membership.repository",
            "promotion.repository",
            "catalog.repository",
            "inventory.repository",
            "cart.repository",
            "buyer_address.repository",
            "order.repository",
            "payment.repository",
            "after_sales.repository",
            "exchange.repository",
            "invoice.repository",
            "billing.repository",
        ],
    );

    let idempotency = bindings
        .iter()
        .find(|binding| binding.repository_name == "idempotency.repository")
        .unwrap();
    assert_eq!(idempotency.domain, "core");
    assert_eq!(idempotency.tables, vec!["commerce_idempotency_key"]);
    assert!(idempotency.requires_transaction);

    let shop = bindings
        .iter()
        .find(|binding| binding.repository_name == "shop.repository")
        .unwrap();
    assert_eq!(shop.domain, "shop");
    assert_eq!(
        shop.tables,
        vec![
            "commerce_shop",
            "commerce_shop_application",
            "commerce_shop_verification",
            "commerce_shop_status_event",
            "commerce_shop_channel",
            "commerce_shop_fulfillment_profile",
            "commerce_shop_settlement_profile",
            "commerce_shop_metric_snapshot",
            "commerce_shop_readiness",
            "commerce_shop_business_hour",
            "commerce_shop_service_area",
            "commerce_shop_policy",
            "commerce_shop_deposit_account",
            "commerce_shop_risk_signal",
            "commerce_shop_category_binding",
            "commerce_shop_brand_authorization",
            "commerce_shop_qualification",
            "commerce_shop_customer_service",
            "commerce_shop_return_address",
            "commerce_shop_shipping_template",
        ]
    );
    assert!(shop.requires_transaction);

    let benefit = bindings
        .iter()
        .find(|binding| binding.repository_name == "benefit.repository")
        .unwrap();
    assert_eq!(benefit.domain, "benefit");
    assert_eq!(benefit.tables, vec!["benefit_definition"]);
    assert!(benefit.requires_transaction);

    let entitlement = bindings
        .iter()
        .find(|binding| binding.repository_name == "entitlement.repository")
        .unwrap();
    assert_eq!(entitlement.domain, "entitlement");
    assert_eq!(
        entitlement.tables,
        vec![
            "entitlement_grant",
            "entitlement_account",
            "entitlement_ledger_entry",
        ],
    );
    assert!(entitlement.requires_transaction);

    let membership = bindings
        .iter()
        .find(|binding| binding.repository_name == "membership.repository")
        .unwrap();
    assert_eq!(membership.domain, "membership");
    assert_eq!(
        membership.tables,
        vec![
            "membership_plan",
            "membership_plan_version",
            "membership_plan_benefit",
            "membership_package_group",
            "membership_package",
            "membership_subscription",
            "membership_period",
        ],
    );
    assert!(membership.requires_transaction);

    let promotion = bindings
        .iter()
        .find(|binding| binding.repository_name == "promotion.repository")
        .unwrap();
    assert_eq!(promotion.domain, "promotion");
    assert_eq!(
        promotion.tables,
        vec![
            "promotion_offer",
            "promotion_offer_version",
            "promotion_coupon_stock",
            "promotion_code",
            "promotion_user_coupon",
            "promotion_coupon_ledger_entry",
            "promotion_discount_application",
            "promotion_discount_allocation",
        ],
    );
    assert!(promotion.requires_transaction);

    let catalog = bindings
        .iter()
        .find(|binding| binding.repository_name == "catalog.repository")
        .unwrap();
    assert_eq!(catalog.domain, "catalog");
    assert_eq!(
        catalog.tables,
        vec![
            "commerce_product_category",
            "commerce_product_attribute",
            "commerce_product_attribute_value",
            "commerce_product_spu",
            "commerce_product_spu_category",
            "commerce_product_sku",
            "commerce_product_sku_attribute",
            "commerce_product_media",
            "commerce_price_list",
            "commerce_price_list_item",
            "commerce_recharge_package",
        ],
    );
    assert!(catalog.requires_transaction);

    let cart = bindings
        .iter()
        .find(|binding| binding.repository_name == "cart.repository")
        .unwrap();
    assert_eq!(cart.domain, "cart");
    assert_eq!(cart.tables, vec!["commerce_cart", "commerce_cart_item"]);
    assert!(cart.requires_transaction);

    let buyer_address = bindings
        .iter()
        .find(|binding| binding.repository_name == "buyer_address.repository")
        .unwrap();
    assert_eq!(buyer_address.domain, "buyer_address");
    assert_eq!(buyer_address.tables, vec!["commerce_user_address"]);
    assert!(buyer_address.requires_transaction);

    let inventory = bindings
        .iter()
        .find(|binding| binding.repository_name == "inventory.repository")
        .unwrap();
    assert_eq!(inventory.domain, "inventory");
    assert_eq!(
        inventory.tables,
        vec![
            "commerce_inventory_stock",
            "commerce_inventory_reservation",
            "commerce_inventory_movement",
        ],
    );
    assert!(inventory.requires_transaction);

    let payment = bindings
        .iter()
        .find(|binding| binding.repository_name == "payment.repository")
        .unwrap();
    assert_eq!(
        payment.tables,
        vec![
            "commerce_payment_intent",
            "commerce_payment_attempt",
            "commerce_payment_webhook_event",
            "commerce_payment_method",
            "commerce_payment_provider",
            "commerce_payment_provider_account",
            "commerce_payment_channel",
            "commerce_payment_route_rule",
            "commerce_payment_provider_capability",
            "commerce_payment_operation_attempt",
            "commerce_payment_route_decision",
            "commerce_payment_capture",
            "commerce_payment_webhook_delivery",
            "commerce_payment_statement",
            "commerce_payment_statement_item",
            "commerce_payment_reconciliation_run",
            "commerce_payment_reconciliation_item",
            "commerce_payment_fee",
            "commerce_payment_dispute",
            "commerce_payment_dispute_event",
            "commerce_refund",
            "commerce_refund_item",
            "commerce_refund_attempt",
            "commerce_refund_event",
        ],
    );
    assert!(payment.requires_transaction);

    let after_sales = bindings
        .iter()
        .find(|binding| binding.repository_name == "after_sales.repository")
        .unwrap();
    assert_eq!(after_sales.domain, "after_sales");
    assert_eq!(
        after_sales.tables,
        vec![
            "commerce_after_sales_request",
            "commerce_after_sales_item",
            "commerce_after_sales_return_shipment",
            "commerce_after_sales_event",
        ],
    );
    assert!(after_sales.requires_transaction);

    let exchange = bindings
        .iter()
        .find(|binding| binding.repository_name == "exchange.repository")
        .unwrap();
    assert_eq!(exchange.domain, "exchange");
    assert_eq!(exchange.tables, vec!["commerce_exchange_rule"]);
    assert!(exchange.requires_transaction);

    let billing = bindings
        .iter()
        .find(|binding| binding.repository_name == "billing.repository")
        .unwrap();
    assert_eq!(billing.domain, "billing");
    assert_eq!(billing.tables, vec!["commerce_billing_history"]);
    assert!(billing.requires_transaction);
}

#[test]
fn idempotency_repository_sql_contract_matches_runtime_store_port() {
    let contract = commerce_idempotency_repository_sql_contract();

    assert_eq!(contract.repository_name, "idempotency.repository");
    assert_eq!(contract.table, "commerce_idempotency_key");
    assert_eq!(
        contract.columns,
        vec![
            "id",
            "tenant_id",
            "organization_id",
            "scope",
            "idempotency_key",
            "request_hash",
            "response_json",
            "status",
            "locked_until",
            "expires_at",
            "created_at",
            "updated_at",
        ],
    );
    assert_eq!(
        contract.unique_key,
        vec!["tenant_id", "scope", "idempotency_key"],
    );
    assert!(contract.requires_transaction);

    assert_eq!(contract.find_by_key.operation, "find");
    assert_eq!(
        contract.find_by_key.sql,
        "SELECT id, tenant_id, organization_id, scope, idempotency_key, request_hash, response_json, status, locked_until, expires_at, created_at, updated_at FROM commerce_idempotency_key WHERE tenant_id = ? AND scope = ? AND idempotency_key = ? LIMIT 1",
    );
    assert_eq!(
        contract.find_by_key.bindings,
        vec!["tenant_id", "scope", "idempotency_key"],
    );

    assert_eq!(contract.lock_new.operation, "lock");
    assert!(contract
        .lock_new
        .sql
        .starts_with("INSERT INTO commerce_idempotency_key"));
    assert!(contract.lock_new.sql.contains("status"));
    assert!(contract.lock_new.sql.contains("locked_until"));
    assert!(contract.lock_new.sql.contains("expires_at"));
    assert_eq!(
        contract.lock_new.bindings,
        vec![
            "id",
            "tenant_id",
            "organization_id",
            "scope",
            "idempotency_key",
            "request_hash",
            "status",
            "locked_until",
            "expires_at",
            "created_at",
            "updated_at",
        ],
    );

    assert_eq!(contract.complete.operation, "complete");
    assert_eq!(
        contract.complete.sql,
        "UPDATE commerce_idempotency_key SET response_json = ?, status = 'completed', updated_at = ? WHERE tenant_id = ? AND scope = ? AND idempotency_key = ?",
    );
    assert_eq!(
        contract.complete.bindings,
        vec![
            "response_json",
            "updated_at",
            "tenant_id",
            "scope",
            "idempotency_key",
        ],
    );

    assert_eq!(contract.fail.operation, "fail");
    assert_eq!(
        contract.fail.sql,
        "UPDATE commerce_idempotency_key SET status = 'failed', updated_at = ? WHERE tenant_id = ? AND scope = ? AND idempotency_key = ?",
    );
    assert_eq!(
        contract.fail.bindings,
        vec!["updated_at", "tenant_id", "scope", "idempotency_key"],
    );
}

#[test]
fn idempotency_repository_contract_standardizes_sql_conflict_classification() {
    let contract = commerce_idempotency_repository_sql_contract();

    assert_eq!(
        contract.conflict_classifier.table,
        "commerce_idempotency_key"
    );
    assert_eq!(
        contract.conflict_classifier.constraint_name,
        "commerce_idempotency_key_tenant_id_scope_idempotency_key_key",
    );
    assert_eq!(
        contract.conflict_classifier.unique_key,
        vec!["tenant_id", "scope", "idempotency_key"],
    );
    assert_eq!(
        contract.conflict_classifier.error_code,
        "idempotency-key-conflict",
    );
    assert_eq!(
        contract.conflict_classifier.message,
        "idempotency key lock conflicts must be resolved by reading the existing record",
    );

    assert!(contract
        .conflict_classifier
        .matches_constraint("commerce_idempotency_key_tenant_id_scope_idempotency_key_key"));
    assert!(contract
        .conflict_classifier
        .matches_constraint("UNIQUE constraint failed: commerce_idempotency_key.tenant_id, commerce_idempotency_key.scope, commerce_idempotency_key.idempotency_key"));
    assert!(!contract
        .conflict_classifier
        .matches_constraint("commerce_order_tenant_id_order_no_key"));
}

#[test]
fn sql_conflict_classifier_does_not_match_everything_when_constraint_name_is_empty() {
    let classifier = CommerceSqlConflictClassifier {
        table: "commerce_shop_service_area",
        constraint_name: "",
        unique_key: vec!["tenant_id", "shop_id"],
        error_code: "commerce-shop-service-area-scope-conflict",
        message: "shop service area scope already exists",
    };

    assert!(!classifier
        .matches_constraint("database error from a different table without the expected key"));
    assert!(classifier.matches_constraint(
        "UNIQUE constraint failed: commerce_shop_service_area.tenant_id, commerce_shop_service_area.shop_id"
    ));
}

#[test]
fn shop_repository_contract_standardizes_service_area_scope_conflicts() {
    let catalogs = commerce_business_repository_sql_catalogs();
    let shop = catalogs
        .iter()
        .find(|catalog| catalog.repository_name == "shop.repository")
        .expect("shop repository catalog must be registered");

    let conflict = shop
        .conflict_classifiers
        .iter()
        .find(|classifier| classifier.table == "commerce_shop_service_area")
        .expect("shop service area scope conflict classifier must be registered");

    assert_eq!(
        conflict.unique_key,
        vec![
            "tenant_id",
            "shop_id",
            "area_type",
            "country_code",
            "area_key"
        ],
    );
    assert_eq!(
        conflict.constraint_name,
        "uk_commerce_shop_service_area_scope"
    );
    assert_eq!(
        conflict.error_code,
        "commerce-shop-service-area-scope-conflict",
    );
    assert_eq!(
        conflict.message,
        "shop service area scope already exists for the same normalized delivery coverage",
    );
    assert!(conflict.matches_constraint("uk_commerce_shop_service_area_scope"));
    assert!(conflict.matches_constraint(
        "UNIQUE constraint failed: commerce_shop_service_area.tenant_id, commerce_shop_service_area.shop_id, commerce_shop_service_area.area_type, commerce_shop_service_area.country_code, commerce_shop_service_area.area_key"
    ));
}

#[test]
fn shop_repository_contract_standardizes_wechat_aligned_scope_conflicts() {
    let shop = commerce_business_repository_sql_catalogs()
        .into_iter()
        .find(|catalog| catalog.repository_name == "shop.repository")
        .expect("shop repository catalog must be registered");

    for (table, constraint_name, unique_key, error_code, message) in [
        (
            "commerce_shop_category_binding",
            "uk_commerce_shop_category_binding_scope",
            vec!["tenant_id", "shop_id", "shop_category_code"],
            "commerce-shop-category-binding-scope-conflict",
            "shop category binding already exists for the same shop category code",
        ),
        (
            "commerce_shop_brand_authorization",
            "uk_commerce_shop_brand_authorization_scope",
            vec!["tenant_id", "shop_id", "brand_code"],
            "commerce-shop-brand-authorization-scope-conflict",
            "shop brand authorization already exists for the same shop brand code",
        ),
        (
            "commerce_shop_qualification",
            "uk_commerce_shop_qualification_scope",
            vec![
                "tenant_id",
                "shop_id",
                "qualification_type",
                "subject_type",
                "subject_id",
            ],
            "commerce-shop-qualification-scope-conflict",
            "shop qualification already exists for the same qualification subject",
        ),
        (
            "commerce_shop_customer_service",
            "uk_commerce_shop_customer_service_scope",
            vec!["tenant_id", "shop_id", "service_channel", "contact_ref"],
            "commerce-shop-customer-service-scope-conflict",
            "shop customer service contact already exists for the same service channel",
        ),
        (
            "commerce_shop_customer_service",
            "uk_commerce_shop_customer_service_single_default",
            vec!["tenant_id", "shop_id", "service_channel"],
            "commerce-shop-customer-service-default-conflict",
            "shop customer service default already exists for the same service channel",
        ),
        (
            "commerce_shop_return_address",
            "uk_commerce_shop_return_address_scope",
            vec!["tenant_id", "shop_id", "address_usage", "address_key"],
            "commerce-shop-return-address-scope-conflict",
            "shop return address already exists for the same normalized address",
        ),
        (
            "commerce_shop_return_address",
            "uk_commerce_shop_return_address_single_default",
            vec!["tenant_id", "shop_id", "address_usage"],
            "commerce-shop-return-address-default-conflict",
            "shop return address default already exists for the same address usage",
        ),
        (
            "commerce_shop_shipping_template",
            "uk_commerce_shop_shipping_template_scope",
            vec!["tenant_id", "shop_id", "template_code"],
            "commerce-shop-shipping-template-scope-conflict",
            "shop shipping template already exists for the same template code",
        ),
        (
            "commerce_shop_shipping_template",
            "uk_commerce_shop_shipping_template_single_default",
            vec!["tenant_id", "shop_id", "delivery_method"],
            "commerce-shop-shipping-template-default-conflict",
            "shop shipping template default already exists for the same delivery method",
        ),
    ] {
        let conflict = shop
            .conflict_classifiers
            .iter()
            .find(|classifier| {
                classifier.table == table && classifier.constraint_name == constraint_name
            })
            .unwrap_or_else(|| {
                panic!("{table} conflict classifier {constraint_name} must be registered")
            });

        assert_eq!(conflict.constraint_name, constraint_name);
        assert_eq!(conflict.unique_key, unique_key);
        assert_eq!(conflict.error_code, error_code);
        assert_eq!(conflict.message, message);
        assert!(conflict.matches_constraint(constraint_name));
    }
}

#[test]
fn transaction_boundary_sql_contract_matches_runtime_transaction_manager_port() {
    let contract = commerce_transaction_boundary_sql_contract();

    assert_eq!(
        contract.manager_name,
        "commerce.runtime.transaction-manager"
    );
    assert_eq!(
        contract.scope_fields,
        vec!["operation_id", "service_name", "tenant_id"],
    );
    assert_eq!(contract.begin.operation, "begin");
    assert_eq!(contract.begin.sql, "BEGIN");
    assert!(contract.begin.bindings.is_empty());
    assert_eq!(contract.commit.operation, "commit");
    assert_eq!(contract.commit.sql, "COMMIT");
    assert!(contract.commit.bindings.is_empty());
    assert_eq!(contract.rollback.operation, "rollback");
    assert_eq!(contract.rollback.sql, "ROLLBACK");
    assert!(contract.rollback.bindings.is_empty());
    assert!(contract.rollback_is_required_on_dispatch_error);
    assert!(contract.commit_is_required_after_idempotency_complete);
}

#[test]
fn transaction_boundary_contract_covers_every_transactional_repository() {
    let contract = commerce_transaction_boundary_sql_contract();
    let transactional_repositories = commerce_repository_bindings()
        .into_iter()
        .filter(|binding| binding.requires_transaction)
        .map(|binding| binding.repository_name)
        .collect::<Vec<_>>();

    assert_eq!(contract.covered_repositories, transactional_repositories);
    assert!(contract
        .covered_repositories
        .contains(&"idempotency.repository"));
    assert!(contract.covered_repositories.contains(&"order.repository"));
    assert!(contract
        .covered_repositories
        .contains(&"payment.repository"));
    assert!(contract
        .covered_repositories
        .contains(&"after_sales.repository"));
}

#[test]
fn business_repository_sql_catalogs_cover_every_first_slice_business_repository() {
    let catalogs = commerce_business_repository_sql_catalogs();

    assert_eq!(
        catalogs
            .iter()
            .map(|catalog| catalog.repository_name)
            .collect::<Vec<_>>(),
        vec![
            "shop.repository",
            "account.repository",
            "benefit.repository",
            "entitlement.repository",
            "membership.repository",
            "promotion.repository",
            "catalog.repository",
            "inventory.repository",
            "cart.repository",
            "buyer_address.repository",
            "order.repository",
            "payment.repository",
            "after_sales.repository",
            "exchange.repository",
            "invoice.repository",
            "billing.repository",
        ],
    );

    for catalog in &catalogs {
        let binding = commerce_repository_bindings()
            .into_iter()
            .find(|binding| binding.repository_name == catalog.repository_name)
            .expect("business catalog must have a repository binding");
        assert_eq!(catalog.domain, binding.domain);
        assert_eq!(catalog.tables, binding.tables);
        assert!(catalog.requires_transaction);
        assert_eq!(catalog.tenant_scope_field, "tenant_id");
        assert!(!catalog.operations.is_empty());
        assert!(catalog.operations.iter().any(|operation| operation.is_read));
        assert!(catalog
            .operations
            .iter()
            .any(|operation| operation.is_write));
    }

    let shop = catalogs
        .iter()
        .find(|catalog| catalog.repository_name == "shop.repository")
        .unwrap();
    assert_eq!(shop.domain, "shop");
    assert_eq!(
        shop.tables,
        vec![
            "commerce_shop",
            "commerce_shop_application",
            "commerce_shop_verification",
            "commerce_shop_status_event",
            "commerce_shop_channel",
            "commerce_shop_fulfillment_profile",
            "commerce_shop_settlement_profile",
            "commerce_shop_metric_snapshot",
            "commerce_shop_readiness",
            "commerce_shop_business_hour",
            "commerce_shop_service_area",
            "commerce_shop_policy",
            "commerce_shop_deposit_account",
            "commerce_shop_risk_signal",
            "commerce_shop_category_binding",
            "commerce_shop_brand_authorization",
            "commerce_shop_qualification",
            "commerce_shop_customer_service",
            "commerce_shop_return_address",
            "commerce_shop_shipping_template",
        ]
    );
    assert_eq!(
        shop.operations
            .iter()
            .map(|operation| (operation.name, operation.table, operation.is_write))
            .collect::<Vec<_>>(),
        vec![
            ("shop.list_shops", "commerce_shop", false),
            ("shop.find_shop", "commerce_shop", false),
            ("shop.create_shop", "commerce_shop", true),
            ("shop.update_shop", "commerce_shop", true),
            ("shop.update_shop_status", "commerce_shop", true),
            ("shop.submit_application", "commerce_shop_application", true),
            ("shop.list_applications", "commerce_shop_application", false),
            (
                "shop.list_verifications",
                "commerce_shop_verification",
                false
            ),
            (
                "shop.update_verification",
                "commerce_shop_verification",
                true
            ),
            (
                "shop.append_status_event",
                "commerce_shop_status_event",
                true
            ),
            (
                "shop.list_status_events",
                "commerce_shop_status_event",
                false
            ),
            ("shop.list_channels", "commerce_shop_channel", false),
            ("shop.upsert_channel", "commerce_shop_channel", true),
            (
                "shop.find_fulfillment_profile",
                "commerce_shop_fulfillment_profile",
                false
            ),
            (
                "shop.upsert_fulfillment_profile",
                "commerce_shop_fulfillment_profile",
                true
            ),
            (
                "shop.find_settlement_profile",
                "commerce_shop_settlement_profile",
                false
            ),
            (
                "shop.upsert_settlement_profile",
                "commerce_shop_settlement_profile",
                true
            ),
            (
                "shop.review_settlement_profile",
                "commerce_shop_settlement_profile",
                true
            ),
            (
                "shop.list_metric_snapshots",
                "commerce_shop_metric_snapshot",
                false
            ),
            (
                "shop.find_business_hours",
                "commerce_shop_business_hour",
                false
            ),
            (
                "shop.upsert_business_hours",
                "commerce_shop_business_hour",
                true
            ),
            ("shop.find_readiness", "commerce_shop_readiness", false),
            ("shop.upsert_readiness", "commerce_shop_readiness", true),
            (
                "shop.list_service_areas",
                "commerce_shop_service_area",
                false
            ),
            (
                "shop.upsert_service_area",
                "commerce_shop_service_area",
                true
            ),
            ("shop.list_policies", "commerce_shop_policy", false),
            ("shop.upsert_policy", "commerce_shop_policy", true),
            (
                "shop.find_deposit_account",
                "commerce_shop_deposit_account",
                false
            ),
            (
                "shop.upsert_deposit_account",
                "commerce_shop_deposit_account",
                true
            ),
            (
                "shop.review_deposit_account",
                "commerce_shop_deposit_account",
                true
            ),
            ("shop.list_risk_signals", "commerce_shop_risk_signal", false),
            ("shop.append_risk_signal", "commerce_shop_risk_signal", true),
            (
                "shop.resolve_risk_signal",
                "commerce_shop_risk_signal",
                true
            ),
            (
                "shop.list_category_bindings",
                "commerce_shop_category_binding",
                false
            ),
            (
                "shop.upsert_category_binding",
                "commerce_shop_category_binding",
                true
            ),
            (
                "shop.list_brand_authorizations",
                "commerce_shop_brand_authorization",
                false
            ),
            (
                "shop.upsert_brand_authorization",
                "commerce_shop_brand_authorization",
                true
            ),
            (
                "shop.list_qualifications",
                "commerce_shop_qualification",
                false
            ),
            (
                "shop.upsert_qualification",
                "commerce_shop_qualification",
                true
            ),
            (
                "shop.list_customer_services",
                "commerce_shop_customer_service",
                false
            ),
            (
                "shop.upsert_customer_service",
                "commerce_shop_customer_service",
                true
            ),
            (
                "shop.list_return_addresses",
                "commerce_shop_return_address",
                false
            ),
            (
                "shop.upsert_return_address",
                "commerce_shop_return_address",
                true
            ),
            (
                "shop.list_shipping_templates",
                "commerce_shop_shipping_template",
                false
            ),
            (
                "shop.upsert_shipping_template",
                "commerce_shop_shipping_template",
                true
            ),
        ],
    );
}

#[test]
fn business_repository_sql_catalogs_standardize_operation_names_and_tables() {
    let catalogs = commerce_business_repository_sql_catalogs();
    let account = catalogs
        .iter()
        .find(|catalog| catalog.repository_name == "account.repository")
        .unwrap();
    assert_eq!(
        account
            .operations
            .iter()
            .map(|operation| (operation.name, operation.table, operation.is_write))
            .collect::<Vec<_>>(),
        vec![
            ("account.find_by_owner_asset", "commerce_account", false),
            ("account.upsert_account", "commerce_account", true),
            (
                "account.append_ledger_entry",
                "commerce_account_ledger_entry",
                true,
            ),
            ("account.create_prehold", "commerce_billing_prehold", true),
            ("account.settle_prehold", "commerce_billing_prehold", true),
            ("account.release_prehold", "commerce_billing_prehold", true),
        ],
    );

    let billing = catalogs
        .iter()
        .find(|catalog| catalog.repository_name == "billing.repository")
        .unwrap();
    assert_eq!(
        billing
            .operations
            .iter()
            .map(|operation| (operation.name, operation.table, operation.is_write))
            .collect::<Vec<_>>(),
        vec![
            ("billing.list_history", "commerce_billing_history", false),
            ("billing.append_history", "commerce_billing_history", true),
        ],
    );

    let benefit = catalogs
        .iter()
        .find(|catalog| catalog.repository_name == "benefit.repository")
        .unwrap();
    assert_eq!(
        benefit
            .operations
            .iter()
            .map(|operation| (operation.name, operation.table, operation.is_write))
            .collect::<Vec<_>>(),
        vec![
            ("benefit.list_definitions", "benefit_definition", false),
            ("benefit.upsert_definition", "benefit_definition", true),
            ("benefit.archive_definition", "benefit_definition", true),
        ],
    );

    let entitlement = catalogs
        .iter()
        .find(|catalog| catalog.repository_name == "entitlement.repository")
        .unwrap();
    assert!(entitlement.operations.iter().any(|operation| {
        operation.name == "entitlement.create_grant"
            && operation.table == "entitlement_grant"
            && operation.is_write
    }));
    assert!(entitlement.operations.iter().any(|operation| {
        operation.name == "entitlement.find_account"
            && operation.table == "entitlement_account"
            && operation.is_read
    }));
    assert!(entitlement.operations.iter().any(|operation| {
        operation.name == "entitlement.append_ledger_entry"
            && operation.table == "entitlement_ledger_entry"
            && operation.is_write
    }));

    let membership = catalogs
        .iter()
        .find(|catalog| catalog.repository_name == "membership.repository")
        .unwrap();
    assert_eq!(
        membership.tables,
        vec![
            "membership_plan",
            "membership_plan_version",
            "membership_plan_benefit",
            "membership_package_group",
            "membership_package",
            "membership_subscription",
            "membership_period",
        ],
    );
    assert!(membership.operations.iter().any(|operation| {
        operation.name == "membership.list_plans"
            && operation.table == "membership_plan"
            && operation.is_read
    }));
    assert!(membership.operations.iter().any(|operation| {
        operation.name == "membership.publish_plan_version"
            && operation.table == "membership_plan_version"
            && operation.is_write
    }));
    assert!(membership.operations.iter().any(|operation| {
        operation.name == "membership.upsert_plan_benefit"
            && operation.table == "membership_plan_benefit"
            && operation.is_write
    }));
    assert!(membership.operations.iter().any(|operation| {
        operation.name == "membership.list_package_groups"
            && operation.table == "membership_package_group"
            && operation.is_read
    }));
    assert!(membership.operations.iter().any(|operation| {
        operation.name == "membership.upsert_package"
            && operation.table == "membership_package"
            && operation.is_write
    }));
    assert!(membership.operations.iter().any(|operation| {
        operation.name == "membership.activate_subscription"
            && operation.table == "membership_subscription"
            && operation.is_write
    }));
    assert!(membership.operations.iter().any(|operation| {
        operation.name == "membership.append_period"
            && operation.table == "membership_period"
            && operation.is_write
    }));

    let promotion = catalogs
        .iter()
        .find(|catalog| catalog.repository_name == "promotion.repository")
        .unwrap();
    assert_eq!(
        promotion.tables,
        vec![
            "promotion_offer",
            "promotion_offer_version",
            "promotion_coupon_stock",
            "promotion_code",
            "promotion_user_coupon",
            "promotion_coupon_ledger_entry",
            "promotion_discount_application",
            "promotion_discount_allocation",
        ],
    );
    assert!(promotion.operations.iter().any(|operation| {
        operation.name == "promotion.list_offers"
            && operation.table == "promotion_offer"
            && operation.is_read
    }));
    assert!(promotion.operations.iter().any(|operation| {
        operation.name == "promotion.publish_offer_version"
            && operation.table == "promotion_offer_version"
            && operation.is_write
    }));
    assert!(promotion.operations.iter().any(|operation| {
        operation.name == "promotion.create_coupon_stock"
            && operation.table == "promotion_coupon_stock"
            && operation.is_write
    }));
    assert!(promotion.operations.iter().any(|operation| {
        operation.name == "promotion.issue_user_coupon"
            && operation.table == "promotion_user_coupon"
            && operation.is_write
    }));
    assert!(promotion.operations.iter().any(|operation| {
        operation.name == "promotion.apply_discount"
            && operation.table == "promotion_discount_application"
            && operation.is_write
    }));

    let order = catalogs
        .iter()
        .find(|catalog| catalog.repository_name == "order.repository")
        .unwrap();
    assert!(order
        .operations
        .iter()
        .any(|operation| operation.name == "order.create_order" && operation.is_write));
    assert!(order
        .operations
        .iter()
        .any(|operation| operation.name == "order.find_by_order_no" && operation.is_read));
    assert!(order
        .operations
        .iter()
        .any(|operation| operation.table == "commerce_order_amount_breakdown"));

    let catalog = catalogs
        .iter()
        .find(|catalog| catalog.repository_name == "catalog.repository")
        .unwrap();
    assert_eq!(
        (catalog.domain, catalog.requires_transaction),
        ("catalog", true)
    );
    assert_eq!(
        catalog
            .operations
            .iter()
            .map(|operation| (operation.name, operation.table, operation.is_write))
            .collect::<Vec<_>>(),
        vec![
            (
                "catalog.list_categories",
                "commerce_product_category",
                false
            ),
            ("catalog.upsert_category", "commerce_product_category", true),
            (
                "catalog.list_attributes",
                "commerce_product_attribute",
                false
            ),
            (
                "catalog.upsert_attribute",
                "commerce_product_attribute",
                true
            ),
            ("catalog.list_spu", "commerce_product_spu", false),
            ("catalog.upsert_spu", "commerce_product_spu", true),
            (
                "catalog.assign_spu_category",
                "commerce_product_spu_category",
                true,
            ),
            ("catalog.list_skus", "commerce_product_sku", false),
            ("catalog.upsert_sku", "commerce_product_sku", true),
            (
                "catalog.upsert_sku_attribute",
                "commerce_product_sku_attribute",
                true,
            ),
            ("catalog.list_media", "commerce_product_media", false),
            ("catalog.upsert_media", "commerce_product_media", true),
            ("catalog.list_price_lists", "commerce_price_list", false),
            ("catalog.upsert_price_list", "commerce_price_list", true),
            (
                "catalog.upsert_price_list_item",
                "commerce_price_list_item",
                true,
            ),
            (
                "catalog.list_recharge_packages",
                "commerce_recharge_package",
                false,
            ),
            (
                "catalog.upsert_recharge_package",
                "commerce_recharge_package",
                true,
            ),
        ],
    );

    let inventory = catalogs
        .iter()
        .find(|catalog| catalog.repository_name == "inventory.repository")
        .unwrap();
    assert_eq!(
        inventory
            .operations
            .iter()
            .map(|operation| (operation.name, operation.table, operation.is_write))
            .collect::<Vec<_>>(),
        vec![
            ("inventory.find_stock", "commerce_inventory_stock", false),
            ("inventory.upsert_stock", "commerce_inventory_stock", true),
            (
                "inventory.create_reservation",
                "commerce_inventory_reservation",
                true,
            ),
            (
                "inventory.consume_reservation",
                "commerce_inventory_reservation",
                true,
            ),
            (
                "inventory.release_reservation",
                "commerce_inventory_reservation",
                true,
            ),
            (
                "inventory.append_movement",
                "commerce_inventory_movement",
                true,
            ),
        ],
    );

    let payment = catalogs
        .iter()
        .find(|catalog| catalog.repository_name == "payment.repository")
        .unwrap();
    assert_eq!(
        payment.tables,
        vec![
            "commerce_payment_intent",
            "commerce_payment_attempt",
            "commerce_payment_webhook_event",
            "commerce_payment_method",
            "commerce_payment_provider",
            "commerce_payment_provider_account",
            "commerce_payment_channel",
            "commerce_payment_route_rule",
            "commerce_payment_provider_capability",
            "commerce_payment_operation_attempt",
            "commerce_payment_route_decision",
            "commerce_payment_capture",
            "commerce_payment_webhook_delivery",
            "commerce_payment_statement",
            "commerce_payment_statement_item",
            "commerce_payment_reconciliation_run",
            "commerce_payment_reconciliation_item",
            "commerce_payment_fee",
            "commerce_payment_dispute",
            "commerce_payment_dispute_event",
            "commerce_refund",
            "commerce_refund_item",
            "commerce_refund_attempt",
            "commerce_refund_event",
        ],
    );
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.create_intent"
            && operation.table == "commerce_payment_intent"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.record_attempt"
            && operation.table == "commerce_payment_attempt"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.list_methods"
            && operation.table == "commerce_payment_method"
            && operation.is_read
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.upsert_method"
            && operation.table == "commerce_payment_method"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.list_providers"
            && operation.table == "commerce_payment_provider"
            && operation.is_read
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.upsert_provider"
            && operation.table == "commerce_payment_provider"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.list_provider_accounts"
            && operation.table == "commerce_payment_provider_account"
            && operation.is_read
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.upsert_provider_account"
            && operation.table == "commerce_payment_provider_account"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.list_channels"
            && operation.table == "commerce_payment_channel"
            && operation.is_read
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.upsert_channel"
            && operation.table == "commerce_payment_channel"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.list_route_rules"
            && operation.table == "commerce_payment_route_rule"
            && operation.is_read
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.upsert_route_rule"
            && operation.table == "commerce_payment_route_rule"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.list_provider_capabilities"
            && operation.table == "commerce_payment_provider_capability"
            && operation.is_read
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.upsert_provider_capability"
            && operation.table == "commerce_payment_provider_capability"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.record_operation_attempt"
            && operation.table == "commerce_payment_operation_attempt"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.record_route_decision"
            && operation.table == "commerce_payment_route_decision"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.record_capture"
            && operation.table == "commerce_payment_capture"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.record_webhook_delivery"
            && operation.table == "commerce_payment_webhook_delivery"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.list_statements"
            && operation.table == "commerce_payment_statement"
            && operation.is_read
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.record_statement_item"
            && operation.table == "commerce_payment_statement_item"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.list_reconciliation_runs"
            && operation.table == "commerce_payment_reconciliation_run"
            && operation.is_read
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.create_reconciliation_run"
            && operation.table == "commerce_payment_reconciliation_run"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.finish_reconciliation_run"
            && operation.table == "commerce_payment_reconciliation_run"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.record_reconciliation_item"
            && operation.table == "commerce_payment_reconciliation_item"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.record_fee"
            && operation.table == "commerce_payment_fee"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.list_disputes"
            && operation.table == "commerce_payment_dispute"
            && operation.is_read
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.record_dispute_event"
            && operation.table == "commerce_payment_dispute_event"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.find_webhook_event"
            && operation.table == "commerce_payment_webhook_event"
            && operation.is_read
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.find_webhook_nonce"
            && operation.table == "commerce_payment_webhook_event"
            && operation.is_read
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.record_webhook_event"
            && operation.table == "commerce_payment_webhook_event"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.finish_webhook_event"
            && operation.table == "commerce_payment_webhook_event"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.create_refund"
            && operation.table == "commerce_refund"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.record_refund_item"
            && operation.table == "commerce_refund_item"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.record_refund_attempt"
            && operation.table == "commerce_refund_attempt"
            && operation.is_write
    }));
    assert!(payment.operations.iter().any(|operation| {
        operation.name == "payment.record_refund_event"
            && operation.table == "commerce_refund_event"
            && operation.is_write
    }));

    let after_sales = catalogs
        .iter()
        .find(|catalog| catalog.repository_name == "after_sales.repository")
        .unwrap();
    assert_eq!(after_sales.domain, "after_sales");
    assert_eq!(
        after_sales.tables,
        vec![
            "commerce_after_sales_request",
            "commerce_after_sales_item",
            "commerce_after_sales_return_shipment",
            "commerce_after_sales_event",
        ],
    );
    assert_eq!(
        after_sales
            .operations
            .iter()
            .map(|operation| (operation.name, operation.table, operation.is_write))
            .collect::<Vec<_>>(),
        vec![
            (
                "after_sales.find_request",
                "commerce_after_sales_request",
                false,
            ),
            (
                "after_sales.create_request",
                "commerce_after_sales_request",
                true,
            ),
            (
                "after_sales.update_request_status",
                "commerce_after_sales_request",
                true,
            ),
            ("after_sales.record_item", "commerce_after_sales_item", true,),
            (
                "after_sales.record_return_shipment",
                "commerce_after_sales_return_shipment",
                true,
            ),
            (
                "after_sales.record_event",
                "commerce_after_sales_event",
                true,
            ),
        ],
    );

    let exchange = catalogs
        .iter()
        .find(|catalog| catalog.repository_name == "exchange.repository")
        .unwrap();
    assert_eq!(
        exchange
            .operations
            .iter()
            .map(|operation| (operation.name, operation.table, operation.is_write))
            .collect::<Vec<_>>(),
        vec![
            ("exchange.list_rules", "commerce_exchange_rule", false),
            ("exchange.find_rule", "commerce_exchange_rule", false),
            ("exchange.upsert_rule", "commerce_exchange_rule", true),
        ],
    );
}

#[test]
fn recharge_repository_sql_uses_canonical_catalog_status_fields() {
    let postgres_recharge_sql = include_str!("../../../../sdkwork-payment/crates/sdkwork-commerce-payment-repository-sqlx/src/postgres_recharge.rs");
    let sqlite_recharge_sql = include_str!("../../../../sdkwork-payment/crates/sdkwork-commerce-payment-repository-sqlx/src/sqlite_recharge.rs");

    for source in [postgres_recharge_sql, sqlite_recharge_sql] {
        assert!(!source.contains("sales_status"));
        assert!(!source.contains("delivery_mode"));
        assert!(source.contains("s.status = 'active'"));
        assert!(source.contains("pr.status = 'active'"));
    }
}

#[test]
fn recharge_repository_uses_canonical_payment_method_keys_without_compat_fallbacks() {
    let postgres_recharge_sql = include_str!("../../../../sdkwork-payment/crates/sdkwork-commerce-payment-repository-sqlx/src/postgres_recharge.rs");
    let sqlite_recharge_sql = include_str!("../../../../sdkwork-payment/crates/sdkwork-commerce-payment-repository-sqlx/src/sqlite_recharge.rs");

    for (label, source) in [
        ("postgres recharge repository", postgres_recharge_sql),
        ("sqlite recharge repository", sqlite_recharge_sql),
    ] {
        assert!(
            !source.contains("LOAD_RECHARGE_METHOD_FALLBACK"),
            "{label} must fail closed instead of selecting an arbitrary active recharge method",
        );
        assert!(
            !source.contains("method_alias"),
            "{label} must query commerce_payment_method.method_key by canonical key only",
        );
        assert!(
            !source.contains("wechatpay"),
            "{label} must not keep legacy compact wechatpay aliases",
        );
        assert!(
            !source.contains("\"wechat_pay\" => \"wechat\""),
            "{label} must preserve the canonical wechat_pay method key",
        );
        assert!(
            !source.contains("\"stripe\" => \"card\""),
            "{label} must not accept provider_code as a payment method alias",
        );
        assert!(
            !source.contains("_ => \"wechat_pay\""),
            "{label} must not default unknown payment methods to wechat_pay",
        );
        assert!(
            source.contains("SELECT method_key, provider_code"),
            "{label} must load provider_code from commerce_payment_method instead of deriving it",
        );
        assert!(
            !source.contains("recharge_provider_code(&method_key)"),
            "{label} must not derive provider_code from method_key",
        );
    }
}

#[test]
fn payment_method_table_uses_provider_code_not_ambiguous_provider() {
    let sql = commerce_initial_migration_sql();
    let payment_method = table_definition(sql, "commerce_payment_method");

    assert!(payment_method.contains("method_key TEXT NOT NULL"));
    assert!(payment_method.contains("provider_code TEXT NOT NULL"));
    assert!(payment_method.contains("sort_order INTEGER NOT NULL DEFAULT 0"));
    assert!(
        !payment_method.contains("provider TEXT NOT NULL"),
        "commerce_payment_method must name the selected payment provider as provider_code",
    );
    assert!(
        !payment_method.contains("sort_weight INTEGER"),
        "commerce_payment_method must use the standard sort_order column",
    );
    assert!(payment_method.contains("UNIQUE (tenant_id, organization_id, method_key)"));
    assert!(sql
        .contains("ON commerce_payment_method (tenant_id, organization_id, status, sort_order)",));
}

#[test]
fn payment_fact_tables_separate_payment_method_from_provider_code() {
    let sql = commerce_initial_migration_sql();
    let intent = table_definition(sql, "commerce_payment_intent");
    let attempt = table_definition(sql, "commerce_payment_attempt");

    for (table_name, definition) in [
        ("commerce_payment_intent", intent),
        ("commerce_payment_attempt", attempt),
    ] {
        assert!(
            definition.contains("payment_method TEXT NOT NULL"),
            "{table_name} must persist the canonical commerce_payment_method.method_key",
        );
        assert!(
            definition.contains("provider_code TEXT NOT NULL"),
            "{table_name} must persist the selected provider code separately from method key",
        );
        assert!(
            !definition.contains("provider TEXT NOT NULL"),
            "{table_name} must not use a generic provider column for payment facts",
        );
    }

    assert!(attempt.contains("UNIQUE (tenant_id, provider_code, out_trade_no)"));
    assert!(
        !attempt.contains("UNIQUE (tenant_id, provider, out_trade_no)"),
        "payment attempt idempotency must be scoped by provider_code, not ambiguous provider",
    );
    assert!(sql.contains(
        "CREATE INDEX IF NOT EXISTS idx_commerce_payment_attempt_provider_code_trade_no",
    ));
    assert!(sql.contains("ON commerce_payment_attempt (tenant_id, provider_code, out_trade_no)"));
}

#[test]
fn payment_webhook_event_table_uses_provider_code_not_ambiguous_provider() {
    let sql = commerce_initial_migration_sql();
    let webhook_event = table_definition(sql, "commerce_payment_webhook_event");

    assert!(webhook_event.contains("provider_code TEXT NOT NULL"));
    assert!(
        !webhook_event.contains("provider TEXT NOT NULL"),
        "commerce_payment_webhook_event must name the webhook source as provider_code",
    );
    assert!(webhook_event.contains("UNIQUE (tenant_id, provider_code, event_id)"));
    assert!(webhook_event.contains("UNIQUE (tenant_id, provider_code, nonce)"));
    assert!(
        !webhook_event.contains("UNIQUE (tenant_id, provider, event_id)"),
        "webhook event idempotency must be scoped by provider_code, not ambiguous provider",
    );
    assert!(
        !webhook_event.contains("UNIQUE (tenant_id, provider, nonce)"),
        "webhook nonce idempotency must be scoped by provider_code, not ambiguous provider",
    );
    assert!(sql.contains(
        "CREATE INDEX IF NOT EXISTS idx_commerce_payment_webhook_event_provider_code_event",
    ));
    assert!(sql.contains("ON commerce_payment_webhook_event (tenant_id, provider_code, event_id)",));
    assert!(sql.contains(
        "CREATE INDEX IF NOT EXISTS idx_commerce_payment_webhook_event_provider_code_nonce",
    ));
    assert!(sql.contains("ON commerce_payment_webhook_event (tenant_id, provider_code, nonce)",));
    assert!(
        !sql.contains("idx_commerce_payment_webhook_event_provider_event"),
        "webhook indexes must use provider_code in their stable names",
    );
    assert!(
        !sql.contains("idx_commerce_payment_webhook_event_provider_nonce"),
        "webhook indexes must use provider_code in their stable names",
    );
}

#[test]
fn payment_routing_tables_use_payment_method_not_ambiguous_method_code() {
    let sql = commerce_initial_migration_sql();
    let provider_capability = table_definition(sql, "commerce_payment_provider_capability");
    let route_decision = table_definition(sql, "commerce_payment_route_decision");

    assert!(provider_capability.contains("payment_method TEXT"));
    assert!(
        !provider_capability.contains("method_code TEXT"),
        "commerce_payment_provider_capability must describe the supported commerce payment method",
    );
    assert!(route_decision.contains("payment_method TEXT NOT NULL"));
    assert!(
        !route_decision.contains("method_code TEXT NOT NULL"),
        "commerce_payment_route_decision must snapshot the selected commerce payment method",
    );
    assert!(sql.contains(
        "ON commerce_payment_provider_capability (tenant_id, provider_account_id, capability_code, payment_method, scene_code, country_code, currency_code)",
    ));
    assert!(
        !sql.contains(
            "ON commerce_payment_provider_capability (tenant_id, provider_account_id, capability_code, method_code, scene_code, country_code, currency_code)",
        ),
        "provider capability matching index must use payment_method",
    );
}

#[test]
fn payment_reconciliation_runs_are_first_class_batch_entities() {
    let sql = commerce_initial_migration_sql();
    let run = table_definition(sql, "commerce_payment_reconciliation_run");
    let item = table_definition(sql, "commerce_payment_reconciliation_item");

    for required_column in [
        "run_no TEXT NOT NULL",
        "provider_code TEXT NOT NULL",
        "provider_account_id TEXT",
        "statement_id TEXT",
        "reconciliation_type TEXT NOT NULL",
        "period_start TEXT NOT NULL",
        "period_end TEXT NOT NULL",
        "status TEXT NOT NULL",
        "matched_count INTEGER NOT NULL DEFAULT 0",
        "mismatched_count INTEGER NOT NULL DEFAULT 0",
        "unmatched_count INTEGER NOT NULL DEFAULT 0",
        "total_difference_amount TEXT NOT NULL DEFAULT '0'",
        "currency_code TEXT NOT NULL",
        "request_no TEXT NOT NULL",
        "idempotency_key TEXT NOT NULL",
        "started_at TEXT",
        "finished_at TEXT",
    ] {
        assert!(
            run.contains(required_column),
            "commerce_payment_reconciliation_run must include {required_column}",
        );
    }

    assert!(item.contains("reconciliation_run_id TEXT NOT NULL"));
    assert!(sql
        .contains("CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_reconciliation_run_no",));
    assert!(sql.contains("ON commerce_payment_reconciliation_run (tenant_id, run_no)",));
    assert!(sql.contains(
        "CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_reconciliation_run_idempotency",
    ));
    assert!(sql.contains(
        "ON commerce_payment_reconciliation_run (tenant_id, provider_code, reconciliation_type, idempotency_key)",
    ));
    assert!(
        sql.contains("CREATE INDEX IF NOT EXISTS idx_commerce_payment_reconciliation_run_status",)
    );
    assert!(sql.contains(
        "ON commerce_payment_reconciliation_run (tenant_id, provider_code, status, created_at)",
    ));
    assert!(
        sql.contains("CREATE INDEX IF NOT EXISTS idx_commerce_payment_reconciliation_run_period",)
    );
    assert!(sql.contains(
        "ON commerce_payment_reconciliation_run (tenant_id, provider_code, period_start, period_end)",
    ));
}

#[test]
fn payment_method_sources_use_standard_sort_order() {
    let checked_sources = [
        (
            "membership seed",
            include_str!("../../../../sdkwork-membership/crates/sdkwork-commerce-membership-repository-sqlx/src/seed.rs"),
        ),
        (
            "bootstrap seeds",
            include_str!("../../sdkwork-commerce-bootstrap-manifest/src/lib.rs"),
        ),
        (
            "app recharge checkout router fixture",
            include_str!("../../sdkwork-commerce-api-server/tests/app_recharge_checkout_router.rs"),
        ),
        (
            "postgres recharge",
            include_str!("../../../../sdkwork-payment/crates/sdkwork-commerce-payment-repository-sqlx/src/postgres_recharge.rs"),
        ),
        (
            "sqlite recharge",
            include_str!("../../../../sdkwork-payment/crates/sdkwork-commerce-payment-repository-sqlx/src/sqlite_recharge.rs"),
        ),
    ];

    for (label, source) in checked_sources {
        assert!(
            !source.contains(
                "method_key, display_name, provider_code, status, sort_weight, request_no",
            ),
            "{label} must not write commerce_payment_method.sort_weight",
        );
        assert!(
            !source.contains("ORDER BY tenant_id DESC, organization_id DESC, sort_weight ASC"),
            "{label} must not order commerce_payment_method by sort_weight",
        );
    }
}

#[test]
fn membership_sql_and_recharge_fixtures_use_canonical_catalog_columns() {
    let checked_sources = [
        (
            "membership postgres repository",
            include_str!("../../../../sdkwork-membership/crates/sdkwork-commerce-membership-repository-sqlx/src/postgres.rs"),
        ),
        (
            "membership sqlite repository",
            include_str!("../../../../sdkwork-membership/crates/sdkwork-commerce-membership-repository-sqlx/src/sqlite.rs"),
        ),
        (
            "membership seed",
            include_str!("../../../../sdkwork-membership/crates/sdkwork-commerce-membership-repository-sqlx/src/seed.rs"),
        ),
        (
            "app recharge checkout router fixture",
            include_str!("../../sdkwork-commerce-api-server/tests/app_recharge_checkout_router.rs"),
        ),
    ];

    for (label, source) in checked_sources {
        assert!(
            !source.contains("sales_status"),
            "{label} must use commerce_product_spu.status / commerce_product_sku.status",
        );
        assert!(
            !source.contains("delivery_mode"),
            "{label} must use commerce_product_sku.fulfillment_type",
        );
    }
}

#[test]
fn storage_capability_manifest_composes_every_storage_contract_for_runtime_bootstrap() {
    let manifest = commerce_storage_capability_manifest();

    assert_eq!(manifest.name, "sdkwork-commerce-storage-sqlx");
    assert_eq!(manifest.schema_version, "commerce.storage.v1");
    assert_eq!(manifest.tables, commerce_database_tables());
    assert_eq!(manifest.indexes, commerce_database_indexes());
    assert_eq!(manifest.migrations, commerce_migration_names());
    assert_eq!(manifest.migration_plan, commerce_migration_plan());
    assert_eq!(
        manifest.migration_runner,
        commerce_migration_runner_sql_contract(),
    );
    assert_eq!(manifest.repository_bindings, commerce_repository_bindings());
    assert_eq!(
        manifest.idempotency_repository,
        commerce_idempotency_repository_sql_contract(),
    );
    assert_eq!(
        manifest.transaction_boundary,
        commerce_transaction_boundary_sql_contract(),
    );
    assert_eq!(
        manifest.business_repositories,
        commerce_business_repository_sql_catalogs(),
    );
}

#[test]
fn migration_runner_sql_contract_exposes_schema_version_table_and_operations() {
    let contract = commerce_migration_runner_sql_contract();

    assert_eq!(contract.runner_name, "commerce.database.migration-runner");
    assert_eq!(contract.schema_version_table, "commerce_schema_migration");
    assert_eq!(
        contract.columns,
        vec![
            "sequence",
            "name",
            "domain",
            "source_path",
            "checksum",
            "applied_at",
        ],
    );
    assert_eq!(contract.unique_key, vec!["sequence", "name"]);
    assert!(contract.requires_transaction);

    assert_eq!(
        contract.ensure_schema_version_table.operation,
        "ensure_schema_version_table"
    );
    assert!(contract
        .ensure_schema_version_table
        .sql
        .contains("CREATE TABLE IF NOT EXISTS commerce_schema_migration"));
    assert!(contract.ensure_schema_version_table.bindings.is_empty());

    assert_eq!(
        contract.read_applied_migrations.operation,
        "read_applied_migrations"
    );
    assert_eq!(
        contract.read_applied_migrations.sql,
        "SELECT sequence, name, domain, source_path, checksum, applied_at FROM commerce_schema_migration ORDER BY sequence ASC",
    );
    assert!(contract.read_applied_migrations.bindings.is_empty());

    assert_eq!(
        contract.insert_applied_migration.operation,
        "insert_applied_migration"
    );
    assert!(contract
        .insert_applied_migration
        .sql
        .starts_with("INSERT INTO commerce_schema_migration"));
    assert_eq!(
        contract.insert_applied_migration.bindings,
        vec![
            "sequence",
            "name",
            "domain",
            "source_path",
            "checksum",
            "applied_at",
        ],
    );
}

#[test]
fn migration_runner_sql_contract_exposes_exclusive_lock_operations() {
    let contract = commerce_migration_runner_sql_contract();

    assert_eq!(contract.lock_table, "commerce_schema_migration_lock");
    assert_eq!(
        contract.lock_columns,
        vec![
            "runner_name",
            "lock_owner",
            "locked_until",
            "heartbeat_at",
            "created_at",
            "updated_at",
        ],
    );
    assert_eq!(contract.lock_unique_key, vec!["runner_name"]);

    assert_eq!(contract.ensure_lock_table.operation, "ensure_lock_table");
    assert!(contract
        .ensure_lock_table
        .sql
        .contains("CREATE TABLE IF NOT EXISTS commerce_schema_migration_lock"));
    assert!(contract.ensure_lock_table.bindings.is_empty());

    assert_eq!(contract.acquire_lock.operation, "acquire_lock");
    assert!(contract
        .acquire_lock
        .sql
        .starts_with("INSERT INTO commerce_schema_migration_lock"));
    assert!(contract.acquire_lock.sql.contains("locked_until"));
    assert_eq!(
        contract.acquire_lock.bindings,
        vec![
            "runner_name",
            "lock_owner",
            "locked_until",
            "heartbeat_at",
            "created_at",
            "updated_at",
        ],
    );

    assert_eq!(contract.heartbeat_lock.operation, "heartbeat_lock");
    assert!(contract
        .heartbeat_lock
        .sql
        .starts_with("UPDATE commerce_schema_migration_lock"));
    assert_eq!(
        contract.heartbeat_lock.bindings,
        vec![
            "lock_owner",
            "locked_until",
            "heartbeat_at",
            "updated_at",
            "runner_name",
        ],
    );

    assert_eq!(contract.release_lock.operation, "release_lock");
    assert!(contract
        .release_lock
        .sql
        .starts_with("DELETE FROM commerce_schema_migration_lock"));
    assert_eq!(
        contract.release_lock.bindings,
        vec!["runner_name", "lock_owner"],
    );
}

#[test]
fn migration_runner_lock_acquire_outcome_allows_empty_lock_state() {
    let contract = commerce_migration_runner_sql_contract();

    let outcome = commerce_migration_runner_lock_acquire_outcome(
        &contract,
        None,
        "host-a",
        "2026-05-17T00:00:00Z",
        "2026-05-17T00:05:00Z",
    )
    .unwrap();

    assert_eq!(outcome.runner_name, "commerce.database.migration-runner");
    assert_eq!(outcome.lock_table, "commerce_schema_migration_lock");
    assert_eq!(outcome.requested_owner, "host-a");
    assert_eq!(outcome.effective_owner, "host-a");
    assert_eq!(outcome.status, "acquired");
    assert!(outcome.can_run_migrations);
    assert!(!outcome.requires_steal);
    assert_eq!(outcome.locked_until, "2026-05-17T00:05:00Z");
}

#[test]
fn migration_runner_lock_acquire_outcome_allows_same_owner_renewal() {
    let contract = commerce_migration_runner_sql_contract();
    let existing = commerce_migration_runner_lock_record(
        &contract,
        "host-a",
        "2026-05-17T00:10:00Z",
        "2026-05-17T00:01:00Z",
    );

    let outcome = commerce_migration_runner_lock_acquire_outcome(
        &contract,
        Some(&existing),
        "host-a",
        "2026-05-17T00:02:00Z",
        "2026-05-17T00:12:00Z",
    )
    .unwrap();

    assert_eq!(outcome.status, "renewed");
    assert!(outcome.can_run_migrations);
    assert!(!outcome.requires_steal);
    assert_eq!(outcome.previous_owner, Some("host-a"));
    assert_eq!(outcome.effective_owner, "host-a");
}

#[test]
fn migration_runner_lock_acquire_outcome_blocks_when_other_owner_lock_is_active() {
    let contract = commerce_migration_runner_sql_contract();
    let existing = commerce_migration_runner_lock_record(
        &contract,
        "host-a",
        "2026-05-17T00:10:00Z",
        "2026-05-17T00:01:00Z",
    );

    let outcome = commerce_migration_runner_lock_acquire_outcome(
        &contract,
        Some(&existing),
        "host-b",
        "2026-05-17T00:02:00Z",
        "2026-05-17T00:12:00Z",
    )
    .unwrap();

    assert_eq!(outcome.status, "blocked");
    assert!(!outcome.can_run_migrations);
    assert!(!outcome.requires_steal);
    assert_eq!(outcome.previous_owner, Some("host-a"));
    assert_eq!(outcome.effective_owner, "host-a");
    assert_eq!(outcome.locked_until, "2026-05-17T00:10:00Z");
}

#[test]
fn migration_runner_lock_acquire_outcome_allows_stealing_expired_lock() {
    let contract = commerce_migration_runner_sql_contract();
    let existing = commerce_migration_runner_lock_record(
        &contract,
        "host-a",
        "2026-05-17T00:01:00Z",
        "2026-05-17T00:00:30Z",
    );

    let outcome = commerce_migration_runner_lock_acquire_outcome(
        &contract,
        Some(&existing),
        "host-b",
        "2026-05-17T00:02:00Z",
        "2026-05-17T00:12:00Z",
    )
    .unwrap();

    assert_eq!(outcome.status, "stolen");
    assert!(outcome.can_run_migrations);
    assert!(outcome.requires_steal);
    assert_eq!(outcome.previous_owner, Some("host-a"));
    assert_eq!(outcome.effective_owner, "host-b");
    assert_eq!(outcome.locked_until, "2026-05-17T00:12:00Z");
}

#[test]
fn migration_runner_lock_acquire_outcome_rejects_mismatched_runner_record() {
    let contract = commerce_migration_runner_sql_contract();
    let mut existing = commerce_migration_runner_lock_record(
        &contract,
        "host-a",
        "2026-05-17T00:10:00Z",
        "2026-05-17T00:01:00Z",
    );
    existing.runner_name = "wrong-runner";

    let error = commerce_migration_runner_lock_acquire_outcome(
        &contract,
        Some(&existing),
        "host-b",
        "2026-05-17T00:02:00Z",
        "2026-05-17T00:12:00Z",
    )
    .unwrap_err();

    assert_eq!(error.code, "commerce-migration-runner-lock-invalid");
    assert!(error.message.contains("lock runner name drift"));
}

#[test]
fn migration_runner_lock_lifecycle_exposes_standard_statuses_and_decisions() {
    let contract = commerce_migration_runner_sql_contract();
    let lifecycle = commerce_migration_runner_lock_lifecycle(&contract);

    assert_eq!(lifecycle.runner_name, "commerce.database.migration-runner");
    assert_eq!(lifecycle.lock_table, "commerce_schema_migration_lock");
    assert_eq!(lifecycle.lock_owner_binding, "lock_owner");
    assert_eq!(lifecycle.fresh_acquire_status, "acquired");
    assert_eq!(lifecycle.renewal_status, "renewed");
    assert_eq!(lifecycle.stolen_status, "stolen");
    assert_eq!(lifecycle.blocked_status, "blocked");
    assert!(lifecycle.fresh_acquire_can_run_migrations);
    assert!(lifecycle.renewal_can_run_migrations);
    assert!(lifecycle.stolen_can_run_migrations);
    assert!(!lifecycle.blocked_can_run_migrations);
    assert!(lifecycle.steal_required_for_expired_lock);
}

#[test]
fn validates_standard_migration_runner_lock_lifecycle_for_host_preflight() {
    let contract = commerce_migration_runner_sql_contract();
    let lifecycle = commerce_migration_runner_lock_lifecycle(&contract);

    assert_eq!(
        validate_commerce_migration_runner_lock_lifecycle(&contract, &lifecycle),
        Ok(())
    );
}

#[test]
fn migration_runner_lock_lifecycle_validation_rejects_status_drift() {
    let contract = commerce_migration_runner_sql_contract();
    let mut lifecycle = commerce_migration_runner_lock_lifecycle(&contract);
    lifecycle.blocked_status = "wrong";

    let error =
        validate_commerce_migration_runner_lock_lifecycle(&contract, &lifecycle).unwrap_err();

    assert_eq!(error.code, "commerce-migration-runner-lock-invalid");
    assert!(error.message.contains("lock lifecycle drift"));
}

#[test]
fn migration_runner_lock_cleanup_exposes_failure_recovery_release_policy() {
    let contract = commerce_migration_runner_sql_contract();
    let cleanup = commerce_migration_runner_lock_cleanup(&contract);

    assert_eq!(cleanup.runner_name, "commerce.database.migration-runner");
    assert_eq!(cleanup.lock_table, "commerce_schema_migration_lock");
    assert_eq!(cleanup.release_operation, "release_lock");
    assert_eq!(cleanup.lock_owner_binding, "lock_owner");
    assert!(cleanup.release_required_after_acquired_failure);
    assert!(cleanup.release_skipped_before_acquire);
    assert!(cleanup.release_uses_owner_binding);
}

#[test]
fn validates_standard_migration_runner_lock_cleanup_for_host_preflight() {
    let contract = commerce_migration_runner_sql_contract();
    let cleanup = commerce_migration_runner_lock_cleanup(&contract);

    assert_eq!(
        validate_commerce_migration_runner_lock_cleanup(&contract, &cleanup),
        Ok(())
    );
}

#[test]
fn migration_runner_lock_cleanup_validation_rejects_release_operation_drift() {
    let contract = commerce_migration_runner_sql_contract();
    let mut cleanup = commerce_migration_runner_lock_cleanup(&contract);
    cleanup.release_operation = "wrong";

    let error = validate_commerce_migration_runner_lock_cleanup(&contract, &cleanup).unwrap_err();

    assert_eq!(error.code, "commerce-migration-runner-lock-invalid");
    assert!(error.message.contains("lock cleanup drift"));
}

#[test]
fn migration_runner_contract_tracks_migration_plan_and_transaction_boundary() {
    let contract = commerce_migration_runner_sql_contract();

    assert_eq!(contract.plan, commerce_migration_plan());
    assert_eq!(
        contract.applied_migration_sequence,
        commerce_migration_names(),
    );
    assert_eq!(
        contract.transaction_boundary_manager,
        commerce_transaction_boundary_sql_contract().manager_name,
    );
    assert_eq!(
        contract.conflict_classifier.table,
        "commerce_schema_migration"
    );
    assert_eq!(
        contract.conflict_classifier.constraint_name,
        "commerce_schema_migration_sequence_name_key",
    );
    assert_eq!(
        contract.conflict_classifier.unique_key,
        vec!["sequence", "name"],
    );
    assert_eq!(
        contract.conflict_classifier.error_code,
        "commerce-migration-already-applied",
    );
    assert!(contract
        .conflict_classifier
        .matches_constraint("commerce_schema_migration_sequence_name_key"));
}

#[test]
fn validates_standard_migration_runner_contract_for_host_preflight() {
    assert_eq!(
        validate_commerce_migration_runner_sql_contract(&commerce_migration_runner_sql_contract()),
        Ok(())
    );
}

#[test]
fn migration_runner_validation_rejects_schema_table_drift() {
    let mut contract = commerce_migration_runner_sql_contract();
    contract.schema_version_table = "wrong_schema_migration";

    let error = validate_commerce_migration_runner_sql_contract(&contract).unwrap_err();

    assert_eq!(error.code, "commerce-migration-runner-invalid");
    assert!(error.message.contains("schema version table drift"));
}

#[test]
fn migration_runner_validation_rejects_applied_sequence_drift() {
    let mut contract = commerce_migration_runner_sql_contract();
    contract.applied_migration_sequence.pop();

    let error = validate_commerce_migration_runner_sql_contract(&contract).unwrap_err();

    assert_eq!(error.code, "commerce-migration-runner-invalid");
    assert!(error.message.contains("applied migration sequence drift"));
}

#[test]
fn migration_runner_validation_rejects_plan_drift() {
    let mut contract = commerce_migration_runner_sql_contract();
    contract.plan[0].checksum = "commerce-migration-checksum:bad".to_string();

    let error = validate_commerce_migration_runner_sql_contract(&contract).unwrap_err();

    assert_eq!(error.code, "commerce-migration-runner-invalid");
    assert!(error.message.contains("migration plan drift"));
}

#[test]
fn migration_runner_preflight_returns_full_pending_plan_when_nothing_is_applied() {
    let contract = commerce_migration_runner_sql_contract();
    let preflight = commerce_migration_runner_preflight(&contract, &[]).unwrap();

    assert_eq!(preflight.runner_name, "commerce.database.migration-runner");
    assert_eq!(preflight.schema_version_table, "commerce_schema_migration");
    assert_eq!(preflight.applied_count, 0);
    assert_eq!(preflight.pending_count, commerce_migration_plan().len());
    assert!(preflight.requires_execution);
    assert_eq!(preflight.pending_migrations, commerce_migration_plan());
    assert_eq!(
        preflight.next_migration.unwrap().name,
        "0001_core_idempotency.sql",
    );
}

#[test]
fn migration_runner_preflight_returns_remaining_pending_migrations_for_prefix_state() {
    let contract = commerce_migration_runner_sql_contract();
    let plan = commerce_migration_plan();
    let applied = vec![
        commerce_storage_applied_migration_record(&plan[0], "2026-05-17T00:00:00Z"),
        commerce_storage_applied_migration_record(&plan[1], "2026-05-17T00:01:00Z"),
    ];

    let preflight = commerce_migration_runner_preflight(&contract, &applied).unwrap();

    assert_eq!(preflight.applied_count, 2);
    assert_eq!(preflight.pending_count, commerce_migration_plan().len() - 2);
    assert!(preflight.requires_execution);
    assert_eq!(preflight.pending_migrations[0].name, "0003_benefit.sql");
    assert_eq!(preflight.next_migration.unwrap().name, "0003_benefit.sql",);
}

#[test]
fn migration_runner_preflight_returns_no_pending_migrations_when_plan_is_applied() {
    let contract = commerce_migration_runner_sql_contract();
    let applied = commerce_migration_plan()
        .iter()
        .map(|migration| {
            commerce_storage_applied_migration_record(migration, "2026-05-17T00:00:00Z")
        })
        .collect::<Vec<_>>();

    let preflight = commerce_migration_runner_preflight(&contract, &applied).unwrap();

    assert_eq!(preflight.applied_count, commerce_migration_plan().len());
    assert_eq!(preflight.pending_count, 0);
    assert!(!preflight.requires_execution);
    assert!(preflight.pending_migrations.is_empty());
    assert_eq!(preflight.next_migration, None);
}

#[test]
fn migration_runner_preflight_rejects_applied_checksum_drift() {
    let contract = commerce_migration_runner_sql_contract();
    let plan = commerce_migration_plan();
    let mut applied = vec![commerce_storage_applied_migration_record(
        &plan[0],
        "2026-05-17T00:00:00Z",
    )];
    applied[0].checksum = "commerce-migration-checksum:bad".to_string();

    let error = commerce_migration_runner_preflight(&contract, &applied).unwrap_err();

    assert_eq!(error.code, "commerce-migration-runner-preflight-invalid");
    assert!(error.message.contains("applied migration checksum drift"));
}

#[test]
fn migration_runner_preflight_rejects_non_prefix_applied_state() {
    let contract = commerce_migration_runner_sql_contract();
    let plan = commerce_migration_plan();
    let applied = vec![commerce_storage_applied_migration_record(
        &plan[1],
        "2026-05-17T00:01:00Z",
    )];

    let error = commerce_migration_runner_preflight(&contract, &applied).unwrap_err();

    assert_eq!(error.code, "commerce-migration-runner-preflight-invalid");
    assert!(error.message.contains("applied migration sequence drift"));
}

#[test]
fn migration_runner_execution_plan_builds_ordered_steps_for_empty_database() {
    let contract = commerce_migration_runner_sql_contract();
    let plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();

    assert_eq!(plan.runner_name, "commerce.database.migration-runner");
    assert_eq!(plan.schema_version_table, "commerce_schema_migration");
    assert_eq!(plan.applied_count, 0);
    assert_eq!(plan.pending_count, commerce_migration_plan().len());
    assert!(plan.requires_execution);
    assert_eq!(
        plan.steps.len(),
        4 + (commerce_migration_plan().len() * 2) + 1
    );
    assert_eq!(plan.steps[0].kind, "ensure_lock_table");
    assert_eq!(plan.steps[0].statement.operation, "ensure_lock_table");
    assert_eq!(plan.steps[1].kind, "acquire_lock");
    assert_eq!(plan.steps[1].statement.operation, "acquire_lock");
    assert_eq!(plan.steps[2].kind, "ensure_schema_version_table");
    assert_eq!(
        plan.steps[2].statement.operation,
        "ensure_schema_version_table"
    );
    assert_eq!(plan.steps[3].kind, "read_applied_migrations");
    assert_eq!(plan.steps[3].statement.operation, "read_applied_migrations");
    assert_eq!(plan.steps[4].kind, "apply_migration_sql");
    assert_eq!(
        plan.steps[4].migration_name,
        Some("0001_core_idempotency.sql")
    );
    assert_eq!(
        plan.steps[4].statement.sql,
        commerce_migration_plan()[0].sql
    );
    assert_eq!(plan.steps[5].kind, "record_applied_migration");
    assert_eq!(
        plan.steps[5].statement.operation,
        "insert_applied_migration"
    );
    assert!(plan.steps.iter().all(|step| step.requires_transaction));
    assert_eq!(plan.steps.last().unwrap().migration_name, None);
    assert_eq!(plan.steps.last().unwrap().kind, "release_lock");
    assert_eq!(
        plan.steps.last().unwrap().statement.operation,
        "release_lock"
    );
}

#[test]
fn migration_runner_execution_plan_only_applies_pending_migrations() {
    let contract = commerce_migration_runner_sql_contract();
    let migrations = commerce_migration_plan();
    let applied = vec![
        commerce_storage_applied_migration_record(&migrations[0], "2026-05-17T00:00:00Z"),
        commerce_storage_applied_migration_record(&migrations[1], "2026-05-17T00:01:00Z"),
    ];

    let plan = commerce_migration_runner_execution_plan(&contract, &applied).unwrap();

    assert_eq!(plan.applied_count, 2);
    assert_eq!(plan.pending_count, commerce_migration_plan().len() - 2);
    assert!(plan.requires_execution);
    assert_eq!(
        plan.steps.len(),
        4 + ((commerce_migration_plan().len() - 2) * 2) + 1
    );
    assert_eq!(plan.steps[4].migration_name, Some("0003_benefit.sql"));
    assert_eq!(plan.steps[5].migration_name, Some("0003_benefit.sql"));
    assert!(plan
        .steps
        .iter()
        .skip(4)
        .all(|step| step.migration_name != Some("0001_core_idempotency.sql")));
}

#[test]
fn migration_runner_execution_plan_is_noop_after_all_migrations_are_applied() {
    let contract = commerce_migration_runner_sql_contract();
    let applied = commerce_migration_plan()
        .iter()
        .map(|migration| {
            commerce_storage_applied_migration_record(migration, "2026-05-17T00:00:00Z")
        })
        .collect::<Vec<_>>();

    let plan = commerce_migration_runner_execution_plan(&contract, &applied).unwrap();

    assert_eq!(plan.applied_count, commerce_migration_plan().len());
    assert_eq!(plan.pending_count, 0);
    assert!(!plan.requires_execution);
    assert_eq!(plan.steps.len(), 5);
    assert_eq!(plan.steps[0].kind, "ensure_lock_table");
    assert_eq!(plan.steps[1].kind, "acquire_lock");
    assert_eq!(plan.steps[2].kind, "ensure_schema_version_table");
    assert_eq!(plan.steps[3].kind, "read_applied_migrations");
    assert_eq!(plan.steps[4].kind, "release_lock");
    assert!(plan.steps.iter().all(|step| step.migration_name.is_none()));
}

#[test]
fn migration_runner_execution_plan_rejects_invalid_applied_state() {
    let contract = commerce_migration_runner_sql_contract();
    let migrations = commerce_migration_plan();
    let mut applied = vec![commerce_storage_applied_migration_record(
        &migrations[0],
        "2026-05-17T00:00:00Z",
    )];
    applied[0].checksum = "commerce-migration-checksum:bad".to_string();

    let error = commerce_migration_runner_execution_plan(&contract, &applied).unwrap_err();

    assert_eq!(error.code, "commerce-migration-runner-preflight-invalid");
    assert!(error.message.contains("applied migration checksum drift"));
}

#[test]
fn validates_standard_migration_runner_execution_plan_for_host_preflight() {
    let contract = commerce_migration_runner_sql_contract();
    let plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();

    assert_eq!(
        validate_commerce_migration_runner_execution_plan(&contract, &[], &plan),
        Ok(())
    );
}

#[test]
fn migration_runner_execution_plan_validation_rejects_step_order_drift() {
    let contract = commerce_migration_runner_sql_contract();
    let mut plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();
    plan.steps.swap(2, 3);

    let error =
        validate_commerce_migration_runner_execution_plan(&contract, &[], &plan).unwrap_err();

    assert_eq!(
        error.code,
        "commerce-migration-runner-execution-plan-invalid"
    );
    assert!(error.message.contains("execution step drift"));
}

#[test]
fn migration_runner_execution_plan_validation_rejects_apply_sql_drift() {
    let contract = commerce_migration_runner_sql_contract();
    let mut plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();
    plan.steps[2].statement.sql = "SELECT 1";

    let error =
        validate_commerce_migration_runner_execution_plan(&contract, &[], &plan).unwrap_err();

    assert_eq!(
        error.code,
        "commerce-migration-runner-execution-plan-invalid"
    );
    assert!(error.message.contains("execution step drift"));
}

#[test]
fn migration_runner_execution_plan_validation_rejects_record_statement_drift() {
    let contract = commerce_migration_runner_sql_contract();
    let mut plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();
    plan.steps[3].statement.operation = "wrong_record";

    let error =
        validate_commerce_migration_runner_execution_plan(&contract, &[], &plan).unwrap_err();

    assert_eq!(
        error.code,
        "commerce-migration-runner-execution-plan-invalid"
    );
    assert!(error.message.contains("execution step drift"));
}

#[test]
fn migration_runner_execution_plan_validation_rejects_transaction_flag_drift() {
    let contract = commerce_migration_runner_sql_contract();
    let mut plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();
    plan.steps[0].requires_transaction = false;

    let error =
        validate_commerce_migration_runner_execution_plan(&contract, &[], &plan).unwrap_err();

    assert_eq!(
        error.code,
        "commerce-migration-runner-execution-plan-invalid"
    );
    assert!(error.message.contains("execution step drift"));
}

#[test]
fn migration_runner_execution_result_summarizes_successful_plan_execution() {
    let contract = commerce_migration_runner_sql_contract();
    let plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();

    let result = commerce_migration_runner_execution_result(&plan, "2026-05-17T00:00:00Z");

    assert_eq!(result.runner_name, "commerce.database.migration-runner");
    assert_eq!(result.schema_version_table, "commerce_schema_migration");
    assert_eq!(result.executed_steps, plan.steps.len());
    assert_eq!(result.applied_migrations, commerce_migration_plan().len());
    assert_eq!(result.recorded_migrations, commerce_migration_plan().len());
    assert!(result.success);
    assert_eq!(result.completed_at, "2026-05-17T00:00:00Z");
    assert_eq!(result.step_results.len(), plan.steps.len());
    assert!(result.step_results.iter().all(|step| step.success));
    assert_eq!(result.applied_records[0].name, "0001_core_idempotency.sql",);
    assert_eq!(
        result.applied_records.len(),
        commerce_migration_plan().len()
    );
}

#[test]
fn validates_successful_migration_runner_execution_result() {
    let contract = commerce_migration_runner_sql_contract();
    let plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();
    let result = commerce_migration_runner_execution_result(&plan, "2026-05-17T00:00:00Z");

    assert_eq!(
        validate_commerce_migration_runner_execution_result(&plan, &result),
        Ok(())
    );
}

#[test]
fn migration_runner_execution_result_validation_rejects_missing_step_result() {
    let contract = commerce_migration_runner_sql_contract();
    let plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();
    let mut result = commerce_migration_runner_execution_result(&plan, "2026-05-17T00:00:00Z");
    result.step_results.pop();

    let error = validate_commerce_migration_runner_execution_result(&plan, &result).unwrap_err();

    assert_eq!(
        error.code,
        "commerce-migration-runner-execution-result-invalid"
    );
    assert!(error.message.contains("step result count drift"));
}

#[test]
fn migration_runner_execution_result_validation_rejects_failed_step() {
    let contract = commerce_migration_runner_sql_contract();
    let plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();
    let mut result = commerce_migration_runner_execution_result(&plan, "2026-05-17T00:00:00Z");
    result.step_results[4].success = false;

    let error = validate_commerce_migration_runner_execution_result(&plan, &result).unwrap_err();

    assert_eq!(
        error.code,
        "commerce-migration-runner-execution-result-invalid"
    );
    assert!(error.message.contains("failed execution step"));
}

#[test]
fn migration_runner_execution_result_validation_rejects_missing_applied_record() {
    let contract = commerce_migration_runner_sql_contract();
    let plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();
    let mut result = commerce_migration_runner_execution_result(&plan, "2026-05-17T00:00:00Z");
    result.applied_records.pop();

    let error = validate_commerce_migration_runner_execution_result(&plan, &result).unwrap_err();

    assert_eq!(
        error.code,
        "commerce-migration-runner-execution-result-invalid"
    );
    assert!(error.message.contains("applied record count drift"));
}

#[test]
fn migration_runner_final_state_marks_schema_current_after_empty_database_execution() {
    let contract = commerce_migration_runner_sql_contract();
    let plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();
    let result = commerce_migration_runner_execution_result(&plan, "2026-05-17T00:00:00Z");

    let final_state = commerce_migration_runner_final_state(&contract, &[], &result).unwrap();

    assert_eq!(
        final_state.runner_name,
        "commerce.database.migration-runner"
    );
    assert_eq!(
        final_state.schema_version_table,
        "commerce_schema_migration"
    );
    assert_eq!(final_state.applied_count_before, 0);
    assert_eq!(
        final_state.newly_applied_count,
        commerce_migration_plan().len()
    );
    assert_eq!(
        final_state.applied_count_after,
        commerce_migration_plan().len()
    );
    assert_eq!(final_state.pending_count_after, 0);
    assert!(final_state.schema_is_current);
    assert_eq!(final_state.applied_migrations, result.applied_records);
    assert_eq!(
        validate_commerce_migration_runner_final_state(&contract, &[], &result, &final_state),
        Ok(())
    );
}

#[test]
fn migration_runner_final_state_appends_new_records_after_prefix_state() {
    let contract = commerce_migration_runner_sql_contract();
    let migrations = commerce_migration_plan();
    let before = vec![
        commerce_storage_applied_migration_record(&migrations[0], "2026-05-17T00:00:00Z"),
        commerce_storage_applied_migration_record(&migrations[1], "2026-05-17T00:01:00Z"),
    ];
    let plan = commerce_migration_runner_execution_plan(&contract, &before).unwrap();
    let result = commerce_migration_runner_execution_result(&plan, "2026-05-17T00:02:00Z");

    let final_state = commerce_migration_runner_final_state(&contract, &before, &result).unwrap();

    assert_eq!(final_state.applied_count_before, 2);
    assert_eq!(
        final_state.newly_applied_count,
        commerce_migration_plan().len() - 2
    );
    assert_eq!(
        final_state.applied_count_after,
        commerce_migration_plan().len()
    );
    assert_eq!(final_state.pending_count_after, 0);
    assert!(final_state.schema_is_current);
    assert_eq!(&final_state.applied_migrations[..2], before.as_slice());
    assert_eq!(final_state.applied_migrations[2].name, "0003_benefit.sql");
}

#[test]
fn migration_runner_final_state_rejects_result_not_matching_initial_state() {
    let contract = commerce_migration_runner_sql_contract();
    let migrations = commerce_migration_plan();
    let before = vec![
        commerce_storage_applied_migration_record(&migrations[0], "2026-05-17T00:00:00Z"),
        commerce_storage_applied_migration_record(&migrations[1], "2026-05-17T00:01:00Z"),
    ];
    let empty_database_plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();
    let result =
        commerce_migration_runner_execution_result(&empty_database_plan, "2026-05-17T00:02:00Z");

    let error = commerce_migration_runner_final_state(&contract, &before, &result).unwrap_err();

    assert_eq!(error.code, "commerce-migration-runner-final-state-invalid");
    assert!(error
        .message
        .contains("execution result must match initial applied state"));
}

#[test]
fn migration_runner_final_state_validation_rejects_duplicate_final_records() {
    let contract = commerce_migration_runner_sql_contract();
    let plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();
    let result = commerce_migration_runner_execution_result(&plan, "2026-05-17T00:00:00Z");
    let mut final_state = commerce_migration_runner_final_state(&contract, &[], &result).unwrap();
    final_state.applied_migrations[1] = final_state.applied_migrations[0].clone();

    let error =
        validate_commerce_migration_runner_final_state(&contract, &[], &result, &final_state)
            .unwrap_err();

    assert_eq!(error.code, "commerce-migration-runner-final-state-invalid");
    assert!(error
        .message
        .contains("final applied migration state invalid"));
}

#[test]
fn migration_runner_failed_execution_result_stops_at_failed_migration_step() {
    let contract = commerce_migration_runner_sql_contract();
    let plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();

    let result =
        commerce_migration_runner_failed_execution_result(&plan, 4, "2026-05-17T00:00:00Z")
            .unwrap();

    assert_eq!(result.runner_name, "commerce.database.migration-runner");
    assert_eq!(result.executed_steps, 5);
    assert!(!result.success);
    assert_eq!(result.applied_migrations, 0);
    assert_eq!(result.recorded_migrations, 0);
    assert!(result.applied_records.is_empty());
    assert_eq!(result.step_results.len(), 5);
    assert!(result.step_results.iter().take(4).all(|step| step.success));
    assert!(!result.step_results[4].success);
    assert_eq!(result.step_results[4].kind, "apply_migration_sql");
    assert_eq!(
        result.step_results[4].migration_name,
        Some("0001_core_idempotency.sql")
    );
}

#[test]
fn migration_runner_failure_recovery_resumes_from_failed_migration() {
    let contract = commerce_migration_runner_sql_contract();
    let plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();
    let result =
        commerce_migration_runner_failed_execution_result(&plan, 4, "2026-05-17T00:00:00Z")
            .unwrap();

    let recovery = commerce_migration_runner_failure_recovery(&contract, &[], &result).unwrap();

    assert_eq!(recovery.runner_name, "commerce.database.migration-runner");
    assert_eq!(recovery.failed_step_index, 4);
    assert_eq!(recovery.failed_step_kind, "apply_migration_sql");
    assert_eq!(recovery.failed_migration_sequence, Some(1));
    assert_eq!(
        recovery.failed_migration_name,
        Some("0001_core_idempotency.sql")
    );
    assert!(recovery.rollback_required);
    assert!(recovery.stop_execution);
    assert!(recovery.lock_was_acquired);
    assert!(recovery.lock_release_required);
    assert!(recovery.lock_owner_required);
    assert_eq!(recovery.release_lock_operation, Some("release_lock"));
    assert_eq!(recovery.applied_count_before, 0);
    assert_eq!(recovery.safely_recorded_count, 0);
    assert_eq!(recovery.applied_count_after, 0);
    assert_eq!(
        recovery.pending_count_after,
        commerce_migration_plan().len()
    );
    assert_eq!(
        recovery.resume_migration.as_ref().unwrap().name,
        "0001_core_idempotency.sql"
    );
    assert_eq!(
        validate_commerce_migration_runner_failure_recovery(&contract, &[], &result, &recovery),
        Ok(())
    );
}

#[test]
fn migration_runner_failure_recovery_requires_lock_release_after_acquired_lock() {
    let contract = commerce_migration_runner_sql_contract();
    let plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();
    let result =
        commerce_migration_runner_failed_execution_result(&plan, 4, "2026-05-17T00:00:00Z")
            .unwrap();

    let recovery = commerce_migration_runner_failure_recovery(&contract, &[], &result).unwrap();

    assert!(recovery.lock_was_acquired);
    assert!(recovery.lock_release_required);
    assert!(recovery.lock_owner_required);
    assert_eq!(recovery.release_lock_operation, Some("release_lock"));
}

#[test]
fn migration_runner_failure_recovery_does_not_release_before_lock_acquisition() {
    let contract = commerce_migration_runner_sql_contract();
    let plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();
    let result =
        commerce_migration_runner_failed_execution_result(&plan, 1, "2026-05-17T00:00:00Z")
            .unwrap();

    let recovery = commerce_migration_runner_failure_recovery(&contract, &[], &result).unwrap();

    assert_eq!(recovery.failed_step_kind, "acquire_lock");
    assert!(!recovery.lock_was_acquired);
    assert!(!recovery.lock_release_required);
    assert!(!recovery.lock_owner_required);
    assert_eq!(recovery.release_lock_operation, None);
}

#[test]
fn migration_runner_failure_recovery_rejects_missing_lock_release_after_acquired_lock() {
    let contract = commerce_migration_runner_sql_contract();
    let plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();
    let result =
        commerce_migration_runner_failed_execution_result(&plan, 4, "2026-05-17T00:00:00Z")
            .unwrap();
    let mut recovery = commerce_migration_runner_failure_recovery(&contract, &[], &result).unwrap();
    recovery.lock_release_required = false;

    let error =
        validate_commerce_migration_runner_failure_recovery(&contract, &[], &result, &recovery)
            .unwrap_err();

    assert_eq!(
        error.code,
        "commerce-migration-runner-failure-recovery-invalid"
    );
    assert!(error
        .message
        .contains("migration runner failure recovery drift"));
    assert!(error.message.contains("lock_release_required"));
}

#[test]
fn migration_runner_failure_recovery_preserves_successfully_recorded_prefix() {
    let contract = commerce_migration_runner_sql_contract();
    let plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();

    let result =
        commerce_migration_runner_failed_execution_result(&plan, 8, "2026-05-17T00:03:00Z")
            .unwrap();

    let recovery = commerce_migration_runner_failure_recovery(&contract, &[], &result).unwrap();

    assert_eq!(recovery.failed_step_index, 8);
    assert_eq!(recovery.failed_migration_name, Some("0003_benefit.sql"));
    assert_eq!(recovery.safely_recorded_count, 2);
    assert_eq!(recovery.applied_count_after, 2);
    assert_eq!(
        recovery.pending_count_after,
        commerce_migration_plan().len() - 2
    );
    assert_eq!(
        recovery.applied_migrations[0].name,
        "0001_core_idempotency.sql"
    );
    assert_eq!(
        recovery.applied_migrations[1].name,
        "0002_account_ledger.sql"
    );
    assert_eq!(
        recovery.resume_migration.as_ref().unwrap().name,
        "0003_benefit.sql"
    );
}

#[test]
fn migration_runner_failure_recovery_rejects_continued_execution_after_failed_step() {
    let contract = commerce_migration_runner_sql_contract();
    let plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();
    let mut result =
        commerce_migration_runner_failed_execution_result(&plan, 4, "2026-05-17T00:00:00Z")
            .unwrap();
    result.step_results.push(result.step_results[4].clone());
    result.step_results[5].success = true;
    result.executed_steps = result.step_results.len();

    let error = commerce_migration_runner_failure_recovery(&contract, &[], &result).unwrap_err();

    assert_eq!(
        error.code,
        "commerce-migration-runner-failure-recovery-invalid"
    );
    assert!(error
        .message
        .contains("failed execution result must stop at first failed step"));
}

#[test]
fn migration_runner_failure_recovery_rejects_recorded_failed_migration() {
    let contract = commerce_migration_runner_sql_contract();
    let plan = commerce_migration_runner_execution_plan(&contract, &[]).unwrap();
    let mut result =
        commerce_migration_runner_failed_execution_result(&plan, 4, "2026-05-17T00:00:00Z")
            .unwrap();
    result
        .applied_records
        .push(commerce_storage_applied_migration_record(
            &commerce_migration_plan()[0],
            "2026-05-17T00:00:00Z",
        ));
    result.recorded_migrations = 1;

    let error = commerce_migration_runner_failure_recovery(&contract, &[], &result).unwrap_err();

    assert_eq!(
        error.code,
        "commerce-migration-runner-failure-recovery-invalid"
    );
    assert!(error
        .message
        .contains("recorded migrations must be limited to successful record steps"));
}

#[test]
fn storage_capability_manifest_is_complete_for_first_slice_runtime_bootstrap() {
    let manifest = commerce_storage_capability_manifest();

    assert_eq!(manifest.tables.len(), 108);
    assert_eq!(manifest.indexes.len(), 134);
    assert_eq!(manifest.migration_plan.len(), 14);
    assert_eq!(manifest.repository_bindings.len(), 17);
    assert_eq!(manifest.business_repositories.len(), 16);
    assert!(manifest
        .transaction_boundary
        .covered_repositories
        .contains(&"idempotency.repository"));
    assert!(manifest
        .business_repositories
        .iter()
        .all(|catalog| catalog.requires_transaction));
}

#[test]
fn migration_plan_exposes_host_consumable_order_and_sql_sources() {
    let plan = commerce_migration_plan();

    assert_eq!(plan.len(), commerce_migration_names().len());
    assert_eq!(plan[0].sequence, 1);
    assert_eq!(plan[0].name, "0001_core_idempotency.sql");
    assert_eq!(plan[0].domain, "core");
    assert_eq!(
        plan[0].source_path,
        "migrations/0001_commerce_foundation.sql"
    );
    assert_eq!(plan[0].sql, commerce_initial_migration_sql());
    assert!(plan[0].checksum.starts_with("commerce-migration-checksum:"));
    assert!(plan[0]
        .required_tables
        .contains(&"commerce_idempotency_key"));

    assert_eq!(
        plan.iter()
            .map(|migration| migration.name)
            .collect::<Vec<_>>(),
        commerce_migration_names(),
    );
    assert_eq!(
        plan.iter()
            .map(|migration| migration.domain)
            .collect::<Vec<_>>(),
        vec![
            "core",
            "account",
            "benefit",
            "entitlement",
            "membership",
            "promotion",
            "catalog",
            "inventory",
            "order",
            "payment",
            "exchange",
            "invoice",
            "billing",
            "shop",
        ],
    );
}

#[test]
fn migration_plan_covers_first_slice_tables_by_domain() {
    let plan = commerce_migration_plan();

    let declared_tables = plan
        .iter()
        .flat_map(|migration| migration.required_tables.iter().copied())
        .collect::<Vec<_>>();

    for table in commerce_database_tables() {
        assert!(
            declared_tables.contains(&table),
            "migration plan must cover table {table}",
        );
    }

    let account = plan
        .iter()
        .find(|migration| migration.domain == "account")
        .unwrap();
    assert_eq!(
        account.required_tables,
        vec![
            "commerce_account",
            "commerce_account_ledger_entry",
            "commerce_billing_prehold",
            "commerce_billing_history",
        ],
    );
    assert_eq!(
        account.source_path,
        "migrations/0001_commerce_foundation.sql"
    );
    assert_eq!(account.sql, commerce_initial_migration_sql());

    let benefit = plan
        .iter()
        .find(|migration| migration.domain == "benefit")
        .unwrap();
    assert_eq!(benefit.required_tables, vec!["benefit_definition"]);

    let entitlement = plan
        .iter()
        .find(|migration| migration.domain == "entitlement")
        .unwrap();
    assert_eq!(
        entitlement.required_tables,
        vec![
            "entitlement_grant",
            "entitlement_account",
            "entitlement_ledger_entry",
        ],
    );

    let membership = plan
        .iter()
        .find(|migration| migration.domain == "membership")
        .unwrap();
    assert_eq!(
        membership.required_tables,
        vec![
            "membership_plan",
            "membership_plan_version",
            "membership_plan_benefit",
            "membership_package_group",
            "membership_package",
            "membership_subscription",
            "membership_period",
        ],
    );

    let promotion = plan
        .iter()
        .find(|migration| migration.domain == "promotion")
        .unwrap();
    assert_eq!(
        promotion.required_tables,
        vec![
            "promotion_offer",
            "promotion_offer_version",
            "promotion_coupon_stock",
            "promotion_code",
            "promotion_user_coupon",
            "promotion_coupon_ledger_entry",
            "promotion_discount_application",
            "promotion_discount_allocation",
        ],
    );

    let payment = plan
        .iter()
        .find(|migration| migration.domain == "payment")
        .unwrap();
    assert_eq!(
        payment.required_tables,
        vec![
            "commerce_payment_intent",
            "commerce_payment_attempt",
            "commerce_payment_webhook_event",
            "commerce_payment_method",
            "commerce_payment_provider",
            "commerce_payment_provider_account",
            "commerce_payment_channel",
            "commerce_payment_route_rule",
            "commerce_payment_provider_capability",
            "commerce_payment_operation_attempt",
            "commerce_payment_route_decision",
            "commerce_payment_capture",
            "commerce_payment_webhook_delivery",
            "commerce_payment_statement",
            "commerce_payment_statement_item",
            "commerce_payment_reconciliation_run",
            "commerce_payment_reconciliation_item",
            "commerce_payment_fee",
            "commerce_payment_dispute",
            "commerce_payment_dispute_event",
            "commerce_refund",
            "commerce_refund_item",
            "commerce_refund_attempt",
            "commerce_refund_event",
            "commerce_after_sales_request",
            "commerce_after_sales_item",
            "commerce_after_sales_return_shipment",
            "commerce_after_sales_event",
        ],
    );

    let shop = plan
        .iter()
        .find(|migration| migration.domain == "shop")
        .unwrap();
    assert_eq!(
        shop.required_tables,
        vec![
            "commerce_shop",
            "commerce_shop_application",
            "commerce_shop_verification",
            "commerce_shop_status_event",
            "commerce_shop_channel",
            "commerce_shop_fulfillment_profile",
            "commerce_shop_settlement_profile",
            "commerce_shop_metric_snapshot",
            "commerce_shop_readiness",
            "commerce_shop_business_hour",
            "commerce_shop_service_area",
            "commerce_shop_policy",
            "commerce_shop_deposit_account",
            "commerce_shop_risk_signal",
            "commerce_shop_category_binding",
            "commerce_shop_brand_authorization",
            "commerce_shop_qualification",
            "commerce_shop_customer_service",
            "commerce_shop_return_address",
            "commerce_shop_shipping_template",
        ]
    );
    assert_eq!(shop.source_path, "migrations/0001_commerce_foundation.sql");
    assert_eq!(shop.sql, commerce_initial_migration_sql());
}

#[test]
fn validates_standard_migration_plan_for_host_preflight() {
    assert_eq!(
        validate_commerce_migration_plan(&commerce_migration_plan()),
        Ok(())
    );
}

#[test]
fn migration_plan_validation_rejects_sequence_drift() {
    let mut plan = commerce_migration_plan();
    plan[1].sequence = 7;

    let error = validate_commerce_migration_plan(&plan).unwrap_err();

    assert_eq!(error.code, "commerce-migration-plan-invalid");
    assert!(error.message.contains("sequence drift"));
}

#[test]
fn migration_plan_validation_rejects_name_drift() {
    let mut plan = commerce_migration_plan();
    plan[0].name = "0001_wrong.sql";

    let error = validate_commerce_migration_plan(&plan).unwrap_err();

    assert_eq!(error.code, "commerce-migration-plan-invalid");
    assert!(error.message.contains("name drift"));
}

#[test]
fn migration_plan_validation_rejects_checksum_drift() {
    let mut plan = commerce_migration_plan();
    plan[0].checksum = "commerce-migration-checksum:bad".to_string();

    let error = validate_commerce_migration_plan(&plan).unwrap_err();

    assert_eq!(error.code, "commerce-migration-plan-invalid");
    assert!(error.message.contains("checksum drift"));
}

#[test]
fn migration_plan_validation_rejects_missing_sql_text() {
    let mut plan = commerce_migration_plan();
    plan[0].sql = "";

    let error = validate_commerce_migration_plan(&plan).unwrap_err();

    assert_eq!(error.code, "commerce-migration-plan-invalid");
    assert!(error.message.contains("SQL text is required"));
}

#[test]
fn migration_plan_validation_rejects_missing_required_table_coverage() {
    let mut plan = commerce_migration_plan();
    plan[0].required_tables.clear();

    let error = validate_commerce_migration_plan(&plan).unwrap_err();

    assert_eq!(error.code, "commerce-migration-plan-invalid");
    assert!(error
        .message
        .contains("migration plan must cover table commerce_idempotency_key"));
}

fn table_definition<'a>(sql: &'a str, table_name: &str) -> &'a str {
    let start_marker = format!("CREATE TABLE IF NOT EXISTS {table_name} (");
    let start = sql
        .find(&start_marker)
        .unwrap_or_else(|| panic!("missing table definition for {table_name}"));
    let rest = &sql[start..];
    let end = rest
        .find("\n);")
        .unwrap_or_else(|| panic!("unterminated table definition for {table_name}"));
    &rest[..end]
}
