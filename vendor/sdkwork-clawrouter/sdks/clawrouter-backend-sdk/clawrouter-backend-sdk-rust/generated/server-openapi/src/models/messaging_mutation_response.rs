use serde::{Deserialize, Serialize};

/// Messaging mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MessagingMutationResponse {
    /// Id field on messaging mutation response.
    pub id: String,

    /// Status field on messaging mutation response.
    pub status: String,
}
