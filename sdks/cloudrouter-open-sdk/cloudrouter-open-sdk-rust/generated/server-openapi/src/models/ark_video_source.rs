use serde::{Deserialize, Serialize};

/// Ark video content source.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ArkVideoSource {
    /// Video URL or `asset://<id>` asset reference.
    pub url: String,
}
