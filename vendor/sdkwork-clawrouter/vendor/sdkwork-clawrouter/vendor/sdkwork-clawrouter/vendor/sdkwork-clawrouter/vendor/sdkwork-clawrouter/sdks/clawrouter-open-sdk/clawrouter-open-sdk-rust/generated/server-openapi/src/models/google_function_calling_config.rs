use serde::{Deserialize, Serialize};

/// Google Gemini google function calling config schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleFunctionCallingConfig {
    /// Function names the model may call.
    #[serde(rename = "allowedFunctionNames")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub allowed_function_names: Option<Vec<String>>,

    /// Function calling mode.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mode: Option<String>,
}
