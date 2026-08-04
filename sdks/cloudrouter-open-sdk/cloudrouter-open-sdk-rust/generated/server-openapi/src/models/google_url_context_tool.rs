use serde::{Deserialize, Serialize};

/// Google URL context tool configuration.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleUrlContextTool {
    /// Domains allowed for URL context retrieval.
    #[serde(rename = "allowedDomains")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub allowed_domains: Option<Vec<String>>,
}
