use serde::{Deserialize, Serialize};

use crate::models::{ServiceProviderPricingRuleMutationResponse};

/// Pricing rules update result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct PricingRulesUpdateResult {
    /// Business response code.
    pub code: String,

    /// Data field on pricing rules update result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<ServiceProviderPricingRuleMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
