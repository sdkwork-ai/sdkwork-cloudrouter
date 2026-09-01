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

/// Regression: default-billing-region eligibility used to be resolved against
/// the *operator's* price books. Official reference pricing lives at the global
/// `(0, 0)` scope, so a tenant admin — who owns no `official_reference` book —
/// got an empty region list and every save failed with 40001 even for models
/// that price in `cn`. The check must read the same official catalog the admin
/// product list builds its region tabs from.
#[test]
fn admin_default_region_eligibility_reads_official_reference_pricing() {
    let source = POSTGRES_ADMIN_PRICING_STORE;
    let section = source_section(
        source,
        "async fn require_default_region_regions",
        "async fn upsert_default_region_row",
    );

    assert!(
        section.contains("book.price_side = 'official_reference'"),
        "default region eligibility must read official reference price books"
    );
    assert!(
        section.contains("rate.tenant_id = 0 AND rate.organization_id = 0"),
        "default region eligibility must include the global official catalog scope"
    );
    assert!(
        section.contains("book.lifecycle_state = 'active'"),
        "default region eligibility must only consider active price books"
    );
    assert!(
        section.contains("BTRIM(rate.region_code) NOT IN ('', 'global')"),
        "a global-only model has no meaningful default region and must be rejected"
    );
    assert!(
        !section.contains("AND book.tenant_id = $1"),
        "default region eligibility must not be scoped to the operator's own price books"
    );
}

/// A `global` default is never applied: the runtime snapshot loader and the
/// admin catalog read both discard it, so persisting one would silently do
/// nothing. It has to be rejected up front with an actionable message.
#[test]
fn admin_default_region_rejects_the_global_region_bucket() {
    let source = POSTGRES_ADMIN_PRICING_STORE;
    let section = source_section(
        source,
        "async fn require_default_region_regions",
        "async fn upsert_default_region_row",
    );

    assert!(
        source.contains(r#"const GLOBAL_REGION_CODE: &str = "global";"#),
        "the global region bucket must be a named constant shared with the reject path"
    );
    assert!(
        section.contains("requested_region.eq_ignore_ascii_case(GLOBAL_REGION_CODE)"),
        "default region save must reject `global` before touching the database"
    );
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
