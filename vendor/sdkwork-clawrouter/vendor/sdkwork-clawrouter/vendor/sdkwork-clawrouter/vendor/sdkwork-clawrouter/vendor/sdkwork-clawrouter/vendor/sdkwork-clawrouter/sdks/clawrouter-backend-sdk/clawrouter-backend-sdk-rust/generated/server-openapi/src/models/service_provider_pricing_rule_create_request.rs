use serde::{Deserialize, Serialize};

/// Service provider pricing rule create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ServiceProviderPricingRuleCreateRequest {
    /// Billing meter code field on service provider pricing rule create request.
    #[serde(rename = "billingMeterCode")]
    pub billing_meter_code: String,

    /// Buyer provider id field on service provider pricing rule create request.
    #[serde(rename = "buyerProviderId")]
    pub buyer_provider_id: String,

    /// Catalog key field on service provider pricing rule create request.
    #[serde(rename = "catalogKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub catalog_key: Option<String>,

    /// Currency field on service provider pricing rule create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub currency: Option<String>,

    /// Edge id field on service provider pricing rule create request.
    #[serde(rename = "edgeId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub edge_id: Option<String>,

    /// Minimum charge field on service provider pricing rule create request.
    #[serde(rename = "minimumCharge")]
    pub minimum_charge: String,

    /// Model field on service provider pricing rule create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Price plan id field on service provider pricing rule create request.
    #[serde(rename = "pricePlanId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub price_plan_id: Option<String>,

    /// Priority field on service provider pricing rule create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub priority: Option<i64>,

    /// Seller provider id field on service provider pricing rule create request.
    #[serde(rename = "sellerProviderId")]
    pub seller_provider_id: String,

    /// Token kind field on service provider pricing rule create request.
    #[serde(rename = "tokenKind")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub token_kind: Option<String>,

    /// Unit price field on service provider pricing rule create request.
    #[serde(rename = "unitPrice")]
    pub unit_price: String,

    /// Unit size field on service provider pricing rule create request.
    #[serde(rename = "unitSize")]
    pub unit_size: String,
}
