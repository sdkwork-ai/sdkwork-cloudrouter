use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai response input content part schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiResponseInputContentPart {
    /// Image detail preference when supported.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,

    /// Inline file data for compatible upstreams.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_data: Option<String>,

    /// Uploaded file identifier for input_file parts.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_id: Option<String>,

    /// Filename for inline file inputs.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub filename: Option<String>,

    /// Image URL for input_image parts.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,

    /// Text for input_text parts.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,

    /// Responses API input content part type.
    pub r#type: String,
}
