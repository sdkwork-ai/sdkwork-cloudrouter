use sdkwork_cloudrouter_config::{DeploymentMode, RuntimeTomlConfig};

use super::PaymentReconciliationWorkerConfig;

pub fn resolve_payment_reconciliation_worker_config(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> PaymentReconciliationWorkerConfig {
    match resolve_payment_reconciliation_worker_config_result(runtime_toml) {
        Ok(config) => config,
        Err(error) => {
            match DeploymentMode::from_env_or_runtime_toml(runtime_toml) {
                Ok(mode) if mode.is_production_like() => {
                    panic!(
                        "invalid payment reconciliation worker config in production-like deployment: {error}"
                    );
                }
                Err(lifecycle_error) => {
                    panic!(
                        "invalid deployment lifecycle: {lifecycle_error}; invalid payment reconciliation worker config: {error}"
                    );
                }
                Ok(_) => {}
            }
            tracing::warn!(
                %error,
                "invalid payment reconciliation worker config; reconciliation worker disabled"
            );
            PaymentReconciliationWorkerConfig::disabled()
        }
    }
}

pub fn resolve_payment_reconciliation_worker_config_result(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<PaymentReconciliationWorkerConfig, String> {
    let config = payment_reconciliation_worker_config_from_env_or_toml(runtime_toml)?;
    config.validate_for_deployment()?;
    Ok(config.normalized())
}

pub fn payment_reconciliation_worker_config_from_env_or_toml(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<PaymentReconciliationWorkerConfig, String> {
    const ENABLED: &str = "SDKWORK_CLOUDROUTER_PAYMENT_RECONCILIATION_ENABLED";
    const TENANT_ID: &str = "SDKWORK_CLOUDROUTER_PAYMENT_RECONCILIATION_TENANT_ID";
    const ORGANIZATION_ID: &str = "SDKWORK_CLOUDROUTER_PAYMENT_RECONCILIATION_ORGANIZATION_ID";
    const BATCH_SIZE: &str = "SDKWORK_CLOUDROUTER_PAYMENT_RECONCILIATION_BATCH_SIZE";
    const INTERVAL_MILLIS: &str = "SDKWORK_CLOUDROUTER_PAYMENT_RECONCILIATION_INTERVAL_MILLIS";

    let defaults = PaymentReconciliationWorkerConfig::default();
    Ok(PaymentReconciliationWorkerConfig {
        enabled: sdkwork_cloudrouter_config::runtime::config_bool(
            ENABLED,
            runtime_toml.and_then(|config| config.payment_reconciliation.enabled),
        )?
        .unwrap_or(defaults.enabled),
        tenant_id: parse_non_negative_i64_config(
            TENANT_ID,
            runtime_toml.and_then(|config| config.payment_reconciliation.tenant_id),
            defaults.tenant_id,
        )?,
        organization_id: parse_non_negative_i64_config(
            ORGANIZATION_ID,
            runtime_toml.and_then(|config| config.payment_reconciliation.organization_id),
            defaults.organization_id,
        )?,
        batch_size: parse_batch_size_config(
            BATCH_SIZE,
            runtime_toml.and_then(|config| config.payment_reconciliation.batch_size),
            defaults.batch_size,
        )?,
        interval_millis: parse_positive_u64_config(
            INTERVAL_MILLIS,
            runtime_toml.and_then(|config| config.payment_reconciliation.interval_millis),
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

fn parse_batch_size_config(
    name: &str,
    config_value: Option<i64>,
    default_value: i64,
) -> Result<i64, String> {
    let parsed = sdkwork_cloudrouter_config::runtime::config_i64(name, config_value)?
        .unwrap_or(default_value);
    if !(PaymentReconciliationWorkerConfig::MIN_BATCH_SIZE
        ..=PaymentReconciliationWorkerConfig::MAX_BATCH_SIZE)
        .contains(&parsed)
    {
        return Err(format!(
            "{name} must be between {} and {}",
            PaymentReconciliationWorkerConfig::MIN_BATCH_SIZE,
            PaymentReconciliationWorkerConfig::MAX_BATCH_SIZE
        ));
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

#[cfg(test)]
mod tests {
    use super::parse_batch_size_config;
    use crate::application::PaymentReconciliationWorkerConfig;

    #[test]
    fn payment_reconciliation_batch_size_rejects_values_outside_the_bounds() {
        let error = parse_batch_size_config(
            "SDKWORK_CLOUDROUTER_PAYMENT_RECONCILIATION_BATCH_SIZE",
            Some(PaymentReconciliationWorkerConfig::MAX_BATCH_SIZE + 1),
            PaymentReconciliationWorkerConfig::MAX_BATCH_SIZE,
        )
        .expect_err("an oversized reconciliation batch must be rejected");

        assert!(error.contains("must be between"));
        assert_eq!(
            Ok(PaymentReconciliationWorkerConfig::MAX_BATCH_SIZE),
            parse_batch_size_config(
                "SDKWORK_CLOUDROUTER_PAYMENT_RECONCILIATION_BATCH_SIZE",
                Some(PaymentReconciliationWorkerConfig::MAX_BATCH_SIZE),
                PaymentReconciliationWorkerConfig::MAX_BATCH_SIZE,
            )
        );
    }
}
