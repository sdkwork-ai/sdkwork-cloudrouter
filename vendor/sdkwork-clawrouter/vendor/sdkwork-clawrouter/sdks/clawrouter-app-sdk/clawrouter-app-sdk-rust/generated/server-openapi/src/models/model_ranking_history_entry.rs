use serde::{Deserialize, Serialize};

/// Model ranking history entry schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelRankingHistoryEntry {
    /// Catalog key field on model ranking history entry.
    #[serde(rename = "catalogKey")]
    pub catalog_key: String,

    /// Color field on model ranking history entry.
    pub color: String,

    /// Model field on model ranking history entry.
    pub model: String,

    /// Rank field on model ranking history entry.
    pub rank: String,

    /// Volume field on model ranking history entry.
    pub volume: String,
}
