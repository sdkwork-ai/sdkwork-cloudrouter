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

/// The save is one atomic statement, not select-then-write.
///
/// Two concurrent first saves for the same resource would both miss a
/// pre-check and one would then fail on `uk_pricing_default_region_resource_key`.
/// `ON CONFLICT ... DO UPDATE` moves that decision into the database and also
/// returns the surviving row's id, so switching the default region keeps the
/// original row (and its audit trail) instead of churning ids.
#[test]
fn admin_default_region_save_is_a_single_atomic_upsert() {
    let source = POSTGRES_ADMIN_PRICING_STORE;
    let section = source_section(
        source,
        "async fn upsert_default_region_row",
        "async fn delete_default_region",
    );

    assert!(
        section.contains("ON CONFLICT (tenant_id, organization_id, resource_key)"),
        "default region save must upsert on the resource identity unique index"
    );
    assert!(
        section.contains("WHERE deleted_at IS NULL AND BTRIM(resource_key) <> ''"),
        "the conflict target must repeat the partial index predicate, otherwise it never matches"
    );
    assert!(
        section.contains("DO UPDATE SET") && section.contains("version = pricing_default_region.version + 1"),
        "an existing default region must be switched in place rather than duplicated"
    );
    assert!(
        section.contains("RETURNING id") && section.contains(".fetch_one("),
        "the upsert must return the persisted row id for the audit log"
    );
    assert!(
        !section.contains("SELECT id\n        FROM pricing_default_region"),
        "a select-then-insert pre-check races with itself and must not come back"
    );
    assert!(
        !section.contains("AND resource_key = pricing_resource_key($3, $4, $5, $6, $7)"),
        "the removed pre-check was the only user of a second resource-key derivation"
    );
}

/// Postgres rejects a statement whose `VALUES` arity does not match its column
/// list at *prepare* time, and sqlx surfaces that as a plain protocol error —
/// which `redacted_store_error` turns into an anonymous 500. That shipped once
/// for the default-region save, so every parameterised statement in this store
/// is now checked for placeholder/bind agreement.
#[test]
fn admin_pricing_store_binds_every_sql_placeholder() {
    let source = POSTGRES_ADMIN_PRICING_STORE;
    let (offenders, checked) = sqlx_arity_offenders(source);
    assert!(
        offenders.is_empty(),
        "sqlx statements whose bind count does not match their placeholder count: {offenders:?}"
    );
    assert!(
        checked >= 20,
        "the arity scan must actually inspect the store's statements, only saw {checked}"
    );
}

/// Collects `"<statement index>: max_placeholder=$N binds=M"` for every
/// parameterised statement that disagrees with itself.
///
/// Only statements whose SQL is an inline `r#"..."#` literal are checked. The
/// search/list builders compose their SQL with `format!` into
/// `sqlx::AssertSqlSafe(sql)`, so their `$N` markers live outside the block the
/// scanner can see; a static arity check there would be guesswork.
fn sqlx_arity_offenders(source: &str) -> (Vec<String>, usize) {
    let terminators = [
        ".execute(",
        ".fetch_all(",
        ".fetch_optional(",
        ".fetch_one(",
        ".fetch_scalar(",
    ];
    let mut offenders = Vec::new();
    let mut checked = 0;
    let mut search_from = 0;
    let mut statement_index = 0;

    while let Some(offset) = source[search_from..].find("sqlx::query") {
        let start = search_from + offset;
        let end = terminators
            .iter()
            .filter_map(|terminator| {
                source[start..]
                    .find(terminator)
                    .map(|offset| start + offset + terminator.len())
            })
            .min()
            .unwrap_or(start);
        let statement = &source[start..end];
        search_from = end;
        statement_index += 1;

        let inline_literal = statement
            .find('(')
            .and_then(|open| statement[open..].find("r#\""))
            .is_some();
        if !inline_literal {
            continue;
        }
        checked += 1;

        let max_placeholder = placeholder_max(statement);
        let binds = statement.matches(".bind(").count();
        if max_placeholder != binds {
            offenders.push(format!(
                "statement #{statement_index}: max_placeholder=${max_placeholder} binds={binds}"
            ));
        }
    }

    (offenders, checked)
}

/// Highest `$N` referenced by a statement. Tokens such as `$7::text` and
/// `$12,` are normalised before parsing.
fn placeholder_max(statement: &str) -> usize {
    let mut max = 0;
    let bytes = statement.as_bytes();
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'$' {
            let mut end = index + 1;
            while end < bytes.len() && bytes[end].is_ascii_digit() {
                end += 1;
            }
            if end > index + 1 {
                if let Ok(value) = statement[index + 1..end].parse::<usize>() {
                    max = max.max(value);
                }
            }
            index = end;
        } else {
            index += 1;
        }
    }
    max
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
