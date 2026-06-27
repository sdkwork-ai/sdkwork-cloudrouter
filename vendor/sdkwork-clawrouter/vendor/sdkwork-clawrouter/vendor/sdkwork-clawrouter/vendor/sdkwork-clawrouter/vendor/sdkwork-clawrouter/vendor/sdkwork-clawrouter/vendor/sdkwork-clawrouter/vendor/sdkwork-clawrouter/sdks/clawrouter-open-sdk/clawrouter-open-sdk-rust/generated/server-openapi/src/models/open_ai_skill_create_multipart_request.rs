use serde::{Deserialize, Serialize};

/// OpenAI-compatible multipart request to create a skill.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiSkillCreateMultipartRequest {
    /// Skill package archive or manifest file.
    pub file: String,

    /// JSON-serialized skill metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<String>,

    /// Human-readable skill name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Skill package archive when the upstream expects this form field.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub package: Option<String>,
}
