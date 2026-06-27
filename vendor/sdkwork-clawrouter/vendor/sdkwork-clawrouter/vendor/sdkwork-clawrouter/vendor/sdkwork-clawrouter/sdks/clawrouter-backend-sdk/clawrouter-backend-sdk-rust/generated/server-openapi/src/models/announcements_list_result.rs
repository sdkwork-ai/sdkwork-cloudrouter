use serde::{Deserialize, Serialize};

use crate::models::{AdminAnnouncementsResponse};

/// Announcements list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnnouncementsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on announcements list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminAnnouncementsResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
