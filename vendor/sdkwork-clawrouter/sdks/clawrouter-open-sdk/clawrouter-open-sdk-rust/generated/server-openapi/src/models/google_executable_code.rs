use serde::{Deserialize, Serialize};

/// Google Gemini google executable code schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleExecutableCode {
    /// Code emitted by the model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,

    /// Programming language of executable code.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
}
