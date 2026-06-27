use serde::{Deserialize, Serialize};

use crate::models::{AdminAiModelItem};

/// Admin ai models response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAiModelsResponse {
    /// AI model catalog snapshots returned by the backend.
    pub items: Vec<AdminAiModelItem>,
}
