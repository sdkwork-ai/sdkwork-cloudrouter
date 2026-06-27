use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai prompt reference schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiPromptReference {
    /// Reusable prompt identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Prompt variables supplied by the caller.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub variables: Option<std::collections::HashMap<String, String>>,

    /// Reusable prompt version.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
}
