use serde::{Deserialize, Serialize};

use crate::models::{NotificationMutationResponse};

/// Notifications popup seen create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct NotificationsPopupSeenCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on notifications popup seen create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<NotificationMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
