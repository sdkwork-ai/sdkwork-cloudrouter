use serde::{Deserialize, Serialize};

use crate::models::OpenAiError;

/// OpenAI-compatible open ai error envelope schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiErrorEnvelope {
    /// Error field on the open ai error envelope, using the open ai error module.
    pub error: OpenAiError,
}
