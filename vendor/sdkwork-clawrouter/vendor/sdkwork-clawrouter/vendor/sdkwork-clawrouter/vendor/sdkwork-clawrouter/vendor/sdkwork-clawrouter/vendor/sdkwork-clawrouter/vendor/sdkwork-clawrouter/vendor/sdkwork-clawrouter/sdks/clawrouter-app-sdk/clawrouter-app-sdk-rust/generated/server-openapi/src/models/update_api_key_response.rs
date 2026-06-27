use serde::{Deserialize, Serialize};

use crate::models::{AppApiKeyItem};

/// Update api key response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct UpdateApiKeyResponse {
    /// Item field on update api key response.
    pub item: AppApiKeyItem,
}
