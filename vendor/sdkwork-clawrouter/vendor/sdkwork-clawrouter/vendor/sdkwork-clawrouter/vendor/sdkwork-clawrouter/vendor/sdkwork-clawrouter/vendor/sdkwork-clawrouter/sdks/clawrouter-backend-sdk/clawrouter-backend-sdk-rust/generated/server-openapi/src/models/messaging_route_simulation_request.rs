use serde::{Deserialize, Serialize};

/// Messaging route simulation request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MessagingRouteSimulationRequest {
    /// Channel field on messaging route simulation request.
    pub channel: String,

    /// Country code field on messaging route simulation request.
    #[serde(rename = "countryCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub country_code: Option<String>,

    /// Delivery purpose field on messaging route simulation request.
    #[serde(rename = "deliveryPurpose")]
    pub delivery_purpose: String,

    /// Locale field on messaging route simulation request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub locale: Option<String>,

    /// Scene code field on messaging route simulation request.
    #[serde(rename = "sceneCode")]
    pub scene_code: String,

    /// User segment field on messaging route simulation request.
    #[serde(rename = "userSegment")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_segment: Option<String>,
}
