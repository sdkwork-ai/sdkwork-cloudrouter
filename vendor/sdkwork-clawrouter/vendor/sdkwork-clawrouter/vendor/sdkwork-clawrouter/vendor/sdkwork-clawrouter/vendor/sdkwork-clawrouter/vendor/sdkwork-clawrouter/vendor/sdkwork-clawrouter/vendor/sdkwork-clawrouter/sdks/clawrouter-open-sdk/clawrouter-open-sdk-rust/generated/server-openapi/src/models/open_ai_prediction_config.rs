use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai prediction config schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiPredictionConfig {
    /// Static predicted content.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,

    /// Prediction configuration type.
    pub r#type: String,
}
