use serde::{Deserialize, Serialize};

use crate::models::KlingImageResult;

/// Kling image task output.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct KlingImageTaskResult {
    /// Generated images.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<KlingImageResult>>,
}
