use serde::{Deserialize, Serialize};

/// Ark tool usage counters.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ArkVideoToolUsage {
    /// Number of web search calls made; 0 means the tool was not used.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub web_search: Option<i64>,
}
