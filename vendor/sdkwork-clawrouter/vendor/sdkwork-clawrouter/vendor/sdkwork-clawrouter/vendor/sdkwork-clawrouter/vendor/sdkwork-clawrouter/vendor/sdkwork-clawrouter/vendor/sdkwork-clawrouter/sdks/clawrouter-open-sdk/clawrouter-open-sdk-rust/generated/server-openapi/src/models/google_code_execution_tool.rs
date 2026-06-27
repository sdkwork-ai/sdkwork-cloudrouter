use serde::{Deserialize, Serialize};

/// Google code execution tool configuration.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleCodeExecutionTool {
    /// Whether code execution is enabled for the tool.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,
}
