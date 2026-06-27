use serde::{Deserialize, Serialize};

use crate::models::{AdminMcpBindingItem};

/// Admin mcp binding mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMcpBindingMutationResponse {
    /// Item field on admin mcp binding mutation response.
    pub item: AdminMcpBindingItem,
}
