use serde::{Deserialize, Serialize};

/// Ark tool configuration.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ArkWebSearchTool {
    /// Tool type; `web_search` lets the model decide whether to search the web.
    pub r#type: String,
}
