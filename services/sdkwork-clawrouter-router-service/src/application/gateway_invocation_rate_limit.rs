use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use sdkwork_claw_config::RedisConfig;
use sdkwork_web_core::RateLimitStore;

const ONE_SECOND: Duration = Duration::from_secs(1);
const ONE_DAY: Duration = Duration::from_secs(24 * 60 * 60);

#[derive(Debug, Clone)]
struct SlidingWindow {
    window_started_at: Instant,
    used: u32,
}

#[derive(Debug, Default)]
struct LocalGatewayInvocationRateLimiter {
    per_second: Mutex<HashMap<String, SlidingWindow>>,
    per_day: Mutex<HashMap<String, SlidingWindow>>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GatewayRateLimitSpec {
    pub requests_per_second: Option<i64>,
    pub requests_per_day: Option<i64>,
    pub burst_limit: Option<i64>,
}

pub struct GatewayInvocationRateLimiter {
    local: LocalGatewayInvocationRateLimiter,
    distributed: Option<Arc<dyn RateLimitStore>>,
}

impl std::fmt::Debug for GatewayInvocationRateLimiter {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("GatewayInvocationRateLimiter")
            .field("distributed_ha", &self.uses_distributed_ha())
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
        Self {
            local: LocalGatewayInvocationRateLimiter::default(),
            distributed: None,
        }
    }

    pub fn try_with_redis_config(redis_config: Option<&RedisConfig>) -> Self {
        let distributed = redis_config.and_then(|config| {
            let prefix = config.key_prefix().unwrap_or("clawrouter").to_owned();
            sdkwork_web_store_redis::shared_rate_limit_store(config.url(), prefix).ok()
        });
        Self {
            local: LocalGatewayInvocationRateLimiter::default(),
            distributed,
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
            if let Err(retry_after) = self
                .check_window(
                    scope_key,
                    "rps",
                    ONE_SECOND,
                    u32::try_from(effective_limit).unwrap_or(u32::MAX),
                )
                .await
            {
                return Err(retry_after);
            }
        }

        if let Some(limit) = spec.requests_per_day.filter(|value| *value > 0) {
            if let Err(retry_after) = self
                .check_window(
                    scope_key,
                    "rpd",
                    ONE_DAY,
                    u32::try_from(limit).unwrap_or(u32::MAX),
                )
                .await
            {
                return Err(retry_after);
            }
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
        self.check_local_window(buckets, scope_key, window, max_requests)
    }

    fn check_local_window(
        &self,
        buckets: &Mutex<HashMap<String, SlidingWindow>>,
        scope_key: &str,
        window: Duration,
        max_requests: u32,
    ) -> Result<(), u64> {
        let mut buckets = buckets.lock().map_err(|_| 60_u64)?;
        let now = Instant::now();
        buckets.retain(|_, bucket| now.duration_since(bucket.window_started_at) < window);
        let bucket = buckets
            .entry(scope_key.to_owned())
            .or_insert(SlidingWindow {
                window_started_at: now,
                used: 0,
            });
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
}
