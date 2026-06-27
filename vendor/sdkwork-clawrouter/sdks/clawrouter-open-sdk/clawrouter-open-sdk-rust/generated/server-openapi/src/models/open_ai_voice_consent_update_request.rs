use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to update a voice consent.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVoiceConsentUpdateRequest {
    /// Developer-defined consent metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable consent name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}
