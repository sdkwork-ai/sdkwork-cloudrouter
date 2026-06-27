use serde::{Deserialize, Serialize};

/// Dashboard top model schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DashboardTopModel {
    /// Cost field on dashboard top model.
    pub cost: f64,

    /// Is up field on dashboard top model.
    #[serde(rename = "isUp")]
    pub is_up: bool,

    /// Modality field on dashboard top model.
    pub modality: String,

    /// Name field on dashboard top model.
    pub name: String,

    /// Rank field on dashboard top model.
    pub rank: String,

    /// Requests field on dashboard top model.
    pub requests: String,

    /// Supplier field on dashboard top model.
    pub supplier: String,

    /// Trend field on dashboard top model.
    pub trend: String,
}
