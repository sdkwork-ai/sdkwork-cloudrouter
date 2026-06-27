use std::collections::BTreeMap;
use std::fmt;

#[derive(Clone, PartialEq, Eq)]
pub struct ProviderSecretMapConfig {
    secrets: BTreeMap<String, String>,
}

impl ProviderSecretMapConfig {
    pub const ENV_PROVIDER_SECRET_MAP_JSON: &'static str = "SDKWORK_CLAW_PROVIDER_SECRET_MAP_JSON";

    pub fn from_optional_json(secret_map_json: Option<String>) -> Result<Option<Self>, String> {
        match secret_map_json {
            Some(secret_map_json) => Self::from_json(secret_map_json).map(Some),
            None => Ok(None),
        }
    }

    pub fn from_json(secret_map_json: impl AsRef<str>) -> Result<Self, String> {
        let secret_map_json = secret_map_json.as_ref().trim();
        if secret_map_json.is_empty() {
            return Err(format!(
                "{} must not be blank",
                Self::ENV_PROVIDER_SECRET_MAP_JSON
            ));
        }

        let value: serde_json::Value = serde_json::from_str(secret_map_json).map_err(|error| {
            format!(
                "{} must be a JSON object mapping provider secret_ref to secret value: {error}",
                Self::ENV_PROVIDER_SECRET_MAP_JSON
            )
        })?;

        let object = value.as_object().ok_or_else(|| {
            format!(
                "{} must be a JSON object mapping provider secret_ref to secret value",
                Self::ENV_PROVIDER_SECRET_MAP_JSON
            )
        })?;

        let mut secrets = BTreeMap::new();
        for (secret_ref, secret_value) in object {
            let secret_value = secret_value.as_str().ok_or_else(|| {
                format!(
                    "{} values must be provider secret value strings",
                    Self::ENV_PROVIDER_SECRET_MAP_JSON
                )
            })?;
            let secret_ref = secret_ref.trim();
            if secret_ref.is_empty() {
                return Err("provider secret_ref must not be blank".to_owned());
            }
            let secret_value = secret_value.trim();
            if secret_value.is_empty() {
                return Err("provider secret value must not be blank".to_owned());
            }
            secrets.insert(secret_ref.to_owned(), secret_value.to_owned());
        }

        if secrets.is_empty() {
            return Err(format!(
                "{} must contain at least one provider secret_ref",
                Self::ENV_PROVIDER_SECRET_MAP_JSON
            ));
        }

        Ok(Self { secrets })
    }

    pub fn from_env() -> Result<Option<Self>, String> {
        Self::from_env_or_runtime_toml(None)
    }

    pub fn from_env_or_runtime_toml(
        runtime_toml: Option<&crate::RuntimeTomlConfig>,
    ) -> Result<Option<Self>, String> {
        let secret_map_json = crate::runtime::config_secret_value(
            Self::ENV_PROVIDER_SECRET_MAP_JSON,
            "SDKWORK_CLAW_PROVIDER_SECRET_MAP_JSON_FILE",
            runtime_toml.and_then(|config| config.provider_secret_map.json.as_deref()),
            runtime_toml.and_then(|config| config.provider_secret_map.json_file.as_deref()),
        )?;
        Self::from_optional_json(secret_map_json)
    }

    pub fn secret_count(&self) -> usize {
        self.secrets.len()
    }

    pub fn secret_value(&self, secret_ref: &str) -> Option<&str> {
        self.secrets.get(secret_ref).map(String::as_str)
    }

    pub fn into_secret_map(self) -> BTreeMap<String, String> {
        self.secrets
    }
}

impl fmt::Debug for ProviderSecretMapConfig {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("ProviderSecretMapConfig")
            .field("secret_count", &self.secrets.len())
            .field("secret_values", &"[REDACTED]")
            .finish()
    }
}
