//! Upstream account credential rotation worker.
//!
//! Commercial deployments need supplier credentials rotated on a schedule:
//! provider keys carry expiry, and long-lived keys are a security liability.
//! This worker sweeps `ai_upstream_account` rows that are due (`next_rotate_at`
//! passed, or an active credential expired), promotes a pre-provisioned
//! candidate credential (newer `credential_version`) to active, deactivates
//! expired credentials, and alerts when rotation is overdue because no
//! candidate was provisioned. It never generates new secret material — new
//! keys must be provisioned through the backend credential API; this worker is
//! the mechanical promotion/scheduling/alerting layer.

use std::sync::Arc;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use serde_json::Value;

use crate::domain::DomainResult;
use crate::ports::{
    CredentialRotationAccount, CredentialRotationAction, CredentialRotationSweepCommand,
    TryRotateCredentialCommand, UpstreamCredentialRotationStore,
};

pub(crate) const MIN_BATCH_SIZE: i64 = 1;
pub(crate) const MAX_BATCH_SIZE: i64 = 200;
const DEFAULT_BATCH_SIZE: i64 = 20;
const DEFAULT_INTERVAL_MILLIS: u64 = 60 * 60 * 1_000;
const MIN_INTERVAL_MILLIS: u64 = 60_000;
const DEFAULT_ROTATION_INTERVAL_DAYS: i64 = 90;
const MIN_ROTATION_INTERVAL_DAYS: i64 = 1;
const MAX_ROTATION_INTERVAL_DAYS: i64 = 3_650;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct UpstreamCredentialRotationConfig {
    pub enabled: bool,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub batch_size: i64,
    pub interval_millis: u64,
    /// Interval used when the account's `credential_rotation_policy` does not
    /// define `rotation_interval_days`.
    pub default_rotation_interval_days: i64,
}

impl UpstreamCredentialRotationConfig {
    pub const MIN_BATCH_SIZE: i64 = MIN_BATCH_SIZE;
    pub const MAX_BATCH_SIZE: i64 = MAX_BATCH_SIZE;

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
            batch_size: sdkwork_utils_rust::clamp(self.batch_size, MIN_BATCH_SIZE, MAX_BATCH_SIZE),
            interval_millis: self.interval_millis.max(MIN_INTERVAL_MILLIS),
            default_rotation_interval_days: sdkwork_utils_rust::clamp(
                self.default_rotation_interval_days,
                MIN_ROTATION_INTERVAL_DAYS,
                MAX_ROTATION_INTERVAL_DAYS,
            ),
        }
    }

    pub fn validate_for_deployment(&self) -> Result<(), String> {
        if !(MIN_BATCH_SIZE..=MAX_BATCH_SIZE).contains(&self.batch_size) {
            return Err(format!(
                "credential rotation worker batch_size must be between {MIN_BATCH_SIZE} and {MAX_BATCH_SIZE}"
            ));
        }
        if !(MIN_ROTATION_INTERVAL_DAYS..=MAX_ROTATION_INTERVAL_DAYS)
            .contains(&self.default_rotation_interval_days)
        {
            return Err(format!(
                "credential rotation worker default_rotation_interval_days must be between {MIN_ROTATION_INTERVAL_DAYS} and {MAX_ROTATION_INTERVAL_DAYS}"
            ));
        }
        if !self.enabled {
            return Ok(());
        }
        if self.tenant_id > 0 {
            return Ok(());
        }
        if platform_rotation_scope_allowed() {
            return Ok(());
        }
        Err(
            "credential rotation worker requires SDKWORK_CLOUDROUTER_CREDENTIAL_ROTATION_TENANT_ID > 0 or explicit SDKWORK_CLOUDROUTER_CREDENTIAL_ROTATION_PLATFORM_SCOPE=true when enabled"
                .to_owned(),
        )
    }
}

impl Default for UpstreamCredentialRotationConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            tenant_id: 0,
            organization_id: 0,
            batch_size: DEFAULT_BATCH_SIZE,
            interval_millis: DEFAULT_INTERVAL_MILLIS,
            default_rotation_interval_days: DEFAULT_ROTATION_INTERVAL_DAYS,
        }
    }
}

fn platform_rotation_scope_allowed() -> bool {
    std::env::var("SDKWORK_CLOUDROUTER_CREDENTIAL_ROTATION_PLATFORM_SCOPE")
        .ok()
        .map(|value| {
            matches!(
                value.trim().to_ascii_lowercase().as_str(),
                "1" | "true" | "yes" | "on"
            )
        })
        .unwrap_or(false)
}

pub fn resolve_upstream_credential_rotation_config(
    runtime_toml: Option<&sdkwork_cloudrouter_config::RuntimeTomlConfig>,
) -> UpstreamCredentialRotationConfig {
    match resolve_upstream_credential_rotation_config_result(runtime_toml) {
        Ok(config) => config,
        Err(error) => {
            match sdkwork_cloudrouter_config::DeploymentMode::from_env_or_runtime_toml(runtime_toml)
            {
                Ok(mode) if mode.is_production_like() => {
                    panic!(
                        "invalid credential rotation config in production-like deployment: {error}"
                    );
                }
                Err(lifecycle_error) => {
                    panic!(
                        "invalid deployment lifecycle: {lifecycle_error}; invalid credential rotation config: {error}"
                    );
                }
                Ok(_) => {}
            }
            tracing::warn!(
                %error,
                "invalid credential rotation config; credential rotation worker disabled"
            );
            UpstreamCredentialRotationConfig::disabled()
        }
    }
}

pub fn resolve_upstream_credential_rotation_config_result(
    runtime_toml: Option<&sdkwork_cloudrouter_config::RuntimeTomlConfig>,
) -> Result<UpstreamCredentialRotationConfig, String> {
    let config = upstream_credential_rotation_config_from_env_or_toml(runtime_toml)?;
    config.validate_for_deployment()?;
    Ok(config.normalized())
}

pub fn upstream_credential_rotation_config_from_env_or_toml(
    runtime_toml: Option<&sdkwork_cloudrouter_config::RuntimeTomlConfig>,
) -> Result<UpstreamCredentialRotationConfig, String> {
    const ENABLED: &str = "SDKWORK_CLOUDROUTER_CREDENTIAL_ROTATION_ENABLED";
    const TENANT_ID: &str = "SDKWORK_CLOUDROUTER_CREDENTIAL_ROTATION_TENANT_ID";
    const ORGANIZATION_ID: &str = "SDKWORK_CLOUDROUTER_CREDENTIAL_ROTATION_ORGANIZATION_ID";
    const BATCH_SIZE: &str = "SDKWORK_CLOUDROUTER_CREDENTIAL_ROTATION_BATCH_SIZE";
    const INTERVAL_MILLIS: &str = "SDKWORK_CLOUDROUTER_CREDENTIAL_ROTATION_INTERVAL_MILLIS";
    const DEFAULT_INTERVAL_DAYS: &str =
        "SDKWORK_CLOUDROUTER_CREDENTIAL_ROTATION_DEFAULT_INTERVAL_DAYS";

    let defaults = UpstreamCredentialRotationConfig::default();
    Ok(UpstreamCredentialRotationConfig {
        enabled: sdkwork_cloudrouter_config::runtime::config_bool(
            ENABLED,
            runtime_toml.and_then(|config| config.credential_rotation.enabled),
        )?
        .unwrap_or(defaults.enabled),
        tenant_id: parse_non_negative_i64_config(
            TENANT_ID,
            runtime_toml.and_then(|config| config.credential_rotation.tenant_id),
            defaults.tenant_id,
        )?,
        organization_id: parse_non_negative_i64_config(
            ORGANIZATION_ID,
            runtime_toml.and_then(|config| config.credential_rotation.organization_id),
            defaults.organization_id,
        )?,
        batch_size: parse_batch_size_config(
            BATCH_SIZE,
            runtime_toml.and_then(|config| config.credential_rotation.batch_size),
            defaults.batch_size,
        )?,
        interval_millis: parse_positive_u64_config(
            INTERVAL_MILLIS,
            runtime_toml.and_then(|config| config.credential_rotation.interval_millis),
            defaults.interval_millis,
        )?,
        default_rotation_interval_days: parse_positive_i64_config(
            DEFAULT_INTERVAL_DAYS,
            runtime_toml.and_then(|config| config.credential_rotation.default_interval_days),
            defaults.default_rotation_interval_days,
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

fn parse_batch_size_config(
    name: &str,
    config_value: Option<i64>,
    default_value: i64,
) -> Result<i64, String> {
    let parsed = sdkwork_cloudrouter_config::runtime::config_i64(name, config_value)?
        .unwrap_or(default_value);
    if !(MIN_BATCH_SIZE..=MAX_BATCH_SIZE).contains(&parsed) {
        return Err(format!(
            "{name} must be between {MIN_BATCH_SIZE} and {MAX_BATCH_SIZE}"
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

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct CredentialRotationRunOutcome {
    pub accounts_checked: i64,
    pub rotated: i64,
    pub expired_deactivated: i64,
    pub overdue: i64,
    pub noop: i64,
}

#[derive(Clone)]
pub struct UpstreamCredentialRotationWorker {
    store: Arc<dyn UpstreamCredentialRotationStore + Send + Sync>,
    config: UpstreamCredentialRotationConfig,
}

impl UpstreamCredentialRotationWorker {
    pub fn new(
        store: Arc<dyn UpstreamCredentialRotationStore + Send + Sync>,
        config: UpstreamCredentialRotationConfig,
    ) -> Self {
        Self {
            store,
            config: config.normalized(),
        }
    }

    pub fn config(&self) -> UpstreamCredentialRotationConfig {
        self.config
    }

    pub async fn run_once(&self) -> DomainResult<CredentialRotationRunOutcome> {
        let started_at = Instant::now();
        let mut outcome = CredentialRotationRunOutcome::default();
        if !self.config.enabled {
            return Ok(outcome);
        }
        let now = current_iso_timestamp();
        let accounts = self
            .store
            .list_accounts_due_for_rotation(CredentialRotationSweepCommand {
                tenant_id: self.config.tenant_id,
                organization_id: self.config.organization_id,
                limit: self.config.batch_size,
                now: now.clone(),
            })
            .await?;
        outcome.accounts_checked = accounts.len() as i64;
        for account in accounts {
            match self.rotate_account(&account, &now).await {
                Ok(CredentialRotationAction::Rotated {
                    promoted_credential_id,
                    previous_credential_id,
                    next_rotate_at,
                    ..
                }) => {
                    outcome.rotated += 1;
                    tracing::info!(
                        tenant_id = account.tenant_id,
                        organization_id = account.organization_id,
                        account_id = account.account_id,
                        account_code = %account.account_code,
                        promoted_credential_id,
                        previous_credential_id,
                        next_rotate_at = %next_rotate_at,
                        "upstream account credential rotated"
                    );
                }
                Ok(CredentialRotationAction::ExpiredDeactivated {
                    deactivated_credential_id,
                    ..
                }) => {
                    outcome.expired_deactivated += 1;
                    tracing::warn!(
                        tenant_id = account.tenant_id,
                        organization_id = account.organization_id,
                        account_id = account.account_id,
                        account_code = %account.account_code,
                        deactivated_credential_id,
                        "upstream account credential expired and was deactivated; provision a replacement"
                    );
                }
                Ok(CredentialRotationAction::Overdue { .. }) => {
                    outcome.overdue += 1;
                    tracing::warn!(
                        tenant_id = account.tenant_id,
                        organization_id = account.organization_id,
                        account_id = account.account_id,
                        account_code = %account.account_code,
                        "upstream account credential rotation is overdue; provision a candidate credential"
                    );
                }
                Ok(CredentialRotationAction::Noop { .. }) => {
                    outcome.noop += 1;
                }
                Err(error) => {
                    tracing::warn!(
                        tenant_id = account.tenant_id,
                        organization_id = account.organization_id,
                        account_id = account.account_id,
                        error = %error,
                        "upstream account credential rotation failed"
                    );
                }
            }
        }
        if outcome.accounts_checked > 0 {
            credential_rotation_actions_counter()
                .with_label_values(&["rotated"])
                .inc_by(outcome.rotated as u64);
            credential_rotation_actions_counter()
                .with_label_values(&["expired_deactivated"])
                .inc_by(outcome.expired_deactivated as u64);
            credential_rotation_actions_counter()
                .with_label_values(&["overdue"])
                .inc_by(outcome.overdue as u64);
            credential_rotation_actions_counter()
                .with_label_values(&["noop"])
                .inc_by(outcome.noop as u64);
        }
        tracing::info!(
            tenant_id = self.config.tenant_id,
            organization_id = self.config.organization_id,
            accounts_checked = outcome.accounts_checked,
            rotated = outcome.rotated,
            expired_deactivated = outcome.expired_deactivated,
            overdue = outcome.overdue,
            noop = outcome.noop,
            elapsed_ms = started_at.elapsed().as_millis() as u64,
            "upstream credential rotation run completed"
        );
        Ok(outcome)
    }

    async fn rotate_account(
        &self,
        account: &CredentialRotationAccount,
        now: &str,
    ) -> DomainResult<CredentialRotationAction> {
        let interval_days =
            rotation_interval_days(account).unwrap_or(self.config.default_rotation_interval_days);
        self.store
            .try_rotate_account(TryRotateCredentialCommand {
                tenant_id: account.tenant_id,
                organization_id: account.organization_id,
                account_id: account.account_id,
                now: now.to_owned(),
                rotation_interval_days: interval_days,
            })
            .await
    }
}

/// Reads `rotation_interval_days` from the account's `credential_rotation_policy`
/// JSONB, falling back to `None` when the policy is absent or malformed.
fn rotation_interval_days(account: &CredentialRotationAccount) -> Option<i64> {
    let Some(policy) = account.credential_rotation_policy.as_deref() else {
        return None;
    };
    let parsed: Value = serde_json::from_str(policy).ok()?;
    let days = parsed.get("rotation_interval_days")?.as_i64()?;
    (days > 0).then_some(days)
}

fn current_iso_timestamp() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    let days = seconds.div_euclid(86_400);
    let seconds_of_day = seconds.rem_euclid(86_400);
    let (year, month, day) = civil_from_days(days);
    let hour = seconds_of_day / 3_600;
    let minute = (seconds_of_day % 3_600) / 60;
    let second = seconds_of_day % 60;
    format!("{year:04}-{month:02}-{day:02}T{hour:02}:{minute:02}:{second:02}Z")
}

fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = mp + if mp < 10 { 3 } else { -9 };
    let year = y + if m <= 2 { 1 } else { 0 };
    (year, m, d)
}

fn credential_rotation_actions_counter() -> prometheus::IntCounterVec {
    use std::sync::OnceLock;
    static METRIC: OnceLock<prometheus::IntCounterVec> = OnceLock::new();
    METRIC
        .get_or_init(|| {
            let metric = prometheus::IntCounterVec::new(
                prometheus::Opts::new(
                    "upstream_credential_rotation_actions_total",
                    "Upstream account credential rotation action outcomes.",
                )
                .namespace("cloudrouter"),
                &["action"],
            )
            .expect("credential rotation action metric");
            let _ = prometheus::register(Box::new(metric.clone()));
            metric
        })
        .clone()
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::sync::Arc;

    use super::*;
    use crate::ports::UpstreamCredentialRotationStoreFuture;

    #[derive(Default)]
    struct ScriptedRotationStore {
        due_accounts: std::sync::Mutex<Vec<CredentialRotationAccount>>,
        actions: std::sync::Mutex<Vec<CredentialRotationAction>>,
        rotate_calls: Arc<AtomicU64>,
    }

    impl Clone for ScriptedRotationStore {
        fn clone(&self) -> Self {
            Self {
                due_accounts: std::sync::Mutex::new(self.due_accounts.lock().unwrap().clone()),
                actions: std::sync::Mutex::new(self.actions.lock().unwrap().clone()),
                rotate_calls: Arc::clone(&self.rotate_calls),
            }
        }
    }

    impl ScriptedRotationStore {
        fn with_due(self, accounts: Vec<CredentialRotationAccount>) -> Self {
            *self.due_accounts.lock().unwrap() = accounts;
            self
        }

        fn with_action(self, action: CredentialRotationAction) -> Self {
            self.actions.lock().unwrap().push(action);
            self
        }

        fn rotate_calls(&self) -> u64 {
            self.rotate_calls.load(Ordering::SeqCst)
        }
    }

    impl UpstreamCredentialRotationStore for ScriptedRotationStore {
        fn list_accounts_due_for_rotation(
            &self,
            _command: CredentialRotationSweepCommand,
        ) -> UpstreamCredentialRotationStoreFuture<'_, Vec<CredentialRotationAccount>> {
            let due = self.due_accounts.lock().unwrap().clone();
            Box::pin(async move { Ok(due) })
        }

        fn try_rotate_account(
            &self,
            _command: TryRotateCredentialCommand,
        ) -> UpstreamCredentialRotationStoreFuture<'_, CredentialRotationAction> {
            self.rotate_calls.fetch_add(1, Ordering::SeqCst);
            let mut actions = self.actions.lock().unwrap();
            let action = if actions.is_empty() {
                CredentialRotationAction::Noop {
                    tenant_id: 10,
                    organization_id: 0,
                    account_id: 1,
                }
            } else {
                actions.remove(0)
            };
            Box::pin(async move { Ok(action) })
        }
    }

    fn account(account_id: i64, policy: Option<&str>) -> CredentialRotationAccount {
        CredentialRotationAccount {
            tenant_id: 10,
            organization_id: 0,
            account_id,
            supplier_code: "openai".to_owned(),
            account_code: format!("account-{account_id}"),
            credential_rotation_policy: policy.map(str::to_owned),
        }
    }

    fn rotated(account_id: i64) -> CredentialRotationAction {
        CredentialRotationAction::Rotated {
            tenant_id: 10,
            organization_id: 0,
            account_id,
            promoted_credential_id: 22,
            previous_credential_id: Some(11),
            next_rotate_at: "2026-11-07T00:00:00.000Z".to_owned(),
        }
    }

    fn worker(store: ScriptedRotationStore) -> UpstreamCredentialRotationWorker {
        UpstreamCredentialRotationWorker::new(
            Arc::new(store),
            UpstreamCredentialRotationConfig {
                enabled: true,
                tenant_id: 10,
                organization_id: 0,
                batch_size: 20,
                interval_millis: DEFAULT_INTERVAL_MILLIS,
                default_rotation_interval_days: 90,
            },
        )
    }

    #[test]
    fn rotation_config_normalizes_and_validates() {
        let normalized = UpstreamCredentialRotationConfig {
            enabled: true,
            tenant_id: 10,
            organization_id: 0,
            batch_size: 5_000,
            interval_millis: 1,
            default_rotation_interval_days: 10_000,
        }
        .normalized();
        assert_eq!(MAX_BATCH_SIZE, normalized.batch_size);
        assert_eq!(MIN_INTERVAL_MILLIS, normalized.interval_millis);
        assert_eq!(
            MAX_ROTATION_INTERVAL_DAYS,
            normalized.default_rotation_interval_days
        );
        assert!(normalized.validate_for_deployment().is_ok());
        assert!(UpstreamCredentialRotationConfig::disabled()
            .validate_for_deployment()
            .is_ok());
    }

    #[test]
    fn enabled_rotation_worker_without_scope_is_rejected_outside_platform_scope() {
        std::env::remove_var("SDKWORK_CLOUDROUTER_CREDENTIAL_ROTATION_PLATFORM_SCOPE");
        let error = UpstreamCredentialRotationConfig {
            enabled: true,
            tenant_id: 0,
            organization_id: 0,
            batch_size: 20,
            interval_millis: DEFAULT_INTERVAL_MILLIS,
            default_rotation_interval_days: 90,
        }
        .validate_for_deployment()
        .expect_err("platform-scope rotation requires explicit opt-in");
        assert!(error.contains("CREDENTIAL_ROTATION_TENANT_ID"));
    }

    #[tokio::test]
    async fn disabled_worker_does_not_touch_the_store() {
        let store = ScriptedRotationStore::default();
        let worker = UpstreamCredentialRotationWorker::new(
            Arc::new(store.clone()),
            UpstreamCredentialRotationConfig::disabled(),
        );
        let outcome = worker.run_once().await.expect("disabled run must succeed");
        assert_eq!(0, outcome.accounts_checked);
        assert_eq!(0, store.rotate_calls());
    }

    #[tokio::test]
    async fn worker_counts_rotation_action_outcomes() {
        let store = ScriptedRotationStore::default()
            .with_due(vec![account(1, None), account(2, None), account(3, None)])
            .with_action(rotated(1))
            .with_action(CredentialRotationAction::Overdue {
                tenant_id: 10,
                organization_id: 0,
                account_id: 2,
            })
            .with_action(CredentialRotationAction::ExpiredDeactivated {
                tenant_id: 10,
                organization_id: 0,
                account_id: 3,
                deactivated_credential_id: 7,
            });
        let worker = worker(store.clone());
        let outcome = worker.run_once().await.expect("rotation run must succeed");
        assert_eq!(3, outcome.accounts_checked);
        assert_eq!(1, outcome.rotated);
        assert_eq!(1, outcome.overdue);
        assert_eq!(1, outcome.expired_deactivated);
        assert_eq!(0, outcome.noop);
        assert_eq!(3, store.rotate_calls());
    }

    #[test]
    fn policy_interval_days_is_read_from_account_policy() {
        let with_policy = account(1, Some(r#"{"rotation_interval_days": 30}"#));
        assert_eq!(Some(30), rotation_interval_days(&with_policy));
        let without_policy = account(2, None);
        assert_eq!(None, rotation_interval_days(&without_policy));
        let malformed = account(3, Some("not-json"));
        assert_eq!(None, rotation_interval_days(&malformed));
        let wrong_type = account(4, Some(r#"{"rotation_interval_days": "soon"}"#));
        assert_eq!(None, rotation_interval_days(&wrong_type));
    }
}
