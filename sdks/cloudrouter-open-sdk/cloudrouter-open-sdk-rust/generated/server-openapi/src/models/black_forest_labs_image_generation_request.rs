use serde::{Deserialize, Serialize};

/// Black Forest Labs FLUX image generation request (union of the vendor's per-model `/v1/flux-*` request variants).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct BlackForestLabsImageGenerationRequest {
    /// Requested aspect ratio such as 16:9; it takes precedence over width and height.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,

    /// Auto-crop the result to the requested aspect ratio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auto_crop: Option<bool>,

    /// Pixels to expand below the image.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bottom: Option<i64>,

    /// Mask dilation in pixels for erase operations.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dilate_pixels: Option<i64>,

    /// Disable prompt upsampling for this request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub disable_pup: Option<bool>,

    /// Finetune id applied to the generation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub finetune_id: Option<String>,

    /// Strength of the finetune.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub finetune_strength: Option<f64>,

    /// Garment image for virtual try-on.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub garment: Option<String>,

    /// Ground the generation in the input image.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub grounding: Option<bool>,

    /// Classifier-free guidance scale.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub guidance: Option<f64>,

    /// Output height in pixels.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub height: Option<i64>,

    /// Base64-encoded image to modify; may contain an alpha mask.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,

    /// Base64-encoded image used with FLUX Redux.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_prompt: Option<String>,

    /// Strength of the image prompt.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_prompt_strength: Option<f64>,

    /// Reference image URL(s) or base64 payload(s); one to ten total.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub images: Option<String>,

    /// Path to the input image.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_image: Option<String>,

    /// Second input image.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_image_2: Option<String>,

    /// Third input image.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_image_3: Option<String>,

    /// Fourth input image.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_image_4: Option<String>,

    /// Fifth input image.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_image_5: Option<String>,

    /// Sixth input image.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_image_6: Option<String>,

    /// Seventh input image.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_image_7: Option<String>,

    /// Eighth input image.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_image_8: Option<String>,

    /// Blob path of an uploaded input image.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_image_blob_path: Option<String>,

    /// Pixels to expand on the left.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub left: Option<i64>,

    /// Base64-encoded mask for inpainting or erasing.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mask: Option<String>,

    /// Generation mode for models that trade quality for speed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mode: Option<String>,

    /// Requested output format.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_format: Option<String>,

    /// Person image for virtual try-on.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub person: Option<String>,

    /// Text prompt describing the requested image.
    pub prompt: String,

    /// Whether the provider rewrites the prompt for more detail.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt_upsampling: Option<bool>,

    /// Return raw output without post-processing.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub raw: Option<bool>,

    /// Left offset of the reference image on the output canvas; negative values allowed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reference_offset_x: Option<i64>,

    /// Top offset of the reference image on the output canvas; negative values allowed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reference_offset_y: Option<i64>,

    /// Output resolution tier for the FLUX 2 / 3 models.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resolution: Option<String>,

    /// Pixels to expand on the right.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub right: Option<i64>,

    /// Moderation strictness from 0 (strictest) to 6.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub safety_tolerance: Option<i64>,

    /// Optional deterministic seed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Number of diffusion steps.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub steps: Option<i64>,

    /// Pixels to expand above the image.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub top: Option<i64>,

    /// Opaque end-user identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,

    /// Endpoint version: `latest` or a dated release.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,

    /// Optional secret for webhook signature verification.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub webhook_secret: Option<String>,

    /// URL that receives webhook notifications.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub webhook_url: Option<String>,

    /// Output width in pixels.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub width: Option<i64>,
}
