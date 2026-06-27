use serde::{Deserialize, Serialize};

use crate::models::{AdminMonitorAlertItem};

/// Admin monitor alerts response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMonitorAlertsResponse {
    /// Items field on admin monitor alerts response.
    pub items: Vec<AdminMonitorAlertItem>,
}
