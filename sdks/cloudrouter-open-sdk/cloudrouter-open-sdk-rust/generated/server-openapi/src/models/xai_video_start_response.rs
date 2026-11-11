use serde::{Deserialize, Serialize};

/// xAI deferred video start acknowledgement (StartDeferredResponse).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct XaiVideoStartResponse {
    /// Unique request ID to poll for the result.
    pub request_id: String,
}
