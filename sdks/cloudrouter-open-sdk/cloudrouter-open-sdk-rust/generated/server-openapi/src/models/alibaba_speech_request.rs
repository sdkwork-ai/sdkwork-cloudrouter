use serde::{Deserialize, Serialize};

use crate::models::{AlibabaSpeechInput};

/// Alibaba DashScope Qwen-Audio-TTS / CosyVoice speech synthesis request.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AlibabaSpeechRequest {
    /// Input field on the alibaba speech request, using the alibaba speech input module.
    pub input: AlibabaSpeechInput,

    /// TTS model id, for example qwen3-tts-flash or cosyvoice-v2.
    pub model: String,

    /// DashScope synthesis parameters such as rate, pitch, volume, format, and sample_rate.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parameters: Option<std::collections::HashMap<String, String>>,
}
