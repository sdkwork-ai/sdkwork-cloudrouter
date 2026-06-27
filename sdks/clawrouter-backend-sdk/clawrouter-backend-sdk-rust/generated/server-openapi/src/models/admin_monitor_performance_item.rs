use serde::{Deserialize, Serialize};

/// Admin monitor performance item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMonitorPerformanceItem {
    /// Cpu field on admin monitor performance item.
    pub cpu: f64,

    /// Memory field on admin monitor performance item.
    pub memory: f64,

    /// Network field on admin monitor performance item.
    pub network: f64,

    /// Time field on admin monitor performance item.
    pub time: String,
}
