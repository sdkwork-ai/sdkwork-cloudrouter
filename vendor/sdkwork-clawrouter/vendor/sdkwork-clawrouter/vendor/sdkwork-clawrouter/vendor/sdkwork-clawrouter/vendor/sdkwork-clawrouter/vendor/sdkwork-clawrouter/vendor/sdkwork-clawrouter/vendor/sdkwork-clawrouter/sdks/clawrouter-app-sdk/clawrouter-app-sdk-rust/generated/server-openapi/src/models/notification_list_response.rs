use serde::{Deserialize, Serialize};

use crate::models::{NotificationItem};

/// Notification list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct NotificationListResponse {
    /// Items field on notification list response.
    pub items: Vec<NotificationItem>,
}
