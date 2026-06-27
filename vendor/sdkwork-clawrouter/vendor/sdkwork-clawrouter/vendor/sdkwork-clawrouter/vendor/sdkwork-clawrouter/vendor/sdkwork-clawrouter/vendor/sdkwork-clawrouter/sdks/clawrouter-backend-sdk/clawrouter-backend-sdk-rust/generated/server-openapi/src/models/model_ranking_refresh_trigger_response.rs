use serde::{Deserialize, Serialize};

/// Model ranking refresh trigger response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelRankingRefreshTriggerResponse {
    /// Cache max age seconds field on model ranking refresh trigger response.
    #[serde(rename = "cacheMaxAgeSeconds")]
    pub cache_max_age_seconds: String,

    /// Generated count field on model ranking refresh trigger response.
    #[serde(rename = "generatedCount")]
    pub generated_count: String,

    /// Next refresh at field on model ranking refresh trigger response.
    #[serde(rename = "nextRefreshAt")]
    pub next_refresh_at: String,

    /// Organization id field on model ranking refresh trigger response.
    #[serde(rename = "organizationId")]
    pub organization_id: String,

    /// Rank scope field on model ranking refresh trigger response.
    #[serde(rename = "rankScope")]
    pub rank_scope: String,

    /// Refresh interval seconds field on model ranking refresh trigger response.
    #[serde(rename = "refreshIntervalSeconds")]
    pub refresh_interval_seconds: String,

    /// Snapshot date field on model ranking refresh trigger response.
    #[serde(rename = "snapshotDate")]
    pub snapshot_date: String,

    /// Snapshot period field on model ranking refresh trigger response.
    #[serde(rename = "snapshotPeriod")]
    pub snapshot_period: String,

    /// Source count field on model ranking refresh trigger response.
    #[serde(rename = "sourceCount")]
    pub source_count: String,

    /// Result of the manual ranking worker run.
    pub status: String,

    /// Tenant id field on model ranking refresh trigger response.
    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    /// Whether a manual refresh worker run was started.
    pub triggered: bool,

    /// Window end field on model ranking refresh trigger response.
    #[serde(rename = "windowEnd")]
    pub window_end: String,

    /// Window start field on model ranking refresh trigger response.
    #[serde(rename = "windowStart")]
    pub window_start: String,
}
