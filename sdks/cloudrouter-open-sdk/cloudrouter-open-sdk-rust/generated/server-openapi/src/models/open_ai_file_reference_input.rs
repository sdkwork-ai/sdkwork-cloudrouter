use serde::{Deserialize, Serialize};

/// Reusable OpenAI-compatible file input reference accepted by JSON request bodies.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiFileReferenceInput {
    #[serde(flatten)]
    pub additional_properties: std::collections::HashMap<String, serde_json::Value>,
}
