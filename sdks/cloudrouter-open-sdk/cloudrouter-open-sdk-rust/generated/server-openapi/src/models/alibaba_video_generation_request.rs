use serde::{Deserialize, Serialize};

/// Alibaba DashScope Wan video generation request (`POST /api/v1/services/aigc/video-generation/video-synthesis`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AlibabaVideoGenerationRequest {
    /// DashScope input envelope. `prompt` is required for text-to-video and `img_url` is required for image-to-video; reference-to-video models use `reference_urls`.
    pub input: std::collections::HashMap<String, String>,

    /// Wan video model id, for example wan2.7-t2v-2026-06-12, wan2.6-i2v, or wan2.6-r2v.
    pub model: String,

    /// DashScope video processing parameters.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parameters: Option<std::collections::HashMap<String, String>>,
}
