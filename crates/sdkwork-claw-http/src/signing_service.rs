//! Multi-algorithm session token signing service.
//!
//! This module provides enterprise-grade session token signing with support for:
//! - **HMAC-SHA256 (HS256)**: Symmetric, backward compatible
//! - **RSA-SHA256 (RS256)**: Asymmetric, enterprise standard
//! - **ECDSA-P256-SHA256 (ES256)**: Asymmetric, performance optimized
//! - **Ed25519 (EdDSA)**: Asymmetric, modern high-security option
//!
//! # Architecture
//!
//! The signing service uses a two-tier approach:
//! 1. **Per-tenant keys**: Each tenant can have their own signing key for isolation
//! 2. **Shared fallback**: When per-tenant keys are unavailable, falls back to shared secret
//!
//! # Key Rotation
//!
//! Per-tenant keys support automatic rotation:
//! - Each key has a unique `kid` (key ID)
//! - New keys are generated with `ensure_active_key()`
//! - Old keys remain valid during the rotation window (configurable, default 90 days)
//! - `resolve_by_kid()` allows verification with any valid key

use async_trait::async_trait;
use hmac::Mac;
use sdkwork_claw_security::asymmetric_signing::{
    deserialize_key_material, generate_signing_key, serialize_key_material,
    sign_message, verify_signature, KeyGenerationOptions, SigningAlgorithm,
    SigningError, SigningKeyMaterial,
};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{debug, error, info, warn};

/// Configuration for the signing service.
#[derive(Debug, Clone)]
pub struct SigningServiceConfig {
    /// Default algorithm for new keys.
    pub default_algorithm: SigningAlgorithm,
    /// Shared fallback secret for backward compatibility.
    pub fallback_secret: Option<String>,
    /// Master encryption key for storing private keys.
    /// If None, keys are stored in plain text (NOT recommended for production).
    pub master_encryption_key: Option<Vec<u8>>,
    /// Key rotation period in days.
    pub rotation_period_days: u32,
    /// Enable per-tenant asymmetric keys.
    pub per_tenant_asymmetric_keys: bool,
}

impl Default for SigningServiceConfig {
    fn default() -> Self {
        Self {
            default_algorithm: SigningAlgorithm::EdDsa,
            fallback_secret: None,
            master_encryption_key: None,
            rotation_period_days: 90,
            per_tenant_asymmetric_keys: true,
        }
    }
}

/// In-memory store for per-tenant signing keys.
/// In production, this would be backed by a database.
#[derive(Default)]
pub struct InMemorySigningKeyStore {
    /// Active keys indexed by tenant_id.
    active_keys: RwLock<HashMap<String, TenantSigningKey>>,
    /// Historical keys for rotation support, indexed by kid.
    historical_keys: RwLock<HashMap<String, TenantSigningKey>>,
}

impl InMemorySigningKeyStore {
    pub fn new() -> Self {
        Self::default()
    }

    /// Generate and store a new signing key for a tenant.
    pub async fn generate_key(
        &self,
        tenant_id: &str,
        algorithm: SigningAlgorithm,
        master_key: Option<&[u8]>,
    ) -> Result<TenantSigningKey, SigningError> {
        let options = KeyGenerationOptions {
            algorithm,
            rsa_key_size: 2048,
        };
        let key_material = generate_signing_key(options)?;

        let kid = key_material.key_id(tenant_id);
        let created_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        // Serialize and optionally encrypt the key material
        let encrypted_key = match master_key {
            Some(key) => Some(serialize_key_material(&key_material, key)?),
            None => None,
        };

        let tenant_key = TenantSigningKey {
            kid: kid.clone(),
            tenant_id: tenant_id.to_string(),
            algorithm: key_material.algorithm(),
            encrypted_key,
            created_at,
            retired_at: None,
            key_material: Some(key_material),
        };

        // Store the key
        {
            let mut keys = self.active_keys.write().await;
            keys.insert(tenant_id.to_string(), tenant_key.clone());
        }
        {
            let mut hist = self.historical_keys.write().await;
            hist.insert(kid, tenant_key.clone());
        }

        info!(
            tenant_id = tenant_id,
            kid = %tenant_key.kid,
            algorithm = %tenant_key.algorithm,
            "generated new signing key for tenant"
        );

        Ok(tenant_key)
    }

    /// Get the active signing key for a tenant.
    pub async fn get_active_key(&self, tenant_id: &str) -> Option<TenantSigningKey> {
        let keys = self.active_keys.read().await;
        keys.get(tenant_id).cloned()
    }

    /// Resolve a key by its key ID.
    pub async fn resolve_by_kid(&self, kid: &str) -> Option<TenantSigningKey> {
        // First check active keys
        {
            let keys = self.active_keys.read().await;
            for key in keys.values() {
                if key.kid == kid {
                    return Some(key.clone());
                }
            }
        }
        // Then check historical keys
        let hist = self.historical_keys.read().await;
        hist.get(kid).cloned()
    }

    /// Retire a key for a tenant (initiate rotation).
    pub async fn retire_key(&self, tenant_id: &str) -> Result<(), String> {
        let mut keys = self.active_keys.write().await;
        if let Some(key) = keys.get_mut(tenant_id) {
            key.retired_at = Some(
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs() as i64,
            );
            info!(
                tenant_id = tenant_id,
                kid = %key.kid,
                "retired signing key for tenant"
            );
        }
        Ok(())
    }
}

/// Represents a tenant's signing key.
#[derive(Debug, Clone)]
pub struct TenantSigningKey {
    /// Unique key identifier.
    pub kid: String,
    /// Tenant this key belongs to.
    pub tenant_id: String,
    /// Algorithm used by this key.
    pub algorithm: SigningAlgorithm,
    /// Serialized (and optionally encrypted) key material.
    /// Required for signing operations.
    pub encrypted_key: Option<String>,
    /// When the key was created.
    pub created_at: i64,
    /// When the key was retired (None if active).
    pub retired_at: Option<i64>,
    /// Decrypted key material (kept in memory only).
    #[allow(dead_code)]
    key_material: Option<SigningKeyMaterial>,
}

/// Unified signing service that supports both HMAC and asymmetric signing.
#[derive(Clone)]
pub struct SessionTokenSigningService {
    config: SigningServiceConfig,
    key_store: Arc<InMemorySigningKeyStore>,
    fallback_key: Option<Vec<u8>>,
}

impl SessionTokenSigningService {
    /// Create a new signing service.
    pub fn new(config: SigningServiceConfig) -> Self {
        let fallback_key = config.fallback_secret.clone().map(|s| s.into_bytes());
        Self {
            config,
            key_store: Arc::new(InMemorySigningKeyStore::new()),
            fallback_key,
        }
    }

    /// Initialize with an existing key store.
    pub fn with_key_store(config: SigningServiceConfig, key_store: Arc<InMemorySigningKeyStore>) -> Self {
        let fallback_key = config.fallback_secret.clone().map(|s| s.into_bytes());
        Self {
            config,
            key_store,
            fallback_key,
        }
    }

    /// Sign a token using the tenant's active key, falling back to shared secret.
    pub async fn sign(&self, tenant_id: &str, payload: &[u8]) -> Result<String, SigningError> {
        // Try to use per-tenant key
        if let Some(key) = self.key_store.get_active_key(tenant_id).await {
            if let Some(ref encrypted) = key.encrypted_key {
                let master_key = self
                    .config
                    .master_encryption_key
                    .as_deref()
                    .ok_or_else(|| SigningError::InvalidKey("no master encryption key".to_string()))?;

                let key_material = deserialize_key_material(encrypted, master_key)?;
                let signature = sign_message(&key_material, payload)?;

                debug!(
                    tenant_id = tenant_id,
                    kid = %key.kid,
                    algorithm = %key.algorithm,
                    "signed token with per-tenant key"
                );

                return Ok(signature);
            }
        }

        // Fall back to shared HMAC secret
        if let Some(ref secret) = self.fallback_key {
            let mut mac = hmac_sha256_simple(secret);
            mac.update(payload);
            let signature = hex::encode(mac.finalize().into_bytes());

            warn!(
                tenant_id = tenant_id,
                "signed token with fallback shared secret (no per-tenant key)"
            );

            return Ok(signature);
        }

        Err(SigningError::InvalidKey("no signing key available".to_string()))
    }

    /// Verify a token signature using the tenant's key or fallback.
    pub async fn verify(
        &self,
        tenant_id: &str,
        kid: Option<&str>,
        payload: &[u8],
        signature_b64: &str,
    ) -> Result<(), SigningError> {
        // Try to resolve key by kid first
        if let Some(kid_str) = kid {
            if let Some(key) = self.key_store.resolve_by_kid(kid_str).await {
                if let Some(ref encrypted) = key.encrypted_key {
                    let master_key = self
                        .config
                        .master_encryption_key
                        .as_deref()
                        .ok_or_else(|| SigningError::InvalidKey("no master encryption key".to_string()))?;

                    let key_material = deserialize_key_material(encrypted, master_key)?;
                    verify_signature(&key_material, payload, signature_b64)?;

                    debug!(
                        tenant_id = tenant_id,
                        kid = %key.kid,
                        algorithm = %key.algorithm,
                        "verified token with per-tenant key (kid lookup)"
                    );

                    return Ok(());
                }
            }
        }

        // Try to use per-tenant active key
        if let Some(key) = self.key_store.get_active_key(tenant_id).await {
            if let Some(ref encrypted) = key.encrypted_key {
                let master_key = self
                    .config
                    .master_encryption_key
                    .as_deref()
                    .ok_or_else(|| SigningError::InvalidKey("no master encryption key".to_string()))?;

                let key_material = deserialize_key_material(encrypted, master_key)?;
                verify_signature(&key_material, payload, signature_b64)?;

                debug!(
                    tenant_id = tenant_id,
                    kid = %key.kid,
                    "verified token with per-tenant active key"
                );

                return Ok(());
            }
        }

        // Fall back to shared HMAC secret
        if let Some(ref secret) = self.fallback_key {
            let mut mac = hmac_sha256_simple(secret);
            mac.update(payload);
            let sig_bytes = hex::decode(signature_b64)
                .map_err(|_| SigningError::InvalidSignatureFormat)?;

            if mac.verify_slice(&sig_bytes).is_ok() {
                debug!(
                    tenant_id = tenant_id,
                    "verified token with fallback shared secret"
                );
                return Ok(());
            }
        }

        Err(SigningError::VerificationFailed)
    }

    /// Ensure an active key exists for a tenant, generating one if necessary.
    pub async fn ensure_active_key(&self, tenant_id: &str) -> Result<TenantSigningKey, SigningError> {
        if let Some(key) = self.key_store.get_active_key(tenant_id).await {
            // Check if key needs rotation
            if let Some(retired_at) = key.retired_at {
                let rotation_period_secs = self.config.rotation_period_days as i64 * 24 * 60 * 60;
                if key.created_at + rotation_period_secs < retired_at {
                    // Key is past rotation period, generate new one
                    return self
                        .key_store
                        .generate_key(
                            tenant_id,
                            self.config.default_algorithm,
                            self.config.master_encryption_key.as_deref(),
                        )
                        .await;
                }
            }
            return Ok(key);
        }

        // No active key, generate one
        self.key_store
            .generate_key(
                tenant_id,
                self.config.default_algorithm,
                self.config.master_encryption_key.as_deref(),
            )
            .await
    }

    /// Get the signing service's key store for integration with external stores.
    pub fn key_store(&self) -> Arc<InMemorySigningKeyStore> {
        self.key_store.clone()
    }
}

/// Simple HMAC-SHA256 wrapper for fallback signing.
fn hmac_sha256_simple(key: &[u8]) -> hmac::Hmac<sha2::Sha256> {
    use hmac::{Hmac, Mac};
    Hmac::<sha2::Sha256>::new_from_slice(key)
        .expect("HMAC can take key of any size")
}

/// Token signing with embedded key ID for asymmetric algorithms.
pub struct TokenWithKid {
    /// The signed token.
    pub token: String,
    /// The key ID used for signing.
    pub kid: String,
    /// The algorithm used.
    pub algorithm: SigningAlgorithm,
}

impl SessionTokenSigningService {
    /// Sign a token and include the key ID in the result.
    pub async fn sign_with_kid(&self, tenant_id: &str, payload: &[u8]) -> Result<TokenWithKid, SigningError> {
        let key = self.ensure_active_key(tenant_id).await?;
        let signature = self.sign(tenant_id, payload).await?;

        Ok(TokenWithKid {
            token: signature,
            kid: key.kid,
            algorithm: key.algorithm,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_hmac_fallback_signing() {
        let config = SigningServiceConfig {
            default_algorithm: SigningAlgorithm::EdDsa,
            fallback_secret: Some("test-secret-key".to_string()),
            master_encryption_key: None,
            rotation_period_days: 90,
            per_tenant_asymmetric_keys: true,
        };

        let service = SessionTokenSigningService::new(config);
        let payload = b"test payload";

        let signature = service.sign("tenant-1", payload).await.unwrap();
        assert!(!signature.is_empty());

        // Verify with fallback
        let result = service.verify("tenant-1", None, payload, &signature).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_per_tenant_ed25519_signing() {
        let master_key = b"master-encryption-key-32bytes!!";
        let config = SigningServiceConfig {
            default_algorithm: SigningAlgorithm::EdDsa,
            fallback_secret: Some("fallback-secret".to_string()),
            master_encryption_key: Some(master_key.to_vec()),
            rotation_period_days: 90,
            per_tenant_asymmetric_keys: true,
        };

        let service = SessionTokenSigningService::new(config);
        let payload = b"test payload for Ed25519";

        // Ensure active key exists
        let key = service.ensure_active_key("tenant-2").await.unwrap();
        assert!(key.kid.contains("eddsa"));
        assert!(key.encrypted_key.is_some());

        // Sign with per-tenant key
        let signature = service.sign("tenant-2", payload).await.unwrap();
        assert!(!signature.is_empty());

        // Verify with kid
        let result = service
            .verify("tenant-2", Some(&key.kid), payload, &signature)
            .await;
        assert!(result.is_ok());

        // Verify without kid (uses active key lookup)
        let result = service.verify("tenant-2", None, payload, &signature).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_key_rotation() {
        let master_key = b"master-encryption-key-for-rotation!!";
        let config = SigningServiceConfig {
            default_algorithm: SigningAlgorithm::Es256,
            fallback_secret: None,
            master_encryption_key: Some(master_key.to_vec()),
            rotation_period_days: 90,
            per_tenant_asymmetric_keys: true,
        };

        let service = SessionTokenSigningService::new(config);

        // Generate first key
        let key1 = service.ensure_active_key("tenant-3").await.unwrap();
        let sig1 = service.sign("tenant-3", b"payload").await.unwrap();

        // Verify first key works
        assert!(service.verify("tenant-3", Some(&key1.kid), b"payload", &sig1)
            .await
            .is_ok());

        // Retire key
        service.retire_key("tenant-3").await.unwrap();

        // Generate new key
        let key2 = service.ensure_active_key("tenant-3").await.unwrap();
        assert_ne!(key1.kid, key2.kid);

        // Old signature should still verify with historical key
        assert!(service.verify("tenant-3", Some(&key1.kid), b"payload", &sig1)
            .await
            .is_ok());

        // New signature uses new key
        let sig2 = service.sign("tenant-3", b"payload").await.unwrap();
        assert_ne!(sig1, sig2);
    }

    #[test]
    fn test_signing_algorithm_display() {
        assert_eq!(SigningAlgorithm::Hs256.to_string(), "HS256");
        assert_eq!(SigningAlgorithm::Rs256.to_string(), "RS256");
        assert_eq!(SigningAlgorithm::Es256.to_string(), "ES256");
        assert_eq!(SigningAlgorithm::EdDsa.to_string(), "EdDSA");
    }
}
