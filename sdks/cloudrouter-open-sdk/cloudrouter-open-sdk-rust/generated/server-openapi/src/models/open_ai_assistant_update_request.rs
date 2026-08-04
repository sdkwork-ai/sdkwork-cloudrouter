use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to update an assistant.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiAssistantUpdateRequest {
    /// Assistant description.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Instructions applied by the assistant.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,

    /// Developer-defined assistant metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Replacement model id used by the assistant.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Assistant name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Assistant response format configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_format: Option<String>,

    /// Sampling temperature.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,

    /// Resources available to assistant tools.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_resources: Option<String>,

    /// Tool definitions available to the assistant.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<String>>,

    /// Nucleus sampling probability mass.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f64>,
}
