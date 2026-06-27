use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai incomplete details schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiIncompleteDetails {
    /// Reason the response is incomplete.
    pub reason: String,
}
