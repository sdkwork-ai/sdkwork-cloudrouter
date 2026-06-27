use serde::{Deserialize, Serialize};

use crate::models::{AdminMcpBindingItem};

/// Admin mcp binding list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMcpBindingListResponse {
    /// Items field on admin mcp binding list response.
    pub items: Vec<AdminMcpBindingItem>,
}
