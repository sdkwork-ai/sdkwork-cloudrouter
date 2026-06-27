use serde::{Deserialize, Serialize};

/// Regional official reference pricing returned by admin AI model payloads.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAiModelRegionPrice {
    /// Optional official reference cache-read unit price in native official reference currency.
    #[serde(rename = "cacheReadPrice")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cache_read_price: Option<String>,

    /// Optional official reference cache-write unit price in native official reference currency.
    #[serde(rename = "cacheWritePrice")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cache_write_price: Option<String>,

    /// Official reference price currency code for this region.
    pub currency: String,

    /// Official reference input unit price in native official reference currency.
    #[serde(rename = "priceIn")]
    pub price_in: String,

    /// Official reference output unit price in native official reference currency.
    #[serde(rename = "priceOut")]
    pub price_out: String,

    /// Model catalog pricing region code.
    #[serde(rename = "regionCode")]
    pub region_code: String,
}
