use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai chat input audio schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiChatInputAudio {
    /// Base64-encoded audio data.
    pub data: String,

    /// Input audio format.
    pub format: String,
}
