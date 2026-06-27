use serde::{Deserialize, Serialize};

/// Dashboard sparkline point schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DashboardSparklinePoint {
    /// Value field on dashboard sparkline point.
    pub value: f64,
}
