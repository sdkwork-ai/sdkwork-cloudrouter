pub mod bootstrap;
pub mod database_pool;

pub use sdkwork_commerce_account_repository_sqlx::{
    PostgresCommerceAccountStore, PostgresCommerceBillingHistoryStore, SqliteCommerceAccountStore,
    SqliteCommerceBillingHistoryStore,
};

pub use bootstrap::{
    bootstrap_commerce_database, bootstrap_commerce_database_from_env,
    connect_and_bootstrap_commerce_database_from_env, connect_commerce_database_pool_from_env,
    CommerceDatabaseHost, CommerceDatabasePool,
};
pub use database_pool::{
    commerce_migrated_sqlite_memory_pool, commerce_pool_from_env, commerce_postgres_pool_from_env,
    commerce_sqlite_memory_config, commerce_sqlite_memory_pool, commerce_sqlite_pool_from_env,
    COMMERCE_DATABASE_SERVICE_NAME,
};
pub use sdkwork_commerce_invoice_repository_sqlx::{
    PostgresCommerceInvoiceStore, SqliteCommerceInvoiceStore,
};
pub use sdkwork_commerce_merchandise_repository_sqlx::{
    PostgresCommerceCatalogStore, SqliteCommerceCatalogStore,
};
pub use sdkwork_commerce_order_repository_sqlx::{
    PostgresCommerceOrderStore, SqliteCommerceOrderStore,
};
pub use sdkwork_commerce_payment_repository_sqlx::{
    PostgresCommercePaymentRecordStore, PostgresCommerceRechargeStore,
    SqliteCommercePaymentRecordStore, SqliteCommerceRechargeStore,
};
pub use sdkwork_commerce_promotion_repository_sqlx::{
    PostgresCommerceExchangeStore, PostgresCommercePromotionStore, SqliteCommerceExchangeStore,
    SqliteCommercePromotionStore,
};
pub use sdkwork_commerce_promotion_service::{
    AppCommerceExchangeRuleItem, AppCommerceExchangeRuleQuery, AppCommerceSubject,
};
pub use sdkwork_commerce_shop_repository_sqlx::{
    commerce_shop_service_area_key, shop_subresource_upsert, CommerceShopServiceAreaKeyError,
    PostgresCommerceShopStore, SqliteCommerceShopStore,
};

pub fn commerce_database_tables() -> Vec<&'static str> {
    vec![
        "commerce_idempotency_key",
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
        "commerce_account",
        "commerce_account_ledger_entry",
        "commerce_billing_prehold",
        "commerce_billing_history",
        "benefit_definition",
        "entitlement_grant",
        "entitlement_account",
        "entitlement_ledger_entry",
        "membership_plan",
        "membership_plan_version",
        "membership_plan_benefit",
        "membership_package_group",
        "membership_package",
        "membership_subscription",
        "membership_period",
        "promotion_offer",
        "promotion_offer_version",
        "promotion_coupon_stock",
        "promotion_code",
        "promotion_user_coupon",
        "promotion_coupon_ledger_entry",
        "promotion_discount_application",
        "promotion_discount_allocation",
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
        "commerce_inventory_stock",
        "commerce_inventory_reservation",
        "commerce_inventory_movement",
        "commerce_cart",
        "commerce_cart_item",
        "commerce_user_address",
        "commerce_checkout_session",
        "commerce_checkout_line",
        "commerce_checkout_quote",
        "commerce_order_address_snapshot",
        "commerce_order",
        "commerce_order_item",
        "commerce_order_amount_breakdown",
        "commerce_order_event",
        "commerce_order_cancellation",
        "commerce_fulfillment_order",
        "commerce_fulfillment_item",
        "commerce_shipment",
        "commerce_shipment_package",
        "commerce_shipment_tracking_event",
        "commerce_digital_delivery",
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
        "commerce_exchange_rule",
        "commerce_invoice_title",
        "commerce_invoice",
        "commerce_invoice_item",
    ]
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceRepositoryBinding {
    pub domain: &'static str,
    pub repository_name: &'static str,
    pub tables: Vec<&'static str>,
    pub requires_transaction: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceSqlStatementContract {
    pub operation: &'static str,
    pub sql: &'static str,
    pub bindings: Vec<&'static str>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceSqlConflictClassifier {
    pub table: &'static str,
    pub constraint_name: &'static str,
    pub unique_key: Vec<&'static str>,
    pub error_code: &'static str,
    pub message: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceIdempotencyRepositorySqlContract {
    pub repository_name: &'static str,
    pub table: &'static str,
    pub columns: Vec<&'static str>,
    pub unique_key: Vec<&'static str>,
    pub requires_transaction: bool,
    pub find_by_key: CommerceSqlStatementContract,
    pub lock_new: CommerceSqlStatementContract,
    pub complete: CommerceSqlStatementContract,
    pub fail: CommerceSqlStatementContract,
    pub conflict_classifier: CommerceSqlConflictClassifier,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceTransactionBoundarySqlContract {
    pub manager_name: &'static str,
    pub scope_fields: Vec<&'static str>,
    pub begin: CommerceSqlStatementContract,
    pub commit: CommerceSqlStatementContract,
    pub rollback: CommerceSqlStatementContract,
    pub covered_repositories: Vec<&'static str>,
    pub rollback_is_required_on_dispatch_error: bool,
    pub commit_is_required_after_idempotency_complete: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMigrationRunnerSqlContract {
    pub runner_name: &'static str,
    pub schema_version_table: &'static str,
    pub columns: Vec<&'static str>,
    pub unique_key: Vec<&'static str>,
    pub lock_table: &'static str,
    pub lock_columns: Vec<&'static str>,
    pub lock_unique_key: Vec<&'static str>,
    pub requires_transaction: bool,
    pub ensure_lock_table: CommerceSqlStatementContract,
    pub acquire_lock: CommerceSqlStatementContract,
    pub heartbeat_lock: CommerceSqlStatementContract,
    pub release_lock: CommerceSqlStatementContract,
    pub ensure_schema_version_table: CommerceSqlStatementContract,
    pub read_applied_migrations: CommerceSqlStatementContract,
    pub insert_applied_migration: CommerceSqlStatementContract,
    pub conflict_classifier: CommerceSqlConflictClassifier,
    pub plan: Vec<CommerceStorageMigration>,
    pub applied_migration_sequence: Vec<&'static str>,
    pub transaction_boundary_manager: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceBusinessRepositorySqlCatalog {
    pub domain: &'static str,
    pub repository_name: &'static str,
    pub tables: Vec<&'static str>,
    pub tenant_scope_field: &'static str,
    pub requires_transaction: bool,
    pub operations: Vec<CommerceBusinessRepositorySqlOperation>,
    pub conflict_classifiers: Vec<CommerceSqlConflictClassifier>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceBusinessRepositorySqlOperation {
    pub name: &'static str,
    pub table: &'static str,
    pub is_read: bool,
    pub is_write: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceStorageCapabilityManifest {
    pub name: &'static str,
    pub schema_version: &'static str,
    pub tables: Vec<&'static str>,
    pub indexes: Vec<&'static str>,
    pub migrations: Vec<&'static str>,
    pub migration_plan: Vec<CommerceStorageMigration>,
    pub migration_runner: CommerceMigrationRunnerSqlContract,
    pub repository_bindings: Vec<CommerceRepositoryBinding>,
    pub idempotency_repository: CommerceIdempotencyRepositorySqlContract,
    pub transaction_boundary: CommerceTransactionBoundarySqlContract,
    pub business_repositories: Vec<CommerceBusinessRepositorySqlCatalog>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceStorageMigration {
    pub sequence: u32,
    pub name: &'static str,
    pub domain: &'static str,
    pub source_path: &'static str,
    pub sql: &'static str,
    pub checksum: String,
    pub required_tables: Vec<&'static str>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceStorageMigrationPlanValidationError {
    pub code: &'static str,
    pub message: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMigrationRunnerSqlContractValidationError {
    pub code: &'static str,
    pub message: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceStorageAppliedMigrationRecord {
    pub sequence: u32,
    pub name: &'static str,
    pub domain: &'static str,
    pub source_path: &'static str,
    pub checksum: String,
    pub applied_at: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMigrationRunnerPreflight {
    pub runner_name: &'static str,
    pub schema_version_table: &'static str,
    pub applied_count: usize,
    pub pending_count: usize,
    pub requires_execution: bool,
    pub pending_migrations: Vec<CommerceStorageMigration>,
    pub next_migration: Option<CommerceStorageMigration>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMigrationRunnerPreflightError {
    pub code: &'static str,
    pub message: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMigrationRunnerExecutionStep {
    pub kind: &'static str,
    pub migration_sequence: Option<u32>,
    pub migration_name: Option<&'static str>,
    pub statement: CommerceSqlStatementContract,
    pub requires_transaction: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMigrationRunnerExecutionPlan {
    pub runner_name: &'static str,
    pub schema_version_table: &'static str,
    pub applied_count: usize,
    pub pending_count: usize,
    pub requires_execution: bool,
    pub steps: Vec<CommerceMigrationRunnerExecutionStep>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMigrationRunnerExecutionPlanValidationError {
    pub code: &'static str,
    pub message: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMigrationRunnerExecutionStepResult {
    pub kind: &'static str,
    pub migration_sequence: Option<u32>,
    pub migration_name: Option<&'static str>,
    pub success: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMigrationRunnerExecutionResult {
    pub runner_name: &'static str,
    pub schema_version_table: &'static str,
    pub executed_steps: usize,
    pub applied_migrations: usize,
    pub recorded_migrations: usize,
    pub success: bool,
    pub completed_at: &'static str,
    pub step_results: Vec<CommerceMigrationRunnerExecutionStepResult>,
    pub applied_records: Vec<CommerceStorageAppliedMigrationRecord>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMigrationRunnerExecutionResultValidationError {
    pub code: &'static str,
    pub message: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMigrationRunnerFinalState {
    pub runner_name: &'static str,
    pub schema_version_table: &'static str,
    pub applied_count_before: usize,
    pub applied_count_after: usize,
    pub newly_applied_count: usize,
    pub pending_count_after: usize,
    pub schema_is_current: bool,
    pub applied_migrations: Vec<CommerceStorageAppliedMigrationRecord>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMigrationRunnerFinalStateValidationError {
    pub code: &'static str,
    pub message: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMigrationRunnerFailureRecovery {
    pub runner_name: &'static str,
    pub schema_version_table: &'static str,
    pub failed_step_index: usize,
    pub failed_step_kind: &'static str,
    pub failed_migration_sequence: Option<u32>,
    pub failed_migration_name: Option<&'static str>,
    pub rollback_required: bool,
    pub stop_execution: bool,
    pub lock_was_acquired: bool,
    pub lock_release_required: bool,
    pub lock_owner_required: bool,
    pub release_lock_operation: Option<&'static str>,
    pub applied_count_before: usize,
    pub safely_recorded_count: usize,
    pub applied_count_after: usize,
    pub pending_count_after: usize,
    pub resume_migration: Option<CommerceStorageMigration>,
    pub applied_migrations: Vec<CommerceStorageAppliedMigrationRecord>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMigrationRunnerFailureRecoveryValidationError {
    pub code: &'static str,
    pub message: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMigrationRunnerLockRecord {
    pub runner_name: &'static str,
    pub lock_owner: &'static str,
    pub locked_until: &'static str,
    pub heartbeat_at: &'static str,
    pub created_at: &'static str,
    pub updated_at: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMigrationRunnerLockAcquireOutcome {
    pub runner_name: &'static str,
    pub lock_table: &'static str,
    pub requested_owner: &'static str,
    pub previous_owner: Option<&'static str>,
    pub effective_owner: &'static str,
    pub locked_until: &'static str,
    pub status: &'static str,
    pub can_run_migrations: bool,
    pub requires_steal: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMigrationRunnerLockLifecycle {
    pub runner_name: &'static str,
    pub lock_table: &'static str,
    pub lock_owner_binding: &'static str,
    pub fresh_acquire_status: &'static str,
    pub renewal_status: &'static str,
    pub stolen_status: &'static str,
    pub blocked_status: &'static str,
    pub fresh_acquire_can_run_migrations: bool,
    pub renewal_can_run_migrations: bool,
    pub stolen_can_run_migrations: bool,
    pub blocked_can_run_migrations: bool,
    pub steal_required_for_expired_lock: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMigrationRunnerLockCleanup {
    pub runner_name: &'static str,
    pub lock_table: &'static str,
    pub release_operation: &'static str,
    pub lock_owner_binding: &'static str,
    pub release_required_after_acquired_failure: bool,
    pub release_skipped_before_acquire: bool,
    pub release_uses_owner_binding: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMigrationRunnerLockValidationError {
    pub code: &'static str,
    pub message: String,
}

pub fn commerce_database_indexes() -> Vec<&'static str> {
    vec![
        "idx_commerce_idempotency_key_tenant_key",
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
        "idx_commerce_shop_organization",
        "idx_commerce_shop_status",
        "idx_commerce_shop_review_status",
        "idx_commerce_shop_application_review",
        "idx_commerce_shop_verification_status",
        "idx_commerce_shop_status_event_shop_created",
        "idx_commerce_shop_channel_shop_code",
        "idx_commerce_shop_fulfillment_profile_shop",
        "idx_commerce_shop_settlement_profile_status",
        "idx_commerce_shop_metric_snapshot_shop_date",
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
    ]
}

pub fn commerce_migration_names() -> Vec<&'static str> {
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
    ]
}

pub fn commerce_migration_plan() -> Vec<CommerceStorageMigration> {
    let source_path = "migrations/0001_commerce_foundation.sql";
    let sql = commerce_initial_migration_sql();
    vec![
        migration(
            1,
            "0001_core_idempotency.sql",
            "core",
            source_path,
            sql,
            vec!["commerce_idempotency_key"],
        ),
        migration(
            2,
            "0002_account_ledger.sql",
            "account",
            source_path,
            sql,
            vec![
                "commerce_account",
                "commerce_account_ledger_entry",
                "commerce_billing_prehold",
                "commerce_billing_history",
            ],
        ),
        migration(
            3,
            "0003_benefit.sql",
            "benefit",
            source_path,
            sql,
            vec!["benefit_definition"],
        ),
        migration(
            4,
            "0004_entitlement.sql",
            "entitlement",
            source_path,
            sql,
            vec![
                "entitlement_grant",
                "entitlement_account",
                "entitlement_ledger_entry",
            ],
        ),
        migration(
            5,
            "0005_membership.sql",
            "membership",
            source_path,
            sql,
            vec![
                "membership_plan",
                "membership_plan_version",
                "membership_plan_benefit",
                "membership_package_group",
                "membership_package",
                "membership_subscription",
                "membership_period",
            ],
        ),
        migration(
            6,
            "0006_promotion.sql",
            "promotion",
            source_path,
            sql,
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
        ),
        migration(
            7,
            "0007_catalog.sql",
            "catalog",
            source_path,
            sql,
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
                "commerce_cart",
                "commerce_cart_item",
                "commerce_user_address",
            ],
        ),
        migration(
            8,
            "0008_inventory.sql",
            "inventory",
            source_path,
            sql,
            vec![
                "commerce_inventory_stock",
                "commerce_inventory_reservation",
                "commerce_inventory_movement",
            ],
        ),
        migration(
            9,
            "0009_order.sql",
            "order",
            source_path,
            sql,
            vec![
                "commerce_checkout_session",
                "commerce_checkout_line",
                "commerce_checkout_quote",
                "commerce_order_address_snapshot",
                "commerce_order",
                "commerce_order_item",
                "commerce_order_amount_breakdown",
                "commerce_order_event",
                "commerce_order_cancellation",
                "commerce_fulfillment_order",
                "commerce_fulfillment_item",
                "commerce_shipment",
                "commerce_shipment_package",
                "commerce_shipment_tracking_event",
                "commerce_digital_delivery",
            ],
        ),
        migration(
            10,
            "0010_payment_refund.sql",
            "payment",
            source_path,
            sql,
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
        ),
        migration(
            11,
            "0011_exchange.sql",
            "exchange",
            source_path,
            sql,
            vec!["commerce_exchange_rule"],
        ),
        migration(
            12,
            "0012_invoice.sql",
            "invoice",
            source_path,
            sql,
            vec![
                "commerce_invoice_title",
                "commerce_invoice",
                "commerce_invoice_item",
            ],
        ),
        migration(
            13,
            "0013_billing_history.sql",
            "billing",
            source_path,
            sql,
            vec!["commerce_billing_history"],
        ),
        migration(
            14,
            "0014_shop.sql",
            "shop",
            source_path,
            sql,
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
            ],
        ),
    ]
}

pub fn validate_commerce_migration_plan(
    plan: &[CommerceStorageMigration],
) -> Result<(), CommerceStorageMigrationPlanValidationError> {
    let standard_plan = commerce_migration_plan();
    if plan.len() != standard_plan.len() {
        return Err(migration_plan_error(format!(
            "migration plan length drift: expected {}, actual {}",
            standard_plan.len(),
            plan.len()
        )));
    }

    for (index, (actual, expected)) in plan.iter().zip(standard_plan.iter()).enumerate() {
        let expected_sequence = (index + 1) as u32;
        if actual.sequence != expected_sequence || actual.sequence != expected.sequence {
            return Err(migration_plan_error(format!(
                "migration sequence drift for {}: expected {}, actual {}",
                expected.name, expected.sequence, actual.sequence
            )));
        }
        if actual.name != expected.name {
            return Err(migration_plan_error(format!(
                "migration name drift at sequence {}: expected {}, actual {}",
                expected.sequence, expected.name, actual.name
            )));
        }
        if actual.domain != expected.domain {
            return Err(migration_plan_error(format!(
                "migration domain drift for {}: expected {}, actual {}",
                expected.name, expected.domain, actual.domain
            )));
        }
        if actual.source_path != expected.source_path {
            return Err(migration_plan_error(format!(
                "migration source path drift for {}: expected {}, actual {}",
                expected.name, expected.source_path, actual.source_path
            )));
        }
        if actual.sql.trim().is_empty() {
            return Err(migration_plan_error(format!(
                "migration SQL text is required: {}",
                actual.name
            )));
        }
        let expected_checksum = migration_checksum(actual.name, actual.sql);
        if actual.checksum != expected_checksum {
            return Err(migration_plan_error(format!(
                "migration checksum drift for {}: expected {}, actual {}",
                actual.name, expected_checksum, actual.checksum
            )));
        }
        for table in &expected.required_tables {
            if !actual.required_tables.contains(table) {
                return Err(migration_plan_error(format!(
                    "migration plan must cover table {table}"
                )));
            }
        }
        if actual.required_tables != expected.required_tables {
            return Err(migration_plan_error(format!(
                "migration required table drift for {}",
                actual.name
            )));
        }
    }

    let declared_tables = plan
        .iter()
        .flat_map(|migration| migration.required_tables.iter().copied())
        .collect::<Vec<_>>();
    for table in commerce_database_tables() {
        if !declared_tables.contains(&table) {
            return Err(migration_plan_error(format!(
                "migration plan must cover table {table}"
            )));
        }
    }

    Ok(())
}

pub fn commerce_initial_migration_sql() -> &'static str {
    include_str!("../migrations/0001_commerce_foundation.sql")
}

pub fn commerce_repository_bindings() -> Vec<CommerceRepositoryBinding> {
    vec![
        binding(
            "core",
            "idempotency.repository",
            vec!["commerce_idempotency_key"],
        ),
        binding(
            "shop",
            "shop.repository",
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
            ],
        ),
        binding(
            "account",
            "account.repository",
            vec![
                "commerce_account",
                "commerce_account_ledger_entry",
                "commerce_billing_prehold",
                "commerce_billing_history",
            ],
        ),
        binding("benefit", "benefit.repository", vec!["benefit_definition"]),
        binding(
            "entitlement",
            "entitlement.repository",
            vec![
                "entitlement_grant",
                "entitlement_account",
                "entitlement_ledger_entry",
            ],
        ),
        binding(
            "membership",
            "membership.repository",
            vec![
                "membership_plan",
                "membership_plan_version",
                "membership_plan_benefit",
                "membership_package_group",
                "membership_package",
                "membership_subscription",
                "membership_period",
            ],
        ),
        binding(
            "promotion",
            "promotion.repository",
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
        ),
        binding(
            "catalog",
            "catalog.repository",
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
        ),
        binding(
            "inventory",
            "inventory.repository",
            vec![
                "commerce_inventory_stock",
                "commerce_inventory_reservation",
                "commerce_inventory_movement",
            ],
        ),
        binding(
            "cart",
            "cart.repository",
            vec!["commerce_cart", "commerce_cart_item"],
        ),
        binding(
            "buyer_address",
            "buyer_address.repository",
            vec!["commerce_user_address"],
        ),
        binding(
            "order",
            "order.repository",
            vec![
                "commerce_checkout_session",
                "commerce_checkout_line",
                "commerce_checkout_quote",
                "commerce_order_address_snapshot",
                "commerce_order",
                "commerce_order_item",
                "commerce_order_amount_breakdown",
                "commerce_order_event",
                "commerce_order_cancellation",
                "commerce_fulfillment_order",
                "commerce_fulfillment_item",
                "commerce_shipment",
                "commerce_shipment_package",
                "commerce_shipment_tracking_event",
                "commerce_digital_delivery",
            ],
        ),
        binding(
            "payment",
            "payment.repository",
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
        ),
        binding(
            "after_sales",
            "after_sales.repository",
            vec![
                "commerce_after_sales_request",
                "commerce_after_sales_item",
                "commerce_after_sales_return_shipment",
                "commerce_after_sales_event",
            ],
        ),
        binding(
            "exchange",
            "exchange.repository",
            vec!["commerce_exchange_rule"],
        ),
        binding(
            "invoice",
            "invoice.repository",
            vec![
                "commerce_invoice_title",
                "commerce_invoice",
                "commerce_invoice_item",
            ],
        ),
        binding(
            "billing",
            "billing.repository",
            vec!["commerce_billing_history"],
        ),
    ]
}

pub fn commerce_idempotency_repository_sql_contract() -> CommerceIdempotencyRepositorySqlContract {
    CommerceIdempotencyRepositorySqlContract {
        repository_name: "idempotency.repository",
        table: "commerce_idempotency_key",
        columns: vec![
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
        unique_key: vec!["tenant_id", "scope", "idempotency_key"],
        requires_transaction: true,
        find_by_key: statement(
            "find",
            "SELECT id, tenant_id, organization_id, scope, idempotency_key, request_hash, response_json, status, locked_until, expires_at, created_at, updated_at FROM commerce_idempotency_key WHERE tenant_id = ? AND scope = ? AND idempotency_key = ? LIMIT 1",
            vec!["tenant_id", "scope", "idempotency_key"],
        ),
        lock_new: statement(
            "lock",
            "INSERT INTO commerce_idempotency_key (id, tenant_id, organization_id, scope, idempotency_key, request_hash, status, locked_until, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
        ),
        complete: statement(
            "complete",
            "UPDATE commerce_idempotency_key SET response_json = ?, status = 'completed', updated_at = ? WHERE tenant_id = ? AND scope = ? AND idempotency_key = ?",
            vec![
                "response_json",
                "updated_at",
                "tenant_id",
                "scope",
                "idempotency_key",
            ],
        ),
        fail: statement(
            "fail",
            "UPDATE commerce_idempotency_key SET status = 'failed', updated_at = ? WHERE tenant_id = ? AND scope = ? AND idempotency_key = ?",
            vec!["updated_at", "tenant_id", "scope", "idempotency_key"],
        ),
        conflict_classifier: CommerceSqlConflictClassifier {
            table: "commerce_idempotency_key",
            constraint_name: "commerce_idempotency_key_tenant_id_scope_idempotency_key_key",
            unique_key: vec!["tenant_id", "scope", "idempotency_key"],
            error_code: "idempotency-key-conflict",
            message: "idempotency key lock conflicts must be resolved by reading the existing record",
        },
    }
}

pub fn commerce_transaction_boundary_sql_contract() -> CommerceTransactionBoundarySqlContract {
    CommerceTransactionBoundarySqlContract {
        manager_name: "commerce.runtime.transaction-manager",
        scope_fields: vec!["operation_id", "service_name", "tenant_id"],
        begin: statement("begin", "BEGIN", Vec::new()),
        commit: statement("commit", "COMMIT", Vec::new()),
        rollback: statement("rollback", "ROLLBACK", Vec::new()),
        covered_repositories: commerce_repository_bindings()
            .into_iter()
            .filter(|binding| binding.requires_transaction)
            .map(|binding| binding.repository_name)
            .collect(),
        rollback_is_required_on_dispatch_error: true,
        commit_is_required_after_idempotency_complete: true,
    }
}

pub fn commerce_migration_runner_sql_contract() -> CommerceMigrationRunnerSqlContract {
    CommerceMigrationRunnerSqlContract {
        runner_name: "commerce.database.migration-runner",
        schema_version_table: "commerce_schema_migration",
        columns: vec![
            "sequence",
            "name",
            "domain",
            "source_path",
            "checksum",
            "applied_at",
        ],
        unique_key: vec!["sequence", "name"],
        lock_table: "commerce_schema_migration_lock",
        lock_columns: vec![
            "runner_name",
            "lock_owner",
            "locked_until",
            "heartbeat_at",
            "created_at",
            "updated_at",
        ],
        lock_unique_key: vec!["runner_name"],
        requires_transaction: true,
        ensure_lock_table: statement(
            "ensure_lock_table",
            "CREATE TABLE IF NOT EXISTS commerce_schema_migration_lock (runner_name TEXT NOT NULL PRIMARY KEY, lock_owner TEXT NOT NULL, locked_until TEXT NOT NULL, heartbeat_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
            Vec::new(),
        ),
        acquire_lock: statement(
            "acquire_lock",
            "INSERT INTO commerce_schema_migration_lock (runner_name, lock_owner, locked_until, heartbeat_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            vec![
                "runner_name",
                "lock_owner",
                "locked_until",
                "heartbeat_at",
                "created_at",
                "updated_at",
            ],
        ),
        heartbeat_lock: statement(
            "heartbeat_lock",
            "UPDATE commerce_schema_migration_lock SET lock_owner = ?, locked_until = ?, heartbeat_at = ?, updated_at = ? WHERE runner_name = ?",
            vec![
                "lock_owner",
                "locked_until",
                "heartbeat_at",
                "updated_at",
                "runner_name",
            ],
        ),
        release_lock: statement(
            "release_lock",
            "DELETE FROM commerce_schema_migration_lock WHERE runner_name = ? AND lock_owner = ?",
            vec!["runner_name", "lock_owner"],
        ),
        ensure_schema_version_table: statement(
            "ensure_schema_version_table",
            "CREATE TABLE IF NOT EXISTS commerce_schema_migration (sequence INTEGER NOT NULL, name TEXT NOT NULL, domain TEXT NOT NULL, source_path TEXT NOT NULL, checksum TEXT NOT NULL, applied_at TEXT NOT NULL, PRIMARY KEY (sequence, name))",
            Vec::new(),
        ),
        read_applied_migrations: statement(
            "read_applied_migrations",
            "SELECT sequence, name, domain, source_path, checksum, applied_at FROM commerce_schema_migration ORDER BY sequence ASC",
            Vec::new(),
        ),
        insert_applied_migration: statement(
            "insert_applied_migration",
            "INSERT INTO commerce_schema_migration (sequence, name, domain, source_path, checksum, applied_at) VALUES (?, ?, ?, ?, ?, ?)",
            vec![
                "sequence",
                "name",
                "domain",
                "source_path",
                "checksum",
                "applied_at",
            ],
        ),
        conflict_classifier: CommerceSqlConflictClassifier {
            table: "commerce_schema_migration",
            constraint_name: "commerce_schema_migration_sequence_name_key",
            unique_key: vec!["sequence", "name"],
            error_code: "commerce-migration-already-applied",
            message: "migration runner must treat duplicate applied migrations as already applied",
        },
        plan: commerce_migration_plan(),
        applied_migration_sequence: commerce_migration_names(),
        transaction_boundary_manager: commerce_transaction_boundary_sql_contract().manager_name,
    }
}

pub fn commerce_migration_runner_lock_record(
    contract: &CommerceMigrationRunnerSqlContract,
    lock_owner: &'static str,
    locked_until: &'static str,
    heartbeat_at: &'static str,
) -> CommerceMigrationRunnerLockRecord {
    CommerceMigrationRunnerLockRecord {
        runner_name: contract.runner_name,
        lock_owner,
        locked_until,
        heartbeat_at,
        created_at: heartbeat_at,
        updated_at: heartbeat_at,
    }
}

pub fn commerce_migration_runner_lock_acquire_outcome(
    contract: &CommerceMigrationRunnerSqlContract,
    existing: Option<&CommerceMigrationRunnerLockRecord>,
    requested_owner: &'static str,
    now: &'static str,
    requested_locked_until: &'static str,
) -> Result<CommerceMigrationRunnerLockAcquireOutcome, CommerceMigrationRunnerLockValidationError> {
    if let Some(existing) = existing {
        if existing.runner_name != contract.runner_name {
            return Err(migration_lock_error(
                "lock runner name drift: lock record belongs to a different migration runner",
            ));
        }
        if existing.lock_owner == requested_owner {
            let expired = existing.locked_until <= now;
            return Ok(CommerceMigrationRunnerLockAcquireOutcome {
                runner_name: contract.runner_name,
                lock_table: contract.lock_table,
                requested_owner,
                previous_owner: Some(existing.lock_owner),
                effective_owner: requested_owner,
                locked_until: requested_locked_until,
                status: if expired {
                    "renewed_after_expiry"
                } else {
                    "renewed"
                },
                can_run_migrations: true,
                requires_steal: false,
            });
        }
        if existing.locked_until > now {
            return Ok(CommerceMigrationRunnerLockAcquireOutcome {
                runner_name: contract.runner_name,
                lock_table: contract.lock_table,
                requested_owner,
                previous_owner: Some(existing.lock_owner),
                effective_owner: existing.lock_owner,
                locked_until: existing.locked_until,
                status: "blocked",
                can_run_migrations: false,
                requires_steal: false,
            });
        }
        return Ok(CommerceMigrationRunnerLockAcquireOutcome {
            runner_name: contract.runner_name,
            lock_table: contract.lock_table,
            requested_owner,
            previous_owner: Some(existing.lock_owner),
            effective_owner: requested_owner,
            locked_until: requested_locked_until,
            status: "stolen",
            can_run_migrations: true,
            requires_steal: true,
        });
    }

    Ok(CommerceMigrationRunnerLockAcquireOutcome {
        runner_name: contract.runner_name,
        lock_table: contract.lock_table,
        requested_owner,
        previous_owner: None,
        effective_owner: requested_owner,
        locked_until: requested_locked_until,
        status: "acquired",
        can_run_migrations: true,
        requires_steal: false,
    })
}

pub fn commerce_migration_runner_lock_lifecycle(
    contract: &CommerceMigrationRunnerSqlContract,
) -> CommerceMigrationRunnerLockLifecycle {
    CommerceMigrationRunnerLockLifecycle {
        runner_name: contract.runner_name,
        lock_table: contract.lock_table,
        lock_owner_binding: "lock_owner",
        fresh_acquire_status: "acquired",
        renewal_status: "renewed",
        stolen_status: "stolen",
        blocked_status: "blocked",
        fresh_acquire_can_run_migrations: true,
        renewal_can_run_migrations: true,
        stolen_can_run_migrations: true,
        blocked_can_run_migrations: false,
        steal_required_for_expired_lock: true,
    }
}

pub fn commerce_migration_runner_lock_cleanup(
    contract: &CommerceMigrationRunnerSqlContract,
) -> CommerceMigrationRunnerLockCleanup {
    CommerceMigrationRunnerLockCleanup {
        runner_name: contract.runner_name,
        lock_table: contract.lock_table,
        release_operation: contract.release_lock.operation,
        lock_owner_binding: "lock_owner",
        release_required_after_acquired_failure: true,
        release_skipped_before_acquire: true,
        release_uses_owner_binding: true,
    }
}

pub fn validate_commerce_migration_runner_sql_contract(
    contract: &CommerceMigrationRunnerSqlContract,
) -> Result<(), CommerceMigrationRunnerSqlContractValidationError> {
    let standard = commerce_migration_runner_sql_contract();

    if contract.runner_name != standard.runner_name {
        return Err(migration_runner_error(format!(
            "migration runner name drift: expected {}, actual {}",
            standard.runner_name, contract.runner_name
        )));
    }
    if contract.schema_version_table != standard.schema_version_table {
        return Err(migration_runner_error(format!(
            "migration runner schema version table drift: expected {}, actual {}",
            standard.schema_version_table, contract.schema_version_table
        )));
    }
    if contract.columns != standard.columns {
        return Err(migration_runner_error(
            "migration runner column contract drift",
        ));
    }
    if contract.unique_key != standard.unique_key {
        return Err(migration_runner_error(
            "migration runner unique key contract drift",
        ));
    }
    if contract.lock_table != standard.lock_table {
        return Err(migration_runner_error("migration runner lock table drift"));
    }
    if contract.lock_columns != standard.lock_columns {
        return Err(migration_runner_error(
            "migration runner lock column contract drift",
        ));
    }
    if contract.lock_unique_key != standard.lock_unique_key {
        return Err(migration_runner_error(
            "migration runner lock unique key contract drift",
        ));
    }
    if !contract.requires_transaction {
        return Err(migration_runner_error(
            "migration runner must require transaction",
        ));
    }
    validate_runner_statement(
        "ensure lock table",
        &contract.ensure_lock_table,
        &standard.ensure_lock_table,
    )?;
    validate_runner_statement(
        "acquire lock",
        &contract.acquire_lock,
        &standard.acquire_lock,
    )?;
    validate_runner_statement(
        "heartbeat lock",
        &contract.heartbeat_lock,
        &standard.heartbeat_lock,
    )?;
    validate_runner_statement(
        "release lock",
        &contract.release_lock,
        &standard.release_lock,
    )?;
    validate_runner_statement(
        "ensure schema version table",
        &contract.ensure_schema_version_table,
        &standard.ensure_schema_version_table,
    )?;
    validate_runner_statement(
        "read applied migrations",
        &contract.read_applied_migrations,
        &standard.read_applied_migrations,
    )?;
    validate_runner_statement(
        "insert applied migration",
        &contract.insert_applied_migration,
        &standard.insert_applied_migration,
    )?;
    if contract.conflict_classifier != standard.conflict_classifier {
        return Err(migration_runner_error(
            "migration runner conflict classifier drift",
        ));
    }
    if contract.applied_migration_sequence != commerce_migration_names() {
        return Err(migration_runner_error(
            "migration runner applied migration sequence drift",
        ));
    }
    if contract.transaction_boundary_manager
        != commerce_transaction_boundary_sql_contract().manager_name
    {
        return Err(migration_runner_error(
            "migration runner transaction boundary manager drift",
        ));
    }
    validate_commerce_migration_plan(&contract.plan).map_err(|error| {
        migration_runner_error(format!(
            "migration runner migration plan drift: {}",
            error.message
        ))
    })?;

    Ok(())
}

pub fn validate_commerce_migration_runner_lock_record(
    contract: &CommerceMigrationRunnerSqlContract,
    record: &CommerceMigrationRunnerLockRecord,
) -> Result<(), CommerceMigrationRunnerLockValidationError> {
    if record.runner_name != contract.runner_name {
        return Err(migration_lock_error(
            "lock runner name drift: expected migration runner owner",
        ));
    }
    if record.lock_owner.trim().is_empty() {
        return Err(migration_lock_error(
            "lock owner is required for migration runner lock record",
        ));
    }
    if record.locked_until.trim().is_empty() {
        return Err(migration_lock_error(
            "locked until timestamp is required for migration runner lock record",
        ));
    }
    if record.heartbeat_at.trim().is_empty() {
        return Err(migration_lock_error(
            "heartbeat timestamp is required for migration runner lock record",
        ));
    }
    if record.created_at.trim().is_empty() || record.updated_at.trim().is_empty() {
        return Err(migration_lock_error(
            "lock record timestamps are required for migration runner lock record",
        ));
    }
    Ok(())
}

pub fn validate_commerce_migration_runner_lock_lifecycle(
    contract: &CommerceMigrationRunnerSqlContract,
    lifecycle: &CommerceMigrationRunnerLockLifecycle,
) -> Result<(), CommerceMigrationRunnerLockValidationError> {
    let standard = commerce_migration_runner_lock_lifecycle(contract);
    if lifecycle != &standard {
        return Err(migration_lock_error(format!(
            "lock lifecycle drift: expected {:?}, actual {:?}",
            standard, lifecycle
        )));
    }
    Ok(())
}

pub fn validate_commerce_migration_runner_lock_cleanup(
    contract: &CommerceMigrationRunnerSqlContract,
    cleanup: &CommerceMigrationRunnerLockCleanup,
) -> Result<(), CommerceMigrationRunnerLockValidationError> {
    let standard = commerce_migration_runner_lock_cleanup(contract);
    if cleanup != &standard {
        return Err(migration_lock_error(format!(
            "lock cleanup drift: expected {:?}, actual {:?}",
            standard, cleanup
        )));
    }
    Ok(())
}

pub fn commerce_storage_applied_migration_record(
    migration: &CommerceStorageMigration,
    applied_at: &'static str,
) -> CommerceStorageAppliedMigrationRecord {
    CommerceStorageAppliedMigrationRecord {
        sequence: migration.sequence,
        name: migration.name,
        domain: migration.domain,
        source_path: migration.source_path,
        checksum: migration.checksum.clone(),
        applied_at,
    }
}

pub fn commerce_migration_runner_preflight(
    contract: &CommerceMigrationRunnerSqlContract,
    applied_migrations: &[CommerceStorageAppliedMigrationRecord],
) -> Result<CommerceMigrationRunnerPreflight, CommerceMigrationRunnerPreflightError> {
    validate_commerce_migration_runner_sql_contract(contract).map_err(|error| {
        migration_runner_preflight_error(format!(
            "migration runner contract invalid: {}",
            error.message
        ))
    })?;

    if applied_migrations.len() > contract.plan.len() {
        return Err(migration_runner_preflight_error(format!(
            "applied migration count exceeds standard plan length: expected at most {}, actual {}",
            contract.plan.len(),
            applied_migrations.len()
        )));
    }

    for (index, actual) in applied_migrations.iter().enumerate() {
        let expected = &contract.plan[index];
        if actual.sequence != expected.sequence || actual.name != expected.name {
            return Err(migration_runner_preflight_error(format!(
                "applied migration sequence drift at position {}: expected {} {}, actual {} {}",
                index + 1,
                expected.sequence,
                expected.name,
                actual.sequence,
                actual.name
            )));
        }
        if actual.domain != expected.domain {
            return Err(migration_runner_preflight_error(format!(
                "applied migration domain drift for {}: expected {}, actual {}",
                expected.name, expected.domain, actual.domain
            )));
        }
        if actual.source_path != expected.source_path {
            return Err(migration_runner_preflight_error(format!(
                "applied migration source path drift for {}: expected {}, actual {}",
                expected.name, expected.source_path, actual.source_path
            )));
        }
        if actual.checksum != expected.checksum {
            return Err(migration_runner_preflight_error(format!(
                "applied migration checksum drift for {}: expected {}, actual {}",
                expected.name, expected.checksum, actual.checksum
            )));
        }
        if actual.applied_at.trim().is_empty() {
            return Err(migration_runner_preflight_error(format!(
                "applied migration timestamp is required: {}",
                expected.name
            )));
        }
    }

    let pending_migrations = contract
        .plan
        .iter()
        .skip(applied_migrations.len())
        .cloned()
        .collect::<Vec<_>>();
    let next_migration = pending_migrations.first().cloned();

    Ok(CommerceMigrationRunnerPreflight {
        runner_name: contract.runner_name,
        schema_version_table: contract.schema_version_table,
        applied_count: applied_migrations.len(),
        pending_count: pending_migrations.len(),
        requires_execution: !pending_migrations.is_empty(),
        pending_migrations,
        next_migration,
    })
}

pub fn commerce_migration_runner_execution_plan(
    contract: &CommerceMigrationRunnerSqlContract,
    applied_migrations: &[CommerceStorageAppliedMigrationRecord],
) -> Result<CommerceMigrationRunnerExecutionPlan, CommerceMigrationRunnerPreflightError> {
    let preflight = commerce_migration_runner_preflight(contract, applied_migrations)?;
    let mut steps = vec![
        migration_execution_step(
            "ensure_lock_table",
            None,
            contract.ensure_lock_table.clone(),
            contract.requires_transaction,
        ),
        migration_execution_step(
            "acquire_lock",
            None,
            contract.acquire_lock.clone(),
            contract.requires_transaction,
        ),
        migration_execution_step(
            "ensure_schema_version_table",
            None,
            contract.ensure_schema_version_table.clone(),
            contract.requires_transaction,
        ),
        migration_execution_step(
            "read_applied_migrations",
            None,
            contract.read_applied_migrations.clone(),
            contract.requires_transaction,
        ),
    ];

    for migration in &preflight.pending_migrations {
        steps.push(migration_execution_step(
            "apply_migration_sql",
            Some(migration),
            statement("apply_migration_sql", migration.sql, Vec::new()),
            contract.requires_transaction,
        ));
        steps.push(migration_execution_step(
            "record_applied_migration",
            Some(migration),
            contract.insert_applied_migration.clone(),
            contract.requires_transaction,
        ));
    }
    steps.push(migration_execution_step(
        "release_lock",
        None,
        contract.release_lock.clone(),
        contract.requires_transaction,
    ));

    Ok(CommerceMigrationRunnerExecutionPlan {
        runner_name: preflight.runner_name,
        schema_version_table: preflight.schema_version_table,
        applied_count: preflight.applied_count,
        pending_count: preflight.pending_count,
        requires_execution: preflight.requires_execution,
        steps,
    })
}

pub fn validate_commerce_migration_runner_execution_plan(
    contract: &CommerceMigrationRunnerSqlContract,
    applied_migrations: &[CommerceStorageAppliedMigrationRecord],
    plan: &CommerceMigrationRunnerExecutionPlan,
) -> Result<(), CommerceMigrationRunnerExecutionPlanValidationError> {
    let standard = commerce_migration_runner_execution_plan(contract, applied_migrations)
        .map_err(|error| migration_execution_plan_error(error.message))?;

    if plan.runner_name != standard.runner_name {
        return Err(migration_execution_plan_error(format!(
            "migration runner execution plan runner name drift: expected {}, actual {}",
            standard.runner_name, plan.runner_name
        )));
    }
    if plan.schema_version_table != standard.schema_version_table {
        return Err(migration_execution_plan_error(format!(
            "migration runner execution plan schema table drift: expected {}, actual {}",
            standard.schema_version_table, plan.schema_version_table
        )));
    }
    if plan.applied_count != standard.applied_count {
        return Err(migration_execution_plan_error(format!(
            "migration runner execution plan applied count drift: expected {}, actual {}",
            standard.applied_count, plan.applied_count
        )));
    }
    if plan.pending_count != standard.pending_count {
        return Err(migration_execution_plan_error(format!(
            "migration runner execution plan pending count drift: expected {}, actual {}",
            standard.pending_count, plan.pending_count
        )));
    }
    if plan.requires_execution != standard.requires_execution {
        return Err(migration_execution_plan_error(
            "migration runner execution plan execution requirement drift",
        ));
    }
    if plan.steps.len() != standard.steps.len() {
        return Err(migration_execution_plan_error(format!(
            "migration runner execution plan step count drift: expected {}, actual {}",
            standard.steps.len(),
            plan.steps.len()
        )));
    }

    for (index, (actual, expected)) in plan.steps.iter().zip(standard.steps.iter()).enumerate() {
        if actual != expected {
            return Err(migration_execution_plan_error(format!(
                "migration runner execution step drift at position {}: expected {:?}, actual {:?}",
                index + 1,
                expected,
                actual
            )));
        }
    }

    Ok(())
}

pub fn commerce_migration_runner_execution_result(
    plan: &CommerceMigrationRunnerExecutionPlan,
    completed_at: &'static str,
) -> CommerceMigrationRunnerExecutionResult {
    let step_results = plan
        .steps
        .iter()
        .map(|step| CommerceMigrationRunnerExecutionStepResult {
            kind: step.kind,
            migration_sequence: step.migration_sequence,
            migration_name: step.migration_name,
            success: true,
        })
        .collect::<Vec<_>>();
    let applied_records = plan
        .steps
        .iter()
        .filter(|step| step.kind == "record_applied_migration")
        .filter_map(|step| {
            Some(CommerceStorageAppliedMigrationRecord {
                sequence: step.migration_sequence?,
                name: step.migration_name?,
                domain: step
                    .migration_name
                    .and_then(migration_domain_for_name)
                    .unwrap_or("unknown"),
                source_path: step
                    .migration_name
                    .and_then(migration_source_path_for_name)
                    .unwrap_or("unknown"),
                checksum: step
                    .migration_name
                    .and_then(migration_checksum_for_name)
                    .unwrap_or_else(|| "unknown".to_string()),
                applied_at: completed_at,
            })
        })
        .collect::<Vec<_>>();

    CommerceMigrationRunnerExecutionResult {
        runner_name: plan.runner_name,
        schema_version_table: plan.schema_version_table,
        executed_steps: step_results.len(),
        applied_migrations: plan
            .steps
            .iter()
            .filter(|step| step.kind == "apply_migration_sql")
            .count(),
        recorded_migrations: applied_records.len(),
        success: true,
        completed_at,
        step_results,
        applied_records,
    }
}

pub fn commerce_migration_runner_failed_execution_result(
    plan: &CommerceMigrationRunnerExecutionPlan,
    failed_step_index: usize,
    completed_at: &'static str,
) -> Result<
    CommerceMigrationRunnerExecutionResult,
    CommerceMigrationRunnerFailureRecoveryValidationError,
> {
    if failed_step_index >= plan.steps.len() {
        return Err(migration_failure_recovery_error(format!(
            "failed step index out of range: expected < {}, actual {}",
            plan.steps.len(),
            failed_step_index
        )));
    }

    let step_results = plan
        .steps
        .iter()
        .take(failed_step_index + 1)
        .enumerate()
        .map(|(index, step)| CommerceMigrationRunnerExecutionStepResult {
            kind: step.kind,
            migration_sequence: step.migration_sequence,
            migration_name: step.migration_name,
            success: index != failed_step_index,
        })
        .collect::<Vec<_>>();
    let applied_records = plan
        .steps
        .iter()
        .take(failed_step_index)
        .filter(|step| step.kind == "record_applied_migration")
        .filter_map(|step| {
            Some(CommerceStorageAppliedMigrationRecord {
                sequence: step.migration_sequence?,
                name: step.migration_name?,
                domain: step
                    .migration_name
                    .and_then(migration_domain_for_name)
                    .unwrap_or("unknown"),
                source_path: step
                    .migration_name
                    .and_then(migration_source_path_for_name)
                    .unwrap_or("unknown"),
                checksum: step
                    .migration_name
                    .and_then(migration_checksum_for_name)
                    .unwrap_or_else(|| "unknown".to_string()),
                applied_at: completed_at,
            })
        })
        .collect::<Vec<_>>();

    Ok(CommerceMigrationRunnerExecutionResult {
        runner_name: plan.runner_name,
        schema_version_table: plan.schema_version_table,
        executed_steps: step_results.len(),
        applied_migrations: plan
            .steps
            .iter()
            .take(failed_step_index)
            .filter(|step| step.kind == "apply_migration_sql")
            .count(),
        recorded_migrations: applied_records.len(),
        success: false,
        completed_at,
        step_results,
        applied_records,
    })
}

pub fn validate_commerce_migration_runner_execution_result(
    plan: &CommerceMigrationRunnerExecutionPlan,
    result: &CommerceMigrationRunnerExecutionResult,
) -> Result<(), CommerceMigrationRunnerExecutionResultValidationError> {
    if result.runner_name != plan.runner_name {
        return Err(migration_execution_result_error(format!(
            "migration runner execution result runner name drift: expected {}, actual {}",
            plan.runner_name, result.runner_name
        )));
    }
    if result.schema_version_table != plan.schema_version_table {
        return Err(migration_execution_result_error(format!(
            "migration runner execution result schema table drift: expected {}, actual {}",
            plan.schema_version_table, result.schema_version_table
        )));
    }
    if result.executed_steps != plan.steps.len() {
        return Err(migration_execution_result_error(format!(
            "migration runner execution result executed step count drift: expected {}, actual {}",
            plan.steps.len(),
            result.executed_steps
        )));
    }
    if result.step_results.len() != plan.steps.len() {
        return Err(migration_execution_result_error(format!(
            "migration runner execution result step result count drift: expected {}, actual {}",
            plan.steps.len(),
            result.step_results.len()
        )));
    }
    if !result.success {
        return Err(migration_execution_result_error(
            "migration runner execution result must be successful",
        ));
    }
    if result.completed_at.trim().is_empty() {
        return Err(migration_execution_result_error(
            "migration runner execution result completed timestamp is required",
        ));
    }

    for (index, (step, step_result)) in plan
        .steps
        .iter()
        .zip(result.step_results.iter())
        .enumerate()
    {
        if !step_result.success {
            return Err(migration_execution_result_error(format!(
                "migration runner failed execution step at position {}",
                index + 1
            )));
        }
        if step_result.kind != step.kind
            || step_result.migration_sequence != step.migration_sequence
            || step_result.migration_name != step.migration_name
        {
            return Err(migration_execution_result_error(format!(
                "migration runner execution result step drift at position {}",
                index + 1
            )));
        }
    }

    let expected_records = plan
        .steps
        .iter()
        .filter(|step| step.kind == "record_applied_migration")
        .count();
    if result.applied_records.len() != expected_records {
        return Err(migration_execution_result_error(format!(
            "migration runner execution result applied record count drift: expected {}, actual {}",
            expected_records,
            result.applied_records.len()
        )));
    }
    if result.applied_migrations
        != plan
            .steps
            .iter()
            .filter(|step| step.kind == "apply_migration_sql")
            .count()
    {
        return Err(migration_execution_result_error(
            "migration runner execution result applied migration count drift",
        ));
    }
    if result.recorded_migrations != expected_records {
        return Err(migration_execution_result_error(
            "migration runner execution result recorded migration count drift",
        ));
    }

    for (index, record) in result.applied_records.iter().enumerate() {
        let expected_step = plan
            .steps
            .iter()
            .filter(|step| step.kind == "record_applied_migration")
            .nth(index)
            .expect("expected record step");
        if record.sequence != expected_step.migration_sequence.unwrap_or_default()
            || Some(record.name) != expected_step.migration_name
        {
            return Err(migration_execution_result_error(format!(
                "migration runner execution result applied record drift at position {}",
                index + 1
            )));
        }
        let expected_migration = commerce_migration_plan()
            .into_iter()
            .find(|migration| migration.name == record.name)
            .ok_or_else(|| {
                migration_execution_result_error(format!(
                    "migration runner execution result unknown applied record: {}",
                    record.name
                ))
            })?;
        if record.domain != expected_migration.domain
            || record.source_path != expected_migration.source_path
            || record.checksum != expected_migration.checksum
        {
            return Err(migration_execution_result_error(format!(
                "migration runner execution result applied record metadata drift: {}",
                record.name
            )));
        }
        if record.applied_at.trim().is_empty() {
            return Err(migration_execution_result_error(format!(
                "migration runner execution result applied timestamp is required: {}",
                record.name
            )));
        }
    }

    Ok(())
}

pub fn commerce_migration_runner_failure_recovery(
    contract: &CommerceMigrationRunnerSqlContract,
    before: &[CommerceStorageAppliedMigrationRecord],
    result: &CommerceMigrationRunnerExecutionResult,
) -> Result<
    CommerceMigrationRunnerFailureRecovery,
    CommerceMigrationRunnerFailureRecoveryValidationError,
> {
    let expected_plan =
        commerce_migration_runner_execution_plan(contract, before).map_err(|error| {
            migration_failure_recovery_error(format!(
                "initial applied migration state invalid: {}",
                error.message
            ))
        })?;
    validate_failed_migration_execution_result(&expected_plan, result)?;

    let failed_step_index = result
        .step_results
        .iter()
        .position(|step| !step.success)
        .ok_or_else(|| {
            migration_failure_recovery_error("failed execution result must contain a failed step")
        })?;
    let failed_step = expected_plan.steps.get(failed_step_index).ok_or_else(|| {
        migration_failure_recovery_error(format!(
            "failed step index out of range: {}",
            failed_step_index
        ))
    })?;
    let lock_was_acquired = result
        .step_results
        .iter()
        .any(|step| step.kind == "acquire_lock" && step.success);
    let lock_was_released = result
        .step_results
        .iter()
        .any(|step| step.kind == "release_lock" && step.success);
    let lock_release_required = lock_was_acquired && !lock_was_released;
    let mut applied_migrations = before.to_vec();
    applied_migrations.extend(result.applied_records.clone());
    let post_preflight = commerce_migration_runner_preflight(contract, &applied_migrations)
        .map_err(|error| {
            migration_failure_recovery_error(format!(
                "recoverable applied migration state invalid: {}",
                error.message
            ))
        })?;

    Ok(CommerceMigrationRunnerFailureRecovery {
        runner_name: contract.runner_name,
        schema_version_table: contract.schema_version_table,
        failed_step_index,
        failed_step_kind: failed_step.kind,
        failed_migration_sequence: failed_step.migration_sequence,
        failed_migration_name: failed_step.migration_name,
        rollback_required: failed_step.requires_transaction,
        stop_execution: true,
        lock_was_acquired,
        lock_release_required,
        lock_owner_required: lock_release_required,
        release_lock_operation: lock_release_required.then_some(contract.release_lock.operation),
        applied_count_before: before.len(),
        safely_recorded_count: result.applied_records.len(),
        applied_count_after: applied_migrations.len(),
        pending_count_after: post_preflight.pending_count,
        resume_migration: post_preflight.next_migration,
        applied_migrations,
    })
}

pub fn validate_commerce_migration_runner_failure_recovery(
    contract: &CommerceMigrationRunnerSqlContract,
    before: &[CommerceStorageAppliedMigrationRecord],
    result: &CommerceMigrationRunnerExecutionResult,
    recovery: &CommerceMigrationRunnerFailureRecovery,
) -> Result<(), CommerceMigrationRunnerFailureRecoveryValidationError> {
    let standard = commerce_migration_runner_failure_recovery(contract, before, result)?;
    commerce_migration_runner_preflight(contract, &recovery.applied_migrations).map_err(
        |error| {
            migration_failure_recovery_error(format!(
                "recoverable applied migration state invalid: {}",
                error.message
            ))
        },
    )?;

    if recovery != &standard {
        return Err(migration_failure_recovery_error(format!(
            "migration runner failure recovery drift: expected {:?}, actual {:?}",
            standard, recovery
        )));
    }

    Ok(())
}

pub fn commerce_migration_runner_final_state(
    contract: &CommerceMigrationRunnerSqlContract,
    before: &[CommerceStorageAppliedMigrationRecord],
    result: &CommerceMigrationRunnerExecutionResult,
) -> Result<CommerceMigrationRunnerFinalState, CommerceMigrationRunnerFinalStateValidationError> {
    let expected_plan =
        commerce_migration_runner_execution_plan(contract, before).map_err(|error| {
            migration_final_state_error(format!(
                "initial applied migration state invalid: {}",
                error.message
            ))
        })?;
    validate_commerce_migration_runner_execution_result(&expected_plan, result).map_err(
        |error| {
            migration_final_state_error(format!(
                "execution result must match initial applied state: {}",
                error.message
            ))
        },
    )?;

    let mut applied_migrations = before.to_vec();
    applied_migrations.extend(result.applied_records.clone());
    let post_preflight = commerce_migration_runner_preflight(contract, &applied_migrations)
        .map_err(|error| {
            migration_final_state_error(format!(
                "final applied migration state invalid: {}",
                error.message
            ))
        })?;

    Ok(CommerceMigrationRunnerFinalState {
        runner_name: contract.runner_name,
        schema_version_table: contract.schema_version_table,
        applied_count_before: before.len(),
        applied_count_after: applied_migrations.len(),
        newly_applied_count: result.applied_records.len(),
        pending_count_after: post_preflight.pending_count,
        schema_is_current: !post_preflight.requires_execution,
        applied_migrations,
    })
}

pub fn validate_commerce_migration_runner_final_state(
    contract: &CommerceMigrationRunnerSqlContract,
    before: &[CommerceStorageAppliedMigrationRecord],
    result: &CommerceMigrationRunnerExecutionResult,
    final_state: &CommerceMigrationRunnerFinalState,
) -> Result<(), CommerceMigrationRunnerFinalStateValidationError> {
    let standard = commerce_migration_runner_final_state(contract, before, result)?;
    commerce_migration_runner_preflight(contract, &final_state.applied_migrations).map_err(
        |error| {
            migration_final_state_error(format!(
                "final applied migration state invalid: {}",
                error.message
            ))
        },
    )?;

    if final_state.runner_name != standard.runner_name {
        return Err(migration_final_state_error(format!(
            "migration runner final state runner name drift: expected {}, actual {}",
            standard.runner_name, final_state.runner_name
        )));
    }
    if final_state.schema_version_table != standard.schema_version_table {
        return Err(migration_final_state_error(format!(
            "migration runner final state schema table drift: expected {}, actual {}",
            standard.schema_version_table, final_state.schema_version_table
        )));
    }
    if final_state.applied_count_before != standard.applied_count_before {
        return Err(migration_final_state_error(format!(
            "migration runner final state initial count drift: expected {}, actual {}",
            standard.applied_count_before, final_state.applied_count_before
        )));
    }
    if final_state.newly_applied_count != standard.newly_applied_count {
        return Err(migration_final_state_error(format!(
            "migration runner final state newly applied count drift: expected {}, actual {}",
            standard.newly_applied_count, final_state.newly_applied_count
        )));
    }
    if final_state.applied_count_after != standard.applied_count_after {
        return Err(migration_final_state_error(format!(
            "migration runner final state applied count drift: expected {}, actual {}",
            standard.applied_count_after, final_state.applied_count_after
        )));
    }
    if final_state.pending_count_after != standard.pending_count_after {
        return Err(migration_final_state_error(format!(
            "migration runner final state pending count drift: expected {}, actual {}",
            standard.pending_count_after, final_state.pending_count_after
        )));
    }
    if final_state.schema_is_current != standard.schema_is_current {
        return Err(migration_final_state_error(
            "migration runner final state schema current flag drift",
        ));
    }
    if final_state.applied_migrations != standard.applied_migrations {
        return Err(migration_final_state_error(
            "migration runner final state applied migration records drift",
        ));
    }

    Ok(())
}

pub fn commerce_business_repository_sql_catalogs() -> Vec<CommerceBusinessRepositorySqlCatalog> {
    vec![
        business_catalog_with_conflicts(
            "shop",
            "shop.repository",
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
            ],
            vec![
                read("shop.list_shops", "commerce_shop"),
                read("shop.find_shop", "commerce_shop"),
                write("shop.create_shop", "commerce_shop"),
                write("shop.update_shop", "commerce_shop"),
                write("shop.update_shop_status", "commerce_shop"),
                write("shop.submit_application", "commerce_shop_application"),
                read("shop.list_applications", "commerce_shop_application"),
                read("shop.list_verifications", "commerce_shop_verification"),
                write("shop.update_verification", "commerce_shop_verification"),
                write("shop.append_status_event", "commerce_shop_status_event"),
                read("shop.list_status_events", "commerce_shop_status_event"),
                read("shop.list_channels", "commerce_shop_channel"),
                write("shop.upsert_channel", "commerce_shop_channel"),
                read(
                    "shop.find_fulfillment_profile",
                    "commerce_shop_fulfillment_profile",
                ),
                write(
                    "shop.upsert_fulfillment_profile",
                    "commerce_shop_fulfillment_profile",
                ),
                read(
                    "shop.find_settlement_profile",
                    "commerce_shop_settlement_profile",
                ),
                write(
                    "shop.upsert_settlement_profile",
                    "commerce_shop_settlement_profile",
                ),
                write(
                    "shop.review_settlement_profile",
                    "commerce_shop_settlement_profile",
                ),
                read(
                    "shop.list_metric_snapshots",
                    "commerce_shop_metric_snapshot",
                ),
                read("shop.find_business_hours", "commerce_shop_business_hour"),
                write("shop.upsert_business_hours", "commerce_shop_business_hour"),
                read("shop.find_readiness", "commerce_shop_readiness"),
                write("shop.upsert_readiness", "commerce_shop_readiness"),
                read("shop.list_service_areas", "commerce_shop_service_area"),
                write("shop.upsert_service_area", "commerce_shop_service_area"),
                read("shop.list_policies", "commerce_shop_policy"),
                write("shop.upsert_policy", "commerce_shop_policy"),
                read("shop.find_deposit_account", "commerce_shop_deposit_account"),
                write(
                    "shop.upsert_deposit_account",
                    "commerce_shop_deposit_account",
                ),
                write(
                    "shop.review_deposit_account",
                    "commerce_shop_deposit_account",
                ),
                read("shop.list_risk_signals", "commerce_shop_risk_signal"),
                write("shop.append_risk_signal", "commerce_shop_risk_signal"),
                write("shop.resolve_risk_signal", "commerce_shop_risk_signal"),
                read(
                    "shop.list_category_bindings",
                    "commerce_shop_category_binding",
                ),
                write(
                    "shop.upsert_category_binding",
                    "commerce_shop_category_binding",
                ),
                read(
                    "shop.list_brand_authorizations",
                    "commerce_shop_brand_authorization",
                ),
                write(
                    "shop.upsert_brand_authorization",
                    "commerce_shop_brand_authorization",
                ),
                read("shop.list_qualifications", "commerce_shop_qualification"),
                write("shop.upsert_qualification", "commerce_shop_qualification"),
                read(
                    "shop.list_customer_services",
                    "commerce_shop_customer_service",
                ),
                write(
                    "shop.upsert_customer_service",
                    "commerce_shop_customer_service",
                ),
                read("shop.list_return_addresses", "commerce_shop_return_address"),
                write("shop.upsert_return_address", "commerce_shop_return_address"),
                read(
                    "shop.list_shipping_templates",
                    "commerce_shop_shipping_template",
                ),
                write(
                    "shop.upsert_shipping_template",
                    "commerce_shop_shipping_template",
                ),
            ],
            vec![
                CommerceSqlConflictClassifier {
                    table: "commerce_shop_service_area",
                    constraint_name: "uk_commerce_shop_service_area_scope",
                    unique_key: vec![
                        "tenant_id",
                        "shop_id",
                        "area_type",
                        "country_code",
                        "area_key",
                    ],
                    error_code: "commerce-shop-service-area-scope-conflict",
                    message:
                        "shop service area scope already exists for the same normalized delivery coverage",
                },
                CommerceSqlConflictClassifier {
                    table: "commerce_shop_category_binding",
                    constraint_name: "uk_commerce_shop_category_binding_scope",
                    unique_key: vec!["tenant_id", "shop_id", "shop_category_code"],
                    error_code: "commerce-shop-category-binding-scope-conflict",
                    message:
                        "shop category binding already exists for the same shop category code",
                },
                CommerceSqlConflictClassifier {
                    table: "commerce_shop_brand_authorization",
                    constraint_name: "uk_commerce_shop_brand_authorization_scope",
                    unique_key: vec!["tenant_id", "shop_id", "brand_code"],
                    error_code: "commerce-shop-brand-authorization-scope-conflict",
                    message:
                        "shop brand authorization already exists for the same shop brand code",
                },
                CommerceSqlConflictClassifier {
                    table: "commerce_shop_qualification",
                    constraint_name: "uk_commerce_shop_qualification_scope",
                    unique_key: vec![
                        "tenant_id",
                        "shop_id",
                        "qualification_type",
                        "subject_type",
                        "subject_id",
                    ],
                    error_code: "commerce-shop-qualification-scope-conflict",
                    message:
                        "shop qualification already exists for the same qualification subject",
                },
                CommerceSqlConflictClassifier {
                    table: "commerce_shop_customer_service",
                    constraint_name: "uk_commerce_shop_customer_service_scope",
                    unique_key: vec!["tenant_id", "shop_id", "service_channel", "contact_ref"],
                    error_code: "commerce-shop-customer-service-scope-conflict",
                    message:
                        "shop customer service contact already exists for the same service channel",
                },
                CommerceSqlConflictClassifier {
                    table: "commerce_shop_customer_service",
                    constraint_name: "uk_commerce_shop_customer_service_single_default",
                    unique_key: vec!["tenant_id", "shop_id", "service_channel"],
                    error_code: "commerce-shop-customer-service-default-conflict",
                    message:
                        "shop customer service default already exists for the same service channel",
                },
                CommerceSqlConflictClassifier {
                    table: "commerce_shop_return_address",
                    constraint_name: "uk_commerce_shop_return_address_scope",
                    unique_key: vec!["tenant_id", "shop_id", "address_usage", "address_key"],
                    error_code: "commerce-shop-return-address-scope-conflict",
                    message:
                        "shop return address already exists for the same normalized address",
                },
                CommerceSqlConflictClassifier {
                    table: "commerce_shop_return_address",
                    constraint_name: "uk_commerce_shop_return_address_single_default",
                    unique_key: vec!["tenant_id", "shop_id", "address_usage"],
                    error_code: "commerce-shop-return-address-default-conflict",
                    message:
                        "shop return address default already exists for the same address usage",
                },
                CommerceSqlConflictClassifier {
                    table: "commerce_shop_shipping_template",
                    constraint_name: "uk_commerce_shop_shipping_template_scope",
                    unique_key: vec!["tenant_id", "shop_id", "template_code"],
                    error_code: "commerce-shop-shipping-template-scope-conflict",
                    message:
                        "shop shipping template already exists for the same template code",
                },
                CommerceSqlConflictClassifier {
                    table: "commerce_shop_shipping_template",
                    constraint_name: "uk_commerce_shop_shipping_template_single_default",
                    unique_key: vec!["tenant_id", "shop_id", "delivery_method"],
                    error_code: "commerce-shop-shipping-template-default-conflict",
                    message:
                        "shop shipping template default already exists for the same delivery method",
                },
            ],
        ),
        business_catalog(
            "account",
            "account.repository",
            vec![
                "commerce_account",
                "commerce_account_ledger_entry",
                "commerce_billing_prehold",
                "commerce_billing_history",
            ],
            vec![
                read("account.find_by_owner_asset", "commerce_account"),
                write("account.upsert_account", "commerce_account"),
                write(
                    "account.append_ledger_entry",
                    "commerce_account_ledger_entry",
                ),
                write("account.create_prehold", "commerce_billing_prehold"),
                write("account.settle_prehold", "commerce_billing_prehold"),
                write("account.release_prehold", "commerce_billing_prehold"),
            ],
        ),
        business_catalog(
            "benefit",
            "benefit.repository",
            vec!["benefit_definition"],
            vec![
                read("benefit.list_definitions", "benefit_definition"),
                write("benefit.upsert_definition", "benefit_definition"),
                write("benefit.archive_definition", "benefit_definition"),
            ],
        ),
        business_catalog(
            "entitlement",
            "entitlement.repository",
            vec![
                "entitlement_grant",
                "entitlement_account",
                "entitlement_ledger_entry",
            ],
            vec![
                read("entitlement.find_grant", "entitlement_grant"),
                write("entitlement.create_grant", "entitlement_grant"),
                read("entitlement.find_account", "entitlement_account"),
                write("entitlement.upsert_account", "entitlement_account"),
                read(
                    "entitlement.list_ledger_entries",
                    "entitlement_ledger_entry",
                ),
                write(
                    "entitlement.append_ledger_entry",
                    "entitlement_ledger_entry",
                ),
            ],
        ),
        business_catalog(
            "membership",
            "membership.repository",
            vec![
                "membership_plan",
                "membership_plan_version",
                "membership_plan_benefit",
                "membership_package_group",
                "membership_package",
                "membership_subscription",
                "membership_period",
            ],
            vec![
                read("membership.list_plans", "membership_plan"),
                write("membership.upsert_plan", "membership_plan"),
                read("membership.list_plan_versions", "membership_plan_version"),
                write("membership.publish_plan_version", "membership_plan_version"),
                read("membership.list_plan_benefits", "membership_plan_benefit"),
                write("membership.upsert_plan_benefit", "membership_plan_benefit"),
                read("membership.list_package_groups", "membership_package_group"),
                write(
                    "membership.upsert_package_group",
                    "membership_package_group",
                ),
                read("membership.list_packages", "membership_package"),
                write("membership.upsert_package", "membership_package"),
                read("membership.find_subscription", "membership_subscription"),
                write(
                    "membership.activate_subscription",
                    "membership_subscription",
                ),
                write("membership.expire_subscription", "membership_subscription"),
                read("membership.list_periods", "membership_period"),
                write("membership.append_period", "membership_period"),
            ],
        ),
        business_catalog(
            "promotion",
            "promotion.repository",
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
            vec![
                read("promotion.list_offers", "promotion_offer"),
                write("promotion.upsert_offer", "promotion_offer"),
                read("promotion.list_offer_versions", "promotion_offer_version"),
                write("promotion.publish_offer_version", "promotion_offer_version"),
                read("promotion.list_coupon_stocks", "promotion_coupon_stock"),
                write("promotion.create_coupon_stock", "promotion_coupon_stock"),
                read("promotion.find_code", "promotion_code"),
                write("promotion.upsert_code", "promotion_code"),
                read("promotion.find_user_coupon", "promotion_user_coupon"),
                write("promotion.issue_user_coupon", "promotion_user_coupon"),
                write("promotion.redeem_user_coupon", "promotion_user_coupon"),
                read(
                    "promotion.list_coupon_ledger_entries",
                    "promotion_coupon_ledger_entry",
                ),
                write(
                    "promotion.append_coupon_ledger_entry",
                    "promotion_coupon_ledger_entry",
                ),
                read(
                    "promotion.find_discount_application",
                    "promotion_discount_application",
                ),
                write("promotion.apply_discount", "promotion_discount_application"),
                write(
                    "promotion.allocate_discount",
                    "promotion_discount_allocation",
                ),
            ],
        ),
        business_catalog(
            "catalog",
            "catalog.repository",
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
            vec![
                read("catalog.list_categories", "commerce_product_category"),
                write("catalog.upsert_category", "commerce_product_category"),
                read("catalog.list_attributes", "commerce_product_attribute"),
                write("catalog.upsert_attribute", "commerce_product_attribute"),
                read("catalog.list_spu", "commerce_product_spu"),
                write("catalog.upsert_spu", "commerce_product_spu"),
                write(
                    "catalog.assign_spu_category",
                    "commerce_product_spu_category",
                ),
                read("catalog.list_skus", "commerce_product_sku"),
                write("catalog.upsert_sku", "commerce_product_sku"),
                write(
                    "catalog.upsert_sku_attribute",
                    "commerce_product_sku_attribute",
                ),
                read("catalog.list_media", "commerce_product_media"),
                write("catalog.upsert_media", "commerce_product_media"),
                read("catalog.list_price_lists", "commerce_price_list"),
                write("catalog.upsert_price_list", "commerce_price_list"),
                write("catalog.upsert_price_list_item", "commerce_price_list_item"),
                read(
                    "catalog.list_recharge_packages",
                    "commerce_recharge_package",
                ),
                write(
                    "catalog.upsert_recharge_package",
                    "commerce_recharge_package",
                ),
            ],
        ),
        business_catalog(
            "inventory",
            "inventory.repository",
            vec![
                "commerce_inventory_stock",
                "commerce_inventory_reservation",
                "commerce_inventory_movement",
            ],
            vec![
                read("inventory.find_stock", "commerce_inventory_stock"),
                write("inventory.upsert_stock", "commerce_inventory_stock"),
                write(
                    "inventory.create_reservation",
                    "commerce_inventory_reservation",
                ),
                write(
                    "inventory.consume_reservation",
                    "commerce_inventory_reservation",
                ),
                write(
                    "inventory.release_reservation",
                    "commerce_inventory_reservation",
                ),
                write("inventory.append_movement", "commerce_inventory_movement"),
            ],
        ),
        business_catalog(
            "cart",
            "cart.repository",
            vec!["commerce_cart", "commerce_cart_item"],
            vec![
                read("cart.find_active_cart", "commerce_cart"),
                write("cart.upsert_cart", "commerce_cart"),
                read("cart.list_items", "commerce_cart_item"),
                write("cart.upsert_item", "commerce_cart_item"),
                write("cart.remove_item", "commerce_cart_item"),
            ],
        ),
        business_catalog(
            "buyer_address",
            "buyer_address.repository",
            vec!["commerce_user_address"],
            vec![
                read("buyer_address.list_addresses", "commerce_user_address"),
                write("buyer_address.upsert_address", "commerce_user_address"),
                write("buyer_address.set_default", "commerce_user_address"),
            ],
        ),
        business_catalog(
            "order",
            "order.repository",
            vec![
                "commerce_checkout_session",
                "commerce_checkout_line",
                "commerce_checkout_quote",
                "commerce_order_address_snapshot",
                "commerce_order",
                "commerce_order_item",
                "commerce_order_amount_breakdown",
                "commerce_order_event",
                "commerce_order_cancellation",
                "commerce_fulfillment_order",
                "commerce_fulfillment_item",
                "commerce_shipment",
                "commerce_shipment_package",
                "commerce_shipment_tracking_event",
                "commerce_digital_delivery",
            ],
            vec![
                read("checkout.find_session", "commerce_checkout_session"),
                write("checkout.create_session", "commerce_checkout_session"),
                write("checkout.create_line", "commerce_checkout_line"),
                write("checkout.create_quote", "commerce_checkout_quote"),
                read("order.find_by_order_no", "commerce_order"),
                read("order.list_by_owner", "commerce_order"),
                write("order.create_order", "commerce_order"),
                write("order.create_order_item", "commerce_order_item"),
                write(
                    "order.create_amount_breakdown",
                    "commerce_order_amount_breakdown",
                ),
                write(
                    "order.create_address_snapshot",
                    "commerce_order_address_snapshot",
                ),
                write("order.record_event", "commerce_order_event"),
                write("order.create_cancellation", "commerce_order_cancellation"),
                write("order.mark_paid", "commerce_order"),
                write("order.cancel_order", "commerce_order"),
                read("fulfillment.list_by_order", "commerce_fulfillment_order"),
                read("fulfillment.find", "commerce_fulfillment_order"),
                write("fulfillment.create", "commerce_fulfillment_order"),
                write("fulfillment.create_item", "commerce_fulfillment_item"),
                write("shipment.create", "commerce_shipment"),
                write("shipment.record_package", "commerce_shipment_package"),
                read("shipment.find", "commerce_shipment"),
                read(
                    "shipment.list_tracking_events",
                    "commerce_shipment_tracking_event",
                ),
                write(
                    "shipment.record_tracking_event",
                    "commerce_shipment_tracking_event",
                ),
                write("digital_delivery.create", "commerce_digital_delivery"),
            ],
        ),
        business_catalog(
            "payment",
            "payment.repository",
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
            vec![
                read("payment.list_records", "commerce_payment_attempt"),
                read("payment.find_intent", "commerce_payment_intent"),
                write("payment.create_intent", "commerce_payment_intent"),
                write("payment.record_attempt", "commerce_payment_attempt"),
                write("payment.mark_attempt_paid", "commerce_payment_attempt"),
                read("payment.list_methods", "commerce_payment_method"),
                write("payment.upsert_method", "commerce_payment_method"),
                read("payment.list_providers", "commerce_payment_provider"),
                write("payment.upsert_provider", "commerce_payment_provider"),
                read(
                    "payment.list_provider_accounts",
                    "commerce_payment_provider_account",
                ),
                write(
                    "payment.upsert_provider_account",
                    "commerce_payment_provider_account",
                ),
                read("payment.list_channels", "commerce_payment_channel"),
                write("payment.upsert_channel", "commerce_payment_channel"),
                read("payment.list_route_rules", "commerce_payment_route_rule"),
                write("payment.upsert_route_rule", "commerce_payment_route_rule"),
                read(
                    "payment.list_provider_capabilities",
                    "commerce_payment_provider_capability",
                ),
                write(
                    "payment.upsert_provider_capability",
                    "commerce_payment_provider_capability",
                ),
                write(
                    "payment.record_operation_attempt",
                    "commerce_payment_operation_attempt",
                ),
                write(
                    "payment.record_route_decision",
                    "commerce_payment_route_decision",
                ),
                write("payment.record_capture", "commerce_payment_capture"),
                write(
                    "payment.record_webhook_delivery",
                    "commerce_payment_webhook_delivery",
                ),
                read("payment.list_statements", "commerce_payment_statement"),
                write(
                    "payment.record_statement_item",
                    "commerce_payment_statement_item",
                ),
                read(
                    "payment.list_reconciliation_runs",
                    "commerce_payment_reconciliation_run",
                ),
                write(
                    "payment.create_reconciliation_run",
                    "commerce_payment_reconciliation_run",
                ),
                write(
                    "payment.finish_reconciliation_run",
                    "commerce_payment_reconciliation_run",
                ),
                write(
                    "payment.record_reconciliation_item",
                    "commerce_payment_reconciliation_item",
                ),
                write("payment.record_fee", "commerce_payment_fee"),
                read("payment.list_disputes", "commerce_payment_dispute"),
                write(
                    "payment.record_dispute_event",
                    "commerce_payment_dispute_event",
                ),
                read(
                    "payment.find_webhook_event",
                    "commerce_payment_webhook_event",
                ),
                read(
                    "payment.find_webhook_nonce",
                    "commerce_payment_webhook_event",
                ),
                write(
                    "payment.record_webhook_event",
                    "commerce_payment_webhook_event",
                ),
                write(
                    "payment.finish_webhook_event",
                    "commerce_payment_webhook_event",
                ),
                write("payment.create_refund", "commerce_refund"),
                write("payment.update_refund_status", "commerce_refund"),
                write("payment.record_refund_item", "commerce_refund_item"),
                write("payment.record_refund_attempt", "commerce_refund_attempt"),
                write("payment.record_refund_event", "commerce_refund_event"),
            ],
        ),
        business_catalog(
            "after_sales",
            "after_sales.repository",
            vec![
                "commerce_after_sales_request",
                "commerce_after_sales_item",
                "commerce_after_sales_return_shipment",
                "commerce_after_sales_event",
            ],
            vec![
                read("after_sales.find_request", "commerce_after_sales_request"),
                write(
                    "after_sales.create_request",
                    "commerce_after_sales_request",
                ),
                write(
                    "after_sales.update_request_status",
                    "commerce_after_sales_request",
                ),
                write("after_sales.record_item", "commerce_after_sales_item"),
                write(
                    "after_sales.record_return_shipment",
                    "commerce_after_sales_return_shipment",
                ),
                write("after_sales.record_event", "commerce_after_sales_event"),
            ],
        ),
        business_catalog(
            "exchange",
            "exchange.repository",
            vec!["commerce_exchange_rule"],
            vec![
                read("exchange.list_rules", "commerce_exchange_rule"),
                read("exchange.find_rule", "commerce_exchange_rule"),
                write("exchange.upsert_rule", "commerce_exchange_rule"),
            ],
        ),
        business_catalog(
            "invoice",
            "invoice.repository",
            vec![
                "commerce_invoice_title",
                "commerce_invoice",
                "commerce_invoice_item",
            ],
            vec![
                read("invoice.find_title", "commerce_invoice_title"),
                write("invoice.upsert_title", "commerce_invoice_title"),
                read("invoice.find_invoice", "commerce_invoice"),
                write("invoice.create_invoice", "commerce_invoice"),
                write("invoice.create_invoice_item", "commerce_invoice_item"),
                write("invoice.submit_invoice", "commerce_invoice"),
                write("invoice.mark_issued", "commerce_invoice"),
            ],
        ),
        business_catalog(
            "billing",
            "billing.repository",
            vec!["commerce_billing_history"],
            vec![
                read("billing.list_history", "commerce_billing_history"),
                write("billing.append_history", "commerce_billing_history"),
            ],
        ),
    ]
}

pub fn commerce_storage_capability_manifest() -> CommerceStorageCapabilityManifest {
    CommerceStorageCapabilityManifest {
        name: "sdkwork-commerce-storage-sqlx",
        schema_version: "commerce.storage.v1",
        tables: commerce_database_tables(),
        indexes: commerce_database_indexes(),
        migrations: commerce_migration_names(),
        migration_plan: commerce_migration_plan(),
        migration_runner: commerce_migration_runner_sql_contract(),
        repository_bindings: commerce_repository_bindings(),
        idempotency_repository: commerce_idempotency_repository_sql_contract(),
        transaction_boundary: commerce_transaction_boundary_sql_contract(),
        business_repositories: commerce_business_repository_sql_catalogs(),
    }
}

impl CommerceSqlConflictClassifier {
    pub fn matches_constraint(&self, constraint: &str) -> bool {
        let normalized = constraint.to_ascii_lowercase();
        let normalized_constraint_name = self.constraint_name.to_ascii_lowercase();
        (!normalized_constraint_name.is_empty() && normalized.contains(&normalized_constraint_name))
            || normalized.contains(self.table)
                && self
                    .unique_key
                    .iter()
                    .all(|column| normalized.contains(column))
    }
}

fn binding(
    domain: &'static str,
    repository_name: &'static str,
    tables: Vec<&'static str>,
) -> CommerceRepositoryBinding {
    CommerceRepositoryBinding {
        domain,
        repository_name,
        tables,
        requires_transaction: true,
    }
}

fn statement(
    operation: &'static str,
    sql: &'static str,
    bindings: Vec<&'static str>,
) -> CommerceSqlStatementContract {
    CommerceSqlStatementContract {
        operation,
        sql,
        bindings,
    }
}

fn business_catalog(
    domain: &'static str,
    repository_name: &'static str,
    tables: Vec<&'static str>,
    operations: Vec<CommerceBusinessRepositorySqlOperation>,
) -> CommerceBusinessRepositorySqlCatalog {
    business_catalog_with_conflicts(domain, repository_name, tables, operations, Vec::new())
}

fn business_catalog_with_conflicts(
    domain: &'static str,
    repository_name: &'static str,
    tables: Vec<&'static str>,
    operations: Vec<CommerceBusinessRepositorySqlOperation>,
    conflict_classifiers: Vec<CommerceSqlConflictClassifier>,
) -> CommerceBusinessRepositorySqlCatalog {
    CommerceBusinessRepositorySqlCatalog {
        domain,
        repository_name,
        tables,
        tenant_scope_field: "tenant_id",
        requires_transaction: true,
        operations,
        conflict_classifiers,
    }
}

fn read(name: &'static str, table: &'static str) -> CommerceBusinessRepositorySqlOperation {
    CommerceBusinessRepositorySqlOperation {
        name,
        table,
        is_read: true,
        is_write: false,
    }
}

fn write(name: &'static str, table: &'static str) -> CommerceBusinessRepositorySqlOperation {
    CommerceBusinessRepositorySqlOperation {
        name,
        table,
        is_read: false,
        is_write: true,
    }
}

fn migration_execution_step(
    kind: &'static str,
    migration: Option<&CommerceStorageMigration>,
    statement: CommerceSqlStatementContract,
    requires_transaction: bool,
) -> CommerceMigrationRunnerExecutionStep {
    CommerceMigrationRunnerExecutionStep {
        kind,
        migration_sequence: migration.map(|migration| migration.sequence),
        migration_name: migration.map(|migration| migration.name),
        statement,
        requires_transaction,
    }
}

fn migration(
    sequence: u32,
    name: &'static str,
    domain: &'static str,
    source_path: &'static str,
    sql: &'static str,
    required_tables: Vec<&'static str>,
) -> CommerceStorageMigration {
    CommerceStorageMigration {
        sequence,
        name,
        domain,
        source_path,
        sql,
        checksum: migration_checksum(name, sql),
        required_tables,
    }
}

fn migration_checksum(name: &str, sql: &str) -> String {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in name.bytes().chain(sql.bytes()) {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("commerce-migration-checksum:{hash:016x}")
}

fn migration_domain_for_name(name: &str) -> Option<&'static str> {
    commerce_migration_plan()
        .into_iter()
        .find(|migration| migration.name == name)
        .map(|migration| migration.domain)
}

fn migration_source_path_for_name(name: &str) -> Option<&'static str> {
    commerce_migration_plan()
        .into_iter()
        .find(|migration| migration.name == name)
        .map(|migration| migration.source_path)
}

fn migration_checksum_for_name(name: &str) -> Option<String> {
    commerce_migration_plan()
        .into_iter()
        .find(|migration| migration.name == name)
        .map(|migration| migration.checksum)
}

fn migration_plan_error(message: impl Into<String>) -> CommerceStorageMigrationPlanValidationError {
    CommerceStorageMigrationPlanValidationError {
        code: "commerce-migration-plan-invalid",
        message: message.into(),
    }
}

fn validate_runner_statement(
    label: &str,
    actual: &CommerceSqlStatementContract,
    expected: &CommerceSqlStatementContract,
) -> Result<(), CommerceMigrationRunnerSqlContractValidationError> {
    if actual != expected {
        return Err(migration_runner_error(format!(
            "migration runner {label} statement drift"
        )));
    }
    Ok(())
}

fn migration_runner_error(
    message: impl Into<String>,
) -> CommerceMigrationRunnerSqlContractValidationError {
    CommerceMigrationRunnerSqlContractValidationError {
        code: "commerce-migration-runner-invalid",
        message: message.into(),
    }
}

fn migration_runner_preflight_error(
    message: impl Into<String>,
) -> CommerceMigrationRunnerPreflightError {
    CommerceMigrationRunnerPreflightError {
        code: "commerce-migration-runner-preflight-invalid",
        message: message.into(),
    }
}

fn migration_execution_plan_error(
    message: impl Into<String>,
) -> CommerceMigrationRunnerExecutionPlanValidationError {
    CommerceMigrationRunnerExecutionPlanValidationError {
        code: "commerce-migration-runner-execution-plan-invalid",
        message: message.into(),
    }
}

fn migration_execution_result_error(
    message: impl Into<String>,
) -> CommerceMigrationRunnerExecutionResultValidationError {
    CommerceMigrationRunnerExecutionResultValidationError {
        code: "commerce-migration-runner-execution-result-invalid",
        message: message.into(),
    }
}

fn validate_failed_migration_execution_result(
    plan: &CommerceMigrationRunnerExecutionPlan,
    result: &CommerceMigrationRunnerExecutionResult,
) -> Result<(), CommerceMigrationRunnerFailureRecoveryValidationError> {
    if result.runner_name != plan.runner_name {
        return Err(migration_failure_recovery_error(format!(
            "migration runner failed execution result runner name drift: expected {}, actual {}",
            plan.runner_name, result.runner_name
        )));
    }
    if result.schema_version_table != plan.schema_version_table {
        return Err(migration_failure_recovery_error(format!(
            "migration runner failed execution result schema table drift: expected {}, actual {}",
            plan.schema_version_table, result.schema_version_table
        )));
    }
    if result.success {
        return Err(migration_failure_recovery_error(
            "failed execution result must not be successful",
        ));
    }
    if result.completed_at.trim().is_empty() {
        return Err(migration_failure_recovery_error(
            "failed execution result completed timestamp is required",
        ));
    }
    if result.executed_steps != result.step_results.len() {
        return Err(migration_failure_recovery_error(format!(
            "failed execution result executed step count drift: expected {}, actual {}",
            result.step_results.len(),
            result.executed_steps
        )));
    }
    if result.step_results.is_empty() || result.step_results.len() > plan.steps.len() {
        return Err(migration_failure_recovery_error(format!(
            "failed execution result step count is invalid: {}",
            result.step_results.len()
        )));
    }

    let failed_positions = result
        .step_results
        .iter()
        .enumerate()
        .filter(|(_, step_result)| !step_result.success)
        .map(|(index, _)| index)
        .collect::<Vec<_>>();
    if failed_positions.len() != 1 {
        return Err(migration_failure_recovery_error(format!(
            "failed execution result must contain exactly one failed step, actual {}",
            failed_positions.len()
        )));
    }
    let failed_step_index = failed_positions[0];
    if failed_step_index + 1 != result.step_results.len() {
        return Err(migration_failure_recovery_error(
            "failed execution result must stop at first failed step",
        ));
    }

    for (index, (step, step_result)) in plan
        .steps
        .iter()
        .zip(result.step_results.iter())
        .enumerate()
    {
        if step_result.kind != step.kind
            || step_result.migration_sequence != step.migration_sequence
            || step_result.migration_name != step.migration_name
        {
            return Err(migration_failure_recovery_error(format!(
                "failed execution result step drift at position {}",
                index + 1
            )));
        }
    }

    let expected_records = plan
        .steps
        .iter()
        .take(failed_step_index)
        .filter(|step| step.kind == "record_applied_migration")
        .filter_map(|step| {
            commerce_migration_plan()
                .into_iter()
                .find(|migration| Some(migration.name) == step.migration_name)
        })
        .map(|migration| commerce_storage_applied_migration_record(&migration, result.completed_at))
        .collect::<Vec<_>>();
    if result.applied_records != expected_records
        || result.recorded_migrations != expected_records.len()
    {
        return Err(migration_failure_recovery_error(
            "recorded migrations must be limited to successful record steps",
        ));
    }
    let expected_applied_count = plan
        .steps
        .iter()
        .take(failed_step_index)
        .filter(|step| step.kind == "apply_migration_sql")
        .count();
    if result.applied_migrations != expected_applied_count {
        return Err(migration_failure_recovery_error(
            "failed execution result applied migration count drift",
        ));
    }

    Ok(())
}

fn migration_final_state_error(
    message: impl Into<String>,
) -> CommerceMigrationRunnerFinalStateValidationError {
    CommerceMigrationRunnerFinalStateValidationError {
        code: "commerce-migration-runner-final-state-invalid",
        message: message.into(),
    }
}

fn migration_failure_recovery_error(
    message: impl Into<String>,
) -> CommerceMigrationRunnerFailureRecoveryValidationError {
    CommerceMigrationRunnerFailureRecoveryValidationError {
        code: "commerce-migration-runner-failure-recovery-invalid",
        message: message.into(),
    }
}

fn migration_lock_error(message: impl Into<String>) -> CommerceMigrationRunnerLockValidationError {
    CommerceMigrationRunnerLockValidationError {
        code: "commerce-migration-runner-lock-invalid",
        message: message.into(),
    }
}
