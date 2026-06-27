use serde::{Deserialize, Serialize};

/// Admin usage pair schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminUsagePair {
    /// Today field on admin usage pair.
    pub today: f64,

    /// Total field on admin usage pair.
    pub total: f64,
}
