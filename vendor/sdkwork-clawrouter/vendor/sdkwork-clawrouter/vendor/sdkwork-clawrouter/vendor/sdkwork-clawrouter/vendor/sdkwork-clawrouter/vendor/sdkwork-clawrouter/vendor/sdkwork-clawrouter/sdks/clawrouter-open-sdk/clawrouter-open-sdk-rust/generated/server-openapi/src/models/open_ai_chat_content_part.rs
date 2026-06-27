use serde::{Deserialize, Serialize};

use crate::models::{OpenAiChatFile, OpenAiChatImageUrl, OpenAiChatInputAudio};

/// OpenAI-compatible open ai chat content part schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiChatContentPart {
    /// File field on the open ai chat content part, using the open ai chat file module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file: Option<OpenAiChatFile>,

    /// Image url field on the open ai chat content part, using the open ai chat image url module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_url: Option<OpenAiChatImageUrl>,

    /// Input audio field on the open ai chat content part, using the open ai chat input audio module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_audio: Option<OpenAiChatInputAudio>,

    /// Text content for text parts.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,

    /// Content part type, such as text, image_url, input_audio, or file.
    pub r#type: String,
}
