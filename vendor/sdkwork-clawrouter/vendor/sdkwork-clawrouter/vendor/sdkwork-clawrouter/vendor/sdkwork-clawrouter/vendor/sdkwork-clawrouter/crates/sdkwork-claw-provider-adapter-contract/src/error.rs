use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AdapterErrorKind {
    AdapterNotConfigured,
    AdapterUnavailable,
    AdapterTimeout,
    AdapterInvalidResponse,
    AdapterAuthFailed,
    AdapterEndpointNotSupported,
    ProviderNativeHttpError,
    ProviderNativeRateLimited,
    ProviderNativeAuthFailed,
    ProviderNativeTaskFailed,
    ProviderResponseNormalizationFailed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AdapterError {
    pub kind: AdapterErrorKind,
    pub code: String,
    pub message: String,
    pub retryable: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status_code: Option<u16>,
}

impl AdapterError {
    pub fn new(
        kind: AdapterErrorKind,
        code: impl Into<String>,
        message: impl Into<String>,
    ) -> Self {
        Self {
            kind,
            code: code.into(),
            message: message.into(),
            retryable: false,
            status_code: None,
        }
    }

    pub fn retryable(mut self, retryable: bool) -> Self {
        self.retryable = retryable;
        self
    }

    pub fn with_status_code(mut self, status_code: u16) -> Self {
        self.status_code = Some(status_code);
        self
    }
}
