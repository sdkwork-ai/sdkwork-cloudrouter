use serde::{Deserialize, Serialize};

use crate::models::{AppApiKeyItem, AppChannelGroup};

/// App api key list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AppApiKeyListResponse {
    /// Groups field on app api key list response.
    pub groups: Vec<AppChannelGroup>,

    /// Items field on app api key list response.
    pub items: Vec<AppApiKeyItem>,
}
