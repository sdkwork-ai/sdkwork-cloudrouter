use serde::{Deserialize, Serialize};

use crate::models::{MiniMaxMusicAudioSetting};

/// MiniMax music generation request payload.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MiniMaxMusicGenerationRequest {
    /// MiniMax music model id, for example music-3.0 or music-2.6.
    pub model: String,

    /// Style, mood, or scene description for the generated music.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Lyrics with structure tags such as [Verse] and [Chorus].
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lyrics: Option<String>,

    /// Stream the generated audio back instead of returning one payload.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,

    /// Audio delivery format: url or hex.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_format: Option<String>,

    /// Generate instrumental music without vocals.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub is_instrumental: Option<bool>,

    /// Let the model generate lyrics from the prompt when lyrics are empty.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lyrics_optimizer: Option<bool>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio_setting: Option<MiniMaxMusicAudioSetting>,
}
