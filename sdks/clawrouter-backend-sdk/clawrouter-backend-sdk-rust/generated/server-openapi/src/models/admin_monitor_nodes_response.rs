use serde::{Deserialize, Serialize};

use crate::models::{AdminMonitorNodeItem};

/// Admin monitor nodes response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMonitorNodesResponse {
    /// Items field on admin monitor nodes response.
    pub items: Vec<AdminMonitorNodeItem>,
}
