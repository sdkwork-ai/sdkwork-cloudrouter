use serde::{Deserialize, Serialize};

/// Persisted masked API key snapshot returned by the backend.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminApiKeyItem {
    /// Id field on admin api key item.
    pub id: String,

    /// Key field on admin api key item.
    pub key: String,

    /// Name field on admin api key item.
    pub name: String,

    /// Status field on admin api key item.
    pub status: String,

    /// Used field on admin api key item.
    pub used: String,
}
