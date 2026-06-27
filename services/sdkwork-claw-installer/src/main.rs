use sdkwork_claw_config::{DatabaseConfig, DatabaseEngine, DeploymentMode, RuntimeConfigProfile};
use sdkwork_clawrouter_router_service::infrastructure::sql::installer::{
    BootstrapAdminReport, CatalogRefreshOptions, CatalogRefreshReport, DatabaseInstallError,
    DatabaseInstaller, InstallationReport, InstallationStatus, ResetAdminPasswordReport,
};
use serde::Serialize;
use sqlx::postgres::PgPoolOptions;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use std::error::Error;
use std::fmt::{Display, Formatter};
use std::process::ExitCode;
use std::str::FromStr;
use std::time::Duration;

const POSTGRES_INSTALLER_POOL_ACQUIRE_TIMEOUT_SECONDS: u64 = 10;

#[tokio::main]
async fn main() -> ExitCode {
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

    match config.engine {
        DatabaseEngine::Sqlite => run_sqlite(config, command).await?,
        DatabaseEngine::Postgres => run_postgres(config, command).await?,
    }

    Ok(())
}

async fn run_sqlite(config: DatabaseConfig, command: InstallerCommand) -> anyhow::Result<()> {
    let options = SqliteConnectOptions::from_str(config.url.as_str())?.create_if_missing(true);
    let pool = SqlitePoolOptions::new()
        .max_connections(config.max_connections)
        .connect_with(options)
        .await?;
    run_command(
        DatabaseInstaller::for_sqlite(pool).with_env_options()?,
        command,
    )
    .await
}

async fn run_postgres(config: DatabaseConfig, command: InstallerCommand) -> anyhow::Result<()> {
    let pool = postgres_installer_pool_options(config.max_connections)
        .connect(&config.url)
        .await
        .map_err(|error| {
            InstallerCliError::DatabaseConnection(database_connection_error_message(
                DatabaseEngine::Postgres,
                &config.url,
                error,
            ))
        })?;
    run_command(
        DatabaseInstaller::for_postgres(pool).with_env_options()?,
        command,
    )
    .await
}

fn postgres_installer_pool_options(max_connections: u32) -> PgPoolOptions {
    PgPoolOptions::new()
        .max_connections(max_connections)
        .acquire_timeout(Duration::from_secs(
            POSTGRES_INSTALLER_POOL_ACQUIRE_TIMEOUT_SECONDS,
        ))
}

fn database_connection_error_message(
    engine: DatabaseEngine,
    database_url: &str,
    error: sqlx::Error,
) -> String {
    match engine {
        DatabaseEngine::Postgres => format!(
            "PostgreSQL database is not reachable for SDKWORK_CLAW_DATABASE_URL ({}) within {} seconds: {error}. Start the configured PostgreSQL service, fix the host/port/credentials, or run a SQLite dev profile such as pnpm dev:sqlite.",
            redact_database_url(database_url),
            POSTGRES_INSTALLER_POOL_ACQUIRE_TIMEOUT_SECONDS
        ),
        DatabaseEngine::Sqlite => format!(
            "SQLite database is not reachable for SDKWORK_CLAW_DATABASE_URL ({}): {error}. Verify the database file path and directory permissions.",
            redact_database_url(database_url)
        ),
    }
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
            let report = installer.ensure_installed().await?;
            print_json(&InstallationStatusOutput::from(report))?;
        }
        InstallerCommand::Upgrade | InstallerCommand::Ensure => {
            let report = installer.ensure_installed().await?;
            print_json(&InstallationStatusOutput::from(report))?;
        }
        InstallerCommand::RefreshCatalog(options) => {
            let report = installer.refresh_catalog(options.clone()).await?;
            let status_report = installer
                .status_report_for_refresh_options(&options)
                .await?;
            print_json(&CatalogRefreshOutput::from_reports(report, status_report))?;
        }
        InstallerCommand::ResetAdmin(options) => {
            let report = installer
                .reset_admin_password(
                    options.username,
                    options.display_name,
                    options.email,
                    options.password,
                )
                .await?;
            print_json(&ResetAdminOutput::from(report))?;
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

#[derive(Debug, Clone, PartialEq, Eq)]
struct ResetAdminOptions {
    username: String,
    display_name: String,
    email: String,
    password: String,
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
    let mut username = "admin".to_owned();
    let mut display_name = "Administrator".to_owned();
    let mut email = "admin@sdkwork.com".to_owned();
    let mut password = std::env::var("SDKWORK_CLAW_ADMIN_RESET_PASSWORD")
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty());

    let mut args = args.into_iter().peekable();
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--username" => username = next_arg(&mut args, "--username")?,
            "--display-name" => display_name = next_arg(&mut args, "--display-name")?,
            "--email" => email = next_arg(&mut args, "--email")?,
            "--password" => password = Some(next_arg(&mut args, "--password")?),
            other => {
                return Err(InstallerCliError::InvalidArgument(format!(
                    "unsupported reset-admin option: {other}"
                ))
                .into());
            }
        }
    }

    let password = password.ok_or_else(|| {
        InstallerCliError::InvalidArgument(
            "reset-admin requires --password or SDKWORK_CLAW_ADMIN_RESET_PASSWORD".to_owned(),
        )
    })?;

    Ok(ResetAdminOptions {
        username,
        display_name,
        email,
        password,
    })
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
    #[serde(skip_serializing_if = "Option::is_none")]
    bootstrap_admin: Option<BootstrapAdminOutput>,
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
            bootstrap_admin: report.bootstrap_admin.map(BootstrapAdminOutput::from),
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BootstrapAdminOutput {
    status: String,
    tenant_id: String,
    organization_id: String,
    user_id: String,
    username: String,
    display_name: String,
    email: String,
    initial_password: String,
    generated_password: bool,
}

impl From<BootstrapAdminReport> for BootstrapAdminOutput {
    fn from(report: BootstrapAdminReport) -> Self {
        Self {
            status: report.status,
            tenant_id: report.tenant_id,
            organization_id: report.organization_id,
            user_id: report.user_id,
            username: report.username,
            display_name: report.display_name,
            email: report.email,
            initial_password: report.initial_password,
            generated_password: report.generated_password,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ResetAdminOutput {
    status: &'static str,
    tenant_id: String,
    organization_id: String,
    user_id: String,
    username: String,
    display_name: String,
    email: String,
    password_changed: bool,
}

impl From<ResetAdminPasswordReport> for ResetAdminOutput {
    fn from(report: ResetAdminPasswordReport) -> Self {
        Self {
            status: "reset_admin",
            tenant_id: report.tenant_id,
            organization_id: report.organization_id,
            user_id: report.user_id,
            username: report.username,
            display_name: report.display_name,
            email: report.email,
            password_changed: report.status == "reset",
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
    #[serde(skip_serializing_if = "Option::is_none")]
    bootstrap_admin: Option<BootstrapAdminOutput>,
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
            InstallerCliError::DatabaseConnection(_) => "database_error",
        };
    }
    if let Some(installer_error) = error.downcast_ref::<DatabaseInstallError>() {
        return match installer_error {
            DatabaseInstallError::Database(_) => "database_error",
            DatabaseInstallError::Catalog(_) => "catalog_error",
            DatabaseInstallError::Commerce(_) => "commerce_error",
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
    } else if message.contains("database")
        || message.contains("sqlite")
        || message.contains("postgres")
    {
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
            Self::DatabaseConnection(message) => write!(formatter, "{message}"),
        }
    }
}

impl Error for InstallerCliError {}

fn runtime_config_profile_from_deployment_mode() -> RuntimeConfigProfile {
    match DeploymentMode::from_env() {
        DeploymentMode::Desktop => RuntimeConfigProfile::Desktop,
        DeploymentMode::Server | DeploymentMode::Docker | DeploymentMode::Kubernetes => {
            RuntimeConfigProfile::Server
        }
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
            bootstrap_admin: refresh.bootstrap_admin.map(BootstrapAdminOutput::from),
        }
    }
}

fn print_json<T: Serialize>(value: &T) -> anyhow::Result<()> {
    println!("{}", serde_json::to_string(value)?);
    Ok(())
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
    use sdkwork_commerce_core::CommerceServiceError;

    #[test]
    fn installer_error_code_maps_commerce_bootstrap_errors() {
        let error = DatabaseInstallError::Commerce(CommerceServiceError::storage(
            "failed to seed commerce experience",
        ));

        assert_eq!(
            "commerce_error",
            installer_error_code(&error, &error.to_string())
        );
    }

    #[test]
    fn installer_error_code_maps_sqlx_pool_timeout_as_database_error() {
        let error = sqlx::Error::PoolTimedOut;

        assert_eq!(
            "database_error",
            installer_error_code(&error, &error.to_string())
        );
    }

    #[test]
    fn postgres_installer_pool_options_use_bounded_acquire_timeout() {
        let options = postgres_installer_pool_options(10);

        assert_eq!(10, options.get_max_connections());
        assert_eq!(
            std::time::Duration::from_secs(POSTGRES_INSTALLER_POOL_ACQUIRE_TIMEOUT_SECONDS),
            options.get_acquire_timeout()
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
            DatabaseEngine::Postgres,
            "postgresql://sdkwork_ai_dev:sdkworkdev123@[::1]:5432/sdkwork_ai_dev?sslmode=disable",
            sqlx::Error::PoolTimedOut,
        );

        assert!(message.contains("postgresql://sdkwork_ai_dev:***@[::1]:5432"));
        assert!(!message.contains("sdkworkdev123"));
        assert!(message.contains("pnpm dev:sqlite"));
    }
}
