use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai chat audio config schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiChatAudioConfig {
    /// Audio output format requested from the upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,

    /// Voice identifier for audio output.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub voice: Option<String>,
}
