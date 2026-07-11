use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use sdkwork_claw_config::RedisConfig;
use sdkwork_web_core::RateLimitStore;

const DEFAULT_MAX_ATTEMPTS: u32 = 10;
const DEFAULT_WINDOW: Duration = Duration::from_secs(15 * 60);

#[derive(Debug, Clone)]
struct AttemptWindow {
    count: u32,
    window_started_at: Instant,
}

#[derive(Debug, Default)]
struct LocalPasswordLoginRateLimiter {
    attempts: Mutex<HashMap<String, AttemptWindow>>,
    max_attempts: u32,
    window: Duration,
}

pub struct PasswordLoginRateLimiter {
    local: LocalPasswordLoginRateLimiter,
    distributed: Option<Arc<dyn RateLimitStore>>,
}

impl std::fmt::Debug for PasswordLoginRateLimiter {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PasswordLoginRateLimiter")
            .field("distributed_ha", &self.uses_distributed_ha())
            .finish()
    }
}

pub fn shared_password_login_rate_limiter(
    runtime_toml: Option<&sdkwork_claw_config::RuntimeTomlConfig>,
) -> Arc<PasswordLoginRateLimiter> {
    let deployment_mode =
        sdkwork_claw_config::DeploymentMode::from_env_or_runtime_toml(runtime_toml)
            .unwrap_or_else(|error| panic!("invalid deployment lifecycle: {error}"));
    let redis_config = RedisConfig::from_env_or_runtime_toml(runtime_toml)
        .ok()
        .flatten();
    let limiter = PasswordLoginRateLimiter::try_with_redis_config(redis_config.as_ref());
    if deployment_mode != sdkwork_claw_config::DeploymentMode::Desktop
        && sdkwork_claw_config::is_production_like_runtime_environment(runtime_toml)
        && !limiter.uses_distributed_ha()
    {
        panic!(
            "Redis-backed distributed password login rate limiting is required for production/staging server deployments ({})",
            deployment_mode.as_str()
        );
    }
    Arc::new(limiter)
}

impl PasswordLoginRateLimiter {
    pub fn new() -> Self {
        Self::try_with_redis_config(None)
    }

    pub fn try_with_redis_config(redis_config: Option<&RedisConfig>) -> Self {
        let distributed = redis_config.and_then(|config| {
            let prefix = format!(
                "{}:password-login",
                config.key_prefix().unwrap_or("clawrouter")
            );
            sdkwork_web_store_redis::shared_rate_limit_store(config.url(), prefix).ok()
        });
        Self {
            local: LocalPasswordLoginRateLimiter {
                attempts: Mutex::new(HashMap::new()),
                max_attempts: DEFAULT_MAX_ATTEMPTS,
                window: DEFAULT_WINDOW,
            },
            distributed,
        }
    }

    pub fn uses_distributed_ha(&self) -> bool {
        self.distributed
            .as_ref()
            .is_some_and(|store| store.is_distributed_ha())
    }

    pub async fn check_and_record(&self, scope_key: &str) -> Result<(), String> {
        if let Some(store) = self.distributed.as_ref() {
            return store
                .check_and_record(scope_key, self.local.max_attempts, self.local.window)
                .await
                .map_err(|_| {
                    "Too many password login attempts. Please wait before trying again.".to_owned()
                });
        }

        let mut attempts = self
            .local
            .attempts
            .lock()
            .map_err(|_| "password login rate limiter is unavailable".to_owned())?;
        let now = Instant::now();
        let entry = attempts
            .entry(scope_key.to_owned())
            .or_insert(AttemptWindow {
                count: 0,
                window_started_at: now,
            });
        if now.duration_since(entry.window_started_at) >= self.local.window {
            entry.count = 0;
            entry.window_started_at = now;
        }
        entry.count = entry.count.saturating_add(1);
        if entry.count > self.local.max_attempts {
            return Err(
                "Too many password login attempts. Please wait before trying again.".to_owned(),
            );
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn password_login_rate_limiter_blocks_after_max_attempts() {
        let limiter = PasswordLoginRateLimiter::new();
        for _ in 0..10 {
            assert!(limiter
                .check_and_record("ip:1.2.3.4|account:admin")
                .await
                .is_ok());
        }
        assert!(limiter
            .check_and_record("ip:1.2.3.4|account:admin")
            .await
            .is_err());
    }
}
