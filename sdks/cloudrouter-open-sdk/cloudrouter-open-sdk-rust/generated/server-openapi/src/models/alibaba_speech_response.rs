use serde::{Deserialize, Serialize};

/// Alibaba DashScope speech synthesis response carrying the generated audio URL.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AlibabaSpeechResponse {
    /// DashScope business error code when the synthesis failed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,

    /// DashScope business error message when the synthesis failed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,

    /// Output envelope carrying audio.url (valid for 24 hours) and finish_reason.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output: Option<std::collections::HashMap<String, String>>,

    /// DashScope request identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,

    /// DashScope usage block carrying the billed character count.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage: Option<std::collections::HashMap<String, String>>,
}
