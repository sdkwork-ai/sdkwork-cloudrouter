use std::collections::BTreeMap;
use std::fmt;
use std::sync::{Arc, RwLock};

use sdkwork_claw_config::ProviderSecretMapConfig;

use crate::domain::{DomainError, DomainResult};
use crate::ports::ProviderSecretResolver;

#[derive(Clone)]
pub struct ProviderSecretMapResolver {
    secrets: BTreeMap<String, String>,
}

impl ProviderSecretMapResolver {
    pub fn from_config(config: ProviderSecretMapConfig) -> Self {
        Self {
            secrets: config.into_secret_map(),
        }
    }

    pub fn from_config_and_managed_secrets(
        config: ProviderSecretMapConfig,
        managed_secrets: BTreeMap<String, String>,
    ) -> Self {
        Self::from_maps(config.into_secret_map(), managed_secrets)
    }

    pub fn from_managed_secrets(managed_secrets: BTreeMap<String, String>) -> Self {
        Self::from_maps(BTreeMap::new(), managed_secrets)
    }

    fn from_maps(
        mut external_secrets: BTreeMap<String, String>,
        managed_secrets: BTreeMap<String, String>,
    ) -> Self {
        for (secret_ref, secret_value) in managed_secrets {
            external_secrets.insert(secret_ref, secret_value);
        }
        Self {
            secrets: external_secrets,
        }
    }
}

impl ProviderSecretResolver for ProviderSecretMapResolver {
    fn resolve_secret_value(&self, secret_ref: &str) -> DomainResult<String> {
        let secret_ref = secret_ref.trim();
        if secret_ref.is_empty() {
            return Err(DomainError::new("provider secret_ref is required"));
        }
        self.secrets
            .get(secret_ref)
            .cloned()
            .ok_or_else(|| DomainError::new("provider secret_ref is not configured"))
    }
}

impl fmt::Debug for ProviderSecretMapResolver {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("ProviderSecretMapResolver")
            .field("secret_count", &self.secrets.len())
            .field("secret_values", &"[REDACTED]")
            .finish()
    }
}

#[derive(Clone)]
pub struct RefreshableProviderSecretMapResolver {
    external_secrets: BTreeMap<String, String>,
    managed_secrets: Arc<RwLock<BTreeMap<String, String>>>,
}

impl RefreshableProviderSecretMapResolver {
    pub fn from_maps(
        external_secrets: BTreeMap<String, String>,
        managed_secrets: BTreeMap<String, String>,
    ) -> Self {
        Self {
            external_secrets,
            managed_secrets: Arc::new(RwLock::new(managed_secrets)),
        }
    }

    pub fn replace_managed_secrets(&self, managed_secrets: BTreeMap<String, String>) {
        match self.managed_secrets.write() {
            Ok(mut current) => {
                *current = managed_secrets;
            }
            Err(poisoned) => {
                *poisoned.into_inner() = managed_secrets;
            }
        }
    }

    fn managed_secret(&self, secret_ref: &str) -> Option<String> {
        match self.managed_secrets.read() {
            Ok(secrets) => secrets.get(secret_ref).cloned(),
            Err(poisoned) => poisoned.into_inner().get(secret_ref).cloned(),
        }
    }

    fn managed_secret_count(&self) -> usize {
        match self.managed_secrets.read() {
            Ok(secrets) => secrets.len(),
            Err(poisoned) => poisoned.into_inner().len(),
        }
    }
}

impl ProviderSecretResolver for RefreshableProviderSecretMapResolver {
    fn resolve_secret_value(&self, secret_ref: &str) -> DomainResult<String> {
        let secret_ref = secret_ref.trim();
        if secret_ref.is_empty() {
            return Err(DomainError::new("provider secret_ref is required"));
        }
        self.managed_secret(secret_ref)
            .or_else(|| self.external_secrets.get(secret_ref).cloned())
            .ok_or_else(|| DomainError::new("provider secret_ref is not configured"))
    }
}

impl fmt::Debug for RefreshableProviderSecretMapResolver {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("RefreshableProviderSecretMapResolver")
            .field("external_secret_count", &self.external_secrets.len())
            .field("managed_secret_count", &self.managed_secret_count())
            .field("secret_values", &"[REDACTED]")
            .finish()
    }
}
