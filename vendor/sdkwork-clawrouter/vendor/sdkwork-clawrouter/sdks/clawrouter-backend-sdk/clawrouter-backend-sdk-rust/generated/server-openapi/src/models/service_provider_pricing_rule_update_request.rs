use serde::{Deserialize, Serialize};

/// Service provider pricing rule update request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ServiceProviderPricingRuleUpdateRequest {
    /// Minimum charge field on service provider pricing rule update request.
    #[serde(rename = "minimumCharge")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub minimum_charge: Option<String>,

    /// Priority field on service provider pricing rule update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub priority: Option<i64>,

    /// Status field on service provider pricing rule update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Unit price field on service provider pricing rule update request.
    #[serde(rename = "unitPrice")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub unit_price: Option<String>,

    /// Unit size field on service provider pricing rule update request.
    #[serde(rename = "unitSize")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub unit_size: Option<String>,
}
