use std::future::Future;
use std::pin::Pin;

use serde::Serialize;

use crate::domain::DomainResult;

pub type DashboardOverviewReadFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<DashboardOverviewSnapshot>> + Send + 'a>>;

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct DashboardOverviewQuery {
    pub keyword: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DashboardOverviewSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
#[derive(Default)]
pub struct DashboardOverviewSnapshot {
    pub summary: DashboardOverviewSummary,
    pub request_sparkline: Vec<DashboardSparklinePoint>,
    pub multimodal_sparkline: Vec<DashboardSparklinePoint>,
    pub performance_sparkline: Vec<DashboardSparklinePoint>,
    pub chart_data: Vec<DashboardChartPoint>,
    pub top_models: Vec<DashboardTopModel>,
    pub announcements: Vec<DashboardAnnouncement>,
    pub configuration_domains: Vec<DashboardConfigurationDomain>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DashboardOverviewSummary {
    pub available_credits: f64,
    pub used_credits: f64,
    pub request_count: i64,
    pub total_used_credits: f64,
    pub total_request_count: i64,
    pub error_count: i64,
    pub image_requests: i64,
    pub video_requests: i64,
    pub audio_requests: i64,
    pub music_requests: i64,
    pub rpm: f64,
    pub tpm: f64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DashboardSparklinePoint {
    pub value: f64,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DashboardChartPoint {
    pub time: String,
    #[serde(rename = "llm (Text)")]
    pub text_requests: f64,
    #[serde(rename = "image (Midjourney/DALL-E)")]
    pub image_requests: f64,
    #[serde(rename = "video (Runway/Sora)")]
    pub video_requests: f64,
    #[serde(rename = "audio (Whisper)")]
    pub audio_requests: f64,
    #[serde(rename = "music (Suno)")]
    pub music_requests: f64,
}

impl DashboardChartPoint {
    pub fn total_requests(&self) -> f64 {
        self.text_requests
            + self.image_requests
            + self.video_requests
            + self.audio_requests
            + self.music_requests
    }

    pub fn multimodal_requests(&self) -> f64 {
        self.image_requests + self.video_requests + self.audio_requests + self.music_requests
    }
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DashboardTopModel {
    pub rank: i64,
    pub name: String,
    pub supplier: String,
    pub modality: String,
    pub requests: i64,
    pub cost: f64,
    pub trend: String,
    pub is_up: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DashboardAnnouncement {
    pub id: i64,
    pub text: String,
    pub time: String,
    #[serde(rename = "type")]
    pub announcement_type: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DashboardConfigurationDomain {
    pub id: String,
    pub name: String,
    pub domain: String,
    pub ip: String,
    pub status: String,
    pub remark: String,
}

pub trait DashboardOverviewReadStore {
    fn load_dashboard_overview<'a>(
        &'a self,
        query: DashboardOverviewQuery,
        subject: Option<DashboardOverviewSubject>,
    ) -> DashboardOverviewReadFuture<'a>;
}
