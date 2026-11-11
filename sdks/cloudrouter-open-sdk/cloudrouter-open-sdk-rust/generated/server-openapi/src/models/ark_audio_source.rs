use serde::{Deserialize, Serialize};

/// Ark audio content source.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ArkAudioSource {
    /// Audio URL, `data:audio/<format>;base64,<data>` payload, or `asset://<id>` asset reference.
    pub url: String,
}
