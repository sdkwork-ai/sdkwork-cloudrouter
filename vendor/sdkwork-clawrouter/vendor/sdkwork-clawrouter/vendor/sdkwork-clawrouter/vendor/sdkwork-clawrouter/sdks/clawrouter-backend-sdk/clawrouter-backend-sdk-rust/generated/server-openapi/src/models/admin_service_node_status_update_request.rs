use serde::{Deserialize, Serialize};

/// Admin service node status update request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminServiceNodeStatusUpdateRequest {
    /// Status field on admin service node status update request.
    pub status: String,
}
