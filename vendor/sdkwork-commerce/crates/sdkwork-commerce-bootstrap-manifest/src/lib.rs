use sdkwork_commerce_api_server::{
    app_route_execution_metadata, app_routes, commerce_http_response_envelope,
    commerce_http_runtime_input_binding, CommerceHttpResponseEnvelope, CommerceHttpRoute,
    CommerceHttpRouteExecutionMetadata, CommerceRuntimeInputBinding,
};
use sdkwork_commerce_rpc::{
    commerce_rpc_adapter_manifest, CommerceRpcAdapterManifest, COMMERCE_RPC_CONTEXT_CAPABILITY,
    COMMERCE_RPC_ERROR_MAPPING_CAPABILITY, COMMERCE_RPC_HEALTH_CAPABILITY, COMMERCE_RPC_PROTO_ROOT,
    COMMERCE_RPC_REFLECTION_CAPABILITY, COMMERCE_RPC_SERVER_CAPABILITY,
    COMMERCE_RPC_SERVICE_BINDING_CAPABILITY,
};
use sdkwork_commerce_service_host::{
    commerce_runtime_capability_manifest, CommerceRuntimeCapabilityManifest,
};
use sdkwork_commerce_storage_repository_sqlx::{
    commerce_migration_runner_execution_plan, commerce_migration_runner_execution_result,
    commerce_migration_runner_failed_execution_result, commerce_migration_runner_failure_recovery,
    commerce_migration_runner_final_state, commerce_migration_runner_lock_cleanup,
    commerce_migration_runner_lock_lifecycle, commerce_migration_runner_preflight,
    commerce_storage_capability_manifest, validate_commerce_migration_plan,
    validate_commerce_migration_runner_execution_plan,
    validate_commerce_migration_runner_failure_recovery,
    validate_commerce_migration_runner_final_state,
    validate_commerce_migration_runner_lock_cleanup,
    validate_commerce_migration_runner_lock_lifecycle,
    validate_commerce_migration_runner_sql_contract, CommerceStorageCapabilityManifest,
};
use sdkwork_commerce_tauri_host::{
    commerce_tauri_adapter_manifest, CommerceTauriAdapterManifest, CommerceTauriCommandBinding,
};
use sdkwork_rpc_core::validate_manifest;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceExperienceSeedManifest {
    pub name: &'static str,
    pub seed_version: &'static str,
    pub benefit_definition_count: usize,
    pub membership_plan_count: usize,
    pub membership_plan_version_count: usize,
    pub membership_plan_benefit_count: usize,
    pub membership_package_group_count: usize,
    pub membership_package_count: usize,
    pub promotion_offer_count: usize,
    pub promotion_offer_version_count: usize,
    pub promotion_coupon_stock_count: usize,
    pub promotion_code_count: usize,
    pub promotion_user_coupon_count: usize,
    pub recharge_package_count: usize,
    pub recharge_settings_count: usize,
    pub payment_method_count: usize,
    pub payment_provider_count: usize,
    pub payment_provider_account_count: usize,
    pub payment_channel_count: usize,
    pub payment_route_rule_count: usize,
    pub payload_json: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceBenefitDefinitionSeed {
    pub id: &'static str,
    pub benefit_code: &'static str,
    pub name: &'static str,
    pub benefit_type: &'static str,
    pub value_unit: &'static str,
    pub measurement_type: &'static str,
    pub description: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMembershipPlanSeed {
    pub id: &'static str,
    pub plan_no: &'static str,
    pub plan_code: &'static str,
    pub name: &'static str,
    pub rank: i64,
    pub required_points: i64,
    pub validity_days: i64,
    pub badge: &'static str,
    pub description: &'static str,
    pub benefits: Vec<CommerceMembershipBenefitSeed>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMembershipPlanVersionSeed {
    pub id: &'static str,
    pub plan_no: &'static str,
    pub version_no: &'static str,
    pub lifecycle_status: &'static str,
    pub title: &'static str,
    pub effective_from: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMembershipPlanBenefitSeed {
    pub id: &'static str,
    pub plan_no: &'static str,
    pub version_no: &'static str,
    pub benefit_code: &'static str,
    pub grant_quantity: &'static str,
    pub grant_period: Option<&'static str>,
    pub reset_policy: Option<&'static str>,
    pub usage_policy: Option<&'static str>,
    pub sort_weight: i64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMembershipBenefitSeed {
    pub id: i64,
    pub benefit_key: &'static str,
    pub name: &'static str,
    pub description: &'static str,
    pub benefit_type: &'static str,
    pub usage_limit: i64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMembershipPackageGroupSeed {
    pub id: &'static str,
    pub external_id: i64,
    pub package_group_no: &'static str,
    pub name: &'static str,
    pub description: &'static str,
    pub billing_cycle: &'static str,
    pub duration_days: i64,
    pub sort_weight: i64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceMembershipPackageSeed {
    pub id: &'static str,
    pub external_id: i64,
    pub package_no: &'static str,
    pub package_group_no: &'static str,
    pub plan_no: &'static str,
    pub sku_id: &'static str,
    pub sku_no: &'static str,
    pub name: &'static str,
    pub title: &'static str,
    pub description: &'static str,
    pub price_amount: &'static str,
    pub original_price_amount: Option<&'static str>,
    pub currency_code: &'static str,
    pub point_amount: i64,
    pub duration_days: i64,
    pub sort_weight: i64,
    pub recommended: bool,
    pub tags: Vec<&'static str>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceRechargePackageSeed {
    pub package_id: &'static str,
    pub sku_id: &'static str,
    pub package_no: &'static str,
    pub sku_no: &'static str,
    pub external_id: i64,
    pub name: &'static str,
    pub price_amount: &'static str,
    pub currency_code: &'static str,
    pub bonus_points: i64,
    pub status: &'static str,
    pub sort_weight: i64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceRechargeSettingsSeed {
    pub rule_id: &'static str,
    pub rule_no: &'static str,
    pub source_asset_type: &'static str,
    pub target_asset_type: &'static str,
    pub rate: &'static str,
    pub base_currency_code: &'static str,
    pub currency_to_cny_rates: Vec<(&'static str, &'static str)>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommercePaymentMethodSeed {
    pub id: &'static str,
    pub method_key: &'static str,
    pub display_name: &'static str,
    pub provider_code: &'static str,
    pub sort_order: i64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommercePaymentProviderSeed {
    pub id: &'static str,
    pub provider_code: &'static str,
    pub display_name: &'static str,
    pub provider_type: &'static str,
    pub supported_countries: Vec<&'static str>,
    pub supported_currencies: Vec<&'static str>,
    pub supported_methods: Vec<&'static str>,
    pub sort_order: i64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommercePaymentProviderAccountSeed {
    pub id: &'static str,
    pub account_no: &'static str,
    pub provider_code: &'static str,
    pub merchant_id: &'static str,
    pub environment: &'static str,
    pub country_code: &'static str,
    pub settlement_currency: &'static str,
    pub secret_ref: &'static str,
    pub webhook_secret_ref: Option<&'static str>,
    pub certificate_ref: Option<&'static str>,
    pub status: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommercePaymentChannelSeed {
    pub id: String,
    pub channel_no: String,
    pub provider_account_id: String,
    pub method_id: &'static str,
    pub method_key: &'static str,
    pub provider_code: &'static str,
    pub scene_code: &'static str,
    pub currency_code: &'static str,
    pub country_code: &'static str,
    pub status: &'static str,
    pub priority: i64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommercePaymentRouteRuleSeed {
    pub id: String,
    pub rule_no: String,
    pub priority: i64,
    pub purchase_type: &'static str,
    pub country_code: &'static str,
    pub currency_code: &'static str,
    pub client_platform: &'static str,
    pub channel_id: String,
    pub status: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommercePromotionOfferSeed {
    pub id: &'static str,
    pub offer_no: &'static str,
    pub offer_code: &'static str,
    pub name: &'static str,
    pub offer_type: &'static str,
    pub current_offer_version_id: &'static str,
    pub audience_scope: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommercePromotionOfferVersionSeed {
    pub id: &'static str,
    pub offer_code: &'static str,
    pub version_no: &'static str,
    pub lifecycle_status: &'static str,
    pub discount_type: &'static str,
    pub discount_value: &'static str,
    pub minimum_amount: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommercePromotionCouponStockSeed {
    pub id: &'static str,
    pub stock_no: &'static str,
    pub name: &'static str,
    pub offer_code: &'static str,
    pub offer_version_id: &'static str,
    pub stock_type: &'static str,
    pub total_quantity: Option<i64>,
    pub available_quantity: i64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommercePromotionCodeSeed {
    pub id: &'static str,
    pub code_no: &'static str,
    pub stock_no: &'static str,
    pub offer_code: &'static str,
    pub offer_version_id: &'static str,
    pub promotion_code: &'static str,
    pub code_type: &'static str,
    pub max_claims: i64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommercePromotionUserCouponSeed {
    pub id: &'static str,
    pub coupon_no: &'static str,
    pub stock_no: &'static str,
    pub offer_code: &'static str,
    pub subject_type: &'static str,
    pub subject_id: &'static str,
    pub coupon_code: &'static str,
    pub status: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceLocalPrivateBootstrapManifest {
    pub name: &'static str,
    pub bootstrap_version: &'static str,
    pub runtime: CommerceRuntimeCapabilityManifest,
    pub storage: CommerceStorageCapabilityManifest,
    pub http: CommerceBootstrapHttpManifest,
    pub rpc: CommerceRpcAdapterManifest,
    pub tauri: CommerceTauriAdapterManifest,
    pub operation_input_type: &'static str,
    pub operation_output_type: &'static str,
    pub startup_stages: Vec<CommerceBootstrapStartupStage>,
    pub host_requirements: Vec<CommerceBootstrapHostRequirement>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceBootstrapHttpManifest {
    pub app_routes: Vec<CommerceHttpRoute>,
    pub execution_metadata: Vec<CommerceHttpRouteExecutionMetadata>,
    pub response_envelope: CommerceHttpResponseEnvelope,
    pub runtime_input_binding: CommerceRuntimeInputBinding,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceBootstrapStartupStage {
    pub name: &'static str,
    pub depends_on: Vec<&'static str>,
    pub required_contracts: Vec<&'static str>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceBootstrapHostRequirement {
    pub name: &'static str,
    pub stage: &'static str,
    pub required_contracts: Vec<&'static str>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceBootstrapHostRequirementsByStage {
    pub stage: &'static str,
    pub requirements: Vec<&'static str>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceLocalPrivateBootstrapPreflight {
    pub bootstrap_name: &'static str,
    pub bootstrap_version: &'static str,
    pub runtime_services: usize,
    pub runtime_operations: usize,
    pub storage_tables: usize,
    pub storage_repositories: usize,
    pub storage_migration_lock_table: &'static str,
    pub storage_migration_lock_owner_binding: &'static str,
    pub storage_lock_acquire_status: &'static str,
    pub storage_lock_renewal_status: &'static str,
    pub storage_lock_stolen_status: &'static str,
    pub storage_lock_blocked_status: &'static str,
    pub storage_lock_can_run_when_acquired: bool,
    pub storage_lock_can_run_when_stolen: bool,
    pub storage_lock_can_run_when_blocked: bool,
    pub storage_pending_migrations: usize,
    pub storage_next_migration: Option<&'static str>,
    pub storage_migration_execution_steps: usize,
    pub storage_first_migration_step: Option<&'static str>,
    pub storage_migration_final_applied_count: usize,
    pub storage_migration_final_pending_count: usize,
    pub storage_schema_is_current_after_migrations: bool,
    pub storage_migration_failure_resume_migration: Option<&'static str>,
    pub storage_migration_failure_pending_count: usize,
    pub storage_migration_failure_rollback_required: bool,
    pub storage_migration_failure_lock_release_required: bool,
    pub storage_migration_failure_lock_owner_required: bool,
    pub storage_migration_failure_release_operation: Option<&'static str>,
    pub http_app_routes: usize,
    pub rpc_methods: usize,
    pub tauri_commands: usize,
    pub operation_input_type: &'static str,
    pub operation_output_type: &'static str,
    pub startup_stages: Vec<CommerceBootstrapStartupStage>,
    pub host_requirements: Vec<CommerceBootstrapHostRequirement>,
    pub host_requirements_by_stage: Vec<CommerceBootstrapHostRequirementsByStage>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceBootstrapValidationError {
    pub code: &'static str,
    pub message: String,
}

impl CommerceLocalPrivateBootstrapManifest {
    pub fn preflight(
        &self,
    ) -> Result<CommerceLocalPrivateBootstrapPreflight, CommerceBootstrapValidationError> {
        self.validate()?;
        let migration_preflight =
            commerce_migration_runner_preflight(&self.storage.migration_runner, &[]).map_err(
                |error| {
                    self.error(format!(
                        "Storage migration runner preflight must be valid: {}",
                        error.message
                    ))
                },
            )?;
        let migration_execution_plan =
            commerce_migration_runner_execution_plan(&self.storage.migration_runner, &[]).map_err(
                |error| {
                    self.error(format!(
                        "Storage migration runner execution plan must be valid: {}",
                        error.message
                    ))
                },
            )?;
        validate_commerce_migration_runner_execution_plan(
            &self.storage.migration_runner,
            &[],
            &migration_execution_plan,
        )
        .map_err(|error| {
            self.error(format!(
                "Storage migration runner execution plan must be valid: {}",
                error.message
            ))
        })?;
        let migration_execution_result = commerce_migration_runner_execution_result(
            &migration_execution_plan,
            "bootstrap-preflight",
        );
        let migration_final_state = commerce_migration_runner_final_state(
            &self.storage.migration_runner,
            &[],
            &migration_execution_result,
        )
        .map_err(|error| {
            self.error(format!(
                "Storage migration runner final state must be valid: {}",
                error.message
            ))
        })?;
        validate_commerce_migration_runner_final_state(
            &self.storage.migration_runner,
            &[],
            &migration_execution_result,
            &migration_final_state,
        )
        .map_err(|error| {
            self.error(format!(
                "Storage migration runner final state must be valid: {}",
                error.message
            ))
        })?;
        let migration_failure_result = commerce_migration_runner_failed_execution_result(
            &migration_execution_plan,
            4,
            "bootstrap-preflight",
        )
        .map_err(|error| {
            self.error(format!(
                "Storage migration runner failure recovery must be valid: {}",
                error.message
            ))
        })?;
        let migration_failure_recovery = commerce_migration_runner_failure_recovery(
            &self.storage.migration_runner,
            &[],
            &migration_failure_result,
        )
        .map_err(|error| {
            self.error(format!(
                "Storage migration runner failure recovery must be valid: {}",
                error.message
            ))
        })?;
        validate_commerce_migration_runner_failure_recovery(
            &self.storage.migration_runner,
            &[],
            &migration_failure_result,
            &migration_failure_recovery,
        )
        .map_err(|error| {
            self.error(format!(
                "Storage migration runner failure recovery must be valid: {}",
                error.message
            ))
        })?;
        let migration_lock_lifecycle =
            commerce_migration_runner_lock_lifecycle(&self.storage.migration_runner);
        validate_commerce_migration_runner_lock_lifecycle(
            &self.storage.migration_runner,
            &migration_lock_lifecycle,
        )
        .map_err(|error| {
            self.error(format!(
                "Storage migration runner lock lifecycle must be valid: {}",
                error.message
            ))
        })?;
        let migration_lock_cleanup =
            commerce_migration_runner_lock_cleanup(&self.storage.migration_runner);
        validate_commerce_migration_runner_lock_cleanup(
            &self.storage.migration_runner,
            &migration_lock_cleanup,
        )
        .map_err(|error| {
            self.error(format!(
                "Storage migration runner lock cleanup must be valid: {}",
                error.message
            ))
        })?;

        Ok(CommerceLocalPrivateBootstrapPreflight {
            bootstrap_name: self.name,
            bootstrap_version: self.bootstrap_version,
            runtime_services: self.runtime.service_names.len(),
            runtime_operations: self.runtime.operation_contracts.len(),
            storage_tables: self.storage.tables.len(),
            storage_repositories: self.storage.repository_bindings.len(),
            storage_migration_lock_table: self.storage.migration_runner.lock_table,
            storage_migration_lock_owner_binding: "lock_owner",
            storage_lock_acquire_status: migration_lock_lifecycle.fresh_acquire_status,
            storage_lock_renewal_status: migration_lock_lifecycle.renewal_status,
            storage_lock_stolen_status: migration_lock_lifecycle.stolen_status,
            storage_lock_blocked_status: migration_lock_lifecycle.blocked_status,
            storage_lock_can_run_when_acquired: migration_lock_lifecycle
                .fresh_acquire_can_run_migrations,
            storage_lock_can_run_when_stolen: migration_lock_lifecycle.stolen_can_run_migrations,
            storage_lock_can_run_when_blocked: migration_lock_lifecycle.blocked_can_run_migrations,
            storage_pending_migrations: migration_preflight.pending_count,
            storage_next_migration: migration_preflight
                .next_migration
                .map(|migration| migration.name),
            storage_migration_execution_steps: migration_execution_plan.steps.len(),
            storage_first_migration_step: migration_execution_plan
                .steps
                .first()
                .map(|step| step.kind),
            storage_migration_final_applied_count: migration_final_state.applied_count_after,
            storage_migration_final_pending_count: migration_final_state.pending_count_after,
            storage_schema_is_current_after_migrations: migration_final_state.schema_is_current,
            storage_migration_failure_resume_migration: migration_failure_recovery
                .resume_migration
                .as_ref()
                .map(|migration| migration.name),
            storage_migration_failure_pending_count: migration_failure_recovery.pending_count_after,
            storage_migration_failure_rollback_required: migration_failure_recovery
                .rollback_required,
            storage_migration_failure_lock_release_required: migration_failure_recovery
                .lock_release_required,
            storage_migration_failure_lock_owner_required: migration_failure_recovery
                .lock_owner_required,
            storage_migration_failure_release_operation: migration_failure_recovery
                .release_lock_operation,
            http_app_routes: self.http.app_routes.len(),
            rpc_methods: self
                .rpc
                .service_manifests
                .iter()
                .map(|manifest| manifest.methods.len())
                .sum(),
            tauri_commands: self.tauri.commands.len(),
            operation_input_type: self.operation_input_type,
            operation_output_type: self.operation_output_type,
            startup_stages: self.startup_stages(),
            host_requirements: self.host_requirements.clone(),
            host_requirements_by_stage: self.host_requirements_by_stage(),
        })
    }

    pub fn startup_stages(&self) -> Vec<CommerceBootstrapStartupStage> {
        self.startup_stages.clone()
    }

    pub fn host_requirements_by_stage(&self) -> Vec<CommerceBootstrapHostRequirementsByStage> {
        self.startup_stages
            .iter()
            .map(|stage| CommerceBootstrapHostRequirementsByStage {
                stage: stage.name,
                requirements: self
                    .host_requirements
                    .iter()
                    .filter(|requirement| requirement.stage == stage.name)
                    .map(|requirement| requirement.name)
                    .collect(),
            })
            .collect()
    }

    pub fn standard_startup_stages() -> Vec<CommerceBootstrapStartupStage> {
        vec![
            CommerceBootstrapStartupStage {
                name: "validate-bootstrap-contracts",
                depends_on: Vec::new(),
                required_contracts: vec![
                    "CommerceLocalPrivateBootstrapManifest",
                    "CommerceRuntimeCapabilityManifest",
                    "CommerceStorageCapabilityManifest",
                    "CommerceBootstrapHttpManifest",
                    "CommerceRpcAdapterManifest",
                    "CommerceTauriAdapterManifest",
                ],
            },
            CommerceBootstrapStartupStage {
                name: "initialize-commerce-storage",
                depends_on: vec!["validate-bootstrap-contracts"],
                required_contracts: vec![
                    "CommerceStorageCapabilityManifest",
                    "CommerceIdempotencyRepositorySqlContract",
                    "CommerceTransactionBoundarySqlContract",
                    "CommerceMigrationRunnerExecutionPlan",
                    "CommerceMigrationRunnerExecutionResult",
                    "CommerceMigrationRunnerFinalState",
                    "CommerceMigrationRunnerFailureRecovery",
                    "CommerceMigrationRunnerLockContract",
                    "CommerceMigrationRunnerLockLifecycle",
                    "CommerceMigrationRunnerLockCleanup",
                ],
            },
            CommerceBootstrapStartupStage {
                name: "initialize-commerce-runtime",
                depends_on: vec!["initialize-commerce-storage"],
                required_contracts: vec![
                    "CommerceRuntimeCapabilityManifest",
                    "CommerceRuntimeIdempotencyStore",
                    "CommerceRuntimeTransactionManager",
                ],
            },
            CommerceBootstrapStartupStage {
                name: "bind-commerce-http-routes",
                depends_on: vec!["initialize-commerce-runtime"],
                required_contracts: vec![
                    "CommerceBootstrapHttpManifest",
                    "CommerceRuntimeOperationInput",
                    "CommerceRuntimeOperationEnvelope",
                ],
            },
            CommerceBootstrapStartupStage {
                name: "bind-commerce-rpc-services",
                depends_on: vec!["initialize-commerce-runtime"],
                required_contracts: vec![
                    "CommerceRpcAdapterManifest",
                    "CommerceRuntimeOperationInput",
                    "CommerceRuntimeOperationEnvelope",
                ],
            },
            CommerceBootstrapStartupStage {
                name: "bind-commerce-tauri-commands",
                depends_on: vec!["bind-commerce-rpc-services"],
                required_contracts: vec![
                    "CommerceTauriAdapterManifest",
                    "CommerceRuntimeOperationInput",
                    "CommerceRuntimeOperationEnvelope",
                ],
            },
        ]
    }

    pub fn standard_host_requirements() -> Vec<CommerceBootstrapHostRequirement> {
        vec![
            CommerceBootstrapHostRequirement {
                name: "commerce.database.connection",
                stage: "initialize-commerce-storage",
                required_contracts: vec!["CommerceStorageCapabilityManifest", "database_url"],
            },
            CommerceBootstrapHostRequirement {
                name: "commerce.database.migration-runner",
                stage: "initialize-commerce-storage",
                required_contracts: vec![
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
            },
            CommerceBootstrapHostRequirement {
                name: "commerce.runtime.idempotency-store",
                stage: "initialize-commerce-runtime",
                required_contracts: vec![
                    "CommerceRuntimeIdempotencyStore",
                    "CommerceIdempotencyRepositorySqlContract",
                ],
            },
            CommerceBootstrapHostRequirement {
                name: "commerce.runtime.transaction-manager",
                stage: "initialize-commerce-runtime",
                required_contracts: vec![
                    "CommerceRuntimeTransactionManager",
                    "CommerceTransactionBoundarySqlContract",
                ],
            },
            CommerceBootstrapHostRequirement {
                name: "commerce.runtime.service-registry",
                stage: "initialize-commerce-runtime",
                required_contracts: vec![
                    "CommerceRuntimeServiceRegistry",
                    "CommerceRuntimeCapabilityManifest",
                ],
            },
            CommerceBootstrapHostRequirement {
                name: "commerce.http.authenticated-context",
                stage: "bind-commerce-http-routes",
                required_contracts: vec!["CommerceRuntimeContext", "CommerceRuntimeOperationInput"],
            },
            CommerceBootstrapHostRequirement {
                name: "commerce.http.route-binding",
                stage: "bind-commerce-http-routes",
                required_contracts: vec![
                    "CommerceBootstrapHttpManifest",
                    "CommerceRuntimeOperationEnvelope",
                ],
            },
            CommerceBootstrapHostRequirement {
                name: "commerce.rpc.service-binding",
                stage: "bind-commerce-rpc-services",
                required_contracts: vec![
                    "CommerceRpcAdapterManifest",
                    "CommerceRuntimeOperationInput",
                    "CommerceRuntimeOperationEnvelope",
                ],
            },
            CommerceBootstrapHostRequirement {
                name: "commerce.rpc.runtime-host",
                stage: "bind-commerce-rpc-services",
                required_contracts: vec![
                    "CommerceServiceHostRuntimeStores",
                    "CommerceServiceHostRpcHost",
                ],
            },
            CommerceBootstrapHostRequirement {
                name: "commerce.tauri.command-binding",
                stage: "bind-commerce-tauri-commands",
                required_contracts: vec![
                    "CommerceTauriAdapterManifest",
                    "CommerceRuntimeOperationInput",
                    "CommerceRuntimeOperationEnvelope",
                ],
            },
        ]
    }

    pub fn validate(&self) -> Result<(), CommerceBootstrapValidationError> {
        self.validate_runtime_type_contracts()?;
        self.validate_storage_contracts()?;
        self.validate_http_contracts()?;
        self.validate_rpc_contracts()?;
        self.validate_tauri_contracts()?;
        self.validate_startup_stage_contracts()?;
        self.validate_host_requirement_contracts()?;

        Ok(())
    }

    fn validate_runtime_type_contracts(&self) -> Result<(), CommerceBootstrapValidationError> {
        self.ensure(
            self.runtime.operation_input_type == self.operation_input_type,
            "Runtime operation input type must match bootstrap operation input type",
        )?;
        self.ensure(
            self.runtime.operation_output_type == self.operation_output_type,
            "Runtime operation output type must match bootstrap operation output type",
        )?;

        Ok(())
    }

    fn validate_storage_contracts(&self) -> Result<(), CommerceBootstrapValidationError> {
        validate_commerce_migration_plan(&self.storage.migration_plan).map_err(|error| {
            self.error(format!(
                "Storage migration plan must be valid: {}",
                error.message
            ))
        })?;
        validate_commerce_migration_runner_sql_contract(&self.storage.migration_runner).map_err(
            |error| {
                self.error(format!(
                    "Storage migration runner contract must be valid: {}",
                    error.message
                ))
            },
        )?;
        self.ensure(
            self.storage.migration_runner.plan == self.storage.migration_plan,
            "Storage migration runner plan must match storage migration plan",
        )?;
        self.ensure(
            self.storage.migration_runner.applied_migration_sequence == self.storage.migrations,
            "Storage migration runner sequence must match storage migrations",
        )?;
        self.ensure(
            self.storage.migration_runner.transaction_boundary_manager
                == self.storage.transaction_boundary.manager_name,
            "Storage migration runner transaction boundary must match storage transaction manager",
        )?;
        self.ensure(
            self.storage.idempotency_repository.repository_name == "idempotency.repository",
            "Storage idempotency repository must expose idempotency.repository",
        )?;
        self.ensure(
            self.storage
                .transaction_boundary
                .covered_repositories
                .contains(&"idempotency.repository"),
            "Storage transaction boundary must cover idempotency.repository",
        )?;

        Ok(())
    }

    fn validate_http_contracts(&self) -> Result<(), CommerceBootstrapValidationError> {
        self.ensure(
            self.http.app_routes.len() == self.http.execution_metadata.len(),
            "HTTP app routes must have matching execution metadata",
        )?;
        self.ensure(
            self.http.response_envelope.name == self.operation_output_type,
            "HTTP response envelope must match bootstrap operation output type",
        )?;
        self.ensure(
            self.http.response_envelope.applies_to_app_routes,
            "HTTP response envelope must apply to app routes",
        )?;
        self.ensure(
            self.http.runtime_input_binding.input_type == self.operation_input_type,
            "HTTP runtime input binding must match bootstrap operation input type",
        )?;
        self.ensure(
            self.http.runtime_input_binding.applies_to_app_routes,
            "HTTP runtime input binding must apply to app routes",
        )?;

        for route in &self.http.app_routes {
            self.ensure(
                route.response_envelope_name == self.operation_output_type,
                "HTTP route response envelope name must match bootstrap operation output type",
            )?;
            self.ensure(
                route.runtime_input_binding_name == self.operation_input_type,
                "HTTP route runtime input binding name must match bootstrap operation input type",
            )?;
            self.ensure(
                self.runtime_operation_contract(route.operation_id)
                    .is_some(),
                format!(
                    "HTTP app route operation is not in runtime contracts: {}",
                    route.operation_id
                ),
            )?;
            self.ensure(
                self.http
                    .execution_metadata
                    .iter()
                    .any(|metadata| metadata.operation_id == route.operation_id),
                format!(
                    "HTTP app route is missing execution metadata: {}",
                    route.operation_id
                ),
            )?;
        }

        for metadata in &self.http.execution_metadata {
            let contract = self
                .runtime_operation_contract(metadata.operation_id)
                .ok_or_else(|| {
                    self.error(format!(
                        "HTTP execution metadata operation is not in runtime contracts: {}",
                        metadata.operation_id
                    ))
                })?;

            self.ensure(
                metadata.service_name == contract.service_name,
                format!(
                    "HTTP execution metadata service mismatch for operation: {}",
                    metadata.operation_id
                ),
            )?;
            self.ensure(
                metadata.execution_policy == contract.execution_policy,
                format!(
                    "HTTP execution metadata policy mismatch for operation: {}",
                    metadata.operation_id
                ),
            )?;
            self.ensure(
                metadata.capability_name == contract.capability_name,
                format!(
                    "HTTP execution metadata capability mismatch for operation: {}",
                    metadata.operation_id
                ),
            )?;
            self.ensure(
                metadata.requires_idempotency == contract.requires_idempotency(),
                format!(
                    "HTTP execution metadata idempotency mismatch for operation: {}",
                    metadata.operation_id
                ),
            )?;
            self.ensure(
                metadata.requires_transaction == contract.requires_transaction(),
                format!(
                    "HTTP execution metadata transaction mismatch for operation: {}",
                    metadata.operation_id
                ),
            )?;
        }

        Ok(())
    }

    fn validate_rpc_contracts(&self) -> Result<(), CommerceBootstrapValidationError> {
        self.ensure(
            self.rpc.proto_root == COMMERCE_RPC_PROTO_ROOT,
            "RPC proto root must match commerce rpc contracts authority",
        )?;
        self.ensure(
            !self.rpc.service_manifests.is_empty(),
            "RPC adapter manifest must declare service manifests",
        )?;
        self.ensure(
            self.rpc
                .capabilities
                .contains(&COMMERCE_RPC_SERVICE_BINDING_CAPABILITY),
            "RPC adapter manifest must declare service-binding capability",
        )?;
        self.ensure(
            self.rpc
                .capabilities
                .contains(&COMMERCE_RPC_CONTEXT_CAPABILITY),
            "RPC adapter manifest must declare context capability",
        )?;
        self.ensure(
            self.rpc
                .capabilities
                .contains(&COMMERCE_RPC_ERROR_MAPPING_CAPABILITY),
            "RPC adapter manifest must declare error-mapping capability",
        )?;
        self.ensure(
            self.rpc
                .capabilities
                .contains(&COMMERCE_RPC_SERVER_CAPABILITY),
            "RPC adapter manifest must declare server capability",
        )?;
        self.ensure(
            self.rpc
                .capabilities
                .contains(&COMMERCE_RPC_HEALTH_CAPABILITY),
            "RPC adapter manifest must declare health capability",
        )?;
        self.ensure(
            self.rpc
                .capabilities
                .contains(&COMMERCE_RPC_REFLECTION_CAPABILITY),
            "RPC adapter manifest must declare reflection capability",
        )?;

        for manifest in &self.rpc.service_manifests {
            validate_manifest(manifest).map_err(|error| {
                self.error(format!(
                    "RPC service manifest must be valid for {}::{}: {}",
                    manifest.package_name, manifest.service_name, error
                ))
            })?;

            for method in &manifest.methods {
                self.ensure(
                    self.runtime_operation_contract(method.operation_id)
                        .is_some(),
                    format!(
                        "RPC method operation is not in runtime contracts: {}",
                        method.operation_id
                    ),
                )?;
            }
        }

        Ok(())
    }

    fn validate_tauri_contracts(&self) -> Result<(), CommerceBootstrapValidationError> {
        self.ensure(
            self.tauri.command_bindings.len() == self.tauri.commands.len(),
            "Tauri commands must have matching command bindings",
        )?;
        self.ensure(
            self.tauri.response_envelope.name == self.operation_output_type,
            "Tauri response envelope must match bootstrap operation output type",
        )?;
        self.ensure(
            self.tauri.response_envelope.applies_to_tauri_commands,
            "Tauri response envelope must apply to commands",
        )?;
        self.ensure(
            self.tauri.runtime_input_binding.input_type == self.operation_input_type,
            "Tauri runtime input binding must match bootstrap operation input type",
        )?;
        self.ensure(
            self.tauri.runtime_input_binding.applies_to_tauri_commands,
            "Tauri runtime input binding must apply to commands",
        )?;

        for binding in &self.tauri.command_bindings {
            self.validate_tauri_command_binding(binding)?;
        }

        for command in &self.tauri.commands {
            self.ensure(
                self.tauri
                    .command_bindings
                    .iter()
                    .any(|binding| binding.command == *command),
                format!("Tauri command is missing a binding: {command}"),
            )?;
        }

        Ok(())
    }

    fn validate_tauri_command_binding(
        &self,
        binding: &CommerceTauriCommandBinding,
    ) -> Result<(), CommerceBootstrapValidationError> {
        self.ensure(
            self.tauri.commands.contains(&binding.command),
            format!(
                "Tauri command binding references an unknown command: {}",
                binding.command
            ),
        )?;
        self.ensure(
            binding.response_envelope_name == self.operation_output_type,
            "Tauri command binding response envelope must match bootstrap operation output type",
        )?;
        self.ensure(
            binding.runtime_input_binding_name == self.operation_input_type,
            "Tauri command binding runtime input binding must match bootstrap operation input type",
        )?;

        let contract = self
            .runtime_operation_contract(binding.operation_id)
            .ok_or_else(|| {
                self.error(format!(
                    "Tauri command binding operation is not in runtime contracts: {}",
                    binding.operation_id
                ))
            })?;

        self.ensure(
            binding.service_name == contract.service_name,
            format!(
                "Tauri command binding service mismatch for operation: {}",
                binding.operation_id
            ),
        )?;
        self.ensure(
            binding.execution_policy == contract.execution_policy,
            format!(
                "Tauri command binding policy mismatch for operation: {}",
                binding.operation_id
            ),
        )?;
        self.ensure(
            binding.capability_name == contract.capability_name,
            format!(
                "Tauri command binding capability mismatch for operation: {}",
                binding.operation_id
            ),
        )?;
        self.ensure(
            binding.requires_idempotency == contract.requires_idempotency(),
            format!(
                "Tauri command binding idempotency mismatch for operation: {}",
                binding.operation_id
            ),
        )?;
        self.ensure(
            binding.requires_transaction == contract.requires_transaction(),
            format!(
                "Tauri command binding transaction mismatch for operation: {}",
                binding.operation_id
            ),
        )?;

        Ok(())
    }

    fn validate_startup_stage_contracts(&self) -> Result<(), CommerceBootstrapValidationError> {
        let standard_stages = Self::standard_startup_stages();
        for (index, stage) in self.startup_stages.iter().enumerate() {
            self.ensure(
                !stage.name.trim().is_empty(),
                "Bootstrap startup stage name is required",
            )?;
            self.ensure(
                !stage.required_contracts.is_empty(),
                format!(
                    "Bootstrap startup stage must declare required contracts: {}",
                    stage.name
                ),
            )?;
            self.ensure(
                self.startup_stages
                    .iter()
                    .filter(|candidate| candidate.name == stage.name)
                    .count()
                    == 1,
                format!(
                    "Bootstrap startup stages must have unique names: {}",
                    stage.name
                ),
            )?;

            for dependency in &stage.depends_on {
                let dependency_index = self
                    .startup_stages
                    .iter()
                    .position(|candidate| candidate.name == *dependency)
                    .ok_or_else(|| {
                        self.error(format!(
                            "Bootstrap startup stage dependency is not declared: {} -> {}",
                            stage.name, dependency
                        ))
                    })?;
                self.ensure(
                    dependency_index < index,
                    format!(
                        "Bootstrap startup stage dependency must be declared before dependent stage: {} -> {}",
                        stage.name, dependency
                    ),
                )?;
            }

            if let Some(standard_stage) = standard_stages
                .iter()
                .find(|standard_stage| standard_stage.name == stage.name)
            {
                for contract in &standard_stage.required_contracts {
                    self.ensure(
                        stage.required_contracts.contains(contract),
                        format!(
                            "Bootstrap startup stage must include standard contract: {} -> {}",
                            stage.name, contract
                        ),
                    )?;
                }
            }
        }

        Ok(())
    }

    fn validate_host_requirement_contracts(&self) -> Result<(), CommerceBootstrapValidationError> {
        let standard_requirements = Self::standard_host_requirements();
        for requirement in &self.host_requirements {
            self.ensure(
                !requirement.name.trim().is_empty(),
                "Bootstrap host requirement name is required",
            )?;
            self.ensure(
                self.host_requirements
                    .iter()
                    .filter(|candidate| candidate.name == requirement.name)
                    .count()
                    == 1,
                format!(
                    "Bootstrap host requirements must have unique names: {}",
                    requirement.name
                ),
            )?;
            self.ensure(
                !requirement.required_contracts.is_empty(),
                format!(
                    "Bootstrap host requirement must declare required contracts: {}",
                    requirement.name
                ),
            )?;
            self.ensure(
                self.startup_stages
                    .iter()
                    .any(|stage| stage.name == requirement.stage),
                format!(
                    "Bootstrap host requirement stage is not declared: {} -> {}",
                    requirement.name, requirement.stage
                ),
            )?;

            if let Some(standard_requirement) = standard_requirements
                .iter()
                .find(|standard_requirement| standard_requirement.name == requirement.name)
            {
                for contract in &standard_requirement.required_contracts {
                    self.ensure(
                        requirement.required_contracts.contains(contract),
                        format!(
                            "Bootstrap host requirement must include standard contract: {} -> {}",
                            requirement.name, contract
                        ),
                    )?;
                }
            }
        }

        for standard_requirement in standard_requirements {
            self.ensure(
                self.host_requirements
                    .iter()
                    .any(|requirement| requirement.name == standard_requirement.name),
                format!(
                    "Bootstrap host requirements must include standard requirement: {}",
                    standard_requirement.name
                ),
            )?;
        }

        for stage in self
            .startup_stages
            .iter()
            .filter(|stage| stage.name != "validate-bootstrap-contracts")
        {
            self.ensure(
                self.host_requirements
                    .iter()
                    .any(|requirement| requirement.stage == stage.name),
                format!(
                    "Bootstrap startup stage must have host requirement coverage: {}",
                    stage.name
                ),
            )?;
        }

        Ok(())
    }

    fn runtime_operation_contract(
        &self,
        operation_id: &str,
    ) -> Option<&sdkwork_commerce_contract_service::CommerceOperationContract> {
        self.runtime
            .operation_contracts
            .iter()
            .find(|contract| contract.operation_id == operation_id)
    }

    fn ensure(
        &self,
        condition: bool,
        message: impl Into<String>,
    ) -> Result<(), CommerceBootstrapValidationError> {
        condition.then_some(()).ok_or_else(|| self.error(message))
    }

    fn error(&self, message: impl Into<String>) -> CommerceBootstrapValidationError {
        CommerceBootstrapValidationError {
            code: "bootstrap-contract-mismatch",
            message: message.into(),
        }
    }
}

pub fn commerce_local_private_bootstrap_manifest() -> CommerceLocalPrivateBootstrapManifest {
    CommerceLocalPrivateBootstrapManifest {
        name: "sdkwork-commerce-local-private-bootstrap",
        bootstrap_version: "commerce.bootstrap.v1",
        runtime: commerce_runtime_capability_manifest(),
        storage: commerce_storage_capability_manifest(),
        http: CommerceBootstrapHttpManifest {
            app_routes: app_routes(),
            execution_metadata: app_route_execution_metadata(),
            response_envelope: commerce_http_response_envelope(),
            runtime_input_binding: commerce_http_runtime_input_binding(),
        },
        rpc: commerce_rpc_adapter_manifest(),
        tauri: commerce_tauri_adapter_manifest(),
        operation_input_type: "CommerceRuntimeOperationInput",
        operation_output_type: "CommerceRuntimeOperationEnvelope",
        startup_stages: CommerceLocalPrivateBootstrapManifest::standard_startup_stages(),
        host_requirements: CommerceLocalPrivateBootstrapManifest::standard_host_requirements(),
    }
}

pub fn run_commerce_local_private_bootstrap_preflight(
) -> Result<CommerceLocalPrivateBootstrapPreflight, CommerceBootstrapValidationError> {
    commerce_local_private_bootstrap_manifest().preflight()
}

pub fn commerce_experience_seed_manifest() -> CommerceExperienceSeedManifest {
    let benefit_definitions = commerce_benefit_definition_seeds();
    let membership_plans = membership_plan_seeds();
    let membership_plan_versions = membership_plan_version_seeds();
    let membership_plan_benefits = membership_plan_benefit_seeds();
    let membership_package_groups = membership_package_group_seeds();
    let membership_packages = membership_package_seeds();
    let promotion_offers = commerce_promotion_offer_seeds();
    let promotion_offer_versions = commerce_promotion_offer_version_seeds();
    let promotion_coupon_stocks = commerce_promotion_coupon_stock_seeds();
    let promotion_codes = commerce_promotion_code_seeds();
    let promotion_user_coupons = commerce_promotion_user_coupon_seeds();
    let recharge_packages = commerce_recharge_package_seeds();
    let recharge_settings = commerce_recharge_settings_seeds();
    let payment_methods = commerce_payment_method_seeds();
    let payment_providers = commerce_payment_provider_seeds();
    let payment_provider_accounts = commerce_payment_provider_account_seeds();
    let payment_channels = commerce_payment_channel_seeds();
    let payment_route_rules = commerce_payment_route_rule_seeds();

    CommerceExperienceSeedManifest {
        name: "sdkwork-commerce-experience-seed",
        seed_version: "commerce.experience.seed.v1",
        benefit_definition_count: benefit_definitions.len(),
        membership_plan_count: membership_plans.len(),
        membership_plan_version_count: membership_plan_versions.len(),
        membership_plan_benefit_count: membership_plan_benefits.len(),
        membership_package_group_count: membership_package_groups.len(),
        membership_package_count: membership_packages.len(),
        promotion_offer_count: promotion_offers.len(),
        promotion_offer_version_count: promotion_offer_versions.len(),
        promotion_coupon_stock_count: promotion_coupon_stocks.len(),
        promotion_code_count: promotion_codes.len(),
        promotion_user_coupon_count: promotion_user_coupons.len(),
        recharge_package_count: recharge_packages.len(),
        recharge_settings_count: recharge_settings.len(),
        payment_method_count: payment_methods.len(),
        payment_provider_count: payment_providers.len(),
        payment_provider_account_count: payment_provider_accounts.len(),
        payment_channel_count: payment_channels.len(),
        payment_route_rule_count: payment_route_rules.len(),
        payload_json: commerce_experience_seed_payload(
            &benefit_definitions,
            &membership_plans,
            &membership_plan_versions,
            &membership_plan_benefits,
            &membership_package_groups,
            &membership_packages,
            &promotion_offers,
            &promotion_offer_versions,
            &promotion_coupon_stocks,
            &promotion_codes,
            &promotion_user_coupons,
            &recharge_packages,
            &recharge_settings,
            &payment_methods,
            &payment_providers,
            &payment_provider_accounts,
            &payment_channels,
            &payment_route_rules,
        ),
    }
}

pub fn commerce_benefit_definition_seeds() -> Vec<CommerceBenefitDefinitionSeed> {
    vec![
        CommerceBenefitDefinitionSeed {
            id: "seed-benefit-ai-quota",
            benefit_code: "ai_quota",
            name: "AI usage quota",
            benefit_type: "quota",
            value_unit: "points",
            measurement_type: "metered",
            description: "Reusable quota account for model calls, tools, and generation tasks.",
        },
        CommerceBenefitDefinitionSeed {
            id: "seed-benefit-priority-speed-up",
            benefit_code: "priority_speed_up",
            name: "Priority speed up",
            benefit_type: "priority",
            value_unit: "priority",
            measurement_type: "ranked",
            description: "Queue priority and routing acceleration for paid members.",
        },
        CommerceBenefitDefinitionSeed {
            id: "seed-benefit-member-discount",
            benefit_code: "member_discount",
            name: "Member discount",
            benefit_type: "discount",
            value_unit: "percent",
            measurement_type: "discount",
            description: "Member-exclusive percentage discount for eligible purchases.",
        },
        CommerceBenefitDefinitionSeed {
            id: "seed-benefit-monthly-coupon-grant",
            benefit_code: "monthly_coupon_grant",
            name: "Monthly coupon grant",
            benefit_type: "coupon_grant",
            value_unit: "coupon",
            measurement_type: "grant",
            description: "Monthly coupon bundle issued by membership plan benefit rules.",
        },
    ]
}

pub fn membership_plan_seeds() -> Vec<CommerceMembershipPlanSeed> {
    vec![
        CommerceMembershipPlanSeed {
            id: "seed-membership-plan-free",
            plan_no: "free",
            plan_code: "free",
            name: "Free",
            rank: 0,
            required_points: 0,
            validity_days: 1,
            badge: "Free",
            description: "Entry access for product discovery, public model routing, and a small trial quota.",
            benefits: Vec::new(),
        },
        CommerceMembershipPlanSeed {
            id: "seed-membership-plan-pro",
            plan_no: "pro",
            plan_code: "pro",
            name: "Pro member",
            rank: 1,
            required_points: 5_000,
            validity_days: 30,
            badge: "Pro",
            description: "High-frequency individual workflows with advanced models, larger context, and higher concurrency.",
            benefits: Vec::new(),
        },
        CommerceMembershipPlanSeed {
            id: "seed-membership-plan-max",
            plan_no: "max",
            plan_code: "max",
            name: "Max member",
            rank: 2,
            required_points: 12_000,
            validity_days: 30,
            badge: "Max",
            description: "Professional usage with higher quota, faster routing, member discounts, and monthly coupon grants.",
            benefits: Vec::new(),
        },
        CommerceMembershipPlanSeed {
            id: "seed-membership-plan-vip",
            plan_no: "vip",
            plan_code: "vip",
            name: "VIP member",
            rank: 3,
            required_points: 20_000,
            validity_days: 30,
            badge: "VIP",
            description: "Highest-priority member tier for teams and critical workloads with the strongest quota and promotion bundle.",
            benefits: Vec::new(),
        },
    ]
}

pub fn membership_plan_version_seeds() -> Vec<CommerceMembershipPlanVersionSeed> {
    vec![
        membership_plan_version("free", "Free v1"),
        membership_plan_version("pro", "Pro v1"),
        membership_plan_version("max", "Max v1"),
        membership_plan_version("vip", "VIP v1"),
    ]
}

pub fn membership_plan_benefit_seeds() -> Vec<CommerceMembershipPlanBenefitSeed> {
    vec![
        plan_benefit(
            "free",
            "ai_quota",
            "1000",
            Some("month"),
            Some("monthly"),
            Some("consume"),
            10,
        ),
        plan_benefit(
            "pro",
            "ai_quota",
            "45000",
            Some("month"),
            Some("monthly"),
            Some("consume"),
            10,
        ),
        plan_benefit(
            "pro",
            "priority_speed_up",
            "2",
            None,
            None,
            Some("priority_queue"),
            20,
        ),
        plan_benefit(
            "pro",
            "member_discount",
            "5",
            None,
            None,
            Some("eligible_orders"),
            30,
        ),
        plan_benefit(
            "pro",
            "monthly_coupon_grant",
            "1",
            Some("month"),
            Some("monthly"),
            Some("auto_grant"),
            40,
        ),
        plan_benefit(
            "max",
            "ai_quota",
            "120000",
            Some("month"),
            Some("monthly"),
            Some("consume"),
            10,
        ),
        plan_benefit(
            "max",
            "priority_speed_up",
            "3",
            None,
            None,
            Some("priority_queue"),
            20,
        ),
        plan_benefit(
            "max",
            "member_discount",
            "10",
            None,
            None,
            Some("eligible_orders"),
            30,
        ),
        plan_benefit(
            "max",
            "monthly_coupon_grant",
            "2",
            Some("month"),
            Some("monthly"),
            Some("auto_grant"),
            40,
        ),
        plan_benefit(
            "vip",
            "ai_quota",
            "300000",
            Some("month"),
            Some("monthly"),
            Some("consume"),
            10,
        ),
        plan_benefit(
            "vip",
            "priority_speed_up",
            "4",
            None,
            None,
            Some("priority_queue"),
            20,
        ),
        plan_benefit(
            "vip",
            "member_discount",
            "15",
            None,
            None,
            Some("eligible_orders"),
            30,
        ),
        plan_benefit(
            "vip",
            "monthly_coupon_grant",
            "4",
            Some("month"),
            Some("monthly"),
            Some("auto_grant"),
            40,
        ),
    ]
}

pub fn membership_package_group_seeds() -> Vec<CommerceMembershipPackageGroupSeed> {
    vec![
        CommerceMembershipPackageGroupSeed {
            id: "seed-membership-package-group-month",
            external_id: 1,
            package_group_no: "membership-month",
            name: "Monthly purchase",
            description: "Monthly membership packages for recurring individual and team usage.",
            billing_cycle: "month",
            duration_days: 30,
            sort_weight: 10,
        },
        CommerceMembershipPackageGroupSeed {
            id: "seed-membership-package-group-year",
            external_id: 2,
            package_group_no: "membership-year",
            name: "Yearly purchase",
            description: "Yearly membership packages with annual value and long-term quotas.",
            billing_cycle: "year",
            duration_days: 365,
            sort_weight: 20,
        },
    ]
}

pub fn membership_package_seeds() -> Vec<CommerceMembershipPackageSeed> {
    vec![
        membership_package(
            301,
            "membership-month",
            "pro",
            "Monthly Pro",
            "Monthly purchase - Pro member",
            "Monthly pro membership for high-frequency creation and development workflows.",
            "69.90",
            Some("129.00"),
            45_000,
            30,
            301,
            true,
            &["monthly", "pro", "recommended"],
        ),
        membership_package(
            302,
            "membership-month",
            "max",
            "Monthly Max",
            "Monthly purchase - Max member",
            "Monthly max membership with higher quota, faster routing, and member discounts.",
            "129.00",
            Some("199.00"),
            120_000,
            30,
            302,
            false,
            &["monthly", "max", "professional"],
        ),
        membership_package(
            303,
            "membership-month",
            "vip",
            "Monthly VIP",
            "Monthly purchase - VIP member",
            "Monthly VIP membership for team usage and critical business workloads.",
            "299.00",
            Some("399.00"),
            300_000,
            30,
            303,
            false,
            &["monthly", "vip", "team"],
        ),
        membership_package(
            401,
            "membership-year",
            "pro",
            "Yearly Pro",
            "Yearly purchase - Pro member",
            "Yearly pro membership for sustained creation, development, and automation workflows.",
            "699.00",
            Some("838.80"),
            720_000,
            365,
            401,
            false,
            &["yearly", "pro", "annual"],
        ),
        membership_package(
            402,
            "membership-year",
            "max",
            "Yearly Max",
            "Yearly purchase - Max member",
            "Yearly max membership for professional usage with annual value.",
            "1299.00",
            Some("1548.00"),
            1_800_000,
            365,
            402,
            false,
            &["yearly", "max", "annual"],
        ),
        membership_package(
            403,
            "membership-year",
            "vip",
            "Yearly VIP",
            "Yearly purchase - VIP member",
            "Yearly VIP membership for long-term teams, dedicated support, and highest priority.",
            "2999.00",
            Some("3588.00"),
            4_800_000,
            365,
            403,
            true,
            &["yearly", "vip", "best-value"],
        ),
    ]
}

pub fn commerce_recharge_package_seeds() -> Vec<CommerceRechargePackageSeed> {
    vec![
        recharge_package(
            "seed-recharge-package-cny-500",
            "seed-sku-points-recharge-cny-500",
            "points-cny-5",
            "points-recharge-cny-5",
            501,
            "5 RMB points package",
            "5.00",
            "CNY",
            0,
            "active",
            1,
        ),
        recharge_package(
            "seed-recharge-package-cny-1000",
            "seed-sku-points-recharge-cny-1000",
            "points-cny-10",
            "points-recharge-cny-10",
            502,
            "10 RMB points package",
            "10.00",
            "CNY",
            0,
            "active",
            2,
        ),
        recharge_package(
            "seed-recharge-package-cny-2000",
            "seed-sku-points-recharge-cny-2000",
            "points-cny-20",
            "points-recharge-cny-20",
            503,
            "20 RMB points package",
            "20.00",
            "CNY",
            0,
            "active",
            3,
        ),
        recharge_package(
            "seed-recharge-package-cny-3000",
            "seed-sku-points-recharge-cny-3000",
            "points-cny-30",
            "points-recharge-cny-30",
            504,
            "30 RMB points package",
            "30.00",
            "CNY",
            0,
            "active",
            4,
        ),
        recharge_package(
            "seed-recharge-package-cny-5000",
            "seed-sku-points-recharge-cny-5000",
            "points-cny-50",
            "points-recharge-cny-50",
            505,
            "50 RMB points package",
            "50.00",
            "CNY",
            0,
            "active",
            5,
        ),
        recharge_package(
            "seed-recharge-package-cny-10000",
            "seed-sku-points-recharge-cny-10000",
            "points-cny-100",
            "points-recharge-cny-100",
            506,
            "100 RMB points package",
            "100.00",
            "CNY",
            0,
            "active",
            6,
        ),
        recharge_package(
            "seed-recharge-package-cny-20000",
            "seed-sku-points-recharge-cny-20000",
            "points-cny-200",
            "points-recharge-cny-200",
            507,
            "200 RMB points package",
            "200.00",
            "CNY",
            0,
            "active",
            7,
        ),
        recharge_package(
            "seed-recharge-package-cny-50000",
            "seed-sku-points-recharge-cny-50000",
            "points-cny-500",
            "points-recharge-cny-500",
            508,
            "500 RMB points package",
            "500.00",
            "CNY",
            0,
            "active",
            8,
        ),
        recharge_package(
            "seed-recharge-package-cny-100000",
            "seed-sku-points-recharge-cny-100000",
            "points-cny-1000",
            "points-recharge-cny-1000",
            509,
            "1000 RMB points package",
            "1000.00",
            "CNY",
            0,
            "active",
            9,
        ),
        recharge_package(
            "seed-recharge-package-usd-500",
            "seed-sku-points-recharge-usd-500",
            "points-usd-5",
            "points-recharge-usd-5",
            510,
            "5 USD points package",
            "5.00",
            "USD",
            0,
            "inactive",
            101,
        ),
        recharge_package(
            "seed-recharge-package-usd-1000",
            "seed-sku-points-recharge-usd-1000",
            "points-usd-10",
            "points-recharge-usd-10",
            511,
            "10 USD points package",
            "10.00",
            "USD",
            0,
            "inactive",
            102,
        ),
        recharge_package(
            "seed-recharge-package-usd-2000",
            "seed-sku-points-recharge-usd-2000",
            "points-usd-20",
            "points-recharge-usd-20",
            512,
            "20 USD points package",
            "20.00",
            "USD",
            0,
            "inactive",
            103,
        ),
        recharge_package(
            "seed-recharge-package-usd-3000",
            "seed-sku-points-recharge-usd-3000",
            "points-usd-30",
            "points-recharge-usd-30",
            513,
            "30 USD points package",
            "30.00",
            "USD",
            0,
            "inactive",
            104,
        ),
        recharge_package(
            "seed-recharge-package-usd-5000",
            "seed-sku-points-recharge-usd-5000",
            "points-usd-50",
            "points-recharge-usd-50",
            514,
            "50 USD points package",
            "50.00",
            "USD",
            0,
            "inactive",
            105,
        ),
        recharge_package(
            "seed-recharge-package-usd-10000",
            "seed-sku-points-recharge-usd-10000",
            "points-usd-100",
            "points-recharge-usd-100",
            515,
            "100 USD points package",
            "100.00",
            "USD",
            0,
            "inactive",
            106,
        ),
        recharge_package(
            "seed-recharge-package-usd-20000",
            "seed-sku-points-recharge-usd-20000",
            "points-usd-200",
            "points-recharge-usd-200",
            516,
            "200 USD points package",
            "200.00",
            "USD",
            0,
            "inactive",
            107,
        ),
        recharge_package(
            "seed-recharge-package-usd-50000",
            "seed-sku-points-recharge-usd-50000",
            "points-usd-500",
            "points-recharge-usd-500",
            517,
            "500 USD points package",
            "500.00",
            "USD",
            0,
            "inactive",
            108,
        ),
        recharge_package(
            "seed-recharge-package-usd-100000",
            "seed-sku-points-recharge-usd-100000",
            "points-usd-1000",
            "points-recharge-usd-1000",
            518,
            "1000 USD points package",
            "1000.00",
            "USD",
            0,
            "inactive",
            109,
        ),
    ]
}

pub fn commerce_recharge_settings_seeds() -> Vec<CommerceRechargeSettingsSeed> {
    vec![CommerceRechargeSettingsSeed {
        rule_id: "seed-exchange-rule-cash-to-points",
        rule_no: "CASH_TO_POINTS",
        source_asset_type: "cash",
        target_asset_type: "points",
        rate: "10",
        base_currency_code: "CNY",
        currency_to_cny_rates: vec![("CNY", "1"), ("USD", "7")],
    }]
}

pub fn commerce_payment_method_seeds() -> Vec<CommercePaymentMethodSeed> {
    vec![
        CommercePaymentMethodSeed {
            id: "seed-payment-method-wechat-pay",
            method_key: "wechat_pay",
            display_name: "WeChat Pay",
            provider_code: "wechat_pay",
            sort_order: 10,
        },
        CommercePaymentMethodSeed {
            id: "seed-payment-method-alipay",
            method_key: "alipay",
            display_name: "Alipay",
            provider_code: "alipay",
            sort_order: 20,
        },
        CommercePaymentMethodSeed {
            id: "seed-payment-method-paypal",
            method_key: "paypal",
            display_name: "PayPal",
            provider_code: "paypal",
            sort_order: 30,
        },
        CommercePaymentMethodSeed {
            id: "seed-payment-method-card",
            method_key: "card",
            display_name: "Card",
            provider_code: "stripe",
            sort_order: 40,
        },
        CommercePaymentMethodSeed {
            id: "seed-payment-method-apple-pay",
            method_key: "apple_pay",
            display_name: "Apple Pay",
            provider_code: "apple_pay",
            sort_order: 50,
        },
        CommercePaymentMethodSeed {
            id: "seed-payment-method-google-pay",
            method_key: "google_pay",
            display_name: "Google Pay",
            provider_code: "google_pay",
            sort_order: 60,
        },
        CommercePaymentMethodSeed {
            id: "seed-payment-method-wallet-balance",
            method_key: "wallet_balance",
            display_name: "Wallet balance",
            provider_code: "wallet_balance",
            sort_order: 70,
        },
    ]
}

pub fn commerce_payment_provider_seeds() -> Vec<CommercePaymentProviderSeed> {
    vec![
        payment_provider_seed(
            "wechat_pay",
            "WeChat Pay",
            "domestic_wallet",
            &["CN"],
            &["CNY"],
            &["wechat_pay"],
            10,
        ),
        payment_provider_seed(
            "alipay",
            "Alipay",
            "domestic_wallet",
            &["CN"],
            &["CNY"],
            &["alipay"],
            20,
        ),
        payment_provider_seed(
            "stripe",
            "Stripe",
            "card_processor",
            &["US", "CN"],
            &["USD", "CNY"],
            &["card"],
            30,
        ),
        payment_provider_seed(
            "paypal",
            "PayPal",
            "international_wallet",
            &["US", "CN"],
            &["USD", "CNY"],
            &["paypal"],
            40,
        ),
        payment_provider_seed(
            "apple_pay",
            "Apple Pay",
            "international_wallet",
            &["US", "CN"],
            &["USD", "CNY"],
            &["apple_pay"],
            50,
        ),
        payment_provider_seed(
            "google_pay",
            "Google Pay",
            "international_wallet",
            &["US", "CN"],
            &["USD", "CNY"],
            &["google_pay"],
            60,
        ),
    ]
}

pub fn commerce_payment_provider_account_seeds() -> Vec<CommercePaymentProviderAccountSeed> {
    vec![
        payment_provider_account_seed("wechat_pay", "CN", "CNY"),
        payment_provider_account_seed("alipay", "CN", "CNY"),
        payment_provider_account_seed("stripe", "US", "USD"),
        payment_provider_account_seed("paypal", "US", "USD"),
        payment_provider_account_seed("apple_pay", "US", "USD"),
        payment_provider_account_seed("google_pay", "US", "USD"),
    ]
}

pub fn commerce_payment_channel_seeds() -> Vec<CommercePaymentChannelSeed> {
    commerce_payment_method_seeds()
        .into_iter()
        .filter(|method| method.method_key != "wallet_balance")
        .flat_map(|method| {
            payment_scene_codes()
                .into_iter()
                .enumerate()
                .map(move |(index, scene)| {
                    let provider_code = method.provider_code;
                    let country_code = default_payment_country(provider_code);
                    let currency_code = default_payment_currency(provider_code);
                    CommercePaymentChannelSeed {
                        id: format!("seed-payment-channel-{}-{scene}", method.method_key),
                        channel_no: format!("seed-{}-{scene}", method.method_key),
                        provider_account_id: payment_provider_account_id(provider_code).to_owned(),
                        method_id: method.id,
                        method_key: method.method_key,
                        provider_code,
                        scene_code: scene,
                        currency_code,
                        country_code,
                        status: "active",
                        priority: ((index + 1) as i64) * 10,
                    }
                })
        })
        .collect()
}

pub fn commerce_payment_route_rule_seeds() -> Vec<CommercePaymentRouteRuleSeed> {
    commerce_payment_channel_seeds()
        .into_iter()
        .map(|channel| CommercePaymentRouteRuleSeed {
            id: format!("seed-payment-route-rule-{}", channel.channel_no),
            rule_no: format!("route-{}", channel.channel_no),
            priority: channel.priority,
            purchase_type: channel.scene_code,
            country_code: channel.country_code,
            currency_code: channel.currency_code,
            client_platform: "all",
            channel_id: channel.id,
            status: "active",
        })
        .collect()
}

fn payment_provider_seed(
    provider_code: &'static str,
    display_name: &'static str,
    provider_type: &'static str,
    supported_countries: &[&'static str],
    supported_currencies: &[&'static str],
    supported_methods: &[&'static str],
    sort_order: i64,
) -> CommercePaymentProviderSeed {
    CommercePaymentProviderSeed {
        id: payment_provider_id(provider_code),
        provider_code,
        display_name,
        provider_type,
        supported_countries: supported_countries.to_vec(),
        supported_currencies: supported_currencies.to_vec(),
        supported_methods: supported_methods.to_vec(),
        sort_order,
    }
}

fn payment_provider_account_seed(
    provider_code: &'static str,
    country_code: &'static str,
    settlement_currency: &'static str,
) -> CommercePaymentProviderAccountSeed {
    CommercePaymentProviderAccountSeed {
        id: payment_provider_account_id(provider_code),
        account_no: payment_provider_account_no(provider_code),
        provider_code,
        merchant_id: payment_provider_placeholder_merchant_id(provider_code),
        environment: "sandbox",
        country_code,
        settlement_currency,
        secret_ref: payment_provider_placeholder_secret_ref(provider_code),
        webhook_secret_ref: Some(payment_provider_placeholder_webhook_secret_ref(
            provider_code,
        )),
        certificate_ref: payment_provider_placeholder_certificate_ref(provider_code),
        status: "active",
    }
}

fn payment_scene_codes() -> [&'static str; 6] {
    [
        "checkout",
        "membership_purchase",
        "points_recharge",
        "wallet_recharge",
        "subscription",
        "invoice",
    ]
}

fn payment_provider_id(provider_code: &str) -> &'static str {
    match provider_code {
        "wechat_pay" => "seed-payment-provider-wechat-pay",
        "alipay" => "seed-payment-provider-alipay",
        "paypal" => "seed-payment-provider-paypal",
        "stripe" => "seed-payment-provider-stripe",
        "apple_pay" => "seed-payment-provider-apple-pay",
        "google_pay" => "seed-payment-provider-google-pay",
        _ => "seed-payment-provider-unknown",
    }
}

fn payment_provider_account_id(provider_code: &str) -> &'static str {
    match provider_code {
        "wechat_pay" => "seed-payment-provider-account-wechat-pay",
        "alipay" => "seed-payment-provider-account-alipay",
        "paypal" => "seed-payment-provider-account-paypal",
        "stripe" => "seed-payment-provider-account-stripe",
        "apple_pay" => "seed-payment-provider-account-apple-pay",
        "google_pay" => "seed-payment-provider-account-google-pay",
        _ => "seed-payment-provider-account-unknown",
    }
}

fn payment_provider_account_no(provider_code: &str) -> &'static str {
    match provider_code {
        "wechat_pay" => "seed-wechat-pay-sandbox",
        "alipay" => "seed-alipay-sandbox",
        "paypal" => "seed-paypal-sandbox",
        "stripe" => "seed-stripe-sandbox",
        "apple_pay" => "seed-apple-pay-sandbox",
        "google_pay" => "seed-google-pay-sandbox",
        _ => "seed-unknown-sandbox",
    }
}

fn payment_provider_placeholder_merchant_id(provider_code: &str) -> &'static str {
    match provider_code {
        "wechat_pay" => "EDIT_ME_WECHAT_PAY_MERCHANT_ID",
        "alipay" => "EDIT_ME_ALIPAY_APP_ID",
        "paypal" => "EDIT_ME_PAYPAL_CLIENT_ID",
        "stripe" => "EDIT_ME_STRIPE_ACCOUNT_ID",
        "apple_pay" => "EDIT_ME_APPLE_PAY_MERCHANT_ID",
        "google_pay" => "EDIT_ME_GOOGLE_PAY_MERCHANT_ID",
        _ => "EDIT_ME_PAYMENT_MERCHANT_ID",
    }
}

fn payment_provider_placeholder_secret_ref(provider_code: &str) -> &'static str {
    match provider_code {
        "wechat_pay" => "secret://payment/wechat_pay/sandbox/api-key",
        "alipay" => "secret://payment/alipay/sandbox/private-key",
        "paypal" => "secret://payment/paypal/sandbox/client-secret",
        "stripe" => "secret://payment/stripe/sandbox/secret-key",
        "apple_pay" => "secret://payment/apple_pay/sandbox/merchant-key",
        "google_pay" => "secret://payment/google_pay/sandbox/gateway-key",
        _ => "secret://payment/unknown/sandbox/key",
    }
}

fn payment_provider_placeholder_webhook_secret_ref(provider_code: &str) -> &'static str {
    match provider_code {
        "wechat_pay" => "secret://payment/wechat_pay/sandbox/webhook",
        "alipay" => "secret://payment/alipay/sandbox/webhook",
        "paypal" => "secret://payment/paypal/sandbox/webhook",
        "stripe" => "secret://payment/stripe/sandbox/webhook",
        "apple_pay" => "secret://payment/apple_pay/sandbox/webhook",
        "google_pay" => "secret://payment/google_pay/sandbox/webhook",
        _ => "secret://payment/unknown/sandbox/webhook",
    }
}

fn payment_provider_placeholder_certificate_ref(provider_code: &str) -> Option<&'static str> {
    match provider_code {
        "wechat_pay" => Some("secret://payment/wechat_pay/sandbox/certificate"),
        "alipay" => Some("secret://payment/alipay/sandbox/certificate"),
        "apple_pay" => Some("secret://payment/apple_pay/sandbox/certificate"),
        _ => None,
    }
}

fn default_payment_country(provider_code: &str) -> &'static str {
    match provider_code {
        "wechat_pay" | "alipay" => "CN",
        _ => "US",
    }
}

fn default_payment_currency(provider_code: &str) -> &'static str {
    match provider_code {
        "wechat_pay" | "alipay" => "CNY",
        _ => "USD",
    }
}

pub fn commerce_promotion_offer_seeds() -> Vec<CommercePromotionOfferSeed> {
    vec![
        CommercePromotionOfferSeed {
            id: "seed-promotion-offer-new-user",
            offer_no: "offer-new-31026",
            offer_code: "new_user_coupon",
            name: "New user coupon",
            offer_type: "coupon",
            current_offer_version_id: "seed-promotion-offer-version-new-user-v1",
            audience_scope: "new_user",
        },
        CommercePromotionOfferSeed {
            id: "seed-promotion-offer-vip-monthly",
            offer_no: "offer-vip-monthly-2026",
            offer_code: "vip_monthly_coupon",
            name: "VIP monthly coupon",
            offer_type: "coupon",
            current_offer_version_id: "seed-promotion-offer-version-vip-monthly-v1",
            audience_scope: "vip_member",
        },
    ]
}

pub fn commerce_promotion_offer_version_seeds() -> Vec<CommercePromotionOfferVersionSeed> {
    vec![
        CommercePromotionOfferVersionSeed {
            id: "seed-promotion-offer-version-new-user-v1",
            offer_code: "new_user_coupon",
            version_no: "v1",
            lifecycle_status: "published",
            discount_type: "fixed_amount",
            discount_value: "20.00",
            minimum_amount: "50.00",
        },
        CommercePromotionOfferVersionSeed {
            id: "seed-promotion-offer-version-vip-monthly-v1",
            offer_code: "vip_monthly_coupon",
            version_no: "v1",
            lifecycle_status: "published",
            discount_type: "percent_off",
            discount_value: "15",
            minimum_amount: "0",
        },
    ]
}

pub fn commerce_promotion_coupon_stock_seeds() -> Vec<CommercePromotionCouponStockSeed> {
    vec![
        CommercePromotionCouponStockSeed {
            id: "seed-promotion-stock-new-user",
            stock_no: "stock-new-31026",
            name: "New user coupon stock",
            offer_code: "new_user_coupon",
            offer_version_id: "seed-promotion-offer-version-new-user-v1",
            stock_type: "limited",
            total_quantity: Some(10_000),
            available_quantity: 10_000,
        },
        CommercePromotionCouponStockSeed {
            id: "seed-promotion-stock-vip-monthly",
            stock_no: "stock-vip-monthly-2026",
            name: "VIP monthly coupon stock",
            offer_code: "vip_monthly_coupon",
            offer_version_id: "seed-promotion-offer-version-vip-monthly-v1",
            stock_type: "monthly_member_grant",
            total_quantity: None,
            available_quantity: 0,
        },
    ]
}

pub fn commerce_promotion_code_seeds() -> Vec<CommercePromotionCodeSeed> {
    vec![
        CommercePromotionCodeSeed {
            id: "seed-promotion-code-new-user",
            code_no: "code-new-31026",
            stock_no: "stock-new-31026",
            offer_code: "new_user_coupon",
            offer_version_id: "seed-promotion-offer-version-new-user-v1",
            promotion_code: "NEWUSER2026",
            code_type: "public",
            max_claims: 1,
        },
        CommercePromotionCodeSeed {
            id: "seed-promotion-code-vip-monthly",
            code_no: "code-vip-monthly-2026",
            stock_no: "stock-vip-monthly-2026",
            offer_code: "vip_monthly_coupon",
            offer_version_id: "seed-promotion-offer-version-vip-monthly-v1",
            promotion_code: "VIPMONTHLY2026",
            code_type: "member_only",
            max_claims: 1,
        },
    ]
}

pub fn commerce_promotion_user_coupon_seeds() -> Vec<CommercePromotionUserCouponSeed> {
    vec![
        CommercePromotionUserCouponSeed {
            id: "seed-user-coupon-new-user",
            coupon_no: "seed-coupon-new-user",
            stock_no: "stock-new-31026",
            offer_code: "new_user_coupon",
            subject_type: "user",
            subject_id: "seed-user-new",
            coupon_code: "SEED-NEW-USER-001",
            status: "claimable",
        },
        CommercePromotionUserCouponSeed {
            id: "seed-user-coupon-vip-monthly",
            coupon_no: "seed-coupon-vip-monthly",
            stock_no: "stock-vip-monthly-2026",
            offer_code: "vip_monthly_coupon",
            subject_type: "user",
            subject_id: "seed-user-vip",
            coupon_code: "SEED-VIP-MONTHLY-001",
            status: "active",
        },
    ]
}

fn membership_plan_version(
    plan_no: &'static str,
    title: &'static str,
) -> CommerceMembershipPlanVersionSeed {
    CommerceMembershipPlanVersionSeed {
        id: match plan_no {
            "free" => "seed-membership-plan-version-free-v1",
            "pro" => "seed-membership-plan-version-pro-v1",
            "max" => "seed-membership-plan-version-max-v1",
            "vip" => "seed-membership-plan-version-vip-v1",
            _ => "seed-membership-plan-version-unknown",
        },
        plan_no,
        version_no: "v1",
        lifecycle_status: "published",
        title,
        effective_from: "2026-01-01T00:00:00Z",
    }
}

fn plan_benefit(
    plan_no: &'static str,
    benefit_code: &'static str,
    grant_quantity: &'static str,
    grant_period: Option<&'static str>,
    reset_policy: Option<&'static str>,
    usage_policy: Option<&'static str>,
    sort_weight: i64,
) -> CommerceMembershipPlanBenefitSeed {
    CommerceMembershipPlanBenefitSeed {
        id: match (plan_no, benefit_code) {
            ("free", "ai_quota") => "seed-plan-benefit-free-ai-quota",
            ("pro", "ai_quota") => "seed-plan-benefit-pro-ai-quota",
            ("pro", "priority_speed_up") => "seed-plan-benefit-pro-priority-speed-up",
            ("pro", "member_discount") => "seed-plan-benefit-pro-member-discount",
            ("pro", "monthly_coupon_grant") => "seed-plan-benefit-pro-monthly-coupon-grant",
            ("max", "ai_quota") => "seed-plan-benefit-max-ai-quota",
            ("max", "priority_speed_up") => "seed-plan-benefit-max-priority-speed-up",
            ("max", "member_discount") => "seed-plan-benefit-max-member-discount",
            ("max", "monthly_coupon_grant") => "seed-plan-benefit-max-monthly-coupon-grant",
            ("vip", "ai_quota") => "seed-plan-benefit-vip-ai-quota",
            ("vip", "priority_speed_up") => "seed-plan-benefit-vip-priority-speed-up",
            ("vip", "member_discount") => "seed-plan-benefit-vip-member-discount",
            ("vip", "monthly_coupon_grant") => "seed-plan-benefit-vip-monthly-coupon-grant",
            _ => "seed-plan-benefit-unknown",
        },
        plan_no,
        version_no: "v1",
        benefit_code,
        grant_quantity,
        grant_period,
        reset_policy,
        usage_policy,
        sort_weight,
    }
}

#[allow(clippy::too_many_arguments)]
fn membership_package(
    external_id: i64,
    package_group_no: &'static str,
    plan_no: &'static str,
    name: &'static str,
    title: &'static str,
    description: &'static str,
    price_amount: &'static str,
    original_price_amount: Option<&'static str>,
    point_amount: i64,
    duration_days: i64,
    sort_weight: i64,
    recommended: bool,
    tags: &[&'static str],
) -> CommerceMembershipPackageSeed {
    let group_code = package_group_no.trim_start_matches("membership-");
    CommerceMembershipPackageSeed {
        id: match external_id {
            301 => "301",
            302 => "302",
            303 => "303",
            401 => "401",
            402 => "402",
            403 => "403",
            _ => "0",
        },
        external_id,
        package_no: match external_id {
            301 => "membership-month-pro",
            302 => "membership-month-max",
            303 => "membership-month-vip",
            401 => "membership-year-pro",
            402 => "membership-year-max",
            403 => "membership-year-vip",
            _ => "membership-unknown",
        },
        package_group_no,
        plan_no,
        sku_id: match external_id {
            301 => "seed-sku-membership-month-pro",
            302 => "seed-sku-membership-month-max",
            303 => "seed-sku-membership-month-vip",
            401 => "seed-sku-membership-year-pro",
            402 => "seed-sku-membership-year-max",
            403 => "seed-sku-membership-year-vip",
            _ => "seed-sku-membership-unknown",
        },
        sku_no: match (group_code, plan_no) {
            ("month", "pro") => "membership-month-pro",
            ("month", "max") => "membership-month-max",
            ("month", "vip") => "membership-month-vip",
            ("year", "pro") => "membership-year-pro",
            ("year", "max") => "membership-year-max",
            ("year", "vip") => "membership-year-vip",
            _ => "membership-unknown",
        },
        name,
        title,
        description,
        price_amount,
        original_price_amount,
        currency_code: "CNY",
        point_amount,
        duration_days,
        sort_weight,
        recommended,
        tags: tags.to_vec(),
    }
}

#[allow(clippy::too_many_arguments)]
fn recharge_package(
    package_id: &'static str,
    sku_id: &'static str,
    package_no: &'static str,
    sku_no: &'static str,
    external_id: i64,
    name: &'static str,
    price_amount: &'static str,
    currency_code: &'static str,
    bonus_points: i64,
    status: &'static str,
    sort_weight: i64,
) -> CommerceRechargePackageSeed {
    CommerceRechargePackageSeed {
        package_id,
        sku_id,
        package_no,
        sku_no,
        external_id,
        name,
        price_amount,
        currency_code,
        bonus_points,
        status,
        sort_weight,
    }
}

#[allow(clippy::too_many_arguments)]
fn commerce_experience_seed_payload(
    benefits: &[CommerceBenefitDefinitionSeed],
    plans: &[CommerceMembershipPlanSeed],
    plan_versions: &[CommerceMembershipPlanVersionSeed],
    plan_benefits: &[CommerceMembershipPlanBenefitSeed],
    groups: &[CommerceMembershipPackageGroupSeed],
    packages: &[CommerceMembershipPackageSeed],
    promotion_offers: &[CommercePromotionOfferSeed],
    promotion_offer_versions: &[CommercePromotionOfferVersionSeed],
    promotion_coupon_stocks: &[CommercePromotionCouponStockSeed],
    promotion_codes: &[CommercePromotionCodeSeed],
    promotion_user_coupons: &[CommercePromotionUserCouponSeed],
    recharge_packages: &[CommerceRechargePackageSeed],
    recharge_settings: &[CommerceRechargeSettingsSeed],
    payment_methods: &[CommercePaymentMethodSeed],
    payment_providers: &[CommercePaymentProviderSeed],
    payment_provider_accounts: &[CommercePaymentProviderAccountSeed],
    payment_channels: &[CommercePaymentChannelSeed],
    payment_route_rules: &[CommercePaymentRouteRuleSeed],
) -> String {
    format!(
        r#"{{"version":"commerce.experience.seed.v1","benefitDefinitions":{},"membershipPlans":{},"membershipPlanVersions":{},"membershipPlanBenefits":{},"membershipPackageGroups":{},"membershipPackages":{},"promotionOffers":{},"promotionOfferVersions":{},"promotionCouponStocks":{},"promotionCodes":{},"promotionUserCoupons":{},"rechargePackages":{},"rechargeSettings":{},"paymentMethods":{},"paymentProviders":{},"paymentProviderAccounts":{},"paymentChannels":{},"paymentRouteRules":{}}}"#,
        string_array_json(benefits.iter().map(|benefit| benefit.benefit_code)),
        string_array_json(plans.iter().map(|plan| plan.plan_no)),
        string_array_json(plan_versions.iter().map(|version| version.id)),
        string_array_json(plan_benefits.iter().map(|benefit| benefit.id)),
        string_array_json(groups.iter().map(|group| group.package_group_no)),
        string_array_json(packages.iter().map(|package| package.package_no)),
        string_array_json(promotion_offers.iter().map(|offer| offer.offer_code)),
        string_array_json(promotion_offer_versions.iter().map(|version| version.id)),
        string_array_json(promotion_coupon_stocks.iter().map(|stock| stock.stock_no)),
        string_array_json(promotion_codes.iter().map(|code| code.promotion_code)),
        string_array_json(promotion_user_coupons.iter().map(|coupon| coupon.coupon_no)),
        string_array_json(recharge_packages.iter().map(|package| package.package_no)),
        string_array_json(recharge_settings.iter().map(|setting| setting.rule_no)),
        string_array_json(payment_methods.iter().map(|method| method.method_key)),
        string_array_json(
            payment_providers
                .iter()
                .map(|provider| provider.provider_code)
        ),
        string_array_json(
            payment_provider_accounts
                .iter()
                .map(|account| account.account_no)
        ),
        string_array_json(
            payment_channels
                .iter()
                .map(|channel| channel.channel_no.as_str())
        ),
        string_array_json(payment_route_rules.iter().map(|rule| rule.rule_no.as_str())),
    )
}

fn string_array_json<'a>(values: impl Iterator<Item = &'a str>) -> String {
    let items = values
        .map(|value| format!("\"{}\"", json_escape(value)))
        .collect::<Vec<_>>()
        .join(",");
    format!("[{items}]")
}

fn json_escape(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}
