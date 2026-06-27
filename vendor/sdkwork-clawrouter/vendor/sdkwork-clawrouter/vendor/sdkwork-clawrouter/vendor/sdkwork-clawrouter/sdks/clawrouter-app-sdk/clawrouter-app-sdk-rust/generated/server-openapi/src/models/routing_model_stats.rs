use serde::{Deserialize, Serialize};

/// Routing model stats schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RoutingModelStats {
    /// Lat field on routing model stats.
    pub lat: String,

    /// M field on routing model stats.
    pub m: String,

    /// Req field on routing model stats.
    pub req: String,

    /// Sr field on routing model stats.
    pub sr: String,

    /// Tok field on routing model stats.
    pub tok: String,
}
