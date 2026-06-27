use serde::{Deserialize, Serialize};

/// Legacy function calling control.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiFunctionCallChoice {
    #[serde(flatten)]
    pub additional_properties: std::collections::HashMap<String, serde_json::Value>,
}
