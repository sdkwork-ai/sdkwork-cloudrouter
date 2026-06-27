use serde::{Deserialize, Serialize};

use crate::models::{UsageLogItem};

/// Usage logs response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct UsageLogsResponse {
    /// Logs field on usage logs response.
    pub logs: Vec<UsageLogItem>,

    /// Page field on usage logs response.
    pub page: String,

    /// Page size field on usage logs response.
    #[serde(rename = "pageSize")]
    pub page_size: String,

    /// Total field on usage logs response.
    pub total: String,
}
