use serde::{Deserialize, Serialize};

/// Update storage provider request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct UpdateStorageProviderRequest {
    /// Reason field on update storage provider request.
    pub reason: String,

    /// Status field on update storage provider request.
    pub status: String,
}
