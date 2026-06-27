use serde::{Deserialize, Serialize};

/// Vidu vidu text to video request schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ViduTextToVideoRequest {
    /// Requested output aspect ratio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,

    /// Optional callback URL sent to Vidu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// Requested video duration in seconds when supported by the selected Vidu model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<i64>,

    /// Vidu model name accepted by the upstream account.
    pub model: String,

    /// Vidu movement amplitude option when supported.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub movement_amplitude: Option<String>,

    /// Optional provider callback payload sent to Vidu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub payload: Option<String>,

    /// Text prompt sent to the Vidu API.
    pub prompt: String,

    /// Requested output resolution when supported.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resolution: Option<String>,

    /// Optional deterministic seed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,
}
