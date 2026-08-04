use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;
use std::sync::{Arc, Mutex};
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

impl InMemoryRuntimeStreamBus {
    fn notifier(&self, invocation_id: &str) -> Arc<Notify> {
        let mut notifiers = self.notifiers.lock().unwrap();
        notifiers
            .entry(invocation_id.to_owned())
            .or_insert_with(|| Arc::new(Notify::new()))
            .clone()
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
            let mut claims = self.claims.lock().unwrap();
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
            let mut claims = self.claims.lock().unwrap();
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
            let mut claims = self.claims.lock().unwrap();
            if claims
                .get(invocation_id)
                .is_some_and(|claim| claim.owner_id == owner_id)
            {
                claims.remove(invocation_id);
            }
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
            let mut cancellations = self.cancellations.lock().unwrap();
            cancellations.insert(
                invocation_id.to_owned(),
                InMemoryCancellationRequest {
                    reason: reason.to_owned(),
                    expires_at: Instant::now() + ttl,
                },
            );
            self.notifier(invocation_id).notify_waiters();
            Ok(())
        })
    }

    fn cancellation_reason<'a>(
        &'a self,
        invocation_id: &'a str,
    ) -> RuntimeStreamBusFuture<'a, Option<String>> {
        Box::pin(async move {
            let mut cancellations = self.cancellations.lock().unwrap();
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
