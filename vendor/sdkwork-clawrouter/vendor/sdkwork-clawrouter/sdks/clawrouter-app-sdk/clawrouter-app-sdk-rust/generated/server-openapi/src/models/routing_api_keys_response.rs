use serde::{Deserialize, Serialize};

use crate::models::{RoutingApiKeyItem};

/// Routing api keys response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RoutingApiKeysResponse {
    /// Items field on routing api keys response.
    pub items: Vec<RoutingApiKeyItem>,
}
