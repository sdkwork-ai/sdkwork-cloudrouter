use serde::{Deserialize, Serialize};

/// Delete api key response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DeleteApiKeyResponse {
    /// Deleted field on delete api key response.
    pub deleted: bool,

    /// Id field on delete api key response.
    pub id: String,
}
