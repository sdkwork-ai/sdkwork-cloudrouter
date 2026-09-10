use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::{Duration, Instant};

use tokio::sync::Notify;

use crate::domain::DomainResult;
use crate::ports::AppRuntimeEventItem;

pub type RuntimeStreamBusFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

pub trait RuntimeStreamBus: Send + Sync {
    fn claim_execution<'a>(
        &'a self,
        invocation_id: &'a str,
        owner_id: &'a str,
        lease_ttl: Duration,
    ) -> RuntimeStreamBusFuture<'a, bool>;

    fn renew_execution<'a>(
        &'a self,
        invocation_id: &'a str,
        owner_id: &'a str,
        lease_ttl: Duration,
    ) -> RuntimeStreamBusFuture<'a, bool>;

    fn release_execution<'a>(
        &'a self,
        invocation_id: &'a str,
        owner_id: &'a str,
    ) -> RuntimeStreamBusFuture<'a, ()>;

    fn publish_event<'a>(
        &'a self,
        invocation_id: &'a str,
        event: &'a AppRuntimeEventItem,
    ) -> RuntimeStreamBusFuture<'a, ()>;

    fn wait_for_event<'a>(
        &'a self,
        invocation_id: &'a str,
        timeout: Duration,
    ) -> RuntimeStreamBusFuture<'a, ()>;

    fn request_cancellation<'a>(
        &'a self,
        invocation_id: &'a str,
        reason: &'a str,
        ttl: Duration,
    ) -> RuntimeStreamBusFuture<'a, ()>;

    fn cancellation_reason<'a>(
        &'a self,
        invocation_id: &'a str,
    ) -> RuntimeStreamBusFuture<'a, Option<String>>;
}

/// Desktop-development bus. All state is process-local and every map is swept
/// of expired or released entries so long-running processes stay bounded.
#[derive(Debug, Default)]
pub struct InMemoryRuntimeStreamBus {
    claims: Mutex<HashMap<String, InMemoryExecutionClaim>>,
    cancellations: Mutex<HashMap<String, InMemoryCancellationRequest>>,
    notifiers: Mutex<HashMap<String, Arc<Notify>>>,
}

#[derive(Debug, Clone)]
struct InMemoryExecutionClaim {
    owner_id: String,
    expires_at: Instant,
}

#[derive(Debug, Clone)]
struct InMemoryCancellationRequest {
    reason: String,
    expires_at: Instant,
}

/// A poisoned guard means a panic happened while holding it; the map contents
/// remain valid, so recovery keeps the bus usable instead of panicking every
/// later request.
fn lock_or_recover<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
}

impl InMemoryRuntimeStreamBus {
    fn notifier(&self, invocation_id: &str) -> Arc<Notify> {
        let mut notifiers = lock_or_recover(&self.notifiers);
        notifiers
            .entry(invocation_id.to_owned())
            .or_insert_with(|| Arc::new(Notify::new()))
            .clone()
    }

    fn drop_notifier(&self, invocation_id: &str) {
        let mut notifiers = lock_or_recover(&self.notifiers);
        notifiers.remove(invocation_id);
    }
}

impl RuntimeStreamBus for InMemoryRuntimeStreamBus {
    fn claim_execution<'a>(
        &'a self,
        invocation_id: &'a str,
        owner_id: &'a str,
        lease_ttl: Duration,
    ) -> RuntimeStreamBusFuture<'a, bool> {
        Box::pin(async move {
            let now = Instant::now();
            let mut claims = lock_or_recover(&self.claims);
            // Opportunistic sweep: expired leases for any invocation must not
            // accumulate in long-lived desktop processes.
            claims.retain(|_, claim| claim.expires_at > now);
            if claims
                .get(invocation_id)
                .is_some_and(|claim| claim.expires_at > now)
            {
                return Ok(false);
            }
            claims.insert(
                invocation_id.to_owned(),
                InMemoryExecutionClaim {
                    owner_id: owner_id.to_owned(),
                    expires_at: now + lease_ttl,
                },
            );
            Ok(true)
        })
    }

    fn renew_execution<'a>(
        &'a self,
        invocation_id: &'a str,
        owner_id: &'a str,
        lease_ttl: Duration,
    ) -> RuntimeStreamBusFuture<'a, bool> {
        Box::pin(async move {
            let mut claims = lock_or_recover(&self.claims);
            let Some(claim) = claims.get_mut(invocation_id) else {
                return Ok(false);
            };
            if claim.owner_id != owner_id || claim.expires_at <= Instant::now() {
                return Ok(false);
            }
            claim.expires_at = Instant::now() + lease_ttl;
            Ok(true)
        })
    }

    fn release_execution<'a>(
        &'a self,
        invocation_id: &'a str,
        owner_id: &'a str,
    ) -> RuntimeStreamBusFuture<'a, ()> {
        Box::pin(async move {
            {
                let mut claims = lock_or_recover(&self.claims);
                if claims
                    .get(invocation_id)
                    .is_some_and(|claim| claim.owner_id == owner_id)
                {
                    claims.remove(invocation_id);
                }
            }
            // Waiting tasks hold their own `Arc` clones, so dropping the map
            // entry only ends future lookups; no live waiter is broken.
            self.drop_notifier(invocation_id);
            Ok(())
        })
    }

    fn publish_event<'a>(
        &'a self,
        invocation_id: &'a str,
        _event: &'a AppRuntimeEventItem,
    ) -> RuntimeStreamBusFuture<'a, ()> {
        Box::pin(async move {
            self.notifier(invocation_id).notify_waiters();
            Ok(())
        })
    }

    fn wait_for_event<'a>(
        &'a self,
        invocation_id: &'a str,
        timeout: Duration,
    ) -> RuntimeStreamBusFuture<'a, ()> {
        Box::pin(async move {
            let notifier = self.notifier(invocation_id);
            let _ = tokio::time::timeout(timeout, notifier.notified()).await;
            Ok(())
        })
    }

    fn request_cancellation<'a>(
        &'a self,
        invocation_id: &'a str,
        reason: &'a str,
        ttl: Duration,
    ) -> RuntimeStreamBusFuture<'a, ()> {
        Box::pin(async move {
            let now = Instant::now();
            let mut cancellations = lock_or_recover(&self.cancellations);
            cancellations.retain(|_, request| request.expires_at > now);
            cancellations.insert(
                invocation_id.to_owned(),
                InMemoryCancellationRequest {
                    reason: reason.to_owned(),
                    expires_at: now + ttl,
                },
            );
            drop(cancellations);
            self.notifier(invocation_id).notify_waiters();
            Ok(())
        })
    }

    fn cancellation_reason<'a>(
        &'a self,
        invocation_id: &'a str,
    ) -> RuntimeStreamBusFuture<'a, Option<String>> {
        Box::pin(async move {
            let mut cancellations = lock_or_recover(&self.cancellations);
            let Some(request) = cancellations.get(invocation_id) else {
                return Ok(None);
            };
            if request.expires_at <= Instant::now() {
                cancellations.remove(invocation_id);
                return Ok(None);
            }
            Ok(Some(request.reason.clone()))
        })
    }
}
