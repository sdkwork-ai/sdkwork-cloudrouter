use std::fmt::{Display, Formatter};
use std::num::NonZeroUsize;
use std::sync::{Arc, OnceLock};

use crate::ports::ProviderResponseMemoryGuard;

pub const DEFAULT_PROVIDER_RESPONSE_MEMORY_BUDGET_BYTES: usize = 512 * 1024 * 1024;
/// Hard cap for the configurable process-wide provider response memory budget.
///
/// A single in-flight response may reserve up to `response_limit ×
/// PROVIDER_RESPONSE_MEMORY_RESERVATION_MULTIPLIER`; reservations are
/// proportional to the declared payload size (see
/// [`ProviderResponseMemoryBudget::try_reserve_for_declared`]), so the default
/// 64 MiB response limit and 512 MiB budget admit many ordinary responses at
/// once and only few maximum-size ones. Deployments with more memory can raise
/// the budget; 3 GiB keeps headroom below tokio's `Semaphore::MAX_PERMITS`
/// (u32::MAX ≈ 4 GiB - 1).
pub const MAX_PROVIDER_RESPONSE_MEMORY_BUDGET_BYTES: usize = 3 * 1024 * 1024 * 1024;
pub const PROVIDER_RESPONSE_MEMORY_RESERVATION_MULTIPLIER: usize = 4;
/// Smallest amplification reservable for one buffered provider response.
///
/// Without a floor every tiny payload would reserve a few hundred bytes, and
/// the semaphore's per-permit bookkeeping would dominate the budget. 1 MiB ×
/// the multiplier is still two orders of magnitude below the default response
/// limit.
const MIN_PROVIDER_RESPONSE_RESERVATION_BYTES: usize = 1024 * 1024;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProviderResponseMemoryBudgetError {
    InvalidConfig(String),
    Saturated { max_bytes: usize },
}

impl ProviderResponseMemoryBudgetError {
    pub fn is_saturated(&self) -> bool {
        matches!(self, Self::Saturated { .. })
    }
}

impl Display for ProviderResponseMemoryBudgetError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidConfig(message) => formatter.write_str(message),
            Self::Saturated { max_bytes } => write!(
                formatter,
                "provider response process memory budget of {max_bytes} bytes is saturated"
            ),
        }
    }
}

impl std::error::Error for ProviderResponseMemoryBudgetError {}

/// Weighted process-wide admission controller for buffered provider bodies.
/// Every clone shares the same semaphore.
#[derive(Clone)]
pub struct ProviderResponseMemoryBudget {
    semaphore: Arc<tokio::sync::Semaphore>,
    max_bytes: NonZeroUsize,
}

impl ProviderResponseMemoryBudget {
    pub fn new(max_bytes: NonZeroUsize) -> Result<Self, ProviderResponseMemoryBudgetError> {
        if max_bytes.get() > tokio::sync::Semaphore::MAX_PERMITS {
            return Err(ProviderResponseMemoryBudgetError::InvalidConfig(format!(
                "provider response memory budget must not exceed {} bytes",
                tokio::sync::Semaphore::MAX_PERMITS
            )));
        }
        Ok(Self {
            semaphore: Arc::new(tokio::sync::Semaphore::new(max_bytes.get())),
            max_bytes,
        })
    }

    pub fn with_default_limit() -> Self {
        static DEFAULT_BUDGET: OnceLock<ProviderResponseMemoryBudget> = OnceLock::new();
        DEFAULT_BUDGET
            .get_or_init(|| {
                Self::new(
                    NonZeroUsize::new(DEFAULT_PROVIDER_RESPONSE_MEMORY_BUDGET_BYTES)
                        .expect("default provider response memory budget must be nonzero"),
                )
                .expect("default provider response memory budget must be valid")
            })
            .clone()
    }

    pub fn max_bytes(&self) -> NonZeroUsize {
        self.max_bytes
    }

    pub fn validate_response_limit(
        &self,
        response_max_bytes: u64,
    ) -> Result<u32, ProviderResponseMemoryBudgetError> {
        let response_max_bytes = usize::try_from(response_max_bytes).map_err(|_| {
            ProviderResponseMemoryBudgetError::InvalidConfig(
                "provider response limit exceeds this platform's addressable memory".to_owned(),
            )
        })?;
        let reservation = response_max_bytes
            .checked_mul(PROVIDER_RESPONSE_MEMORY_RESERVATION_MULTIPLIER)
            .ok_or_else(|| {
                ProviderResponseMemoryBudgetError::InvalidConfig(
                    "provider response memory reservation overflowed".to_owned(),
                )
            })?;
        if reservation > self.max_bytes.get() {
            return Err(ProviderResponseMemoryBudgetError::InvalidConfig(format!(
                "provider response limit {response_max_bytes} requires a {reservation} byte memory reservation, exceeding the {} byte process budget",
                self.max_bytes
            )));
        }
        u32::try_from(reservation).map_err(|_| {
            ProviderResponseMemoryBudgetError::InvalidConfig(format!(
                "provider response memory reservation {reservation} exceeds the runtime limit"
            ))
        })
    }

    pub fn try_reserve(
        &self,
        response_max_bytes: u64,
    ) -> Result<ProviderResponseMemoryGuard, ProviderResponseMemoryBudgetError> {
        self.try_reserve_for_declared(response_max_bytes, None)
    }

    /// Reserves memory for one buffered provider response.
    ///
    /// A known `declared_bytes` (the upstream `content-length`) makes the
    /// reservation proportional to the payload instead of the configured
    /// response limit. Reserving `limit × multiplier` for every response meant
    /// the default 64 MiB limit and 512 MiB budget admitted only **two**
    /// concurrent non-streaming responses no matter how small they were — the
    /// third concurrent request failed immediately and the dispatcher retried
    /// into the same wall. The limit still caps the reservation, so a single
    /// maximum-size response remains bounded by the same amplification factor.
    pub fn try_reserve_for_declared(
        &self,
        response_max_bytes: u64,
        declared_bytes: Option<u64>,
    ) -> Result<ProviderResponseMemoryGuard, ProviderResponseMemoryBudgetError> {
        let permits = self.reservation_permits(response_max_bytes, declared_bytes)?;
        let permit = Arc::clone(&self.semaphore)
            .try_acquire_many_owned(permits)
            .map_err(|_| ProviderResponseMemoryBudgetError::Saturated {
                max_bytes: self.max_bytes.get(),
            })?;
        Ok(ProviderResponseMemoryGuard::new(permit))
    }

    fn reservation_permits(
        &self,
        response_max_bytes: u64,
        declared_bytes: Option<u64>,
    ) -> Result<u32, ProviderResponseMemoryBudgetError> {
        let amplification_permits = self.validate_response_limit(response_max_bytes)?;
        let Some(declared_bytes) = declared_bytes else {
            return Ok(amplification_permits);
        };
        let declared_bytes = usize::try_from(declared_bytes).unwrap_or(usize::MAX);
        let response_limit = usize::try_from(response_max_bytes).unwrap_or(usize::MAX);
        let bounded = declared_bytes
            .min(response_limit)
            .max(MIN_PROVIDER_RESPONSE_RESERVATION_BYTES);
        let reservation = bounded
            .checked_mul(PROVIDER_RESPONSE_MEMORY_RESERVATION_MULTIPLIER)
            .ok_or_else(|| {
                ProviderResponseMemoryBudgetError::InvalidConfig(
                    "provider response memory reservation overflowed".to_owned(),
                )
            })?;
        u32::try_from(reservation).map_err(|_| {
            ProviderResponseMemoryBudgetError::InvalidConfig(format!(
                "provider response memory reservation {reservation} exceeds the runtime limit"
            ))
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::response::Response;

    #[test]
    fn reservations_are_shared_across_budget_clones() {
        let budget = ProviderResponseMemoryBudget::new(
            NonZeroUsize::new(16).expect("nonzero test memory budget"),
        )
        .expect("valid test memory budget");
        let clone = budget.clone();
        let guard = budget
            .try_reserve(4)
            .expect("first reservation uses the full amplified budget");

        assert!(clone
            .try_reserve(4)
            .is_err_and(|error| error.is_saturated()));
        drop(guard);
        assert!(clone.try_reserve(4).is_ok());
    }

    #[test]
    fn response_limit_must_fit_amplified_process_budget() {
        let budget = ProviderResponseMemoryBudget::new(
            NonZeroUsize::new(16).expect("nonzero test memory budget"),
        )
        .expect("valid test memory budget");

        let error = budget
            .validate_response_limit(5)
            .expect_err("five response bytes require twenty reserved bytes");
        assert!(error.to_string().contains("requires a 20 byte"));
    }

    #[test]
    fn http_response_owns_reservation_until_body_is_dropped() {
        let budget = ProviderResponseMemoryBudget::new(
            NonZeroUsize::new(16).expect("nonzero test memory budget"),
        )
        .expect("valid test memory budget");
        let guard = budget
            .try_reserve(4)
            .expect("response must reserve the amplified budget");
        let response = guard.wrap_response(Response::new(Body::from("body")));

        assert!(budget
            .try_reserve(4)
            .is_err_and(|error| error.is_saturated()));
        drop(response);
        assert!(budget.try_reserve(4).is_ok());
    }

    const MIB: usize = 1024 * 1024;

    #[test]
    fn declared_payload_sizes_get_proportional_reservations() {
        // 16 MiB process budget, 4 MiB response limit, 4× amplification.
        let budget = ProviderResponseMemoryBudget::new(
            NonZeroUsize::new(16 * MIB).expect("nonzero test memory budget"),
        )
        .expect("valid test memory budget");
        let limit = 4 * MIB as u64;

        // A 10 KiB payload reserves the 1 MiB floor × 4 = 4 MiB → four fit.
        let floor_guards: Vec<_> = (0..4)
            .map(|_| {
                budget
                    .try_reserve_for_declared(limit, Some(10 * 1024))
                    .expect("floor reservation")
            })
            .collect();
        assert!(budget
            .try_reserve_for_declared(limit, Some(10 * 1024))
            .is_err_and(|error| error.is_saturated()));
        drop(floor_guards);

        // Without a declared size the whole amplified limit is reserved.
        let full = budget
            .try_reserve_for_declared(limit, None)
            .expect("cap reservation");
        assert!(budget
            .try_reserve_for_declared(limit, None)
            .is_err_and(|error| error.is_saturated()));
        drop(full);

        // A payload above the limit clamps to the limit, never above it.
        let clamped = budget
            .try_reserve_for_declared(limit, Some(64 * MIB as u64))
            .expect("clamped reservation");
        assert!(budget
            .try_reserve_for_declared(limit, Some(1))
            .is_err_and(|error| error.is_saturated()));
        drop(clamped);

        // A mid-size payload reserves proportionally, so several fit at once.
        let declared = 64 * 1024;
        let mut concurrent = 0;
        while let Ok(guard) = budget.try_reserve_for_declared(limit, Some(declared)) {
            concurrent += 1;
            drop(guard);
            if concurrent > 100 {
                break;
            }
        }
        assert!(
            concurrent > 4,
            "declared {declared}-byte payloads must not be capped at the two-response limit: {concurrent}"
        );
    }
}
