use serde::{Deserialize, Serialize};

/// Ranking vendor option schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RankingVendorOption {
    /// Code field on ranking vendor option.
    pub code: String,

    /// Label field on ranking vendor option.
    pub label: String,

    /// Model count field on ranking vendor option.
    #[serde(rename = "modelCount")]
    pub model_count: String,
}
