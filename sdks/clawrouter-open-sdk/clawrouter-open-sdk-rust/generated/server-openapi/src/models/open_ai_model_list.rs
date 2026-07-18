use serde::{Deserialize, Serialize};

use crate::models::{OpenAiModel};

/// OpenAI-compatible open ai model list schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiModelList {
    /// Model objects available to the caller.
    pub data: Vec<OpenAiModel>,

    /// Object type, always list.
    pub object: String,
}
