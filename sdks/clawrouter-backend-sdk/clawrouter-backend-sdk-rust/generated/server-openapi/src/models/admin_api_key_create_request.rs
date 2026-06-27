use serde::{Deserialize, Serialize};

/// Admin api key create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminApiKeyCreateRequest {
    /// Human-readable API key name.
    pub name: String,

    /// User identifier that owns the API key.
    #[serde(rename = "userId")]
    pub user_id: String,
}
