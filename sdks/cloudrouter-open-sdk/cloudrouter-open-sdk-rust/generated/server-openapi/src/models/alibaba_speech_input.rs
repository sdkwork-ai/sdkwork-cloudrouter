use serde::{Deserialize, Serialize};

/// DashScope TTS input envelope.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AlibabaSpeechInput {
    /// Instruction-control prompt for Qwen3-TTS-Instruct models; up to 1600 tokens.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,

    /// Language of the input text; defaults to Auto.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub language_type: Option<String>,

    /// Rewrite `instructions` for more natural speech; requires `instructions`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub optimize_instructions: Option<bool>,

    /// Text to synthesize; Qwen-TTS accepts up to 600 characters for non-Qwen3 models.
    pub text: String,

    /// System voice name, for example Cherry.
    pub voice: String,
}
