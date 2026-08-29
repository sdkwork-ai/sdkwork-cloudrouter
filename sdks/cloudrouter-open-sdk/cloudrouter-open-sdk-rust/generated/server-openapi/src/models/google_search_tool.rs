use serde::{Deserialize, Serialize};

use crate::models::{GoogleDynamicRetrievalConfig};

/// Google Search grounding tool configuration.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleSearchTool {
    /// Dynamic retrieval config field on the google search tool, using the google dynamic retrieval config module.
    #[serde(rename = "dynamicRetrievalConfig")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dynamic_retrieval_config: Option<GoogleDynamicRetrievalConfig>,
}
