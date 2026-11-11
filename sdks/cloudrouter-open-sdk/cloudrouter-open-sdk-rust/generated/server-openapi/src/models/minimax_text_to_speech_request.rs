use serde::{Deserialize, Serialize};

use crate::models::{MinimaxStreamOptions, MinimaxTimbreWeight, MinimaxVoiceModify};

/// MiniMax T2A v2 speech synthesis request (`POST /v1/t2a_v2`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MinimaxTextToSpeechRequest {
    /// Audio envelope: sample_rate, bitrate, format, and channel.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio_setting: Option<std::collections::HashMap<String, String>>,

    /// Language hint that improves pronunciation; `auto` lets the model detect it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub language_boost: Option<String>,

    /// Speech synthesis model.
    pub model: String,

    /// Audio delivery format; streaming supports only `hex`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_format: Option<String>,

    /// Optional pronunciation overrides for specific words.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pronunciation_dict: Option<std::collections::HashMap<String, String>>,

    /// When true the vendor streams audio frames instead of one JSON body.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,

    /// Streaming output options.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream_options: Option<MinimaxStreamOptions>,

    /// Whether the vendor also returns subtitle timings.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub subtitle_enable: Option<bool>,

    /// Subtitle granularity.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub subtitle_type: Option<String>,

    /// Text to synthesize; at most 10,000 characters, `\n` for paragraph breaks, `<#x#>` pause markers.
    pub text: String,

    /// Text normalization mode; overrides `voice_setting.text_normalization`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text_normalization_mode: Option<String>,

    /// Mixed-voice weights; `voice_setting.voice_id` is left empty when used.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timbre_weights: Option<Vec<MinimaxTimbreWeight>>,

    /// Voice effect configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub voice_modify: Option<MinimaxVoiceModify>,

    /// Voice envelope: voice_id, speed, vol, pitch, and emotion.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub voice_setting: Option<std::collections::HashMap<String, String>>,
}
