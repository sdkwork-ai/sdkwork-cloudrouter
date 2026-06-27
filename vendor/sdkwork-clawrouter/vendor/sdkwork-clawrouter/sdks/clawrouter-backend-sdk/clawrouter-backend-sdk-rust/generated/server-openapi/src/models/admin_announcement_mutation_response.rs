use serde::{Deserialize, Serialize};

use crate::models::{AdminAnnouncementItem};

/// Admin announcement mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAnnouncementMutationResponse {
    /// Item field on admin announcement mutation response.
    pub item: AdminAnnouncementItem,
}
