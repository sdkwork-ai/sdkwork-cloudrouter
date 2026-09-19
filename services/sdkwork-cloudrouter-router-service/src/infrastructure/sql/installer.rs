use std::collections::BTreeSet;
use std::error::Error;
use std::fmt::{Display, Formatter};
use std::sync::Arc;

use sdkwork_models::ModelCatalog;
use sdkwork_utils_rust as sdkwork_utils;
use sqlx::{PgPool, Row};

use crate::application::UpstreamCredentialSecretCodec;
use crate::domain::DomainError;
use crate::infrastructure::sql::ai_routing_seed::{
    import_postgres_ai_routing_seed, postgres_ai_routing_seed_complete, postgres_ai_routing_seed_gap,
};
use crate::infrastructure::sql::model_catalog_import::{
    catalog_api_endpoint_projections, catalog_authority_keys,
    catalog_modality_api_endpoint_projections, catalog_modality_projections, catalog_scope_counts,
    catalog_scope_vendor_codes, catalog_with_selected_vendors, load_catalog_root_with_pin,
    DEFAULT_CATALOG_REFRESH_SOURCE,
};
use crate::infrastructure::sql::official_pricing_sync::{
    price_book_drift, pricing_projection_is_stored, summarize_catalog_pricing,
    sync_official_pricing_catalog,
};
use crate::ports::{
    AdminModelStore, AdminModelSubject, OfficialPricingRefreshFuture, OfficialPricingRefreshReport,
    OfficialPricingRefreshStore, SyncAdminModelCatalogCommand,
};

/// The database contract version reported by the bootstrap surface.
///
/// Schema history is owned by `sdkwork-database` and is never maintained by
/// this bootstrap component.
pub const CURRENT_SCHEMA_VERSION: &str = env!("CARGO_PKG_VERSION");
pub const DEFAULT_SEED_PROFILE: &str = "standard";
pub const DEFAULT_INSTALL_ENVIRONMENT: &str = "production";
pub const ENV_INSTALL_ENVIRONMENT: &str = "SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT";
pub const ENV_INSTALL_SEED_PROFILE: &str = "SDKWORK_DATABASE_SEED_PROFILE";
pub const ENV_INSTALL_SEED_LOCALE: &str = "SDKWORK_DATABASE_SEED_LOCALE";
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
const DEFAULT_SERVICE_NODE_INSTANCE_CODE: &str = "cloudrouter-default-standalone";
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

const PRICING_TABLES: &[&str] = &["pricing_import_run", "pricing_price_book", "pricing_rate"];

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DatabaseInstallOptions {
    pub environment: String,
    pub seed_profile: String,
    pub seed_locale: Option<String>,
    pub models_catalog_root: Option<String>,
}

impl DatabaseInstallOptions {
    pub fn commercial() -> Self {
        Self {
            environment: DEFAULT_INSTALL_ENVIRONMENT.to_owned(),
            seed_profile: DEFAULT_SEED_PROFILE.to_owned(),
            seed_locale: None,
            models_catalog_root: None,
        }
    }

    pub fn from_env() -> Result<Self, DatabaseInstallError> {
        let runtime_toml = sdkwork_cloudrouter_config::RuntimeTomlConfig::from_env_config_file()
            .map_err(DatabaseInstallError::InvalidState)?;
        Self::from_env_or_runtime_toml(runtime_toml.as_ref())
    }

    pub fn from_env_or_runtime_toml(
        runtime_toml: Option<&sdkwork_cloudrouter_config::RuntimeTomlConfig>,
    ) -> Result<Self, DatabaseInstallError> {
        let environment = sdkwork_cloudrouter_config::runtime::config_value(
            ENV_INSTALL_ENVIRONMENT,
            runtime_toml.and_then(|config| config.install.environment.as_deref()),
        )
        .unwrap_or_else(|| DEFAULT_INSTALL_ENVIRONMENT.to_owned());
        let seed_profile = sdkwork_cloudrouter_config::runtime::config_value(
            ENV_INSTALL_SEED_PROFILE,
            runtime_toml.and_then(|config| config.install.seed_profile.as_deref()),
        )
        .unwrap_or_else(|| DEFAULT_SEED_PROFILE.to_owned());
        let seed_locale = sdkwork_cloudrouter_config::runtime::config_value(
            ENV_INSTALL_SEED_LOCALE,
            runtime_toml.and_then(|config| config.install.seed_locale.as_deref()),
        );
        let models_catalog_root = sdkwork_cloudrouter_config::runtime::config_value(
            ENV_MODELS_CATALOG_ROOT,
            runtime_toml.and_then(|config| config.install.models_catalog_root.as_deref()),
        );
        Self::new(environment, seed_profile)?
            .with_seed_locale(seed_locale)?
            .with_models_catalog_root(models_catalog_root)
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
            seed_locale: None,
            models_catalog_root: None,
        })
    }

    pub fn with_seed_locale(
        mut self,
        seed_locale: Option<String>,
    ) -> Result<Self, DatabaseInstallError> {
        if let Some(locale) = seed_locale.as_deref() {
            let normalized = locale.trim();
            if normalized.is_empty() {
                return Err(DatabaseInstallError::InvalidState(format!(
                    "{ENV_INSTALL_SEED_LOCALE} must not be empty"
                )));
            }
            self.seed_locale = Some(normalized.to_owned());
        }
        Ok(self)
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
    /// Official pricing alignment counters. They stay zero for a `dry_run`
    /// refresh because no official price is written in that mode.
    pub price_book_count: usize,
    pub rate_count: usize,
    /// Price settings switched off because sdkwork-models deprecated the model.
    pub deprecated_price_setting_count: usize,
    /// Price settings switched off because the model left the catalog.
    pub removed_price_setting_count: usize,
    /// Price settings switched back on because the model is published again.
    pub restored_price_setting_count: usize,
    /// False when the loaded catalog was byte-identical to what is already
    /// stored and no price setting needed to change.
    pub pricing_changed: bool,
}

/// Idempotent application-data bootstrap.
///
/// This component deliberately has no DDL, schema repair, migration history,
/// or dialect conversion responsibilities. Callers must run the canonical
/// `sdkwork-cloudrouter-database-host` lifecycle first.
pub struct DatabaseInstaller {
    pool: PgPool,
    options: DatabaseInstallOptions,
    admin_model_store: Option<Arc<dyn AdminModelStore + Send + Sync>>,
    /// Upstream-credential secret codec used to seal the placeholder
    /// credentials of the bundled vendor default accounts. Absent means the
    /// seed writes no credential (and those accounts stay non-routable).
    credential_secret_codec: Option<Arc<dyn UpstreamCredentialSecretCodec + Send + Sync>>,
}

impl DatabaseInstaller {
    pub fn for_postgres(pool: PgPool) -> Self {
        Self {
            pool,
            options: DatabaseInstallOptions::commercial(),
            admin_model_store: None,
            credential_secret_codec: None,
        }
    }

    pub fn with_admin_model_store(mut self, store: Arc<dyn AdminModelStore + Send + Sync>) -> Self {
        self.admin_model_store = Some(store);
        self
    }

    /// Supplies the upstream-credential secret codec so the seed can seal the
    /// placeholder credentials of the bundled vendor default accounts.
    ///
    /// Callers that omit this still get the accounts, but without credentials —
    /// which means the routing snapshot's credential gate keeps them out, and
    /// the coverage probe reports the gap instead of silently routing nowhere.
    pub fn with_credential_secret_codec(
        mut self,
        codec: Arc<dyn UpstreamCredentialSecretCodec + Send + Sync>,
    ) -> Self {
        self.credential_secret_codec = Some(codec);
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
            // An installed database is not necessarily a *current* one.
            // `catalog_complete` only asserts that every key the catalog
            // publishes exists in the database — a subset check — so adding a
            // model, repricing one, or deleting a price book changes nothing it
            // can observe. Returning here unconditionally meant the official
            // pricing projection was refreshed exactly once, at first install,
            // and every later `sdkwork-models` revision was ignored until an
            // operator ran `db:refresh-catalog` by hand.
            //
            // Re-project the catalog on disk and refresh only on real drift, so
            // startup converges a dev/test database onto `sdkwork-models` while
            // the second startup of an unchanged catalog stays a pure read.
            if let Some(changed) = self.refresh_on_catalog_drift().await? {
                return self.status_report_with_options(&self.options, changed).await;
            }
            return self.status_report_with_options(&self.options, false).await;
        }
        self.require_application_schema().await?;
        self.require_model_catalog_schema().await?;
        self.require_pricing_schema().await?;

        let service_node_changed = self.ensure_default_service_node().await?;

        let refresh_options = CatalogRefreshOptions {
            catalog_root: self.options.models_catalog_root.clone(),
            ..CatalogRefreshOptions::default()
        };
        let refresh = self.refresh_catalog(refresh_options).await?;
        let status = self.bootstrap_status(&self.options).await?;
        if status != InstallationStatus::Installed {
            // `UpgradeRequired` is an `&&` chain of gates, and they fail for
            // unrelated reasons. Report *which* gate failed rather than only the
            // class, because the four are indistinguishable from the status
            // alone:
            //
            // * `catalog_complete` — the model-catalog projection is behind the
            //   `sdkwork-models` revision on disk (a table is missing bundled
            //   keys);
            // * the routing seed's projection — a resource/group/endpoint, a
            //   routing strategy, an account, or an account's credential;
            // * `default_service_node_complete` — the control-plane instance row.
            //
            // The credential case is the historic trap: `import_postgres_default_vendor_account_credential`
            // bails out when no codec is configured (a credential the runtime
            // cannot decode is worse than an absent one), but
            // `postgres_default_vendor_upstream_accounts_complete` still
            // requires an active credential per account. The accounts land, the
            // predicate stays false, and the operator sees only
            // "did not reach installed state" — which reads like a seeding bug
            // rather than a missing key ring.
            let mut causes: Vec<String> = Vec::new();
            if let Ok(catalog) = load_install_model_catalog(&self.options) {
                if let Ok(Some(gap)) = self.catalog_gap(&catalog).await {
                    causes.push(format!("model catalog projection: {gap}"));
                }
            }
            if let Ok(Some(gap)) = postgres_ai_routing_seed_gap(&self.pool).await {
                causes.push(format!("ai routing seed: {gap}"));
            }
            if self.vendor_accounts_lack_credentials().await.unwrap_or(false) {
                causes.push(
                    "the bundled vendor default accounts exist but carry no active credential — \
                     the seed skips credential writes when no upstream-credential key ring is \
                     configured; set SDKWORK_CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING or \
                     SDKWORK_CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING_FILE and re-run"
                        .to_owned(),
                );
            }
            if !self.default_service_node_complete().await.unwrap_or(true) {
                causes.push("the default service node instance row is absent".to_owned());
            }
            let hint = if causes.is_empty() {
                String::new()
            } else {
                format!(" — {}", causes.join("; "))
            };
            return Err(DatabaseInstallError::InvalidState(format!(
                "catalog/seed bootstrap did not reach installed state: {status:?}{hint}"
            )));
        }
        self.status_report_with_options(&self.options, refresh.synced || service_node_changed)
            .await
    }

    /// Refreshes the catalog when the `sdkwork-models` revision on disk and the
    /// pricing stored in the database disagree; returns whether anything
    /// changed, or `None` when there is nothing to do.
    ///
    /// Two independent signals, because they fail differently:
    ///
    /// * **content** — the projection's `source_hash` is not in
    ///   `pricing_import_run` yet, i.e. the catalog added, removed, or repriced
    ///   a model. The hash covers every rate, so a single changed unit price is
    ///   enough to detect it.
    /// * **books** — the live price books and the projected ones are not the
    ///   same set. Adding and deleting look identical to a subset check, which
    ///   is why a deleted price book used to keep serving retired rates for
    ///   ever; and a price book that was retired or soft-deleted while its
    ///   `pricing_import_run` row survived satisfied every other signal, which
    ///   is why a database could be missing a whole vendor's pricing while
    ///   reporting itself up to date. Only a set comparison sees both.
    ///
    /// Returns `None` — never an error — when no admin model store is wired (the
    /// catalog cannot be written without it) or when the catalog cannot be read
    /// from disk. An external `SDKWORK_MODELS_CATALOG_ROOT` that has gone
    /// missing must not turn a healthy startup into a failure; that is the same
    /// tolerance `bootstrap_status` shows by reporting `CatalogUnavailable`.
    async fn refresh_on_catalog_drift(&self) -> Result<Option<bool>, DatabaseInstallError> {
        if self.admin_model_store.is_none() {
            return Ok(None);
        }
        let catalog = match load_install_model_catalog(&self.options) {
            Ok(catalog) => catalog,
            Err(error) => {
                tracing::debug!(
                    target: "sdkwork_cloudrouter::database_install",
                    stage = "catalog_drift",
                    error = %error,
                    "skipping startup catalog drift check: catalog is unreadable"
                );
                return Ok(None);
            }
        };
        let summary = match summarize_catalog_pricing(&catalog) {
            Ok(summary) => summary,
            Err(error) => {
                tracing::warn!(
                    target: "sdkwork_cloudrouter::database_install",
                    stage = "catalog_drift",
                    error = %error,
                    "skipping startup catalog drift check: catalog pricing projection is invalid"
                );
                return Ok(None);
            }
        };
        let stored = pricing_projection_is_stored(&self.pool, &summary)
            .await
            .map_err(|error| DatabaseInstallError::InvalidState(error.to_string()))?;
        let books = price_book_drift(&self.pool, &summary)
            .await
            .map_err(|error| DatabaseInstallError::InvalidState(error.to_string()))?;
        if stored && books.is_clean() {
            return Ok(None);
        }
        tracing::info!(
            target: "sdkwork_cloudrouter::database_install",
            stage = "catalog_drift",
            catalog_version = %summary.catalog_version,
            source_hash = %summary.source_hash,
            projection_stored = stored,
            missing_price_books = books.missing.len(),
            orphan_price_books = books.orphan.len(),
            price_book_sample = %books.sample(5),
            "official pricing is behind sdkwork-models; refreshing the catalog"
        );
        let refresh = self
            .refresh_catalog(CatalogRefreshOptions {
                catalog_root: self.options.models_catalog_root.clone(),
                ..CatalogRefreshOptions::default()
            })
            .await?;
        Ok(Some(refresh.synced))
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
        let sync_pricing = options.mode != "dry_run";
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

        let mut pricing_sync = None;
        if sync_pricing {
            pricing_sync = Some(
                sync_official_pricing_catalog(&self.pool, &catalog)
                    .await
                    .map_err(|error| DatabaseInstallError::InvalidState(error.to_string()))?,
            );
        }

        if item.synced {
            import_postgres_ai_routing_seed(
                &self.pool,
                Some(self.options.environment.as_str()),
                self.credential_secret_codec
                    .as_deref()
                    .map(|codec| codec as &(dyn UpstreamCredentialSecretCodec + Send + Sync)),
            )
            .await?;
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
            price_book_count: pricing_sync
                .as_ref()
                .map(|report| report.price_book_count)
                .unwrap_or_default(),
            rate_count: pricing_sync
                .as_ref()
                .map(|report| report.rate_count)
                .unwrap_or_default(),
            deprecated_price_setting_count: pricing_sync
                .as_ref()
                .map(|report| report.deprecated_price_setting_count)
                .unwrap_or_default(),
            removed_price_setting_count: pricing_sync
                .as_ref()
                .map(|report| report.removed_price_setting_count)
                .unwrap_or_default(),
            restored_price_setting_count: pricing_sync
                .as_ref()
                .map(|report| report.restored_price_setting_count)
                .unwrap_or_default(),
            pricing_changed: pricing_sync
                .as_ref()
                .map(|report| report.changed)
                .unwrap_or_default(),
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
        if !self.pricing_schema_ready().await? {
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

    /// True when the bundled vendor default accounts exist but at least one has
    /// no active credential — the signature of a seed run with no configured
    /// upstream-credential key ring.
    ///
    /// Diagnostic only: it never changes the computed status, it only lets
    /// `ensure` name the cause instead of reporting a bare `UpgradeRequired`.
    /// Errors are swallowed into `false` because a diagnostic must never turn a
    /// clear seeding failure into a confusing database error.
    async fn vendor_accounts_lack_credentials(&self) -> Result<bool, sqlx::Error> {
        sqlx::query_scalar::<_, bool>(
            r#"
            SELECT EXISTS (
                SELECT 1
                FROM ai_upstream_account account
                WHERE account.metadata ->> 'itemType' = 'default_vendor_upstream_account'
                  AND account.deleted_at IS NULL
                  AND NOT EXISTS (
                      SELECT 1
                      FROM ai_upstream_account_credential credential
                      WHERE credential.account_id = account.id
                        AND credential.status = 1
                        AND credential.is_active
                        AND credential.deleted_at IS NULL
                  )
            )
            "#,
        )
        .fetch_one(&self.pool)
        .await
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
            "Cloud Router schema is not current; run the explicit sdkwork-cloudrouter-database-host lifecycle migrate operation before catalog/seed bootstrap"
                .to_owned(),
        ))
    }

    async fn require_model_catalog_schema(&self) -> Result<(), DatabaseInstallError> {
        if self.model_catalog_schema_ready().await? {
            return Ok(());
        }
        Err(DatabaseInstallError::InvalidState(
            "sdkwork-models schema is not current; migrate its owning database module before Cloud Router catalog bootstrap"
                .to_owned(),
        ))
    }

    async fn require_pricing_schema(&self) -> Result<(), DatabaseInstallError> {
        if self.pricing_schema_ready().await? {
            return Ok(());
        }
        Err(DatabaseInstallError::InvalidState(
            "pricing module schema is not current; migrate the pricing database module before catalog bootstrap"
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

    async fn pricing_schema_ready(&self) -> Result<bool, DatabaseInstallError> {
        for table in PRICING_TABLES {
            if !postgres_table_exists(&self.pool, table).await? {
                return Ok(false);
            }
        }
        Ok(true)
    }

    async fn catalog_complete(&self, catalog: &ModelCatalog) -> Result<bool, DatabaseInstallError> {
        Ok(self.catalog_gap(catalog).await?.is_none())
    }

    /// Names the first `catalog_expectations` entry whose bundled keys are not a
    /// subset of the live table.
    ///
    /// `catalog_complete` is a bare `&&` over fifteen tables; when it fails the
    /// caller can only say `UpgradeRequired`. The tables fail for unrelated
    /// reasons (a model added to the catalog but not projected, a projector
    /// changed in one place and not the other, a vendor removed from the
    /// catalog while its rows survive), and finding out which one from the
    /// outside means diffing fifteen key sets by hand. Returning
    /// `table.column` names it outright.
    async fn catalog_gap(&self, catalog: &ModelCatalog) -> Result<Option<String>, DatabaseInstallError> {
        for expectation in catalog_expectations(catalog) {
            let actual =
                postgres_string_values(&self.pool, expectation.table, expectation.column).await?;
            if !expectation.expected.is_subset(&actual) {
                let missing: Vec<&str> = expectation
                    .expected
                    .difference(&actual)
                    .take(5)
                    .map(String::as_str)
                    .collect();
                return Ok(Some(format!(
                    "{}.{} is missing {} bundled key(s), e.g. {}",
                    expectation.table,
                    expectation.column,
                    expectation.expected.difference(&actual).count(),
                    missing.join(", ")
                )));
            }
        }
        Ok(None)
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

impl OfficialPricingRefreshStore for DatabaseInstaller {
    /// Re-runs the catalog refresh with the default options: the catalog root
    /// and version pin configured for the process, no vendor filter, and
    /// `force` so an unchanged catalog still realigns the stored prices.
    fn refresh_official_pricing(&self) -> OfficialPricingRefreshFuture<'_> {
        Box::pin(async move {
            let report = self
                .refresh_catalog(CatalogRefreshOptions::default())
                .await
                .map_err(|error| DomainError::new(error.to_string()))?;
            Ok(OfficialPricingRefreshReport {
                synced: report.synced,
                source: report.source,
                mode: report.mode,
                catalog_version: report.catalog_version,
                vendor_count: report.vendor_count,
                model_count: report.model_count,
                price_count: report.price_count,
                price_book_count: report.price_book_count,
                rate_count: report.rate_count,
                deprecated_price_setting_count: report.deprecated_price_setting_count,
                removed_price_setting_count: report.removed_price_setting_count,
                restored_price_setting_count: report.restored_price_setting_count,
                changed: report.pricing_changed,
                snapshot_id: report.snapshot_id.unwrap_or_default(),
                sync_run_id: report.sync_run_id.unwrap_or_default(),
            })
        })
    }
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
