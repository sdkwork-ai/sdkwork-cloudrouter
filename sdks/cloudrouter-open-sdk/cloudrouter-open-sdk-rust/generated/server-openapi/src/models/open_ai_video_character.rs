use serde::{Deserialize, Serialize};

/// OpenAI-compatible reusable video character object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVideoCharacter {
    /// Unix timestamp in seconds when the character was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Human-readable character description.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Video character identifier.
    pub id: String,

    /// Reference image URL when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,

    /// Developer-defined character metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable character name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Object type, normally video.character.
    pub object: String,
}
