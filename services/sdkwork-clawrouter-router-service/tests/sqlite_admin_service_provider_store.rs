use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAdminServiceProviderStore;
use sdkwork_clawrouter_router_service::ports::{
    AdminServiceProviderPriceSimulationCommand, AdminServiceProviderStore,
    AdminServiceProviderSubject, CreateAdminServiceProviderDownstreamCommand,
    CreateAdminServiceProviderPricingRuleCommand, ListAdminServiceProviderRecordsQuery,
    UpdateAdminServiceProviderPricingRuleCommand,
};
use sqlx::sqlite::SqlitePoolOptions;

#[test]
fn sqlite_admin_service_provider_price_simulation_uses_decimal_math_not_real() {
    let source = include_str!("../src/infrastructure/sql/sqlite/admin_service_provider_store.rs");

    assert!(!source.contains("CAST(r.unit_price AS REAL)"));
    assert!(!source.contains("CAST(?8 AS REAL)"));
    assert!(source.contains("simulate_charge_amount"));
}

#[test]
fn sqlite_admin_service_provider_finance_reports_never_use_float_aggregation() {
    let source = include_str!("../src/infrastructure/sql/sqlite/admin_service_provider_store.rs");

    assert!(!source.contains("CAST(d.income_amount AS REAL)"));
    assert!(!source.contains("CAST(d.expense_amount AS REAL)"));
    assert!(!source.contains("CAST(d.margin_amount AS REAL)"));
    assert!(!source.contains("CAST(ed.income_amount AS REAL)"));
    assert!(!source.contains("CAST(ed.expense_amount AS REAL)"));
    assert!(!source.contains("CAST(ed.margin_amount AS REAL)"));
    assert!(!source.contains("printf('%.2f'"));
    assert!(source.contains("decimal_sum_cell"));
}

#[tokio::test]
async fn sqlite_admin_service_provider_store_scopes_provider_chain_to_member_downstreams() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_service_provider_tables(&pool).await;
    seed_service_provider_chain(&pool).await;

    let store = SqliteAdminServiceProviderStore::new(pool.clone());
    let providers = store
        .list_providers(list_query())
        .await
        .expect("service provider registry should load");

    assert_eq!(2, providers.total);
    assert_eq!("sp-root", providers.items[0]["providerNo"]);
    assert_eq!("sp-child", providers.items[1]["providerNo"]);
    assert!(providers
        .items
        .iter()
        .all(|item| item["providerNo"] != "sp-outsider"));
    assert_eq!("80.00", providers.items[0]["incomeAmount"]);
    assert_eq!("30.00", providers.items[0]["expenseAmount"]);
    assert_eq!("50.00", providers.items[0]["marginAmount"]);

    let downstreams = store
        .list_downstreams(list_query())
        .await
        .expect("downstream providers should load");

    assert_eq!(1, downstreams.total);
    assert_eq!("sp-child", downstreams.items[0]["providerNo"]);
    assert_eq!(640, downstreams.items[0]["requestCount"]);
    assert_eq!("42.00", downstreams.items[0]["incomeAmount"]);
    assert_eq!("18.00", downstreams.items[0]["expenseAmount"]);
    assert_eq!("24.00", downstreams.items[0]["marginAmount"]);
}

#[tokio::test]
async fn sqlite_admin_service_provider_store_filters_dashboard_by_chain_dimensions() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_service_provider_tables(&pool).await;
    seed_service_provider_chain(&pool).await;

    let store = SqliteAdminServiceProviderStore::new(pool);
    let dashboard = store
        .retrieve_dashboard(list_query_with_chain(
            None,
            Some("1"),
            Some("2"),
            Some("500"),
        ))
        .await
        .expect("dashboard should load through a filtered provider chain");

    assert_eq!("42.00", dashboard.income_amount);
    assert_eq!("18.00", dashboard.expense_amount);
    assert_eq!("24.00", dashboard.margin_amount);
    assert_eq!(640, dashboard.request_count);
    assert_eq!(1, dashboard.active_downstream_count);
}

#[tokio::test]
async fn sqlite_admin_service_provider_dashboard_sums_exact_amounts_without_closure_duplication() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_service_provider_tables(&pool).await;
    seed_service_provider_chain(&pool).await;
    seed_second_downstream_with_fractional_daily_amount(&pool).await;

    let dashboard = SqliteAdminServiceProviderStore::new(pool)
        .retrieve_dashboard(list_query())
        .await
        .expect("dashboard should aggregate exact decimal amounts once per provider");

    assert_eq!("122.000000000001", dashboard.income_amount);
    assert_eq!("48.000000000001", dashboard.expense_amount);
    assert_eq!("74.00", dashboard.margin_amount);
    assert_eq!(1841, dashboard.request_count);
    assert_eq!(2, dashboard.active_downstream_count);
}

#[tokio::test]
async fn sqlite_admin_service_provider_store_simulates_price_from_specific_billable_rule() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_service_provider_tables(&pool).await;
    seed_service_provider_chain(&pool).await;

    let store = SqliteAdminServiceProviderStore::new(pool.clone());
    let simulation = store
        .simulate_price(AdminServiceProviderPriceSimulationCommand {
            subject: subject(),
            buyer_provider_id: "2".to_owned(),
            catalog_key: Some("openai:gpt-4.1".to_owned()),
            model: Some("gpt-4.1".to_owned()),
            billing_meter_code: "llm_input_token".to_owned(),
            token_kind: Some("input".to_owned()),
            quantity: "1000".to_owned(),
            idempotency_key: "idem-price-sim".to_owned(),
            request_id: Some("req-price-sim".to_owned()),
        })
        .await
        .expect("price simulation should load");

    assert_eq!(
        "service-provider-price-simulation:2:llm_input_token:input",
        simulation.id
    );
    assert_eq!(Some("9001".to_owned()), simulation.matched_rule_id);
    assert_eq!(Some("USD".to_owned()), simulation.currency);
    assert_eq!(Some("12.5".to_owned()), simulation.charge_amount);

    store
        .simulate_price(AdminServiceProviderPriceSimulationCommand {
            subject: subject(),
            buyer_provider_id: "2".to_owned(),
            catalog_key: Some("openai:gpt-4.1".to_owned()),
            model: Some("gpt-4.1".to_owned()),
            billing_meter_code: "llm_input_token".to_owned(),
            token_kind: Some("input".to_owned()),
            quantity: "1000".to_owned(),
            idempotency_key: "idem-price-sim".to_owned(),
            request_id: Some("req-price-sim".to_owned()),
        })
        .await
        .expect("idempotent price simulation retry should load");

    let audit_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ops_audit_log WHERE action = 'service_provider.price_simulation.create' AND request_id = 'req-price-sim'",
    )
    .fetch_one(&pool)
    .await
    .expect("price simulation audit count should load");
    assert_eq!(1, audit_count);
}

#[tokio::test]
async fn sqlite_admin_service_provider_store_scopes_risk_and_audit_events_to_visible_chain() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_service_provider_tables(&pool).await;
    seed_service_provider_chain(&pool).await;

    let store = SqliteAdminServiceProviderStore::new(pool);
    let risk_events = store
        .list_risk_events(list_query())
        .await
        .expect("risk events should load");

    assert_eq!(1, risk_events.total);
    assert_eq!("2", risk_events.items[0]["serviceProviderId"]);
    assert_eq!("overdue", risk_events.items[0]["riskStatus"]);

    let audit_events = store
        .list_audit_events(list_query())
        .await
        .expect("audit events should load");

    assert_eq!(1, audit_events.total);
    assert_eq!(
        "service_provider.price_rule.update",
        audit_events.items[0]["action"]
    );
    assert_eq!("2", audit_events.items[0]["targetId"]);
}

#[tokio::test]
async fn sqlite_admin_service_provider_store_creates_downstream_chain_plan_and_audit_idempotently()
{
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_service_provider_tables(&pool).await;
    seed_service_provider_chain(&pool).await;

    let store = SqliteAdminServiceProviderStore::new(pool.clone());
    let command = CreateAdminServiceProviderDownstreamCommand {
        subject: subject(),
        seller_provider_id: "1".to_owned(),
        provider_no: "sp-new-child".to_owned(),
        display_name: "New Child Provider".to_owned(),
        provider_type: Some("reseller".to_owned()),
        default_currency: Some("USD".to_owned()),
        settlement_mode: Some("prepaid".to_owned()),
        price_plan_code: Some("plan-new-child".to_owned()),
        default_multiplier: Some("1.1500".to_owned()),
        idempotency_key: "idem-downstream-create".to_owned(),
        request_id: Some("req-downstream-create".to_owned()),
    };

    let created = store
        .create_downstream(command.clone())
        .await
        .expect("visible seller should create downstream provider");
    assert_eq!("sp-new-child", created.provider_no);
    assert_eq!("New Child Provider", created.display_name);
    assert_eq!("active", created.status);
    assert_eq!("1", created.seller_provider_id);
    assert!(created.edge_id.parse::<i64>().unwrap() > 0);
    assert!(
        created
            .price_plan_id
            .as_deref()
            .unwrap()
            .parse::<i64>()
            .unwrap()
            > 0
    );

    let retry = store
        .create_downstream(command)
        .await
        .expect("same request should return existing downstream provider");
    assert_eq!(created.id, retry.id);
    assert_eq!(created.edge_id, retry.edge_id);
    assert_eq!(created.price_plan_id, retry.price_plan_id);

    let closure_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM integration_service_provider_closure
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND descendant_provider_id = ?
          AND ancestor_provider_id IN (1, ?)
        "#,
    )
    .bind(created.id.parse::<i64>().unwrap())
    .bind(created.id.parse::<i64>().unwrap())
    .fetch_one(&pool)
    .await
    .expect("downstream closure rows should load");
    assert_eq!(2, closure_count);

    let default_multiplier: Option<String> = sqlx::query_scalar(
        "SELECT default_multiplier FROM integration_service_provider_price_plan WHERE id = ?",
    )
    .bind(
        created
            .price_plan_id
            .as_deref()
            .unwrap()
            .parse::<i64>()
            .unwrap(),
    )
    .fetch_one(&pool)
    .await
    .expect("created price plan should load");
    assert_eq!(Some("1.1500".to_owned()), default_multiplier);

    let audit_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ops_audit_log WHERE action = 'service_provider.downstream.create' AND request_id = 'req-downstream-create'",
    )
    .fetch_one(&pool)
    .await
    .expect("downstream create audit count should load");
    assert_eq!(1, audit_count);
}

#[tokio::test]
async fn sqlite_admin_service_provider_store_rejects_downstream_create_outside_visible_chain() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_service_provider_tables(&pool).await;
    seed_service_provider_chain(&pool).await;

    let store = SqliteAdminServiceProviderStore::new(pool);
    let error = store
        .create_downstream(CreateAdminServiceProviderDownstreamCommand {
            subject: subject(),
            seller_provider_id: "3".to_owned(),
            provider_no: "sp-invalid-child".to_owned(),
            display_name: "Invalid Child Provider".to_owned(),
            provider_type: Some("reseller".to_owned()),
            default_currency: Some("USD".to_owned()),
            settlement_mode: Some("prepaid".to_owned()),
            price_plan_code: Some("plan-invalid-child".to_owned()),
            default_multiplier: Some("1.0000".to_owned()),
            idempotency_key: "idem-invalid-downstream".to_owned(),
            request_id: Some("req-invalid-downstream".to_owned()),
        })
        .await
        .expect_err("member must not create under a provider outside the visible chain");
    assert!(error.is_not_found());
}

#[tokio::test]
async fn sqlite_admin_service_provider_store_creates_and_updates_pricing_rules_for_visible_edge() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_service_provider_tables(&pool).await;
    seed_service_provider_chain(&pool).await;

    let store = SqliteAdminServiceProviderStore::new(pool.clone());
    let created = store
        .create_pricing_rule(CreateAdminServiceProviderPricingRuleCommand {
            subject: subject(),
            seller_provider_id: "1".to_owned(),
            buyer_provider_id: "2".to_owned(),
            edge_id: Some("500".to_owned()),
            price_plan_id: Some("8001".to_owned()),
            catalog_key: Some("openai:gpt-4.1".to_owned()),
            model: Some("gpt-4.1".to_owned()),
            billing_meter_code: "llm_output_token".to_owned(),
            token_kind: Some("output".to_owned()),
            unit_price: "0.0300".to_owned(),
            unit_size: "1000".to_owned(),
            minimum_charge: "0".to_owned(),
            currency: Some("USD".to_owned()),
            priority: 20,
            idempotency_key: "idem-price-rule-create".to_owned(),
            request_id: Some("req-price-rule-create".to_owned()),
        })
        .await
        .expect("visible edge should accept a specific billable-point price rule");
    assert_eq!("llm_output_token", created.billing_meter_code);
    assert_eq!("0.0300", created.unit_price);

    let output_simulation = store
        .simulate_price(AdminServiceProviderPriceSimulationCommand {
            subject: subject(),
            buyer_provider_id: "2".to_owned(),
            catalog_key: Some("openai:gpt-4.1".to_owned()),
            model: Some("gpt-4.1".to_owned()),
            billing_meter_code: "llm_output_token".to_owned(),
            token_kind: Some("output".to_owned()),
            quantity: "1000".to_owned(),
            idempotency_key: "idem-output-sim".to_owned(),
            request_id: Some("req-output-sim".to_owned()),
        })
        .await
        .expect("created rule should be usable by price simulation");
    assert_eq!(Some(created.id.clone()), output_simulation.matched_rule_id);
    assert_eq!(Some("0.03".to_owned()), output_simulation.charge_amount);

    let updated = store
        .update_pricing_rule(UpdateAdminServiceProviderPricingRuleCommand {
            subject: subject(),
            rule_id: "9001".to_owned(),
            unit_price: Some("0.0200".to_owned()),
            unit_size: Some("1000".to_owned()),
            minimum_charge: Some("0.1000".to_owned()),
            priority: Some(30),
            status: Some("active".to_owned()),
            idempotency_key: "idem-price-rule-update".to_owned(),
            request_id: Some("req-price-rule-update".to_owned()),
        })
        .await
        .expect("visible rule should update cost fields");
    assert_eq!("9001", updated.id);
    assert_eq!("0.0200", updated.unit_price);
    assert_eq!("0.1000", updated.minimum_charge);
    assert_eq!(30, updated.priority);

    let input_simulation = store
        .simulate_price(AdminServiceProviderPriceSimulationCommand {
            subject: subject(),
            buyer_provider_id: "2".to_owned(),
            catalog_key: Some("openai:gpt-4.1".to_owned()),
            model: Some("gpt-4.1".to_owned()),
            billing_meter_code: "llm_input_token".to_owned(),
            token_kind: Some("input".to_owned()),
            quantity: "1000".to_owned(),
            idempotency_key: "idem-updated-input-sim".to_owned(),
            request_id: Some("req-updated-input-sim".to_owned()),
        })
        .await
        .expect("updated rule should affect price simulation");
    assert_eq!(Some("9001".to_owned()), input_simulation.matched_rule_id);
    assert_eq!(Some("0.1".to_owned()), input_simulation.charge_amount);

    let audit_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ops_audit_log WHERE action IN ('service_provider.price_rule.create', 'service_provider.price_rule.update') AND request_id IN ('req-price-rule-create', 'req-price-rule-update')",
    )
    .fetch_one(&pool)
    .await
    .expect("price rule audit count should load");
    assert_eq!(2, audit_count);
}

#[tokio::test]
async fn sqlite_admin_service_provider_store_filters_finance_lists_by_chain_dimensions() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_service_provider_tables(&pool).await;
    seed_service_provider_chain(&pool).await;

    let store = SqliteAdminServiceProviderStore::new(pool);
    let chain_query = list_query_with_chain(Some("2"), Some("1"), Some("2"), Some("500"));

    let usage = store
        .list_usage(chain_query.clone())
        .await
        .expect("usage chain facts should filter by seller, buyer, and edge");
    assert_eq!(1, usage.total);
    assert_eq!("usage-child", usage.items[0]["usageFactId"]);
    assert_eq!("1.25", usage.items[0]["chargeAmount"]);

    let pricing = store
        .list_pricing_rules(chain_query.clone())
        .await
        .expect("pricing rules should filter by seller, buyer, and edge");
    assert_eq!(1, pricing.total);
    assert_eq!("9001", pricing.items[0]["id"]);

    let statements = store
        .list_statements(chain_query.clone())
        .await
        .expect("statements should filter by seller and buyer");
    assert_eq!(1, statements.total);
    assert_eq!("stmt-child", statements.items[0]["statementNo"]);
    assert_eq!("42.00", statements.items[0]["receivableAmount"]);

    let adjustments = store
        .list_adjustments(chain_query)
        .await
        .expect("adjustments should filter by seller and buyer");
    assert_eq!(1, adjustments.total);
    assert_eq!("adj-child", adjustments.items[0]["adjustmentNo"]);

    let wallet = store
        .list_wallet_accounts(list_query_with_chain(Some("2"), None, None, None))
        .await
        .expect("wallet accounts should filter by provider");
    assert_eq!(1, wallet.total);
    assert_eq!("2", wallet.items[0]["serviceProviderId"]);

    let outsider_usage = store
        .list_usage(list_query_with_chain(Some("3"), None, None, None))
        .await
        .expect("outside-chain usage filter should not leak records");
    assert_eq!(0, outsider_usage.total);
}

fn subject() -> AdminServiceProviderSubject {
    AdminServiceProviderSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 30,
        operator_type: 1,
    }
}

fn list_query() -> ListAdminServiceProviderRecordsQuery {
    ListAdminServiceProviderRecordsQuery {
        subject: subject(),
        page_no: 1,
        page_size: 20,
        offset: 0,
        status: None,
        provider_id: None,
        seller_provider_id: None,
        buyer_provider_id: None,
        edge_id: None,
    }
}

fn list_query_with_chain(
    provider_id: Option<&str>,
    seller_provider_id: Option<&str>,
    buyer_provider_id: Option<&str>,
    edge_id: Option<&str>,
) -> ListAdminServiceProviderRecordsQuery {
    ListAdminServiceProviderRecordsQuery {
        provider_id: provider_id.map(str::to_owned),
        seller_provider_id: seller_provider_id.map(str::to_owned),
        buyer_provider_id: buyer_provider_id.map(str::to_owned),
        edge_id: edge_id.map(str::to_owned),
        ..list_query()
    }
}

async fn create_service_provider_tables(pool: &sqlx::SqlitePool) {
    for statement in [
        r#"
        CREATE TABLE integration_service_provider (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT,
            provider_no TEXT NOT NULL,
            display_name TEXT NOT NULL,
            provider_type TEXT,
            default_currency TEXT,
            default_timezone TEXT,
            risk_level INTEGER
        )
        "#,
        r#"
        CREATE TABLE integration_service_provider_member (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            service_provider_id INTEGER NOT NULL,
            member_user_id INTEGER NOT NULL,
            role_code TEXT
        )
        "#,
        r#"
        CREATE TABLE integration_service_provider_closure (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            ancestor_provider_id INTEGER NOT NULL,
            descendant_provider_id INTEGER NOT NULL,
            depth INTEGER NOT NULL,
            path TEXT,
            direct_edge_id INTEGER
        )
        "#,
        r#"
        CREATE TABLE integration_service_provider_edge (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            edge_no TEXT NOT NULL,
            seller_provider_id INTEGER NOT NULL,
            buyer_provider_id INTEGER NOT NULL,
            edge_type TEXT,
            settlement_mode TEXT
        )
        "#,
        r#"
        CREATE TABLE analytics_service_provider_daily (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            provider_id INTEGER NOT NULL,
            ancestor_provider_id INTEGER NOT NULL,
            report_date TEXT NOT NULL,
            currency TEXT NOT NULL,
            request_count INTEGER NOT NULL,
            income_amount TEXT NOT NULL,
            expense_amount TEXT NOT NULL,
            margin_amount TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE analytics_service_provider_edge_daily (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            edge_id INTEGER NOT NULL,
            seller_provider_id INTEGER NOT NULL,
            buyer_provider_id INTEGER NOT NULL,
            report_date TEXT NOT NULL,
            currency TEXT NOT NULL,
            request_count INTEGER NOT NULL,
            income_amount TEXT NOT NULL,
            expense_amount TEXT NOT NULL,
            margin_amount TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE integration_service_provider_price_plan (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            seller_provider_id INTEGER,
            buyer_provider_id INTEGER,
            edge_id INTEGER NOT NULL,
            plan_code TEXT NOT NULL,
            plan_name TEXT,
            base_amount_source TEXT,
            pricing_mode TEXT,
            default_multiplier TEXT,
            default_markup_amount TEXT,
            currency TEXT
        )
        "#,
        r#"
        CREATE TABLE integration_service_provider_price_rule (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            seller_provider_id INTEGER,
            buyer_provider_id INTEGER,
            edge_id INTEGER NOT NULL,
            price_plan_id INTEGER NOT NULL,
            catalog_key TEXT,
            model TEXT,
            billing_meter_code TEXT,
            token_kind TEXT,
            unit_price TEXT,
            unit_size TEXT,
            minimum_charge TEXT,
            priority INTEGER
        )
        "#,
        r#"
        CREATE TABLE integration_service_provider_contract (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            seller_provider_id INTEGER,
            buyer_provider_id INTEGER,
            edge_id INTEGER
        )
        "#,
        r#"
        CREATE TABLE ai_usage_service_provider_edge (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            usage_fact_id TEXT NOT NULL,
            edge_id INTEGER NOT NULL,
            seller_provider_id INTEGER,
            buyer_provider_id INTEGER,
            billing_meter_code TEXT,
            token_kind TEXT,
            billable_quantity TEXT,
            unit_price TEXT,
            charge_amount TEXT,
            currency TEXT
        )
        "#,
        r#"
        CREATE TABLE integration_provider_statement (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            statement_no TEXT,
            seller_provider_id INTEGER,
            buyer_provider_id INTEGER,
            period TEXT,
            total_requests INTEGER,
            total_tokens INTEGER,
            receivable_amount TEXT,
            payable_amount TEXT,
            currency TEXT,
            statement_status TEXT,
            payment_status TEXT
        )
        "#,
        r#"
        CREATE TABLE integration_provider_adjustment (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            adjustment_no TEXT,
            usage_edge_id INTEGER,
            statement_id INTEGER,
            seller_provider_id INTEGER,
            buyer_provider_id INTEGER,
            adjustment_type TEXT,
            amount TEXT,
            currency TEXT,
            reason_code TEXT,
            approval_status TEXT
        )
        "#,
        r#"
        CREATE TABLE integration_provider_reconciliation_run (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            scope_type TEXT,
            scope_id TEXT
        )
        "#,
        r#"
        CREATE TABLE integration_provider_reconciliation_item (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            run_id INTEGER,
            usage_edge_id INTEGER,
            usage_fact_id INTEGER,
            statement_item_id INTEGER,
            match_status TEXT,
            internal_amount TEXT,
            external_amount TEXT,
            difference_amount TEXT,
            reason_code TEXT,
            resolution_status TEXT
        )
        "#,
        r#"
        CREATE TABLE integration_provider_exposure_snapshot (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            service_provider_id INTEGER NOT NULL,
            balance_amount TEXT,
            frozen_amount TEXT,
            credit_limit_amount TEXT,
            used_credit_amount TEXT,
            exposure_amount TEXT,
            overdue_amount TEXT,
            currency TEXT,
            risk_status TEXT
        )
        "#,
        r#"
        CREATE TABLE ops_audit_log (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            request_id TEXT,
            operator_id INTEGER,
            operator_type INTEGER,
            action TEXT,
            target_type INTEGER,
            target_id INTEGER,
            target_uuid TEXT,
            created_at TEXT NOT NULL
        )
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_service_provider_chain(pool: &sqlx::SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO integration_service_provider
            (id, uuid, tenant_id, organization_id, status, created_at, updated_at, provider_no, display_name, provider_type, default_currency, default_timezone, risk_level)
        VALUES
            (1, 'sp-root-uuid', 100001, 0, 1, '2026-05-01 00:00:00', '2026-05-01 00:00:00', 'sp-root', 'Root Provider', 'reseller', 'USD', 'UTC', 1),
            (2, 'sp-child-uuid', 100001, 0, 1, '2026-05-01 00:00:00', '2026-05-01 00:00:00', 'sp-child', 'Child Provider', 'reseller', 'USD', 'UTC', 1),
            (3, 'sp-outsider-uuid', 100001, 0, 1, '2026-05-01 00:00:00', '2026-05-01 00:00:00', 'sp-outsider', 'Outsider Provider', 'reseller', 'USD', 'UTC', 1)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO integration_service_provider_member
            (id, uuid, tenant_id, organization_id, status, service_provider_id, member_user_id, role_code)
        VALUES
            (100, 'member-root', 100001, 0, 1, 1, 30, 'owner')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO integration_service_provider_closure
            (id, uuid, tenant_id, organization_id, status, ancestor_provider_id, descendant_provider_id, depth, path, direct_edge_id)
        VALUES
            (200, 'closure-root', 100001, 0, 1, 1, 1, 0, '1', NULL),
            (201, 'closure-child', 100001, 0, 1, 1, 2, 1, '1/2', 500),
            (202, 'closure-outsider', 100001, 0, 1, 3, 3, 0, '3', NULL)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO integration_service_provider_edge
            (id, uuid, tenant_id, organization_id, status, edge_no, seller_provider_id, buyer_provider_id, edge_type, settlement_mode)
        VALUES
            (500, 'edge-root-child', 100001, 0, 1, 'edge-root-child', 1, 2, 'resale', 'prepaid')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO analytics_service_provider_daily
            (id, uuid, tenant_id, organization_id, status, provider_id, ancestor_provider_id, report_date, currency, request_count, income_amount, expense_amount, margin_amount)
        VALUES
            (300, 'daily-root', 100001, 0, 1, 1, 1, '2026-05-23', 'USD', 1200, '80.00', '30.00', '50.00'),
            (301, 'daily-child', 100001, 0, 1, 2, 1, '2026-05-23', 'USD', 640, '42.00', '18.00', '24.00'),
            (302, 'daily-outsider', 100001, 0, 1, 3, 3, '2026-05-23', 'USD', 999, '999.00', '1.00', '998.00')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO analytics_service_provider_edge_daily
            (id, uuid, tenant_id, organization_id, status, edge_id, seller_provider_id, buyer_provider_id, report_date, currency, request_count, income_amount, expense_amount, margin_amount)
        VALUES
            (400, 'edge-daily-child', 100001, 0, 1, 500, 1, 2, '2026-05-23', 'USD', 640, '42.00', '18.00', '24.00')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO integration_service_provider_price_plan
            (id, uuid, tenant_id, organization_id, status, seller_provider_id, buyer_provider_id, edge_id, plan_code, plan_name, currency)
        VALUES
            (8001, 'plan-root-child', 100001, 0, 1, 1, 2, 500, 'plan-root-child', 'Root Child Plan', 'USD')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO integration_service_provider_price_rule
            (id, uuid, tenant_id, organization_id, status, seller_provider_id, buyer_provider_id, edge_id, price_plan_id, catalog_key, model, billing_meter_code, token_kind, unit_price, unit_size, minimum_charge, priority)
        VALUES
            (9001, 'rule-input-token', 100001, 0, 1, 1, 2, 500, 8001, 'openai:gpt-4.1', 'gpt-4.1', 'llm_input_token', 'input', '0.0125', '1', '0', 10)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_usage_service_provider_edge
            (id, uuid, tenant_id, organization_id, status, usage_fact_id, edge_id, seller_provider_id, buyer_provider_id, billing_meter_code, token_kind, billable_quantity, unit_price, charge_amount, currency)
        VALUES
            (9101, 'usage-child-uuid', 100001, 0, 1, 'usage-child', 500, 1, 2, 'llm_input_token', 'input', '100', '0.0125', '1.25', 'USD'),
            (9102, 'usage-outsider-uuid', 100001, 0, 1, 'usage-outsider', 501, 3, 3, 'llm_input_token', 'input', '100', '0.9999', '99.99', 'USD')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO integration_provider_statement
            (id, uuid, tenant_id, organization_id, status, statement_no, seller_provider_id, buyer_provider_id, period, total_requests, total_tokens, receivable_amount, payable_amount, currency, statement_status, payment_status)
        VALUES
            (9201, 'stmt-child-uuid', 100001, 0, 1, 'stmt-child', 1, 2, '2026-05', 640, 1200, '42.00', '18.00', 'USD', 'issued', 'unpaid'),
            (9202, 'stmt-outsider-uuid', 100001, 0, 1, 'stmt-outsider', 3, 3, '2026-05', 999, 999, '999.00', '1.00', 'USD', 'issued', 'unpaid')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO integration_provider_adjustment
            (id, uuid, tenant_id, organization_id, status, adjustment_no, usage_edge_id, statement_id, seller_provider_id, buyer_provider_id, adjustment_type, amount, currency, reason_code, approval_status)
        VALUES
            (9301, 'adj-child-uuid', 100001, 0, 1, 'adj-child', 9101, 9201, 1, 2, 'credit', '1.00', 'USD', 'manual', 'approved'),
            (9302, 'adj-outsider-uuid', 100001, 0, 1, 'adj-outsider', 9102, 9202, 3, 3, 'credit', '99.00', 'USD', 'manual', 'approved')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO integration_provider_exposure_snapshot
            (id, uuid, tenant_id, organization_id, status, service_provider_id, balance_amount, frozen_amount, credit_limit_amount, used_credit_amount, exposure_amount, overdue_amount, currency, risk_status)
        VALUES
            (10001, 'exposure-root', 100001, 0, 1, 1, '200.00', '0.00', '1000.00', '100.00', '100.00', '0.00', 'USD', 'healthy'),
            (10002, 'exposure-child', 100001, 0, 1, 2, '10.00', '0.00', '100.00', '125.00', '125.00', '25.00', 'USD', 'overdue'),
            (10003, 'exposure-outsider', 100001, 0, 1, 3, '5.00', '0.00', '100.00', '140.00', '140.00', '40.00', 'USD', 'overdue')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (id, uuid, tenant_id, organization_id, request_id, operator_id, operator_type, action, target_type, target_id, target_uuid, created_at)
        VALUES
            (11001, 'audit-child-price', 100001, 0, 'audit-child-price', 30, 1, 'service_provider.price_rule.update', 1801, 2, 'sp-child-uuid', '2026-05-23 00:00:00'),
            (11002, 'audit-outsider-price', 100001, 0, 'audit-outsider-price', 30, 1, 'service_provider.price_rule.update', 1801, 3, 'sp-outsider-uuid', '2026-05-23 00:00:01'),
            (11003, 'audit-unrelated-user', 100001, 0, 'audit-unrelated-user', 30, 1, 'admin.user.update', 10, 2, 'user-uuid', '2026-05-23 00:00:02')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn seed_second_downstream_with_fractional_daily_amount(pool: &sqlx::SqlitePool) {
    for statement in [
        r#"
        INSERT INTO integration_service_provider
            (id, uuid, tenant_id, organization_id, status, created_at, updated_at, provider_no, display_name, provider_type, default_currency, default_timezone, risk_level)
        VALUES
            (4, 'sp-child-2-uuid', 100001, 0, 1, '2026-05-01 00:00:00', '2026-05-01 00:00:00', 'sp-child-2', 'Child Provider 2', 'reseller', 'USD', 'UTC', 1)
        "#,
        r#"
        INSERT INTO integration_service_provider_edge
            (id, uuid, tenant_id, organization_id, status, edge_no, seller_provider_id, buyer_provider_id, edge_type, settlement_mode)
        VALUES
            (501, 'edge-root-child-2', 100001, 0, 1, 'edge-root-child-2', 1, 4, 'resale', 'prepaid')
        "#,
        r#"
        INSERT INTO integration_service_provider_closure
            (id, uuid, tenant_id, organization_id, status, ancestor_provider_id, descendant_provider_id, depth, path, direct_edge_id)
        VALUES
            (203, 'closure-child-2-self', 100001, 0, 1, 4, 4, 0, '4', NULL),
            (204, 'closure-root-child-2', 100001, 0, 1, 1, 4, 1, '1/4', 501)
        "#,
        r#"
        INSERT INTO analytics_service_provider_daily
            (id, uuid, tenant_id, organization_id, status, provider_id, ancestor_provider_id, report_date, currency, request_count, income_amount, expense_amount, margin_amount)
        VALUES
            (303, 'daily-child-2', 100001, 0, 1, 4, 1, '2026-05-23', 'USD', 1, '0.000000000001', '0.000000000001', '0.000000000000')
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}
