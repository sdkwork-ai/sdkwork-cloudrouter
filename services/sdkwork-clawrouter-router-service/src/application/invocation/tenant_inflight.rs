use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use sdkwork_claw_config::RedisConfig;

use super::{
    Invocation, InvocationError, InvocationErrorKind, InvocationFuture, InvocationInterceptor,
};

/// Configuration for the tenant in-flight concurrency limiter (H-9).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TenantInflightConfig {
    /// Maximum concurrent in-flight provider requests allowed per tenant.
    pub max_inflight: u32,
}

impl Default for TenantInflightConfig {
    fn default() -> Self {
        Self { max_inflight: 100 }
    }
}

/// Per-tenant in-flight request counter.
///
/// Acquire is called before dispatch and release after the response (or
/// error) is observed. Implementations must be safe for concurrent access
/// across gateway nodes.
#[async_trait::async_trait]
pub trait TenantInflightCounter: Send + Sync {
    /// Returns `true` when a new in-flight slot was acquired for `tenant_id`.
    async fn try_acquire(&self, tenant_id: i64) -> bool;

    /// Release an in-flight slot previously acquired for `tenant_id`.
    async fn release(&self, tenant_id: i64);

    /// Returns `true` when a distributed (Redis-backed) counter is active.
    fn is_distributed_ha(&self) -> bool;
}

/// Per-node in-flight counter backed by an in-memory map.
///
/// Acceptable for single-node/desktop deployments. Multi-node production
/// deployments should use [`RedisTenantInflightCounter`].
pub struct LocalTenantInflightCounter {
    max_inflight: u32,
    counters: Mutex<HashMap<i64, u32>>,
}

impl LocalTenantInflightCounter {
    pub fn new(config: TenantInflightConfig) -> Self {
        Self {
            max_inflight: config.max_inflight,
            counters: Mutex::new(HashMap::new()),
        }
    }
}

#[async_trait::async_trait]
impl TenantInflightCounter for LocalTenantInflightCounter {
    async fn try_acquire(&self, tenant_id: i64) -> bool {
        let mut counters = match self.counters.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        let entry = counters.entry(tenant_id).or_insert(0);
        if *entry >= self.max_inflight {
            return false;
        }
        *entry = entry.saturating_add(1);
        true
    }

    async fn release(&self, tenant_id: i64) {
        let mut counters = match self.counters.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        if let Some(entry) = counters.get_mut(&tenant_id) {
            *entry = entry.saturating_sub(1);
            if *entry == 0 {
                counters.remove(&tenant_id);
            }
        }
    }

    fn is_distributed_ha(&self) -> bool {
        false
    }
}

/// Redis-backed in-flight counter shared across gateway nodes.
///
/// Uses a Lua script to atomically increment-and-cap, and a TTL on the counter
/// key so a missed release (e.g. process crash) does not leak a slot forever.
pub struct RedisTenantInflightCounter {
    client: redis::Client,
    key_prefix: String,
    max_inflight: u32,
    ttl_seconds: u64,
}

impl RedisTenantInflightCounter {
    /// Attempt to create a Redis-backed counter. Returns `Err` when the Redis
    /// client cannot be constructed so the caller can fall back to local state.
    pub fn try_new(
        redis_config: &RedisConfig,
        config: TenantInflightConfig,
    ) -> Result<Self, String> {
        let client = redis::Client::open(redis_config.url()).map_err(|e| format!("{e}"))?;
        let prefix = redis_config.key_prefix().unwrap_or("clawrouter").to_owned();
        Ok(Self {
            client,
            key_prefix: format!("{prefix}:tenant_inflight"),
            max_inflight: config.max_inflight,
            // Slots auto-expire after 5 minutes so a crashed node does not hold
            // a tenant at its cap indefinitely.
            ttl_seconds: 5 * 60,
        })
    }

    fn redis_key(&self, tenant_id: i64) -> String {
        format!("{}:{tenant_id}", self.key_prefix)
    }

    fn lua_try_acquire() -> &'static str {
        r#"
        local key = KEYS[1]
        local max = tonumber(ARGV[1])
        local ttl = tonumber(ARGV[2])
        local current = tonumber(redis.call('GET', key) or '0')
        if current >= max then return 0 end
        local next = redis.call('INCR', key)
        if next == 1 then redis.call('EXPIRE', key, ttl) end
        return 1
        "#
    }

    fn lua_release() -> &'static str {
        r#"
        local key = KEYS[1]
        local current = tonumber(redis.call('GET', key) or '0')
        if current > 0 then
            redis.call('DECR', key)
        end
        return redis.call('GET', key) or '0'
        "#
    }
}

#[async_trait::async_trait]
impl TenantInflightCounter for RedisTenantInflightCounter {
    async fn try_acquire(&self, tenant_id: i64) -> bool {
        let Ok(mut conn) = self.client.get_multiplexed_async_connection().await else {
            // Fail-closed: when Redis is unreachable, reject the request rather
            // than allowing unbounded in-flight growth.
            return false;
        };
        let key = self.redis_key(tenant_id);
        let result: Result<i64, _> = redis::cmd("EVAL")
            .arg(Self::lua_try_acquire())
            .arg(1)
            .arg(&key)
            .arg(self.max_inflight as i64)
            .arg(self.ttl_seconds as i64)
            .query_async(&mut conn)
            .await;
        result.map(|value| value == 1).unwrap_or(false)
    }

    async fn release(&self, tenant_id: i64) {
        let Ok(mut conn) = self.client.get_multiplexed_async_connection().await else {
            return;
        };
        let key = self.redis_key(tenant_id);
        let _: Result<String, _> = redis::cmd("EVAL")
            .arg(Self::lua_release())
            .arg(1)
            .arg(&key)
            .query_async(&mut conn)
            .await;
    }

    fn is_distributed_ha(&self) -> bool {
        true
    }
}

/// Interceptor that bounds the number of concurrent in-flight provider
/// requests per tenant (H-9).
///
/// Acquires a slot in `before` and releases it in `after`/`on_error`. When the
/// configured `max_inflight` is exceeded the request is rejected with an
/// `InvocationErrorKind::RateLimit` error (HTTP 429).
pub struct TenantInflightInterceptor {
    counter: Arc<dyn TenantInflightCounter>,
    acquired: Mutex<HashMap<String, i64>>,
}

impl TenantInflightInterceptor {
    pub fn new(counter: Arc<dyn TenantInflightCounter>) -> Self {
        Self {
            counter,
            acquired: Mutex::new(HashMap::new()),
        }
    }

    /// Build an interceptor with a Redis-backed counter when `redis_config`
    /// resolves, otherwise a local per-node counter.
    pub fn try_with_redis_config(
        redis_config: Option<&RedisConfig>,
        config: TenantInflightConfig,
    ) -> Self {
        let counter: Arc<dyn TenantInflightCounter> = match redis_config {
            Some(rc) => match RedisTenantInflightCounter::try_new(rc, config) {
                Ok(store) => Arc::new(store),
                Err(error) => {
                    tracing::warn!(
                        error = %error,
                        tenant_inflight_redis_degraded = 1,
                        "tenant in-flight Redis counter unavailable; falling back to local \
                         per-node counter"
                    );
                    Arc::new(LocalTenantInflightCounter::new(config))
                }
            },
            None => Arc::new(LocalTenantInflightCounter::new(config)),
        };
        Self::new(counter)
    }

    fn remember_acquired(&self, request_id: &str, tenant_id: i64) {
        let mut acquired = match self.acquired.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        acquired.insert(request_id.to_owned(), tenant_id);
    }

    fn take_acquired(&self, request_id: &str) -> Option<i64> {
        let mut acquired = match self.acquired.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        acquired.remove(request_id)
    }
}

impl InvocationInterceptor for TenantInflightInterceptor {
    fn name(&self) -> &str {
        "tenant_inflight"
    }

    fn observe_pipeline_errors(&self) -> bool {
        true
    }

    fn before<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        let counter = self.counter.clone();
        let max_inflight_hint = invocation.subject.tenant_id;
        Box::pin(async move {
            let tenant_id = invocation.subject.tenant_id;
            if !counter.try_acquire(tenant_id).await {
                tracing::warn!(
                    tenant_id,
                    max_inflight_hint,
                    "tenant in-flight concurrency limit exceeded"
                );
                return Err(InvocationError::new(
                    InvocationErrorKind::RateLimit,
                    "tenant in-flight concurrency limit exceeded",
                ));
            }
            self.remember_acquired(&invocation.id.0, tenant_id);
            Ok(())
        })
    }

    fn after<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        let counter = self.counter.clone();
        Box::pin(async move {
            if let Some(tenant_id) = self.take_acquired(&invocation.id.0) {
                counter.release(tenant_id).await;
            }
            Ok(())
        })
    }

    fn on_error<'a>(
        &'a self,
        invocation: &'a mut Invocation,
        _error: &'a InvocationError,
    ) -> InvocationFuture<'a, ()> {
        let counter = self.counter.clone();
        Box::pin(async move {
            if let Some(tenant_id) = self.take_acquired(&invocation.id.0) {
                counter.release(tenant_id).await;
            }
            Ok(())
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn local_counter_enforces_cap() {
        let counter = LocalTenantInflightCounter::new(TenantInflightConfig { max_inflight: 2 });
        assert!(counter.try_acquire(1).await);
        assert!(counter.try_acquire(1).await);
        assert!(!counter.try_acquire(1).await);
        counter.release(1).await;
        assert!(counter.try_acquire(1).await);
    }

    #[tokio::test]
    async fn local_counter_isolates_tenants() {
        let counter = LocalTenantInflightCounter::new(TenantInflightConfig { max_inflight: 1 });
        assert!(counter.try_acquire(1).await);
        // Tenant 2 has its own independent slot.
        assert!(counter.try_acquire(2).await);
        assert!(!counter.try_acquire(1).await);
        counter.release(2).await;
        assert!(counter.try_acquire(2).await);
    }

    #[tokio::test]
    async fn local_counter_release_cleans_up_zero_entries() {
        let counter = LocalTenantInflightCounter::new(TenantInflightConfig { max_inflight: 5 });
        assert!(counter.try_acquire(7).await);
        counter.release(7).await;
        assert_eq!(counter.counters.lock().unwrap().contains_key(&7), false);
    }

    #[test]
    fn tenant_inflight_config_default() {
        assert_eq!(TenantInflightConfig::default().max_inflight, 100);
    }
}
