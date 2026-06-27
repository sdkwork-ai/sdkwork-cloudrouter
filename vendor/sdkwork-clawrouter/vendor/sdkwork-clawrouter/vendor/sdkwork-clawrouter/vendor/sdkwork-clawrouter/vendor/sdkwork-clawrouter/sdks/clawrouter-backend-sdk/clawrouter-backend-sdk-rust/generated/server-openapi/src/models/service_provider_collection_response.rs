use serde::{Deserialize, Serialize};

/// Service provider collection response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ServiceProviderCollectionResponse {
    /// Items field on service provider collection response.
    pub items: Vec<std::collections::HashMap<String, String>>,

    /// Page field on service provider collection response.
    pub page: String,

    /// Page size field on service provider collection response.
    #[serde(rename = "pageSize")]
    pub page_size: String,

    /// Total field on service provider collection response.
    pub total: String,
}
