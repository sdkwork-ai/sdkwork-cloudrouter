use std::collections::BTreeMap;
use std::fmt;

use hmac::{Hmac, Mac};
use ring::aead::{Aad, LessSafeKey, Nonce, UnboundKey, AES_256_GCM};
use sha2::Sha256;

use crate::application::{
    ApiKeySecretHasher, EncodedUpstreamCredentialSecret, UpstreamCredentialSecretCodec,
    UpstreamCredentialSecretContext,
};
use crate::domain::{DomainError, DomainResult};

type HmacSha256 = Hmac<Sha256>;
const CREDENTIAL_SECRET_CIPHERTEXT_VERSION: &str = "v2";
const CREDENTIAL_SECRET_NONCE_LEN: usize = 12;
const CREDENTIAL_SECRET_MIN_KEY_BYTES: usize = 32;
const CREDENTIAL_SECRET_MAX_KEY_BYTES: usize = 4 * 1024;
const CREDENTIAL_SECRET_MAX_KEY_ID_BYTES: usize = 64;
const CREDENTIAL_KDF_SALT: &[u8] = b"sdkwork-clawrouter:upstream-credential:v2";
const CREDENTIAL_AEAD_KEY_DOMAIN: &[u8] = b"sdkwork-clawrouter:upstream-credential:aead:v2\0";
const CREDENTIAL_FINGERPRINT_KEY_DOMAIN: &[u8] =
    b"sdkwork-clawrouter:upstream-credential:fingerprint:v2\0";

#[derive(Clone)]
pub struct HmacSha256ApiKeySecretHasher {
    pepper_secret: String,
}

impl HmacSha256ApiKeySecretHasher {
    pub fn new(pepper_secret: impl Into<String>) -> DomainResult<Self> {
        let pepper_secret = pepper_secret.into();
        let trimmed = pepper_secret.trim();
        if trimmed.is_empty() {
            return Err(DomainError::new("api key pepper must not be blank"));
        }
        Ok(Self {
            pepper_secret: trimmed.to_owned(),
        })
    }
}

impl ApiKeySecretHasher for HmacSha256ApiKeySecretHasher {
    fn hash_secret(&self, secret: &str) -> DomainResult<String> {
        let mut mac = HmacSha256::new_from_slice(self.pepper_secret.as_bytes())
            .map_err(|_| DomainError::new("api key pepper is invalid"))?;
        mac.update(secret.as_bytes());
        Ok(hex::encode(mac.finalize().into_bytes()))
    }
}

impl fmt::Debug for HmacSha256ApiKeySecretHasher {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("HmacSha256ApiKeySecretHasher")
            .field("pepper_secret", &"[REDACTED]")
            .finish()
    }
}

pub struct RingAeadCredentialSecretCodec {
    active_key_id: String,
    keys: BTreeMap<String, LessSafeKey>,
    fingerprint_key: [u8; 32],
}

impl RingAeadCredentialSecretCodec {
    pub fn new(active_secret: impl AsRef<str>) -> DomainResult<Self> {
        let active_secret = validated_key_secret(active_secret.as_ref())?;
        let active_key_id = derived_key_id(active_secret);
        Self::with_key_ring(active_key_id, active_secret, active_secret, Vec::new())
    }

    pub fn with_key_ring(
        active_key_id: impl Into<String>,
        active_secret: impl AsRef<str>,
        fingerprint_secret: impl AsRef<str>,
        decryption_keys: Vec<(String, String)>,
    ) -> DomainResult<Self> {
        let active_key_id = validate_key_id(&active_key_id.into())?;
        let active_secret = validated_key_secret(active_secret.as_ref())?;
        let fingerprint_secret = validated_key_secret(fingerprint_secret.as_ref())?;
        let mut keys = BTreeMap::new();
        keys.insert(active_key_id.clone(), aead_key(active_secret)?);
        for (key_id, secret) in decryption_keys {
            let key_id = validate_key_id(&key_id)?;
            let secret = validated_key_secret(&secret)?;
            if keys.insert(key_id, aead_key(secret)?).is_some() {
                return Err(DomainError::new(
                    "credential secret codec key ids must be unique",
                ));
            }
        }
        Ok(Self {
            active_key_id,
            keys,
            fingerprint_key: derived_key(CREDENTIAL_FINGERPRINT_KEY_DOMAIN, fingerprint_secret),
        })
    }
}

impl UpstreamCredentialSecretCodec for RingAeadCredentialSecretCodec {
    fn encode_secret(
        &self,
        context: UpstreamCredentialSecretContext,
        secret: &str,
    ) -> DomainResult<EncodedUpstreamCredentialSecret> {
        let mut nonce_bytes = [0_u8; CREDENTIAL_SECRET_NONCE_LEN];
        getrandom::fill(&mut nonce_bytes).map_err(|error| {
            DomainError::new(format!("failed to generate credential nonce: {error}"))
        })?;
        let nonce = Nonce::assume_unique_for_key(nonce_bytes);
        let mut in_out = secret.as_bytes().to_vec();
        let key = self
            .keys
            .get(&self.active_key_id)
            .ok_or_else(|| DomainError::new("credential secret codec active key is unavailable"))?;
        let aad = context.aad();
        key.seal_in_place_append_tag(nonce, Aad::from(aad.as_bytes()), &mut in_out)
            .map_err(|_| DomainError::new("failed to encrypt credential secret"))?;
        Ok(EncodedUpstreamCredentialSecret {
            ciphertext: format!(
                "{}:{}:{}",
                CREDENTIAL_SECRET_CIPHERTEXT_VERSION,
                hex::encode(nonce_bytes),
                hex::encode(in_out)
            ),
            key_id: self.active_key_id.clone(),
            fingerprint: secret_fingerprint(&self.fingerprint_key, context, secret)?,
        })
    }

    fn decode_secret(
        &self,
        context: UpstreamCredentialSecretContext,
        key_id: &str,
        ciphertext: &str,
    ) -> DomainResult<String> {
        let key = self
            .keys
            .get(key_id)
            .ok_or_else(|| DomainError::new("credential secret key id is unavailable"))?;
        let mut parts = ciphertext.split(':');
        let version = parts.next();
        let nonce_hex = parts.next();
        let ciphertext_hex = parts.next();
        if version != Some(CREDENTIAL_SECRET_CIPHERTEXT_VERSION)
            || nonce_hex.is_none()
            || ciphertext_hex.is_none()
            || parts.next().is_some()
        {
            return Err(DomainError::new(
                "credential secret ciphertext format is invalid",
            ));
        }

        let nonce_vec = hex::decode(nonce_hex.unwrap())
            .map_err(|_| DomainError::new("credential secret nonce is invalid"))?;
        let nonce_bytes: [u8; CREDENTIAL_SECRET_NONCE_LEN] = nonce_vec
            .try_into()
            .map_err(|_| DomainError::new("credential secret nonce length is invalid"))?;
        let nonce = Nonce::assume_unique_for_key(nonce_bytes);
        let mut in_out = hex::decode(ciphertext_hex.unwrap())
            .map_err(|_| DomainError::new("credential secret ciphertext is invalid"))?;
        let aad = context.aad();
        let plaintext = key
            .open_in_place(nonce, Aad::from(aad.as_bytes()), &mut in_out)
            .map_err(|_| DomainError::new("failed to decrypt credential secret"))?;
        String::from_utf8(plaintext.to_vec())
            .map_err(|_| DomainError::new("credential secret plaintext is not valid utf-8"))
    }
}

impl fmt::Debug for RingAeadCredentialSecretCodec {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("RingAeadCredentialSecretCodec")
            .field("active_key_id", &self.active_key_id)
            .field("key_count", &self.keys.len())
            .field("keys", &"[REDACTED]")
            .finish()
    }
}

fn validated_key_secret(secret: &str) -> DomainResult<&str> {
    let secret = secret.trim();
    if secret.len() < CREDENTIAL_SECRET_MIN_KEY_BYTES {
        return Err(DomainError::new(format!(
            "credential secret codec key must contain at least {CREDENTIAL_SECRET_MIN_KEY_BYTES} bytes"
        )));
    }
    if secret.len() > CREDENTIAL_SECRET_MAX_KEY_BYTES {
        return Err(DomainError::new(format!(
            "credential secret codec key must not exceed {CREDENTIAL_SECRET_MAX_KEY_BYTES} bytes"
        )));
    }
    Ok(secret)
}

fn validate_key_id(key_id: &str) -> DomainResult<String> {
    let key_id = key_id.trim();
    if key_id.is_empty()
        || key_id.len() > CREDENTIAL_SECRET_MAX_KEY_ID_BYTES
        || !key_id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.'))
    {
        return Err(DomainError::new(
            "credential secret codec key id must be 1-64 URL-safe characters",
        ));
    }
    Ok(key_id.to_owned())
}

fn derived_key_id(secret: &str) -> String {
    let digest = derived_key(CREDENTIAL_AEAD_KEY_DOMAIN, secret);
    format!("key-{}", hex::encode(&digest[..8]))
}

fn aead_key(secret: &str) -> DomainResult<LessSafeKey> {
    let digest = derived_key(CREDENTIAL_AEAD_KEY_DOMAIN, secret);
    let unbound_key = UnboundKey::new(&AES_256_GCM, &digest)
        .map_err(|_| DomainError::new("credential secret codec key is invalid"))?;
    Ok(LessSafeKey::new(unbound_key))
}

fn derived_key(domain: &[u8], secret: &str) -> [u8; 32] {
    sdkwork_utils_rust::derive_aes_256_key(secret.as_bytes(), CREDENTIAL_KDF_SALT, domain)
}

fn secret_fingerprint(
    key: &[u8; 32],
    context: UpstreamCredentialSecretContext,
    secret: &str,
) -> DomainResult<String> {
    let mut mac = HmacSha256::new_from_slice(key)
        .map_err(|_| DomainError::new("credential fingerprint key is invalid"))?;
    mac.update(
        format!(
            "{}:{}:{}\0",
            context.tenant_id, context.organization_id, context.account_id
        )
        .as_bytes(),
    );
    mac.update(secret.as_bytes());
    Ok(hex::encode(mac.finalize().into_bytes()))
}

#[cfg(test)]
mod tests {
    use super::*;

    const ACTIVE_SECRET: &str = "0123456789abcdef0123456789abcdef";
    const PREVIOUS_SECRET: &str = "abcdef0123456789abcdef0123456789";
    const FINGERPRINT_SECRET: &str = "fingerprint-0123456789abcdef0123456789";

    fn context(credential_id: i64) -> UpstreamCredentialSecretContext {
        UpstreamCredentialSecretContext::new(100001, 200001, 300001, credential_id)
    }

    #[test]
    fn credential_ciphertext_is_bound_to_its_database_scope() {
        let codec = RingAeadCredentialSecretCodec::new(ACTIVE_SECRET).unwrap();
        let encoded = codec
            .encode_secret(context(400001), "sk-sensitive")
            .unwrap();

        assert_eq!(
            "sk-sensitive",
            codec
                .decode_secret(context(400001), &encoded.key_id, &encoded.ciphertext)
                .unwrap()
        );
        assert!(codec
            .decode_secret(context(400002), &encoded.key_id, &encoded.ciphertext)
            .is_err());
    }

    #[test]
    fn key_ring_decrypts_previous_keys_but_encrypts_with_active_key() {
        let previous = RingAeadCredentialSecretCodec::with_key_ring(
            "previous",
            PREVIOUS_SECRET,
            FINGERPRINT_SECRET,
            Vec::new(),
        )
        .unwrap();
        let encoded = previous
            .encode_secret(context(400001), "sk-previous")
            .unwrap();
        let codec = RingAeadCredentialSecretCodec::with_key_ring(
            "active",
            ACTIVE_SECRET,
            FINGERPRINT_SECRET,
            vec![("previous".to_owned(), PREVIOUS_SECRET.to_owned())],
        )
        .unwrap();

        assert_eq!(
            "sk-previous",
            codec
                .decode_secret(context(400001), &encoded.key_id, &encoded.ciphertext)
                .unwrap()
        );
        assert_eq!(
            "active",
            codec
                .encode_secret(context(400002), "sk-active")
                .unwrap()
                .key_id
        );
        assert_eq!(
            encoded.fingerprint,
            codec
                .encode_secret(context(400001), "sk-previous")
                .unwrap()
                .fingerprint
        );
    }
}
