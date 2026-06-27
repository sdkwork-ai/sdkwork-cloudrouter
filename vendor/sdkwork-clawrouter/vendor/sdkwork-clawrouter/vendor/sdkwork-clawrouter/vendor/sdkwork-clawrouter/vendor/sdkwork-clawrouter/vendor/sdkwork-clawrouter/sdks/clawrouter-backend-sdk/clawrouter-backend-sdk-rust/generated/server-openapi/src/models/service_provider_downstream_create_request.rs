use serde::{Deserialize, Serialize};

/// Service provider downstream create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ServiceProviderDownstreamCreateRequest {
    /// Default currency field on service provider downstream create request.
    #[serde(rename = "defaultCurrency")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_currency: Option<String>,

    /// Default multiplier field on service provider downstream create request.
    #[serde(rename = "defaultMultiplier")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_multiplier: Option<String>,

    /// Display name field on service provider downstream create request.
    #[serde(rename = "displayName")]
    pub display_name: String,

    /// Price plan code field on service provider downstream create request.
    #[serde(rename = "pricePlanCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub price_plan_code: Option<String>,

    /// Provider no field on service provider downstream create request.
    #[serde(rename = "providerNo")]
    pub provider_no: String,

    /// Provider type field on service provider downstream create request.
    #[serde(rename = "providerType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_type: Option<String>,

    /// Seller provider id field on service provider downstream create request.
    #[serde(rename = "sellerProviderId")]
    pub seller_provider_id: String,

    /// Settlement mode field on service provider downstream create request.
    #[serde(rename = "settlementMode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub settlement_mode: Option<String>,
}
