use serde::{Deserialize, Serialize};

/// Controls which tool is called by the model.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiToolChoice {
    #[serde(flatten)]
    pub additional_properties: std::collections::HashMap<String, serde_json::Value>,
}
