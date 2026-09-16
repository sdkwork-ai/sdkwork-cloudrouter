use serde::{Deserialize, Serialize};

/// Kling-compatible kling avatar create request schema exposed by Cloud Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct KlingAvatarCreateRequest {
    /// Driving audio URL used when voice_mode is audio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio_url: Option<String>,

    /// Optional callback URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// Character image URL driving the digital human.
    pub human_image: String,

    /// Kling avatar model id, for example kling-ai-avatar-v2.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model_name: Option<String>,

    /// Optional expression or performance description for the avatar.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Driving speech text used when voice_mode is tts.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,

    /// Optional voice id for the tts mode.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub voice_id: Option<String>,

    /// Optional speech language for the tts mode.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub voice_language: Option<String>,

    /// Voice input mode, for example audio or tts.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub voice_mode: Option<String>,
}
