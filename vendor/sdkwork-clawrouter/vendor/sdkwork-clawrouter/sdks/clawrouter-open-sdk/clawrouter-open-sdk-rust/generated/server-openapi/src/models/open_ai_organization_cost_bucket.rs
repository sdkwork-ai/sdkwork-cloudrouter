use serde::{Deserialize, Serialize};

/// OpenAI-compatible organization cost bucket.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiOrganizationCostBucket {
    /// Cost amount when returned directly.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub amount: Option<f64>,

    /// Currency for the cost amount.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub currency: Option<String>,

    /// Unix timestamp for the bucket end.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub end_time: Option<i64>,

    /// Object type returned by the costs endpoint.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub object: Option<String>,

    /// Cost results grouped inside this bucket.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub results: Option<Vec<String>>,

    /// Unix timestamp for the bucket start.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub start_time: Option<i64>,
}
