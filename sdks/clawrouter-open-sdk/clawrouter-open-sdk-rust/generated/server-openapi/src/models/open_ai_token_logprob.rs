use serde::{Deserialize, Serialize};

use crate::models::{OpenAiTopLogprob};

/// OpenAI-compatible open ai token logprob schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiTokenLogprob {
    /// UTF-8 bytes for the token when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bytes: Option<Vec<i64>>,

    /// Token log probability.
    pub logprob: f64,

    /// Token text.
    pub token: String,

    /// Most likely token options at this position.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub top_logprobs: Option<Vec<OpenAiTopLogprob>>,
}
