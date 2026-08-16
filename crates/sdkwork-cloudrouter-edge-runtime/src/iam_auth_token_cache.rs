//! Short-TTL Redis cache for SDKWork auth-token resolution.
//!
//! `IamAuthTokenAuthenticator` resolves a non-API-key bearer credential against
//! the IAM database on every OpenAI-compatible chat completion. Under high
//! concurrency this makes the per-request RPS proportional to IAM database
//! throughput. The cache stores the resolved identity (`tenant_id`,
//! `organization_id`, `user_id`) keyed by a token hash for a short TTL so
//! repeated requests from the same session skip the database round-trip while
//! the catalog group lookup (in-memory snapshot) still runs fresh.
//!
//! Safety contract (`IAM_SPEC.md` / `SECURITY_SPEC.md`):
//!
//! - Only successful resolutions are cached; failures (`invalid_auth_token`,
//!   parse errors) are never written so a transient bad token cannot lock a
//!   user out.
//! - The TTL is short (default 10s, configurable via
//!   `SDKWORK_CLOUDROUTER_AUTH_TOKEN_CACHE_TTL_SECONDS`; `0` disables caching)
//!   so a revoked or rotated token is honored within the TTL window.
//! - Redis errors fail open: a cache miss or write failure falls back to the
//!   authoritative database resolution, never to an unauthenticated response.

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use redis::aio::ConnectionManager;
use redis::AsyncCommands;
use sdkwork_cloudrouter_config::{RedisConfig, RuntimeTomlConfig};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// Default short TTL for cached auth-token identities. Kept small so revoked
/// or rotated tokens are honored within this window. Production deployments
/// requiring stricter revocation latency can lower
/// `SDKWORK_CLOUDROUTER_AUTH_TOKEN_CACHE_TTL_SECONDS`.
const DEFAULT_AUTH_TOKEN_CACHE_TTL_SECONDS: u64 = 10;

/// Maximum accepted TTL; guards against an operator misconfiguration that
/// would let stale identities linger long enough to matter for security.
const MAX_AUTH_TOKEN_CACHE_TTL_SECONDS: u64 = 300;

/// Resolved identity cached for an auth-token credential. Only the primitive
/// fields consumed by the authenticator are stored; group/pricing resolution
/// is always re-run against the in-memory catalog snapshot.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CachedAuthTokenIdentity {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
}

/// Auth-token identity cache port. The `None` variant (no Redis / disabled)
/// is represented by omitting the cache from the authenticator, so every
/// implementation must be a real, active cache.
#[async_trait]
pub trait AuthTokenCache: Send + Sync {
    /// Returns a cached identity for the credential pair, or `None` on miss
    /// or any cache error (fail-open).
    async fn get(&self, raw_bearer_token: &str, access_token: Option<&str>) -> Option<CachedAuthTokenIdentity>;

    /// Stores a freshly resolved identity. Best-effort: write errors are
    /// logged and ignored so they never fail the request.
    async fn set(&self, raw_bearer_token: &str, access_token: Option<&str>, identity: &CachedAuthTokenIdentity);
}

/// Redis-backed auth-token identity cache.
pub struct RedisAuthTokenCache {
    conn: ConnectionManager,
    key_prefix: String,
    ttl: Duration,
}

impl RedisAuthTokenCache {
    pub fn new(conn: ConnectionManager, key_prefix: String, ttl: Duration) -> Self {
        Self {
            conn,
            key_prefix,
            ttl,
        }
    }

    fn cache_key(&self, raw_bearer_token: &str, access_token: Option<&str>) -> String {
        auth_token_cache_key(&self.key_prefix, raw_bearer_token, access_token)
    }
}

/// Builds an opaque Redis key for the credential pair. Extracted from the
/// method so key derivation can be unit-tested without a live connection.
fn auth_token_cache_key(key_prefix: &str, raw_bearer_token: &str, access_token: Option<&str>) -> String {
    let mut hasher = Sha256::new();
    hasher.update(b"cloudrouter-auth-token:v1:");
    hasher.update(raw_bearer_token);
    hasher.update(b"\0");
    hasher.update(access_token.unwrap_or(""));
    format!("{}{}", key_prefix, hex::encode(hasher.finalize()))
}

#[async_trait]
impl AuthTokenCache for RedisAuthTokenCache {
    async fn get(&self, raw_bearer_token: &str, access_token: Option<&str>) -> Option<CachedAuthTokenIdentity> {
        let key = self.cache_key(raw_bearer_token, access_token);
        // ConnectionManager clones share the pooled connection; the mutable
        // receiver is a per-call handle (mirrors the accounting retry queue).
        let mut conn = self.conn.clone();
        let value: Option<String> = conn.get(&key).await.ok();
        value
            .as_deref()
            .and_then(|value| serde_json::from_str::<CachedAuthTokenIdentity>(value).ok())
            .or_else(|| {
                tracing::debug!("auth token cache miss");
                None
            })
    }

    async fn set(&self, raw_bearer_token: &str, access_token: Option<&str>, identity: &CachedAuthTokenIdentity) {
        let key = self.cache_key(raw_bearer_token, access_token);
        let Ok(value) = serde_json::to_string(identity) else {
            return;
        };
        let ttl_seconds = self.ttl.as_secs().max(1);
        let mut conn = self.conn.clone();
        if let Err(error) = conn.set_ex::<_, _, ()>(&key, value, ttl_seconds).await {
            tracing::debug!(error_kind = redis_error_kind(&error), "auth token cache write failed; failing open");
        }
    }
}

/// Resolves the auth-token cache from the runtime TOML config and process
/// environment. Returns `None` when Redis is unavailable, caching is disabled
/// (`SDKWORK_CLOUDROUTER_AUTH_TOKEN_CACHE_TTL_SECONDS=0`), or the Redis
/// connection cannot be established — in all cases the authenticator falls
/// back to per-request database resolution.
pub async fn resolve_auth_token_cache(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Option<Arc<dyn AuthTokenCache>> {
    let ttl_seconds = auth_token_cache_ttl_seconds();
    if ttl_seconds == 0 {
        return None;
    }
    let redis_config = RedisConfig::from_env_or_runtime_toml(runtime_toml).ok().flatten()?;
    let url = redis_config.url();
    let client = redis::Client::open(url).ok()?;
    let conn = ConnectionManager::new(client).await.ok()?;
    let key_prefix = format!(
        "{}:auth-token:",
        redis_config.key_prefix().unwrap_or("sdkwork:cloudrouter:web")
    );
    let ttl = Duration::from_secs(ttl_seconds.min(MAX_AUTH_TOKEN_CACHE_TTL_SECONDS));
    Some(Arc::new(RedisAuthTokenCache::new(conn, key_prefix, ttl)))
}

fn auth_token_cache_ttl_seconds() -> u64 {
    std::env::var("SDKWORK_CLOUDROUTER_AUTH_TOKEN_CACHE_TTL_SECONDS")
        .ok()
        .and_then(|value| value.trim().parse::<u64>().ok())
        .unwrap_or(DEFAULT_AUTH_TOKEN_CACHE_TTL_SECONDS)
}

fn redis_error_kind(error: &redis::RedisError) -> &'static str {
    match error.kind() {
        redis::ErrorKind::Parse => "parse",
        redis::ErrorKind::AuthenticationFailed => "auth",
        redis::ErrorKind::UnexpectedReturnType => "type",
        redis::ErrorKind::InvalidClientConfig => "client_config",
        redis::ErrorKind::Io => "io",
        redis::ErrorKind::Client => "client",
        redis::ErrorKind::Extension => "extension",
        redis::ErrorKind::Server(server_kind) => match server_kind {
            redis::ServerErrorKind::BusyLoading => "busy_loading",
            redis::ServerErrorKind::Moved => "moved",
            redis::ServerErrorKind::Ask => "ask",
            redis::ServerErrorKind::TryAgain => "try_again",
            redis::ServerErrorKind::ClusterDown => "cluster_down",
            redis::ServerErrorKind::ReadOnly => "read_only",
            _ => "server",
        },
        _ => "unknown",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const KEY_PREFIX: &str = "sdkwork:cloudrouter:web:auth-token:";

    #[test]
    fn cache_key_is_stable_and_credential_pair_scoped() {
        let a = auth_token_cache_key(KEY_PREFIX, "bearer-1", Some("access-1"));
        let b = auth_token_cache_key(KEY_PREFIX, "bearer-1", Some("access-1"));
        assert_eq!(a, b);
        assert_ne!(a, auth_token_cache_key(KEY_PREFIX, "bearer-1", None));
        assert_ne!(a, auth_token_cache_key(KEY_PREFIX, "bearer-2", Some("access-1")));
        assert!(a.starts_with(KEY_PREFIX));
        // The raw credential must not appear in the opaque key.
        assert!(!a.contains("bearer"));
        assert!(!a.contains("access"));
    }

    #[test]
    fn cached_identity_round_trips_through_serde() {
        let identity = CachedAuthTokenIdentity {
            tenant_id: 100_001,
            organization_id: 0,
            user_id: 42,
        };
        let value = serde_json::to_string(&identity).unwrap();
        let parsed: CachedAuthTokenIdentity = serde_json::from_str(&value).unwrap();
        assert_eq!(identity, parsed);
    }

    #[test]
    fn default_ttl_is_short_and_security_bounded() {
        std::env::remove_var("SDKWORK_CLOUDROUTER_AUTH_TOKEN_CACHE_TTL_SECONDS");
        assert_eq!(DEFAULT_AUTH_TOKEN_CACHE_TTL_SECONDS, 10);
        assert!(DEFAULT_AUTH_TOKEN_CACHE_TTL_SECONDS <= MAX_AUTH_TOKEN_CACHE_TTL_SECONDS);
    }

    #[tokio::test]
    async fn zero_ttl_short_circuits_to_no_cache_without_touching_redis() {
        std::env::set_var("SDKWORK_CLOUDROUTER_AUTH_TOKEN_CACHE_TTL_SECONDS", "0");
        let cache = resolve_auth_token_cache(None).await;
        std::env::remove_var("SDKWORK_CLOUDROUTER_AUTH_TOKEN_CACHE_TTL_SECONDS");
        assert!(cache.is_none(), "a zero TTL must disable the cache before any Redis attempt");
    }
}
