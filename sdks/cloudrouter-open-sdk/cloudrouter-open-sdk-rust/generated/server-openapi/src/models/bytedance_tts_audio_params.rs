use serde::{Deserialize, Serialize};

/// ByteDance TTS output audio parameters.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct BytedanceTtsAudioParams {
    /// Output audio format.
    pub format: String,

    /// Volume relative to the default.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub loudness_rate: Option<i64>,

    /// Output sample rate in Hz, for example 24000.
    pub sample_rate: i64,

    /// Speech rate relative to the default.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub speech_rate: Option<i64>,
}
