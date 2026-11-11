use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to synthesize speech audio.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiSpeechCreateRequest {
    /// Text to synthesize; at most 4096 characters.
    pub input: String,

    /// Voice control instructions; not supported by tts-1 or tts-1-hd.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,

    /// TTS model id such as tts-1, tts-1-hd, or gpt-4o-mini-tts.
    pub model: String,

    /// Requested audio response format.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_format: Option<String>,

    /// Speech speed in [0.25, 4.0].
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub speed: Option<f64>,

    /// Streaming format; `sse` is not supported by tts-1 or tts-1-hd.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream_format: Option<String>,

    /// Built-in voice name such as alloy, ash, or marin, or a custom voice object with an `id`.
    pub voice: String,
}
