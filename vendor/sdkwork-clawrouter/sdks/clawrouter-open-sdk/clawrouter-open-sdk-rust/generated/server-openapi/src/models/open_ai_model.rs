use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai model schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiModel {
    /// Unix timestamp in seconds when the model was created, when known.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created: Option<i64>,

    /// Model identifier or Claw Router catalog key.
    pub id: String,

    /// Object type, always model.
    pub object: String,

    /// Organization or provider that owns the model.
    pub owned_by: String,
}
