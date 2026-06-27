use serde::{Deserialize, Serialize};

/// Admin service node update request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminServiceNodeUpdateRequest {
    /// Domain field on admin service node update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub domain: Option<String>,

    /// Ip field on admin service node update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ip: Option<String>,

    /// Name field on admin service node update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Remark field on admin service node update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub remark: Option<String>,
}
