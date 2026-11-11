use serde::{Deserialize, Serialize};

/// Ark image content source.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ArkImageSource {
    /// Image URL, `data:image/<format>;base64,<data>` payload, or `asset://<id>` asset reference.
    pub url: String,
}
