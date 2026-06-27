use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai chat image url schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiChatImageUrl {
    /// Image detail preference, such as low, high, or auto.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,

    /// Image URL or data URL.
    pub url: String,
}
