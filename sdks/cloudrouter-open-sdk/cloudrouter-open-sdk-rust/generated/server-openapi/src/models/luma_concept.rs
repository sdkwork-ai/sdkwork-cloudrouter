use serde::{Deserialize, Serialize};

/// Luma concept reference.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct LumaConcept {
    /// Concept key.
    pub key: String,
}
