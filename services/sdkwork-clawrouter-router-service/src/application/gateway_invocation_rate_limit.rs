use std::sync::Arc;
use std::time::{Duration, Instant};

use dashmap::DashMap;
use prometheus::{IntGauge, Opts};
use sdkwork_claw_config::RedisConfig;
use sdkwork_web_core::RateLimitStore;

const ONE_SECOND: Duration = Duration::from_secs(1);
const ONE_DAY: Duration = Duration::from_secs(24 * 60 * 60);
const DEFAULT_ESTIMATED_INSTANCE_COUNT: u32 = 1;

/// Above this active-scope count, the limiter runs a sharded sweep to evict
/// stale sliding-window buckets and bound memory. Below the threshold the
/// per-key expiry reset already keeps active windows fresh without a sweep,
/// avoiding retain churn on the hot path at high QPS.
const LOCAL_RATE_LIMIT_SWEEP_THRESHOLD: usize = 1024;

#[derive(Debug, Clone)]
struct SlidingWindow {
    window_started_at: Instant,
    used: u32,
}

/// Local per-node rate-limit state backed by a sharded [`DashMap`].
///
/// Replacing the previous `Mutex<HashMap>` removes the single contention point
/// that serialized every rate-limit check across all scope keys. With DashMap,
/// independent scope keys (different API keys / tenants) are mutated in
/// parallel across shards, keeping the hot path scalable to tens of thousands
/// of QPS on a single gateway instance.
#[derive(Debug, Default)]
struct LocalGatewayInvocationRateLimiter {
    per_second: DashMap<String, SlidingWindow>,
    per_day: DashMap<String, SlidingWindow>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GatewayRateLimitSpec {
    pub requests_per_second: Option<i64>,
    pub requests_per_day: Option<i64>,
    pub burst_limit: Option<i64>,
}

/// Prometheus gauge exposing Redis-backed rate-limit availability.
///
/// Set to `1` when the limiter is running in local fallback mode (Redis
/// unavailable or unconfigured) and `0` when the distributed store is active.
/// Alert on `clawrouter_rate_limit_redis_degraded == 1` to catch silent
/// degradation of shared rate limiting across gateway nodes.
fn redis_degraded_gauge() -> IntGauge {
    static GAUGE: std::sync::OnceLock<IntGauge> = std::sync::OnceLock::new();
    GAUGE
        .get_or_init(|| {
            let gauge = IntGauge::with_opts(
                Opts::new(
                    "clawrouter_rate_limit_redis_degraded",
                    "1 when the gateway rate limiter fell back to local per-node state, 0 otherwise.",
                )
                .namespace("clawrouter"),
            )
            .expect("redis_degraded gauge");
            let _ = prometheus::register(Box::new(gauge.clone()));
            gauge
        })
        .clone()
}

pub struct GatewayInvocationRateLimiter {
    local: LocalGatewayInvocationRateLimiter,
    distributed: Option<Arc<dyn RateLimitStore>>,
    /// Estimated number of gateway instances sharing the limiter. When the
    /// local fallback is active, per-window quotas are divided by this value so
    /// a fleet of N nodes does not each allow the full configured quota.
    estimated_instance_count: u32,
}

impl std::fmt::Debug for GatewayInvocationRateLimiter {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("GatewayInvocationRateLimiter")
            .field("distributed_ha", &self.uses_distributed_ha())
            .field("estimated_instance_count", &self.estimated_instance_count)
            .finish()
    }
}

impl Default for GatewayInvocationRateLimiter {
    fn default() -> Self {
        Self::new()
    }
}

impl GatewayInvocationRateLimiter {
    pub fn new() -> Self {
        let limiter = Self {
            local: LocalGatewayInvocationRateLimiter::default(),
            distributed: None,
            estimated_instance_count: DEFAULT_ESTIMATED_INSTANCE_COUNT,
        };
        // H-8: surface that the limiter is running without Redis.
        redis_degraded_gauge().set(1);
        limiter
    }

    pub fn try_with_redis_config(redis_config: Option<&RedisConfig>) -> Self {
        Self::try_with_redis_config_and_instances(redis_config, DEFAULT_ESTIMATED_INSTANCE_COUNT)
    }

    /// Build a limiter with an explicit `estimated_instance_count` used to
    /// tighten local-fallback quotas when Redis is unavailable.
    pub fn try_with_redis_config_and_instances(
        redis_config: Option<&RedisConfig>,
        estimated_instance_count: u32,
    ) -> Self {
        let estimated_instance_count = estimated_instance_count.max(1);
        let (distributed, degraded) = match redis_config {
            Some(config) => {
                let prefix = config.key_prefix().unwrap_or("clawrouter").to_owned();
                match sdkwork_web_store_redis::shared_rate_limit_store(config.url(), prefix) {
                    Ok(store) => (Some(store), false),
                    Err(error) => {
                        tracing::warn!(
                            error = %error,
                            rate_limit_redis_degraded = 1,
                            "gateway rate-limit Redis store unavailable; falling back to local \
                             per-node state with quotas divided by estimated_instance_count={}",
                            estimated_instance_count
                        );
                        (None, true)
                    }
                }
            }
            None => {
                tracing::warn!(
                    rate_limit_redis_degraded = 1,
                    "gateway rate limiter has no Redis config; running local per-node state"
                );
                (None, true)
            }
        };
        // H-8: emit the Prometheus degraded marker for alerting.
        redis_degraded_gauge().set(if degraded { 1 } else { 0 });
        Self {
            local: LocalGatewayInvocationRateLimiter::default(),
            distributed,
            estimated_instance_count,
        }
    }

    pub fn uses_distributed_ha(&self) -> bool {
        self.distributed
            .as_ref()
            .is_some_and(|store| store.is_distributed_ha())
    }

    pub async fn check_and_record(
        &self,
        scope_key: &str,
        spec: &GatewayRateLimitSpec,
    ) -> Result<(), u64> {
        if let Some(limit) = spec.requests_per_second.filter(|value| *value > 0) {
            let effective_limit = spec
                .burst_limit
                .filter(|value| *value > 0)
                .map(|value| value.max(limit))
                .unwrap_or(limit);
            self.check_window(
                scope_key,
                "rps",
                ONE_SECOND,
                u32::try_from(effective_limit).unwrap_or(u32::MAX),
            )
            .await?
        }

        if let Some(limit) = spec.requests_per_day.filter(|value| *value > 0) {
            self.check_window(
                scope_key,
                "rpd",
                ONE_DAY,
                u32::try_from(limit).unwrap_or(u32::MAX),
            )
            .await?
        }

        Ok(())
    }

    async fn check_window(
        &self,
        scope_key: &str,
        window_suffix: &str,
        window: Duration,
        max_requests: u32,
    ) -> Result<(), u64> {
        if let Some(store) = self.distributed.as_ref() {
            let key = format!("{scope_key}:{window_suffix}");
            return store
                .check_and_record(&key, max_requests, window)
                .await
                .map_err(|_| window.as_secs().max(1));
        }

        let buckets = match window_suffix {
            "rps" => &self.local.per_second,
            "rpd" => &self.local.per_day,
            _ => &self.local.per_second,
        };
        // H-8: tighten the local fallback quota by the estimated instance count
        // so N gateway nodes collectively stay close to the configured quota.
        let local_max = local_quota(max_requests, self.estimated_instance_count);
        self.check_local_window(buckets, scope_key, window, local_max)
    }

    fn check_local_window(
        &self,
        buckets: &DashMap<String, SlidingWindow>,
        scope_key: &str,
        window: Duration,
        max_requests: u32,
    ) -> Result<(), u64> {
        let now = Instant::now();
        // Opportunistic stale-window eviction to bound memory. Below the
        // threshold the per-key expiry reset already keeps active windows fresh
        // without a sweep, avoiding retain churn on the hot path at high QPS.
        if buckets.len() > LOCAL_RATE_LIMIT_SWEEP_THRESHOLD {
            buckets.retain(|_, bucket| now.duration_since(bucket.window_started_at) < window);
        }
        let mut entry = buckets
            .entry(scope_key.to_owned())
            .or_insert(SlidingWindow {
                window_started_at: now,
                used: 0,
            });
        let bucket = entry.value_mut();
        if now.duration_since(bucket.window_started_at) >= window {
            bucket.window_started_at = now;
            bucket.used = 0;
        }
        let retry_after = window
            .saturating_sub(now.duration_since(bucket.window_started_at))
            .as_secs()
            .max(1);
        if bucket.used >= max_requests {
            return Err(retry_after);
        }
        bucket.used = bucket.used.saturating_add(1);
        Ok(())
    }
}

/// Divide a global quota by the estimated instance count for local fallback.
///
/// Always returns at least 1 so a single tenant can still make progress, but
/// caps the per-node allowance so a fleet does not multiply the configured
/// quota when Redis is down.
fn local_quota(global_quota: u32, estimated_instance_count: u32) -> u32 {
    let divisor = estimated_instance_count.max(1);
    (global_quota / divisor).max(1)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn gateway_rate_limiter_blocks_after_rps_exceeded() {
        let limiter = GatewayInvocationRateLimiter::new();
        let spec = GatewayRateLimitSpec {
            requests_per_second: Some(2),
            requests_per_day: None,
            burst_limit: None,
        };
        assert!(limiter.check_and_record("api-key:1", &spec).await.is_ok());
        assert!(limiter.check_and_record("api-key:1", &spec).await.is_ok());
        assert!(limiter.check_and_record("api-key:1", &spec).await.is_err());
    }

    #[test]
    fn gateway_rate_limiter_without_redis_is_not_distributed_ha() {
        let limiter = GatewayInvocationRateLimiter::new();
        assert!(!limiter.uses_distributed_ha());
    }

    #[test]
    fn local_quota_divides_by_estimated_instance_count() {
        // 100 RPS shared across 4 nodes -> 25 RPS per node.
        assert_eq!(local_quota(100, 4), 25);
        // A single node keeps the full quota.
        assert_eq!(local_quota(100, 1), 100);
        // Always allow at least 1 request so a tenant can make progress.
        assert_eq!(local_quota(0, 4), 1);
        // Zero-instance estimate is guarded to divisor 1.
        assert_eq!(local_quota(100, 0), 100);
    }

    #[tokio::test]
    async fn local_fallback_tightens_quota_by_instance_count() {
        let limiter = GatewayInvocationRateLimiter::try_with_redis_config_and_instances(None, 2);
        let spec = GatewayRateLimitSpec {
            requests_per_second: Some(4),
            requests_per_day: None,
            burst_limit: None,
        };
        // 4 RPS global / 2 instances = 2 per node.
        assert!(limiter.check_and_record("api-key:2", &spec).await.is_ok());
        assert!(limiter.check_and_record("api-key:2", &spec).await.is_ok());
        // Third request in the same second exceeds the per-node allowance.
        assert!(limiter.check_and_record("api-key:2", &spec).await.is_err());
    }

    /// Verify the DashMap-backed limiter stays correct under concurrent access
    /// from many scope keys. This exercises the sharded structure replacing
    /// the previous `Mutex<HashMap>` and guards against regressions that would
    /// either over-admit (data race on `used`) or under-admit (panic/deadlock).
    #[tokio::test]
    async fn local_limiter_handles_concurrent_distinct_scope_keys() {
        let limiter = Arc::new(GatewayInvocationRateLimiter::new());
        let spec = Arc::new(GatewayRateLimitSpec {
            requests_per_second: Some(2),
            requests_per_day: None,
            burst_limit: None,
        });
        let mut handles = Vec::new();
        for key in 0..32 {
            let limiter = limiter.clone();
            let spec = spec.clone();
            handles.push(tokio::spawn(async move {
                let scope = format!("api-key:concurrent:{key}");
                // Each scope key has its own 2-RPS budget; both must succeed.
                assert!(limiter.check_and_record(&scope, &spec).await.is_ok());
                assert!(limiter.check_and_record(&scope, &spec).await.is_ok());
                // Third call in the same second must be denied.
                assert!(limiter.check_and_record(&scope, &spec).await.is_err());
            }));
        }
        for handle in handles {
            handle.await.expect("concurrent rate-limit task panicked");
        }
    }
}
