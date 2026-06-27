#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NormalizedProviderError {
    pub code: String,
    pub message: String,
    pub retryable: bool,
    pub status_code: Option<u16>,
}
