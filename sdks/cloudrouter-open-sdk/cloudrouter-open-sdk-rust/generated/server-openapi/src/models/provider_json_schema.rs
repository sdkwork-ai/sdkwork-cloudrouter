use serde::{Deserialize, Serialize};

/// Reusable JSON Schema object used by provider tool definitions.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ProviderJsonSchema {
    /// JSON Schema additionalProperties value.
    #[serde(rename = "additionalProperties")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub additional_properties: Option<bool>,

    /// Human-readable schema description.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Allowed literal values.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub r#enum: Option<Vec<String>>,

    /// Items field on the provider json schema, using the provider json schema module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub items: Option<serde_json::Value>,

    /// Object property schemas keyed by field name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub properties: Option<std::collections::HashMap<String, serde_json::Value>>,

    /// Required object property names.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub required: Option<Vec<String>>,

    /// JSON Schema type name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
}
