use serde::{Deserialize, Serialize};

use crate::models::{ModelRankingHistoryPoint, ModelRankingItem, ModelRankingsSource};

/// Model rankings snapshot schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelRankingsSnapshot {
    /// History field on model rankings snapshot.
    pub history: Vec<ModelRankingHistoryPoint>,

    /// Items field on model rankings snapshot.
    pub items: Vec<ModelRankingItem>,

    /// Source field on model rankings snapshot.
    pub source: ModelRankingsSource,
}
