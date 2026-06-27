use serde::{Deserialize, Serialize};

/// Admin capacity pair schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminCapacityPair {
    /// Total field on admin capacity pair.
    pub total: f64,

    /// Used field on admin capacity pair.
    pub used: f64,
}
