use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a realtime translation session.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRealtimeTranslationSessionCreateRequest {
    /// Developer-defined realtime metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Realtime translation model id or Claw Router catalog key.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Source language for realtime translation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_language: Option<String>,

    /// Target language for realtime translation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_language: Option<String>,
}
