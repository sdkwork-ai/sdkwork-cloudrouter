use serde::{Deserialize, Serialize};

use crate::models::{PageInfo};

/// Model catalog page schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelCatalogPage {
    /// Groups field on model catalog page.
    pub groups: Vec<serde_json::Value>,

    /// Items field on model catalog page.
    pub items: Vec<std::collections::HashMap<String, String>>,

    /// Page info field on model catalog page.
    #[serde(rename = "pageInfo")]
    pub page_info: PageInfo,
}
