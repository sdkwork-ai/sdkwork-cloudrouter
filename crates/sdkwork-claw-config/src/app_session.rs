use std::fmt;

#[derive(Clone, PartialEq, Eq)]
pub struct AppSessionConfig {
    signing_secret: String,
    session_ttl_seconds: u64,
    max_clock_skew_seconds: u64,
}

impl AppSessionConfig {
    pub const ENV_APP_SESSION_SECRET: &'static str = "SDKWORK_CLAW_APP_SESSION_SECRET";
    pub const ENV_APP_SESSION_TTL_SECONDS: &'static str = "SDKWORK_CLAW_APP_SESSION_TTL_SECONDS";
    pub const ENV_APP_SESSION_MAX_CLOCK_SKEW_SECONDS: &'static str =
        "SDKWORK_CLAW_APP_SESSION_MAX_CLOCK_SKEW_SECONDS";
    pub const MIN_SIGNING_SECRET_LEN: usize = 32;
    pub const DEFAULT_SESSION_TTL_SECONDS: u64 = 2_592_000;
    pub const DEFAULT_MAX_CLOCK_SKEW_SECONDS: u64 = 300;
    pub const MAX_SESSION_TTL_SECONDS: u64 = 2_592_000;
    pub const MAX_CLOCK_SKEW_SECONDS: u64 = 3_600;

    pub fn from_optional_parts(
        signing_secret: Option<String>,
        session_ttl_seconds: Option<String>,
        max_clock_skew_seconds: Option<String>,
    ) -> Result<Option<Self>, String> {
        let Some(signing_secret) = signing_secret else {
            return Ok(None);
        };
        Self::from_parts(signing_secret, session_ttl_seconds, max_clock_skew_seconds).map(Some)
    }

    pub fn from_signing_secret(signing_secret: impl Into<String>) -> Result<Self, String> {
        Self::from_parts(signing_secret, None, None)
    }

    pub fn from_parts(
        signing_secret: impl Into<String>,
        session_ttl_seconds: Option<String>,
        max_clock_skew_seconds: Option<String>,
    ) -> Result<Self, String> {
        let signing_secret = signing_secret.into();
        let signing_secret = signing_secret.trim();
        if signing_secret.is_empty() {
            return Err(format!(
                "{} must not be blank",
                Self::ENV_APP_SESSION_SECRET
            ));
        }
        if signing_secret.len() < Self::MIN_SIGNING_SECRET_LEN {
            return Err(format!(
                "{} must be at least {} characters",
                Self::ENV_APP_SESSION_SECRET,
                Self::MIN_SIGNING_SECRET_LEN
            ));
        }
        let session_ttl_seconds = match session_ttl_seconds {
            Some(value) => parse_positive_u64(
                value,
                Self::ENV_APP_SESSION_TTL_SECONDS,
                Self::MAX_SESSION_TTL_SECONDS,
            )?,
            None => Self::DEFAULT_SESSION_TTL_SECONDS,
        };
        let max_clock_skew_seconds = match max_clock_skew_seconds {
            Some(value) => parse_positive_u64(
                value,
                Self::ENV_APP_SESSION_MAX_CLOCK_SKEW_SECONDS,
                Self::MAX_CLOCK_SKEW_SECONDS,
            )?,
            None => Self::DEFAULT_MAX_CLOCK_SKEW_SECONDS,
        };
        Ok(Self {
            signing_secret: signing_secret.to_owned(),
            session_ttl_seconds,
            max_clock_skew_seconds,
        })
    }

    pub fn from_env() -> Result<Option<Self>, String> {
        Self::from_env_or_runtime_toml(None)
    }

    pub fn from_env_or_runtime_toml(
        runtime_toml: Option<&crate::RuntimeTomlConfig>,
    ) -> Result<Option<Self>, String> {
        let signing_secret = crate::runtime::config_secret_value(
            Self::ENV_APP_SESSION_SECRET,
            "SDKWORK_CLAW_APP_SESSION_SECRET_FILE",
            runtime_toml.and_then(|config| config.security.app_session_secret.as_deref()),
            runtime_toml.and_then(|config| config.security.app_session_secret_file.as_deref()),
        )?;
        let session_ttl_seconds = crate::runtime::config_u64(
            Self::ENV_APP_SESSION_TTL_SECONDS,
            runtime_toml.and_then(|config| config.security.app_session_ttl_seconds),
        )?;
        let max_clock_skew_seconds = crate::runtime::config_u64(
            Self::ENV_APP_SESSION_MAX_CLOCK_SKEW_SECONDS,
            runtime_toml.and_then(|config| config.security.app_session_max_clock_skew_seconds),
        )?;
        Self::from_optional_parts(
            signing_secret,
            session_ttl_seconds.map(|value| value.to_string()),
            max_clock_skew_seconds.map(|value| value.to_string()),
        )
    }

    pub fn signing_secret(&self) -> &str {
        &self.signing_secret
    }

    pub fn session_ttl_seconds(&self) -> u64 {
        self.session_ttl_seconds
    }

    pub fn max_clock_skew_seconds(&self) -> u64 {
        self.max_clock_skew_seconds
    }
}

impl fmt::Debug for AppSessionConfig {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("AppSessionConfig")
            .field("signing_secret", &"[REDACTED]")
            .field("session_ttl_seconds", &self.session_ttl_seconds)
            .field("max_clock_skew_seconds", &self.max_clock_skew_seconds)
            .finish()
    }
}

fn parse_positive_u64(value: String, env_name: &'static str, max: u64) -> Result<u64, String> {
    let value = value.trim();
    if value.is_empty() {
        return Err(format!("{env_name} must not be blank"));
    }
    let parsed = value
        .parse::<u64>()
        .map_err(|_| format!("{env_name} must be a positive integer"))?;
    if parsed == 0 {
        return Err(format!("{env_name} must be a positive integer"));
    }
    if parsed > max {
        return Err(format!("{env_name} must be at most {max}"));
    }
    Ok(parsed)
}
