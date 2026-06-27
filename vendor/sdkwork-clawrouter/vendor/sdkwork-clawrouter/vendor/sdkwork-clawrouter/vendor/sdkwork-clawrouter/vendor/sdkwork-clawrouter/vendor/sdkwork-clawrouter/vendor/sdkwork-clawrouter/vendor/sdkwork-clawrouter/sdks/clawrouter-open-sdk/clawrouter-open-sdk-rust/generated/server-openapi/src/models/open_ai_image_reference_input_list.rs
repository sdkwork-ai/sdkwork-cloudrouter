use serde::{Deserialize, Serialize};

/// Single image input reference or ordered list of image input references.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiImageReferenceInputList {
    #[serde(flatten)]
    pub additional_properties: std::collections::HashMap<String, serde_json::Value>,
}
