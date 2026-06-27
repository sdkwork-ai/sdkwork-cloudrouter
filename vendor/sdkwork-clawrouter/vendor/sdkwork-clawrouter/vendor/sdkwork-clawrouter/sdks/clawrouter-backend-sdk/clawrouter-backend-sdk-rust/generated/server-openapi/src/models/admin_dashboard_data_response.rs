use serde::{Deserialize, Serialize};

use crate::models::{AdminDashboardRecentUsageItem, AdminDashboardTrafficItem, AdminPieChartItem};

/// Admin dashboard data response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminDashboardDataResponse {
    /// Active users field on admin dashboard data response.
    #[serde(rename = "activeUsers")]
    pub active_users: String,

    /// Model distribution field on admin dashboard data response.
    #[serde(rename = "modelDistribution")]
    pub model_distribution: Vec<AdminPieChartItem>,

    /// Multimodal field on admin dashboard data response.
    pub multimodal: Vec<AdminPieChartItem>,

    /// Recent usage field on admin dashboard data response.
    #[serde(rename = "recentUsage")]
    pub recent_usage: Vec<AdminDashboardRecentUsageItem>,

    /// Traffic field on admin dashboard data response.
    pub traffic: Vec<AdminDashboardTrafficItem>,

    /// User consumption field on admin dashboard data response.
    #[serde(rename = "userConsumption")]
    pub user_consumption: Vec<AdminPieChartItem>,
}
