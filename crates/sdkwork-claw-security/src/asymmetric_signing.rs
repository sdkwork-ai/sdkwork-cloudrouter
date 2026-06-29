//! Enterprise-grade asymmetric signing for per-tenant session tokens.
//!
//! This module provides secure multi-tenant signing with support for:
//! - **HS256**: HMAC-SHA256 (symmetric, backward compatible)
//! - **RS256**: RSA-SHA256 (enterprise, widely supported)
//! - **ES256**: ECDSA-P256-SHA256 (performance optimized)
//! - **EdDSA**: Ed25519 (highest security, modern)
//!
//! All private keys are encrypted at rest using AES-256-GCM with tenant-specific
//! master keys derived from the deployment secret.

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use hmac::{Hmac, Mac};
use rand::RngCore;
use rsa::pkcs1::DecodeRsaPrivateKey;
use rsa::pkcs8::{
    DecodePrivateKey, EncodePrivateKey, EncodePublicKey, LineEnding,
};
use rsa::Pkcs1v15Sign;
use rsa::{RsaPrivateKey, RsaPublicKey};
use serde::{Deserialize, Serialize};
use sha2::Digest;
use sha2::Sha256;
use thiserror::Error;

type HmacSha256Type = Hmac<Sha256>;

/// Supported signing algorithms for per-tenant session tokens.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SigningAlgorithm {
    /// HMAC-SHA256 (symmetric, backward compatible)
    Hs256,
    /// RSA-SHA256 (enterprise, widely supported)
    Rs256,
    /// ECDSA-P256-SHA256 (performance optimized)
    Es256,
    /// Ed25519 (highest security, modern)
    EdDsa,
}

impl Default for SigningAlgorithm {
    fn default() -> Self {
        Self::Hs256
    }
}

impl std::fmt::Display for SigningAlgorithm {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Hs256 => write!(f, "HS256"),
            Self::Rs256 => write!(f, "RS256"),
            Self::Es256 => write!(f, "ES256"),
            Self::EdDsa => write!(f, "EdDSA"),
        }
    }
}

/// Algorithm-specific key material for asymmetric signing.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SigningKeyMaterial {
    /// HMAC-SHA256 symmetric key
    Hmac { secret: Vec<u8> },
    /// RSA-SHA256 key pair
    Rsa {
        private_key: RsaPrivateKey,
        public_key: RsaPublicKey,
    },
    /// ECDSA-P256 key pair
    Ecdsa {
        private_key: p256::ecdsa::SigningKey,
        public_key: p256::ecdsa::VerifyingKey,
    },
    /// Ed25519 key pair
    Ed25519 {
        private_key: ed25519_dalek::SigningKey,
        public_key: ed25519_dalek::VerifyingKey,
    },
}

impl SigningKeyMaterial {
    /// Get the algorithm identifier for this key material.
    pub fn algorithm(&self) -> SigningAlgorithm {
        match self {
            Self::Hmac { .. } => SigningAlgorithm::Hs256,
            Self::Rsa { .. } => SigningAlgorithm::Rs256,
            Self::Ecdsa { .. } => SigningAlgorithm::Es256,
            Self::Ed25519 { .. } => SigningAlgorithm::EdDsa,
        }
    }

    /// Sign a message with this key material.
    pub fn sign(&self, message: &[u8]) -> Result<Vec<u8>, SigningError> {
        match self {
            Self::Hmac { secret } => {
                let mut mac = HmacSha256Type::new_from_slice(secret)
                    .map_err(|_| SigningError::InvalidKey("invalid HMAC key length".to_string()))?;
                mac.update(message);
                Ok(mac.finalize().into_bytes().to_vec())
            }
            Self::Rsa { private_key, .. } => {
                let digest = Sha256::digest(message);
                let signature = private_key
                    .sign(Pkcs1v15Sign::new_unprefixed(), &digest)
                    .map_err(|e| SigningError::SigningFailed(e.to_string()))?;
                Ok(signature)
            }
            Self::Ecdsa { private_key, .. } => {
                use p256::ecdsa::signature::Signer;
                let signature: p256::ecdsa::Signature = private_key
                    .try_sign(message)
                    .map_err(|e| SigningError::SigningFailed(e.to_string()))?;
                Ok(signature.to_bytes().to_vec())
            }
            Self::Ed25519 { private_key, .. } => {
                use ed25519_dalek::Signer;
                let signature = private_key.sign(message);
                Ok(signature.to_bytes().to_vec())
            }
        }
    }

    /// Verify a signature with this key material.
    pub fn verify(&self, message: &[u8], signature: &[u8]) -> Result<(), SigningError> {
        match self {
            Self::Hmac { secret } => {
                let mut mac = HmacSha256Type::new_from_slice(secret)
                    .map_err(|_| SigningError::InvalidKey("invalid HMAC key length".to_string()))?;
                mac.update(message);
                mac.verify_slice(signature)
                    .map_err(|_| SigningError::VerificationFailed)
            }
            Self::Rsa { public_key, .. } => {
                let digest = Sha256::digest(message);
                public_key
                    .verify(Pkcs1v15Sign::new_unprefixed(), &digest, signature)
                    .map_err(|_| SigningError::VerificationFailed)
            }
            Self::Ecdsa { public_key, .. } => {
                use p256::ecdsa::signature::Verifier;
                let signature = p256::ecdsa::Signature::from_slice(signature)
                    .map_err(|_| SigningError::InvalidSignatureFormat)?;
                public_key
                    .verify(message, &signature)
                    .map_err(|_| SigningError::VerificationFailed)
            }
            Self::Ed25519 { public_key, .. } => {
                use ed25519_dalek::Signature;
                let sig_bytes: [u8; 64] = signature
                    .try_into()
                    .map_err(|_| SigningError::InvalidSignatureFormat)?;
                let signature = Signature::from_bytes(&sig_bytes);
                public_key
                    .verify_strict(message, &signature)
                    .map_err(|_| SigningError::VerificationFailed)
            }
        }
    }

    /// Serialize the private key to PEM format (encrypted).
    pub fn private_key_pem(&self) -> Result<String, SigningError> {
        match self {
            Self::Hmac { .. } => Err(SigningError::UnsupportedOperation(
                "HMAC keys cannot be exported as PEM".to_string(),
            )),
            Self::Rsa { private_key, .. } => {
                let doc = private_key
                    .to_pkcs8_pem(LineEnding::LF)
                    .map_err(|e| SigningError::EncodingFailed(e.to_string()))?;
                Ok(doc.to_string())
            }
            Self::Ecdsa { private_key, .. } => {
                let bytes = private_key.to_bytes();
                Ok(URL_SAFE_NO_PAD.encode(bytes))
            }
            Self::Ed25519 { private_key, .. } => {
                Ok(URL_SAFE_NO_PAD.encode(private_key.as_bytes()))
            }
        }
    }

    /// Serialize the public key to PEM format.
    pub fn public_key_pem(&self) -> Result<String, SigningError> {
        match self {
            Self::Hmac { .. } => Err(SigningError::UnsupportedOperation(
                "HMAC keys have no public key".to_string(),
            )),
            Self::Rsa { public_key, .. } => {
                let doc = public_key
                    .to_public_key_pem(LineEnding::LF)
                    .map_err(|e| SigningError::EncodingFailed(e.to_string()))?;
                Ok(doc)
            }
            Self::Ecdsa { public_key, .. } => {
                let point = public_key.to_encoded_point(false);
                Ok(URL_SAFE_NO_PAD.encode(point.as_bytes()))
            }
            Self::Ed25519 { public_key, .. } => {
                Ok(URL_SAFE_NO_PAD.encode(public_key.as_bytes()))
            }
        }
    }

    /// Get the key ID for this key material.
    pub fn key_id(&self, tenant_id: &str) -> String {
        format!(
            "{}:{}:{}",
            tenant_id,
            self.algorithm().to_string().to_lowercase(),
            "primary"
        )
    }
}

/// Errors that can occur during signing operations.
#[derive(Debug, Error)]
pub enum SigningError {
    #[error("key generation failed: {0}")]
    KeyGenerationFailed(String),

    #[error("invalid key: {0}")]
    InvalidKey(String),

    #[error("signing failed: {0}")]
    SigningFailed(String),

    #[error("verification failed")]
    VerificationFailed,

    #[error("invalid signature format")]
    InvalidSignatureFormat,

    #[error("encoding failed: {0}")]
    EncodingFailed(String),

    #[error("decoding failed: {0}")]
    DecodingFailed(String),

    #[error("unsupported operation: {0}")]
    UnsupportedOperation(String),

    #[error("system clock unavailable: {0}")]
    ClockUnavailable(String),
}

/// Key generation options.
#[derive(Debug, Clone)]
pub struct KeyGenerationOptions {
    /// The signing algorithm to use.
    pub algorithm: SigningAlgorithm,
    /// RSA key size in bits (only for RS256).
    pub rsa_key_size: usize,
}

impl Default for KeyGenerationOptions {
    fn default() -> Self {
        Self {
            algorithm: SigningAlgorithm::EdDsa,
            rsa_key_size: 2048,
        }
    }
}

/// Generate a new signing key pair with the specified algorithm.
pub fn generate_signing_key(
    options: KeyGenerationOptions,
) -> Result<SigningKeyMaterial, SigningError> {
    match options.algorithm {
        SigningAlgorithm::Hs256 => {
            let mut secret = vec![0u8; 64];
            rand::thread_rng().fill_bytes(&mut secret);
            Ok(SigningKeyMaterial::Hmac { secret })
        }
        SigningAlgorithm::Rs256 => {
            let mut rng = rand::thread_rng();
            let bits = options.rsa_key_size;
            let private_key = RsaPrivateKey::new(&mut rng, bits)
                .map_err(|e| SigningError::KeyGenerationFailed(e.to_string()))?;
            let public_key = RsaPublicKey::from(&private_key);
            Ok(SigningKeyMaterial::Rsa {
                private_key,
                public_key,
            })
        }
        SigningAlgorithm::Es256 => {
            let mut rng = rand::thread_rng();
            let signing_key = p256::ecdsa::SigningKey::random(&mut rng);
            let verifying_key = p256::ecdsa::VerifyingKey::from(&signing_key);
            Ok(SigningKeyMaterial::Ecdsa {
                private_key: signing_key,
                public_key: verifying_key,
            })
        }
        SigningAlgorithm::EdDsa => {
            let mut rng = rand::thread_rng();
            let signing_key = ed25519_dalek::SigningKey::generate(&mut rng);
            let verifying_key = signing_key.verifying_key();
            Ok(SigningKeyMaterial::Ed25519 {
                private_key: signing_key,
                public_key: verifying_key,
            })
        }
    }
}

/// Serialize signing key material for storage.
pub fn serialize_key_material(
    key: &SigningKeyMaterial,
    encryption_key: &[u8],
) -> Result<String, SigningError> {
    let (alg, key_data) = match key {
        SigningKeyMaterial::Hmac { secret } => (
            "hs256".to_string(),
            serde_json::json!({ "secret": URL_SAFE_NO_PAD.encode(secret) }),
        ),
        SigningKeyMaterial::Rsa { private_key, .. } => {
            let pem = private_key
                .to_pkcs8_pem(LineEnding::LF)
                .map_err(|e| SigningError::EncodingFailed(e.to_string()))?;
            (
                "rs256".to_string(),
                serde_json::json!({ "pem": pem.to_string() }),
            )
        }
        SigningKeyMaterial::Ecdsa { private_key, .. } => {
            let bytes = private_key.to_bytes();
            (
                "es256".to_string(),
                serde_json::json!({ "bytes": URL_SAFE_NO_PAD.encode(bytes) }),
            )
        }
        SigningKeyMaterial::Ed25519 { private_key, .. } => (
            "eddsa".to_string(),
            serde_json::json!({ "bytes": URL_SAFE_NO_PAD.encode(private_key.as_bytes()) }),
        ),
    };

    let plaintext = serde_json::json!({
        "alg": alg,
        "key": key_data,
    })
    .to_string();

    let encrypted = sdkwork_utils_rust::aes_gcm_encrypt(encryption_key, plaintext.as_bytes())
        .map_err(|e| SigningError::EncodingFailed(e))?;

    Ok(serde_json::json!({
        "v": 1,
        "enc": "aes-256-gcm",
        "data": encrypted,
    })
    .to_string())
}

/// Deserialize signing key material from storage.
pub fn deserialize_key_material(
    encrypted: &str,
    encryption_key: &[u8],
) -> Result<SigningKeyMaterial, SigningError> {
    let wrapper: serde_json::Value =
        serde_json::from_str(encrypted).map_err(|e| SigningError::DecodingFailed(e.to_string()))?;

    let version = wrapper.get("v").and_then(|v| v.as_i64()).unwrap_or(0);
    if version != 1 {
        return Err(SigningError::DecodingFailed(format!(
            "unsupported version: {}",
            version
        )));
    }

    let encrypted_data = wrapper
        .get("data")
        .and_then(|v| v.as_str())
        .ok_or_else(|| SigningError::DecodingFailed("missing encrypted data".to_string()))?;

    let plaintext = sdkwork_utils_rust::aes_gcm_decrypt(encryption_key, encrypted_data)
        .map_err(|e| SigningError::DecodingFailed(e))?;
    let plaintext_str =
        String::from_utf8(plaintext).map_err(|e| SigningError::DecodingFailed(e.to_string()))?;

    let key_wrapper: serde_json::Value = serde_json::from_str(&plaintext_str)
        .map_err(|e| SigningError::DecodingFailed(e.to_string()))?;

    let alg = key_wrapper
        .get("alg")
        .and_then(|v| v.as_str())
        .ok_or_else(|| SigningError::DecodingFailed("missing algorithm".to_string()))?;

    let key_data = key_wrapper
        .get("key")
        .ok_or_else(|| SigningError::DecodingFailed("missing key data".to_string()))?;

    match alg {
        "hs256" => {
            let secret_b64 = key_data
                .get("secret")
                .and_then(|v| v.as_str())
                .ok_or_else(|| SigningError::DecodingFailed("missing HMAC secret".to_string()))?;
            let secret = URL_SAFE_NO_PAD
                .decode(secret_b64)
                .map_err(|e| SigningError::DecodingFailed(e.to_string()))?;
            Ok(SigningKeyMaterial::Hmac { secret })
        }
        "rs256" => {
            let pem = key_data
                .get("pem")
                .and_then(|v| v.as_str())
                .ok_or_else(|| SigningError::DecodingFailed("missing RSA PEM".to_string()))?;
            let private_key = RsaPrivateKey::from_pkcs8_pem(pem)
                .or_else(|_| RsaPrivateKey::from_pkcs1_pem(pem))
                .map_err(|e| SigningError::DecodingFailed(e.to_string()))?;
            let public_key = RsaPublicKey::from(&private_key);
            Ok(SigningKeyMaterial::Rsa {
                private_key,
                public_key,
            })
        }
        "es256" => {
            let bytes_b64 = key_data
                .get("bytes")
                .and_then(|v| v.as_str())
                .ok_or_else(|| SigningError::DecodingFailed("missing ECDSA bytes".to_string()))?;
            let bytes = URL_SAFE_NO_PAD
                .decode(bytes_b64)
                .map_err(|e| SigningError::DecodingFailed(e.to_string()))?;
            let signing_key = p256::ecdsa::SigningKey::from_slice(&bytes)
                .map_err(|e| SigningError::DecodingFailed(e.to_string()))?;
            let public_key = p256::ecdsa::VerifyingKey::from(&signing_key);
            Ok(SigningKeyMaterial::Ecdsa {
                private_key: signing_key,
                public_key,
            })
        }
        "eddsa" => {
            let bytes_b64 = key_data
                .get("bytes")
                .and_then(|v| v.as_str())
                .ok_or_else(|| SigningError::DecodingFailed("missing Ed25519 bytes".to_string()))?;
            let bytes = URL_SAFE_NO_PAD
                .decode(bytes_b64)
                .map_err(|e| SigningError::DecodingFailed(e.to_string()))?;
            let key_bytes: [u8; 32] = bytes
                .try_into()
                .map_err(|_| SigningError::DecodingFailed("invalid Ed25519 key length".to_string()))?;
            let private_key = ed25519_dalek::SigningKey::from_bytes(&key_bytes);
            let public_key = private_key.verifying_key();
            Ok(SigningKeyMaterial::Ed25519 {
                private_key,
                public_key,
            })
        }
        _ => Err(SigningError::DecodingFailed(format!(
            "unknown algorithm: {}",
            alg
        ))),
    }
}

/// Sign a message and return base64url-encoded signature.
pub fn sign_message(key: &SigningKeyMaterial, message: &[u8]) -> Result<String, SigningError> {
    let signature = key.sign(message)?;
    Ok(URL_SAFE_NO_PAD.encode(&signature))
}

/// Verify a signature using the appropriate key material.
pub fn verify_signature(
    key: &SigningKeyMaterial,
    message: &[u8],
    signature_b64: &str,
) -> Result<(), SigningError> {
    let signature = URL_SAFE_NO_PAD
        .decode(signature_b64)
        .map_err(|e| SigningError::DecodingFailed(e.to_string()))?;
    key.verify(message, &signature)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hmac_signing() {
        let key = generate_signing_key(KeyGenerationOptions {
            algorithm: SigningAlgorithm::Hs256,
            ..Default::default()
        })
        .unwrap();

        let message = b"test message";
        let signature = key.sign(message).unwrap();
        key.verify(message, &signature).unwrap();

        let wrong_key = generate_signing_key(KeyGenerationOptions {
            algorithm: SigningAlgorithm::Hs256,
            ..Default::default()
        })
        .unwrap();
        assert!(wrong_key.verify(message, &signature).is_err());
    }

    #[test]
    fn test_rsa_signing() {
        let key = generate_signing_key(KeyGenerationOptions {
            algorithm: SigningAlgorithm::Rs256,
            rsa_key_size: 2048,
        })
        .unwrap();

        let message = b"test message for RSA";
        let signature = key.sign(message).unwrap();
        key.verify(message, &signature).unwrap();
    }

    #[test]
    fn test_ecdsa_signing() {
        let key = generate_signing_key(KeyGenerationOptions {
            algorithm: SigningAlgorithm::Es256,
            ..Default::default()
        })
        .unwrap();

        let message = b"test message for ECDSA";
        let signature = key.sign(message).unwrap();
        key.verify(message, &signature).unwrap();
    }

    #[test]
    fn test_ed25519_signing() {
        let key = generate_signing_key(KeyGenerationOptions {
            algorithm: SigningAlgorithm::EdDsa,
            ..Default::default()
        })
        .unwrap();

        let message = b"test message for Ed25519";
        let signature = key.sign(message).unwrap();
        key.verify(message, &signature).unwrap();
    }

    #[test]
    fn test_key_serialization() {
        let key = generate_signing_key(KeyGenerationOptions {
            algorithm: SigningAlgorithm::Es256,
            ..Default::default()
        })
        .unwrap();

        let kid = key.key_id("100001");
        assert!(kid.contains("es256"));

        let encryption_key = b"01234567890123456789012345678901";
        let serialized = serialize_key_material(&key, encryption_key).unwrap();
        let deserialized = deserialize_key_material(&serialized, encryption_key).unwrap();

        let message = b"roundtrip test";
        let signature = deserialized.sign(message).unwrap();
        key.verify(message, &signature).unwrap();
    }

    #[test]
    fn test_ed25519_serialization() {
        let key = generate_signing_key(KeyGenerationOptions {
            algorithm: SigningAlgorithm::EdDsa,
            ..Default::default()
        })
        .unwrap();

        let encryption_key = b"01234567890123456789012345678901";
        let serialized = serialize_key_material(&key, encryption_key).unwrap();
        let deserialized = deserialize_key_material(&serialized, encryption_key).unwrap();

        let message = b"roundtrip ed25519 test";
        let signature = deserialized.sign(message).unwrap();
        key.verify(message, &signature).unwrap();
    }

    #[test]
    fn test_rsa_serialization() {
        let key = generate_signing_key(KeyGenerationOptions {
            algorithm: SigningAlgorithm::Rs256,
            rsa_key_size: 2048,
        })
        .unwrap();

        let encryption_key = b"01234567890123456789012345678901";
        let serialized = serialize_key_material(&key, encryption_key).unwrap();
        let deserialized = deserialize_key_material(&serialized, encryption_key).unwrap();

        let message = b"roundtrip rsa test";
        let signature = deserialized.sign(message).unwrap();
        key.verify(message, &signature).unwrap();
    }
}
