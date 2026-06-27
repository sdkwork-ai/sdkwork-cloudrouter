use serde::{Deserialize, Serialize};

/// Admin ai resource group delete response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAiResourceGroupDeleteResponse {
    /// Deleted field on admin ai resource group delete response.
    pub deleted: bool,
}
