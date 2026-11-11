use serde::{Deserialize, Serialize};

/// Zhipu content-safety verdict.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ZhipuContentFilter {
    /// Severity from 0 (most severe) to 3 (mild).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub level: Option<i64>,

    /// Stage the safety check applied to.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
}
