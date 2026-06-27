use serde::{Deserialize, Serialize};

/// Dashboard overview summary schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DashboardOverviewSummary {
    /// Audio requests field on dashboard overview summary.
    #[serde(rename = "audioRequests")]
    pub audio_requests: String,

    /// Available credits field on dashboard overview summary.
    #[serde(rename = "availableCredits")]
    pub available_credits: f64,

    /// Error count field on dashboard overview summary.
    #[serde(rename = "errorCount")]
    pub error_count: String,

    /// Image requests field on dashboard overview summary.
    #[serde(rename = "imageRequests")]
    pub image_requests: String,

    /// Music requests field on dashboard overview summary.
    #[serde(rename = "musicRequests")]
    pub music_requests: String,

    /// Request count field on dashboard overview summary.
    #[serde(rename = "requestCount")]
    pub request_count: String,

    /// Rpm field on dashboard overview summary.
    pub rpm: f64,

    /// Total request count field on dashboard overview summary.
    #[serde(rename = "totalRequestCount")]
    pub total_request_count: String,

    /// Total used credits field on dashboard overview summary.
    #[serde(rename = "totalUsedCredits")]
    pub total_used_credits: f64,

    /// Tpm field on dashboard overview summary.
    pub tpm: f64,

    /// Used credits field on dashboard overview summary.
    #[serde(rename = "usedCredits")]
    pub used_credits: f64,

    /// Video requests field on dashboard overview summary.
    #[serde(rename = "videoRequests")]
    pub video_requests: String,
}
