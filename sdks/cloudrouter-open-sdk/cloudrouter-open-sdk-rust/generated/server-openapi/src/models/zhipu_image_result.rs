use serde::{Deserialize, Serialize};

/// One generated Zhipu image.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ZhipuImageResult {
    /// Image URL; the temporary link is valid for 30 days.
    pub url: String,
}
