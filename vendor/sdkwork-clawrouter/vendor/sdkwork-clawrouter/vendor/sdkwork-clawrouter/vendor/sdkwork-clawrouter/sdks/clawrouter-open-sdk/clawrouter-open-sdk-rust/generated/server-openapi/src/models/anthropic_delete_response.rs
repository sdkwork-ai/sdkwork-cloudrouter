use serde::{Deserialize, Serialize};

/// Anthropic Claude anthropic delete response schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicDeleteResponse {
    /// Whether the object was deleted.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub deleted: Option<bool>,

    /// Deleted object identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Deleted object type.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
}
