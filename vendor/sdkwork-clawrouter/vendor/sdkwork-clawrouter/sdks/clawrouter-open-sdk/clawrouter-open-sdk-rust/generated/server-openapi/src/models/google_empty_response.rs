use serde::{Deserialize, Serialize};

/// Empty JSON object returned by Google APIs for successful delete operations.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleEmptyResponse {
    /// Object marker for an empty successful Google response.
    pub object: String,
}
