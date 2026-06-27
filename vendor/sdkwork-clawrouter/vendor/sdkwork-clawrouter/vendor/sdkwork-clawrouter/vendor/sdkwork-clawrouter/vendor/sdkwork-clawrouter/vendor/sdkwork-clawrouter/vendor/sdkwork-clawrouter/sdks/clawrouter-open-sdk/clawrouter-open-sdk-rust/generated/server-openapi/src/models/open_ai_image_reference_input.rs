use serde::{Deserialize, Serialize};

/// Reusable OpenAI-compatible image input reference accepted by JSON request bodies.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiImageReferenceInput {
    #[serde(flatten)]
    pub additional_properties: std::collections::HashMap<String, serde_json::Value>,
}
