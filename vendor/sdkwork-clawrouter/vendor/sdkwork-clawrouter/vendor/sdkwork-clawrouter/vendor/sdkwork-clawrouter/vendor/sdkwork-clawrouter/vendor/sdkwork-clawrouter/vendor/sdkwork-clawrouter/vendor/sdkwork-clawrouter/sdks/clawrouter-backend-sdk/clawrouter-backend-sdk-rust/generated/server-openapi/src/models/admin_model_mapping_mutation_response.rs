use serde::{Deserialize, Serialize};

use crate::models::{AdminModelMappingRule};

/// Admin model mapping mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminModelMappingMutationResponse {
    /// Item field on admin model mapping mutation response.
    pub item: AdminModelMappingRule,
}
