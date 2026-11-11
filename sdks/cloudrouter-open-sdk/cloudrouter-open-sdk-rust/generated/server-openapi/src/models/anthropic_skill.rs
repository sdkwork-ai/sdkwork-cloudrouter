use serde::{Deserialize, Serialize};

/// One skill loaded into an Anthropic container.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicSkill {
    /// Skill id.
    pub skill_id: String,

    /// Built-in or user-defined skill.
    pub r#type: String,

    /// Skill version or `latest`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
}
