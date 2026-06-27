use serde::{Deserialize, Serialize};

use crate::models::{AdminAiResourceGroupResourceItem};

/// Admin ai resource group resources response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAiResourceGroupResourcesResponse {
    /// Items field on admin ai resource group resources response.
    pub items: Vec<AdminAiResourceGroupResourceItem>,
}
