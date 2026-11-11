use serde::{Deserialize, Serialize};

/// Vidu vidu text to video request schema exposed by Cloud Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ViduTextToVideoRequest {
    /// Requested output aspect ratio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,

    /// Whether Vidu produces synchronized audio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio: Option<bool>,

    /// Optional callback URL sent to Vidu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// Requested video duration in seconds when supported by the selected Vidu model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<i64>,

    /// JSON metadata string forwarded to Vidu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub meta_data: Option<String>,

    /// Vidu model name accepted by the upstream account.
    pub model: String,

    /// Off-peak generation at a lower price; completed within 48 hours.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub off_peak: Option<bool>,

    /// Opaque payload forwarded to Vidu and echoed back by task queries.
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

    /// Whether the output carries the Vidu watermark.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub watermark: Option<bool>,

    /// Watermark position: 1 top-right, 2 top-left, 3 bottom-right, 4 bottom-left.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub wm_position: Option<i64>,

    /// Custom watermark image URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub wm_url: Option<String>,
}
