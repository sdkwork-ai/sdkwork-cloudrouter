use std::fmt::{Display, Formatter};
use std::sync::{Arc, OnceLock};
use std::time::Duration;

/// Default process-wide ceiling for concurrent upstream provider HTTP
/// dispatches (request head through response-body consumption).
///
/// Without a global cap, the per-tenant in-flight limiter is the only bound
/// and total concurrency grows linearly with tenant count, so a burst across
/// many tenants can exhaust file descriptors and task memory. Streaming
/// responses hold their permit for the stream's lifetime; buffered JSON
/// responses hold it until the body is collected.
pub const DEFAULT_PROVIDER_DISPATCH_MAX_CONCURRENCY: usize = 256;
pub const PROVIDER_DISPATCH_MAX_CONCURRENCY_ENV: &str =
    "SDKWORK_CLOUDROUTER_PROVIDER_DISPATCH_MAX_CONCURRENCY";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProviderDispatchGateError {
    Saturated,
}

impl Display for ProviderDispatchGateError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        formatter.write_str("provider dispatch concurrency limit is saturated; retry after backoff")
    }
}

impl std::error::Error for ProviderDispatchGateError {}

/// Process-wide admission controller for upstream provider dispatches. Every
/// clone shares one semaphore so per-request runtimes cannot multiply the cap.
#[derive(Clone)]
pub struct ProviderDispatchGate {
    semaphore: Arc<tokio::sync::Semaphore>,
    max_concurrency: usize,
}

impl ProviderDispatchGate {
    pub fn shared() -> Self {
        static SHARED_GATE: OnceLock<ProviderDispatchGate> = OnceLock::new();
        SHARED_GATE.get_or_init(Self::from_env).clone()
    }

    fn from_env() -> Self {
        let max_concurrency = std::env::var(PROVIDER_DISPATCH_MAX_CONCURRENCY_ENV)
            .ok()
            .and_then(|value| {
                value
                    .trim()
                    .parse::<usize>()
                    .ok()
                    .filter(|value| *value > 0)
            })
            .unwrap_or(DEFAULT_PROVIDER_DISPATCH_MAX_CONCURRENCY)
            .min(tokio::sync::Semaphore::MAX_PERMITS as usize);
        Self {
            semaphore: Arc::new(tokio::sync::Semaphore::new(max_concurrency)),
            max_concurrency,
        }
    }

    pub fn max_concurrency(&self) -> usize {
        self.max_concurrency
    }

    pub async fn acquire(
        &self,
        wait_timeout: Duration,
    ) -> Result<ProviderDispatchPermit, ProviderDispatchGateError> {
        let permit = tokio::time::timeout(wait_timeout, self.semaphore.clone().acquire_owned())
            .await
            .map_err(|_| ProviderDispatchGateError::Saturated)?
            .map_err(|_| ProviderDispatchGateError::Saturated)?;
        Ok(ProviderDispatchPermit { _permit: permit })
    }
}

/// Held from dispatch start until the response body is fully consumed or
/// dropped; dropping releases the process-wide slot.
#[derive(Debug)]
pub struct ProviderDispatchPermit {
    _permit: tokio::sync::OwnedSemaphorePermit,
}

/// `http_body::Body` wrapper that keeps a [`ProviderDispatchPermit`] alive for
/// the lifetime of a streamed response body, so relayed SSE streams keep
/// occupying exactly one dispatch slot until they terminate.
pub struct PermitHoldingBody<B> {
    inner: B,
    _permit: Option<ProviderDispatchPermit>,
}

impl<B> PermitHoldingBody<B> {
    pub fn new(inner: B, permit: ProviderDispatchPermit) -> Self {
        Self {
            inner,
            _permit: Some(permit),
        }
    }
}

impl<B> http_body::Body for PermitHoldingBody<B>
where
    B: http_body::Body<Data = bytes::Bytes> + Unpin,
{
    type Data = B::Data;
    type Error = B::Error;

    fn poll_frame(
        self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Result<http_body::Frame<Self::Data>, Self::Error>>> {
        std::pin::Pin::new(&mut self.get_mut().inner).poll_frame(cx)
    }

    fn is_end_stream(&self) -> bool {
        self.inner.is_end_stream()
    }

    fn size_hint(&self) -> http_body::SizeHint {
        self.inner.size_hint()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn permit_is_denied_after_the_wait_timeout_expires() {
        let gate = ProviderDispatchGate {
            semaphore: Arc::new(tokio::sync::Semaphore::new(1)),
            max_concurrency: 1,
        };
        let _held = gate
            .acquire(Duration::from_millis(10))
            .await
            .expect("first permit fits the gate");
        let error = gate
            .acquire(Duration::from_millis(10))
            .await
            .expect_err("second permit must be denied while the slot is held");
        assert!(matches!(error, ProviderDispatchGateError::Saturated));
    }

    #[tokio::test]
    async fn dropping_the_permit_releases_the_slot() {
        let gate = ProviderDispatchGate {
            semaphore: Arc::new(tokio::sync::Semaphore::new(1)),
            max_concurrency: 1,
        };
        drop(
            gate.acquire(Duration::from_millis(10))
                .await
                .expect("first permit fits the gate"),
        );
        gate.acquire(Duration::from_millis(10))
            .await
            .expect("permit is reusable after drop");
    }
}
