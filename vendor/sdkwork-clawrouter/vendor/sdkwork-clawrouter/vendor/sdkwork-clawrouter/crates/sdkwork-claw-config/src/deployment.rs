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

    pub fn from_env() -> Self {
        resolve_deployment_runtime(None)
            .map(|runtime| runtime.mode)
            .unwrap_or_default()
    }

    pub fn from_optional_part(value: Option<String>) -> Result<Self, String> {
        let Some(value) = value else {
            return Ok(resolve_deployment_runtime(None)?.mode);
        };
        if env_trimmed(DeploymentProfile::ENV_DEPLOYMENT_PROFILE).is_some()
            || env_trimmed(RuntimeTarget::ENV_RUNTIME_TARGET).is_some()
        {
            return Ok(resolve_deployment_runtime(None)?.mode);
        }
        Self::from_str(&value).map_err(|error| format!("{}: {error}", Self::ENV_DEPLOYMENT_MODE))
    }

    pub fn is_production_like(self) -> bool {
        !matches!(self, Self::Desktop)
    }
}

impl DeploymentProfile {
    pub const ENV_DEPLOYMENT_PROFILE: &'static str = "SDKWORK_CLAW_DEPLOYMENT_PROFILE";

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Standalone => "standalone",
            Self::Cloud => "cloud",
        }
    }

    fn from_str_strict(value: &str) -> Result<Self, String> {
        match value.trim().to_ascii_lowercase().as_str() {
            "standalone" => Ok(Self::Standalone),
            "cloud" => Ok(Self::Cloud),
            other => Err(format!(
                "{} must be `standalone` or `cloud`, got `{other}`",
                Self::ENV_DEPLOYMENT_PROFILE
            )),
        }
    }
}

impl RuntimeTarget {
    pub const ENV_RUNTIME_TARGET: &'static str = "SDKWORK_CLAW_RUNTIME_TARGET";

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Server => "server",
            Self::Container => "container",
            Self::Desktop => "desktop",
            Self::Browser => "browser",
        }
    }

    fn from_str_strict(value: &str) -> Result<Self, String> {
        match value.trim().to_ascii_lowercase().as_str() {
            "server" => Ok(Self::Server),
            "container" => Ok(Self::Container),
            "desktop" => Ok(Self::Desktop),
            "browser" => Ok(Self::Browser),
            other => Err(format!(
                "{} must be one of `server`, `container`, `desktop`, or `browser`, got `{other}`",
                Self::ENV_RUNTIME_TARGET
            )),
        }
    }
}

impl DeploymentRuntime {
    pub fn resolve(runtime_toml: Option<&crate::RuntimeTomlConfig>) -> Result<Self, String> {
        resolve_deployment_runtime(runtime_toml)
    }

    pub fn is_production_like(self) -> bool {
        self.mode.is_production_like()
    }
}

pub fn resolve_deployment_runtime(
    runtime_toml: Option<&crate::RuntimeTomlConfig>,
) -> Result<DeploymentRuntime, String> {
    let profile_from_env = env_trimmed(DeploymentProfile::ENV_DEPLOYMENT_PROFILE);
    let target_from_env = env_trimmed(RuntimeTarget::ENV_RUNTIME_TARGET);
    let legacy_mode = env_trimmed(DeploymentMode::ENV_DEPLOYMENT_MODE).or_else(|| {
        runtime_toml
            .and_then(|config| config.runtime.deployment_mode.clone())
            .map(|value| value.trim().to_owned())
            .filter(|value| !value.is_empty())
    });

    if let Some(legacy) = legacy_mode.as_deref() {
        let normalized = legacy.trim().to_ascii_lowercase();
        if normalized == "cloud" {
            return Err(format!(
                "{} is retired; use {}=cloud and {}=container for cloud container deployments",
                DeploymentMode::ENV_DEPLOYMENT_MODE,
                DeploymentProfile::ENV_DEPLOYMENT_PROFILE,
                RuntimeTarget::ENV_RUNTIME_TARGET
            ));
        }
        if profile_from_env.is_none() && target_from_env.is_none() {
            return Ok(normalize_legacy_deployment_mode(&normalized)?);
        }
    }

    let (profile, target) = match (profile_from_env, target_from_env) {
        (Some(profile), Some(target)) => (
            DeploymentProfile::from_str_strict(&profile)?,
            RuntimeTarget::from_str_strict(&target)?,
        ),
        (None, None) => return Ok(DeploymentRuntime::default()),
        (Some(profile), None) => {
            let profile = DeploymentProfile::from_str_strict(&profile)?;
            (
                profile,
                default_runtime_target_for_profile(profile, legacy_mode.as_deref()),
            )
        }
        (None, Some(target)) => {
            let target = RuntimeTarget::from_str_strict(&target)?;
            (
                default_deployment_profile_for_target(target, legacy_mode.as_deref()),
                target,
            )
        }
    };

    Ok(DeploymentRuntime {
        profile,
        target,
        mode: deployment_mode_for(profile, target, legacy_mode.as_deref()),
    })
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

fn env_trimmed(name: &str) -> Option<String> {
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

fn default_runtime_target_for_profile(
    profile: DeploymentProfile,
    legacy_mode: Option<&str>,
) -> RuntimeTarget {
    match legacy_mode.map(str::to_ascii_lowercase).as_deref() {
        Some(mode) if mode == "kubernetes" || mode == "k8s" || mode == "docker" => {
            RuntimeTarget::Container
        }
        Some(mode) if mode == "desktop" => RuntimeTarget::Desktop,
        Some(mode) if mode == "server" => RuntimeTarget::Server,
        _ => match profile {
            DeploymentProfile::Cloud => RuntimeTarget::Container,
            DeploymentProfile::Standalone => RuntimeTarget::Server,
        },
    }
}

fn default_deployment_profile_for_target(
    target: RuntimeTarget,
    legacy_mode: Option<&str>,
) -> DeploymentProfile {
    match legacy_mode.map(str::to_ascii_lowercase).as_deref() {
        Some(mode) if mode == "kubernetes" || mode == "k8s" => DeploymentProfile::Cloud,
        _ => match target {
            RuntimeTarget::Browser | RuntimeTarget::Container => DeploymentProfile::Cloud,
            RuntimeTarget::Desktop | RuntimeTarget::Server => DeploymentProfile::Standalone,
        },
    }
}

fn deployment_mode_for(
    profile: DeploymentProfile,
    target: RuntimeTarget,
    legacy_mode: Option<&str>,
) -> DeploymentMode {
    if let Some(mode) = legacy_mode {
        if let Ok(runtime) =
            normalize_legacy_deployment_mode(mode.trim().to_ascii_lowercase().as_str())
        {
            if runtime.profile == profile && runtime.target == target {
                return runtime.mode;
            }
        }
    }
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
