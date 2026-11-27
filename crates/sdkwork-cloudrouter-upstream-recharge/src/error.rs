//! Typed errors for relay recharge calls.

/// Failure of one relay recharge exchange.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum RechargeClientError {
    /// The configured relay origin or API key is not usable.
    #[error("invalid relay recharge connection: {0}")]
    InvalidConnection(String),
    /// The transport failed before a complete response arrived.
    #[error("relay recharge transport failed: {0}")]
    Transport(String),
    /// The relay rejected the API key.
    #[error("relay rejected the recharge API key: {0}")]
    Unauthorized(String),
    /// The relay answered with a `ProblemDetail` failure.
    #[error("relay recharge request failed ({status}, code {code}): {detail}")]
    Relay {
        /// HTTP status returned by the relay.
        status: u16,
        /// Numeric platform/problem code returned by the relay.
        code: i64,
        /// Human-readable detail returned by the relay.
        detail: String,
    },
    /// The relay answered with a success status but an unusable body.
    #[error("relay recharge response is invalid: {0}")]
    InvalidResponse(String),
}

impl RechargeClientError {
    /// HTTP status of the failure when the relay answered at all.
    #[must_use]
    pub fn status_code(&self) -> Option<u16> {
        match self {
            Self::Unauthorized(_) => Some(401),
            Self::Relay { status, .. } => Some(*status),
            Self::InvalidConnection(_) | Self::Transport(_) | Self::InvalidResponse(_) => None,
        }
    }

    /// Whether the relay rejected the configured API key.
    #[must_use]
    pub fn is_auth_error(&self) -> bool {
        matches!(self, Self::Unauthorized(_))
    }

    /// Whether the failure is around the relay network/URL rather than the
    /// recharge command, so the caller can report a configuration problem.
    #[must_use]
    pub fn is_connection_error(&self) -> bool {
        matches!(self, Self::InvalidConnection(_) | Self::Transport(_))
    }
}
