use std::collections::BTreeMap;
use std::fmt;
use std::future::Future;
use std::pin::Pin;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use rand::RngCore;
use sdkwork_utils_rust::{
    base64url_decode, base64url_encode, derive_aes_256_key, hmac_sha256_base64url, secure_compare,
    sha256_hash, verify_hmac_sha256_base64url,
};

pub const INTERNAL_GATEWAY_ROUTE_PREFIX: &str = "/internal/v3/gateway";
pub const INTERNAL_GATEWAY_AUTH_VERSION: &str = "v1";
pub const X_SDKWORK_INTERNAL_AUTH_VERSION: &str = "x-sdkwork-internal-auth-version";
pub const X_SDKWORK_INTERNAL_API_KEY_ID: &str = "x-sdkwork-internal-api-key-id";
pub const X_SDKWORK_INTERNAL_TENANT_ID: &str = "x-sdkwork-internal-tenant-id";
pub const X_SDKWORK_INTERNAL_ORGANIZATION_ID: &str = "x-sdkwork-internal-organization-id";
pub const X_SDKWORK_INTERNAL_USER_ID: &str = "x-sdkwork-internal-user-id";
pub const X_SDKWORK_INTERNAL_ACCOUNT_GROUP_ID: &str = "x-sdkwork-internal-account-group-id";
pub const X_SDKWORK_INTERNAL_ISSUED_AT: &str = "x-sdkwork-internal-issued-at";
pub const X_SDKWORK_INTERNAL_EXPIRES_AT: &str = "x-sdkwork-internal-expires-at";
pub const X_SDKWORK_INTERNAL_NONCE: &str = "x-sdkwork-internal-nonce";
pub const X_SDKWORK_INTERNAL_BODY_SHA256: &str = "x-sdkwork-internal-body-sha256";
pub const X_SDKWORK_INTERNAL_SIGNATURE: &str = "x-sdkwork-internal-signature";

const SIGNING_KEY_SALT: &[u8] = b"sdkwork-clawrouter-internal-gateway-v1";
const SIGNING_KEY_INFO: &[u8] = b"request-signing";
const NONCE_BYTES: usize = 18;
const BODY_SHA256_HEX_LEN: usize = 64;

pub const INTERNAL_GATEWAY_AUTH_HEADERS: &[&str] = &[
    X_SDKWORK_INTERNAL_AUTH_VERSION,
    X_SDKWORK_INTERNAL_API_KEY_ID,
    X_SDKWORK_INTERNAL_TENANT_ID,
    X_SDKWORK_INTERNAL_ORGANIZATION_ID,
    X_SDKWORK_INTERNAL_USER_ID,
    X_SDKWORK_INTERNAL_ACCOUNT_GROUP_ID,
    X_SDKWORK_INTERNAL_ISSUED_AT,
    X_SDKWORK_INTERNAL_EXPIRES_AT,
    X_SDKWORK_INTERNAL_NONCE,
    X_SDKWORK_INTERNAL_BODY_SHA256,
    X_SDKWORK_INTERNAL_SIGNATURE,
];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct InternalGatewayPrincipal {
    pub api_key_id: i64,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
    pub account_group_id: i64,
}

impl InternalGatewayPrincipal {
    pub fn validate(self) -> Result<Self, InternalGatewayAuthError> {
        if self.api_key_id <= 0
            || self.tenant_id <= 0
            || self.organization_id < 0
            || self.user_id <= 0
            || self.account_group_id <= 0
        {
            return Err(InternalGatewayAuthError::InvalidPrincipal);
        }
        Ok(self)
    }
}

#[derive(Clone, PartialEq, Eq)]
pub struct SignedInternalGatewayRequest {
    pub version: String,
    pub principal: InternalGatewayPrincipal,
    pub issued_at: u64,
    pub expires_at: u64,
    pub nonce: String,
    pub body_sha256: String,
    pub signature: String,
}

impl fmt::Debug for SignedInternalGatewayRequest {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("SignedInternalGatewayRequest")
            .field("version", &self.version)
            .field("principal", &self.principal)
            .field("issued_at", &self.issued_at)
            .field("expires_at", &self.expires_at)
            .field("nonce", &self.nonce)
            .field("body_sha256", &self.body_sha256)
            .field("signature", &"[REDACTED]")
            .finish()
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InternalGatewayAuthError {
    InvalidPrincipal,
    InvalidVersion,
    InvalidTimestamp,
    Expired,
    ExcessiveLifetime,
    InvalidNonce,
    InvalidBodyDigest,
    InvalidSignature,
    Replayed,
    ClockUnavailable,
    ReplayCacheUnavailable,
}

impl fmt::Display for InternalGatewayAuthError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let message = match self {
            Self::InvalidPrincipal => "internal gateway principal is invalid",
            Self::InvalidVersion => "internal gateway authentication version is invalid",
            Self::InvalidTimestamp => "internal gateway request timestamp is invalid",
            Self::Expired => "internal gateway request has expired",
            Self::ExcessiveLifetime => "internal gateway request lifetime is invalid",
            Self::InvalidNonce => "internal gateway request nonce is invalid",
            Self::InvalidBodyDigest => "internal gateway request body digest is invalid",
            Self::InvalidSignature => "internal gateway request signature is invalid",
            Self::Replayed => "internal gateway request was already used",
            Self::ClockUnavailable => "internal gateway clock is unavailable",
            Self::ReplayCacheUnavailable => "internal gateway replay cache is unavailable",
        };
        formatter.write_str(message)
    }
}

impl std::error::Error for InternalGatewayAuthError {}

pub type InternalGatewayReplayStoreFuture<'a> =
    Pin<Box<dyn Future<Output = Result<(), InternalGatewayAuthError>> + Send + 'a>>;

pub trait InternalGatewayReplayStore: Send + Sync {
    fn consume<'a>(
        &'a self,
        nonce: &'a str,
        retain_until: u64,
        now: u64,
    ) -> InternalGatewayReplayStoreFuture<'a>;
}

#[derive(Debug, Default)]
pub struct InMemoryInternalGatewayReplayStore {
    nonces: Mutex<BTreeMap<String, u64>>,
}

impl InternalGatewayReplayStore for InMemoryInternalGatewayReplayStore {
    fn consume<'a>(
        &'a self,
        nonce: &'a str,
        retain_until: u64,
        now: u64,
    ) -> InternalGatewayReplayStoreFuture<'a> {
        Box::pin(async move {
            let mut nonces = self
                .nonces
                .lock()
                .map_err(|_| InternalGatewayAuthError::ReplayCacheUnavailable)?;
            nonces.retain(|_, expiry| *expiry >= now);
            if nonces.contains_key(nonce) {
                return Err(InternalGatewayAuthError::Replayed);
            }
            nonces.insert(nonce.to_owned(), retain_until);
            Ok(())
        })
    }
}

#[derive(Clone)]
pub struct InternalGatewayRequestSigner {
    signing_key: [u8; 32],
    request_ttl_seconds: u64,
}

impl InternalGatewayRequestSigner {
    pub fn new(signing_secret: impl AsRef<[u8]>, request_ttl_seconds: u64) -> Self {
        Self {
            signing_key: derive_signing_key(signing_secret.as_ref()),
            request_ttl_seconds,
        }
    }

    pub fn sign(
        &self,
        principal: InternalGatewayPrincipal,
        method: &str,
        path_and_query: &str,
        body: &[u8],
    ) -> Result<SignedInternalGatewayRequest, InternalGatewayAuthError> {
        self.sign_at(principal, method, path_and_query, body, unix_timestamp()?)
    }

    pub fn sign_at(
        &self,
        principal: InternalGatewayPrincipal,
        method: &str,
        path_and_query: &str,
        body: &[u8],
        issued_at: u64,
    ) -> Result<SignedInternalGatewayRequest, InternalGatewayAuthError> {
        let principal = principal.validate()?;
        let expires_at = issued_at
            .checked_add(self.request_ttl_seconds)
            .ok_or(InternalGatewayAuthError::InvalidTimestamp)?;
        let mut nonce = [0_u8; NONCE_BYTES];
        rand::thread_rng().fill_bytes(&mut nonce);
        let mut request = SignedInternalGatewayRequest {
            version: INTERNAL_GATEWAY_AUTH_VERSION.to_owned(),
            principal,
            issued_at,
            expires_at,
            nonce: base64url_encode(&nonce),
            body_sha256: sha256_hash(body),
            signature: String::new(),
        };
        request.signature = hmac_sha256_base64url(
            canonical_request(&request, method, path_and_query).as_bytes(),
            &self.signing_key,
        );
        Ok(request)
    }
}

#[derive(Clone)]
pub struct InternalGatewayRequestVerifier {
    signing_key: [u8; 32],
    request_ttl_seconds: u64,
    max_clock_skew_seconds: u64,
    replay_store: Arc<dyn InternalGatewayReplayStore>,
}

impl InternalGatewayRequestVerifier {
    pub fn new(
        signing_secret: impl AsRef<[u8]>,
        request_ttl_seconds: u64,
        max_clock_skew_seconds: u64,
    ) -> Self {
        Self {
            signing_key: derive_signing_key(signing_secret.as_ref()),
            request_ttl_seconds,
            max_clock_skew_seconds,
            replay_store: Arc::new(InMemoryInternalGatewayReplayStore::default()),
        }
    }

    pub fn with_replay_store(mut self, replay_store: Arc<dyn InternalGatewayReplayStore>) -> Self {
        self.replay_store = replay_store;
        self
    }

    pub async fn verify(
        &self,
        request: &SignedInternalGatewayRequest,
        method: &str,
        path_and_query: &str,
        body: &[u8],
    ) -> Result<InternalGatewayPrincipal, InternalGatewayAuthError> {
        self.verify_at(request, method, path_and_query, body, unix_timestamp()?)
            .await
    }

    pub async fn verify_at(
        &self,
        request: &SignedInternalGatewayRequest,
        method: &str,
        path_and_query: &str,
        body: &[u8],
        now: u64,
    ) -> Result<InternalGatewayPrincipal, InternalGatewayAuthError> {
        let principal = request.principal.validate()?;
        if request.version != INTERNAL_GATEWAY_AUTH_VERSION {
            return Err(InternalGatewayAuthError::InvalidVersion);
        }
        validate_nonce(&request.nonce)?;
        validate_timestamps(
            request.issued_at,
            request.expires_at,
            now,
            self.request_ttl_seconds,
            self.max_clock_skew_seconds,
        )?;
        if request.body_sha256.len() != BODY_SHA256_HEX_LEN
            || !secure_compare(&request.body_sha256, &sha256_hash(body))
        {
            return Err(InternalGatewayAuthError::InvalidBodyDigest);
        }
        let signature = base64url_decode(&request.signature)
            .ok_or(InternalGatewayAuthError::InvalidSignature)?;
        if !verify_hmac_sha256_base64url(
            canonical_request(request, method, path_and_query).as_bytes(),
            &self.signing_key,
            &signature,
        ) {
            return Err(InternalGatewayAuthError::InvalidSignature);
        }
        let retain_until = request
            .expires_at
            .saturating_add(self.max_clock_skew_seconds);
        self.replay_store
            .consume(&request.nonce, retain_until, now)
            .await?;
        Ok(principal)
    }
}

fn derive_signing_key(signing_secret: &[u8]) -> [u8; 32] {
    derive_aes_256_key(signing_secret, SIGNING_KEY_SALT, SIGNING_KEY_INFO)
}

fn canonical_request(
    request: &SignedInternalGatewayRequest,
    method: &str,
    path_and_query: &str,
) -> String {
    format!(
        "{}\n{}\n{}\n{}\n{}\n{}\n{}\n{}\n{}\n{}\n{}\n{}",
        request.version,
        request.principal.api_key_id,
        request.principal.tenant_id,
        request.principal.organization_id,
        request.principal.user_id,
        request.principal.account_group_id,
        method.trim().to_ascii_uppercase(),
        path_and_query,
        request.issued_at,
        request.expires_at,
        request.nonce,
        request.body_sha256,
    )
}

fn validate_nonce(nonce: &str) -> Result<(), InternalGatewayAuthError> {
    let decoded = base64url_decode(nonce).ok_or(InternalGatewayAuthError::InvalidNonce)?;
    if decoded.len() != NONCE_BYTES {
        return Err(InternalGatewayAuthError::InvalidNonce);
    }
    Ok(())
}

fn validate_timestamps(
    issued_at: u64,
    expires_at: u64,
    now: u64,
    request_ttl_seconds: u64,
    max_clock_skew_seconds: u64,
) -> Result<(), InternalGatewayAuthError> {
    if issued_at == 0 || expires_at <= issued_at {
        return Err(InternalGatewayAuthError::InvalidTimestamp);
    }
    if expires_at - issued_at > request_ttl_seconds {
        return Err(InternalGatewayAuthError::ExcessiveLifetime);
    }
    if issued_at > now.saturating_add(max_clock_skew_seconds) {
        return Err(InternalGatewayAuthError::InvalidTimestamp);
    }
    if expires_at.saturating_add(max_clock_skew_seconds) < now {
        return Err(InternalGatewayAuthError::Expired);
    }
    Ok(())
}

fn unix_timestamp() -> Result<u64, InternalGatewayAuthError> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .map_err(|_| InternalGatewayAuthError::ClockUnavailable)
}

#[cfg(test)]
mod tests {
    use super::*;

    const SECRET: &str = "internal-gateway-unit-test-secret-0123456789";

    fn principal() -> InternalGatewayPrincipal {
        InternalGatewayPrincipal {
            api_key_id: 101,
            tenant_id: 11,
            organization_id: 12,
            user_id: 13,
            account_group_id: 14,
        }
    }

    #[tokio::test]
    async fn signs_and_verifies_bound_request() {
        let signer = InternalGatewayRequestSigner::new(SECRET, 30);
        let verifier = InternalGatewayRequestVerifier::new(SECRET, 30, 5);
        let request = signer
            .sign_at(
                principal(),
                "POST",
                "/internal/v3/gateway/v1/chat/completions",
                br#"{"model":"gpt-5"}"#,
                1_000,
            )
            .unwrap();

        let verified = verifier
            .verify_at(
                &request,
                "POST",
                "/internal/v3/gateway/v1/chat/completions",
                br#"{"model":"gpt-5"}"#,
                1_005,
            )
            .await
            .unwrap();

        assert_eq!(principal(), verified);
        assert!(!format!("{request:?}").contains(&request.signature));
    }

    #[tokio::test]
    async fn rejects_tampering_expiry_and_replay() {
        let signer = InternalGatewayRequestSigner::new(SECRET, 30);
        let verifier = InternalGatewayRequestVerifier::new(SECRET, 30, 5);
        let request = signer
            .sign_at(
                principal(),
                "POST",
                "/internal/v3/gateway/v1/responses",
                b"{}",
                1_000,
            )
            .unwrap();

        assert_eq!(
            InternalGatewayAuthError::InvalidBodyDigest,
            verifier
                .verify_at(
                    &request,
                    "POST",
                    "/internal/v3/gateway/v1/responses",
                    b"{\"changed\":true}",
                    1_001,
                )
                .await
                .unwrap_err()
        );
        assert_eq!(
            InternalGatewayAuthError::InvalidSignature,
            verifier
                .verify_at(
                    &request,
                    "GET",
                    "/internal/v3/gateway/v1/responses",
                    b"{}",
                    1_001,
                )
                .await
                .unwrap_err()
        );
        verifier
            .verify_at(
                &request,
                "POST",
                "/internal/v3/gateway/v1/responses",
                b"{}",
                1_001,
            )
            .await
            .unwrap();
        assert_eq!(
            InternalGatewayAuthError::Replayed,
            verifier
                .verify_at(
                    &request,
                    "POST",
                    "/internal/v3/gateway/v1/responses",
                    b"{}",
                    1_002,
                )
                .await
                .unwrap_err()
        );

        let expired = signer
            .sign_at(
                principal(),
                "POST",
                "/internal/v3/gateway/v1/responses",
                b"{}",
                2_000,
            )
            .unwrap();
        assert_eq!(
            InternalGatewayAuthError::Expired,
            verifier
                .verify_at(
                    &expired,
                    "POST",
                    "/internal/v3/gateway/v1/responses",
                    b"{}",
                    2_036,
                )
                .await
                .unwrap_err()
        );
    }
}
