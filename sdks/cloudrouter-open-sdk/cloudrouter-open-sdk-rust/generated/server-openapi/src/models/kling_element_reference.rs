use serde::{Deserialize, Serialize};

/// Reference to a subject in the Kling element library.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct KlingElementReference {
    /// Kling subject id from the element library.
    pub element_id: i64,
}
