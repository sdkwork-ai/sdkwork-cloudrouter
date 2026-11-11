use serde::{Deserialize, Serialize};

/// One generated Kling image.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct KlingImageResult {
    /// Zero-based image index within the task.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub index: Option<i64>,

    /// Image URL; Kling retains results for 30 days.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}
