use serde::{Deserialize, Serialize};

/// Dynamic retrieval configuration for Google Search grounding.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleDynamicRetrievalConfig {
    /// Dynamic retrieval confidence threshold.
    #[serde(rename = "dynamicThreshold")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dynamic_threshold: Option<f64>,

    /// Dynamic retrieval mode.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mode: Option<String>,
}
