//! Commerce capability database bootstrap composition.
//!
//! Invoice schema authority lives in `sdkwork-invoice-database-bootstrap`.
//! Cloud Router standalone mode composes the appbase commerce tables required by
//! the local stores here so list/search paths start from a complete schema.

use sdkwork_invoice_database_bootstrap::invoice_module_table_names;

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
        // Retired wallet tables (S5): balances and ledgers live in the account
        // domain (`acct_account`/`acct_ledger_entry`); the legacy
        // `commerce_account`/`commerce_account_ledger_entry` DDL remains in
        // appbase as legacy-compat only until the physical drop is executed
        // cross-repository.
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
