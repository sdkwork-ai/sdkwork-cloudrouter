//! Metering data retention.
//!
//! `ai_metering_usage` and `ai_metering_request_trace` grow without bound;
//! commercial deployments need a bounded retention policy to control storage
//! cost and keep analytical queries fast. The retention worker deletes only
//! facts that are already settled (`settlement_status = 2`) and older than the
//! configured window — pending, failed, or terminally-failed facts are never
//! touched because settlement and reconciliation still depend on them.

use std::sync::Arc;
use std::time::Instant;

use crate::domain::DomainResult;
use crate::ports::{
    DeleteExpiredSettledUsageCommand, UsageRetentionOutcome, UsageRetentionStore,
};

const DEFAULT_RETENTION_DAYS: i64 = 180;
const MAX_RETENTION_DAYS: i64 = 3_650;
const DEFAULT_INTERVAL_MILLIS: u64 = 24 * 60 * 60 * 1_000;
const MIN_INTERVAL_MILLIS: u64 = 60_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct UsageRetentionConfig {
    pub enabled: bool,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub retention_days: i64,
    pub interval_millis: u64,
}

impl UsageRetentionConfig {
    pub fn disabled() -> Self {
        Self {
            enabled: false,
            ..Self::default()
        }
    }

    pub fn normalized(self) -> Self {
        Self {
            enabled: self.enabled,
            tenant_id: self.tenant_id.max(0),
            organization_id: self.organization_id.max(0),
            retention_days: sdkwork_utils_rust::clamp(
                self.retention_days,
                1,
                MAX_RETENTION_DAYS,
            ),
            interval_millis: self.interval_millis.max(MIN_INTERVAL_MILLIS),
        }
    }

    pub fn validate_for_deployment(&self) -> Result<(), String> {
        if !self.enabled {
            return Ok(());
        }
        if self.retention_days < 1 || self.retention_days > MAX_RETENTION_DAYS {
            return Err(format!(
                "usage retention days must be between 1 and {MAX_RETENTION_DAYS}"
            ));
        }
        if self.tenant_id > 0 {
            return Ok(());
        }
        if platform_retention_scope_allowed() {
            return Ok(());
        }
        Err(
            "usage retention worker requires SDKWORK_CLOUDROUTER_METERING_RETENTION_TENANT_ID > 0 or explicit SDKWORK_CLOUDROUTER_METERING_RETENTION_PLATFORM_SCOPE=true when enabled"
                .to_owned(),
        )
    }
}

impl Default for UsageRetentionConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            tenant_id: 0,
            organization_id: 0,
            retention_days: DEFAULT_RETENTION_DAYS,
            interval_millis: DEFAULT_INTERVAL_MILLIS,
        }
    }
}

fn platform_retention_scope_allowed() -> bool {
    std::env::var("SDKWORK_CLOUDROUTER_METERING_RETENTION_PLATFORM_SCOPE")
        .ok()
        .map(|value| {
            matches!(
                value.trim().to_ascii_lowercase().as_str(),
                "1" | "true" | "yes" | "on"
            )
        })
        .unwrap_or(false)
}

pub fn resolve_usage_retention_config(
    runtime_toml: Option<&sdkwork_cloudrouter_config::RuntimeTomlConfig>,
) -> UsageRetentionConfig {
    match resolve_usage_retention_config_result(runtime_toml) {
        Ok(config) => config,
        Err(error) => {
            match sdkwork_cloudrouter_config::DeploymentMode::from_env_or_runtime_toml(runtime_toml)
            {
                Ok(mode) if mode.is_production_like() => {
                    panic!("invalid usage retention config in production-like deployment: {error}");
                }
                Err(lifecycle_error) => {
                    panic!(
                        "invalid deployment lifecycle: {lifecycle_error}; invalid usage retention config: {error}"
                    );
                }
                Ok(_) => {}
            }
            tracing::warn!(
                %error,
                "invalid usage retention config; retention worker disabled"
            );
            UsageRetentionConfig::disabled()
        }
    }
}

pub fn resolve_usage_retention_config_result(
    runtime_toml: Option<&sdkwork_cloudrouter_config::RuntimeTomlConfig>,
) -> Result<UsageRetentionConfig, String> {
    let config = usage_retention_config_from_env_or_toml(runtime_toml)?;
    config.validate_for_deployment()?;
    Ok(config.normalized())
}

pub fn usage_retention_config_from_env_or_toml(
    runtime_toml: Option<&sdkwork_cloudrouter_config::RuntimeTomlConfig>,
) -> Result<UsageRetentionConfig, String> {
    const ENABLED: &str = "SDKWORK_CLOUDROUTER_METERING_RETENTION_ENABLED";
    const TENANT_ID: &str = "SDKWORK_CLOUDROUTER_METERING_RETENTION_TENANT_ID";
    const ORGANIZATION_ID: &str = "SDKWORK_CLOUDROUTER_METERING_RETENTION_ORGANIZATION_ID";
    const RETENTION_DAYS: &str = "SDKWORK_CLOUDROUTER_METERING_RETENTION_DAYS";
    const INTERVAL_MILLIS: &str = "SDKWORK_CLOUDROUTER_METERING_RETENTION_INTERVAL_MILLIS";

    let defaults = UsageRetentionConfig::default();
    Ok(UsageRetentionConfig {
        enabled: sdkwork_cloudrouter_config::runtime::config_bool(
            ENABLED,
            runtime_toml.and_then(|config| config.metering_retention.enabled),
        )?
        .unwrap_or(defaults.enabled),
        tenant_id: parse_non_negative_i64_config(
            TENANT_ID,
            runtime_toml.and_then(|config| config.metering_retention.tenant_id),
            defaults.tenant_id,
        )?,
        organization_id: parse_non_negative_i64_config(
            ORGANIZATION_ID,
            runtime_toml.and_then(|config| config.metering_retention.organization_id),
            defaults.organization_id,
        )?,
        retention_days: parse_positive_i64_config(
            RETENTION_DAYS,
            runtime_toml.and_then(|config| config.metering_retention.retention_days),
            defaults.retention_days,
        )?,
        interval_millis: parse_positive_u64_config(
            INTERVAL_MILLIS,
            runtime_toml.and_then(|config| config.metering_retention.interval_millis),
            defaults.interval_millis,
        )?,
    })
}

fn parse_non_negative_i64_config(
    name: &str,
    config_value: Option<i64>,
    default_value: i64,
) -> Result<i64, String> {
    let parsed = sdkwork_cloudrouter_config::runtime::config_i64(name, config_value)?
        .unwrap_or(default_value);
    if parsed < 0 {
        return Err(format!("{name} must be a non-negative integer"));
    }
    Ok(parsed)
}

fn parse_positive_i64_config(
    name: &str,
    config_value: Option<i64>,
    default_value: i64,
) -> Result<i64, String> {
    let parsed = sdkwork_cloudrouter_config::runtime::config_i64(name, config_value)?
        .unwrap_or(default_value);
    if parsed <= 0 {
        return Err(format!("{name} must be a positive integer"));
    }
    Ok(parsed)
}

fn parse_positive_u64_config(
    name: &str,
    config_value: Option<u64>,
    default_value: u64,
) -> Result<u64, String> {
    let parsed = sdkwork_cloudrouter_config::runtime::config_u64(name, config_value)?
        .unwrap_or(default_value);
    if parsed == 0 {
        return Err(format!("{name} must be a positive integer"));
    }
    Ok(parsed)
}

#[derive(Clone)]
pub struct UsageRetentionWorker {
    store: Arc<dyn UsageRetentionStore + Send + Sync>,
    config: UsageRetentionConfig,
}

impl UsageRetentionWorker {
    pub fn new(store: Arc<dyn UsageRetentionStore + Send + Sync>, config: UsageRetentionConfig) -> Self {
        Self {
            store,
            config: config.normalized(),
        }
    }

    pub fn config(&self) -> UsageRetentionConfig {
        self.config
    }

    pub async fn run_once(&self) -> DomainResult<UsageRetentionOutcome> {
        let started_at = Instant::now();
        if !self.config.enabled {
            return Ok(UsageRetentionOutcome {
                deleted_usage_facts: 0,
                deleted_traces: 0,
            });
        }
        let outcome = self
            .store
            .delete_expired_settled_usage(DeleteExpiredSettledUsageCommand {
                tenant_id: self.config.tenant_id,
                organization_id: self.config.organization_id,
                retention_days: self.config.retention_days,
            })
            .await;
        match &outcome {
            Ok(outcome) => {
                retention_run_counter()
                    .with_label_values(&["success"])
                    .inc();
                tracing::info!(
                    tenant_id = self.config.tenant_id,
                    organization_id = self.config.organization_id,
                    retention_days = self.config.retention_days,
                    deleted_usage_facts = outcome.deleted_usage_facts,
                    deleted_traces = outcome.deleted_traces,
                    elapsed_ms = started_at.elapsed().as_millis() as u64,
                    "metering retention run completed"
                );
            }
            Err(_) => {
                retention_run_counter()
                    .with_label_values(&["error"])
                    .inc();
            }
        }
        outcome
    }
}

fn retention_run_counter() -> prometheus::IntCounterVec {
    use std::sync::OnceLock;
    static METRIC: OnceLock<prometheus::IntCounterVec> = OnceLock::new();
    METRIC
        .get_or_init(|| {
            let metric = prometheus::IntCounterVec::new(
                prometheus::Opts::new(
                    "metering_retention_runs_total",
                    "Metering retention worker run outcomes.",
                )
                .namespace("cloudrouter"),
                &["outcome"],
            )
            .expect("metering retention run metric");
            let _ = prometheus::register(Box::new(metric.clone()));
            metric
        })
        .clone()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Default)]
    struct CountingRetentionStore {
        calls: std::sync::atomic::AtomicU64,
    }

    impl UsageRetentionStore for CountingRetentionStore {
        fn delete_expired_settled_usage<'a>(
            &'a self,
            _command: DeleteExpiredSettledUsageCommand,
        ) -> crate::ports::UsageRetentionFuture<'a> {
            Box::pin(async move {
                self.calls.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
                Ok(UsageRetentionOutcome {
                    deleted_usage_facts: 3,
                    deleted_traces: 2,
                })
            })
        }
    }

    #[tokio::test]
    async fn disabled_worker_skips_the_store() {
        let store = Arc::new(CountingRetentionStore::default());
        let worker = UsageRetentionWorker::new(store.clone(), UsageRetentionConfig::disabled());
        let outcome = worker.run_once().await.expect("disabled run must succeed");
        assert_eq!(0, outcome.deleted_usage_facts);
        assert_eq!(0, store.calls.load(std::sync::atomic::Ordering::SeqCst));
    }

    #[tokio::test]
    async fn enabled_worker_runs_retention_once() {
        let store = Arc::new(CountingRetentionStore::default());
        let worker = UsageRetentionWorker::new(
            store.clone(),
            UsageRetentionConfig {
                enabled: true,
                tenant_id: 10,
                organization_id: 20,
                retention_days: 180,
                interval_millis: DEFAULT_INTERVAL_MILLIS,
            },
        );
        let outcome = worker.run_once().await.expect("retention run must succeed");
        assert_eq!(3, outcome.deleted_usage_facts);
        assert_eq!(2, outcome.deleted_traces);
        assert_eq!(1, store.calls.load(std::sync::atomic::Ordering::SeqCst));
    }

    #[test]
    fn retention_config_normalizes_and_validates() {
        let normalized = UsageRetentionConfig {
            enabled: true,
            tenant_id: 10,
            organization_id: 20,
            retention_days: 7,
            interval_millis: 1,
        }
        .normalized();
        assert_eq!(7, normalized.retention_days);
        assert_eq!(MIN_INTERVAL_MILLIS, normalized.interval_millis);
        assert!(normalized.validate_for_deployment().is_ok());
    }

    #[test]
    fn retention_days_are_bounded() {
        let normalized = UsageRetentionConfig {
            enabled: true,
            tenant_id: 10,
            organization_id: 0,
            retention_days: 10_000,
            interval_millis: DEFAULT_INTERVAL_MILLIS,
        }
        .normalized();
        assert_eq!(MAX_RETENTION_DAYS, normalized.retention_days);
    }

    #[test]
    fn disabled_retention_worker_is_always_valid() {
        assert!(UsageRetentionConfig::disabled()
            .validate_for_deployment()
            .is_ok());
    }

    #[test]
    fn enabled_worker_without_scope_is_rejected_outside_platform_scope() {
        std::env::remove_var("SDKWORK_CLOUDROUTER_METERING_RETENTION_PLATFORM_SCOPE");
        let error = UsageRetentionConfig {
            enabled: true,
            tenant_id: 0,
            organization_id: 0,
            retention_days: 180,
            interval_millis: DEFAULT_INTERVAL_MILLIS,
        }
        .validate_for_deployment()
        .expect_err("platform-scope retention requires explicit opt-in");
        assert!(error.contains("METERING_RETENTION_TENANT_ID"));
    }
}
