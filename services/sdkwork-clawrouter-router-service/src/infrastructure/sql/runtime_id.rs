use std::sync::OnceLock;

use sdkwork_claw_config::{DeploymentMode, RuntimeTomlConfig};
use sdkwork_database_config::claw_database::postgres_url_with_search_path;
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
    let url = match config.engine {
        sdkwork_claw_config::DatabaseEngine::Postgres => {
            postgres_url_with_search_path(&config.url, "SDKWORK_CLAW")
        }
        sdkwork_claw_config::DatabaseEngine::Sqlite => config.url.clone(),
    };
    StandardDatabaseConfig {
        engine,
        url,
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

const CLAW_RUNTIME_NODE_ID_ENV: &str = "SDKWORK_CLAW_SNOWFLAKE_NODE_ID";
const MAX_CLAW_RUNTIME_NODE_ID: u16 = 1023;

static CLAW_RUNTIME_ID_GENERATOR: OnceLock<
    Result<SnowflakeIdGenerator, RuntimeIdConfigurationError>,
> = OnceLock::new();

/// A startup-time configuration error for the process-local Snowflake generator.
///
/// The generator is only safe when every non-desktop process has a distinct node ID.
/// Cluster-wide allocation, fencing, and recovery remain deployment responsibilities; this
/// validation only prevents a process from silently starting with a shared fallback ID.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeIdConfigurationError {
    message: String,
}

impl RuntimeIdConfigurationError {
    fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

impl std::fmt::Display for RuntimeIdConfigurationError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(&self.message)
    }
}

impl std::error::Error for RuntimeIdConfigurationError {}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum RuntimeNodeId {
    Explicit(u16),
    LocalDevelopmentFallback(u16),
}

impl RuntimeNodeId {
    fn value(self) -> u16 {
        match self {
            Self::Explicit(value) | Self::LocalDevelopmentFallback(value) => value,
        }
    }
}

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

/// Validates the configured Snowflake node ID before a gateway accepts traffic and returns the
/// resolved deployment mode for the caller to reuse.
///
/// Desktop keeps its process-local fallback because it is a single-user local runtime. Server and
/// container modes must provide `SDKWORK_CLAW_SNOWFLAKE_NODE_ID`; a distributed lease/fencing
/// mechanism is still required before treating a multi-replica deployment as highly available.
pub fn validate_claw_runtime_id_configuration(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<DeploymentMode, RuntimeIdConfigurationError> {
    let deployment_mode = resolve_runtime_id_deployment_mode(runtime_toml)?;
    let configured_node_id = configured_runtime_node_id_from_env()?;
    validate_runtime_node_id_configuration(configured_node_id.as_deref(), deployment_mode)?;
    Ok(deployment_mode)
}

fn claw_runtime_id_generator() -> DomainResult<&'static SnowflakeIdGenerator> {
    match CLAW_RUNTIME_ID_GENERATOR.get_or_init(build_claw_runtime_id_generator) {
        Ok(generator) => Ok(generator),
        Err(error) => Err(DomainError::new(error.to_string())),
    }
}

fn build_claw_runtime_id_generator() -> Result<SnowflakeIdGenerator, RuntimeIdConfigurationError> {
    let configured_node_id = configured_runtime_node_id_from_env()?;
    let runtime_toml = RuntimeTomlConfig::from_env_config_file().map_err(|error| {
        RuntimeIdConfigurationError::new(format!(
            "failed to load runtime configuration for runtime IDs: {error}"
        ))
    })?;
    let deployment_mode = resolve_runtime_id_deployment_mode(runtime_toml.as_ref())?;
    let node_id = resolve_runtime_node_id(
        configured_node_id.as_deref(),
        deployment_mode,
        local_development_node_id,
    )?;
    if matches!(node_id, RuntimeNodeId::LocalDevelopmentFallback(_)) {
        tracing::warn!(
            deployment_mode = deployment_mode.as_str(),
            "Snowflake node id is using a process-local desktop development fallback; this mode is not safe for multi-process or clustered deployment"
        );
    }

    SnowflakeIdGenerator::new(node_id.value()).map_err(|error| {
        RuntimeIdConfigurationError::new(format!(
            "{CLAW_RUNTIME_NODE_ID_ENV} is invalid for Claw runtime IDs: {error:?}"
        ))
    })
}

fn resolve_runtime_id_deployment_mode(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<DeploymentMode, RuntimeIdConfigurationError> {
    DeploymentMode::from_env_or_runtime_toml(runtime_toml).map_err(|error| {
        RuntimeIdConfigurationError::new(format!(
            "failed to resolve deployment mode for runtime IDs: {error}"
        ))
    })
}

fn configured_runtime_node_id_from_env() -> Result<Option<String>, RuntimeIdConfigurationError> {
    Ok(match std::env::var(CLAW_RUNTIME_NODE_ID_ENV) {
        Ok(value) => Some(value),
        Err(std::env::VarError::NotPresent) => None,
        Err(std::env::VarError::NotUnicode(_)) => {
            return Err(RuntimeIdConfigurationError::new(format!(
                "{CLAW_RUNTIME_NODE_ID_ENV} must contain valid Unicode"
            )));
        }
    })
}

fn resolve_runtime_node_id<F>(
    configured_node_id: Option<&str>,
    deployment_mode: DeploymentMode,
    local_development_fallback: F,
) -> Result<RuntimeNodeId, RuntimeIdConfigurationError>
where
    F: FnOnce() -> Result<u16, RuntimeIdConfigurationError>,
{
    match configured_runtime_node_id(configured_node_id, deployment_mode)? {
        Some(node_id) => Ok(RuntimeNodeId::Explicit(node_id)),
        None => {
            let node_id = local_development_fallback()?;
            if node_id > MAX_CLAW_RUNTIME_NODE_ID {
                return Err(RuntimeIdConfigurationError::new(format!(
                    "desktop development Snowflake node id must be between 0 and {MAX_CLAW_RUNTIME_NODE_ID}"
                )));
            }
            Ok(RuntimeNodeId::LocalDevelopmentFallback(node_id))
        }
    }
}

fn validate_runtime_node_id_configuration(
    configured_node_id: Option<&str>,
    deployment_mode: DeploymentMode,
) -> Result<(), RuntimeIdConfigurationError> {
    configured_runtime_node_id(configured_node_id, deployment_mode).map(|_| ())
}

fn configured_runtime_node_id(
    configured_node_id: Option<&str>,
    deployment_mode: DeploymentMode,
) -> Result<Option<u16>, RuntimeIdConfigurationError> {
    match configured_node_id {
        Some(value) => parse_runtime_node_id(value).map(Some),
        None if deployment_mode == DeploymentMode::Desktop => Ok(None),
        None => Err(RuntimeIdConfigurationError::new(format!(
            "{CLAW_RUNTIME_NODE_ID_ENV} must be explicitly configured for {} deployments; no shared-node fallback is allowed",
            deployment_mode.as_str()
        ))),
    }
}

fn parse_runtime_node_id(value: &str) -> Result<u16, RuntimeIdConfigurationError> {
    let value = value.trim();
    if value.is_empty() {
        return Err(RuntimeIdConfigurationError::new(format!(
            "{CLAW_RUNTIME_NODE_ID_ENV} must be an integer between 0 and {MAX_CLAW_RUNTIME_NODE_ID}"
        )));
    }
    let node_id = value.parse::<u16>().map_err(|_| {
        RuntimeIdConfigurationError::new(format!(
            "{CLAW_RUNTIME_NODE_ID_ENV} must be an integer between 0 and {MAX_CLAW_RUNTIME_NODE_ID}"
        ))
    })?;
    if node_id > MAX_CLAW_RUNTIME_NODE_ID {
        return Err(RuntimeIdConfigurationError::new(format!(
            "{CLAW_RUNTIME_NODE_ID_ENV} must be an integer between 0 and {MAX_CLAW_RUNTIME_NODE_ID}"
        )));
    }
    Ok(node_id)
}

fn local_development_node_id() -> Result<u16, RuntimeIdConfigurationError> {
    let mut bytes = [0_u8; 2];
    getrandom::fill(&mut bytes).map_err(|error| {
        RuntimeIdConfigurationError::new(format!(
            "failed to allocate desktop development Snowflake node id: {error}"
        ))
    })?;
    Ok(u16::from_le_bytes(bytes) & MAX_CLAW_RUNTIME_NODE_ID)
}

fn next_runtime_id(generator: &SnowflakeIdGenerator, context: &str) -> DomainResult<i64> {
    generator
        .generate()
        .map_err(|error| DomainError::new(format!("failed to generate {context} id: {error:?}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn standard_postgres_config_materializes_the_claw_schema_search_path() {
        let previous_schema = std::env::var("SDKWORK_CLAW_DATABASE_SCHEMA").ok();
        std::env::set_var("SDKWORK_CLAW_DATABASE_SCHEMA", "sdkwork_ai_dev");
        let config = sdkwork_claw_config::DatabaseConfig {
            engine: sdkwork_claw_config::DatabaseEngine::Postgres,
            url: "postgresql://sdkwork_ai_dev:secret@127.0.0.1:5432/sdkwork_ai_dev?sslmode=disable"
                .to_owned(),
            max_connections: 10,
        };

        let standard = to_standard_database_config(&config);

        match previous_schema {
            Some(value) => std::env::set_var("SDKWORK_CLAW_DATABASE_SCHEMA", value),
            None => std::env::remove_var("SDKWORK_CLAW_DATABASE_SCHEMA"),
        }
        assert_eq!(
            standard.url,
            "postgresql://sdkwork_ai_dev:secret@127.0.0.1:5432/sdkwork_ai_dev?sslmode=disable&options=-c%20search_path%3Dsdkwork_ai_dev%2Cpublic"
        );
    }

    #[test]
    fn startup_validation_requires_an_explicit_server_snowflake_node_id() {
        let error = validate_runtime_node_id_configuration(None, DeploymentMode::Server)
            .expect_err("server startup must not use a shared default node id")
            .to_string();

        assert!(error.contains(CLAW_RUNTIME_NODE_ID_ENV));
        assert!(error.contains("server"));
    }

    #[test]
    fn runtime_id_deployment_mode_uses_the_supplied_runtime_toml() {
        let runtime_toml = RuntimeTomlConfig::from_toml_str(
            "[runtime]\ndeployment_profile = \"cloud\"\nruntime_target = \"container\"\n",
        )
        .expect("runtime TOML should parse");

        let deployment_mode = resolve_runtime_id_deployment_mode(Some(&runtime_toml))
            .expect("runtime ID deployment mode should resolve from TOML");

        assert_eq!(DeploymentMode::Kubernetes, deployment_mode);
    }

    #[test]
    fn startup_validation_requires_an_explicit_container_snowflake_node_id() {
        for deployment_mode in [DeploymentMode::Docker, DeploymentMode::Kubernetes] {
            let error = validate_runtime_node_id_configuration(None, deployment_mode)
                .expect_err("container startup must not use a process-local node id")
                .to_string();

            assert!(error.contains(CLAW_RUNTIME_NODE_ID_ENV));
            assert!(error.contains(deployment_mode.as_str()));
        }
    }

    #[test]
    fn desktop_runtime_uses_only_the_supplied_local_development_fallback() {
        let node_id = resolve_runtime_node_id(None, DeploymentMode::Desktop, || Ok(517))
            .expect("desktop development fallback should remain available");

        assert_eq!(RuntimeNodeId::LocalDevelopmentFallback(517), node_id);
    }

    #[test]
    fn explicit_node_id_is_accepted_for_any_runtime_mode() {
        let node_id = resolve_runtime_node_id(Some("1023"), DeploymentMode::Kubernetes, || {
            panic!("explicit configuration must not use the fallback")
        })
        .expect("maximum valid explicit node id");

        assert_eq!(RuntimeNodeId::Explicit(1023), node_id);
    }

    #[test]
    fn startup_validation_rejects_invalid_explicit_node_ids() {
        for value in ["", "not-a-number", "1024"] {
            let error =
                validate_runtime_node_id_configuration(Some(value), DeploymentMode::Desktop)
                    .expect_err("invalid explicit node id must fail closed")
                    .to_string();
            assert!(error.contains(CLAW_RUNTIME_NODE_ID_ENV));
        }
    }
}
