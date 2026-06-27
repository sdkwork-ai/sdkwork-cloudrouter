use serde::{Deserialize, Serialize};

use crate::models::{ModelRankingRefreshLatestJob};

/// Model ranking refresh status schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelRankingRefreshStatus {
    /// Maximum cache age clients and services should use for this status snapshot.
    #[serde(rename = "cacheMaxAgeSeconds")]
    pub cache_max_age_seconds: String,

    /// Time when the ranking snapshot was generated.
    #[serde(rename = "generatedAt")]
    pub generated_at: String,

    /// Number of ranking rows generated in the selected snapshot.
    #[serde(rename = "generatedCount")]
    pub generated_count: String,

    /// Latest job field on model ranking refresh status.
    #[serde(rename = "latestJob")]
    pub latest_job: ModelRankingRefreshLatestJob,

    /// Planned next refresh time.
    #[serde(rename = "nextRefreshAt")]
    pub next_refresh_at: String,

    /// Organization scope used by the selected ranking snapshot.
    #[serde(rename = "organizationId")]
    pub organization_id: String,

    /// Ranking scope, for example commercial-default.
    #[serde(rename = "rankScope")]
    pub rank_scope: String,

    /// Planned refresh interval used by the ranking task.
    #[serde(rename = "refreshIntervalSeconds")]
    pub refresh_interval_seconds: String,

    /// Snapshot business date for the latest visible ranking.
    #[serde(rename = "snapshotDate")]
    pub snapshot_date: String,

    /// Snapshot period granularity, for example daily.
    #[serde(rename = "snapshotPeriod")]
    pub snapshot_period: String,

    /// Number of source usage rows represented by the selected snapshot.
    #[serde(rename = "sourceCount")]
    pub source_count: String,

    /// Source tables field on model ranking refresh status.
    #[serde(rename = "sourceTables")]
    pub source_tables: Vec<String>,

    /// Published ranking read-model status for the latest visible snapshot.
    pub status: String,

    /// Tenant scope used by the selected ranking snapshot.
    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    /// Exclusive source aggregation window end.
    #[serde(rename = "windowEnd")]
    pub window_end: String,

    /// Inclusive source aggregation window start.
    #[serde(rename = "windowStart")]
    pub window_start: String,
}
