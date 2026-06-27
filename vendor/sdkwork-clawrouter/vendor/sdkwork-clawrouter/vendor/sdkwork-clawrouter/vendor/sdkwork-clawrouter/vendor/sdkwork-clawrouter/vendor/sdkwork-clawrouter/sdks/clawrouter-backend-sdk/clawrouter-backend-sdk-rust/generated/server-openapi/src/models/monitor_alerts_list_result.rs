use serde::{Deserialize, Serialize};

use crate::models::{AdminMonitorAlertsResponse};

/// Monitor alerts list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MonitorAlertsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on monitor alerts list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminMonitorAlertsResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
