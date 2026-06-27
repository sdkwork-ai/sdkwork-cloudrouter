use std::sync::OnceLock;

use sdkwork_database_config::DatabaseConfig as StandardDatabaseConfig;
use sdkwork_database_config::DatabaseEngine as StandardDatabaseEngine;
use sdkwork_database_config::SqliteJournalMode;
use sdkwork_id_core::SnowflakeIdGenerator;

use crate::domain::{DomainError, DomainResult};

/// Converts the application-specific database config to the SDKWork standard config
/// for use with `sdkwork-database-sqlx::PoolBuilder`.
pub(crate) fn to_standard_database_config(
    config: &sdkwork_claw_config::DatabaseConfig,
) -> StandardDatabaseConfig {
    let engine = match config.engine {
        sdkwork_claw_config::DatabaseEngine::Sqlite => StandardDatabaseEngine::Sqlite,
        sdkwork_claw_config::DatabaseEngine::Postgres => StandardDatabaseEngine::Postgres,
    };
    StandardDatabaseConfig {
        engine,
        url: config.url.clone(),
        max_connections: config.max_connections,
        sqlite: sdkwork_database_config::SqliteConfig {
            journal_mode: SqliteJournalMode::Wal,
            busy_timeout_secs: 30,
            foreign_keys: true,
            create_if_missing: true,
            ..sdkwork_database_config::SqliteConfig::default()
        },
        ..StandardDatabaseConfig::default()
    }
}

const DEFAULT_CLAW_RUNTIME_NODE_ID: u16 = 23;
const CLAW_RUNTIME_NODE_ID_ENV: &str = "SDKWORK_CLAW_SNOWFLAKE_NODE_ID";

static CLAW_RUNTIME_ID_GENERATOR: OnceLock<Result<SnowflakeIdGenerator, String>> = OnceLock::new();

pub(crate) fn next_claw_runtime_id(context: &str) -> DomainResult<i64> {
    let generator = claw_runtime_id_generator()?;
    next_runtime_id(generator, context)
}

/// Generates a globally unique user ID using the Claw runtime Snowflake generator.
/// Replaces `MAX(id) + 1` patterns in admin/user stores per DATABASE_SPEC §6.1.
pub(crate) fn next_user_id(context: &str) -> DomainResult<i64> {
    let generator = claw_runtime_id_generator()?;
    next_runtime_id(generator, context)
}

fn claw_runtime_id_generator() -> DomainResult<&'static SnowflakeIdGenerator> {
    match CLAW_RUNTIME_ID_GENERATOR.get_or_init(build_claw_runtime_id_generator) {
        Ok(generator) => Ok(generator),
        Err(message) => Err(DomainError::new(message.clone())),
    }
}

fn build_claw_runtime_id_generator() -> Result<SnowflakeIdGenerator, String> {
    let node_id = match std::env::var(CLAW_RUNTIME_NODE_ID_ENV) {
        Ok(value) if !value.trim().is_empty() => value.trim().parse::<u16>().map_err(|_| {
            format!("{CLAW_RUNTIME_NODE_ID_ENV} must be an integer between 0 and 1023")
        })?,
        Ok(_) => {
            return Err(format!(
                "{CLAW_RUNTIME_NODE_ID_ENV} must be an integer between 0 and 1023"
            ));
        }
        Err(_) => DEFAULT_CLAW_RUNTIME_NODE_ID,
    };

    SnowflakeIdGenerator::new(node_id).map_err(|error| {
        format!("{CLAW_RUNTIME_NODE_ID_ENV} is invalid for Claw runtime IDs: {error:?}")
    })
}

fn next_runtime_id(generator: &SnowflakeIdGenerator, context: &str) -> DomainResult<i64> {
    generator
        .generate()
        .map_err(|error| DomainError::new(format!("failed to generate {context} id: {error:?}")))
}
