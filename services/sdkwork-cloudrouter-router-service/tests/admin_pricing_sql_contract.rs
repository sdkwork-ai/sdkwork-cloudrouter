//! Static SQL contract tests for the admin pricing store.
//!
//! Mirrors the `admin_marketing_exchange_store_sql_contract` pattern: the
//! pricing engine tables are materialized in `database/modules/cloudrouter-billing`
//! and `database/modules/pricing`, and the admin store must target exactly
//! those tables with the billing-module column semantics — never the removed
//! legacy `ai_pricing_*` tables and never opaque JSON config blobs.

const POSTGRES_ADMIN_PRICING_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/admin_pricing_store.rs");
const ADMIN_PRICING_API: &str = include_str!("../src/api/admin_pricing.rs");

#[test]
fn admin_pricing_plans_use_cloudrouter_pricing_plan_table() {
    let source = POSTGRES_ADMIN_PRICING_STORE;
    let plan_sections = format!(
        "{}{}{}",
        source_section(
            source,
            "async fn list_pricing_plans",
            "fn pricing_plan_list_from_rows"
        ),
        source_section(
            source,
            "async fn insert_pricing_plan_row",
            "async fn update_pricing_plan"
        ),
        source_section(source, "fn pricing_plan_from_row", "fn rate_card_from_row"),
    );

    assert!(plan_sections.contains("cloudrouter_pricing_plan"));
    assert!(plan_sections.contains("plan_code"));
    assert!(plan_sections.contains("base_price_side"));
    assert!(plan_sections.contains("rounding_mode"));
    assert!(plan_sections.contains("minimum_charge_amount"));
    assert!(plan_sections.contains("settlementMode"));
    assert!(
        !source.contains("ai_pricing_plan"),
        "admin pricing plan path must not reference the removed legacy ai_pricing_plan table"
    );
    assert!(
        !source.contains("config_key"),
        "admin pricing plan path must use normalized billing-module columns, not config blobs"
    );
}

#[test]
fn admin_rate_cards_use_cloudrouter_account_rate_card_table() {
    let source = POSTGRES_ADMIN_PRICING_STORE;
    let card_sections = format!(
        "{}{}{}",
        source_section(
            source,
            "async fn list_rate_cards",
            "async fn create_rate_card"
        ),
        source_section(
            source,
            "async fn insert_rate_card_row",
            "async fn require_plan_exists"
        ),
        source_section(source, "fn rate_card_from_row", "fn pricing_rule_from_row"),
    );

    assert!(card_sections.contains("cloudrouter_account_rate_card"));
    assert!(card_sections.contains("subject_type"));
    assert!(card_sections.contains("subject_id"));
    assert!(card_sections.contains("subject_code"));
    assert!(card_sections.contains("pricing_plan_id"));
    assert!(
        !source.contains("ai_upstream_account_group_pricing"),
        "admin rate card path must bind through cloudrouter_account_rate_card only"
    );
}

#[test]
fn admin_pricing_rules_use_cloudrouter_pricing_rule_table() {
    let source = POSTGRES_ADMIN_PRICING_STORE;
    let rule_sections = format!(
        "{}{}{}",
        source_section(
            source,
            "async fn list_pricing_rules",
            "fn pricing_rule_list_from_rows"
        ),
        source_section(
            source,
            "async fn insert_pricing_rule_row",
            "async fn update_pricing_rule"
        ),
        source_section(
            source,
            "fn pricing_rule_from_row",
            "async fn insert_audit_log_for_target_uuid"
        ),
    );

    assert!(rule_sections.contains("cloudrouter_pricing_rule"));
    assert!(rule_sections.contains("rule_code"));
    assert!(rule_sections.contains("formula_mode"));
    assert!(rule_sections.contains("unit_price_override"));
    assert!(
        !source.contains("ai_pricing_rule"),
        "admin pricing rule path must not reference the removed legacy ai_pricing_rule table"
    );
}

#[test]
fn admin_pricing_mutations_write_audit_logs_and_soft_delete() {
    let source = POSTGRES_ADMIN_PRICING_STORE;

    assert!(source.contains("ops_audit_log"));
    assert!(source.contains("insert_audit_log_for_target_uuid"));
    assert!(
        source.contains("deleted_at"),
        "rate card and rule deletes must soft-delete"
    );
    assert!(
        !source.contains("DELETE FROM cloudrouter_pricing_plan"),
        "pricing plans must not be hard-deleted; deactivate via status"
    );
    assert!(
        !source.contains("DELETE FROM cloudrouter_pricing_rule"),
        "pricing rules must be soft-deleted"
    );
}

#[test]
fn admin_pricing_status_wire_values_match_billing_module_columns() {
    const PORTS_ADMIN_PRICING_STORE: &str = include_str!("../src/ports/admin_pricing_store.rs");
    let source = POSTGRES_ADMIN_PRICING_STORE;
    let ports = PORTS_ADMIN_PRICING_STORE;

    assert!(ports.contains("pub fn db_value(self)"));
    assert!(ports.contains("AdminPricingStatus::Active => 1"));
    assert!(ports.contains("AdminPricingStatus::Inactive => 0"));
    // The postgres store binds the wire status through the port enum.
    assert!(source.contains("command.status.db_value()"));
}

#[test]
fn admin_pricing_settlement_mode_defaults_to_synchronous_and_is_parameterized_on_update() {
    let source = POSTGRES_ADMIN_PRICING_STORE;
    assert!(source.contains("COALESCE(metadata->>'settlementMode', 'synchronous')"));
    assert!(source.contains("'{settlementMode}'"));
    assert!(source.contains("updated_at = $11"));
    assert!(source.contains("WHERE id = $12"));
}

#[test]
fn admin_pricing_patch_preserves_unprovided_billing_modes() {
    assert!(
        ADMIN_PRICING_API.contains("normalize_optional_charge_mode"),
        "pricing plan PATCH must distinguish omitted chargeMode from the create default"
    );
    assert!(
        ADMIN_PRICING_API.contains("normalize_optional_settlement_mode"),
        "pricing plan PATCH must distinguish omitted settlementMode from the create default"
    );
    assert!(
        ADMIN_PRICING_API.contains("load_pricing_plan(LoadAdminPricingPlanQuery"),
        "pricing plan PATCH must load existing billing modes before applying partial input"
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
