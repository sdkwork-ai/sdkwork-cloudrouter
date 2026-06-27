use serde::{Deserialize, Serialize};

/// Google Gemini google function response schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleFunctionResponse {
    /// Function name being answered.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Response field on the google function response, using the provider json object module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response: Option<std::collections::HashMap<String, serde_json::Value>>,
}
