use serde::{Deserialize, Serialize};

use crate::models::{DashboardAnnouncement, DashboardChartPoint, DashboardConfigurationDomain, DashboardOverviewSummary, DashboardSparklinePoint, DashboardTopModel};

/// Dashboard overview response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DashboardOverviewResponse {
    /// Announcements field on dashboard overview response.
    pub announcements: Vec<DashboardAnnouncement>,

    /// Chart data field on dashboard overview response.
    #[serde(rename = "chartData")]
    pub chart_data: Vec<DashboardChartPoint>,

    /// Configuration domains field on dashboard overview response.
    #[serde(rename = "configurationDomains")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub configuration_domains: Option<Vec<DashboardConfigurationDomain>>,

    /// Multimodal sparkline field on dashboard overview response.
    #[serde(rename = "multimodalSparkline")]
    pub multimodal_sparkline: Vec<DashboardSparklinePoint>,

    /// Performance sparkline field on dashboard overview response.
    #[serde(rename = "performanceSparkline")]
    pub performance_sparkline: Vec<DashboardSparklinePoint>,

    /// Request sparkline field on dashboard overview response.
    #[serde(rename = "requestSparkline")]
    pub request_sparkline: Vec<DashboardSparklinePoint>,

    /// Summary field on dashboard overview response.
    pub summary: DashboardOverviewSummary,

    /// Top models field on dashboard overview response.
    #[serde(rename = "topModels")]
    pub top_models: Vec<DashboardTopModel>,

    /// Warnings field on dashboard overview response.
    pub warnings: Vec<String>,
}
