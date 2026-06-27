use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai named tool choice function schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiNamedToolChoiceFunction {
    /// Function name to force the model to call.
    pub name: String,
}
