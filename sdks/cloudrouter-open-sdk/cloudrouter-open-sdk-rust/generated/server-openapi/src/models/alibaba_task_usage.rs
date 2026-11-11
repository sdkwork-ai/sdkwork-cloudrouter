use serde::{Deserialize, Serialize};

/// DashScope task usage counters.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AlibabaTaskUsage {
    /// Output resolution tier, for example 720.
    #[serde(rename = "SR")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sr: Option<i64>,

    /// Total billed video seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<f64>,

    /// Number of successfully generated images.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_count: Option<i64>,

    /// Input video seconds; fixed to 0 for text-to-video and image-to-video.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_video_duration: Option<i64>,

    /// Generated video seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_video_duration: Option<i64>,

    /// Output aspect ratio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ratio: Option<String>,
}
