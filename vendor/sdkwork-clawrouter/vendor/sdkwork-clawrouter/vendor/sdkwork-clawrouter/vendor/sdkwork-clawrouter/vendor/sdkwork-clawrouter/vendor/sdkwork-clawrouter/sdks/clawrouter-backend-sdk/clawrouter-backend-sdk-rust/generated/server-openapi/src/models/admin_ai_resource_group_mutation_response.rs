use serde::{Deserialize, Serialize};

use crate::models::{AdminAiResourceGroupItem};

/// Admin ai resource group mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAiResourceGroupMutationResponse {
    /// Item field on admin ai resource group mutation response.
    pub item: AdminAiResourceGroupItem,
}
