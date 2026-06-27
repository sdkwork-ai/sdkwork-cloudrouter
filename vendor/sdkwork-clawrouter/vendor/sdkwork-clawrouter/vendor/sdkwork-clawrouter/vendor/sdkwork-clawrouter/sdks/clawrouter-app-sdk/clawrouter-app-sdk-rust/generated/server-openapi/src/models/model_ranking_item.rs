use serde::{Deserialize, Serialize};

/// Model ranking item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelRankingItem {
    /// Base volume field on model ranking item.
    #[serde(rename = "baseVolume")]
    pub base_volume: String,

    /// Color field on model ranking item.
    pub color: String,

    /// Context size field on model ranking item.
    #[serde(rename = "contextSize")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub context_size: Option<String>,

    /// Cost field on model ranking item.
    pub cost: f64,

    /// Cost indicator field on model ranking item.
    #[serde(rename = "costIndicator")]
    pub cost_indicator: String,

    /// Currency field on model ranking item.
    pub currency: String,

    /// Stable model catalog identity; must match ranking history catalogKey and must not include snapshot date prefixes.
    pub id: String,

    /// Is new field on model ranking item.
    #[serde(rename = "isNew")]
    pub is_new: bool,

    /// Latency field on model ranking item.
    pub latency: String,

    /// License field on model ranking item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub license: Option<String>,

    /// Modality field on model ranking item.
    pub modality: String,

    /// Name field on model ranking item.
    pub name: String,

    /// Prev rank field on model ranking item.
    #[serde(rename = "prevRank")]
    pub prev_rank: String,

    /// Pricing field on model ranking item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pricing: Option<String>,

    /// Rank field on model ranking item.
    pub rank: String,

    /// Requests field on model ranking item.
    pub requests: String,

    /// Strengths field on model ranking item.
    pub strengths: Vec<String>,

    /// Tokens field on model ranking item.
    pub tokens: String,

    /// Trend score field on model ranking item.
    #[serde(rename = "trendScore")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub trend_score: Option<f64>,

    /// Vendor field on model ranking item.
    pub vendor: String,

    /// Vendor code field on model ranking item.
    #[serde(rename = "vendorCode")]
    pub vendor_code: String,

    /// Win rate field on model ranking item.
    #[serde(rename = "winRate")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub win_rate: Option<f64>,
}
