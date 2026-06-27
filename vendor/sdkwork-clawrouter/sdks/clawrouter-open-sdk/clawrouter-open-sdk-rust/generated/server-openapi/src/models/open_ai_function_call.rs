use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai function call schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiFunctionCall {
    /// JSON-serialized function arguments.
    pub arguments: String,

    /// Function name selected by the model.
    pub name: String,
}
