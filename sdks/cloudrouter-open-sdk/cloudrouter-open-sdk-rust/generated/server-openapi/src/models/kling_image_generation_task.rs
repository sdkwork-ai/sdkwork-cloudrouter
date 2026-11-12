use serde::{Deserialize, Serialize};

use crate::models::KlingImageTaskData;

/// Kling image task envelope returned by the create and query endpoints.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct KlingImageGenerationTask {
    /// Kling business status code; 0 means success.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub code: Option<i64>,

    /// Task record.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<KlingImageTaskData>,

    /// Kling status message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,

    /// Kling request identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
}
