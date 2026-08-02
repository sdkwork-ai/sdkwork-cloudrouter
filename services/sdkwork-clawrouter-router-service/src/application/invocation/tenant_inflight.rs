use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use redis::aio::ConnectionManager;
use sdkwork_claw_config::RedisConfig;

use super::{
    Invocation, InvocationCancellationSignal, InvocationError, InvocationErrorKind,
    InvocationFuture, InvocationInterceptor,
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
    /// Returns `true` when a new in-flight lease was acquired. Re-acquiring
    /// the same lease is idempotent and must not consume another slot.
    async fn try_acquire(&self, lease: &TenantInflightLease) -> bool;

    /// Renews an existing lease. A missing or expired lease must not be
    /// recreated by renewal.
    async fn renew(&self, lease: &TenantInflightLease) -> TenantInflightRenewal;

    /// Releases only the slot owned by `lease`.
    async fn release(&self, lease: &TenantInflightLease);

    /// Renewal cadence for expiring distributed leases. Local counters do not
    /// expire and therefore return `None`.
    fn renewal_interval(&self) -> Option<Duration>;

    /// Returns `true` when a distributed (Redis-backed) counter is active.
    fn is_distributed_ha(&self) -> bool;
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TenantInflightRenewal {
    Renewed,
    LeaseLost,
    Unavailable,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TenantInflightLease {
    tenant_id: i64,
    owner_token: String,
}

impl TenantInflightLease {
    fn new(tenant_id: i64, owner_token: String) -> Self {
        Self {
            tenant_id,
            owner_token,
        }
    }
}

/// Per-node in-flight counter backed by an in-memory map.
///
/// Acceptable for single-node/desktop deployments. Multi-node production
/// deployments should use [`RedisTenantInflightCounter`].
pub struct LocalTenantInflightCounter {
    max_inflight: u32,
    leases: Mutex<HashMap<i64, HashSet<String>>>,
}

impl LocalTenantInflightCounter {
    pub fn new(config: TenantInflightConfig) -> Self {
        Self {
            max_inflight: config.max_inflight,
            leases: Mutex::new(HashMap::new()),
        }
    }
}

#[async_trait::async_trait]
impl TenantInflightCounter for LocalTenantInflightCounter {
    async fn try_acquire(&self, lease: &TenantInflightLease) -> bool {
        let mut leases = match self.leases.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        let tenant_leases = leases.entry(lease.tenant_id).or_default();
        if tenant_leases.contains(&lease.owner_token) {
            return true;
        }
        if tenant_leases.len() >= self.max_inflight as usize {
            return false;
        }
        tenant_leases.insert(lease.owner_token.clone())
    }

    async fn renew(&self, lease: &TenantInflightLease) -> TenantInflightRenewal {
        let leases = match self.leases.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        if leases
            .get(&lease.tenant_id)
            .is_some_and(|tokens| tokens.contains(&lease.owner_token))
        {
            TenantInflightRenewal::Renewed
        } else {
            TenantInflightRenewal::LeaseLost
        }
    }

    async fn release(&self, lease: &TenantInflightLease) {
        let mut leases = match self.leases.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        if let Some(tenant_leases) = leases.get_mut(&lease.tenant_id) {
            tenant_leases.remove(&lease.owner_token);
            if tenant_leases.is_empty() {
                leases.remove(&lease.tenant_id);
            }
        }
    }

    fn renewal_interval(&self) -> Option<Duration> {
        None
    }

    fn is_distributed_ha(&self) -> bool {
        false
    }
}

/// Redis-backed in-flight counter shared across gateway nodes.
///
/// Uses Lua-managed sorted-set leases with server timestamps, per-owner expiry,
/// and conditional renewal/release. A process crash therefore loses only its
/// own expiring leases and can never decrement another request's slot.
pub struct RedisTenantInflightCounter {
    client: redis::Client,
    connection_manager: Arc<tokio::sync::OnceCell<ConnectionManager>>,
    key_prefix: String,
    max_inflight: u32,
    lease_ttl: Duration,
    command_timeout: Duration,
}

const REDIS_LEASE_TTL: Duration = Duration::from_secs(5 * 60);
const REDIS_LEASE_RENEWAL_INTERVAL: Duration = Duration::from_secs(60);
const REDIS_COMMAND_TIMEOUT: Duration = Duration::from_secs(2);

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
            connection_manager: Arc::new(tokio::sync::OnceCell::const_new()),
            key_prefix: format!("{prefix}:tenant_inflight"),
            max_inflight: config.max_inflight,
            lease_ttl: REDIS_LEASE_TTL,
            command_timeout: REDIS_COMMAND_TIMEOUT,
        })
    }

    async fn connection(&self) -> Option<ConnectionManager> {
        self.connection_manager
            .get_or_try_init(|| async { self.client.get_connection_manager().await })
            .await
            .ok()
            .cloned()
    }

    fn redis_key(&self, tenant_id: i64) -> String {
        format!("{}:{tenant_id}", self.key_prefix)
    }

    fn lua_try_acquire() -> &'static str {
        r#"
        local key = KEYS[1]
        local max = tonumber(ARGV[1])
        local ttl_ms = tonumber(ARGV[2])
        local owner = ARGV[3]
        local time = redis.call('TIME')
        local now_ms = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
        local expires_at = now_ms + ttl_ms
        redis.call('ZREMRANGEBYSCORE', key, '-inf', now_ms)
        if redis.call('ZSCORE', key, owner) then
            redis.call('ZADD', key, 'XX', expires_at, owner)
            redis.call('PEXPIRE', key, ttl_ms * 2)
            return 1
        end
        if redis.call('ZCARD', key) >= max then return 0 end
        redis.call('ZADD', key, 'NX', expires_at, owner)
        redis.call('PEXPIRE', key, ttl_ms * 2)
        return 1
        "#
    }

    fn lua_renew() -> &'static str {
        r#"
        local key = KEYS[1]
        local ttl_ms = tonumber(ARGV[1])
        local owner = ARGV[2]
        local time = redis.call('TIME')
        local now_ms = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
        redis.call('ZREMRANGEBYSCORE', key, '-inf', now_ms)
        if not redis.call('ZSCORE', key, owner) then return 0 end
        redis.call('ZADD', key, 'XX', now_ms + ttl_ms, owner)
        redis.call('PEXPIRE', key, ttl_ms * 2)
        return 1
        "#
    }

    fn lua_release() -> &'static str {
        r#"
        local key = KEYS[1]
        local owner = ARGV[1]
        redis.call('ZREM', key, owner)
        local remaining = redis.call('ZCARD', key)
        if remaining == 0 then
            redis.call('DEL', key)
        end
        return remaining
        "#
    }
}

#[async_trait::async_trait]
impl TenantInflightCounter for RedisTenantInflightCounter {
    async fn try_acquire(&self, lease: &TenantInflightLease) -> bool {
        let Some(mut conn) = self.connection().await else {
            // Fail-closed: when Redis is unreachable, reject the request rather
            // than allowing unbounded in-flight growth.
            return false;
        };
        let key = self.redis_key(lease.tenant_id);
        tokio::time::timeout(
            self.command_timeout,
            redis::cmd("EVAL")
                .arg(Self::lua_try_acquire())
                .arg(1)
                .arg(&key)
                .arg(self.max_inflight as i64)
                .arg(self.lease_ttl.as_millis() as u64)
                .arg(&lease.owner_token)
                .query_async::<i64>(&mut conn),
        )
        .await
        .ok()
        .and_then(Result::ok)
        .is_some_and(|value| value == 1)
    }

    async fn renew(&self, lease: &TenantInflightLease) -> TenantInflightRenewal {
        let Some(mut conn) = self.connection().await else {
            return TenantInflightRenewal::Unavailable;
        };
        let key = self.redis_key(lease.tenant_id);
        match tokio::time::timeout(
            self.command_timeout,
            redis::cmd("EVAL")
                .arg(Self::lua_renew())
                .arg(1)
                .arg(&key)
                .arg(self.lease_ttl.as_millis() as u64)
                .arg(&lease.owner_token)
                .query_async::<i64>(&mut conn),
        )
        .await
        {
            Ok(Ok(1)) => TenantInflightRenewal::Renewed,
            Ok(Ok(0)) => TenantInflightRenewal::LeaseLost,
            Ok(Ok(value)) => {
                tracing::warn!(
                    tenant_id = lease.tenant_id,
                    redis_result = value,
                    "tenant in-flight lease renewal returned an unexpected Redis result"
                );
                TenantInflightRenewal::Unavailable
            }
            Ok(Err(error)) => {
                tracing::warn!(
                    tenant_id = lease.tenant_id,
                    error = %error,
                    "tenant in-flight lease renewal command failed"
                );
                TenantInflightRenewal::Unavailable
            }
            Err(_) => TenantInflightRenewal::Unavailable,
        }
    }

    async fn release(&self, lease: &TenantInflightLease) {
        let Some(mut conn) = self.connection().await else {
            return;
        };
        let key = self.redis_key(lease.tenant_id);
        let _ = tokio::time::timeout(
            self.command_timeout,
            redis::cmd("EVAL")
                .arg(Self::lua_release())
                .arg(1)
                .arg(&key)
                .arg(&lease.owner_token)
                .query_async::<i64>(&mut conn),
        )
        .await;
    }

    fn renewal_interval(&self) -> Option<Duration> {
        Some(REDIS_LEASE_RENEWAL_INTERVAL)
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
    renewal_tasks: Mutex<HashMap<String, tokio::task::JoinHandle<()>>>,
}

impl TenantInflightInterceptor {
    pub fn new(counter: Arc<dyn TenantInflightCounter>) -> Self {
        Self {
            counter,
            renewal_tasks: Mutex::new(HashMap::new()),
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

    fn start_renewal(
        &self,
        lease: TenantInflightLease,
        cancellation_signal: InvocationCancellationSignal,
    ) {
        let Some(interval) = self.counter.renewal_interval() else {
            return;
        };
        let owner_token = lease.owner_token.clone();
        let counter = Arc::clone(&self.counter);
        let task = tokio::spawn(async move {
            loop {
                tokio::time::sleep(interval).await;
                if !handle_renewal_result(&lease, &cancellation_signal, counter.renew(&lease).await)
                {
                    return;
                }
            }
        });
        let mut tasks = match self.renewal_tasks.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        if let Some(previous) = tasks.insert(owner_token, task) {
            previous.abort();
        }
    }

    fn take_renewal_task(&self, owner_token: &str) -> Option<tokio::task::JoinHandle<()>> {
        let mut tasks = match self.renewal_tasks.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        tasks.remove(owner_token)
    }

    async fn release_invocation_lease(&self, invocation: &mut Invocation) {
        let Some(owner_token) = invocation.request.tenant_inflight_owner_token.take() else {
            return;
        };
        if let Some(task) = self.take_renewal_task(&owner_token) {
            task.abort();
            let _ = task.await;
        }
        self.counter
            .release(&TenantInflightLease::new(
                invocation.subject.tenant_id,
                owner_token,
            ))
            .await;
    }
}

fn handle_renewal_result(
    lease: &TenantInflightLease,
    cancellation_signal: &InvocationCancellationSignal,
    result: TenantInflightRenewal,
) -> bool {
    match result {
        TenantInflightRenewal::Renewed => true,
        TenantInflightRenewal::LeaseLost => {
            cancellation_signal.mark_tenant_lease_lost();
            tracing::error!(
                tenant_id = lease.tenant_id,
                tenant_inflight_lease_lost = 1,
                "tenant in-flight lease ownership was lost; cancelling invocation"
            );
            false
        }
        TenantInflightRenewal::Unavailable => {
            tracing::warn!(
                tenant_id = lease.tenant_id,
                tenant_inflight_lease_renewal_unavailable = 1,
                "tenant in-flight lease renewal is temporarily unavailable; retrying"
            );
            true
        }
    }
}

impl Drop for TenantInflightInterceptor {
    fn drop(&mut self) {
        let tasks = match self.renewal_tasks.get_mut() {
            Ok(tasks) => tasks,
            Err(poisoned) => poisoned.into_inner(),
        };
        for (_, task) in tasks.drain() {
            task.abort();
        }
    }
}

fn generate_lease_owner_token() -> Result<String, InvocationError> {
    let mut bytes = [0_u8; 24];
    getrandom::fill(&mut bytes).map_err(|_| {
        InvocationError::new(
            InvocationErrorKind::Internal,
            "tenant in-flight lease entropy is unavailable",
        )
    })?;
    Ok(hex::encode(bytes))
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
        Box::pin(async move {
            let tenant_id = invocation.subject.tenant_id;
            let lease = TenantInflightLease::new(tenant_id, generate_lease_owner_token()?);
            if !counter.try_acquire(&lease).await {
                tracing::warn!(tenant_id, "tenant in-flight concurrency limit exceeded");
                return Err(InvocationError::new(
                    InvocationErrorKind::RateLimit,
                    "tenant in-flight concurrency limit exceeded",
                ));
            }
            invocation.request.tenant_inflight_owner_token = Some(lease.owner_token.clone());
            self.start_renewal(lease, invocation.request.cancellation_signal());
            Ok(())
        })
    }

    fn after<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            self.release_invocation_lease(invocation).await;
            Ok(())
        })
    }

    fn on_error<'a>(
        &'a self,
        invocation: &'a mut Invocation,
        _error: &'a InvocationError,
    ) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            self.release_invocation_lease(invocation).await;
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
        let first = TenantInflightLease::new(1, "first".to_owned());
        let second = TenantInflightLease::new(1, "second".to_owned());
        let third = TenantInflightLease::new(1, "third".to_owned());
        assert!(counter.try_acquire(&first).await);
        assert!(counter.try_acquire(&second).await);
        assert!(!counter.try_acquire(&third).await);
        counter.release(&first).await;
        assert!(counter.try_acquire(&third).await);
    }

    #[tokio::test]
    async fn local_counter_isolates_tenants() {
        let counter = LocalTenantInflightCounter::new(TenantInflightConfig { max_inflight: 1 });
        let tenant_one = TenantInflightLease::new(1, "one".to_owned());
        let tenant_two = TenantInflightLease::new(2, "two".to_owned());
        let tenant_two_next = TenantInflightLease::new(2, "two-next".to_owned());
        assert!(counter.try_acquire(&tenant_one).await);
        // Tenant 2 has its own independent slot.
        assert!(counter.try_acquire(&tenant_two).await);
        assert!(
            !counter
                .try_acquire(&TenantInflightLease::new(1, "other".to_owned()))
                .await
        );
        counter.release(&tenant_two).await;
        assert!(counter.try_acquire(&tenant_two_next).await);
    }

    #[tokio::test]
    async fn local_counter_release_cleans_up_zero_entries() {
        let counter = LocalTenantInflightCounter::new(TenantInflightConfig { max_inflight: 5 });
        let lease = TenantInflightLease::new(7, "owner".to_owned());
        assert!(counter.try_acquire(&lease).await);
        counter.release(&lease).await;
        assert!(!counter.leases.lock().unwrap().contains_key(&7));
    }

    #[tokio::test]
    async fn stale_release_cannot_remove_a_newer_lease() {
        let counter = LocalTenantInflightCounter::new(TenantInflightConfig { max_inflight: 1 });
        let expired = TenantInflightLease::new(7, "expired".to_owned());
        let current = TenantInflightLease::new(7, "current".to_owned());

        assert!(counter.try_acquire(&expired).await);
        counter.release(&expired).await;
        assert!(counter.try_acquire(&current).await);
        counter.release(&expired).await;

        assert_eq!(
            TenantInflightRenewal::Renewed,
            counter.renew(&current).await
        );
        assert!(
            !counter
                .try_acquire(&TenantInflightLease::new(7, "blocked".to_owned()))
                .await
        );
    }

    #[tokio::test]
    async fn reacquiring_the_same_token_is_idempotent() {
        let counter = LocalTenantInflightCounter::new(TenantInflightConfig { max_inflight: 1 });
        let lease = TenantInflightLease::new(9, "same".to_owned());

        assert!(counter.try_acquire(&lease).await);
        assert!(counter.try_acquire(&lease).await);
        assert!(
            !counter
                .try_acquire(&TenantInflightLease::new(9, "other".to_owned()))
                .await
        );
    }

    #[tokio::test]
    async fn local_renewal_reports_confirmed_lease_loss() {
        let counter = LocalTenantInflightCounter::new(TenantInflightConfig { max_inflight: 1 });
        let lease = TenantInflightLease::new(9, "owner".to_owned());

        assert_eq!(
            TenantInflightRenewal::LeaseLost,
            counter.renew(&lease).await
        );
        assert!(counter.try_acquire(&lease).await);
        assert_eq!(TenantInflightRenewal::Renewed, counter.renew(&lease).await);
        counter.release(&lease).await;
        assert_eq!(
            TenantInflightRenewal::LeaseLost,
            counter.renew(&lease).await
        );
    }

    #[test]
    fn transient_renewal_failure_does_not_cancel_but_confirmed_loss_does() {
        let lease = TenantInflightLease::new(11, "owner".to_owned());
        let signal = InvocationCancellationSignal::default();

        assert!(handle_renewal_result(
            &lease,
            &signal,
            TenantInflightRenewal::Unavailable
        ));
        assert!(!signal.is_tenant_lease_lost());
        assert!(!handle_renewal_result(
            &lease,
            &signal,
            TenantInflightRenewal::LeaseLost
        ));
        assert!(signal.is_tenant_lease_lost());
    }

    #[test]
    fn redis_scripts_use_expiring_owner_tokens_instead_of_shared_decrement() {
        let acquire = RedisTenantInflightCounter::lua_try_acquire();
        let renew = RedisTenantInflightCounter::lua_renew();
        let release = RedisTenantInflightCounter::lua_release();

        assert!(acquire.contains("ZREMRANGEBYSCORE"));
        assert!(acquire.contains("ZADD"));
        assert!(renew.contains("'XX'"));
        assert!(release.contains("ZREM"));
        assert!(!release.contains("DECR"));
    }

    #[test]
    fn tenant_inflight_config_default() {
        assert_eq!(TenantInflightConfig::default().max_inflight, 100);
    }
}
