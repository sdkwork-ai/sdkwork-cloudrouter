use serde::{Deserialize, Serialize};

use crate::models::OpenAiSkillVersion;

/// OpenAI-compatible skill object exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiSkill {
    /// Unix timestamp in seconds when the skill was created.
    pub created_at: i64,

    /// Human-readable skill description.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Skill identifier.
    pub id: String,

    /// Latest skill version identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub latest_version: Option<String>,

    /// Developer-defined skill metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable skill name.
    pub name: String,

    /// Object type, normally skill.
    pub object: String,

    /// Skill lifecycle status.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Unix timestamp in seconds when the skill was last updated.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<i64>,

    /// Skill versions returned inline when supported.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub versions: Option<Vec<OpenAiSkillVersion>>,
}
