#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InvocationErrorKind {
    InvalidRequest,
    Authentication,
    Authorization,
    ResourceClassification,
    Routing,
    Pricing,
    Dispatch,
    ProviderPassthroughFailed,
    Usage,
    Telemetry,
    Internal,
}

impl InvocationErrorKind {
    pub fn code(self) -> &'static str {
        match self {
            Self::InvalidRequest => "invalid_request",
            Self::Authentication => "authentication_failed",
            Self::Authorization => "authorization_failed",
            Self::ResourceClassification => "resource_classification_failed",
            Self::Routing => "routing_failed",
            Self::Pricing => "pricing_failed",
            Self::Dispatch => "dispatch_failed",
            Self::ProviderPassthroughFailed => "provider_passthrough_failed",
            Self::Usage => "usage_failed",
            Self::Telemetry => "telemetry_failed",
            Self::Internal => "internal_error",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvocationError {
    pub kind: InvocationErrorKind,
    pub message: String,
}

impl InvocationError {
    pub fn new(kind: InvocationErrorKind, message: impl Into<String>) -> Self {
        Self {
            kind,
            message: message.into(),
        }
    }
}

impl std::fmt::Display for InvocationError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(formatter, "{}: {}", self.kind.code(), self.message)
    }
}

impl std::error::Error for InvocationError {}
