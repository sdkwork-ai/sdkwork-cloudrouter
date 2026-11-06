// Startup install policy.
//
// Two different concerns were historically conflated behind one switch:
//
// * **Schema lifecycle** — creating or altering tables. Production and staging
//   must never do this at process start; a controlled release step owns it
//   (`SDKWORK_DATABASE_AUTO_MIGRATE`, `cloudrouterctl migrate`, or the
//   `--migrate-databases` lifecycle command).
// * **Data bootstrap** — projecting the bundled model catalog, importing the
//   routing seed, and ensuring the neutral default pricing plan. This is
//   idempotent, schema-independent (the installer refuses to run against a
//   schema that is not current) and is exactly what the platform already does
//   for `seedOnBoot` database modules in every environment.
//
// Treating `SDKWORK_CLOUDROUTER_STARTUP_INSTALL_MODE=skip` as "production"
// silently disabled the second concern too, so a freshly migrated production
// database stayed empty until an operator ran `cloudrouterctl ensure` by hand.
// A gateway deployment that ships no such operator binary then served an empty
// catalog, and the first write (creating an API key) failed with an opaque
// 50001. The switch below now governs only the data bootstrap; schema
// mutation stays governed by its own explicit lifecycle switches.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StartupInstallMode {
    Ensure,
    Skip,
}

impl StartupInstallMode {
    pub const ENV_STARTUP_INSTALL_MODE: &'static str = "SDKWORK_CLOUDROUTER_STARTUP_INSTALL_MODE";
    pub const ENV_ROUTER_ENVIRONMENT: &'static str = "SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT";
    pub const ENV_DATABASE_AUTO_MIGRATE: &'static str = "SDKWORK_DATABASE_AUTO_MIGRATE";

    pub fn from_env() -> Result<Self, String> {
        Self::from_env_or_runtime_toml(None)
    }

    /// Resolves the data-bootstrap mode.
    ///
    /// Defaults to [`Self::Ensure`] in every lifecycle environment, production
    /// included: an idempotent data bootstrap is what makes a migrated
    /// database usable, and the gateway deployment has no other step that
    /// would run it. Operators who manage product data out of band opt out
    /// explicitly with `SDKWORK_CLOUDROUTER_STARTUP_INSTALL_MODE=skip`.
    pub fn from_env_or_runtime_toml(
        runtime_toml: Option<&crate::RuntimeTomlConfig>,
    ) -> Result<Self, String> {
        let explicit = crate::runtime::env_optional(Self::ENV_STARTUP_INSTALL_MODE)
            .or_else(|| runtime_toml.and_then(|config| config.install.startup_mode.clone()));
        Self::from_optional_part(explicit)
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

/// Rejects automatic schema migration at process start in production and
/// staging.
///
/// Only the schema lifecycle is guarded here. The data bootstrap
/// (`StartupInstallMode::Ensure`) is admitted in production because it never
/// creates or alters a table and is idempotent; without it a migrated-but-unseeded
/// database stays unusable and fails at the first write.
pub fn ensure_production_startup_install_policy(
    runtime_toml: Option<&crate::RuntimeTomlConfig>,
    _startup_install_mode: StartupInstallMode,
) -> Result<(), String> {
    if !is_production_like_install_environment(runtime_toml) {
        return Ok(());
    }
    if !database_auto_migrate_requested() || explicit_lifecycle_command() {
        return Ok(());
    }
    Err(format!(
        "production/staging deployment must not run automatic database schema migration at startup; set {}=false and apply schema changes through controlled release operations",
        StartupInstallMode::ENV_DATABASE_AUTO_MIGRATE
    ))
}

fn database_auto_migrate_requested() -> bool {
    crate::runtime::env_optional(StartupInstallMode::ENV_DATABASE_AUTO_MIGRATE)
        .map(|value| {
            matches!(
                value.trim().to_ascii_lowercase().as_str(),
                "1" | "true" | "yes" | "on"
            )
        })
        .unwrap_or(false)
}

/// True when this process is the explicit release/operator lifecycle command
/// (`SDKWORK_DATABASE_LIFECYCLE_COMMAND=migrate`, set by
/// `sdkwork-api-cloud-gateway --migrate-databases`, for example), which is the
/// sanctioned way to migrate a production database before service startup.
/// Mirrors `sdkwork-cloudrouter-database-host`'s marker so both guards admit
/// exactly the same process.
fn explicit_lifecycle_command() -> bool {
    matches!(
        crate::runtime::env_optional("SDKWORK_DATABASE_LIFECYCLE_COMMAND")
            .unwrap_or_default()
            .trim()
            .to_ascii_lowercase()
            .as_str(),
        "migrate" | "migrate-databases" | "explicit" | "operator"
    )
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

    #[test]
    fn data_bootstrap_defaults_to_ensure() {
        assert_eq!(
            StartupInstallMode::Ensure,
            StartupInstallMode::from_optional_part(None).expect("default mode")
        );
    }
}
