use std::fmt;

#[derive(Clone, PartialEq, Eq)]
pub struct ApiKeySecurityConfig {
    pepper_secret: String,
    secret_storage_mode: ApiKeySecretStorageMode,
}

/// How raw API key secrets are persisted.
///
/// `Plaintext` (the default) stores the raw key directly so management
/// surfaces can re-display it; `Ciphertext` stores an AEAD-encrypted copy
/// derived from the api key pepper and decrypts on read.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum ApiKeySecretStorageMode {
    #[default]
    Plaintext,
    Ciphertext,
}

impl ApiKeySecretStorageMode {
    pub const ENV_SECRET_STORAGE: &'static str = "SDKWORK_CLAW_API_KEY_SECRET_STORAGE";

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
}

impl ApiKeySecurityConfig {
    pub const ENV_API_KEY_PEPPER: &'static str = "SDKWORK_CLAW_API_KEY_PEPPER";
    pub const MIN_PEPPER_LEN: usize = 32;

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
        Ok(Self {
            pepper_secret: trimmed.to_owned(),
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
            "SDKWORK_CLAW_API_KEY_PEPPER_FILE",
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
                    runtime_toml
                        .and_then(|config| config.security.api_key_secret_storage.clone())
                }),
        )?;
        Self::from_parts(pepper_secret, secret_storage_mode).map(Some)
    }

    pub fn pepper_secret(&self) -> &str {
        &self.pepper_secret
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
            .field("secret_storage_mode", &self.secret_storage_mode)
            .finish()
    }
}
