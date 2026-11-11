use serde::{Deserialize, Serialize};

/// ElevenLabs per-request voice settings.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ElevenLabsVoiceSettings {
    /// How closely the output matches professional voice clone samples in [0, 1]; applies only to v4 fine-tuned clones.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub clone_strength: Option<f64>,

    /// How closely the output adheres to the original voice in [0, 1].
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub similarity_boost: Option<f64>,

    /// Speech speed, where 1.0 is the stored voice speed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub speed: Option<f64>,

    /// Voice stability in [0, 1]; lower values widen the emotional range.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stability: Option<f64>,

    /// Style exaggeration; non-zero values cost more compute and add latency.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub style: Option<f64>,

    /// Boost similarity to the original speaker at a slightly higher latency.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub use_speaker_boost: Option<bool>,
}
