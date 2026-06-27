use serde::{Deserialize, Serialize};

/// Messaging template send request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MessagingTemplateSendRequest {
    /// Channel field on messaging template send request.
    pub channel: String,

    /// Country code field on messaging template send request.
    #[serde(rename = "countryCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub country_code: Option<String>,

    /// Delivery purpose field on messaging template send request.
    #[serde(rename = "deliveryPurpose")]
    pub delivery_purpose: String,

    /// Dry run field on messaging template send request.
    #[serde(rename = "dryRun")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dry_run: Option<bool>,

    /// Locale field on messaging template send request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub locale: Option<String>,

    /// Scene code field on messaging template send request.
    #[serde(rename = "sceneCode")]
    pub scene_code: String,

    /// Target hash field on messaging template send request.
    #[serde(rename = "targetHash")]
    pub target_hash: String,

    /// Target masked field on messaging template send request.
    #[serde(rename = "targetMasked")]
    pub target_masked: String,

    /// Template code field on messaging template send request.
    #[serde(rename = "templateCode")]
    pub template_code: String,

    /// User segment field on messaging template send request.
    #[serde(rename = "userSegment")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_segment: Option<String>,

    /// Variables field on messaging template send request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub variables: Option<std::collections::HashMap<String, String>>,
}
