use serde::{Deserialize, Serialize};

use crate::models::{AdminMcpServerRevisionItem};

/// Admin mcp server revision mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMcpServerRevisionMutationResponse {
    /// Item field on admin mcp server revision mutation response.
    pub item: AdminMcpServerRevisionItem,
}
