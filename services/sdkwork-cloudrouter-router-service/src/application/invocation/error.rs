#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InvocationErrorKind {
    InvalidRequest,
    Authentication,
    Authorization,
    /// Request rejected because the account group's model blacklist/whitelist
    /// forbids the requested model. Maps to HTTP 403.
    ModelForbidden,
    ResourceClassification,
    Routing,
    Pricing,
    Dispatch,
    ProviderPassthroughFailed,
    Usage,
    Telemetry,
    Idempotency,
    /// Request rejected because a concurrency or rate limit was exceeded
    /// (e.g. tenant in-flight request cap). Maps to HTTP 429.
    RateLimit,
    Internal,
}

impl InvocationErrorKind {
    pub fn code(self) -> &'static str {
        match self {
            Self::InvalidRequest => "invalid_request",
            Self::Authentication => "authentication_failed",
            Self::Authorization => "authorization_failed",
            Self::ModelForbidden => "model_forbidden",
            Self::ResourceClassification => "resource_classification_failed",
            Self::Routing => "routing_failed",
            Self::Pricing => "pricing_failed",
            Self::Dispatch => "dispatch_failed",
            Self::ProviderPassthroughFailed => "provider_passthrough_failed",
            Self::Usage => "usage_failed",
            Self::Telemetry => "telemetry_failed",
            Self::Idempotency => "idempotency_error",
            Self::RateLimit => "rate_limit_exceeded",
            Self::Internal => "internal_error",
        }
    }

    /// OpenAI-compatible error `type` for the gateway's public OpenAI-format
    /// error envelope. OpenAI SDKs and clients match on these canonical values
    /// (`authentication_error`, `rate_limit_error`, `invalid_request_error`,
    /// `permission_error`, `conflict_error`, `server_error`, ...) to drive
    /// retry/backoff and user-facing messaging, so the public `type` field must
    /// use the official vocabulary even though the detailed machine `code`
    /// keeps the internal reason.
    pub fn openai_error_type(self) -> &'static str {
        match self {
            Self::InvalidRequest | Self::ResourceClassification => "invalid_request_error",
            Self::Authentication => "authentication_error",
            Self::Authorization | Self::ModelForbidden => "permission_error",
            Self::Idempotency => "conflict_error",
            Self::RateLimit => "rate_limit_error",
            Self::Routing
            | Self::Pricing
            | Self::Dispatch
            | Self::ProviderPassthroughFailed
            | Self::Usage
            | Self::Telemetry
            | Self::Internal => "server_error",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvocationError {
    pub kind: InvocationErrorKind,
    pub message: String,
    /// `Retry-After` hint for `RateLimit` rejections (RFC 6585).
    pub retry_after_secs: Option<u64>,
}

impl InvocationError {
    pub fn new(kind: InvocationErrorKind, message: impl Into<String>) -> Self {
        Self {
            kind,
            message: message.into(),
            retry_after_secs: None,
        }
    }

    /// Attaches a `Retry-After` hint (used by rate-limit rejections).
    pub fn with_retry_after(mut self, retry_after_secs: u64) -> Self {
        self.retry_after_secs = Some(retry_after_secs);
        self
    }
}

impl std::fmt::Display for InvocationError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(formatter, "{}: {}", self.kind.code(), self.message)
    }
}

impl std::error::Error for InvocationError {}

#[cfg(test)]
mod tests {
    use super::{InvocationError, InvocationErrorKind};

    #[test]
    fn openai_error_type_maps_internal_kinds_to_official_vocabulary() {
        assert_eq!(
            "invalid_request_error",
            InvocationErrorKind::InvalidRequest.openai_error_type()
        );
        assert_eq!(
            "invalid_request_error",
            InvocationErrorKind::ResourceClassification.openai_error_type()
        );
        assert_eq!(
            "authentication_error",
            InvocationErrorKind::Authentication.openai_error_type()
        );
        assert_eq!(
            "permission_error",
            InvocationErrorKind::Authorization.openai_error_type()
        );
        assert_eq!(
            "permission_error",
            InvocationErrorKind::ModelForbidden.openai_error_type()
        );
        assert_eq!(
            "conflict_error",
            InvocationErrorKind::Idempotency.openai_error_type()
        );
        assert_eq!(
            "rate_limit_error",
            InvocationErrorKind::RateLimit.openai_error_type()
        );
        for kind in [
            InvocationErrorKind::Routing,
            InvocationErrorKind::Pricing,
            InvocationErrorKind::Dispatch,
            InvocationErrorKind::ProviderPassthroughFailed,
            InvocationErrorKind::Usage,
            InvocationErrorKind::Telemetry,
            InvocationErrorKind::Internal,
        ] {
            assert_eq!("server_error", kind.openai_error_type());
        }
    }

    #[test]
    fn retry_after_hint_is_attached_to_rate_limit_errors() {
        let error = InvocationError::new(
            InvocationErrorKind::RateLimit,
            "tenant in-flight concurrency limit exceeded",
        )
        .with_retry_after(1);
        assert_eq!(Some(1), error.retry_after_secs);
        assert_eq!("rate_limit_error", error.kind.openai_error_type());
    }

    #[test]
    fn detailed_internal_code_is_kept_alongside_official_type() {
        let error = InvocationError::new(
            InvocationErrorKind::Routing,
            "no routable upstream account/model",
        );
        assert_eq!("routing_failed", error.kind.code());
        assert_eq!("server_error", error.kind.openai_error_type());
    }
}
