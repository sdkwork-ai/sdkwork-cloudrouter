const POSTGRES_SCHEMA: &str = include_str!("../../../generated/schema/postgres/schema.sql");
const POSTGRES_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/admin_service_provider_store.rs");
const SQLITE_STORE: &str =
    include_str!("../src/infrastructure/sql/sqlite/admin_service_provider_store.rs");

#[test]
fn service_provider_commercial_tables_exist_in_postgres_schema() {
    for table in [
        "integration_service_provider",
        "integration_service_provider_edge",
        "integration_service_provider_closure",
        "integration_service_provider_member",
        "integration_service_provider_subject_binding",
        "integration_service_provider_contract",
        "integration_service_provider_finance_profile",
        "integration_service_provider_price_plan",
        "integration_service_provider_price_rule",
        "ai_usage_service_provider_edge",
        "integration_provider_statement",
        "integration_provider_adjustment",
        "integration_provider_reconciliation_run",
        "integration_provider_exposure_snapshot",
        "analytics_service_provider_daily",
        "analytics_service_provider_edge_daily",
    ] {
        assert!(
            POSTGRES_SCHEMA.contains(&format!("CREATE TABLE IF NOT EXISTS {table}")),
            "missing service-provider table {table}"
        );
    }
    assert!(
        !POSTGRES_SCHEMA.contains("CREATE TABLE IF NOT EXISTS ai_usage_service_provider_chain"),
        "service-provider usage should be modeled by edge facts, not the removed chain table"
    );
    assert!(
        !POSTGRES_SCHEMA.contains("chain_id BIGINT"),
        "ai_usage_service_provider_edge must not retain the removed chain_id column"
    );
    for removed_table in [
        "integration_provider_reconciliation",
        "integration_provider_statement_item",
        "integration_service_provider_account_binding",
        "integration_service_provider_contract_version",
        "integration_service_provider_price_change_request",
    ] {
        assert!(
            !POSTGRES_SCHEMA.contains(&format!("CREATE TABLE IF NOT EXISTS {removed_table}")),
            "{removed_table} is not read or written by the service-provider store and must stay out of the active schema"
        );
    }
}

#[test]
fn service_provider_sql_stores_enforce_member_closure_scope() {
    for (label, source) in [("postgres", POSTGRES_STORE), ("sqlite", SQLITE_STORE)] {
        assert!(
            source.contains("integration_service_provider_member"),
            "{label} store must resolve service-provider member scope"
        );
        assert!(
            source.contains("integration_service_provider_closure"),
            "{label} store must expand downstream scope through closure"
        );
        assert!(
            source.contains("visible_provider"),
            "{label} store must query through a visible_provider set"
        );
        assert!(
            source.contains("NOT EXISTS (SELECT 1 FROM member_scope)"),
            "{label} store must keep a platform-admin path when no provider membership is present"
        );
    }
}

#[test]
fn service_provider_sql_stores_simulate_specific_billable_point_prices() {
    for (label, source) in [("postgres", POSTGRES_STORE), ("sqlite", SQLITE_STORE)] {
        assert!(
            source.contains("integration_service_provider_price_rule"),
            "{label} store must price from per-billable-point rules"
        );
        assert!(
            source.contains("billing_meter_code"),
            "{label} store must match billing meter"
        );
        assert!(
            source.contains("token_kind"),
            "{label} store must match token kind"
        );
        assert!(
            source.contains("unit_price"),
            "{label} store must calculate from unit price"
        );
        assert!(
            source.contains("minimum_charge"),
            "{label} store must honor minimum charge"
        );
    }
}

#[test]
fn service_provider_sql_stores_audit_price_simulations_and_scope_control_events() {
    for (label, source) in [("postgres", POSTGRES_STORE), ("sqlite", SQLITE_STORE)] {
        assert!(
            source.contains("INSERT INTO ops_audit_log"),
            "{label} store must write an audit log for audited service-provider operations"
        );
        assert!(
            source.contains("service_provider.price_simulation.create"),
            "{label} store must classify price simulation audit records"
        );
        assert!(
            source.contains("WHERE NOT EXISTS"),
            "{label} store must make price simulation audit writes idempotent"
        );
        assert!(
            source.contains("SERVICE_PROVIDER_AUDIT_TARGET_PROVIDER"),
            "{label} store must standardize service-provider audit target types"
        );
        assert!(
            source.contains("risk_status") && source.contains("visible_provider"),
            "{label} store must scope service-provider risk events through visible providers"
        );
    }
}

#[test]
fn service_provider_sql_stores_maintain_downstreams_and_pricing_rules() {
    for (label, source) in [("postgres", POSTGRES_STORE), ("sqlite", SQLITE_STORE)] {
        assert!(
            source.contains("service_provider.downstream.create"),
            "{label} store must audit downstream service-provider creation"
        );
        assert!(
            source.contains("INSERT INTO integration_service_provider")
                && source.contains("INSERT INTO integration_service_provider_edge")
                && source.contains("INSERT INTO integration_service_provider_closure"),
            "{label} store must materialize provider, edge, and closure rows for downstream creation"
        );
        assert!(
            source.contains("default_multiplier")
                && source.contains("INSERT INTO integration_service_provider_price_plan"),
            "{label} store must create a downstream default pricing plan with multiplier support"
        );
        assert!(
            source.contains("service_provider.price_rule.create")
                && source.contains("service_provider.price_rule.update"),
            "{label} store must audit price rule create and update commands"
        );
        assert!(
            source.contains("UPDATE integration_service_provider_price_rule")
                && source.contains("INSERT INTO integration_service_provider_price_rule"),
            "{label} store must create and update billable-point price rules"
        );
    }
}

#[test]
fn service_provider_sql_stores_apply_provider_edge_filters_to_read_surfaces() {
    for (label, source) in [("postgres", POSTGRES_STORE), ("sqlite", SQLITE_STORE)] {
        assert!(
            source.matches("query.provider_id.as_deref()").count() >= 10,
            "{label} store must bind providerId across service-provider list surfaces"
        );
        assert!(
            source
                .matches("query.seller_provider_id.as_deref()")
                .count()
                >= 10,
            "{label} store must bind sellerProviderId across service-provider list surfaces"
        );
        assert!(
            source.matches("query.buyer_provider_id.as_deref()").count() >= 10,
            "{label} store must bind buyerProviderId across service-provider list surfaces"
        );
        assert!(
            source.matches("query.edge_id.as_deref()").count() >= 10,
            "{label} store must bind edgeId across service-provider list surfaces"
        );
        for required_source in [
            "integration_service_provider_edge",
            "integration_service_provider_price_rule",
            "ai_usage_service_provider_edge",
            "integration_provider_statement",
            "integration_provider_adjustment",
            "integration_provider_reconciliation_run",
            "integration_provider_exposure_snapshot",
            "ops_audit_log",
        ] {
            assert!(
                source.contains(required_source),
                "{label} store provider-edge filters must cover {required_source}"
            );
        }
    }
}
