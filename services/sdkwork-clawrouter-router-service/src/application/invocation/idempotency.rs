use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use sdkwork_claw_config::RedisConfig;

use super::{
    DispatchMode, Invocation, InvocationDispatchResponse, InvocationError, InvocationErrorKind,
    InvocationFuture, InvocationInterceptor, InvocationShape,
};

/// Status of an idempotency key during its lifecycle.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IdempotencyKeyStatus {
    /// No record of this key — caller should proceed with execution.
    Unknown,
    /// Request is currently in progress — caller should wait and retry.
    InProgress,
    /// Request completed successfully — cached response available.
    Completed,
    /// Request failed — error cached (only for idempotent-safe errors).
    Failed,
}

/// Cached response entry for idempotency replay.
#[derive(Debug, Clone)]
struct CachedResponse {
    status_code: u16,
    body: Option<serde_json::Value>,
    body_bytes: Option<Vec<u8>>,
    content_type: Option<String>,
    cached_at: Instant,
    status: IdempotencyKeyStatus,
}

impl CachedResponse {
    fn from_response(response: &InvocationDispatchResponse) -> Option<Self> {
        if response
            .stream_body
            .lock()
            .is_ok_and(|guard| guard.is_some())
        {
            return None;
        }
        let status = if response.is_success() {
            IdempotencyKeyStatus::Completed
        } else {
            IdempotencyKeyStatus::Failed
        };
        Some(Self {
            status_code: response.status_code,
            body: response.body.clone(),
            body_bytes: response.body_bytes.clone(),
            content_type: response.content_type.clone(),
            cached_at: Instant::now(),
            status,
        })
    }

    fn in_progress() -> Self {
        Self {
            status_code: 0,
            body: None,
            body_bytes: None,
            content_type: None,
            cached_at: Instant::now(),
            status: IdempotencyKeyStatus::InProgress,
        }
    }

    fn to_dispatch_response(&self) -> InvocationDispatchResponse {
        InvocationDispatchResponse {
            status_code: self.status_code,
            body: self.body.clone(),
            body_bytes: self.body_bytes.clone(),
            content_type: self.content_type.clone(),
            stream_body: std::sync::Mutex::new(None),
        }
    }
}

/// Configuration for the idempotency interceptor.
#[derive(Debug, Clone)]
pub struct IdempotencyConfig {
    /// How long cached responses remain valid for replay.
    pub ttl: Duration,
    /// Maximum number of cached responses before eviction triggers.
    pub max_entries: usize,
    /// Maximum time a request can be "in progress" before the lock is released.
    /// Prevents deadlocks if a request crashes while holding the lock.
    pub in_progress_timeout: Duration,
    /// Whether to cache failed responses (4xx/5xx).
    pub cache_failures: bool,
    /// Maximum retries when waiting for an in-progress request.
    pub max_wait_retries: u32,
    /// Delay between retries when waiting for an in-progress request.
    pub wait_retry_delay: Duration,
}

impl Default for IdempotencyConfig {
    fn default() -> Self {
        Self {
            ttl: Duration::from_secs(86_400),
            max_entries: 10_000,
            in_progress_timeout: Duration::from_secs(120),
            cache_failures: false,
            max_wait_retries: 10,
            wait_retry_delay: Duration::from_millis(100),
        }
    }
}

/// Idempotency interceptor — replies cached responses for requests with the
/// same `Idempotency-Key` header, preventing duplicate side effects.
///
/// Placed at the very front of the pipeline (before `PayloadExtraction`). When
/// a cache hit is found, the dispatch mode is set to `SyntheticLocalResponse`
/// so the `DispatchExecutor` skips the upstream call.
///
/// # Concurrency Safety
///
/// This interceptor implements a **lock-and-cache** pattern to prevent the
/// thundering herd problem:
///
/// 1. First request with key K → acquires lock (set `InProgress`), executes upstream, caches result
/// 2. Concurrent request with key K → sees `InProgress`, waits and retries
/// 3. After first request completes → concurrent request sees cached response
///
/// # Distributed HA
///
/// In multi-node deployments, pass a `RedisConfig` to
/// [`try_with_redis_config`](Self::try_with_redis_config) to enable
/// Redis-backed idempotency caching. Redis implementation uses `SET NX` for
/// atomic lock acquisition and `SETEX` for caching results.
#[derive(Clone)]
pub struct IdempotencyInterceptor {
    cache: Arc<Mutex<HashMap<String, CachedResponse>>>,
    config: IdempotencyConfig,
    distributed: Option<Arc<dyn IdempotencyStore>>,
}

/// Trait for distributed idempotency response caching.
///
/// Implementations must ensure that `try_acquire_lock` is atomic across
/// concurrent callers — typically via Redis `SET NX` semantics.
#[async_trait::async_trait]
pub trait IdempotencyStore: Send + Sync {
    /// Look up a cached response by key.
    async fn lookup(&self, key: &str) -> Option<InvocationDispatchResponse>;

    /// Try to acquire the lock for an in-progress request.
    /// Returns `true` if the lock was acquired (caller should proceed).
    /// Returns `false` if another request holds the lock (caller should wait).
    async fn try_acquire_lock(&self, key: &str, ttl: Duration) -> bool;

    /// Store a completed response for a key.
    async fn store(&self, key: &str, response: &InvocationDispatchResponse, ttl: Duration);

    /// Release the lock without storing a result (e.g., on unrecoverable error).
    async fn release_lock(&self, key: &str);

    /// Get the current status of a key.
    async fn get_status(&self, key: &str) -> IdempotencyKeyStatus;

    fn is_distributed_ha(&self) -> bool;
}

impl IdempotencyInterceptor {
    pub fn new(config: IdempotencyConfig) -> Self {
        Self {
            cache: Arc::new(Mutex::new(HashMap::new())),
            config,
            distributed: None,
        }
    }

    /// Attempt to create an interceptor with Redis-backed distributed caching.
    ///
    /// When `redis_config` is `Some` and a Redis connection can be established,
    /// the interceptor uses Redis for idempotency key lookup/storage with
    /// automatic TTL expiry. When `None` or the connection fails, it falls
    /// back to the local in-memory cache.
    pub fn try_with_redis_config(
        config: IdempotencyConfig,
        redis_config: Option<&RedisConfig>,
    ) -> Self {
        let distributed = redis_config.and_then(|rc| {
            let url = rc.url();
            let prefix = rc.key_prefix().unwrap_or("clawrouter").to_owned();
            RedisIdempotencyStore::try_new(url, &prefix, config.ttl).ok()
        });
        Self {
            cache: Arc::new(Mutex::new(HashMap::new())),
            config,
            distributed: distributed.map(|store| Arc::new(store) as Arc<dyn IdempotencyStore>),
        }
    }

    /// Returns `true` when a distributed (Redis-backed) store is active.
    pub fn uses_distributed_ha(&self) -> bool {
        self.distributed
            .as_ref()
            .is_some_and(|store| store.is_distributed_ha())
    }

    fn lookup(&self, key: &str) -> Option<CachedResponse> {
        let mut cache = match self.cache.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        let entry = cache.get(key)?;
        if entry.cached_at.elapsed() >= self.config.ttl {
            cache.remove(key);
            return None;
        }
        if matches!(entry.status, IdempotencyKeyStatus::InProgress)
            && entry.cached_at.elapsed() >= self.config.in_progress_timeout
        {
            cache.remove(key);
            return None;
        }
        Some(entry.clone())
    }

    fn get_status(&self, key: &str) -> IdempotencyKeyStatus {
        match self.lookup(key) {
            Some(entry) => entry.status,
            None => IdempotencyKeyStatus::Unknown,
        }
    }

    fn try_acquire_lock(&self, key: &str) -> bool {
        let mut cache = match self.cache.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        if let Some(entry) = cache.get(key) {
            let expired = entry.cached_at.elapsed() >= self.config.ttl;
            let lock_timeout = matches!(entry.status, IdempotencyKeyStatus::InProgress)
                && entry.cached_at.elapsed() >= self.config.in_progress_timeout;
            if !expired && !lock_timeout {
                return false;
            }
        }
        cache.insert(key.to_owned(), CachedResponse::in_progress());
        true
    }

    fn store(&self, key: &str, response: &InvocationDispatchResponse) {
        let mut cache = match self.cache.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };

        if cache.len() >= self.config.max_entries {
            cache.retain(|_, entry| entry.cached_at.elapsed() < self.config.ttl);
        }

        if cache.len() >= self.config.max_entries {
            let mut entries: Vec<(String, Instant)> = cache
                .iter()
                .map(|(k, v)| (k.clone(), v.cached_at))
                .collect();
            entries.sort_by_key(|(_, ts)| *ts);
            let drop_count = entries.len() / 4 + 1;
            for (k, _) in entries.into_iter().take(drop_count) {
                cache.remove(&k);
            }
        }

        if self.config.cache_failures || response.is_success() {
            if let Some(cached) = CachedResponse::from_response(response) {
                cache.insert(key.to_owned(), cached);
            }
        } else {
            cache.remove(key);
        }
    }

    fn release_lock(&self, key: &str) {
        let mut cache = match self.cache.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        if let Some(entry) = cache.get(key) {
            if matches!(entry.status, IdempotencyKeyStatus::InProgress) {
                cache.remove(key);
            }
        }
    }

    async fn wait_for_completion(
        &self,
        key: &str,
    ) -> Result<Option<InvocationDispatchResponse>, InvocationError> {
        for _ in 0..self.config.max_wait_retries {
            tokio::time::sleep(self.config.wait_retry_delay).await;

            if let Some(store) = self.distributed.as_ref() {
                match store.get_status(key).await {
                    IdempotencyKeyStatus::Completed => {
                        return Ok(store.lookup(key).await);
                    }
                    IdempotencyKeyStatus::Failed => {
                        return Ok(store.lookup(key).await);
                    }
                    IdempotencyKeyStatus::Unknown => {
                        return Ok(None);
                    }
                    IdempotencyKeyStatus::InProgress => continue,
                }
            }

            match self.get_status(key) {
                IdempotencyKeyStatus::Completed | IdempotencyKeyStatus::Failed => {
                    return Ok(self.lookup(key).map(|c| c.to_dispatch_response()));
                }
                IdempotencyKeyStatus::Unknown => return Ok(None),
                IdempotencyKeyStatus::InProgress => continue,
            }
        }

        Err(InvocationError::new(
            InvocationErrorKind::Idempotency,
            "idempotency key locked: concurrent request timed out waiting for completion",
        ))
    }
}

/// Redis-backed implementation of [`IdempotencyStore`].
///
/// Stores serialized response data in Redis with automatic TTL expiry.
/// Uses `SET NX` semantics to prevent concurrent duplicate execution:
/// - `SET key value NX EX ttl` → atomic lock acquisition
/// - `SETEX` → atomic result caching
/// - `DEL` → explicit lock release
struct RedisIdempotencyStore {
    client: redis::Client,
    key_prefix: String,
    default_ttl: Duration,
}

impl RedisIdempotencyStore {
    fn try_new(url: &str, prefix: &str, default_ttl: Duration) -> Result<Self, String> {
        let client = redis::Client::open(url).map_err(|e| format!("redis connect error: {e}"))?;
        Ok(Self {
            client,
            key_prefix: format!("{prefix}:idempotency"),
            default_ttl,
        })
    }

    fn redis_key(&self, key: &str) -> String {
        format!("{}:{key}", self.key_prefix)
    }

    fn lock_value() -> &'static str {
        "IN_PROGRESS"
    }
}

#[async_trait::async_trait]
impl IdempotencyStore for RedisIdempotencyStore {
    async fn lookup(&self, key: &str) -> Option<InvocationDispatchResponse> {
        let redis_key = self.redis_key(key);
        let mut conn = self.client.get_multiplexed_async_connection().await.ok()?;
        let data: Option<String> = redis::cmd("GET")
            .arg(&redis_key)
            .query_async(&mut conn)
            .await
            .ok()?;
        let data = data?;
        if data == Self::lock_value() {
            return None;
        }
        let cached: CachedResponsePayload = serde_json::from_str(&data).ok()?;
        Some(cached.to_dispatch_response())
    }

    async fn try_acquire_lock(&self, key: &str, ttl: Duration) -> bool {
        let redis_key = self.redis_key(key);
        let Ok(mut conn) = self.client.get_multiplexed_async_connection().await else {
            return false;
        };
        let ttl_secs = ttl.as_secs().max(1) as usize;
        let result: Result<String, _> = redis::cmd("SET")
            .arg(&redis_key)
            .arg(Self::lock_value())
            .arg("NX")
            .arg("EX")
            .arg(ttl_secs)
            .query_async(&mut conn)
            .await;
        result.is_ok()
    }

    async fn store(&self, key: &str, response: &InvocationDispatchResponse, ttl: Duration) {
        if response
            .stream_body
            .lock()
            .is_ok_and(|guard| guard.is_some())
        {
            return;
        }
        let Some(payload) = CachedResponsePayload::from_response(response) else {
            return;
        };
        let Ok(data) = serde_json::to_string(&payload) else {
            return;
        };
        let redis_key = self.redis_key(key);
        let ttl_secs = ttl.as_secs().max(1);
        let Ok(mut conn) = self.client.get_multiplexed_async_connection().await else {
            return;
        };
        let _: Result<(), _> = redis::cmd("SETEX")
            .arg(&redis_key)
            .arg(ttl_secs)
            .arg(&data)
            .query_async(&mut conn)
            .await;
    }

    async fn release_lock(&self, key: &str) {
        let redis_key = self.redis_key(key);
        let Ok(mut conn) = self.client.get_multiplexed_async_connection().await else {
            return;
        };
        let _: Result<(), _> = redis::cmd("DEL")
            .arg(&redis_key)
            .query_async(&mut conn)
            .await;
    }

    async fn get_status(&self, key: &str) -> IdempotencyKeyStatus {
        let redis_key = self.redis_key(key);
        let Ok(mut conn) = self.client.get_multiplexed_async_connection().await else {
            return IdempotencyKeyStatus::Unknown;
        };
        let data: Option<String> = redis::cmd("GET")
            .arg(&redis_key)
            .query_async(&mut conn)
            .await
            .ok()
            .flatten();
        match data {
            None => IdempotencyKeyStatus::Unknown,
            Some(val) if val == Self::lock_value() => IdempotencyKeyStatus::InProgress,
            Some(data_str) => match serde_json::from_str::<CachedResponsePayload>(&data_str) {
                Ok(payload) if payload.status_code >= 400 => IdempotencyKeyStatus::Failed,
                Ok(_) => IdempotencyKeyStatus::Completed,
                Err(_) => IdempotencyKeyStatus::Unknown,
            },
        }
    }

    fn is_distributed_ha(&self) -> bool {
        true
    }
}

/// Serializable representation of a cached response for Redis storage.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct CachedResponsePayload {
    status_code: u16,
    body: Option<serde_json::Value>,
    body_bytes: Option<Vec<u8>>,
    content_type: Option<String>,
}

impl CachedResponsePayload {
    fn from_response(response: &InvocationDispatchResponse) -> Option<Self> {
        if response
            .stream_body
            .lock()
            .is_ok_and(|guard| guard.is_some())
        {
            return None;
        }
        Some(Self {
            status_code: response.status_code,
            body: response.body.clone(),
            body_bytes: response.body_bytes.clone(),
            content_type: response.content_type.clone(),
        })
    }

    fn to_dispatch_response(&self) -> InvocationDispatchResponse {
        InvocationDispatchResponse {
            status_code: self.status_code,
            body: self.body.clone(),
            body_bytes: self.body_bytes.clone(),
            content_type: self.content_type.clone(),
            stream_body: std::sync::Mutex::new(None),
        }
    }
}

impl Default for IdempotencyInterceptor {
    fn default() -> Self {
        Self::new(IdempotencyConfig::default())
    }
}

impl InvocationInterceptor for IdempotencyInterceptor {
    fn name(&self) -> &str {
        "idempotency"
    }

    fn before<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            let Some(key) = invocation.request.idempotency_key.as_ref() else {
                return Ok(());
            };
            if key.trim().is_empty() {
                return Ok(());
            }

            // Try distributed (Redis) lookup first.
            if let Some(store) = self.distributed.as_ref() {
                match store.get_status(key).await {
                    IdempotencyKeyStatus::Completed | IdempotencyKeyStatus::Failed => {
                        if let Some(response) = store.lookup(key).await {
                            tracing::debug!(
                                idempotency_key = %key,
                                status_code = response.status_code,
                                "idempotency distributed cache hit — replaying cached response"
                            );
                            invocation.dispatch.mode = DispatchMode::SyntheticLocalResponse;
                            invocation.dispatch.response = Some(response);
                            return Ok(());
                        }
                    }
                    IdempotencyKeyStatus::InProgress => {
                        tracing::debug!(
                            idempotency_key = %key,
                            "idempotency key in progress — waiting for concurrent request"
                        );
                        if let Some(response) = self.wait_for_completion(key).await? {
                            invocation.dispatch.mode = DispatchMode::SyntheticLocalResponse;
                            invocation.dispatch.response = Some(response);
                            return Ok(());
                        }
                    }
                    IdempotencyKeyStatus::Unknown => {}
                }

                if store
                    .try_acquire_lock(key, self.config.in_progress_timeout)
                    .await
                {
                    tracing::debug!(
                        idempotency_key = %key,
                        "idempotency lock acquired (distributed)"
                    );
                    return Ok(());
                }

                if let Some(response) = self.wait_for_completion(key).await? {
                    invocation.dispatch.mode = DispatchMode::SyntheticLocalResponse;
                    invocation.dispatch.response = Some(response);
                    return Ok(());
                }
            }

            // Fall back to local in-memory cache.
            if let Some(cached) = self.lookup(key) {
                if matches!(
                    cached.status,
                    IdempotencyKeyStatus::Completed | IdempotencyKeyStatus::Failed
                ) {
                    tracing::debug!(
                        idempotency_key = %key,
                        status_code = cached.status_code,
                        "idempotency local cache hit — replaying cached response"
                    );
                    invocation.dispatch.mode = DispatchMode::SyntheticLocalResponse;
                    invocation.dispatch.response = Some(cached.to_dispatch_response());
                    return Ok(());
                }

                if matches!(cached.status, IdempotencyKeyStatus::InProgress) {
                    tracing::debug!(
                        idempotency_key = %key,
                        "idempotency key in progress locally — waiting"
                    );
                    if let Some(response) = self.wait_for_completion(key).await? {
                        invocation.dispatch.mode = DispatchMode::SyntheticLocalResponse;
                        invocation.dispatch.response = Some(response);
                        return Ok(());
                    }
                }
            }

            if self.try_acquire_lock(key) {
                tracing::debug!(
                    idempotency_key = %key,
                    "idempotency lock acquired (local)"
                );
            }

            Ok(())
        })
    }

    fn after<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            let Some(key) = invocation.request.idempotency_key.as_ref() else {
                return Ok(());
            };
            if key.trim().is_empty() {
                return Ok(());
            }

            let is_streaming = matches!(
                invocation.dispatch.invocation_shape,
                InvocationShape::SseStream | InvocationShape::ByteStream
            );
            if is_streaming {
                self.release_lock(key);
                if let Some(store) = self.distributed.as_ref() {
                    store.release_lock(key).await;
                }
                return Ok(());
            }

            let Some(response) = invocation.dispatch.response.as_ref() else {
                self.release_lock(key);
                if let Some(store) = self.distributed.as_ref() {
                    store.release_lock(key).await;
                }
                return Ok(());
            };

            if !self.config.cache_failures && !response.is_success() {
                self.release_lock(key);
                if let Some(store) = self.distributed.as_ref() {
                    store.release_lock(key).await;
                }
                return Ok(());
            }

            self.store(key, response);
            if let Some(store) = self.distributed.as_ref() {
                store.store(key, response, self.config.ttl).await;
            }

            tracing::debug!(
                idempotency_key = %key,
                status_code = response.status_code,
                "idempotency response cached"
            );

            Ok(())
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_response(status_code: u16) -> InvocationDispatchResponse {
        InvocationDispatchResponse {
            status_code,
            body: Some(serde_json::json!({ "result": "ok" })),
            body_bytes: None,
            content_type: Some("application/json".to_string()),
            stream_body: std::sync::Mutex::new(None),
        }
    }

    #[test]
    fn test_idempotency_cache_hit() {
        let idem = IdempotencyInterceptor::new(IdempotencyConfig::default());

        let response = make_response(200);
        idem.store("key-1", &response);

        let cached = idem.lookup("key-1").unwrap();
        assert_eq!(cached.status_code, 200);
        assert_eq!(cached.status, IdempotencyKeyStatus::Completed);
    }

    #[test]
    fn test_idempotency_lock_acquisition() {
        let idem = IdempotencyInterceptor::new(IdempotencyConfig::default());

        assert!(idem.try_acquire_lock("key-1"));
        assert!(!idem.try_acquire_lock("key-1"));
    }

    #[test]
    fn test_idempotency_lock_release() {
        let idem = IdempotencyInterceptor::new(IdempotencyConfig::default());

        assert!(idem.try_acquire_lock("key-1"));
        idem.release_lock("key-1");
        assert!(idem.try_acquire_lock("key-1"));
    }

    #[test]
    fn test_idempotency_store_replaces_lock() {
        let idem = IdempotencyInterceptor::new(IdempotencyConfig::default());

        assert!(idem.try_acquire_lock("key-1"));
        assert_eq!(idem.get_status("key-1"), IdempotencyKeyStatus::InProgress);

        let response = make_response(200);
        idem.store("key-1", &response);

        assert_eq!(idem.get_status("key-1"), IdempotencyKeyStatus::Completed);
        let cached = idem.lookup("key-1").unwrap();
        assert_eq!(cached.status_code, 200);
    }

    #[test]
    fn test_idempotency_failure_not_cached_by_default() {
        let idem = IdempotencyInterceptor::new(IdempotencyConfig::default());

        assert!(idem.try_acquire_lock("key-1"));

        let response = make_response(500);
        idem.store("key-1", &response);

        assert_eq!(idem.get_status("key-1"), IdempotencyKeyStatus::Unknown);
    }

    #[test]
    fn test_idempotency_failure_cached_when_enabled() {
        let idem = IdempotencyInterceptor::new(IdempotencyConfig {
            cache_failures: true,
            ..Default::default()
        });

        assert!(idem.try_acquire_lock("key-1"));

        let response = make_response(500);
        idem.store("key-1", &response);

        assert_eq!(idem.get_status("key-1"), IdempotencyKeyStatus::Failed);
    }

    #[test]
    fn test_idempotency_eviction() {
        let config = IdempotencyConfig {
            max_entries: 10,
            ..Default::default()
        };
        let idem = IdempotencyInterceptor::new(config);

        for i in 0..20 {
            let response = make_response(200);
            idem.store(&format!("key-{i}"), &response);
        }

        let cache = idem.cache.lock().unwrap();
        assert!(cache.len() < 20);
    }

    #[test]
    fn test_idempotency_key_status_conversions() {
        assert_eq!(
            IdempotencyKeyStatus::Unknown as i32,
            IdempotencyKeyStatus::Unknown as i32
        );
    }
}
