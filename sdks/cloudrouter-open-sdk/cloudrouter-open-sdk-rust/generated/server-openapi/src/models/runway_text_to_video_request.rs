use serde::{Deserialize, Serialize};

/// Runway text-to-video task request (union of the vendor's per-model request variants).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RunwayTextToVideoRequest {
    /// Whether the output includes generated audio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio: Option<bool>,

    /// Output bitrate tier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bitrate: Option<String>,

    /// Classifier-free guidance scale.
    #[serde(rename = "cfgScale")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cfg_scale: Option<f64>,

    /// Content-moderation settings, for example `publicFigureThreshold`.
    #[serde(rename = "contentModeration")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content_moderation: Option<std::collections::HashMap<String, String>>,

    /// Generate a cheaper draft.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub draft: Option<bool>,

    /// Draft task to refine when generating the final video.
    #[serde(rename = "draftTaskId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub draft_task_id: Option<String>,

    /// Requested duration in seconds; accepted bounds depend on the selected model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<i64>,

    /// Runway video model id, for example gen4.5, veo3.1, or kling3.0_pro.
    pub model: String,

    /// Content the model should avoid.
    #[serde(rename = "negativePrompt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub negative_prompt: Option<String>,

    /// Output container and encoding.
    #[serde(rename = "outputFormat")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_format: Option<String>,

    /// Prompt expansion mode.
    #[serde(rename = "promptExpansionMode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt_expansion_mode: Option<String>,

    /// Text prompt describing the requested video.
    #[serde(rename = "promptText")]
    pub prompt_text: String,

    /// ProRes profile when `outputFormat` is a ProRes variant.
    #[serde(rename = "proresProfile")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prores_profile: Option<String>,

    /// Model-provider-specific settings.
    #[serde(rename = "providerSettings")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_settings: Option<std::collections::HashMap<String, String>>,

    /// Requested aspect ratio such as 1280:720.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ratio: Option<String>,

    /// Reference audio clips.
    #[serde(rename = "referenceAudio")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reference_audio: Option<Vec<std::collections::HashMap<String, String>>>,

    /// Reference videos.
    #[serde(rename = "referenceVideos")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reference_videos: Option<Vec<std::collections::HashMap<String, String>>>,

    /// Reference images or videos.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub references: Option<Vec<std::collections::HashMap<String, String>>>,

    /// Output resolution tier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resolution: Option<String>,

    /// Optional deterministic seed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,
}
