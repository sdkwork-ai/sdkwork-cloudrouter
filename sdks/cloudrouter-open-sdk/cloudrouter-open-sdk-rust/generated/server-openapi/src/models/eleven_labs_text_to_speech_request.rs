use serde::{Deserialize, Serialize};

use crate::models::{ElevenLabsAudioEffects, ElevenLabsPronunciationDictionaryLocator, ElevenLabsVoiceSettings};

/// ElevenLabs text-to-speech request (`POST /v1/text-to-speech/{voice_id}`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ElevenLabsTextToSpeechRequest {
    /// Enable language text normalization; currently Japanese only and may add latency.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub apply_language_text_normalization: Option<bool>,

    /// Text normalization mode.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub apply_text_normalization: Option<String>,

    /// Audio effects applied to the generated speech.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio_effects: Option<ElevenLabsAudioEffects>,

    /// ISO 639-1 language code used to enforce a language for the model and text normalization; ignored when the model does not support it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub language_code: Option<String>,

    /// Text-to-speech model id; the vendor default is `eleven_multilingual_v2`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model_id: Option<String>,

    /// Request ids generated after this one, at most 3; takes precedence over `next_text`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_request_ids: Option<Vec<String>>,

    /// Text that follows this request, used to keep concatenated generations continuous.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_text: Option<String>,

    /// Request ids generated before this one, at most 3; takes precedence over `previous_text`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub previous_request_ids: Option<Vec<String>>,

    /// Text that preceded this request, used to keep concatenated generations continuous.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub previous_text: Option<String>,

    /// Pronunciation dictionaries applied to the text in order; at most 3.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pronunciation_dictionary_locators: Option<Vec<ElevenLabsPronunciationDictionaryLocator>>,

    /// Best-effort deterministic sampling seed in [0, 4294967295].
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Text to synthesize into speech.
    pub text: String,

    /// Use the IVC version of a professional voice to improve expressiveness and reduce latency.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub use_pvc_as_ivc: Option<bool>,

    /// Voice settings that override the stored settings for this request only.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub voice_settings: Option<ElevenLabsVoiceSettings>,
}
