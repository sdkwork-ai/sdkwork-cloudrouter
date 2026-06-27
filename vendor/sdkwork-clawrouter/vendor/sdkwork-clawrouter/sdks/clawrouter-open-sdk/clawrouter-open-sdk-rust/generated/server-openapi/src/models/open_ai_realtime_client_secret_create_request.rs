use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a realtime client secret.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRealtimeClientSecretCreateRequest {
    /// Realtime session instructions.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,

    /// Developer-defined realtime metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Realtime modalities requested by the session.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub modalities: Option<Vec<String>>,

    /// Realtime model id or Claw Router catalog key.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Voice identifier for realtime audio output.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub voice: Option<String>,
}
