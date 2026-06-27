use serde::{Deserialize, Serialize};

/// OpenAI-compatible organization project object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiProject {
    /// Unix timestamp in seconds when the project was archived.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub archived_at: Option<i64>,

    /// Unix timestamp in seconds when the project was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Project identifier.
    pub id: String,

    /// Developer-defined project metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable project name.
    pub name: String,

    /// Object type, normally organization.project.
    pub object: String,

    /// Project lifecycle status.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}
