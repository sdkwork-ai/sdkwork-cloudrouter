use serde::{Deserialize, Serialize};

use crate::models::{AdminMcpServerRevisionItem};

/// Admin mcp server revision list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMcpServerRevisionListResponse {
    /// Items field on admin mcp server revision list response.
    pub items: Vec<AdminMcpServerRevisionItem>,
}
