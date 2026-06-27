use serde::{Deserialize, Serialize};

/// Google Gemini google function call schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleFunctionCall {
    /// Args field on the google function call, using the provider json object module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub args: Option<std::collections::HashMap<String, serde_json::Value>>,

    /// Function name selected by the model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}
