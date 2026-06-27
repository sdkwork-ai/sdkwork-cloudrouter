use serde::{Deserialize, Serialize};

/// Model rankings source schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelRankingsSource {
    /// Cache max age seconds field on model rankings source.
    #[serde(rename = "cacheMaxAgeSeconds")]
    pub cache_max_age_seconds: String,

    /// Generated at field on model rankings source.
    #[serde(rename = "generatedAt")]
    pub generated_at: String,

    /// Next refresh at field on model rankings source.
    #[serde(rename = "nextRefreshAt")]
    pub next_refresh_at: String,

    /// Observed at field on model rankings source.
    #[serde(rename = "observedAt")]
    pub observed_at: String,

    /// Rank scope field on model rankings source.
    #[serde(rename = "rankScope")]
    pub rank_scope: String,

    /// Refresh interval seconds field on model rankings source.
    #[serde(rename = "refreshIntervalSeconds")]
    pub refresh_interval_seconds: String,

    /// Snapshot date field on model rankings source.
    #[serde(rename = "snapshotDate")]
    pub snapshot_date: String,

    /// Snapshot period field on model rankings source.
    #[serde(rename = "snapshotPeriod")]
    pub snapshot_period: String,

    /// Source description field on model rankings source.
    #[serde(rename = "sourceDescription")]
    pub source_description: String,

    /// Source label field on model rankings source.
    #[serde(rename = "sourceLabel")]
    pub source_label: String,

    /// Source tables field on model rankings source.
    #[serde(rename = "sourceTables")]
    pub source_tables: Vec<String>,

    /// Window end field on model rankings source.
    #[serde(rename = "windowEnd")]
    pub window_end: String,

    /// Window start field on model rankings source.
    #[serde(rename = "windowStart")]
    pub window_start: String,
}
