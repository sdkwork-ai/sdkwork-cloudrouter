use serde::{Deserialize, Serialize};

use crate::models::{RoutingRequestTraceItem};

/// Routing request traces response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RoutingRequestTracesResponse {
    /// Items field on routing request traces response.
    pub items: Vec<RoutingRequestTraceItem>,
}
