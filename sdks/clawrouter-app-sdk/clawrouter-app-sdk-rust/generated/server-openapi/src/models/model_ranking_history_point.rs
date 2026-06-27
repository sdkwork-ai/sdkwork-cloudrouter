use serde::{Deserialize, Serialize};

use crate::models::{ModelRankingHistoryEntry};

/// Model ranking history point schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelRankingHistoryPoint {
    /// Date field on model ranking history point.
    pub date: String,

    /// Entries field on model ranking history point.
    pub entries: Vec<ModelRankingHistoryEntry>,

    /// Index field on model ranking history point.
    pub index: String,
}
