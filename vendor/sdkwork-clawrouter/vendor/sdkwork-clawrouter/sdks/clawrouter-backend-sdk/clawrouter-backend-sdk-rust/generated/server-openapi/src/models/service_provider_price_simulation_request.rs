use serde::{Deserialize, Serialize};

/// Service provider price simulation request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ServiceProviderPriceSimulationRequest {
    /// Billing meter code field on service provider price simulation request.
    #[serde(rename = "billingMeterCode")]
    pub billing_meter_code: String,

    /// Buyer provider id field on service provider price simulation request.
    #[serde(rename = "buyerProviderId")]
    pub buyer_provider_id: String,

    /// Catalog key field on service provider price simulation request.
    #[serde(rename = "catalogKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub catalog_key: Option<String>,

    /// Model field on service provider price simulation request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Quantity field on service provider price simulation request.
    pub quantity: String,

    /// Token kind field on service provider price simulation request.
    #[serde(rename = "tokenKind")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub token_kind: Option<String>,
}
