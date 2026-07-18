use serde::{Deserialize, Serialize};

use crate::models::{OpenAiResponseOutputContent};

/// OpenAI-compatible open ai response output item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiResponseOutputItem {
    /// Content parts for message output items.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<Vec<OpenAiResponseOutputContent>>,

    /// Output item identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Role for message output items.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,

    /// Status for the output item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Output item type.
    pub r#type: String,
}
