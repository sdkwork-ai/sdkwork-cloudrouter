use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai completion tokens details schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiCompletionTokensDetails {
    /// Prediction tokens accepted by the model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub accepted_prediction_tokens: Option<i64>,

    /// Number of output audio tokens generated.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio_tokens: Option<i64>,

    /// Number of reasoning tokens generated.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reasoning_tokens: Option<i64>,

    /// Prediction tokens rejected by the model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rejected_prediction_tokens: Option<i64>,
}
