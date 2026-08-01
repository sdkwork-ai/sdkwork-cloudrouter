#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StartupInstallMode {
    Ensure,
    Skip,
}

impl StartupInstallMode {
    pub const ENV_STARTUP_INSTALL_MODE: &'static str = "SDKWORK_CLAW_STARTUP_INSTALL_MODE";
    pub const ENV_ROUTER_ENVIRONMENT: &'static str = "SDKWORK_CLAW_ROUTER_ENVIRONMENT";

    pub fn from_env() -> Result<Self, String> {
        Self::from_env_or_runtime_toml(None)
    }

    pub fn from_env_or_runtime_toml(
        runtime_toml: Option<&crate::RuntimeTomlConfig>,
    ) -> Result<Self, String> {
        let explicit = crate::runtime::env_optional(Self::ENV_STARTUP_INSTALL_MODE)
            .or_else(|| runtime_toml.and_then(|config| config.install.startup_mode.clone()));
        if explicit.is_some() {
            return Self::from_optional_part(explicit);
        }
        if is_production_like_install_environment(runtime_toml) {
            return Ok(Self::Skip);
        }
        Ok(Self::Ensure)
    }

    pub fn from_optional_part(value: Option<String>) -> Result<Self, String> {
        let Some(value) = value else {
            return Ok(Self::Ensure);
        };
        match value.trim().to_ascii_lowercase().as_str() {
            "" | "ensure" => Ok(Self::Ensure),
            "skip" => Ok(Self::Skip),
            _ => Err(format!(
                "{} must be ensure or skip",
                Self::ENV_STARTUP_INSTALL_MODE
            )),
        }
    }

    pub fn should_ensure(self) -> bool {
        matches!(self, Self::Ensure)
    }
}

/// Production and staging deployments must not mutate database schema at process startup.
pub fn ensure_production_startup_install_policy(
    runtime_toml: Option<&crate::RuntimeTomlConfig>,
    startup_install_mode: StartupInstallMode,
) -> Result<(), String> {
    if !startup_install_mode.should_ensure() {
        return Ok(());
    }
    if !is_production_like_install_environment(runtime_toml) {
        return Ok(());
    }
    Err(format!(
        "production/staging deployment must not run automatic database install/migrate at startup; set {}=skip and apply schema changes through controlled release operations",
        StartupInstallMode::ENV_STARTUP_INSTALL_MODE
    ))
}

/// Returns true when runtime environment is production, prod, or staging.
pub fn is_production_like_runtime_environment(
    runtime_toml: Option<&crate::RuntimeTomlConfig>,
) -> bool {
    is_production_like_install_environment(runtime_toml)
}

fn is_production_like_install_environment(runtime_toml: Option<&crate::RuntimeTomlConfig>) -> bool {
    let environment = crate::runtime::env_optional(StartupInstallMode::ENV_ROUTER_ENVIRONMENT)
        .or_else(|| runtime_toml.and_then(|config| config.install.environment.clone()));
    matches!(
        environment
            .as_deref()
            .map(|value| value.trim().to_ascii_lowercase()),
        Some(env) if env == "production" || env == "prod" || env == "staging"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn production_like_runtime_environment_matches_router_environment() {
        assert!(!is_production_like_runtime_environment(None));
    }
}
