use serde::{Deserialize, Serialize};

use crate::models::{UsageLogsResponse};

/// Usage logs list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct UsageLogsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on usage logs list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<UsageLogsResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
