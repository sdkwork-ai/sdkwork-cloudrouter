use std::fmt;

use hmac::{Hmac, Mac};
use ring::aead::{Aad, LessSafeKey, Nonce, UnboundKey, AES_256_GCM};
use sha2::{Digest, Sha256};

use crate::application::{ApiKeySecretCodec, ApiKeySecretHasher};
use crate::domain::{DomainError, DomainResult};

type HmacSha256 = Hmac<Sha256>;
const API_KEY_SECRET_CIPHERTEXT_VERSION: &str = "v1";
const API_KEY_SECRET_NONCE_LEN: usize = 12;

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

#[derive(Clone)]
pub struct RingAeadApiKeySecretCodec {
    key: LessSafeKey,
}

impl RingAeadApiKeySecretCodec {
    pub fn new(pepper_secret: impl AsRef<str>) -> DomainResult<Self> {
        let pepper_secret = pepper_secret.as_ref().trim();
        if pepper_secret.is_empty() {
            return Err(DomainError::new(
                "api key secret codec pepper must not be blank",
            ));
        }
        let digest = Sha256::digest(pepper_secret.as_bytes());
        let unbound_key = UnboundKey::new(&AES_256_GCM, digest.as_slice())
            .map_err(|_| DomainError::new("api key secret codec key is invalid"))?;
        Ok(Self {
            key: LessSafeKey::new(unbound_key),
        })
    }
}

impl ApiKeySecretCodec for RingAeadApiKeySecretCodec {
    fn encode_secret(&self, secret: &str) -> DomainResult<String> {
        let mut nonce_bytes = [0_u8; API_KEY_SECRET_NONCE_LEN];
        getrandom::fill(&mut nonce_bytes).map_err(|error| {
            DomainError::new(format!("failed to generate api key nonce: {error}"))
        })?;
        let nonce = Nonce::assume_unique_for_key(nonce_bytes);
        let mut in_out = secret.as_bytes().to_vec();
        self.key
            .seal_in_place_append_tag(nonce, Aad::empty(), &mut in_out)
            .map_err(|_| DomainError::new("failed to encrypt api key secret"))?;
        Ok(format!(
            "{}:{}:{}",
            API_KEY_SECRET_CIPHERTEXT_VERSION,
            hex::encode(nonce_bytes),
            hex::encode(in_out)
        ))
    }

    fn decode_secret(&self, encoded_secret: &str) -> DomainResult<String> {
        let mut parts = encoded_secret.split(':');
        let version = parts.next();
        let nonce_hex = parts.next();
        let ciphertext_hex = parts.next();
        if version != Some(API_KEY_SECRET_CIPHERTEXT_VERSION)
            || nonce_hex.is_none()
            || ciphertext_hex.is_none()
            || parts.next().is_some()
        {
            return Err(DomainError::new(
                "api key secret ciphertext format is invalid",
            ));
        }

        let nonce_vec = hex::decode(nonce_hex.unwrap())
            .map_err(|_| DomainError::new("api key secret nonce is invalid"))?;
        let nonce_bytes: [u8; API_KEY_SECRET_NONCE_LEN] = nonce_vec
            .try_into()
            .map_err(|_| DomainError::new("api key secret nonce length is invalid"))?;
        let nonce = Nonce::assume_unique_for_key(nonce_bytes);
        let mut in_out = hex::decode(ciphertext_hex.unwrap())
            .map_err(|_| DomainError::new("api key secret ciphertext is invalid"))?;
        let plaintext = self
            .key
            .open_in_place(nonce, Aad::empty(), &mut in_out)
            .map_err(|_| DomainError::new("failed to decrypt api key secret"))?;
        String::from_utf8(plaintext.to_vec())
            .map_err(|_| DomainError::new("api key secret plaintext is not valid utf-8"))
    }
}

impl fmt::Debug for RingAeadApiKeySecretCodec {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("RingAeadApiKeySecretCodec")
            .field("key", &"[REDACTED]")
            .finish()
    }
}
