use serde::{Deserialize, Serialize};

use crate::models::{ElevenLabsMusicPrompt};

/// ElevenLabs music generation request (`POST /v1/music`). Supply `prompt`, or `composition_plan`, but not both.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ElevenLabsMusicGenerationRequest {
    /// Detailed composition plan; mutually exclusive with `prompt`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub composition_plan: Option<ElevenLabsMusicPrompt>,

    /// Finetune id to apply.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub finetune_id: Option<String>,

    /// How strongly the finetune influences the generation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub finetune_strength: Option<f64>,

    /// Guarantee an instrumental result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub force_instrumental: Option<bool>,

    /// Generation mode hint; only usable with `prompt`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub generation_mode: Option<String>,

    /// Lyrics to use for the generation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lyrics_text: Option<String>,

    /// Music model id.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model_id: Option<String>,

    /// Song length in milliseconds; only used with `prompt`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub music_length_ms: Option<i64>,

    /// Music prompt field on the eleven labs music generation request, using the eleven labs music prompt module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub music_prompt: Option<ElevenLabsMusicPrompt>,

    /// Text prompt to generate a song from; mutually exclusive with `composition_plan`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// How strictly composition-plan section durations are enforced.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub respect_sections_durations: Option<bool>,

    /// Random seed; cannot be used with `prompt`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Sign the generated song with C2PA; mp3 only.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sign_with_c2pa: Option<bool>,

    /// Store the generated song for inpainting.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub store_for_inpainting: Option<bool>,

    /// Spell proper names phonetically in the lyrics.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub use_phonetic_names: Option<bool>,
}
