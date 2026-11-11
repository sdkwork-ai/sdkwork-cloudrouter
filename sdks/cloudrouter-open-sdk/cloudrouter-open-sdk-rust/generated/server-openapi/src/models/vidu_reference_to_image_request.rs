use serde::{Deserialize, Serialize};

/// Vidu vidu reference to image request schema exposed by Cloud Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ViduReferenceToImageRequest {
    /// Requested output aspect ratio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,

    /// Whether to add generated background music.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bgm: Option<bool>,

    /// Optional callback URL sent to Vidu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// Reference image URLs or Vidu-supported image references.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<String>>,

    /// Vidu image model name accepted by the upstream account.
    pub model: String,

    /// Off-peak generation at a lower price.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub off_peak: Option<bool>,

    /// Opaque payload forwarded to Vidu and echoed back by task queries.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub payload: Option<String>,

    /// Text prompt sent to the Vidu API.
    pub prompt: String,

    /// Requested output resolution, for example `1080p`, `2K`, or `4K`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resolution: Option<String>,

    /// Optional deterministic seed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,
}
