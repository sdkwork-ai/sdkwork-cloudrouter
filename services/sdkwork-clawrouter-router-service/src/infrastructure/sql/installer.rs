use std::collections::BTreeSet;
use std::error::Error;
use std::fmt::{Display, Formatter};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::OnceLock;
use std::time::{SystemTime, UNIX_EPOCH};

use sdkwork_claw_config::deployment::{resolve_deployment_runtime, DeploymentProfile};
use sdkwork_utils_rust as sdkwork_utils;
use crate::infrastructure::sql::commerce_bootstrap::{
    commerce_database_indexes, commerce_database_tables, commerce_experience_seed_manifest,
    commerce_initial_migration_sql, commerce_initial_migration_sqlite,
    commerce_recharge_package_seeds, commerce_recharge_settings_seeds,
};
use sdkwork_contract_service::CommerceServiceError;
use sdkwork_iam_bootstrap::{
    iam_baseline_postgres_sql, iam_rbac_federation_postgres_sql, import_postgres_default_iam_seed,
    import_sqlite_default_iam_seed, postgres_default_iam_seed_complete,
    sqlite_default_iam_seed_complete, DEFAULT_BOOTSTRAP_ADMIN_DISPLAY_NAME,
    DEFAULT_BOOTSTRAP_ADMIN_EMAIL, DEFAULT_BOOTSTRAP_ADMIN_USERNAME,
    DEFAULT_BOOTSTRAP_ADMIN_USER_ID, DEFAULT_IAM_ORGANIZATION_ID, DEFAULT_IAM_TENANT_ID,
};
use sdkwork_iam_directory_repository_sqlx::iam_database_tables;
use sdkwork_models::ModelCatalog;
use sdkwork_models_database_bootstrap::{
    models_catalog_foundation_migration_sql, models_catalog_foundation_migration_sqlite,
    models_catalog_module_table_names,
};
use sha2::{Digest, Sha256};
use sqlx::{PgPool, Postgres, Row, Sqlite, SqlitePool, Transaction};

use crate::application::{PasswordHasher, Pbkdf2Sha256PasswordHasher};
use crate::infrastructure::sql::ai_routing_seed::{
    bundled_ai_routing_seed_payload, import_postgres_ai_routing_seed,
    import_sqlite_ai_routing_seed, postgres_ai_routing_seed_complete,
    sqlite_ai_routing_seed_complete,
};
use crate::infrastructure::sql::model_catalog_import::{
    catalog_ai_resource_projections, catalog_api_endpoint_projections,
    catalog_modality_api_endpoint_projections, catalog_modality_projections,
    catalog_model_api_endpoint_projections, catalog_model_modality_projections,
    catalog_scope_counts, catalog_scope_vendor_codes, catalog_vendor_api_endpoint_projections,
    catalog_vendor_modality_projections, catalog_vendor_records, catalog_with_selected_vendors,
    load_catalog_root_with_pin, model_catalog_key, pricing_catalog_key, CatalogScopeCounts,
    DEFAULT_CATALOG_REFRESH_SOURCE,
};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::sql_admin_product_center::{
    media_resource_object_blob_id, media_resource_stable_id, provider_asset_media_resource,
};
use crate::ports::{AdminModelStore, AdminModelSubject, SyncAdminModelCatalogCommand};

const GENERATED_POSTGRES_SCHEMA: &str =
    include_str!("../../../../../generated/schema/postgres/schema.sql");
const CLAWROUTER_LEGACY_PROJECTION_SQL: &str = include_str!(
    "../../../../../database/ddl/baseline/postgres/0002_clawrouter_legacy_projection.sql"
);
const GATEWAY_ROUTING_DICTIONARY_SQL: &str = include_str!(
    "../../../../../database/ddl/baseline/postgres/0003_gateway_routing_dictionary.sql"
);
const CLAWROUTER_RUNTIME_SCHEMA_REPAIRS_POSTGRES_SQL: &str = include_str!(
    "../../../../../database/ddl/baseline/postgres/0005_clawrouter_runtime_schema_repairs.sql"
);
const CLAWROUTER_RUNTIME_SCHEMA_REPAIRS_SQLITE_SQL: &str = include_str!(
    "../../../../../database/ddl/baseline/sqlite/0005_clawrouter_runtime_schema_repairs.sql"
);
const RENAME_AI_USAGE_FACT_TO_AI_USAGE_POSTGRES_SQL: &str = r#"
DO $$
BEGIN
    IF to_regclass('ai_usage') IS NULL
       AND to_regclass('ai_usage_fact') IS NOT NULL THEN
        ALTER TABLE ai_usage_fact RENAME TO ai_usage;

        IF to_regclass('ai_usage_fact_default') IS NOT NULL THEN
            ALTER TABLE ai_usage_fact_default RENAME TO ai_usage_default;
        END IF;

        IF to_regclass('uk_ai_usage_fact_request') IS NOT NULL THEN
            ALTER INDEX uk_ai_usage_fact_request RENAME TO uk_ai_usage_request;
        END IF;
        IF to_regclass('idx_ai_usage_fact_tenant_owner_occurred') IS NOT NULL THEN
            ALTER INDEX idx_ai_usage_fact_tenant_owner_occurred
                RENAME TO idx_ai_usage_tenant_owner_occurred;
        END IF;
        IF to_regclass('idx_ai_usage_fact_api_key_occurred') IS NOT NULL THEN
            ALTER INDEX idx_ai_usage_fact_api_key_occurred
                RENAME TO idx_ai_usage_api_key_occurred;
        END IF;
        IF to_regclass('idx_ai_usage_fact_model_occurred') IS NOT NULL THEN
            ALTER INDEX idx_ai_usage_fact_model_occurred
                RENAME TO idx_ai_usage_model_occurred;
        END IF;
        IF to_regclass('idx_ai_usage_fact_pricing_plan_occurred') IS NOT NULL THEN
            ALTER INDEX idx_ai_usage_fact_pricing_plan_occurred
                RENAME TO idx_ai_usage_pricing_plan_occurred;
        END IF;
        IF to_regclass('idx_ai_usage_fact_meter_occurred') IS NOT NULL THEN
            ALTER INDEX idx_ai_usage_fact_meter_occurred
                RENAME TO idx_ai_usage_meter_occurred;
        END IF;
        IF to_regclass('idx_ai_usage_fact_settlement_status') IS NOT NULL THEN
            ALTER INDEX idx_ai_usage_fact_settlement_status
                RENAME TO idx_ai_usage_settlement_status;
        END IF;
    END IF;
END $$;
"#;
const BUNDLED_MODELS_CATALOG_MANIFEST: &str =
    include_str!("../../../../../data/sdkwork-models/sdkwork-models.json");
pub const CURRENT_SCHEMA_VERSION: &str = "2026.06.22.1";
/// Claw-router owns gateway schema; sibling SoR modules compose at install time in standalone mode.
fn compose_sibling_commerce_module() -> bool {
    deployment_profile_is_standalone()
}

/// IAM DDL and OAuth schema are owned by `sdkwork-iam-database-host`, not the product installer.
fn product_database_iam_schema_enabled() -> bool {
    false
}

/// IAM subject seeds and bootstrap admin belong to the federated IAM database host.
fn product_database_iam_seed_enabled() -> bool {
    product_database_iam_schema_enabled()
}

fn deployment_profile_is_standalone() -> bool {
    resolve_deployment_runtime(None)
        .map(|runtime| runtime.profile == DeploymentProfile::Standalone)
        .unwrap_or(true)
}

fn standalone_iam_bootstrap_enabled() -> bool {
    product_database_iam_schema_enabled()
}
const COMPOSE_SDKWORK_MODELS_CATALOG_MODULE: bool = true;
pub const DEFAULT_SEED_PROFILE: &str = "commercial";
pub const DEFAULT_INSTALL_ENVIRONMENT: &str = "production";
pub const ENV_INSTALL_ENVIRONMENT: &str = "SDKWORK_CLAW_INSTALL_ENVIRONMENT";
pub const ENV_INSTALL_SEED_PROFILE: &str = "SDKWORK_CLAW_INSTALL_SEED_PROFILE";
pub const ENV_MODELS_CATALOG_ROOT: &str = "SDKWORK_MODELS_CATALOG_ROOT";
pub const ENV_BOOTSTRAP_ADMIN_ENABLED: &str = "SDKWORK_CLAW_BOOTSTRAP_ADMIN_ENABLED";
pub const ENV_BOOTSTRAP_ADMIN_USERNAME: &str = "SDKWORK_CLAW_BOOTSTRAP_ADMIN_USERNAME";
pub const ENV_BOOTSTRAP_ADMIN_DISPLAY_NAME: &str = "SDKWORK_CLAW_BOOTSTRAP_ADMIN_DISPLAY_NAME";
pub const ENV_BOOTSTRAP_ADMIN_EMAIL: &str = "SDKWORK_CLAW_BOOTSTRAP_ADMIN_EMAIL";
pub const ENV_BOOTSTRAP_ADMIN_PASSWORD: &str = "SDKWORK_CLAW_BOOTSTRAP_ADMIN_PASSWORD";
const MIN_BOOTSTRAP_ADMIN_PASSWORD_LEN: usize = 12;
const MAX_BOOTSTRAP_ADMIN_PASSWORD_LEN: usize = 128;
const GENERATED_BOOTSTRAP_ADMIN_PASSWORD_LEN: usize = 32;
const BOOTSTRAP_ADMIN_PASSWORD_ALPHABET: &[u8] =
    b"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%+-_=.";
const MAX_REFRESH_SOURCE_LEN: usize = 64;
const MAX_REFRESH_MODE_LEN: usize = 64;
const MAX_REFRESH_VENDOR_CODES: usize = 32;
const MAX_REFRESH_VENDOR_CODE_LEN: usize = 64;
const MAX_REFRESH_CATALOG_ROOT_LEN: usize = 512;
const MAX_REFRESH_CATALOG_VERSION_LEN: usize = 128;
static ADMIN_PASSWORD_RESET_SEQUENCE: AtomicU64 = AtomicU64::new(1);
static GENERATED_SCHEMA_TABLE_NAMES: OnceLock<BTreeSet<String>> = OnceLock::new();
static GENERATED_SCHEMA_INDEX_NAMES: OnceLock<BTreeSet<String>> = OnceLock::new();
static GENERATED_SCHEMA_POSTGRES_TABLE_COLUMNS: OnceLock<
    Vec<(String, Vec<SchemaColumnDefinition>)>,
> = OnceLock::new();
static GENERATED_SCHEMA_SQLITE_TABLE_COLUMNS: OnceLock<Vec<(String, Vec<SqliteColumnDefinition>)>> =
    OnceLock::new();
static GENERATED_SCHEMA_SQLITE_INDEX_STATEMENTS: OnceLock<Vec<String>> = OnceLock::new();
static APPBASE_COMMERCE_SCHEMA_POSTGRES_TABLE_COLUMNS: OnceLock<
    Vec<(String, Vec<SchemaColumnDefinition>)>,
> = OnceLock::new();
static APPBASE_IAM_OAUTH_SCHEMA_INDEX_NAMES: OnceLock<BTreeSet<String>> = OnceLock::new();

const APPBASE_COMMERCE_LEGACY_NOT_NULL_COLUMN_REPAIRS: &[(&str, &str, &str)] = &[
    (
        "commerce_product_spu",
        "sales_status",
        r#"ALTER TABLE "commerce_product_spu" ALTER COLUMN "sales_status" DROP NOT NULL"#,
    ),
    (
        "commerce_product_sku",
        "sales_status",
        r#"ALTER TABLE "commerce_product_sku" ALTER COLUMN "sales_status" DROP NOT NULL"#,
    ),
    (
        "commerce_product_sku",
        "delivery_mode",
        r#"ALTER TABLE "commerce_product_sku" ALTER COLUMN "delivery_mode" DROP NOT NULL"#,
    ),
    (
        "commerce_payment_method",
        "provider",
        r#"ALTER TABLE "commerce_payment_method" ALTER COLUMN "provider" DROP NOT NULL"#,
    ),
];

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DatabaseInstallOptions {
    pub environment: String,
    pub seed_profile: String,
    pub models_catalog_root: Option<String>,
}

impl DatabaseInstallOptions {
    pub fn commercial() -> Self {
        Self {
            environment: DEFAULT_INSTALL_ENVIRONMENT.to_owned(),
            seed_profile: DEFAULT_SEED_PROFILE.to_owned(),
            models_catalog_root: None,
        }
    }

    pub fn from_env() -> Result<Self, DatabaseInstallError> {
        let runtime_toml = sdkwork_claw_config::RuntimeTomlConfig::from_env_config_file()
            .map_err(DatabaseInstallError::InvalidState)?;
        Self::from_env_or_runtime_toml(runtime_toml.as_ref())
    }

    pub fn from_env_or_runtime_toml(
        runtime_toml: Option<&sdkwork_claw_config::RuntimeTomlConfig>,
    ) -> Result<Self, DatabaseInstallError> {
        let environment = sdkwork_claw_config::runtime::config_value(
            ENV_INSTALL_ENVIRONMENT,
            runtime_toml.and_then(|config| config.install.environment.as_deref()),
        )
        .unwrap_or_else(|| DEFAULT_INSTALL_ENVIRONMENT.to_owned());
        let seed_profile = sdkwork_claw_config::runtime::config_value(
            ENV_INSTALL_SEED_PROFILE,
            runtime_toml.and_then(|config| config.install.seed_profile.as_deref()),
        )
        .unwrap_or_else(|| DEFAULT_SEED_PROFILE.to_owned());
        let models_catalog_root = sdkwork_claw_config::runtime::config_value(
            ENV_MODELS_CATALOG_ROOT,
            runtime_toml.and_then(|config| config.install.models_catalog_root.as_deref()),
        );
        Self::new(environment, seed_profile)?.with_models_catalog_root(models_catalog_root)
    }

    pub fn new(
        environment: impl Into<String>,
        seed_profile: impl Into<String>,
    ) -> Result<Self, DatabaseInstallError> {
        let environment = normalize_install_code(environment.into(), ENV_INSTALL_ENVIRONMENT)?;
        let seed_profile = normalize_install_code(seed_profile.into(), ENV_INSTALL_SEED_PROFILE)?;
        if seed_profile != DEFAULT_SEED_PROFILE {
            return Err(DatabaseInstallError::InvalidState(format!(
                "{ENV_INSTALL_SEED_PROFILE} unsupported seed profile: {seed_profile}"
            )));
        }
        Ok(Self {
            environment,
            seed_profile,
            models_catalog_root: None,
        })
    }

    pub fn with_models_catalog_root(
        mut self,
        models_catalog_root: Option<String>,
    ) -> Result<Self, DatabaseInstallError> {
        if let Some(root) = models_catalog_root {
            let root = root.trim().to_owned();
            if root.is_empty() {
                return Err(DatabaseInstallError::InvalidState(format!(
                    "{ENV_MODELS_CATALOG_ROOT} must not be blank"
                )));
            }
            if root.chars().count() > MAX_REFRESH_CATALOG_ROOT_LEN {
                return Err(DatabaseInstallError::InvalidState(format!(
                    "{ENV_MODELS_CATALOG_ROOT} must be {MAX_REFRESH_CATALOG_ROOT_LEN} characters or fewer"
                )));
            }
            if root.chars().any(char::is_control) {
                return Err(DatabaseInstallError::InvalidState(format!(
                    "{ENV_MODELS_CATALOG_ROOT} must not contain control characters"
                )));
            }
            self.models_catalog_root = Some(root);
        }
        Ok(self)
    }
}

impl Default for BootstrapAdminOptions {
    fn default() -> Self {
        Self {
            enabled: true,
            username: DEFAULT_BOOTSTRAP_ADMIN_USERNAME.to_owned(),
            display_name: DEFAULT_BOOTSTRAP_ADMIN_DISPLAY_NAME.to_owned(),
            email: DEFAULT_BOOTSTRAP_ADMIN_EMAIL.to_owned(),
            password: None,
        }
    }
}

impl BootstrapAdminOptions {
    fn from_env() -> Result<Self, DatabaseInstallError> {
        let runtime_toml = sdkwork_claw_config::RuntimeTomlConfig::from_env_config_file()
            .map_err(DatabaseInstallError::InvalidState)?;
        Self::from_env_or_runtime_toml(runtime_toml.as_ref())
    }

    fn from_env_or_runtime_toml(
        runtime_toml: Option<&sdkwork_claw_config::RuntimeTomlConfig>,
    ) -> Result<Self, DatabaseInstallError> {
        let mut options = Self::default();
        options.enabled = match sdkwork_claw_config::runtime::config_bool(
            ENV_BOOTSTRAP_ADMIN_ENABLED,
            runtime_toml.and_then(|config| config.bootstrap_admin.enabled),
        )
        .map_err(DatabaseInstallError::InvalidState)?
        {
            Some(value) => value,
            None => true,
        };
        options.username = sdkwork_claw_config::runtime::config_value(
            ENV_BOOTSTRAP_ADMIN_USERNAME,
            runtime_toml.and_then(|config| config.bootstrap_admin.username.as_deref()),
        )
        .map(|value| normalize_bootstrap_admin_username(value, ENV_BOOTSTRAP_ADMIN_USERNAME))
        .transpose()?
        .unwrap_or_else(|| DEFAULT_BOOTSTRAP_ADMIN_USERNAME.to_owned());
        options.display_name = sdkwork_claw_config::runtime::config_value(
            ENV_BOOTSTRAP_ADMIN_DISPLAY_NAME,
            runtime_toml.and_then(|config| config.bootstrap_admin.display_name.as_deref()),
        )
        .map(|value| {
            normalize_bootstrap_admin_text(value, ENV_BOOTSTRAP_ADMIN_DISPLAY_NAME, 128, true)
        })
        .transpose()?
        .unwrap_or_else(|| DEFAULT_BOOTSTRAP_ADMIN_DISPLAY_NAME.to_owned());
        options.email = sdkwork_claw_config::runtime::config_value(
            ENV_BOOTSTRAP_ADMIN_EMAIL,
            runtime_toml.and_then(|config| config.bootstrap_admin.email.as_deref()),
        )
        .map(|value| normalize_bootstrap_admin_email(value, ENV_BOOTSTRAP_ADMIN_EMAIL))
        .transpose()?
        .unwrap_or_else(|| DEFAULT_BOOTSTRAP_ADMIN_EMAIL.to_owned());
        options.password = sdkwork_claw_config::runtime::config_secret_value(
            ENV_BOOTSTRAP_ADMIN_PASSWORD,
            "SDKWORK_CLAW_BOOTSTRAP_ADMIN_PASSWORD_FILE",
            None,
            runtime_toml.and_then(|config| config.bootstrap_admin.password_file.as_deref()),
        )
        .map_err(DatabaseInstallError::InvalidState)?
        .map(|value| normalize_bootstrap_admin_password(value, ENV_BOOTSTRAP_ADMIN_PASSWORD))
        .transpose()?;
        Ok(options)
    }

    fn password(&self) -> Result<String, DatabaseInstallError> {
        self.password
            .clone()
            .map(|value| normalize_bootstrap_admin_password(value, ENV_BOOTSTRAP_ADMIN_PASSWORD))
            .transpose()?
            .map(Ok)
            .unwrap_or_else(generate_bootstrap_admin_password)
    }

    fn report(&self, user_id: String, initial_password: String) -> BootstrapAdminReport {
        BootstrapAdminReport {
            status: "created".to_owned(),
            tenant_id: DEFAULT_IAM_TENANT_ID.to_owned(),
            organization_id: DEFAULT_IAM_ORGANIZATION_ID.to_owned(),
            user_id,
            username: self.username.clone(),
            display_name: self.display_name.clone(),
            email: self.email.clone(),
            generated_password: self.password.is_none(),
            initial_password,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InstallationStatus {
    NotInstalled,
    Installed,
    UpgradeRequired,
    Incomplete,
    Corrupt,
    CatalogUnavailable,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InstallationReport {
    pub status: InstallationStatus,
    pub schema_version: &'static str,
    pub catalog_version: String,
    pub catalog_source: String,
    pub external_catalog: bool,
    pub last_catalog_refresh_status: String,
    pub environment: String,
    pub seed_profile: String,
    pub changed: bool,
    pub bootstrap_admin: Option<BootstrapAdminReport>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BootstrapAdminReport {
    pub status: String,
    pub tenant_id: String,
    pub organization_id: String,
    pub user_id: String,
    pub username: String,
    pub display_name: String,
    pub email: String,
    pub initial_password: String,
    pub generated_password: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResetAdminPasswordReport {
    pub status: String,
    pub tenant_id: String,
    pub organization_id: String,
    pub user_id: String,
    pub username: String,
    pub display_name: String,
    pub email: String,
    pub initial_password: String,
    pub generated_password: bool,
}

pub fn log_bootstrap_admin_report(service_name: &str, report: &InstallationReport) {
    if let Some(admin) = &report.bootstrap_admin {
        tracing::warn!(
            service = service_name,
            username = %admin.username,
            tenant_id = %admin.tenant_id,
            organization_id = %admin.organization_id,
            user_id = %admin.user_id,
            generated_password = admin.generated_password,
            "SDKWork Claw Router bootstrap admin initialized; retrieve the one-time initial password from the installer CLI output or secure bootstrap channel and rotate it after first login"
        );
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CatalogRefreshOptions {
    pub source: String,
    pub mode: String,
    pub vendor_codes: Vec<String>,
    pub force: bool,
    pub catalog_root: Option<String>,
    pub catalog_version: Option<String>,
}

impl Default for CatalogRefreshOptions {
    fn default() -> Self {
        Self {
            source: DEFAULT_CATALOG_REFRESH_SOURCE.to_owned(),
            mode: "official_refresh".to_owned(),
            vendor_codes: Vec::new(),
            force: true,
            catalog_root: None,
            catalog_version: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CatalogRefreshReport {
    pub synced: bool,
    pub source: String,
    pub mode: String,
    pub catalog_version: String,
    pub vendor_codes: Vec<String>,
    pub meter_count: usize,
    pub vendor_count: usize,
    pub family_count: usize,
    pub model_count: usize,
    pub capability_count: usize,
    pub price_count: usize,
    pub ranking_count: usize,
    pub accepted_count: i64,
    pub snapshot_id: Option<String>,
    pub sync_run_id: Option<String>,
    pub bootstrap_admin: Option<BootstrapAdminReport>,
}

pub struct DatabaseInstaller {
    backend: InstallerBackend,
    options: DatabaseInstallOptions,
    bootstrap_admin_options: BootstrapAdminOptions,
}

enum InstallerBackend {
    Sqlite(SqlitePool),
    Postgres(PgPool),
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct BootstrapAdminOptions {
    enabled: bool,
    username: String,
    display_name: String,
    email: String,
    password: Option<String>,
}

impl DatabaseInstaller {
    pub fn for_sqlite(pool: SqlitePool) -> Self {
        Self {
            backend: InstallerBackend::Sqlite(pool),
            options: DatabaseInstallOptions::commercial(),
            bootstrap_admin_options: BootstrapAdminOptions::default(),
        }
    }

    pub fn for_postgres(pool: PgPool) -> Self {
        Self {
            backend: InstallerBackend::Postgres(pool),
            options: DatabaseInstallOptions::commercial(),
            bootstrap_admin_options: BootstrapAdminOptions::default(),
        }
    }

    pub fn with_options(
        mut self,
        options: DatabaseInstallOptions,
    ) -> Result<Self, DatabaseInstallError> {
        self.options = options;
        Ok(self)
    }

    pub fn with_env_options(self) -> Result<Self, DatabaseInstallError> {
        Ok(self
            .with_options(DatabaseInstallOptions::from_env()?)?
            .with_bootstrap_admin_options(BootstrapAdminOptions::from_env()?))
    }

    fn with_bootstrap_admin_options(mut self, options: BootstrapAdminOptions) -> Self {
        self.bootstrap_admin_options = options;
        self
    }

    pub fn with_bootstrap_admin_password(mut self, password: impl Into<String>) -> Self {
        self.bootstrap_admin_options.password = Some(password.into());
        self
    }

    pub fn options(&self) -> &DatabaseInstallOptions {
        &self.options
    }

    pub fn seed_profile(&self) -> &str {
        self.options.seed_profile.as_str()
    }

    pub fn environment(&self) -> &str {
        self.options.environment.as_str()
    }

    pub fn catalog_version(&self) -> Result<String, DatabaseInstallError> {
        expected_install_catalog_version(&self.options)
    }

    pub fn schema_version(&self) -> &'static str {
        CURRENT_SCHEMA_VERSION
    }

    pub async fn detailed_status(&self) -> Result<InstallationStatus, DatabaseInstallError> {
        self.status_with_options(&self.options).await
    }

    pub async fn status(&self) -> Result<InstallationStatus, DatabaseInstallError> {
        self.detailed_status().await
    }

    pub async fn status_report(&self) -> Result<InstallationReport, DatabaseInstallError> {
        self.lightweight_status_report_with_options(&self.options)
            .await
    }

    pub async fn status_report_for_refresh_options(
        &self,
        options: &CatalogRefreshOptions,
    ) -> Result<InstallationReport, DatabaseInstallError> {
        let options = normalize_catalog_refresh_options(options.clone())?;
        let install_options = self.refresh_install_options(options.catalog_root.as_deref())?;
        self.lightweight_status_report_with_options(&install_options)
            .await
    }

    async fn lightweight_status_report_with_options(
        &self,
        options: &DatabaseInstallOptions,
    ) -> Result<InstallationReport, DatabaseInstallError> {
        let options = self.effective_install_options(options).await?;
        let status = self
            .lightweight_status_with_resolved_options(&options)
            .await?;
        let catalog_version = self
            .lightweight_status_report_catalog_version(&options, &status)
            .await?;
        let last_catalog_refresh_status = self.last_catalog_refresh_status().await?;
        Ok(InstallationReport {
            status,
            schema_version: CURRENT_SCHEMA_VERSION,
            catalog_version,
            catalog_source: catalog_source(&options),
            external_catalog: uses_external_catalog(&options),
            last_catalog_refresh_status,
            environment: options.environment.clone(),
            seed_profile: options.seed_profile.clone(),
            changed: false,
            bootstrap_admin: None,
        })
    }

    pub async fn ensure_installed(&self) -> Result<InstallationReport, DatabaseInstallError> {
        self.ensure_installed_with_options(&self.options).await
    }

    pub async fn reset_admin_password(
        &self,
        username: impl Into<String>,
        display_name: impl Into<String>,
        email: impl Into<String>,
        password: impl Into<String>,
    ) -> Result<ResetAdminPasswordReport, DatabaseInstallError> {
        let options = BootstrapAdminOptions {
            enabled: true,
            username: normalize_bootstrap_admin_username(
                username.into(),
                ENV_BOOTSTRAP_ADMIN_USERNAME,
            )?,
            display_name: normalize_bootstrap_admin_text(
                display_name.into(),
                ENV_BOOTSTRAP_ADMIN_DISPLAY_NAME,
                128,
                true,
            )?,
            email: normalize_bootstrap_admin_email(email.into(), ENV_BOOTSTRAP_ADMIN_EMAIL)?,
            password: Some(normalize_bootstrap_admin_password(
                password.into(),
                ENV_BOOTSTRAP_ADMIN_PASSWORD,
            )?),
        };

        if self.status_with_options(&self.options).await? != InstallationStatus::Installed {
            match &self.backend {
                InstallerBackend::Sqlite(pool) => {
                    DatabaseInstaller::for_sqlite(pool.clone())
                        .with_options(self.options.clone())?
                        .with_bootstrap_admin_options(options.clone())
                        .ensure_installed()
                        .await?;
                }
                InstallerBackend::Postgres(pool) => {
                    DatabaseInstaller::for_postgres(pool.clone())
                        .with_options(self.options.clone())?
                        .with_bootstrap_admin_options(options.clone())
                        .ensure_installed()
                        .await?;
                }
            }
        }

        match &self.backend {
            InstallerBackend::Sqlite(pool) => reset_sqlite_admin_password(pool, &options).await,
            InstallerBackend::Postgres(pool) => reset_postgres_admin_password(pool, &options).await,
        }
    }

    pub async fn refresh_catalog(
        &self,
        options: CatalogRefreshOptions,
    ) -> Result<CatalogRefreshReport, DatabaseInstallError> {
        let options = normalize_catalog_refresh_options(options)?;
        let full_catalog_refresh = options.vendor_codes.is_empty();
        let audit_options = options.clone();
        let install_options = self
            .effective_install_options(
                &self.refresh_install_options(options.catalog_root.as_deref())?,
            )
            .await?;
        let catalog_version_hint = options
            .catalog_version
            .clone()
            .unwrap_or_else(|| "unknown".to_owned());
        self.prepare_refresh_schema_if_needed(&install_options, catalog_version_hint.as_str())
            .await?;

        let catalog_root = options
            .catalog_root
            .clone()
            .or_else(|| install_options.models_catalog_root.clone());
        let catalog = match load_catalog_root_with_pin(
            catalog_root.as_deref(),
            options.catalog_version.as_deref(),
        ) {
            Ok(catalog) => catalog,
            Err(error) => {
                let error = DatabaseInstallError::InvalidState(error.to_string());
                self.try_record_failed_catalog_refresh(
                    &options,
                    catalog_root.as_deref(),
                    options.catalog_version.as_deref(),
                    &error,
                )
                .await;
                return Err(error);
            }
        };
        let loaded_catalog_version = catalog.manifest.catalog_version.as_str();
        let catalog = match catalog_with_selected_vendors(&catalog, &options.vendor_codes) {
            Ok(catalog) => catalog,
            Err(error) => {
                let error = DatabaseInstallError::InvalidState(error.to_string());
                self.try_record_failed_catalog_refresh(
                    &options,
                    catalog_root.as_deref(),
                    Some(loaded_catalog_version),
                    &error,
                )
                .await;
                return Err(error);
            }
        };
        let catalog_version = catalog.manifest.catalog_version.clone();
        let vendor_codes = catalog_scope_vendor_codes(&catalog);
        let counts = catalog_scope_counts(&catalog);
        let mode = options.mode;
        let source = options.source;
        let refresh_id = catalog_refresh_id();
        let command = SyncAdminModelCatalogCommand {
            subject: AdminModelSubject {
                tenant_id: SYSTEM_REFRESH_TENANT_ID,
                organization_id: SYSTEM_REFRESH_ORGANIZATION_ID,
                operator_id: SYSTEM_REFRESH_OPERATOR_ID,
                operator_type: SYSTEM_REFRESH_OPERATOR_TYPE,
            },
            snapshot_uuid: refresh_id.clone(),
            audit_log_uuid: format!("audit-catalog-refresh-{refresh_id}"),
            source,
            mode,
            vendor_codes: options.vendor_codes,
            force: options.force,
            catalog_root,
            catalog_version: Some(catalog_version.clone()),
            request_id: format!("installer-refresh-{refresh_id}"),
            requested_at: current_utc_timestamp_string(),
        };

        let item = match &self.backend {
            InstallerBackend::Sqlite(pool) => {
                crate::infrastructure::sql::sqlite::SqliteAdminModelStore::new(pool.clone())
                    .sync_catalog(command.clone())
                    .await
            }
            InstallerBackend::Postgres(pool) => {
                crate::infrastructure::sql::postgres::PostgresAdminModelStore::new(pool.clone())
                    .sync_catalog(command.clone())
                    .await
            }
        }
        .map_err(|error| DatabaseInstallError::InvalidState(error.to_string()));
        let item = match item {
            Ok(item) => item,
            Err(error) => {
                self.try_record_failed_catalog_refresh(
                    &audit_options,
                    command.catalog_root.as_deref(),
                    Some(catalog_version.as_str()),
                    &error,
                )
                .await;
                return Err(error);
            }
        };
        let bootstrap_admin = if item.synced && full_catalog_refresh {
            // H-10: Catalog refresh post-sync operations must not leave partial state.
            //
            // The previous order recorded `catalog` migration completion first, then ran
            // seed import, admin bootstrap, and the installed marker as independent commits.
            // If `bootstrap_admin_user_if_needed` failed after the catalog migration was
            // already marked complete, operators would observe a misleading
            // "catalog migration completed but admin not bootstrapped" state.
            //
            // The fix reorders the operations so all actual work (seeds + admin bootstrap)
            // runs before any completion marker is written. The two state markers
            // (`record_catalog_migration_completed` and `mark_installed_with_options`) are
            // then written atomically in a single transaction via
            // `finalize_catalog_refresh_install`. If either write fails, both are rolled
            // back and a restart can detect the incomplete state.
            //
            // `import_installation_support_seeds` and `bootstrap_admin_user_if_needed`
            // cannot join the final transaction because they call into sibling SDKWork
            // crates (`sdkwork_iam_bootstrap`, `sdkwork_membership_repository_sqlx`) whose
            // public seed APIs accept `&SqlitePool`/`&PgPool` rather than a
            // `Transaction`. Those operations are idempotent (UPSERT / ON CONFLICT) so a
            // retry after a failure is safe; the critical completion markers remain atomic.
            self.import_installation_support_seeds().await?;
            let bootstrap_admin = self.bootstrap_admin_user_if_needed().await?;
            self.finalize_catalog_refresh_install(
                &catalog,
                &install_options,
                catalog_version.as_str(),
            )
            .await?;
            bootstrap_admin
        } else {
            None
        };

        Ok(CatalogRefreshReport {
            synced: item.synced,
            source: command.source,
            mode: command.mode,
            catalog_version,
            vendor_codes,
            meter_count: counts.meter_count,
            vendor_count: counts.vendor_count,
            family_count: counts.family_count,
            model_count: counts.model_count,
            capability_count: counts.capability_count,
            price_count: counts.price_count,
            ranking_count: counts.ranking_count,
            accepted_count: counts.accepted_count(),
            snapshot_id: item.snapshot_id,
            sync_run_id: item.sync_run_id,
            bootstrap_admin,
        })
    }

    async fn last_catalog_refresh_status(&self) -> Result<String, DatabaseInstallError> {
        match &self.backend {
            InstallerBackend::Sqlite(pool) => Ok(sqlite_last_catalog_refresh_status(pool).await?),
            InstallerBackend::Postgres(pool) => {
                Ok(postgres_last_catalog_refresh_status(pool).await?)
            }
        }
    }

    async fn record_failed_catalog_refresh(
        &self,
        options: &CatalogRefreshOptions,
        catalog_root: Option<&str>,
        catalog_version: Option<&str>,
        error: &DatabaseInstallError,
    ) -> Result<(), DatabaseInstallError> {
        let catalog_version = catalog_version.unwrap_or("unknown");
        match &self.backend {
            InstallerBackend::Sqlite(pool) => {
                sqlite_record_failed_catalog_refresh(
                    pool,
                    options,
                    catalog_root,
                    catalog_version,
                    error,
                )
                .await?
            }
            InstallerBackend::Postgres(pool) => {
                postgres_record_failed_catalog_refresh(
                    pool,
                    options,
                    catalog_root,
                    catalog_version,
                    error,
                )
                .await?
            }
        }
        Ok(())
    }

    async fn effective_install_options(
        &self,
        options: &DatabaseInstallOptions,
    ) -> Result<DatabaseInstallOptions, DatabaseInstallError> {
        if options.models_catalog_root.is_some() {
            return Ok(options.clone());
        }
        let persisted_root = match &self.backend {
            InstallerBackend::Sqlite(pool) => sqlite_persisted_models_catalog_root(pool).await?,
            InstallerBackend::Postgres(pool) => {
                postgres_persisted_models_catalog_root(pool).await?
            }
        };
        match persisted_root {
            Some(root) => options.clone().with_models_catalog_root(Some(root)),
            None => Ok(options.clone()),
        }
    }

    async fn persisted_installation_catalog_version(
        &self,
    ) -> Result<Option<String>, DatabaseInstallError> {
        match &self.backend {
            InstallerBackend::Sqlite(pool) => Ok(sqlite_installation_catalog_version(pool).await?),
            InstallerBackend::Postgres(pool) => {
                Ok(postgres_installation_catalog_version(pool).await?)
            }
        }
    }

    async fn lightweight_status_report_catalog_version(
        &self,
        options: &DatabaseInstallOptions,
        status: &InstallationStatus,
    ) -> Result<String, DatabaseInstallError> {
        match expected_install_catalog_version_fast(options) {
            Ok(version) => Ok(version),
            Err(_)
                if !matches!(
                    status,
                    InstallationStatus::Installed | InstallationStatus::UpgradeRequired
                ) =>
            {
                Ok(self
                    .persisted_installation_catalog_version()
                    .await?
                    .unwrap_or_else(|| "unknown".to_owned()))
            }
            Err(error) => Err(error),
        }
    }

    async fn mark_installed_with_options(
        &self,
        options: &DatabaseInstallOptions,
        catalog_version: &str,
    ) -> Result<(), DatabaseInstallError> {
        match &self.backend {
            InstallerBackend::Sqlite(pool) => {
                mark_sqlite_installed_with_catalog_version(pool, options, catalog_version).await?
            }
            InstallerBackend::Postgres(pool) => {
                mark_postgres_installed_with_catalog_version(pool, options, catalog_version).await?
            }
        }
        Ok(())
    }

    /// Atomically records catalog migration completion and marks the system installed.
    ///
    /// Both writes share a single database transaction so that a failure in either
    /// rolls back the other. This prevents the partial state where the catalog
    /// migration is marked complete but `system_installation_state.status` is not
    /// `installed` (or vice versa).
    async fn finalize_catalog_refresh_install(
        &self,
        catalog: &ModelCatalog,
        options: &DatabaseInstallOptions,
        catalog_version: &str,
    ) -> Result<(), DatabaseInstallError> {
        let catalog_payload =
            crate::infrastructure::sql::model_catalog_import::catalog_payload(catalog);
        let migration_version = catalog.manifest.catalog_version.as_str();
        match &self.backend {
            InstallerBackend::Sqlite(pool) => {
                let mut tx = pool.begin().await?;
                record_sqlite_migration_started_in_transaction(
                    &mut tx,
                    "catalog",
                    migration_version,
                    catalog_payload.as_str(),
                )
                .await?;
                record_sqlite_migration_completed_in_transaction(
                    &mut tx,
                    "catalog",
                    migration_version,
                    catalog_payload.as_str(),
                )
                .await?;
                mark_sqlite_installed_with_catalog_version_in_transaction(
                    &mut tx,
                    options,
                    catalog_version,
                )
                .await?;
                tx.commit().await?;
            }
            InstallerBackend::Postgres(pool) => {
                let mut tx = pool.begin().await?;
                record_postgres_migration_started_in_transaction(
                    &mut tx,
                    "catalog",
                    migration_version,
                    catalog_payload.as_str(),
                )
                .await?;
                record_postgres_migration_completed_in_transaction(
                    &mut tx,
                    "catalog",
                    migration_version,
                    catalog_payload.as_str(),
                )
                .await?;
                mark_postgres_installed_with_catalog_version_in_transaction(
                    &mut tx,
                    options,
                    catalog_version,
                )
                .await?;
                tx.commit().await?;
            }
        }
        Ok(())
    }

    async fn record_catalog_migration_completed(
        &self,
        catalog: &ModelCatalog,
    ) -> Result<(), DatabaseInstallError> {
        let catalog_payload =
            crate::infrastructure::sql::model_catalog_import::catalog_payload(catalog);
        match &self.backend {
            InstallerBackend::Sqlite(pool) => {
                record_sqlite_migration_started(
                    pool,
                    "catalog",
                    catalog.manifest.catalog_version.as_str(),
                    catalog_payload.as_str(),
                )
                .await?;
                record_sqlite_migration_completed(
                    pool,
                    "catalog",
                    catalog.manifest.catalog_version.as_str(),
                    catalog_payload.as_str(),
                )
                .await?;
            }
            InstallerBackend::Postgres(pool) => {
                record_postgres_migration_started(
                    pool,
                    "catalog",
                    catalog.manifest.catalog_version.as_str(),
                    catalog_payload.as_str(),
                )
                .await?;
                record_postgres_migration_completed(
                    pool,
                    "catalog",
                    catalog.manifest.catalog_version.as_str(),
                    catalog_payload.as_str(),
                )
                .await?;
            }
        }
        Ok(())
    }

    async fn import_installation_support_seeds(&self) -> Result<(), DatabaseInstallError> {
        match &self.backend {
            InstallerBackend::Sqlite(pool) => {
                import_sqlite_bundled_ai_routing_seed(pool).await?;
                if product_database_iam_seed_enabled() {
                    import_sqlite_default_iam_subject_seed(pool).await?;
                }
                if compose_sibling_commerce_module() {
                    import_sqlite_commerce_experience_seed(pool).await?;
                }
            }
            InstallerBackend::Postgres(pool) => {
                import_postgres_bundled_ai_routing_seed(pool).await?;
                if product_database_iam_seed_enabled() {
                    import_postgres_default_iam_subject_seed(pool).await?;
                }
                if compose_sibling_commerce_module() {
                    import_postgres_commerce_experience_seed(pool).await?;
                }
            }
        }
        Ok(())
    }

    async fn bootstrap_admin_user_if_needed(
        &self,
    ) -> Result<Option<BootstrapAdminReport>, DatabaseInstallError> {
        if !product_database_iam_seed_enabled() {
            return Ok(None);
        }
        match &self.backend {
            InstallerBackend::Sqlite(pool) => {
                bootstrap_sqlite_admin_user_if_needed(pool, &self.bootstrap_admin_options).await
            }
            InstallerBackend::Postgres(pool) => {
                bootstrap_postgres_admin_user_if_needed(pool, &self.bootstrap_admin_options).await
            }
        }
    }

    async fn try_record_failed_catalog_refresh(
        &self,
        options: &CatalogRefreshOptions,
        catalog_root: Option<&str>,
        catalog_version: Option<&str>,
        error: &DatabaseInstallError,
    ) {
        let _ = self
            .record_failed_catalog_refresh(options, catalog_root, catalog_version, error)
            .await;
    }

    fn refresh_install_options(
        &self,
        catalog_root: Option<&str>,
    ) -> Result<DatabaseInstallOptions, DatabaseInstallError> {
        let Some(catalog_root) = catalog_root else {
            return Ok(self.options.clone());
        };
        self.options
            .clone()
            .with_models_catalog_root(Some(catalog_root.to_owned()))
    }

    async fn status_with_options(
        &self,
        options: &DatabaseInstallOptions,
    ) -> Result<InstallationStatus, DatabaseInstallError> {
        let options = self.effective_install_options(options).await?;
        self.status_with_resolved_options(&options).await
    }

    async fn status_with_resolved_options(
        &self,
        options: &DatabaseInstallOptions,
    ) -> Result<InstallationStatus, DatabaseInstallError> {
        match &self.backend {
            InstallerBackend::Sqlite(pool) => {
                sqlite_status(pool, options, &self.bootstrap_admin_options).await
            }
            InstallerBackend::Postgres(pool) => {
                postgres_status(pool, options, &self.bootstrap_admin_options).await
            }
        }
    }

    async fn lightweight_status_with_resolved_options(
        &self,
        options: &DatabaseInstallOptions,
    ) -> Result<InstallationStatus, DatabaseInstallError> {
        match &self.backend {
            InstallerBackend::Sqlite(pool) => sqlite_lightweight_status(pool, options).await,
            InstallerBackend::Postgres(pool) => postgres_lightweight_status(pool, options).await,
        }
    }

    async fn prepare_refresh_schema_if_needed(
        &self,
        options: &DatabaseInstallOptions,
        catalog_version_hint: &str,
    ) -> Result<(), DatabaseInstallError> {
        match &self.backend {
            InstallerBackend::Sqlite(pool) => {
                if sqlite_refresh_schema_needs_prepare(pool, options).await? {
                    prepare_sqlite_schema_with_catalog_version(pool, options, catalog_version_hint)
                        .await?;
                }
            }
            InstallerBackend::Postgres(pool) => {
                if postgres_refresh_schema_needs_prepare(pool, options).await? {
                    prepare_postgres_schema_with_catalog_version(
                        pool,
                        options,
                        catalog_version_hint,
                    )
                    .await?;
                }
            }
        }
        Ok(())
    }

    async fn ensure_installed_with_options(
        &self,
        options: &DatabaseInstallOptions,
    ) -> Result<InstallationReport, DatabaseInstallError> {
        let options = self.effective_install_options(options).await?;
        let catalog_version = expected_install_catalog_version(&options)?;
        let status = self.status_with_resolved_options(&options).await?;
        if status == InstallationStatus::Installed {
            let changed = self.apply_schema_startup_repairs().await?;
            let last_catalog_refresh_status = self.last_catalog_refresh_status().await?;
            return Ok(InstallationReport {
                status,
                schema_version: CURRENT_SCHEMA_VERSION,
                catalog_version,
                catalog_source: catalog_source(&options),
                external_catalog: uses_external_catalog(&options),
                last_catalog_refresh_status,
                environment: options.environment.clone(),
                seed_profile: options.seed_profile.clone(),
                changed,
                bootstrap_admin: None,
            });
        }

        let bootstrap_admin = match (&self.backend, &status) {
            (InstallerBackend::Sqlite(pool), InstallationStatus::UpgradeRequired) => {
                repair_sqlite_installation(pool, &options, &self.bootstrap_admin_options).await?
            }
            (InstallerBackend::Postgres(pool), InstallationStatus::UpgradeRequired) => {
                repair_postgres_installation(pool, &options, &self.bootstrap_admin_options).await?
            }
            (InstallerBackend::Sqlite(pool), _) => {
                install_sqlite(pool, &options, &self.bootstrap_admin_options).await?
            }
            (InstallerBackend::Postgres(pool), _) => {
                install_postgres(pool, &options, &self.bootstrap_admin_options).await?
            }
        };

        let last_catalog_refresh_status = self.last_catalog_refresh_status().await?;
        Ok(InstallationReport {
            status: InstallationStatus::Installed,
            schema_version: CURRENT_SCHEMA_VERSION,
            catalog_version: expected_install_catalog_version(&options)?,
            catalog_source: catalog_source(&options),
            external_catalog: uses_external_catalog(&options),
            last_catalog_refresh_status,
            environment: options.environment.clone(),
            seed_profile: options.seed_profile.clone(),
            changed: true,
            bootstrap_admin,
        })
    }
}

impl DatabaseInstaller {
    async fn apply_schema_startup_repairs(&self) -> Result<bool, DatabaseInstallError> {
        let mut changed = match &self.backend {
            InstallerBackend::Sqlite(pool) => {
                let mut sqlite_changed =
                    repair_sqlite_generated_schema_index_definitions(pool).await?;
                if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {
                    sqlite_changed |=
                        repair_sqlite_sdkwork_models_catalog_module_index_definitions(pool).await?;
                }
                sqlite_changed
            }
            InstallerBackend::Postgres(pool) => {
                ensure_postgres_generated_schema_columns(pool).await?
            }
        };
        changed |= match &self.backend {
            InstallerBackend::Sqlite(pool) => {
                let mut sqlite_changed = false;
                if standalone_iam_bootstrap_enabled() {
                    if !sqlite_appbase_iam_foundation_schema_tables_exist(pool).await? {
                        apply_sqlite_appbase_iam_foundation_schema(pool).await?;
                        sqlite_changed = true;
                    }
                    if !sqlite_appbase_iam_oauth_schema_tables_exist(pool).await?
                        || !sqlite_appbase_iam_oauth_schema_indexes_exist(pool).await?
                    {
                        apply_sqlite_appbase_iam_oauth_schema(pool).await?;
                        sqlite_changed = true;
                    }
                }
                if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {
                    if !sqlite_sdkwork_models_catalog_module_schema_tables_exist(pool).await?
                        || !sqlite_sdkwork_models_catalog_module_schema_indexes_exist(pool).await?
                    {
                        apply_sqlite_sdkwork_models_catalog_module_schema(pool).await?;
                        sqlite_changed = true;
                    }
                }
                if !sqlite_clawrouter_legacy_projection_schema_tables_exist(pool).await? {
                    apply_sqlite_clawrouter_legacy_projection_schema(pool).await?;
                    sqlite_changed = true;
                }
                sqlite_changed |= apply_sqlite_clawrouter_runtime_schema_repairs(pool).await?;
                if !COMPOSE_SDKWORK_MODELS_CATALOG_MODULE
                    && !sqlite_gateway_routing_dictionary_schema_tables_exist(pool).await?
                {
                    apply_sqlite_gateway_routing_dictionary_schema(pool).await?;
                    sqlite_changed = true;
                }
                sqlite_changed
            }
            InstallerBackend::Postgres(pool) => {
                let mut changed = false;
                if compose_sibling_commerce_module() {
                    if !postgres_appbase_commerce_schema_tables_exist(pool).await?
                        || !postgres_appbase_commerce_schema_columns_exist(pool).await?
                        || !postgres_appbase_commerce_schema_indexes_exist(pool).await?
                    {
                        apply_postgres_appbase_commerce_schema(pool).await?;
                        changed = true;
                    }
                    changed |= repair_postgres_appbase_commerce_legacy_constraints(pool).await?;
                }
                if standalone_iam_bootstrap_enabled() {
                    if !postgres_appbase_iam_foundation_schema_tables_exist(pool).await? {
                        apply_postgres_appbase_iam_foundation_schema(pool).await?;
                        changed = true;
                    }
                    if !postgres_appbase_iam_oauth_schema_tables_exist(pool).await?
                        || !postgres_appbase_iam_oauth_schema_indexes_exist(pool).await?
                    {
                        apply_postgres_appbase_iam_oauth_schema(pool).await?;
                        changed = true;
                    }
                }
                if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {
                    if !postgres_sdkwork_models_catalog_module_schema_tables_exist(pool).await?
                        || !postgres_sdkwork_models_catalog_module_schema_indexes_exist(pool)
                            .await?
                    {
                        apply_postgres_sdkwork_models_catalog_module_schema(pool).await?;
                        changed = true;
                    }
                }
                if !postgres_clawrouter_legacy_projection_schema_tables_exist(pool).await? {
                    apply_postgres_clawrouter_legacy_projection_schema(pool).await?;
                    changed = true;
                }
                changed |= apply_postgres_clawrouter_runtime_schema_repairs(pool).await?;
                if !COMPOSE_SDKWORK_MODELS_CATALOG_MODULE
                    && !postgres_gateway_routing_dictionary_schema_tables_exist(pool).await?
                {
                    apply_postgres_gateway_routing_dictionary_schema(pool).await?;
                    changed = true;
                }
                changed
            }
        };
        changed |= match &self.backend {
            InstallerBackend::Sqlite(pool) => {
                if compose_sibling_commerce_module() {
                    ensure_sqlite_bootstrap_admin_recharge_catalog(pool).await?
                } else {
                    false
                }
            }
            InstallerBackend::Postgres(pool) => {
                if compose_sibling_commerce_module() {
                    ensure_postgres_bootstrap_admin_recharge_catalog(pool).await?
                } else {
                    false
                }
            }
        };
        Ok(changed)
    }
}

const SYSTEM_REFRESH_TENANT_ID: i64 = 0;
const SYSTEM_REFRESH_ORGANIZATION_ID: i64 = 0;
const SYSTEM_REFRESH_OPERATOR_ID: i64 = 0;
const SYSTEM_REFRESH_OPERATOR_TYPE: i32 = 1;

fn catalog_source(options: &DatabaseInstallOptions) -> String {
    options
        .models_catalog_root
        .clone()
        .unwrap_or_else(|| "bundled".to_owned())
}

fn uses_external_catalog(options: &DatabaseInstallOptions) -> bool {
    options.models_catalog_root.is_some()
}

fn installation_metadata(options: &DatabaseInstallOptions) -> String {
    serde_json::json!({
        "catalogSource": catalog_source(options),
        "externalCatalog": uses_external_catalog(options),
        "modelsCatalogRoot": options.models_catalog_root,
    })
    .to_string()
}

fn bootstrap_password_hash(
    password: &str,
    user_id: &str,
    now: &str,
) -> Result<String, DatabaseInstallError> {
    Pbkdf2Sha256PasswordHasher
        .hash_password(password, &format!("bootstrap-admin:{user_id}:{now}"))
        .map_err(|error| DatabaseInstallError::InvalidState(error.to_string()))
}

fn generate_bootstrap_admin_password() -> Result<String, DatabaseInstallError> {
    let mut bytes = [0_u8; GENERATED_BOOTSTRAP_ADMIN_PASSWORD_LEN];
    getrandom::fill(&mut bytes).map_err(|error| {
        DatabaseInstallError::InvalidState(format!(
            "failed to generate bootstrap admin password: {error}"
        ))
    })?;
    Ok(bytes
        .iter()
        .map(|byte| {
            let index = usize::from(*byte) % BOOTSTRAP_ADMIN_PASSWORD_ALPHABET.len();
            BOOTSTRAP_ADMIN_PASSWORD_ALPHABET[index] as char
        })
        .collect())
}

fn persisted_models_catalog_root_from_metadata(metadata: &str) -> Option<String> {
    let value = serde_json::from_str::<serde_json::Value>(metadata).ok()?;
    let external_catalog = value
        .get("externalCatalog")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false);
    if !external_catalog {
        return None;
    }
    value
        .get("modelsCatalogRoot")
        .and_then(serde_json::Value::as_str)
        .or_else(|| {
            value
                .get("catalogSource")
                .and_then(serde_json::Value::as_str)
        })
        .map(str::trim)
        .filter(|value| !value.is_empty() && *value != "bundled")
        .map(ToOwned::to_owned)
}

#[derive(Debug)]
pub enum DatabaseInstallError {
    Database(sqlx::Error),
    Catalog(sdkwork_models::CatalogError),
    Commerce(CommerceServiceError),
    InvalidState(String),
}

impl Display for DatabaseInstallError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Database(error) => write!(formatter, "database installation failed: {error}"),
            Self::Catalog(error) => write!(formatter, "model catalog load failed: {error}"),
            Self::Commerce(error) => write!(
                formatter,
                "commerce bootstrap failed: {}: {}",
                error.code(),
                error.message()
            ),
            Self::InvalidState(message) => write!(
                formatter,
                "database installation state is invalid: {message}"
            ),
        }
    }
}

impl Error for DatabaseInstallError {}

impl From<sqlx::Error> for DatabaseInstallError {
    fn from(value: sqlx::Error) -> Self {
        Self::Database(value)
    }
}

impl From<sdkwork_models::CatalogError> for DatabaseInstallError {
    fn from(value: sdkwork_models::CatalogError) -> Self {
        Self::Catalog(value)
    }
}

impl From<CommerceServiceError> for DatabaseInstallError {
    fn from(value: CommerceServiceError) -> Self {
        Self::Commerce(value)
    }
}

fn normalize_catalog_refresh_options(
    options: CatalogRefreshOptions,
) -> Result<CatalogRefreshOptions, DatabaseInstallError> {
    let source = normalize_refresh_source(options.source)?;
    let mode = normalize_refresh_mode(options.mode)?;
    let vendor_codes = normalize_refresh_vendor_codes(options.vendor_codes)?;
    let catalog_root = normalize_refresh_catalog_root(options.catalog_root)?;
    let catalog_version = normalize_refresh_catalog_version(options.catalog_version)?;
    Ok(CatalogRefreshOptions {
        source,
        mode,
        vendor_codes,
        force: options.force,
        catalog_root,
        catalog_version,
    })
}

fn normalize_refresh_source(value: String) -> Result<String, DatabaseInstallError> {
    let value = value.trim();
    if value.is_empty() {
        return Ok(DEFAULT_CATALOG_REFRESH_SOURCE.to_owned());
    }
    normalize_refresh_token(value, "source", MAX_REFRESH_SOURCE_LEN)
}

fn normalize_refresh_mode(value: String) -> Result<String, DatabaseInstallError> {
    let value = value.trim();
    if value.is_empty() {
        return Ok("official_refresh".to_owned());
    }
    let value = normalize_refresh_token(value, "mode", MAX_REFRESH_MODE_LEN)?;
    if !matches!(
        value.as_str(),
        "official_refresh" | "vendor_refresh" | "catalog_version_refresh" | "dry_run"
    ) {
        return Err(DatabaseInstallError::InvalidState(
            "mode must be official_refresh, vendor_refresh, catalog_version_refresh, or dry_run"
                .to_owned(),
        ));
    }
    Ok(value)
}

fn normalize_refresh_vendor_codes(
    values: Vec<String>,
) -> Result<Vec<String>, DatabaseInstallError> {
    if values.len() > MAX_REFRESH_VENDOR_CODES {
        return Err(DatabaseInstallError::InvalidState(format!(
            "vendorCodes must contain {MAX_REFRESH_VENDOR_CODES} items or fewer"
        )));
    }
    let mut vendor_codes = Vec::new();
    for value in values {
        let value = normalize_refresh_token(&value, "vendorCodes", MAX_REFRESH_VENDOR_CODE_LEN)?;
        if !vendor_codes.iter().any(|existing| existing == &value) {
            vendor_codes.push(value);
        }
    }
    Ok(vendor_codes)
}

fn normalize_refresh_catalog_root(
    value: Option<String>,
) -> Result<Option<String>, DatabaseInstallError> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = value.trim();
    if value.is_empty() {
        return Ok(None);
    }
    if value.chars().count() > MAX_REFRESH_CATALOG_ROOT_LEN {
        return Err(DatabaseInstallError::InvalidState(format!(
            "catalogRoot must be {MAX_REFRESH_CATALOG_ROOT_LEN} characters or fewer"
        )));
    }
    if value.chars().any(char::is_control) {
        return Err(DatabaseInstallError::InvalidState(
            "catalogRoot must not contain control characters".to_owned(),
        ));
    }
    Ok(Some(value.to_owned()))
}

fn normalize_refresh_catalog_version(
    value: Option<String>,
) -> Result<Option<String>, DatabaseInstallError> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = value.trim();
    if value.is_empty() {
        return Ok(None);
    }
    if value.chars().count() > MAX_REFRESH_CATALOG_VERSION_LEN {
        return Err(DatabaseInstallError::InvalidState(format!(
            "catalogVersion must be {MAX_REFRESH_CATALOG_VERSION_LEN} characters or fewer"
        )));
    }
    if !value
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'-' | b'_'))
    {
        return Err(DatabaseInstallError::InvalidState(
            "catalogVersion must contain only letters, numbers, ., -, and _".to_owned(),
        ));
    }
    Ok(Some(value.to_owned()))
}

fn normalize_refresh_token(
    value: &str,
    name: &str,
    max_len: usize,
) -> Result<String, DatabaseInstallError> {
    let value = value.trim().to_ascii_lowercase();
    if value.is_empty() {
        return Err(DatabaseInstallError::InvalidState(format!(
            "{name} must not be blank"
        )));
    }
    if value.len() > max_len {
        return Err(DatabaseInstallError::InvalidState(format!(
            "{name} must be {max_len} characters or fewer"
        )));
    }
    if !value
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
    {
        return Err(DatabaseInstallError::InvalidState(format!(
            "{name} must contain only letters, numbers, -, and _"
        )));
    }
    Ok(value)
}

fn normalize_bootstrap_admin_username(
    value: String,
    name: &str,
) -> Result<String, DatabaseInstallError> {
    let value = value.trim().to_ascii_lowercase();
    if value.is_empty() {
        return Err(DatabaseInstallError::InvalidState(format!(
            "{name} must not be blank"
        )));
    }
    if value.len() > 128 {
        return Err(DatabaseInstallError::InvalidState(format!(
            "{name} must be 128 characters or fewer"
        )));
    }
    if !value
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'-' | b'_'))
    {
        return Err(DatabaseInstallError::InvalidState(format!(
            "{name} may only contain letters, digits, '.', '-' and '_'"
        )));
    }
    Ok(value)
}

fn normalize_bootstrap_admin_text(
    value: String,
    name: &str,
    max_len: usize,
    allow_blank: bool,
) -> Result<String, DatabaseInstallError> {
    let value = value.trim().to_owned();
    if value.is_empty() && !allow_blank {
        return Err(DatabaseInstallError::InvalidState(format!(
            "{name} must not be blank"
        )));
    }
    if value.chars().count() > max_len {
        return Err(DatabaseInstallError::InvalidState(format!(
            "{name} must be {max_len} characters or fewer"
        )));
    }
    if value.chars().any(char::is_control) {
        return Err(DatabaseInstallError::InvalidState(format!(
            "{name} must not contain control characters"
        )));
    }
    Ok(value)
}

fn normalize_bootstrap_admin_email(
    value: String,
    name: &str,
) -> Result<String, DatabaseInstallError> {
    let value = normalize_bootstrap_admin_text(value, name, 256, false)?;
    if !value.contains('@') {
        return Err(DatabaseInstallError::InvalidState(format!(
            "{name} must be a valid email address"
        )));
    }
    Ok(value)
}

fn normalize_bootstrap_admin_password(
    value: String,
    name: &str,
) -> Result<String, DatabaseInstallError> {
    let value = value.trim().to_owned();
    if value.chars().count() < MIN_BOOTSTRAP_ADMIN_PASSWORD_LEN
        || value.chars().count() > MAX_BOOTSTRAP_ADMIN_PASSWORD_LEN
    {
        return Err(DatabaseInstallError::InvalidState(format!(
            "{name} must be between {MIN_BOOTSTRAP_ADMIN_PASSWORD_LEN} and {MAX_BOOTSTRAP_ADMIN_PASSWORD_LEN} characters"
        )));
    }
    if value.chars().any(char::is_control) {
        return Err(DatabaseInstallError::InvalidState(format!(
            "{name} must not contain control characters"
        )));
    }
    Ok(value)
}

fn load_install_model_catalog(
    options: &DatabaseInstallOptions,
) -> Result<ModelCatalog, DatabaseInstallError> {
    match options.models_catalog_root.as_deref() {
        Some(root) => Ok(sdkwork_models::load_catalog(root)?),
        None => Ok(sdkwork_models::load_bundled_catalog()?),
    }
}

fn expected_install_catalog_version(
    options: &DatabaseInstallOptions,
) -> Result<String, DatabaseInstallError> {
    Ok(load_install_model_catalog(options)?
        .manifest
        .catalog_version)
}

fn expected_install_catalog_version_fast(
    options: &DatabaseInstallOptions,
) -> Result<String, DatabaseInstallError> {
    Ok(load_install_catalog_manifest_fast(options)?.catalog_version)
}

fn load_install_catalog_manifest_fast(
    options: &DatabaseInstallOptions,
) -> Result<sdkwork_models::CatalogManifest, DatabaseInstallError> {
    match options.models_catalog_root.as_deref() {
        Some(root) => load_external_catalog_manifest_fast(root),
        None => serde_json::from_str(BUNDLED_MODELS_CATALOG_MANIFEST).map_err(|source| {
            DatabaseInstallError::Catalog(sdkwork_models::CatalogError::Json {
                path: PathBuf::from("bundled sdkwork-models.json"),
                source,
            })
        }),
    }
}

fn load_external_catalog_manifest_fast(
    root: &str,
) -> Result<sdkwork_models::CatalogManifest, DatabaseInstallError> {
    let path = Path::new(root).join("sdkwork-models.json");
    let payload = fs::read_to_string(&path)
        .map_err(|error| DatabaseInstallError::Catalog(sdkwork_models::CatalogError::Io(error)))?;
    serde_json::from_str(&payload).map_err(|source| {
        DatabaseInstallError::Catalog(sdkwork_models::CatalogError::Json { path, source })
    })
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct CatalogCompletenessSpec {
    vendor_codes: BTreeSet<String>,
    vendor_metadata_keys: BTreeSet<VendorMetadataCompletenessKey>,
    family_keys: BTreeSet<ModelFamilyCompletenessKey>,
    catalog_keys: BTreeSet<String>,
    capability_keys: BTreeSet<ModelCapabilityCompletenessKey>,
    meter_codes: BTreeSet<String>,
    price_keys: BTreeSet<ModelPriceCompletenessKey>,
    ranking_keys: BTreeSet<ModelRankingCompletenessKey>,
    modality_codes: BTreeSet<String>,
    api_endpoint_codes: BTreeSet<String>,
    vendor_modality_keys: BTreeSet<VendorModalityCompletenessKey>,
    vendor_api_endpoint_keys: BTreeSet<VendorApiEndpointCompletenessKey>,
    modality_api_endpoint_keys: BTreeSet<ModalityApiEndpointCompletenessKey>,
    model_modality_keys: BTreeSet<ModelModalityCompletenessKey>,
    model_api_endpoint_keys: BTreeSet<ModelApiEndpointCompletenessKey>,
    ai_resource_codes: BTreeSet<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct VendorMetadataCompletenessKey {
    vendor_code: String,
    supported_protocols: String,
    client_api_compatibility: String,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct ModelFamilyCompletenessKey {
    vendor_code: String,
    family_code: String,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct ModelCapabilityCompletenessKey {
    catalog_key: String,
    capability: i32,
    capability_code: String,
    modality: i32,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct ModelPriceCompletenessKey {
    uuid: String,
    catalog_key: String,
    region_code: String,
    meter_code: String,
    price_side: i32,
    pricing_scope: i32,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct ModelRankingCompletenessKey {
    snapshot_date: String,
    rank_scope: String,
    vendor_code: String,
    region_code: String,
    catalog_key: String,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct VendorModalityCompletenessKey {
    vendor_code: String,
    modality_code: String,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct VendorApiEndpointCompletenessKey {
    vendor_code: String,
    endpoint_code: String,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct ModalityApiEndpointCompletenessKey {
    modality_code: String,
    endpoint_code: String,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct ModelModalityCompletenessKey {
    catalog_key: String,
    modality_code: String,
    direction: String,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct ModelApiEndpointCompletenessKey {
    catalog_key: String,
    endpoint_code: String,
}

fn catalog_completeness_spec(catalog: &ModelCatalog) -> CatalogCompletenessSpec {
    let vendor_codes = catalog
        .vendors
        .iter()
        .map(|vendor| vendor.vendor.vendor_code.clone())
        .collect::<BTreeSet<_>>();
    let vendor_metadata_keys = catalog_vendor_records(catalog)
        .into_iter()
        .map(|vendor| VendorMetadataCompletenessKey {
            vendor_code: vendor.vendor_code.clone(),
            supported_protocols: canonical_json_text(
                &crate::infrastructure::sql::model_catalog_import::json_array(
                    &vendor.supported_protocols,
                ),
            ),
            client_api_compatibility: canonical_json_text(
                &serde_json::to_string(&vendor.client_api_compatibility)
                    .unwrap_or_else(|_| "{}".to_owned()),
            ),
        })
        .collect::<BTreeSet<_>>();
    let family_keys = catalog
        .vendors
        .iter()
        .flat_map(|vendor| {
            vendor
                .families
                .iter()
                .map(|family| ModelFamilyCompletenessKey {
                    vendor_code: vendor.vendor.vendor_code.clone(),
                    family_code: family.family_code.clone(),
                })
        })
        .collect::<BTreeSet<_>>();
    let public_models =
        crate::infrastructure::sql::model_catalog_import::public_catalog_identity_models(catalog);
    let catalog_keys = public_models.keys().cloned().collect::<BTreeSet<_>>();
    let capability_keys = public_models
        .into_iter()
        .flat_map(|(model_catalog_key, (_, model))| {
            let modality =
                crate::infrastructure::sql::model_catalog_import::primary_modality(model);
            let capabilities = if model.capabilities.is_empty() {
                vec![model.primary_capability.clone()]
            } else {
                model.capabilities.clone()
            };
            capabilities
                .into_iter()
                .map(move |capability| ModelCapabilityCompletenessKey {
                    catalog_key: model_catalog_key.clone(),
                    capability: crate::infrastructure::sql::model_catalog_import::capability_code(
                        &capability,
                    ),
                    capability_code: capability,
                    modality,
                })
        })
        .collect::<BTreeSet<_>>();
    let public_catalog_keys = catalog_keys.clone();
    let meter_codes = catalog
        .meters
        .iter()
        .map(|meter| meter.meter_code.clone())
        .collect::<BTreeSet<_>>();
    let price_keys = catalog
        .vendors
        .iter()
        .flat_map(|vendor| vendor.pricing.iter())
        .filter(|pricing| {
            public_catalog_keys
                .contains(&model_catalog_key(&pricing.vendor_code, &pricing.model_id))
        })
        .flat_map(|pricing| {
            let pricing_catalog_key = pricing_catalog_key(&pricing.vendor_code, &pricing.model_id);
            pricing
                .prices
                .iter()
                .map(move |price| ModelPriceCompletenessKey {
                    uuid: crate::infrastructure::sql::model_catalog_import::stable_uuid(
                        "sdk-price",
                        &[
                            &pricing.vendor_code,
                            &pricing.region_code,
                            &pricing.model_id,
                            &price.price_id,
                        ],
                    ),
                    catalog_key: pricing_catalog_key.clone(),
                    region_code: pricing.region_code.clone(),
                    meter_code: price.meter_code.clone(),
                    price_side: crate::infrastructure::sql::model_catalog_import::price_side_code(
                        &price.price_side,
                    ),
                    pricing_scope:
                        crate::infrastructure::sql::model_catalog_import::pricing_scope_code(
                            price.pricing_scope.as_deref(),
                        ),
                })
        })
        .collect::<BTreeSet<_>>();
    let ranking_keys = catalog
        .vendors
        .iter()
        .flat_map(|vendor| {
            vendor
                .rankings
                .iter()
                .map(move |snapshot| (vendor, snapshot))
        })
        .flat_map(|(vendor, snapshot)| {
            let model_catalog_keys = catalog_keys.clone();
            snapshot.items.iter().filter_map(move |item| {
                let item_catalog_key =
                    pricing_catalog_key(&vendor.vendor.vendor_code, &item.model_id);
                let model_catalog_key =
                    model_catalog_key(&vendor.vendor.vendor_code, &item.model_id);
                if model_catalog_keys.contains(&model_catalog_key) {
                    Some(ModelRankingCompletenessKey {
                        snapshot_date: snapshot.snapshot_date.clone(),
                        rank_scope: snapshot.rank_scope.clone(),
                        vendor_code: vendor.vendor.vendor_code.clone(),
                        region_code: vendor.vendor.region_code.clone(),
                        catalog_key: item_catalog_key,
                    })
                } else {
                    None
                }
            })
        })
        .collect::<BTreeSet<_>>();
    let modality_codes = catalog_modality_projections(catalog)
        .into_iter()
        .map(|item| item.modality_code)
        .collect::<BTreeSet<_>>();
    let api_endpoint_codes = catalog_api_endpoint_projections(catalog)
        .into_iter()
        .map(|item| item.endpoint_code)
        .collect::<BTreeSet<_>>();
    let vendor_modality_keys = catalog_vendor_modality_projections(catalog)
        .into_iter()
        .map(|item| VendorModalityCompletenessKey {
            vendor_code: item.vendor_code,
            modality_code: item.modality_code,
        })
        .collect::<BTreeSet<_>>();
    let vendor_api_endpoint_keys = catalog_vendor_api_endpoint_projections(catalog)
        .into_iter()
        .map(|item| VendorApiEndpointCompletenessKey {
            vendor_code: item.vendor_code,
            endpoint_code: item.endpoint_code,
        })
        .collect::<BTreeSet<_>>();
    let modality_api_endpoint_keys = catalog_modality_api_endpoint_projections(catalog)
        .into_iter()
        .map(|item| ModalityApiEndpointCompletenessKey {
            modality_code: item.modality_code,
            endpoint_code: item.endpoint_code,
        })
        .collect::<BTreeSet<_>>();
    let model_modality_keys = catalog_model_modality_projections(catalog)
        .into_iter()
        .map(|item| ModelModalityCompletenessKey {
            catalog_key: item.catalog_key,
            modality_code: item.modality_code,
            direction: item.direction,
        })
        .collect::<BTreeSet<_>>();
    let model_api_endpoint_keys = catalog_model_api_endpoint_projections(catalog)
        .into_iter()
        .map(|item| ModelApiEndpointCompletenessKey {
            catalog_key: item.catalog_key,
            endpoint_code: item.endpoint_code,
        })
        .collect::<BTreeSet<_>>();
    let ai_resource_codes = catalog_ai_resource_projections(catalog)
        .into_iter()
        .map(|item| item.resource_code)
        .collect::<BTreeSet<_>>();

    CatalogCompletenessSpec {
        vendor_codes,
        vendor_metadata_keys,
        family_keys,
        catalog_keys,
        capability_keys,
        meter_codes,
        price_keys,
        ranking_keys,
        modality_codes,
        api_endpoint_codes,
        vendor_modality_keys,
        vendor_api_endpoint_keys,
        modality_api_endpoint_keys,
        model_modality_keys,
        model_api_endpoint_keys,
        ai_resource_codes,
    }
}

async fn sqlite_status(
    pool: &SqlitePool,
    options: &DatabaseInstallOptions,
    bootstrap_admin_options: &BootstrapAdminOptions,
) -> Result<InstallationStatus, DatabaseInstallError> {
    if !sqlite_table_exists(pool, "system_installation_state").await? {
        return Ok(InstallationStatus::NotInstalled);
    }

    let Some(row) = sqlx::query(
        r#"
        SELECT schema_version, catalog_version, seed_profile, environment, status
        FROM system_installation_state
        WHERE id = 1
        "#,
    )
    .fetch_optional(pool)
    .await?
    else {
        return Ok(InstallationStatus::NotInstalled);
    };

    let install_status = row.get::<String, _>("status");
    if install_status != "installed" {
        return Ok(InstallationStatus::Incomplete);
    }

    let schema_version = row.get::<String, _>("schema_version");
    let catalog_version = row.get::<String, _>("catalog_version");
    let expected_catalog_version = match expected_install_catalog_version(options) {
        Ok(version) => version,
        Err(DatabaseInstallError::Catalog(_)) if options.models_catalog_root.is_some() => {
            return Ok(InstallationStatus::CatalogUnavailable);
        }
        Err(error) => return Err(error),
    };
    let seed_profile = row.get::<String, _>("seed_profile");
    let environment = row.get::<String, _>("environment");
    if schema_version != CURRENT_SCHEMA_VERSION
        || catalog_version != expected_catalog_version
        || seed_profile != options.seed_profile
        || environment != options.environment
    {
        return Ok(InstallationStatus::UpgradeRequired);
    }

    if !sqlite_generated_schema_tables_exist(pool).await? {
        return Ok(InstallationStatus::Corrupt);
    }
    if !sqlite_generated_schema_columns_exist(pool).await? {
        return Ok(InstallationStatus::UpgradeRequired);
    }
    if !sqlite_generated_schema_indexes_exist(pool).await? {
        return Ok(InstallationStatus::UpgradeRequired);
    }
    if standalone_iam_bootstrap_enabled() {
        if !sqlite_appbase_iam_foundation_schema_tables_exist(pool).await? {
            return Ok(InstallationStatus::UpgradeRequired);
        }
        if !sqlite_appbase_iam_oauth_schema_tables_exist(pool).await? {
            return Ok(InstallationStatus::UpgradeRequired);
        }
        if !sqlite_appbase_iam_oauth_schema_indexes_exist(pool).await? {
            return Ok(InstallationStatus::UpgradeRequired);
        }
    }
    if compose_sibling_commerce_module() {
        if !sqlite_appbase_commerce_schema_tables_exist(pool).await? {
            return Ok(InstallationStatus::Corrupt);
        }
        if !sqlite_appbase_commerce_schema_indexes_exist(pool).await? {
            return Ok(InstallationStatus::UpgradeRequired);
        }
        if !sqlite_sdkwork_models_catalog_module_schema_tables_exist(pool).await? {
            return Ok(InstallationStatus::UpgradeRequired);
        }
        if !sqlite_sdkwork_models_catalog_module_schema_indexes_exist(pool).await? {
            return Ok(InstallationStatus::UpgradeRequired);
        }
    }
    if !sqlite_clawrouter_legacy_projection_schema_tables_exist(pool).await? {
        return Ok(InstallationStatus::UpgradeRequired);
    }
    if !COMPOSE_SDKWORK_MODELS_CATALOG_MODULE
        && !sqlite_gateway_routing_dictionary_schema_tables_exist(pool).await?
    {
        return Ok(InstallationStatus::UpgradeRequired);
    }
    if product_database_iam_seed_enabled()
        && bootstrap_admin_options.enabled
        && !sqlite_bootstrap_admin_seed_complete(pool, bootstrap_admin_options.username.as_str())
            .await?
    {
        return Ok(InstallationStatus::UpgradeRequired);
    }
    let catalog = match load_install_model_catalog(options) {
        Ok(catalog) => catalog,
        Err(DatabaseInstallError::Catalog(_)) if options.models_catalog_root.is_some() => {
            return Ok(InstallationStatus::CatalogUnavailable);
        }
        Err(error) => return Err(error),
    };
    let spec = catalog_completeness_spec(&catalog);
    if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {
        if !sqlite_sdkwork_models_catalog_complete(pool, &spec).await? {
            return Ok(InstallationStatus::UpgradeRequired);
        }
        if !sqlite_catalog_migration_payload_current(pool, &catalog).await? {
            return Ok(InstallationStatus::UpgradeRequired);
        }
    }
    if !sqlite_ai_routing_seed_complete(pool).await? {
        return Ok(InstallationStatus::UpgradeRequired);
    }
    if !sqlite_seed_migration_payload_current(
        pool,
        "ai-routing",
        CURRENT_SCHEMA_VERSION,
        bundled_ai_routing_seed_payload()
            .map_err(|error| DatabaseInstallError::InvalidState(error.to_string()))?
            .as_str(),
    )
    .await?
    {
        return Ok(InstallationStatus::UpgradeRequired);
    }
    if product_database_iam_seed_enabled()
        && !sqlite_default_iam_subject_seed_complete(pool).await?
    {
        return Ok(InstallationStatus::UpgradeRequired);
    }
    if compose_sibling_commerce_module() && !sqlite_commerce_experience_seed_complete(pool).await? {
        return Ok(InstallationStatus::UpgradeRequired);
    }
    Ok(InstallationStatus::Installed)
}

async fn sqlite_lightweight_status(
    pool: &SqlitePool,
    options: &DatabaseInstallOptions,
) -> Result<InstallationStatus, DatabaseInstallError> {
    if !sqlite_table_exists(pool, "system_installation_state").await? {
        return Ok(InstallationStatus::NotInstalled);
    }

    let Some(row) = sqlx::query(
        r#"
        SELECT schema_version, catalog_version, seed_profile, environment, status
        FROM system_installation_state
        WHERE id = 1
        "#,
    )
    .fetch_optional(pool)
    .await?
    else {
        return Ok(InstallationStatus::NotInstalled);
    };

    persisted_installation_state_status(
        row.get::<String, _>("schema_version"),
        row.get::<String, _>("catalog_version"),
        row.get::<String, _>("seed_profile"),
        row.get::<String, _>("environment"),
        row.get::<String, _>("status"),
        options,
    )
}

async fn prepare_sqlite_schema_with_catalog_version(
    pool: &SqlitePool,
    options: &DatabaseInstallOptions,
    catalog_version: &str,
) -> Result<(), DatabaseInstallError> {
    create_sqlite_system_tables(pool).await?;
    upsert_sqlite_installing_state(pool, options, catalog_version).await?;
    record_sqlite_migration_started(
        pool,
        "schema",
        CURRENT_SCHEMA_VERSION,
        GENERATED_POSTGRES_SCHEMA,
    )
    .await?;
    for statement in sqlite_schema_statements() {
        execute_sqlite_statement(pool, statement.as_str()).await?;
    }
    if !COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {
        apply_sqlite_gateway_routing_dictionary_schema(pool).await?;
    }
    if compose_sibling_commerce_module() {
        apply_sqlite_appbase_commerce_schema(pool).await?;
    }
    if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {
        apply_sqlite_sdkwork_models_catalog_module_schema(pool).await?;
    }
    if standalone_iam_bootstrap_enabled() {
        apply_sqlite_appbase_iam_foundation_schema(pool).await?;
        apply_sqlite_appbase_iam_oauth_schema(pool).await?;
    }
    apply_sqlite_clawrouter_legacy_projection_schema(pool).await?;
    apply_sqlite_clawrouter_runtime_schema_repairs(pool).await?;
    record_sqlite_migration_completed(
        pool,
        "schema",
        CURRENT_SCHEMA_VERSION,
        GENERATED_POSTGRES_SCHEMA,
    )
    .await?;
    Ok(())
}

async fn postgres_status(
    pool: &PgPool,
    options: &DatabaseInstallOptions,
    bootstrap_admin_options: &BootstrapAdminOptions,
) -> Result<InstallationStatus, DatabaseInstallError> {
    if !postgres_table_exists(pool, "system_installation_state").await? {
        return Ok(InstallationStatus::NotInstalled);
    }

    let Some(row) = sqlx::query(
        r#"
        SELECT schema_version, catalog_version, seed_profile, environment, status
        FROM system_installation_state
        WHERE id = 1
        "#,
    )
    .fetch_optional(pool)
    .await?
    else {
        return Ok(InstallationStatus::NotInstalled);
    };

    let install_status = row.get::<String, _>("status");
    if install_status != "installed" {
        return Ok(InstallationStatus::Incomplete);
    }

    let schema_version = row.get::<String, _>("schema_version");
    let catalog_version = row.get::<String, _>("catalog_version");
    let expected_catalog_version = match expected_install_catalog_version(options) {
        Ok(version) => version,
        Err(DatabaseInstallError::Catalog(_)) if options.models_catalog_root.is_some() => {
            return Ok(InstallationStatus::CatalogUnavailable);
        }
        Err(error) => return Err(error),
    };
    let seed_profile = row.get::<String, _>("seed_profile");
    let environment = row.get::<String, _>("environment");
    if schema_version != CURRENT_SCHEMA_VERSION
        || catalog_version != expected_catalog_version
        || seed_profile != options.seed_profile
        || environment != options.environment
    {
        return Ok(InstallationStatus::UpgradeRequired);
    }

    if !postgres_generated_schema_tables_exist(pool).await? {
        return Ok(InstallationStatus::Corrupt);
    }
    if !postgres_generated_schema_columns_exist(pool).await? {
        return Ok(InstallationStatus::UpgradeRequired);
    }
    if !postgres_generated_schema_indexes_exist(pool).await? {
        return Ok(InstallationStatus::UpgradeRequired);
    }
    if standalone_iam_bootstrap_enabled() {
        if !postgres_appbase_iam_foundation_schema_tables_exist(pool).await? {
            return Ok(InstallationStatus::UpgradeRequired);
        }
        if !postgres_appbase_iam_oauth_schema_tables_exist(pool).await? {
            return Ok(InstallationStatus::UpgradeRequired);
        }
        if !postgres_appbase_iam_oauth_schema_indexes_exist(pool).await? {
            return Ok(InstallationStatus::UpgradeRequired);
        }
    }
    if compose_sibling_commerce_module() {
        if !postgres_appbase_commerce_schema_tables_exist(pool).await? {
            return Ok(InstallationStatus::Corrupt);
        }
        if !postgres_appbase_commerce_schema_columns_exist(pool).await? {
            return Ok(InstallationStatus::UpgradeRequired);
        }
        if !postgres_appbase_commerce_schema_indexes_exist(pool).await? {
            return Ok(InstallationStatus::UpgradeRequired);
        }
        if !postgres_sdkwork_models_catalog_module_schema_tables_exist(pool).await? {
            return Ok(InstallationStatus::UpgradeRequired);
        }
        if !postgres_sdkwork_models_catalog_module_schema_indexes_exist(pool).await? {
            return Ok(InstallationStatus::UpgradeRequired);
        }
    }
    if !postgres_clawrouter_legacy_projection_schema_tables_exist(pool).await? {
        return Ok(InstallationStatus::UpgradeRequired);
    }
    if !COMPOSE_SDKWORK_MODELS_CATALOG_MODULE
        && !postgres_gateway_routing_dictionary_schema_tables_exist(pool).await?
    {
        return Ok(InstallationStatus::UpgradeRequired);
    }
    if product_database_iam_seed_enabled()
        && bootstrap_admin_options.enabled
        && !postgres_bootstrap_admin_seed_complete(pool, bootstrap_admin_options.username.as_str())
            .await?
    {
        return Ok(InstallationStatus::UpgradeRequired);
    }
    let catalog = match load_install_model_catalog(options) {
        Ok(catalog) => catalog,
        Err(DatabaseInstallError::Catalog(_)) if options.models_catalog_root.is_some() => {
            return Ok(InstallationStatus::CatalogUnavailable);
        }
        Err(error) => return Err(error),
    };
    let spec = catalog_completeness_spec(&catalog);
    if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {
        if !postgres_sdkwork_models_catalog_complete(pool, &spec).await? {
            return Ok(InstallationStatus::UpgradeRequired);
        }
        if !postgres_catalog_migration_payload_current(pool, &catalog).await? {
            return Ok(InstallationStatus::UpgradeRequired);
        }
    }
    if !postgres_ai_routing_seed_complete(pool).await? {
        return Ok(InstallationStatus::UpgradeRequired);
    }
    if !postgres_seed_migration_payload_current(
        pool,
        "ai-routing",
        CURRENT_SCHEMA_VERSION,
        bundled_ai_routing_seed_payload()
            .map_err(|error| DatabaseInstallError::InvalidState(error.to_string()))?
            .as_str(),
    )
    .await?
    {
        return Ok(InstallationStatus::UpgradeRequired);
    }
    if product_database_iam_seed_enabled()
        && !postgres_default_iam_subject_seed_complete(pool).await?
    {
        return Ok(InstallationStatus::UpgradeRequired);
    }
    if compose_sibling_commerce_module()
        && !postgres_commerce_experience_seed_complete(pool).await?
    {
        return Ok(InstallationStatus::UpgradeRequired);
    }
    Ok(InstallationStatus::Installed)
}

async fn postgres_lightweight_status(
    pool: &PgPool,
    options: &DatabaseInstallOptions,
) -> Result<InstallationStatus, DatabaseInstallError> {
    if !postgres_table_exists(pool, "system_installation_state").await? {
        return Ok(InstallationStatus::NotInstalled);
    }

    let Some(row) = sqlx::query(
        r#"
        SELECT schema_version, catalog_version, seed_profile, environment, status
        FROM system_installation_state
        WHERE id = 1
        "#,
    )
    .fetch_optional(pool)
    .await?
    else {
        return Ok(InstallationStatus::NotInstalled);
    };

    persisted_installation_state_status(
        row.get::<String, _>("schema_version"),
        row.get::<String, _>("catalog_version"),
        row.get::<String, _>("seed_profile"),
        row.get::<String, _>("environment"),
        row.get::<String, _>("status"),
        options,
    )
}

fn persisted_installation_state_status(
    schema_version: String,
    catalog_version: String,
    seed_profile: String,
    environment: String,
    install_status: String,
    options: &DatabaseInstallOptions,
) -> Result<InstallationStatus, DatabaseInstallError> {
    if install_status != "installed" {
        return Ok(InstallationStatus::Incomplete);
    }

    let expected_catalog_version = match expected_install_catalog_version_fast(options) {
        Ok(version) => version,
        Err(DatabaseInstallError::Catalog(_)) if options.models_catalog_root.is_some() => {
            return Ok(InstallationStatus::CatalogUnavailable);
        }
        Err(error) => return Err(error),
    };
    if schema_version != CURRENT_SCHEMA_VERSION
        || catalog_version != expected_catalog_version
        || seed_profile != options.seed_profile
        || environment != options.environment
    {
        return Ok(InstallationStatus::UpgradeRequired);
    }

    Ok(InstallationStatus::Installed)
}

async fn prepare_postgres_schema_with_catalog_version(
    pool: &PgPool,
    options: &DatabaseInstallOptions,
    catalog_version: &str,
) -> Result<(), DatabaseInstallError> {
    create_postgres_system_tables(pool).await?;
    upsert_postgres_installing_state(pool, options, catalog_version).await?;
    record_postgres_migration_started(
        pool,
        "schema",
        CURRENT_SCHEMA_VERSION,
        GENERATED_POSTGRES_SCHEMA,
    )
    .await?;
    for statement in postgres_schema_statements() {
        execute_postgres_statement(pool, statement.as_str()).await?;
    }
    apply_postgres_gateway_routing_dictionary_schema(pool).await?;
    if standalone_iam_bootstrap_enabled() {
        apply_postgres_appbase_iam_foundation_schema(pool).await?;
    }
    if compose_sibling_commerce_module() {
        apply_postgres_appbase_commerce_schema(pool).await?;
    }
    if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {
        apply_postgres_sdkwork_models_catalog_module_schema(pool).await?;
    }
    if standalone_iam_bootstrap_enabled() {
        apply_postgres_appbase_iam_oauth_schema(pool).await?;
    }
    apply_postgres_clawrouter_legacy_projection_schema(pool).await?;
    apply_postgres_clawrouter_runtime_schema_repairs(pool).await?;
    record_postgres_migration_completed(
        pool,
        "schema",
        CURRENT_SCHEMA_VERSION,
        GENERATED_POSTGRES_SCHEMA,
    )
    .await?;
    Ok(())
}

async fn install_sqlite(
    pool: &SqlitePool,
    options: &DatabaseInstallOptions,
    bootstrap_admin_options: &BootstrapAdminOptions,
) -> Result<Option<BootstrapAdminReport>, DatabaseInstallError> {
    let catalog = load_install_model_catalog(options)?;
    let catalog_payload =
        crate::infrastructure::sql::model_catalog_import::catalog_payload(&catalog);
    prepare_sqlite_schema_with_catalog_version(
        pool,
        options,
        catalog.manifest.catalog_version.as_str(),
    )
    .await?;

    if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {
        record_sqlite_migration_started(
            pool,
            "catalog",
            catalog.manifest.catalog_version.as_str(),
            catalog_payload.as_str(),
        )
        .await?;
        crate::infrastructure::sql::sqlite::model_catalog_import::import_sqlite_model_catalog(
            pool, &catalog,
        )
        .await?;
        record_sqlite_migration_completed(
            pool,
            "catalog",
            catalog.manifest.catalog_version.as_str(),
            catalog_payload.as_str(),
        )
        .await?;
    }
    import_sqlite_bundled_ai_routing_seed(pool).await?;
    import_sqlite_default_iam_subject_seed(pool).await?;
    if compose_sibling_commerce_module() {
        import_sqlite_commerce_experience_seed(pool).await?;
        ensure_sqlite_bootstrap_admin_recharge_catalog(pool).await?;
    }
    let bootstrap_admin =
        bootstrap_sqlite_admin_user_if_needed(pool, bootstrap_admin_options).await?;
    mark_sqlite_installed(pool).await?;
    Ok(bootstrap_admin)
}

async fn install_postgres(
    pool: &PgPool,
    options: &DatabaseInstallOptions,
    bootstrap_admin_options: &BootstrapAdminOptions,
) -> Result<Option<BootstrapAdminReport>, DatabaseInstallError> {
    let catalog = load_install_model_catalog(options)?;
    let catalog_payload =
        crate::infrastructure::sql::model_catalog_import::catalog_payload(&catalog);
    prepare_postgres_schema_with_catalog_version(
        pool,
        options,
        catalog.manifest.catalog_version.as_str(),
    )
    .await?;

    if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {
        record_postgres_migration_started(
            pool,
            "catalog",
            catalog.manifest.catalog_version.as_str(),
            catalog_payload.as_str(),
        )
        .await?;
        crate::infrastructure::sql::postgres::model_catalog_import::import_postgres_model_catalog(
            pool, &catalog,
        )
        .await?;
        record_postgres_migration_completed(
            pool,
            "catalog",
            catalog.manifest.catalog_version.as_str(),
            catalog_payload.as_str(),
        )
        .await?;
    }
    import_postgres_bundled_ai_routing_seed(pool).await?;
    import_postgres_default_iam_subject_seed(pool).await?;
    if compose_sibling_commerce_module() {
        import_postgres_commerce_experience_seed(pool).await?;
        ensure_postgres_bootstrap_admin_recharge_catalog(pool).await?;
    }
    let bootstrap_admin =
        bootstrap_postgres_admin_user_if_needed(pool, bootstrap_admin_options).await?;
    mark_postgres_installed(pool).await?;
    Ok(bootstrap_admin)
}

async fn repair_sqlite_installation(
    pool: &SqlitePool,
    options: &DatabaseInstallOptions,
    bootstrap_admin_options: &BootstrapAdminOptions,
) -> Result<Option<BootstrapAdminReport>, DatabaseInstallError> {
    if !sqlite_generated_schema_tables_exist(pool).await?
        || !sqlite_generated_schema_columns_exist(pool).await?
        || !sqlite_generated_schema_indexes_exist(pool).await?
    {
        record_sqlite_migration_started(
            pool,
            "schema",
            CURRENT_SCHEMA_VERSION,
            GENERATED_POSTGRES_SCHEMA,
        )
        .await?;
        for statement in sqlite_schema_statements() {
            execute_sqlite_statement(pool, statement.as_str()).await?;
        }
        record_sqlite_migration_completed(
            pool,
            "schema",
            CURRENT_SCHEMA_VERSION,
            GENERATED_POSTGRES_SCHEMA,
        )
        .await?;
    }

    if compose_sibling_commerce_module() {
        if !sqlite_appbase_commerce_schema_tables_exist(pool).await?
            || !sqlite_appbase_commerce_schema_indexes_exist(pool).await?
        {
            apply_sqlite_appbase_commerce_schema(pool).await?;
        }
        if !sqlite_sdkwork_models_catalog_module_schema_tables_exist(pool).await?
            || !sqlite_sdkwork_models_catalog_module_schema_indexes_exist(pool).await?
        {
            apply_sqlite_sdkwork_models_catalog_module_schema(pool).await?;
        }
    }
    if standalone_iam_bootstrap_enabled() {
        if !sqlite_appbase_iam_foundation_schema_tables_exist(pool).await? {
            apply_sqlite_appbase_iam_foundation_schema(pool).await?;
        }
        if !sqlite_appbase_iam_oauth_schema_tables_exist(pool).await?
            || !sqlite_appbase_iam_oauth_schema_indexes_exist(pool).await?
        {
            apply_sqlite_appbase_iam_oauth_schema(pool).await?;
        }
    }
    if !sqlite_clawrouter_legacy_projection_schema_tables_exist(pool).await? {
        apply_sqlite_clawrouter_legacy_projection_schema(pool).await?;
    }
    if !COMPOSE_SDKWORK_MODELS_CATALOG_MODULE
        && !sqlite_gateway_routing_dictionary_schema_tables_exist(pool).await?
    {
        apply_sqlite_gateway_routing_dictionary_schema(pool).await?;
    }

    let catalog = load_install_model_catalog(options)?;
    if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {
        let spec = catalog_completeness_spec(&catalog);
        let catalog_payload =
            crate::infrastructure::sql::model_catalog_import::catalog_payload(&catalog);
        if !sqlite_sdkwork_models_catalog_complete(pool, &spec).await?
            || !sqlite_catalog_migration_payload_current(pool, &catalog).await?
        {
            record_sqlite_migration_started(
                pool,
                "catalog",
                catalog.manifest.catalog_version.as_str(),
                catalog_payload.as_str(),
            )
            .await?;
            crate::infrastructure::sql::sqlite::model_catalog_import::import_sqlite_model_catalog(
                pool, &catalog,
            )
            .await?;
            record_sqlite_migration_completed(
                pool,
                "catalog",
                catalog.manifest.catalog_version.as_str(),
                catalog_payload.as_str(),
            )
            .await?;
        }
    }

    let ai_routing_payload = bundled_ai_routing_seed_payload()
        .map_err(|error| DatabaseInstallError::InvalidState(error.to_string()))?;
    let ai_routing_payload_current = sqlite_seed_migration_payload_current(
        pool,
        "ai-routing",
        CURRENT_SCHEMA_VERSION,
        ai_routing_payload.as_str(),
    )
    .await?;
    if !sqlite_ai_routing_seed_complete(pool).await? || !ai_routing_payload_current {
        import_sqlite_bundled_ai_routing_seed(pool).await?;
    }
    if product_database_iam_seed_enabled()
        && !sqlite_default_iam_subject_seed_complete(pool).await?
    {
        import_sqlite_default_iam_subject_seed(pool).await?;
    }
    if compose_sibling_commerce_module() {
        let commerce_payload = commerce_experience_seed_manifest().payload_json;
        let commerce_integrity =
            crate::infrastructure::sql::membership_seed_compat::sqlite_commerce_experience_seed_integrity_report(
                pool,
            )
            .await?;
        let commerce_payload_current = sqlite_seed_migration_payload_current(
            pool,
            "commerce-experience",
            CURRENT_SCHEMA_VERSION,
            commerce_payload.as_str(),
        )
        .await?;
        if !commerce_payload_current {
            import_sqlite_commerce_experience_seed(pool).await?;
        } else if !commerce_integrity.complete {
            record_sqlite_migration_started(
                pool,
                "commerce-experience",
                CURRENT_SCHEMA_VERSION,
                commerce_payload.as_str(),
            )
            .await?;
            crate::infrastructure::sql::membership_seed_compat::repair_sqlite_commerce_experience_seed_from_report(
                pool,
                &commerce_integrity,
            )
            .await?;
            record_sqlite_migration_completed(
                pool,
                "commerce-experience",
                CURRENT_SCHEMA_VERSION,
                commerce_payload.as_str(),
            )
            .await?;
        }
        ensure_sqlite_bootstrap_admin_recharge_catalog(pool).await?;
    }
    let bootstrap_admin =
        bootstrap_sqlite_admin_user_if_needed(pool, bootstrap_admin_options).await?;
    mark_sqlite_installed_with_catalog_version(
        pool,
        options,
        catalog.manifest.catalog_version.as_str(),
    )
    .await?;
    Ok(bootstrap_admin)
}

async fn repair_postgres_installation(
    pool: &PgPool,
    options: &DatabaseInstallOptions,
    bootstrap_admin_options: &BootstrapAdminOptions,
) -> Result<Option<BootstrapAdminReport>, DatabaseInstallError> {
    if !postgres_generated_schema_tables_exist(pool).await?
        || !postgres_generated_schema_columns_exist(pool).await?
        || !postgres_generated_schema_indexes_exist(pool).await?
    {
        record_postgres_migration_started(
            pool,
            "schema",
            CURRENT_SCHEMA_VERSION,
            GENERATED_POSTGRES_SCHEMA,
        )
        .await?;
        for statement in postgres_schema_statements() {
            execute_postgres_statement(pool, statement.as_str()).await?;
        }
        record_postgres_migration_completed(
            pool,
            "schema",
            CURRENT_SCHEMA_VERSION,
            GENERATED_POSTGRES_SCHEMA,
        )
        .await?;
    }

    if compose_sibling_commerce_module() {
        if !postgres_appbase_commerce_schema_tables_exist(pool).await?
            || !postgres_appbase_commerce_schema_columns_exist(pool).await?
            || !postgres_appbase_commerce_schema_indexes_exist(pool).await?
        {
            apply_postgres_appbase_commerce_schema(pool).await?;
        }
        repair_postgres_appbase_commerce_legacy_constraints(pool).await?;
        if !postgres_sdkwork_models_catalog_module_schema_tables_exist(pool).await?
            || !postgres_sdkwork_models_catalog_module_schema_indexes_exist(pool).await?
        {
            apply_postgres_sdkwork_models_catalog_module_schema(pool).await?;
        }
    }
    if standalone_iam_bootstrap_enabled() {
        if !postgres_appbase_iam_foundation_schema_tables_exist(pool).await? {
            apply_postgres_appbase_iam_foundation_schema(pool).await?;
        }
        if !postgres_appbase_iam_oauth_schema_tables_exist(pool).await?
            || !postgres_appbase_iam_oauth_schema_indexes_exist(pool).await?
        {
            apply_postgres_appbase_iam_oauth_schema(pool).await?;
        }
    }
    if !postgres_clawrouter_legacy_projection_schema_tables_exist(pool).await? {
        apply_postgres_clawrouter_legacy_projection_schema(pool).await?;
    }

    let catalog = load_install_model_catalog(options)?;
    if COMPOSE_SDKWORK_MODELS_CATALOG_MODULE {
        let spec = catalog_completeness_spec(&catalog);
        let catalog_payload =
            crate::infrastructure::sql::model_catalog_import::catalog_payload(&catalog);
        if !postgres_sdkwork_models_catalog_complete(pool, &spec).await?
            || !postgres_catalog_migration_payload_current(pool, &catalog).await?
        {
            record_postgres_migration_started(
                pool,
                "catalog",
                catalog.manifest.catalog_version.as_str(),
                catalog_payload.as_str(),
            )
            .await?;
            crate::infrastructure::sql::postgres::model_catalog_import::import_postgres_model_catalog(
                pool, &catalog,
            )
            .await?;
            record_postgres_migration_completed(
                pool,
                "catalog",
                catalog.manifest.catalog_version.as_str(),
                catalog_payload.as_str(),
            )
            .await?;
        }
    }

    if !postgres_ai_routing_seed_complete(pool).await?
        || !postgres_seed_migration_payload_current(
            pool,
            "ai-routing",
            CURRENT_SCHEMA_VERSION,
            bundled_ai_routing_seed_payload()
                .map_err(|error| DatabaseInstallError::InvalidState(error.to_string()))?
                .as_str(),
        )
        .await?
    {
        import_postgres_bundled_ai_routing_seed(pool).await?;
    }
    if product_database_iam_seed_enabled()
        && !postgres_default_iam_subject_seed_complete(pool).await?
    {
        import_postgres_default_iam_subject_seed(pool).await?;
    }
    if compose_sibling_commerce_module() {
        if !postgres_commerce_experience_seed_complete(pool).await? {
            import_postgres_commerce_experience_seed(pool).await?;
        }
        ensure_postgres_bootstrap_admin_recharge_catalog(pool).await?;
    }
    let bootstrap_admin =
        bootstrap_postgres_admin_user_if_needed(pool, bootstrap_admin_options).await?;
    mark_postgres_installed_with_catalog_version(
        pool,
        options,
        catalog.manifest.catalog_version.as_str(),
    )
    .await?;
    Ok(bootstrap_admin)
}

async fn import_sqlite_bundled_ai_routing_seed(
    pool: &SqlitePool,
) -> Result<(), DatabaseInstallError> {
    let payload = bundled_ai_routing_seed_payload()
        .map_err(|error| DatabaseInstallError::InvalidState(error.to_string()))?;
    record_sqlite_migration_started(pool, "ai-routing", CURRENT_SCHEMA_VERSION, payload.as_str())
        .await?;
    import_sqlite_ai_routing_seed(pool).await?;
    record_sqlite_migration_completed(pool, "ai-routing", CURRENT_SCHEMA_VERSION, payload.as_str())
        .await?;
    Ok(())
}

async fn import_postgres_bundled_ai_routing_seed(
    pool: &PgPool,
) -> Result<(), DatabaseInstallError> {
    let payload = bundled_ai_routing_seed_payload()
        .map_err(|error| DatabaseInstallError::InvalidState(error.to_string()))?;
    record_postgres_migration_started(pool, "ai-routing", CURRENT_SCHEMA_VERSION, payload.as_str())
        .await?;
    import_postgres_ai_routing_seed(pool).await?;
    record_postgres_migration_completed(
        pool,
        "ai-routing",
        CURRENT_SCHEMA_VERSION,
        payload.as_str(),
    )
    .await?;
    Ok(())
}

async fn import_sqlite_default_iam_subject_seed(
    pool: &SqlitePool,
) -> Result<(), DatabaseInstallError> {
    if !product_database_iam_seed_enabled() {
        return Ok(());
    }
    import_sqlite_default_iam_seed(pool)
        .await
        .map_err(DatabaseInstallError::Database)
}

async fn import_postgres_default_iam_subject_seed(
    pool: &PgPool,
) -> Result<(), DatabaseInstallError> {
    if !product_database_iam_seed_enabled() {
        return Ok(());
    }
    import_postgres_default_iam_seed(pool)
        .await
        .map_err(DatabaseInstallError::Database)
}

async fn import_sqlite_commerce_experience_seed(
    pool: &SqlitePool,
) -> Result<(), DatabaseInstallError> {
    let payload = commerce_experience_seed_manifest().payload_json;
    record_sqlite_migration_started(
        pool,
        "commerce-experience",
        CURRENT_SCHEMA_VERSION,
        payload.as_str(),
    )
    .await?;
    crate::infrastructure::sql::membership_seed_compat::upsert_sqlite_commerce_experience_seed(pool).await?;
    record_sqlite_migration_completed(
        pool,
        "commerce-experience",
        CURRENT_SCHEMA_VERSION,
        payload.as_str(),
    )
    .await?;
    Ok(())
}

async fn import_postgres_commerce_experience_seed(
    pool: &PgPool,
) -> Result<(), DatabaseInstallError> {
    let payload = commerce_experience_seed_manifest().payload_json;
    record_postgres_migration_started(
        pool,
        "commerce-experience",
        CURRENT_SCHEMA_VERSION,
        payload.as_str(),
    )
    .await?;
    crate::infrastructure::sql::membership_seed_compat::upsert_postgres_commerce_experience_seed(pool).await?;
    record_postgres_migration_completed(
        pool,
        "commerce-experience",
        CURRENT_SCHEMA_VERSION,
        payload.as_str(),
    )
    .await?;
    Ok(())
}

async fn ensure_sqlite_bootstrap_admin_recharge_catalog(
    pool: &SqlitePool,
) -> Result<bool, DatabaseInstallError> {
    if !compose_sibling_commerce_module() || commerce_recharge_package_seeds().is_empty() {
        return Ok(false);
    }
    let payload = bootstrap_admin_recharge_catalog_payload();
    let payload_current = sqlite_seed_migration_payload_current(
        pool,
        "bootstrap-admin-recharge-catalog",
        CURRENT_SCHEMA_VERSION,
        payload.as_str(),
    )
    .await?;
    let package_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM commerce_recharge_package
        WHERE tenant_id = ?
          AND organization_id = ?
          AND status <> 'deleted'
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .fetch_one(pool)
    .await?;
    let settings_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM commerce_exchange_rule
        WHERE tenant_id = ?
          AND organization_id = ?
          AND rule_no = 'CASH_TO_POINTS'
          AND source_asset_type = 'cash'
          AND target_asset_type = 'points'
          AND status = 'active'
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .fetch_one(pool)
    .await?;
    if payload_current && package_count > 0 && settings_count > 0 {
        return Ok(false);
    }

    record_sqlite_migration_started(
        pool,
        "bootstrap-admin-recharge-catalog",
        CURRENT_SCHEMA_VERSION,
        payload.as_str(),
    )
    .await?;
    if settings_count == 0 {
        upsert_sqlite_bootstrap_admin_recharge_settings(pool).await?;
    }
    if package_count == 0 {
        upsert_sqlite_bootstrap_admin_recharge_packages(pool).await?;
    }
    record_sqlite_migration_completed(
        pool,
        "bootstrap-admin-recharge-catalog",
        CURRENT_SCHEMA_VERSION,
        payload.as_str(),
    )
    .await?;
    Ok(true)
}

async fn ensure_postgres_bootstrap_admin_recharge_catalog(
    pool: &PgPool,
) -> Result<bool, DatabaseInstallError> {
    if !compose_sibling_commerce_module() || commerce_recharge_package_seeds().is_empty() {
        return Ok(false);
    }
    let payload = bootstrap_admin_recharge_catalog_payload();
    let payload_current = postgres_seed_migration_payload_current(
        pool,
        "bootstrap-admin-recharge-catalog",
        CURRENT_SCHEMA_VERSION,
        payload.as_str(),
    )
    .await?;
    let package_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM commerce_recharge_package
        WHERE tenant_id = $1
          AND organization_id = $2
          AND status <> 'deleted'
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .fetch_one(pool)
    .await?;
    let settings_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM commerce_exchange_rule
        WHERE tenant_id = $1
          AND organization_id = $2
          AND rule_no = 'CASH_TO_POINTS'
          AND source_asset_type = 'cash'
          AND target_asset_type = 'points'
          AND status = 'active'
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .fetch_one(pool)
    .await?;
    if payload_current && package_count > 0 && settings_count > 0 {
        return Ok(false);
    }

    record_postgres_migration_started(
        pool,
        "bootstrap-admin-recharge-catalog",
        CURRENT_SCHEMA_VERSION,
        payload.as_str(),
    )
    .await?;
    if settings_count == 0 {
        upsert_postgres_bootstrap_admin_recharge_settings(pool).await?;
    }
    if package_count == 0 {
        upsert_postgres_bootstrap_admin_recharge_packages(pool).await?;
    }
    record_postgres_migration_completed(
        pool,
        "bootstrap-admin-recharge-catalog",
        CURRENT_SCHEMA_VERSION,
        payload.as_str(),
    )
    .await?;
    Ok(true)
}

fn bootstrap_admin_recharge_catalog_payload() -> String {
    let recharge_packages = commerce_recharge_package_seeds()
        .into_iter()
        .map(|package| {
            serde_json::json!({
                "packageNo": package.package_no,
                "priceAmount": package.price_amount,
                "currencyCode": package.currency_code,
                "bonusPoints": package.bonus_points,
                "status": package.status,
                "sortWeight": package.sort_weight,
            })
        })
        .collect::<Vec<_>>();
    let recharge_settings = commerce_recharge_settings_seeds()
        .into_iter()
        .map(|setting| {
            serde_json::json!({
                "ruleNo": setting.rule_no,
                "rate": setting.rate,
                "baseCurrencyCode": setting.base_currency_code,
                "currencyToCnyRates": setting.currency_to_cny_rates,
            })
        })
        .collect::<Vec<_>>();
    serde_json::json!({
        "tenantId": DEFAULT_IAM_TENANT_ID,
        "organizationId": DEFAULT_IAM_ORGANIZATION_ID,
        "packages": recharge_packages,
        "settings": recharge_settings,
    })
    .to_string()
}

async fn upsert_sqlite_bootstrap_admin_recharge_settings(
    pool: &SqlitePool,
) -> Result<(), DatabaseInstallError> {
    let now = current_utc_timestamp_string();
    for setting in commerce_recharge_settings_seeds() {
        let currency_to_cny_rates = setting
            .currency_to_cny_rates
            .iter()
            .map(|(currency_code, rate)| {
                (
                    currency_code.to_string(),
                    serde_json::Value::String((*rate).to_string()),
                )
            })
            .collect::<serde_json::Map<String, serde_json::Value>>();
        let remark = serde_json::json!({
            "baseCurrencyCode": setting.base_currency_code,
            "currencyToCnyRates": currency_to_cny_rates,
        })
        .to_string();
        let rule_id = format!(
            "bootstrap-admin-recharge-settings-{}-{}",
            DEFAULT_IAM_TENANT_ID,
            setting.rule_no.to_ascii_lowercase()
        );
        sqlx::query(
            r#"
            INSERT INTO commerce_exchange_rule
                (id, tenant_id, organization_id, rule_no, source_asset_type, target_asset_type, rate, status, remark, request_no, idempotency_key, created_at, updated_at)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                rule_no = excluded.rule_no,
                rate = excluded.rate,
                status = excluded.status,
                remark = excluded.remark,
                request_no = excluded.request_no,
                idempotency_key = excluded.idempotency_key,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&rule_id)
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(setting.rule_no)
        .bind(setting.source_asset_type)
        .bind(setting.target_asset_type)
        .bind(setting.rate)
        .bind(&remark)
        .bind(format!(
            "bootstrap-admin-recharge-settings-{}",
            setting.rule_no.to_ascii_lowercase()
        ))
        .bind(format!(
            "bootstrap-admin-recharge-settings-{}",
            setting.rule_no.to_ascii_lowercase()
        ))
        .bind(&now)
        .bind(&now)
        .execute(pool)
        .await?;
    }
    Ok(())
}

async fn upsert_postgres_bootstrap_admin_recharge_settings(
    pool: &PgPool,
) -> Result<(), DatabaseInstallError> {
    let now = current_utc_timestamp_string();
    for setting in commerce_recharge_settings_seeds() {
        let currency_to_cny_rates = setting
            .currency_to_cny_rates
            .iter()
            .map(|(currency_code, rate)| {
                (
                    currency_code.to_string(),
                    serde_json::Value::String((*rate).to_string()),
                )
            })
            .collect::<serde_json::Map<String, serde_json::Value>>();
        let remark = serde_json::json!({
            "baseCurrencyCode": setting.base_currency_code,
            "currencyToCnyRates": currency_to_cny_rates,
        })
        .to_string();
        let rule_id = format!(
            "bootstrap-admin-recharge-settings-{}-{}",
            DEFAULT_IAM_TENANT_ID,
            setting.rule_no.to_ascii_lowercase()
        );
        sqlx::query(
            r#"
            INSERT INTO commerce_exchange_rule
                (id, tenant_id, organization_id, rule_no, source_asset_type, target_asset_type, rate, status, remark, request_no, idempotency_key, created_at, updated_at)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9, $10, $11, $12)
            ON CONFLICT(id) DO UPDATE SET
                rule_no = excluded.rule_no,
                rate = excluded.rate,
                status = excluded.status,
                remark = excluded.remark,
                request_no = excluded.request_no,
                idempotency_key = excluded.idempotency_key,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&rule_id)
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(setting.rule_no)
        .bind(setting.source_asset_type)
        .bind(setting.target_asset_type)
        .bind(setting.rate)
        .bind(&remark)
        .bind(format!(
            "bootstrap-admin-recharge-settings-{}",
            setting.rule_no.to_ascii_lowercase()
        ))
        .bind(format!(
            "bootstrap-admin-recharge-settings-{}",
            setting.rule_no.to_ascii_lowercase()
        ))
        .bind(&now)
        .bind(&now)
        .execute(pool)
        .await?;
    }
    Ok(())
}

fn bootstrap_recharge_group_key(currency_code: &str) -> &'static str {
    let normalized = currency_code.trim();
    if normalized.is_empty() || normalized.eq_ignore_ascii_case("CNY") {
        "cny"
    } else {
        "non-cny"
    }
}

async fn upsert_sqlite_bootstrap_admin_recharge_packages(
    pool: &SqlitePool,
) -> Result<(), DatabaseInstallError> {
    let now = current_utc_timestamp_string();
    let mut sort_weight = 1_i64;
    let package_seeds = commerce_recharge_package_seeds();
    let cny_spu_sales_status = if package_seeds.iter().any(|package| {
        bootstrap_recharge_group_key(package.currency_code) == "cny"
            && package.status.eq_ignore_ascii_case("active")
    }) {
        "active"
    } else {
        "inactive"
    };
    let non_cny_spu_sales_status = if package_seeds.iter().any(|package| {
        bootstrap_recharge_group_key(package.currency_code) == "non-cny"
            && package.status.eq_ignore_ascii_case("active")
    }) {
        "active"
    } else {
        "inactive"
    };
    for package in package_seeds {
        let group_key = bootstrap_recharge_group_key(package.currency_code);
        let spu_id = format!(
            "bootstrap-admin-recharge-spu-{}-{}",
            DEFAULT_IAM_TENANT_ID, group_key
        );
        let spu_category_id = format!(
            "bootstrap-admin-recharge-spu-category-{}-{}",
            DEFAULT_IAM_TENANT_ID, group_key
        );
        let sku_id = format!(
            "bootstrap-admin-recharge-sku-{}-{}",
            DEFAULT_IAM_TENANT_ID, package.external_id
        );
        let package_id = format!(
            "bootstrap-admin-recharge-package-{}-{}",
            DEFAULT_IAM_TENANT_ID, package.external_id
        );
        let spu_no = format!("bootstrap-admin-recharge-{group_key}");
        let sku_no = format!("bootstrap-admin-recharge-{}", package.external_id);
        let package_no = format!("bootstrap-admin-recharge-{}", package.external_id);
        let spu_title = if group_key == "cny" {
            "Bootstrap admin recharge catalog (CNY)"
        } else {
            "Bootstrap admin recharge catalog (Non-CNY)"
        };
        let spu_sales_status = if group_key == "cny" {
            cny_spu_sales_status
        } else {
            non_cny_spu_sales_status
        };
        let spec_json = serde_json::json!({
            "kind": "points_recharge_package",
            "packageId": package_id,
            "packageNo": package_no,
            "seedPackageNo": package.package_no,
            "externalId": package.external_id,
            "bonusPoints": package.bonus_points,
        })
        .to_string();

        sqlx::query(
            r#"
            INSERT INTO commerce_product_spu
                (id, tenant_id, organization_id, spu_no, title, subtitle, description, product_type, status, visible_surfaces, created_at, updated_at)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, 'points_recharge', ?, '["app","console","admin"]', ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                tenant_id = excluded.tenant_id,
                organization_id = excluded.organization_id,
                spu_no = excluded.spu_no,
                title = excluded.title,
                subtitle = excluded.subtitle,
                description = excluded.description,
                product_type = excluded.product_type,
                status = excluded.status,
                visible_surfaces = excluded.visible_surfaces,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&spu_id)
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(&spu_no)
        .bind(spu_title)
        .bind("Bootstrap admin recharge catalog")
        .bind("Bootstrap admin recharge package")
        .bind(spu_sales_status)
        .bind(&now)
        .bind(&now)
        .execute(pool)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO commerce_product_spu_category
                (id, tenant_id, organization_id, spu_id, category_id, primary_flag, sort_order, status, created_at, updated_at)
            VALUES
                (?, ?, ?, ?, 'commerce-recharge', 1, 0, 'active', ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                organization_id = excluded.organization_id,
                primary_flag = excluded.primary_flag,
                sort_order = excluded.sort_order,
                status = excluded.status,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&spu_category_id)
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(&spu_id)
        .bind(&now)
        .bind(&now)
        .execute(pool)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO commerce_product_sku
                (id, tenant_id, organization_id, spu_id, sku_no, name, title, price_amount, original_price_amount, currency_code, fulfillment_type, inventory_tracking, status, spec_json, created_at, updated_at)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'points_credit', 'untracked', ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                organization_id = excluded.organization_id,
                spu_id = excluded.spu_id,
                name = excluded.name,
                title = excluded.title,
                price_amount = excluded.price_amount,
                original_price_amount = excluded.original_price_amount,
                currency_code = excluded.currency_code,
                fulfillment_type = excluded.fulfillment_type,
                inventory_tracking = excluded.inventory_tracking,
                status = excluded.status,
                spec_json = excluded.spec_json,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&sku_id)
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(&spu_id)
        .bind(&sku_no)
        .bind(package.name)
        .bind(package.name)
        .bind(package.price_amount)
        .bind(package.currency_code)
        .bind(package.status)
        .bind(&spec_json)
        .bind(&now)
        .bind(&now)
        .execute(pool)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO commerce_recharge_package
                (id, tenant_id, organization_id, external_id, package_no, sku_id, name, price_amount, currency_code, bonus_points, status, valid_from, valid_to, sort_weight, request_no, idempotency_key, created_at, updated_at)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                organization_id = excluded.organization_id,
                external_id = excluded.external_id,
                sku_id = excluded.sku_id,
                name = excluded.name,
                price_amount = excluded.price_amount,
                currency_code = excluded.currency_code,
                bonus_points = excluded.bonus_points,
                status = excluded.status,
                valid_from = excluded.valid_from,
                valid_to = excluded.valid_to,
                sort_weight = excluded.sort_weight,
                request_no = excluded.request_no,
                idempotency_key = excluded.idempotency_key,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&package_id)
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(package.external_id)
        .bind(&package_no)
        .bind(&sku_id)
        .bind(package.name)
        .bind(package.price_amount)
        .bind(package.currency_code)
        .bind(package.bonus_points)
        .bind(package.status)
        .bind(sort_weight)
        .bind(format!("bootstrap-admin-recharge-package-{package_no}"))
        .bind(format!("bootstrap-admin-recharge-package-{package_no}"))
        .bind(&now)
        .bind(&now)
        .execute(pool)
        .await?;
        sort_weight += 1;
    }
    Ok(())
}

async fn upsert_postgres_bootstrap_admin_recharge_packages(
    pool: &PgPool,
) -> Result<(), DatabaseInstallError> {
    let now = current_utc_timestamp_string();
    let mut sort_weight = 1_i64;
    let package_seeds = commerce_recharge_package_seeds();
    let cny_spu_sales_status = if package_seeds.iter().any(|package| {
        bootstrap_recharge_group_key(package.currency_code) == "cny"
            && package.status.eq_ignore_ascii_case("active")
    }) {
        "active"
    } else {
        "inactive"
    };
    let non_cny_spu_sales_status = if package_seeds.iter().any(|package| {
        bootstrap_recharge_group_key(package.currency_code) == "non-cny"
            && package.status.eq_ignore_ascii_case("active")
    }) {
        "active"
    } else {
        "inactive"
    };
    for package in package_seeds {
        let group_key = bootstrap_recharge_group_key(package.currency_code);
        let spu_id = format!(
            "bootstrap-admin-recharge-spu-{}-{}",
            DEFAULT_IAM_TENANT_ID, group_key
        );
        let spu_category_id = format!(
            "bootstrap-admin-recharge-spu-category-{}-{}",
            DEFAULT_IAM_TENANT_ID, group_key
        );
        let sku_id = format!(
            "bootstrap-admin-recharge-sku-{}-{}",
            DEFAULT_IAM_TENANT_ID, package.external_id
        );
        let package_id = format!(
            "bootstrap-admin-recharge-package-{}-{}",
            DEFAULT_IAM_TENANT_ID, package.external_id
        );
        let spu_no = format!("bootstrap-admin-recharge-{group_key}");
        let sku_no = format!("bootstrap-admin-recharge-{}", package.external_id);
        let package_no = format!("bootstrap-admin-recharge-{}", package.external_id);
        let spu_title = if group_key == "cny" {
            "Bootstrap admin recharge catalog (CNY)"
        } else {
            "Bootstrap admin recharge catalog (Non-CNY)"
        };
        let spu_sales_status = if group_key == "cny" {
            cny_spu_sales_status
        } else {
            non_cny_spu_sales_status
        };
        let spec_json = serde_json::json!({
            "kind": "points_recharge_package",
            "packageId": package_id,
            "packageNo": package_no,
            "seedPackageNo": package.package_no,
            "externalId": package.external_id,
            "bonusPoints": package.bonus_points,
        })
        .to_string();

        sqlx::query(
            r#"
            INSERT INTO commerce_product_spu
                (id, tenant_id, organization_id, spu_no, title, subtitle, description, product_type, status, visible_surfaces, created_at, updated_at)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7, 'points_recharge', $8, '["app","console","admin"]', $9, $10)
            ON CONFLICT(id) DO UPDATE SET
                tenant_id = excluded.tenant_id,
                organization_id = excluded.organization_id,
                spu_no = excluded.spu_no,
                title = excluded.title,
                subtitle = excluded.subtitle,
                description = excluded.description,
                product_type = excluded.product_type,
                status = excluded.status,
                visible_surfaces = excluded.visible_surfaces,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&spu_id)
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(&spu_no)
        .bind(spu_title)
        .bind("Bootstrap admin recharge catalog")
        .bind("Bootstrap admin recharge package")
        .bind(spu_sales_status)
        .bind(&now)
        .bind(&now)
        .execute(pool)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO commerce_product_spu_category
                (id, tenant_id, organization_id, spu_id, category_id, primary_flag, sort_order, status, created_at, updated_at)
            VALUES
                ($1, $2, $3, $4, 'commerce-recharge', 1, 0, 'active', $5, $6)
            ON CONFLICT(id) DO UPDATE SET
                organization_id = excluded.organization_id,
                primary_flag = excluded.primary_flag,
                sort_order = excluded.sort_order,
                status = excluded.status,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&spu_category_id)
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(&spu_id)
        .bind(&now)
        .bind(&now)
        .execute(pool)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO commerce_product_sku
                (id, tenant_id, organization_id, spu_id, sku_no, name, title, price_amount, original_price_amount, currency_code, fulfillment_type, inventory_tracking, status, spec_json, created_at, updated_at)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, 'points_credit', 'untracked', $10, $11, $12, $13)
            ON CONFLICT(id) DO UPDATE SET
                organization_id = excluded.organization_id,
                spu_id = excluded.spu_id,
                name = excluded.name,
                title = excluded.title,
                price_amount = excluded.price_amount,
                original_price_amount = excluded.original_price_amount,
                currency_code = excluded.currency_code,
                fulfillment_type = excluded.fulfillment_type,
                inventory_tracking = excluded.inventory_tracking,
                status = excluded.status,
                spec_json = excluded.spec_json,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&sku_id)
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(&spu_id)
        .bind(&sku_no)
        .bind(package.name)
        .bind(package.name)
        .bind(package.price_amount)
        .bind(package.currency_code)
        .bind(package.status)
        .bind(&spec_json)
        .bind(&now)
        .bind(&now)
        .execute(pool)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO commerce_recharge_package
                (id, tenant_id, organization_id, external_id, package_no, sku_id, name, price_amount, currency_code, bonus_points, status, valid_from, valid_to, sort_weight, request_no, idempotency_key, created_at, updated_at)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL, NULL, $12, $13, $14, $15, $16)
            ON CONFLICT(id) DO UPDATE SET
                organization_id = excluded.organization_id,
                external_id = excluded.external_id,
                sku_id = excluded.sku_id,
                name = excluded.name,
                price_amount = excluded.price_amount,
                currency_code = excluded.currency_code,
                bonus_points = excluded.bonus_points,
                status = excluded.status,
                valid_from = excluded.valid_from,
                valid_to = excluded.valid_to,
                sort_weight = excluded.sort_weight,
                request_no = excluded.request_no,
                idempotency_key = excluded.idempotency_key,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&package_id)
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(package.external_id)
        .bind(&package_no)
        .bind(&sku_id)
        .bind(package.name)
        .bind(package.price_amount)
        .bind(package.currency_code)
        .bind(package.bonus_points)
        .bind(package.status)
        .bind(sort_weight)
        .bind(format!("bootstrap-admin-recharge-package-{package_no}"))
        .bind(format!("bootstrap-admin-recharge-package-{package_no}"))
        .bind(&now)
        .bind(&now)
        .execute(pool)
        .await?;
        sort_weight += 1;
    }
    Ok(())
}

async fn bootstrap_sqlite_admin_user_if_needed(
    pool: &SqlitePool,
    options: &BootstrapAdminOptions,
) -> Result<Option<BootstrapAdminReport>, DatabaseInstallError> {
    if !product_database_iam_seed_enabled() {
        return Ok(None);
    }
    bootstrap_sqlite_admin_user(pool, options).await
}

async fn bootstrap_sqlite_admin_user(
    pool: &SqlitePool,
    options: &BootstrapAdminOptions,
) -> Result<Option<BootstrapAdminReport>, DatabaseInstallError> {
    if !options.enabled
        || sqlite_bootstrap_admin_seed_complete(pool, options.username.as_str()).await?
    {
        return Ok(None);
    }
    let mut tx = pool.begin().await?;
    let now = current_utc_timestamp_string();
    let user_id =
        match sqlite_bootstrap_admin_user_id_in_transaction(&mut tx, options.username.as_str())
            .await?
        {
            Some(user_id) => user_id,
            None => DEFAULT_BOOTSTRAP_ADMIN_USER_ID.to_owned(),
        };
    let has_active_password =
        sqlite_bootstrap_admin_has_active_password_credential_in_transaction(&mut tx, &user_id)
            .await?;
    let password_and_hash = if has_active_password {
        None
    } else {
        let password = options.password()?;
        let hash = bootstrap_password_hash(&password, &user_id, now.as_str())?;
        Some((password, hash))
    };
    let password_written = upsert_sqlite_bootstrap_admin(
        &mut tx,
        options,
        &user_id,
        password_and_hash.as_ref().map(|(_, hash)| hash.as_str()),
        &now,
    )
    .await?;
    tx.commit().await?;
    Ok(password_written.then(|| {
        let (password, _) = password_and_hash.expect("password must exist when written");
        options.report(user_id, password)
    }))
}

async fn bootstrap_postgres_admin_user_if_needed(
    pool: &PgPool,
    options: &BootstrapAdminOptions,
) -> Result<Option<BootstrapAdminReport>, DatabaseInstallError> {
    if !product_database_iam_seed_enabled() {
        return Ok(None);
    }
    bootstrap_postgres_admin_user(pool, options).await
}

async fn bootstrap_postgres_admin_user(
    pool: &PgPool,
    options: &BootstrapAdminOptions,
) -> Result<Option<BootstrapAdminReport>, DatabaseInstallError> {
    if !options.enabled
        || postgres_bootstrap_admin_seed_complete(pool, options.username.as_str()).await?
    {
        return Ok(None);
    }
    let mut tx = pool.begin().await?;
    let now = current_utc_timestamp_string();
    let user_id =
        match postgres_bootstrap_admin_user_id_in_transaction(&mut tx, options.username.as_str())
            .await?
        {
            Some(user_id) => user_id,
            None => DEFAULT_BOOTSTRAP_ADMIN_USER_ID.to_owned(),
        };
    let has_active_password =
        postgres_bootstrap_admin_has_active_password_credential_in_transaction(&mut tx, &user_id)
            .await?;
    let password_and_hash = if has_active_password {
        None
    } else {
        let password = options.password()?;
        let hash = bootstrap_password_hash(&password, &user_id, now.as_str())?;
        Some((password, hash))
    };
    let password_written = upsert_postgres_bootstrap_admin(
        &mut tx,
        options,
        &user_id,
        password_and_hash.as_ref().map(|(_, hash)| hash.as_str()),
        &now,
    )
    .await?;
    tx.commit().await?;
    Ok(password_written.then(|| {
        let (password, _) = password_and_hash.expect("password must exist when written");
        options.report(user_id, password)
    }))
}

async fn reset_sqlite_admin_password(
    pool: &SqlitePool,
    options: &BootstrapAdminOptions,
) -> Result<ResetAdminPasswordReport, DatabaseInstallError> {
    if !product_database_iam_seed_enabled() {
        return Err(DatabaseInstallError::InvalidState(
            "bootstrap admin password reset is owned by sdkwork-iam-database-host".to_owned(),
        ));
    }
    let mut tx = pool.begin().await?;
    let now = current_utc_timestamp_string();
    let user_id =
        match sqlite_bootstrap_admin_user_id_in_transaction(&mut tx, options.username.as_str())
            .await?
        {
            Some(user_id) => user_id,
            None => DEFAULT_BOOTSTRAP_ADMIN_USER_ID.to_owned(),
        };
    upsert_sqlite_bootstrap_admin(&mut tx, options, &user_id, None, &now).await?;
    let old_password_hash: Option<String> = sqlx::query_scalar(
        r#"
        SELECT credential_hash
        FROM iam_credential
        WHERE tenant_id = ?
          AND user_id = ?
          AND credential_type = 'password'
          AND status = 'active'
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&user_id)
    .fetch_optional(&mut *tx)
    .await?;

    let password = options.password()?;
    let password_hash = bootstrap_password_hash(&password, &user_id, now.as_str())?;
    if old_password_hash
        .as_deref()
        .is_some_and(|existing| existing != password_hash.as_str())
    {
        sqlx::query(
            r#"
            INSERT INTO iam_password_history
                (id, tenant_id, user_id, password_hash, created_at)
            VALUES
                (?, ?, ?, ?, ?)
            "#,
        )
        .bind(reset_admin_password_history_id(&user_id, &now))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(&user_id)
        .bind(old_password_hash.as_deref().expect("old password hash"))
        .bind(&now)
        .execute(&mut *tx)
        .await?;
    }

    sqlx::query(
        r#"
        INSERT INTO iam_credential
            (id, tenant_id, user_id, credential_type, credential_hash, status, expires_at, created_at, updated_at)
        VALUES
            (?, ?, ?, 'password', ?, 'active', NULL, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            tenant_id = excluded.tenant_id,
            user_id = excluded.user_id,
            credential_type = excluded.credential_type,
            credential_hash = excluded.credential_hash,
            status = excluded.status,
            expires_at = excluded.expires_at,
            updated_at = excluded.updated_at
        "#,
    )
    .bind(bootstrap_admin_password_credential_id(&user_id))
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&user_id)
    .bind(&password_hash)
    .bind(&now)
    .bind(&now)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(reset_admin_password_report(options, user_id, password))
}

async fn reset_postgres_admin_password(
    pool: &PgPool,
    options: &BootstrapAdminOptions,
) -> Result<ResetAdminPasswordReport, DatabaseInstallError> {
    if !product_database_iam_seed_enabled() {
        return Err(DatabaseInstallError::InvalidState(
            "bootstrap admin password reset is owned by sdkwork-iam-database-host".to_owned(),
        ));
    }
    let mut tx = pool.begin().await?;
    let now = current_utc_timestamp_string();
    let user_id =
        match postgres_bootstrap_admin_user_id_in_transaction(&mut tx, options.username.as_str())
            .await?
        {
            Some(user_id) => user_id,
            None => DEFAULT_BOOTSTRAP_ADMIN_USER_ID.to_owned(),
        };
    upsert_postgres_bootstrap_admin(&mut tx, options, &user_id, None, &now).await?;
    let old_password_hash: Option<String> = sqlx::query_scalar(
        r#"
        SELECT credential_hash
        FROM iam_credential
        WHERE tenant_id = $1
          AND user_id = $2
          AND credential_type = 'password'
          AND status = 'active'
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&user_id)
    .fetch_optional(&mut *tx)
    .await?;

    let password = options.password()?;
    let password_hash = bootstrap_password_hash(&password, &user_id, now.as_str())?;
    if old_password_hash
        .as_deref()
        .is_some_and(|existing| existing != password_hash.as_str())
    {
        sqlx::query(
            r#"
            INSERT INTO iam_password_history
                (id, tenant_id, user_id, password_hash, created_at)
            VALUES
                ($1, $2, $3, $4, $5::timestamptz)
            "#,
        )
        .bind(reset_admin_password_history_id(&user_id, &now))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(&user_id)
        .bind(old_password_hash.as_deref().expect("old password hash"))
        .bind(&now)
        .execute(&mut *tx)
        .await?;
    }

    sqlx::query(
        r#"
        INSERT INTO iam_credential
            (id, tenant_id, user_id, credential_type, credential_hash, status, expires_at, created_at, updated_at)
        VALUES
            ($1, $2, $3, 'password', $4, 'active', NULL, $5::timestamptz, $5::timestamptz)
        ON CONFLICT(id) DO UPDATE SET
            tenant_id = excluded.tenant_id,
            user_id = excluded.user_id,
            credential_type = excluded.credential_type,
            credential_hash = excluded.credential_hash,
            status = excluded.status,
            expires_at = excluded.expires_at,
            updated_at = excluded.updated_at
        "#,
    )
    .bind(bootstrap_admin_password_credential_id(&user_id))
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&user_id)
    .bind(&password_hash)
    .bind(&now)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(reset_admin_password_report(options, user_id, password))
}

fn reset_admin_password_report(
    options: &BootstrapAdminOptions,
    user_id: String,
    password: String,
) -> ResetAdminPasswordReport {
    ResetAdminPasswordReport {
        status: "reset".to_owned(),
        tenant_id: DEFAULT_IAM_TENANT_ID.to_owned(),
        organization_id: DEFAULT_IAM_ORGANIZATION_ID.to_owned(),
        user_id,
        username: options.username.clone(),
        display_name: options.display_name.clone(),
        email: options.email.clone(),
        initial_password: password,
        generated_password: options.password.is_none(),
    }
}

fn bootstrap_admin_password_credential_id(user_id: &str) -> String {
    format!("credential-{user_id}-bootstrap-password")
}

fn reset_admin_password_history_id(user_id: &str, now: &str) -> String {
    let sequence = ADMIN_PASSWORD_RESET_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0);
    let suffix = sha256_hex(
        format!("{user_id}:{now}:{nanos}:{sequence}:reset-admin-password-history").as_str(),
    )
    .chars()
    .take(16)
    .collect::<String>();
    format!("password-history-{user_id}-reset-{suffix}")
}

async fn sqlite_default_iam_subject_seed_complete(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    if !product_database_iam_seed_enabled() {
        return Ok(true);
    }
    sqlite_default_iam_seed_complete(pool).await
}

async fn postgres_default_iam_subject_seed_complete(pool: &PgPool) -> Result<bool, sqlx::Error> {
    if !product_database_iam_seed_enabled() {
        return Ok(true);
    }
    postgres_default_iam_seed_complete(pool).await
}

async fn sqlite_commerce_experience_seed_complete(
    pool: &SqlitePool,
) -> Result<bool, DatabaseInstallError> {
    if !crate::infrastructure::sql::membership_seed_compat::sqlite_commerce_experience_seed_complete(pool).await? {
        return Ok(false);
    }
    Ok(sqlite_seed_migration_payload_current(
        pool,
        "commerce-experience",
        CURRENT_SCHEMA_VERSION,
        commerce_experience_seed_manifest().payload_json.as_str(),
    )
    .await?)
}

async fn postgres_commerce_experience_seed_complete(
    pool: &PgPool,
) -> Result<bool, DatabaseInstallError> {
    if !crate::infrastructure::sql::membership_seed_compat::postgres_commerce_experience_seed_complete(pool).await? {
        return Ok(false);
    }
    Ok(postgres_seed_migration_payload_current(
        pool,
        "commerce-experience",
        CURRENT_SCHEMA_VERSION,
        commerce_experience_seed_manifest().payload_json.as_str(),
    )
    .await?)
}

async fn sqlite_bootstrap_admin_seed_complete(
    pool: &SqlitePool,
    username: &str,
) -> Result<bool, sqlx::Error> {
    if !product_database_iam_seed_enabled() {
        return Ok(true);
    }
    let count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM iam_user u
        JOIN iam_organization_membership m
          ON m.tenant_id = u.tenant_id
         AND m.user_id = u.id
         AND m.status = 'active'
        JOIN iam_credential c
          ON c.tenant_id = u.tenant_id
         AND c.user_id = u.id
         AND c.credential_type = 'password'
         AND c.status = 'active'
        WHERE u.tenant_id = ?
          AND u.username = ?
          AND u.status = 'active'
          AND m.organization_id = ?
          AND LOWER(COALESCE(m.membership_kind, '')) = 'admin'
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(username)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .fetch_one(pool)
    .await?;
    Ok(count > 0)
}

async fn postgres_bootstrap_admin_seed_complete(
    pool: &PgPool,
    username: &str,
) -> Result<bool, sqlx::Error> {
    if !product_database_iam_seed_enabled() {
        return Ok(true);
    }
    let count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM iam_user u
        JOIN iam_organization_membership m
          ON m.tenant_id = u.tenant_id
         AND m.user_id = u.id
         AND m.status = 'active'
        JOIN iam_credential c
          ON c.tenant_id = u.tenant_id
         AND c.user_id = u.id
         AND c.credential_type = 'password'
         AND c.status = 'active'
        WHERE u.tenant_id = $1
          AND u.username = $2
          AND u.status = 'active'
          AND m.organization_id = $3
          AND LOWER(COALESCE(m.membership_kind, '')) = 'admin'
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(username)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .fetch_one(pool)
    .await?;
    Ok(count > 0)
}

async fn sqlite_bootstrap_admin_user_id_in_transaction(
    tx: &mut Transaction<'_, Sqlite>,
    username: &str,
) -> Result<Option<String>, sqlx::Error> {
    sqlx::query_scalar(
        r#"
        SELECT id
        FROM iam_user
        WHERE tenant_id = ?
          AND username = ?
        ORDER BY CASE status WHEN 'active' THEN 1 ELSE 0 END DESC,
                 updated_at DESC,
                 id DESC
        LIMIT 1
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(username)
    .fetch_optional(&mut **tx)
    .await
}

async fn postgres_bootstrap_admin_user_id_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    username: &str,
) -> Result<Option<String>, sqlx::Error> {
    sqlx::query_scalar(
        r#"
        SELECT id
        FROM iam_user
        WHERE tenant_id = $1
          AND username = $2
        ORDER BY CASE status WHEN 'active' THEN 1 ELSE 0 END DESC,
                 updated_at DESC,
                 id DESC
        LIMIT 1
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(username)
    .fetch_optional(&mut **tx)
    .await
}

async fn sqlite_bootstrap_admin_has_active_password_credential_in_transaction(
    tx: &mut Transaction<'_, Sqlite>,
    user_id: &str,
) -> Result<bool, sqlx::Error> {
    let count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM iam_credential
        WHERE tenant_id = ?
          AND user_id = ?
          AND credential_type = 'password'
          AND status = 'active'
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(user_id)
    .fetch_one(&mut **tx)
    .await?;
    Ok(count > 0)
}

async fn postgres_bootstrap_admin_has_active_password_credential_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    user_id: &str,
) -> Result<bool, sqlx::Error> {
    let count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM iam_credential
        WHERE tenant_id = $1
          AND user_id = $2
          AND credential_type = 'password'
          AND status = 'active'
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(user_id)
    .fetch_one(&mut **tx)
    .await?;
    Ok(count > 0)
}

async fn sqlite_bootstrap_admin_member_id_in_transaction(
    tx: &mut Transaction<'_, Sqlite>,
    user_id: &str,
) -> Result<Option<String>, sqlx::Error> {
    sqlx::query_scalar(
        r#"
        SELECT id
        FROM iam_organization_membership
        WHERE tenant_id = ?
          AND organization_id = ?
          AND user_id = ?
          AND membership_kind = 'admin'
        LIMIT 1
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .bind(user_id)
    .fetch_optional(&mut **tx)
    .await
}

async fn postgres_bootstrap_admin_member_id_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    user_id: &str,
) -> Result<Option<String>, sqlx::Error> {
    sqlx::query_scalar(
        r#"
        SELECT id
        FROM iam_organization_membership
        WHERE tenant_id = $1
          AND organization_id = $2
          AND user_id = $3
          AND membership_kind = 'admin'
        LIMIT 1
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .bind(user_id)
    .fetch_optional(&mut **tx)
    .await
}

async fn sqlite_bootstrap_admin_email_identity_id_in_transaction(
    tx: &mut Transaction<'_, Sqlite>,
    options: &BootstrapAdminOptions,
) -> Result<Option<String>, sqlx::Error> {
    sqlx::query_scalar(
        r#"
        SELECT id
        FROM iam_user_identity
        WHERE tenant_id = ?
          AND provider = 'email'
          AND subject = ?
        LIMIT 1
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&options.email)
    .fetch_optional(&mut **tx)
    .await
}

async fn postgres_bootstrap_admin_email_identity_id_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    options: &BootstrapAdminOptions,
) -> Result<Option<String>, sqlx::Error> {
    sqlx::query_scalar(
        r#"
        SELECT id
        FROM iam_user_identity
        WHERE tenant_id = $1
          AND provider = 'email'
          AND subject = $2
        LIMIT 1
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&options.email)
    .fetch_optional(&mut **tx)
    .await
}

async fn upsert_sqlite_bootstrap_admin(
    tx: &mut Transaction<'_, Sqlite>,
    options: &BootstrapAdminOptions,
    user_id: &str,
    password_hash: Option<&str>,
    now: &str,
) -> Result<bool, sqlx::Error> {
    let avatar = bootstrap_admin_avatar_resource();
    sqlx::query(
        r#"
        INSERT INTO iam_user
            (id, tenant_id, username, display_name, email, phone, avatar_media_resource_id, avatar_object_blob_id, avatar_resource_snapshot, status, created_at, updated_at)
        VALUES
            (?, ?, ?, ?, ?, '', ?, ?, ?, 'active', ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            tenant_id = excluded.tenant_id,
            username = excluded.username,
            display_name = excluded.display_name,
            email = excluded.email,
            avatar_media_resource_id = excluded.avatar_media_resource_id,
            avatar_object_blob_id = excluded.avatar_object_blob_id,
            avatar_resource_snapshot = excluded.avatar_resource_snapshot,
            status = excluded.status,
            updated_at = excluded.updated_at
        "#,
    )
    .bind(user_id)
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&options.username)
    .bind(&options.display_name)
    .bind(&options.email)
    .bind(media_resource_stable_id(&avatar))
    .bind(media_resource_object_blob_id(&avatar))
    .bind(avatar.to_string())
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await?;

    let member_id = sqlite_bootstrap_admin_member_id_in_transaction(tx, user_id)
        .await?
        .unwrap_or_else(|| format!("member-{user_id}-admin"));
    sqlx::query(
        r#"
        INSERT INTO iam_organization_membership
            (id, tenant_id, organization_id, user_id, membership_kind, display_name, is_primary, status, joined_at, created_at, updated_at)
        VALUES
            (?, ?, ?, ?, 'admin', ?, 1, 'active', ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            tenant_id = excluded.tenant_id,
            organization_id = excluded.organization_id,
            user_id = excluded.user_id,
            membership_kind = excluded.membership_kind,
            display_name = excluded.display_name,
            is_primary = excluded.is_primary,
            status = excluded.status,
            updated_at = excluded.updated_at
        "#,
    )
    .bind(member_id)
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .bind(user_id)
    .bind(&options.display_name)
    .bind(now)
    .bind(now)
    .bind(now)
    .execute(&mut **tx)
    .await?;

    let mut password_written = false;
    if let Some(password_hash) = password_hash {
        sqlx::query(
            r#"
            INSERT INTO iam_credential
                (id, tenant_id, user_id, credential_type, credential_hash, status, expires_at, created_at, updated_at)
            VALUES
                (?, ?, ?, 'password', ?, 'active', NULL, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                tenant_id = excluded.tenant_id,
                user_id = excluded.user_id,
                credential_type = excluded.credential_type,
                credential_hash = excluded.credential_hash,
                status = excluded.status,
                expires_at = excluded.expires_at,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(bootstrap_admin_password_credential_id(user_id))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(user_id)
        .bind(password_hash)
        .bind(now)
        .bind(now)
        .execute(&mut **tx)
        .await?;
        password_written = true;
    }

    let identity_id = sqlite_bootstrap_admin_email_identity_id_in_transaction(tx, options)
        .await?
        .unwrap_or_else(|| format!("identity-{user_id}-bootstrap-email"));
    sqlx::query(
        r#"
        INSERT INTO iam_user_identity
            (id, tenant_id, user_id, provider, subject, email, created_at)
        VALUES
            (?, ?, ?, 'email', ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            tenant_id = excluded.tenant_id,
            user_id = excluded.user_id,
            provider = excluded.provider,
            subject = excluded.subject,
            email = excluded.email
        "#,
    )
    .bind(identity_id)
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(user_id)
    .bind(&options.email)
    .bind(&options.email)
    .bind(now)
    .execute(&mut **tx)
    .await?;
    Ok(password_written)
}

async fn upsert_postgres_bootstrap_admin(
    tx: &mut Transaction<'_, Postgres>,
    options: &BootstrapAdminOptions,
    user_id: &str,
    password_hash: Option<&str>,
    now: &str,
) -> Result<bool, sqlx::Error> {
    let avatar = bootstrap_admin_avatar_resource();
    sqlx::query(
        r#"
        INSERT INTO iam_user
            (id, tenant_id, username, display_name, email, phone, avatar_media_resource_id, avatar_object_blob_id, avatar_resource_snapshot, status, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, '', $6, $7, $8::jsonb, 'active', $9::timestamptz, $9::timestamptz)
        ON CONFLICT(id) DO UPDATE SET
            tenant_id = excluded.tenant_id,
            username = excluded.username,
            display_name = excluded.display_name,
            email = excluded.email,
            avatar_media_resource_id = excluded.avatar_media_resource_id,
            avatar_object_blob_id = excluded.avatar_object_blob_id,
            avatar_resource_snapshot = excluded.avatar_resource_snapshot,
            status = excluded.status,
            updated_at = excluded.updated_at
        "#,
    )
    .bind(user_id)
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&options.username)
    .bind(&options.display_name)
    .bind(&options.email)
    .bind(media_resource_stable_id(&avatar))
    .bind(media_resource_object_blob_id(&avatar))
    .bind(avatar.to_string())
    .bind(now)
    .execute(&mut **tx)
    .await?;

    let member_id = postgres_bootstrap_admin_member_id_in_transaction(tx, user_id)
        .await?
        .unwrap_or_else(|| format!("member-{user_id}-admin"));
    sqlx::query(
        r#"
        INSERT INTO iam_organization_membership
            (id, tenant_id, organization_id, user_id, membership_kind, display_name, is_primary, status, joined_at, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, 'admin', $5, 1, 'active', $6::timestamptz, $6::timestamptz, $6::timestamptz)
        ON CONFLICT(id) DO UPDATE SET
            tenant_id = excluded.tenant_id,
            organization_id = excluded.organization_id,
            user_id = excluded.user_id,
            membership_kind = excluded.membership_kind,
            display_name = excluded.display_name,
            is_primary = excluded.is_primary,
            status = excluded.status,
            updated_at = excluded.updated_at
        "#,
    )
    .bind(member_id)
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .bind(user_id)
    .bind(&options.display_name)
    .bind(now)
    .execute(&mut **tx)
    .await?;

    let mut password_written = false;
    if let Some(password_hash) = password_hash {
        sqlx::query(
            r#"
            INSERT INTO iam_credential
                (id, tenant_id, user_id, credential_type, credential_hash, status, expires_at, created_at, updated_at)
            VALUES
                ($1, $2, $3, 'password', $4, 'active', NULL, $5::timestamptz, $5::timestamptz)
            ON CONFLICT(id) DO UPDATE SET
                tenant_id = excluded.tenant_id,
                user_id = excluded.user_id,
                credential_type = excluded.credential_type,
                credential_hash = excluded.credential_hash,
                status = excluded.status,
                expires_at = excluded.expires_at,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(bootstrap_admin_password_credential_id(user_id))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(user_id)
        .bind(password_hash)
        .bind(now)
        .execute(&mut **tx)
        .await?;
        password_written = true;
    }

    let identity_id = postgres_bootstrap_admin_email_identity_id_in_transaction(tx, options)
        .await?
        .unwrap_or_else(|| format!("identity-{user_id}-bootstrap-email"));
    sqlx::query(
        r#"
        INSERT INTO iam_user_identity
            (id, tenant_id, user_id, provider, subject, email, created_at)
        VALUES
            ($1, $2, $3, 'email', $4, $5, $6::timestamptz)
        ON CONFLICT(id) DO UPDATE SET
            tenant_id = excluded.tenant_id,
            user_id = excluded.user_id,
            provider = excluded.provider,
            subject = excluded.subject,
            email = excluded.email
        "#,
    )
    .bind(identity_id)
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(user_id)
    .bind(&options.email)
    .bind(&options.email)
    .bind(now)
    .execute(&mut **tx)
    .await?;
    Ok(password_written)
}

fn bootstrap_admin_avatar_resource() -> serde_json::Value {
    provider_asset_media_resource("image", "bootstrap-admin-avatar")
}

async fn sqlite_table_exists(pool: &SqlitePool, table_name: &str) -> Result<bool, sqlx::Error> {
    let count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM sqlite_master
        WHERE type = 'table'
          AND name = ?
        "#,
    )
    .bind(table_name)
    .fetch_one(pool)
    .await?;
    Ok(count == 1)
}

async fn postgres_table_exists(pool: &PgPool, table_name: &str) -> Result<bool, sqlx::Error> {
    let count: i64 = sqlx::query_scalar(
        r#"
        SELECT (COUNT(1))::bigint
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name = $1
        "#,
    )
    .bind(table_name)
    .fetch_one(pool)
    .await?;
    Ok(count == 1)
}

async fn repair_sqlite_generated_schema_index_definitions(
    pool: &SqlitePool,
) -> Result<bool, sqlx::Error> {
    let mut changed = false;
    for statement in generated_schema_sqlite_index_statements() {
        changed |= ensure_sqlite_index_statement(pool, statement.as_str()).await?;
    }
    Ok(changed)
}

async fn sqlite_generated_schema_tables_exist(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    let installed_tables = sqlite_string_set(
        pool,
        r#"
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        "#,
    )
    .await?;
    Ok(generated_schema_table_names().is_subset(&installed_tables))
}

async fn sqlite_generated_schema_columns_exist(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    for (table, expected_columns) in generated_schema_sqlite_table_columns() {
        let installed_columns = sqlite_existing_columns(pool, &table).await?;
        let expected_columns = expected_columns
            .iter()
            .map(|column| column.name.to_ascii_lowercase())
            .collect::<BTreeSet<_>>();
        if !expected_columns.is_subset(&installed_columns) {
            return Ok(false);
        }
    }
    Ok(true)
}

async fn postgres_generated_schema_columns_exist(pool: &PgPool) -> Result<bool, sqlx::Error> {
    for (table, expected_columns) in generated_schema_postgres_table_columns() {
        let installed_columns = postgres_existing_columns(pool, &table).await?;
        let expected_columns = expected_columns
            .iter()
            .map(|column| column.name.to_ascii_lowercase())
            .collect::<BTreeSet<_>>();
        if !expected_columns.is_subset(&installed_columns) {
            return Ok(false);
        }
    }
    Ok(true)
}

async fn postgres_generated_schema_tables_exist(pool: &PgPool) -> Result<bool, sqlx::Error> {
    let installed_tables = postgres_string_set(
        pool,
        r#"
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_type = 'BASE TABLE'
        "#,
    )
    .await?;
    Ok(generated_schema_table_names().is_subset(&installed_tables))
}

async fn sqlite_generated_schema_indexes_exist(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    for statement in generated_schema_sqlite_index_statements() {
        if !sqlite_index_statement_matches(pool, statement.as_str()).await? {
            return Ok(false);
        }
    }
    Ok(true)
}

async fn sqlite_appbase_commerce_schema_tables_exist(
    pool: &SqlitePool,
) -> Result<bool, sqlx::Error> {
    let installed_tables = sqlite_string_set(
        pool,
        r#"
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        "#,
    )
    .await?;
    Ok(string_set(commerce_database_tables()).is_subset(&installed_tables))
}

async fn postgres_appbase_commerce_schema_tables_exist(pool: &PgPool) -> Result<bool, sqlx::Error> {
    let installed_tables = postgres_string_set(
        pool,
        r#"
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_type = 'BASE TABLE'
        "#,
    )
    .await?;
    Ok(string_set(commerce_database_tables()).is_subset(&installed_tables))
}

async fn postgres_appbase_commerce_schema_columns_exist(
    pool: &PgPool,
) -> Result<bool, sqlx::Error> {
    for (table, expected_columns) in appbase_commerce_schema_postgres_table_columns() {
        let installed_columns = postgres_existing_columns(pool, &table).await?;
        let expected_columns = expected_columns
            .iter()
            .map(|column| column.name.to_ascii_lowercase())
            .collect::<BTreeSet<_>>();
        if !expected_columns.is_subset(&installed_columns) {
            return Ok(false);
        }
    }
    Ok(true)
}

async fn sqlite_appbase_commerce_schema_indexes_exist(
    pool: &SqlitePool,
) -> Result<bool, sqlx::Error> {
    let installed_indexes = sqlite_string_set(
        pool,
        r#"
        SELECT name
        FROM sqlite_master
        WHERE type = 'index'
        "#,
    )
    .await?;
    Ok(string_set(commerce_database_indexes()).is_subset(&installed_indexes))
}

async fn postgres_appbase_commerce_schema_indexes_exist(
    pool: &PgPool,
) -> Result<bool, sqlx::Error> {
    let installed_indexes = postgres_string_set(
        pool,
        r#"
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = current_schema()
        "#,
    )
    .await?;
    Ok(string_set(commerce_database_indexes()).is_subset(&installed_indexes))
}

async fn sqlite_appbase_iam_oauth_schema_tables_exist(
    pool: &SqlitePool,
) -> Result<bool, sqlx::Error> {
    let installed_tables = sqlite_string_set(
        pool,
        r#"
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        "#,
    )
    .await?;
    Ok(appbase_iam_oauth_table_names().is_subset(&installed_tables))
}

async fn postgres_appbase_iam_oauth_schema_tables_exist(
    pool: &PgPool,
) -> Result<bool, sqlx::Error> {
    let installed_tables = postgres_string_set(
        pool,
        r#"
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_type = 'BASE TABLE'
        "#,
    )
    .await?;
    Ok(appbase_iam_oauth_table_names().is_subset(&installed_tables))
}

async fn sqlite_appbase_iam_oauth_schema_indexes_exist(
    pool: &SqlitePool,
) -> Result<bool, sqlx::Error> {
    let installed_indexes = sqlite_string_set(
        pool,
        r#"
        SELECT name
        FROM sqlite_master
        WHERE type = 'index'
        "#,
    )
    .await?;
    Ok(appbase_iam_oauth_schema_index_names().is_subset(&installed_indexes))
}

async fn postgres_appbase_iam_oauth_schema_indexes_exist(
    pool: &PgPool,
) -> Result<bool, sqlx::Error> {
    let installed_indexes = postgres_string_set(
        pool,
        r#"
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = current_schema()
        "#,
    )
    .await?;
    Ok(appbase_iam_oauth_schema_index_names().is_subset(&installed_indexes))
}

async fn postgres_generated_schema_indexes_exist(pool: &PgPool) -> Result<bool, sqlx::Error> {
    let installed_indexes = postgres_string_set(
        pool,
        r#"
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = current_schema()
        "#,
    )
    .await?;
    Ok(generated_schema_index_names().is_subset(&installed_indexes))
}

async fn sqlite_refresh_schema_needs_prepare(
    pool: &SqlitePool,
    options: &DatabaseInstallOptions,
) -> Result<bool, DatabaseInstallError> {
    if !sqlite_table_exists(pool, "system_installation_state").await? {
        return Ok(true);
    }
    if !sqlite_generated_schema_tables_exist(pool).await? {
        return Ok(true);
    }
    if !sqlite_generated_schema_columns_exist(pool).await? {
        return Ok(true);
    }
    if !sqlite_generated_schema_indexes_exist(pool).await? {
        return Ok(true);
    }
    if !sqlite_appbase_commerce_schema_tables_exist(pool).await? {
        return Ok(true);
    }
    if !sqlite_appbase_commerce_schema_indexes_exist(pool).await? {
        return Ok(true);
    }
    if !sqlite_appbase_iam_foundation_schema_tables_exist(pool).await? {
        return Ok(true);
    }
    if !sqlite_appbase_iam_oauth_schema_tables_exist(pool).await? {
        return Ok(true);
    }
    if !sqlite_appbase_iam_oauth_schema_indexes_exist(pool).await? {
        return Ok(true);
    }
    if !sqlite_sdkwork_models_catalog_module_schema_tables_exist(pool).await? {
        return Ok(true);
    }
    if !sqlite_sdkwork_models_catalog_module_schema_indexes_exist(pool).await? {
        return Ok(true);
    }
    if !sqlite_clawrouter_legacy_projection_schema_tables_exist(pool).await? {
        return Ok(true);
    }
    let Some(row) = sqlx::query(
        r#"
        SELECT schema_version, seed_profile, environment
        FROM system_installation_state
        WHERE id = 1
        "#,
    )
    .fetch_optional(pool)
    .await?
    else {
        return Ok(true);
    };
    Ok(
        row.get::<String, _>("schema_version") != CURRENT_SCHEMA_VERSION
            || row.get::<String, _>("seed_profile") != options.seed_profile
            || row.get::<String, _>("environment") != options.environment,
    )
}

async fn postgres_refresh_schema_needs_prepare(
    pool: &PgPool,
    options: &DatabaseInstallOptions,
) -> Result<bool, DatabaseInstallError> {
    if !postgres_table_exists(pool, "system_installation_state").await? {
        return Ok(true);
    }
    if !postgres_generated_schema_tables_exist(pool).await? {
        return Ok(true);
    }
    if !postgres_generated_schema_columns_exist(pool).await? {
        return Ok(true);
    }
    if !postgres_generated_schema_indexes_exist(pool).await? {
        return Ok(true);
    }
    if !postgres_appbase_commerce_schema_tables_exist(pool).await? {
        return Ok(true);
    }
    if !postgres_appbase_commerce_schema_columns_exist(pool).await? {
        return Ok(true);
    }
    if !postgres_appbase_commerce_schema_indexes_exist(pool).await? {
        return Ok(true);
    }
    if standalone_iam_bootstrap_enabled() {
        if !postgres_appbase_iam_foundation_schema_tables_exist(pool).await? {
            return Ok(true);
        }
        if !postgres_appbase_iam_oauth_schema_tables_exist(pool).await? {
            return Ok(true);
        }
        if !postgres_appbase_iam_oauth_schema_indexes_exist(pool).await? {
            return Ok(true);
        }
    }
    if !postgres_sdkwork_models_catalog_module_schema_tables_exist(pool).await? {
        return Ok(true);
    }
    if !postgres_sdkwork_models_catalog_module_schema_indexes_exist(pool).await? {
        return Ok(true);
    }
    if !postgres_clawrouter_legacy_projection_schema_tables_exist(pool).await? {
        return Ok(true);
    }
    let Some(row) = sqlx::query(
        r#"
        SELECT schema_version, seed_profile, environment
        FROM system_installation_state
        WHERE id = 1
        "#,
    )
    .fetch_optional(pool)
    .await?
    else {
        return Ok(true);
    };
    Ok(
        row.get::<String, _>("schema_version") != CURRENT_SCHEMA_VERSION
            || row.get::<String, _>("seed_profile") != options.seed_profile
            || row.get::<String, _>("environment") != options.environment,
    )
}

async fn sqlite_persisted_models_catalog_root(
    pool: &SqlitePool,
) -> Result<Option<String>, sqlx::Error> {
    if !sqlite_table_exists(pool, "system_installation_state").await? {
        return Ok(None);
    }
    let metadata = sqlx::query_scalar::<_, String>(
        r#"
        SELECT COALESCE(CAST(metadata AS TEXT), '{}')
        FROM system_installation_state
        WHERE id = 1
        "#,
    )
    .fetch_optional(pool)
    .await?;
    Ok(metadata
        .as_deref()
        .and_then(persisted_models_catalog_root_from_metadata))
}

async fn postgres_persisted_models_catalog_root(
    pool: &PgPool,
) -> Result<Option<String>, sqlx::Error> {
    if !postgres_table_exists(pool, "system_installation_state").await? {
        return Ok(None);
    }
    let metadata = sqlx::query_scalar::<_, String>(
        r#"
        SELECT COALESCE(metadata::text, '{}')
        FROM system_installation_state
        WHERE id = 1
        "#,
    )
    .fetch_optional(pool)
    .await?;
    Ok(metadata
        .as_deref()
        .and_then(persisted_models_catalog_root_from_metadata))
}

async fn sqlite_installation_catalog_version(
    pool: &SqlitePool,
) -> Result<Option<String>, sqlx::Error> {
    if !sqlite_table_exists(pool, "system_installation_state").await? {
        return Ok(None);
    }
    sqlx::query_scalar(
        r#"
        SELECT catalog_version
        FROM system_installation_state
        WHERE id = 1
        "#,
    )
    .fetch_optional(pool)
    .await
}

async fn postgres_installation_catalog_version(
    pool: &PgPool,
) -> Result<Option<String>, sqlx::Error> {
    if !postgres_table_exists(pool, "system_installation_state").await? {
        return Ok(None);
    }
    sqlx::query_scalar(
        r#"
        SELECT catalog_version
        FROM system_installation_state
        WHERE id = 1
        "#,
    )
    .fetch_optional(pool)
    .await
}

async fn sqlite_last_catalog_refresh_status(pool: &SqlitePool) -> Result<String, sqlx::Error> {
    if sqlite_table_exists(pool, "ai_model_catalog_sync_run").await? {
        if let Some(row) = sqlx::query(
            r#"
            SELECT run_status, COALESCE(CAST(metadata AS TEXT), '') AS metadata
            FROM ai_model_catalog_sync_run
            ORDER BY started_at DESC, id DESC
            LIMIT 1
            "#,
        )
        .fetch_optional(pool)
        .await?
        {
            let run_status = row.try_get::<i32, _>("run_status").unwrap_or_default();
            let metadata = row.try_get::<String, _>("metadata").unwrap_or_default();
            return Ok(catalog_refresh_status_code(run_status, metadata.as_str()));
        }
    }

    let Some(row) = sqlx::query(
        r#"
        SELECT status, checksum
        FROM system_schema_migration
        WHERE migration_key = 'catalog'
           OR migration_key LIKE 'catalog-refresh-%'
        ORDER BY started_at DESC, id DESC
        LIMIT 1
        "#,
    )
    .fetch_optional(pool)
    .await?
    else {
        return Ok("not_run".to_owned());
    };

    let status = row.try_get::<String, _>("status").unwrap_or_default();
    let checksum = row.try_get::<String, _>("checksum").unwrap_or_default();
    Ok(catalog_refresh_status_from_migration(
        status.as_str(),
        checksum.as_str(),
    ))
}

async fn postgres_last_catalog_refresh_status(pool: &PgPool) -> Result<String, sqlx::Error> {
    if postgres_table_exists(pool, "ai_model_catalog_sync_run").await? {
        if let Some(row) = sqlx::query(
            r#"
            SELECT run_status, COALESCE(metadata::text, '') AS metadata
            FROM ai_model_catalog_sync_run
            ORDER BY started_at DESC, id DESC
            LIMIT 1
            "#,
        )
        .fetch_optional(pool)
        .await?
        {
            let run_status = row.try_get::<i32, _>("run_status").unwrap_or_default();
            let metadata = row.try_get::<String, _>("metadata").unwrap_or_default();
            return Ok(catalog_refresh_status_code(run_status, metadata.as_str()));
        }
    }

    let Some(row) = sqlx::query(
        r#"
        SELECT status, checksum
        FROM system_schema_migration
        WHERE migration_key = 'catalog'
           OR migration_key LIKE 'catalog-refresh-%'
        ORDER BY started_at DESC, id DESC
        LIMIT 1
        "#,
    )
    .fetch_optional(pool)
    .await?
    else {
        return Ok("not_run".to_owned());
    };

    let status = row.try_get::<String, _>("status").unwrap_or_default();
    let checksum = row.try_get::<String, _>("checksum").unwrap_or_default();
    Ok(catalog_refresh_status_from_migration(
        status.as_str(),
        checksum.as_str(),
    ))
}

fn catalog_refresh_status_from_migration(status: &str, checksum: &str) -> String {
    if status == "failed" {
        return "failed".to_owned();
    }
    if catalog_refresh_metadata_is_dry_run(checksum) {
        return "dry_run".to_owned();
    }
    if status == "completed" {
        return "success".to_owned();
    }
    "not_run".to_owned()
}

fn catalog_refresh_status_code(run_status: i32, metadata: &str) -> String {
    if run_status != 1 {
        return "failed".to_owned();
    }
    if catalog_refresh_metadata_is_dry_run(metadata) {
        return "dry_run".to_owned();
    }
    "success".to_owned()
}

fn catalog_refresh_metadata_is_dry_run(metadata: &str) -> bool {
    let Ok(value) = serde_json::from_str::<serde_json::Value>(metadata) else {
        return false;
    };
    value
        .get("dryRun")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false)
        || value
            .get("syncMode")
            .and_then(serde_json::Value::as_str)
            .is_some_and(|mode| mode == "dry_run")
}

async fn sqlite_record_failed_catalog_refresh(
    pool: &SqlitePool,
    options: &CatalogRefreshOptions,
    catalog_root: Option<&str>,
    catalog_version: &str,
    error: &DatabaseInstallError,
) -> Result<(), sqlx::Error> {
    if !sqlite_table_exists(pool, "ai_model_catalog_sync_run").await? {
        return sqlite_record_failed_catalog_refresh_migration(
            pool,
            options,
            catalog_root,
            catalog_version,
            error,
        )
        .await;
    }
    let now = current_utc_timestamp_string();
    let failed = failed_catalog_refresh_row(options, catalog_root, catalog_version, error, &now);
    let id = next_install_runtime_id("ai_model_catalog_sync_run")?;
    sqlx::query(
        r#"
        INSERT INTO ai_model_catalog_sync_run
            (uuid, tenant_id, organization_id, source_type, source_id, source_version, status, metadata, source_code, vendor_code, provider_code, run_status, started_at, finished_at, observed_at, catalog_version, source_hash, observed_model_count, accepted_count, rejected_count, change_summary, error_message_masked, id)
        VALUES
            (?, ?, ?, 'manual_refresh', NULL, 1, 1, ?, ?, 'mixed', NULL, ?, ?, ?, ?, ?, ?, 0, 0, 1, ?, ?, ?)
        "#,
    )
    .bind(&failed.uuid)
    .bind(SYSTEM_REFRESH_TENANT_ID)
    .bind(SYSTEM_REFRESH_ORGANIZATION_ID)
    .bind(&failed.metadata)
    .bind(&failed.source_code)
    .bind(failed.run_status)
    .bind(&failed.started_at)
    .bind(&failed.started_at)
    .bind(&failed.started_at)
    .bind(&failed.catalog_version)
    .bind(&failed.source_hash)
    .bind(&failed.change_summary)
    .bind(&failed.error_message_masked)
    .bind(id)
    .execute(pool)
    .await?;
    Ok(())
}

async fn postgres_record_failed_catalog_refresh(
    pool: &PgPool,
    options: &CatalogRefreshOptions,
    catalog_root: Option<&str>,
    catalog_version: &str,
    error: &DatabaseInstallError,
) -> Result<(), sqlx::Error> {
    if !postgres_table_exists(pool, "ai_model_catalog_sync_run").await? {
        return postgres_record_failed_catalog_refresh_migration(
            pool,
            options,
            catalog_root,
            catalog_version,
            error,
        )
        .await;
    }
    let now = current_utc_timestamp_string();
    let failed = failed_catalog_refresh_row(options, catalog_root, catalog_version, error, &now);
    let id = next_install_runtime_id("ai_model_catalog_sync_run")?;
    sqlx::query(
        r#"
        INSERT INTO ai_model_catalog_sync_run
            (uuid, tenant_id, organization_id, source_type, source_id, source_version, status, metadata, source_code, vendor_code, provider_code, run_status, started_at, finished_at, observed_at, catalog_version, source_hash, observed_model_count, accepted_count, rejected_count, change_summary, error_message_masked, id)
        VALUES
            ($1, $2, $3, 'manual_refresh', NULL, 1, 1, $4::jsonb, $5, 'mixed', NULL, $6, $7::timestamptz, $8::timestamptz, $9::timestamptz, $10, $11, 0, 0, 1, $12::jsonb, $13, $14)
        "#,
    )
    .bind(&failed.uuid)
    .bind(SYSTEM_REFRESH_TENANT_ID)
    .bind(SYSTEM_REFRESH_ORGANIZATION_ID)
    .bind(&failed.metadata)
    .bind(&failed.source_code)
    .bind(failed.run_status)
    .bind(&failed.started_at)
    .bind(&failed.started_at)
    .bind(&failed.started_at)
    .bind(&failed.catalog_version)
    .bind(&failed.source_hash)
    .bind(&failed.change_summary)
    .bind(&failed.error_message_masked)
    .bind(id)
    .execute(pool)
    .await?;
    Ok(())
}

async fn sqlite_record_failed_catalog_refresh_migration(
    pool: &SqlitePool,
    options: &CatalogRefreshOptions,
    catalog_root: Option<&str>,
    catalog_version: &str,
    error: &DatabaseInstallError,
) -> Result<(), sqlx::Error> {
    let now = current_utc_timestamp_string();
    let failed = failed_catalog_refresh_row(options, catalog_root, catalog_version, error, &now);
    let audit_key = format!(
        "catalog-refresh-failed:{}",
        catalog_refresh_id()
    );
    let id = next_install_runtime_id("system schema migration")?;
    sqlx::query(
        r#"
        INSERT INTO system_schema_migration
            (id, migration_key, migration_version, checksum, status, started_at, finished_at, error_message)
        VALUES
            (?, ?, ?, ?, 'failed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
        ON CONFLICT(migration_key) DO UPDATE SET
            migration_version = excluded.migration_version,
            checksum = excluded.checksum,
            status = excluded.status,
            started_at = CURRENT_TIMESTAMP,
            finished_at = CURRENT_TIMESTAMP,
            error_message = excluded.error_message
        "#,
    )
    .bind(id)
    .bind(audit_key)
    .bind(catalog_version)
    .bind(&failed.metadata)
    .bind(&failed.error_message_masked)
    .execute(pool)
    .await?;
    Ok(())
}

async fn postgres_record_failed_catalog_refresh_migration(
    pool: &PgPool,
    options: &CatalogRefreshOptions,
    catalog_root: Option<&str>,
    catalog_version: &str,
    error: &DatabaseInstallError,
) -> Result<(), sqlx::Error> {
    let now = current_utc_timestamp_string();
    let failed = failed_catalog_refresh_row(options, catalog_root, catalog_version, error, &now);
    let audit_key = format!(
        "catalog-refresh-failed:{}",
        catalog_refresh_id()
    );
    let id = next_install_runtime_id("system schema migration")?;
    sqlx::query(
        r#"
        INSERT INTO system_schema_migration
            (id, migration_key, migration_version, checksum, status, started_at, finished_at, error_message)
        VALUES
            ($1, $2, $3, $4, 'failed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $5)
        ON CONFLICT(migration_key) DO UPDATE SET
            migration_version = excluded.migration_version,
            checksum = excluded.checksum,
            status = excluded.status,
            started_at = CURRENT_TIMESTAMP,
            finished_at = CURRENT_TIMESTAMP,
            error_message = excluded.error_message
        "#,
    )
    .bind(id)
    .bind(audit_key)
    .bind(catalog_version)
    .bind(&failed.metadata)
    .bind(&failed.error_message_masked)
    .execute(pool)
    .await?;
    Ok(())
}

struct FailedCatalogRefreshRow {
    uuid: String,
    source_code: String,
    run_status: i32,
    started_at: String,
    catalog_version: String,
    source_hash: String,
    metadata: String,
    change_summary: String,
    error_message_masked: String,
}

fn failed_catalog_refresh_row(
    options: &CatalogRefreshOptions,
    catalog_root: Option<&str>,
    catalog_version: &str,
    error: &DatabaseInstallError,
    now: &str,
) -> FailedCatalogRefreshRow {
    let source_code = normalize_failed_refresh_source_code(&options.source);
    let error_message_masked = truncate_error_message(error.to_string().as_str());
    let source_hash = sha256_hex(
        format!(
            "{}:{}:{}:{}",
            source_code, options.mode, catalog_version, error_message_masked
        )
        .as_str(),
    );
    let uuid = format!(
        "catalog-sync-failed-{}",
        catalog_refresh_id()
    );
    let metadata = serde_json::json!({
        "source": options.source,
        "catalogRoot": catalog_root,
        "requestedCatalogVersion": options.catalog_version,
        "catalogVersion": catalog_version,
        "syncMode": options.mode,
        "vendorCodes": options.vendor_codes,
        "force": options.force,
        "dryRun": options.mode == "dry_run",
        "error": error_message_masked,
    })
    .to_string();
    let change_summary = serde_json::json!({
        "vendors": "failed",
        "models": 0,
        "accepted": 0,
        "rejected": 1,
        "mode": options.mode,
        "vendorCodes": options.vendor_codes,
        "force": options.force,
        "catalogVersion": catalog_version,
        "error": error_message_masked,
    })
    .to_string();

    FailedCatalogRefreshRow {
        uuid,
        source_code,
        run_status: 2,
        started_at: now.to_owned(),
        catalog_version: catalog_version.to_owned(),
        source_hash,
        metadata,
        change_summary,
        error_message_masked,
    }
}

fn normalize_failed_refresh_source_code(source: &str) -> String {
    let normalized = source
        .trim()
        .to_ascii_lowercase()
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || matches!(character, '-' | '_') {
                character
            } else {
                '_'
            }
        })
        .collect::<String>();
    if normalized.is_empty() {
        DEFAULT_CATALOG_REFRESH_SOURCE.to_owned()
    } else {
        normalized.chars().take(96).collect()
    }
}

fn truncate_error_message(message: &str) -> String {
    message.chars().take(1024).collect()
}

async fn sqlite_sdkwork_models_catalog_complete(
    pool: &SqlitePool,
    spec: &CatalogCompletenessSpec,
) -> Result<bool, sqlx::Error> {
    let vendor_codes = sqlite_string_set(
        pool,
        r#"
        SELECT DISTINCT vendor_code
        FROM ai_model_vendor
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .await?;
    let vendor_metadata_keys = sqlite_vendor_metadata_keys(pool).await?;
    let family_keys = sqlite_model_family_keys(pool).await?;
    let catalog_keys = sqlite_string_set(
        pool,
        r#"
        SELECT DISTINCT catalog_key
        FROM ai_model
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .await?;
    let capability_keys = sqlite_model_capability_keys(pool).await?;
    let meter_codes = sqlite_string_set(
        pool,
        r#"
        SELECT DISTINCT meter_code
        FROM ai_billing_meter
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .await?;
    let price_keys = sqlite_model_price_keys(pool).await?;
    let ranking_keys = sqlite_model_ranking_keys(pool).await?;
    let modality_codes = sqlite_string_set(
        pool,
        r#"
        SELECT DISTINCT modality_code
        FROM ai_modality
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .await?;
    let api_endpoint_codes = sqlite_string_set(
        pool,
        r#"
        SELECT DISTINCT endpoint_code
        FROM ai_api_endpoint
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .await?;
    let vendor_modality_keys = sqlite_vendor_modality_keys(pool).await?;
    let vendor_api_endpoint_keys = sqlite_vendor_api_endpoint_keys(pool).await?;
    let modality_api_endpoint_keys = sqlite_modality_api_endpoint_keys(pool).await?;
    let model_modality_keys = sqlite_model_modality_keys(pool).await?;
    let model_api_endpoint_keys = sqlite_model_api_endpoint_keys(pool).await?;
    let ai_resource_codes = sqlite_string_set(
        pool,
        r#"
        SELECT DISTINCT resource_code
        FROM ai_resource
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .await?;

    Ok(spec.vendor_codes.is_subset(&vendor_codes)
        && spec.vendor_metadata_keys.is_subset(&vendor_metadata_keys)
        && spec.family_keys.is_subset(&family_keys)
        && spec.catalog_keys.is_subset(&catalog_keys)
        && spec.capability_keys.is_subset(&capability_keys)
        && spec.meter_codes.is_subset(&meter_codes)
        && spec.price_keys.is_subset(&price_keys)
        && spec.ranking_keys.is_subset(&ranking_keys)
        && spec.modality_codes.is_subset(&modality_codes)
        && spec.api_endpoint_codes.is_subset(&api_endpoint_codes)
        && spec.vendor_modality_keys.is_subset(&vendor_modality_keys)
        && spec
            .vendor_api_endpoint_keys
            .is_subset(&vendor_api_endpoint_keys)
        && spec
            .modality_api_endpoint_keys
            .is_subset(&modality_api_endpoint_keys)
        && spec.model_modality_keys.is_subset(&model_modality_keys)
        && spec
            .model_api_endpoint_keys
            .is_subset(&model_api_endpoint_keys)
        && spec.ai_resource_codes.is_subset(&ai_resource_codes))
}

async fn postgres_sdkwork_models_catalog_complete(
    pool: &PgPool,
    spec: &CatalogCompletenessSpec,
) -> Result<bool, sqlx::Error> {
    let vendor_codes = postgres_string_set(
        pool,
        r#"
        SELECT DISTINCT vendor_code
        FROM ai_model_vendor
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .await?;
    let vendor_metadata_keys = postgres_vendor_metadata_keys(pool).await?;
    let family_keys = postgres_model_family_keys(pool).await?;
    let catalog_keys = postgres_string_set(
        pool,
        r#"
        SELECT DISTINCT catalog_key
        FROM ai_model
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .await?;
    let capability_keys = postgres_model_capability_keys(pool).await?;
    let meter_codes = postgres_string_set(
        pool,
        r#"
        SELECT DISTINCT meter_code
        FROM ai_billing_meter
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .await?;
    let price_keys = postgres_model_price_keys(pool).await?;
    let ranking_keys = postgres_model_ranking_keys(pool).await?;
    let modality_codes = postgres_string_set(
        pool,
        r#"
        SELECT DISTINCT modality_code
        FROM ai_modality
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .await?;
    let api_endpoint_codes = postgres_string_set(
        pool,
        r#"
        SELECT DISTINCT endpoint_code
        FROM ai_api_endpoint
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .await?;
    let vendor_modality_keys = postgres_vendor_modality_keys(pool).await?;
    let vendor_api_endpoint_keys = postgres_vendor_api_endpoint_keys(pool).await?;
    let modality_api_endpoint_keys = postgres_modality_api_endpoint_keys(pool).await?;
    let model_modality_keys = postgres_model_modality_keys(pool).await?;
    let model_api_endpoint_keys = postgres_model_api_endpoint_keys(pool).await?;
    let ai_resource_codes = postgres_string_set(
        pool,
        r#"
        SELECT DISTINCT resource_code
        FROM ai_resource
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .await?;

    Ok(spec.vendor_codes.is_subset(&vendor_codes)
        && spec.vendor_metadata_keys.is_subset(&vendor_metadata_keys)
        && spec.family_keys.is_subset(&family_keys)
        && spec.catalog_keys.is_subset(&catalog_keys)
        && spec.capability_keys.is_subset(&capability_keys)
        && spec.meter_codes.is_subset(&meter_codes)
        && spec.price_keys.is_subset(&price_keys)
        && spec.ranking_keys.is_subset(&ranking_keys)
        && spec.modality_codes.is_subset(&modality_codes)
        && spec.api_endpoint_codes.is_subset(&api_endpoint_codes)
        && spec.vendor_modality_keys.is_subset(&vendor_modality_keys)
        && spec
            .vendor_api_endpoint_keys
            .is_subset(&vendor_api_endpoint_keys)
        && spec
            .modality_api_endpoint_keys
            .is_subset(&modality_api_endpoint_keys)
        && spec.model_modality_keys.is_subset(&model_modality_keys)
        && spec
            .model_api_endpoint_keys
            .is_subset(&model_api_endpoint_keys)
        && spec.ai_resource_codes.is_subset(&ai_resource_codes))
}

async fn sqlite_catalog_migration_payload_current(
    pool: &SqlitePool,
    catalog: &ModelCatalog,
) -> Result<bool, sqlx::Error> {
    let payload = crate::infrastructure::sql::model_catalog_import::catalog_payload(catalog);
    sqlite_seed_migration_payload_current(
        pool,
        "catalog",
        catalog.manifest.catalog_version.as_str(),
        payload.as_str(),
    )
    .await
}

async fn postgres_catalog_migration_payload_current(
    pool: &PgPool,
    catalog: &ModelCatalog,
) -> Result<bool, sqlx::Error> {
    let payload = crate::infrastructure::sql::model_catalog_import::catalog_payload(catalog);
    postgres_seed_migration_payload_current(
        pool,
        "catalog",
        catalog.manifest.catalog_version.as_str(),
        payload.as_str(),
    )
    .await
}

async fn sqlite_string_set(
    pool: &SqlitePool,
    query: &str,
) -> Result<BTreeSet<String>, sqlx::Error> {
    let rows = sqlx::query(query).fetch_all(pool).await?;
    Ok(rows
        .into_iter()
        .filter_map(|row| row.try_get::<String, _>(0).ok())
        .collect())
}

async fn postgres_string_set(pool: &PgPool, query: &str) -> Result<BTreeSet<String>, sqlx::Error> {
    let rows = sqlx::query(query).fetch_all(pool).await?;
    Ok(rows
        .into_iter()
        .filter_map(|row| row.try_get::<String, _>(0).ok())
        .collect())
}

fn canonical_json_text(payload: &str) -> String {
    serde_json::from_str::<serde_json::Value>(payload)
        .map(|value| value.to_string())
        .unwrap_or_else(|_| payload.to_owned())
}

fn string_set(values: Vec<&'static str>) -> BTreeSet<String> {
    values.into_iter().map(str::to_owned).collect()
}

async fn sqlite_vendor_metadata_keys(
    pool: &SqlitePool,
) -> Result<BTreeSet<VendorMetadataCompletenessKey>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT vendor_code, supported_protocols, client_api_compatibility
        FROM ai_model_vendor
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| VendorMetadataCompletenessKey {
            vendor_code: row.try_get::<String, _>("vendor_code").unwrap_or_default(),
            supported_protocols: canonical_json_text(
                &row.try_get::<String, _>("supported_protocols")
                    .unwrap_or_default(),
            ),
            client_api_compatibility: canonical_json_text(
                &row.try_get::<String, _>("client_api_compatibility")
                    .unwrap_or_default(),
            ),
        })
        .collect())
}

async fn postgres_vendor_metadata_keys(
    pool: &PgPool,
) -> Result<BTreeSet<VendorMetadataCompletenessKey>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT
            vendor_code,
            supported_protocols::text AS supported_protocols,
            client_api_compatibility::text AS client_api_compatibility
        FROM ai_model_vendor
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| VendorMetadataCompletenessKey {
            vendor_code: row.try_get::<String, _>("vendor_code").unwrap_or_default(),
            supported_protocols: canonical_json_text(
                &row.try_get::<String, _>("supported_protocols")
                    .unwrap_or_default(),
            ),
            client_api_compatibility: canonical_json_text(
                &row.try_get::<String, _>("client_api_compatibility")
                    .unwrap_or_default(),
            ),
        })
        .collect())
}

async fn sqlite_model_family_keys(
    pool: &SqlitePool,
) -> Result<BTreeSet<ModelFamilyCompletenessKey>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT vendor_code, family_code
        FROM ai_model_family
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| ModelFamilyCompletenessKey {
            vendor_code: row.try_get::<String, _>("vendor_code").unwrap_or_default(),
            family_code: row.try_get::<String, _>("family_code").unwrap_or_default(),
        })
        .collect())
}

async fn postgres_model_family_keys(
    pool: &PgPool,
) -> Result<BTreeSet<ModelFamilyCompletenessKey>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT vendor_code, family_code
        FROM ai_model_family
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| ModelFamilyCompletenessKey {
            vendor_code: row.try_get::<String, _>("vendor_code").unwrap_or_default(),
            family_code: row.try_get::<String, _>("family_code").unwrap_or_default(),
        })
        .collect())
}

async fn sqlite_model_capability_keys(
    pool: &SqlitePool,
) -> Result<BTreeSet<ModelCapabilityCompletenessKey>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT catalog_key, capability, capability_code, modality
        FROM ai_model_capability
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| ModelCapabilityCompletenessKey {
            catalog_key: row.try_get::<String, _>("catalog_key").unwrap_or_default(),
            capability: row.try_get::<i32, _>("capability").unwrap_or_default(),
            capability_code: row
                .try_get::<String, _>("capability_code")
                .unwrap_or_default(),
            modality: row.try_get::<i32, _>("modality").unwrap_or_default(),
        })
        .collect())
}

async fn postgres_model_capability_keys(
    pool: &PgPool,
) -> Result<BTreeSet<ModelCapabilityCompletenessKey>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT catalog_key, capability, capability_code, modality
        FROM ai_model_capability
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| ModelCapabilityCompletenessKey {
            catalog_key: row.try_get::<String, _>("catalog_key").unwrap_or_default(),
            capability: row.try_get::<i32, _>("capability").unwrap_or_default(),
            capability_code: row
                .try_get::<String, _>("capability_code")
                .unwrap_or_default(),
            modality: row.try_get::<i32, _>("modality").unwrap_or_default(),
        })
        .collect())
}

async fn sqlite_model_price_keys(
    pool: &SqlitePool,
) -> Result<BTreeSet<ModelPriceCompletenessKey>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT uuid, catalog_key, region_code, billing_meter_code, price_side, pricing_scope
        FROM ai_model_pricing
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| ModelPriceCompletenessKey {
            uuid: row.try_get::<String, _>("uuid").unwrap_or_default(),
            catalog_key: row.try_get::<String, _>("catalog_key").unwrap_or_default(),
            region_code: row.try_get::<String, _>("region_code").unwrap_or_default(),
            meter_code: row
                .try_get::<String, _>("billing_meter_code")
                .unwrap_or_default(),
            price_side: row.try_get::<i32, _>("price_side").unwrap_or_default(),
            pricing_scope: row.try_get::<i32, _>("pricing_scope").unwrap_or_default(),
        })
        .collect())
}

async fn postgres_model_price_keys(
    pool: &PgPool,
) -> Result<BTreeSet<ModelPriceCompletenessKey>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT uuid, catalog_key, region_code, billing_meter_code, price_side, pricing_scope
        FROM ai_model_pricing
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| ModelPriceCompletenessKey {
            uuid: row.try_get::<String, _>("uuid").unwrap_or_default(),
            catalog_key: row.try_get::<String, _>("catalog_key").unwrap_or_default(),
            region_code: row.try_get::<String, _>("region_code").unwrap_or_default(),
            meter_code: row
                .try_get::<String, _>("billing_meter_code")
                .unwrap_or_default(),
            price_side: row.try_get::<i32, _>("price_side").unwrap_or_default(),
            pricing_scope: row.try_get::<i32, _>("pricing_scope").unwrap_or_default(),
        })
        .collect())
}

async fn sqlite_vendor_modality_keys(
    pool: &SqlitePool,
) -> Result<BTreeSet<VendorModalityCompletenessKey>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT vendor_code, modality_code
        FROM ai_vendor_modality
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| VendorModalityCompletenessKey {
            vendor_code: row.try_get::<String, _>("vendor_code").unwrap_or_default(),
            modality_code: row
                .try_get::<String, _>("modality_code")
                .unwrap_or_default(),
        })
        .collect())
}

async fn postgres_vendor_modality_keys(
    pool: &PgPool,
) -> Result<BTreeSet<VendorModalityCompletenessKey>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT vendor_code, modality_code
        FROM ai_vendor_modality
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| VendorModalityCompletenessKey {
            vendor_code: row.try_get::<String, _>("vendor_code").unwrap_or_default(),
            modality_code: row
                .try_get::<String, _>("modality_code")
                .unwrap_or_default(),
        })
        .collect())
}

async fn sqlite_vendor_api_endpoint_keys(
    pool: &SqlitePool,
) -> Result<BTreeSet<VendorApiEndpointCompletenessKey>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT vendor_code, endpoint_code
        FROM ai_vendor_api_endpoint
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| VendorApiEndpointCompletenessKey {
            vendor_code: row.try_get::<String, _>("vendor_code").unwrap_or_default(),
            endpoint_code: row
                .try_get::<String, _>("endpoint_code")
                .unwrap_or_default(),
        })
        .collect())
}

async fn postgres_vendor_api_endpoint_keys(
    pool: &PgPool,
) -> Result<BTreeSet<VendorApiEndpointCompletenessKey>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT vendor_code, endpoint_code
        FROM ai_vendor_api_endpoint
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| VendorApiEndpointCompletenessKey {
            vendor_code: row.try_get::<String, _>("vendor_code").unwrap_or_default(),
            endpoint_code: row
                .try_get::<String, _>("endpoint_code")
                .unwrap_or_default(),
        })
        .collect())
}

async fn sqlite_modality_api_endpoint_keys(
    pool: &SqlitePool,
) -> Result<BTreeSet<ModalityApiEndpointCompletenessKey>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT modality_code, endpoint_code
        FROM ai_modality_api_endpoint
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| ModalityApiEndpointCompletenessKey {
            modality_code: row
                .try_get::<String, _>("modality_code")
                .unwrap_or_default(),
            endpoint_code: row
                .try_get::<String, _>("endpoint_code")
                .unwrap_or_default(),
        })
        .collect())
}

async fn postgres_modality_api_endpoint_keys(
    pool: &PgPool,
) -> Result<BTreeSet<ModalityApiEndpointCompletenessKey>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT modality_code, endpoint_code
        FROM ai_modality_api_endpoint
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| ModalityApiEndpointCompletenessKey {
            modality_code: row
                .try_get::<String, _>("modality_code")
                .unwrap_or_default(),
            endpoint_code: row
                .try_get::<String, _>("endpoint_code")
                .unwrap_or_default(),
        })
        .collect())
}

async fn sqlite_model_modality_keys(
    pool: &SqlitePool,
) -> Result<BTreeSet<ModelModalityCompletenessKey>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT catalog_key, modality_code, direction
        FROM ai_model_modality
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| ModelModalityCompletenessKey {
            catalog_key: row.try_get::<String, _>("catalog_key").unwrap_or_default(),
            modality_code: row
                .try_get::<String, _>("modality_code")
                .unwrap_or_default(),
            direction: row.try_get::<String, _>("direction").unwrap_or_default(),
        })
        .collect())
}

async fn postgres_model_modality_keys(
    pool: &PgPool,
) -> Result<BTreeSet<ModelModalityCompletenessKey>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT catalog_key, modality_code, direction
        FROM ai_model_modality
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| ModelModalityCompletenessKey {
            catalog_key: row.try_get::<String, _>("catalog_key").unwrap_or_default(),
            modality_code: row
                .try_get::<String, _>("modality_code")
                .unwrap_or_default(),
            direction: row.try_get::<String, _>("direction").unwrap_or_default(),
        })
        .collect())
}

async fn sqlite_model_api_endpoint_keys(
    pool: &SqlitePool,
) -> Result<BTreeSet<ModelApiEndpointCompletenessKey>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT catalog_key, endpoint_code
        FROM ai_model_api_endpoint
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| ModelApiEndpointCompletenessKey {
            catalog_key: row.try_get::<String, _>("catalog_key").unwrap_or_default(),
            endpoint_code: row
                .try_get::<String, _>("endpoint_code")
                .unwrap_or_default(),
        })
        .collect())
}

async fn postgres_model_api_endpoint_keys(
    pool: &PgPool,
) -> Result<BTreeSet<ModelApiEndpointCompletenessKey>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT catalog_key, endpoint_code
        FROM ai_model_api_endpoint
        WHERE status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| ModelApiEndpointCompletenessKey {
            catalog_key: row.try_get::<String, _>("catalog_key").unwrap_or_default(),
            endpoint_code: row
                .try_get::<String, _>("endpoint_code")
                .unwrap_or_default(),
        })
        .collect())
}

async fn sqlite_model_ranking_keys(
    pool: &SqlitePool,
) -> Result<BTreeSet<ModelRankingCompletenessKey>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT CAST(snapshot_date AS TEXT) AS snapshot_date, rank_scope, vendor_code, region_code, catalog_key
        FROM ai_model_rank_snapshot
        WHERE status = 1
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| ModelRankingCompletenessKey {
            snapshot_date: row
                .try_get::<String, _>("snapshot_date")
                .unwrap_or_default(),
            rank_scope: row.try_get::<String, _>("rank_scope").unwrap_or_default(),
            vendor_code: row.try_get::<String, _>("vendor_code").unwrap_or_default(),
            region_code: row.try_get::<String, _>("region_code").unwrap_or_default(),
            catalog_key: row.try_get::<String, _>("catalog_key").unwrap_or_default(),
        })
        .collect())
}

async fn postgres_model_ranking_keys(
    pool: &PgPool,
) -> Result<BTreeSet<ModelRankingCompletenessKey>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT CAST(snapshot_date AS TEXT) AS snapshot_date, rank_scope, vendor_code, region_code, catalog_key
        FROM ai_model_rank_snapshot
        WHERE status = 1
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| ModelRankingCompletenessKey {
            snapshot_date: row
                .try_get::<String, _>("snapshot_date")
                .unwrap_or_default(),
            rank_scope: row.try_get::<String, _>("rank_scope").unwrap_or_default(),
            vendor_code: row.try_get::<String, _>("vendor_code").unwrap_or_default(),
            region_code: row.try_get::<String, _>("region_code").unwrap_or_default(),
            catalog_key: row.try_get::<String, _>("catalog_key").unwrap_or_default(),
        })
        .collect())
}

async fn create_sqlite_system_tables(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    for statement in [
        r#"
        CREATE TABLE IF NOT EXISTS system_installation_state (
            id BIGINT NOT NULL PRIMARY KEY,
            installation_id TEXT NOT NULL,
            environment TEXT NOT NULL,
            database_engine TEXT NOT NULL,
            schema_version TEXT NOT NULL,
            catalog_version TEXT NOT NULL,
            seed_profile TEXT NOT NULL,
            status TEXT NOT NULL,
            installed_at TEXT,
            upgraded_at TEXT,
            last_checked_at TEXT,
            metadata TEXT NOT NULL DEFAULT '{}'
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS system_schema_migration (
            id BIGINT NOT NULL PRIMARY KEY,
            migration_key TEXT NOT NULL UNIQUE,
            migration_version TEXT NOT NULL,
            checksum TEXT NOT NULL,
            status TEXT NOT NULL,
            started_at TEXT NOT NULL,
            finished_at TEXT,
            error_message TEXT
        )
        "#,
        r#"
        CREATE UNIQUE INDEX IF NOT EXISTS uk_system_schema_migration_key
        ON system_schema_migration (migration_key)
        "#,
    ] {
        sqlx::query(statement).execute(pool).await?;
    }
    Ok(())
}

async fn create_postgres_system_tables(pool: &PgPool) -> Result<(), sqlx::Error> {
    for statement in [
        r#"
        CREATE TABLE IF NOT EXISTS system_installation_state (
            id BIGINT NOT NULL PRIMARY KEY,
            installation_id VARCHAR(64) NOT NULL,
            environment VARCHAR(64) NOT NULL,
            database_engine VARCHAR(32) NOT NULL,
            schema_version VARCHAR(64) NOT NULL,
            catalog_version VARCHAR(128) NOT NULL,
            seed_profile VARCHAR(64) NOT NULL,
            status VARCHAR(32) NOT NULL,
            installed_at TIMESTAMPTZ,
            upgraded_at TIMESTAMPTZ,
            last_checked_at TIMESTAMPTZ,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS system_schema_migration (
            id BIGINT NOT NULL PRIMARY KEY,
            migration_key VARCHAR(128) NOT NULL,
            migration_version VARCHAR(128) NOT NULL,
            checksum VARCHAR(128) NOT NULL,
            status VARCHAR(32) NOT NULL,
            started_at TIMESTAMPTZ NOT NULL,
            finished_at TIMESTAMPTZ,
            error_message TEXT
        )
        "#,
        r#"
        CREATE UNIQUE INDEX IF NOT EXISTS uk_system_schema_migration_key
        ON system_schema_migration (migration_key)
        "#,
    ] {
        sqlx::query(statement).execute(pool).await?;
    }
    Ok(())
}

async fn upsert_sqlite_installing_state(
    pool: &SqlitePool,
    options: &DatabaseInstallOptions,
    catalog_version: &str,
) -> Result<(), sqlx::Error> {
    let metadata = installation_metadata(options);
    sqlx::query(
        r#"
        INSERT INTO system_installation_state
            (id, installation_id, environment, database_engine, schema_version, catalog_version, seed_profile, status, installed_at, upgraded_at, metadata)
        VALUES
            (1, 'sdkwork-clawrouter', ?, 'sqlite', ?, ?, ?, 'installing', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
        ON CONFLICT(id) DO UPDATE SET
            environment = excluded.environment,
            schema_version = excluded.schema_version,
            catalog_version = excluded.catalog_version,
            seed_profile = excluded.seed_profile,
            status = excluded.status,
            metadata = excluded.metadata,
            upgraded_at = CURRENT_TIMESTAMP
        "#,
    )
    .bind(&options.environment)
    .bind(CURRENT_SCHEMA_VERSION)
    .bind(catalog_version)
    .bind(&options.seed_profile)
    .bind(&metadata)
    .execute(pool)
    .await?;
    Ok(())
}

async fn upsert_postgres_installing_state(
    pool: &PgPool,
    options: &DatabaseInstallOptions,
    catalog_version: &str,
) -> Result<(), sqlx::Error> {
    let metadata = installation_metadata(options);
    sqlx::query(
        r#"
        INSERT INTO system_installation_state
            (id, installation_id, environment, database_engine, schema_version, catalog_version, seed_profile, status, installed_at, upgraded_at, metadata)
        VALUES
            (1, 'sdkwork-clawrouter', $1, 'postgres', $2, $3, $4, 'installing', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $5::jsonb)
        ON CONFLICT(id) DO UPDATE SET
            environment = excluded.environment,
            schema_version = excluded.schema_version,
            catalog_version = excluded.catalog_version,
            seed_profile = excluded.seed_profile,
            status = excluded.status,
            metadata = excluded.metadata,
            upgraded_at = CURRENT_TIMESTAMP
        "#,
    )
    .bind(&options.environment)
    .bind(CURRENT_SCHEMA_VERSION)
    .bind(catalog_version)
    .bind(&options.seed_profile)
    .bind(&metadata)
    .execute(pool)
    .await?;
    Ok(())
}

async fn mark_sqlite_installed(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE system_installation_state
        SET status = 'installed',
            installed_at = COALESCE(installed_at, CURRENT_TIMESTAMP),
            upgraded_at = CURRENT_TIMESTAMP
        WHERE id = 1
        "#,
    )
    .execute(pool)
    .await?;
    Ok(())
}

async fn mark_sqlite_installed_with_catalog_version(
    pool: &SqlitePool,
    options: &DatabaseInstallOptions,
    catalog_version: &str,
) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    mark_sqlite_installed_with_catalog_version_in_transaction(
        &mut tx,
        options,
        catalog_version,
    )
    .await?;
    tx.commit().await?;
    Ok(())
}

async fn mark_sqlite_installed_with_catalog_version_in_transaction(
    tx: &mut Transaction<'_, Sqlite>,
    options: &DatabaseInstallOptions,
    catalog_version: &str,
) -> Result<(), sqlx::Error> {
    let metadata = installation_metadata(options);
    sqlx::query(
        r#"
        UPDATE system_installation_state
        SET environment = ?,
            schema_version = ?,
            catalog_version = ?,
            seed_profile = ?,
            status = 'installed',
            metadata = ?,
            installed_at = COALESCE(installed_at, CURRENT_TIMESTAMP),
            upgraded_at = CURRENT_TIMESTAMP
        WHERE id = 1
        "#,
    )
    .bind(&options.environment)
    .bind(CURRENT_SCHEMA_VERSION)
    .bind(catalog_version)
    .bind(&options.seed_profile)
    .bind(&metadata)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

async fn mark_postgres_installed(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE system_installation_state
        SET status = 'installed',
            installed_at = COALESCE(installed_at, CURRENT_TIMESTAMP),
            upgraded_at = CURRENT_TIMESTAMP
        WHERE id = 1
        "#,
    )
    .execute(pool)
    .await?;
    Ok(())
}

async fn mark_postgres_installed_with_catalog_version(
    pool: &PgPool,
    options: &DatabaseInstallOptions,
    catalog_version: &str,
) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    mark_postgres_installed_with_catalog_version_in_transaction(
        &mut tx,
        options,
        catalog_version,
    )
    .await?;
    tx.commit().await?;
    Ok(())
}

async fn mark_postgres_installed_with_catalog_version_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    options: &DatabaseInstallOptions,
    catalog_version: &str,
) -> Result<(), sqlx::Error> {
    let metadata = installation_metadata(options);
    sqlx::query(
        r#"
        UPDATE system_installation_state
        SET environment = $1,
            schema_version = $2,
            catalog_version = $3,
            seed_profile = $4,
            status = 'installed',
            metadata = $5::jsonb,
            installed_at = COALESCE(installed_at, CURRENT_TIMESTAMP),
            upgraded_at = CURRENT_TIMESTAMP
        WHERE id = 1
        "#,
    )
    .bind(&options.environment)
    .bind(CURRENT_SCHEMA_VERSION)
    .bind(catalog_version)
    .bind(&options.seed_profile)
    .bind(&metadata)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

async fn record_sqlite_migration_started(
    pool: &SqlitePool,
    key_prefix: &str,
    version: &str,
    payload: &str,
) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    record_sqlite_migration_started_in_transaction(&mut tx, key_prefix, version, payload).await?;
    tx.commit().await?;
    Ok(())
}

async fn record_sqlite_migration_started_in_transaction(
    tx: &mut Transaction<'_, Sqlite>,
    key_prefix: &str,
    version: &str,
    payload: &str,
) -> Result<(), sqlx::Error> {
    let migration_key = migration_key(key_prefix, version);
    let checksum = sha256_hex(payload);
    let id = next_install_runtime_id("system schema migration")?;
    sqlx::query(
        r#"
        INSERT INTO system_schema_migration
            (id, migration_key, migration_version, checksum, status, started_at)
        VALUES
            (?, ?, ?, ?, 'running', CURRENT_TIMESTAMP)
        ON CONFLICT(migration_key) DO UPDATE SET
            migration_version = excluded.migration_version,
            checksum = excluded.checksum,
            status = excluded.status,
            started_at = CURRENT_TIMESTAMP,
            finished_at = NULL,
            error_message = NULL
        "#,
    )
    .bind(id)
    .bind(migration_key)
    .bind(version)
    .bind(checksum)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

async fn record_postgres_migration_started(
    pool: &PgPool,
    key_prefix: &str,
    version: &str,
    payload: &str,
) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    record_postgres_migration_started_in_transaction(&mut tx, key_prefix, version, payload).await?;
    tx.commit().await?;
    Ok(())
}

async fn record_postgres_migration_started_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    key_prefix: &str,
    version: &str,
    payload: &str,
) -> Result<(), sqlx::Error> {
    let migration_key = migration_key(key_prefix, version);
    let checksum = sha256_hex(payload);
    let id = next_install_runtime_id("system schema migration")?;
    sqlx::query(
        r#"
        INSERT INTO system_schema_migration
            (id, migration_key, migration_version, checksum, status, started_at)
        VALUES
            ($1, $2, $3, $4, 'running', CURRENT_TIMESTAMP)
        ON CONFLICT(migration_key) DO UPDATE SET
            migration_version = excluded.migration_version,
            checksum = excluded.checksum,
            status = excluded.status,
            started_at = CURRENT_TIMESTAMP,
            finished_at = NULL,
            error_message = NULL
        "#,
    )
    .bind(id)
    .bind(migration_key)
    .bind(version)
    .bind(checksum)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

async fn record_sqlite_migration_completed(
    pool: &SqlitePool,
    key_prefix: &str,
    version: &str,
    payload: &str,
) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    record_sqlite_migration_completed_in_transaction(&mut tx, key_prefix, version, payload).await?;
    tx.commit().await?;
    Ok(())
}

async fn record_sqlite_migration_completed_in_transaction(
    tx: &mut Transaction<'_, Sqlite>,
    key_prefix: &str,
    version: &str,
    payload: &str,
) -> Result<(), sqlx::Error> {
    let migration_key = migration_key(key_prefix, version);
    let checksum = sha256_hex(payload);
    sqlx::query(
        r#"
        UPDATE system_schema_migration
        SET checksum = ?,
            status = 'completed',
            finished_at = CURRENT_TIMESTAMP,
            error_message = NULL
        WHERE migration_key = ?
        "#,
    )
    .bind(checksum)
    .bind(migration_key)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

async fn record_postgres_migration_completed(
    pool: &PgPool,
    key_prefix: &str,
    version: &str,
    payload: &str,
) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    record_postgres_migration_completed_in_transaction(&mut tx, key_prefix, version, payload)
        .await?;
    tx.commit().await?;
    Ok(())
}

async fn record_postgres_migration_completed_in_transaction(
    tx: &mut Transaction<'_, Postgres>,
    key_prefix: &str,
    version: &str,
    payload: &str,
) -> Result<(), sqlx::Error> {
    let migration_key = migration_key(key_prefix, version);
    let checksum = sha256_hex(payload);
    sqlx::query(
        r#"
        UPDATE system_schema_migration
        SET checksum = $1,
            status = 'completed',
            finished_at = CURRENT_TIMESTAMP,
            error_message = NULL
        WHERE migration_key = $2
        "#,
    )
    .bind(checksum)
    .bind(migration_key)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

async fn sqlite_seed_migration_payload_current(
    pool: &SqlitePool,
    key_prefix: &str,
    version: &str,
    payload: &str,
) -> Result<bool, sqlx::Error> {
    let expected_checksum = sha256_hex(payload);
    let migration_key = migration_key(key_prefix, version);
    let row = sqlx::query(
        r#"
        SELECT checksum, status
        FROM system_schema_migration
        WHERE migration_key = ?
        "#,
    )
    .bind(migration_key)
    .fetch_optional(pool)
    .await?;
    Ok(row
        .map(|row| {
            row.get::<String, _>("checksum") == expected_checksum
                && row.get::<String, _>("status") == "completed"
        })
        .unwrap_or(false))
}

async fn postgres_seed_migration_payload_current(
    pool: &PgPool,
    key_prefix: &str,
    version: &str,
    payload: &str,
) -> Result<bool, sqlx::Error> {
    let expected_checksum = sha256_hex(payload);
    let migration_key = migration_key(key_prefix, version);
    let row = sqlx::query(
        r#"
        SELECT checksum, status
        FROM system_schema_migration
        WHERE migration_key = $1
        "#,
    )
    .bind(migration_key)
    .fetch_optional(pool)
    .await?;
    Ok(row
        .map(|row| {
            row.get::<String, _>("checksum") == expected_checksum
                && row.get::<String, _>("status") == "completed"
        })
        .unwrap_or(false))
}

fn postgres_schema_statements() -> Vec<String> {
    strip_line_comments(GENERATED_POSTGRES_SCHEMA)
        .split(';')
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
        .map(str::to_owned)
        .collect()
}

fn sqlite_schema_statements() -> Vec<String> {
    strip_line_comments(GENERATED_POSTGRES_SCHEMA)
        .split(';')
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
        .map(postgres_statement_to_sqlite)
        .collect()
}

fn appbase_commerce_postgres_schema_statements() -> Vec<String> {
    strip_line_comments(commerce_initial_migration_sql())
        .split(';')
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
        .map(str::to_owned)
        .collect()
}

fn appbase_commerce_sqlite_schema_statements() -> Vec<String> {
    strip_line_comments(commerce_initial_migration_sqlite())
        .split(';')
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
        .map(str::to_owned)
        .collect()
}

async fn apply_sqlite_appbase_commerce_schema(
    pool: &SqlitePool,
) -> Result<(), DatabaseInstallError> {
    record_sqlite_migration_started(
        pool,
        "appbase-commerce-schema",
        CURRENT_SCHEMA_VERSION,
        commerce_initial_migration_sqlite(),
    )
    .await?;
    for statement in appbase_commerce_sqlite_schema_statements() {
        execute_sqlite_statement(pool, statement.as_str()).await?;
    }
    record_sqlite_migration_completed(
        pool,
        "appbase-commerce-schema",
        CURRENT_SCHEMA_VERSION,
        commerce_initial_migration_sqlite(),
    )
    .await?;
    Ok(())
}

async fn apply_postgres_appbase_commerce_schema(pool: &PgPool) -> Result<(), DatabaseInstallError> {
    record_postgres_migration_started(
        pool,
        "appbase-commerce-schema",
        CURRENT_SCHEMA_VERSION,
        commerce_initial_migration_sql(),
    )
    .await?;
    for statement in appbase_commerce_postgres_schema_statements() {
        execute_postgres_statement(pool, statement.as_str()).await?;
    }
    repair_postgres_appbase_commerce_legacy_constraints(pool).await?;
    record_postgres_migration_completed(
        pool,
        "appbase-commerce-schema",
        CURRENT_SCHEMA_VERSION,
        commerce_initial_migration_sql(),
    )
    .await?;
    Ok(())
}

fn sdkwork_models_catalog_module_postgres_schema_statements() -> Vec<String> {
    strip_line_comments(models_catalog_foundation_migration_sql())
        .split(';')
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
        .map(str::to_owned)
        .collect()
}

fn sdkwork_models_catalog_module_sqlite_schema_statements() -> Vec<String> {
    strip_line_comments(models_catalog_foundation_migration_sqlite())
        .split(';')
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
        .map(str::to_owned)
        .collect()
}

fn sdkwork_models_catalog_module_sqlite_index_statements() -> Vec<String> {
    sdkwork_models_catalog_module_sqlite_schema_statements()
        .into_iter()
        .filter(|statement| create_index_name(statement).is_some())
        .collect()
}

fn sdkwork_models_catalog_module_postgres_index_names() -> BTreeSet<String> {
    sdkwork_models_catalog_module_postgres_schema_statements()
        .iter()
        .filter_map(|statement| create_index_name(statement))
        .collect()
}

async fn sqlite_sdkwork_models_catalog_module_schema_tables_exist(
    pool: &SqlitePool,
) -> Result<bool, sqlx::Error> {
    let installed_tables = sqlite_string_set(
        pool,
        r#"
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        "#,
    )
    .await?;
    Ok(string_set(models_catalog_module_table_names()).is_subset(&installed_tables))
}

async fn postgres_sdkwork_models_catalog_module_schema_tables_exist(
    pool: &PgPool,
) -> Result<bool, sqlx::Error> {
    let installed_tables = postgres_string_set(
        pool,
        r#"
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_type = 'BASE TABLE'
        "#,
    )
    .await?;
    Ok(string_set(models_catalog_module_table_names()).is_subset(&installed_tables))
}

async fn sqlite_sdkwork_models_catalog_module_schema_indexes_exist(
    pool: &SqlitePool,
) -> Result<bool, sqlx::Error> {
    for statement in sdkwork_models_catalog_module_sqlite_index_statements() {
        if !sqlite_index_statement_matches(pool, statement.as_str()).await? {
            return Ok(false);
        }
    }
    Ok(true)
}

async fn postgres_sdkwork_models_catalog_module_schema_indexes_exist(
    pool: &PgPool,
) -> Result<bool, sqlx::Error> {
    let installed_indexes = postgres_string_set(
        pool,
        r#"
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = current_schema()
        "#,
    )
    .await?;
    Ok(sdkwork_models_catalog_module_postgres_index_names().is_subset(&installed_indexes))
}

async fn repair_sqlite_sdkwork_models_catalog_module_index_definitions(
    pool: &SqlitePool,
) -> Result<bool, sqlx::Error> {
    let mut changed = false;
    for statement in sdkwork_models_catalog_module_sqlite_index_statements() {
        changed |= ensure_sqlite_index_statement(pool, statement.as_str()).await?;
    }
    Ok(changed)
}

async fn apply_sqlite_sdkwork_models_catalog_module_schema(
    pool: &SqlitePool,
) -> Result<(), DatabaseInstallError> {
    record_sqlite_migration_started(
        pool,
        "sdkwork-models-catalog-module-schema",
        CURRENT_SCHEMA_VERSION,
        models_catalog_foundation_migration_sqlite(),
    )
    .await?;
    for statement in sdkwork_models_catalog_module_sqlite_schema_statements() {
        execute_sqlite_statement(pool, statement.as_str()).await?;
    }
    record_sqlite_migration_completed(
        pool,
        "sdkwork-models-catalog-module-schema",
        CURRENT_SCHEMA_VERSION,
        models_catalog_foundation_migration_sqlite(),
    )
    .await?;
    Ok(())
}

async fn apply_postgres_sdkwork_models_catalog_module_schema(
    pool: &PgPool,
) -> Result<(), DatabaseInstallError> {
    record_postgres_migration_started(
        pool,
        "sdkwork-models-catalog-module-schema",
        CURRENT_SCHEMA_VERSION,
        models_catalog_foundation_migration_sql(),
    )
    .await?;
    for statement in sdkwork_models_catalog_module_postgres_schema_statements() {
        execute_postgres_statement(pool, statement.as_str()).await?;
    }
    record_postgres_migration_completed(
        pool,
        "sdkwork-models-catalog-module-schema",
        CURRENT_SCHEMA_VERSION,
        models_catalog_foundation_migration_sql(),
    )
    .await?;
    Ok(())
}

fn appbase_iam_foundation_postgres_schema_statements() -> Vec<String> {
    strip_line_comments(iam_baseline_postgres_sql())
        .split(';')
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
        .map(str::to_owned)
        .collect()
}

fn appbase_iam_foundation_sqlite_schema_statements() -> Vec<String> {
    appbase_iam_foundation_postgres_schema_statements()
        .into_iter()
        .map(|statement| postgres_statement_to_sqlite(statement.as_str()))
        .collect()
}

fn appbase_iam_rbac_federation_postgres_schema_statements() -> Vec<String> {
    strip_line_comments(iam_rbac_federation_postgres_sql())
        .split(';')
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
        .map(str::to_owned)
        .collect()
}

fn appbase_iam_rbac_federation_sqlite_schema_statements() -> Vec<String> {
    appbase_iam_rbac_federation_postgres_schema_statements()
        .into_iter()
        .map(|statement| postgres_statement_to_sqlite(statement.as_str()))
        .collect()
}

fn appbase_iam_foundation_table_names() -> BTreeSet<String> {
    iam_database_tables()
        .into_iter()
        .map(str::to_owned)
        .collect()
}

async fn sqlite_appbase_iam_foundation_schema_tables_exist(
    pool: &SqlitePool,
) -> Result<bool, sqlx::Error> {
    let installed_tables = sqlite_string_set(
        pool,
        r#"
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        "#,
    )
    .await?;
    Ok(appbase_iam_foundation_table_names().is_subset(&installed_tables))
}

pub(crate) async fn postgres_appbase_iam_foundation_schema_tables_exist(
    pool: &PgPool,
) -> Result<bool, sqlx::Error> {
    let installed_tables = postgres_string_set(
        pool,
        r#"
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = current_schema()
        "#,
    )
    .await?;
    Ok(appbase_iam_foundation_table_names().is_subset(&installed_tables))
}

async fn apply_sqlite_appbase_iam_foundation_schema(
    pool: &SqlitePool,
) -> Result<(), DatabaseInstallError> {
    record_sqlite_migration_started(
        pool,
        "appbase-iam-foundation-schema",
        CURRENT_SCHEMA_VERSION,
        iam_baseline_postgres_sql(),
    )
    .await?;
    for statement in appbase_iam_foundation_sqlite_schema_statements() {
        execute_sqlite_iam_shared_database_compat_statement(pool, statement.as_str()).await?;
    }
    for statement in appbase_iam_rbac_federation_sqlite_schema_statements() {
        execute_sqlite_iam_shared_database_compat_statement(pool, statement.as_str()).await?;
    }
    record_sqlite_migration_completed(
        pool,
        "appbase-iam-foundation-schema",
        CURRENT_SCHEMA_VERSION,
        iam_baseline_postgres_sql(),
    )
    .await?;
    Ok(())
}

async fn apply_postgres_appbase_iam_foundation_schema(
    pool: &PgPool,
) -> Result<(), DatabaseInstallError> {
    record_postgres_migration_started(
        pool,
        "appbase-iam-foundation-schema",
        CURRENT_SCHEMA_VERSION,
        iam_baseline_postgres_sql(),
    )
    .await?;
    for statement in appbase_iam_foundation_postgres_schema_statements() {
        execute_postgres_statement(pool, statement.as_str()).await?;
    }
    for statement in appbase_iam_rbac_federation_postgres_schema_statements() {
        execute_postgres_statement(pool, statement.as_str()).await?;
    }
    record_postgres_migration_completed(
        pool,
        "appbase-iam-foundation-schema",
        CURRENT_SCHEMA_VERSION,
        iam_baseline_postgres_sql(),
    )
    .await?;
    Ok(())
}

fn clawrouter_legacy_projection_table_names() -> Vec<&'static str> {
    Vec::new()
}

fn clawrouter_legacy_projection_schema_statement(_statement: &str) -> bool {
    false
}

fn clawrouter_legacy_projection_postgres_schema_statements() -> Vec<String> {
    strip_line_comments(CLAWROUTER_LEGACY_PROJECTION_SQL)
        .split(';')
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
        .filter(|statement| clawrouter_legacy_projection_schema_statement(statement))
        .map(str::to_owned)
        .collect()
}

fn clawrouter_legacy_projection_sqlite_schema_statements() -> Vec<String> {
    clawrouter_legacy_projection_postgres_schema_statements()
        .into_iter()
        .map(|statement| postgres_statement_to_sqlite(statement.as_str()))
        .collect()
}

fn gateway_routing_dictionary_table_names() -> Vec<&'static str> {
    vec![
        "ai_api_endpoint",
        "ai_resource",
        "ai_resource_group",
        "ai_resource_group_item",
    ]
}

fn gateway_routing_dictionary_postgres_schema_statements() -> Vec<String> {
    strip_line_comments(GATEWAY_ROUTING_DICTIONARY_SQL)
        .split(';')
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
        .map(str::to_owned)
        .collect()
}

fn gateway_routing_dictionary_sqlite_schema_statements() -> Vec<String> {
    gateway_routing_dictionary_postgres_schema_statements()
        .into_iter()
        .map(|statement| postgres_statement_to_sqlite(statement.as_str()))
        .collect()
}

async fn sqlite_gateway_routing_dictionary_schema_tables_exist(
    pool: &SqlitePool,
) -> Result<bool, sqlx::Error> {
    let installed_tables = sqlite_string_set(
        pool,
        r#"
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        "#,
    )
    .await?;
    Ok(string_set(gateway_routing_dictionary_table_names()).is_subset(&installed_tables))
}

async fn postgres_gateway_routing_dictionary_schema_tables_exist(
    pool: &PgPool,
) -> Result<bool, sqlx::Error> {
    let installed_tables = postgres_string_set(
        pool,
        r#"
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = current_schema()
        "#,
    )
    .await?;
    Ok(string_set(gateway_routing_dictionary_table_names()).is_subset(&installed_tables))
}

async fn apply_sqlite_gateway_routing_dictionary_schema(
    pool: &SqlitePool,
) -> Result<(), DatabaseInstallError> {
    record_sqlite_migration_started(
        pool,
        "gateway-routing-dictionary-schema",
        CURRENT_SCHEMA_VERSION,
        GATEWAY_ROUTING_DICTIONARY_SQL,
    )
    .await?;
    for statement in gateway_routing_dictionary_sqlite_schema_statements() {
        execute_sqlite_statement(pool, statement.as_str()).await?;
    }
    record_sqlite_migration_completed(
        pool,
        "gateway-routing-dictionary-schema",
        CURRENT_SCHEMA_VERSION,
        GATEWAY_ROUTING_DICTIONARY_SQL,
    )
    .await?;
    Ok(())
}

async fn apply_postgres_gateway_routing_dictionary_schema(
    pool: &PgPool,
) -> Result<(), DatabaseInstallError> {
    record_postgres_migration_started(
        pool,
        "gateway-routing-dictionary-schema",
        CURRENT_SCHEMA_VERSION,
        GATEWAY_ROUTING_DICTIONARY_SQL,
    )
    .await?;
    for statement in gateway_routing_dictionary_postgres_schema_statements() {
        execute_postgres_statement(pool, statement.as_str()).await?;
    }
    record_postgres_migration_completed(
        pool,
        "gateway-routing-dictionary-schema",
        CURRENT_SCHEMA_VERSION,
        GATEWAY_ROUTING_DICTIONARY_SQL,
    )
    .await?;
    Ok(())
}

async fn sqlite_clawrouter_legacy_projection_schema_tables_exist(
    pool: &SqlitePool,
) -> Result<bool, sqlx::Error> {
    let installed_tables = sqlite_string_set(
        pool,
        r#"
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        "#,
    )
    .await?;
    Ok(string_set(clawrouter_legacy_projection_table_names()).is_subset(&installed_tables))
}

async fn postgres_clawrouter_legacy_projection_schema_tables_exist(
    pool: &PgPool,
) -> Result<bool, sqlx::Error> {
    let installed_tables = postgres_string_set(
        pool,
        r#"
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = current_schema()
        "#,
    )
    .await?;
    Ok(string_set(clawrouter_legacy_projection_table_names()).is_subset(&installed_tables))
}

async fn apply_sqlite_clawrouter_legacy_projection_schema(
    pool: &SqlitePool,
) -> Result<(), DatabaseInstallError> {
    record_sqlite_migration_started(
        pool,
        "clawrouter-legacy-projection-schema",
        CURRENT_SCHEMA_VERSION,
        CLAWROUTER_LEGACY_PROJECTION_SQL,
    )
    .await?;
    for statement in clawrouter_legacy_projection_sqlite_schema_statements() {
        execute_sqlite_statement(pool, statement.as_str()).await?;
    }
    record_sqlite_migration_completed(
        pool,
        "clawrouter-legacy-projection-schema",
        CURRENT_SCHEMA_VERSION,
        CLAWROUTER_LEGACY_PROJECTION_SQL,
    )
    .await?;
    Ok(())
}

async fn apply_postgres_clawrouter_legacy_projection_schema(
    pool: &PgPool,
) -> Result<(), DatabaseInstallError> {
    record_postgres_migration_started(
        pool,
        "clawrouter-legacy-projection-schema",
        CURRENT_SCHEMA_VERSION,
        CLAWROUTER_LEGACY_PROJECTION_SQL,
    )
    .await?;
    for statement in clawrouter_legacy_projection_postgres_schema_statements() {
        execute_postgres_statement(pool, statement.as_str()).await?;
    }
    record_postgres_migration_completed(
        pool,
        "clawrouter-legacy-projection-schema",
        CURRENT_SCHEMA_VERSION,
        CLAWROUTER_LEGACY_PROJECTION_SQL,
    )
    .await?;
    Ok(())
}

fn clawrouter_runtime_schema_repairs_postgres_statements() -> Vec<String> {
    strip_line_comments(CLAWROUTER_RUNTIME_SCHEMA_REPAIRS_POSTGRES_SQL)
        .split(';')
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
        .map(str::to_owned)
        .collect()
}

fn clawrouter_runtime_schema_repairs_sqlite_statements() -> Vec<String> {
    strip_line_comments(CLAWROUTER_RUNTIME_SCHEMA_REPAIRS_SQLITE_SQL)
        .split(';')
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
        .map(str::to_owned)
        .collect()
}

async fn ensure_postgres_canonical_ai_usage_table_name(
    pool: &PgPool,
) -> Result<bool, DatabaseInstallError> {
    let usage_exists = postgres_table_exists(pool, "ai_usage").await?;
    let fact_exists = postgres_table_exists(pool, "ai_usage_fact").await?;
    if usage_exists || !fact_exists {
        return Ok(false);
    }
    execute_postgres_statement(pool, RENAME_AI_USAGE_FACT_TO_AI_USAGE_POSTGRES_SQL).await?;
    Ok(true)
}

async fn ensure_sqlite_canonical_ai_usage_table_name(
    pool: &SqlitePool,
) -> Result<bool, DatabaseInstallError> {
    let usage_exists = sqlite_table_exists(pool, "ai_usage").await?;
    let fact_exists = sqlite_table_exists(pool, "ai_usage_fact").await?;
    if usage_exists || !fact_exists {
        return Ok(false);
    }
    sqlx::query("ALTER TABLE ai_usage_fact RENAME TO ai_usage")
        .execute(pool)
        .await?;
    Ok(true)
}

async fn postgres_clawrouter_runtime_schema_repairs_needed(
    pool: &PgPool,
) -> Result<bool, DatabaseInstallError> {
    let usage_ready = postgres_table_exists(pool, "ai_usage").await?
        || !postgres_table_exists(pool, "ai_usage_fact").await?;
    let notifications_ready = postgres_table_exists(pool, "ops_notification_message").await?;
    Ok(!usage_ready || !notifications_ready)
}

async fn sqlite_clawrouter_runtime_schema_repairs_needed(
    pool: &SqlitePool,
) -> Result<bool, DatabaseInstallError> {
    let usage_ready = sqlite_table_exists(pool, "ai_usage").await?
        || !sqlite_table_exists(pool, "ai_usage_fact").await?;
    let notifications_ready = sqlite_table_exists(pool, "ops_notification_message").await?;
    Ok(!usage_ready || !notifications_ready)
}

async fn apply_postgres_clawrouter_runtime_schema_repairs(
    pool: &PgPool,
) -> Result<bool, DatabaseInstallError> {
    if !postgres_clawrouter_runtime_schema_repairs_needed(pool).await? {
        return Ok(false);
    }

    let mut changed = ensure_postgres_canonical_ai_usage_table_name(pool).await?;
    if !postgres_table_exists(pool, "ops_notification_message").await? {
        record_postgres_migration_started(
            pool,
            "clawrouter-runtime-schema-repairs",
            CURRENT_SCHEMA_VERSION,
            CLAWROUTER_RUNTIME_SCHEMA_REPAIRS_POSTGRES_SQL,
        )
        .await?;
        for statement in clawrouter_runtime_schema_repairs_postgres_statements() {
            execute_postgres_statement(pool, statement.as_str()).await?;
        }
        record_postgres_migration_completed(
            pool,
            "clawrouter-runtime-schema-repairs",
            CURRENT_SCHEMA_VERSION,
            CLAWROUTER_RUNTIME_SCHEMA_REPAIRS_POSTGRES_SQL,
        )
        .await?;
        changed = true;
    }
    Ok(changed)
}

async fn apply_sqlite_clawrouter_runtime_schema_repairs(
    pool: &SqlitePool,
) -> Result<bool, DatabaseInstallError> {
    if !sqlite_clawrouter_runtime_schema_repairs_needed(pool).await? {
        return Ok(false);
    }

    let mut changed = ensure_sqlite_canonical_ai_usage_table_name(pool).await?;
    if !sqlite_table_exists(pool, "ops_notification_message").await? {
        record_sqlite_migration_started(
            pool,
            "clawrouter-runtime-schema-repairs",
            CURRENT_SCHEMA_VERSION,
            CLAWROUTER_RUNTIME_SCHEMA_REPAIRS_SQLITE_SQL,
        )
        .await?;
        for statement in clawrouter_runtime_schema_repairs_sqlite_statements() {
            execute_sqlite_statement(pool, statement.as_str()).await?;
        }
        record_sqlite_migration_completed(
            pool,
            "clawrouter-runtime-schema-repairs",
            CURRENT_SCHEMA_VERSION,
            CLAWROUTER_RUNTIME_SCHEMA_REPAIRS_SQLITE_SQL,
        )
        .await?;
        changed = true;
    }
    Ok(changed)
}

async fn repair_postgres_appbase_commerce_legacy_constraints(
    pool: &PgPool,
) -> Result<bool, sqlx::Error> {
    let mut changed = false;
    for (table, column, statement) in APPBASE_COMMERCE_LEGACY_NOT_NULL_COLUMN_REPAIRS {
        if !postgres_column_is_not_nullable(pool, table, column).await? {
            continue;
        }
        sqlx::query(statement).execute(pool).await?;
        changed = true;
    }
    Ok(changed)
}

async fn postgres_column_is_not_nullable(
    pool: &PgPool,
    table: &str,
    column: &str,
) -> Result<bool, sqlx::Error> {
    let is_nullable: Option<String> = sqlx::query_scalar(
        r#"
        SELECT is_nullable
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = $1
          AND column_name = $2
        "#,
    )
    .bind(table)
    .bind(column)
    .fetch_optional(pool)
    .await?;
    Ok(is_nullable.as_deref() == Some("NO"))
}

#[cfg(test)]
fn postgres_appbase_commerce_legacy_not_null_constraint_repairs() -> Vec<&'static str> {
    APPBASE_COMMERCE_LEGACY_NOT_NULL_COLUMN_REPAIRS
        .iter()
        .map(|(_, _, statement)| *statement)
        .collect()
}

fn appbase_iam_oauth_postgres_schema_statements() -> Vec<String> {
    strip_line_comments(iam_baseline_postgres_sql())
        .split(';')
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
        .filter(|statement| appbase_iam_oauth_schema_statement(statement))
        .map(str::to_owned)
        .collect()
}

fn appbase_iam_oauth_sqlite_schema_statements() -> Vec<String> {
    strip_line_comments(iam_baseline_postgres_sql())
        .split(';')
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
        .filter(|statement| appbase_iam_oauth_schema_statement(statement))
        .map(postgres_statement_to_sqlite)
        .collect()
}

fn appbase_iam_oauth_schema_statement(statement: &str) -> bool {
    if create_table_name(statement)
        .as_deref()
        .is_some_and(|table| table.starts_with("iam_oauth_"))
    {
        return true;
    }
    let Some(index_name) = create_index_name(statement) else {
        return false;
    };
    index_name.starts_with("idx_iam_oauth_") || index_name.starts_with("uk_iam_oauth_")
}

fn sqlite_iam_shared_database_compat_statement_skippable(error: &sqlx::Error) -> bool {
    let message = error.to_string().to_ascii_lowercase();
    message.contains("does not exist")
        || message.contains("no such table")
        || message.contains("no such column")
}

async fn execute_sqlite_iam_shared_database_compat_statement(
    pool: &SqlitePool,
    statement: &str,
) -> Result<(), DatabaseInstallError> {
    for statement in split_postgres_multi_add_column_alter(statement) {
        execute_sqlite_iam_shared_database_compat_statement_once(pool, statement.as_str()).await?;
    }
    Ok(())
}

async fn execute_sqlite_iam_shared_database_compat_statement_once(
    pool: &SqlitePool,
    statement: &str,
) -> Result<(), DatabaseInstallError> {
    if let Some((table, column, definition)) = parse_add_column_if_not_exists(statement) {
        let existing_columns = sqlite_existing_columns(pool, table).await?;
        if existing_columns.contains(&column.to_ascii_lowercase()) {
            return Ok(());
        }
        let alter = format!(
            "ALTER TABLE {} ADD COLUMN {} {}",
            quote_sqlite_identifier(table),
            quote_sqlite_identifier(column),
            definition
        );
        if let Err(error) = sqlx::query(alter.as_str()).execute(pool).await {
            if sqlite_iam_shared_database_compat_statement_skippable(&error) {
                return Ok(());
            }
            return Err(DatabaseInstallError::Database(error));
        }
        return Ok(());
    }

    if let Err(error) = sqlx::query(statement).execute(pool).await {
        if sqlite_iam_shared_database_compat_statement_skippable(&error) {
            return Ok(());
        }
        return Err(DatabaseInstallError::Database(error));
    }
    Ok(())
}

fn split_postgres_multi_add_column_alter(statement: &str) -> Vec<String> {
    let trimmed = statement.trim().trim_end_matches(';').trim();
    if !trimmed.to_ascii_uppercase().starts_with("ALTER TABLE ") {
        return vec![trimmed.to_string()];
    }

    const ADD_COLUMN_MARKER: &str = "ADD COLUMN IF NOT EXISTS ";
    if trimmed.matches(ADD_COLUMN_MARKER).count() <= 1 {
        return vec![trimmed.to_string()];
    }

    let without_prefix = trimmed
        .strip_prefix("ALTER TABLE ")
        .unwrap_or(trimmed)
        .trim();
    let table_end = without_prefix
        .find(char::is_whitespace)
        .unwrap_or(without_prefix.len());
    let table = without_prefix[..table_end].trim();
    let columns_section = without_prefix[table_end..].trim();

    columns_section
        .split(',')
        .map(str::trim)
        .filter(|part| part.starts_with(ADD_COLUMN_MARKER))
        .map(|part| format!("ALTER TABLE {table} {part}"))
        .collect()
}

fn parse_add_column_if_not_exists(statement: &str) -> Option<(&str, &str, &str)> {
    let statement = statement.trim().trim_end_matches(';');
    let rest = statement.strip_prefix("ALTER TABLE ")?;
    let (table, rest) = rest.split_once(" ADD COLUMN IF NOT EXISTS ")?;
    let column_end = rest.find(' ')?;
    Some((
        table.trim(),
        rest[..column_end].trim(),
        rest[column_end + 1..].trim(),
    ))
}

async fn apply_sqlite_appbase_iam_oauth_schema(
    pool: &SqlitePool,
) -> Result<(), DatabaseInstallError> {
    record_sqlite_migration_started(
        pool,
        "appbase-iam-oauth-schema",
        CURRENT_SCHEMA_VERSION,
        iam_baseline_postgres_sql(),
    )
    .await?;
    for statement in appbase_iam_oauth_sqlite_schema_statements() {
        execute_sqlite_statement(pool, statement.as_str()).await?;
    }
    record_sqlite_migration_completed(
        pool,
        "appbase-iam-oauth-schema",
        CURRENT_SCHEMA_VERSION,
        iam_baseline_postgres_sql(),
    )
    .await?;
    Ok(())
}

async fn apply_postgres_appbase_iam_oauth_schema(
    pool: &PgPool,
) -> Result<(), DatabaseInstallError> {
    record_postgres_migration_started(
        pool,
        "appbase-iam-oauth-schema",
        CURRENT_SCHEMA_VERSION,
        iam_baseline_postgres_sql(),
    )
    .await?;
    for statement in appbase_iam_oauth_postgres_schema_statements() {
        execute_postgres_statement(pool, statement.as_str()).await?;
    }
    record_postgres_migration_completed(
        pool,
        "appbase-iam-oauth-schema",
        CURRENT_SCHEMA_VERSION,
        iam_baseline_postgres_sql(),
    )
    .await?;
    Ok(())
}

fn generated_schema_table_names() -> BTreeSet<String> {
    GENERATED_SCHEMA_TABLE_NAMES
        .get_or_init(|| {
            postgres_schema_statements()
                .into_iter()
                .filter_map(|statement| create_table_name(&statement))
                .collect()
        })
        .clone()
}

fn generated_schema_index_names() -> BTreeSet<String> {
    GENERATED_SCHEMA_INDEX_NAMES
        .get_or_init(|| {
            postgres_schema_statements()
                .into_iter()
                .filter_map(|statement| create_index_name(&statement))
                .collect()
        })
        .clone()
}

fn appbase_iam_oauth_table_names() -> BTreeSet<String> {
    iam_database_tables()
        .into_iter()
        .filter(|table| table.starts_with("iam_oauth_"))
        .map(str::to_owned)
        .collect()
}

fn appbase_iam_oauth_schema_index_names() -> BTreeSet<String> {
    APPBASE_IAM_OAUTH_SCHEMA_INDEX_NAMES
        .get_or_init(|| {
            appbase_iam_oauth_postgres_schema_statements()
                .into_iter()
                .filter_map(|statement| create_index_name(&statement))
                .collect()
        })
        .clone()
}

fn appbase_commerce_schema_postgres_table_columns() -> Vec<(String, Vec<SchemaColumnDefinition>)> {
    APPBASE_COMMERCE_SCHEMA_POSTGRES_TABLE_COLUMNS
        .get_or_init(|| {
            appbase_commerce_postgres_schema_statements()
                .into_iter()
                .filter_map(|statement| {
                    let table = create_table_name(&statement)?;
                    let columns = create_table_columns(&statement);
                    Some((table, columns))
                })
                .collect()
        })
        .clone()
}

fn generated_schema_sqlite_index_statements() -> Vec<String> {
    GENERATED_SCHEMA_SQLITE_INDEX_STATEMENTS
        .get_or_init(|| {
            sqlite_schema_statements()
                .into_iter()
                .filter(|statement| create_index_name(statement).is_some())
                .collect()
        })
        .clone()
}

fn generated_schema_postgres_table_columns() -> Vec<(String, Vec<SchemaColumnDefinition>)> {
    GENERATED_SCHEMA_POSTGRES_TABLE_COLUMNS
        .get_or_init(|| {
            postgres_schema_statements()
                .into_iter()
                .filter_map(|statement| {
                    let table = create_table_name(&statement)?;
                    let columns = create_table_columns(&statement);
                    Some((table, columns))
                })
                .collect()
        })
        .clone()
}

fn generated_schema_sqlite_table_columns() -> Vec<(String, Vec<SqliteColumnDefinition>)> {
    GENERATED_SCHEMA_SQLITE_TABLE_COLUMNS
        .get_or_init(|| {
            sqlite_schema_statements()
                .into_iter()
                .filter_map(|statement| {
                    let table = create_table_name(&statement)?;
                    let columns = sqlite_create_table_columns(&statement);
                    Some((table, columns))
                })
                .collect()
        })
        .clone()
}

fn strip_line_comments(sql: &str) -> String {
    sql.lines()
        .filter(|line| !line.trim_start().starts_with("--"))
        .collect::<Vec<_>>()
        .join("\n")
}

fn postgres_statement_to_sqlite(statement: &str) -> String {
    let had_trailing_semicolon = statement.trim_end().ends_with(';');
    let mut sqlite = statement.replace(
        "id BIGINT NOT NULL PRIMARY KEY",
        "id __SDKWORK_SQLITE_ID_PRIMARY_KEY__",
    );
    sqlite = sqlite.replace(
        "    agent_run_step_id_key VARCHAR(128) GENERATED ALWAYS AS (COALESCE(agent_run_step_id, '')) STORED,\n",
        "",
    );
    sqlite = sqlite.replace(
        "(tenant_id, organization_id, user_id, agent_run_id, usage_type, agent_run_step_id_key)",
        "(tenant_id, organization_id, user_id, agent_run_id, usage_type, COALESCE(agent_run_step_id, ''))",
    );
    sqlite = sqlite.replace("TIMESTAMPTZ", "TEXT");
    sqlite = sqlite.replace("JSONB", "TEXT");
    sqlite = sqlite.replace("BOOLEAN", "INTEGER");
    sqlite = sqlite.replace("BIGINT", "INTEGER");
    sqlite = sqlite.replace(
        "id __SDKWORK_SQLITE_ID_PRIMARY_KEY__",
        "id BIGINT NOT NULL PRIMARY KEY",
    );
    sqlite = sqlite.replace("DEFAULT '{}'::jsonb", "DEFAULT '{}'");
    sqlite = sqlite.replace("'{}'::jsonb", "'{}'");
    sqlite = sqlite.replace("'[]'::jsonb", "'[]'");
    sqlite = sqlite.replace("DEFAULT FALSE", "DEFAULT 0");
    sqlite = sqlite.replace("DEFAULT TRUE", "DEFAULT 1");

    let mut body = sqlite.trim().trim_end_matches(';').to_string();
    if body.to_ascii_uppercase().starts_with("DROP ")
        && body.to_ascii_uppercase().ends_with(" CASCADE")
    {
        body = body[..body.len() - " CASCADE".len()].trim_end().to_string();
    }
    if had_trailing_semicolon {
        body.push(';');
    }
    body
}

fn next_install_runtime_id(context: &str) -> Result<i64, sqlx::Error> {
    next_claw_runtime_id(context).map_err(|error| sqlx::Error::InvalidArgument(error.to_string()))
}

async fn execute_sqlite_statement(pool: &SqlitePool, statement: &str) -> Result<(), sqlx::Error> {
    let statement = statement.trim();
    if statement.is_empty() {
        return Ok(());
    }
    if create_index_name(statement).is_some() {
        ensure_sqlite_index_statement(pool, statement).await?;
        return Ok(());
    }
    sqlx::query(statement).execute(pool).await?;
    ensure_sqlite_table_columns(pool, statement).await?;
    Ok(())
}

async fn ensure_sqlite_index_statement(
    pool: &SqlitePool,
    statement: &str,
) -> Result<bool, sqlx::Error> {
    let Some(index_name) = create_index_name(statement) else {
        return Ok(false);
    };
    let existing_sql: Option<String> = sqlx::query_scalar(
        r#"
        SELECT sql
        FROM sqlite_master
        WHERE type = 'index'
          AND name = ?
        "#,
    )
    .bind(&index_name)
    .fetch_optional(pool)
    .await?;
    let mut changed = existing_sql.is_none();
    if existing_sql
        .as_deref()
        .is_some_and(|sql| !sqlite_index_sql_matches(sql, statement))
    {
        let drop_statement = format!(
            "DROP INDEX IF EXISTS {}",
            quote_sqlite_identifier(&index_name)
        );
        sqlx::query(drop_statement.as_str()).execute(pool).await?;
        changed = true;
    }
    sqlx::query(statement).execute(pool).await?;
    Ok(changed)
}

async fn sqlite_index_statement_matches(
    pool: &SqlitePool,
    statement: &str,
) -> Result<bool, sqlx::Error> {
    let Some(index_name) = create_index_name(statement) else {
        return Ok(true);
    };
    let existing_sql: Option<String> = sqlx::query_scalar(
        r#"
        SELECT sql
        FROM sqlite_master
        WHERE type = 'index'
          AND name = ?
        "#,
    )
    .bind(index_name)
    .fetch_optional(pool)
    .await?;
    Ok(existing_sql
        .as_deref()
        .is_some_and(|sql| sqlite_index_sql_matches(sql, statement)))
}

fn sqlite_index_sql_matches(existing_sql: &str, expected_sql: &str) -> bool {
    normalize_sqlite_index_sql(existing_sql) == normalize_sqlite_index_sql(expected_sql)
}

fn normalize_sqlite_index_sql(sql: &str) -> String {
    sql.trim()
        .trim_end_matches(';')
        .to_ascii_lowercase()
        .replace("create unique index if not exists", "create unique index")
        .replace("create index if not exists", "create index")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

async fn execute_postgres_statement(pool: &PgPool, statement: &str) -> Result<(), sqlx::Error> {
    let statement = statement.trim();
    if statement.is_empty() {
        return Ok(());
    }
    sqlx::query(statement).execute(pool).await?;
    ensure_postgres_table_columns(pool, statement).await?;
    Ok(())
}

async fn ensure_postgres_generated_schema_columns(pool: &PgPool) -> Result<bool, sqlx::Error> {
    let mut changed = false;
    for statement in postgres_schema_statements() {
        changed |= ensure_postgres_table_columns(pool, statement.as_str()).await?;
    }
    Ok(changed)
}

async fn ensure_postgres_table_columns(
    pool: &PgPool,
    statement: &str,
) -> Result<bool, sqlx::Error> {
    let Some(table) = create_table_name(statement) else {
        return Ok(false);
    };
    let columns = create_table_columns(statement);
    if columns.is_empty() {
        return Ok(false);
    }
    let existing_columns = postgres_existing_columns(pool, &table).await?;
    let mut changed = false;
    for column in columns {
        if existing_columns.contains(&column.name.to_ascii_lowercase()) {
            continue;
        }
        let Some(definition) = postgres_add_column_definition(&column) else {
            continue;
        };
        let alter = format!(
            "ALTER TABLE {} ADD COLUMN {}",
            quote_postgres_identifier(&table),
            definition
        );
        sqlx::query(alter.as_str()).execute(pool).await?;
        changed = true;
    }
    Ok(changed)
}

async fn ensure_sqlite_table_columns(
    pool: &SqlitePool,
    statement: &str,
) -> Result<(), sqlx::Error> {
    let Some(table) = create_table_name(statement) else {
        return Ok(());
    };
    let columns = sqlite_create_table_columns(statement);
    if columns.is_empty() {
        return Ok(());
    }
    let existing_columns = sqlite_existing_columns(pool, &table).await?;
    for column in columns {
        if existing_columns.contains(&column.name.to_ascii_lowercase()) {
            continue;
        }
        let Some(definition) = sqlite_add_column_definition(&column) else {
            continue;
        };
        let alter = format!(
            "ALTER TABLE {} ADD COLUMN {}",
            quote_sqlite_identifier(&table),
            definition
        );
        sqlx::query(alter.as_str()).execute(pool).await?;
    }
    Ok(())
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct SqliteColumnDefinition {
    name: String,
    rest: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct SchemaColumnDefinition {
    name: String,
    rest: String,
}

async fn sqlite_existing_columns(
    pool: &SqlitePool,
    table: &str,
) -> Result<std::collections::BTreeSet<String>, sqlx::Error> {
    let pragma = format!("PRAGMA table_info({})", quote_sqlite_identifier(table));
    let rows = sqlx::query(pragma.as_str()).fetch_all(pool).await?;
    Ok(rows
        .into_iter()
        .filter_map(|row| row.try_get::<String, _>("name").ok())
        .map(|name| name.to_ascii_lowercase())
        .collect())
}

async fn postgres_existing_columns(
    pool: &PgPool,
    table: &str,
) -> Result<std::collections::BTreeSet<String>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = $1
        "#,
    )
    .bind(table)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .filter_map(|row| row.try_get::<String, _>("column_name").ok())
        .map(|name| name.to_ascii_lowercase())
        .collect())
}

fn create_table_name(statement: &str) -> Option<String> {
    let statement = statement.trim_start();
    if !statement
        .to_ascii_uppercase()
        .starts_with("CREATE TABLE IF NOT EXISTS ")
    {
        return None;
    }
    let rest = statement["CREATE TABLE IF NOT EXISTS ".len()..].trim_start();
    let table = rest
        .split(|ch: char| ch == '(' || ch.is_whitespace())
        .next()
        .unwrap_or_default()
        .trim_matches('"')
        .trim();
    if table.is_empty() {
        None
    } else {
        Some(table.to_owned())
    }
}

fn create_index_name(statement: &str) -> Option<String> {
    let statement = statement.trim_start();
    let upper = statement.to_ascii_uppercase();
    let rest = if upper.starts_with("CREATE UNIQUE INDEX IF NOT EXISTS ") {
        statement["CREATE UNIQUE INDEX IF NOT EXISTS ".len()..].trim_start()
    } else if upper.starts_with("CREATE INDEX IF NOT EXISTS ") {
        statement["CREATE INDEX IF NOT EXISTS ".len()..].trim_start()
    } else {
        return None;
    };
    let index = rest
        .split_whitespace()
        .next()
        .unwrap_or_default()
        .trim_matches('"')
        .trim();
    if index.is_empty() {
        None
    } else {
        Some(index.to_owned())
    }
}

fn sqlite_create_table_columns(statement: &str) -> Vec<SqliteColumnDefinition> {
    create_table_columns(statement)
        .into_iter()
        .map(|column| SqliteColumnDefinition {
            name: column.name,
            rest: postgres_statement_to_sqlite(column.rest.as_str()),
        })
        .collect()
}

fn create_table_columns(statement: &str) -> Vec<SchemaColumnDefinition> {
    let Some(body) = sqlite_create_table_body(statement) else {
        return Vec::new();
    };
    split_sqlite_table_entries(body)
        .into_iter()
        .filter_map(|entry| schema_column_definition(entry.as_str()))
        .collect()
}

fn sqlite_create_table_body(statement: &str) -> Option<&str> {
    let open = statement.find('(')?;
    let mut depth = 0usize;
    let mut in_single_quote = false;
    let mut chars = statement
        .char_indices()
        .skip_while(|(index, _)| *index < open)
        .peekable();
    while let Some((index, ch)) = chars.next() {
        if ch == '\'' {
            if in_single_quote && chars.peek().is_some_and(|(_, next)| *next == '\'') {
                chars.next();
            } else {
                in_single_quote = !in_single_quote;
            }
            continue;
        }
        if !in_single_quote {
            match ch {
                '(' => depth += 1,
                ')' => {
                    depth = depth.saturating_sub(1);
                    if depth == 0 {
                        return Some(&statement[open + 1..index]);
                    }
                }
                _ => {}
            }
        }
    }
    None
}

fn split_sqlite_table_entries(body: &str) -> Vec<String> {
    let mut entries = Vec::new();
    let mut start = 0usize;
    let mut depth = 0usize;
    let mut in_single_quote = false;
    let mut chars = body.char_indices().peekable();
    while let Some((index, ch)) = chars.next() {
        if ch == '\'' {
            if in_single_quote && chars.peek().is_some_and(|(_, next)| *next == '\'') {
                chars.next();
            } else {
                in_single_quote = !in_single_quote;
            }
            continue;
        }
        if !in_single_quote {
            match ch {
                '(' => depth += 1,
                ')' => depth = depth.saturating_sub(1),
                ',' if depth == 0 => {
                    entries.push(body[start..index].trim().to_owned());
                    start = index + 1;
                }
                _ => {}
            }
        }
    }
    let tail = body[start..].trim();
    if !tail.is_empty() {
        entries.push(tail.to_owned());
    }
    entries
}

fn schema_column_definition(entry: &str) -> Option<SchemaColumnDefinition> {
    let entry = entry.trim();
    if entry.is_empty() {
        return None;
    }
    let first = entry.split_whitespace().next().unwrap_or_default();
    let upper = first.trim_matches('"').to_ascii_uppercase();
    if matches!(
        upper.as_str(),
        "PRIMARY" | "UNIQUE" | "FOREIGN" | "CONSTRAINT" | "CHECK"
    ) {
        return None;
    }
    let name = first.trim_matches('"').to_owned();
    let rest = entry[first.len()..].trim().to_owned();
    if name.is_empty() || rest.is_empty() {
        None
    } else {
        Some(SchemaColumnDefinition { name, rest })
    }
}

fn sqlite_add_column_definition(column: &SqliteColumnDefinition) -> Option<String> {
    let upper = column.rest.to_ascii_uppercase();
    if upper.contains("PRIMARY KEY") || upper.contains("GENERATED ALWAYS") {
        return None;
    }
    let mut rest = column
        .rest
        .replace("DEFAULT CURRENT_TIMESTAMP", "DEFAULT '1970-01-01 00:00:00'");
    let upper = rest.to_ascii_uppercase();
    if upper.contains(" NOT NULL") && !upper.contains(" DEFAULT ") {
        rest.push_str(sqlite_default_for_added_not_null_column(rest.as_str()));
    }
    Some(format!(
        "{} {}",
        quote_sqlite_identifier(&column.name),
        rest.trim()
    ))
}

fn postgres_add_column_definition(column: &SchemaColumnDefinition) -> Option<String> {
    let upper = column.rest.to_ascii_uppercase();
    if upper.contains("PRIMARY KEY") {
        return None;
    }
    let mut rest = column.rest.replace(
        "DEFAULT CURRENT_TIMESTAMP",
        "DEFAULT '1970-01-01 00:00:00+00'",
    );
    let upper = rest.to_ascii_uppercase();
    if upper.contains(" NOT NULL") && !upper.contains(" DEFAULT ") {
        rest.push_str(postgres_default_for_added_not_null_column(rest.as_str()));
    }
    Some(format!(
        "{} {}",
        quote_postgres_identifier(&column.name),
        rest.trim()
    ))
}

fn sqlite_default_for_added_not_null_column(rest: &str) -> &'static str {
    let upper = rest.to_ascii_uppercase();
    if upper.contains("CHAR") || upper.contains("TEXT") {
        " DEFAULT ''"
    } else if upper.contains("JSON") {
        " DEFAULT '{}'"
    } else {
        " DEFAULT 0"
    }
}

fn postgres_default_for_added_not_null_column(rest: &str) -> &'static str {
    let upper = rest.to_ascii_uppercase();
    if upper.contains("CHAR") || upper.contains("TEXT") {
        " DEFAULT ''"
    } else if upper.contains("JSONB") || upper.contains("JSON") {
        " DEFAULT '{}'::jsonb"
    } else if upper.contains("BOOL") {
        " DEFAULT false"
    } else if upper.contains("TIMESTAMP") || upper.contains("TIMESTAMPTZ") {
        " DEFAULT '1970-01-01 00:00:00+00'"
    } else {
        " DEFAULT 0"
    }
}

fn quote_sqlite_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

fn quote_postgres_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

fn migration_key(prefix: &str, version: &str) -> String {
    format!("{prefix}:{version}")
}

fn sha256_hex(payload: &str) -> String {
    let digest = Sha256::digest(payload.as_bytes());
    format!("{digest:x}")
}

/// Generates a unique catalog refresh id.
///
/// Uses UUID v4 via `sdkwork_utils_rust::uuid()` so the id is unique across
/// processes and concurrent refresh attempts without relying on a
/// process-local `AtomicU64` sequence. The previous implementation combined a
/// millisecond timestamp with a process-local counter, which could collide
/// when multiple processes triggered a refresh in the same millisecond.
fn catalog_refresh_id() -> String {
    sdkwork_utils::uuid()
}

fn current_utc_timestamp_string() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0);
    format_unix_timestamp(seconds)
}

fn format_unix_timestamp(seconds: i64) -> String {
    let days = seconds.div_euclid(86_400);
    let seconds_of_day = seconds.rem_euclid(86_400);
    let (year, month, day) = civil_from_days(days);
    let hour = seconds_of_day / 3_600;
    let minute = (seconds_of_day % 3_600) / 60;
    let second = seconds_of_day % 60;
    format!("{year:04}-{month:02}-{day:02}T{hour:02}:{minute:02}:{second:02}Z")
}

fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let days = days + 719_468;
    let era = if days >= 0 { days } else { days - 146_096 } / 146_097;
    let day_of_era = days - era * 146_097;
    let year_of_era =
        (day_of_era - day_of_era / 1_460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let year = year_of_era + era * 400;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_prime = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * month_prime + 2) / 5 + 1;
    let month = month_prime + if month_prime < 10 { 3 } else { -9 };
    let year = year + if month <= 2 { 1 } else { 0 };
    (year, month, day)
}

fn normalize_install_code(value: String, name: &str) -> Result<String, DatabaseInstallError> {
    let value = value.trim().to_ascii_lowercase();
    if value.is_empty() {
        return Err(DatabaseInstallError::InvalidState(format!(
            "{name} must not be blank"
        )));
    }
    if value.len() > 64 {
        return Err(DatabaseInstallError::InvalidState(format!(
            "{name} must be 64 characters or fewer"
        )));
    }
    if !value.chars().all(|character| {
        character.is_ascii_lowercase()
            || character.is_ascii_digit()
            || matches!(character, '-' | '_')
    }) {
        return Err(DatabaseInstallError::InvalidState(format!(
            "{name} may only contain lowercase letters, digits, '-' and '_'"
        )));
    }
    Ok(value)
}

/// Integration-test fixture for stores that still exercise IAM directory SQL against SQLite.
pub async fn ensure_sqlite_integration_iam_fixture(
    pool: &SqlitePool,
) -> Result<(), DatabaseInstallError> {
    if sqlite_table_exists(pool, "iam_user").await? {
        return Ok(());
    }
    apply_sqlite_appbase_iam_foundation_schema(pool).await?;
    apply_sqlite_appbase_iam_oauth_schema(pool).await?;
    import_sqlite_default_iam_seed(pool)
        .await
        .map_err(DatabaseInstallError::Database)?;
    let mut options = BootstrapAdminOptions::default();
    options.password = Some("Integration-Test-Admin-Password-2026!".to_owned());
    bootstrap_sqlite_admin_user(pool, &options).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::*;

    #[test]
    fn catalog_refresh_id_is_unique_uuid_v4_across_calls() {
        let first = catalog_refresh_id();
        let second = catalog_refresh_id();

        assert_ne!(
            first, second,
            "catalog refresh ids must be unique across calls"
        );
        assert_eq!(
            first.len(),
            36,
            "catalog refresh id must be a 36-char UUID v4 string"
        );
        assert_eq!(
            second.len(),
            36,
            "catalog refresh id must be a 36-char UUID v4 string"
        );
        assert_eq!(
            Some(b'4'),
            first.as_bytes().get(14).copied(),
            "catalog refresh id must use UUID v4"
        );
    }

    #[test]
    fn catalog_refresh_snapshot_uuid_fits_model_catalog_sync_run_column() {
        let refresh_id = catalog_refresh_id();
        let sync_run_uuid = format!("catalog-sync-{refresh_id}");
        assert!(
            sync_run_uuid.len() <= 64,
            "sync run uuid must fit VARCHAR(64): len={} value={sync_run_uuid}",
            sync_run_uuid.len()
        );
    }

    #[test]
    fn postgres_add_column_definition_preserves_model_price_region_column() {
        let column = create_table_columns(
            r#"
            CREATE TABLE IF NOT EXISTS ai_model_pricing (
                id BIGINT NOT NULL PRIMARY KEY,
                region_code VARCHAR(64) NOT NULL
            )
            "#,
        )
        .into_iter()
        .find(|column| column.name == "region_code")
        .unwrap();

        assert_eq!(
            "\"region_code\" VARCHAR(64) NOT NULL DEFAULT ''",
            postgres_add_column_definition(&column).unwrap(),
            "Postgres schema repair must make newly added region columns safe for existing model pricing rows"
        );
    }

    #[test]
    fn postgres_add_column_definition_preserves_non_nullable_text_and_integer_defaults() {
        let columns = create_table_columns(
            r#"
            CREATE TABLE IF NOT EXISTS ai_channel_credential (
                id BIGINT NOT NULL PRIMARY KEY,
                credential_type VARCHAR(32) NOT NULL,
                auth_type VARCHAR(64) NOT NULL,
                priority INTEGER NOT NULL DEFAULT 100,
                weight INTEGER NOT NULL DEFAULT 100
            )
            "#,
        )
        .into_iter()
        .filter_map(|column| {
            let definition = postgres_add_column_definition(&column)?;
            (column.name.clone(), definition).into()
        })
        .collect::<BTreeMap<_, _>>();

        assert_eq!(
            "\"credential_type\" VARCHAR(32) NOT NULL DEFAULT ''",
            columns["credential_type"]
        );
        assert_eq!(
            "\"auth_type\" VARCHAR(64) NOT NULL DEFAULT ''",
            columns["auth_type"]
        );
        assert_eq!(
            "\"priority\" INTEGER NOT NULL DEFAULT 100",
            columns["priority"]
        );
        assert_eq!("\"weight\" INTEGER NOT NULL DEFAULT 100", columns["weight"]);
    }

    #[test]
    fn appbase_iam_foundation_schema_includes_core_directory_tables() {
        let statements = super::appbase_iam_foundation_postgres_schema_statements();
        assert!(
            statements
                .iter()
                .any(|statement| statement.contains("CREATE TABLE IF NOT EXISTS iam_organization")),
            "appbase IAM foundation bootstrap must create iam_organization"
        );
        assert!(
            statements
                .iter()
                .any(|statement| statement.contains("CREATE TABLE IF NOT EXISTS iam_user")),
            "appbase IAM foundation bootstrap must create iam_user"
        );
    }

    #[tokio::test]
    async fn sqlite_appbase_iam_foundation_schema_bootstraps_directory_tables() {
        use sqlx::sqlite::SqlitePoolOptions;
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("sqlite memory pool");
        super::create_sqlite_system_tables(&pool)
            .await
            .expect("system tables");
        super::apply_sqlite_appbase_iam_foundation_schema(&pool)
            .await
            .expect("iam foundation bootstrap");
        let table: String = sqlx::query_scalar(
            r#"
            SELECT name
            FROM sqlite_master
            WHERE type = 'table' AND name = 'iam_organization'
            "#,
        )
        .fetch_one(&pool)
        .await
        .expect("iam_organization table");
        assert_eq!("iam_organization", table);
    }

    #[test]
    fn split_postgres_multi_add_column_alter_expands_to_sqlite_safe_statements() {
        let statements = split_postgres_multi_add_column_alter(
            r#"
            ALTER TABLE iam_permission
              ADD COLUMN IF NOT EXISTS module_id TEXT NOT NULL DEFAULT 'legacy',
              ADD COLUMN IF NOT EXISTS domain TEXT NOT NULL DEFAULT 'unknown',
              ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
            "#,
        );

        assert_eq!(3, statements.len());
        assert_eq!(
            "ALTER TABLE iam_permission ADD COLUMN IF NOT EXISTS module_id TEXT NOT NULL DEFAULT 'legacy'",
            statements[0]
        );
        assert_eq!(
            "ALTER TABLE iam_permission ADD COLUMN IF NOT EXISTS domain TEXT NOT NULL DEFAULT 'unknown'",
            statements[1]
        );
        assert_eq!(
            "ALTER TABLE iam_permission ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'",
            statements[2]
        );
    }

    #[tokio::test]
    async fn sqlite_remaining_module_schema_statements_apply_to_memory_database() {
        let pool = sqlx::sqlite::SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("sqlite memory pool");
        for statement in appbase_iam_oauth_sqlite_schema_statements() {
            if let Err(error) = execute_sqlite_statement(&pool, statement.as_str()).await {
                panic!("iam oauth schema statement failed: {error}\n{statement}");
            }
        }
        for statement in sdkwork_models_catalog_module_sqlite_schema_statements() {
            if let Err(error) = execute_sqlite_statement(&pool, statement.as_str()).await {
                panic!("models catalog schema statement failed: {error}\n{statement}");
            }
        }
        for statement in clawrouter_legacy_projection_sqlite_schema_statements() {
            if let Err(error) = execute_sqlite_statement(&pool, statement.as_str()).await {
                panic!("legacy projection schema statement failed: {error}\n{statement}");
            }
        }
    }

    #[tokio::test]
    async fn sqlite_commerce_schema_statements_apply_to_memory_database() {
        let pool = sqlx::sqlite::SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("sqlite memory pool");
        for statement in appbase_commerce_sqlite_schema_statements() {
            if let Err(error) = execute_sqlite_statement(&pool, statement.as_str()).await {
                panic!("commerce schema statement failed: {error}\n{statement}");
            }
        }
    }

    #[tokio::test]
    async fn sqlite_iam_foundation_schema_statements_apply_to_memory_database() {
        let pool = sqlx::sqlite::SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("sqlite memory pool");
        for statement in appbase_iam_foundation_sqlite_schema_statements() {
            if let Err(error) =
                execute_sqlite_iam_shared_database_compat_statement(&pool, statement.as_str()).await
            {
                panic!("iam foundation schema statement failed: {error}\n{statement}");
            }
        }
        for statement in appbase_iam_rbac_federation_sqlite_schema_statements() {
            if let Err(error) =
                execute_sqlite_iam_shared_database_compat_statement(&pool, statement.as_str()).await
            {
                panic!("iam rbac federation schema statement failed: {error}\n{statement}");
            }
        }
    }

    #[tokio::test]
    async fn sqlite_generated_schema_statements_apply_to_memory_database() {
        let pool = sqlx::sqlite::SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("sqlite memory pool");
        for statement in sqlite_schema_statements() {
            if let Err(error) = sqlx::query(statement.as_str()).execute(&pool).await {
                panic!("generated schema statement failed: {error}\n{statement}");
            }
        }
    }

    #[test]
    fn postgres_statement_to_sqlite_strips_drop_cascade_for_sqlite() {
        let sqlite =
            postgres_statement_to_sqlite("DROP TABLE IF EXISTS iam_application_package CASCADE;");

        assert_eq!(
            "DROP TABLE IF EXISTS iam_application_package;", sqlite,
            "SQLite DDL must not retain Postgres-only DROP CASCADE"
        );
    }

    #[test]
    fn postgres_statement_to_sqlite_preserves_explicit_snowflake_primary_key() {
        let sqlite = postgres_statement_to_sqlite(
            r#"
            CREATE TABLE IF NOT EXISTS ai_model_pricing (
                id BIGINT NOT NULL PRIMARY KEY,
                tenant_id BIGINT NOT NULL,
                region_code VARCHAR(64) NOT NULL
            )
            "#,
        );

        assert!(
            sqlite.contains("id BIGINT NOT NULL PRIMARY KEY"),
            "SQLite DDL must preserve explicit Snowflake primary keys"
        );
        let database_auto_id_keyword = ["AUTO", "INCREMENT"].join("");
        assert!(
            !sqlite
                .to_ascii_uppercase()
                .contains(database_auto_id_keyword.as_str()),
            "SQLite DDL must keep runtime id allocation outside the database"
        );
        assert!(
            !sqlite.contains("id INTEGER NOT NULL PRIMARY KEY"),
            "SQLite DDL must not turn Snowflake ids into rowid aliases"
        );
    }

    #[test]
    fn postgres_add_column_definition_keeps_generated_columns_for_runtime_indexes() {
        let column = SchemaColumnDefinition {
            name: "agent_run_step_id_key".to_owned(),
            rest: "VARCHAR(128) GENERATED ALWAYS AS (COALESCE(agent_run_step_id, '')) STORED"
                .to_owned(),
        };

        assert_eq!(
            "\"agent_run_step_id_key\" VARCHAR(128) GENERATED ALWAYS AS (COALESCE(agent_run_step_id, '')) STORED",
            postgres_add_column_definition(&column).unwrap(),
            "Postgres schema repair must restore generated columns required by generated unique indexes"
        );
    }

    #[test]
    fn postgres_appbase_commerce_repair_relaxes_retired_not_null_columns() {
        assert_eq!(
            vec![
                r#"ALTER TABLE "commerce_product_spu" ALTER COLUMN "sales_status" DROP NOT NULL"#,
                r#"ALTER TABLE "commerce_product_sku" ALTER COLUMN "sales_status" DROP NOT NULL"#,
                r#"ALTER TABLE "commerce_product_sku" ALTER COLUMN "delivery_mode" DROP NOT NULL"#,
                r#"ALTER TABLE "commerce_payment_method" ALTER COLUMN "provider" DROP NOT NULL"#,
            ],
            postgres_appbase_commerce_legacy_not_null_constraint_repairs(),
            "Postgres appbase commerce repair must preserve legacy columns while allowing canonical status/fulfillment_type writes"
        );
    }
}
