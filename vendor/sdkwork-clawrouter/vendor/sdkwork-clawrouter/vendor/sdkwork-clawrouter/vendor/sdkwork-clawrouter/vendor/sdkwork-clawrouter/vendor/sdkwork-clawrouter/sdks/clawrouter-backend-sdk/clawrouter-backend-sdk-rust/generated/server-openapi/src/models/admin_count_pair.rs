use serde::{Deserialize, Serialize};

/// Admin count pair schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminCountPair {
    /// Available field on admin count pair.
    pub available: f64,

    /// Total field on admin count pair.
    pub total: f64,
}
