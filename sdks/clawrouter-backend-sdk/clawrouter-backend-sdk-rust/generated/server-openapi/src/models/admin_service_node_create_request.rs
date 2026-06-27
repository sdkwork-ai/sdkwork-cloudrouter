use serde::{Deserialize, Serialize};

/// Admin service node create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminServiceNodeCreateRequest {
    /// Domain field on admin service node create request.
    pub domain: String,

    /// Ip field on admin service node create request.
    pub ip: String,

    /// Name field on admin service node create request.
    pub name: String,

    /// Remark field on admin service node create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub remark: Option<String>,

    /// Status field on admin service node create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}
