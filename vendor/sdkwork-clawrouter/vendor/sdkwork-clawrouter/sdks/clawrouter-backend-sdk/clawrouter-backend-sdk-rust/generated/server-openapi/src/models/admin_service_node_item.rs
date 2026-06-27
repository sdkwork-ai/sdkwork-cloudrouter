use serde::{Deserialize, Serialize};

/// Admin service node item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminServiceNodeItem {
    /// Domain field on admin service node item.
    pub domain: String,

    /// Health status field on admin service node item.
    #[serde(rename = "healthStatus")]
    pub health_status: String,

    /// Id field on admin service node item.
    pub id: String,

    /// Ip field on admin service node item.
    pub ip: String,

    /// Name field on admin service node item.
    pub name: String,

    /// Remark field on admin service node item.
    pub remark: String,

    /// Status field on admin service node item.
    pub status: String,

    /// Updated at field on admin service node item.
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}
