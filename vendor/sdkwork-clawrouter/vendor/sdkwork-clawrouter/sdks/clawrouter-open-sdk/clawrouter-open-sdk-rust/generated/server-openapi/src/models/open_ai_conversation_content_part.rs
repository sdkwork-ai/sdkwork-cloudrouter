use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai conversation content part schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiConversationContentPart {
    /// Uploaded file identifier for file-backed content parts.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_id: Option<String>,

    /// Image URL for image parts when represented as a URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,

    /// Text content for text parts.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,

    /// Content part type, such as input_text, output_text, input_image, or provider-specific type.
    pub r#type: String,
}
