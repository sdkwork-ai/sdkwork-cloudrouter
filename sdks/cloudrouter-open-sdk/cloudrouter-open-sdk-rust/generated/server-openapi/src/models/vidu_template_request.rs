use serde::{Deserialize, Serialize};

/// Vidu scene-template request (`POST /ent/v2/template`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ViduTemplateRequest {
    /// Region option for the `exotic_princess` template.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub area: Option<String>,

    /// Requested aspect ratio; supported values depend on the template.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,

    /// Beast option for the `beast_companion` template.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub beast: Option<String>,

    /// Whether Vidu adds generated background music.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bgm: Option<bool>,

    /// Optional callback URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// Input image URLs or Base64 data URLs.
    pub images: Vec<String>,

    /// JSON metadata string forwarded to Vidu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub meta_data: Option<String>,

    /// Off-peak generation at a lower price.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub off_peak: Option<bool>,

    /// Opaque payload forwarded to Vidu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub payload: Option<String>,

    /// Text prompt; required for some templates such as `subject_3`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Optional deterministic seed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Template id such as `hugging`; each template accepts its own extra parameters.
    pub template: String,

    /// Motion reference video URLs for motion-control templates such as `motion_control_2`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub video_urls: Option<Vec<String>>,

    /// Whether the output carries the Vidu watermark.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub watermark: Option<bool>,

    /// Watermark position.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub wm_position: Option<i64>,

    /// Custom watermark image URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub wm_url: Option<String>,
}
