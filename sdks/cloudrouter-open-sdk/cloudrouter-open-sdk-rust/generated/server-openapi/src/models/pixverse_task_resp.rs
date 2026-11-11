use serde::{Deserialize, Serialize};

/// PixVerse task payload shared by creation and polling.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct PixverseTaskResp {
    /// Task aspect ratio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,

    /// Task creation timestamp.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub create_time: Option<String>,

    /// Credits consumed by the task.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub credits: Option<i64>,

    /// Capability-specific metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub customer_paths: Option<std::collections::HashMap<String, String>>,

    /// Service task duration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<i64>,

    /// Whether the result includes audio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub has_audio: Option<bool>,

    /// Task id returned by the result endpoint.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,

    /// Last update timestamp.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub modify_time: Option<String>,

    /// Task negative prompt.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub negative_prompt: Option<String>,

    /// Output height; may be 0 while processing.
    #[serde(rename = "outputHeight")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_height: Option<i64>,

    /// Output width; may be 0 while processing.
    #[serde(rename = "outputWidth")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_width: Option<i64>,

    /// Service path.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,

    /// Task prompt.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Output quality.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub quality: Option<String>,

    /// Service resolution field.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resolution_ratio: Option<i64>,

    /// Generation seed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Service size field.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size: Option<i64>,

    /// 1 completed, 5 generating, 7 moderation failed, 8 generation failed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<i64>,

    /// Style identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub style: Option<String>,

    /// Output URL; only ready when `status` is 1.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,

    /// Task id returned by creation; poll it through the result endpoint.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub video_id: Option<i64>,
}
