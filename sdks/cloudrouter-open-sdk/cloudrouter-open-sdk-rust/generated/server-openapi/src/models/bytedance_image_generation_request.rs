use serde::{Deserialize, Serialize};

use crate::models::{ArkWebSearchTool};

/// ByteDance Ark Seedream image generation request; the vendor serves the official `/api/v3/images/generations` contract.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct BytedanceImageGenerationRequest {
    /// Transparent-background mode. Requires a single transparent input image and forces PNG output.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub background: Option<String>,

    /// Optional reference image or images. Layer decomposition accepts exactly one image.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,

    /// When true the model splits the input image into one base image plus up to 16 transparent PNG layers.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub layer_decomposition: Option<bool>,

    /// ByteDance Ark Seedream image model id or endpoint id, for example doubao-seedream-5-0-pro-260628.
    pub model: String,

    /// Prompt optimization configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub optimize_prompt_options: Option<std::collections::HashMap<String, String>>,

    /// Output image format. Layer decomposition only applies this to the base image; layers are always PNG.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_format: Option<String>,

    /// Image prompt. Required for image generation; optional for layer decomposition, where omitting it lets the model pick every major element.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Return a download URL or inline Base64 image data.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_format: Option<String>,

    /// Grouped-image generation: `auto` lets the model decide whether and how many images to return.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sequential_image_generation: Option<String>,

    /// Grouped-image configuration; only effective when `sequential_image_generation` is `auto`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sequential_image_generation_options: Option<std::collections::HashMap<String, String>>,

    /// Output size: a resolution tier such as `1K`, `1.5K`, `2K`, or `4K`, or explicit `<width>x<height>` pixels. Do not mix both forms.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,

    /// When true the response streams one event per generated image instead of one final body.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,

    /// Tools the model may call while generating the image.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<ArkWebSearchTool>>,

    /// When true the vendor adds its AI-generated watermark to the image.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub watermark: Option<bool>,
}
