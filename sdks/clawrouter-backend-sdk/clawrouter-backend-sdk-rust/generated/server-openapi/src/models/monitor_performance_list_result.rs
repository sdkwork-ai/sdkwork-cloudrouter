use serde::{Deserialize, Serialize};

use crate::models::{AdminMonitorPerformanceResponse};

/// Monitor performance list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MonitorPerformanceListResult {
    /// Business response code.
    pub code: String,

    /// Data field on monitor performance list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminMonitorPerformanceResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
