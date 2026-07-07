use serde::{Deserialize, Serialize};

use crate::models::{PageInfo};

/// Model rankings page schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelRankingsPage {
    /// History field on model rankings page.
    pub history: Vec<std::collections::HashMap<String, String>>,

    /// Items field on model rankings page.
    pub items: Vec<std::collections::HashMap<String, String>>,

    /// Page info field on model rankings page.
    #[serde(rename = "pageInfo")]
    pub page_info: PageInfo,

    /// Source field on model rankings page.
    pub source: std::collections::HashMap<String, String>,
}
