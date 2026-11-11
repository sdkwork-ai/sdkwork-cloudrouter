use serde::{Deserialize, Serialize};

use crate::models::{AnthropicSkill};

/// Anthropic container selection and skills.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicContainer {
    /// Container id.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Skills to load in the container.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub skills: Option<Vec<AnthropicSkill>>,
}
