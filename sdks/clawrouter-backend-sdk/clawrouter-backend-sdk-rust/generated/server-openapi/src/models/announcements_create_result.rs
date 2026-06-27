use serde::{Deserialize, Serialize};

use crate::models::{AdminAnnouncementMutationResponse};

/// Announcements create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnnouncementsCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on announcements create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminAnnouncementMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
