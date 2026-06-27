use sdkwork_commerce_bootstrap_manifest::{
    commerce_benefit_definition_seeds, commerce_experience_seed_manifest,
    commerce_local_private_bootstrap_manifest, commerce_payment_channel_seeds,
    commerce_payment_method_seeds, commerce_payment_provider_account_seeds,
    commerce_payment_provider_seeds, commerce_payment_route_rule_seeds,
    commerce_promotion_code_seeds, commerce_promotion_coupon_stock_seeds,
    commerce_promotion_offer_seeds, commerce_promotion_offer_version_seeds,
    commerce_promotion_user_coupon_seeds, commerce_recharge_package_seeds,
    membership_package_group_seeds, membership_package_seeds, membership_plan_benefit_seeds,
    membership_plan_seeds, membership_plan_version_seeds,
    run_commerce_local_private_bootstrap_preflight, CommerceBootstrapHostRequirement,
    CommerceBootstrapStartupStage,
};
use sdkwork_commerce_service_host::operation_contracts;
use sdkwork_commerce_tauri_host::CommerceTauriCommandBinding;

#[test]
fn bootstrap_manifest_composes_runtime_storage_http_and_tauri_manifests() {
    let manifest = commerce_local_private_bootstrap_manifest();

    assert_eq!(manifest.name, "sdkwork-commerce-local-private-bootstrap");
    assert_eq!(manifest.bootstrap_version, "commerce.bootstrap.v1");
    assert_eq!(manifest.runtime.name, "sdkwork-commerce-runtime");
    assert_eq!(manifest.storage.name, "sdkwork-commerce-storage-sqlx");
    assert_eq!(
        manifest.http.execution_metadata.len(),
        manifest.http.app_routes.len()
    );
    assert!(!manifest.rpc.service_manifests.is_empty());
    assert_eq!(manifest.tauri.plugin_name, "sdkwork-commerce");
    assert_eq!(
        manifest.operation_input_type,
        "CommerceRuntimeOperationInput"
    );
    assert_eq!(
        manifest.operation_output_type,
        "CommerceRuntimeOperationEnvelope"
    );
}

#[test]
fn bootstrap_manifest_is_complete_for_first_slice_host_startup() {
    let manifest = commerce_local_private_bootstrap_manifest();

    assert_eq!(manifest.runtime.service_names.len(), 10);
    assert!(manifest.runtime.service_names.contains(&"shop"));
    assert_eq!(
        manifest.runtime.operation_contracts.len(),
        operation_contracts().len()
    );
    assert_eq!(manifest.storage.tables.len(), 108);
    assert!(manifest.storage.tables.contains(&"commerce_shop"));
    assert!(manifest
        .storage
        .tables
        .contains(&"commerce_shop_application"));
    assert!(manifest
        .storage
        .tables
        .contains(&"commerce_shop_settlement_profile"));
    assert!(manifest
        .storage
        .tables
        .contains(&"commerce_shop_metric_snapshot"));
    assert!(manifest.storage.tables.contains(&"commerce_shop_readiness"));
    assert!(manifest
        .storage
        .tables
        .contains(&"commerce_shop_business_hour"));
    assert!(manifest
        .storage
        .tables
        .contains(&"commerce_shop_category_binding"));
    assert!(manifest
        .storage
        .tables
        .contains(&"commerce_shop_brand_authorization"));
    assert!(manifest
        .storage
        .tables
        .contains(&"commerce_shop_qualification"));
    assert!(manifest
        .storage
        .tables
        .contains(&"commerce_shop_customer_service"));
    assert!(manifest
        .storage
        .tables
        .contains(&"commerce_shop_return_address"));
    assert!(manifest
        .storage
        .tables
        .contains(&"commerce_shop_shipping_template"));
    assert!(manifest
        .storage
        .tables
        .contains(&"commerce_shop_service_area"));
    assert!(manifest.storage.tables.contains(&"commerce_shop_policy"));
    assert!(manifest
        .storage
        .tables
        .contains(&"commerce_shop_deposit_account"));
    assert!(manifest
        .storage
        .tables
        .contains(&"commerce_shop_risk_signal"));
    assert!(manifest
        .storage
        .tables
        .contains(&"commerce_product_spu_category"));
    assert_eq!(manifest.storage.business_repositories.len(), 16);
    assert!(manifest
        .storage
        .business_repositories
        .iter()
        .any(|repository| repository.repository_name == "shop.repository"));
    assert!(manifest
        .storage
        .business_repositories
        .iter()
        .any(|repository| repository.repository_name == "after_sales.repository"));
    assert_eq!(
        manifest.http.execution_metadata.len(),
        manifest.http.app_routes.len()
    );
    assert_eq!(
        manifest.tauri.command_bindings.len(),
        manifest.tauri.commands.len()
    );
    assert!(manifest
        .runtime
        .operation_contracts
        .iter()
        .any(|contract| contract.operation_id == "checkout.sessions.orders.create"));
    assert!(manifest
        .runtime
        .operation_contracts
        .iter()
        .any(|contract| contract.operation_id == "memberships.packageGroups.list"));
    assert!(manifest
        .runtime
        .operation_contracts
        .iter()
        .any(|contract| contract.operation_id == "catalog.spus.list"));
    assert!(manifest
        .runtime
        .operation_contracts
        .iter()
        .any(|contract| contract.operation_id == "wallet.transactions.list"));
    assert!(manifest
        .storage
        .transaction_boundary
        .covered_repositories
        .contains(&"idempotency.repository"));
}

#[test]
fn bootstrap_manifest_validates_cross_layer_contract_alignment() {
    let manifest = commerce_local_private_bootstrap_manifest();

    assert_eq!(manifest.validate(), Ok(()));
}

#[test]
fn bootstrap_manifest_validates_storage_migration_plan_for_host_preflight() {
    let manifest = commerce_local_private_bootstrap_manifest();

    assert_eq!(manifest.storage.migration_plan.len(), 14);
    assert!(manifest
        .storage
        .migration_plan
        .iter()
        .any(|migration| migration.name == "0014_shop.sql"));
    assert_eq!(manifest.validate(), Ok(()));
}

#[test]
fn commerce_experience_seed_manifest_initializes_reusable_membership_and_recharge_catalogs() {
    let manifest = commerce_experience_seed_manifest();
    let benefits = commerce_benefit_definition_seeds();
    let plans = membership_plan_seeds();
    let plan_versions = membership_plan_version_seeds();
    let plan_benefits = membership_plan_benefit_seeds();
    let groups = membership_package_group_seeds();
    let packages = membership_package_seeds();
    let recharge_packages = commerce_recharge_package_seeds();
    let payment_methods = commerce_payment_method_seeds();
    let payment_providers = commerce_payment_provider_seeds();
    let payment_provider_accounts = commerce_payment_provider_account_seeds();
    let payment_channels = commerce_payment_channel_seeds();
    let payment_route_rules = commerce_payment_route_rule_seeds();
    let offers = commerce_promotion_offer_seeds();
    let offer_versions = commerce_promotion_offer_version_seeds();
    let coupon_stocks = commerce_promotion_coupon_stock_seeds();
    let promotion_codes = commerce_promotion_code_seeds();
    let user_coupons = commerce_promotion_user_coupon_seeds();

    assert_eq!(manifest.name, "sdkwork-commerce-experience-seed");
    assert_eq!(manifest.benefit_definition_count, 4);
    assert_eq!(manifest.membership_plan_count, 4);
    assert_eq!(manifest.membership_plan_version_count, 4);
    assert_eq!(manifest.membership_plan_benefit_count, 13);
    assert_eq!(manifest.membership_package_group_count, 2);
    assert_eq!(manifest.membership_package_count, 6);
    assert_eq!(manifest.promotion_offer_count, 2);
    assert_eq!(manifest.promotion_offer_version_count, 2);
    assert_eq!(manifest.promotion_coupon_stock_count, 2);
    assert_eq!(manifest.promotion_code_count, 2);
    assert_eq!(manifest.promotion_user_coupon_count, 2);
    assert_eq!(manifest.recharge_package_count, 18);
    assert_eq!(manifest.recharge_settings_count, 1);
    assert_eq!(manifest.payment_method_count, 7);
    assert_eq!(manifest.payment_provider_count, 6);
    assert_eq!(manifest.payment_provider_account_count, 6);
    assert_eq!(manifest.payment_channel_count, 36);
    assert_eq!(manifest.payment_route_rule_count, 36);
    assert_eq!(
        payment_methods
            .iter()
            .map(|method| (method.method_key, method.provider_code))
            .collect::<Vec<_>>(),
        vec![
            ("wechat_pay", "wechat_pay"),
            ("alipay", "alipay"),
            ("paypal", "paypal"),
            ("card", "stripe"),
            ("apple_pay", "apple_pay"),
            ("google_pay", "google_pay"),
            ("wallet_balance", "wallet_balance"),
        ],
    );
    assert_eq!(
        benefits
            .iter()
            .map(|benefit| (
                benefit.benefit_code,
                benefit.value_unit,
                benefit.measurement_type
            ))
            .collect::<Vec<_>>(),
        vec![
            ("ai_quota", "points", "metered"),
            ("priority_speed_up", "priority", "ranked"),
            ("member_discount", "percent", "discount"),
            ("monthly_coupon_grant", "coupon", "grant"),
        ],
    );
    assert_eq!(
        plans.iter().map(|plan| plan.plan_no).collect::<Vec<_>>(),
        vec!["free", "pro", "max", "vip"]
    );
    assert_eq!(
        plan_versions
            .iter()
            .map(|version| (
                version.plan_no,
                version.version_no,
                version.lifecycle_status
            ))
            .collect::<Vec<_>>(),
        vec![
            ("free", "v1", "published"),
            ("pro", "v1", "published"),
            ("max", "v1", "published"),
            ("vip", "v1", "published"),
        ],
    );
    assert_eq!(
        plan_benefits
            .iter()
            .filter(|benefit| benefit.plan_no == "vip")
            .map(|benefit| benefit.benefit_code)
            .collect::<Vec<_>>(),
        vec![
            "ai_quota",
            "priority_speed_up",
            "member_discount",
            "monthly_coupon_grant",
        ],
    );
    assert_eq!(
        groups
            .iter()
            .map(|group| (
                group.external_id,
                group.package_group_no,
                group.billing_cycle,
                group.duration_days
            ))
            .collect::<Vec<_>>(),
        vec![
            (1, "membership-month", "month", 30),
            (2, "membership-year", "year", 365),
        ],
    );
    assert_eq!(
        packages
            .iter()
            .filter(|package| package.package_group_no == "membership-month")
            .map(|package| package.external_id)
            .collect::<Vec<_>>(),
        vec![301, 302, 303],
    );
    let monthly_pro = packages
        .iter()
        .find(|package| package.external_id == 301)
        .expect("monthly pro package seed");
    assert_eq!(monthly_pro.plan_no, "pro");
    assert_eq!(monthly_pro.price_amount, "69.90");
    assert_eq!(monthly_pro.duration_days, 30);
    assert!(monthly_pro.recommended);
    assert!(!manifest.payload_json.contains("region_code"));
    assert!(!manifest.payload_json.contains("regionCode"));
    assert_eq!(
        recharge_packages
            .iter()
            .filter(|package| package.status == "active")
            .count(),
        9,
    );
    assert_eq!(
        recharge_packages
            .iter()
            .filter(|package| package.status == "inactive")
            .count(),
        9,
    );
    assert!(recharge_packages
        .iter()
        .filter(|package| package.currency_code == "CNY")
        .all(|package| package.status == "active"));
    assert!(recharge_packages
        .iter()
        .filter(|package| package.currency_code == "USD")
        .all(|package| package.status == "inactive"));
    assert_eq!(
        payment_methods
            .iter()
            .map(|method| method.method_key)
            .collect::<Vec<_>>(),
        vec![
            "wechat_pay",
            "alipay",
            "paypal",
            "card",
            "apple_pay",
            "google_pay",
            "wallet_balance",
        ],
    );
    assert_eq!(
        payment_providers
            .iter()
            .map(|provider| provider.provider_code)
            .collect::<Vec<_>>(),
        vec![
            "wechat_pay",
            "alipay",
            "stripe",
            "paypal",
            "apple_pay",
            "google_pay",
        ],
    );
    assert!(payment_provider_accounts
        .iter()
        .all(|account| account.status == "active" && account.environment == "sandbox"));
    assert_eq!(
        payment_channels
            .iter()
            .filter(|channel| channel.method_key == "card")
            .map(|channel| channel.provider_code)
            .collect::<std::collections::BTreeSet<_>>(),
        ["stripe"].into_iter().collect(),
    );
    assert!(payment_channels
        .iter()
        .all(|channel| channel.status == "active"));
    assert!(payment_route_rules
        .iter()
        .all(|rule| rule.status == "active"));
    assert!(payment_route_rules.iter().all(|rule| payment_channels
        .iter()
        .any(|channel| channel.id == rule.channel_id)));
    assert!(
        !payment_channels
            .iter()
            .any(|channel| channel.method_key == "wallet_balance"),
        "wallet balance is an internal method and must not create an external channel",
    );
    assert_eq!(
        offers
            .iter()
            .map(|offer| {
                (
                    offer.offer_code,
                    offer.offer_type,
                    offer.current_offer_version_id,
                )
            })
            .collect::<Vec<_>>(),
        vec![
            (
                "new_user_coupon",
                "coupon",
                "seed-promotion-offer-version-new-user-v1",
            ),
            (
                "vip_monthly_coupon",
                "coupon",
                "seed-promotion-offer-version-vip-monthly-v1",
            ),
        ],
    );
    assert_eq!(
        offer_versions
            .iter()
            .map(|version| {
                (
                    version.id,
                    version.offer_code,
                    version.version_no,
                    version.discount_type,
                )
            })
            .collect::<Vec<_>>(),
        vec![
            (
                "seed-promotion-offer-version-new-user-v1",
                "new_user_coupon",
                "v1",
                "fixed_amount",
            ),
            (
                "seed-promotion-offer-version-vip-monthly-v1",
                "vip_monthly_coupon",
                "v1",
                "percent_off",
            ),
        ],
    );
    assert_eq!(
        coupon_stocks
            .iter()
            .map(|stock| (stock.offer_code, stock.offer_version_id, stock.name))
            .collect::<Vec<_>>(),
        vec![
            (
                "new_user_coupon",
                "seed-promotion-offer-version-new-user-v1",
                "New user coupon stock",
            ),
            (
                "vip_monthly_coupon",
                "seed-promotion-offer-version-vip-monthly-v1",
                "VIP monthly coupon stock",
            ),
        ],
    );
    assert_eq!(
        promotion_codes
            .iter()
            .map(|code| (code.promotion_code, code.offer_version_id))
            .collect::<Vec<_>>(),
        vec![
            ("NEWUSER2026", "seed-promotion-offer-version-new-user-v1"),
            (
                "VIPMONTHLY2026",
                "seed-promotion-offer-version-vip-monthly-v1",
            ),
        ],
    );
    assert_eq!(
        user_coupons
            .iter()
            .map(|coupon| coupon.coupon_no)
            .collect::<Vec<_>>(),
        vec!["seed-coupon-new-user", "seed-coupon-vip-monthly"],
    );
    assert!(manifest.payload_json.contains("\"benefitDefinitions\""));
    assert!(manifest
        .payload_json
        .contains("\"membershipPackageGroups\""));
    assert!(manifest.payload_json.contains("\"promotionOffers\""));
    assert!(manifest.payload_json.contains("\"paymentProviders\""));
    assert!(manifest.payload_json.contains("\"paymentChannels\""));
    assert!(manifest.payload_json.contains("\"paymentRouteRules\""));
    assert!(!manifest.payload_json.contains("base_url_template"));
    assert!(!manifest.payload_json.contains("base_url_override"));
}

#[test]
fn commerce_experience_seed_public_contract_uses_membership_names_without_legacy_vip_types() {
    let source = include_str!("../src/lib.rs");

    for banned in ["CommerceVip", "commerce_vip", "vip_level", "vip_package"] {
        assert!(
            !source.contains(banned),
            "bootstrap seed source must not contain legacy membership fragment {banned}"
        );
    }

    assert!(source.contains("CommerceMembershipPlanSeed"));
    assert!(source.contains("membership_plan_seeds"));
    assert!(source.contains("commerce_benefit_definition_seeds"));
    assert!(source.contains("commerce_promotion_offer_seeds"));
}

#[test]
fn bootstrap_validation_rejects_invalid_storage_migration_plan() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    manifest.storage.migration_plan[0].checksum = "commerce-migration-checksum:bad".to_string();

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Storage migration plan must be valid"));
    assert!(error.message.contains("checksum drift"));
}

#[test]
fn bootstrap_validation_rejects_missing_http_execution_metadata() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    manifest.http.execution_metadata.pop();

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("HTTP app routes must have matching execution metadata"));
}

#[test]
fn bootstrap_validation_rejects_tauri_binding_for_unknown_runtime_operation() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    let original = manifest
        .tauri
        .command_bindings
        .first()
        .expect("first command binding")
        .clone();
    manifest.tauri.command_bindings[0] = CommerceTauriCommandBinding {
        operation_id: "missing.operation",
        ..original
    };

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Tauri command binding operation is not in runtime contracts"));
}

#[test]
fn bootstrap_validation_rejects_storage_transaction_boundary_without_idempotency_repository() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    manifest
        .storage
        .transaction_boundary
        .covered_repositories
        .retain(|repository| *repository != "idempotency.repository");

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Storage transaction boundary must cover idempotency.repository"));
}

#[test]
fn bootstrap_preflight_exposes_host_startup_plan_after_validation() {
    let preflight = run_commerce_local_private_bootstrap_preflight().unwrap();

    assert_eq!(
        preflight.bootstrap_name,
        "sdkwork-commerce-local-private-bootstrap"
    );
    assert_eq!(preflight.runtime_services, 10);
    let manifest = commerce_local_private_bootstrap_manifest();
    assert_eq!(
        preflight.runtime_operations,
        manifest.runtime.operation_contracts.len()
    );
    assert_eq!(preflight.storage_tables, 108);
    assert_eq!(preflight.storage_repositories, 17);
    assert_eq!(
        preflight.storage_migration_lock_table,
        "commerce_schema_migration_lock"
    );
    assert_eq!(preflight.storage_migration_lock_owner_binding, "lock_owner");
    assert_eq!(preflight.storage_lock_acquire_status, "acquired");
    assert_eq!(preflight.storage_lock_renewal_status, "renewed");
    assert_eq!(preflight.storage_lock_stolen_status, "stolen");
    assert_eq!(preflight.storage_lock_blocked_status, "blocked");
    assert!(preflight.storage_lock_can_run_when_acquired);
    assert!(preflight.storage_lock_can_run_when_stolen);
    assert!(!preflight.storage_lock_can_run_when_blocked);
    assert_eq!(preflight.http_app_routes, manifest.http.app_routes.len());
    assert_eq!(
        preflight.rpc_methods,
        manifest
            .rpc
            .service_manifests
            .iter()
            .map(|manifest| manifest.methods.len())
            .sum::<usize>()
    );
    assert_eq!(preflight.tauri_commands, manifest.tauri.commands.len());
    assert_eq!(
        preflight.operation_input_type,
        "CommerceRuntimeOperationInput"
    );
    assert_eq!(
        preflight.operation_output_type,
        "CommerceRuntimeOperationEnvelope"
    );
    assert_eq!(preflight.storage_pending_migrations, 14);
    assert_eq!(
        preflight.storage_next_migration,
        Some("0001_core_idempotency.sql"),
    );
    assert_eq!(preflight.storage_migration_execution_steps, 33);
    assert_eq!(
        preflight.storage_first_migration_step,
        Some("ensure_lock_table"),
    );
    assert_eq!(preflight.storage_migration_final_applied_count, 14);
    assert_eq!(preflight.storage_migration_final_pending_count, 0);
    assert!(preflight.storage_schema_is_current_after_migrations);
    assert_eq!(
        preflight.storage_migration_failure_resume_migration,
        Some("0001_core_idempotency.sql"),
    );
    assert_eq!(preflight.storage_migration_failure_pending_count, 14);
    assert!(preflight.storage_migration_failure_rollback_required);
    assert!(preflight.storage_migration_failure_lock_release_required);
    assert!(preflight.storage_migration_failure_lock_owner_required);
    assert_eq!(
        preflight.storage_migration_failure_release_operation,
        Some("release_lock")
    );
}

#[test]
fn bootstrap_preflight_rejects_invalid_manifest_before_host_startup() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    manifest.http.execution_metadata.pop();

    let error = manifest.preflight().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("HTTP app routes must have matching execution metadata"));
}

#[test]
fn bootstrap_manifest_declares_host_startup_stages_in_dependency_order() {
    let manifest = commerce_local_private_bootstrap_manifest();
    let stages = manifest.startup_stages();

    assert_eq!(stages.len(), 6);
    assert_eq!(stages[0].name, "validate-bootstrap-contracts");
    assert_eq!(stages[0].depends_on, Vec::<&str>::new());
    assert_eq!(stages[1].name, "initialize-commerce-storage");
    assert_eq!(stages[1].depends_on, vec!["validate-bootstrap-contracts"]);
    assert!(stages[1]
        .required_contracts
        .contains(&"CommerceMigrationRunnerExecutionPlan"));
    assert!(stages[1]
        .required_contracts
        .contains(&"CommerceMigrationRunnerExecutionResult"));
    assert!(stages[1]
        .required_contracts
        .contains(&"CommerceMigrationRunnerFinalState"));
    assert!(stages[1]
        .required_contracts
        .contains(&"CommerceMigrationRunnerFailureRecovery"));
    assert!(stages[1]
        .required_contracts
        .contains(&"CommerceMigrationRunnerLockContract"));
    assert!(stages[1]
        .required_contracts
        .contains(&"CommerceMigrationRunnerLockLifecycle"));
    assert!(stages[1]
        .required_contracts
        .contains(&"CommerceMigrationRunnerLockCleanup"));
    assert_eq!(stages[2].name, "initialize-commerce-runtime");
    assert_eq!(stages[2].depends_on, vec!["initialize-commerce-storage"]);
    assert_eq!(stages[3].name, "bind-commerce-http-routes");
    assert_eq!(stages[3].depends_on, vec!["initialize-commerce-runtime"]);
    assert_eq!(stages[4].name, "bind-commerce-rpc-services");
    assert_eq!(stages[4].depends_on, vec!["initialize-commerce-runtime"]);
    assert!(stages[4]
        .required_contracts
        .contains(&"CommerceRpcAdapterManifest"));
    assert_eq!(stages[5].name, "bind-commerce-tauri-commands");
    assert_eq!(stages[5].depends_on, vec!["bind-commerce-rpc-services"]);
    assert!(stages
        .iter()
        .all(|stage| !stage.required_contracts.is_empty()));
}

#[test]
fn bootstrap_preflight_includes_host_startup_stages() {
    let preflight = run_commerce_local_private_bootstrap_preflight().unwrap();

    assert_eq!(preflight.startup_stages.len(), 6);
    assert_eq!(
        preflight.startup_stages.last().unwrap().required_contracts,
        vec![
            "CommerceTauriAdapterManifest",
            "CommerceRuntimeOperationInput",
            "CommerceRuntimeOperationEnvelope"
        ]
    );
}

#[test]
fn bootstrap_validation_rejects_duplicate_startup_stage_names() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    manifest.startup_stages.push(CommerceBootstrapStartupStage {
        name: "initialize-commerce-runtime",
        depends_on: vec!["initialize-commerce-storage"],
        required_contracts: vec!["CommerceRuntimeCapabilityManifest"],
    });

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Bootstrap startup stages must have unique names"));
}

#[test]
fn bootstrap_validation_rejects_missing_startup_stage_dependencies() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    manifest.startup_stages[1].depends_on = vec!["missing-stage"];

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Bootstrap startup stage dependency is not declared"));
}

#[test]
fn bootstrap_validation_rejects_startup_stage_dependencies_declared_after_dependents() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    manifest.startup_stages[0].depends_on = vec!["initialize-commerce-storage"];

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Bootstrap startup stage dependency must be declared before dependent stage"));
}

#[test]
fn bootstrap_manifest_declares_host_requirements_for_local_private_startup() {
    let manifest = commerce_local_private_bootstrap_manifest();

    assert_eq!(manifest.host_requirements.len(), 10);
    assert!(manifest
        .host_requirements
        .iter()
        .any(
            |requirement| requirement.name == "commerce.database.connection"
                && requirement.stage == "initialize-commerce-storage"
        ));
    assert!(manifest
        .host_requirements
        .iter()
        .any(
            |requirement| requirement.name == "commerce.runtime.service-registry"
                && requirement.stage == "initialize-commerce-runtime"
        ));
    assert!(manifest
        .host_requirements
        .iter()
        .any(
            |requirement| requirement.name == "commerce.http.authenticated-context"
                && requirement.stage == "bind-commerce-http-routes"
        ));
    assert!(manifest
        .host_requirements
        .iter()
        .any(
            |requirement| requirement.name == "commerce.rpc.service-binding"
                && requirement.stage == "bind-commerce-rpc-services"
        ));
    assert!(manifest
        .host_requirements
        .iter()
        .any(
            |requirement| requirement.name == "commerce.rpc.runtime-host"
                && requirement.stage == "bind-commerce-rpc-services"
        ));
    assert!(manifest
        .host_requirements
        .iter()
        .any(
            |requirement| requirement.name == "commerce.tauri.command-binding"
                && requirement.stage == "bind-commerce-tauri-commands"
        ));
    assert!(manifest
        .host_requirements
        .iter()
        .all(|requirement| !requirement.required_contracts.is_empty()));
}

#[test]
fn bootstrap_host_requirement_exposes_migration_runner_sql_contract() {
    let manifest = commerce_local_private_bootstrap_manifest();
    let requirement = manifest
        .host_requirements
        .iter()
        .find(|requirement| requirement.name == "commerce.database.migration-runner")
        .expect("migration runner host requirement");

    assert_eq!(requirement.stage, "initialize-commerce-storage");
    assert_eq!(
        requirement.required_contracts,
        vec![
            "CommerceStorageCapabilityManifest",
            "CommerceMigrationRunnerSqlContract",
            "CommerceStorageMigrationPlan",
            "CommerceMigrationRunnerExecutionPlan",
            "CommerceMigrationRunnerExecutionResult",
            "CommerceMigrationRunnerFinalState",
            "CommerceMigrationRunnerFailureRecovery",
            "CommerceMigrationRunnerLockContract",
            "CommerceMigrationRunnerLockLifecycle",
            "CommerceMigrationRunnerLockCleanup",
        ],
    );
}

#[test]
fn bootstrap_validation_rejects_missing_migration_final_state_startup_contract() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    manifest.startup_stages[1]
        .required_contracts
        .retain(|contract| *contract != "CommerceMigrationRunnerFinalState");

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Bootstrap startup stage must include standard contract"));
    assert!(error.message.contains("CommerceMigrationRunnerFinalState"));
}

#[test]
fn bootstrap_validation_rejects_missing_migration_final_state_host_requirement_contract() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    let requirement = manifest
        .host_requirements
        .iter_mut()
        .find(|requirement| requirement.name == "commerce.database.migration-runner")
        .expect("migration runner host requirement");
    requirement
        .required_contracts
        .retain(|contract| *contract != "CommerceMigrationRunnerFinalState");

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Bootstrap host requirement must include standard contract"));
    assert!(error.message.contains("CommerceMigrationRunnerFinalState"));
}

#[test]
fn bootstrap_validation_rejects_missing_migration_failure_recovery_startup_contract() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    manifest.startup_stages[1]
        .required_contracts
        .retain(|contract| *contract != "CommerceMigrationRunnerFailureRecovery");

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Bootstrap startup stage must include standard contract"));
    assert!(error
        .message
        .contains("CommerceMigrationRunnerFailureRecovery"));
}

#[test]
fn bootstrap_validation_rejects_missing_migration_failure_recovery_host_requirement_contract() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    let requirement = manifest
        .host_requirements
        .iter_mut()
        .find(|requirement| requirement.name == "commerce.database.migration-runner")
        .expect("migration runner host requirement");
    requirement
        .required_contracts
        .retain(|contract| *contract != "CommerceMigrationRunnerFailureRecovery");

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Bootstrap host requirement must include standard contract"));
    assert!(error
        .message
        .contains("CommerceMigrationRunnerFailureRecovery"));
}

#[test]
fn bootstrap_validation_rejects_missing_migration_lock_startup_contract() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    manifest.startup_stages[1]
        .required_contracts
        .retain(|contract| *contract != "CommerceMigrationRunnerLockContract");

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Bootstrap startup stage must include standard contract"));
    assert!(error
        .message
        .contains("CommerceMigrationRunnerLockContract"));
}

#[test]
fn bootstrap_validation_rejects_missing_migration_lock_host_requirement_contract() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    let requirement = manifest
        .host_requirements
        .iter_mut()
        .find(|requirement| requirement.name == "commerce.database.migration-runner")
        .expect("migration runner host requirement");
    requirement
        .required_contracts
        .retain(|contract| *contract != "CommerceMigrationRunnerLockContract");

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Bootstrap host requirement must include standard contract"));
    assert!(error
        .message
        .contains("CommerceMigrationRunnerLockContract"));
}

#[test]
fn bootstrap_validation_rejects_missing_migration_lock_lifecycle_startup_contract() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    manifest.startup_stages[1]
        .required_contracts
        .retain(|contract| *contract != "CommerceMigrationRunnerLockLifecycle");

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Bootstrap startup stage must include standard contract"));
    assert!(error
        .message
        .contains("CommerceMigrationRunnerLockLifecycle"));
}

#[test]
fn bootstrap_validation_rejects_missing_migration_lock_lifecycle_host_requirement_contract() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    let requirement = manifest
        .host_requirements
        .iter_mut()
        .find(|requirement| requirement.name == "commerce.database.migration-runner")
        .expect("migration runner host requirement");
    requirement
        .required_contracts
        .retain(|contract| *contract != "CommerceMigrationRunnerLockLifecycle");

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Bootstrap host requirement must include standard contract"));
    assert!(error
        .message
        .contains("CommerceMigrationRunnerLockLifecycle"));
}

#[test]
fn bootstrap_validation_rejects_missing_migration_lock_cleanup_startup_contract() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    manifest.startup_stages[1]
        .required_contracts
        .retain(|contract| *contract != "CommerceMigrationRunnerLockCleanup");

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Bootstrap startup stage must include standard contract"));
    assert!(error.message.contains("CommerceMigrationRunnerLockCleanup"));
}

#[test]
fn bootstrap_validation_rejects_missing_migration_lock_cleanup_host_requirement_contract() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    let requirement = manifest
        .host_requirements
        .iter_mut()
        .find(|requirement| requirement.name == "commerce.database.migration-runner")
        .expect("migration runner host requirement");
    requirement
        .required_contracts
        .retain(|contract| *contract != "CommerceMigrationRunnerLockCleanup");

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Bootstrap host requirement must include standard contract"));
    assert!(error.message.contains("CommerceMigrationRunnerLockCleanup"));
}

#[test]
fn bootstrap_validation_rejects_storage_migration_runner_plan_drift() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    manifest.storage.migration_runner.plan[0].checksum =
        "commerce-migration-checksum:bad".to_string();

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Storage migration runner contract must be valid"));
    assert!(error.message.contains("migration plan drift"));
}

#[test]
fn bootstrap_validation_rejects_invalid_storage_migration_runner_contract() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    manifest.storage.migration_runner.schema_version_table = "wrong_schema_migration";

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Storage migration runner contract must be valid"));
    assert!(error.message.contains("schema version table drift"));
}

#[test]
fn bootstrap_preflight_includes_host_requirements() {
    let preflight = run_commerce_local_private_bootstrap_preflight().unwrap();

    assert_eq!(preflight.host_requirements.len(), 10);
    assert_eq!(
        preflight.host_requirements[0].required_contracts,
        vec!["CommerceStorageCapabilityManifest", "database_url"]
    );
}

#[test]
fn bootstrap_validation_rejects_host_requirements_for_unknown_startup_stage() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    manifest.host_requirements[0].stage = "missing-stage";

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Bootstrap host requirement stage is not declared"));
}

#[test]
fn bootstrap_validation_rejects_duplicate_host_requirement_names() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    manifest
        .host_requirements
        .push(CommerceBootstrapHostRequirement {
            name: "commerce.runtime.service-registry",
            stage: "initialize-commerce-runtime",
            required_contracts: vec!["CommerceRuntimeServiceRegistry"],
        });

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Bootstrap host requirements must have unique names"));
}

#[test]
fn bootstrap_validation_rejects_missing_standard_host_requirements() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    manifest
        .host_requirements
        .retain(|requirement| requirement.name != "commerce.runtime.transaction-manager");

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Bootstrap host requirements must include standard requirement"));
}

#[test]
fn bootstrap_validation_rejects_startup_stages_without_host_requirement_coverage() {
    let mut manifest = commerce_local_private_bootstrap_manifest();
    manifest.startup_stages.push(CommerceBootstrapStartupStage {
        name: "publish-commerce-host-ready",
        depends_on: vec!["bind-commerce-tauri-commands"],
        required_contracts: vec!["CommerceLocalPrivateBootstrapPreflight"],
    });

    let error = manifest.validate().unwrap_err();

    assert_eq!(error.code, "bootstrap-contract-mismatch");
    assert!(error
        .message
        .contains("Bootstrap startup stage must have host requirement coverage"));
}

#[test]
fn bootstrap_preflight_groups_host_requirements_by_startup_stage_order() {
    let preflight = run_commerce_local_private_bootstrap_preflight().unwrap();

    assert_eq!(preflight.host_requirements_by_stage.len(), 6);
    assert_eq!(
        preflight.host_requirements_by_stage[0].stage,
        "validate-bootstrap-contracts"
    );
    assert_eq!(
        preflight.host_requirements_by_stage[0].requirements,
        Vec::<&str>::new()
    );
    assert_eq!(
        preflight.host_requirements_by_stage[1].stage,
        "initialize-commerce-storage"
    );
    assert_eq!(
        preflight.host_requirements_by_stage[1].requirements,
        vec![
            "commerce.database.connection",
            "commerce.database.migration-runner"
        ]
    );
    assert_eq!(
        preflight.host_requirements_by_stage[2].requirements,
        vec![
            "commerce.runtime.idempotency-store",
            "commerce.runtime.transaction-manager",
            "commerce.runtime.service-registry"
        ]
    );
    assert_eq!(
        preflight.host_requirements_by_stage[4].requirements,
        vec!["commerce.rpc.service-binding", "commerce.rpc.runtime-host"]
    );
    assert_eq!(
        preflight.host_requirements_by_stage[5].requirements,
        vec!["commerce.tauri.command-binding"]
    );
}
