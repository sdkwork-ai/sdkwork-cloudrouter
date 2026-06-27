use serde::{Deserialize, Serialize};

use crate::models::{AdminAnnouncementItem};

/// Admin announcements response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAnnouncementsResponse {
    /// Items field on admin announcements response.
    pub items: Vec<AdminAnnouncementItem>,
}
