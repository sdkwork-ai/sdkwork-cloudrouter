//! Database and data-volume backup/restore for commercial deployments.
//!
//! `cloudrouterctl backup` produces a single tar.gz containing a PostgreSQL
//! custom-format dump (`postgres/cloudrouter.dump`) plus the durable data
//! volume (`data/`). `cloudrouterctl restore` restores both. Backups default
//! to the durable data volume (`/var/lib/sdkwork/router/backups`) so they
//! survive container recreation; host deployments may pass `--output`.
//!
//! Requires `pg_dump`/`pg_restore` (postgresql-client) and `tar` on the host
//! or inside the container image.

use sdkwork_cloudrouter_config::DatabaseConfig;
use std::path::PathBuf;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

/// Default backup output directory: the durable data volume
/// (RUNTIME_DIRECTORY_SPEC §4.5) so backups survive container recreation.
const DEFAULT_BACKUP_DIR: &str = "/var/lib/sdkwork/router/backups";
/// Durable data volume root included in backups.
const DATA_VOLUME_ROOT: &str = "/var/lib/sdkwork/router";
/// Backup file name prefix.
const BACKUP_FILE_PREFIX: &str = "cloudrouter-backup";

#[derive(Debug)]
pub struct BackupOptions {
    pub output: Option<PathBuf>,
}

#[derive(Debug)]
pub struct RestoreOptions {
    pub input: PathBuf,
    /// When set, the durable data volume files are not restored.
    pub database_only: bool,
}

#[derive(Debug, serde::Serialize)]
pub struct BackupReport {
    pub output: String,
    pub database: String,
    pub bytes: u64,
    pub created_at: String,
}

#[derive(Debug, serde::Serialize)]
pub struct RestoreReport {
    pub input: String,
    pub database: String,
    pub data_volume_restored: bool,
    pub restored_at: String,
}

/// Parsed PostgreSQL connection target for the pg_* command line tools.
struct PostgresTarget {
    host: String,
    port: u16,
    username: String,
    database: String,
    password: Option<String>,
}

impl PostgresTarget {
    fn from_config(config: &DatabaseConfig) -> anyhow::Result<Self> {
        let options: sqlx::postgres::PgConnectOptions = config
            .url
            .parse()
            .map_err(|error| anyhow::anyhow!("invalid PostgreSQL URL: {error}"))?;
        // PgConnectOptions does not expose a password getter; re-read the URL
        // through the `url` crate for the pg_* tool password env.
        let parsed_url = url::Url::parse(&config.url)
            .map_err(|error| anyhow::anyhow!("invalid PostgreSQL URL: {error}"))?;
        Ok(Self {
            host: options.get_host().to_owned(),
            port: options.get_port(),
            username: options.get_username().to_owned(),
            database: options.get_database().unwrap_or_default().to_owned(),
            password: parsed_url.password().map(str::to_owned),
        })
    }

    fn pg_args(&self) -> Vec<String> {
        let mut args = vec![
            "-h".to_owned(),
            self.host.clone(),
            "-p".to_owned(),
            self.port.to_string(),
            "-U".to_owned(),
            self.username.clone(),
            "-d".to_owned(),
            self.database.clone(),
        ];
        args
    }

    fn apply_password(&self, command: &mut Command) {
        if let Some(password) = &self.password {
            command.env("PGPASSWORD", password);
        }
    }
}

fn timestamp_now() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    chrono::Utc::now().format("%Y%m%d-%H%M%S").to_string() + &format!("-{now}")
}

fn run_command(program: &str, args: &[String], description: &str) -> anyhow::Result<()> {
    let output = Command::new(program)
        .args(args)
        .output()
        .map_err(|error| anyhow::anyhow!("failed to spawn {program} ({description}): {error}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("{program} failed ({description}): {stderr}");
    }
    Ok(())
}

/// Creates a full backup: PostgreSQL custom-format dump + durable data volume.
pub async fn run_backup(
    config: &DatabaseConfig,
    options: BackupOptions,
) -> anyhow::Result<BackupReport> {
    let target = PostgresTarget::from_config(config)?;
    if target.database.is_empty() {
        anyhow::bail!("database name is missing from the PostgreSQL URL");
    }

    let output = options.output.unwrap_or_else(|| {
        PathBuf::from(DEFAULT_BACKUP_DIR).join(format!(
            "{BACKUP_FILE_PREFIX}-{}.tar.gz",
            timestamp_now()
        ))
    });
    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| anyhow::anyhow!("create backup directory failed: {error}"))?;
    }

    let staging = std::env::temp_dir().join(format!("cloudrouter-backup-{}", timestamp_now()));
    let dump_dir = staging.join("postgres");
    let data_dir = staging.join("data");
    std::fs::create_dir_all(&dump_dir)
        .map_err(|error| anyhow::anyhow!("create staging directory failed: {error}"))?;
    std::fs::create_dir_all(&data_dir)
        .map_err(|error| anyhow::anyhow!("create staging data directory failed: {error}"))?;

    // 1. PostgreSQL dump (custom format).
    let dump_path = dump_dir.join("cloudrouter.dump");
    let mut dump_args = target.pg_args();
    dump_args.extend(["-Fc".to_owned(), "-f".to_owned(), dump_path.display().to_string()]);
    let mut dump_command = Command::new("pg_dump");
    dump_command.args(&dump_args);
    target.apply_password(&mut dump_command);
    let dump_output = dump_command.output().map_err(|error| {
        anyhow::anyhow!(
            "failed to spawn pg_dump; install postgresql-client on the host or in the image: {error}"
        )
    })?;
    if !dump_output.status.success() {
        anyhow::bail!(
            "pg_dump failed: {}",
            String::from_utf8_lossy(&dump_output.stderr)
        );
    }

    // 2. Durable data volume (backup output directory excluded to avoid
    //    recursive self-capture; other backups under the volume are kept).
    //    GNU tar: options must precede the file arguments.
    let mut tar_args = vec![
        "-czf".to_owned(),
        output.display().to_string(),
        // Exclude the backups directory at any depth: the output file lives
        // inside it (data volume) and would otherwise be captured while it
        // is still growing. The member path contains `/./`, so a wildcard
        // pattern is required.
        "--exclude".to_owned(),
        "*/backups".to_owned(),
        "-C".to_owned(),
        staging.display().to_string(),
        "postgres".to_owned(),
        "-C".to_owned(),
        "/".to_owned(),
        format!("{DATA_VOLUME_ROOT}/."),
    ];
    run_command("tar", &tar_args, "data volume packaging")?;

    let bytes = std::fs::metadata(&output)
        .map_err(|error| anyhow::anyhow!("read backup size failed: {error}"))?
        .len();
    let _ = std::fs::remove_dir_all(&staging);

    Ok(BackupReport {
        output: output.display().to_string(),
        database: target.database,
        bytes,
        created_at: chrono::Utc::now().to_rfc3339(),
    })
}

/// Restores a backup created by [`run_backup`]: PostgreSQL dump first, then
/// the durable data volume unless `database_only` is set.
pub async fn run_restore(
    config: &DatabaseConfig,
    options: RestoreOptions,
) -> anyhow::Result<RestoreReport> {
    let target = PostgresTarget::from_config(config)?;
    if !options.input.is_file() {
        anyhow::bail!("backup file does not exist: {}", options.input.display());
    }

    let staging = std::env::temp_dir().join(format!("cloudrouter-restore-{}", timestamp_now()));
    std::fs::create_dir_all(&staging)
        .map_err(|error| anyhow::anyhow!("create restore staging failed: {error}"))?;
    let extract_args = vec![
        "-xzf".to_owned(),
        options.input.display().to_string(),
        "-C".to_owned(),
        staging.display().to_string(),
    ];
    run_command("tar", &extract_args, "backup extraction")?;

    // 1. Restore the PostgreSQL dump.
    let dump_path = staging.join("postgres").join("cloudrouter.dump");
    if !dump_path.is_file() {
        anyhow::bail!("backup does not contain postgres/cloudrouter.dump");
    }
    let mut restore_args = target.pg_args();
    restore_args.extend([
        "--clean".to_owned(),
        "--if-exists".to_owned(),
        "--no-owner".to_owned(),
        "--no-privileges".to_owned(),
    ]);
    let mut restore_command = Command::new("pg_restore");
    restore_command.args(&restore_args);
    restore_command.arg(dump_path.display().to_string());
    target.apply_password(&mut restore_command);
    let output = restore_command.output().map_err(|error| {
        anyhow::anyhow!(
            "failed to spawn pg_restore; install postgresql-client on the host or in the image: {error}"
        )
    })?;
    if !output.status.success() {
        anyhow::bail!(
            "pg_restore failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    // 2. Restore the durable data volume (unless database-only).
    let mut data_volume_restored = false;
    let data_dir = staging.join("data");
    if data_dir.is_dir() && !options.database_only {
        let copy_args = vec![
            "-a".to_owned(),
            format!("{}/.", data_dir.display()),
            DATA_VOLUME_ROOT.to_owned(),
        ];
        run_command("cp", &copy_args, "data volume restore")?;
        data_volume_restored = true;
    }

    let _ = std::fs::remove_dir_all(&staging);
    Ok(RestoreReport {
        input: options.input.display().to_string(),
        database: target.database,
        data_volume_restored,
        restored_at: chrono::Utc::now().to_rfc3339(),
    })
}
