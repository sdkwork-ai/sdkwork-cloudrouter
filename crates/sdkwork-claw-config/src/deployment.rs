use serde::{Deserialize, Serialize};
use std::str::FromStr;

/// Legacy process topology hint retained for Redis, cache, and desktop behavior wiring.
/// Canonical deployment metadata is [`DeploymentProfile`] + [`RuntimeTarget`].
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeploymentMode {
    #[default]
    Desktop,
    Server,
    Docker,
    Kubernetes,
}

/// Canonical SDKWork deployment profile per `DEPLOYMENT_SPEC.md`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeploymentProfile {
    Standalone,
    Cloud,
}

/// Canonical SDKWork runtime target per `CONFIG_SPEC.md` / `DEPLOYMENT_SPEC.md`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RuntimeTarget {
    Server,
    Container,
    Desktop,
    Browser,
    TestRunner,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DeploymentRuntime {
    pub profile: DeploymentProfile,
    pub target: RuntimeTarget,
    pub mode: DeploymentMode,
}

impl DeploymentMode {
    pub const ENV_DEPLOYMENT_MODE: &'static str = "SDKWORK_CLAW_DEPLOYMENT_MODE";

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Desktop => "desktop",
            Self::Server => "server",
            Self::Docker => "docker",
            Self::Kubernetes => "kubernetes",
        }
    }

    pub fn from_env() -> Result<Self, String> {
        Self::from_env_or_runtime_toml(None)
    }

    pub fn from_env_or_runtime_toml(
        runtime_toml: Option<&crate::RuntimeTomlConfig>,
    ) -> Result<Self, String> {
        resolve_deployment_runtime(runtime_toml).map(|runtime| runtime.mode)
    }

    pub fn from_optional_part(value: Option<String>) -> Result<Self, String> {
        if let Some(runtime) = canonical_deployment_runtime_from_env()? {
            return Ok(runtime.mode);
        }
        let Some(value) = value else {
            return Ok(resolve_deployment_runtime(None)?.mode);
        };
        Self::from_str(&value).map_err(|error| format!("{}: {error}", Self::ENV_DEPLOYMENT_MODE))
    }

    pub fn is_production_like(self) -> bool {
        !matches!(self, Self::Desktop)
    }
}

impl DeploymentProfile {
    pub const ENV_DEPLOYMENT_PROFILE: &'static str = "SDKWORK_CLAW_ROUTER_DEPLOYMENT_PROFILE";

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Standalone => "standalone",
            Self::Cloud => "cloud",
        }
    }

    fn from_str_strict(value: &str, label: &str) -> Result<Self, String> {
        match value.trim().to_ascii_lowercase().as_str() {
            "standalone" => Ok(Self::Standalone),
            "cloud" => Ok(Self::Cloud),
            other => Err(format!(
                "{label} must be `standalone` or `cloud`, got `{other}`"
            )),
        }
    }
}

impl RuntimeTarget {
    pub const ENV_RUNTIME_TARGET: &'static str = "SDKWORK_CLAW_ROUTER_RUNTIME_TARGET";

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Server => "server",
            Self::Container => "container",
            Self::Desktop => "desktop",
            Self::Browser => "browser",
            Self::TestRunner => "test-runner",
        }
    }

    fn from_str_strict(value: &str, label: &str) -> Result<Self, String> {
        match value.trim().to_ascii_lowercase().as_str() {
            "server" => Ok(Self::Server),
            "container" => Ok(Self::Container),
            "desktop" => Ok(Self::Desktop),
            "browser" => Ok(Self::Browser),
            "test-runner" => Ok(Self::TestRunner),
            other => Err(format!(
                "{label} must be one of `server`, `container`, `desktop`, `browser`, or `test-runner`, got `{other}`"
            )),
        }
    }
}

impl DeploymentRuntime {
    pub fn resolve(runtime_toml: Option<&crate::RuntimeTomlConfig>) -> Result<Self, String> {
        resolve_deployment_runtime(runtime_toml)
    }

    pub fn resolve_configured(
        runtime_toml: Option<&crate::RuntimeTomlConfig>,
    ) -> Result<Option<Self>, String> {
        if let Some(runtime) = canonical_deployment_runtime_from_env()? {
            return Ok(Some(runtime));
        }
        canonical_deployment_runtime_from_toml(runtime_toml)
    }

    pub fn from_env_override() -> Result<Option<Self>, String> {
        canonical_deployment_runtime_from_env()
    }

    pub fn is_production_like(self) -> bool {
        self.mode.is_production_like()
    }
}

pub fn resolve_deployment_runtime(
    runtime_toml: Option<&crate::RuntimeTomlConfig>,
) -> Result<DeploymentRuntime, String> {
    if let Some(runtime) = canonical_deployment_runtime_from_env()? {
        return Ok(runtime);
    }
    if let Some(runtime) = canonical_deployment_runtime_from_toml(runtime_toml)? {
        return Ok(runtime);
    }
    resolve_legacy_deployment_runtime(runtime_toml)
}

impl Default for DeploymentRuntime {
    fn default() -> Self {
        Self {
            profile: DeploymentProfile::Standalone,
            target: RuntimeTarget::Desktop,
            mode: DeploymentMode::Desktop,
        }
    }
}

fn canonical_deployment_runtime_from_env() -> Result<Option<DeploymentRuntime>, String> {
    let profile = canonical_env_value(DeploymentProfile::ENV_DEPLOYMENT_PROFILE)?;
    let target = canonical_env_value(RuntimeTarget::ENV_RUNTIME_TARGET)?;

    resolve_canonical_pair(
        profile.as_deref(),
        DeploymentProfile::ENV_DEPLOYMENT_PROFILE,
        target.as_deref(),
        RuntimeTarget::ENV_RUNTIME_TARGET,
    )
}

fn canonical_deployment_runtime_from_toml(
    runtime_toml: Option<&crate::RuntimeTomlConfig>,
) -> Result<Option<DeploymentRuntime>, String> {
    let Some(runtime) = runtime_toml.map(|config| &config.runtime) else {
        return Ok(None);
    };

    resolve_canonical_pair(
        runtime.deployment_profile.as_deref(),
        "[runtime].deployment_profile",
        runtime.runtime_target.as_deref(),
        "[runtime].runtime_target",
    )
}

fn canonical_env_value(name: &str) -> Result<Option<String>, String> {
    match std::env::var(name) {
        Ok(value) => {
            let value = value.trim();
            if value.is_empty() {
                Err(format!("{name} must not be blank"))
            } else {
                Ok(Some(value.to_owned()))
            }
        }
        Err(std::env::VarError::NotPresent) => Ok(None),
        Err(std::env::VarError::NotUnicode(_)) => Err(format!("{name} must contain valid Unicode")),
    }
}

fn resolve_canonical_pair(
    profile: Option<&str>,
    profile_label: &str,
    target: Option<&str>,
    target_label: &str,
) -> Result<Option<DeploymentRuntime>, String> {
    let (profile, target) = match (profile, target) {
        (None, None) => return Ok(None),
        (Some(_), None) => {
            return Err(format!(
                "{profile_label} is set, so {target_label} must also be set"
            ));
        }
        (None, Some(_)) => {
            return Err(format!(
                "{target_label} is set, so {profile_label} must also be set"
            ));
        }
        (Some(profile), Some(target)) => (profile, target),
    };

    let profile = DeploymentProfile::from_str_strict(profile, profile_label)?;
    let target = RuntimeTarget::from_str_strict(target, target_label)?;
    Ok(Some(DeploymentRuntime {
        profile,
        target,
        mode: deployment_mode_for(profile, target),
    }))
}

fn resolve_legacy_deployment_runtime(
    runtime_toml: Option<&crate::RuntimeTomlConfig>,
) -> Result<DeploymentRuntime, String> {
    let legacy_mode = legacy_env_trimmed(DeploymentMode::ENV_DEPLOYMENT_MODE).or_else(|| {
        runtime_toml
            .and_then(|config| config.runtime.deployment_mode.clone())
            .map(|value| value.trim().to_owned())
            .filter(|value| !value.is_empty())
    });
    let Some(legacy_mode) = legacy_mode else {
        return Ok(DeploymentRuntime::default());
    };

    let normalized = legacy_mode.trim().to_ascii_lowercase();
    if normalized == "cloud" {
        return Err(format!(
            "{} is retired; use {}=cloud and {}=container for cloud container deployments",
            DeploymentMode::ENV_DEPLOYMENT_MODE,
            DeploymentProfile::ENV_DEPLOYMENT_PROFILE,
            RuntimeTarget::ENV_RUNTIME_TARGET
        ));
    }
    normalize_legacy_deployment_mode(&normalized)
}

fn legacy_env_trimmed(name: &str) -> Option<String> {
    std::env::var(name)
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

fn normalize_legacy_deployment_mode(value: &str) -> Result<DeploymentRuntime, String> {
    match value {
        "desktop" => Ok(DeploymentRuntime {
            profile: DeploymentProfile::Standalone,
            target: RuntimeTarget::Desktop,
            mode: DeploymentMode::Desktop,
        }),
        "server" => Ok(DeploymentRuntime {
            profile: DeploymentProfile::Standalone,
            target: RuntimeTarget::Server,
            mode: DeploymentMode::Server,
        }),
        "docker" => Ok(DeploymentRuntime {
            profile: DeploymentProfile::Standalone,
            target: RuntimeTarget::Container,
            mode: DeploymentMode::Docker,
        }),
        "kubernetes" | "k8s" => Ok(DeploymentRuntime {
            profile: DeploymentProfile::Cloud,
            target: RuntimeTarget::Container,
            mode: DeploymentMode::Kubernetes,
        }),
        other => Err(format!(
            "unsupported deployment mode: {other}; use {} and {}",
            DeploymentProfile::ENV_DEPLOYMENT_PROFILE,
            RuntimeTarget::ENV_RUNTIME_TARGET
        )),
    }
}

fn deployment_mode_for(profile: DeploymentProfile, target: RuntimeTarget) -> DeploymentMode {
    match (profile, target) {
        (DeploymentProfile::Standalone, RuntimeTarget::Desktop) => DeploymentMode::Desktop,
        (DeploymentProfile::Standalone, RuntimeTarget::Container) => DeploymentMode::Docker,
        (DeploymentProfile::Cloud, RuntimeTarget::Container) => DeploymentMode::Kubernetes,
        (DeploymentProfile::Cloud, RuntimeTarget::Browser) => DeploymentMode::Server,
        (DeploymentProfile::Cloud, _) => DeploymentMode::Kubernetes,
        (DeploymentProfile::Standalone, RuntimeTarget::Browser) => DeploymentMode::Server,
        _ => DeploymentMode::Server,
    }
}

impl FromStr for DeploymentMode {
    type Err = String;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value.trim().to_ascii_lowercase().as_str() {
            "desktop" => Ok(Self::Desktop),
            "server" => Ok(Self::Server),
            "docker" => Ok(Self::Docker),
            "kubernetes" | "k8s" => Ok(Self::Kubernetes),
            "cloud" => Err(format!(
                "unsupported deployment mode: cloud; use {}=cloud and {}=container",
                DeploymentProfile::ENV_DEPLOYMENT_PROFILE,
                RuntimeTarget::ENV_RUNTIME_TARGET
            )),
            other => Err(format!("unsupported deployment mode: {other}")),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Mutex, OnceLock};

    fn env_lock() -> std::sync::MutexGuard<'static, ()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        LOCK.get_or_init(|| Mutex::new(()))
            .lock()
            .expect("deployment env test lock")
    }

    fn with_env(vars: &[(&str, Option<&str>)], test: impl FnOnce()) {
        let _guard = env_lock();
        let keys = vars
            .iter()
            .map(|(key, _)| *key)
            .chain([
                DeploymentMode::ENV_DEPLOYMENT_MODE,
                DeploymentProfile::ENV_DEPLOYMENT_PROFILE,
                RuntimeTarget::ENV_RUNTIME_TARGET,
            ])
            .collect::<Vec<_>>();
        let previous = keys
            .iter()
            .map(|key| (*key, std::env::var(key).ok()))
            .collect::<Vec<_>>();
        for (key, value) in vars {
            match value {
                Some(value) => unsafe { std::env::set_var(key, value) },
                None => unsafe { std::env::remove_var(key) },
            }
        }
        for key in keys.iter().copied() {
            if !vars.iter().any(|(name, _)| *name == key) {
                unsafe { std::env::remove_var(key) };
            }
        }
        test();
        for (key, value) in previous {
            match value {
                Some(value) => unsafe { std::env::set_var(key, value) },
                None => unsafe { std::env::remove_var(key) },
            }
        }
    }

    #[test]
    fn deployment_modes_parse_all_supported_modes() {
        with_env(&[], || {
            assert_eq!(
                DeploymentMode::Desktop,
                DeploymentMode::from_str("desktop").unwrap()
            );
            assert_eq!(
                DeploymentMode::Server,
                DeploymentMode::from_str("server").unwrap()
            );
            assert_eq!(
                DeploymentMode::Docker,
                DeploymentMode::from_str("docker").unwrap()
            );
            assert_eq!(
                DeploymentMode::Kubernetes,
                DeploymentMode::from_str("kubernetes").unwrap()
            );
            assert_eq!("kubernetes", DeploymentMode::Kubernetes.as_str());
        });
    }

    #[test]
    fn deployment_mode_rejects_cloud_alias() {
        with_env(
            &[(DeploymentMode::ENV_DEPLOYMENT_MODE, Some("cloud"))],
            || {
                let error = DeploymentMode::from_str("cloud").unwrap_err();
                assert!(error.contains("cloud"));
                assert!(error.contains(DeploymentProfile::ENV_DEPLOYMENT_PROFILE));
            },
        );
    }

    #[test]
    fn deployment_profile_and_runtime_target_resolve_cloud_container() {
        with_env(
            &[
                (DeploymentProfile::ENV_DEPLOYMENT_PROFILE, Some("cloud")),
                (RuntimeTarget::ENV_RUNTIME_TARGET, Some("container")),
                (DeploymentMode::ENV_DEPLOYMENT_MODE, None),
            ],
            || {
                let runtime = resolve_deployment_runtime(None).unwrap();
                assert_eq!(DeploymentProfile::Cloud, runtime.profile);
                assert_eq!(RuntimeTarget::Container, runtime.target);
                assert_eq!(DeploymentMode::Kubernetes, runtime.mode);
            },
        );
    }

    #[test]
    fn deployment_runtime_ignores_retired_unscoped_lifecycle_keys() {
        with_env(
            &[
                ("SDKWORK_CLAW_ROUTER_DEPLOYMENT_PROFILE", Some("cloud")),
                ("SDKWORK_CLAW_ROUTER_RUNTIME_TARGET", Some("container")),
                ("SDKWORK_CLAW_DEPLOYMENT_PROFILE", Some("standalone")),
                ("SDKWORK_CLAW_RUNTIME_TARGET", Some("server")),
                (DeploymentMode::ENV_DEPLOYMENT_MODE, None),
            ],
            || {
                let runtime = resolve_deployment_runtime(None).unwrap();
                assert_eq!(DeploymentProfile::Cloud, runtime.profile);
                assert_eq!(RuntimeTarget::Container, runtime.target);
                assert_eq!(DeploymentMode::Kubernetes, runtime.mode);
            },
        );
    }

    #[test]
    fn legacy_kubernetes_mode_normalizes_to_cloud_container() {
        with_env(
            &[(DeploymentMode::ENV_DEPLOYMENT_MODE, Some("kubernetes"))],
            || {
                let runtime = resolve_deployment_runtime(None).unwrap();
                assert_eq!(DeploymentProfile::Cloud, runtime.profile);
                assert_eq!(RuntimeTarget::Container, runtime.target);
                assert_eq!(DeploymentMode::Kubernetes, runtime.mode);
            },
        );
    }
}
