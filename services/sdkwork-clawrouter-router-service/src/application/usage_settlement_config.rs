use sdkwork_claw_config::{DeploymentMode, RuntimeTomlConfig};

use super::UsageSettlementWorkerConfig;

pub fn resolve_usage_settlement_worker_config(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> UsageSettlementWorkerConfig {
    match resolve_usage_settlement_worker_config_result(runtime_toml) {
        Ok(config) => config,
        Err(error) => {
            match DeploymentMode::from_env_or_runtime_toml(runtime_toml) {
                Ok(mode) if mode.is_production_like() => {
                    panic!(
                        "invalid usage settlement worker config in production-like deployment: {error}"
                    );
                }
                Err(lifecycle_error) => {
                    panic!(
                        "invalid deployment lifecycle: {lifecycle_error}; invalid usage settlement worker config: {error}"
                    );
                }
                Ok(_) => {}
            }
            tracing::warn!(
                %error,
                "invalid usage settlement worker config; settlement worker disabled"
            );
            UsageSettlementWorkerConfig::disabled()
        }
    }
}

pub fn resolve_usage_settlement_worker_config_result(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<UsageSettlementWorkerConfig, String> {
    let config = usage_settlement_worker_config_from_env_or_toml(runtime_toml)?;
    config.validate_for_deployment()?;
    Ok(config.normalized())
}

pub fn usage_settlement_worker_config_from_env_or_toml(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<UsageSettlementWorkerConfig, String> {
    const ENABLED: &str = "SDKWORK_CLAW_USAGE_SETTLEMENT_WORKER_ENABLED";
    const TENANT_ID: &str = "SDKWORK_CLAW_USAGE_SETTLEMENT_TENANT_ID";
    const ORGANIZATION_ID: &str = "SDKWORK_CLAW_USAGE_SETTLEMENT_ORGANIZATION_ID";
    const BATCH_SIZE: &str = "SDKWORK_CLAW_USAGE_SETTLEMENT_BATCH_SIZE";
    const INTERVAL_MILLIS: &str = "SDKWORK_CLAW_USAGE_SETTLEMENT_INTERVAL_MILLIS";

    let defaults = UsageSettlementWorkerConfig::default();
    Ok(UsageSettlementWorkerConfig {
        enabled: parse_optional_bool_config(
            ENABLED,
            runtime_toml.and_then(|config| config.usage_settlement.enabled),
        )?
        .unwrap_or(defaults.enabled),
        tenant_id: parse_non_negative_i64_config(
            TENANT_ID,
            runtime_toml.and_then(|config| config.usage_settlement.tenant_id),
            defaults.tenant_id,
        )?,
        organization_id: parse_non_negative_i64_config(
            ORGANIZATION_ID,
            runtime_toml.and_then(|config| config.usage_settlement.organization_id),
            defaults.organization_id,
        )?,
        batch_size: parse_batch_size_config(
            BATCH_SIZE,
            runtime_toml.and_then(|config| config.usage_settlement.batch_size),
            defaults.batch_size,
        )?,
        interval_millis: parse_positive_u64_config(
            INTERVAL_MILLIS,
            runtime_toml.and_then(|config| config.usage_settlement.interval_millis),
            defaults.interval_millis,
        )?,
    })
}

fn parse_optional_bool_config(
    name: &str,
    config_value: Option<bool>,
) -> Result<Option<bool>, String> {
    sdkwork_claw_config::runtime::config_bool(name, config_value)
}

fn parse_non_negative_i64_config(
    name: &str,
    config_value: Option<i64>,
    default_value: i64,
) -> Result<i64, String> {
    let parsed =
        sdkwork_claw_config::runtime::config_i64(name, config_value)?.unwrap_or(default_value);
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
    let parsed =
        sdkwork_claw_config::runtime::config_i64(name, config_value)?.unwrap_or(default_value);
    if parsed <= 0 {
        return Err(format!("{name} must be a positive integer"));
    }
    Ok(parsed)
}

fn parse_batch_size_config(
    name: &str,
    config_value: Option<i64>,
    default_value: i64,
) -> Result<i64, String> {
    let parsed = parse_positive_i64_config(name, config_value, default_value)?;
    if parsed > UsageSettlementWorkerConfig::MAX_BATCH_SIZE {
        return Err(format!(
            "{name} must be between 1 and {}",
            UsageSettlementWorkerConfig::MAX_BATCH_SIZE
        ));
    }
    Ok(parsed)
}

fn parse_positive_u64_config(
    name: &str,
    config_value: Option<u64>,
    default_value: u64,
) -> Result<u64, String> {
    let parsed =
        sdkwork_claw_config::runtime::config_u64(name, config_value)?.unwrap_or(default_value);
    if parsed == 0 {
        return Err(format!("{name} must be a positive integer"));
    }
    Ok(parsed)
}

#[cfg(test)]
mod tests {
    use super::{parse_batch_size_config, UsageSettlementWorkerConfig};

    #[test]
    fn usage_settlement_batch_size_rejects_values_above_the_hard_limit() {
        let error = parse_batch_size_config(
            "SDKWORK_CLAW_USAGE_SETTLEMENT_BATCH_SIZE",
            Some(UsageSettlementWorkerConfig::MAX_BATCH_SIZE + 1),
            100,
        )
        .expect_err("an oversized settlement batch must be rejected");

        assert!(error.contains("must be between 1"));
        assert_eq!(
            Ok(UsageSettlementWorkerConfig::MAX_BATCH_SIZE),
            parse_batch_size_config(
                "SDKWORK_CLAW_USAGE_SETTLEMENT_BATCH_SIZE",
                Some(UsageSettlementWorkerConfig::MAX_BATCH_SIZE),
                100,
            )
        );
    }
}
