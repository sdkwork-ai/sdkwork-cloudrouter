use serde::{Deserialize, Serialize};

use crate::models::OpenAiTokenLogprob;

/// OpenAI-compatible open ai choice logprobs schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiChoiceLogprobs {
    /// Token log probabilities for generated content.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<Vec<OpenAiTokenLogprob>>,

    /// Token log probabilities for refusal content.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub refusal: Option<Vec<OpenAiTokenLogprob>>,
}
