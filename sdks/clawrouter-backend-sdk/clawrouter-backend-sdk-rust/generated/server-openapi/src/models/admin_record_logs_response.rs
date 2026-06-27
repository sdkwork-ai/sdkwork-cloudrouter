use serde::{Deserialize, Serialize};

use crate::models::{AdminRecordLogItem};

/// Admin record logs response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminRecordLogsResponse {
    /// Logs field on admin record logs response.
    pub logs: Vec<AdminRecordLogItem>,

    /// Page field on admin record logs response.
    pub page: String,

    /// Page size field on admin record logs response.
    #[serde(rename = "pageSize")]
    pub page_size: String,

    /// Total field on admin record logs response.
    pub total: String,
}
