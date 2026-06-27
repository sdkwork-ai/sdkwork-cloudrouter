use serde::{Deserialize, Serialize};

/// Anthropic Claude anthropic content source schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicContentSource {
    /// Base64 or text source payload.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<String>,

    /// Anthropic file identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_id: Option<String>,

    /// Media type of the source payload.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub media_type: Option<String>,

    /// Source type, such as base64, url, file, or text.
    pub r#type: String,

    /// URL source.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}
