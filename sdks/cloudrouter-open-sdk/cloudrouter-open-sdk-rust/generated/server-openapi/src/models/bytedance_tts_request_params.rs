use serde::{Deserialize, Serialize};

use crate::models::{BytedanceTtsAudioParams};

/// ByteDance Seed TTS synthesis parameters.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct BytedanceTtsRequestParams {
    /// JSON-encoded optional settings such as `pronunciation_dict`, `tone`, or `explicit_language`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub additions: Option<String>,

    /// Audio params field on the bytedance tts request params, using the bytedance tts audio params module.
    pub audio_params: BytedanceTtsAudioParams,

    /// Model version, default `seed-tts-2.0-standard`; required when `speaker` is a cloned voice.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Pronunciation dictionary that corrects how specific words are read.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pronunciation_dict: Option<std::collections::HashMap<String, String>>,

    /// Seed TTS voice id from the console voice library.
    pub speaker: String,

    /// SSML markup; only Chinese and English voices support it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ssml: Option<String>,

    /// Text to synthesize.
    pub text: String,

    /// Pronunciation rules, for example `北京/(bei3)(jing1)`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tone: Option<Vec<String>>,
}
