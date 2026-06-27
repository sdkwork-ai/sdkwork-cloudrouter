use std::fmt;

#[derive(Clone, PartialEq, Eq)]
pub struct TrustedSubjectConfig {
    signing_secret: String,
    max_clock_skew_seconds: u64,
}

impl TrustedSubjectConfig {
    pub const ENV_TRUSTED_SUBJECT_SECRET: &'static str = "SDKWORK_CLAW_TRUSTED_SUBJECT_SECRET";
    pub const ENV_TRUSTED_SUBJECT_MAX_CLOCK_SKEW_SECONDS: &'static str =
        "SDKWORK_CLAW_TRUSTED_SUBJECT_MAX_CLOCK_SKEW_SECONDS";
    pub const MIN_SIGNING_SECRET_LEN: usize = 32;
    pub const DEFAULT_MAX_CLOCK_SKEW_SECONDS: u64 = 300;
    pub const MAX_CLOCK_SKEW_SECONDS: u64 = 3_600;

    pub fn from_optional_parts(
        signing_secret: Option<String>,
        max_clock_skew_seconds: Option<String>,
    ) -> Result<Option<Self>, String> {
        let Some(signing_secret) = signing_secret else {
            return Ok(None);
        };
        Self::from_parts(signing_secret, max_clock_skew_seconds).map(Some)
    }

    pub fn from_signing_secret(signing_secret: impl Into<String>) -> Result<Self, String> {
        Self::from_parts(signing_secret, None)
    }

    pub fn from_parts(
        signing_secret: impl Into<String>,
        max_clock_skew_seconds: Option<String>,
    ) -> Result<Self, String> {
        let signing_secret = signing_secret.into();
        let signing_secret = signing_secret.trim();
        if signing_secret.is_empty() {
            return Err(format!(
                "{} must not be blank",
                Self::ENV_TRUSTED_SUBJECT_SECRET
            ));
        }
        if signing_secret.len() < Self::MIN_SIGNING_SECRET_LEN {
            return Err(format!(
                "{} must be at least {} characters",
                Self::ENV_TRUSTED_SUBJECT_SECRET,
                Self::MIN_SIGNING_SECRET_LEN
            ));
        }
        let max_clock_skew_seconds = match max_clock_skew_seconds {
            Some(value) => parse_max_clock_skew_seconds(value)?,
            None => Self::DEFAULT_MAX_CLOCK_SKEW_SECONDS,
        };
        Ok(Self {
            signing_secret: signing_secret.to_owned(),
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
            Self::ENV_TRUSTED_SUBJECT_SECRET,
            "SDKWORK_CLAW_TRUSTED_SUBJECT_SECRET_FILE",
            runtime_toml.and_then(|config| config.security.trusted_subject_secret.as_deref()),
            runtime_toml.and_then(|config| config.security.trusted_subject_secret_file.as_deref()),
        )?;
        let max_clock_skew_seconds = crate::runtime::config_u64(
            Self::ENV_TRUSTED_SUBJECT_MAX_CLOCK_SKEW_SECONDS,
            runtime_toml.and_then(|config| config.security.trusted_subject_max_clock_skew_seconds),
        )?;
        Self::from_optional_parts(
            signing_secret,
            max_clock_skew_seconds.map(|value| value.to_string()),
        )
    }

    pub fn signing_secret(&self) -> &str {
        &self.signing_secret
    }

    pub fn max_clock_skew_seconds(&self) -> u64 {
        self.max_clock_skew_seconds
    }
}

impl fmt::Debug for TrustedSubjectConfig {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("TrustedSubjectConfig")
            .field("signing_secret", &"[REDACTED]")
            .field("max_clock_skew_seconds", &self.max_clock_skew_seconds)
            .finish()
    }
}

fn parse_max_clock_skew_seconds(value: String) -> Result<u64, String> {
    let value = value.trim();
    if value.is_empty() {
        return Err(format!(
            "{} must not be blank",
            TrustedSubjectConfig::ENV_TRUSTED_SUBJECT_MAX_CLOCK_SKEW_SECONDS
        ));
    }
    let parsed = value.parse::<u64>().map_err(|_| {
        format!(
            "{} must be a positive integer",
            TrustedSubjectConfig::ENV_TRUSTED_SUBJECT_MAX_CLOCK_SKEW_SECONDS
        )
    })?;
    if parsed == 0 {
        return Err(format!(
            "{} must be a positive integer",
            TrustedSubjectConfig::ENV_TRUSTED_SUBJECT_MAX_CLOCK_SKEW_SECONDS
        ));
    }
    if parsed > TrustedSubjectConfig::MAX_CLOCK_SKEW_SECONDS {
        return Err(format!(
            "{} must be at most {}",
            TrustedSubjectConfig::ENV_TRUSTED_SUBJECT_MAX_CLOCK_SKEW_SECONDS,
            TrustedSubjectConfig::MAX_CLOCK_SKEW_SECONDS
        ));
    }
    Ok(parsed)
}
