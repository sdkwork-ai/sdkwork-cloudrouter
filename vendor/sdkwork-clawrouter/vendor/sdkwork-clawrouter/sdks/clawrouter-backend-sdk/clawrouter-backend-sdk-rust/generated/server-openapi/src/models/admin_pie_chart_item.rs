use serde::{Deserialize, Serialize};

/// Admin pie chart item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminPieChartItem {
    /// Color field on admin pie chart item.
    pub color: String,

    /// Name field on admin pie chart item.
    pub name: String,

    /// Value field on admin pie chart item.
    pub value: f64,
}
