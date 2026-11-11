use serde::{Deserialize, Serialize};

/// Alibaba DashScope Wanx image generation request (`POST /api/v1/services/aigc/text2image/image-synthesis`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AlibabaImageGenerationRequest {
    /// DashScope input envelope.
    pub input: std::collections::HashMap<String, String>,

    /// Wanx image model id, for example wan2.5-t2i-preview or wan2.2-t2i-flash.
    pub model: String,

    /// DashScope image processing parameters.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parameters: Option<std::collections::HashMap<String, String>>,
}
