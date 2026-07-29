use std::collections::BTreeSet;
use std::fmt;

use serde::Deserialize;

#[derive(Clone, PartialEq, Eq)]
pub struct UpstreamCredentialSecurityConfig {
    active_key_id: String,
    active_key: String,
    fingerprint_key: String,
    decryption_keys: Vec<(String, String)>,
}

impl UpstreamCredentialSecurityConfig {
    pub const ENV_KEY_RING: &'static str = "SDKWORK_CLAW_UPSTREAM_CREDENTIAL_KEY_RING";
    pub const ENV_KEY_RING_FILE: &'static str = "SDKWORK_CLAW_UPSTREAM_CREDENTIAL_KEY_RING_FILE";
    pub const MIN_KEY_BYTES: usize = 32;
    pub const MAX_KEY_BYTES: usize = 4 * 1024;
    pub const MAX_KEY_RING_BYTES: usize = 128 * 1024;
    pub const MAX_KEY_ID_BYTES: usize = 64;
    pub const MAX_DECRYPTION_KEYS: usize = 16;

    pub fn from_optional_key_ring_payload(payload: Option<String>) -> Result<Option<Self>, String> {
        let Some(payload) = payload else {
            return Ok(None);
        };
        if payload.len() > Self::MAX_KEY_RING_BYTES {
            return Err(format!(
                "upstream credential key ring must not exceed {} bytes",
                Self::MAX_KEY_RING_BYTES
            ));
        }
        let document: UpstreamCredentialKeyRingDocument = serde_json::from_str(payload.trim())
            .map_err(|error| format!("invalid upstream credential key ring JSON: {error}"))?;
        Self::from_document(document).map(Some)
    }

    pub fn from_env() -> Result<Option<Self>, String> {
        Self::from_env_or_runtime_toml(None)
    }

    pub fn from_env_or_runtime_toml(
        runtime_toml: Option<&crate::RuntimeTomlConfig>,
    ) -> Result<Option<Self>, String> {
        let payload = crate::runtime::config_secret_value_with_max_bytes(
            Self::ENV_KEY_RING,
            Self::ENV_KEY_RING_FILE,
            runtime_toml.and_then(|config| config.security.upstream_credential_key_ring.as_deref()),
            runtime_toml
                .and_then(|config| config.security.upstream_credential_key_ring_file.as_deref()),
            Self::MAX_KEY_RING_BYTES,
        )?;
        Self::from_optional_key_ring_payload(payload)
    }

    pub fn active_key_id(&self) -> &str {
        &self.active_key_id
    }

    pub fn active_key(&self) -> &str {
        &self.active_key
    }

    pub fn fingerprint_key(&self) -> &str {
        &self.fingerprint_key
    }

    pub fn decryption_keys(&self) -> &[(String, String)] {
        &self.decryption_keys
    }

    fn from_document(document: UpstreamCredentialKeyRingDocument) -> Result<Self, String> {
        if document.decryption_keys.len() > Self::MAX_DECRYPTION_KEYS {
            return Err(format!(
                "upstream credential key ring must not contain more than {} decryption keys",
                Self::MAX_DECRYPTION_KEYS
            ));
        }
        let active_key_id = validate_key_id("activeKeyId", document.active_key_id)?;
        let active_key = validate_key("activeKey", document.active_key)?;
        let fingerprint_key = validate_key("fingerprintKey", document.fingerprint_key)?;
        let mut key_ids = BTreeSet::from([active_key_id.clone()]);
        let mut decryption_keys = Vec::with_capacity(document.decryption_keys.len());
        for entry in document.decryption_keys {
            let key_id = validate_key_id("decryptionKeys[].keyId", entry.key_id)?;
            if !key_ids.insert(key_id.clone()) {
                return Err(format!(
                    "upstream credential key ring contains duplicate key id {key_id}"
                ));
            }
            decryption_keys.push((key_id, validate_key("decryptionKeys[].key", entry.key)?));
        }
        Ok(Self {
            active_key_id,
            active_key,
            fingerprint_key,
            decryption_keys,
        })
    }
}

impl fmt::Debug for UpstreamCredentialSecurityConfig {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("UpstreamCredentialSecurityConfig")
            .field("active_key_id", &self.active_key_id)
            .field(
                "decryption_key_ids",
                &self
                    .decryption_keys
                    .iter()
                    .map(|(key_id, _)| key_id)
                    .collect::<Vec<_>>(),
            )
            .field("key_material", &"[REDACTED]")
            .finish()
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct UpstreamCredentialKeyRingDocument {
    active_key_id: String,
    active_key: String,
    fingerprint_key: String,
    #[serde(default)]
    decryption_keys: Vec<UpstreamCredentialDecryptionKeyDocument>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct UpstreamCredentialDecryptionKeyDocument {
    key_id: String,
    key: String,
}

fn validate_key_id(field: &str, value: String) -> Result<String, String> {
    let value = value.trim();
    if value.is_empty() {
        return Err(format!("upstream credential key ring {field} is required"));
    }
    if value.len() > UpstreamCredentialSecurityConfig::MAX_KEY_ID_BYTES
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.'))
    {
        return Err(format!(
            "upstream credential key ring {field} must contain at most {} ASCII letters, digits, '.', '_' or '-'",
            UpstreamCredentialSecurityConfig::MAX_KEY_ID_BYTES
        ));
    }
    Ok(value.to_owned())
}

fn validate_key(field: &str, value: String) -> Result<String, String> {
    let value = value.trim();
    if value.as_bytes().len() < UpstreamCredentialSecurityConfig::MIN_KEY_BYTES {
        return Err(format!(
            "upstream credential key ring {field} must contain at least {} bytes",
            UpstreamCredentialSecurityConfig::MIN_KEY_BYTES
        ));
    }
    if value.len() > UpstreamCredentialSecurityConfig::MAX_KEY_BYTES {
        return Err(format!(
            "upstream credential key ring {field} must not exceed {} bytes",
            UpstreamCredentialSecurityConfig::MAX_KEY_BYTES
        ));
    }
    Ok(value.to_owned())
}
