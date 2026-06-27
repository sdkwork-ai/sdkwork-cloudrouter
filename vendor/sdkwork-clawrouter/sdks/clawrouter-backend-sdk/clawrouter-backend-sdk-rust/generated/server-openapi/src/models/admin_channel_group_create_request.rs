use serde::{Deserialize, Serialize};

/// Admin channel group create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminChannelGroupCreateRequest {
    /// Capacity field on admin channel group create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub capacity: Option<serde_json::Value>,

    /// Stable AI channel group code.
    #[serde(rename = "groupCode")]
    pub group_code: String,

    /// AI channel group display name.
    #[serde(rename = "groupName")]
    pub group_name: String,

    /// AI channel group allocation mode.
    #[serde(rename = "groupType")]
    pub group_type: String,

    /// Official price multiplier rounded to six decimals.
    #[serde(rename = "officialPriceMultiplier")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub official_price_multiplier: Option<f64>,

    /// Pricing reference mode for this AI channel group.
    #[serde(rename = "priceReferenceMode")]
    pub price_reference_mode: String,

    /// Customer rate multiplier rounded to six decimals.
    #[serde(rename = "rateMultiplier")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rate_multiplier: Option<f64>,

    /// Individual AI resource codes directly granted to this channel group.
    #[serde(rename = "resourceCodes")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resource_codes: Option<Vec<String>>,

    /// AI resource group codes directly granted to this channel group.
    #[serde(rename = "resourceGroupCodes")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resource_group_codes: Option<Vec<String>>,

    /// Status field on admin channel group create request.
    pub status: String,
}
