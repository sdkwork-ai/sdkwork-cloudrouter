use std::fmt;

#[derive(Clone, PartialEq, Eq)]
pub struct ApiKeySecurityConfig {
    pepper_secret: String,
    /// Retired peppers kept only for verification.
    ///
    /// Authentication looks an API key up by hash, so a pepper rotation without
    /// the retired generation would invalidate every key issued before it. New
    /// keys are always hashed with `pepper_secret`; these are probed afterwards.
    previous_peppers: Vec<String>,
    secret_storage_mode: ApiKeySecretStorageMode,
}

/// How raw API key secrets are persisted.
///
/// `Ciphertext` (the default) stores an AEAD-encrypted copy derived from the
/// api key pepper and decrypts on read; `Plaintext` stores the raw key
/// directly and is only for explicit operator opt-in on disposable
/// environments. API keys are gateway credentials: a database dump must never
/// disclose them, so encryption is the safe default.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum ApiKeySecretStorageMode {
    Plaintext,
    #[default]
    Ciphertext,
}

impl ApiKeySecretStorageMode {
    pub const ENV_SECRET_STORAGE: &'static str = "SDKWORK_CLOUDROUTER_API_KEY_SECRET_STORAGE";

    pub fn from_optional_parts(value: Option<String>) -> Result<Self, String> {
        let Some(value) = value else {
            return Ok(Self::default());
        };
        match value.trim().to_ascii_lowercase().as_str() {
            "" => Ok(Self::default()),
            "plaintext" => Ok(Self::Plaintext),
            "ciphertext" => Ok(Self::Ciphertext),
            _ => Err(format!(
                "{} must be one of 'plaintext' or 'ciphertext'",
                Self::ENV_SECRET_STORAGE
            )),
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Plaintext => "plaintext",
            Self::Ciphertext => "ciphertext",
        }
    }

    pub fn is_ciphertext(self) -> bool {
        matches!(self, Self::Ciphertext)
    }

    /// Fail fast when a production-like deployment opts into plaintext key
    /// persistence (`Err` describes the violation). API keys are gateway
    /// credentials: a database dump must never disclose them, so plaintext
    /// storage stays a disposable-environment opt-in only — mirroring the
    /// web-framework legacy-mode panic guard for production posture.
    pub fn ensure_safe_for_environment(
        runtime_toml: Option<&crate::RuntimeTomlConfig>,
    ) -> Result<(), String> {
        if !crate::is_production_like_runtime_environment(runtime_toml) {
            return Ok(());
        }
        let configured = std::env::var(Self::ENV_SECRET_STORAGE).ok().or_else(|| {
            runtime_toml.and_then(|config| config.security.api_key_secret_storage.clone())
        });
        let mode = Self::from_optional_parts(configured)?;
        if mode == Self::Plaintext {
            return Err(format!(
                "{} must not be 'plaintext' in production-like environments; \
                 a database dump would disclose every gateway API key",
                Self::ENV_SECRET_STORAGE
            ));
        }
        Ok(())
    }
}

impl ApiKeySecurityConfig {
    pub const ENV_API_KEY_PEPPER: &'static str = "SDKWORK_CLOUDROUTER_API_KEY_PEPPER";
    /// Comma-separated retired peppers, kept so a pepper rotation does not
    /// invalidate existing API keys.
    pub const ENV_API_KEY_PREVIOUS_PEPPERS: &'static str =
        "SDKWORK_CLOUDROUTER_API_KEY_HASH_PREVIOUS_PEPPERS";
    pub const MIN_PEPPER_LEN: usize = 32;
    /// Bounds verification work per authentication (each generation is one HMAC
    /// plus one hash lookup).
    pub const MAX_PREVIOUS_PEPPERS: usize = 8;

    pub fn from_optional_parts(pepper_secret: Option<String>) -> Result<Option<Self>, String> {
        let Some(pepper_secret) = pepper_secret else {
            return Ok(None);
        };
        Self::from_pepper_secret(pepper_secret).map(Some)
    }

    pub fn from_pepper_secret(pepper_secret: impl Into<String>) -> Result<Self, String> {
        Self::from_parts(pepper_secret, ApiKeySecretStorageMode::default())
    }

    pub fn from_parts(
        pepper_secret: impl Into<String>,
        secret_storage_mode: ApiKeySecretStorageMode,
    ) -> Result<Self, String> {
        Self::from_parts_with_previous(pepper_secret, secret_storage_mode, Vec::new())
    }

    pub fn from_parts_with_previous(
        pepper_secret: impl Into<String>,
        secret_storage_mode: ApiKeySecretStorageMode,
        previous_peppers: Vec<String>,
    ) -> Result<Self, String> {
        let pepper_secret = pepper_secret.into();
        let trimmed = pepper_secret.trim();
        if trimmed.is_empty() {
            return Err(format!("{} must not be blank", Self::ENV_API_KEY_PEPPER));
        }
        if trimmed.len() < Self::MIN_PEPPER_LEN {
            return Err(format!(
                "{} must be at least {} characters",
                Self::ENV_API_KEY_PEPPER,
                Self::MIN_PEPPER_LEN
            ));
        }
        let active = trimmed.to_owned();
        let mut ring: Vec<String> = Vec::new();
        for pepper in previous_peppers {
            let pepper = pepper.trim();
            if pepper.is_empty() {
                continue;
            }
            if pepper == active {
                return Err(format!(
                    "{} must not repeat the active {}",
                    Self::ENV_API_KEY_PREVIOUS_PEPPERS,
                    Self::ENV_API_KEY_PEPPER
                ));
            }
            if pepper.len() < Self::MIN_PEPPER_LEN {
                return Err(format!(
                    "{} entries must be at least {} characters",
                    Self::ENV_API_KEY_PREVIOUS_PEPPERS,
                    Self::MIN_PEPPER_LEN
                ));
            }
            if ring.iter().any(|existing| existing == pepper) {
                continue;
            }
            ring.push(pepper.to_owned());
        }
        if ring.len() > Self::MAX_PREVIOUS_PEPPERS {
            return Err(format!(
                "{} accepts at most {} retired peppers",
                Self::ENV_API_KEY_PREVIOUS_PEPPERS,
                Self::MAX_PREVIOUS_PEPPERS
            ));
        }
        Ok(Self {
            pepper_secret: active,
            previous_peppers: ring,
            secret_storage_mode,
        })
    }

    pub fn from_env() -> Result<Option<Self>, String> {
        Self::from_env_or_runtime_toml(None)
    }

    pub fn from_env_or_runtime_toml(
        runtime_toml: Option<&crate::RuntimeTomlConfig>,
    ) -> Result<Option<Self>, String> {
        let pepper_secret = crate::runtime::config_secret_value(
            Self::ENV_API_KEY_PEPPER,
            "SDKWORK_CLOUDROUTER_API_KEY_PEPPER_FILE",
            runtime_toml.and_then(|config| config.security.api_key_pepper.as_deref()),
            runtime_toml.and_then(|config| config.security.api_key_pepper_file.as_deref()),
        )?;
        let Some(pepper_secret) = pepper_secret else {
            return Ok(None);
        };
        let secret_storage_mode = ApiKeySecretStorageMode::from_optional_parts(
            std::env::var(ApiKeySecretStorageMode::ENV_SECRET_STORAGE)
                .ok()
                .or_else(|| {
                    runtime_toml.and_then(|config| config.security.api_key_secret_storage.clone())
                }),
        )?;
        let previous_peppers = std::env::var(Self::ENV_API_KEY_PREVIOUS_PEPPERS)
            .ok()
            .map(|value| {
                value
                    .split(',')
                    .map(str::trim)
                    .filter(|pepper| !pepper.is_empty())
                    .map(str::to_owned)
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        Self::from_parts_with_previous(pepper_secret, secret_storage_mode, previous_peppers)
            .map(Some)
    }

    pub fn pepper_secret(&self) -> &str {
        &self.pepper_secret
    }

    pub fn previous_peppers(&self) -> &[String] {
        &self.previous_peppers
    }

    pub fn secret_storage_mode(&self) -> ApiKeySecretStorageMode {
        self.secret_storage_mode
    }
}

impl fmt::Debug for ApiKeySecurityConfig {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("ApiKeySecurityConfig")
            .field("pepper_secret", &"[REDACTED]")
            .field("previous_peppers", &self.previous_peppers.len())
            .field("secret_storage_mode", &self.secret_storage_mode)
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::{ApiKeySecretStorageMode, ApiKeySecurityConfig};

    const ACTIVE: &str = "11111111111111111111111111111111";
    const RETIRED: &str = "22222222222222222222222222222222";
    const RETIRED_TWO: &str = "33333333333333333333333333333333";

    #[test]
    fn retired_peppers_are_normalized_and_deduplicated() {
        let config = ApiKeySecurityConfig::from_parts_with_previous(
            ACTIVE,
            ApiKeySecretStorageMode::Ciphertext,
            vec![
                String::new(),
                format!("  {RETIRED}  "),
                RETIRED.to_owned(),
                RETIRED_TWO.to_owned(),
                "   ".to_owned(),
            ],
        )
        .expect("ring");

        assert_eq!(ACTIVE, config.pepper_secret());
        assert_eq!(
            vec![RETIRED.to_owned(), RETIRED_TWO.to_owned()],
            config.previous_peppers(),
            "blanks and duplicates are dropped; order is kept"
        );
    }

    #[test]
    fn a_retired_pepper_must_not_repeat_the_active_one() {
        let error = ApiKeySecurityConfig::from_parts_with_previous(
            format!("  {ACTIVE}  "),
            ApiKeySecretStorageMode::Ciphertext,
            vec![ACTIVE.to_owned()],
        )
        .expect_err("repeating the active pepper is ambiguous");
        assert!(error.contains("must not repeat the active"), "{error}");
    }

    #[test]
    fn a_retired_pepper_must_meet_the_minimum_length() {
        let error = ApiKeySecurityConfig::from_parts_with_previous(
            ACTIVE,
            ApiKeySecretStorageMode::Ciphertext,
            vec!["short".to_owned()],
        )
        .expect_err("short retired pepper must be rejected");
        assert!(error.contains("at least"), "{error}");
    }

    #[test]
    fn the_ring_is_bounded() {
        let previous = (0..=ApiKeySecurityConfig::MAX_PREVIOUS_PEPPERS)
            .map(|index| format!("{index:032}"))
            .collect::<Vec<_>>();
        let error = ApiKeySecurityConfig::from_parts_with_previous(
            ACTIVE,
            ApiKeySecretStorageMode::Ciphertext,
            previous,
        )
        .expect_err("a ring larger than the bound must be rejected");
        assert!(error.contains("at most"), "{error}");
    }
}
