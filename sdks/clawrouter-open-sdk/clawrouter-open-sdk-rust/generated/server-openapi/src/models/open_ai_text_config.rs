use serde::{Deserialize, Serialize};

use crate::models::{OpenAiResponseFormat};

/// OpenAI-compatible open ai text config schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiTextConfig {
    /// Format field on the open ai text config, using the open ai response format module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub format: Option<OpenAiResponseFormat>,
}
