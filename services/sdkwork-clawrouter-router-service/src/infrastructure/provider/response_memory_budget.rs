use std::fmt::{Display, Formatter};
use std::num::NonZeroUsize;
use std::sync::{Arc, OnceLock};

use crate::ports::ProviderResponseMemoryGuard;

pub const DEFAULT_PROVIDER_RESPONSE_MEMORY_BUDGET_BYTES: usize = 512 * 1024 * 1024;
pub const MAX_PROVIDER_RESPONSE_MEMORY_BUDGET_BYTES: usize = 512 * 1024 * 1024;
pub const PROVIDER_RESPONSE_MEMORY_RESERVATION_MULTIPLIER: usize = 4;

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
        let permits = self.validate_response_limit(response_max_bytes)?;
        let permit = Arc::clone(&self.semaphore)
            .try_acquire_many_owned(permits)
            .map_err(|_| ProviderResponseMemoryBudgetError::Saturated {
                max_bytes: self.max_bytes.get(),
            })?;
        Ok(ProviderResponseMemoryGuard::new(permit))
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
}
