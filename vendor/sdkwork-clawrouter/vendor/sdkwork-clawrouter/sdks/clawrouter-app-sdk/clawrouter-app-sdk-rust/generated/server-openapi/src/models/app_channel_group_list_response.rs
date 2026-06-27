use serde::{Deserialize, Serialize};

use crate::models::{AppChannelGroup};

/// App channel group list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AppChannelGroupListResponse {
    /// Items field on app channel group list response.
    pub items: Vec<AppChannelGroup>,
}
