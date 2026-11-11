use serde::{Deserialize, Serialize};

/// ElevenLabs audio effects applied to generated speech.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ElevenLabsAudioEffects {
    /// Background noise bed id such as `cafe` or `keyboard`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub background_noise_id: Option<String>,

    /// Perceived speaker distance in [0, 1].
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub distance: Option<f64>,

    /// Reverb environment id such as `small_room` or `hall`; forces stereo output.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub environment_id: Option<String>,

    /// Filter preset id such as `phone` or `old_radio`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub filter_preset_id: Option<String>,

    /// Voice stereo position from -1 (hard left) to 1 (hard right).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pan: Option<f64>,

    /// How much of the voice feeds the reverb in [0, 1]; only applies when `environment_id` is set.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub send_level: Option<f64>,
}
