use serde::{Deserialize, Serialize};

use crate::models::{AdminAnnouncementMutationResponse};

/// Announcements update result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnnouncementsUpdateResult {
    /// Business response code.
    pub code: String,

    /// Data field on announcements update result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminAnnouncementMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
