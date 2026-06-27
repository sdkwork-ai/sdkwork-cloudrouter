use serde::{Deserialize, Serialize};

/// Messaging collection response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MessagingCollectionResponse {
    /// Items field on messaging collection response.
    pub items: Vec<std::collections::HashMap<String, String>>,

    /// Page field on messaging collection response.
    pub page: String,

    /// Page size field on messaging collection response.
    #[serde(rename = "pageSize")]
    pub page_size: String,

    /// Total field on messaging collection response.
    pub total: String,
}
