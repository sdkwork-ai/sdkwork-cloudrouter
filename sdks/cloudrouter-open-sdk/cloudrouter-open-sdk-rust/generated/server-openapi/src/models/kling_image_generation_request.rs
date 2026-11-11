use serde::{Deserialize, Serialize};

use crate::models::{KlingElementReference, KlingWatermarkInfo};

/// Kling image generation request (`POST /v1/images/generations`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct KlingImageGenerationRequest {
    /// Output aspect ratio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,

    /// Callback URL notified when the task changes state.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// Subject references from the Kling element library.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub element_list: Option<Vec<KlingElementReference>>,

    /// Caller-supplied task id, unique per account.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub external_task_id: Option<String>,

    /// Face similarity strength; vendor default 0.45.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub human_fidelity: Option<f64>,

    /// Reference image URL or Base64 string without a data-URL prefix.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,

    /// Reference strength for the uploaded image; vendor default 0.5.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_fidelity: Option<f64>,

    /// How the reference image is used.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_reference: Option<String>,

    /// Kling image model name; the vendor default is `kling-v3`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model_name: Option<String>,

    /// Number of images to generate.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub n: Option<i64>,

    /// Negative prompt.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub negative_prompt: Option<String>,

    /// Positive prompt; at most 2500 characters.
    pub prompt: String,

    /// Output resolution tier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resolution: Option<String>,

    /// Watermark configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub watermark_info: Option<KlingWatermarkInfo>,
}
