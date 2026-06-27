use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai top logprob schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiTopLogprob {
    /// UTF-8 bytes for the candidate token when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bytes: Option<Vec<i64>>,

    /// Candidate token log probability.
    pub logprob: f64,

    /// Candidate token text.
    pub token: String,
}
