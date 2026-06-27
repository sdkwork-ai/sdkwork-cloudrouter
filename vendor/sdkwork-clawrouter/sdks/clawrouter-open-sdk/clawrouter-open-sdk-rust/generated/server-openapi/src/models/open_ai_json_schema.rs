use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai json schema schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiJsonSchema {
    /// Additional map values using the open ai json schema additional properties module.
    #[serde(rename = "additionalProperties")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub additional_properties: Option<bool>,

    /// JSON schema description.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Allowed literal values.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub r#enum: Option<Vec<String>>,

    /// Items field on the open ai json schema, using the open ai json schema module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub items: Option<serde_json::Value>,

    /// Object property schemas.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub properties: Option<std::collections::HashMap<String, serde_json::Value>>,

    /// Required object property names.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub required: Option<Vec<String>>,

    /// JSON schema type.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
}
