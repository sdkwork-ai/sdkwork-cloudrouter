use serde::{Deserialize, Serialize};

/// Vidu timing-to-audio request (`POST /ent/v2/timing2audio`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ViduTimingToAudioRequest {
    /// Whether to add generated background music.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bgm: Option<bool>,

    /// Callback URL notified when the task changes state.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// Audio duration in seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<f64>,

    /// Vidu audio model name, for example `audio1.0`.
    pub model: String,

    /// Off-peak generation at a lower price.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub off_peak: Option<bool>,

    /// Opaque payload forwarded to Vidu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub payload: Option<String>,

    /// Optional deterministic seed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Timed sound-effect events with `prompt`, `from`, and `to`.
    pub timing_prompts: Vec<std::collections::HashMap<String, String>>,
}
