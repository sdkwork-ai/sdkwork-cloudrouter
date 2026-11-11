use serde::{Deserialize, Serialize};

/// Gemini video operation schema exposed by Cloud Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GeminiVideoOperation {
    /// Whether the operation finished.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub done: Option<bool>,

    /// Vendor error envelope.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<std::collections::HashMap<String, String>>,

    /// Long-running operation resource name, for example models/veo-3.1-generate-preview/operations/op-1.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Finished operation response.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response: Option<std::collections::HashMap<String, String>>,
}
