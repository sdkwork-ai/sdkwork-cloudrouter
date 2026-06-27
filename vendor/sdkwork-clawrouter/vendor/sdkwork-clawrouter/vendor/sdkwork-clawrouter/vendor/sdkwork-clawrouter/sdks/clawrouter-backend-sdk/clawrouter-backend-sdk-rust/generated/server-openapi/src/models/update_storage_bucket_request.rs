use serde::{Deserialize, Serialize};

/// Update storage bucket request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct UpdateStorageBucketRequest {
    /// Reason field on update storage bucket request.
    pub reason: String,

    /// Status field on update storage bucket request.
    pub status: String,
}
