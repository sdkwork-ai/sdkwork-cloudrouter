use serde::{Deserialize, Serialize};

use crate::models::{ModelRankingRefreshJobItem};

/// Model ranking refresh job history page schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelRankingRefreshJobHistoryPage {
    /// Items field on model ranking refresh job history page.
    pub items: Vec<ModelRankingRefreshJobItem>,
}
