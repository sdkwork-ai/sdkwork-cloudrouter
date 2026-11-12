use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai model schema exposed by Cloud Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiModel {
    /// Unix timestamp in seconds when the model was created, when known.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created: Option<i64>,

    /// Model display name from the Cloud Router catalog.
    #[serde(rename = "displayName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,

    /// Model identifier or Cloud Router catalog key.
    pub id: String,

    /// Object type, always model.
    pub object: String,

    /// Organization or provider that owns the model.
    pub owned_by: String,

    /// Display name of the model vendor from the Cloud Router catalog.
    #[serde(rename = "vendorDisplayName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub vendor_display_name: Option<String>,
}
