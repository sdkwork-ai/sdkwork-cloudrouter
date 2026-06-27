use serde::{Deserialize, Serialize};

use crate::models::OpenAiNamedToolChoiceFunction;

/// OpenAI-compatible open ai named tool choice schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiNamedToolChoice {
    /// Function field on the open ai named tool choice, using the open ai named tool choice function module.
    pub function: OpenAiNamedToolChoiceFunction,

    /// Tool type selected by name.
    pub r#type: String,
}
