use serde::{Deserialize, Serialize};

use crate::models::{AdminModelMappingRule};

/// Admin model mappings response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminModelMappingsResponse {
    /// Items field on admin model mappings response.
    pub items: Vec<AdminModelMappingRule>,
}
