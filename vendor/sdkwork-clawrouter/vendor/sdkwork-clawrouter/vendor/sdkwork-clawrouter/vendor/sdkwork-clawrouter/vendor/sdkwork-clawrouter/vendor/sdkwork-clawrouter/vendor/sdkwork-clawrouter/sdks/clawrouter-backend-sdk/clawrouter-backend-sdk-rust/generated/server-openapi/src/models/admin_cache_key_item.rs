use serde::{Deserialize, Serialize};

/// Admin cache key item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminCacheKeyItem {
    /// Expires in seconds field on admin cache key item.
    #[serde(rename = "expiresInSeconds")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_in_seconds: Option<String>,

    /// Instance name field on admin cache key item.
    #[serde(rename = "instanceName")]
    pub instance_name: String,

    /// Key field on admin cache key item.
    pub key: String,

    /// Namespace field on admin cache key item.
    pub namespace: String,

    /// Status field on admin cache key item.
    pub status: String,
}
