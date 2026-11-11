use serde::{Deserialize, Serialize};

/// Runway text-to-image task request (union of the vendor's per-model request variants).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RunwayTextToImageRequest {
    /// Output background.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub background: Option<String>,

    /// Background color when the background is opaque.
    #[serde(rename = "backgroundColor")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub background_color: Option<String>,

    /// Palette colors requested by the caller.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub colors: Option<Vec<String>>,

    /// Content-moderation settings, for example `publicFigureThreshold`.
    #[serde(rename = "contentModeration")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content_moderation: Option<std::collections::HashMap<String, String>>,

    /// Run the model in edit mode.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub edit: Option<bool>,

    /// Enable grounding for the generation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub grounding: Option<bool>,

    /// Mask image URI for edit mode.
    #[serde(rename = "maskUri")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mask_uri: Option<String>,

    /// Runway image model id, for example gen4_image.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Number of images to generate.
    #[serde(rename = "outputCount")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_count: Option<i64>,

    /// Output image format.
    #[serde(rename = "outputFormat")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_format: Option<String>,

    /// Use precise editing.
    #[serde(rename = "preciseEdit")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub precise_edit: Option<bool>,

    /// Text prompt describing the requested image.
    #[serde(rename = "promptText")]
    pub prompt_text: String,

    /// Generation quality tier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub quality: Option<String>,

    /// Requested aspect ratio such as 1920:1080.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ratio: Option<String>,

    /// Reference images carrying a uri and an optional tag.
    #[serde(rename = "referenceImages")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reference_images: Option<Vec<std::collections::HashMap<String, String>>>,

    /// Optional deterministic seed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Reasoning effort for image models that support it.
    #[serde(rename = "thinkingLevel")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thinking_level: Option<String>,
}
