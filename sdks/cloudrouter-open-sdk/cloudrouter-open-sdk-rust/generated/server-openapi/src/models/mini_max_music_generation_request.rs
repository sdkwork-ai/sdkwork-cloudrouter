use serde::{Deserialize, Serialize};

use crate::models::{MiniMaxMusicAudioSetting};

/// Mini max music generation request schema exposed by Cloud Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MiniMaxMusicGenerationRequest {
    /// Audio setting field on the mini max music generation request, using the mini max music audio setting module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio_setting: Option<MiniMaxMusicAudioSetting>,

    /// Generate instrumental music without vocals.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub is_instrumental: Option<bool>,

    /// Lyrics with structure tags such as [Verse] and [Chorus].
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lyrics: Option<String>,

    /// Let the model generate lyrics from the prompt when lyrics are empty.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lyrics_optimizer: Option<bool>,

    /// MiniMax music model id, for example music-3.0 or music-2.6.
    pub model: String,

    /// Audio delivery format: url or hex.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_format: Option<String>,

    /// Style, mood, or scene description for the generated music.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Stream the generated audio back instead of returning one payload.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
}
