use argon2::password_hash::{rand_core::OsRng, PasswordHasher, SaltString};
use argon2::Argon2;
use sdkwork_claw_config::{DatabaseConfig, DatabaseEngine, DeploymentMode, RuntimeConfigProfile};
use sdkwork_clawrouter_database_host::connect_claw_router_database;
use sdkwork_clawrouter_router_service::infrastructure::sql::installer::{
    CatalogRefreshOptions, CatalogRefreshReport, DatabaseInstallError, DatabaseInstaller,
    InstallationReport, InstallationStatus,
};
use sdkwork_iam_bootstrap::{
    DEFAULT_BOOTSTRAP_ADMIN_USERNAME, DEFAULT_BOOTSTRAP_ADMIN_USER_ID, DEFAULT_IAM_TENANT_ID,
};
use sdkwork_models_database_host::connect_models_database;
use sdkwork_models_catalog_repository_sqlx::PostgresModelCatalogAdminStore;
use serde::Serialize;
use sqlx::PgPool;
use std::error::Error;
use std::fmt::{Display, Formatter};
use std::process::ExitCode;
use std::sync::Arc;

const SDKWORK_CLAW_ADMIN_RESET_PASSWORD_ENV: &str = "SDKWORK_CLAW_ADMIN_RESET_PASSWORD";

#[tokio::main]
async fn main() -> ExitCode {
    sdkwork_database_sqlx::enable_process_shared_database_pool();
    match run().await {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!(
                "{}",
                serde_json::to_string(&InstallerErrorOutput::from_error(error.as_ref()))
                    .unwrap_or_else(|_| {
                        r#"{"status":"error","errorCode":"serialization_error","message":"failed to serialize installer error"}"#.to_owned()
                    })
            );
            ExitCode::FAILURE
        }
    }
}

async fn run() -> anyhow::Result<()> {
    let command = parse_cli_command(std::env::args().skip(1))?;
    let config = DatabaseConfig::from_env_or_initialize()
        .map_err(anyhow::Error::msg)?
        .ok_or(InstallerCliError::MissingDatabaseUrl)?;

    require_postgres_installer_database(&config)?;
    run_postgres(config, command).await?;

    Ok(())
}

fn require_postgres_installer_database(config: &DatabaseConfig) -> anyhow::Result<()> {
    if matches!(config.engine, DatabaseEngine::Postgres) {
        return Ok(());
    }
    Err(InstallerCliError::InvalidArgument(
        "clawrouterctl requires PostgreSQL because Claw Router server data is authoritative"
            .to_owned(),
    )
    .into())
}

async fn run_postgres(config: DatabaseConfig, command: InstallerCommand) -> anyhow::Result<()> {
    let database_pool = connect_installer_database_pool(&config).await?;
    apply_explicit_schema_lifecycle_if_required(&database_pool, &command).await?;
    let pool = database_pool.as_postgres().cloned().ok_or_else(|| {
        InstallerCliError::DatabaseConnection("expected PostgreSQL pool".to_owned())
    })?;
    if let InstallerCommand::ResetAdmin(options) = &command {
        return run_reset_admin_postgres(&pool, options).await;
    }
    run_command(
        DatabaseInstaller::for_postgres(pool.clone())
            .with_admin_model_store(Arc::new(PostgresModelCatalogAdminStore::new(pool)))
            .with_env_options()?,
        command,
    )
    .await
}

async fn connect_installer_database_pool(
    config: &DatabaseConfig,
) -> anyhow::Result<sdkwork_database_sqlx::DatabasePool> {
    sdkwork_clawrouter_router_service::infrastructure::sql::pool::connect_standard_database_pool(
        config,
    )
    .await
    .map_err(|error| {
        InstallerCliError::DatabaseConnection(database_connection_error_message(&config.url, error))
            .into()
    })
}

async fn apply_explicit_schema_lifecycle_if_required(
    pool: &sdkwork_database_sqlx::DatabasePool,
    command: &InstallerCommand,
) -> anyhow::Result<()> {
    if !command.requires_schema_migration() {
        return Ok(());
    }
    let models_host = connect_models_database(pool.clone()).map_err(anyhow::Error::msg)?;
    models_host
        .migrate("clawrouterctl:models")
        .await
        .map_err(anyhow::Error::msg)?;
    let host = connect_claw_router_database(pool.clone()).map_err(anyhow::Error::msg)?;
    host.migrate("clawrouterctl")
        .await
        .map_err(anyhow::Error::msg)?;
    Ok(())
}

fn database_connection_error_message(database_url: &str, error: impl std::fmt::Display) -> String {
    format!(
        "PostgreSQL database is not reachable for SDKWORK_CLAW_DATABASE_URL ({}) within {} seconds: {error}. Start the configured PostgreSQL service or fix the host, port, and credentials.",
        redact_database_url(database_url),
        sdkwork_clawrouter_router_service::infrastructure::sql::pool::POSTGRES_POOL_ACQUIRE_TIMEOUT_SECONDS
    )
}

fn redact_database_url(database_url: &str) -> String {
    let Some(scheme_index) = database_url.find("://") else {
        return database_url.to_owned();
    };
    let credentials_start = scheme_index + 3;
    let Some(at_offset) = database_url[credentials_start..].find('@') else {
        return database_url.to_owned();
    };
    let credentials_end = credentials_start + at_offset;
    let credentials = &database_url[credentials_start..credentials_end];
    let Some(colon_offset) = credentials.rfind(':') else {
        return database_url.to_owned();
    };
    let username_end = credentials_start + colon_offset;
    format!(
        "{}***{}",
        &database_url[..=username_end],
        &database_url[credentials_end..]
    )
}

async fn run_command(
    installer: DatabaseInstaller,
    command: InstallerCommand,
) -> anyhow::Result<()> {
    match command {
        InstallerCommand::Status => {
            let report = installer.status_report().await?;
            print_json(&InstallationStatusOutput::from(report))?;
        }
        InstallerCommand::Install => {
            let status = installer.status().await?;
            if status == InstallationStatus::Installed {
                let report = installer.status_report().await?;
                print_json(&InstallationStatusOutput::from(report))?;
                return Ok(());
            }
            let report = installer.ensure_bootstrap_data().await?;
            print_json(&InstallationStatusOutput::from(report))?;
        }
        InstallerCommand::Upgrade | InstallerCommand::Ensure => {
            let report = installer.ensure_bootstrap_data().await?;
            print_json(&InstallationStatusOutput::from(report))?;
        }
        InstallerCommand::RefreshCatalog(options) => {
            let report = installer.refresh_catalog(options.clone()).await?;
            let status_report = installer
                .status_report_for_refresh_options(&options)
                .await?;
            print_json(&CatalogRefreshOutput::from_reports(report, status_report))?;
        }
        InstallerCommand::ResetAdmin(_) => {
            return Err(InstallerCliError::InvalidState(
                "reset-admin is handled before DatabaseInstaller dispatch".to_owned(),
            )
            .into());
        }
    }
    Ok(())
}

#[derive(Debug)]
enum InstallerCommand {
    Status,
    Install,
    Upgrade,
    Ensure,
    RefreshCatalog(CatalogRefreshOptions),
    ResetAdmin(ResetAdminOptions),
}

#[derive(Debug, Default)]
struct ResetAdminOptions {
    username: String,
    display_name: String,
    email: String,
}

fn parse_cli_command<I>(args: I) -> anyhow::Result<InstallerCommand>
where
    I: IntoIterator<Item = String>,
{
    let mut args = args.into_iter();
    let command = args.next().unwrap_or_else(|| "ensure".to_owned());
    Ok(match command.as_str() {
        "status" => {
            reject_extra_args("status", args)?;
            InstallerCommand::Status
        }
        "install" => {
            reject_extra_args("install", args)?;
            InstallerCommand::Install
        }
        "upgrade" => {
            reject_extra_args("upgrade", args)?;
            InstallerCommand::Upgrade
        }
        "ensure" => {
            reject_extra_args("ensure", args)?;
            InstallerCommand::Ensure
        }
        "refresh-catalog" => InstallerCommand::RefreshCatalog(parse_refresh_options(args)?),
        "reset-admin" => InstallerCommand::ResetAdmin(parse_reset_admin_options(args)?),
        other => {
            return Err(InstallerCliError::InvalidArgument(format!(
                "unsupported installer command: {other}. Use status, install, upgrade, ensure, refresh-catalog, or reset-admin"
            ))
            .into());
        }
    })
}

fn reject_extra_args<I>(command: &str, args: I) -> anyhow::Result<()>
where
    I: IntoIterator<Item = String>,
{
    let mut args = args.into_iter();
    if let Some(arg) = args.next() {
        return Err(InstallerCliError::InvalidArgument(format!(
            "{command} does not accept extra arguments: {arg}"
        ))
        .into());
    }
    Ok(())
}

fn parse_refresh_options<I>(args: I) -> anyhow::Result<CatalogRefreshOptions>
where
    I: IntoIterator<Item = String>,
{
    let mut options = CatalogRefreshOptions::default();
    let mut args = args.into_iter().peekable();
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--source" => {
                options.source =
                    normalize_refresh_token(next_arg(&mut args, "--source")?, "source", 64)?
            }
            "--mode" => options.mode = normalize_refresh_mode(next_arg(&mut args, "--mode")?)?,
            "--vendor" | "--vendor-code" => {
                options
                    .vendor_codes
                    .push(normalize_vendor_code(next_arg(&mut args, "--vendor")?)?);
                if options.mode == "official_refresh" {
                    options.mode = "vendor_refresh".to_owned();
                }
            }
            "--catalog-root" => {
                options.catalog_root = Some(normalize_catalog_root(next_arg(
                    &mut args,
                    "--catalog-root",
                )?)?)
            }
            "--catalog-version" => {
                options.catalog_version = Some(normalize_catalog_version(next_arg(
                    &mut args,
                    "--catalog-version",
                )?)?)
            }
            "--dry-run" => options.mode = "dry_run".to_owned(),
            "--force" => options.force = true,
            "--no-force" => options.force = false,
            other => {
                return Err(InstallerCliError::InvalidArgument(format!(
                    "unsupported refresh-catalog option: {other}"
                ))
                .into());
            }
        }
    }
    options.vendor_codes.sort();
    options.vendor_codes.dedup();
    if options.vendor_codes.len() > 32 {
        return Err(InstallerCliError::InvalidArgument(
            "vendor codes must contain 32 items or fewer".to_owned(),
        )
        .into());
    }
    Ok(options)
}

fn parse_reset_admin_options<I>(args: I) -> anyhow::Result<ResetAdminOptions>
where
    I: IntoIterator<Item = String>,
{
    let mut options = ResetAdminOptions::default();
    let mut args = args.into_iter().peekable();
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--username" => {
                options.username =
                    ResetAdminOptions::normalize_username(next_arg(&mut args, "--username")?)?;
            }
            "--display-name" => {
                options.display_name = ResetAdminOptions::normalize_display_name(next_arg(
                    &mut args,
                    "--display-name",
                )?)?;
            }
            "--email" => {
                options.email =
                    ResetAdminOptions::normalize_email(next_arg(&mut args, "--email")?)?;
            }
            other => {
                return Err(InstallerCliError::InvalidArgument(format!(
                    "unsupported reset-admin option: {other}"
                ))
                .into());
            }
        }
    }
    Ok(options)
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ResetAdminOutput {
    status: &'static str,
    user_id: String,
    tenant_id: &'static str,
    username: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct InstallationStatusOutput {
    status: String,
    schema_version: &'static str,
    catalog_version: String,
    catalog_source: String,
    external_catalog: bool,
    last_catalog_refresh_status: String,
    environment: String,
    seed_profile: String,
    changed: bool,
}

impl From<InstallationReport> for InstallationStatusOutput {
    fn from(report: InstallationReport) -> Self {
        Self {
            status: status_code(&report.status).to_owned(),
            schema_version: report.schema_version,
            catalog_version: report.catalog_version,
            catalog_source: report.catalog_source,
            external_catalog: report.external_catalog,
            last_catalog_refresh_status: report.last_catalog_refresh_status,
            environment: report.environment,
            seed_profile: report.seed_profile,
            changed: report.changed,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CatalogRefreshOutput {
    status: &'static str,
    synced: bool,
    installation_status: String,
    schema_version: &'static str,
    catalog_source: String,
    external_catalog: bool,
    source: String,
    mode: String,
    catalog_version: String,
    vendor_codes: Vec<String>,
    meter_count: usize,
    vendor_count: usize,
    family_count: usize,
    model_count: usize,
    capability_count: usize,
    price_count: usize,
    ranking_count: usize,
    accepted_count: i64,
    snapshot_id: Option<String>,
    sync_run_id: Option<String>,
    last_catalog_refresh_status: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct InstallerErrorOutput {
    status: &'static str,
    error_code: &'static str,
    message: String,
}

impl InstallerErrorOutput {
    fn from_error(error: &(dyn std::error::Error + 'static)) -> Self {
        let message = error.to_string();
        Self {
            status: "error",
            error_code: installer_error_code(error, message.as_str()),
            message,
        }
    }
}

fn installer_error_code(error: &(dyn std::error::Error + 'static), message: &str) -> &'static str {
    if let Some(cli_error) = error.downcast_ref::<InstallerCliError>() {
        return match cli_error {
            InstallerCliError::MissingDatabaseUrl => "missing_database_url",
            InstallerCliError::InvalidArgument(_) => "invalid_argument",
            InstallerCliError::InvalidState(_) => "invalid_state",
            InstallerCliError::DatabaseConnection(_) => "database_error",
        };
    }
    if let Some(installer_error) = error.downcast_ref::<DatabaseInstallError>() {
        return match installer_error {
            DatabaseInstallError::Database(_) => "database_error",
            DatabaseInstallError::Catalog(_) => "catalog_error",
            DatabaseInstallError::InvalidState(_) => "invalid_state",
        };
    }
    if error.downcast_ref::<sqlx::Error>().is_some() {
        return "database_error";
    }
    if message.contains("SDKWORK_CLAW_DATABASE_URL") {
        "missing_database_url"
    } else if message.contains("unsupported installer command")
        || message.contains("unsupported refresh-catalog option")
        || message.contains("requires a value")
        || message.contains("requires --password")
        || message.contains("must contain only")
        || message.contains("mode must be")
        || message.contains("unsupported seed profile")
        || message.contains("must not be blank")
    {
        "invalid_state"
    } else if message.contains("database") || message.contains("postgres") {
        "database_error"
    } else if message.contains("catalog") || message.contains("sdkwork-models") {
        "catalog_error"
    } else {
        "installer_error"
    }
}

#[derive(Debug)]
enum InstallerCliError {
    MissingDatabaseUrl,
    InvalidArgument(String),
    InvalidState(String),
    DatabaseConnection(String),
}

impl Display for InstallerCliError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::MissingDatabaseUrl => write!(
                formatter,
                "SDKWORK_CLAW_DATABASE_URL is required.\n{}",
                DatabaseConfig::startup_help_text(runtime_config_profile_from_deployment_mode())
            ),
            Self::InvalidArgument(message) => write!(formatter, "{message}"),
            Self::InvalidState(message) => write!(formatter, "{message}"),
            Self::DatabaseConnection(message) => write!(formatter, "{message}"),
        }
    }
}

impl Error for InstallerCliError {}

fn runtime_config_profile_from_deployment_mode() -> RuntimeConfigProfile {
    match DeploymentMode::from_env() {
        Ok(DeploymentMode::Desktop) => RuntimeConfigProfile::Desktop,
        Ok(DeploymentMode::Server | DeploymentMode::Docker | DeploymentMode::Kubernetes)
        | Err(_) => RuntimeConfigProfile::Server,
    }
}

impl InstallerCommand {
    fn requires_schema_migration(&self) -> bool {
        matches!(self, Self::Install | Self::Upgrade | Self::Ensure)
    }
}

impl ResetAdminOptions {
    fn normalize_username(value: String) -> anyhow::Result<String> {
        let trimmed = value.trim().to_owned();
        if trimmed.is_empty() {
            return Err(InstallerCliError::InvalidArgument(
                "--username must not be blank".to_owned(),
            )
            .into());
        }
        Ok(trimmed)
    }

    fn normalize_display_name(value: String) -> anyhow::Result<String> {
        let trimmed = value.trim().to_owned();
        if trimmed.is_empty() {
            return Err(InstallerCliError::InvalidArgument(
                "--display-name must not be blank".to_owned(),
            )
            .into());
        }
        Ok(trimmed)
    }

    fn normalize_email(value: String) -> anyhow::Result<String> {
        let trimmed = value.trim().to_owned();
        if trimmed.is_empty() {
            return Err(
                InstallerCliError::InvalidArgument("--email must not be blank".to_owned()).into(),
            );
        }
        Ok(trimmed)
    }
}

impl CatalogRefreshOutput {
    fn from_reports(refresh: CatalogRefreshReport, status_report: InstallationReport) -> Self {
        Self {
            status: if refresh.synced {
                "refreshed_catalog"
            } else {
                "catalog_refresh_dry_run"
            },
            synced: refresh.synced,
            installation_status: status_code(&status_report.status).to_owned(),
            schema_version: status_report.schema_version,
            catalog_source: status_report.catalog_source,
            external_catalog: status_report.external_catalog,
            source: refresh.source,
            mode: refresh.mode,
            catalog_version: refresh.catalog_version,
            vendor_codes: refresh.vendor_codes,
            meter_count: refresh.meter_count,
            vendor_count: refresh.vendor_count,
            family_count: refresh.family_count,
            model_count: refresh.model_count,
            capability_count: refresh.capability_count,
            price_count: refresh.price_count,
            ranking_count: refresh.ranking_count,
            accepted_count: refresh.accepted_count,
            snapshot_id: refresh.snapshot_id,
            sync_run_id: refresh.sync_run_id,
            last_catalog_refresh_status: status_report.last_catalog_refresh_status,
        }
    }
}

fn print_json<T: Serialize>(value: &T) -> anyhow::Result<()> {
    println!("{}", serde_json::to_string(value)?);
    Ok(())
}

fn hash_admin_password(password: &str) -> anyhow::Result<String> {
    Argon2::default()
        .hash_password(password.as_bytes(), &SaltString::generate(&mut OsRng))
        .map(|hash| hash.to_string())
        .map_err(|error| {
            InstallerCliError::InvalidArgument(format!("failed to hash admin password: {error}"))
                .into()
        })
}

fn read_reset_admin_password() -> anyhow::Result<String> {
    let password = std::env::var(SDKWORK_CLAW_ADMIN_RESET_PASSWORD_ENV)
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            InstallerCliError::InvalidArgument(format!(
                "{SDKWORK_CLAW_ADMIN_RESET_PASSWORD_ENV} is required for reset-admin"
            ))
        })?;
    if password.len() < 8 {
        return Err(InstallerCliError::InvalidArgument(
            "admin reset password must be at least 8 characters".to_owned(),
        )
        .into());
    }
    Ok(password)
}

fn bootstrap_credential_id(user_id: &str) -> String {
    format!("iamc_bootstrap_{user_id}")
}

/// Resolve the bootstrap admin user's actual id. Tries the canonical id first,
/// then falls back to looking up by username within the default tenant, then
/// falls back to the tenant's bootstrap owner from `iam_organization_membership`.
/// This handles environments where IAM bootstrap assigned a non-canonical id
/// or a different username than `admin`.
async fn resolve_bootstrap_admin_user_id_postgres(pool: &PgPool) -> anyhow::Result<String> {
    let canonical: Option<(String,)> = sqlx::query_as(
        "SELECT id::text FROM iam_user WHERE id = $1 AND tenant_id = $2 AND is_deleted = 0",
    )
    .bind(DEFAULT_BOOTSTRAP_ADMIN_USER_ID)
    .bind(DEFAULT_IAM_TENANT_ID)
    .fetch_optional(pool)
    .await?;
    if let Some((id,)) = canonical {
        return Ok(id);
    }
    let by_username: Option<(String,)> = sqlx::query_as(
        "SELECT id::text FROM iam_user WHERE tenant_id = $1 AND username = $2 AND is_deleted = 0",
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_BOOTSTRAP_ADMIN_USERNAME)
    .fetch_optional(pool)
    .await?;
    if let Some((id,)) = by_username {
        return Ok(id);
    }
    resolve_bootstrap_admin_user_id_from_owner_postgres(pool).await
}

async fn resolve_bootstrap_admin_user_id_from_owner_postgres(
    pool: &PgPool,
) -> anyhow::Result<String> {
    let owner: Option<(String,)> = sqlx::query_as(
        "SELECT user_id::text FROM iam_organization_membership \
         WHERE tenant_id = $1 AND membership_kind = 'owner' AND status = 'active' \
         LIMIT 1",
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .fetch_optional(pool)
    .await?;
    if let Some((user_id,)) = owner {
        let user: Option<(String,)> = sqlx::query_as(
            "SELECT id::text FROM iam_user WHERE id = $1 AND tenant_id = $2 AND is_deleted = 0",
        )
        .bind(&user_id)
        .bind(DEFAULT_IAM_TENANT_ID)
        .fetch_optional(pool)
        .await?;
        if let Some((id,)) = user {
            return Ok(id);
        }
    }
    Err(InstallerCliError::InvalidState(format!(
        "bootstrap admin user not found (username={DEFAULT_BOOTSTRAP_ADMIN_USERNAME}, \
         tenant_id={DEFAULT_IAM_TENANT_ID}). Run `pnpm dev` or `pnpm start` first to \
         initialize IAM bootstrap, then retry reset-admin."
    ))
    .into())
}

async fn run_reset_admin_postgres(
    pool: &PgPool,
    options: &ResetAdminOptions,
) -> anyhow::Result<()> {
    let password = read_reset_admin_password()?;
    let admin_user_id = resolve_bootstrap_admin_user_id_postgres(pool).await?;

    let now = chrono::Utc::now();
    let password_hash = hash_admin_password(&password)?;

    let affected = sqlx::query(
        "UPDATE iam_credential SET \
         credential_hash = $1, failed_attempts = 0, status = 'active', updated_at = $2 \
         WHERE tenant_id = $3 AND user_id = $4 AND credential_type = 'password'",
    )
    .bind(&password_hash)
    .bind(&now)
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(&admin_user_id)
    .execute(pool)
    .await?
    .rows_affected();
    if affected == 0 {
        sqlx::query(
            "INSERT INTO iam_credential \
             (id, tenant_id, user_id, credential_type, credential_hash, \
             failed_attempts, status, created_at, updated_at) \
             VALUES ($1, $2, $3, 'password', $4, 0, 'active', $5, $5)",
        )
        .bind(bootstrap_credential_id(&admin_user_id))
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(&admin_user_id)
        .bind(&password_hash)
        .bind(&now)
        .execute(pool)
        .await?;
    }

    let username = resolve_admin_username_postgres(pool, &options.username, &admin_user_id).await?;
    print_json(&ResetAdminOutput {
        status: "reset",
        user_id: admin_user_id,
        tenant_id: DEFAULT_IAM_TENANT_ID,
        username,
    })
}

async fn resolve_admin_username_postgres(
    pool: &PgPool,
    fallback: &str,
    user_id: &str,
) -> anyhow::Result<String> {
    let row: Option<(String,)> = sqlx::query_as(
        "SELECT username FROM iam_user WHERE id = $1 AND tenant_id = $2 AND is_deleted = 0",
    )
    .bind(user_id)
    .bind(DEFAULT_IAM_TENANT_ID)
    .fetch_optional(pool)
    .await?;
    Ok(row
        .map(|(username,)| username)
        .unwrap_or_else(|| fallback.to_owned()))
}

fn next_arg<I>(args: &mut std::iter::Peekable<I>, name: &str) -> anyhow::Result<String>
where
    I: Iterator<Item = String>,
{
    args.next()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            InstallerCliError::InvalidArgument(format!("{name} requires a value")).into()
        })
}

fn normalize_vendor_code(value: String) -> anyhow::Result<String> {
    let value = value.trim().to_ascii_lowercase();
    if value.is_empty()
        || value.len() > 64
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
    {
        return Err(InstallerCliError::InvalidArgument(
            "vendor code must contain only letters, numbers, -, and _".to_owned(),
        )
        .into());
    }
    Ok(value)
}

fn normalize_refresh_mode(value: String) -> anyhow::Result<String> {
    let value = normalize_refresh_token(value, "mode", 64)?;
    if matches!(
        value.as_str(),
        "official_refresh" | "vendor_refresh" | "catalog_version_refresh" | "dry_run"
    ) {
        return Ok(value);
    }
    Err(InstallerCliError::InvalidArgument(
        "mode must be official_refresh, vendor_refresh, catalog_version_refresh, or dry_run"
            .to_owned(),
    )
    .into())
}

fn normalize_refresh_token(
    value: String,
    name: &'static str,
    max_len: usize,
) -> anyhow::Result<String> {
    let value = value.trim().to_ascii_lowercase();
    if value.is_empty() {
        return Err(InstallerCliError::InvalidArgument(format!("{name} must not be blank")).into());
    }
    if value.len() > max_len {
        return Err(InstallerCliError::InvalidArgument(format!(
            "{name} must be {max_len} characters or fewer"
        ))
        .into());
    }
    if !value
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
    {
        return Err(InstallerCliError::InvalidArgument(format!(
            "{name} must contain only letters, numbers, -, and _"
        ))
        .into());
    }
    Ok(value)
}

fn normalize_catalog_root(value: String) -> anyhow::Result<String> {
    let value = value.trim().to_owned();
    if value.is_empty() {
        return Err(InstallerCliError::InvalidArgument(
            "catalog root must not be blank".to_owned(),
        )
        .into());
    }
    if value.chars().count() > 512 {
        return Err(InstallerCliError::InvalidArgument(
            "catalog root must be 512 characters or fewer".to_owned(),
        )
        .into());
    }
    if value.chars().any(char::is_control) {
        return Err(InstallerCliError::InvalidArgument(
            "catalog root must not contain control characters".to_owned(),
        )
        .into());
    }
    Ok(value)
}

fn normalize_catalog_version(value: String) -> anyhow::Result<String> {
    let value = value.trim().to_owned();
    if value.is_empty() {
        return Err(InstallerCliError::InvalidArgument(
            "catalog version must not be blank".to_owned(),
        )
        .into());
    }
    if value.chars().count() > 128 {
        return Err(InstallerCliError::InvalidArgument(
            "catalog version must be 128 characters or fewer".to_owned(),
        )
        .into());
    }
    if !value
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'-' | b'_'))
    {
        return Err(InstallerCliError::InvalidArgument(
            "catalog version must contain only letters, numbers, ., -, and _".to_owned(),
        )
        .into());
    }
    Ok(value)
}

fn status_code(status: &InstallationStatus) -> &'static str {
    match status {
        InstallationStatus::NotInstalled => "not_installed",
        InstallationStatus::Installed => "installed",
        InstallationStatus::UpgradeRequired => "upgrade_required",
        InstallationStatus::Incomplete => "incomplete",
        InstallationStatus::Corrupt => "corrupt",
        InstallationStatus::CatalogUnavailable => "catalog_unavailable",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn installer_error_code_maps_sqlx_pool_timeout_as_database_error() {
        let error = sqlx::Error::PoolTimedOut;

        assert_eq!(
            "database_error",
            installer_error_code(&error, &error.to_string())
        );
    }

    #[test]
    fn only_schema_lifecycle_commands_run_explicit_migrations() {
        assert!(InstallerCommand::Install.requires_schema_migration());
        assert!(InstallerCommand::Upgrade.requires_schema_migration());
        assert!(InstallerCommand::Ensure.requires_schema_migration());
        assert!(!InstallerCommand::Status.requires_schema_migration());
        assert!(
            !InstallerCommand::RefreshCatalog(CatalogRefreshOptions::default())
                .requires_schema_migration()
        );
    }

    #[test]
    fn installer_error_code_maps_cli_database_connection_errors() {
        let error = InstallerCliError::DatabaseConnection("database unavailable".to_owned());

        assert_eq!(
            "database_error",
            installer_error_code(&error, &error.to_string())
        );
    }

    #[test]
    fn postgres_database_connection_message_redacts_password_and_names_fallback() {
        let message = database_connection_error_message(
            "postgresql://sdkwork_ai_dev:sdkworkdev123@[::1]:5432/sdkwork_ai_dev?sslmode=disable",
            sqlx::Error::PoolTimedOut,
        );

        assert!(message.contains("postgresql://sdkwork_ai_dev:***@[::1]:5432"));
        assert!(!message.contains("sdkworkdev123"));
        assert!(message.contains("PostgreSQL database is not reachable"));
    }

    #[test]
    fn installer_rejects_sqlite_as_non_authoritative_server_storage() {
        let config = DatabaseConfig::from_url("sqlite::memory:").expect("parse SQLite config");
        let error = require_postgres_installer_database(&config)
            .expect_err("server installer must reject SQLite");

        assert!(error
            .to_string()
            .contains("clawrouterctl requires PostgreSQL"));
    }
}
