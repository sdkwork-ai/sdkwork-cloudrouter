use serde::{Deserialize, Serialize};

use crate::models::{MiniMaxMusicAudioSetting};

/// MiniMax music generation request (`POST /v1/music_generation`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MiniMaxMusicGenerationRequest {
    /// Base64 reference audio for `music-cover` models; exactly one of `audio_url` or `audio_base64`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio_base64: Option<String>,

    /// Audio output configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio_setting: Option<MiniMaxMusicAudioSetting>,

    /// Reference audio URL for `music-cover` models; exactly one of `audio_url` or `audio_base64`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio_url: Option<String>,

    /// Feature id from the Music Cover Preprocess API; mutually exclusive with the reference audio fields.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cover_feature_id: Option<String>,

    /// Generate instrumental music without vocals.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub is_instrumental: Option<bool>,

    /// Lyrics with structure tags such as [Verse] and [Chorus].
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lyrics: Option<String>,

    /// Let the model generate lyrics from the prompt when lyrics are empty.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lyrics_optimizer: Option<bool>,

    /// Music model name.
    pub model: String,

    /// Audio delivery format; streaming supports only `hex`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_format: Option<String>,

    /// Style, mood, or scene description for the generated music.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Stream the generated audio back instead of returning one payload.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
}
