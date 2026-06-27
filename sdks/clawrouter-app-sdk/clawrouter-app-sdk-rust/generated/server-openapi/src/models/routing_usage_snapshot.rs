use serde::{Deserialize, Serialize};

use crate::models::{RoutingModelStats, RoutingUsageData};

/// Routing usage snapshot schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RoutingUsageSnapshot {
    /// Chart data field on routing usage snapshot.
    #[serde(rename = "chartData")]
    pub chart_data: Vec<RoutingUsageData>,

    /// Model stats field on routing usage snapshot.
    #[serde(rename = "modelStats")]
    pub model_stats: Vec<RoutingModelStats>,
}
