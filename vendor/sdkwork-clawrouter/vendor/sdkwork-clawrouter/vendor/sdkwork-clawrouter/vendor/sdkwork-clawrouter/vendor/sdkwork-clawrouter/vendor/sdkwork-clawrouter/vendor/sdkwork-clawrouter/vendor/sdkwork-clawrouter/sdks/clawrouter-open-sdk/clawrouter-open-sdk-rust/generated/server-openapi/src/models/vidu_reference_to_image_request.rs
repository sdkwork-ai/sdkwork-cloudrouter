use serde::{Deserialize, Serialize};

/// Vidu vidu reference to image request schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ViduReferenceToImageRequest {
    /// Requested output aspect ratio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,

    /// Optional callback URL sent to Vidu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// Reference image URLs or Vidu-supported image references.
    pub images: Vec<String>,

    /// Vidu image model name accepted by the upstream account.
    pub model: String,

    /// Optional provider callback payload sent to Vidu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub payload: Option<String>,

    /// Text prompt sent to the Vidu API.
    pub prompt: String,

    /// Optional deterministic seed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Provider-specific image style option when supported.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub style: Option<String>,
}
