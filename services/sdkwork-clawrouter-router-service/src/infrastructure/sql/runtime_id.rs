use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;

use arc_swap::ArcSwapOption;
use sdkwork_claw_config::{DeploymentMode, RuntimeTomlConfig};
use sdkwork_database_config::workspace_database::normalize_workspace_postgres_url;
use sdkwork_database_config::DatabaseConfig as StandardDatabaseConfig;
use sdkwork_database_config::DatabaseEngine as StandardDatabaseEngine;
use sdkwork_database_id::{
    NodeAllocatorConfig, NodeAllocatorError, NodeLease, SnowflakeIdError, SnowflakeIdGenerator,
    SnowflakeNodeAllocator,
};
use sdkwork_database_sqlx::DatabasePool;

use crate::domain::{DomainError, DomainResult};

/// Converts the application-specific database config to the SDKWork standard config
/// for use with `sdkwork-database-sqlx::PoolBuilder`.
pub(crate) fn to_standard_database_config(
    config: &sdkwork_claw_config::DatabaseConfig,
) -> Result<StandardDatabaseConfig, RuntimeIdConfigurationError> {
    if !matches!(config.engine, sdkwork_claw_config::DatabaseEngine::Postgres) {
        return Err(RuntimeIdConfigurationError::new(
            "Claw Router server runtime requires PostgreSQL; SQLite is client-local only",
        ));
    }
    Ok(StandardDatabaseConfig {
        engine: StandardDatabaseEngine::Postgres,
        url: normalize_workspace_postgres_url(&config.url).map_err(|error| {
            RuntimeIdConfigurationError::new(format!(
                "invalid workspace PostgreSQL identity: {error}"
            ))
        })?,
        max_connections: config.max_connections,
        ..StandardDatabaseConfig::default()
    })
}

const CLAW_RUNTIME_NODE_ID_ENV: &str = "SDKWORK_CLAW_SNOWFLAKE_NODE_ID";
const MAX_CLAW_RUNTIME_NODE_ID: u16 = 1023;
const LEASE_HEALTH_CHECK_INTERVAL: Duration = Duration::from_secs(5);
const MAX_LEASE_RECOVERY_BACKOFF: Duration = Duration::from_secs(30);

fn runtime_id_generator_ready_gauge() -> prometheus::IntGauge {
    static METRIC: OnceLock<prometheus::IntGauge> = OnceLock::new();
    METRIC
        .get_or_init(|| {
            let metric = prometheus::IntGauge::new(
                "clawrouter_runtime_id_generator_ready",
                "1 when the process runtime ID generator is installed and its node lease is healthy.",
            )
            .expect("runtime ID generator readiness metric");
            let _ = prometheus::register(Box::new(metric.clone()));
            metric
        })
        .clone()
}

fn runtime_id_failure_counter() -> prometheus::IntCounterVec {
    static METRIC: OnceLock<prometheus::IntCounterVec> = OnceLock::new();
    METRIC
        .get_or_init(|| {
            let metric = prometheus::IntCounterVec::new(
                prometheus::Opts::new(
                    "clawrouter_runtime_id_failures_total",
                    "Runtime ID bootstrap, recovery, state, and generation failures.",
                ),
                &["operation", "reason"],
            )
            .expect("runtime ID failure metric");
            let _ = prometheus::register(Box::new(metric.clone()));
            metric
        })
        .clone()
}

fn set_runtime_id_generator_ready(ready: bool) {
    runtime_id_generator_ready_gauge().set(i64::from(ready));
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum RuntimeIdOperation {
    Bootstrap,
    Recovery,
    State,
    Generation,
}

impl RuntimeIdOperation {
    const fn as_str(self) -> &'static str {
        match self {
            Self::Bootstrap => "bootstrap",
            Self::Recovery => "recovery",
            Self::State => "state",
            Self::Generation => "generation",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum RuntimeIdFailureReason {
    Configuration,
    Database,
    NodeExhaustion,
    Contention,
    Lease,
    Clock,
    SequenceExhaustion,
    State,
}

impl RuntimeIdFailureReason {
    const fn as_str(self) -> &'static str {
        match self {
            Self::Configuration => "configuration",
            Self::Database => "database",
            Self::NodeExhaustion => "node_exhaustion",
            Self::Contention => "contention",
            Self::Lease => "lease",
            Self::Clock => "clock",
            Self::SequenceExhaustion => "sequence_exhaustion",
            Self::State => "state",
        }
    }
}

fn observe_runtime_id_failure(operation: RuntimeIdOperation, reason: RuntimeIdFailureReason) {
    runtime_id_failure_counter()
        .with_label_values(&[operation.as_str(), reason.as_str()])
        .inc();
}

fn node_allocator_failure_reason(error: &NodeAllocatorError) -> RuntimeIdFailureReason {
    match error {
        NodeAllocatorError::InvalidConfig(_) => RuntimeIdFailureReason::Configuration,
        NodeAllocatorError::Database(_) | NodeAllocatorError::PoolUnavailable => {
            RuntimeIdFailureReason::Database
        }
        NodeAllocatorError::AllNodeIdsExhausted => RuntimeIdFailureReason::NodeExhaustion,
        NodeAllocatorError::AllocationConflict => RuntimeIdFailureReason::Contention,
        NodeAllocatorError::Snowflake(error) => snowflake_failure_reason(error),
    }
}

fn snowflake_failure_reason(error: &SnowflakeIdError) -> RuntimeIdFailureReason {
    match error {
        SnowflakeIdError::LeaseUnavailable => RuntimeIdFailureReason::Lease,
        SnowflakeIdError::InvalidNodeId { .. } => RuntimeIdFailureReason::Configuration,
        SnowflakeIdError::ClockBeforeEpoch { .. }
        | SnowflakeIdError::ClockMovedBackwards { .. }
        | SnowflakeIdError::TimestampOverflow { .. }
        | SnowflakeIdError::SystemTime(_) => RuntimeIdFailureReason::Clock,
        SnowflakeIdError::SequenceExhausted { .. } => RuntimeIdFailureReason::SequenceExhaustion,
        SnowflakeIdError::StatePoisoned => RuntimeIdFailureReason::State,
    }
}

struct RuntimeIdState {
    generator: SnowflakeIdGenerator,
    lease: Option<NodeLease>,
}

impl RuntimeIdState {
    fn leased(generator: SnowflakeIdGenerator, lease: NodeLease) -> Self {
        Self {
            generator,
            lease: Some(lease),
        }
    }

    fn local_development(generator: SnowflakeIdGenerator) -> Self {
        Self {
            generator,
            lease: None,
        }
    }

    fn is_healthy(&self) -> bool {
        self.lease.as_ref().map_or(true, NodeLease::is_healthy)
    }
}

#[derive(Default)]
struct RuntimeIdBootstrapState {
    recovery_task: Option<tokio::task::JoinHandle<()>>,
}

struct RuntimeIdManager {
    active: ArcSwapOption<RuntimeIdState>,
    bootstrap: tokio::sync::Mutex<RuntimeIdBootstrapState>,
    local_initialization: Mutex<()>,
}

impl RuntimeIdManager {
    fn new() -> Self {
        Self {
            active: ArcSwapOption::empty(),
            bootstrap: tokio::sync::Mutex::new(RuntimeIdBootstrapState::default()),
            local_initialization: Mutex::new(()),
        }
    }
}

static CLAW_RUNTIME_ID_MANAGER: OnceLock<RuntimeIdManager> = OnceLock::new();

/// A startup-time configuration or allocation error for the process Snowflake generator.
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

/// Installs the process-wide database-leased generator before runtime stores can write data.
///
/// Every module in an all-in-one process receives the same generator from
/// `sdkwork-database-id`. Separate replicas receive distinct fenced leases from the shared
/// `sdkwork_node_registry` authority.
pub async fn bootstrap_claw_runtime_id_generator(
    pool: &DatabasePool,
    service_name: &str,
) -> Result<(), RuntimeIdConfigurationError> {
    if service_name.trim().is_empty() {
        set_runtime_id_generator_ready(false);
        observe_runtime_id_failure(
            RuntimeIdOperation::Bootstrap,
            RuntimeIdFailureReason::Configuration,
        );
        return Err(RuntimeIdConfigurationError::new(
            "Snowflake node lease service name must not be empty",
        ));
    }

    let manager = runtime_id_manager();
    let mut bootstrap = manager.bootstrap.lock().await;
    let allocator_config = NodeAllocatorConfig::from_service_name(service_name);
    let (generator, lease) =
        SnowflakeNodeAllocator::allocate_process_generator(pool, &allocator_config)
            .await
            .map_err(|error| {
                set_runtime_id_generator_ready(false);
                observe_runtime_id_failure(
                    RuntimeIdOperation::Bootstrap,
                    node_allocator_failure_reason(&error),
                );
                RuntimeIdConfigurationError::new(format!(
                    "failed to acquire fenced Snowflake node lease: {error}"
                ))
            })?;

    tracing::info!(
        node_id = lease.node_id(),
        lease_version = lease.lease_version(),
        service = service_name,
        "installed database-leased Snowflake generator"
    );
    manager
        .active
        .store(Some(Arc::new(RuntimeIdState::leased(generator, lease))));
    set_runtime_id_generator_ready(true);

    if bootstrap
        .recovery_task
        .as_ref()
        .map_or(true, tokio::task::JoinHandle::is_finished)
    {
        bootstrap.recovery_task = Some(spawn_runtime_id_lease_recovery(
            pool.clone(),
            allocator_config,
        ));
    }
    Ok(())
}

pub(crate) fn claw_runtime_id_is_healthy() -> bool {
    let healthy = runtime_id_manager()
        .active
        .load_full()
        .is_some_and(|state| state.is_healthy());
    set_runtime_id_generator_ready(healthy);
    healthy
}

pub(crate) fn next_claw_runtime_id(context: &str) -> DomainResult<i64> {
    let state = runtime_id_state()?;
    next_runtime_id(state.as_ref(), context)
}

/// Generates a globally unique user ID using the Claw runtime Snowflake generator.
/// Replaces `MAX(id) + 1` patterns in admin/user stores per DATABASE_SPEC section 6.1.
pub(crate) fn next_user_id(context: &str) -> DomainResult<i64> {
    let state = runtime_id_state()?;
    next_runtime_id(state.as_ref(), context)
}

/// Validates deployment-mode policy before database bootstrap.
///
/// Server and container modes acquire their node ID from PostgreSQL after the pool is ready.
/// `SDKWORK_CLAW_SNOWFLAKE_NODE_ID` is accepted only for single-process desktop development.
pub fn validate_claw_runtime_id_configuration(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<DeploymentMode, RuntimeIdConfigurationError> {
    let deployment_mode = resolve_runtime_id_deployment_mode(runtime_toml)?;
    let configured_node_id = configured_runtime_node_id_from_env()?;
    validate_runtime_node_id_configuration(configured_node_id.as_deref(), deployment_mode)?;
    Ok(deployment_mode)
}

fn runtime_id_manager() -> &'static RuntimeIdManager {
    CLAW_RUNTIME_ID_MANAGER.get_or_init(RuntimeIdManager::new)
}

fn runtime_id_state() -> DomainResult<Arc<RuntimeIdState>> {
    let manager = runtime_id_manager();
    if let Some(state) = manager.active.load_full() {
        if state.is_healthy() {
            set_runtime_id_generator_ready(true);
            return Ok(state);
        }
        set_runtime_id_generator_ready(false);
        observe_runtime_id_failure(RuntimeIdOperation::State, RuntimeIdFailureReason::Lease);
        return Err(DomainError::new(
            "Snowflake node lease is unhealthy; runtime ID generation is fenced",
        ));
    }

    let _initialization = manager.local_initialization.lock().map_err(|_| {
        set_runtime_id_generator_ready(false);
        observe_runtime_id_failure(RuntimeIdOperation::State, RuntimeIdFailureReason::State);
        DomainError::new("desktop runtime ID initialization lock is poisoned")
    })?;
    if let Some(state) = manager.active.load_full() {
        if state.is_healthy() {
            set_runtime_id_generator_ready(true);
            return Ok(state);
        }
        set_runtime_id_generator_ready(false);
        observe_runtime_id_failure(RuntimeIdOperation::State, RuntimeIdFailureReason::Lease);
        return Err(DomainError::new(
            "Snowflake node lease is unhealthy; runtime ID generation is fenced",
        ));
    }

    let generator = build_local_development_generator().map_err(|error| {
        set_runtime_id_generator_ready(false);
        observe_runtime_id_failure(
            RuntimeIdOperation::Bootstrap,
            RuntimeIdFailureReason::Configuration,
        );
        DomainError::new(error.to_string())
    })?;
    let state = Arc::new(RuntimeIdState::local_development(generator));
    manager.active.store(Some(Arc::clone(&state)));
    set_runtime_id_generator_ready(true);
    Ok(state)
}

fn build_local_development_generator() -> Result<SnowflakeIdGenerator, RuntimeIdConfigurationError>
{
    let configured_node_id = configured_runtime_node_id_from_env()?;
    let runtime_toml = RuntimeTomlConfig::from_env_config_file().map_err(|error| {
        RuntimeIdConfigurationError::new(format!(
            "failed to load runtime configuration for runtime IDs: {error}"
        ))
    })?;
    let deployment_mode = resolve_runtime_id_deployment_mode(runtime_toml.as_ref())?;
    if deployment_mode != DeploymentMode::Desktop {
        return Err(RuntimeIdConfigurationError::new(format!(
            "Snowflake runtime ID generator is not bootstrapped for {}; acquire a database-backed node lease before serving writes",
            deployment_mode.as_str()
        )));
    }
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

fn spawn_runtime_id_lease_recovery(
    pool: DatabasePool,
    allocator_config: NodeAllocatorConfig,
) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        let manager = runtime_id_manager();
        let mut delay = LEASE_HEALTH_CHECK_INTERVAL;
        loop {
            tokio::time::sleep(delay).await;
            if claw_runtime_id_is_healthy() {
                delay = LEASE_HEALTH_CHECK_INTERVAL;
                continue;
            }

            let _bootstrap = manager.bootstrap.lock().await;
            if claw_runtime_id_is_healthy() {
                delay = LEASE_HEALTH_CHECK_INTERVAL;
                continue;
            }
            match SnowflakeNodeAllocator::allocate_process_generator(&pool, &allocator_config).await
            {
                Ok((generator, lease)) => {
                    tracing::info!(
                        node_id = lease.node_id(),
                        lease_version = lease.lease_version(),
                        service = %allocator_config.service_name,
                        "recovered database-leased Snowflake generator"
                    );
                    manager
                        .active
                        .store(Some(Arc::new(RuntimeIdState::leased(generator, lease))));
                    set_runtime_id_generator_ready(true);
                    delay = LEASE_HEALTH_CHECK_INTERVAL;
                }
                Err(error) => {
                    set_runtime_id_generator_ready(false);
                    observe_runtime_id_failure(
                        RuntimeIdOperation::Recovery,
                        node_allocator_failure_reason(&error),
                    );
                    tracing::warn!(
                        error = %error,
                        retry_delay_ms = delay.as_millis() as u64,
                        "failed to recover fenced Snowflake node lease"
                    );
                    delay = delay
                        .checked_mul(2)
                        .unwrap_or(MAX_LEASE_RECOVERY_BACKOFF)
                        .min(MAX_LEASE_RECOVERY_BACKOFF);
                }
            }
        }
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
    if deployment_mode != DeploymentMode::Desktop {
        return Err(RuntimeIdConfigurationError::new(format!(
            "Snowflake runtime ID generator is not bootstrapped for {}; database-leased allocation is required",
            deployment_mode.as_str()
        )));
    }
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
    let Some(value) = configured_node_id else {
        return Ok(None);
    };
    let node_id = parse_runtime_node_id(value)?;
    if deployment_mode != DeploymentMode::Desktop {
        return Err(RuntimeIdConfigurationError::new(format!(
            "{CLAW_RUNTIME_NODE_ID_ENV} is a desktop development override and must not be configured for {}; clustered runtimes use database-leased node IDs",
            deployment_mode.as_str()
        )));
    }
    Ok(Some(node_id))
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

fn next_runtime_id(state: &RuntimeIdState, context: &str) -> DomainResult<i64> {
    state.generator.generate().map_err(|error| {
        if matches!(error, SnowflakeIdError::LeaseUnavailable) {
            set_runtime_id_generator_ready(false);
        }
        observe_runtime_id_failure(
            RuntimeIdOperation::Generation,
            snowflake_failure_reason(&error),
        );
        DomainError::new(format!("failed to generate {context} id: {error:?}"))
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn standard_postgres_config_materializes_the_workspace_schema_search_path() {
        let previous_schema = std::env::var("SDKWORK_DATABASE_SCHEMA").ok();
        std::env::set_var("SDKWORK_DATABASE_SCHEMA", "sdkwork_ai_dev");
        let config = sdkwork_claw_config::DatabaseConfig {
            engine: sdkwork_claw_config::DatabaseEngine::Postgres,
            url: "postgresql://sdkwork_ai_dev:secret@127.0.0.1:5432/sdkwork_ai_dev?sslmode=disable"
                .to_owned(),
            max_connections: 10,
        };

        let standard = to_standard_database_config(&config).expect("postgres config");

        match previous_schema {
            Some(value) => std::env::set_var("SDKWORK_DATABASE_SCHEMA", value),
            None => std::env::remove_var("SDKWORK_DATABASE_SCHEMA"),
        }
        assert!(standard.url.contains("/sdkwork_ai_dev?"));
        assert!(standard
            .url
            .contains("search_path%3Dsdkwork_ai_dev%2Cpublic"));
    }

    #[test]
    fn startup_validation_accepts_database_leased_server_configuration() {
        validate_runtime_node_id_configuration(None, DeploymentMode::Server)
            .expect("server startup obtains its node id after connecting to PostgreSQL");
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
    fn startup_validation_accepts_database_leased_container_configuration() {
        for deployment_mode in [DeploymentMode::Docker, DeploymentMode::Kubernetes] {
            validate_runtime_node_id_configuration(None, deployment_mode)
                .expect("container startup obtains its node id from the shared database");
        }
    }

    #[test]
    fn desktop_runtime_uses_only_the_supplied_local_development_fallback() {
        let node_id = resolve_runtime_node_id(None, DeploymentMode::Desktop, || Ok(517))
            .expect("desktop development fallback should remain available");

        assert_eq!(RuntimeNodeId::LocalDevelopmentFallback(517), node_id);
    }

    #[test]
    fn explicit_node_id_is_accepted_only_for_desktop_development() {
        let node_id = resolve_runtime_node_id(Some("1023"), DeploymentMode::Desktop, || {
            panic!("explicit configuration must not use the fallback")
        })
        .expect("maximum valid desktop node id");
        assert_eq!(RuntimeNodeId::Explicit(1023), node_id);

        let error = validate_runtime_node_id_configuration(Some("17"), DeploymentMode::Kubernetes)
            .expect_err("clustered runtime must not trust a static node id")
            .to_string();
        assert!(error.contains("database-leased"));
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

    #[test]
    fn unbootstrapped_server_runtime_cannot_build_a_local_generator() {
        let error = resolve_runtime_node_id(None, DeploymentMode::Server, || Ok(1))
            .expect_err("server runtime IDs require database bootstrap")
            .to_string();

        assert!(error.contains("database-leased allocation is required"));
    }

    #[test]
    fn runtime_id_failure_reasons_are_bounded_operational_codes() {
        assert_eq!(
            RuntimeIdFailureReason::Lease,
            snowflake_failure_reason(&SnowflakeIdError::LeaseUnavailable)
        );
        assert_eq!(
            RuntimeIdFailureReason::Clock,
            snowflake_failure_reason(&SnowflakeIdError::ClockMovedBackwards {
                last_millis: 2,
                now_millis: 1,
            })
        );
        assert_eq!(
            RuntimeIdFailureReason::SequenceExhaustion,
            snowflake_failure_reason(&SnowflakeIdError::SequenceExhausted { millis: 1 })
        );
        assert_eq!(
            RuntimeIdFailureReason::State,
            snowflake_failure_reason(&SnowflakeIdError::StatePoisoned)
        );
        assert_eq!(
            RuntimeIdFailureReason::NodeExhaustion,
            node_allocator_failure_reason(&NodeAllocatorError::AllNodeIdsExhausted)
        );
    }

    #[test]
    fn runtime_id_metrics_are_registered_with_bounded_failure_labels() {
        set_runtime_id_generator_ready(false);
        observe_runtime_id_failure(
            RuntimeIdOperation::Generation,
            RuntimeIdFailureReason::Clock,
        );

        let metric_families = prometheus::gather();
        let readiness = metric_families
            .iter()
            .find(|family| family.get_name() == "clawrouter_runtime_id_generator_ready")
            .expect("runtime ID readiness metric must be registered");
        assert_eq!(readiness.get_metric()[0].get_gauge().get_value(), 0.0);

        let failures = metric_families
            .iter()
            .find(|family| family.get_name() == "clawrouter_runtime_id_failures_total")
            .expect("runtime ID failure metric must be registered");
        let generation_clock = failures.get_metric().iter().find(|metric| {
            let labels = metric
                .get_label()
                .iter()
                .map(|label| (label.get_name(), label.get_value()))
                .collect::<std::collections::HashMap<_, _>>();
            labels.get("operation") == Some(&"generation") && labels.get("reason") == Some(&"clock")
        });
        assert!(generation_clock.is_some_and(|metric| metric.get_counter().get_value() >= 1.0));
    }
}
