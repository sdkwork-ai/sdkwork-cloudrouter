use std::sync::Arc;
use std::time::Duration;

use crate::domain::DomainResult;
use crate::ports::RuntimeInvocationReaperStore;

/// Startup/recovery sweep for runtime invocations that never reached a
/// terminal state (for example a rollout that hit the hard shutdown deadline
/// while a stream producer was still draining).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RuntimeInvocationReaperConfig {
    pub enabled: bool,
    pub stale_after: Duration,
    pub interval: Duration,
    pub batch_limit: i64,
}

impl Default for RuntimeInvocationReaperConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            stale_after: Duration::from_secs(15 * 60),
            interval: Duration::from_secs(60),
            batch_limit: 200,
        }
    }
}

impl RuntimeInvocationReaperConfig {
    #[must_use]
    pub fn normalized(self) -> Self {
        Self {
            enabled: self.enabled,
            stale_after: self.stale_after.max(Duration::from_secs(60)),
            interval: self.interval.max(Duration::from_secs(1)),
            batch_limit: self.batch_limit.clamp(1, 1_000),
        }
    }
}

pub struct RuntimeInvocationReaper {
    store: Arc<dyn RuntimeInvocationReaperStore>,
    config: RuntimeInvocationReaperConfig,
}

impl RuntimeInvocationReaper {
    pub fn new(
        store: Arc<dyn RuntimeInvocationReaperStore>,
        config: RuntimeInvocationReaperConfig,
    ) -> Self {
        Self {
            store,
            config: config.normalized(),
        }
    }

    #[must_use]
    pub fn config(&self) -> RuntimeInvocationReaperConfig {
        self.config
    }

    pub async fn run_once(&self) -> DomainResult<usize> {
        if !self.config.enabled {
            return Ok(0);
        }
        self.store
            .reap_stale(self.config.stale_after, self.config.batch_limit)
            .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    struct FakeReaperStore {
        calls: AtomicUsize,
        stale_after_millis: AtomicUsize,
    }

    impl RuntimeInvocationReaperStore for FakeReaperStore {
        fn reap_stale<'a>(
            &'a self,
            stale_after: Duration,
            _limit: i64,
        ) -> crate::ports::RuntimeInvocationReaperFuture<'a> {
            self.calls.fetch_add(1, Ordering::SeqCst);
            self.stale_after_millis
                .store(stale_after.as_millis() as usize, Ordering::SeqCst);
            Box::pin(async { Ok(1) })
        }
    }

    #[tokio::test]
    async fn run_once_delegates_with_the_normalized_threshold() {
        let store = Arc::new(FakeReaperStore {
            calls: AtomicUsize::new(0),
            stale_after_millis: AtomicUsize::new(0),
        });
        let reaper = RuntimeInvocationReaper::new(
            store.clone(),
            RuntimeInvocationReaperConfig {
                stale_after: Duration::from_secs(1),
                ..RuntimeInvocationReaperConfig::default()
            },
        );
        assert_eq!(1, reaper.run_once().await.expect("reap once"));
        assert_eq!(1, store.calls.load(Ordering::SeqCst));
        assert_eq!(
            Duration::from_secs(60).as_millis() as usize,
            store.stale_after_millis.load(Ordering::SeqCst)
        );
    }

    #[tokio::test]
    async fn disabled_reaper_does_not_touch_the_store() {
        let store = Arc::new(FakeReaperStore {
            calls: AtomicUsize::new(0),
            stale_after_millis: AtomicUsize::new(0),
        });
        let reaper = RuntimeInvocationReaper::new(
            store.clone(),
            RuntimeInvocationReaperConfig {
                enabled: false,
                ..RuntimeInvocationReaperConfig::default()
            },
        );
        assert_eq!(0, reaper.run_once().await.expect("disabled reaper"));
        assert_eq!(0, store.calls.load(Ordering::SeqCst));
    }
}
