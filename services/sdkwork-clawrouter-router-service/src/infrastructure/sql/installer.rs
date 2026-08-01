use std::collections::BTreeSet;
use std::error::Error;
use std::fmt::{Display, Formatter};
use std::sync::Arc;

use sdkwork_models::ModelCatalog;
use sdkwork_utils_rust as sdkwork_utils;
use sqlx::{PgPool, Row};

use crate::infrastructure::sql::ai_routing_seed::{
    import_postgres_ai_routing_seed, postgres_ai_routing_seed_complete,
};
use crate::infrastructure::sql::model_catalog_import::{
    catalog_api_endpoint_projections, catalog_authority_keys,
    catalog_modality_api_endpoint_projections, catalog_modality_projections, catalog_scope_counts,
    catalog_scope_vendor_codes, catalog_with_selected_vendors, load_catalog_root_with_pin,
    DEFAULT_CATALOG_REFRESH_SOURCE,
};
use crate::ports::{AdminModelStore, AdminModelSubject, SyncAdminModelCatalogCommand};

/// The database contract version reported by the bootstrap surface.
///
/// Schema history is owned by `sdkwork-database` and is never maintained by
/// this bootstrap component.
pub const CURRENT_SCHEMA_VERSION: &str = env!("CARGO_PKG_VERSION");
pub const DEFAULT_SEED_PROFILE: &str = "standard";
pub const DEFAULT_INSTALL_ENVIRONMENT: &str = "production";
pub const ENV_INSTALL_ENVIRONMENT: &str = "SDKWORK_CLAW_ROUTER_ENVIRONMENT";
pub const ENV_INSTALL_SEED_PROFILE: &str = "SDKWORK_DATABASE_SEED_PROFILE";
pub const ENV_MODELS_CATALOG_ROOT: &str = "SDKWORK_MODELS_CATALOG_ROOT";

const MAX_REFRESH_SOURCE_LEN: usize = 64;
const MAX_REFRESH_MODE_LEN: usize = 64;
const MAX_REFRESH_VENDOR_CODES: usize = 32;
const MAX_REFRESH_VENDOR_CODE_LEN: usize = 64;
const MAX_REFRESH_CATALOG_ROOT_LEN: usize = 512;
const MAX_REFRESH_CATALOG_VERSION_LEN: usize = 128;
const REFRESH_TENANT_ID: i64 = 100_001;
const REFRESH_ORGANIZATION_ID: i64 = 0;
const REFRESH_OPERATOR_ID: i64 = 0;
const REFRESH_OPERATOR_TYPE: i32 = 1;
const DEFAULT_SERVICE_NODE_INSTANCE_CODE: &str = "clawrouter-default-standalone";
const DEFAULT_SERVICE_NODE_SEED_SQL: &str =
    include_str!("../../../../../database/seeds/common/001_bootstrap.sql");

/// Tables read or written by the catalog bootstrap. Their schema is owned by
/// the sdkwork-models database module and must already have been migrated by
/// that module's lifecycle host.
const MODEL_CATALOG_TABLES: &[&str] = &[
    "ai_api_endpoint",
    "ai_billing_meter",
    "ai_model",
    "ai_model_api_endpoint",
    "ai_model_capability",
    "ai_model_family",
    "ai_model_modality",
    "ai_model_pricing",
    "ai_model_rank_snapshot",
    "ai_model_vendor",
    "ai_modality",
    "ai_modality_api_endpoint",
    "ai_resource",
    "ai_resource_group",
    "ai_resource_group_item",
    "ai_vendor_api_endpoint",
    "ai_vendor_modality",
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
        self.models_catalog_root = normalize_refresh_catalog_root(models_catalog_root)?;
        Ok(self)
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
}

/// Idempotent application-data bootstrap.
///
/// This component deliberately has no DDL, schema repair, migration history,
/// or dialect conversion responsibilities. Callers must run the canonical
/// `sdkwork-clawrouter-database-host` lifecycle first.
pub struct DatabaseInstaller {
    pool: PgPool,
    options: DatabaseInstallOptions,
    admin_model_store: Option<Arc<dyn AdminModelStore + Send + Sync>>,
}

impl DatabaseInstaller {
    pub fn for_postgres(pool: PgPool) -> Self {
        Self {
            pool,
            options: DatabaseInstallOptions::commercial(),
            admin_model_store: None,
        }
    }

    pub fn with_admin_model_store(mut self, store: Arc<dyn AdminModelStore + Send + Sync>) -> Self {
        self.admin_model_store = Some(store);
        self
    }

    pub fn with_options(
        mut self,
        options: DatabaseInstallOptions,
    ) -> Result<Self, DatabaseInstallError> {
        self.options = options;
        Ok(self)
    }

    pub fn with_env_options(self) -> Result<Self, DatabaseInstallError> {
        self.with_options(DatabaseInstallOptions::from_env()?)
    }

    pub fn options(&self) -> &DatabaseInstallOptions {
        &self.options
    }

    pub fn seed_profile(&self) -> &str {
        &self.options.seed_profile
    }

    pub fn environment(&self) -> &str {
        &self.options.environment
    }

    pub fn catalog_version(&self) -> Result<String, DatabaseInstallError> {
        Ok(load_install_model_catalog(&self.options)?
            .manifest
            .catalog_version)
    }

    pub fn schema_version(&self) -> &'static str {
        CURRENT_SCHEMA_VERSION
    }

    pub async fn detailed_status(&self) -> Result<InstallationStatus, DatabaseInstallError> {
        self.bootstrap_status(&self.options).await
    }

    pub async fn status(&self) -> Result<InstallationStatus, DatabaseInstallError> {
        self.detailed_status().await
    }

    pub async fn status_report(&self) -> Result<InstallationReport, DatabaseInstallError> {
        self.status_report_with_options(&self.options, false).await
    }

    pub async fn status_report_for_refresh_options(
        &self,
        options: &CatalogRefreshOptions,
    ) -> Result<InstallationReport, DatabaseInstallError> {
        let options = normalize_catalog_refresh_options(options.clone())?;
        let install_options = self.install_options_for_catalog_root(options.catalog_root)?;
        self.status_report_with_options(&install_options, false)
            .await
    }

    pub async fn ensure_bootstrap_data(&self) -> Result<InstallationReport, DatabaseInstallError> {
        let before = self.bootstrap_status(&self.options).await?;
        if before == InstallationStatus::Installed {
            return self.status_report_with_options(&self.options, false).await;
        }
        self.require_application_schema().await?;
        self.require_model_catalog_schema().await?;

        let service_node_changed = self.ensure_default_service_node().await?;

        let refresh_options = CatalogRefreshOptions {
            catalog_root: self.options.models_catalog_root.clone(),
            ..CatalogRefreshOptions::default()
        };
        let refresh = self.refresh_catalog(refresh_options).await?;
        let status = self.bootstrap_status(&self.options).await?;
        if status != InstallationStatus::Installed {
            return Err(DatabaseInstallError::InvalidState(format!(
                "catalog/seed bootstrap did not reach installed state: {status:?}"
            )));
        }
        self.status_report_with_options(&self.options, refresh.synced || service_node_changed)
            .await
    }

    /// Compatibility alias for existing callers. It delegates to the single
    /// bootstrap implementation and never performs schema lifecycle work.
    pub async fn ensure_installed(&self) -> Result<InstallationReport, DatabaseInstallError> {
        self.ensure_bootstrap_data().await
    }

    pub async fn refresh_catalog(
        &self,
        options: CatalogRefreshOptions,
    ) -> Result<CatalogRefreshReport, DatabaseInstallError> {
        self.require_application_schema().await?;
        self.require_model_catalog_schema().await?;
        let options = normalize_catalog_refresh_options(options)?;
        let install_options =
            self.install_options_for_catalog_root(options.catalog_root.clone())?;
        let catalog_root = options
            .catalog_root
            .clone()
            .or_else(|| install_options.models_catalog_root.clone());
        let catalog =
            load_catalog_root_with_pin(catalog_root.as_deref(), options.catalog_version.as_deref())
                .map_err(|error| DatabaseInstallError::InvalidState(error.to_string()))?;
        let catalog = catalog_with_selected_vendors(&catalog, &options.vendor_codes)
            .map_err(|error| DatabaseInstallError::InvalidState(error.to_string()))?;
        let catalog_version = catalog.manifest.catalog_version.clone();
        let vendor_codes = catalog_scope_vendor_codes(&catalog);
        let counts = catalog_scope_counts(&catalog);
        let refresh_id = sdkwork_utils::uuid();
        let command = SyncAdminModelCatalogCommand {
            subject: AdminModelSubject {
                tenant_id: REFRESH_TENANT_ID,
                organization_id: REFRESH_ORGANIZATION_ID,
                operator_id: REFRESH_OPERATOR_ID,
                operator_type: REFRESH_OPERATOR_TYPE,
            },
            snapshot_uuid: refresh_id.clone(),
            audit_log_uuid: format!("audit-catalog-refresh-{refresh_id}"),
            source: options.source,
            mode: options.mode,
            vendor_codes: options.vendor_codes,
            force: options.force,
            catalog_root,
            catalog_version: Some(catalog_version.clone()),
            request_id: format!("catalog-refresh-{refresh_id}"),
            requested_at: sdkwork_utils::format_datetime(sdkwork_utils::now(), None),
        };

        let admin_model_store = self.admin_model_store.as_ref().ok_or_else(|| {
            DatabaseInstallError::InvalidState(
                "model catalog admin store is not configured for database installation".to_owned(),
            )
        })?;
        let item = admin_model_store
            .sync_catalog(command)
            .await
            .map_err(|error| DatabaseInstallError::InvalidState(error.to_string()))?;

        if item.synced {
            import_postgres_ai_routing_seed(&self.pool).await?;
        }

        Ok(CatalogRefreshReport {
            synced: item.synced,
            source: item.source,
            mode: item.mode,
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
        })
    }

    async fn status_report_with_options(
        &self,
        options: &DatabaseInstallOptions,
        changed: bool,
    ) -> Result<InstallationReport, DatabaseInstallError> {
        let status = self.bootstrap_status(options).await?;
        let catalog_version = match load_install_model_catalog(options) {
            Ok(catalog) => catalog.manifest.catalog_version,
            Err(_) if options.models_catalog_root.is_some() => "unavailable".to_owned(),
            Err(error) => return Err(error),
        };
        Ok(InstallationReport {
            last_catalog_refresh_status: bootstrap_status_label(&status).to_owned(),
            status,
            schema_version: CURRENT_SCHEMA_VERSION,
            catalog_version,
            catalog_source: catalog_source(options),
            external_catalog: options.models_catalog_root.is_some(),
            environment: options.environment.clone(),
            seed_profile: options.seed_profile.clone(),
            changed,
        })
    }

    async fn bootstrap_status(
        &self,
        options: &DatabaseInstallOptions,
    ) -> Result<InstallationStatus, DatabaseInstallError> {
        if !self.application_schema_ready().await? {
            return Ok(InstallationStatus::NotInstalled);
        }
        if !self.model_catalog_schema_ready().await? {
            return Ok(InstallationStatus::Incomplete);
        }
        let catalog = match load_install_model_catalog(options) {
            Ok(catalog) => catalog,
            Err(_) if options.models_catalog_root.is_some() => {
                return Ok(InstallationStatus::CatalogUnavailable)
            }
            Err(error) => return Err(error),
        };
        if !self.catalog_complete(&catalog).await? {
            return Ok(InstallationStatus::UpgradeRequired);
        }
        let routing_seed_complete = postgres_ai_routing_seed_complete(&self.pool).await?;
        if !routing_seed_complete {
            return Ok(InstallationStatus::UpgradeRequired);
        }
        if !self.default_service_node_complete().await? {
            return Ok(InstallationStatus::UpgradeRequired);
        }
        Ok(InstallationStatus::Installed)
    }

    async fn ensure_default_service_node(&self) -> Result<bool, DatabaseInstallError> {
        let rows_affected = sqlx::query(DEFAULT_SERVICE_NODE_SEED_SQL)
            .execute(&self.pool)
            .await?
            .rows_affected();
        Ok(rows_affected > 0)
    }

    async fn default_service_node_complete(&self) -> Result<bool, DatabaseInstallError> {
        let count = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM ops_gateway_instance WHERE instance_code = $1 AND deleted_at IS NULL",
        )
        .bind(DEFAULT_SERVICE_NODE_INSTANCE_CODE)
        .fetch_one(&self.pool)
        .await?;
        Ok(count == 1)
    }

    async fn require_application_schema(&self) -> Result<(), DatabaseInstallError> {
        if self.application_schema_ready().await? {
            return Ok(());
        }
        Err(DatabaseInstallError::InvalidState(
            "Claw Router schema is not current; run the explicit sdkwork-clawrouter-database-host lifecycle migrate operation before catalog/seed bootstrap"
                .to_owned(),
        ))
    }

    async fn require_model_catalog_schema(&self) -> Result<(), DatabaseInstallError> {
        if self.model_catalog_schema_ready().await? {
            return Ok(());
        }
        Err(DatabaseInstallError::InvalidState(
            "sdkwork-models schema is not current; migrate its owning database module before Claw Router catalog bootstrap"
                .to_owned(),
        ))
    }

    async fn application_schema_ready(&self) -> Result<bool, DatabaseInstallError> {
        postgres_table_exists(&self.pool, "ai_upstream_supplier")
            .await
            .map_err(DatabaseInstallError::Database)
    }

    async fn model_catalog_schema_ready(&self) -> Result<bool, DatabaseInstallError> {
        for table in MODEL_CATALOG_TABLES {
            let exists = postgres_table_exists(&self.pool, table).await?;
            if !exists {
                return Ok(false);
            }
        }
        Ok(true)
    }

    async fn catalog_complete(&self, catalog: &ModelCatalog) -> Result<bool, DatabaseInstallError> {
        for expectation in catalog_expectations(catalog) {
            let actual =
                postgres_string_values(&self.pool, expectation.table, expectation.column).await?;
            if !expectation.expected.is_subset(&actual) {
                return Ok(false);
            }
        }
        Ok(true)
    }

    fn install_options_for_catalog_root(
        &self,
        catalog_root: Option<String>,
    ) -> Result<DatabaseInstallOptions, DatabaseInstallError> {
        match catalog_root {
            Some(root) => self.options.clone().with_models_catalog_root(Some(root)),
            None => Ok(self.options.clone()),
        }
    }
}

#[derive(Debug)]
pub enum DatabaseInstallError {
    Database(sqlx::Error),
    Catalog(sdkwork_models::CatalogError),
    InvalidState(String),
}

impl Display for DatabaseInstallError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Database(error) => write!(formatter, "database bootstrap failed: {error}"),
            Self::Catalog(error) => write!(formatter, "model catalog load failed: {error}"),
            Self::InvalidState(message) => {
                write!(formatter, "database bootstrap is invalid: {message}")
            }
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

struct CatalogExpectation {
    table: &'static str,
    column: &'static str,
    expected: BTreeSet<String>,
}

fn catalog_expectations(catalog: &ModelCatalog) -> Vec<CatalogExpectation> {
    let keys = catalog_authority_keys(catalog);
    vec![
        expectation("ai_model_vendor", "vendor_code", keys.vendor_codes),
        expectation("ai_model", "catalog_key", keys.catalog_keys),
        expectation("ai_model_family", "uuid", keys.family_uuids),
        expectation("ai_model_capability", "uuid", keys.capability_uuids),
        expectation("ai_model_pricing", "uuid", keys.price_uuids),
        expectation("ai_model_rank_snapshot", "uuid", keys.ranking_uuids),
        expectation("ai_vendor_modality", "uuid", keys.vendor_modality_uuids),
        expectation(
            "ai_vendor_api_endpoint",
            "uuid",
            keys.vendor_api_endpoint_uuids,
        ),
        expectation("ai_model_modality", "uuid", keys.model_modality_uuids),
        expectation(
            "ai_model_api_endpoint",
            "uuid",
            keys.model_api_endpoint_uuids,
        ),
        expectation("ai_resource", "resource_code", keys.ai_resource_codes),
        expectation(
            "ai_billing_meter",
            "meter_code",
            catalog
                .meters
                .iter()
                .map(|meter| meter.meter_code.clone())
                .collect(),
        ),
        expectation(
            "ai_modality",
            "modality_code",
            catalog_modality_projections(catalog)
                .into_iter()
                .map(|item| item.modality_code)
                .collect(),
        ),
        expectation(
            "ai_api_endpoint",
            "endpoint_code",
            catalog_api_endpoint_projections(catalog)
                .into_iter()
                .map(|item| item.endpoint_code)
                .collect(),
        ),
        expectation(
            "ai_modality_api_endpoint",
            "uuid",
            catalog_modality_api_endpoint_projections(catalog)
                .into_iter()
                .map(|item| item.uuid)
                .collect(),
        ),
    ]
}

fn expectation(
    table: &'static str,
    column: &'static str,
    values: Vec<String>,
) -> CatalogExpectation {
    CatalogExpectation {
        table,
        column,
        expected: values.into_iter().collect(),
    }
}

async fn postgres_string_values(
    pool: &PgPool,
    table: &'static str,
    column: &'static str,
) -> Result<BTreeSet<String>, sqlx::Error> {
    let query = format!("SELECT DISTINCT {column} AS value FROM {table}");
    let rows = sqlx::query(sqlx::AssertSqlSafe(query))
        .fetch_all(pool)
        .await?;
    Ok(rows
        .into_iter()
        .filter_map(|row| row.try_get::<String, _>("value").ok())
        .collect())
}

async fn postgres_table_exists(pool: &PgPool, table: &str) -> Result<bool, sqlx::Error> {
    let present: bool = sqlx::query_scalar(
        r#"
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = current_schema()
              AND table_name = $1
        )
        "#,
    )
    .bind(table)
    .fetch_one(pool)
    .await?;
    Ok(present)
}

fn load_install_model_catalog(
    options: &DatabaseInstallOptions,
) -> Result<ModelCatalog, DatabaseInstallError> {
    match options.models_catalog_root.as_deref() {
        Some(root) => Ok(sdkwork_models::load_catalog(root)?),
        None => Ok(sdkwork_models::load_bundled_catalog()?),
    }
}

fn catalog_source(options: &DatabaseInstallOptions) -> String {
    options
        .models_catalog_root
        .clone()
        .unwrap_or_else(|| "bundled".to_owned())
}

fn bootstrap_status_label(status: &InstallationStatus) -> &'static str {
    match status {
        InstallationStatus::Installed => "succeeded",
        InstallationStatus::NotInstalled => "schema_not_ready",
        InstallationStatus::Incomplete => "dependency_schema_not_ready",
        InstallationStatus::UpgradeRequired => "pending",
        InstallationStatus::Corrupt => "invalid",
        InstallationStatus::CatalogUnavailable => "catalog_unavailable",
    }
}

fn normalize_catalog_refresh_options(
    options: CatalogRefreshOptions,
) -> Result<CatalogRefreshOptions, DatabaseInstallError> {
    Ok(CatalogRefreshOptions {
        source: normalize_refresh_source(options.source)?,
        mode: normalize_refresh_mode(options.mode)?,
        vendor_codes: normalize_refresh_vendor_codes(options.vendor_codes)?,
        force: options.force,
        catalog_root: normalize_refresh_catalog_root(options.catalog_root)?,
        catalog_version: normalize_refresh_catalog_version(options.catalog_version)?,
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
    let value = if value.trim().is_empty() {
        "official_refresh".to_owned()
    } else {
        normalize_refresh_token(&value, "mode", MAX_REFRESH_MODE_LEN)?
    };
    if matches!(
        value.as_str(),
        "official_refresh" | "vendor_refresh" | "catalog_version_refresh" | "dry_run"
    ) {
        Ok(value)
    } else {
        Err(DatabaseInstallError::InvalidState(
            "mode must be official_refresh, vendor_refresh, catalog_version_refresh, or dry_run"
                .to_owned(),
        ))
    }
}

fn normalize_refresh_vendor_codes(
    values: Vec<String>,
) -> Result<Vec<String>, DatabaseInstallError> {
    if values.len() > MAX_REFRESH_VENDOR_CODES {
        return Err(DatabaseInstallError::InvalidState(format!(
            "vendorCodes must contain {MAX_REFRESH_VENDOR_CODES} items or fewer"
        )));
    }
    let mut normalized = BTreeSet::new();
    for value in values {
        normalized.insert(normalize_refresh_token(
            &value,
            "vendorCodes",
            MAX_REFRESH_VENDOR_CODE_LEN,
        )?);
    }
    Ok(normalized.into_iter().collect())
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catalog_refresh_validation_is_bounded_and_deterministic() {
        let options = normalize_catalog_refresh_options(CatalogRefreshOptions {
            vendor_codes: vec!["OpenAI".to_owned(), "openai".to_owned()],
            ..CatalogRefreshOptions::default()
        })
        .unwrap();

        assert_eq!(vec!["openai"], options.vendor_codes);
    }

    #[test]
    fn canonical_seed_profile_is_standard() {
        assert_eq!(
            "standard",
            DatabaseInstallOptions::commercial().seed_profile
        );
        assert!(DatabaseInstallOptions::new("test", "commercial").is_err());
    }
}
