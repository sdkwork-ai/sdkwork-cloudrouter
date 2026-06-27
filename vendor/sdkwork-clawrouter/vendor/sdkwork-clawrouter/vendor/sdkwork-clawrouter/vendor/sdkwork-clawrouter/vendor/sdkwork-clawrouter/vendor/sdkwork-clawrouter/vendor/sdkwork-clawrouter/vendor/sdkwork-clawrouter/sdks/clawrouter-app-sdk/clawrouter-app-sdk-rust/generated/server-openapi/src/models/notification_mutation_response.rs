use serde::{Deserialize, Serialize};

/// Notification mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct NotificationMutationResponse {
    /// State field on notification mutation response.
    pub state: String,

    /// Updated field on notification mutation response.
    pub updated: bool,
}
