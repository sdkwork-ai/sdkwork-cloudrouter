//! Tenant-bound session token signing with bounded key rotation.
//!
//! This module is a development and test implementation of the signing-key
//! lifecycle used by the HTTP boundary. Production callers must use a durable,
//! tenant-bound key store. The in-memory implementation keeps the lifecycle
//! semantics executable: unique key identifiers, a single active key per
//! tenant, overlap-window validation for retired keys, and fail-closed tenant
//! binding during verification.

use hmac::Mac;
use sdkwork_claw_security::asymmetric_signing::{
    deserialize_key_material, generate_signing_key, serialize_key_material, sign_message,
    verify_signature, KeyGenerationOptions, SigningAlgorithm, SigningError,
};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{watch, Mutex, RwLock};
use tracing::{debug, info, warn};

/// Configuration for the signing service.
#[derive(Debug, Clone)]
pub struct SigningServiceConfig {
    /// Default algorithm for new keys.
    pub default_algorithm: SigningAlgorithm,
    /// Legacy shared fallback secret, used only when tenant signing is explicitly disabled.
    pub fallback_secret: Option<String>,
    /// Master encryption key used to serialize private key material retained by the store.
    /// Per-tenant signing is unavailable unless this key is configured.
    pub master_encryption_key: Option<Vec<u8>>,
    /// Key rotation and retired-key overlap period in whole days. Must be positive.
    pub rotation_period_days: u32,
    /// Enables per-tenant asymmetric signing keys.
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

#[derive(Default)]
struct SigningKeyStoreState {
    /// The configured signing key for each tenant. A retired key remains here
    /// only until the next signing attempt replaces it.
    active_keys: HashMap<String, TenantSigningKey>,
    /// Active and retired keys keyed by `kid`; verification enforces the overlap window.
    historical_keys: HashMap<String, TenantSigningKey>,
}

/// In-memory tenant signing-key store for development and tests.
///
/// The state is updated under one lock so a rotation cannot expose a new active
/// key without also preserving the old key for overlap-window verification.
#[derive(Default)]
pub struct InMemorySigningKeyStore {
    state: RwLock<SigningKeyStoreState>,
    rotation_gates: Mutex<HashMap<String, watch::Sender<bool>>>,
}

impl InMemorySigningKeyStore {
    pub fn new() -> Self {
        Self::default()
    }

    /// Get the current key for a tenant. A key marked retired is returned so
    /// the service can atomically replace it before another token is signed.
    pub async fn get_active_key(&self, tenant_id: &str) -> Option<TenantSigningKey> {
        let state = self.state.read().await;
        state.active_keys.get(tenant_id).cloned()
    }

    /// Resolve an active or retained historical key by its `kid`.
    pub async fn resolve_by_kid(&self, kid: &str) -> Option<TenantSigningKey> {
        let state = self.state.read().await;
        state.historical_keys.get(kid).cloned()
    }

    /// Resolve a key only when it remains inside the configured validation
    /// overlap window.
    async fn resolve_valid_by_kid(
        &self,
        kid: &str,
        now_unix_seconds: i64,
        overlap_seconds: i64,
    ) -> Option<TenantSigningKey> {
        let state = self.state.read().await;
        state
            .historical_keys
            .get(kid)
            .filter(|key| key.is_valid_for_verification(now_unix_seconds, overlap_seconds))
            .cloned()
    }

    /// Retire the configured key. The next call that needs an active key
    /// creates a replacement immediately; it does not wait for the normal
    /// rotation period.
    pub async fn retire_key(&self, tenant_id: &str) -> Result<(), String> {
        let retired_at = current_unix_seconds().map_err(|error| error.to_string())?;
        let mut state = self.state.write().await;
        let retired_key = state.active_keys.get_mut(tenant_id).map(|key| {
            if key.retired_at.is_none() {
                key.retired_at = Some(retired_at);
            }
            key.clone()
        });

        let Some(retired_key) = retired_key else {
            return Err("no signing key is configured for tenant".to_owned());
        };

        state
            .historical_keys
            .insert(retired_key.kid.clone(), retired_key.clone());
        info!(
            tenant_id = tenant_id,
            kid = %retired_key.kid,
            "retired signing key for tenant"
        );
        Ok(())
    }

    fn create_key(
        tenant_id: &str,
        algorithm: SigningAlgorithm,
        master_key: Option<&[u8]>,
    ) -> Result<TenantSigningKey, SigningError> {
        if tenant_id.trim().is_empty() {
            return Err(SigningError::InvalidKey(
                "tenant id must not be empty".to_owned(),
            ));
        }

        let master_key = master_key.ok_or_else(|| {
            SigningError::InvalidKey(
                "per-tenant signing requires a master encryption key".to_owned(),
            )
        })?;
        let key_material = generate_signing_key(KeyGenerationOptions {
            algorithm,
            rsa_key_size: 2048,
        })?;
        let encrypted_key = serialize_key_material(&key_material, master_key)?;
        let key_algorithm = key_material.algorithm();
        let created_at = current_unix_seconds()?;

        // `SigningKeyMaterial::key_id` identifies an algorithm family, not an
        // individual rotation. A cryptographically random suffix makes every
        // tenant key instance independently addressable during overlap.
        let kid = format!(
            "{}:{}:{}",
            tenant_id,
            key_algorithm.to_string().to_ascii_lowercase(),
            sdkwork_utils_rust::id::uuid()
        );

        Ok(TenantSigningKey {
            kid,
            tenant_id: tenant_id.to_owned(),
            algorithm: key_algorithm,
            encrypted_key,
            created_at,
            retired_at: None,
        })
    }

    async fn activate_key(
        &self,
        key: TenantSigningKey,
        overlap_seconds: i64,
    ) -> Result<TenantSigningKey, SigningError> {
        let activated_at = current_unix_seconds()?;
        let mut state = self.state.write().await;

        let retired_key = state.active_keys.get_mut(&key.tenant_id).map(|active_key| {
            if active_key.retired_at.is_none() {
                active_key.retired_at = Some(activated_at);
            }
            active_key.clone()
        });
        if let Some(retired_key) = retired_key {
            state
                .historical_keys
                .insert(retired_key.kid.clone(), retired_key);
        }

        prune_expired_historical_keys(&mut state, activated_at, overlap_seconds);
        state.historical_keys.insert(key.kid.clone(), key.clone());
        state.active_keys.insert(key.tenant_id.clone(), key.clone());

        info!(
            tenant_id = %key.tenant_id,
            kid = %key.kid,
            algorithm = %key.algorithm,
            "activated new signing key for tenant"
        );
        Ok(key)
    }

    async fn acquire_rotation_gate(&self, tenant_id: &str) -> RotationGate {
        let mut gates = self.rotation_gates.lock().await;
        if let Some(sender) = gates.get(tenant_id) {
            return RotationGate::Wait(sender.subscribe());
        }

        let (sender, _) = watch::channel(false);
        gates.insert(tenant_id.to_owned(), sender.clone());
        RotationGate::Owner(sender)
    }

    async fn finish_rotation_gate(&self, tenant_id: &str, sender: watch::Sender<bool>) {
        {
            let mut gates = self.rotation_gates.lock().await;
            gates.remove(tenant_id);
        }
        sender.send_replace(true);
    }
}

fn prune_expired_historical_keys(
    state: &mut SigningKeyStoreState,
    now_unix_seconds: i64,
    overlap_seconds: i64,
) {
    state.historical_keys.retain(|_, key| {
        key.retired_at
            .map(|retired_at| now_unix_seconds < retired_at.saturating_add(overlap_seconds))
            .unwrap_or(true)
    });
}

/// Represents a tenant's signing key.
#[derive(Debug, Clone)]
pub struct TenantSigningKey {
    /// Unique identifier for this individual key instance.
    pub kid: String,
    /// Tenant that owns the key.
    pub tenant_id: String,
    /// Algorithm used by this key.
    pub algorithm: SigningAlgorithm,
    /// Encrypted private key material used for signing and verification.
    encrypted_key: String,
    /// Unix timestamp when the key was created.
    pub created_at: i64,
    /// Unix timestamp when signing stopped. `None` means active.
    pub retired_at: Option<i64>,
}

impl TenantSigningKey {
    fn is_valid_for_verification(&self, now_unix_seconds: i64, overlap_seconds: i64) -> bool {
        self.retired_at
            .map(|retired_at| now_unix_seconds < retired_at.saturating_add(overlap_seconds))
            .unwrap_or(true)
    }
}

enum RotationGate {
    Owner(watch::Sender<bool>),
    Wait(watch::Receiver<bool>),
}

/// Unified signing service that supports tenant-scoped asymmetric keys and a
/// legacy HMAC fallback for explicitly configured compatibility deployments.
#[derive(Clone)]
pub struct SessionTokenSigningService {
    config: SigningServiceConfig,
    key_store: Arc<InMemorySigningKeyStore>,
    fallback_key: Option<Vec<u8>>,
}

impl SessionTokenSigningService {
    /// Create a signing service with an in-memory development/test key store.
    pub fn new(config: SigningServiceConfig) -> Self {
        Self::with_key_store(config, Arc::new(InMemorySigningKeyStore::new()))
    }

    /// Initialize with an existing in-memory development/test key store.
    pub fn with_key_store(
        config: SigningServiceConfig,
        key_store: Arc<InMemorySigningKeyStore>,
    ) -> Self {
        let fallback_key = config
            .fallback_secret
            .clone()
            .map(|secret| secret.into_bytes());
        Self {
            config,
            key_store,
            fallback_key,
        }
    }

    /// Sign a payload with the current tenant key when that mode is enabled;
    /// otherwise use the explicitly configured legacy fallback.
    pub async fn sign(&self, tenant_id: &str, payload: &[u8]) -> Result<String, SigningError> {
        if self.config.per_tenant_asymmetric_keys {
            let key = self.ensure_active_key(tenant_id).await?;
            return self.sign_with_key(&key, payload);
        }

        self.sign_with_fallback(tenant_id, payload)
    }

    /// Verify a signature. A supplied `kid` is authoritative: it must resolve
    /// to a currently valid key for the requested tenant, and it never falls
    /// back to a different active key or the global compatibility secret.
    pub async fn verify(
        &self,
        tenant_id: &str,
        kid: Option<&str>,
        payload: &[u8],
        signature_b64: &str,
    ) -> Result<(), SigningError> {
        if let Some(kid) = kid {
            let now_unix_seconds = current_unix_seconds()?;
            let Some(key) = self
                .key_store
                .resolve_valid_by_kid(kid, now_unix_seconds, self.rotation_overlap_seconds())
                .await
            else {
                return Err(SigningError::VerificationFailed);
            };
            if key.tenant_id != tenant_id {
                return Err(SigningError::VerificationFailed);
            }
            return self.verify_with_key(&key, payload, signature_b64);
        }

        if self.config.per_tenant_asymmetric_keys {
            if let Some(key) = self.key_store.get_active_key(tenant_id).await {
                if key.retired_at.is_none() {
                    return self.verify_with_key(&key, payload, signature_b64);
                }
            }
            return Err(SigningError::VerificationFailed);
        }

        self.verify_with_fallback(tenant_id, payload, signature_b64)
    }

    /// Ensure exactly one current signing key exists for a tenant. Explicitly
    /// retired keys and keys older than the configured rotation period are
    /// replaced before the caller can sign another token.
    pub async fn ensure_active_key(
        &self,
        tenant_id: &str,
    ) -> Result<TenantSigningKey, SigningError> {
        self.ensure_per_tenant_configuration()?;

        loop {
            if let Some(key) = self.key_store.get_active_key(tenant_id).await {
                if !self.key_requires_rotation(&key)? {
                    return Ok(key);
                }
            }

            match self.key_store.acquire_rotation_gate(tenant_id).await {
                RotationGate::Owner(sender) => {
                    let result = self.generate_and_activate_if_needed(tenant_id).await;
                    self.key_store.finish_rotation_gate(tenant_id, sender).await;
                    return result;
                }
                RotationGate::Wait(receiver) => wait_for_rotation(receiver).await,
            }
        }
    }

    /// Get the development/test key store for explicit lifecycle tests.
    pub fn key_store(&self) -> Arc<InMemorySigningKeyStore> {
        self.key_store.clone()
    }

    fn ensure_per_tenant_configuration(&self) -> Result<(), SigningError> {
        if !self.config.per_tenant_asymmetric_keys {
            return Err(SigningError::InvalidKey(
                "per-tenant signing keys are disabled".to_owned(),
            ));
        }
        if self.config.master_encryption_key.is_none() {
            return Err(SigningError::InvalidKey(
                "per-tenant signing requires a master encryption key".to_owned(),
            ));
        }
        if self.config.rotation_period_days == 0 {
            return Err(SigningError::InvalidKey(
                "key rotation period must be greater than zero days".to_owned(),
            ));
        }
        Ok(())
    }

    fn rotation_overlap_seconds(&self) -> i64 {
        i64::from(self.config.rotation_period_days).saturating_mul(24 * 60 * 60)
    }

    fn key_requires_rotation(&self, key: &TenantSigningKey) -> Result<bool, SigningError> {
        if key.retired_at.is_some() {
            return Ok(true);
        }
        let now_unix_seconds = current_unix_seconds()?;
        Ok(now_unix_seconds
            >= key
                .created_at
                .saturating_add(self.rotation_overlap_seconds()))
    }

    async fn generate_and_activate_if_needed(
        &self,
        tenant_id: &str,
    ) -> Result<TenantSigningKey, SigningError> {
        if let Some(key) = self.key_store.get_active_key(tenant_id).await {
            if !self.key_requires_rotation(&key)? {
                return Ok(key);
            }
        }

        let tenant_id = tenant_id.to_owned();
        let algorithm = self.config.default_algorithm;
        let master_key = self.config.master_encryption_key.clone();
        let key = tokio::task::spawn_blocking(move || {
            InMemorySigningKeyStore::create_key(&tenant_id, algorithm, master_key.as_deref())
        })
        .await
        .map_err(|error| {
            SigningError::SigningFailed(format!("signing key task failed: {error}"))
        })??;

        self.key_store
            .activate_key(key, self.rotation_overlap_seconds())
            .await
    }

    fn sign_with_key(
        &self,
        key: &TenantSigningKey,
        payload: &[u8],
    ) -> Result<String, SigningError> {
        let master_key = self
            .config
            .master_encryption_key
            .as_deref()
            .ok_or_else(|| SigningError::InvalidKey("no master encryption key".to_owned()))?;
        let key_material = deserialize_key_material(&key.encrypted_key, master_key)?;
        let signature = sign_message(&key_material, payload)?;

        debug!(
            tenant_id = %key.tenant_id,
            kid = %key.kid,
            algorithm = %key.algorithm,
            "signed token with tenant signing key"
        );
        Ok(signature)
    }

    fn verify_with_key(
        &self,
        key: &TenantSigningKey,
        payload: &[u8],
        signature_b64: &str,
    ) -> Result<(), SigningError> {
        let master_key = self
            .config
            .master_encryption_key
            .as_deref()
            .ok_or_else(|| SigningError::InvalidKey("no master encryption key".to_owned()))?;
        let key_material = deserialize_key_material(&key.encrypted_key, master_key)?;
        verify_signature(&key_material, payload, signature_b64)?;

        debug!(
            tenant_id = %key.tenant_id,
            kid = %key.kid,
            algorithm = %key.algorithm,
            "verified token with tenant signing key"
        );
        Ok(())
    }

    fn sign_with_fallback(&self, tenant_id: &str, payload: &[u8]) -> Result<String, SigningError> {
        let Some(secret) = &self.fallback_key else {
            return Err(SigningError::InvalidKey(
                "no signing key available".to_owned(),
            ));
        };
        let mut mac = hmac_sha256_simple(secret)?;
        mac.update(payload);
        let signature = hex::encode(mac.finalize().into_bytes());

        warn!(
            tenant_id = tenant_id,
            "signed token with legacy shared fallback secret"
        );
        Ok(signature)
    }

    fn verify_with_fallback(
        &self,
        tenant_id: &str,
        payload: &[u8],
        signature_b64: &str,
    ) -> Result<(), SigningError> {
        let Some(secret) = &self.fallback_key else {
            return Err(SigningError::VerificationFailed);
        };
        let mut mac = hmac_sha256_simple(secret)?;
        mac.update(payload);
        let signature =
            hex::decode(signature_b64).map_err(|_| SigningError::InvalidSignatureFormat)?;
        mac.verify_slice(&signature)
            .map_err(|_| SigningError::VerificationFailed)?;

        debug!(
            tenant_id = tenant_id,
            "verified token with legacy shared fallback secret"
        );
        Ok(())
    }
}

/// Token signature paired with the exact `kid` that produced it.
pub struct TokenWithKid {
    /// The signed token.
    pub token: String,
    /// The key ID used for signing.
    pub kid: String,
    /// The algorithm used.
    pub algorithm: SigningAlgorithm,
}

impl SessionTokenSigningService {
    /// Sign a token and return the exact key identifier that signed it.
    pub async fn sign_with_kid(
        &self,
        tenant_id: &str,
        payload: &[u8],
    ) -> Result<TokenWithKid, SigningError> {
        let key = self.ensure_active_key(tenant_id).await?;
        let token = self.sign_with_key(&key, payload)?;

        Ok(TokenWithKid {
            token,
            kid: key.kid,
            algorithm: key.algorithm,
        })
    }
}

fn current_unix_seconds() -> Result<i64, SigningError> {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|error| SigningError::ClockUnavailable(error.to_string()))
        .and_then(|duration| {
            i64::try_from(duration.as_secs()).map_err(|_| {
                SigningError::ClockUnavailable("unix timestamp exceeds i64 range".to_owned())
            })
        })
}

fn hmac_sha256_simple(key: &[u8]) -> Result<hmac::Hmac<sha2::Sha256>, SigningError> {
    use hmac::{Hmac, Mac};
    Hmac::<sha2::Sha256>::new_from_slice(key).map_err(|error| {
        SigningError::SigningFailed(format!("HMAC key initialization failed: {error}"))
    })
}

async fn wait_for_rotation(mut completion: watch::Receiver<bool>) {
    if !*completion.borrow() {
        let _ = completion.changed().await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_MASTER_ENCRYPTION_KEY: [u8; 32] = [0x42; 32];

    fn per_tenant_config(algorithm: SigningAlgorithm) -> SigningServiceConfig {
        SigningServiceConfig {
            default_algorithm: algorithm,
            fallback_secret: None,
            master_encryption_key: Some(TEST_MASTER_ENCRYPTION_KEY.to_vec()),
            rotation_period_days: 90,
            per_tenant_asymmetric_keys: true,
        }
    }

    #[tokio::test]
    async fn test_hmac_fallback_signing() {
        let config = SigningServiceConfig {
            default_algorithm: SigningAlgorithm::EdDsa,
            fallback_secret: Some("test-secret-key".to_owned()),
            master_encryption_key: None,
            rotation_period_days: 90,
            per_tenant_asymmetric_keys: false,
        };
        let service = SessionTokenSigningService::new(config);
        let payload = b"test payload";

        let signature = service.sign("tenant-1", payload).await.unwrap();
        assert!(!signature.is_empty());
        assert!(service
            .verify("tenant-1", None, payload, &signature)
            .await
            .is_ok());
    }

    #[tokio::test]
    async fn test_per_tenant_ed25519_signing() {
        let service = SessionTokenSigningService::new(per_tenant_config(SigningAlgorithm::EdDsa));
        let payload = b"test payload for Ed25519";

        let key = service.ensure_active_key("tenant-2").await.unwrap();
        assert!(key.kid.contains("eddsa"));
        assert!(!key.encrypted_key.is_empty());

        let signature = service.sign("tenant-2", payload).await.unwrap();
        assert!(!signature.is_empty());
        assert!(service
            .verify("tenant-2", Some(&key.kid), payload, &signature)
            .await
            .is_ok());
        assert!(service
            .verify("tenant-2", None, payload, &signature)
            .await
            .is_ok());
    }

    #[tokio::test]
    async fn test_key_rotation() {
        let service = SessionTokenSigningService::new(per_tenant_config(SigningAlgorithm::Es256));
        let payload = b"payload";

        let key1 = service.ensure_active_key("tenant-3").await.unwrap();
        let signature1 = service.sign("tenant-3", payload).await.unwrap();
        assert!(service
            .verify("tenant-3", Some(&key1.kid), payload, &signature1)
            .await
            .is_ok());

        service.key_store().retire_key("tenant-3").await.unwrap();
        let key2 = service.ensure_active_key("tenant-3").await.unwrap();
        assert_ne!(key1.kid, key2.kid);

        assert!(service
            .verify("tenant-3", Some(&key1.kid), payload, &signature1)
            .await
            .is_ok());

        let signature2 = service.sign("tenant-3", payload).await.unwrap();
        assert_ne!(signature1, signature2);
        assert!(service
            .verify("tenant-3", Some(&key2.kid), payload, &signature2)
            .await
            .is_ok());
    }

    #[tokio::test]
    async fn concurrent_initialization_coalesces_to_one_tenant_key() {
        let config = per_tenant_config(SigningAlgorithm::Es256);
        let store = Arc::new(InMemorySigningKeyStore::new());
        let service = SessionTokenSigningService::with_key_store(config.clone(), store.clone());
        let peer_service = SessionTokenSigningService::with_key_store(config, store.clone());
        let mut tasks = Vec::new();
        for index in 0..16 {
            let service = if index % 2 == 0 {
                service.clone()
            } else {
                peer_service.clone()
            };
            tasks.push(tokio::spawn(async move {
                service
                    .ensure_active_key("tenant-concurrent")
                    .await
                    .unwrap()
                    .kid
            }));
        }

        let mut kids = Vec::new();
        for task in tasks {
            kids.push(task.await.unwrap());
        }
        let first = kids.first().expect("at least one signing key");
        assert!(kids.iter().all(|kid| kid == first));

        let state = store.state.read().await;
        assert_eq!(
            state
                .historical_keys
                .values()
                .filter(|key| key.tenant_id == "tenant-concurrent")
                .count(),
            1
        );
    }

    #[tokio::test]
    async fn kid_cannot_be_reused_across_tenants() {
        let service = SessionTokenSigningService::new(per_tenant_config(SigningAlgorithm::Es256));
        let payload = b"tenant-isolated-payload";
        let key = service.ensure_active_key("tenant-a").await.unwrap();
        let signature = service.sign("tenant-a", payload).await.unwrap();

        assert!(service
            .verify("tenant-b", Some(&key.kid), payload, &signature)
            .await
            .is_err());
    }

    #[tokio::test]
    async fn sign_with_kid_returns_the_key_that_signed_the_payload() {
        let service = SessionTokenSigningService::new(per_tenant_config(SigningAlgorithm::Es256));
        let payload = b"signed-with-kid";
        let signed = service
            .sign_with_kid("tenant-sign-with-kid", payload)
            .await
            .unwrap();

        assert!(service
            .verify(
                "tenant-sign-with-kid",
                Some(&signed.kid),
                payload,
                &signed.token,
            )
            .await
            .is_ok());
    }

    #[tokio::test]
    async fn unknown_kid_never_downgrades_to_legacy_fallback() {
        let service = SessionTokenSigningService::new(SigningServiceConfig {
            default_algorithm: SigningAlgorithm::Hs256,
            fallback_secret: Some("legacy-secret".to_owned()),
            master_encryption_key: None,
            rotation_period_days: 90,
            per_tenant_asymmetric_keys: false,
        });
        let payload = b"fallback-payload";
        let signature = service.sign("tenant-legacy", payload).await.unwrap();

        assert!(service
            .verify("tenant-legacy", Some("unknown-kid"), payload, &signature)
            .await
            .is_err());
        assert!(service
            .verify("tenant-legacy", None, payload, &signature)
            .await
            .is_ok());
    }

    #[tokio::test]
    async fn enabled_tenant_signing_never_downgrades_when_master_key_is_missing() {
        let service = SessionTokenSigningService::new(SigningServiceConfig {
            default_algorithm: SigningAlgorithm::Hs256,
            fallback_secret: Some("legacy-secret".to_owned()),
            master_encryption_key: None,
            rotation_period_days: 90,
            per_tenant_asymmetric_keys: true,
        });

        assert!(service
            .sign("tenant-misconfigured", b"payload")
            .await
            .is_err());
    }

    #[test]
    fn test_signing_algorithm_display() {
        assert_eq!(SigningAlgorithm::Hs256.to_string(), "HS256");
        assert_eq!(SigningAlgorithm::Rs256.to_string(), "RS256");
        assert_eq!(SigningAlgorithm::Es256.to_string(), "ES256");
        assert_eq!(SigningAlgorithm::EdDsa.to_string(), "EdDSA");
    }
}
