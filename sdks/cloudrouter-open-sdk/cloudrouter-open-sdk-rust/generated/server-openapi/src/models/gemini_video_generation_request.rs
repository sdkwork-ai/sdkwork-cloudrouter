use serde::{Deserialize, Serialize};

/// Gemini video generation request schema exposed by Cloud Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GeminiVideoGenerationRequest {
    /// Generation instances.
    pub instances: Vec<std::collections::HashMap<String, String>>,

    /// Generation tuning parameters.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parameters: Option<std::collections::HashMap<String, String>>,
}
