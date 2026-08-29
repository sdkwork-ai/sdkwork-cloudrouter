use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai voice consent multipart request schema exposed by Cloud Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVoiceConsentMultipartRequest {
    /// Voice consent file.
    pub file: Vec<u8>,

    /// Provider-specific metadata for the voice consent.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable voice consent name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}
