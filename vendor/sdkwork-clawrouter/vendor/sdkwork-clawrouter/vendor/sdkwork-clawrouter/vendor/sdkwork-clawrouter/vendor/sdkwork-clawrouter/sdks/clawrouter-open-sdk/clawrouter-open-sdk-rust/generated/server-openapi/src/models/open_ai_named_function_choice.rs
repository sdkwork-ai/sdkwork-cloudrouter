use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai named function choice schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiNamedFunctionChoice {
    /// Function name to force the model to call.
    pub name: String,
}
