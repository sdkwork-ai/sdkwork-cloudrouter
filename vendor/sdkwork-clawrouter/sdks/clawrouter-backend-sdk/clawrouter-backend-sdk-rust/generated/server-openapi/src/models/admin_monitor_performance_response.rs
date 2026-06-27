use serde::{Deserialize, Serialize};

use crate::models::{AdminMonitorPerformanceItem};

/// Admin monitor performance response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMonitorPerformanceResponse {
    /// Items field on admin monitor performance response.
    pub items: Vec<AdminMonitorPerformanceItem>,
}
