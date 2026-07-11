//! Commerce capability database bootstrap composition.
//!
//! Invoice schema authority lives in `sdkwork-invoice-database-bootstrap`.
//! Claw Router standalone mode composes the appbase commerce tables required by
//! the local stores here so list/search paths start from a complete schema.

use std::collections::BTreeMap;
use std::sync::OnceLock;

use sdkwork_invoice_database_bootstrap::{
    invoice_foundation_migration_sql, invoice_foundation_migration_sqlite,
    invoice_module_table_names,
};

#[derive(Debug, Clone)]
pub struct CommerceRechargePackageSeed {
    pub status: &'static str,
    pub currency_code: &'static str,
    pub price_amount: &'static str,
    pub bonus_points: i64,
    pub sort_weight: i32,
    pub external_id: i64,
    pub package_no: &'static str,
    pub name: &'static str,
}

#[derive(Debug, Clone)]
pub struct CommerceRechargeSettingsSeed {
    pub rule_no: &'static str,
    pub base_currency_code: &'static str,
    pub currency_to_cny_rates: BTreeMap<&'static str, &'static str>,
    pub source_asset_type: &'static str,
    pub target_asset_type: &'static str,
    pub rate: &'static str,
}

static COMMERCE_POSTGRES_SQL: OnceLock<String> = OnceLock::new();
static COMMERCE_SQLITE_SQL: OnceLock<String> = OnceLock::new();

pub fn commerce_recharge_package_seeds() -> Vec<CommerceRechargePackageSeed> {
    vec![
        CommerceRechargePackageSeed {
            status: "active",
            currency_code: "CNY",
            price_amount: "5.00",
            bonus_points: 0,
            sort_weight: 1,
            external_id: 1,
            package_no: "bootstrap-admin-recharge-1",
            name: "CNY 5 points recharge",
        },
        CommerceRechargePackageSeed {
            status: "active",
            currency_code: "CNY",
            price_amount: "10.00",
            bonus_points: 0,
            sort_weight: 2,
            external_id: 2,
            package_no: "bootstrap-admin-recharge-2",
            name: "CNY 10 points recharge",
        },
        CommerceRechargePackageSeed {
            status: "active",
            currency_code: "CNY",
            price_amount: "20.00",
            bonus_points: 0,
            sort_weight: 3,
            external_id: 3,
            package_no: "bootstrap-admin-recharge-3",
            name: "CNY 20 points recharge",
        },
        CommerceRechargePackageSeed {
            status: "active",
            currency_code: "CNY",
            price_amount: "30.00",
            bonus_points: 0,
            sort_weight: 4,
            external_id: 4,
            package_no: "bootstrap-admin-recharge-4",
            name: "CNY 30 points recharge",
        },
        CommerceRechargePackageSeed {
            status: "active",
            currency_code: "CNY",
            price_amount: "50.00",
            bonus_points: 0,
            sort_weight: 5,
            external_id: 5,
            package_no: "bootstrap-admin-recharge-5",
            name: "CNY 50 points recharge",
        },
        CommerceRechargePackageSeed {
            status: "active",
            currency_code: "CNY",
            price_amount: "100.00",
            bonus_points: 0,
            sort_weight: 6,
            external_id: 6,
            package_no: "bootstrap-admin-recharge-6",
            name: "CNY 100 points recharge",
        },
        CommerceRechargePackageSeed {
            status: "active",
            currency_code: "CNY",
            price_amount: "200.00",
            bonus_points: 0,
            sort_weight: 7,
            external_id: 7,
            package_no: "bootstrap-admin-recharge-7",
            name: "CNY 200 points recharge",
        },
        CommerceRechargePackageSeed {
            status: "active",
            currency_code: "CNY",
            price_amount: "500.00",
            bonus_points: 0,
            sort_weight: 8,
            external_id: 8,
            package_no: "bootstrap-admin-recharge-8",
            name: "CNY 500 points recharge",
        },
        CommerceRechargePackageSeed {
            status: "active",
            currency_code: "CNY",
            price_amount: "1000.00",
            bonus_points: 0,
            sort_weight: 9,
            external_id: 9,
            package_no: "bootstrap-admin-recharge-9",
            name: "CNY 1000 points recharge",
        },
        CommerceRechargePackageSeed {
            status: "inactive",
            currency_code: "USD",
            price_amount: "1.00",
            bonus_points: 0,
            sort_weight: 10,
            external_id: 10,
            package_no: "bootstrap-admin-recharge-10",
            name: "USD 1 points recharge",
        },
        CommerceRechargePackageSeed {
            status: "inactive",
            currency_code: "USD",
            price_amount: "2.00",
            bonus_points: 0,
            sort_weight: 11,
            external_id: 11,
            package_no: "bootstrap-admin-recharge-11",
            name: "USD 2 points recharge",
        },
        CommerceRechargePackageSeed {
            status: "inactive",
            currency_code: "USD",
            price_amount: "5.00",
            bonus_points: 0,
            sort_weight: 12,
            external_id: 12,
            package_no: "bootstrap-admin-recharge-12",
            name: "USD 5 points recharge",
        },
        CommerceRechargePackageSeed {
            status: "inactive",
            currency_code: "USD",
            price_amount: "10.00",
            bonus_points: 0,
            sort_weight: 13,
            external_id: 13,
            package_no: "bootstrap-admin-recharge-13",
            name: "USD 10 points recharge",
        },
        CommerceRechargePackageSeed {
            status: "inactive",
            currency_code: "USD",
            price_amount: "20.00",
            bonus_points: 0,
            sort_weight: 14,
            external_id: 14,
            package_no: "bootstrap-admin-recharge-14",
            name: "USD 20 points recharge",
        },
        CommerceRechargePackageSeed {
            status: "inactive",
            currency_code: "USD",
            price_amount: "50.00",
            bonus_points: 0,
            sort_weight: 15,
            external_id: 15,
            package_no: "bootstrap-admin-recharge-15",
            name: "USD 50 points recharge",
        },
        CommerceRechargePackageSeed {
            status: "inactive",
            currency_code: "USD",
            price_amount: "100.00",
            bonus_points: 0,
            sort_weight: 16,
            external_id: 16,
            package_no: "bootstrap-admin-recharge-16",
            name: "USD 100 points recharge",
        },
        CommerceRechargePackageSeed {
            status: "inactive",
            currency_code: "USD",
            price_amount: "200.00",
            bonus_points: 0,
            sort_weight: 17,
            external_id: 17,
            package_no: "bootstrap-admin-recharge-17",
            name: "USD 200 points recharge",
        },
        CommerceRechargePackageSeed {
            status: "inactive",
            currency_code: "USD",
            price_amount: "500.00",
            bonus_points: 0,
            sort_weight: 18,
            external_id: 18,
            package_no: "bootstrap-admin-recharge-18",
            name: "USD 500 points recharge",
        },
    ]
}

pub fn commerce_recharge_settings_seeds() -> Vec<CommerceRechargeSettingsSeed> {
    vec![CommerceRechargeSettingsSeed {
        rule_no: "CASH_TO_POINTS",
        base_currency_code: "CNY",
        currency_to_cny_rates: BTreeMap::from([("CNY", "1"), ("USD", "7")]),
        source_asset_type: "cash",
        target_asset_type: "points",
        rate: "10",
    }]
}

pub fn commerce_database_tables() -> Vec<&'static str> {
    let mut tables = vec![
        "commerce_product_category",
        "commerce_product_attribute",
        "commerce_product_attribute_value",
        "commerce_product_category_attribute",
        "commerce_product_spu",
        "commerce_product_spu_category",
        "commerce_product_sku",
        "commerce_product_sku_attribute",
        "commerce_product_media",
        "commerce_price_list",
        "commerce_price_list_item",
        "commerce_recharge_package",
        "commerce_exchange_rule",
        "promotion_offer",
        "promotion_offer_version",
        "promotion_coupon_stock",
        "promotion_code",
        "promotion_user_coupon",
        "promotion_discount_application",
        "promotion_coupon_ledger_entry",
        "commerce_account",
        "commerce_account_ledger_entry",
        "commerce_settlement",
        "commerce_statement",
        "commerce_order",
        "commerce_order_item",
        "commerce_order_amount_breakdown",
        "commerce_order_event",
        "commerce_payment_intent",
        "commerce_payment_attempt",
        "commerce_payment_route_decision",
        "commerce_payment_operation_attempt",
        "commerce_payment_webhook_event",
        "commerce_payment_webhook_delivery",
        "commerce_payment_statement",
        "commerce_payment_statement_item",
        "commerce_payment_reconciliation_run",
        "commerce_payment_reconciliation_item",
        "commerce_refund",
        "commerce_refund_attempt",
        "commerce_refund_item",
        "commerce_refund_event",
        "commerce_payment_provider",
        "commerce_payment_provider_account",
        "commerce_payment_method",
        "commerce_payment_channel",
        "commerce_payment_route_rule",
        "commerce_inventory_stock",
        "commerce_inventory_reservation",
        "commerce_inventory_movement",
        "commerce_fulfillment_order",
        "commerce_shipment",
        "commerce_shipment_tracking_event",
    ];
    tables.extend(invoice_module_table_names());
    tables
}

pub fn commerce_database_indexes() -> Vec<&'static str> {
    let mut indexes = vec![
        "uk_commerce_product_category_tenant_no",
        "idx_commerce_product_category_tenant_parent_status",
        "uk_commerce_product_attribute_tenant_no",
        "idx_commerce_product_attribute_tenant_status",
        "uk_commerce_product_category_attribute_tenant_refs",
        "idx_commerce_product_category_attribute_tenant_category",
        "uk_commerce_product_spu_tenant_no",
        "idx_commerce_product_spu_tenant_status_updated",
        "uk_commerce_product_spu_category_tenant_refs",
        "idx_commerce_product_spu_category_tenant_category",
        "uk_commerce_product_sku_tenant_no",
        "idx_commerce_product_sku_tenant_spu_status_updated",
        "uk_commerce_product_sku_attribute_tenant_refs",
        "uk_commerce_product_media_tenant_owner_role",
        "uk_commerce_price_list_tenant_org_no",
        "idx_commerce_price_list_tenant_filter",
        "uk_commerce_recharge_package_tenant_no",
        "idx_commerce_recharge_package_tenant_status_sort",
        "uk_commerce_exchange_rule_tenant_org_assets",
        "idx_commerce_exchange_rule_tenant_status",
        "idx_promotion_offer_tenant_status_updated",
        "idx_promotion_offer_version_offer",
        "idx_promotion_coupon_stock_tenant_offer",
        "uk_promotion_code_tenant_code",
        "idx_promotion_code_tenant_stock_status",
        "idx_promotion_user_coupon_tenant_owner_status",
        "uk_commerce_account_tenant_owner_asset",
        "idx_commerce_account_ledger_tenant_account_created",
        "uk_commerce_settlement_tenant_usage",
        "idx_commerce_settlement_tenant_status_created",
        "idx_commerce_statement_tenant_period",
        "uk_commerce_order_tenant_no",
        "idx_commerce_order_owner_status_created_at",
        "idx_commerce_order_event_tenant_order_created",
        "idx_commerce_order_item_tenant_order",
        "uk_commerce_payment_intent_tenant_idempotency",
        "idx_commerce_payment_intent_tenant_order",
        "idx_commerce_payment_attempt_tenant_intent",
        "idx_commerce_payment_attempt_provider_trade",
        "uk_commerce_payment_route_decision_tenant_attempt",
        "uk_commerce_payment_operation_attempt_tenant_idempotency",
        "uk_commerce_payment_webhook_event_tenant_provider_event",
        "uk_commerce_payment_webhook_event_tenant_provider_nonce",
        "uk_commerce_payment_webhook_delivery_tenant_provider_event",
        "uk_commerce_payment_webhook_delivery_tenant_provider_nonce",
        "idx_commerce_payment_statement_tenant_provider_period",
        "idx_commerce_payment_statement_item_statement",
        "idx_commerce_payment_reconciliation_run_tenant_provider_period",
        "idx_commerce_payment_reconciliation_item_run",
        "uk_commerce_refund_tenant_no",
        "idx_commerce_refund_tenant_attempt",
        "uk_commerce_refund_attempt_tenant_provider_refund",
        "idx_commerce_refund_item_tenant_refund",
        "idx_commerce_refund_event_tenant_refund",
        "uk_commerce_payment_provider_tenant_code",
        "uk_commerce_payment_provider_account_tenant_no",
        "idx_commerce_payment_provider_account_tenant_provider_scope",
        "uk_commerce_payment_method_tenant_method",
        "idx_commerce_payment_channel_tenant_account",
        "idx_commerce_payment_route_rule_tenant_filters",
        "idx_commerce_inventory_stock_tenant_sku",
        "idx_commerce_inventory_reservation_tenant_sku_status",
        "uk_commerce_inventory_movement_tenant_no",
        "idx_commerce_fulfillment_order_tenant_order",
        "idx_commerce_shipment_tenant_fulfillment",
        "idx_commerce_shipment_tracking_event_tenant_shipment_time",
    ];
    indexes.extend([
        "idx_commerce_invoice_title_owner",
        "idx_commerce_invoice_owner",
        "idx_commerce_invoice_tenant_order",
        "idx_commerce_invoice_item_invoice",
    ]);
    indexes
}

pub fn commerce_initial_migration_sql() -> &'static str {
    COMMERCE_POSTGRES_SQL
        .get_or_init(|| {
            format!(
                "{}\n{}",
                APPBASE_COMMERCE_POSTGRES_SQL,
                invoice_foundation_migration_sql()
            )
        })
        .as_str()
}

pub fn commerce_initial_migration_sqlite() -> &'static str {
    COMMERCE_SQLITE_SQL
        .get_or_init(|| {
            format!(
                "{}\n{}",
                APPBASE_COMMERCE_SQLITE_SQL,
                invoice_foundation_migration_sqlite()
            )
        })
        .as_str()
}

const APPBASE_COMMERCE_POSTGRES_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS commerce_product_category (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    category_no TEXT NOT NULL,
    parent_category_id TEXT,
    name TEXT NOT NULL,
    sort_weight BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_product_attribute (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    attribute_no TEXT NOT NULL,
    name TEXT NOT NULL,
    value_type TEXT NOT NULL,
    status TEXT NOT NULL,
    sort_weight BIGINT NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_product_attribute_value (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    attribute_id TEXT NOT NULL,
    value_no TEXT,
    display_value TEXT,
    sort_weight BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_product_category_attribute (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    category_id TEXT NOT NULL,
    attribute_id TEXT NOT NULL,
    required BOOLEAN NOT NULL DEFAULT FALSE,
    searchable BOOLEAN NOT NULL DEFAULT FALSE,
    filterable BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_product_spu (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    spu_no TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    product_type TEXT NOT NULL,
    status TEXT NOT NULL,
    visible_surfaces TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_product_spu_category (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    spu_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    primary_flag BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_product_sku (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    spu_id TEXT NOT NULL,
    sku_no TEXT NOT NULL,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    price_amount TEXT NOT NULL,
    original_price_amount TEXT,
    currency_code TEXT NOT NULL,
    fulfillment_type TEXT NOT NULL,
    inventory_tracking TEXT NOT NULL,
    status TEXT NOT NULL,
    spec_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_product_sku_attribute (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    sku_id TEXT NOT NULL,
    attribute_id TEXT NOT NULL,
    attribute_value_id TEXT,
    custom_value TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_product_media (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    owner_type TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    media_role TEXT NOT NULL,
    drive_uri TEXT,
    resource_snapshot TEXT,
    alt_text TEXT,
    sort_order BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_price_list (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    price_list_no TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    market_code TEXT,
    customer_segment TEXT,
    starts_at TEXT,
    ends_at TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_price_list_item (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    price_list_id TEXT NOT NULL,
    sku_id TEXT NOT NULL,
    price_amount TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_recharge_package (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    external_id BIGINT NOT NULL,
    package_no TEXT NOT NULL,
    sku_id TEXT,
    name TEXT NOT NULL,
    price_amount TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    bonus_points BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    valid_from TEXT,
    valid_to TEXT,
    sort_weight BIGINT NOT NULL DEFAULT 0,
    request_no TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_exchange_rule (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    rule_no TEXT NOT NULL,
    source_asset_type TEXT NOT NULL,
    target_asset_type TEXT NOT NULL,
    rate TEXT NOT NULL,
    status TEXT NOT NULL,
    remark TEXT,
    request_no TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_offer (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    offer_no TEXT NOT NULL,
    offer_code TEXT NOT NULL,
    name TEXT NOT NULL,
    offer_type TEXT NOT NULL,
    audience_scope TEXT,
    combinability TEXT,
    priority BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    current_offer_version_id TEXT,
    starts_at TEXT,
    ends_at TEXT,
    received_count BIGINT NOT NULL DEFAULT 0,
    redeemed_count BIGINT NOT NULL DEFAULT 0,
    request_no TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_offer_version (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    offer_id TEXT NOT NULL,
    version_no BIGINT NOT NULL,
    lifecycle_status TEXT NOT NULL,
    discount_type TEXT NOT NULL,
    discount_value TEXT NOT NULL,
    minimum_amount TEXT,
    maximum_discount_amount TEXT,
    description TEXT,
    request_no TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_coupon_stock (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    stock_no TEXT NOT NULL,
    name TEXT NOT NULL,
    offer_id TEXT NOT NULL,
    offer_version_id TEXT NOT NULL,
    stock_type TEXT NOT NULL,
    total_quantity BIGINT NOT NULL DEFAULT 0,
    available_quantity BIGINT NOT NULL DEFAULT 0,
    claimed_quantity BIGINT NOT NULL DEFAULT 0,
    redeemed_quantity BIGINT NOT NULL DEFAULT 0,
    starts_at TEXT,
    ends_at TEXT,
    status TEXT NOT NULL,
    request_no TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_code (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    code_no TEXT NOT NULL,
    stock_id TEXT NOT NULL,
    offer_id TEXT NOT NULL,
    offer_version_id TEXT NOT NULL,
    promotion_code TEXT NOT NULL,
    code_type TEXT NOT NULL,
    max_claims BIGINT NOT NULL DEFAULT 1,
    claimed_quantity BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    starts_at TEXT,
    expires_at TEXT,
    claimed_at TEXT,
    redeemed_at TEXT,
    request_no TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_user_coupon (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    owner_user_id TEXT NOT NULL,
    promotion_code_id TEXT NOT NULL,
    stock_id TEXT NOT NULL,
    offer_id TEXT NOT NULL,
    offer_version_id TEXT NOT NULL,
    status TEXT NOT NULL,
    claimed_at TEXT,
    redeemed_at TEXT,
    request_no TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_discount_application (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    order_id TEXT,
    offer_id TEXT,
    discount_amount TEXT NOT NULL DEFAULT '0',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_coupon_ledger_entry (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    coupon_id TEXT,
    direction TEXT NOT NULL,
    quantity BIGINT NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_account (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    owner_user_id TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    available_amount TEXT NOT NULL DEFAULT '0',
    frozen_amount TEXT NOT NULL DEFAULT '0',
    version BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_account_ledger_entry (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    account_id TEXT NOT NULL,
    owner_user_id TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    direction TEXT NOT NULL,
    amount TEXT NOT NULL,
    balance_after TEXT NOT NULL,
    business_type TEXT NOT NULL,
    transaction_no TEXT NOT NULL,
    request_no TEXT,
    idempotency_key TEXT,
    source_type TEXT,
    source_id TEXT,
    remark TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_settlement (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    owner_id BIGINT,
    request_id TEXT NOT NULL,
    trace_id TEXT,
    status BIGINT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    settlement_no TEXT NOT NULL,
    usage_fact_id BIGINT NOT NULL,
    account_id TEXT NOT NULL,
    account_ledger_entry_id TEXT,
    asset_type TEXT NOT NULL,
    direction TEXT NOT NULL,
    amount TEXT NOT NULL,
    points BIGINT NOT NULL DEFAULT 0,
    tokens BIGINT NOT NULL DEFAULT 0,
    currency TEXT NOT NULL,
    price_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    settlement_status TEXT NOT NULL,
    settled_at TEXT,
    failure_code TEXT,
    failure_message TEXT
);

CREATE TABLE IF NOT EXISTS commerce_statement (
    id BIGINT NOT NULL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    owner_id BIGINT,
    statement_no TEXT NOT NULL,
    period TEXT,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    total_tokens BIGINT NOT NULL DEFAULT 0,
    total_cost TEXT NOT NULL DEFAULT '0',
    payment_status BIGINT,
    statement_status BIGINT,
    invoice_id TEXT,
    due_at TEXT,
    status BIGINT NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_order (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    owner_user_id TEXT NOT NULL,
    order_no TEXT NOT NULL,
    order_type TEXT,
    subject TEXT NOT NULL,
    status TEXT NOT NULL,
    pay_status TEXT,
    total_amount TEXT,
    currency_code TEXT NOT NULL,
    request_no TEXT,
    idempotency_key TEXT,
    paid_at TEXT,
    cancelled_at TEXT,
    expired_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_order_item (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    order_id TEXT NOT NULL,
    sku_id TEXT,
    item_title TEXT,
    quantity BIGINT NOT NULL DEFAULT 1,
    unit_price_amount TEXT,
    total_amount TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_order_amount_breakdown (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    order_id TEXT NOT NULL,
    payable_amount TEXT NOT NULL,
    currency_code TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_order_event (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    event_no TEXT NOT NULL,
    order_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    actor_id TEXT,
    reason_code TEXT,
    message TEXT,
    payload_json TEXT,
    request_id TEXT,
    idempotency_key TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_intent (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    owner_user_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    merchant_order_no TEXT,
    subject TEXT NOT NULL,
    provider TEXT,
    provider_code TEXT,
    payment_method TEXT,
    scene_code TEXT,
    amount TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    status TEXT NOT NULL,
    request_no TEXT,
    idempotency_key TEXT NOT NULL,
    metadata_json TEXT,
    provider_native_json TEXT,
    next_action_json TEXT,
    captured_amount TEXT,
    refunded_amount TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_attempt (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    owner_user_id TEXT NOT NULL,
    payment_intent_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    attempt_no TEXT,
    payment_method TEXT,
    provider TEXT,
    provider_code TEXT,
    channel_id TEXT,
    provider_transaction_id TEXT,
    out_trade_no TEXT,
    amount TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    status TEXT NOT NULL,
    callback_payload TEXT,
    request_no TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    paid_at TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_route_decision (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    payment_intent_id TEXT NOT NULL,
    payment_attempt_id TEXT NOT NULL,
    route_rule_id TEXT,
    channel_id TEXT,
    provider_code TEXT,
    provider_account_id TEXT,
    method_code TEXT,
    scene_code TEXT,
    country_code TEXT,
    currency_code TEXT,
    amount TEXT,
    risk_level TEXT,
    decision_reason TEXT,
    fallback_from_channel_id TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_operation_attempt (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    operation_no TEXT NOT NULL,
    provider_code TEXT NOT NULL,
    provider_account_id TEXT,
    channel_id TEXT,
    operation_code TEXT NOT NULL,
    sdkwork_resource_type TEXT NOT NULL,
    sdkwork_resource_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    request_digest TEXT NOT NULL,
    response_digest TEXT,
    native_request_id TEXT,
    native_trade_id TEXT,
    native_refund_id TEXT,
    http_status BIGINT,
    provider_error_code TEXT,
    provider_error_message TEXT,
    retryable BOOLEAN,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_webhook_event (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    provider TEXT NOT NULL,
    provider_code TEXT,
    event_id TEXT NOT NULL,
    event_type TEXT,
    nonce TEXT NOT NULL,
    signature TEXT,
    request_timestamp BIGINT,
    out_trade_no TEXT,
    transaction_id TEXT,
    payload TEXT,
    payload_digest TEXT,
    status TEXT NOT NULL,
    retries BIGINT NOT NULL DEFAULT 0,
    last_error TEXT,
    message TEXT,
    request_no TEXT,
    idempotency_key TEXT,
    received_at TEXT,
    created_at TEXT NOT NULL,
    processed_at TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_webhook_delivery (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    delivery_no TEXT NOT NULL,
    provider_code TEXT NOT NULL,
    provider_account_id TEXT,
    event_id TEXT NOT NULL,
    nonce TEXT NOT NULL,
    request_timestamp BIGINT,
    signature TEXT,
    signature_algorithm TEXT,
    headers_json TEXT,
    payload_digest TEXT,
    payload_ref TEXT,
    source_ip TEXT,
    user_agent TEXT,
    verification_status TEXT NOT NULL,
    delivery_status TEXT NOT NULL,
    failure_code TEXT,
    failure_message TEXT,
    received_at TEXT NOT NULL,
    verified_at TEXT,
    normalized_event_id TEXT,
    processed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_statement (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    statement_no TEXT NOT NULL,
    provider_code TEXT NOT NULL,
    provider_account_id TEXT,
    statement_type TEXT NOT NULL,
    settlement_currency TEXT NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    provider_statement_id TEXT,
    file_ref TEXT,
    file_digest TEXT,
    download_status TEXT NOT NULL,
    parse_status TEXT NOT NULL,
    row_count BIGINT NOT NULL DEFAULT 0,
    total_amount TEXT NOT NULL,
    fee_amount TEXT NOT NULL,
    net_amount TEXT NOT NULL,
    downloaded_at TEXT,
    parsed_at TEXT,
    request_no TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_statement_item (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    statement_id TEXT NOT NULL,
    provider_code TEXT NOT NULL,
    provider_account_id TEXT,
    row_no TEXT NOT NULL,
    native_trade_id TEXT,
    native_refund_id TEXT,
    native_order_no TEXT,
    sdkwork_out_trade_no TEXT,
    sdkwork_out_refund_no TEXT,
    transaction_type TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    settled_at TEXT,
    gross_amount TEXT NOT NULL,
    fee_amount TEXT NOT NULL,
    net_amount TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    provider_status TEXT NOT NULL,
    raw_row_digest TEXT NOT NULL,
    metadata_json TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_reconciliation_run (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    run_no TEXT NOT NULL,
    provider_code TEXT NOT NULL,
    provider_account_id TEXT,
    settlement_currency TEXT,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    status TEXT NOT NULL,
    total_provider_amount TEXT,
    total_internal_amount TEXT,
    difference_amount TEXT,
    matched_count BIGINT NOT NULL DEFAULT 0,
    mismatched_count BIGINT NOT NULL DEFAULT 0,
    missing_provider_count BIGINT NOT NULL DEFAULT 0,
    missing_internal_count BIGINT NOT NULL DEFAULT 0,
    report_file_ref TEXT,
    started_at TEXT,
    completed_at TEXT,
    request_no TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_reconciliation_item (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    reconciliation_run_id TEXT NOT NULL,
    statement_id TEXT NOT NULL,
    statement_item_id TEXT,
    payment_attempt_id TEXT,
    refund_id TEXT,
    refund_attempt_id TEXT,
    provider_code TEXT NOT NULL,
    difference_type TEXT NOT NULL,
    match_status TEXT NOT NULL,
    internal_amount TEXT,
    provider_amount TEXT,
    difference_amount TEXT,
    currency_code TEXT,
    internal_status TEXT,
    provider_status TEXT,
    resolution_status TEXT NOT NULL,
    resolution_note TEXT,
    resolved_by TEXT,
    resolved_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_refund (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    payment_intent_id TEXT NOT NULL,
    payment_attempt_id TEXT NOT NULL,
    order_id TEXT,
    refund_no TEXT NOT NULL,
    amount TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    provider_code TEXT,
    reason TEXT,
    status TEXT NOT NULL,
    request_no TEXT,
    idempotency_key TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_refund_attempt (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    refund_attempt_no TEXT NOT NULL,
    refund_id TEXT NOT NULL,
    provider_code TEXT NOT NULL,
    provider_account_id TEXT,
    out_refund_no TEXT NOT NULL,
    provider_refund_id TEXT,
    amount TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    status TEXT NOT NULL,
    failure_code TEXT,
    failure_message TEXT,
    submitted_at TEXT,
    succeeded_at TEXT,
    failed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_refund_item (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    refund_id TEXT NOT NULL,
    order_item_id TEXT NOT NULL,
    quantity BIGINT NOT NULL DEFAULT 1,
    refund_amount TEXT NOT NULL,
    tax_refund_amount TEXT NOT NULL,
    shipping_refund_amount TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_refund_event (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    refund_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_provider (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    provider_code TEXT NOT NULL,
    display_name TEXT NOT NULL,
    provider_type TEXT NOT NULL,
    supported_countries TEXT NOT NULL DEFAULT '[]',
    supported_currencies TEXT NOT NULL DEFAULT '[]',
    supported_methods TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL,
    sort_order BIGINT NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_provider_account (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    account_no TEXT NOT NULL,
    provider_code TEXT NOT NULL,
    merchant_id TEXT NOT NULL,
    environment TEXT NOT NULL,
    country_code TEXT NOT NULL,
    settlement_currency TEXT NOT NULL,
    secret_ref TEXT NOT NULL,
    webhook_secret_ref TEXT,
    certificate_ref TEXT,
    status TEXT NOT NULL,
    rotated_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_method (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    method_key TEXT NOT NULL,
    display_name TEXT NOT NULL,
    provider TEXT,
    status TEXT NOT NULL,
    sort_weight BIGINT NOT NULL DEFAULT 0,
    request_no TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_channel (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    channel_no TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    method_id TEXT NOT NULL,
    scene_code TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    country_code TEXT NOT NULL,
    status TEXT NOT NULL,
    priority BIGINT NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_route_rule (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    rule_no TEXT NOT NULL,
    priority BIGINT NOT NULL DEFAULT 0,
    purchase_type TEXT,
    country_code TEXT,
    currency_code TEXT,
    client_platform TEXT,
    amount_min TEXT,
    amount_max TEXT,
    user_segment TEXT,
    risk_level TEXT,
    channel_id TEXT,
    status TEXT NOT NULL,
    starts_at TEXT,
    ends_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_inventory_stock (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    sku_id TEXT NOT NULL,
    warehouse_id TEXT,
    available_quantity BIGINT NOT NULL DEFAULT 0,
    reserved_quantity BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_inventory_reservation (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    sku_id TEXT NOT NULL,
    order_id TEXT,
    quantity BIGINT NOT NULL,
    status TEXT NOT NULL,
    expires_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_inventory_movement (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    movement_no TEXT NOT NULL,
    sku_id TEXT NOT NULL,
    movement_type TEXT NOT NULL,
    quantity BIGINT NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_fulfillment_order (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    fulfillment_no TEXT NOT NULL,
    order_id TEXT NOT NULL,
    fulfillment_type TEXT NOT NULL,
    status TEXT NOT NULL,
    warehouse_id TEXT,
    address_snapshot_id TEXT,
    provider_code TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_shipment (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    shipment_no TEXT NOT NULL,
    fulfillment_id TEXT NOT NULL,
    carrier_code TEXT NOT NULL,
    tracking_no TEXT,
    status TEXT NOT NULL,
    shipped_at TEXT,
    delivered_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_shipment_tracking_event (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    shipment_id TEXT NOT NULL,
    event_time TEXT NOT NULL,
    event_code TEXT NOT NULL,
    location TEXT,
    description TEXT,
    raw_payload_json TEXT,
    created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_product_category_tenant_no
    ON commerce_product_category (tenant_id, category_no);
CREATE INDEX IF NOT EXISTS idx_commerce_product_category_tenant_parent_status
    ON commerce_product_category (tenant_id, organization_id, parent_category_id, status, sort_weight, category_no);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_product_attribute_tenant_no
    ON commerce_product_attribute (tenant_id, attribute_no);
CREATE INDEX IF NOT EXISTS idx_commerce_product_attribute_tenant_status
    ON commerce_product_attribute (tenant_id, organization_id, status, sort_weight, attribute_no);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_product_category_attribute_tenant_refs
    ON commerce_product_category_attribute (tenant_id, category_id, attribute_id);
CREATE INDEX IF NOT EXISTS idx_commerce_product_category_attribute_tenant_category
    ON commerce_product_category_attribute (tenant_id, organization_id, category_id, status, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_product_spu_tenant_no
    ON commerce_product_spu (tenant_id, spu_no);
CREATE INDEX IF NOT EXISTS idx_commerce_product_spu_tenant_status_updated
    ON commerce_product_spu (tenant_id, organization_id, status, updated_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_product_spu_category_tenant_refs
    ON commerce_product_spu_category (tenant_id, spu_id, category_id);
CREATE INDEX IF NOT EXISTS idx_commerce_product_spu_category_tenant_category
    ON commerce_product_spu_category (tenant_id, organization_id, category_id, status, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_product_sku_tenant_no
    ON commerce_product_sku (tenant_id, sku_no);
CREATE INDEX IF NOT EXISTS idx_commerce_product_sku_tenant_spu_status_updated
    ON commerce_product_sku (tenant_id, organization_id, spu_id, fulfillment_type, status, updated_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_product_sku_attribute_tenant_refs
    ON commerce_product_sku_attribute (tenant_id, sku_id, attribute_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_product_media_tenant_owner_role
    ON commerce_product_media (tenant_id, owner_type, owner_id, media_role, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_price_list_tenant_org_no
    ON commerce_price_list (tenant_id, organization_id, price_list_no);
CREATE INDEX IF NOT EXISTS idx_commerce_price_list_tenant_filter
    ON commerce_price_list (tenant_id, organization_id, currency_code, market_code, status, created_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_recharge_package_tenant_no
    ON commerce_recharge_package (tenant_id, package_no);
CREATE INDEX IF NOT EXISTS idx_commerce_recharge_package_tenant_status_sort
    ON commerce_recharge_package (tenant_id, organization_id, status, sort_weight, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_exchange_rule_tenant_org_assets
    ON commerce_exchange_rule (tenant_id, organization_id, source_asset_type, target_asset_type);
CREATE INDEX IF NOT EXISTS idx_commerce_exchange_rule_tenant_status
    ON commerce_exchange_rule (tenant_id, organization_id, status, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_promotion_offer_tenant_status_updated
    ON promotion_offer (tenant_id, organization_id, status, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_promotion_offer_version_offer
    ON promotion_offer_version (tenant_id, organization_id, offer_id, version_no);
CREATE INDEX IF NOT EXISTS idx_promotion_coupon_stock_tenant_offer
    ON promotion_coupon_stock (tenant_id, organization_id, offer_id, status, created_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_promotion_code_tenant_code
    ON promotion_code (tenant_id, promotion_code);
CREATE INDEX IF NOT EXISTS idx_promotion_code_tenant_stock_status
    ON promotion_code (tenant_id, organization_id, stock_id, status, created_at, id);
CREATE INDEX IF NOT EXISTS idx_promotion_user_coupon_tenant_owner_status
    ON promotion_user_coupon (tenant_id, organization_id, owner_user_id, status, created_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_account_tenant_owner_asset
    ON commerce_account (tenant_id, organization_id, owner_user_id, asset_type, currency_code);
CREATE INDEX IF NOT EXISTS idx_commerce_account_ledger_tenant_account_created
    ON commerce_account_ledger_entry (tenant_id, account_id, created_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_settlement_tenant_usage
    ON commerce_settlement (tenant_id, organization_id, usage_fact_id);
CREATE INDEX IF NOT EXISTS idx_commerce_settlement_tenant_status_created
    ON commerce_settlement (tenant_id, organization_id, settlement_status, created_at, id);
CREATE INDEX IF NOT EXISTS idx_commerce_statement_tenant_period
    ON commerce_statement (tenant_id, organization_id, period_start, period_end, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_order_tenant_no
    ON commerce_order (tenant_id, order_no);
CREATE INDEX IF NOT EXISTS idx_commerce_order_owner_status_created_at
    ON commerce_order (tenant_id, organization_id, owner_user_id, status, created_at, id);
CREATE INDEX IF NOT EXISTS idx_commerce_order_event_tenant_order_created
    ON commerce_order_event (tenant_id, organization_id, order_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_commerce_order_item_tenant_order
    ON commerce_order_item (tenant_id, order_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_intent_tenant_idempotency
    ON commerce_payment_intent (tenant_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_intent_tenant_order
    ON commerce_payment_intent (tenant_id, organization_id, order_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_attempt_tenant_intent
    ON commerce_payment_attempt (tenant_id, organization_id, payment_intent_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_attempt_provider_trade
    ON commerce_payment_attempt (provider, out_trade_no);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_route_decision_tenant_attempt
    ON commerce_payment_route_decision (tenant_id, payment_attempt_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_operation_attempt_tenant_idempotency
    ON commerce_payment_operation_attempt (tenant_id, provider_code, operation_code, idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_webhook_event_tenant_provider_event
    ON commerce_payment_webhook_event (tenant_id, provider, event_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_webhook_event_tenant_provider_nonce
    ON commerce_payment_webhook_event (tenant_id, provider, nonce);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_webhook_delivery_tenant_provider_event
    ON commerce_payment_webhook_delivery (tenant_id, provider_code, event_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_webhook_delivery_tenant_provider_nonce
    ON commerce_payment_webhook_delivery (tenant_id, provider_code, nonce);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_statement_tenant_provider_period
    ON commerce_payment_statement (tenant_id, provider_code, period_start, period_end, id);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_statement_item_statement
    ON commerce_payment_statement_item (tenant_id, statement_id, row_no, id);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_reconciliation_run_tenant_provider_period
    ON commerce_payment_reconciliation_run (tenant_id, organization_id, provider_code, period_start, id);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_reconciliation_item_run
    ON commerce_payment_reconciliation_item (tenant_id, reconciliation_run_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_refund_tenant_no
    ON commerce_refund (tenant_id, refund_no);
CREATE INDEX IF NOT EXISTS idx_commerce_refund_tenant_attempt
    ON commerce_refund (tenant_id, payment_attempt_id, created_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_refund_attempt_tenant_provider_refund
    ON commerce_refund_attempt (tenant_id, provider_code, out_refund_no);
CREATE INDEX IF NOT EXISTS idx_commerce_refund_item_tenant_refund
    ON commerce_refund_item (tenant_id, refund_id, id);
CREATE INDEX IF NOT EXISTS idx_commerce_refund_event_tenant_refund
    ON commerce_refund_event (tenant_id, refund_id, created_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_provider_tenant_code
    ON commerce_payment_provider (tenant_id, provider_code);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_provider_account_tenant_no
    ON commerce_payment_provider_account (tenant_id, organization_id, account_no);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_provider_account_tenant_provider_scope
    ON commerce_payment_provider_account (tenant_id, organization_id, provider_code, environment, country_code, settlement_currency, status);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_method_tenant_method
    ON commerce_payment_method (tenant_id, organization_id, method_key);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_channel_tenant_account
    ON commerce_payment_channel (tenant_id, organization_id, provider_account_id, method_id, status);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_route_rule_tenant_filters
    ON commerce_payment_route_rule (tenant_id, organization_id, status, country_code, currency_code, priority);
CREATE INDEX IF NOT EXISTS idx_commerce_inventory_stock_tenant_sku
    ON commerce_inventory_stock (tenant_id, organization_id, sku_id, status);
CREATE INDEX IF NOT EXISTS idx_commerce_inventory_reservation_tenant_sku_status
    ON commerce_inventory_reservation (tenant_id, organization_id, sku_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_inventory_movement_tenant_no
    ON commerce_inventory_movement (tenant_id, movement_no);
CREATE INDEX IF NOT EXISTS idx_commerce_fulfillment_order_tenant_order
    ON commerce_fulfillment_order (tenant_id, organization_id, order_id, status, created_at, id);
CREATE INDEX IF NOT EXISTS idx_commerce_shipment_tenant_fulfillment
    ON commerce_shipment (tenant_id, organization_id, fulfillment_id, status, created_at, id);
CREATE INDEX IF NOT EXISTS idx_commerce_shipment_tracking_event_tenant_shipment_time
    ON commerce_shipment_tracking_event (tenant_id, organization_id, shipment_id, event_time, id);
"#;

const APPBASE_COMMERCE_SQLITE_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS commerce_product_category (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    category_no TEXT NOT NULL,
    parent_category_id TEXT,
    name TEXT NOT NULL,
    sort_weight BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_product_attribute (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    attribute_no TEXT NOT NULL,
    name TEXT NOT NULL,
    value_type TEXT NOT NULL,
    status TEXT NOT NULL,
    sort_weight BIGINT NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_product_attribute_value (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    attribute_id TEXT NOT NULL,
    value_no TEXT,
    display_value TEXT,
    sort_weight BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_product_category_attribute (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    category_id TEXT NOT NULL,
    attribute_id TEXT NOT NULL,
    required BOOLEAN NOT NULL DEFAULT 0,
    searchable BOOLEAN NOT NULL DEFAULT 0,
    filterable BOOLEAN NOT NULL DEFAULT 0,
    sort_order BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_product_spu (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    spu_no TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    product_type TEXT NOT NULL,
    status TEXT NOT NULL,
    visible_surfaces TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_product_spu_category (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    spu_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    primary_flag BOOLEAN NOT NULL DEFAULT 0,
    sort_order BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_product_sku (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    spu_id TEXT NOT NULL,
    sku_no TEXT NOT NULL,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    price_amount TEXT NOT NULL,
    original_price_amount TEXT,
    currency_code TEXT NOT NULL,
    fulfillment_type TEXT NOT NULL,
    inventory_tracking TEXT NOT NULL,
    status TEXT NOT NULL,
    spec_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_product_sku_attribute (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    sku_id TEXT NOT NULL,
    attribute_id TEXT NOT NULL,
    attribute_value_id TEXT,
    custom_value TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_product_media (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    owner_type TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    media_role TEXT NOT NULL,
    drive_uri TEXT,
    resource_snapshot TEXT,
    alt_text TEXT,
    sort_order BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_price_list (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    price_list_no TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    market_code TEXT,
    customer_segment TEXT,
    starts_at TEXT,
    ends_at TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_price_list_item (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    price_list_id TEXT NOT NULL,
    sku_id TEXT NOT NULL,
    price_amount TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_recharge_package (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    external_id BIGINT NOT NULL,
    package_no TEXT NOT NULL,
    sku_id TEXT,
    name TEXT NOT NULL,
    price_amount TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    bonus_points BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    valid_from TEXT,
    valid_to TEXT,
    sort_weight BIGINT NOT NULL DEFAULT 0,
    request_no TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_exchange_rule (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    rule_no TEXT NOT NULL,
    source_asset_type TEXT NOT NULL,
    target_asset_type TEXT NOT NULL,
    rate TEXT NOT NULL,
    status TEXT NOT NULL,
    remark TEXT,
    request_no TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_offer (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    offer_no TEXT NOT NULL,
    offer_code TEXT NOT NULL,
    name TEXT NOT NULL,
    offer_type TEXT NOT NULL,
    audience_scope TEXT,
    combinability TEXT,
    priority BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    current_offer_version_id TEXT,
    starts_at TEXT,
    ends_at TEXT,
    received_count BIGINT NOT NULL DEFAULT 0,
    redeemed_count BIGINT NOT NULL DEFAULT 0,
    request_no TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_offer_version (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    offer_id TEXT NOT NULL,
    version_no BIGINT NOT NULL,
    lifecycle_status TEXT NOT NULL,
    discount_type TEXT NOT NULL,
    discount_value TEXT NOT NULL,
    minimum_amount TEXT,
    maximum_discount_amount TEXT,
    description TEXT,
    request_no TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_coupon_stock (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    stock_no TEXT NOT NULL,
    name TEXT NOT NULL,
    offer_id TEXT NOT NULL,
    offer_version_id TEXT NOT NULL,
    stock_type TEXT NOT NULL,
    total_quantity BIGINT NOT NULL DEFAULT 0,
    available_quantity BIGINT NOT NULL DEFAULT 0,
    claimed_quantity BIGINT NOT NULL DEFAULT 0,
    redeemed_quantity BIGINT NOT NULL DEFAULT 0,
    starts_at TEXT,
    ends_at TEXT,
    status TEXT NOT NULL,
    request_no TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_code (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    code_no TEXT NOT NULL,
    stock_id TEXT NOT NULL,
    offer_id TEXT NOT NULL,
    offer_version_id TEXT NOT NULL,
    promotion_code TEXT NOT NULL,
    code_type TEXT NOT NULL,
    max_claims BIGINT NOT NULL DEFAULT 1,
    claimed_quantity BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    starts_at TEXT,
    expires_at TEXT,
    claimed_at TEXT,
    redeemed_at TEXT,
    request_no TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_user_coupon (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    owner_user_id TEXT NOT NULL,
    promotion_code_id TEXT NOT NULL,
    stock_id TEXT NOT NULL,
    offer_id TEXT NOT NULL,
    offer_version_id TEXT NOT NULL,
    status TEXT NOT NULL,
    claimed_at TEXT,
    redeemed_at TEXT,
    request_no TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_discount_application (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    order_id TEXT,
    offer_id TEXT,
    discount_amount TEXT NOT NULL DEFAULT '0',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_coupon_ledger_entry (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    coupon_id TEXT,
    direction TEXT NOT NULL,
    quantity BIGINT NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_account (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    owner_user_id TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    available_amount TEXT NOT NULL DEFAULT '0',
    frozen_amount TEXT NOT NULL DEFAULT '0',
    version BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_account_ledger_entry (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    account_id TEXT NOT NULL,
    owner_user_id TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    direction TEXT NOT NULL,
    amount TEXT NOT NULL,
    balance_after TEXT NOT NULL,
    business_type TEXT NOT NULL,
    transaction_no TEXT NOT NULL,
    request_no TEXT,
    idempotency_key TEXT,
    source_type TEXT,
    source_id TEXT,
    remark TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_settlement (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    owner_id BIGINT,
    request_id TEXT NOT NULL,
    trace_id TEXT,
    status BIGINT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    settlement_no TEXT NOT NULL,
    usage_fact_id BIGINT NOT NULL,
    account_id TEXT NOT NULL,
    account_ledger_entry_id TEXT,
    asset_type TEXT NOT NULL,
    direction TEXT NOT NULL,
    amount TEXT NOT NULL,
    points BIGINT NOT NULL DEFAULT 0,
    tokens BIGINT NOT NULL DEFAULT 0,
    currency TEXT NOT NULL,
    price_snapshot TEXT NOT NULL DEFAULT '{}',
    settlement_status TEXT NOT NULL,
    settled_at TEXT,
    failure_code TEXT,
    failure_message TEXT
);

CREATE TABLE IF NOT EXISTS commerce_statement (
    id BIGINT NOT NULL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    owner_id BIGINT,
    statement_no TEXT NOT NULL,
    period TEXT,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    total_tokens BIGINT NOT NULL DEFAULT 0,
    total_cost TEXT NOT NULL DEFAULT '0',
    payment_status BIGINT,
    statement_status BIGINT,
    invoice_id TEXT,
    due_at TEXT,
    status BIGINT NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_order (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    owner_user_id TEXT NOT NULL,
    order_no TEXT NOT NULL,
    order_type TEXT,
    subject TEXT NOT NULL,
    status TEXT NOT NULL,
    pay_status TEXT,
    total_amount TEXT,
    currency_code TEXT NOT NULL,
    request_no TEXT,
    idempotency_key TEXT,
    paid_at TEXT,
    cancelled_at TEXT,
    expired_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_order_item (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    order_id TEXT NOT NULL,
    sku_id TEXT,
    item_title TEXT,
    quantity BIGINT NOT NULL DEFAULT 1,
    unit_price_amount TEXT,
    total_amount TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_order_amount_breakdown (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    order_id TEXT NOT NULL,
    payable_amount TEXT NOT NULL,
    currency_code TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_order_event (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    event_no TEXT NOT NULL,
    order_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    actor_id TEXT,
    reason_code TEXT,
    message TEXT,
    payload_json TEXT,
    request_id TEXT,
    idempotency_key TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_intent (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    owner_user_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    merchant_order_no TEXT,
    subject TEXT NOT NULL,
    provider TEXT,
    provider_code TEXT,
    payment_method TEXT,
    scene_code TEXT,
    amount TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    status TEXT NOT NULL,
    request_no TEXT,
    idempotency_key TEXT NOT NULL,
    metadata_json TEXT,
    provider_native_json TEXT,
    next_action_json TEXT,
    captured_amount TEXT,
    refunded_amount TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_attempt (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    owner_user_id TEXT NOT NULL,
    payment_intent_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    attempt_no TEXT,
    payment_method TEXT,
    provider TEXT,
    provider_code TEXT,
    channel_id TEXT,
    provider_transaction_id TEXT,
    out_trade_no TEXT,
    amount TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    status TEXT NOT NULL,
    callback_payload TEXT,
    request_no TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    paid_at TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_route_decision (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    payment_intent_id TEXT NOT NULL,
    payment_attempt_id TEXT NOT NULL,
    route_rule_id TEXT,
    channel_id TEXT,
    provider_code TEXT,
    provider_account_id TEXT,
    method_code TEXT,
    scene_code TEXT,
    country_code TEXT,
    currency_code TEXT,
    amount TEXT,
    risk_level TEXT,
    decision_reason TEXT,
    fallback_from_channel_id TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_operation_attempt (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    operation_no TEXT NOT NULL,
    provider_code TEXT NOT NULL,
    provider_account_id TEXT,
    channel_id TEXT,
    operation_code TEXT NOT NULL,
    sdkwork_resource_type TEXT NOT NULL,
    sdkwork_resource_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    request_digest TEXT NOT NULL,
    response_digest TEXT,
    native_request_id TEXT,
    native_trade_id TEXT,
    native_refund_id TEXT,
    http_status BIGINT,
    provider_error_code TEXT,
    provider_error_message TEXT,
    retryable BOOLEAN,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_webhook_event (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    provider TEXT NOT NULL,
    provider_code TEXT,
    event_id TEXT NOT NULL,
    event_type TEXT,
    nonce TEXT NOT NULL,
    signature TEXT,
    request_timestamp BIGINT,
    out_trade_no TEXT,
    transaction_id TEXT,
    payload TEXT,
    payload_digest TEXT,
    status TEXT NOT NULL,
    retries BIGINT NOT NULL DEFAULT 0,
    last_error TEXT,
    message TEXT,
    request_no TEXT,
    idempotency_key TEXT,
    received_at TEXT,
    created_at TEXT NOT NULL,
    processed_at TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_webhook_delivery (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    delivery_no TEXT NOT NULL,
    provider_code TEXT NOT NULL,
    provider_account_id TEXT,
    event_id TEXT NOT NULL,
    nonce TEXT NOT NULL,
    request_timestamp BIGINT,
    signature TEXT,
    signature_algorithm TEXT,
    headers_json TEXT,
    payload_digest TEXT,
    payload_ref TEXT,
    source_ip TEXT,
    user_agent TEXT,
    verification_status TEXT NOT NULL,
    delivery_status TEXT NOT NULL,
    failure_code TEXT,
    failure_message TEXT,
    received_at TEXT NOT NULL,
    verified_at TEXT,
    normalized_event_id TEXT,
    processed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_statement (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    statement_no TEXT NOT NULL,
    provider_code TEXT NOT NULL,
    provider_account_id TEXT,
    statement_type TEXT NOT NULL,
    settlement_currency TEXT NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    provider_statement_id TEXT,
    file_ref TEXT,
    file_digest TEXT,
    download_status TEXT NOT NULL,
    parse_status TEXT NOT NULL,
    row_count BIGINT NOT NULL DEFAULT 0,
    total_amount TEXT NOT NULL,
    fee_amount TEXT NOT NULL,
    net_amount TEXT NOT NULL,
    downloaded_at TEXT,
    parsed_at TEXT,
    request_no TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_statement_item (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    statement_id TEXT NOT NULL,
    provider_code TEXT NOT NULL,
    provider_account_id TEXT,
    row_no TEXT NOT NULL,
    native_trade_id TEXT,
    native_refund_id TEXT,
    native_order_no TEXT,
    sdkwork_out_trade_no TEXT,
    sdkwork_out_refund_no TEXT,
    transaction_type TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    settled_at TEXT,
    gross_amount TEXT NOT NULL,
    fee_amount TEXT NOT NULL,
    net_amount TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    provider_status TEXT NOT NULL,
    raw_row_digest TEXT NOT NULL,
    metadata_json TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_reconciliation_run (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    run_no TEXT NOT NULL,
    provider_code TEXT NOT NULL,
    provider_account_id TEXT,
    settlement_currency TEXT,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    status TEXT NOT NULL,
    total_provider_amount TEXT,
    total_internal_amount TEXT,
    difference_amount TEXT,
    matched_count BIGINT NOT NULL DEFAULT 0,
    mismatched_count BIGINT NOT NULL DEFAULT 0,
    missing_provider_count BIGINT NOT NULL DEFAULT 0,
    missing_internal_count BIGINT NOT NULL DEFAULT 0,
    report_file_ref TEXT,
    started_at TEXT,
    completed_at TEXT,
    request_no TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_reconciliation_item (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    reconciliation_run_id TEXT NOT NULL,
    statement_id TEXT NOT NULL,
    statement_item_id TEXT,
    payment_attempt_id TEXT,
    refund_id TEXT,
    refund_attempt_id TEXT,
    provider_code TEXT NOT NULL,
    difference_type TEXT NOT NULL,
    match_status TEXT NOT NULL,
    internal_amount TEXT,
    provider_amount TEXT,
    difference_amount TEXT,
    currency_code TEXT,
    internal_status TEXT,
    provider_status TEXT,
    resolution_status TEXT NOT NULL,
    resolution_note TEXT,
    resolved_by TEXT,
    resolved_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_refund (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    payment_intent_id TEXT NOT NULL,
    payment_attempt_id TEXT NOT NULL,
    order_id TEXT,
    refund_no TEXT NOT NULL,
    amount TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    provider_code TEXT,
    reason TEXT,
    status TEXT NOT NULL,
    request_no TEXT,
    idempotency_key TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_refund_attempt (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    refund_attempt_no TEXT NOT NULL,
    refund_id TEXT NOT NULL,
    provider_code TEXT NOT NULL,
    provider_account_id TEXT,
    out_refund_no TEXT NOT NULL,
    provider_refund_id TEXT,
    amount TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    status TEXT NOT NULL,
    failure_code TEXT,
    failure_message TEXT,
    submitted_at TEXT,
    succeeded_at TEXT,
    failed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_refund_item (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    refund_id TEXT NOT NULL,
    order_item_id TEXT NOT NULL,
    quantity BIGINT NOT NULL DEFAULT 1,
    refund_amount TEXT NOT NULL,
    tax_refund_amount TEXT NOT NULL,
    shipping_refund_amount TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_refund_event (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    refund_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_provider (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    provider_code TEXT NOT NULL,
    display_name TEXT NOT NULL,
    provider_type TEXT NOT NULL,
    supported_countries TEXT NOT NULL DEFAULT '[]',
    supported_currencies TEXT NOT NULL DEFAULT '[]',
    supported_methods TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL,
    sort_order BIGINT NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_provider_account (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    account_no TEXT NOT NULL,
    provider_code TEXT NOT NULL,
    merchant_id TEXT NOT NULL,
    environment TEXT NOT NULL,
    country_code TEXT NOT NULL,
    settlement_currency TEXT NOT NULL,
    secret_ref TEXT NOT NULL,
    webhook_secret_ref TEXT,
    certificate_ref TEXT,
    status TEXT NOT NULL,
    rotated_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_method (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    method_key TEXT NOT NULL,
    display_name TEXT NOT NULL,
    provider TEXT,
    status TEXT NOT NULL,
    sort_weight BIGINT NOT NULL DEFAULT 0,
    request_no TEXT,
    idempotency_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_channel (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    channel_no TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    method_id TEXT NOT NULL,
    scene_code TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    country_code TEXT NOT NULL,
    status TEXT NOT NULL,
    priority BIGINT NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_payment_route_rule (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    rule_no TEXT NOT NULL,
    priority BIGINT NOT NULL DEFAULT 0,
    purchase_type TEXT,
    country_code TEXT,
    currency_code TEXT,
    client_platform TEXT,
    amount_min TEXT,
    amount_max TEXT,
    user_segment TEXT,
    risk_level TEXT,
    channel_id TEXT,
    status TEXT NOT NULL,
    starts_at TEXT,
    ends_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_inventory_stock (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    sku_id TEXT NOT NULL,
    warehouse_id TEXT,
    available_quantity BIGINT NOT NULL DEFAULT 0,
    reserved_quantity BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_inventory_reservation (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    sku_id TEXT NOT NULL,
    order_id TEXT,
    quantity BIGINT NOT NULL,
    status TEXT NOT NULL,
    expires_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_inventory_movement (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    movement_no TEXT NOT NULL,
    sku_id TEXT NOT NULL,
    movement_type TEXT NOT NULL,
    quantity BIGINT NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_fulfillment_order (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    fulfillment_no TEXT NOT NULL,
    order_id TEXT NOT NULL,
    fulfillment_type TEXT NOT NULL,
    status TEXT NOT NULL,
    warehouse_id TEXT,
    address_snapshot_id TEXT,
    provider_code TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_shipment (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    shipment_no TEXT NOT NULL,
    fulfillment_id TEXT NOT NULL,
    carrier_code TEXT NOT NULL,
    tracking_no TEXT,
    status TEXT NOT NULL,
    shipped_at TEXT,
    delivered_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commerce_shipment_tracking_event (
    id TEXT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    shipment_id TEXT NOT NULL,
    event_time TEXT NOT NULL,
    event_code TEXT NOT NULL,
    location TEXT,
    description TEXT,
    raw_payload_json TEXT,
    created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_product_category_tenant_no
    ON commerce_product_category (tenant_id, category_no);
CREATE INDEX IF NOT EXISTS idx_commerce_product_category_tenant_parent_status
    ON commerce_product_category (tenant_id, organization_id, parent_category_id, status, sort_weight, category_no);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_product_attribute_tenant_no
    ON commerce_product_attribute (tenant_id, attribute_no);
CREATE INDEX IF NOT EXISTS idx_commerce_product_attribute_tenant_status
    ON commerce_product_attribute (tenant_id, organization_id, status, sort_weight, attribute_no);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_product_category_attribute_tenant_refs
    ON commerce_product_category_attribute (tenant_id, category_id, attribute_id);
CREATE INDEX IF NOT EXISTS idx_commerce_product_category_attribute_tenant_category
    ON commerce_product_category_attribute (tenant_id, organization_id, category_id, status, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_product_spu_tenant_no
    ON commerce_product_spu (tenant_id, spu_no);
CREATE INDEX IF NOT EXISTS idx_commerce_product_spu_tenant_status_updated
    ON commerce_product_spu (tenant_id, organization_id, status, updated_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_product_spu_category_tenant_refs
    ON commerce_product_spu_category (tenant_id, spu_id, category_id);
CREATE INDEX IF NOT EXISTS idx_commerce_product_spu_category_tenant_category
    ON commerce_product_spu_category (tenant_id, organization_id, category_id, status, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_product_sku_tenant_no
    ON commerce_product_sku (tenant_id, sku_no);
CREATE INDEX IF NOT EXISTS idx_commerce_product_sku_tenant_spu_status_updated
    ON commerce_product_sku (tenant_id, organization_id, spu_id, fulfillment_type, status, updated_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_product_sku_attribute_tenant_refs
    ON commerce_product_sku_attribute (tenant_id, sku_id, attribute_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_product_media_tenant_owner_role
    ON commerce_product_media (tenant_id, owner_type, owner_id, media_role, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_price_list_tenant_org_no
    ON commerce_price_list (tenant_id, organization_id, price_list_no);
CREATE INDEX IF NOT EXISTS idx_commerce_price_list_tenant_filter
    ON commerce_price_list (tenant_id, organization_id, currency_code, market_code, status, created_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_recharge_package_tenant_no
    ON commerce_recharge_package (tenant_id, package_no);
CREATE INDEX IF NOT EXISTS idx_commerce_recharge_package_tenant_status_sort
    ON commerce_recharge_package (tenant_id, organization_id, status, sort_weight, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_exchange_rule_tenant_org_assets
    ON commerce_exchange_rule (tenant_id, organization_id, source_asset_type, target_asset_type);
CREATE INDEX IF NOT EXISTS idx_commerce_exchange_rule_tenant_status
    ON commerce_exchange_rule (tenant_id, organization_id, status, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_promotion_offer_tenant_status_updated
    ON promotion_offer (tenant_id, organization_id, status, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_promotion_offer_version_offer
    ON promotion_offer_version (tenant_id, organization_id, offer_id, version_no);
CREATE INDEX IF NOT EXISTS idx_promotion_coupon_stock_tenant_offer
    ON promotion_coupon_stock (tenant_id, organization_id, offer_id, status, created_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_promotion_code_tenant_code
    ON promotion_code (tenant_id, promotion_code);
CREATE INDEX IF NOT EXISTS idx_promotion_code_tenant_stock_status
    ON promotion_code (tenant_id, organization_id, stock_id, status, created_at, id);
CREATE INDEX IF NOT EXISTS idx_promotion_user_coupon_tenant_owner_status
    ON promotion_user_coupon (tenant_id, organization_id, owner_user_id, status, created_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_account_tenant_owner_asset
    ON commerce_account (tenant_id, organization_id, owner_user_id, asset_type, currency_code);
CREATE INDEX IF NOT EXISTS idx_commerce_account_ledger_tenant_account_created
    ON commerce_account_ledger_entry (tenant_id, account_id, created_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_settlement_tenant_usage
    ON commerce_settlement (tenant_id, organization_id, usage_fact_id);
CREATE INDEX IF NOT EXISTS idx_commerce_settlement_tenant_status_created
    ON commerce_settlement (tenant_id, organization_id, settlement_status, created_at, id);
CREATE INDEX IF NOT EXISTS idx_commerce_statement_tenant_period
    ON commerce_statement (tenant_id, organization_id, period_start, period_end, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_order_tenant_no
    ON commerce_order (tenant_id, order_no);
CREATE INDEX IF NOT EXISTS idx_commerce_order_owner_status_created_at
    ON commerce_order (tenant_id, organization_id, owner_user_id, status, created_at, id);
CREATE INDEX IF NOT EXISTS idx_commerce_order_event_tenant_order_created
    ON commerce_order_event (tenant_id, organization_id, order_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_commerce_order_item_tenant_order
    ON commerce_order_item (tenant_id, order_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_intent_tenant_idempotency
    ON commerce_payment_intent (tenant_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_intent_tenant_order
    ON commerce_payment_intent (tenant_id, organization_id, order_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_attempt_tenant_intent
    ON commerce_payment_attempt (tenant_id, organization_id, payment_intent_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_attempt_provider_trade
    ON commerce_payment_attempt (provider, out_trade_no);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_route_decision_tenant_attempt
    ON commerce_payment_route_decision (tenant_id, payment_attempt_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_operation_attempt_tenant_idempotency
    ON commerce_payment_operation_attempt (tenant_id, provider_code, operation_code, idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_webhook_event_tenant_provider_event
    ON commerce_payment_webhook_event (tenant_id, provider, event_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_webhook_event_tenant_provider_nonce
    ON commerce_payment_webhook_event (tenant_id, provider, nonce);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_webhook_delivery_tenant_provider_event
    ON commerce_payment_webhook_delivery (tenant_id, provider_code, event_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_webhook_delivery_tenant_provider_nonce
    ON commerce_payment_webhook_delivery (tenant_id, provider_code, nonce);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_statement_tenant_provider_period
    ON commerce_payment_statement (tenant_id, provider_code, period_start, period_end, id);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_statement_item_statement
    ON commerce_payment_statement_item (tenant_id, statement_id, row_no, id);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_reconciliation_run_tenant_provider_period
    ON commerce_payment_reconciliation_run (tenant_id, organization_id, provider_code, period_start, id);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_reconciliation_item_run
    ON commerce_payment_reconciliation_item (tenant_id, reconciliation_run_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_refund_tenant_no
    ON commerce_refund (tenant_id, refund_no);
CREATE INDEX IF NOT EXISTS idx_commerce_refund_tenant_attempt
    ON commerce_refund (tenant_id, payment_attempt_id, created_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_refund_attempt_tenant_provider_refund
    ON commerce_refund_attempt (tenant_id, provider_code, out_refund_no);
CREATE INDEX IF NOT EXISTS idx_commerce_refund_item_tenant_refund
    ON commerce_refund_item (tenant_id, refund_id, id);
CREATE INDEX IF NOT EXISTS idx_commerce_refund_event_tenant_refund
    ON commerce_refund_event (tenant_id, refund_id, created_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_provider_tenant_code
    ON commerce_payment_provider (tenant_id, provider_code);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_provider_account_tenant_no
    ON commerce_payment_provider_account (tenant_id, organization_id, account_no);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_provider_account_tenant_provider_scope
    ON commerce_payment_provider_account (tenant_id, organization_id, provider_code, environment, country_code, settlement_currency, status);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_payment_method_tenant_method
    ON commerce_payment_method (tenant_id, organization_id, method_key);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_channel_tenant_account
    ON commerce_payment_channel (tenant_id, organization_id, provider_account_id, method_id, status);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_route_rule_tenant_filters
    ON commerce_payment_route_rule (tenant_id, organization_id, status, country_code, currency_code, priority);
CREATE INDEX IF NOT EXISTS idx_commerce_inventory_stock_tenant_sku
    ON commerce_inventory_stock (tenant_id, organization_id, sku_id, status);
CREATE INDEX IF NOT EXISTS idx_commerce_inventory_reservation_tenant_sku_status
    ON commerce_inventory_reservation (tenant_id, organization_id, sku_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_inventory_movement_tenant_no
    ON commerce_inventory_movement (tenant_id, movement_no);
CREATE INDEX IF NOT EXISTS idx_commerce_fulfillment_order_tenant_order
    ON commerce_fulfillment_order (tenant_id, organization_id, order_id, status, created_at, id);
CREATE INDEX IF NOT EXISTS idx_commerce_shipment_tenant_fulfillment
    ON commerce_shipment (tenant_id, organization_id, fulfillment_id, status, created_at, id);
CREATE INDEX IF NOT EXISTS idx_commerce_shipment_tracking_event_tenant_shipment_time
    ON commerce_shipment_tracking_event (tenant_id, organization_id, shipment_id, event_time, id);
"#;
