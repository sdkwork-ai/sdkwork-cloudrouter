use serde::{Deserialize, Serialize};

use crate::models::{AdminAiResourceGroupItem};

/// Admin ai resource groups response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAiResourceGroupsResponse {
    /// Items field on admin ai resource groups response.
    pub items: Vec<AdminAiResourceGroupItem>,
}
