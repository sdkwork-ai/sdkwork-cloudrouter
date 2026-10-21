//! Process-wide accounting for detached background tasks that outlive an HTTP
//! response (stream producers and stream terminal-lifecycle writers).
//!
//! `axum::serve(...).with_graceful_shutdown(...)` drains in-flight connections,
//! but a detached `tokio::spawn` is not tied to a connection. Without this
//! registry a rolling restart drops those tasks mid-flight, which loses the
//! runtime-stream terminal event and leaves usage unsettled. The server waits
//! for this registry (bounded by the same grace deadline) before exiting.

use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, OnceLock};
use std::time::Duration;

use tokio::sync::Notify;

/// Tracks the number of registered background tasks and wakes waiters when the
/// count reaches zero.
#[derive(Debug, Default)]
pub struct BackgroundTaskRegistry {
    active: AtomicUsize,
    idle: Notify,
}

static REGISTRY: OnceLock<Arc<BackgroundTaskRegistry>> = OnceLock::new();

pub fn background_task_registry() -> &'static Arc<BackgroundTaskRegistry> {
    REGISTRY.get_or_init(|| Arc::new(BackgroundTaskRegistry::default()))
}

/// Registers the current task and returns a guard that deregisters on drop.
pub fn track_background_task() -> BackgroundTaskGuard {
    background_task_registry().track()
}

impl BackgroundTaskRegistry {
    /// Registers one active task. Dropping the returned guard deregisters it.
    pub fn track(self: &Arc<Self>) -> BackgroundTaskGuard {
        self.active.fetch_add(1, Ordering::AcqRel);
        BackgroundTaskGuard {
            registry: Arc::clone(self),
        }
    }

    /// Number of tasks currently registered.
    pub fn active(&self) -> usize {
        self.active.load(Ordering::Acquire)
    }

    /// Waits until every registered task has finished or `timeout` elapses.
    ///
    /// Returns `true` when the registry became idle in time.
    pub async fn wait_idle(&self, timeout: Duration) -> bool {
        if self.active() == 0 {
            return true;
        }
        let idle = async {
            loop {
                // Register interest before re-checking the counter so a task
                // that finishes between the check and the await cannot be
                // missed.
                let notified = self.idle.notified();
                tokio::pin!(notified);
                notified.as_mut().enable();
                if self.active() == 0 {
                    return;
                }
                notified.await;
            }
        };
        if tokio::time::timeout(timeout, idle).await.is_ok() {
            return self.active() == 0;
        }
        self.active() == 0
    }
}

/// Deregisters one background task when dropped.
#[derive(Debug)]
pub struct BackgroundTaskGuard {
    registry: Arc<BackgroundTaskRegistry>,
}

impl Drop for BackgroundTaskGuard {
    fn drop(&mut self) {
        if self.registry.active.fetch_sub(1, Ordering::AcqRel) == 1 {
            self.registry.idle.notify_waiters();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[tokio::test]
    async fn wait_idle_returns_immediately_when_empty() {
        let registry = Arc::new(BackgroundTaskRegistry::default());
        assert!(registry.wait_idle(Duration::from_millis(50)).await);
    }

    #[tokio::test]
    async fn wait_idle_observes_task_completion() {
        let registry = Arc::new(BackgroundTaskRegistry::default());
        let guard = registry.track();
        assert_eq!(1, registry.active());

        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(20)).await;
            drop(guard);
        });

        assert!(
            registry.wait_idle(Duration::from_secs(2)).await,
            "registry must wake when the last task drops"
        );
        assert_eq!(0, registry.active());
    }

    #[tokio::test]
    async fn wait_idle_times_out_while_a_task_is_active() {
        let registry = Arc::new(BackgroundTaskRegistry::default());
        let _guard = registry.track();
        assert!(!registry.wait_idle(Duration::from_millis(20)).await);
    }
}
