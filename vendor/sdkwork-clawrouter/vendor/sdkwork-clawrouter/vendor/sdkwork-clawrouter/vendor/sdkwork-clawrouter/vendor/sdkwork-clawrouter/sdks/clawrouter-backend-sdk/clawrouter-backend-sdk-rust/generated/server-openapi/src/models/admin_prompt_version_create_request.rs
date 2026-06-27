use serde::{Deserialize, Serialize};

/// Admin prompt version create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminPromptVersionCreateRequest {
    /// Content field on admin prompt version create request.
    pub content: String,

    /// Examples json field on admin prompt version create request.
    #[serde(rename = "examplesJson")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub examples_json: Option<Vec<std::collections::HashMap<String, String>>>,

    /// Model constraints field on admin prompt version create request.
    #[serde(rename = "modelConstraints")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model_constraints: Option<std::collections::HashMap<String, String>>,

    /// Output schema field on admin prompt version create request.
    #[serde(rename = "outputSchema")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_schema: Option<std::collections::HashMap<String, String>>,

    /// Safety policy field on admin prompt version create request.
    #[serde(rename = "safetyPolicy")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub safety_policy: Option<std::collections::HashMap<String, String>>,

    /// Title field on admin prompt version create request.
    pub title: String,

    /// Variable schema field on admin prompt version create request.
    #[serde(rename = "variableSchema")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub variable_schema: Option<std::collections::HashMap<String, String>>,

    /// Version no field on admin prompt version create request.
    #[serde(rename = "versionNo")]
    pub version_no: String,
}
