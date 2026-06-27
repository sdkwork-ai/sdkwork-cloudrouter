use serde::{Deserialize, Serialize};

/// Admin prompt create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminPromptCreateRequest {
    /// Category id field on admin prompt create request.
    #[serde(rename = "categoryId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub category_id: Option<String>,

    /// Description field on admin prompt create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Name field on admin prompt create request.
    pub name: String,

    /// Prompt key field on admin prompt create request.
    #[serde(rename = "promptKey")]
    pub prompt_key: String,

    /// Prompt type field on admin prompt create request.
    #[serde(rename = "promptType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt_type: Option<String>,

    /// Tags field on admin prompt create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,

    /// Visibility field on admin prompt create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub visibility: Option<String>,
}
