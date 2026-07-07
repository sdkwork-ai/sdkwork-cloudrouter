use serde::{Deserialize, Serialize};

use crate::models::{PageInfo};

/// Model ranking refresh job history page schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelRankingRefreshJobHistoryPage {
    /// Items field on model ranking refresh job history page.
    pub items: Vec<std::collections::HashMap<String, String>>,

    /// Page info field on model ranking refresh job history page.
    #[serde(rename = "pageInfo")]
    pub page_info: PageInfo,
}
