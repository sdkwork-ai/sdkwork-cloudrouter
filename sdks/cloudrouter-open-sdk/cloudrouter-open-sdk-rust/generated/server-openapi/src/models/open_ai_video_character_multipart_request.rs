use serde::{Deserialize, Serialize};

/// OpenAI-compatible multipart request to create a reusable video character.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVideoCharacterMultipartRequest {
    /// Human-readable character description.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Binary character reference image.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file: Option<String>,

    /// Character reference image when required by the selected upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,

    /// JSON-serialized character metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<String>,

    /// Human-readable character name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}
