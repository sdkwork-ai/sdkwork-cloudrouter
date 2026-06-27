use serde::{Deserialize, Serialize};

/// Messaging route rule create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MessagingRouteRuleCreateRequest {
    /// Channel field on messaging route rule create request.
    pub channel: String,

    /// Country code field on messaging route rule create request.
    #[serde(rename = "countryCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub country_code: Option<String>,

    /// Delivery purpose field on messaging route rule create request.
    #[serde(rename = "deliveryPurpose")]
    pub delivery_purpose: String,

    /// Failover policy field on messaging route rule create request.
    #[serde(rename = "failoverPolicy")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub failover_policy: Option<std::collections::HashMap<String, String>>,

    /// Locale field on messaging route rule create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub locale: Option<String>,

    /// Priority field on messaging route rule create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub priority: Option<i64>,

    /// Rule code field on messaging route rule create request.
    #[serde(rename = "ruleCode")]
    pub rule_code: String,

    /// Scene code field on messaging route rule create request.
    #[serde(rename = "sceneCode")]
    pub scene_code: String,

    /// Targets field on messaging route rule create request.
    pub targets: Vec<serde_json::Value>,

    /// User segment field on messaging route rule create request.
    #[serde(rename = "userSegment")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_segment: Option<String>,
}
