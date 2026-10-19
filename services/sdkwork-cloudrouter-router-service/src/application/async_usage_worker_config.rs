use sdkwork_cloudrouter_config::RuntimeTomlConfig;

/// Runtime configuration for the asynchronous usage reconciliation worker.
///
/// The worker is **opt-in**: a deployment that does not enable it keeps every
/// asynchronous create route fail-closed at preflight, so there is no window in
/// which a task is accepted but never settled.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AsyncUsageWorkerConfig {
    pub enabled: bool,
    pub interval_millis: u64,
    pub batch_size: i64,
    pub lease_seconds: i64,
    pub retry_delay_seconds: i64,
    pub max_attempts: i32,
}

impl AsyncUsageWorkerConfig {
    pub const MAX_BATCH_SIZE: i64 = 200;
    pub const MIN_INTERVAL_MILLIS: u64 = 1_000;
    pub const DEFAULT_INTERVAL_MILLIS: u64 = 30_000;
    pub const DEFAULT_BATCH_SIZE: i64 = 50;
    pub const DEFAULT_LEASE_SECONDS: i64 = 60;
    pub const DEFAULT_RETRY_DELAY_SECONDS: i64 = 30;
    pub const DEFAULT_MAX_ATTEMPTS: i32 = 60;

    pub fn disabled() -> Self {
        Self::default()
    }

    pub fn normalized(self) -> Self {
        Self {
            enabled: self.enabled,
            interval_millis: self.interval_millis.max(Self::MIN_INTERVAL_MILLIS),
            batch_size: sdkwork_utils_rust::clamp(self.batch_size, 1, Self::MAX_BATCH_SIZE),
            lease_seconds: sdkwork_utils_rust::clamp(self.lease_seconds, 10, 3_600),
            retry_delay_seconds: sdkwork_utils_rust::clamp(self.retry_delay_seconds, 5, 3_600),
            max_attempts: sdkwork_utils_rust::clamp(self.max_attempts, 1, 1_000),
        }
    }
}

impl Default for AsyncUsageWorkerConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            interval_millis: Self::DEFAULT_INTERVAL_MILLIS,
            batch_size: Self::DEFAULT_BATCH_SIZE,
            lease_seconds: Self::DEFAULT_LEASE_SECONDS,
            retry_delay_seconds: Self::DEFAULT_RETRY_DELAY_SECONDS,
            max_attempts: Self::DEFAULT_MAX_ATTEMPTS,
        }
    }
}

/// Resolves the worker configuration, degrading to disabled on invalid input.
///
/// Unlike the synchronous settlement worker this worker gates whether
/// asynchronous operations are sellable at all, so an operator typo must not
/// silently start it with nonsense bounds; it stays off and the reason is
/// logged.
pub fn resolve_async_usage_worker_config(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> AsyncUsageWorkerConfig {
    match async_usage_worker_config_from_env(runtime_toml) {
        Ok(config) => config.normalized(),
        Err(error) => {
            tracing::warn!(
                %error,
                "invalid async usage worker config; asynchronous usage reconciliation stays disabled"
            );
            AsyncUsageWorkerConfig::disabled()
        }
    }
}

pub fn async_usage_worker_config_from_env(
    _runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<AsyncUsageWorkerConfig, String> {
    const ENABLED: &str = "SDKWORK_CLOUDROUTER_ASYNC_USAGE_WORKER_ENABLED";
    const INTERVAL_MILLIS: &str = "SDKWORK_CLOUDROUTER_ASYNC_USAGE_INTERVAL_MILLIS";
    const BATCH_SIZE: &str = "SDKWORK_CLOUDROUTER_ASYNC_USAGE_BATCH_SIZE";
    const LEASE_SECONDS: &str = "SDKWORK_CLOUDROUTER_ASYNC_USAGE_LEASE_SECONDS";
    const RETRY_DELAY_SECONDS: &str = "SDKWORK_CLOUDROUTER_ASYNC_USAGE_RETRY_DELAY_SECONDS";
    const MAX_ATTEMPTS: &str = "SDKWORK_CLOUDROUTER_ASYNC_USAGE_MAX_ATTEMPTS";

    let defaults = AsyncUsageWorkerConfig::default();
    Ok(AsyncUsageWorkerConfig {
        enabled: sdkwork_cloudrouter_config::runtime::config_bool(ENABLED, None)?
            .unwrap_or(defaults.enabled),
        interval_millis: parse_positive_u64(INTERVAL_MILLIS, None, defaults.interval_millis)?,
        batch_size: parse_batch_size(BATCH_SIZE, None, defaults.batch_size)?,
        lease_seconds: parse_positive_i64(LEASE_SECONDS, None, defaults.lease_seconds)?,
        retry_delay_seconds: parse_positive_i64(
            RETRY_DELAY_SECONDS,
            None,
            defaults.retry_delay_seconds,
        )?,
        max_attempts: parse_positive_i64(MAX_ATTEMPTS, None, i64::from(defaults.max_attempts))?
            .try_into()
            .map_err(|_| format!("{MAX_ATTEMPTS} must fit in a 32-bit integer"))?,
    })
}

fn parse_positive_u64(name: &str, value: Option<u64>, default_value: u64) -> Result<u64, String> {
    let parsed =
        sdkwork_cloudrouter_config::runtime::config_u64(name, value)?.unwrap_or(default_value);
    if parsed < AsyncUsageWorkerConfig::MIN_INTERVAL_MILLIS {
        return Err(format!(
            "{name} must be at least {}",
            AsyncUsageWorkerConfig::MIN_INTERVAL_MILLIS
        ));
    }
    Ok(parsed)
}

fn parse_positive_i64(name: &str, value: Option<i64>, default_value: i64) -> Result<i64, String> {
    let parsed =
        sdkwork_cloudrouter_config::runtime::config_i64(name, value)?.unwrap_or(default_value);
    if parsed <= 0 {
        return Err(format!("{name} must be a positive integer"));
    }
    Ok(parsed)
}

fn parse_batch_size(name: &str, value: Option<i64>, default_value: i64) -> Result<i64, String> {
    let parsed = parse_positive_i64(name, value, default_value)?;
    if parsed > AsyncUsageWorkerConfig::MAX_BATCH_SIZE {
        return Err(format!(
            "{name} must be between 1 and {}",
            AsyncUsageWorkerConfig::MAX_BATCH_SIZE
        ));
    }
    Ok(parsed)
}

#[cfg(test)]
mod tests {
    use super::{parse_batch_size, parse_positive_i64, parse_positive_u64, AsyncUsageWorkerConfig};

    #[test]
    fn the_worker_is_disabled_by_default() {
        let config = AsyncUsageWorkerConfig::default();
        assert!(!config.enabled);
        assert_eq!(
            AsyncUsageWorkerConfig::DEFAULT_INTERVAL_MILLIS,
            config.interval_millis
        );
    }

    #[test]
    fn normalization_clamps_every_bound_instead_of_failing_the_deployment() {
        let config = AsyncUsageWorkerConfig {
            enabled: true,
            interval_millis: 1,
            batch_size: 10_000,
            lease_seconds: 0,
            retry_delay_seconds: 1,
            max_attempts: 0,
        }
        .normalized();

        assert_eq!(
            AsyncUsageWorkerConfig::MIN_INTERVAL_MILLIS,
            config.interval_millis
        );
        assert_eq!(AsyncUsageWorkerConfig::MAX_BATCH_SIZE, config.batch_size);
        assert_eq!(10, config.lease_seconds);
        assert_eq!(5, config.retry_delay_seconds);
        assert_eq!(1, config.max_attempts);
    }

    #[test]
    fn invalid_bounds_are_rejected_before_normalization() {
        assert!(parse_batch_size("BATCH", Some(0), 50).is_err());
        assert!(parse_batch_size(
            "BATCH",
            Some(AsyncUsageWorkerConfig::MAX_BATCH_SIZE + 1),
            50
        )
        .is_err());
        assert_eq!(
            Ok(AsyncUsageWorkerConfig::MAX_BATCH_SIZE),
            parse_batch_size("BATCH", Some(AsyncUsageWorkerConfig::MAX_BATCH_SIZE), 50)
        );
        assert!(parse_positive_u64("INTERVAL", Some(999), 30_000).is_err());
        assert_eq!(
            Ok(1_000),
            parse_positive_u64("INTERVAL", Some(1_000), 30_000)
        );
        assert!(parse_positive_i64("LEASE", Some(0), 60).is_err());
        assert_eq!(Ok(60), parse_positive_i64("LEASE", None, 60));
    }
}
